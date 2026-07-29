import { createHash } from 'node:crypto';
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { materializeProfileFont } from './font-materializer.mjs';
import { PROFILE_PATHS } from './profile-paths.mjs';
import {
  assertNoProfileApprovalLeak,
  getProductionProfileAssembly,
} from '../../src/lib/profile/production-profile.ts';

const VERIFICATION_BUILD_ENV = 'PROFILE_VERIFICATION_BUILD';
const VITE_MANIFEST_FILE = '.profile-vite-manifest.json';
const PROFILE_ROUTES = new Set(['/resume', '/portfolio']);

export default function profileBuildIntegration() {
  const verificationState = createVerificationState();

  return {
    name: 'rvnnt-profile-build',
    hooks: {
      'astro:config:setup': async ({ logger }) => {
        getProductionProfileAssembly();
        const result = await materializeProfileFont();
        logger.info(
          `${result.status} Pretendard ${result.packageVersion} ` +
            `(${result.outputCount} verified outputs)`,
        );
      },
      'astro:build:setup': ({ pages, target, updateConfig }) => {
        if (!isVerificationBuild()) {
          return;
        }

        capturePageGraph(verificationState, pages, target);
        if (!verificationState.provenanceConfigured) {
          updateConfig({
            environments: {
              client: {
                build: {
                  manifest: VITE_MANIFEST_FILE,
                },
              },
            },
            plugins: createProvenancePlugins(verificationState),
          });
          verificationState.provenanceConfigured = true;
        }
      },
      'astro:build:done': async ({ pages, dir, assets, logger }) => {
        if (isVerificationBuild()) {
          await writePrivateBuildManifest({
            state: verificationState,
            dir,
            pages,
            assets,
          });
          logger.info('wrote private profile build provenance');
        }

        await assertNoProfileApprovalLeak(dir);
        logger.info('verified private profile approval boundary');
      },
    },
  };
}

function createVerificationState() {
  return {
    pageGraphs: [],
    initialRollupGraphs: Object.create(null),
    rollupGraphs: Object.create(null),
    provenanceConfigured: false,
  };
}

function isVerificationBuild() {
  const value = process.env[VERIFICATION_BUILD_ENV];
  if (value === undefined) {
    return false;
  }
  if (value !== '1') {
    throw new TypeError(`${VERIFICATION_BUILD_ENV} must be exactly "1"`);
  }
  return true;
}

function capturePageGraph(state, pages, target) {
  state.pageGraphs.push({ target, pages });
}

