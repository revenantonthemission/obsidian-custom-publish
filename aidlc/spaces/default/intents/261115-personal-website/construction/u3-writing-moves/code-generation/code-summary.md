# Code Summary — U3 `u3-writing-moves`

## What shipped

The tag index, the tag pages and the graph now live at `/writing/tags`, `/writing/tags/<key>` and
`/writing/graph`. Each keeps its content and gains one "‹ Writing" back link above the Large Title. Every
tag and graph address is written by one module, `site/src/lib/tag-urls.mjs`. The build writes
`_redirects.json` from the tag pages it produced, after checking it with the server's own grammar and
checking every target page. The static server answers the old addresses with 301 (`Cache-Control: no-cache`),
refuses an encoded control byte in the query with 400, and serves a directory path by its `index.html`. One
script, `site/scripts/publish-dist.sh`, places the pages first and the table second, and both deploy
definitions call it.

Branch: `feature/u3-writing-moves`, from `feature/u4-navigation` at `1b9add2` (the plan's approved deviation;
it merges into `develop` after U1, U2 and U4). Nothing was merged or pushed.

## Commits

| Commit | Message | Plan step |
|---|---|---|
| `38c536f` | `feat: 태그 주소를 한곳에서 만드는 모듈을 더합니다` | 2–3 |
| `476b93a` | `feat: 리다이렉트 표를 검증하고 찾는 모듈을 더합니다` | 4–5 |
| `cc5e110` | `feat: 빌드 결과에서 리다이렉트 표를 쓰는 통합을 더합니다` | 6–7 |
| `b147d7b` | `feat: 정적 서버가 옛 주소를 301로 답하고 폴더 색인을 내보냅니다` | 8–9 |
| `b749c50` | `ci: 배포가 리다이렉트 표를 페이지 다음에 놓도록 바꿉니다` | 10–11 |
| `21761d9` | `feat: 태그와 그래프를 Writing 아래로 옮기고 뒤로 링크를 더합니다` | 13 |
| `722d572` | `test: 옮긴 주소의 브라우저 기대값과 리다이렉트 확인을 더합니다` | 12–13 |
| `de49692` | `docs: 리다이렉트 표와 두 단계 배포를 CLAUDE.md 에 기록합니다` | 15 |

## Files

