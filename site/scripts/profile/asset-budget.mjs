import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { PROFILE_PATHS, resolveWithinRoot } from './profile-paths.mjs';

const BUDGET_RULE = 'PERF-01/LC-U1-04/LC-U1-05';
const PROFILE_CSS_GZIP_LIMIT = 24 * 1024;
const VITE_POST_PROCESS_MARKER = Buffer.from('/*$vite$:1*/', 'utf8');
const PROFILE_ROUTES = Object.freeze(['/resume', '/portfolio']);
const PROFILE_STYLE_ROOTS = Object.freeze([
  'src/styles/profile/font.css',
  'src/styles/profile/foundation.css',
  'src/styles/profile/portfolio.css',
  'src/styles/profile/print.css',
  'src/styles/profile/resume.css',
]);
const INHERITED_PROFILE_CLIENT_ENTRIES = Object.freeze([
  'node_modules/@astrojs/preact/dist/client.js',
  'src/islands/Search.tsx',
  'src/islands/ThemeToggle.tsx',
]);
const inheritedProfileClientEntries = new Set(
  INHERITED_PROFILE_CLIENT_ENTRIES,
);
const INHERITED_INLINE_STYLE_BASELINES = Object.freeze([
  Object.freeze({
    rawBytes: 59,
    sha256:
      'beff48a0aa3b0522db59c507af7b4d99f3559a6e4bffd09f9f61fa2cc93bfe8c',
  }),
]);
const INHERITED_INLINE_SCRIPT_BASELINES = Object.freeze([
  Object.freeze({
    type: null,
    rawBytes: 2_311,
    sha256:
      'fc4b817e4fdb96d5d122976485e216d655705d8e494dae5834043976f2bf56d7',
  }),
  Object.freeze({
    type: null,
    rawBytes: 130,
    sha256:
      '433585662f852c8c76ded9e6f52054e1a120c78c7c0ecb8048fd3b99faa897f7',
  }),
  Object.freeze({
    type: null,
    rawBytes: 3_483,
    sha256:
      '409643525a3fa9ae40242ac6eaf1f259c6ad8f009e5a27441d07c973ad35973c',
  }),
  Object.freeze({
    type: 'module',
    rawBytes: 149,
    sha256:
      '1fcbdb2b5e08bcec4814584eba64e18347d57c0c03fd65a638d7584fc5f65022',
  }),
  Object.freeze({
    type: null,
    rawBytes: 316,
    sha256:
      '045d36f74a646f78f142c13bcf4d3147c226a7c5f7e052c2f3c2f4964327ac6c',
  }),
  Object.freeze({
    type: null,
    rawBytes: 769,
    sha256:
      'febfe30e5d58ba70c8d89444ea8e869afeb7670a61e09236ad265a7476aebdaf',
  }),
]);

export class ProfileAssetBudgetError extends Error {
  constructor(message, { code, stage = 'asset.budget', details = {}, cause }) {
    super(message, { cause });
    this.name = 'ProfileAssetBudgetError';
    this.code = code;
    this.errorCode = code;
    this.stage = stage;
    this.rule = BUDGET_RULE;
    this.details = deepFreeze(structuredClone(details));
  }
}

/**
 * Verifies the private build manifest against actual output bytes and produces
 * the owner-local, C12-facing profile resource evidence.
 */
export async function analyzeProfileAssets({
  manifestPath = PROFILE_PATHS.buildManifestPath,
  distRoot = PROFILE_PATHS.distRoot,
} = {}) {
  if (!isAbsolute(manifestPath) || !isAbsolute(distRoot)) {
    throw new TypeError('manifestPath and distRoot must be absolute paths');
  }
  const fileStat = await lstat(manifestPath).catch((cause) => {
    throw budgetError(
      'PROFILE_ASSET_MANIFEST_MISSING',
      'The private production build manifest is missing.',
      { manifestPath },
      cause,
    );
  });
  if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
    throw budgetError(
      'PROFILE_ASSET_MANIFEST_INVALID',
      'The private production build manifest is not a regular file.',
      { manifestPath },
    );
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (cause) {
    throw budgetError(
      'PROFILE_ASSET_MANIFEST_INVALID',
      'The private production build manifest is not valid JSON.',
      { manifestPath },
      cause,
    );
  }

  return analyzeManifest(manifest, async (path) => {
    const absolutePath = resolveWithinRoot(distRoot, path, 'emitted asset path');
    const assetStat = await lstat(absolutePath).catch((cause) => {
      throw budgetError(
        'PROFILE_ASSET_OUTPUT_MISSING',
        'An emitted asset recorded by the manifest is missing.',
        { path },
        cause,
      );
    });
    if (assetStat.isSymbolicLink() || !assetStat.isFile()) {
      throw budgetError(
        'PROFILE_ASSET_OUTPUT_INVALID',
        'An emitted asset is not a regular non-symlink file.',
        { path },
      );
    }
    return readFile(absolutePath);
  });
}

