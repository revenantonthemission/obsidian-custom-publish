import { realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleSiteRoot = fileURLToPath(new URL('../../', import.meta.url));

export const PROFILE_PATHS = createProfilePaths(moduleSiteRoot);

export function resolveWithinRoot(root, relativePath, label = 'path') {
  if (
    typeof relativePath !== 'string' ||
    relativePath.length === 0 ||
    relativePath.includes('\\') ||
    relativePath.includes('\0') ||
    relativePath.startsWith('/') ||
    relativePath.endsWith('/') ||
    relativePath.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    throw new TypeError(`${label} must be a normalized POSIX-relative path`);
  }

  const target = resolve(root, ...relativePath.split('/'));
  const fromRoot = relative(root, target);
  if (
    fromRoot === '' ||
    fromRoot === '..' ||
    fromRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromRoot)
  ) {
    throw new TypeError(`${label} must stay within its fixed root`);
  }

  return target;
}

function createProfilePaths(siteRoot) {
  const canonicalSiteRoot = realpathSync(resolve(siteRoot));

  return Object.freeze({
    siteRoot: canonicalSiteRoot,
    astroCliPath: resolve(
      canonicalSiteRoot,
      'node_modules',
      'astro',
      'bin',
      'astro.mjs',
    ),
    playwrightCliPath: resolve(
      canonicalSiteRoot,
      'node_modules',
      '@playwright',
      'test',
      'cli.js',
    ),
    browserLaunchPreflightPath: resolve(
      canonicalSiteRoot,
      'scripts',
      'profile',
      'browser-launch-preflight.mjs',
    ),
    ownedNodeBootstrapPath: resolve(
      canonicalSiteRoot,
      'scripts',
      'profile',
      'owned-node-bootstrap.mjs',
    ),
    distRoot: resolve(canonicalSiteRoot, 'dist'),
    packageLockPath: resolve(canonicalSiteRoot, 'package-lock.json'),
    packageRoot: resolve(canonicalSiteRoot, 'node_modules', 'pretendard'),
    allowlistPath: resolve(
      canonicalSiteRoot,
      'scripts',
      'profile',
      'font-allowlist.json',
    ),
    generatedParent: resolve(canonicalSiteRoot, '.generated'),
    outputRoot: resolve(canonicalSiteRoot, '.generated', 'profile-font'),
    artifactRoot: resolve(canonicalSiteRoot, '.artifacts', 'profile'),
    verificationRoot: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'verification',
    ),
    buildManifestPath: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'verification',
      'build-manifest.json',
    ),
    assetBudgetEvidencePath: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'verification',
      'asset-budget.json',
    ),
    browserEvidencePath: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'verification',
      'browser-evidence.json',
    ),
    linkMetadataEvidencePath: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'verification',
      'link-metadata-evidence.json',
    ),
    requestLedgerEvidencePath: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'verification',
      'request-ledger-evidence.json',
    ),
    browserStartupFailurePath: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'verification',
      'browser-startup-failure.json',
    ),
    e2eVerificationPath: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'verification',
      'e2e-verification.json',
    ),
    // The résumé candidate and everything derived from it stay under the
    // ignored artifact root. A candidate is private until Step 23 promotes it
    // under its own exact-SHA human gate; nothing here may reach `public/`.
    pdfRoot: resolve(canonicalSiteRoot, '.artifacts', 'profile', 'pdf'),
    pdfCandidateRoot: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'pdf',
      'candidates',
    ),
    pdfInspectionRoot: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'pdf',
      'inspection',
    ),
    pdfViewerRoot: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'pdf',
      'viewer',
    ),
    resumeDraftReceiptPath: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'pdf',
      'draft-receipt.json',
    ),
    // The release transaction's own private state. Lock, journal, recovery and
    // quarantine all live on the same filesystem as the public target so the
    // commit and every restore can be an atomic rename rather than a copy.
    releaseRoot: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'pdf',
      'release',
    ),
    releaseLockPath: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'pdf',
      'release',
      'release.lock',
    ),
    releaseJournalPath: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'pdf',
      'release',
      'journal.json',
    ),
    releaseRecoveryRoot: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'pdf',
      'release',
      'recovery',
    ),
    releaseQuarantineRoot: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'pdf',
      'release',
      'quarantine',
    ),
    releaseStagingRoot: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'pdf',
      'release',
      'staging',
    ),
    // The only two tracked paths the release transaction may ever mutate.
    publicRoot: resolve(canonicalSiteRoot, 'public'),
    publicResumePdfPath: resolve(canonicalSiteRoot, 'public', 'resume.pdf'),
    trackedReleaseReceiptRoot: resolve(
      canonicalSiteRoot,
      'verification',
      'resume',
    ),
    trackedReleaseReceiptPath: resolve(
      canonicalSiteRoot,
      'verification',
      'resume',
      'current-release.json',
    ),
    profileToolsRoot: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'tools',
    ),
    profileToolsModuleRoot: resolve(
      canonicalSiteRoot,
      '.artifacts',
      'profile',
      'tools',
      'src',
      'lib',
      'profile',
    ),
    profileToolsConfigPath: resolve(
      canonicalSiteRoot,
      'tsconfig.profile-tools.json',
    ),
    typescriptCliPath: resolve(
      canonicalSiteRoot,
      'node_modules',
      'typescript',
      'bin',
      'tsc',
    ),
    manualWebAccessibilityPath: resolve(
      canonicalSiteRoot,
      'verification',
      'profile',
      'manual-web-accessibility.json',
    ),
  });
}

export const profilePathTesting = Object.freeze({
  createProfilePaths,
});
