import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rm,
  unlink,
} from 'node:fs/promises';
import {
  dirname,
  isAbsolute,
  posix,
  relative,
  resolve,
  sep,
} from 'node:path';
import {
  PROFILE_PATHS,
  profilePathTesting,
  resolveWithinRoot,
} from './profile-paths.mjs';

const EXPECTED_WOFF2_COUNT = 92;
const EXPECTED_PACKAGE_NAME = 'pretendard';
const EXPECTED_PACKAGE_VERSION = '1.3.9';
const EXPECTED_PACKAGE_LICENSE = 'OFL-1.1';
const EXPECTED_SOURCE_FAMILY = 'Pretendard Variable';
const EXPECTED_OUTPUT_FAMILY = 'RVNNT Profile';
const EXPECTED_CSS_SOURCE =
  'dist/web/variable/pretendardvariable-dynamic-subset.css';
const EXPECTED_CSS_OUTPUT = 'pretendard-profile.css';
const EXPECTED_LICENSE_SOURCE = 'dist/LICENSE.txt';
const EXPECTED_LICENSE_OUTPUT = 'LICENSE.txt';
const MANIFEST_OUTPUT = 'manifest.json';
const STAGING_PREFIX = '.profile-font-staging-';
const PUBLISH_LOCK_NAME = '.profile-font-publish.lock';
const PUBLISH_LOCK_ATTEMPTS = 1_200;
const PUBLISH_LOCK_DELAY_MS = 25;
const SHA256 = /^[a-f0-9]{64}$/;
const DIRECTORY_SYNC_UNSUPPORTED = new Set([
  'EBADF',
  'EINVAL',
  'EISDIR',
  'ENOTSUP',
]);

export class ProfileFontMaterializationError extends Error {
  constructor(code, message, details = {}) {
    super(`${code}: ${message}`);
    this.name = 'ProfileFontMaterializationError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export async function materializeProfileFont() {
  return materializeAtPaths(PROFILE_PATHS);
}

async function materializeAtPaths(paths) {
  const allowlist = await readAndValidateAllowlist(paths);
  await verifyPackageIdentity(paths, allowlist);
  const sourceSet = await readAndVerifySourceSet(paths, allowlist);
  const outputSet = createOutputSet(allowlist, sourceSet);

  await ensureGeneratedParent(paths);

  if (await pathExists(paths.outputRoot)) {
    await verifyOutputTree(paths.generatedParent, paths.outputRoot, outputSet.files);
    return createResult('reused', allowlist, outputSet);
  }

  const stagingName = `${STAGING_PREFIX}${randomUUID()}`;
  const stagingRoot = resolveWithinRoot(
    paths.generatedParent,
    stagingName,
    'font staging path',
  );
  let ownsStaging = false;
  let stagingIdentity;
  let publishLock;
  let primaryError;

  try {
    await mkdir(stagingRoot, { mode: 0o700 });
    ownsStaging = true;

    stagingIdentity = await captureStagingIdentity(
      paths.generatedParent,
      stagingRoot,
    );
    if (stagingIdentity.parent.dev !== stagingIdentity.staging.dev) {
      fail(
        'FONT_PUBLISH_FAILED',
        'font staging and destination must share a filesystem',
      );
    }

    for (const outputPath of outputSet.writeOrder) {
      await assertStagingIdentity(
        paths.generatedParent,
        stagingRoot,
        stagingIdentity,
      );
      await writeExclusiveFile(
        stagingRoot,
        outputPath,
        outputSet.files.get(outputPath),
      );
    }

    await verifyOutputTree(stagingRoot, stagingRoot, outputSet.files, {
      rootIsAuthority: true,
    });
    await assertStagingIdentity(
      paths.generatedParent,
      stagingRoot,
      stagingIdentity,
    );
    await syncDirectory(stagingRoot);

    await assertStagingIdentity(
      paths.generatedParent,
      stagingRoot,
      stagingIdentity,
    );
    publishLock = await acquirePublishLock(
      paths.generatedParent,
      stagingIdentity.parent,
      async () => {
        if (!(await pathExists(paths.outputRoot))) {
          return false;
        }
        await verifyOutputTree(
          paths.generatedParent,
          paths.outputRoot,
          outputSet.files,
        );
        return true;
      },
    );
    if (publishLock === undefined) {
      return createResult('reused', allowlist, outputSet);
    }

    if (await pathExists(paths.outputRoot)) {
      await verifyOutputTree(
        paths.generatedParent,
        paths.outputRoot,
        outputSet.files,
      );
      return createResult('reused', allowlist, outputSet);
    }

    await assertStagingIdentity(
      paths.generatedParent,
      stagingRoot,
      stagingIdentity,
    );
    try {
      await rename(stagingRoot, paths.outputRoot);
      ownsStaging = false;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        (error.code === 'EEXIST' || error.code === 'ENOTEMPTY')
      ) {
        await verifyOutputTree(
          paths.generatedParent,
          paths.outputRoot,
          outputSet.files,
        );
        return createResult('reused', allowlist, outputSet);
      }
      fail('FONT_PUBLISH_FAILED', 'atomic font directory publish failed', {
        cause: error instanceof Error ? error.message : String(error),
      });
    }

    await syncDirectory(paths.generatedParent);
    await verifyOutputTree(
      paths.generatedParent,
      paths.outputRoot,
      outputSet.files,
    );
    return createResult('materialized', allowlist, outputSet);
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    let finalizationError;
    if (publishLock !== undefined) {
      try {
        await releasePublishLock(publishLock);
      } catch (error) {
        finalizationError = error;
      }
    }
    if (ownsStaging) {
      try {
        await removeOwnedStaging(
          paths.generatedParent,
          stagingRoot,
          stagingIdentity,
        );
      } catch (cleanupError) {
        finalizationError ??= cleanupError;
      }
    }
    if (primaryError === undefined && finalizationError !== undefined) {
      throw finalizationError;
    }
  }
}