async function analyzeManifest(manifest, readAsset) {
  validateManifest(manifest);
  validateManifestIdentity(manifest);
  if (typeof readAsset !== 'function') {
    throw new TypeError('readAsset must be a function');
  }

  const outputFiles = indexOutputFiles(manifest.outputFiles);
  const emittedBytes = new Map();
  for (const [path, expected] of outputFiles) {
    const bytes = Buffer.from(await readAsset(path));
    const actual = {
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
    };
    if (
      actual.bytes !== expected.bytes ||
      actual.sha256 !== expected.sha256
    ) {
      throw budgetError(
        'PROFILE_ASSET_OUTPUT_IDENTITY_MISMATCH',
        'An emitted asset no longer matches its build-manifest identity.',
        { path, expected, actual },
      );
    }
    emittedBytes.set(path, bytes);
  }

  const initialPrerenderOutputs =
    manifest.initialRollupGraphs.prerender.outputs;
  const finalPrerenderOutputs = manifest.rollupGraphs.prerender.outputs;
  const initialCssAssets = indexCssAssets(initialPrerenderOutputs);
  const finalCssAssets = indexCssAssets(finalPrerenderOutputs);
  const cssProvenance = buildCssProvenance(
    initialPrerenderOutputs,
    initialCssAssets,
  );
  assertCompleteStyleProvenance(cssProvenance);

  const routeEvidence = [];
  const reachableProfileAssets = [];
  const routeDocuments = [];
  for (const route of PROFILE_ROUTES) {
    const page = findExactProfilePage(manifest.pageGraph.pages, route);
    const routeDocument = resolveProfileRouteDocument({
      route,
      routeOutputs: manifest.routeOutputs,
      outputFiles,
      emittedBytes,
    });
    const styles = [];
    for (const { depth, order, sheet } of page.styles) {
      const resolved =
        sheet.type === 'external'
          ? resolveExternalStyle({
              route,
              depth,
              order,
              sheet,
              cssAssets: finalCssAssets,
              cssProvenance,
              outputFiles,
              emittedBytes,
              routeDocument,
            })
          : resolveInlineStyle({
              route,
              component: page.component,
              depth,
              order,
              sheet,
              cssAssets: initialCssAssets,
              cssProvenance,
              routeDocument,
            });
      styles.push(resolved.evidence);
      if (resolved.profileOwned) {
        reachableProfileAssets.push(resolved.profileAsset);
      }
    }
    routeDocument.assertAllExternalStylesClaimed();
    routeDocument.assertAllInlineStylesClassified();
    routeDocument.assertInlineScriptsApproved();
    routeDocuments.push(routeDocument);
    routeEvidence.push(
      deepFreeze({
        route,
        component: page.component,
        document: routeDocument.evidence(),
        styles,
      }),
    );
  }

  const uniqueProfileAssets = unionProfileAssets(reachableProfileAssets);
  const reachableStyleRoots = new Set(
    uniqueProfileAssets.flatMap(({ profileStyleRoots }) => profileStyleRoots),
  );
  const unreachableStyleRoots = PROFILE_STYLE_ROOTS.filter(
    (root) => !reachableStyleRoots.has(root),
  );
  if (unreachableStyleRoots.length > 0) {
    throw budgetError(
      'PROFILE_CSS_REACHABILITY_MISSING',
      'One or more profile style roots are emitted but unreachable from the profile routes.',
      { missing: unreachableStyleRoots },
    );
  }
  const totalGzipBytes = uniqueProfileAssets.reduce(
    (total, asset) => total + asset.gzipBytes,
    0,
  );
  if (totalGzipBytes > PROFILE_CSS_GZIP_LIMIT) {
    throw budgetError(
      'PROFILE_CSS_BUDGET_EXCEEDED',
      'The unique reachable profile CSS union exceeds 24 KiB gzip.',
      {
        totalGzipBytes,
        limitGzipBytes: PROFILE_CSS_GZIP_LIMIT,
        assets: uniqueProfileAssets,
      },
    );
  }

  const javaScriptEvidence = analyzeClientJavaScript({
    routeDocuments,
    viteManifest: manifest.viteManifest,
    outputs: manifest.rollupGraphs.client.outputs,
    outputFiles,
  });
  if (
    javaScriptEvidence.profileEntries.length > 0 ||
    javaScriptEvidence.profileChunks.length > 0 ||
    javaScriptEvidence.unknownReachableEntries.length > 0
  ) {
    throw budgetError(
      'PROFILE_CLIENT_JAVASCRIPT_ADDED',
      'A profile route reached an unapproved client entry, or profile-owned source produced client JavaScript.',
      javaScriptEvidence,
    );
  }

  return deepFreeze({
    schemaVersion: 1,
    rule: BUDGET_RULE,
    buildIdentity: manifest.buildIdentity,
    result: 'pass',
    routes: routeEvidence,
    css: {
      limitGzipBytes: PROFILE_CSS_GZIP_LIMIT,
      totalGzipBytes,
      uniqueAssetCount: uniqueProfileAssets.length,
      assets: uniqueProfileAssets,
      gzip: {
        implementation: 'node:zlib.gzipSync',
        options: { level: 9, mtime: 0 },
        node: process.versions.node,
      },
      buildTools: manifest.tools,
    },
    javaScript: {
      profileOwnedHydratedComponents: 0,
      profileOwnedNewClientChunks: 0,
      inheritedClientChunkCount: javaScriptEvidence.inheritedChunkCount,
      inheritedEntryAllowlist:
        javaScriptEvidence.inheritedEntryAllowlist,
      reachableEntries: javaScriptEvidence.reachableEntries,
      reachableChunks: javaScriptEvidence.reachableChunks,
      unknownReachableEntries:
        javaScriptEvidence.unknownReachableEntries,
      profileEntries: javaScriptEvidence.profileEntries,
      profileChunks: javaScriptEvidence.profileChunks,
    },
  });
}

