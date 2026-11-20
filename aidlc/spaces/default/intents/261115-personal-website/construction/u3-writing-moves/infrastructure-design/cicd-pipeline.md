# CI/CD Pipeline — U3 `u3-writing-moves`

Upstream: `infrastructure-design/infrastructure-specification.md`, `infrastructure-design/monitoring-design.md`; `nfr-design/performance-design.md`, `nfr-design/security-design.md`, `nfr-design/logical-components.md`; `functional-design/functional-spec.md`; team.md (Testing Posture, Deployment).

U3 adds no pipeline stage and no job. It changes the command lines of one existing stage, Deploy, so that the redirect table lands after the pages it names. The same change is made in the local `deploy` recipe so the two stay identical. Every other stage runs as it does today; the rows below say where U3's tests, its build-time writer and its new deployed file are measured.

## Pipeline stages

The Jenkins job `obsidian-blog-develop` (cron `H 0 * * *`) checks out `origin/develop` and runs:

| # | Stage | Command | Gate | U3 impact |
|---|---|---|---|---|
| 1 | Checkout | `checkout scm` | — | none |
| 2 | Install | `cd site && rm -rf .generated && npm ci`; `cargo build --release --manifest-path preprocessor/Cargo.toml` | — | none |
| 3 | Verify | `cargo test --release --manifest-path preprocessor/Cargo.toml`; `./preprocessor/target/release/obsidian-press ./fixtures/vault/Notes ./content --pages ./fixtures/vault/Pages`; copy the four JSON files into `site/public/`; `cd site && npm run test:unit && npm run test:pbt` | Fails the run | U3 changes the site suites: new Vitest coverage for the shared address module, the build-time writer (shape, grammar, target check), the redirect lookup and the server's dotted-key check over a temporary web root, plus the updated old-address expectations. This stage runs neither `npm run format:check` nor `npx astro check` — see the pre-merge gate |
| 4 | Preprocess | `./preprocessor/target/release/obsidian-press --stamp-published "${VAULT_PATH}" ./content --pages "${PAGES_PATH}"`; copy the JSON files and sync the assets into `site/public/` | — | none; U3 adds no content |
| 5 | Build Site | `cd site && npx astro build` | Fails the run | The command is unchanged. U3 registers an Astro integration whose build-done hook writes `_redirects.json` into this build's own output directory. Before writing, the hook validates every rule against the acceptance grammar and checks every target page in the build output, and fails the build on either (`REDIRECT_TARGET_MISSING`). A failed build writes no table and stops the run before Deploy |
| 6 | Deploy (only with `RUN_DEPLOY`) | **Changed**: `mkdir -p "${WEB_ROOT}"`; `rsync -a --delete --exclude=/_redirects.json site/dist/ "${WEB_ROOT}/"`; then `rsync -a --checksum site/dist/_redirects.json "${WEB_ROOT}/_redirects.json"` if the build produced one, else `rm -f "${WEB_ROOT}/_redirects.json"` | — | The tree lands first, the table second, so a new rule never goes live before its page (NFR5.25). rsync renames the table into place, so the server never reads a partial file. See "Deployment strategy" |

The job keeps exactly these six stages (`Jenkinsfile:31-118`); its `post` block only echoes (`Jenkinsfile:120-123`). The `deploy` recipe in `Justfile` (`:28-30`) gets the same three copy lines in the same merge, so `just deploy` and the Jenkins Deploy stage stay byte-for-byte the same procedure. The Jenkinsfile edit rides U3's branch rather than a direct CI commit to `develop`, because the contract summary requires a change to a spec to land in the same merge as its consumers (`inception/contract-design/contract-summary.md:194`).

Local equivalents: `just deploy` (the same preprocess, build and two-copy deploy from a local checkout), `just serve` (the script the launchd agent runs), `just crossunit` (the JavaScript-off smoke test and link sweep over the built site).

## Manual release check (maintainer practice, not a Jenkins stage)

