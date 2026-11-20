# Monitoring Design — U3 `u3-writing-moves`

Upstream: `nfr-design/performance-design.md`, `nfr-design/security-design.md`, `nfr-design/logical-components.md`; `infrastructure-design/infrastructure-specification.md`.

U3 changes the request path of the running server, so it adds observations to the project's existing set. This project has no metrics pipeline, no log aggregation and no alerting service. Every observation below is made by the maintainer, from one of three sources: the nightly job's result, the server's own log line, or a request after a deploy. U3 adds no collector, no dashboard and no alert route.

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|---|---|---|---|
| Nightly publish outcome | Jenkins job `obsidian-blog-develop` result | Every publishing run (`RUN_DEPLOY` checked) reaches the end of Deploy | The publish is the release; a failed Verify or a failed build stops the run before anything is deployed. For U3 this also covers the writer: a missing target page (`REDIRECT_TARGET_MISSING`) or a rule that breaks the acceptance grammar fails Build Site |
| Verify suite result | Jenkins Verify stage (`cargo test --release`, `npm run test:unit`, `npm run test:pbt`) | Zero failures | The production gate; a regression stops the run |
| Post-deploy reachability | HTTP status of `/` and of one post, checked by the maintainer after a deploy | HTTP 200 on both | Shows that the served tree answers at all; it says nothing about the old addresses inside it |
| Legacy-address redirect | one legacy address (`/tags`) requested by the maintainer after a deploy, then the target its `Location` names | the first answer is 301 with `Cache-Control: no-cache`, and the target answers 200 | **New** — the only observation that covers what U3 changed in the running site |
| Redirect table validity | the server's log line (launchd standard error) | no "redirect table" error line after a deploy | **New** — the line appears once per invalid table read; the site keeps serving files normally, but the old addresses stop redirecting |
| Deployed redirect table | the web root's `_redirects.json` | present, `version` 1, and one rule per built tag page plus the two fixed rules | **New** — the writer and the build check guarantee the shape; this is the spot check that the deploy's second copy ran |
| Moved-route request set | the HIG build's per-route request collector for `/writing/tags`, `/writing/tags/<tag>` and `/writing/graph` | the logical-resource set and count the NFR design pins: no new request per moved page | Measured on the built tree by the Build and Test stage |
| Inline stylesheet budget | the built tag index's `<style>` element that carries `grouped.css` — the one whose content begins with grouped.css's first rule (`.site-main:has(.listing-header)`), not the 59-byte island block the page also carries | strictly below 4096 B, Vite's `build.assetsInlineLimit`, which Astro's inline decision reads per emitted stylesheet (`site/node_modules/astro/dist/core/build/plugins/util.js:14-24`); and `grouped.css` never appears as a file under `_astro/` | Today 3632 B; the back-link rules take it to about 3912 B, roughly 184 B of headroom. The grouped rules are inlined into every page that loads them, and no `_astro/*.css` bundle carries them, so the move renames no hashed file (`nfr-design/performance-design.md` §3.2) |
| Accessibility matrix outcome | Playwright HIG suite (axe WCAG 2.2 AA, 320/768/1024/1440 px, light and dark, reduced motion) | Zero axe violations | The moved pages are what U3 changes; the matrix is the regression net for the back link and the moved routes |

U3 changes one manual-review-subject file: `site/astro.config.mjs`, which it edits to register the Astro integration.
- It is the first entry of `REVIEW_SUBJECT_SOURCE_FILES` in `site/scripts/profile/accessibility-review-contract.mjs`. The two stylesheets U3 edits, `src/styles/grouped.css` and `src/styles/writing.css`, are not subjects.
- Changing a subject changes the review digest, so U3 invalidates the 16-state manual record, and `npm run test:e2e` fails closed with `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` from the moment U3 merges.
- The team practice is to redo that review once, after the change settles (team.md, Testing Posture; `inception/delivery-planning/bolt-plan.md`).
- **Deadline:** the project has no release approval step — pushing `develop` is the release (team.md, Deployment). So the maintainer re-authors the record **before the nightly deploy that ships U3's moved pages**, the same deploy the pinned restart is tied to.

