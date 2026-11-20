# Infrastructure Specification — U3 `u3-writing-moves`

Upstream: `nfr-design/performance-design.md`, `nfr-design/security-design.md`, `nfr-design/logical-components.md`; `inception/domain-design/components.md` (DiscoveryPages, LegacyRedirects, StaticServer, WritingPages, NightlyPipeline); `functional-design/functional-spec.md` (W5, W6, W7); `inception/contract-design/contract-summary.md` (C4, C5).

U3 moves the tag index, the tag pages and the graph under `/writing/...` and answers the old addresses with permanent redirects. It changes no topology: no new service, process, network, environment or cloud resource. It changes three things at the infrastructure level:

- **the static server's request path:** it gains the redirect lookup, the raw-query check on a match and the clean-URL rewrite's directory-index branch (BR3.6);
- **the deployed artefact set:** it gains one new non-page file, `_redirects.json`, and moves three page trees;
- **the deploy step:** it is split into two copies so the table lands after the pages it names (`nfr-design/security-design.md` §6.1).

It also adds one operational step: a pinned restart of the launchd service.

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Compute model | Static site build (Astro → `site/dist/`) served by a Node static file server (`site/scripts/local-server.mjs`, port 8080) under the launchd agent `dev.rvnnt.blog` | U3 changes the server's request path, not the serving model: the redirect lookup runs before the file lookup; on a match the raw query is checked and the server answers 301 (or 400 for an encoded control byte) without reading any file for the target; the clean-URL rewrite gains the directory-index branch, so a path that resolves to a directory is served by its `index.html`. No process is added or removed |
| Networking topology | Cloudflare Tunnel `obsidian-blog` (launchd `dev.rvnnt.tunnel`, ingress `http://127.0.0.1:8080`, `~/.cloudflared/obsidian-blog.yml:6`) → the origin, which the launchd agent binds to **`HOST=0.0.0.0`, `PORT=8080`** (`~/Library/LaunchAgents/dev.rvnnt.blog.plist:19-23`; `site/scripts/local-server.mjs:16-17` takes both from the environment) → `~/Sites/obsidian-blog` | The tunnel publishes the origin; the site has no ingress of its own and no VPC, subnet or security group. The origin is therefore **also reachable directly from the local network** at `http://<host>:8080`, unauthenticated. **Decision: accepted, not changed by U3.** Everything the origin serves — including the new `_redirects.json` — is already public through the tunnel, the web root holds no secret, and the server answers only `GET` and `HEAD`. The LAN path adds no data a visitor cannot already fetch. Rebinding to `HOST=127.0.0.1` (one plist line, applied with the pinned restart) would close the direct path; it is left to the maintainer, because the LAN binding may be deliberate (previewing from another device) and U3 does not need it changed |
| Storage strategy | Files on disk: the web root mirrors `site/dist/`; content JSON and assets are copied into `site/public/` | U3 adds one new non-page file at the site root (`site/dist/_redirects.json` → `~/Sites/obsidian-blog/_redirects.json`) and moves three page trees (`/tags` → `/writing/tags`, `/tags/<tag>` → `/writing/tags/<tag>`, `/graph` → `/writing/graph`), whose old locations the mirror deletes. Like every file in the tree the table is world-readable, so it is untrusted input to the server; the acceptance grammar G1–G8 in `nfr-design/security-design.md` §5.1 is what makes it safe to read |
| Environments | One production environment (`develop` → nightly job → web root). No staging | The team deploys `develop` nightly with no staging environment and no approval step (team.md, Deployment). U3 adds no environment and no promotion step |
| Deploy mechanism | **Two ordered copies**, in both the `deploy` recipe (`Justfile:28-30`) and the Jenkins Deploy stage (`Jenkinsfile:107-117`): (1) mirror the tree **without** the table — `rsync -a --delete --exclude=/_redirects.json site/dist/ "$WEB_ROOT/"`; (2) then place the table — `rsync -a --checksum site/dist/_redirects.json "$WEB_ROOT/_redirects.json"` when the build produced one, otherwise `rm -f "$WEB_ROOT/_redirects.json"` | The server does not check redirect targets at request time (NFR4.10, contract C4), so the table must land after the pages it names (NFR5.25, `nfr-design/security-design.md` §6.1). The details are in "The two-copy deploy" below |
| IaC approach | None needed: the infrastructure is two launchd agents, one Jenkins job and a shell deploy (the `deploy` recipe and the Deploy stage) | U3 provisions nothing; adding IaC for a single static site would introduce machinery nobody owns |
| Restart policy | One pinned restart of `dev.rvnnt.blog` after U3 merges and before the first nightly deploy that ships the moved pages (BR3.5, the answer to contract C4's open question). **Precondition:** the agent runs the server script from the maintainer's working copy — `ProgramArguments` point at `/Users/revenantonthemission/Projects/obsidian-blog/site/scripts/local-server.mjs` (`~/Library/LaunchAgents/dev.rvnnt.blog.plist:12-14`), not at Jenkins' checkout — so before the restart the working copy must be on `develop` at (or after) the U3 merge commit, with `site/scripts/local-server.mjs` and `site/scripts/redirect-table.mjs` matching that commit (`git -C <repo> status` clean for both, `git log -1` showing the merge) | The table needs no restart: the server re-reads it when its presence or modification time changes. Only the new server code needs the restart, because a running process keeps the code it started with. A restart taken from an older working copy would load a server with no redirect branch, and once the deploy deletes the old page trees the old addresses would answer 404 — the precondition is what prevents that silent break |
| Resource sizing | Unchanged: one static file server process, one tunnel process, one nightly Jenkins run | The per-request cost grows by one `stat` and one map lookup; a matched request adds one regular-expression test on the query and one header write, and reads no file for its target. A request whose path resolves to a directory adds one `stat`. The deploy gains one single-file copy |
| Cost | No change: no billable cloud resource is created, resized or removed by U3 | The tunnel and the server are the existing zero-cost path |

### The two-copy deploy

```sh
# Deploy (Justfile `deploy` and Jenkinsfile Deploy stage, same three lines)
mkdir -p "$WEB_ROOT"
rsync -a --delete --exclude=/_redirects.json site/dist/ "$WEB_ROOT/"
if [ -f site/dist/_redirects.json ]; then rsync -a --checksum site/dist/_redirects.json "$WEB_ROOT/_redirects.json"; else rm -f "$WEB_ROOT/_redirects.json"; fi
```

**Copy 1 — the tree, excluding the table.**
- The pattern is anchored (`/_redirects.json`), so it names only the root file.
- Without `--delete-excluded`, an excluded destination file is neither replaced nor deleted. The old table keeps serving the old rules while the pages change underneath it.
- When this copy finishes, every page the new build produced is in the web root, and the old `tags/` and `graph/` trees are gone.

**Copy 2 — the table.**
- rsync writes to a temporary file in the destination directory and renames it into place. The server therefore never reads a half-written table: it sees the old file or the new one, and it re-reads on the modification-time change.
- `--checksum` is required on this copy. The machine's rsync is `/usr/bin/rsync`, macOS's openrsync (protocol 29; no Homebrew rsync is installed). Its default quick check skips a file whose size and modification time match the destination's, and two tables of equal length with equal timestamps would leave the old rules live. `--checksum` compares content instead, and on a single small file it costs nothing measurable.
- Both properties were probed on this machine against a scratch web root:
  - copy 1 left the old table untouched, added the new page and removed the old tree;
  - copy 2 without `--checksum` skipped an equal-size, equal-mtime table, and with `--checksum` replaced it;
  - the replaced table had a new inode, so it was renamed into place, not written in place;
  - the no-table branch removed the destination table.
- The new rules go live only once their targets exist. This is the ordering NFR5.25 hands to this stage.

**The `else` branch.**
- A build that writes no table (for example a rollback to a pre-U3 commit, if the deploy lines were kept) removes the stale table instead of leaving rules that point at deleted pages.
- With no table, the server serves files normally and answers no redirect (BR3.4).

**The residual window, reversed and harmless.**
- Between the two copies, the old table is live over the new tree. A rule whose tag disappeared in this build points at a page Copy 1 just deleted, so for those seconds the old address answers 301 and then 404.
- That tag's old address answers 404 once Copy 2 lands anyway (contract C5: 404 for a tag that no longer exists). The visitor ends on the same 404, one hop later.
- The opposite direction — a new tag's rule landing before its page, the window NFR5.25 names — cannot happen.

**Why the pipeline changes after all.**
- `nfr-requirements/tech-stack-decisions.md` lists "the deployment pipeline" as out of scope. That row was written when the publish window was meant to be closed in the server.
- NFR5.25, as amended and reviewed READY, hands the window to this stage instead.
- The change is the smallest one that closes it: two copy lines in each of the two existing deploy definitions. No stage, job, script or credential is added, and both files change in the U3 merge, so they stay in step.

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| Static file server (`site/scripts/local-server.mjs`, launchd `dev.rvnnt.blog`) | load-balancer (origin) | Serves `~/Sites/obsidian-blog` on `0.0.0.0:8080` (the plist's `HOST`/`PORT`; reachable on the LAN as well as through the tunnel — see Networking topology) | **Changed** by U3: the redirect lookup runs before the file lookup; on a match the raw query is checked (400 for an encoded control byte) and the 301 is written with `Cache-Control: no-cache`; the clean-URL rewrite gains the directory-index branch (BR3.6); no file is read for a redirect target; the handler never throws, so an invalid header value is answered 400 instead of taking the process down |
| Redirect table `_redirects.json` | shared store (build-time artefact, read at request time) | `{ "version": 1, "rules": [ { from, to } ] }` at the web root; written by the Astro build-done hook into the build's own output directory, after the hook has checked every rule against the acceptance grammar and every target page against the build output | **New** in U3. Public and attacker-readable: the server accepts it only in C4's shape and validates every rule against G1–G8; a table that fails any condition is rejected whole, with one error line and no redirect. The writer fails the build (`REDIRECT_TARGET_MISSING`, or a grammar violation) rather than ship a table the server would reject or one that names a missing page |
| Cloudflare Tunnel (`obsidian-blog`, launchd `dev.rvnnt.tunnel`) | cdn / dns | Publishes the origin to https://rvnnt.dev via `http://127.0.0.1:8080` | Unchanged; U3 adds no cache rule, worker or external asset |
| Jenkins job `obsidian-blog-develop` | build-and-deploy pipeline | cron `H 0 * * *`, checkout of `origin/develop`, stages Checkout → Install → Verify → Preprocess → Build Site → Deploy | Stages unchanged. The Build Site command (`cd site && npx astro build`) already runs the Astro integration that writes the table. The Deploy stage's copy becomes the two-copy deploy above |
| Deploy copy to `~/Sites/obsidian-blog` | deployment step | the two-copy deploy above | **Changed** by U3: the tree first without the table, then the table, in both `Justfile` and `Jenkinsfile` |
| Preprocessor (`preprocessor/`) | batch (offline) | The nightly Preprocess stage runs `./preprocessor/target/release/obsidian-press --stamp-published "${VAULT_PATH}" ./content --pages "${PAGES_PATH}"` | Unchanged; U3 adds no content and no vault change |
| Database / cache / queue / search | — | None | The site has no database, cache, queue or search service; U3's table is a static JSON file built by the site build |

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| Nightly Jenkins job `obsidian-blog-develop` (Checkout, Install, Verify, Preprocess, Build Site, Deploy) | No unit owns it; it is the project's existing pipeline | u1-publish-boundary, u2-writing-section, u3-writing-moves, u4-navigation | Single writer (`origin/develop`), one deploy per night. U3 changes the Deploy stage's copy lines in its own merge, together with the `Justfile` recipe |
| Web root `~/Sites/obsidian-blog` and the launchd services `dev.rvnnt.blog`, `dev.rvnnt.tunnel` | No unit owns them; they are the project's serving path | every Unit that ships a page | Read-only for the site build; the deploy step is the only writer. U3 adds one new non-page file to that tree, moves three page trees, orders the table's copy after the tree's, and changes the code of the server that reads it |
| `site/public/*.json` (search index, graph, previews, nav tree) produced by the preprocessor | u1-publish-boundary owns the preprocessor boundary | u2-writing-section, u3-writing-moves, u4-navigation (read-only consumers) | Build-time file contract: the preprocessor writes, the site reads |
| `_redirects.json` at the web root | u3-writing-moves owns the table (its producer) | the static server reads it at request time | Build-time producer, request-time reader. The file is public, so the boundary is the server's validation of its contents, not access control. The writer proves every target page is in the same build output, and the deploy lands the table after those pages |

U3's own infrastructure touch is the server script, the one new file it reads and the order in which the deploy places that file. The pages, the shared address module and the back-link component are application code, specified in `nfr-design/logical-components.md`.
