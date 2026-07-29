/**
 * What a human accessibility review covers, and what invalidates one.
 *
 * This lived inside `verification-provider.mjs` until the review subject had
 * invalidated two completed reviews for edits that could not affect rendering.
 * Both times the culprit was the provider itself: it is in its own subject, so
 * changing evidence composition — or a release-verification error code —
 * restaged twelve states of human work.
 *
 * Separating the contract from the machinery fixes that. This file changes
 * only when the review contract genuinely changes, and it is in the subject
 * precisely so that such a change *does* invalidate prior reviews. The 3,800
 * lines it was extracted from are no longer in the subject, because none of
 * them decide what a reviewer looks at.
 */

/**
 * The digest covers authored source and the toolchain, not build output.
 *
 * It once also hashed `buildAssets`, whose paths carry content hashes that
 * shift with chunking. A full-site build and a profile-only build therefore
 * produced different digests from identical authored source, which made the
 * tracked record structurally unmergeable between branches: each branch's
 * value was correct only there. Every input that decides what a reviewer sees
 * is already an authored file — `src/**`, `astro.config.mjs`, `package.json`,
 * the lockfile and the build and serve scripts — so hashing the output added
 * no coverage, only that branch dependence. Build assets are still recorded on
 * the subject as evidence; they are simply no longer hashed.
 *
 * The version is deliberately not bumped. Dropping a field changes the digest
 * value, so a record signed under the old rule already fails comparison and
 * cannot be silently accepted; a new version number would label that, not
 * enforce it.
 */
export const ACCESSIBILITY_REVIEW_SUBJECT_SCHEMA_VERSION = 1;
export const ACCESSIBILITY_REVIEW_SUBJECT_DOMAIN =
  'rvnnt.accessibility-review-subject.v1';

/** The four judgements a reviewer records for every state. */
export const REQUIRED_MANUAL_CHECKS = Object.freeze([
  'colorIndependentMeaning',
  'focusAppearance',
  'focusObscuration',
  'readingOrder',
]);

function createRequiredManualMatrix() {
  const keys = [];
  for (const viewport of ['320x800', '1440x900']) {
    for (const theme of ['light', 'dark']) {
      for (const details of ['closed', 'all-open']) {
        keys.push(`/resume|chromium|${viewport}|${theme}|${details}`);
      }
      // `/portfolio` has no disclosures, so it contributes one state per
      // viewport/theme rather than a closed/open pair.
      keys.push(`/portfolio|chromium|${viewport}|${theme}|not-applicable`);
    }
  }
  return Object.freeze(keys.sort());
}

/** The exact twelve states a complete review must cover. */
export const REQUIRED_MANUAL_MATRIX = createRequiredManualMatrix();

/**
 * Files whose content is hashed into the review subject.
 *
 * The admission test is one question: **could changing this alter what a
 * reviewer sees on the rendered page?** Build inputs, the things that serve or
 * intercept the page, and this contract qualify. Test runners, process
 * supervision, retry classification, output measurement and evidence
 * composition do not — they observe or orchestrate, they do not render.
 *
 * Deliberately excluded, each having previously forced or threatened a
 * needless re-review:
 * - `verification-provider.mjs` — composes and validates evidence
 * - `asset-budget.mjs` — measures output it does not produce
 * - `owned-process-registry.mjs`, `owned-node-bootstrap.mjs` — process custody
 * - `startup-retry.mjs`, `browser-launch-preflight.mjs` — launch and retry
 * - `playwright.config.ts` — configures the automated run; the human matrix
 *   above defines the reviewed viewports, not the runner
 */
export const REVIEW_SUBJECT_SOURCE_FILES = Object.freeze([
  'astro.config.mjs',
  'package-lock.json',
  'package.json',
  'scripts/profile/accessibility-review-contract.mjs',
  'scripts/profile/astro-profile-integration.mjs',
  'scripts/profile/clean-profile-build.mjs',
  'scripts/profile/preview-supervisor.mjs',
  'scripts/profile/profile-paths.mjs',
  'scripts/profile/request-ledger.mjs',
  'src/components/Header.astro',
  'src/islands/MobileNav.tsx',
  'src/layouts/BaseLayout.astro',
  'src/lib/navigation.ts',
  'src/pages/portfolio.astro',
  'src/pages/resume.astro',
  'src/styles/global.css',
]);

export const REVIEW_SUBJECT_SOURCE_DIRECTORIES = Object.freeze([
  'src/components/profile',
  'src/lib/layout',
  'src/styles/profile',
]);