function serializePageGraph(pages) {
  return [...pages.values()]
    .map((page) => ({
      key: page.key,
      component: normalizeModuleId(page.component),
      moduleSpecifier: normalizeModuleId(page.moduleSpecifier),
      route: {
        route: page.route.route,
        pathname: page.route.pathname,
        type: page.route.type,
        prerender: page.route.prerender,
      },
      styles: page.styles
        .map(({ depth, order, sheet }) => ({
          depth,
          order,
          sheet:
            sheet.type === 'external'
              ? {
                  type: 'external',
                  src: normalizeAssetPath(sheet.src),
                }
              : {
                  type: 'inline',
                  bytes: Buffer.byteLength(sheet.content),
                  sha256: sha256(Buffer.from(sheet.content)),
                  contentBase64: Buffer.from(sheet.content).toString('base64'),
                },
        }))
        .sort(compareStyles),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function createProvenancePlugins(state) {
  return [
    createProvenancePlugin(state, {
      name: 'rvnnt-profile-provenance-initial',
      order: 'pre',
      collection: 'initialRollupGraphs',
    }),
    createProvenancePlugin(state, {
      name: 'rvnnt-profile-provenance-final',
      order: 'post',
      collection: 'rollupGraphs',
    }),
  ];
}

function createProvenancePlugin(state, { name, order, collection }) {
  return {
    name,
    apply: 'build',
    enforce: order,
    generateBundle: {
      order,
      handler(_options, bundle) {
        const environment = this.environment?.name ?? 'unknown';

        const modules = [...this.getModuleIds()]
          .map((id) => {
            const info = this.getModuleInfo(id);
            if (info === null) {
              throw new TypeError(
                'Vite returned a missing module during provenance capture',
              );
            }

            return {
              id: normalizeModuleId(id),
              isEntry: info.isEntry,
              importers: info.importers.map(normalizeModuleId).sort(),
              importedIds: info.importedIds.map(normalizeModuleId).sort(),
              dynamicImporters: info.dynamicImporters
                .map(normalizeModuleId)
                .sort(),
              dynamicallyImportedIds: info.dynamicallyImportedIds
                .map(normalizeModuleId)
                .sort(),
            };
          })
          .sort((left, right) => left.id.localeCompare(right.id));

        const outputs = Object.values(bundle)
          .map((output) => {
            if (output.type === 'chunk') {
              return {
                type: 'chunk',
                file: normalizeAssetPath(output.fileName),
                facadeModuleId:
                  output.facadeModuleId === null
                    ? undefined
                    : normalizeModuleId(output.facadeModuleId),
                isEntry: output.isEntry,
                isDynamicEntry: output.isDynamicEntry,
                imports: [...output.imports].map(normalizeAssetPath).sort(),
                dynamicImports: [...output.dynamicImports]
                  .map(normalizeAssetPath)
                  .sort(),
                modules: Object.keys(output.modules)
                  .map(normalizeModuleId)
                  .sort(),
                importedCss: [...(output.viteMetadata?.importedCss ?? [])]
                  .map(normalizeAssetPath)
                  .sort(),
                importedAssets: [...(output.viteMetadata?.importedAssets ?? [])]
                  .map(normalizeAssetPath)
                  .sort(),
              };
            }

            const sourceBytes = outputSourceBytes(output.source);
            const file = normalizeAssetPath(output.fileName);
            return {
              type: 'asset',
              file,
              names: [...output.names].sort(),
              originalFileNames: [...output.originalFileNames]
                .map(normalizeModuleId)
                .sort(),
              bytes: sourceBytes.byteLength,
              sha256: sha256(sourceBytes),
              ...(file.endsWith('.css')
                ? { contentBase64: sourceBytes.toString('base64') }
                : {}),
            };
          })
          .sort((left, right) => left.file.localeCompare(right.file));

        state[collection][environment] = { modules, outputs };
      },
    },
  };
}

async function writePrivateBuildManifest({ state, dir, pages, assets }) {
  if (
    state.initialRollupGraphs.client === undefined ||
    Object.keys(state.initialRollupGraphs).length < 2 ||
    state.rollupGraphs.client === undefined ||
    Object.keys(state.rollupGraphs).length < 2
  ) {
    throw new TypeError('PROFILE_BUILD_PROVENANCE_MISSING@vite.environments');
  }

  const distRoot = fileURLToPath(dir);
  if (resolve(distRoot) !== PROFILE_PATHS.distRoot) {
    throw new TypeError('PROFILE_BUILD_ROOT_INVALID@dist');
  }

  const viteManifestPath = resolve(distRoot, VITE_MANIFEST_FILE);
  let viteManifest;
  try {
    viteManifest = JSON.parse(await readFile(viteManifestPath, 'utf8'));
  } finally {
    await unlink(viteManifestPath).catch((error) => {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    });
  }

  const pageGraph = selectPageGraph(state.pageGraphs);
  const profilePages = pageGraph.pages.filter(({ route }) =>
    PROFILE_ROUTES.has(route.pathname ?? route.route),
  );
  if (
    profilePages.length !== PROFILE_ROUTES.size ||
    profilePages.some(({ styles }) => styles.length === 0)
  ) {
    throw new TypeError('PROFILE_BUILD_ROUTE_GRAPH_MISSING@profile.routes');
  }

  const outputFiles = await collectOutputFiles(distRoot);
  const builtRoutes = pages
    .map(({ pathname }) => normalizeRoutePath(pathname))
    .sort((left, right) => left.localeCompare(right));
  for (const route of PROFILE_ROUTES) {
    if (!builtRoutes.includes(route)) {
      throw new TypeError(`PROFILE_BUILD_ROUTE_MISSING@${route}`);
    }
  }

  const routeOutputs = [...assets.entries()]
    .map(([route, urls]) => ({
      route,
      outputs: urls
        .map((url) =>
          normalizeAssetPath(relative(distRoot, fileURLToPath(url))),
        )
        .sort(),
    }))
    .sort((left, right) => left.route.localeCompare(right.route));
  const initialRollupGraphs = orderEnvironmentGraphs(
    state.initialRollupGraphs,
  );
  const rollupGraphs = orderEnvironmentGraphs(state.rollupGraphs);

  const sourceGraphSha256 = sha256(
    Buffer.from(
      JSON.stringify({
        pageGraph,
        routeOutputs,
        initialRollupGraphs,
        rollupGraphs,
        viteManifest,
      }),
    ),
  );
  const outputSha256 = sha256(Buffer.from(JSON.stringify(outputFiles)));
  const buildId = sha256(
    Buffer.from(
      JSON.stringify({
        sourceGraphSha256,
        outputSha256,
        builtRoutes,
      }),
    ),
  );
  const manifest = {
    schemaVersion: 1,
    buildIdentity: {
      id: buildId,
      createdAt: new Date().toISOString(),
      distRoot: 'dist',
      sourceGraphSha256,
      outputSha256,
      routes: builtRoutes,
    },
    pageGraph,
    routeOutputs,
    viteManifest,
    initialRollupGraphs,
    rollupGraphs,
    outputFiles,
    tools: {
      node: process.versions.node,
      astro: await readPackageVersion('astro'),
      vite: await readPackageVersion('vite'),
      gzip: 'node:zlib.gzipSync(level=9,mtime=0)',
    },
  };

  await writeJsonAtomically(PROFILE_PATHS.buildManifestPath, manifest);
}

function selectPageGraph(graphs) {
  const candidates = graphs
    .map(({ target, pages }) => ({
      target,
      pages: serializePageGraph(pages),
    }))
    .sort(
      (left, right) =>
        countExternalStyles(right.pages) - countExternalStyles(left.pages),
    );
  if (candidates.length === 0) {
    throw new TypeError('PROFILE_BUILD_PAGE_GRAPH_MISSING@astro.build');
  }
  return candidates[0];
}

function countExternalStyles(pages) {
  return pages.reduce(
    (count, page) =>
      count +
      page.styles.filter(({ sheet }) => sheet.type === 'external').length,
    0,
  );
}

function orderEnvironmentGraphs(graphs) {
  return Object.fromEntries(
    Object.keys(graphs)
      .sort()
      .map((environment) => [environment, graphs[environment]]),
  );
}

async function readPackageVersion(packageName) {
  const packageDocument = JSON.parse(
    await readFile(
      resolve(
        PROFILE_PATHS.siteRoot,
        'node_modules',
        packageName,
        'package.json',
      ),
      'utf8',
    ),
  );
  if (
    typeof packageDocument.version !== 'string' ||
    packageDocument.version.length === 0
  ) {
    throw new TypeError(`PROFILE_BUILD_TOOL_VERSION_MISSING@${packageName}`);
  }
  return packageDocument.version;
}

async function collectOutputFiles(root) {
  const result = [];
  await walk(root, '');
  return result.sort((left, right) => left.path.localeCompare(right.path));

  async function walk(directory, relativeDirectory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (entry.name === VITE_MANIFEST_FILE) {
        continue;
      }
      const relativePath =
        relativeDirectory.length === 0
          ? entry.name
          : `${relativeDirectory}/${entry.name}`;
      const absolutePath = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new TypeError(`PROFILE_BUILD_OUTPUT_SYMLINK@${relativePath}`);
      }
      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath);
        continue;
      }
      if (!entry.isFile()) {
        throw new TypeError(`PROFILE_BUILD_OUTPUT_NOT_REGULAR@${relativePath}`);
      }
      const bytes = await readFile(absolutePath);
      result.push({
        path: normalizeAssetPath(relativePath),
        bytes: bytes.byteLength,
        sha256: sha256(bytes),
      });
    }
  }
}

