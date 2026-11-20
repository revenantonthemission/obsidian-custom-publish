# CI/CD Pipeline — U4 `u4-navigation`

Upstream: `infrastructure-design/infrastructure-specification.md`, `infrastructure-design/monitoring-design.md`; `nfr-design/performance-design.md`, `nfr-design/security-design.md`; team.md (Testing Posture, Deployment).

U4 changes no pipeline stage. The delivery path below is the project's existing nightly job; the only rows U4 touches are the ones where its own tests and its build-time budget are measured.

## Pipeline stages

The Jenkins job `obsidian-blog-develop` (cron `H 0 * * *`) checks out `origin/develop` and runs:

| # | Stage | Command | Gate | U4 impact |
|---|---|---|---|---|
| 1 | Checkout | `checkout scm` | — | none |
| 2 | Install | `cd site && rm -rf .generated && npm ci`; `cargo build --release --manifest-path preprocessor/Cargo.toml` | — | none. The `rm -rf .generated` step is required: the font materializer fails closed on generated output that another materializer version wrote |
| 3 | Verify | `cargo test --release --manifest-path preprocessor/Cargo.toml`; `./preprocessor/target/release/obsidian-press ./fixtures/vault/Notes ./content --pages ./fixtures/vault/Pages`; copy the four JSON files into `site/public/`; `cd site && npm run test:unit && npm run test:pbt` | Fails the run | U4 changes the site suites: the one-item navigation updates the existing expectations and the marker rule adds new unit and property tests. This stage runs neither `npm run format:check` nor `npx astro check` — see the pre-merge gate below |
| 4 | Preprocess | `./preprocessor/target/release/obsidian-press --stamp-published "${VAULT_PATH}" ./content --pages "${PAGES_PATH}"`; copy the JSON files and sync the assets into `site/public/` | — | none; U4 adds no content. The vault and the pages folder are the two required inputs of the publishing step (contract C1) |
| 5 | Build Site | `cd site && npx astro build` | Fails the run | U4's marker rule is evaluated here. The stage runs one build over the real vault's content and grades nothing: the median-of-3 fixture build budget (≤ 3.81 s against the recorded 3.63 s) is measured by Build and Test, not by this stage |
| 6 | Deploy (only with `RUN_DEPLOY`) | `mkdir -p "${WEB_ROOT}"` then `rsync -a --delete site/dist/ "${WEB_ROOT}"` | — | none; the chrome change ships inside the built tree |
| 7 | Post-deploy check (manual, maintainer) | HTTP 200 on `/` and on one post | Human | none |

Local equivalents: `just deploy` (the same preprocess, build and rsync from a local checkout), `just serve` (the script the launchd agent runs), `just crossunit` (the JavaScript-off smoke test and link sweep over the built site).

## Pre-merge gate

Before a change is merged into `develop`, the maintainer runs the checks that the nightly job does not run:

| Check | Command | Runs where |
|---|---|---|
| Formatting | `npm run format:check` (in `site/`) | locally, before merging — no pipeline stage runs it |
| Type check | `npx astro check` (in `site/`) | locally, before merging — no pipeline stage runs it |
| Browser and accessibility checks | `npx playwright test --config playwright.hig.config.ts` and `just crossunit` | locally, before merging |
| Profile suite | `npm run test:e2e` | outside the merge gate: it fails closed until the manual accessibility record is current (see below) |

The nightly job's Verify stage covers the Rust suite, `npm run test:unit` and `npm run test:pbt`; the browser checks above are local by the team's practice, because Jenkins does not run every check.

## Test-automation integration

The project-to-spec mapping is exact:

| Check | Project | Spec files | Notes |
|---|---|---|---|
| Axe matrix (WCAG 2.2 AA, 320/768/1024/1440 px, light and dark, reduced motion), the marker assertions on `/`, `/writing` and `/writing/all`, the JavaScript-off sheet check | HIG project | `site/playwright.hig.config.ts` matches `hig-*.spec.ts`; it builds and serves its own fixture site | The HIG runner serves the fixture build, not the deployed site |
| JavaScript-off smoke and link sweep | crossunit project | `site/playwright.crossunit.config.ts` matches `crossunit.spec.ts` only, with `javaScriptEnabled: false` | `just crossunit` runs this project |
| Profile suite | `npm run test:e2e` | `site/playwright.config.ts` ignores `hig-*.spec.ts` and `crossunit.spec.ts` through its `testIgnore` list, so it runs neither | It fails closed while the manual accessibility record is stale |

## Manual accessibility review (release-end step)

U4 changes four files that the manual 16-state accessibility review covers: `site/src/components/Header.astro`, `site/src/islands/MobileNav.tsx`, `site/src/lib/navigation.ts` and `site/src/styles/chrome.css`. Those files are review-subject files in `site/scripts/profile/accessibility-review-contract.mjs`, so the change invalidates the record at `site/verification/profile/manual-web-accessibility.json`.

While the record is stale, `npm run test:e2e` fails closed with `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` ("Manual web accessibility evidence is missing, stale, or failed"), because the evidence's `reviewSubjectDigest` no longer matches the changed sources. The suite is outside the merge gate, so the branch still merges and still deploys nightly; the record is re-authored once the change settles, at release end, by the maintainer — the single owner of this repository, who carries every human review gate. The automated axe matrix does not replace that record: it is a regression net for the marker and the sheet, not a substitute for the 16-state human review.

## Deployment strategy

Recreate, one environment, no traffic shifting — with the mechanism stated as it is: the Deploy stage mirrors `site/dist/` into the directory the server actually serves (`rsync -a --delete` into the live web root), and `site/scripts/local-server.mjs` resolves and streams a file per request. The swap is therefore in place and not atomic: a request during the sync window can observe a half-replaced tree, for example new HTML whose hashed asset has not been copied yet.

That exposure is accepted for this project: one origin, one nightly release, a static tree, no staging environment and no second copy to switch to, so a build-then-swap step would add a second tree and a swap procedure for no availability gain. The window is a few seconds of rsync on one machine. U4 does not widen it — the change adds no asset and removes three nav items per surface, and the hashed asset names in a new build are stable within that tree.

## Rollback

Revert the offending commit on `develop`, then rebuild and redeploy — either a manual Jenkins run or `just deploy` from the local checkout. Because `rsync --delete` mirrors the tree, a rollback is a full tree replacement and leaves no partial state to clean up. Releases are not tagged and no previous build is kept, so a rollback means rebuilding from the reverted source rather than restoring an artifact.

## Environment promotion

None. `develop` is the only branch that ships; `main` is a milestone marker. There is no staging environment, so a promotion stage does not exist.

## Secrets in CI/CD

None. The pipeline needs no credential, token or key: the preprocessor reads a local vault path, the build is offline, and the deploy is a local file sync. The repository's only remote is `origin` on the maintainer's own machine.

## U4-specific pipeline change

None. U4 adds no stage, no job, no script, no environment and no secret; its work rides the existing Verify, Build Site and Deploy stages unchanged.