function resolveProfileRouteDocument({
  route,
  routeOutputs,
  outputFiles,
  emittedBytes,
}) {
  const matches = routeOutputs.filter((entry) => entry.route === route);
  if (matches.length !== 1 || !Array.isArray(matches[0].outputs)) {
    throw budgetError(
      'PROFILE_ROUTE_OUTPUT_AMBIGUOUS',
      'The build manifest does not map the profile route to one output set.',
      { route, matches: matches.length },
    );
  }

  const outputs = matches[0].outputs.map((path) =>
    normalizeRelativePath(path, 'route output')
  );
  const htmlOutputs = outputs.filter((path) => path.endsWith('.html'));
  if (htmlOutputs.length !== 1) {
    throw budgetError(
      'PROFILE_ROUTE_DOCUMENT_AMBIGUOUS',
      'The profile route must map to exactly one emitted HTML document.',
      { route, outputs },
    );
  }

  const documentPath = htmlOutputs[0];
  const documentIdentity = outputFiles.get(documentPath);
  const documentBytes = emittedBytes.get(documentPath);
  if (documentIdentity === undefined || documentBytes === undefined) {
    throw budgetError(
      'PROFILE_ROUTE_DOCUMENT_MISSING',
      'The profile route HTML is absent from the verified output inventory.',
      { route, documentPath },
    );
  }

  const html = scanFinalHtml(documentBytes, documentPath);
  const remainingExternalStyles = new Map();
  for (const path of html.externalStyles) {
    remainingExternalStyles.set(
      path,
      (remainingExternalStyles.get(path) ?? 0) + 1,
    );
  }
  const claimedInlineStyles = new Set();

  return {
    route,
    documentPath,
    clientRoots: html.clientRoots,
    claimExternalStyle(path) {
      const remaining = remainingExternalStyles.get(path) ?? 0;
      if (remaining < 1) {
        throw budgetError(
          'PROFILE_CSS_FINAL_DOCUMENT_MISMATCH',
          'A page-graph stylesheet is absent from the final route HTML.',
          { route, documentPath, path },
        );
      }
      remainingExternalStyles.set(path, remaining - 1);
    },
    claimInlineStyle(expectedBytes) {
      const candidates = html.inlineStyles.filter(
        (style) =>
          !claimedInlineStyles.has(style.styleIndex) &&
          style.rawBytes === expectedBytes.byteLength &&
          style.sha256 === sha256(expectedBytes) &&
          style.content.equals(expectedBytes),
      );
      if (candidates.length !== 1) {
        throw budgetError(
          'PROFILE_CSS_INLINE_FINAL_DOCUMENT_MISMATCH',
          'An inline page-graph stylesheet does not have one exact occurrence in the final route HTML.',
          {
            route,
            documentPath,
            expected: {
              rawBytes: expectedBytes.byteLength,
              sha256: sha256(expectedBytes),
            },
            matches: candidates.map(({ styleIndex }) => styleIndex),
          },
        );
      }
      const style = candidates[0];
      claimedInlineStyles.add(style.styleIndex);
      return deepFreeze({
        documentPath,
        documentSha256: documentIdentity.sha256,
        documentRawBytes: documentIdentity.bytes,
        styleIndex: style.styleIndex,
        startByte: style.startByte,
        endByte: style.endByte,
        sha256: style.sha256,
        rawBytes: style.rawBytes,
      });
    },
    assertAllExternalStylesClaimed() {
      const unclaimed = [...remainingExternalStyles.entries()]
        .filter(([, count]) => count !== 0)
        .map(([path, count]) => ({ path, count }))
        .sort((left, right) => left.path.localeCompare(right.path));
      if (unclaimed.length > 0) {
        throw budgetError(
          'PROFILE_CSS_FINAL_DOCUMENT_AMBIGUOUS',
          'The final route HTML contains an external stylesheet absent from the page graph.',
          { route, documentPath, unclaimed },
        );
      }
    },
    assertAllInlineStylesClassified() {
      const unclaimed = html.inlineStyles.filter(
        ({ styleIndex }) => !claimedInlineStyles.has(styleIndex),
      );
      const seenBaselines = new Set();
      const unapproved = [];
      for (const style of unclaimed) {
        const baselineIndex = INHERITED_INLINE_STYLE_BASELINES.findIndex(
          (baseline) =>
            baseline.rawBytes === style.rawBytes &&
            baseline.sha256 === style.sha256,
        );
        if (baselineIndex === -1 || seenBaselines.has(baselineIndex)) {
          unapproved.push({
            styleIndex: style.styleIndex,
            rawBytes: style.rawBytes,
            sha256: style.sha256,
          });
        } else {
          seenBaselines.add(baselineIndex);
        }
      }
      if (unapproved.length > 0) {
        throw budgetError(
          'PROFILE_CSS_INLINE_UNCLASSIFIED',
          'The final route HTML contains an unclassified or duplicate inline stylesheet.',
          { route, documentPath, unapproved },
        );
      }
    },
    assertInlineScriptsApproved() {
      const executable = html.inlineScripts.filter(
        ({ executable: isExecutable }) => isExecutable,
      );
      if (executable.length === 0) return;

      const seenBaselines = new Set();
      const unapproved = [];
      for (const script of executable) {
        const baselineIndex = INHERITED_INLINE_SCRIPT_BASELINES.findIndex(
          (baseline) =>
            baseline.type === script.type &&
            baseline.rawBytes === script.rawBytes &&
            baseline.sha256 === script.sha256,
        );
        if (baselineIndex === -1 || seenBaselines.has(baselineIndex)) {
          unapproved.push({
            scriptIndex: script.scriptIndex,
            type: script.type,
            rawBytes: script.rawBytes,
            sha256: script.sha256,
          });
        } else {
          seenBaselines.add(baselineIndex);
        }
      }
      if (
        unapproved.length > 0 ||
        seenBaselines.size !== INHERITED_INLINE_SCRIPT_BASELINES.length
      ) {
        throw budgetError(
          'PROFILE_INLINE_SCRIPT_UNAPPROVED',
          'The final route HTML executable inline-script set differs from the approved inherited baseline.',
          {
            route,
            documentPath,
            unapproved,
            approvedMatches: seenBaselines.size,
            approvedExpected: INHERITED_INLINE_SCRIPT_BASELINES.length,
          },
        );
      }
    },
    evidence() {
      return deepFreeze({
        path: documentPath,
        sha256: documentIdentity.sha256,
        rawBytes: documentIdentity.bytes,
        externalStyles: [...html.externalStyles],
        inlineStyles: html.inlineStyles.map(
          ({ content: _content, ...style }) => style,
        ),
        inlineScripts: html.inlineScripts.map(
          ({ content: _content, ...script }) => script,
        ),
        clientRoots: html.clientRoots,
      });
    },
  };
}