| Check | When | By whom | U3 impact |
|---|---|---|---|
| HTTP 200 on `/` and on one post | after a deploy the maintainer checks | the maintainer | none — the existing practice (team.md, Deployment) |
| `/tags` answers 301 with `Cache-Control: no-cache`, and the target its `Location` names answers 200 | **after every deploy the maintainer checks, from the first nightly deploy that ships U3's moved pages onward** — the same occasions as the row above, one more request each | the maintainer | new for U3; the SLI with the same cadence is in `monitoring-design.md` > "SLIs / SLOs" |

This check has no automated runner today. The automated post-deploy runner is open follow-up F1 (`inception/practices-discovery/evidence.md:75`, listed as separate work in `inception/requirements-analysis/requirements.md`). The one-off U3 release check — restart `dev.rvnnt.blog`, then `curl -I https://rvnnt.dev/tags` returns 301 — is recorded in `inception/delivery-planning/bolt-plan.md:45`. It is the first instance of the second row, not a separate cadence. U3 adds no Jenkins stage.

## Pre-merge gate

Before a change is merged into `develop`, the maintainer runs the checks the nightly job does not run:

| Check | Command | Runs where |
|---|---|---|
| Formatting | `npm run format:check` (in `site/`) | locally, before merging — no pipeline stage runs it |
| Type check | `npx astro check` (in `site/`) | locally, before merging — no pipeline stage runs it |
| Browser and accessibility checks | `npx playwright test --config playwright.hig.config.ts` and `just crossunit` | locally, before merging |
| The two-copy deploy | `just deploy`'s copy lines run against a scratch web root seeded with an old tree and an old table: after copy 1 the new tree is present and the old table is unchanged; after copy 2 the table is the new one; a build with no table removes the destination table | locally, once, before merging U3 — the Deploy stage has no test of its own |
| Profile suite | `npm run test:e2e` | outside the merge gate: it fails closed until the manual accessibility record is current (see below) |

The nightly job's Verify stage covers the Rust suite, `npm run test:unit` and `npm run test:pbt`. The browser checks above are local by the team's practice, because Jenkins does not run every check.

U3 changes one manual-review-subject file: `site/astro.config.mjs`.
- U3 edits it to register the Astro integration, and it is the first entry of `REVIEW_SUBJECT_SOURCE_FILES` in `site/scripts/profile/accessibility-review-contract.mjs`. The two stylesheets U3 edits (`src/styles/grouped.css`, `src/styles/writing.css`) are not subjects.
- Changing a subject changes the review digest, so U3 invalidates the 16-state manual record, and `npm run test:e2e` fails closed with `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` from the moment U3 merges.
- The project has no release approval step — pushing `develop` is the release (team.md, Deployment). So the maintainer redoes the manual review once, after the change settles, **before the nightly deploy that ships U3's moved pages**, the same deploy the pinned restart is tied to (team.md, Testing Posture; `inception/delivery-planning/bolt-plan.md`). The profile suite stays outside the merge gate until then.

## Test-automation integration

Every file that carries an old-address (`/tags`, `/graph`) expectation today, found by a search of `site/tests/` for the quoted address literals, is listed below. Each one is either updated to the new address or confirmed correct after the move.

