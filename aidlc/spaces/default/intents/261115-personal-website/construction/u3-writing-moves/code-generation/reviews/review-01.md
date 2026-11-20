## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-20T01:58:46Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | site/tests/unit/publish-dist.test.ts > the whole `publish-dist.sh` describe block | No test fails if the two `--exclude` options are removed from `site/scripts/publish-dist.sh:38`, so nothing guards the property the script exists for: the old table must stay in place, neither replaced nor deleted, while rsync mirrors the pages, and the new table must land only afterwards. Every test checks only the end state. "replaces the table with a fresh mtime" seeds two tables with equal size and equal mtime, so rsync's quick check would skip the file even without the exclude. "a build with no table removes the web root table" reaches the same end state through `rm -f`. The tmp-file test reaches its end state through `cp`/`mv`/`rm`. Without the exclude, rsync would copy `_redirects.json` before `writing/` (`_` sorts before `w`), which reopens the publish window NFR5.25 closes. The behaviour is correct today: `/usr/bin/rsync` on this machine is openrsync (protocol 29, "rsync version 2.6.9 compatible"), and I ran the script's exact rsync line on a scratch tree. It kept the root `_redirects.json` and deleted a nested `sub/_redirects.json`, so the anchored exclude holds under `--delete`. | Add a test that stops the script after the mirror and before the table is placed. One way is a `PATH` shim for `cp` that exits non-zero. Seed the dist table with different bytes from the web-root table. Then assert that the web root still holds the old table byte for byte, that the new pages are present and the old pages are gone, that no `.redirects.json.tmp` arrived from dist, and that the script exited non-zero. | New |
| R-02 | Minor | site/scripts/local-server.mjs > `answerRedirect` (post-assembly `isHeaderValueSafe` check and the `catch` → 400); site/tests/unit/redirect-table.test.ts | The two fallbacks that security-design.md §4 keeps "because the checks above can be wrong" have no test at any level. `rg -c isHeaderValueSafe site/tests` finds no match, and no HTTP test reaches the `catch`. Valid input can reach the guarded write: I ran `validateRedirectTable({version:1,rules:[{from:'/a',to:'/bud800'}]})`, which returns `ok: true`, and `redirectLocation('/bud800', null)`, which throws `URIError`. A table that holds a lone surrogate in a `to` (legal JSON) therefore loads. Only the `catch` stops that throw from escaping the handler and taking the blog down until launchd restarts it. The guard is in place and correct, but a refactor that drops it would leave every test green. | Add unit cases for `isHeaderValueSafe`: CR, LF, NUL and DEL are refused, and tab, space and 0x80–0xff are accepted. Add a `local-server.test.ts` case that serves a table with the `to` `"/writing/tags/ud800"` and asserts that a matched request answers 400 and that the next request is still answered. If the maintainer would rather reject such a table whole at load (for example with `String.prototype.isWellFormed` in `checkRedirectPath`), first record that as an amendment to §5.1, because §5.1 states that G1–G8 are the whole test. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Unit-scoped Vitest (`npx vitest run --config vitest.config.ts` over tag-urls, redirect-table, legacy-redirects, local-server, publish-dist and legacy-redirects-build) | PASS: 6 files, 52 tests, 4.30 s | Covers the grammar (one rejection case per G1–G8 for both `from` and `to`), the loader's re-read seam, the lookup and the `Location` assembly. Also covers the real server as a child process on a port-0 free port (the 301 with `Cache-Control: no-cache`, the Korean target encoded once, the kept query, the 400 followed by recovery, `//evil.example` never reaching a header, the dotted key served through BR3.6, a table that arrives late), the writer's `REDIRECT_TARGET_MISSING`, G8 and determinism cases, and an isolated build with 12 rules and the grouped.css inline guard |
| Stage-declared validation tools | none declared in `code-generation.md` | Not applicable |
| `rsync --version`, then the script's exact rsync line on a scratch tree under `site/.artifacts/` (since deleted) | openrsync 29; root `_redirects.json` kept, nested `sub/_redirects.json` deleted | The anchored exclude works under `--delete` on the rsync both deploy definitions call. This confirms the script, not the tests (finding 1) |
| `node -e` probe of `validateRedirectTable` and `redirectLocation` | lone-surrogate `to` accepted; `redirectLocation` throws `URIError` | The guarded write in `answerRedirect` can be reached (finding 2) |
| `rg` for literal `/tags` and `/graph` addresses in `site/src`, `site/scripts`, `preprocessor/src` | only the address module and one Rust test string | BR2.1 and BR2.4 hold in source: every call site goes through `tag-urls.mjs` |

### Summary

What I checked and found correct:

- **Request path.** The order matches security-design.md §2: decode, one-slash strip, exact lookup, then the raw-query check (400) on a match, then 301. The query is split from `req.url`, not from the parsed URL.
- **`Location` value.** It is built only from the rule's `to`, encoded once per segment. G1, G2 and G6 make a foreign origin impossible. Header-char validation and the guarded write sit around `writeHead`.
- **Grammar.** `checkRedirectPath` matches G1–G8 one for one, including `/` refused under G7.
- **Writer.** It reuses that validator, then checks for duplicates and loops and checks every target's `index.html`, and writes sorted, byte-stable JSON.
- **Deploy.** `publish-dist.sh` is correct under `set -eu`, and both the Justfile and Jenkins call it.

Neither finding is a defect in the product. Both are regression gaps around guarantees the code already keeps. One covers the deploy-ordering exclude, the other the never-throw fallbacks. That leaves zero Critical and zero Major findings.
