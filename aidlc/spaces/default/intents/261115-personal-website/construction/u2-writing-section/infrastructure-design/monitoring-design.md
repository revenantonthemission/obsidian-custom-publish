# Monitoring Design — U2 `u2-writing-section`

Upstream: `nfr-design/performance-design.md`, `security-design.md`.

There is no runtime component, so monitoring is the Jenkins build plus the owner's post-deploy check.

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|---|---|---|---|
| Build Site stage result | Jenkins | green | `WR001` or a page error stops the deploy |
| `/writing/all` HTML size | measured in Build and Test (performance-design §3) | ≤ 2,048 B per post, ≤ 350 KB | page weight as posts grow |
| Post count on `/writing/all` ("글 N개") | the page itself | equals the summary line's `<N>` posts minus hubs | NFR8 reach |

## Alerts

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| Build failed | Build Site exits non-zero (including `WR001`) | high | Jenkins build status, read by the owner |
| Count mismatch | "글 N개" on `/writing/all` differs from the published ordinary-post count | medium | the owner's post-deploy check |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| Nightly job success (excluding owner-caused PUB failures) | ≥ 95 % | rolling 30 days, reviewed by the owner on the 1st of each month (shared with U1) |

## Logs, tracing and dashboards

Astro's build output in the Jenkins console is the only log. There is no tracing, and the Jenkins job page serves as the dashboard.

After the first deploy that contains U2, the owner checks by hand that `/writing` and `/writing/all` answer HTTP 200 and that "이번 주 글" shows this week's posts.