function scanFinalHtml(bytes, documentPath) {
  const documentBytes = Buffer.from(bytes);
  const source = documentBytes.toString('utf8');
  if (!Buffer.from(source, 'utf8').equals(documentBytes)) {
    throw budgetError(
      'PROFILE_ROUTE_DOCUMENT_ENCODING_INVALID',
      'The emitted profile document is not canonical UTF-8.',
      { documentPath },
    );
  }

  const lowerSource = source.toLowerCase();
  const externalStyles = [];
  const inlineStyles = [];
  const inlineScripts = [];
  const clientRoots = [];
  let cursor = 0;
  let styleIndex = 0;
  let scriptIndex = 0;

  while (cursor < source.length) {
    const open = source.indexOf('<', cursor);
    if (open === -1) break;
    if (source.startsWith('<!--', open)) {
      const commentEnd = source.indexOf('-->', open + 4);
      if (commentEnd === -1) {
        throw malformedHtml(documentPath, 'unterminated comment');
      }
      cursor = commentEnd + 3;
      continue;
    }

    let nameStart = open + 1;
    if (source[nameStart] === '/' || source[nameStart] === '!' ||
        source[nameStart] === '?') {
      const ignoredEnd = findHtmlTagEnd(source, nameStart);
      if (ignoredEnd === -1) {
        throw malformedHtml(documentPath, 'unterminated markup');
      }
      cursor = ignoredEnd + 1;
      continue;
    }

    while (isHtmlWhitespace(source[nameStart])) nameStart += 1;
    let nameEnd = nameStart;
    while (/[A-Za-z0-9:-]/u.test(source[nameEnd] ?? '')) nameEnd += 1;
    if (nameEnd === nameStart) {
      cursor = open + 1;
      continue;
    }

    const tagName = source.slice(nameStart, nameEnd).toLowerCase();
    const tagEnd = findHtmlTagEnd(source, nameEnd);
    if (tagEnd === -1) {
      throw malformedHtml(documentPath, `unterminated <${tagName}> tag`);
    }
    const attributes = parseHtmlAttributes(
      source.slice(nameEnd, tagEnd),
      documentPath,
      tagName,
    );

    if (tagName === 'link') {
      const rel = (attributes.get('rel') ?? '')
        .toLowerCase()
        .split(/\s+/u)
        .filter(Boolean);
      if (rel.includes('stylesheet')) {
        const href = attributes.get('href');
        if (href === undefined) {
          throw malformedHtml(
            documentPath,
            'stylesheet link without href',
          );
        }
        externalStyles.push(
          normalizeInternalOutputUrl(href, 'stylesheet href'),
        );
      }
      if (
        rel.includes('modulepreload') ||
        (rel.includes('preload') &&
          (attributes.get('as') ?? '').toLowerCase() === 'script')
      ) {
        const href = attributes.get('href');
        if (href === undefined) {
          throw malformedHtml(
            documentPath,
            'client preload link without href',
          );
        }
        clientRoots.push({
          role: 'modulepreload',
          path: normalizeInternalOutputUrl(href, 'client preload href'),
        });
      }
    } else if (tagName === 'astro-island') {
      for (const [attribute, role] of [
        ['component-url', 'component'],
        ['renderer-url', 'renderer'],
      ]) {
        const value = attributes.get(attribute);
        if (value === undefined) {
          throw malformedHtml(
            documentPath,
            `astro-island without ${attribute}`,
          );
        }
        clientRoots.push({
          role,
          path: normalizeInternalOutputUrl(value, attribute),
        });
      }
    } else if (tagName === 'script' && attributes.has('src')) {
      clientRoots.push({
        role: 'script',
        path: normalizeInternalOutputUrl(
          attributes.get('src'),
          'script src',
        ),
      });
    }

    if (tagName === 'style' || tagName === 'script') {
      const closeStart = findRawTextClose(
        lowerSource,
        tagName,
        tagEnd + 1,
      );
      if (closeStart === -1) {
        throw malformedHtml(
          documentPath,
          `unterminated <${tagName}> raw-text element`,
        );
      }
      const closeEnd = findHtmlTagEnd(source, closeStart + 2 + tagName.length);
      if (closeEnd === -1) {
        throw malformedHtml(
          documentPath,
          `unterminated </${tagName}> tag`,
        );
      }
      if (tagName === 'style') {
        const contentStart = tagEnd + 1;
        const content = Buffer.from(
          source.slice(contentStart, closeStart),
          'utf8',
        );
        inlineStyles.push({
          styleIndex,
          startByte: Buffer.byteLength(source.slice(0, contentStart)),
          endByte: Buffer.byteLength(source.slice(0, closeStart)),
          rawBytes: content.byteLength,
          sha256: sha256(content),
          content,
        });
        styleIndex += 1;
      } else if (!attributes.has('src')) {
        const contentStart = tagEnd + 1;
        const content = Buffer.from(
          source.slice(contentStart, closeStart),
          'utf8',
        );
        const rawType = attributes.get('type');
        const type =
          rawType === undefined || rawType.trim() === ''
            ? null
            : rawType.trim().toLowerCase();
        inlineScripts.push({
          scriptIndex,
          type,
          executable: type !== 'application/ld+json',
          startByte: Buffer.byteLength(source.slice(0, contentStart)),
          endByte: Buffer.byteLength(source.slice(0, closeStart)),
          rawBytes: content.byteLength,
          sha256: sha256(content),
          content,
        });
        scriptIndex += 1;
      }
      cursor = closeEnd + 1;
      continue;
    }

    cursor = tagEnd + 1;
  }

  return {
    externalStyles: Object.freeze([...externalStyles]),
    inlineStyles: Object.freeze(inlineStyles),
    inlineScripts: Object.freeze(inlineScripts),
    clientRoots: Object.freeze(
      clientRoots.map((root) => deepFreeze(root)),
    ),
  };
}

function findRawTextClose(lowerSource, tagName, start) {
  const marker = `</${tagName}`;
  let cursor = start;
  while (cursor < lowerSource.length) {
    const candidate = lowerSource.indexOf(marker, cursor);
    if (candidate === -1) return -1;
    const boundary = lowerSource[candidate + marker.length];
    if (
      boundary === '>' ||
      boundary === '/' ||
      isHtmlWhitespace(boundary)
    ) {
      return candidate;
    }
    cursor = candidate + marker.length;
  }
  return -1;
}

function findHtmlTagEnd(source, start) {
  let quote = null;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote !== null) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }
  return -1;
}

function parseHtmlAttributes(source, documentPath, tagName) {
  const attributes = new Map();
  let cursor = 0;
  while (cursor < source.length) {
    while (isHtmlWhitespace(source[cursor])) cursor += 1;
    if (cursor >= source.length || source[cursor] === '/') break;

    const nameStart = cursor;
    while (
      cursor < source.length &&
      !isHtmlWhitespace(source[cursor]) &&
      !['=', '/', '>'].includes(source[cursor])
    ) {
      cursor += 1;
    }
    if (cursor === nameStart) {
      throw malformedHtml(documentPath, `invalid <${tagName}> attribute`);
    }
    const name = source.slice(nameStart, cursor).toLowerCase();
    while (isHtmlWhitespace(source[cursor])) cursor += 1;

    let value = '';
    if (source[cursor] === '=') {
      cursor += 1;
      while (isHtmlWhitespace(source[cursor])) cursor += 1;
      const quote = source[cursor];
      if (quote === '"' || quote === "'") {
        cursor += 1;
        const valueStart = cursor;
        const valueEnd = source.indexOf(quote, cursor);
        if (valueEnd === -1) {
          throw malformedHtml(
            documentPath,
            `unterminated ${name} attribute`,
          );
        }
        value = source.slice(valueStart, valueEnd);
        cursor = valueEnd + 1;
      } else {
        const valueStart = cursor;
        while (
          cursor < source.length &&
          !isHtmlWhitespace(source[cursor]) &&
          source[cursor] !== '/'
        ) {
          cursor += 1;
        }
        value = source.slice(valueStart, cursor);
      }
    }
    if (attributes.has(name)) {
      throw malformedHtml(
        documentPath,
        `duplicate ${name} attribute on <${tagName}>`,
      );
    }
    attributes.set(name, value);
  }
  return attributes;
}

function normalizeInternalOutputUrl(value, label) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    value.includes('\0') ||
    value.includes('?') ||
    value.includes('#')
  ) {
    throw budgetError(
      'PROFILE_ROUTE_EXTERNAL_RESOURCE',
      `The profile route contains a non-output ${label}.`,
      { value },
    );
  }
  let decoded;
  try {
    decoded = decodeURIComponent(value);
  } catch (cause) {
    throw budgetError(
      'PROFILE_ASSET_PATH_INVALID',
      `The profile route contains an invalid ${label}.`,
      { value },
      cause,
    );
  }
  return normalizeRelativePath(decoded.slice(1), label);
}

function isHtmlWhitespace(value) {
  return value === ' ' || value === '\n' || value === '\r' ||
    value === '\t' || value === '\f';
}

function malformedHtml(documentPath, reason) {
  return budgetError(
    'PROFILE_ROUTE_DOCUMENT_INVALID',
    'The emitted profile HTML could not be parsed fail-closed.',
    { documentPath, reason },
  );
}