| Path | Change |
|---|---|
| `site/src/lib/tag-urls.mjs`, `.d.mts` | **New.** `sanitizeTag`, `encodePath`, `tagPath`, `tagHref`, `legacyTagPath`, `tagIndexPath`, `graphPath`, `legacyTagIndexPath`, `legacyGraphPath`; an empty or dot-segment key throws `TAG001` |
| `site/src/lib/data.ts` | `sanitizeTag` is re-exported from the address module (one owner of the rule) |
| `site/scripts/redirect-table.mjs`, `.d.mts` | **New.** `checkRedirectPath` (G1–G8), `validateRedirectTable`, `parseRedirectTable`, `loadRedirectTable(tablePath, { readFile, stat, onRead })`, `matchRedirect`, `redirectLocation`, `isHostileQuery` (`/%(?:[01][0-9a-f]|7f)/i`), `isHeaderValueSafe`; frozen data, coded errors (`REDIRECT_TABLE_JSON`, `_VERSION`, `_SHAPE`, `_UNREADABLE`, `REDIRECT_PATH_INVALID`) |
| `site/scripts/build/legacy-redirects-integration.mjs`, `.d.mts` | **New.** `writeRedirectTable(outDir)` and the Astro integration whose `astro:build:done` hook calls it with `dir`; fails with the validator's code, `REDIRECT_TABLE_DUPLICATE`, `REDIRECT_TABLE_LOOP` or `REDIRECT_TARGET_MISSING`, and writes no table on failure |
| `site/scripts/local-server.mjs` | Raw query split on the first `?`; redirect lookup before the file lookup; 400 for a hostile query, otherwise a guarded 301 with `Location` and `Cache-Control: no-cache`; directory-index branch (BR3.6); the file lookup is wrapped so the handler never throws; the start-up line ends `(redirects: none | <n> rules | table rejected)`; one log line per table read; `listen` stays at module scope |
| `site/scripts/publish-dist.sh` | **New.** `set -eu`; usage check; `mkdir -p`; `rsync -a --delete --exclude=/_redirects.json --exclude=/.redirects.json.tmp`; then `cp` to `.redirects.json.tmp` + `mv -f`, or `rm -f` |
| `Justfile`, `Jenkinsfile` | The deploy lines call `publish-dist.sh` |
| `site/src/pages/tags/` → `site/src/pages/writing/tags/` | **Moved** (`git mv`); imports fixed; `BackLink`; chips from `tagHref` |
| `site/src/pages/graph.astro` → `site/src/pages/writing/graph.astro` | **Moved** (`git mv`); imports fixed; `BackLink` above the header row |
| `site/src/components/writing/BackLink.astro` | **New.** The markup, class and test id `/writing/all` used |
| `site/src/pages/writing/all.astro` | Uses `BackLink` (U3's declared cross-unit edit) |
| `site/src/pages/writing/index.astro` | Capsules from `tagIndexPath()` and `graphPath()` |
| `site/src/layouts/PostLayout.astro`, `HubLayout.astro` | Tag chips from `tagHref` |
| `site/src/styles/grouped.css`, `writing.css` | `.back-link` and `.back-link-chevron` moved from `writing.css` into `grouped.css` (U3's other declared cross-unit edit) |
| `site/astro.config.mjs` | Registers `legacyRedirectsIntegration()` after the profile integration (a manual-review subject) |
| `site/tests/unit/tag-urls.test.ts` | **New**, 8 tests |
| `site/tests/unit/redirect-table.test.ts` | **New**, 16 tests |
| `site/tests/unit/legacy-redirects.test.ts` | **New**, 8 tests |
| `site/tests/unit/local-server.test.ts` | **New**, 10 tests (real server as a child process, free port from a port-0 listener) |
| `site/tests/unit/publish-dist.test.ts` | **New**, 6 tests |
| `site/tests/unit/legacy-redirects-build.test.ts` | **New**, 4 tests over one isolated build |
| `site/tests/e2e/support/hig.ts` | `HIG_ROUTES` and the graph's list open state moved to `/writing/...` |
| `site/tests/e2e/hig-pages.spec.ts` | Old addresses updated; new: back link (target, position, focus ring, click), Writing marker `true`, the logical request set, the HTTP-level redirects |
| `site/tests/e2e/hig-writing.spec.ts`, `hig-performance.spec.ts`, `hig-search.spec.ts`, `hig-profile.spec.ts` | Old addresses updated, none deleted |
| `site/tests/e2e/crossunit.spec.ts` | Three no-JS cases for the moved routes (× 2 viewports) |
| `CLAUDE.md` | The U3 section, plus four facts the move made false (deploy wording, `sanitizeTag` owner, the prettier-ignore example path, the `/writing/graph` open state) and the refreshed counts |

## Red evidence (each recorded before the code it tests existed)

| Step | Command | Failing output |
|---|---|---|
| 2 | `npx vitest run … tests/unit/tag-urls.test.ts` | `Error: Cannot find module '../../src/lib/tag-urls.mjs'` — 1 failed suite, no tests |
| 4 | `… tests/unit/redirect-table.test.ts` | `Error: Cannot find module '../../scripts/redirect-table.mjs'` |
| 6 | `… tests/unit/legacy-redirects.test.ts` | `Error: Cannot find module '../../scripts/build/legacy-redirects-integration.mjs'` |
| 8 | `… tests/unit/local-server.test.ts` | 8 failed, 2 passed: start-up line `… at http://127.0.0.1:56886` lacks `redirects: none`; `/tags: expected 404 to be 301`; the 2 passing tests pin unchanged behaviour (`/graph.json` a file, unknown tag 404) |
| 10 | `… tests/unit/publish-dist.test.ts` | 6 failed: `bash: …/scripts/publish-dist.sh: No such file or directory` (exit 127) |
| 12 | `… tests/unit/legacy-redirects-build.test.ts` | 3 failed, 1 passed: `ENOENT … /_redirects.json`; `writing/tags: expected false to be true`; the `_astro/` selector search already held |
| 12 | `npx playwright test --config playwright.hig.config.ts hig-pages … hig-performance` | 93 failed, 322 passed, 32 skipped: e.g. `/tags: Expected: 301 Received: 200`; `/writing/tags … Expected: 200 Received: 404` |

## Verification (Step 14)

| Suite | Command | Result |
|---|---|---|
| Rust | `cargo test --release --manifest-path preprocessor/Cargo.toml` (and `cargo fmt --check`) | 22 suites, 178 tests pass, 0 fail; formatting clean |
| Vitest unit | `cd site && npm run test:unit` | 46 files, 542 tests pass (baseline 40 files, 490) |
| fast-check | `npm run test:pbt` | 6 files, 36 properties pass |
| Prettier | `npm run format:check` | clean |
| Type check | `npx astro check` | 0 errors, 0 warnings, 7 hints (all in files U3 did not touch) |
| HIG browser | `npx playwright test --config playwright.hig.config.ts` | 1,260 tests: 1,179 pass, 77 skip, **4 fail** in both full runs — all WebKit `page.goto` timeouts in "chrome targets at 320 px" (`/writing/graph` or `/writing/tags/test`, `/writing/all`, `/resume`, `/portfolio`). See below |
| HIG, U3's specs | `… hig-pages hig-writing hig-search hig-profile hig-performance` | 415 pass, 32 skip, 0 fail |
| No-JS and link sweep | `just crossunit` | 816 internal references across 40 pages resolve apart from the fixture's one declared broken image; 16 no-JS tests pass |
| Coverage | `npm run test:coverage` | reported, not enforced: all files 53.75 % lines; `tag-urls.mjs` 100 %, `redirect-table.mjs` 95.2 %, `legacy-redirects-integration.mjs` 83.8 %; `local-server.mjs` 0 % (see below) |

**The four WebKit timeouts.** The traces show WebKit never issued the navigation's request, so the server
never saw it. The same 16-test block passes alone (16/16, 5.0 s), `hig-chrome.spec.ts` passes alone in WebKit
(210 pass), and the whole HIG suite in WebKit alone passes (382 pass, 38 skip, 0 fail). Two of the four routes
(`/resume`, `/portfolio`) are not touched by U3. `CLAUDE.md` has recorded the same pattern since U4 ("four
WebKit page-load timeouts pass when rerun alone"). No setting, worker count or timeout was changed. The
three-engine run is therefore not clean on this machine; Build and Test should grade it.

**`local-server.mjs` at 0 %.** The server is only ever started as a child process (it listens at module
scope, exactly as launchd runs it), and v8 coverage does not follow child processes. Its redirect branch, the
400s and the directory-index branch are executed over HTTP by `local-server.test.ts` (10 tests) and by the HIG
suite's HTTP checks against the same script on 127.0.0.1:4329. Its coverage figure is therefore unverified by
the coverage tool, not measured low.

`npm run test:e2e` was not run as a gate: `site/astro.config.mjs` is a manual-review subject, so it fails
closed with `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` until the maintainer redoes the 16-state review
before the deploy that ships U3.

## Measurements

| Metric | Before (pre-move build) | After | Budget | Verdict |
|---|---|---|---|---|
| grouped.css inline block on the tag index | 3,632 B | 3,910 B | < 4,096 B | met, 186 B headroom |
| `/writing/all` combined inline block | 6,302 B | 6,302 B | — | unchanged (the rule moved between two blocks inlined together) |
| `_astro/` files | 176 | 176, identical names and hashes | no hashed file added, renamed or changed | met |
| Requests per moved route (Chromium, logical) | `/tags` 16, `/tags/test` 20, `/graph` 25 | `/writing/tags` 16, `/writing/tags/test` 20, `/writing/graph` 25 | the same set and count | met (HIG collector) |
| `_redirects.json` on the fixture build | — | 12 rules (10 tag pages + 2) | one per built tag page + 2 | met |

## Deviations from the plan

1. **The address module also refuses `.` and `..` keys** with `TAG001`, beside the empty key the plan names:
   a dot-segment key would collide with the tag index directory or walk out of it (G5).
2. **`encodePath` is exported and carries the "space as `%20`" case.** `sanitizeTag` turns every whitespace
   run into `-`, so `tagHref` can never emit a space; the test checks the encoder `tagHref` uses, and that one
   decode of `tagHref` gives `tagPath` back.
3. **`redirect-table.mjs` keeps its own once-per-segment encoder** (the same rule as `encodePath`) instead of
   importing from `src/`, so the launchd server depends only on the two files the restart precondition names.
4. **The loader's change signature is presence, mtime, size and inode**, a superset of "presence or mtime":
   still one `stat` per request, and an equal-mtime replacement can never leave stale rules.
5. **The writer also refuses a duplicate `from` and a loop** (`REDIRECT_TABLE_DUPLICATE`,
   `REDIRECT_TABLE_LOOP`), the writer-side guarantees of security-design §5.2; the server's acceptance set is
   unchanged (C4 shape plus G1–G8), and for a hand-written duplicate it takes the first rule.
6. **The start-up line keeps its prefix** and appends ` (redirects: …)`, so anything waiting for
   `serving … at http://host:port` still matches; one rule reads `1 rule`.
7. **`publish-dist.sh` also refuses a missing build directory** and, with no table, removes a stale
   `.redirects.json.tmp`.
8. **`publish-dist.test.ts`, first test:** the seeded old page's mtime is set into the past, as a previous
   deploy's would be. Without it rsync's quick check skipped a same-size page written in the same second; this
   corrects the test's setup, not an assertion.
9. **`local-server.test.ts` holds 10 tests for the plan's 11 bullets:** `/tags` and `/tags/` share one test.
   The temporary root has no root `index.html`, so `//evil.example` answers 404; `//evil.example/tags`
   answers the table's own `/writing/tags`.
10. **The HIG request collector runs in Chromium only**, because which font subsets an engine fetches follows
    its `unicode-range` handling. Its fixed expectations were measured on the pre-move routes from a scratch
    build under the ignored `site/.artifacts/`, since removed.
11. **`CLAUDE.md` changed beyond the one section:** four facts the move made false, and the test counts.
12. **`just crossunit` needed a second run.** Astro 7's `astro preview` detached itself into the background,
    so Playwright reported "Process from config.webServer exited early"; the rerun reused that server
    (`reuseExistingServer: true`) and passed. The background preview server was stopped afterwards
    (`npx astro preview stop`).
13. **One command output went to a file.** The first HIG Red run's output was written to a scratch log under
    the ignored `site/.artifacts/`, read once and deleted; every later output was read from the tool result.

## Loop-back 1 repair (2026-11-20)

Build and Test graded U3-NFR5.25 and U3-NFR5.22 Not Met from review findings R-01 and R-02 (test gaps, not
product defects). Steps 1–15 were confirmed present on `feature/u3-writing-moves` and not redone. No
application source changed: both guards were already correct, so each Green step was "none needed", and each
new test was shown able to fail by a temporary mutation that was then reverted.

### Commits

| Commit | Message | Plan step |
|---|---|---|
| `d0ccdfd` | `test: 배포가 페이지를 먼저 놓고 리다이렉트 표를 나중에 놓음을 확인합니다` | 16 |
| `b9915d8` | `test: 리다이렉트 응답이 잘못된 표에서도 400 으로 답하고 서버가 살아 있음을 확인합니다` | 17 |

### Step 16 — deploy ordering (NFR5.25; R-01)

`site/tests/unit/publish-dist.test.ts` gains one case (now 7 tests). The child process gets a `PATH` whose
first entry is a shim directory inside the test's own `mkdtemp` directory, holding an executable (`0o755`)
`cp` that exits 1; teardown removes it with the rest of the scratch tree. The dist table and the web-root table
differ in bytes and size, and dist also carries a `.redirects.json.tmp`. The case asserts a non-zero exit, the
old `_redirects.json` byte-identical, the new pages present and the old `tags/` page gone, and no
`.redirects.json.tmp` in the web root.

| Run | Result |
|---|---|
| Against today's script | 7 passed |
| Mutation: `--exclude="/$TABLE"` removed from `publish-dist.sh:38` | 1 failed, 6 passed: `AssertionError: expected '{"version":1,"rules":["new table, dif…' to be '{"version":1,"rules":[{"from":"/tags"…'` at the byte-identical assertion |
| After revert | 7 passed; `git diff -- site/scripts/publish-dist.sh` empty |

### Step 17 — the last-resort 400 (NFR5.22; R-02)

`isHeaderValueSafe` is already exported from `site/scripts/redirect-table.mjs` (and declared in its `.d.mts`),
so no export was added. `site/tests/unit/redirect-table.test.ts` gains three cases (now 19 tests):
`isHeaderValueSafe` accepts an ordinary encoded `Location` with a query, a tab, a space and 0x80/0xff; it
refuses CR, LF, NUL and DEL; and a lone-surrogate `to` (`/writing/tags/\ud800`) passes `validateRedirectTable`
while `redirectLocation` throws `URIError`. `site/tests/unit/local-server.test.ts` gains one case (now 11
tests) with the file's free-port, temporary-root and teardown pattern: a table whose `/tags/broken` rule
targets the lone surrogate loads (`redirects: 2 rules`), `/tags/broken` answers 400 with no `Location`, then
`/tags` answers 301 and `/writing/tags/test` answers 200.

| Run | Result |
|---|---|
| Against today's code | 2 files, 30 passed |
| Mutation: the `try`/`catch` in `answerRedirect` (`local-server.mjs:149-160`) removed | 1 failed, 10 passed: `Error: socket hang up` (the handler threw and took the server down) |
| After revert | passed; `git diff -- site/scripts/` empty |

### Verification

The full recorded command, run once after both commits:
`(cd preprocessor && cargo fmt --check && cargo test --release) && just preprocess && (cd site && npm run test:unit && npm run test:pbt && npm run format:check && npx astro check && npx playwright test --config playwright.hig.config.ts) && just crossunit` — **exit 0**.

| Suite | Result |
|---|---|
| `cargo fmt --check`, `cargo test --release` | clean; 179 tests pass, 0 fail |
| `npm run test:unit` | 48 files, 567 tests pass |
| `npm run test:pbt` | 6 files, 36 properties pass |
| `npm run format:check` | clean |
| `npx astro check` | 219 files, 0 errors, 0 warnings, 7 hints |
| HIG Playwright (three engines) | 1,232 passed, 79 skipped, 0 failed (the four WebKit timeouts recorded above did not recur) |
| `just crossunit` | link sweep: 816 references across 40 pages resolve apart from the 1 declared broken image; 16 no-JS tests pass |

### Records

- `traceability.json`: NFR5.25 → `site/tests/unit/publish-dist.test.ts`; NFR5.22 →
  `site/tests/unit/local-server.test.ts` (the redirect-table unit cases back it).
- `source-manifest.json`: every entry kept; `site/playwright.crossunit.config.ts` added, because commit
  `40fa3e7` (the crossunit preview-server fix) changed it and it was missing.

## Loop-back 3 repair (2026-11-20)

Build and Test run 3 graded U1-NFR6.6 Not Met: `npm run test:unit` took 19.25 s against 13.39 s pre-U1 the
same day (1.44 × against the 1.2 × limit), because five test files each ran a full `astro build` one after
another through the lock in `site/tests/unit/support/astro-build.ts`, and four of them built the same default
fixture site. Steps 1–18 were confirmed present on `feature/u3-writing-moves` (the plan's boxes were ticked;
nothing was redone). Only test code and the Vitest configuration changed; no application source, no
`site/package.json`, and no manual-review subject (`Header.astro`, `BaseLayout.astro`, `global.css`,
`MobileNav.tsx`, `navigation.ts`, `site/src/styles/profile/`) was touched.

### Commit

| Commit | Message | Plan step |
|---|---|---|
| `0b01712` | `test: 단위 시험의 기본 사이트 빌드를 한 번만 하여 공유합니다` | 19 |

### Step 19 — one shared default build per run (U1-NFR6.6)

**Design.**
- `site/tests/unit/support/astro-build.ts` gains `sharedDefaultBuild()`. Under the existing lock directory it
  checks for a `complete` marker in `<OS temp>/astro-shared-build-<checkout hash>-<run token>/`. If the marker
  is there it returns that folder's `dist/`. If not, it builds into `dist/` and writes the marker only after a
  successful build. A failed build throws, leaves no marker, and the next caller builds again. Because the
  lock and the marker are both on disk, callers in any worker of the same run share the build.
- The run token comes from `ASTRO_SHARED_BUILD_RUN`. A new `globalSetup`,
  `site/tests/unit/support/shared-build-setup.ts`, registered in `site/vitest.config.ts`, sets a fresh token
  (`<pid>-<uuid>`) before the workers start and removes that run's folder in its teardown. It builds
  nothing. Without a token the helper refuses with `ASTRO_SHARED_BUILD_NO_RUN` rather than guess. A killed
  run's folder is never read by the next run, because each run has a new token. A later run's setup deletes
  it once it is over 6 hours old.
- `buildSiteInto(outDir, timeoutMs, env, builder)` keeps its behaviour. Its new optional fourth argument
  (default: the real `astro build` spawn) lets the helper's own test count builds without running Astro.
- `hig-built-assets`, `hig-built-html`, `profile-presentation` and `legacy-redirects-build` now read
  `sharedDefaultBuild()`. Each was checked to only read its output: none writes, renames or deletes anything in
  it, apart from its old `afterAll` removal of its own temporary folder, which is removed because the shared
  folder belongs to the run. `writing-empty-build` keeps `buildSiteInto` with its own `CONTENT_DIR_OVERRIDE`
  tree. No assertion, `test`, `describe` or timeout changed; the diff of the four files touches only imports,
  the `beforeAll` build call and the `afterAll` removal.

**Red** (`npx vitest run --config vitest.config.ts tests/unit/astro-build-shared.test.ts`, before the
helper existed): 1 file failed, 7 of 7 tests failed. Each failed with `TypeError: sharedDefaultBuild is not a
function`, and the `afterEach` with `TypeError: removeSharedBuild is not a function`. The 7 cases:
- two default calls return the same folder and build once;
- three racing calls build once;
- a new run token never reuses an earlier run's folder;
- a failed build throws, is not kept, and the next call builds again;
- a call with an `env` gets its own isolated build into its own folder, and the shared one is untouched;
- a call without a token refuses with the coded error;
- removing a run's build deletes its folder.

**Green:** the same command passes, 7 of 7. A focused run of `legacy-redirects-build.test.ts` alone passes 4 of
4 in 3.6 s. `npm run test:unit` passes 50 files and 583 tests (576 + 7). `npm run test:coverage` (same
configuration) passes 583 tests and writes its report. `npm run test:pbt` passes 36. After every run no
`astro-shared-build-*` folder is left in the OS temp folder.

**Timing method.** `npm run test:unit` was timed from `site/`, wall clock, output discarded. The pre-U1 commit
`db7ecae` (the merge base Build and Test run 3 used) was checked out in a detached worktree at
`.claude/worktrees/pre-u1-db7ecae`, which git ignores. It got an APFS clone of `site/node_modules` (the
`package.json` and lockfile are identical between the two commits), the ignored `.puppeteer-config.json`, and
its own `just preprocess` against the fixture vault, with its own Cargo `target/`. Each measurement was one
warm-up per tree, then 3 rounds alternating this head and pre-U1. The worktree was removed afterwards with
`git worktree remove`. The main tree was never stashed, reset or checked out.

| Measurement (2026-11-20) | This head | pre-U1 `db7ecae` | Ratio | Limit |
|---|---|---|---|---|
| Before (head `bd3b57b`), median of 3 | **18.38 s** (18.38, 18.27, 18.48; warm-up 19.39) | **12.71 s** (12.75, 12.69, 12.71; warm-up 15.40) | **1.446 ×** | ≤ 1.2 × |
| After (`0b01712`), median of 3 | **9.07 s** (9.07, 9.53, 9.02; warm-up 9.61) | **12.43 s** (12.43, 12.39, 12.48; warm-up 13.52) | **0.730 ×** | ≤ 1.2 × |

The before figures reproduce Build and Test's 1.44 ×. The suite now runs two Astro builds (the shared default
build and `writing-empty-build`'s own build), where pre-U1 ran three, so it is faster than pre-U1. U1-NFR6.6's
ratio is met, with no limit or timeout changed.

### Verification

The full recorded command, run once after the commit:
`(cd preprocessor && cargo fmt --check && cargo test --release) && just preprocess && (cd site && npm run test:unit && npm run test:pbt && npm run format:check && npx astro check && npx playwright test --config playwright.hig.config.ts) && just crossunit` — **exit 0**.
`npx astro preview status` reported no server before and after `just crossunit`.

| Suite | Result |
|---|---|
| `cargo fmt --check`, `cargo test --release` | clean; 179 tests pass, 0 fail |
| `npm run test:unit` | 50 files, 583 tests pass |
| `npm run test:pbt` | 6 files, 36 properties pass |
| `npm run format:check` | clean |
| `npx astro check` | 222 files, 0 errors, 0 warnings, 7 hints |
| HIG Playwright (three engines) | 1,233 passed, 81 skipped, 0 failed |
| `just crossunit` | link sweep: 816 references across 40 pages resolve apart from the 1 declared broken image; 16 no-JS tests pass |

### Records

- `unit-test-instructions.md` now covers:
  - the `globalSetup` entry;
  - the new test file in U3's Vitest command and the volume table;
  - the shared build in the built-output and clean-up guidance.
- `source-manifest.json`: every entry kept. Added `site/vitest.config.ts`,
  `site/tests/unit/support/astro-build.ts`, `site/tests/unit/support/shared-build-setup.ts`,
  `site/tests/unit/astro-build-shared.test.ts`, `site/tests/unit/hig-built-assets.test.ts`,
  `site/tests/unit/hig-built-html.test.ts` and `site/tests/unit/profile-presentation.test.ts`.
  `legacy-redirects-build.test.ts` was already listed.
- `traceability.json`: U1-NFR6.6 is U1's requirement, not one of U3's upstream IDs, so it is recorded under
  `reverse` with the target `site/tests/unit/support/astro-build.ts`.

## Not done here (the maintainer's, after the merge)

1. Merge U1, U2, U4 and then U3 into `develop`, in that order.
2. Restart `dev.rvnnt.blog` from a working copy at the merge commit and check that the start-up line says
   `(redirects: none)`.
3. Redo the 16-state accessibility review before the first nightly deploy that ships the moved pages.
4. After that deploy, request `/tags` and its target.

No `just deploy` was run, the web root was not touched, no launchd service was restarted, and the
preprocessor ran only against the fixture vault.
