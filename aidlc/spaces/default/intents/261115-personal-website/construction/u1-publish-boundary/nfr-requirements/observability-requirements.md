# Observability Requirements — U1 `u1-publish-boundary`

Upstream: `inception/requirements-analysis/requirements.md` (NFR4, NFR5; FR1.5, FR1.6); `inception/contract-design/contract-summary.md` (C1 notice text); `construction/u1-publish-boundary/functional-design/rules.md` (BR1.3, BR2.4, BR2.6, BR2.7); answers in `nfr-requirements-questions.md` (Q3).

## Context

The only operator is the owner, and the only telemetry surface is the publishing step's stdout and stderr, read in the Jenkins console (`obsidian-blog-develop`) or a terminal. There are no metrics backend, traces or alerting system, and U1 adds none. A failed nightly job is the alert: Jenkins marks the build red.

## Signals

| ID | Signal | Stream | Exact form | When | Source |
|---|---|---|---|---|---|
| NFR4.4 | Run summary | stdout | `published <N> posts, <M> site pages, <K> assets` | last line of every successful run (exit 0) | Q3 |
| NFR5.15 | Pages-folder notice | stderr | `notice: site pages folder <path> not found; publishing no site pages` (missing); `notice: no site pages folder given; publishing no site pages` (omitted); `notice: site pages folder <path> is empty; publishing no site pages` (empty) | at most once per run, before the scan | FR1.5, C1, BR1.3 |
| NFR5.16 | Coded diagnostics | stderr | `CODE path: detail`, one per line, sorted by (path, code, other path); PUB008 names both files; PUB009 names the embedding note and the target | before exit 1 | FR1.6, BR2.4, BR2.6, BR2.7 |
| NFR5.17 | Usage errors | stderr | `error: ...` naming the offending path(s) | before exit 2 | BR1.2, BR1.3 |
| NFR5.18 | Warnings (unchanged) | stderr | existing `warning:` lines (missing attachment, post/post slug collision, bad YAML, invalid heading) | as today | BR1.6, BR2.4 |

## Requirements

- **NFR4.4** The summary counts come from the written output: posts = `posts/*.md`, site pages = `pages/*.md`, assets = files copied to `assets/`. The line is identical across runs on identical input.
- **NFR5.15** Notices go to stderr and never change the exit code. Their text is fixed so tests can assert it.
- **NFR5.16** The same diagnostic format serves the existing codes and the new PUB008 and PUB009, so a reader of the Jenkins log needs no new knowledge.
- **NFR5.17** Exit codes are part of the contract: 0 success, 1 coded or I/O failure, 2 usage error. The Jenkins stage fails on any non-zero exit.

## SLI / SLO

| SLI | SLO | Window | Alert |
|---|---|---|---|
| Nightly job success (Verify + Preprocess + Build + Deploy green) | ≥ 95 % of nightly runs, excluding runs failed by an owner-caused content error (a PUB code) | rolling 30 days | Jenkins red build; the owner checks the console |
| Unexpected site-page count (summary `<M>` differs from the number of `.md` files the owner put in `Areas/Pages`) | 0 occurrences | per run | manual reading of the summary line; no automated alert this release |

Dashboards, tracing and metric exporters are not applicable at this scale.