function resolveExternalStyle({
  route,
  depth,
  order,
  sheet,
  cssAssets,
  cssProvenance,
  outputFiles,
  emittedBytes,
  routeDocument,
}) {
  const path = normalizeRelativePath(sheet.src, 'external stylesheet');
  routeDocument.claimExternalStyle(path);
  const provenance = cssProvenance.get(path);
  const rollupAsset = cssAssets.get(path);
  const outputIdentity = outputFiles.get(path);
  const bytes = emittedBytes.get(path);
  if (
    provenance === undefined ||
    rollupAsset === undefined ||
    outputIdentity === undefined ||
    bytes === undefined
  ) {
    throw budgetError(
      'PROFILE_CSS_PROVENANCE_MISSING',
      'A route stylesheet cannot be traced through Rollup to emitted bytes.',
      { route, path },
    );
  }
  if (
    rollupAsset.bytes !== outputIdentity.bytes ||
    rollupAsset.sha256 !== outputIdentity.sha256 ||
    !rollupAsset.content.equals(bytes)
  ) {
    throw budgetError(
      'PROFILE_CSS_PROVENANCE_AMBIGUOUS',
      'Rollup and final-output identities disagree for a route stylesheet.',
      { route, path, rollupAsset, outputIdentity },
    );
  }

  const profileOwned = provenance.profileStyleRoots.length > 0;
  const identity = {
    kind: 'external',
    path,
    sha256: outputIdentity.sha256,
    rawBytes: outputIdentity.bytes,
  };
  return {
    profileOwned,
    evidence: deepFreeze({
      depth,
      order,
      ...identity,
      ownership: profileOwned ? 'profile' : 'baseline',
      profileStyleRoots: provenance.profileStyleRoots,
      provenanceChunks: provenance.chunks,
    }),
    profileAsset: profileOwned
      ? createProfileAsset({
          identity,
          bytes,
          routes: [route],
          profileStyleRoots: provenance.profileStyleRoots,
          provenanceChunks: provenance.chunks,
          emittedAssetPath: path,
        })
      : undefined,
  };
}

function resolveInlineStyle({
  route,
  component,
  depth,
  order,
  sheet,
  cssAssets,
  cssProvenance,
  routeDocument,
}) {
  if (
    typeof sheet.contentBase64 !== 'string' ||
    !isSha256(sheet.sha256) ||
    !Number.isSafeInteger(sheet.bytes) ||
    sheet.bytes < 0
  ) {
    throw budgetError(
      'PROFILE_CSS_INLINE_IDENTITY_INVALID',
      'An inline stylesheet lacks exact byte evidence.',
      { route, depth, order },
    );
  }
  const bytes = decodeCanonicalBase64(sheet.contentBase64);
  const actual = { bytes: bytes.byteLength, sha256: sha256(bytes) };
  if (actual.bytes !== sheet.bytes || actual.sha256 !== sheet.sha256) {
    throw budgetError(
      'PROFILE_CSS_INLINE_IDENTITY_MISMATCH',
      'An inline stylesheet does not match its build-manifest identity.',
      { route, depth, order, expected: sheet, actual },
    );
  }

  const matches = [...cssAssets.values()].filter(
    (asset) =>
      cssProvenance.get(asset.file)?.modules.includes(component),
  );
  if (matches.length !== 1) {
    throw budgetError(
      'PROFILE_CSS_PROVENANCE_AMBIGUOUS',
      'An inline stylesheet does not map to exactly one route-owned Rollup asset.',
      {
        route,
        component,
        sha256: sheet.sha256,
        matches: matches.map(({ file }) => file),
      },
    );
  }

  const rollupAsset = matches[0];
  const provenance = cssProvenance.get(rollupAsset.file);
  assertInlineCssTransform({
    route,
    sourcePath: rollupAsset.file,
    sourceBytes: rollupAsset.content,
    finalBytes: bytes,
  });
  const profileOwned = provenance.profileStyleRoots.length > 0;
  const finalLocation = routeDocument.claimInlineStyle(bytes);
  const path = `${finalLocation.documentPath}#style-${finalLocation.styleIndex}`;
  const identity = {
    kind: 'inline',
    path,
    sha256: sheet.sha256,
    rawBytes: sheet.bytes,
  };
  return {
    profileOwned,
    evidence: deepFreeze({
      depth,
      order,
      ...identity,
      emittedAssetPath: finalLocation.documentPath,
      finalLocation,
      sourceRollupAssetPath: rollupAsset.file,
      preInlineAssetIdentity: {
        sha256: rollupAsset.sha256,
        rawBytes: rollupAsset.bytes,
      },
      ownership: profileOwned ? 'profile' : 'baseline',
      profileStyleRoots: provenance.profileStyleRoots,
      provenanceChunks: provenance.chunks,
    }),
    profileAsset: profileOwned
      ? createProfileAsset({
          identity,
          bytes,
          routes: [route],
          profileStyleRoots: provenance.profileStyleRoots,
          provenanceChunks: provenance.chunks,
          emittedAssetPath: finalLocation.documentPath,
          finalLocation,
          sourceRollupAssetPath: rollupAsset.file,
        })
      : undefined,
  };
}

function createProfileAsset({
  identity,
  bytes,
  routes,
  profileStyleRoots,
  provenanceChunks,
  emittedAssetPath,
  finalLocation,
  sourceRollupAssetPath,
}) {
  return {
    ...identity,
    emittedAssetPath,
    finalLocation,
    sourceRollupAssetPath,
    gzipBytes: gzipSync(bytes, { level: 9, mtime: 0 }).byteLength,
    routes,
    profileStyleRoots,
    provenanceChunks,
  };
}

function unionProfileAssets(assets) {
  const byIdentity = new Map();
  for (const asset of assets) {
    if (asset === undefined) continue;
    const key = `${asset.sha256}:${asset.rawBytes}`;
    const current = byIdentity.get(key);
    if (current === undefined) {
      byIdentity.set(key, {
        ...asset,
        routes: new Set(asset.routes),
        profileStyleRoots: new Set(asset.profileStyleRoots),
        provenanceChunks: new Set(asset.provenanceChunks),
        emittedAssetPaths: new Set([asset.emittedAssetPath]),
        finalLocations: new Map(
          asset.finalLocation === undefined
            ? []
            : [[
                finalLocationKey(asset.finalLocation),
                asset.finalLocation,
              ]],
        ),
        sourceRollupAssetPaths: new Set(
          asset.sourceRollupAssetPath === undefined
            ? []
            : [asset.sourceRollupAssetPath],
        ),
      });
      continue;
    }
    current.routes.add(asset.routes[0]);
    for (const root of asset.profileStyleRoots) current.profileStyleRoots.add(root);
    for (const chunk of asset.provenanceChunks) current.provenanceChunks.add(chunk);
    current.emittedAssetPaths.add(asset.emittedAssetPath);
    if (asset.finalLocation !== undefined) {
      current.finalLocations.set(
        finalLocationKey(asset.finalLocation),
        asset.finalLocation,
      );
    }
    if (asset.sourceRollupAssetPath !== undefined) {
      current.sourceRollupAssetPaths.add(asset.sourceRollupAssetPath);
    }
  }

  return [...byIdentity.values()]
    .map((asset) =>
      deepFreeze({
        kind: asset.kind,
        path: asset.path,
        emittedAssetPaths: [...asset.emittedAssetPaths].sort(),
        sha256: asset.sha256,
        rawBytes: asset.rawBytes,
        gzipBytes: asset.gzipBytes,
        routes: [...asset.routes].sort(),
        profileStyleRoots: [...asset.profileStyleRoots].sort(),
        provenanceChunks: [...asset.provenanceChunks].sort(),
        finalLocations: [...asset.finalLocations.values()].sort(
          (left, right) =>
            left.documentPath.localeCompare(right.documentPath) ||
            left.styleIndex - right.styleIndex,
        ),
        sourceRollupAssetPaths:
          [...asset.sourceRollupAssetPaths].sort(),
      }),
    )
    .sort((left, right) => left.path.localeCompare(right.path));
}