### Unobserved invariants

| Invariant | How it is closed | How it is proved | Why it is not a metric |
|---|---|---|---|
| A new rule never goes live before the page it names | The deploy places the table in a second copy, after the tree (`infrastructure-specification.md` > "The two-copy deploy"); rsync renames the table into place, so the server reads the old table or the new one, never a partial one | `just deploy` and the Jenkins Deploy stage carry the same three lines; a local run against a scratch web root shows the tree updated while the old table is still in place, then the table replaced | No runner samples the copy window per deploy; the order is a property of the deploy script, not something to measure |
| A table never names a page missing from its build | The writer checks every target page in the build output and fails the build with `REDIRECT_TARGET_MISSING` | Vitest over the writer against an isolated build with one tag page removed (`nfr-design/security-design.md` §8) | A failed build is already the nightly-outcome metric |

## Alerts

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| Jenkins nightly failure | Job result FAILURE (including a Build Site failure from the redirect writer) | P2 | The maintainer, through the local Jenkins job console at 127.0.0.1:8081 |
| Post-deploy reachability failure | `/` or a post answers non-200 after Deploy | P1 | The maintainer, who reverts on `develop` and rebuilds (rollback in `cicd-pipeline.md`) |
| Legacy-address redirect mismatch (manual) | the sampled old address answers anything other than 301, or the target it names answers non-200 | P2 | The maintainer, who reverts on `develop` and rebuilds; the rollback includes the server restart when the revert touches the server script |
| Redirect table rejected (manual, by log) | the server's log carries the "redirect table" error line after a deploy | P2 | The maintainer; the site keeps serving files normally, but the old addresses do not redirect until the table is rebuilt |
| Profile suite closed by a stale accessibility record (manual) | `npm run test:e2e` reports `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` after U3 merges | P2 | The maintainer, who redoes the manual 16-state review once, after the change settles, before the nightly deploy that ships U3's moved pages |

No automated alert is added by U3: this project has no alerting service, and every alert above is the maintainer reading a result they already read.

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| Publish success rate | 100 % of publishing runs (those with `RUN_DEPLOY` checked) complete Verify, Build Site and Deploy; validation-only runs are excluded from the denominator | Per night |
| Post-deploy reachability of `/` and one post | 100 % of checked deploys answered HTTP 200 on both | Per deploy the maintainer checks (manual practice) |
| Legacy-address redirect correctness | 100 % of checked deploys answered 301 for `/tags` and 200 for its target | **Per deploy the maintainer checks, from the first nightly deploy that ships U3's moved pages onward** — the same cadence as the reachability check, which it extends by one request (`cicd-pipeline.md` > "Manual release check") |
| Redirect table validity | 0 rejected-table error lines after a deploy | Per deploy the maintainer checks, read from the server log |

The denominator of the two manual SLIs is the deploys the maintainer checks, not every nightly run. No runner exists to make it every run: the automated post-deploy runner is open follow-up F1 (`inception/practices-discovery/evidence.md:75`). The publish-window ordering is an invariant of the deploy script, not an SLI (see "Unobserved invariants").

Uptime and latency SLIs for the tunnel and the origin belong to the Operation phase (Observability Setup); this stage does not invent a target the maintainer has not set.

## Logs & Tracing

No log aggregation, no tracing and no dashboard change: the static server and the tunnel write to the launchd standard output and error, and the preprocessor and the site build log to the Jenkins console. U3 adds two lines to that set:
- the single error line the server writes when the table is missing, unreadable or malformed;
- the coded build error the writer raises when a target page is missing or a rule breaks the grammar.

A successful redirect logs nothing, so the request path adds no log line.

The post-deploy observations in this document are **manual**. The team's post-deploy check — an HTTP 200 on `/` and on one post — is a maintainer practice (team.md, Deployment) with no automated runner today (follow-up F1). The legacy-address request is added to that same manual check. Code generation must not assume a pipeline step that requests an old address.