| Check | Project | Files | Notes |
|---|---|---|---|
| The redirect table's shape and rules, the address module, the lookup's answers, the writer's grammar and target checks | Vitest | `site/tests/unit/` (new files): the build output holds `_redirects.json` with C4's shape, sorted unique decoded rules and one rule per built tag page; a missing target page or a grammar violation fails the writer; the lookup answers 301 with the encoded target and the kept query, and 400 for an encoded control byte on a match; a missing or invalid table answers no redirect and fails no request | The lookup is a separate module (`site/scripts/redirect-table.mjs`), so the server's port is not needed to test it |
| The dotted tag key through the real server | Vitest | `site/tests/unit/` (new file): starts `site/scripts/local-server.mjs` as a child on a free port from a port-0 listener on 127.0.0.1, never 8080 or 4329, against a temporary web root holding `writing/tags/node.js/index.html` and its rule; asserts 301 then 200; tears the child down on success and failure | runs in the Jenkins Verify stage with the rest of the unit suite |
| HTTP-level redirect behaviour | HIG project | `site/playwright.hig.config.ts` serves `site/dist` through the production server `scripts/local-server.mjs` on 127.0.0.1:4329 (`site/scripts/hig/build-and-serve.mjs`), so the redirect answers are observed against the same code launchd runs | no second server is needed |
| The moved pages, the back link, the axe matrix — old-address expectations **updated** to `/writing/...` | HIG project | `site/tests/e2e/hig-pages.spec.ts` (`:173-500`, the tag, tag-page and graph checks and the route lists), `site/tests/e2e/hig-writing.spec.ts:151-152` (the capsule `href`s), `site/tests/e2e/hig-performance.spec.ts:16,26` (`CWV_ROUTES`, `MOBILE_NETWORK_ROUTES`), `site/tests/e2e/hig-search.spec.ts:75` (search opened from the tag index), `site/tests/e2e/hig-profile.spec.ts:30` (`BASELINE_ROUTES`), and the shared fixture `site/tests/e2e/support/hig.ts:45-47` (`HIG_ROUTES`) and `:145` (the graph's list-tab open state) | every expectation is moved, none deleted (NFR6.15) |
| Old-address literals **kept** because they are correct after the move | Vitest | `site/tests/unit/profile-metadata-navigation.test.ts:258` (`resolveRouteResourcePolicy('/tags')` stays a legacy route) and `site/tests/pbt/u1/arbitraries/metadata.ts:168,173` (arbitrary paths, not served routes) | confirmed, not changed |
| JavaScript-off smoke and link sweep | crossunit project | `site/playwright.crossunit.config.ts` matches `crossunit.spec.ts` only, with `javaScriptEnabled: false`; U3 extends it to the three moved routes and the graph's list panel | `just crossunit` runs this project |
| Profile suite | `npm run test:e2e` | `site/playwright.config.ts` ignores `hig-*.spec.ts` and `crossunit.spec.ts` through its `testIgnore` list | outside the merge gate |

## Deployment strategy

Recreate, one environment, no traffic shifting. The Deploy stage mirrors `site/dist/` into the directory the server actually serves, and `site/scripts/local-server.mjs` resolves and streams a file per request, so the swap is in place and not atomic. U3 orders the one file whose timing matters.

**Copy 1 — the tree, without the table.** `rsync -a --delete --exclude=/_redirects.json site/dist/ "${WEB_ROOT}/"`.
- The anchored pattern names only the root file.
- Without `--delete-excluded`, the destination's existing table is neither replaced nor deleted.
- When this copy ends, every page the build produced is in place and the old `tags/` and `graph/` trees are gone.
- During it, an old address answers whatever the file lookup finds: the old page while it is still there, then 404 once the deletion removes it — or, on a deploy after U3 is live, the old table's 301 to a page that exists.

**Copy 2 — the table.** `rsync -a --checksum site/dist/_redirects.json "${WEB_ROOT}/_redirects.json"`.
- rsync writes a temporary file beside the destination and renames it, so the server reads either the old table or the new one.
- `--checksum` makes the copy compare content: the machine's `/usr/bin/rsync` is openrsync, whose quick check would skip an equal-size table with an equal timestamp. A scratch-root probe showed exactly that skip without the flag, the replacement with it, and a new inode on the replaced file (`infrastructure-specification.md` > "The two-copy deploy").
- The server re-reads on the modification-time change, and the new rules go live with every target already present.
- If the build produced no table, `rm -f` removes the destination's, so no stale rule outlives the pages it named.

**The residual, between the copies:**
- A tag that disappeared in this build still has its old rule live for the seconds between the copies, pointing at a page copy 1 just deleted, so its old address answers 301 then 404.
- After copy 2 it answers 404 directly, which is what contract C5 promises for a tag that no longer exists. The visitor ends on the same 404, one hop later.
- No new tag's rule can go live before its page.

**Why the pipeline changes.**
- `nfr-requirements/tech-stack-decisions.md` lists the deployment pipeline as out of scope. That row predates NFR5.25's amendment, which removed the request-time target check and handed the publish window to this stage.
- Two copy lines in each of the two existing deploy definitions are the smallest change that closes the window. Staging a second tree and swapping it would add a directory and a swap procedure for no gain over ordering one file.

## Restart order (the one operational step U3 adds)

The restart is pinned by BR3.5 and by contract C4's open question: restart `dev.rvnnt.blog` after U3 merges and before the first nightly deploy that ships the moved pages.

**Precondition.** The launchd agent runs the server script from the maintainer's working copy (`~/Library/LaunchAgents/dev.rvnnt.blog.plist:12-14`), not from the Jenkins checkout. So before the restart:
- the working copy must be on `develop` at or after the U3 merge commit;
- `site/scripts/local-server.mjs` and `site/scripts/redirect-table.mjs` must be unmodified against that commit.

A restart from an older working copy would load a server with no redirect branch. Once the deploy deletes the old page trees, the old addresses would then answer 404.

**Sequence.**
1. `git -C ~/Projects/obsidian-blog switch develop`, then `git pull` to the merge commit.
2. `launchctl kickstart -k gui/$(id -u)/dev.rvnnt.blog`.
3. Request `/tags` once on the origin. It still answers 200 with the old page, because no table exists yet.

Between the restart and the deploy, the old pages are still in the web root and no table exists, so the server serves them normally and no old address breaks. The deploy then lands the new tree and the table in order, and the running server picks the table up without a further restart.

## Rollback

Revert the offending commit on `develop`, then rebuild and redeploy — a manual Jenkins run or `just deploy` from the local checkout. Releases are not tagged and no previous build is kept, so a rollback rebuilds from the reverted source.

Three additions for U3:
- **The table.** A revert of the U3 merge also reverts the two-copy deploy to the single `rsync -a --delete`, which deletes the table with the rest of the tree. If only the pages are reverted and the deploy lines stay, the reverted build has no table, and copy 2's `rm -f` removes it. Either way no rule outlives its pages.
- **The browser's copy of the redirect.** The 301 carries `Cache-Control: no-cache` (decided at the close of NFR Design, from that stage's review, and recorded in its diary `construction/nfr-design/memory.md`), the same header the server gives every non-asset response (`site/scripts/local-server.mjs:91-93`). A browser that followed `/tags` therefore revalidates the redirect on its next visit instead of keeping it indefinitely, and after the rollback it gets the old page.
- **The server code.** If the revert touches `site/scripts/local-server.mjs`, restart the launchd service after the redeploy, from a working copy at the reverted commit — the same precondition as the forward restart.