async function writeJsonAtomically(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const existing = await lstat(path).catch((error) => {
    if (error?.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  });
  if (
    existing !== undefined &&
    (existing.isSymbolicLink() || !existing.isFile())
  ) {
    throw new TypeError('PROFILE_BUILD_MANIFEST_TARGET_INVALID@private');
  }

  const temporaryPath = `${path}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
    flag: 'wx',
    mode: 0o600,
  });
  try {
    await rename(temporaryPath, path);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

function normalizeModuleId(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('module id must be a non-empty string');
  }
  const withoutNull = value.replaceAll('\0', 'virtual:');
  const queryIndex = withoutNull.indexOf('?');
  const pathPart =
    queryIndex === -1 ? withoutNull : withoutNull.slice(0, queryIndex);
  const suffix = queryIndex === -1 ? '' : withoutNull.slice(queryIndex);

  if (isAbsolute(pathPart)) {
    const fromSite = relative(PROFILE_PATHS.siteRoot, pathPart);
    if (
      fromSite !== '..' &&
      !fromSite.startsWith(`..${sep}`) &&
      !isAbsolute(fromSite)
    ) {
      return `${normalizeAssetPath(fromSite)}${suffix}`;
    }

    const nodeModulesMarker = `${sep}node_modules${sep}`;
    const markerIndex = pathPart.lastIndexOf(nodeModulesMarker);
    if (markerIndex !== -1) {
      return `node_modules/${normalizeAssetPath(
        pathPart.slice(markerIndex + nodeModulesMarker.length),
      )}${suffix}`;
    }
    return `external:${sha256(Buffer.from(pathPart)).slice(0, 16)}${suffix}`;
  }

  return normalizeAssetPath(withoutNull);
}

function normalizeAssetPath(value) {
  return value.replaceAll('\\', '/').replace(/^\.?\//u, '');
}

function normalizeRoutePath(value) {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

function compareStyles(left, right) {
  return (
    left.depth - right.depth ||
    left.order - right.order ||
    JSON.stringify(left.sheet).localeCompare(JSON.stringify(right.sheet))
  );
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function outputSourceBytes(source) {
  return typeof source === 'string'
    ? Buffer.from(source)
    : Buffer.from(source.buffer, source.byteOffset, source.byteLength);
}