function finalLocationKey(location) {
  return `${location.documentPath}\0${location.styleIndex}\0${location.sha256}`;
}

function indexCssAssets(outputs) {
  const result = new Map();
  for (const output of outputs) {
    if (output.type !== 'asset' || !output.file.endsWith('.css')) continue;
    const path = normalizeRelativePath(output.file, 'Rollup CSS asset');
    if (
      result.has(path) ||
      typeof output.contentBase64 !== 'string' ||
      !isSha256(output.sha256) ||
      !Number.isSafeInteger(output.bytes) ||
      output.bytes < 0
    ) {
      throw budgetError(
        'PROFILE_CSS_PROVENANCE_AMBIGUOUS',
        'The Rollup CSS asset manifest is duplicate or incomplete.',
        { path },
      );
    }
    const content = decodeCanonicalBase64(output.contentBase64);
    const actual = {
      bytes: content.byteLength,
      sha256: sha256(content),
    };
    if (actual.bytes !== output.bytes || actual.sha256 !== output.sha256) {
      throw budgetError(
        'PROFILE_CSS_PROVENANCE_AMBIGUOUS',
        'The Rollup CSS asset content does not match its recorded identity.',
        { path, expected: { bytes: output.bytes, sha256: output.sha256 }, actual },
      );
    }
    result.set(path, {
      file: path,
      bytes: output.bytes,
      sha256: output.sha256,
      content,
    });
  }
  if (result.size === 0) {
    throw budgetError(
      'PROFILE_CSS_PROVENANCE_MISSING',
      'The Rollup manifest contains no CSS assets.',
    );
  }
  return result;
}

function buildCssProvenance(outputs, cssAssets) {
  const result = new Map();
  for (const chunk of outputs) {
    if (chunk.type !== 'chunk') continue;
    for (const rawPath of chunk.importedCss ?? []) {
      const path = normalizeRelativePath(rawPath, 'imported CSS asset');
      if (!cssAssets.has(path)) {
        throw budgetError(
          'PROFILE_CSS_PROVENANCE_MISSING',
          'A Rollup chunk references an unmanifested CSS asset.',
          { chunk: chunk.file, path },
        );
      }
      const current = result.get(path) ?? {
        chunks: new Set(),
        modules: new Set(),
        profileStyleRoots: new Set(),
      };
      current.chunks.add(chunk.file);
      for (const module of chunk.modules) {
        current.modules.add(module);
        const modulePath = moduleOwnershipPath(module);
        if (
          modulePath.startsWith('src/styles/profile/') &&
          !PROFILE_STYLE_ROOTS.includes(modulePath)
        ) {
          throw budgetError(
            'PROFILE_CSS_SOURCE_UNAPPROVED',
            'A stylesheet under the profile ownership root is not explicitly approved.',
            { chunk: chunk.file, module, modulePath },
          );
        }
        if (
          isProfileComponentStyleModule(modulePath, module) &&
          !PROFILE_STYLE_ROOTS.includes(modulePath)
        ) {
          throw budgetError(
            'PROFILE_CSS_SOURCE_UNAPPROVED',
            'A profile component or route emitted component-local CSS outside the approved style roots.',
            { chunk: chunk.file, module, modulePath },
          );
        }
        if (PROFILE_STYLE_ROOTS.includes(modulePath)) {
          current.profileStyleRoots.add(modulePath);
        }
      }
      result.set(path, current);
    }
  }

  return new Map(
    [...result.entries()].map(([path, provenance]) => [
      path,
      deepFreeze({
        chunks: [...provenance.chunks].sort(),
        modules: [...provenance.modules].sort(),
        profileStyleRoots: [...provenance.profileStyleRoots].sort(),
      }),
    ]),
  );
}

function moduleOwnershipPath(module) {
  if (typeof module !== 'string' || module.length === 0) {
    throw budgetError(
      'PROFILE_CSS_PROVENANCE_AMBIGUOUS',
      'A CSS provenance module identifier is invalid.',
      { module },
    );
  }
  const query = module.indexOf('?');
  const fragment = module.indexOf('#');
  const boundary = [query, fragment]
    .filter((index) => index >= 0)
    .reduce((lowest, index) => Math.min(lowest, index), module.length);
  return module.slice(0, boundary);
}

function isProfileComponentStyleModule(modulePath, module) {
  const profileOwner =
    modulePath.startsWith('src/components/profile/') ||
    modulePath.startsWith('src/lib/profile/') ||
    modulePath === 'src/pages/resume.astro' ||
    modulePath === 'src/pages/portfolio.astro';
  return profileOwner && /[?&]type=style(?:&|$)/u.test(module);
}

function assertInlineCssTransform({
  route,
  sourcePath,
  sourceBytes,
  finalBytes,
}) {
  if (sourceBytes.equals(finalBytes)) return;
  if (
    sourceBytes.byteLength ===
      finalBytes.byteLength + VITE_POST_PROCESS_MARKER.byteLength &&
    sourceBytes.subarray(0, finalBytes.byteLength).equals(finalBytes) &&
    sourceBytes.subarray(finalBytes.byteLength).equals(
      VITE_POST_PROCESS_MARKER,
    )
  ) {
    return;
  }
  throw budgetError(
    'PROFILE_CSS_INLINE_TRANSFORM_UNAPPROVED',
    'An inline stylesheet does not match an approved deterministic Rollup-to-HTML transform.',
    {
      route,
      sourcePath,
      source: {
        rawBytes: sourceBytes.byteLength,
        sha256: sha256(sourceBytes),
      },
      final: {
        rawBytes: finalBytes.byteLength,
        sha256: sha256(finalBytes),
      },
    },
  );
}

function assertCompleteStyleProvenance(provenance) {
  const found = new Set(
    [...provenance.values()].flatMap(({ profileStyleRoots }) =>
      profileStyleRoots,
    ),
  );
  const missing = PROFILE_STYLE_ROOTS.filter((root) => !found.has(root));
  if (missing.length > 0) {
    throw budgetError(
      'PROFILE_CSS_PROVENANCE_MISSING',
      'One or more authored profile style roots have no emitted provenance.',
      { missing },
    );
  }
}