## Environment promotion

None. `develop` is the only branch that ships; `main` is a milestone marker. There is no staging environment, so a promotion stage does not exist.

## Feature flags and artifact management

U3 uses no feature flag: the moved pages and the redirect table ship in the same build as everything else, and the old addresses are answered by the server's lookup, not by a flag. The deployed artifact is the `site/dist/` tree itself, mirrored in place by the Deploy stage. U3 adds one file to that tree, moves three page trees and places the one file last. The artifact is never versioned, tagged or stored apart from the build that produced it.

## Secrets in CI/CD

The preprocess, the build and the deploy need no credential, token or key: the preprocessor reads a local vault path, the build is offline, and the deploy is a local file copy. The pipeline reaches one remote: `origin` is `git@github.com:revenantonthemission/obsidian-custom-publish.git`, so the job's `checkout scm` pulls from GitHub over SSH with the maintainer's key on the Jenkins agent. U3 adds no credential and changes no checkout.

## U3-specific pipeline change

One: the Deploy stage's copy becomes the two-copy deploy, mirrored in the `Justfile` `deploy` recipe in the same merge. U3 adds no stage, no job, no script, no environment and no secret. Everything else rides the existing stages:
- the Astro integration's build-done hook, inside the build that Build Site already runs;
- the server's redirect lookup, raw-query check and directory-index branch, inside the server the deploy already ships;
- the one pinned launchd restart.
