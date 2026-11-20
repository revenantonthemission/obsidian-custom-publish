# Infrastructure Specification — U1 `u1-publish-boundary`

Upstream: `nfr-design/*` (security, performance, scalability, reliability, observability, logical components); `inception/domain-design/components.md` (NightlyPipeline, StaticServer); `functional-design/functional-spec.md` (W6); `inception/contract-design/contract-summary.md` (C1, C2); team Deployment practices; answers in `infrastructure-design-questions.md` (Q1).

U1 adds **no infrastructure**. It changes the inputs and wiring of the existing batch pipeline only. Every row below marks an existing facet as *unchanged* or names the U1 change.

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Compute model | Unchanged: one macOS machine (owner's Mac) runs Jenkins (127.0.0.1:8081), the publishing binary, the Astro build and the static server | personal site; no cloud |
| Batch job | Unchanged job `obsidian-blog-develop`, cron `H 0 * * *`, stages Install → Verify → Preprocess → Build Site → Deploy | team Deployment |
| Networking | Unchanged: launchd `dev.rvnnt.blog` serves `~/Sites/obsidian-blog` on 127.0.0.1:8080; Cloudflare Tunnel `dev.rvnnt.tunnel` publishes https://rvnnt.dev | U1 has no server-side change |
| Storage — inputs | Vault folders `…/Obsidian Vault/Areas/Notes` (read, stamped) and **new** `…/Obsidian Vault/Areas/Pages` (read only), on iCloud Drive | FR1.1, NFR5.6 |
| Storage — generated | `content/` in the Jenkins workspace: **adds** `pages/` and `assets/pages/`, **drops** `homepage/` | C2, NFR4.6 |
| Storage — web root | Unchanged `~/Sites/obsidian-blog`, rsync `--delete` from `site/dist/` | — |
| Environments | Unchanged: production only (nightly); validation-only runs with `RUN_DEPLOY` unchecked; local runs through the Justfile | team Deployment |
| Configuration | **New** Jenkins environment `PAGES_PATH = env.OBSIDIAN_PAGES_PATH ?: '<vault>/Areas/Pages'` beside the existing `VAULT_PATH`; **new** Justfile `pages` (default `./fixtures/vault/Pages`) and `publish_pages` (`PAGES_PATH` or the real `Areas/Pages`); `vault` default becomes `./fixtures/vault/Notes` | functional design Q8 |
| IaC approach | Unchanged: Jenkinsfile and Justfile in the repository are the pipeline definition; launchd plists are outside the repository and are not touched | — |
| Resource sizing | Unchanged; budgets are relative (NFR6.4, NFR6.5) | performance design |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| Jenkins (local) | CI/CD | unchanged; one new environment variable | must never be started with `brew services start jenkins` (project rule) |
| Static server `local-server.mjs` (launchd `dev.rvnnt.blog`) | web server | unchanged | serves `/assets/pages/*` like any file; no restart needed for U1 |
| Cloudflare Tunnel (launchd `dev.rvnnt.tunnel`) | ingress / DNS | unchanged | — |
| iCloud Drive | vault storage | unchanged; one new folder created by the owner after the first green U1 run (Q1) | the binary never creates or writes `Areas/Pages` |
| Chrome / chrome-headless-shell, `d2`, `typst` | diagram renderers | unchanged | versions noted in the baseline record (performance design §3) |

Databases, caches, queues, search services, CDN and load balancers: none, now or in U1.

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| `content/` layout (C2) | U1 | U2, U3 (site build) | U1 writes; the site reads; BoundaryGuard forbids overlap with the vault |
| Jenkinsfile and Justfile | U1 for the preprocess wiring | U3 (server restart note), every unit's merge | each unit edits only its own steps; U1 changes the Verify and Preprocess commands and the Justfile variables |
| Web root `~/Sites/obsidian-blog` | existing Deploy | U1–U4 | rsync from `site/dist/` only |
| Fixture vault `fixtures/vault/{Notes,Pages}` | U1 (moves the notes, adds `Pages/`) | every unit's tests, Jenkins Verify, HIG and crossunit builds | read-only for tests; HIG runs replace `content/` with fixture output |

## Change list (what Code Generation touches outside the binary and the site code)

Every place that invokes `obsidian-press`, reads `fixtures/vault`, copies `content/assets`, or reads or writes `content/homepage/` is listed here (repository search, 2026-11-16).

| File | Change |
|---|---|
| `Jenkinsfile` | add `PAGES_PATH`. Verify runs `obsidian-press ./fixtures/vault/Notes ./content --pages ./fixtures/vault/Pages`, and its HP001 comment is removed. Preprocess adds `--pages "${PAGES_PATH}"`. The asset copy becomes a replace: `rm -rf site/public/assets && mkdir -p site/public/assets && cp -R content/assets/. site/public/assets/`, so a withdrawn page or post image is never redeployed. |
| `Justfile` | `vault` defaults to `./fixtures/vault/Notes`. New `pages` and `publish_pages`. `preprocess` and `deploy-preprocess` pass `--pages` and use the same replace-style asset copy. |
| `site/scripts/hig/build-and-serve.mjs` | binary arguments use the fixture pair; same replace-style asset copy |
| `site/scripts/profile/homepage-fixture-content.mjs` | stops writing `content/homepage/`. The `fixture-e2e-post` materialisation stays, with the same write-only-when-absent rule. Its function is renamed to say what it now writes. |
| `site/scripts/crossunit/ensure-fixture-content.mjs`, `site/scripts/profile/verification-provider.mjs` | callers follow the rename. The Verify comment and log line no longer mention a homepage artifact. Both callers are kept, because test:unit's isolated build still needs the e2e fixture post. |
| `site/tests/e2e/hig-pages.spec.ts` | the `homepage (W5)` block is rewritten for the new opening: h1, name and introduction, capsules at 44 px, and the interim "오늘 발행된 글" section. The `.home-card` count and the `.home-content` link-tint checks go. The NFR1-b highlight test moves from `.home-content` to a real highlighted link in a fixture post (see the fixture row). |
| `site/tests/unit/homepage-composition.test.ts`, `site/tests/pbt/u2/homepage-composition.pbt.test.ts`, `site/tests/e2e/homepage.spec.ts`, `site/tests/e2e/crossunit.spec.ts` | tests of the artifact reader, slot and HP codes are deleted. Homepage render checks are rewritten for the opening. The "no `/posts/fixture-homepage/`, no RSS or sitemap entry" checks stay, because the retired note must stay unpublished. |
| `preprocessor/tests/*.rs` (13 files with `../fixtures/vault`) | the path becomes `../fixtures/vault/Notes`. Page and boundary tests use `../fixtures/vault/Pages` or temporary vaults. Without this change, the recursive scan would read `Notes/` and `Pages/` as one vault. |
| `fixtures/vault/` | notes and `attachment/` move to `Notes/`. New `Pages/` holds a page, an image in `Pages/attachment/`, a `Drafts/` note and a dot-file. `Notes/Post With Formatting.md` gains one highlighted link (`==[[Simple Post]]==`) as the real subject for NFR1-b. |
| `.gitignore` | the three `fixtures/vault/attachment/` patterns become `fixtures/vault/Notes/attachment/`, and matching patterns are added for `fixtures/vault/Pages/attachment/` |
| `CLAUDE.md` | records the C1/C2 changes (exit 2, PUB008/PUB009, notices, summary line, `pages/`, `assets/pages/`, no `homepage/`, PUB002 and HP001–HP004 removed) |
| `inception/contract-design/contract-summary.md` C1 | updated in the U1 merge: notices, exit 2 and usage messages, PUB008 cases, PUB009, summary line, skipped-link warning. This supersedes the "C1 is unchanged" note in `functional-spec.md` §8, following the NFR-stage decisions (`observability-design.md` §4). |