function analyzeClientJavaScript({
  routeDocuments,
  viteManifest,
  outputs,
  outputFiles,
}) {
  const manifestEntries = Object.entries(viteManifest);
  const manifestByFile = new Map();
  for (const [key, entry] of manifestEntries) {
    if (
      !isPlainRecord(entry) ||
      typeof entry.file !== 'string' ||
      !entry.file.endsWith('.js')
    ) {
      throw budgetError(
        'PROFILE_CLIENT_MANIFEST_INVALID',
        'The Vite client manifest contains an invalid JavaScript entry.',
        { key },
      );
    }
    const file = normalizeRelativePath(entry.file, 'client manifest file');
    const entries = manifestByFile.get(file) ?? [];
    entries.push({ key, entry, file });
    manifestByFile.set(file, entries);
  }

  const profileEntries = Object.entries(viteManifest)
    .filter(
      ([key, entry]) =>
        isProfileClientSource(key) ||
        isProfileClientSource(entry.src ?? ''),
    )
    .map(([key, entry]) => ({ key, file: entry.file, src: entry.src ?? null }))
    .sort((left, right) => left.key.localeCompare(right.key));
  const clientChunks = outputs.filter(
    (output) => output.type === 'chunk' && output.file.endsWith('.js'),
  );
  const clientChunksByFile = new Map();
  for (const chunk of clientChunks) {
    const file = normalizeRelativePath(chunk.file, 'client chunk');
    if (
      clientChunksByFile.has(file) ||
      !Array.isArray(chunk.modules)
    ) {
      throw budgetError(
        'PROFILE_CLIENT_GRAPH_AMBIGUOUS',
        'The client Rollup graph contains a duplicate or invalid chunk.',
        { file },
      );
    }
    clientChunksByFile.set(file, chunk);
  }

  const profileChunks = clientChunks
    .map((chunk) => ({
      file: chunk.file,
      profileModules: chunk.modules.filter(isProfileClientSource).sort(),
    }))
    .filter(({ profileModules }) => profileModules.length > 0)
    .sort((left, right) => left.file.localeCompare(right.file));

  const reachableEntries = [];
  const unknownReachableEntries = [];
  const reachableChunks = new Map();

  for (const routeDocument of routeDocuments) {
    const directRoots = routeDocument.clientRoots.filter(
      ({ role }) => role !== 'modulepreload',
    );
    const preloadRoots = routeDocument.clientRoots.filter(
      ({ role }) => role === 'modulepreload',
    );
    for (const root of directRoots) {
      processHtmlRoot(routeDocument, root, true);
    }
    for (const root of preloadRoots) {
      processHtmlRoot(routeDocument, root, false);
    }
  }

  function processHtmlRoot(routeDocument, root, requireAllowlistedSource) {
    const candidates = manifestByFile.get(root.path) ?? [];
    if (candidates.length !== 1) {
      throw budgetError(
        'PROFILE_CLIENT_ENTRY_UNTRACEABLE',
        'A final profile HTML client root does not map to one Vite manifest entry.',
        {
          route: routeDocument.route,
          documentPath: routeDocument.documentPath,
          root,
          matches: candidates.map(({ key }) => key),
        },
      );
    }

    const candidate = candidates[0];
    const source = candidate.entry.src ?? candidate.key;
    const entryEvidence = {
      route: routeDocument.route,
      documentPath: routeDocument.documentPath,
      role: root.role,
      path: root.path,
      manifestKey: candidate.key,
      source,
    };
    reachableEntries.push(entryEvidence);
    const inherited = requireAllowlistedSource
      ? inheritedProfileClientEntries.has(source)
      : reachableChunks.get(root.path)?.routes.has(routeDocument.route) ===
        true;
    if (!inherited) unknownReachableEntries.push(entryEvidence);

    visitManifestEntry(
      candidate.key,
      routeDocument.route,
      new Set(),
    );
  }

  function visitManifestEntry(key, route, visiting) {
    if (visiting.has(key)) {
      throw budgetError(
        'PROFILE_CLIENT_GRAPH_AMBIGUOUS',
        'The Vite client manifest contains a cyclic dependency.',
        { key, route, visiting: [...visiting] },
      );
    }
    const entry = viteManifest[key];
    if (!isPlainRecord(entry) || typeof entry.file !== 'string') {
      throw budgetError(
        'PROFILE_CLIENT_DEPENDENCY_MISSING',
        'A reachable client manifest dependency is missing.',
        { key, route },
      );
    }

    const file = normalizeRelativePath(entry.file, 'reachable client file');
    const chunk = clientChunksByFile.get(file);
    const outputIdentity = outputFiles.get(file);
    if (chunk === undefined || outputIdentity === undefined) {
      throw budgetError(
        'PROFILE_CLIENT_OUTPUT_UNTRACEABLE',
        'A reachable client manifest entry is absent from Rollup or final output.',
        { key, route, file },
      );
    }
    const current = reachableChunks.get(file) ?? {
      file,
      sha256: outputIdentity.sha256,
      rawBytes: outputIdentity.bytes,
      routes: new Set(),
      manifestKeys: new Set(),
      modules: new Set(),
    };
    current.routes.add(route);
    current.manifestKeys.add(key);
    for (const module of chunk.modules) current.modules.add(module);
    reachableChunks.set(file, current);

    const nextVisiting = new Set(visiting);
    nextVisiting.add(key);
    const dependencies = [
      ...(entry.imports ?? []),
      ...(entry.dynamicImports ?? []),
    ];
    if (dependencies.some((dependency) => typeof dependency !== 'string')) {
      throw budgetError(
        'PROFILE_CLIENT_MANIFEST_INVALID',
        'A reachable client manifest entry has invalid dependencies.',
        { key, route },
      );
    }
    for (const dependency of dependencies) {
      visitManifestEntry(dependency, route, nextVisiting);
    }
  }

  const reachableChunkEvidence = [...reachableChunks.values()]
    .map((chunk) =>
      deepFreeze({
        file: chunk.file,
        sha256: chunk.sha256,
        rawBytes: chunk.rawBytes,
        routes: [...chunk.routes].sort(),
        manifestKeys: [...chunk.manifestKeys].sort(),
        modules: [...chunk.modules].sort(),
      })
    )
    .sort((left, right) => left.file.localeCompare(right.file));

  return deepFreeze({
    profileEntries,
    profileChunks,
    unknownReachableEntries: unknownReachableEntries.sort(
      compareReachableEntries,
    ),
    reachableEntries: reachableEntries.sort(compareReachableEntries),
    reachableChunks: reachableChunkEvidence,
    inheritedEntryAllowlist: [...INHERITED_PROFILE_CLIENT_ENTRIES],
    inheritedChunkCount: reachableChunkEvidence.length,
  });
}

