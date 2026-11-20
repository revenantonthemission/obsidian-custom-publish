# Monitoring Design — U1 `u1-publish-boundary`

Upstream: `nfr-design/observability-design.md`, `reliability-design.md`; `nfr-requirements/observability-requirements.md`; answers in `infrastructure-design-questions.md` (Q1).

The platform is the Jenkins job page and its console log. There is no metrics backend, log aggregator or tracer, and U1 adds none. The owner is the only operator and reads every check below.

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|---|---|---|---|
| Posts published (`<N>`) | Preprocess console, summary line | First U1 run: equals the pre-merge count P, adjusted by the posts the owner added or removed that day. P is the number of `content/posts/*.md` files in the Jenkins workspace after the last pre-U1 green run, recorded by the owner before merging. Later runs: equals the previous run's `<N>`, adjusted the same way. | a drop means mis-wiring or a scan bug |
| Site pages published (`<M>`) | summary line | 0 while `Areas/Pages` is missing or empty; afterwards it equals the number of `.md` files in `Areas/Pages`, excluding `Drafts/`, dot entries and links | proves the pages boundary works |
| Assets copied (`<K>`) | summary line | informational, no threshold; missing images show as `warning: attachment not found` lines | context for image warnings |
| Pages-folder notice | Preprocess console (stderr) | exactly "not found" before the folder exists; exactly "is empty" while it holds no notes; none afterwards | Q1 rollout check |
| Skipped-link warnings | Preprocess console | 0 lines | a link in the vault is never published |
| Preprocess duration | Jenkins stage timing | ≤ 1.5 × the stamping baseline recorded in Build and Test | NFR6.4 |

## Alerts

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| Nightly build failed | any stage exits non-zero: usage error 2; coded, I/O, write or diagram error 1; or a suite failure | high: the site is not updated that night | Jenkins build status, seen by the owner |
| Post count off | `<N>` outside its threshold above | medium | owner reading the Preprocess log (manual; no automated alert this release) |
| Unexpected warnings | any skipped-link warning, or an unexpected pages notice | low | owner reading the Preprocess log |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| Nightly job success, excluding owner-caused PUB failures | ≥ 95 % | rolling 30 days. The owner reviews the Jenkins build history on the first day of each month. |
| Preprocess duration vs baseline | ≤ 1.5 × (stamping) | per run; graded at Build and Test, then spot-checked on the first two post-merge runs |

## Logs, tracing and dashboards

- **Logs.** Jenkins keeps each build's console output. U1 lines are fixed-format: the summary on stdout; notices, warnings, coded diagnostics and usage errors on stderr, in the order given in `observability-design.md` §2. No aggregation.
- **Tracing.** Not applicable: one process per run.
- **Dashboard.** The Jenkins job page (build history, stage view).

## Rollout checks (Q1)

| Night | Expected Preprocess log | Also | Action |
|---|---|---|---|
| Before the merge | — | owner records P | — |
| First run after the U1 merge | `notice: site pages folder <…/Areas/Pages> not found; publishing no site pages`, then `published <N> posts, 0 site pages, <K> assets` with N matching P; build green | `/` and one post answer HTTP 200 | owner creates an empty `Areas/Pages` |
| Next run | `notice: site pages folder <…/Areas/Pages> is empty; publishing no site pages`; build green | the same HTTP 200 checks | U1 rollout complete |
| Any run failing a check | inspect the coded line or the counts | — | revert the U1 merge on `develop` if the change itself is the cause (team Deployment) |
