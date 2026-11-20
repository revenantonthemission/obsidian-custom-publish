# Observability Design — U1 `u1-publish-boundary`

Upstream: `nfr-requirements/observability-requirements.md` (NFR4.4, NFR5.15–NFR5.18); `inception/contract-design/contract-summary.md` (C1); answers in `nfr-design-questions.md` (Q2, Q4).

## 1. Architecture

The publishing step's stdout and stderr are the only telemetry. They are read in the Jenkins console and the terminal. There is no metrics store, tracing or correlation ID: one process, one run, one log. The alert is Jenkins' red build.

## 2. Streams and order

| Order | Stream | Line(s) | Source |
|---|---|---|---|
| 1 | stderr | usage error (then exit 2) | BoundaryGuard |
| 2 | stderr | at most one pages notice (omitted / not found) | RunCoordinator, before the scan |
| 3 | stderr | `warning: skipped symbolic link <path>`, one per link, in walk order (sorted by path) | BoundaryWalker (Q4) |
| 4 | stderr | existing warnings (bad YAML, post/post slug collision) | Scanner |
| 5 | stderr | "is empty" notice (after the PAGES walk) | RunCoordinator (Q2) |
| 6 | stderr | coded diagnostics `CODE path: detail`, sorted by (path, code, otherPath) (then exit 1) | PublicationCatalog |
| 7 | stderr | `warning: attachment not found` and other existing write-time warnings | Writer |
| 8 | stdout | `published <N> posts, <M> site pages, <K> assets` (last line, exit 0 only) | Writer |

Every line is deterministic for identical input. Tests assert the exact text of new lines.

## 3. Summary counts (NFR4.4)

- N = post Markdown files written (`posts/*.md`).
- M = site-page Markdown files written (`pages/*.md`).
- K = image files copied (`assets/*` plus `assets/pages/*`, excluding the JSON indexes).

The counts are taken from the writer's own record of what it wrote, so they match the manifest.

## 4. Contract alignment (C1)

C1 currently lists one notice text and exits 0/1. U1 updates C1 in the same merge (contract ownership rule). The update adds:

- the two extra notice texts;
- exit 2 with the three usage messages;
- PUB008's extended cases, PUB009 and the summary line;
- the skipped-link warning.

The original "not found" text is kept verbatim.

## 5. SLI / SLO

| SLI | SLO | Window | How it is read |
|---|---|---|---|
| Nightly job green | ≥ 95 % of runs, excluding owner-caused PUB failures | rolling 30 days | Jenkins build history |
| Site-page count matches the owner's intent | 0 surprises | per run | summary line `<M> site pages` read after adding a page |

No dashboard; the Jenkins job page is the dashboard.