function compareReachableEntries(left, right) {
  return (
    left.route.localeCompare(right.route) ||
    left.role.localeCompare(right.role) ||
    left.path.localeCompare(right.path)
  );
}

function isProfileClientSource(path) {
  return (
    path.startsWith('src/components/profile/') ||
    path.startsWith('src/lib/profile/') ||
    path.startsWith('src/styles/profile/') ||
    path === 'src/components/Header.astro' ||
    path === 'src/islands/MobileNav.tsx' ||
    path === 'src/layouts/BaseLayout.astro' ||
    path === 'src/lib/layout/json-ld.ts' ||
    path === 'src/lib/layout/profile-resources.ts' ||
    path === 'src/lib/navigation.ts' ||
    path === 'src/pages/resume.astro' ||
    path === 'src/pages/portfolio.astro'
  );
}

function findExactProfilePage(pages, route) {
  const matches = pages.filter(
    (page) => (page.route.pathname ?? page.route.route) === route,
  );
  if (matches.length !== 1 || !Array.isArray(matches[0].styles)) {
    throw budgetError(
      'PROFILE_ROUTE_GRAPH_AMBIGUOUS',
      'The build manifest does not contain one exact profile route graph.',
      { route, matches: matches.length },
    );
  }
  return matches[0];
}

function indexOutputFiles(files) {
  const result = new Map();
  for (const file of files) {
    const path = normalizeRelativePath(file.path, 'output file');
    if (
      result.has(path) ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes < 0 ||
      !isSha256(file.sha256)
    ) {
      throw budgetError(
        'PROFILE_ASSET_MANIFEST_INVALID',
        'The output file inventory is duplicate or invalid.',
        { path },
      );
    }
    result.set(path, { bytes: file.bytes, sha256: file.sha256 });
  }
  return result;
}

function validateManifest(manifest) {
  if (
    !isPlainRecord(manifest) ||
    manifest.schemaVersion !== 1 ||
    !isPlainRecord(manifest.buildIdentity) ||
    !isSha256(manifest.buildIdentity.id) ||
    !isSha256(manifest.buildIdentity.sourceGraphSha256) ||
    !isSha256(manifest.buildIdentity.outputSha256) ||
    !Array.isArray(manifest.buildIdentity.routes) ||
    !isPlainRecord(manifest.pageGraph) ||
    !Array.isArray(manifest.pageGraph.pages) ||
    !Array.isArray(manifest.routeOutputs) ||
    !isPlainRecord(manifest.viteManifest) ||
    !isPlainRecord(manifest.initialRollupGraphs) ||
    !isPlainRecord(manifest.initialRollupGraphs.client) ||
    !Array.isArray(manifest.initialRollupGraphs.client.outputs) ||
    !isPlainRecord(manifest.initialRollupGraphs.prerender) ||
    !Array.isArray(manifest.initialRollupGraphs.prerender.outputs) ||
    !isPlainRecord(manifest.rollupGraphs) ||
    !isPlainRecord(manifest.rollupGraphs.client) ||
    !Array.isArray(manifest.rollupGraphs.client.outputs) ||
    !isPlainRecord(manifest.rollupGraphs.prerender) ||
    !Array.isArray(manifest.rollupGraphs.prerender.outputs) ||
    !Array.isArray(manifest.outputFiles) ||
    !isPlainRecord(manifest.tools)
  ) {
    throw budgetError(
      'PROFILE_ASSET_MANIFEST_INVALID',
      'The production build manifest is incomplete.',
    );
  }
  for (const route of PROFILE_ROUTES) {
    if (!manifest.buildIdentity.routes.includes(route)) {
      throw budgetError(
        'PROFILE_ROUTE_GRAPH_MISSING',
        'The production build identity is missing a profile route.',
        { route },
      );
    }
  }
}

function validateManifestIdentity(manifest) {
  const sourceGraphSha256 = sha256(
    Buffer.from(
      JSON.stringify({
        pageGraph: manifest.pageGraph,
        routeOutputs: manifest.routeOutputs,
        initialRollupGraphs: manifest.initialRollupGraphs,
        rollupGraphs: manifest.rollupGraphs,
        viteManifest: manifest.viteManifest,
      }),
    ),
  );
  const outputSha256 = sha256(
    Buffer.from(JSON.stringify(manifest.outputFiles)),
  );
  const id = sha256(
    Buffer.from(
      JSON.stringify({
        sourceGraphSha256,
        outputSha256,
        builtRoutes: manifest.buildIdentity.routes,
      }),
    ),
  );
  const actual = { id, sourceGraphSha256, outputSha256 };
  const expected = {
    id: manifest.buildIdentity.id,
    sourceGraphSha256: manifest.buildIdentity.sourceGraphSha256,
    outputSha256: manifest.buildIdentity.outputSha256,
  };
  if (
    actual.id !== expected.id ||
    actual.sourceGraphSha256 !== expected.sourceGraphSha256 ||
    actual.outputSha256 !== expected.outputSha256
  ) {
    throw budgetError(
      'PROFILE_ASSET_MANIFEST_IDENTITY_MISMATCH',
      'The production build manifest identity is internally inconsistent.',
      { expected, actual },
    );
  }
}

function normalizeRelativePath(path, label) {
  if (
    typeof path !== 'string' ||
    path.length === 0 ||
    path.startsWith('/') ||
    path.includes('\\') ||
    path.includes('\0') ||
    path.split('/').some((segment) =>
      segment === '' || segment === '.' || segment === '..'
    )
  ) {
    throw budgetError(
      'PROFILE_ASSET_PATH_INVALID',
      `${label} is not a normalized relative path.`,
      { path },
    );
  }
  return path;
}

function decodeCanonicalBase64(value) {
  const bytes = Buffer.from(value, 'base64');
  if (bytes.toString('base64') !== value) {
    throw budgetError(
      'PROFILE_CSS_INLINE_IDENTITY_INVALID',
      'Inline CSS evidence is not canonical base64.',
    );
  }
  return bytes;
}

function budgetError(code, message, details = {}, cause) {
  return new ProfileAssetBudgetError(message, { code, details, cause });
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function isPlainRecord(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function deepFreeze(value, seen = new Set()) {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function') ||
    seen.has(value)
  ) {
    return value;
  }
  seen.add(value);
  for (const child of Reflect.ownKeys(value)) {
    deepFreeze(value[child], seen);
  }
  return Object.freeze(value);
}

export const assetBudgetTesting = Object.freeze({
  analyzeClientJavaScript,
  analyzeManifest,
  buildCssProvenance,
  resolveProfileRouteDocument,
  scanFinalHtml,
  unionProfileAssets,
});
