## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 1
**Verdict Dictated:** no

### Prior findings

| ID | Now | Severity | Note |
|---|---|---|---|

### New findings

| Severity | Location | Finding | Required action |
|---|---|---|---|
| Minor | site/tests/unit/support/shared-build-setup.ts > `setup()` (run token passed through `process.env`) | The run token reaches the test workers only because Vitest happens to start its workers after `globalSetup` has run and they copy the parent's environment. This works on Vitest 4.1.10: I ran the six build-related files together and they passed 42/42, and `npm run test:unit` passed 583/583. Vitest's documented way to pass a value from `globalSetup` to tests is `project.provide` / `inject`, though. If a Vitest upgrade changes when workers start, every built-output file would fail with `ASTRO_SHARED_BUILD_NO_RUN`. That error is clear, so the risk is low. | When this file is next touched, pass the token with `project.provide('astroSharedBuildRun', token)` and read it with `inject(...)` in `sharedDefaultBuild`, keeping the environment variable only as a fallback. Or add a comment noting that the code relies on workers inheriting the environment. |
| Minor | site/tests/unit/support/shared-build-setup.ts > teardown / token lifetime | The token lives for the whole Vitest process, and the build is reused while the `complete` marker exists. In watch mode (`npx vitest` with this config, which watches by default in a terminal), each rerun after a source edit would therefore read the first, stale build. The repository's scripts use `vitest run`, so CI and the recorded commands are not affected. | Give each rerun a fresh token (for example through the `project.onTestsRerun` callback that `globalSetup` receives), or say in `unit-test-instructions.md` that the built-output tests need `vitest run`. |
| Minor | site/tests/unit/support/astro-build.ts > `sharedDefaultBuild` failure path | When the real default build fails, each of the four reader files retries a full build in turn under the lock. A file still waiting can hit its 75 s `beforeAll` timeout and report a timeout instead of the build error. Nothing is cached wrongly, but the cause of the failure is harder to see. | Optionally record a `failed` marker with the build output in the run folder, so later callers in the same run re-throw that output at once instead of rebuilding. |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npx vitest run --config vitest.config.ts` on astro-build-shared, hig-built-html, hig-built-assets, profile-presentation, legacy-redirects-build and writing-empty-build | PASS: 6 files, 42 tests, 6.71 s | The run token reaches the parallel workers, and a focused run through this config works because its `globalSetup` runs. |
| `npm run test:unit` | PASS: 50 files, 583 tests, 9.33 s | Matches the developer's 583 and is consistent with the recorded 9.07 s median. No `astro-shared-build-*` folder was left in the temp folder afterwards, so teardown works. |
| `git diff --name-only 0b01712~1 HEAD` | 8 files, all under `site/tests/unit/` plus `site/vitest.config.ts` | No review-subject file changed (`package.json`, `Header.astro`, `BaseLayout.astro`, `global.css`, `MobileNav.tsx`, `navigation.ts`, `styles/profile/*`). |
| Sensors (required-sections, traceability), as reported in the brief | PASS | Accepted as reported. |

**Checks performed**

- **Lock and race safety.** The marker is checked and written inside the existing `mkdir` lock, and the marker is written only after the build exits with status 0. A failed or killed build leaves a `dist/` without a marker, and the next caller deletes it and builds again. The 180 s stale-lock window is larger than the 60 s build timeout. The race test (three concurrent calls, one build) and the failure test (no caching) exercise exactly these paths.
- **Same build environment.** Before this change, none of the four moved files passed an `env` to `buildSiteInto`, and none of them sets `PROFILE_VERIFICATION_BUILD` or `HOMEPAGE_TODAY_OVERRIDE`. Neither variable is set anywhere in the unit tests; only `writing-empty-build` uses `CONTENT_DIR_OVERRIDE`, and it keeps its own build. Sharing the build therefore does not change what any file tests.
- **Read-only use.** None of the four files writes into the build output, renames anything in it or deletes it. Their only deletions were the removed `afterAll` blocks that cleaned up their own temporary folders.
- **Nothing weakened.** The `beforeAll` timeouts stay at 75 s, and no assertion, `test` or `describe` changed.
- **Other configurations.** `vitest.pbt.config.ts` includes only `tests/pbt/u1` and `tests/pbt/u2`, so no shared-build reader runs without the `globalSetup`. Run any other way, a reader would refuse with the coded `ASTRO_SHARED_BUILD_NO_RUN` error.
- **Records.** The timing method (median of 3, alternating rounds, warm-ups, pre-U1 measured in a temporary worktree that was then removed) is recorded in full, and the "before" figures reproduce the 1.44 × that Build and Test measured. The source manifest adds the changed test and config files that the plan required, and all of them exist. The new traceability target, `site/tests/unit/support/astro-build.ts`, is a plain file that exists.

### Summary

The shared default build is correct and race-free under the existing lock and the completion marker. A failed build is never cached. The run token reaches the workers (verified by running the files), and the four moved files only read the build and used no build-time environment of their own, so sharing changes nothing they test. I measured `npm run test:unit` at 9.33 s, consistent with the recorded 0.730 ×, which is well inside the 1.2 × limit. The three remaining points are Minor robustness issues: the token is passed through the environment rather than `provide`/`inject`, watch mode would reuse a stale build, and a failed build is retried and can surface as a timeout.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | site/tests/unit/publish-dist.test.ts > the whole `publish-dist.sh` describe block | No test fails if the two `--exclude` options are removed from `site/scripts/publish-dist.sh:38`, so nothing guards the property the script exists for: the old table must stay in place, neither replaced nor deleted, while rsync mirrors the pages, and the new table must land only afterwards. Every test checks only the end state. "replaces the table with a fresh mtime" seeds two tables with equal size and equal mtime, so rsync's quick check would skip the file even without the exclude. "a build with no table removes the web root table" reaches the same end state through `rm -f`. The tmp-file test reaches its end state through `cp`/`mv`/`rm`. Without the exclude, rsync would copy `_redirects.json` before `writing/` (`_` sorts before `w`), which reopens the publish window NFR5.25 closes. The behaviour is correct today: `/usr/bin/rsync` on this machine is openrsync (protocol 29, "rsync version 2.6.9 compatible"), and I ran the script's exact rsync line on a scratch tree. It kept the root `_redirects.json` and deleted a nested `sub/_redirects.json`, so the anchored exclude holds under `--delete`. | Add a test that stops the script after the mirror and before the table is placed. One way is a `PATH` shim for `cp` that exits non-zero. Seed the dist table with different bytes from the web-root table. Then assert that the web root still holds the old table byte for byte, that the new pages are present and the old pages are gone, that no `.redirects.json.tmp` arrived from dist, and that the script exited non-zero. | Resolved (reviewer) |
| R-02 | Minor | site/scripts/local-server.mjs > `answerRedirect` (post-assembly `isHeaderValueSafe` check and the `catch` → 400); site/tests/unit/redirect-table.test.ts | The two fallbacks that security-design.md §4 keeps "because the checks above can be wrong" have no test at any level. `rg -c isHeaderValueSafe site/tests` finds no match, and no HTTP test reaches the `catch`. Valid input can reach the guarded write: I ran `validateRedirectTable({version:1,rules:[{from:'/a',to:'/bud800'}]})`, which returns `ok: true`, and `redirectLocation('/bud800', null)`, which throws `URIError`. A table that holds a lone surrogate in a `to` (legal JSON) therefore loads. Only the `catch` stops that throw from escaping the handler and taking the blog down until launchd restarts it. The guard is in place and correct, but a refactor that drops it would leave every test green. | Add unit cases for `isHeaderValueSafe`: CR, LF, NUL and DEL are refused, and tab, space and 0x80–0xff are accepted. Add a `local-server.test.ts` case that serves a table with the `to` `"/writing/tags/ud800"` and asserts that a matched request answers 400 and that the next request is still answered. If the maintainer would rather reject such a table whole at load (for example with `String.prototype.isWellFormed` in `checkRedirectPath`), first record that as an amendment to §5.1, because §5.1 states that G1–G8 are the whole test. | Resolved (reviewer) |