async function readAndValidateAllowlist(paths) {
  const bytes = await readSafeFile(
    paths.siteRoot,
    paths.allowlistPath,
    'font allowlist',
  );
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    fail('FONT_ALLOWLIST_INVALID', 'font allowlist must be valid JSON', {
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  assertExactKeys(
    value,
    [
      'css',
      'family',
      'license',
      'package',
      'schemaVersion',
      'sourceSetSha256',
      'woff2',
    ],
    'allowlist',
  );
  if (value.schemaVersion !== 1) {
    fail('FONT_ALLOWLIST_INVALID', 'allowlist schemaVersion must be 1');
  }
  if (!SHA256.test(value.sourceSetSha256)) {
    fail(
      'FONT_ALLOWLIST_INVALID',
      'allowlist sourceSetSha256 must be lowercase SHA-256',
    );
  }

  assertExactKeys(
    value.package,
    ['integrity', 'name', 'version'],
    'allowlist.package',
  );
  if (
    value.package.name !== EXPECTED_PACKAGE_NAME ||
    value.package.version !== EXPECTED_PACKAGE_VERSION ||
    typeof value.package.integrity !== 'string' ||
    !value.package.integrity.startsWith('sha512-')
  ) {
    fail(
      'FONT_ALLOWLIST_INVALID',
      'allowlist must pin the approved Pretendard package identity',
    );
  }

  assertExactKeys(
    value.family,
    ['output', 'source'],
    'allowlist.family',
  );
  if (
    value.family.source !== EXPECTED_SOURCE_FAMILY ||
    value.family.output !== EXPECTED_OUTPUT_FAMILY ||
    value.family.source === value.family.output
  ) {
    fail(
      'FONT_ALLOWLIST_INVALID',
      'allowlist must bind the approved distinct profile family',
    );
  }

  validateFileEntry(value.css, 'allowlist.css');
  validateFileEntry(value.license, 'allowlist.license');
  if (
    value.css.sourcePath !== EXPECTED_CSS_SOURCE ||
    value.css.outputPath !== EXPECTED_CSS_OUTPUT ||
    value.license.sourcePath !== EXPECTED_LICENSE_SOURCE ||
    value.license.outputPath !== EXPECTED_LICENSE_OUTPUT
  ) {
    fail(
      'FONT_ALLOWLIST_INVALID',
      'allowlist CSS and license paths must match the approved distribution',
    );
  }

  if (!Array.isArray(value.woff2) || value.woff2.length !== EXPECTED_WOFF2_COUNT) {
    fail(
      'FONT_ALLOWLIST_INVALID',
      `allowlist must contain exactly ${EXPECTED_WOFF2_COUNT} WOFF2 files`,
    );
  }

  const sourcePaths = new Set([value.css.sourcePath, value.license.sourcePath]);
  const outputPaths = new Set([value.css.outputPath, value.license.outputPath]);
  for (const [index, entry] of value.woff2.entries()) {
    validateFileEntry(entry, `allowlist.woff2[${index}]`);
    const expectedSource =
      `dist/web/variable/woff2-dynamic-subset/` +
      `PretendardVariable.subset.${index}.woff2`;
    const expectedOutput =
      `woff2-dynamic-subset/PretendardVariable.subset.${index}.woff2`;
    if (
      entry.sourcePath !== expectedSource ||
      entry.outputPath !== expectedOutput
    ) {
      fail(
        'FONT_ALLOWLIST_INVALID',
        `allowlist WOFF2 index ${index} has an unexpected path`,
      );
    }
    if (
      sourcePaths.has(entry.sourcePath) ||
      outputPaths.has(entry.outputPath)
    ) {
      fail(
        'FONT_ALLOWLIST_INVALID',
        `allowlist WOFF2 index ${index} duplicates a path`,
      );
    }
    sourcePaths.add(entry.sourcePath);
    outputPaths.add(entry.outputPath);
  }

  const sourceSetSha256 = digestSourceEntries(value);
  if (sourceSetSha256 !== value.sourceSetSha256) {
    fail(
      'FONT_ALLOWLIST_INVALID',
      'allowlist source-set digest does not match its ordered entries',
      {
        expected: value.sourceSetSha256,
        observed: sourceSetSha256,
      },
    );
  }

  return value;
}

function validateFileEntry(value, label) {
  assertExactKeys(
    value,
    ['bytes', 'outputPath', 'sha256', 'sourcePath'],
    label,
  );
  validateRelativePath(value.sourcePath, `${label}.sourcePath`);
  validateRelativePath(value.outputPath, `${label}.outputPath`);
  if (!Number.isSafeInteger(value.bytes) || value.bytes <= 0) {
    fail(
      'FONT_ALLOWLIST_INVALID',
      `${label}.bytes must be a positive safe integer`,
    );
  }
  if (typeof value.sha256 !== 'string' || !SHA256.test(value.sha256)) {
    fail(
      'FONT_ALLOWLIST_INVALID',
      `${label}.sha256 must be lowercase SHA-256`,
    );
  }
}

function validateRelativePath(value, label) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.includes('\\') ||
    value.includes('\0') ||
    value.startsWith('/') ||
    value.endsWith('/') ||
    value.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    fail(
      'FONT_ALLOWLIST_INVALID',
      `${label} must be a normalized POSIX-relative path`,
    );
  }
}

