# Reliability Design — U1 `u1-publish-boundary`

Upstream: `nfr-requirements/reliability-requirements.md` (NFR5.10–NFR5.14, NFR6.1, NFR6.2, NFR7.1, NFR7.2); `functional-design/functional-spec.md` (run lifecycle); team Deployment practices; answers in `nfr-design-questions.md` (Q2, Q5).

## 1. Failure classes

| Class | Examples | Exit | Vault | `content/` | Nightly effect |
|---|---|---|---|---|---|
| Usage | overlap of NOTES/PAGES/OUTPUT, `--pages` not a folder, unresolvable `..` | 2 | untouched | untouched | Preprocess red; live site keeps the previous build |
| Coded catalog | PUB001, PUB003–PUB006, PUB008, PUB009 | 1 | untouched (first pass) | untouched | same |
| Plain I/O read | missing NOTES, non-UTF-8 note, unreadable folder | 1 (uncoded, path named; Q5) | untouched | untouched | same |
| Write | PUB007 | 1 | stamped dates only | partial | Build never runs; live site unchanged |
| Diagram | render failure in a post or page | 1 | stamped dates only | complete | same |
| Degraded but OK | pages folder missing, omitted or empty; skipped links; missing images | 0 | as normal | complete | green; notice or warnings in the log |

Because Deploy runs only after Preprocess and Build succeed, no failure class can publish a partial site. The previous build stays live (graceful degradation by stage ordering, unchanged).

NFR5.12 scope (Q5): "coded" covers PUB codes, usage errors (exit 2 with fixed text) and PUB007. Plain read errors keep today's uncoded message and fail closed.

## 2. Pages folder states (NFR5.10, Q2)

| State | Rule | Output |
|---|---|---|
| `--pages` omitted | — | `notice: no site pages folder given; publishing no site pages` |
| path missing | — | `notice: site pages folder <path> not found; publishing no site pages` |
| exists, no publishable note | no `.md` left after skip rules (dot entries, `Drafts`, links) | `notice: site pages folder <path> is empty; publishing no site pages` |
| exists with notes | — | no notice |

The "is empty" decision is made after the PAGES walk, so it uses exactly the walker's skip rules.

## 3. Homepage optional and legacy cleanup

- No retired note → success (NFR5.11). More than one → PUB003, as today.
- The clean step removes `homepage/` along with the other managed namespaces, so stale trees converge (NFR5.14).

## 4. Pipeline (NFR6.1, NFR6.2)

- Jenkins Verify runs `obsidian-press fixtures/vault/Notes ./content --pages fixtures/vault/Pages`, then the site suites. The fixture materialiser no longer writes `content/homepage/`, so a leftover dependency on the homepage artifact fails Verify instead of hiding.
- Jenkins Preprocess passes `--pages "$PAGES_PATH"`. Until the owner creates `Areas/Pages`, the run prints the "not found" notice and succeeds.
- The recorded verification command is the merge gate for U1 (NFR6.2).
- The site keeps the interim "오늘 발행된 글" list until U2 (NFR7.2). The Résumé and Portfolio capsules give one-click reach (NFR7.1).

## 5. Tests that guard reliability (written first)

| Test | Asserts |
|---|---|
| CLI: pages omitted / missing / empty (`.DS_Store` + `Drafts/` only) / present | exit 0, exact notice or none, page count |
| CLI: each usage error | exit 2, exact message, vault and OUTPUT hashes unchanged |
| Catalog: PUB008 page/post, page/page, page/retired; PUB009 whole/heading/block | exit 1, sorted diagnostics, nothing written |
| Stamping + PUB008 | vault byte-identical |
| Clean removes seeded `homepage/` | absent after run |
| Existing PUB007 test | unchanged behaviour |
| Playwright `/` | one h1, name + intro, no headline, capsules → `/resume` and `/portfolio`, 44 × 44 px, JS off, axe at 4 widths × 2 themes, reduced motion, same-origin requests, interim list present |

## 6. Recovery

Rollback is a revert of the U1 merge on `develop` plus a rebuild. The vault needs no recovery: U1 writes to the vault only by stamping posts, as before. Release precondition: the owner rewords the `Areas/Notes` project rule before merge (F4).
