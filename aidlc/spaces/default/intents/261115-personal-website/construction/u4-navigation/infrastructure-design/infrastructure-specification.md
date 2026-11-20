# Infrastructure Specification — U4 `u4-navigation`

Upstream: `nfr-design/performance-design.md`, `nfr-design/security-design.md`, `nfr-design/logical-components.md`; `inception/domain-design/components.md`; `functional-design/functional-spec.md`; `inception/contract-design/contract-summary.md`.

U4 changes the chrome of the static site and nothing else. It adds no service, no runtime, no cloud resource, no environment and no pipeline stage, so the delivery and serving path below is the project's existing one, unchanged, with the row U4 actually touches marked.

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Compute model | Static site build (Astro → `site/dist/`) served by a Node static file server (`site/scripts/local-server.mjs`, port 8080) under the launchd agent `dev.rvnnt.blog` | U4 is build-time only: the marker rule runs inside the Astro build, so the serving model is unchanged and no runtime was added |
| Networking topology | Cloudflare Tunnel `obsidian-blog` (launchd `dev.rvnnt.tunnel`) → 127.0.0.1:8080 → `~/Sites/obsidian-blog` | The tunnel publishes the local origin; the site has no ingress of its own and no VPC, subnet or security group |
| Storage strategy | Files on disk: the web root mirrors `site/dist/` (`rsync -a --delete`); content JSON and assets are copied into `site/public/` | No database, object store or cache; U4 adds no stored state |
| Environments | One production environment (`develop` → nightly job → web root). No staging | The team deploys `develop` nightly with no staging environment and no approval step (team.md, Deployment) |
| Deploy mechanism | In-place mirror: `rsync -a --delete site/dist/` into the directory the server serves, so the swap is not atomic and a request during the sync window can observe a half-replaced tree | Accepted for a single-origin nightly blog with one tree and no staging to switch to; the exposure is a few seconds of rsync on one machine and U4 neither adds an asset nor widens it (`cicd-pipeline.md`, Deployment strategy) |
| IaC approach | None needed: the infrastructure is two launchd agents, one Jenkins job and a shell deploy (the `deploy` recipe in `Justfile` and the Deploy stage in `Jenkinsfile`) | U4 provisions nothing; adding IaC for a single static site would introduce machinery nobody owns |
| Resource sizing | Unchanged: one static file server process, one tunnel process, one nightly Jenkins run | U4 adds no process, no request, no asset and no build step |
| Cost | No change: no billable cloud resource is created, resized or removed by U4 | The tunnel and the server are the existing zero-cost path |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| Static file server (`site/scripts/local-server.mjs`, launchd `dev.rvnnt.blog`) | load-balancer (origin) | Serves `~/Sites/obsidian-blog` on 127.0.0.1:8080 | Unchanged; serves the rebuilt tree as soon as the sync completes |
| Cloudflare Tunnel (`obsidian-blog`, launchd `dev.rvnnt.tunnel`) | cdn / dns | Publishes the local origin to https://rvnnt.dev | Unchanged; U4 adds no cache rule, worker or external asset |
| Jenkins job `obsidian-blog-develop` | build-and-deploy pipeline | cron `H 0 * * *`, checkout of `origin/develop`, stages Checkout → Install → Verify → Preprocess → Build Site → Deploy | Unchanged; U4 rides the existing Build Site stage |
| `rsync -a --delete` to `~/Sites/obsidian-blog` | deployment step | Mirror of `site/dist/` | Unchanged; the deployed tree is the built site, so U4's chrome change ships with the next build |
| Preprocessor (`preprocessor/`) | batch (offline) | The nightly Preprocess stage runs the built binary: `./preprocessor/target/release/obsidian-press --stamp-published "${VAULT_PATH}" ./content --pages "${PAGES_PATH}"` | Unchanged; U4 adds no content and no vault change. The vault folder and the pages folder are the two required inputs of the publishing step (contract C1) |
| Database / cache / queue / search | — | None | The site has no database, cache, queue or search service; the search index is a static JSON file built by the preprocessor |

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| Nightly Jenkins job `obsidian-blog-develop` (Checkout, Install, Verify, Preprocess, Build Site, Deploy) | No unit owns it; it is the project's existing pipeline | u1-publish-boundary, u2-writing-section, u3-writing-moves, u4-navigation | Single writer (`origin/develop`), one deploy per night; a Unit's work is merged into `develop` before it ships |
| Web root `~/Sites/obsidian-blog` and the launchd services `dev.rvnnt.blog`, `dev.rvnnt.tunnel` | No unit owns them; they are the project's serving path | every Unit that ships a page | Read-only for the site build; the deploy step is the only writer and it replaces the tree wholesale |
| `site/public/*.json` (search index, graph, previews, nav tree) produced by the preprocessor | u1-publish-boundary owns the preprocessor boundary | u2-writing-section, u3-writing-moves, u4-navigation (read-only consumers) | Build-time file contract: the preprocessor writes, the site reads |

U4's own shared-resource touch is the chrome itself — `site/src/styles/chrome.css`, the navigation model and the two chrome components — which every Unit's pages render. That is application code, not infrastructure, and it is specified in `nfr-design/logical-components.md`.