function assertExactKeys(value, expectedKeys, label) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    fail('FONT_ALLOWLIST_INVALID', `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(
      'FONT_ALLOWLIST_INVALID',
      `${label} must contain exactly ${expected.join(', ')}`,
    );
  }
}

async function verifyPackageIdentity(paths, allowlist) {
  await assertSafeExistingPath(
    paths.siteRoot,
    paths.packageRoot,
    'directory',
    'installed Pretendard package',
  );

  const packageJsonPath = resolveWithinRoot(
    paths.packageRoot,
    'package.json',
    'Pretendard package.json path',
  );
  const packageJson = await readJsonFile(
    paths.packageRoot,
    packageJsonPath,
    'Pretendard package.json',
  );
  if (
    packageJson.name !== allowlist.package.name ||
    packageJson.version !== allowlist.package.version ||
    packageJson.license !== EXPECTED_PACKAGE_LICENSE
  ) {
    fail(
      'FONT_PACKAGE_MISMATCH',
      'installed Pretendard package identity does not match the allowlist',
    );
  }

  const packageLock = await readJsonFile(
    paths.siteRoot,
    paths.packageLockPath,
    'package-lock.json',
  );
  const rootDependency = packageLock?.packages?.['']?.dependencies?.pretendard;
  const lockedPackage = packageLock?.packages?.['node_modules/pretendard'];
  if (
    packageLock.lockfileVersion !== 3 ||
    rootDependency !== allowlist.package.version ||
    lockedPackage?.version !== allowlist.package.version ||
    lockedPackage?.integrity !== allowlist.package.integrity ||
    lockedPackage?.license !== EXPECTED_PACKAGE_LICENSE
  ) {
    fail(
      'FONT_PACKAGE_MISMATCH',
      'package-lock.json does not pin the approved Pretendard package',
    );
  }
}

async function readJsonFile(root, path, label) {
  const bytes = await readSafeFile(root, path, label);
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    fail('FONT_PACKAGE_MISMATCH', `${label} must be valid JSON`, {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

async function readAndVerifySourceSet(paths, allowlist) {
  const cssBytes = await readExpectedSourceFile(
    paths.packageRoot,
    allowlist.css,
  );
  const woff2 = [];
  for (const entry of allowlist.woff2) {
    const bytes = await readExpectedSourceFile(paths.packageRoot, entry);
    if (
      bytes.length < 4 ||
      bytes.subarray(0, 4).toString('ascii') !== 'wOF2'
    ) {
      fail(
        'FONT_SOURCE_FORMAT_INVALID',
        `${entry.sourcePath} is not a WOFF2 file`,
      );
    }
    woff2.push({ entry, bytes });
  }
  const licenseBytes = await readExpectedSourceFile(
    paths.packageRoot,
    allowlist.license,
  );

  const licenseText = licenseBytes.toString('utf8');
  if (
    !licenseText.includes('SIL OPEN FONT LICENSE Version 1.1') ||
    !licenseText.includes('Reserved Font Name Pretendard')
  ) {
    fail(
      'FONT_LICENSE_INVALID',
      'Pretendard license evidence is incomplete',
    );
  }

  const aliasedCss = verifyAndTransformCss(
    cssBytes.toString('utf8'),
    allowlist,
  );
  const legalComment = extractLegalComment(aliasedCss);
  const licenseMetadata = createBrowserLicenseMetadata(
    legalComment,
    licenseText,
  );
  const browserCss =
    `${legalComment}\n${licenseMetadata}` +
    aliasedCss.slice(legalComment.length);

  return {
    aliasedCss: Buffer.from(browserCss, 'utf8'),
    legalComment,
    licenseMetadata,
    licenseBytes,
    woff2,
  };
}

async function readExpectedSourceFile(packageRoot, entry) {
  const path = resolveWithinRoot(
    packageRoot,
    entry.sourcePath,
    'allowlisted source path',
  );
  const bytes = await readSafeFile(packageRoot, path, entry.sourcePath);
  if (bytes.length !== entry.bytes) {
    fail(
      'FONT_SOURCE_SIZE_MISMATCH',
      `${entry.sourcePath} byte length does not match the allowlist`,
      { expected: entry.bytes, observed: bytes.length },
    );
  }
  const observed = sha256(bytes);
  if (observed !== entry.sha256) {
    fail(
      'FONT_SOURCE_HASH_MISMATCH',
      `${entry.sourcePath} SHA-256 does not match the allowlist`,
      { expected: entry.sha256, observed },
    );
  }
  return bytes;
}

function verifyAndTransformCss(css, allowlist) {
  const urls = [];
  const urlPattern =
    /url\(\s*(?:'([^']+)'|"([^"]+)"|([^)\s]+))\s*\)/gu;
  for (const match of css.matchAll(urlPattern)) {
    const raw = match[1] ?? match[2] ?? match[3];
    if (
      raw.includes('\\') ||
      raw.includes('?') ||
      raw.includes('#') ||
      raw.includes(':') ||
      raw.startsWith('/')
    ) {
      fail(
        'FONT_CSS_REFERENCE_MISMATCH',
        `font CSS contains a non-local URL: ${raw}`,
      );
    }
    urls.push(
      posix.normalize(
        posix.join(posix.dirname(allowlist.css.sourcePath), raw),
      ),
    );
  }

  const expectedUrls = allowlist.woff2.map((entry) => entry.sourcePath);
  if (
    urls.length !== expectedUrls.length ||
    urls.some((url, index) => url !== expectedUrls[index]) ||
    new Set(urls).size !== urls.length
  ) {
    fail(
      'FONT_CSS_REFERENCE_MISMATCH',
      'font CSS URL order and the WOFF2 allowlist must match exactly',
    );
  }

  const sourceDeclaration =
    `font-family: '${allowlist.family.source}';`;
  const outputDeclaration =
    `font-family: '${allowlist.family.output}';`;
  const familyCount = css.split(sourceDeclaration).length - 1;
  const faceCount = (css.match(/@font-face\s*\{/gu) ?? []).length;
  const rangeCount = (css.match(/\bunicode-range\s*:/gu) ?? []).length;
  const weightCount = (
    css.match(/\bfont-weight\s*:\s*45\s+920\s*;/gu) ?? []
  ).length;
  if (
    familyCount !== EXPECTED_WOFF2_COUNT ||
    faceCount !== EXPECTED_WOFF2_COUNT ||
    rangeCount !== EXPECTED_WOFF2_COUNT ||
    weightCount !== EXPECTED_WOFF2_COUNT
  ) {
    fail(
      'FONT_CSS_REFERENCE_MISMATCH',
      'font CSS must define the complete variable Unicode-range subset',
    );
  }
  if (!css.startsWith('/*\nCopyright')) {
    fail(
      'FONT_LICENSE_INVALID',
      'font CSS must preserve the upstream copyright notice',
    );
  }

  const transformed = css
    .replace(/^\/\*/u, '/*!')
    .replaceAll(sourceDeclaration, outputDeclaration);
  if (
    transformed.includes(sourceDeclaration) ||
    transformed.split(outputDeclaration).length - 1 !== EXPECTED_WOFF2_COUNT
  ) {
    fail(
      'FONT_CSS_REFERENCE_MISMATCH',
      'font CSS family alias transformation was incomplete',
    );
  }
  return transformed;
}

function extractLegalComment(css) {
  const legalComment = /^\/\*![\s\S]*?\*\//u.exec(css)?.[0];
  if (legalComment === undefined) {
    fail(
      'FONT_LICENSE_INVALID',
      'materialized font CSS must begin with its legal notice',
    );
  }
  return legalComment;
}

function createBrowserLicenseMetadata(legalComment, licenseText) {
  const evidence = `${legalComment.slice(3, -2)}\n${licenseText}`
    .trim()
    .replace(/\s+/gu, ' ');
  if (evidence.includes("'") || evidence.includes('\\')) {
    fail(
      'FONT_LICENSE_INVALID',
      'font license evidence cannot be encoded canonically in CSS',
    );
  }
  return `@license '${evidence}';`;
}

function createOutputSet(allowlist, sourceSet) {
  const outputRecords = [
    createOutputRecord(
      allowlist.css.outputPath,
      sourceSet.aliasedCss,
      allowlist.css.sourcePath,
      allowlist.css.sha256,
    ),
    ...sourceSet.woff2.map(({ entry, bytes }) =>
      createOutputRecord(
        entry.outputPath,
        bytes,
        entry.sourcePath,
        entry.sha256,
      ),
    ),
    createOutputRecord(
      allowlist.license.outputPath,
      sourceSet.licenseBytes,
      allowlist.license.sourcePath,
      allowlist.license.sha256,
    ),
  ];

  const manifest = {
    schemaVersion: 1,
    materializer: 'ProfileFontMaterializer',
    sourceSetSha256: allowlist.sourceSetSha256,
    package: { ...allowlist.package, license: EXPECTED_PACKAGE_LICENSE },
    family: { ...allowlist.family },
    cssTransform: {
      browserLicenseMetadataEmbedded: true,
      fontFaceMutation: 'family-alias-only',
      legalCommentPreserved: true,
    },
    outputs: outputRecords.map(({ bytes: _bytes, ...record }) => record),
  };
  const manifestBytes = Buffer.from(
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  const files = new Map();
  for (const record of outputRecords) {
    files.set(record.path, record.bytes);
  }
  files.set(MANIFEST_OUTPUT, manifestBytes);

  return {
    files,
    legalComment: sourceSet.legalComment,
    licenseMetadata: sourceSet.licenseMetadata,
    manifest,
    writeOrder: [
      ...allowlist.woff2.map((entry) => entry.outputPath),
      allowlist.css.outputPath,
      allowlist.license.outputPath,
      MANIFEST_OUTPUT,
    ],
  };
}

function createOutputRecord(path, bytes, sourcePath, sourceSha256) {
  return {
    path,
    bytes,
    sourcePath,
    sourceSha256,
    sha256: sha256(bytes),
  };
}

async function ensureGeneratedParent(paths) {
  await assertSafeExistingPath(
    paths.siteRoot,
    paths.siteRoot,
    'directory',
    'site root',
    { allowRoot: true, output: true },
  );
  try {
    await mkdir(paths.generatedParent, { mode: 0o700 });
  } catch (error) {
    if (!error || typeof error !== 'object' || error.code !== 'EEXIST') {
      fail('FONT_OUTPUT_INVALID', 'could not create generated font parent', {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }
  await assertSafeExistingPath(
    paths.siteRoot,
    paths.generatedParent,
    'directory',
    'generated font parent',
    { output: true },
  );
}

async function writeExclusiveFile(root, relativePath, bytes) {
  const path = resolveWithinRoot(root, relativePath, 'generated font path');
  await ensureOwnedDirectories(root, dirname(path));
  await assertRealPathContained(
    root,
    dirname(path),
    `generated parent for ${relativePath}`,
    { output: true },
  );

  let handle;
  let primaryError;
  try {
    handle = await open(
      path,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o644,
    );
    await handle.writeFile(bytes);
    await handle.sync();
  } catch (error) {
    primaryError =
      error instanceof ProfileFontMaterializationError
        ? error
        : new ProfileFontMaterializationError(
            'FONT_PUBLISH_FAILED',
            `exclusive write failed for ${relativePath}`,
            {
              cause: error instanceof Error ? error.message : String(error),
            },
          );
    throw primaryError;
  } finally {
    if (handle !== undefined) {
      try {
        await handle.close();
      } catch (closeError) {
        if (primaryError === undefined) {
          throw new ProfileFontMaterializationError(
            'FONT_PUBLISH_FAILED',
            `file close failed for ${relativePath}`,
            {
              cause:
                closeError instanceof Error
                  ? closeError.message
                  : String(closeError),
            },
          );
        }
      }
    }
  }
}

async function ensureOwnedDirectories(root, targetDirectory) {
  const fromRoot = relative(root, targetDirectory);
  if (fromRoot === '') {
    return;
  }
  if (
    fromRoot === '..' ||
    fromRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromRoot)
  ) {
    fail('FONT_PUBLISH_FAILED', 'generated directory escaped staging root');
  }

  let cursor = root;
  for (const segment of fromRoot.split(sep)) {
    cursor = resolve(cursor, segment);
    try {
      await mkdir(cursor, { mode: 0o700 });
    } catch (error) {
      if (!error || typeof error !== 'object' || error.code !== 'EEXIST') {
        fail('FONT_PUBLISH_FAILED', 'could not create generated directory', {
          cause: error instanceof Error ? error.message : String(error),
        });
      }
    }
    const identity = await lstat(cursor);
    if (identity.isSymbolicLink() || !identity.isDirectory()) {
      fail(
        'FONT_PUBLISH_FAILED',
        'generated directory must remain a real directory',
      );
    }
  }
}

async function verifyOutputTree(
  authorityRoot,
  outputRoot,
  expectedFiles,
  options = {},
) {
  const pathRoot = options.rootIsAuthority ? outputRoot : authorityRoot;
  await assertSafeExistingPath(
    pathRoot,
    outputRoot,
    'directory',
    'generated font output',
    { allowRoot: options.rootIsAuthority, output: true },
  );

  const observedFiles = new Map();
  const observedDirectories = new Set();
  await collectOutputTree(outputRoot, '', observedFiles, observedDirectories);

  const expectedDirectories = new Set();
  for (const path of expectedFiles.keys()) {
    let parent = posix.dirname(path);
    while (parent !== '.') {
      expectedDirectories.add(parent);
      parent = posix.dirname(parent);
    }
  }

  assertSameStrings(
    [...observedDirectories].sort(),
    [...expectedDirectories].sort(),
    'generated directory inventory',
  );
  assertSameStrings(
    [...observedFiles.keys()].sort(),
    [...expectedFiles.keys()].sort(),
    'generated file inventory',
  );

  for (const [path, absolutePath] of observedFiles) {
    const observed = await readSafeFile(
      outputRoot,
      absolutePath,
      `generated ${path}`,
      { output: true },
    );
    const expected = expectedFiles.get(path);
    if (!observed.equals(expected)) {
      fail(
        'FONT_OUTPUT_INVALID',
        `generated output does not match verified source: ${path}`,
      );
    }
  }
}

async function collectOutputTree(
  root,
  relativeDirectory,
  files,
  directories,
) {
  const absoluteDirectory =
    relativeDirectory === ''
      ? root
      : resolveWithinRoot(root, relativeDirectory, 'generated directory');
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const relativePath =
      relativeDirectory === ''
        ? entry.name
        : `${relativeDirectory}/${entry.name}`;
    validateRelativePath(relativePath, 'generated output path');
    const absolutePath = resolveWithinRoot(
      root,
      relativePath,
      'generated output path',
    );
    const identity = await lstat(absolutePath);
    if (identity.isSymbolicLink()) {
      fail(
        'FONT_OUTPUT_INVALID',
        `generated output contains a symlink: ${relativePath}`,
      );
    }
    if (identity.isDirectory()) {
      directories.add(relativePath);
      await collectOutputTree(root, relativePath, files, directories);
    } else if (identity.isFile()) {
      files.set(relativePath, absolutePath);
    } else {
      fail(
        'FONT_OUTPUT_INVALID',
        `generated output contains a non-regular file: ${relativePath}`,
      );
    }
  }
}

function assertSameStrings(actual, expected, label) {
  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    fail('FONT_OUTPUT_INVALID', `${label} does not match the manifest`, {
      expected,
      observed: actual,
    });
  }
}

async function readSafeFile(root, path, label, options = {}) {
  await assertSafeExistingPath(root, path, 'file', label, options);
  await assertRealPathContained(root, path, label, options);

  let handle;
  let primaryError;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    await assertRealPathContained(root, path, label, options);
    const identity = await handle.stat();
    if (!identity.isFile()) {
      fail(
        options.output
          ? 'FONT_OUTPUT_INVALID'
          : 'FONT_SOURCE_NOT_REGULAR',
        `${label} must be a regular file`,
      );
    }
    return await handle.readFile();
  } catch (error) {
    if (error instanceof ProfileFontMaterializationError) {
      primaryError = error;
      throw primaryError;
    }
    if (error && typeof error === 'object' && error.code === 'ELOOP') {
      primaryError = new ProfileFontMaterializationError(
        options.output ? 'FONT_OUTPUT_INVALID' : 'FONT_SOURCE_SYMLINK',
        `${label} must not be a symlink`,
      );
      throw primaryError;
    }
    primaryError = new ProfileFontMaterializationError(
      options.output ? 'FONT_OUTPUT_INVALID' : 'FONT_SOURCE_MISSING',
      `${label} could not be read`,
      { cause: error instanceof Error ? error.message : String(error) },
    );
    throw primaryError;
  } finally {
    if (handle !== undefined) {
      try {
        await handle.close();
      } catch (closeError) {
        if (primaryError === undefined) {
          throw new ProfileFontMaterializationError(
            options.output
              ? 'FONT_OUTPUT_INVALID'
              : 'FONT_SOURCE_MISSING',
            `${label} could not be closed`,
            {
              cause:
                closeError instanceof Error
                  ? closeError.message
                  : String(closeError),
            },
          );
        }
      }
    }
  }
}

async function assertRealPathContained(root, target, label, options = {}) {
  let canonicalRoot;
  let canonicalTarget;
  try {
    [canonicalRoot, canonicalTarget] = await Promise.all([
      realpath(root),
      realpath(target),
    ]);
  } catch (error) {
    fail(
      options.output ? 'FONT_OUTPUT_INVALID' : 'FONT_SOURCE_MISSING',
      `${label} could not be canonicalized`,
      { cause: error instanceof Error ? error.message : String(error) },
    );
  }

  const fromRoot = relative(canonicalRoot, canonicalTarget);
  if (
    fromRoot === '..' ||
    fromRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromRoot)
  ) {
    fail(
      options.output ? 'FONT_OUTPUT_INVALID' : 'FONT_PATH_UNSAFE',
      `${label} resolves outside its fixed root`,
    );
  }
}

async function assertSafeExistingPath(
  root,
  target,
  expectedType,
  label,
  options = {},
) {
  const canonicalRoot = resolve(root);
  const canonicalTarget = resolve(target);
  const fromRoot = relative(canonicalRoot, canonicalTarget);
  if (
    (!options.allowRoot && fromRoot === '') ||
    fromRoot === '..' ||
    fromRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromRoot)
  ) {
    fail(
      options.output ? 'FONT_OUTPUT_INVALID' : 'FONT_PATH_UNSAFE',
      `${label} escaped its fixed root`,
    );
  }

  const segments = fromRoot === '' ? [] : fromRoot.split(sep);
  let cursor = canonicalRoot;
  const paths = [canonicalRoot];
  for (const segment of segments) {
    cursor = resolve(cursor, segment);
    paths.push(cursor);
  }

  for (const [index, path] of paths.entries()) {
    let identity;
    try {
      identity = await lstat(path);
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        fail(
          options.output ? 'FONT_OUTPUT_INVALID' : 'FONT_SOURCE_MISSING',
          `${label} is missing`,
        );
      }
      throw error;
    }
    if (identity.isSymbolicLink()) {
      fail(
        options.output ? 'FONT_OUTPUT_INVALID' : 'FONT_SOURCE_SYMLINK',
        `${label} contains a symlink`,
      );
    }
    const isLeaf = index === paths.length - 1;
    if (!isLeaf && !identity.isDirectory()) {
      fail(
        options.output
          ? 'FONT_OUTPUT_INVALID'
          : 'FONT_SOURCE_NOT_REGULAR',
        `${label} has a non-directory ancestor`,
      );
    }
    if (isLeaf) {
      const valid =
        expectedType === 'file'
          ? identity.isFile()
          : identity.isDirectory();
      if (!valid) {
        fail(
          options.output
            ? 'FONT_OUTPUT_INVALID'
            : 'FONT_SOURCE_NOT_REGULAR',
          `${label} must be a ${expectedType}`,
        );
      }
    }
  }
}

async function syncDirectory(path) {
  let handle;
  let primaryError;
  try {
    handle = await open(
      path,
      constants.O_RDONLY | (constants.O_DIRECTORY ?? 0),
    );
    await handle.sync();
  } catch (error) {
    if (
      !error ||
      typeof error !== 'object' ||
      !DIRECTORY_SYNC_UNSUPPORTED.has(error.code)
    ) {
      primaryError = new ProfileFontMaterializationError(
        'FONT_PUBLISH_FAILED',
        'directory fsync failed',
        {
        cause: error instanceof Error ? error.message : String(error),
        },
      );
      throw primaryError;
    }
  } finally {
    if (handle !== undefined) {
      try {
        await handle.close();
      } catch (closeError) {
        if (primaryError === undefined) {
          throw new ProfileFontMaterializationError(
            'FONT_PUBLISH_FAILED',
            'directory handle close failed',
            {
              cause:
                closeError instanceof Error
                  ? closeError.message
                  : String(closeError),
            },
          );
        }
      }
    }
  }
}

async function captureStagingIdentity(parent, stagingRoot) {
  const [parentIdentity, stagingIdentity, parentRealPath, stagingRealPath] =
    await Promise.all([
      lstat(parent),
      lstat(stagingRoot),
      realpath(parent),
      realpath(stagingRoot),
    ]);
  if (
    parentIdentity.isSymbolicLink() ||
    !parentIdentity.isDirectory() ||
    stagingIdentity.isSymbolicLink() ||
    !stagingIdentity.isDirectory() ||
    dirname(stagingRealPath) !== parentRealPath
  ) {
    fail(
      'FONT_PUBLISH_FAILED',
      'font staging identity is not a real sibling directory',
    );
  }

  return Object.freeze({
    parent: Object.freeze({
      dev: parentIdentity.dev,
      ino: parentIdentity.ino,
      realPath: parentRealPath,
    }),
    staging: Object.freeze({
      dev: stagingIdentity.dev,
      ino: stagingIdentity.ino,
      realPath: stagingRealPath,
    }),
  });
}

async function assertStagingIdentity(parent, stagingRoot, expected) {
  if (expected === undefined) {
    fail('FONT_PUBLISH_FAILED', 'font staging identity was not captured');
  }
  const observed = await captureStagingIdentity(parent, stagingRoot);
  if (
    observed.parent.dev !== expected.parent.dev ||
    observed.parent.ino !== expected.parent.ino ||
    observed.parent.realPath !== expected.parent.realPath ||
    observed.staging.dev !== expected.staging.dev ||
    observed.staging.ino !== expected.staging.ino ||
    observed.staging.realPath !== expected.staging.realPath
  ) {
    fail(
      'FONT_PUBLISH_FAILED',
      'font staging identity changed during materialization',
    );
  }
}

async function acquirePublishLock(
  parent,
  expectedParent,
  completedOutputExists,
) {
  const lockPath = resolveWithinRoot(
    parent,
    PUBLISH_LOCK_NAME,
    'font publish lock path',
  );

  for (let attempt = 0; attempt < PUBLISH_LOCK_ATTEMPTS; attempt += 1) {
    await assertDirectoryIdentity(
      parent,
      expectedParent,
      'generated font parent',
    );

    let handle;
    try {
      handle = await open(
        lockPath,
        constants.O_WRONLY |
          constants.O_CREAT |
          constants.O_EXCL |
          constants.O_NOFOLLOW,
        0o600,
      );
      await handle.writeFile('profile-font-publish\n', 'utf8');
      await handle.sync();
      const identity = await handle.stat();
      const canonicalPath = await realpath(lockPath);
      if (
        !identity.isFile() ||
        dirname(canonicalPath) !== expectedParent.realPath
      ) {
        fail(
          'FONT_PUBLISH_FAILED',
          'font publish lock has an unsafe identity',
        );
      }
      return {
        handle,
        path: lockPath,
        identity: Object.freeze({
          dev: identity.dev,
          ino: identity.ino,
          realPath: canonicalPath,
        }),
        parent,
        parentIdentity: expectedParent,
      };
    } catch (error) {
      if (handle !== undefined) {
        await removeFailedPublishLock(
          parent,
          expectedParent,
          lockPath,
          handle,
        );
        try {
          await handle.close();
        } catch {
          // The acquisition error remains authoritative.
        }
      }
      if (error && typeof error === 'object' && error.code === 'EEXIST') {
        if (await completedOutputExists()) {
          return undefined;
        }
        await delay(PUBLISH_LOCK_DELAY_MS);
        continue;
      }
      if (error instanceof ProfileFontMaterializationError) {
        throw error;
      }
      fail('FONT_PUBLISH_FAILED', 'could not acquire font publish lock', {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  fail(
    'FONT_PUBLISH_FAILED',
    'timed out waiting for the font publish lock',
  );
}

async function removeFailedPublishLock(
  parent,
  expectedParent,
  lockPath,
  handle,
) {
  try {
    await assertDirectoryIdentity(
      parent,
      expectedParent,
      'generated font parent',
    );
    const [ownedIdentity, visibleIdentity, canonicalPath] =
      await Promise.all([
        handle.stat(),
        lstat(lockPath),
        realpath(lockPath),
      ]);
    if (
      ownedIdentity.isFile() &&
      !visibleIdentity.isSymbolicLink() &&
      visibleIdentity.isFile() &&
      visibleIdentity.dev === ownedIdentity.dev &&
      visibleIdentity.ino === ownedIdentity.ino &&
      dirname(canonicalPath) === expectedParent.realPath
    ) {
      await unlink(lockPath);
    }
  } catch {
    // The acquisition failure remains authoritative. Never unlink an
    // unverified path while attempting best-effort recovery.
  }
}

async function releasePublishLock(lock) {
  let primaryError;
  try {
    await assertDirectoryIdentity(
      lock.parent,
      lock.parentIdentity,
      'generated font parent',
    );
    const [identity, canonicalPath] = await Promise.all([
      lstat(lock.path),
      realpath(lock.path),
    ]);
    if (
      identity.isSymbolicLink() ||
      !identity.isFile() ||
      identity.dev !== lock.identity.dev ||
      identity.ino !== lock.identity.ino ||
      canonicalPath !== lock.identity.realPath
    ) {
      fail(
        'FONT_PUBLISH_FAILED',
        'font publish lock identity changed before release',
      );
    }
    await unlink(lock.path);
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {
      await lock.handle.close();
    } catch (closeError) {
      if (primaryError === undefined) {
        throw closeError;
      }
    }
  }
}

async function assertDirectoryIdentity(path, expected, label) {
  const [identity, canonicalPath] = await Promise.all([
    lstat(path),
    realpath(path),
  ]);
  if (
    identity.isSymbolicLink() ||
    !identity.isDirectory() ||
    identity.dev !== expected.dev ||
    identity.ino !== expected.ino ||
    canonicalPath !== expected.realPath
  ) {
    fail(
      'FONT_PUBLISH_FAILED',
      `${label} identity changed during materialization`,
    );
  }
}

async function removeOwnedStaging(parent, stagingRoot, expectedIdentity) {
  const fromParent = relative(parent, stagingRoot);
  if (
    fromParent.includes(sep) ||
    !fromParent.startsWith(STAGING_PREFIX)
  ) {
    fail('FONT_PUBLISH_FAILED', 'refused to clean an unowned staging path');
  }
  try {
    await assertStagingIdentity(parent, stagingRoot, expectedIdentity);
    await rm(stagingRoot, { recursive: true });
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, milliseconds);
  });
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function digestSourceEntries(allowlist) {
  const records = [
    allowlist.css,
    ...allowlist.woff2,
    allowlist.license,
  ];
  const hash = createHash('sha256');
  for (const entry of records) {
    hash.update(
      `${entry.sourcePath}\t${entry.bytes}\t${entry.sha256}\n`,
      'utf8',
    );
  }
  return hash.digest('hex');
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function createResult(status, allowlist, outputSet) {
  return Object.freeze({
    status,
    family: allowlist.family.output,
    packageVersion: allowlist.package.version,
    sourceSetSha256: allowlist.sourceSetSha256,
    outputCount: outputSet.files.size,
    legalComment: outputSet.legalComment,
    licenseMetadata: outputSet.licenseMetadata,
  });
}

function fail(code, message, details) {
  throw new ProfileFontMaterializationError(code, message, details);
}

export const fontMaterializerTesting = Object.freeze({
  async materializeAtSiteRoot(siteRoot) {
    return materializeAtPaths(
      profilePathTesting.createProfilePaths(siteRoot),
    );
  },
});
