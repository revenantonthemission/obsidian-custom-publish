## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-20T05:48:35Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | site/tests/unit/publish-dist.test.ts > the whole `publish-dist.sh` describe block | No test fails if the two `--exclude` options are removed from `site/scripts/publish-dist.sh:38`, so nothing guards the property the script exists for: the old table must stay in place, neither replaced nor deleted, while rsync mirrors the pages, and the new table must land only afterwards. Every test checks only the end state. "replaces the table with a fresh mtime" seeds two tables with equal size and equal mtime, so rsync's quick check would skip the file even without the exclude. "a build with no table removes the web root table" reaches the same end state through `rm -f`. The tmp-file test reaches its end state through `cp`/`mv`/`rm`. Without the exclude, rsync would copy `_redirects.json` before `writing/` (`_` sorts before `w`), which reopens the publish window NFR5.25 closes. The behaviour is correct today: `/usr/bin/rsync` on this machine is openrsync (protocol 29, "rsync version 2.6.9 compatible"), and I ran the script's exact rsync line on a scratch tree. It kept the root `_redirects.json` and deleted a nested `sub/_redirects.json`, so the anchored exclude holds under `--delete`. | Add a test that stops the script after the mirror and before the table is placed. One way is a `PATH` shim for `cp` that exits non-zero. Seed the dist table with different bytes from the web-root table. Then assert that the web root still holds the old table byte for byte, that the new pages are present and the old pages are gone, that no `.redirects.json.tmp` arrived from dist, and that the script exited non-zero. | Resolved (reviewer) |
| R-02 | Minor | site/scripts/local-server.mjs > `answerRedirect` (post-assembly `isHeaderValueSafe` check and the `catch` → 400); site/tests/unit/redirect-table.test.ts | The two fallbacks that security-design.md §4 keeps "because the checks above can be wrong" have no test at any level. `rg -c isHeaderValueSafe site/tests` finds no match, and no HTTP test reaches the `catch`. Valid input can reach the guarded write: I ran `validateRedirectTable({version:1,rules:[{from:'/a',to:'/bud800'}]})`, which returns `ok: true`, and `redirectLocation('/bud800', null)`, which throws `URIError`. A table that holds a lone surrogate in a `to` (legal JSON) therefore loads. Only the `catch` stops that throw from escaping the handler and taking the blog down until launchd restarts it. The guard is in place and correct, but a refactor that drops it would leave every test green. | Add unit cases for `isHeaderValueSafe`: CR, LF, NUL and DEL are refused, and tab, space and 0x80–0xff are accepted. Add a `local-server.test.ts` case that serves a table with the `to` `"/writing/tags/ud800"` and asserts that a matched request answers 400 and that the next request is still answered. If the maintainer would rather reject such a table whole at load (for example with `String.prototype.isWellFormed` in `checkRedirectPath`), first record that as an amendment to §5.1, because §5.1 states that G1–G8 are the whole test. | Resolved (reviewer) |

> R-01 Reviewer note: `d0ccdfd` adds a test to `site/tests/unit/publish-dist.test.ts` that puts a `cp` exiting 1 first on the child's PATH only. `publish-dist.sh` runs `rsync` first and then `cp` (lines `rsync -a --delete --exclude="/$TABLE" --exclude="/$TMP"` and then `cp "$DIST/$TABLE" "$WEB_ROOT/$TMP"`), so the script stops right after the mirror. The two tables have different bytes and sizes. The test checks a non-zero exit, that the old table is byte-identical, that the new pages are present, that the old `tags/` directory is gone, and that there is no `.redirects.json.tmp`. A `.redirects.json.tmp` is placed in dist, so removing either `--exclude` now fails a test. `rsync` does not call `cp`, so the shim stops only the intended step.

> R-02 Reviewer note: `b9915d8` adds `isHeaderValueSafe` cases to `site/tests/unit/redirect-table.test.ts`: it refuses CR, LF, NUL and DEL and accepts encoded text, a space, a tab and 0x80–0xff. A further case shows that a lone-surrogate `to` passes `validateRedirectTable` and makes `redirectLocation` throw `URIError`. A server case in `site/tests/unit/local-server.test.ts` loads a two-rule table with `"/writing/tags/ud800"` and expects 400 with no `Location` header, then a 301 for `/tags` and a 200 for a page, so the server keeps answering.

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npx vitest run --config vitest.config.ts tests/unit/publish-dist.test.ts tests/unit/redirect-table.test.ts tests/unit/local-server.test.ts` (in `site/`) | PASS: 3 files, 37 tests passed | The new repair tests pass against the unchanged source. The developer's mutation runs (removing the exclude, removing the catch) were not repeated here, to keep the working tree untouched. Reading the script and the test assertions agrees with the reported failures. |
| `git show d0ccdfd` / `git show b9915d8` | Each commit changes test files only | Matches the claim that no source file changed in this repair. |
| Sensors: required-sections, traceability | PASS (as reported in the brief) | No contradicting evidence found. |

### Summary

Both open findings are fixed. The deploy-ordering test now fails if either `--exclude` is removed, and the header-value guard and the redirect `catch` that returns 400 both have direct tests, including a test that the server still answers afterwards. No new architectural concerns were found in the repair.
