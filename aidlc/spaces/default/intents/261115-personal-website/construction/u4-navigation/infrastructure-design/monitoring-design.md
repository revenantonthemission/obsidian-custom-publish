# Monitoring Design — U4 `u4-navigation`

Upstream: `nfr-design/performance-design.md`, `nfr-design/security-design.md`, `nfr-design/logical-components.md`; `infrastructure-design/infrastructure-specification.md`.

U4 adds no runtime, so it adds no metric collection, no log pipeline and no trace span. The monitoring below is the project's existing set, with the rows U4's acceptance depends on marked.

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|---|---|---|---|
| Nightly publish outcome | Jenkins job `obsidian-blog-develop` result | Every publishing run (`RUN_DEPLOY` checked) reaches Deploy | The publish is the release; a failed Verify stops the run before anything is deployed |
| Verify suite result | Jenkins Verify stage (`cargo test --release`, `npm run test:unit`, `npm run test:pbt`) | Zero failures | The production gate; a regression stops the run |
| Post-deploy reachability | HTTP status of `/` and of one post, checked by the maintainer after a deploy | HTTP 200 on both | Shows that the served tree answers at all; it says nothing about the chrome inside it |
| Deployed chrome | The deployed tree at https://rvnnt.dev, checked after a deploy | The bar carries exactly one link to `/writing`; `/writing` marks it `aria-current="page"`, `/writing/all` marks it `aria-current="true"`, and `/` marks none | This is the only observation that covers what U4 actually changed in the running site |
| Built-site weight | The HIG fixture build request log for `/` | At or below the recorded baseline (255,351 B transferred) | U4 shrinks the nav block; growth means an unexpected asset, font or script appeared |
| Chrome stylesheet size | `wc -c site/src/styles/chrome.css` | ≤ 10,000 B (recorded 9,561 B) | U4 adds two attribute selectors to this file; the budget is the one U4 itself moves |
| Accessibility matrix outcome | Playwright HIG suite (axe WCAG 2.2 AA, 320/768/1024/1440 px, light and dark, reduced motion) | Zero axe violations | The chrome is what U4 changes; the matrix is the regression net for the marker and the sheet |

## Alerts

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| Jenkins nightly failure | Job result FAILURE | P2 | The maintainer, through the local Jenkins job console at 127.0.0.1:8081 |
| Post-deploy reachability failure | `/` or a post answers non-200 after Deploy | P1 | The maintainer, who reverts on `develop` and rebuilds (rollback in `cicd-pipeline.md`) |
| Deployed chrome mismatch | The deployed bar does not match the marker contract (missing Writing link, wrong marker value) | P2 | The maintainer, who reverts on `develop` or redoes the release-end manual accessibility review |

No new alert is added by U4: it introduces no new failure mode that the existing job result, reachability check and release-end manual review do not already surface.

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| Publish success rate | 100 % of publishing runs (those with `RUN_DEPLOY` checked) complete Verify and Deploy; validation-only runs are excluded from the denominator | Per night |
| Post-deploy reachability of `/` and one post | 100 % of deploys answered HTTP 200 on both | Per deploy |
| Accessibility regression | 0 axe violations across the HIG matrix | Per change |

Uptime and latency SLIs for the tunnel and the origin belong to the Operation phase (Observability Setup); this project runs one origin on one machine with no staging, and this stage does not invent a target the maintainer has not set.

## Logs & Tracing

No log aggregation, no tracing and no dashboard change: the static server and the tunnel write to the launchd standard output and error (system log), and the preprocessor and the site build log to the Jenkins console. U4 adds no runtime call, so it adds no log line and no span. A broken chrome is not visible in those logs — it is visible in the deployed-chrome check above and in the release-end manual accessibility review.
