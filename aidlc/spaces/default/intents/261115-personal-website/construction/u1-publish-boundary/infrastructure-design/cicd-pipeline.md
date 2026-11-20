# CI/CD Pipeline — U1 `u1-publish-boundary`

Upstream: `nfr-design/reliability-design.md`, `security-design.md`, `performance-design.md`; `functional-design/functional-spec.md` (W6); `inception/contract-design/contract-summary.md` (C1); team Way of Working, Testing Posture and Deployment; answers in `infrastructure-design-questions.md` (Q1).

## 1. Delivery flow for U1

1. **Branch.** A short-lived branch off `develop` (the Construction tool's `bolt-<id8>_u1-publish-boundary` name). It stays local.
2. **Test-first commits.** For each behaviour, a failing test is committed before the code that makes it pass. Commit messages use `<type>: <Korean description>`.
3. **Local gate before merge.** The recorded verification command:

   ```
   (cd preprocessor && cargo fmt --check && cargo test --release) \
   && just preprocess \
   && (cd site && npm run test:unit && npm run test:pbt && npm run format:check \
       && npx astro check && npx playwright test --config playwright.hig.config.ts) \
   && just crossunit
   ```

   All of these steps use fixture content: `just preprocess` defaults to the fixture pair, and the HIG runner rebuilds from the same pair. Jenkins Verify prepares the same inputs: the fixture pair, the JSON copies and `ensure-fixture-content.mjs`. The HIG suite must pass in full, including its rewritten `homepage (W5)` block and the NFR1-b highlight test, which now runs on a fixture post (see `infrastructure-specification.md` change list). `npm run test:e2e` is not part of the gate: the manual accessibility record is invalid until the owner redoes the review at the end of the release.
4. **Preconditions.** The owner has reworded the `Areas/Notes` project rule (F4). Contract C1 and `CLAUDE.md` are updated in the same branch.
5. **Merge.** `git merge --no-ff` into `develop` with git's default message, then push `develop`. The branch and worktree are deleted.
6. **Release.** The next nightly run of `obsidian-blog-develop` publishes U1. No other promotion step exists.

## 2. Jenkins stages after U1

| Stage | Command change | Gate |
|---|---|---|
| Install | none | `npm ci`, `cargo build --release` |
| Verify | `obsidian-press ./fixtures/vault/Notes ./content --pages ./fixtures/vault/Pages`, then the JSON copies; the fixture materialiser no longer writes `content/homepage/` | `cargo test --release`, `npm run test:unit`, `npm run test:pbt` must pass; this is the production gate |
| Preprocess | `obsidian-press --stamp-published "${VAULT_PATH}" ./content --pages "${PAGES_PATH}"`. The asset copy replaces `site/public/assets` (`rm -rf`, then `cp -R content/assets/.`), so `assets/pages/` arrives and withdrawn images are gone | exit 0 required; exit 1 or 2 stops the job |
| Build Site | none | `npx astro build` must pass; the site no longer reads a homepage artifact |
| Deploy | none | runs only when every earlier stage is green and `RUN_DEPLOY` is checked |

Ordering guarantees: Verify runs before any vault read; Preprocess is the only stage that reads the vault and the only one that stamps; Deploy never runs after a failure, so the previous build stays live.

## 3. Test automation integration

| Suite | Runs in | New U1 coverage |
|---|---|---|
| `cargo test --release` | local gate, Jenkins Verify | guard, walker, catalog (PUB008/PUB009), stamping order, attachment bounds, `pages/` output, summary line, fixture moves |
| `npm run test:unit` / `test:pbt` | local gate, Jenkins Verify | data layer without the homepage artifact; ordinary posts vs hubs; interim today list |
| HIG Playwright (`playwright.hig.config.ts`) | local gate | `/` opening: one h1, name and intro, no headline, capsules, 44 × 44 px, axe at 4 widths × 2 themes, reduced motion, same-origin, JS off |
| `just crossunit` | local gate | link sweep and JS-off smoke over the fixture site |
| Asset-copy check (Vitest, in `npm run test:unit`) | local gate, Jenkins Verify | runs the replace-style copy twice: once with a fixture page image present, once after removing that page from a temporary copy of `Pages/`. The second run leaves no file under `site/public/assets/pages/`. |
| `hig-performance.spec.ts` | local gate | no change: it measures `/` by URL only and does not depend on the homepage note's markup |
| `npm run format:check`, `npx astro check`, `cargo fmt --check` | local gate | — |

## 4. Deployment strategy and rollback

- **Strategy.** All-at-once nightly publish (rsync to the web root). Blue-green and canary do not apply to a single static site on one host.
- **Rollback.** Revert the U1 merge commit on `develop` and push. Then run the Jenkins job manually, or `just deploy` from `develop` with the owner's go-ahead. The vault needs no rollback. `Areas/Pages` can stay: the old binary ignores it.
- **Post-deploy check.** After each rollout run, the owner checks by hand that `/` and one post answer HTTP 200 (team Deployment). Automating it is follow-up F1, out of scope.
- **Abort criteria for the rollout (Q1).** The owner reverts before creating `Areas/Pages` if:
  - the first post-merge run is red;
  - either HTTP 200 check fails; or
  - its summary's `<N>` differs from the pre-merge post count (see `monitoring-design.md`) by more than the posts the owner added or removed that day.

## 5. Secrets

None. `OBSIDIAN_VAULT_PATH`, `OBSIDIAN_PAGES_PATH`, `BLOG_WEB_ROOT` and `PUPPETEER_EXECUTABLE_PATH` are plain paths in the Jenkins environment or the Jenkinsfile defaults. No credential is added or read by U1.
