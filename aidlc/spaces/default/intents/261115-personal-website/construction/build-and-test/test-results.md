# Test Results — `261115-personal-website` (assembled project)

- **Branch:** `fix/close-open-build-and-test-targets`, off `develop` = `5cecf58` (the four units merged into `develop`; this branch carries the run-5 closure work).
- **Run history:**
  - **Run 1** (2026-11-20T02:23Z – 02:52Z, head `de49692`, then `40fa3e7` after this stage's crossunit fix): FAILED. 2 commands failed, 11 targets Not Met and 6 Unverified. That run led to loop-back 1 (see `## Loop-Back Log`).
  - **Run 2** (2026-11-20T05:58Z – 06:54Z, head `b9915d8`, after the loop-back 1 repair commits `22e1468`, `0f312eb`, `0ef1e89`, `ae84c34`, `6f7cf1d`, `bea8e2f`, `d0ccdfd`, `b9915d8`): FAILED. 1 command failed, 9 targets Not Met and 6 Unverified. That run led to loop-back 2. Sections 1–8 below keep its record.
  - **Run 3** (2026-11-20T07:54Z – 08:29Z, head `bd3b57b`, after the loop-back 2 repair commits `7b8aab7`, `b7efd85` (U2) and `bd3b57b` (U4)): FAILED. 1 command failed, 7 targets Not Met and 6 Unverified. That run led to loop-back 3. Its record is `## Run 3` below.
  - **Run 4** (2026-11-20T09:37Z – 09:46Z, head `0b01712`, after the loop-back 3 repair commit `0b01712` (U3)): FAILED. 1 command failed, 6 targets Not Met and 6 Unverified. That run led to the maintainer-directed retry; its record is `## Run 4` below.
  - **Run 5, this one** (2026-11-20, 11:00Z – 12:05Z, head `8d19fde`, the retry the maintainer approved at the run 4 gate): see `## Run 5` directly below. 8 of run 4's 12 open targets moved to Met; 4 stay open.
- **Machine:** the maintainer's macOS machine, load average about 2.5–3.2 throughout run 5.
- **Test Strategy:** Standard. **Construction Autonomy Mode:** autonomous.
- **Result (run 5):** **FAILED** under the stage's failure predicate. One command failed: `npm run test:e2e`, refused because the manual accessibility record is stale (digest `3d578e5b…`). 1 target is `Not Met` and 3 are `Unverified`; 8 targets moved from Not Met or Unverified to Met since run 4. The build, the full unit suite and every other suite pass, and no test assertion failed anywhere.
- **Commits by run 5:** `0b3f76d`, `ff080f9`, `37b2a62`, `53a1749`, `2425cc3`, `33bcb44`, `8d19fde` (see R5.1). Run 5 changed two test files and the stage's own artifacts; no product file changed.

## Run 5 (the retry the maintainer approved at the run 4 gate)

### R5.1 What changed since run 4

The four unit branches were merged into `develop` (merge commits `c8a64f1` U1, `2637157` U2, `8982bfe` U4, `5cecf58` U3) and the branches were deleted; `develop` is now at `5cecf58`. The project rule commit `1cf9e63` (the publishing rule now names `Areas/Notes` and `Areas/Pages`) went in with them.

The closure branch `fix/close-open-build-and-test-targets` was created off `develop` and carries seven commits:

| Commit | What it changes |
|---|---|
| `0b3f76d` | new `site/tests/e2e/hig-discovery.spec.ts`: the rendered-site FR2.2 checks (no `/posts/fixture-homepage/` route, no RSS or sitemap entry, no 404 recent-list entry) in Chromium, Firefox and WebKit |
| `ff080f9` | new `site/tests/unit/homepage-empty-week.test.ts`: the AC3.4.1 empty-week homepage, 5 cases over one isolated build |
| `37b2a62` | the Testing Contract's coverage obligation becomes "report the coverage; enforce no minimum" in all four units' `code-generation-plan.md`, with the matching unit summaries, unit test instructions and `integration-test-instructions.md` (the Rust `cargo llvm-cov` command, no threshold) |
| `53a1749` | the `/` budget is reset to the measured 255,387 B in U2's requirements, U4's design and both units' traces and summaries — the maintainer's human-made requirement change |
| `2425cc3` | U4's NFR1.11 now reads "once per surface", and `nfr-design/performance-design.md` §1 says Writing is added while Tags, Graph, Résumé and Portfolio leave |
| `33bcb44` | the two new test files enter U1's and U2's source manifests, traces, unit test instructions and summaries; F4 in the external dependency map is marked resolved |
| `8d19fde` | Prettier for the new unit test file (`npm run format:check` failed on it before) |

`git diff --stat 0b01712 HEAD -- site preprocessor fixtures Justfile Jenkinsfile CLAUDE.md .gitignore` lists only the two new test files (+33, +107). No Rust file, no `site/src`, `site/scripts` or `site/package.json` change, and no manual-review subject. The built site is therefore expected to be identical, and R5.2 and R5.6 confirm it: the same 25,800 B homepage HTML and the same 255,387 B transferred bytes as run 3.

### R5.2 Build

| Command | Exit | Output |
|---|---|---|
| `just preprocess` | 0 | `Found 19 sources (1 site pages)`; only the fixture's two deliberate warnings; `published 17 posts, 1 site pages, 3 assets` |
| `cd site && HOMEPAGE_TODAY_OVERRIDE=2025-08-13 npx astro build` (the HIG fixture build) | 0 | 40 pages; 176 files in `dist/_astro`; `_redirects.json` with 12 rules |
| the same build, four timed runs | 0 | 2.99 / 2.98 / 3.00 / 2.99 s → median **2.99 s** |

**Build: SUCCESS.** The real-content build of run 4 is not re-cited as run 5 evidence: no product file changed (R5.1), so the rendered output is the one run 3 verified.

### R5.3 Unit-scoped commands (Step 9.2)

| Unit | Command | Exit | Result |
|---|---|---|---|
| U1 | `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-pages.spec.ts tests/e2e/hig-discovery.spec.ts` | 0 | a subset of the full HIG run (R5.4): the new spec's 3 cases pass in Chromium, Firefox and WebKit |
| U2 | `npx vitest run --config vitest.config.ts tests/unit/writing-lists.test.ts tests/unit/content-data.test.ts tests/unit/homepage-empty-week.test.ts` | 0 | 3 files, **39 tests**, 4.25 s; the new file adds 5 cases |
| U3, U4 | unchanged since run 4 | 0 | their commands ran inside the full suites below (`npm run test:unit`, `npm run test:pbt`, the HIG suite, `just crossunit`) and all passed |

### R5.4 Full suites and gate commands

| Command | Exit | Result |
|---|---|---|
| `cd preprocessor && cargo fmt --check` | 0 | clean |
| `cd preprocessor && cargo test --release` | 0 | **179 passed** |
| `just preprocess` | 0 | see R5.2 |
| `cd site && npm run test:unit` | 0 | 51 files, **588 tests**, 11.73 s |
| `cd site && npm run test:pbt` | 0 | 6 files, **36 properties**, 6.21 s |
| `cd site && npm run format:check` | 0 | clean (after `8d19fde` formatted the new unit test file) |
| `cd site && npx astro check` | 0 | 224 files; 0 errors, 0 warnings, 7 hints |
| `cd site && npx playwright test --config playwright.hig.config.ts` | 0 | **1,242 passed, 81 skipped, 0 failed** (Chromium, Firefox, WebKit), about 5.9 min |
| `just crossunit` | 0 | 16/16 with JavaScript off in Chromium; link sweep 816 references over 40 pages, the one declared known-broken fixture image only |
| `cd site && npm run test:e2e` | **1** | `{"name":"VerificationProviderError","errorCode":"MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE","stage":"verification.compose","rule":"LC-U1-18/LC-U1-19",…,"details":{"reviewSubjectDigest":"3d578e5b96f849a73c2dfeba708d5582305fffd625b28e8cb1efb4ac5855c0de"}}` then `CLI_COMMAND_FAILED: The routed command exited non-zero.` No spec ran. Recorded as it is; not worked around |

**Recorded Construction Verification Command:** every part passes on head `8d19fde` in this run:

```
(cd preprocessor && cargo fmt --check && cargo test --release) && just preprocess && (cd site && npm run test:unit && npm run test:pbt && npm run format:check && npx astro check && npx playwright test --config playwright.hig.config.ts) && just crossunit
```

The command does not include `npm run test:e2e`: delivery-planning recorded that exclusion because the manual accessibility record is invalid by design until the end-of-release review. The e2e refusal is recorded separately, above.

### R5.5 Coverage report

| Surface | Tool | Result |
|---|---|---|
| Site | `npm run test:coverage` (v8, exit 0, 51 files, 588 tests) | Lines **54.01 %** (5,769/10,681), Statements 53.24 % (6,057/11,376), Branches 51.78 % (4,688/9,052), Functions 58.82 % (1,320/2,244); report at `site/.artifacts/coverage/coverage-summary.json` |
| Rust | `cargo-llvm-cov llvm-cov --release` (cargo-llvm-cov 0.9.1, exit 0) | Lines **87.45 %** (2,417/2,764), Functions 86.26 % (314/364), Regions 83.27 % (2,614/3,139); report at `preprocessor/target/llvm-cov/coverage-summary.json` (gitignored) |

The three site runs of the same day gave 5,766 / 5,769 / 5,771 covered lines on the same 10,681-line source set (53.98 % / 54.01 % / 54.03 %): the figure moves by a few lines between runs, which is scheduling noise. The control run — the same suite with the new test file set aside — gives exactly 5,766, so the new file does not move it.

The Rust measurement builds into its own target directory, so the release binary stays uninstrumented; the instrumented directory was deleted afterwards and the uninstrumented `preprocessor/target/release/obsidian-press` rebuilt before the verification command.

The Testing Contract's coverage obligation (all four units) now reads "report the coverage; enforce no minimum" — the maintainer's decision of 2026-11-20, recorded as a human-made requirement change. No threshold was added, lowered or disabled by this stage.

### R5.6 Measurements

| Measurement | Value | Note |
|---|---|---|
| `/` transferred bytes | **255,387 B**, 18 requests | Chromium + CDP `Network.loadingFinished.encodedDataLength`, cache disabled, 1440×900, three fresh contexts with identical results; the fixture build served by the production server on 127.0.0.1:4401. The same value as runs 2 and 3 |
| `/writing` transferred bytes | 254,249 B, 18 requests | same method |
| `/writing/all` transferred bytes | 229,042 B, 17 requests | same method |
| `/writing/tags` transferred bytes | 202,262 B, 16 requests | same method |
| built HTML | `dist/index.html` 25,800 B; `dist/writing/index.html` 27,709 B; `dist/writing/all/index.html` 33,803 B | the same as run 3 → the build reproduces; `dist/_astro` holds 176 files |
| `/` against the budgets | 255,387 B ≤ 255,387 B (U2-NFR1.8's reset budget) and ≤ 255,387 B (U4-PD-ROOT-BYTES' reset budget), and ≤ 320,156 B (U1-NFR1.4's pre-U1 baseline) | exactly at the two reset budgets |
| fixture build time | median **2.99 s** (2.99 / 2.98 / 3.00 / 2.99) | 0.83 × U1's 3.60 s (U2-NFR6.8, limit 1.10) and 0.83 × U2's 3.61 s (U4-NFR1.14, limit 1.05); ≤ 3.81 s |
| unit suite duration | `npm run test:unit` 11.73 s against the same-day pre-U1 baseline 13.19 s = **0.889 ×** | limit 1.2 × (U1-NFR6.6) |

**Not re-measured in run 5, with the reason:** the real-content `/writing/all` row markup (§6.4: 106,391 B for 137 rows = 777 B/row) and the preprocessor stamping ratios (1.001 × both). No product file and no fixture file changed since run 4 (R5.1), so the row markup and the Rust binary are unchanged; the recorded figures stand.

### R5.7 Target Verification Matrix (finalized, run 5)

The full matrix is in `build-and-test-summary.md` → `## Target Verification Matrix`.

**92 targets: 87 Met, 1 Not Met, 3 Unverified, 1 N/A** (run 4: 79 / 6 / 6 / 1).

The 8 rows that changed:

| Target | Run 4 | Run 5 | Why |
|---|---|---|---|
| TC-SF-COV80 | Not Met | **Met** | the obligation is report-only after the maintainer's decision; the site's 54.01 % and Rust's 87.45 % are reported (R5.5) |
| TEAM-RUST-COV | Unverified | **Met** | measured with cargo-llvm-cov: 87.45 % lines (R5.5) |
| U1-CG-R04 | Unverified | **Met** | the new HIG discovery spec runs the rendered-site FR2.2 checks in 3 engines (R5.3, R5.4) |
| U2-AC3.4.1 | Unverified | **Met** | the new unit test builds an empty week and asserts it: 5 cases pass (R5.3) |
| U2-NFR1.8 | Not Met | **Met** | 255,387 B ≤ the reset 255,387 B (R5.6) |
| U4-PD-ROOT-BYTES | Not Met | **Met** | 255,387 B ≤ the reset 255,387 B (R5.6) |
| U4-NFR1.11 | Not Met | **Met** | the requirement now reads "once per surface"; the bar and the sheet each carry exactly one marked item (R5.4) |
| U4-NFR6.11 | Not Met | **Met** | the design text now agrees with the requirement, and the measured values meet the target (R5.6) |

The 4 rows still open:

| Target | Verdict | Owning stage | What closes it |
|---|---|---|---|
| TEAM-E2E-A11Y | Not Met | the maintainer | the 16-state manual accessibility review, redone once after the change settles (2–4 h), then `npm run test:e2e` passes |
| U1-NFR6.1 | Unverified | ci-pipeline | the Jenkins Verify run over the merge commit on `develop`, after the maintainer's push |
| U1-SLO-NIGHTLY | Unverified | observability-setup | 30 days of nightly production runs |
| U1-SLO-PAGECOUNT | Unverified | observability-setup | 30 days of nightly production runs |

**Cross-unit coverage gate:** `aidlc engine sensor-traceability --stage build-and-test` prints `"pass": false` with 2 uncovered IDs, `NFR1` and `NFR6` (run 4: `FR3.7`, `NFR1`, `NFR6`, `AC3.4.1`). `AC3.4.1` and, through it, `FR3.7` are now built by the new test file. The two that remain are the requirement groups whose Code Generation rows are `Deferred` to this stage's command runs: U2's NFR1.7 (the row-markup measurement) and U1's NFR6.2–NFR6.7 with U2's NFR6.8 and NFR6.9 (the recorded command, the durations and the build time). All of them are graded Met in the matrix except U1-NFR6.1. The full reading is in `cross-unit-traceability.md`.

### R5.8 Failure classification

**Rung 1 — in-stage fix:** none applies to the four open rows. TEAM-E2E-A11Y waits on the maintainer's manual 16-state review, U1-NFR6.1 waits on the Jenkins Verify run over the merge commit, and the two SLO rows wait on 30 nightly production runs. None of them has a code-level root cause this stage can close.

**Rung 2 — diagnosis and options:** recorded above and in `build-and-test-summary.md` → `## Open targets: what closes each`.

**Rung 3 — loop-back:** not started. The bound of 3 loop-backs is exhausted (loop-backs 1–3), and run 5 was the maintainer's directed retry (Loop-Back Log entry 4), so no further autonomous retry is available or permitted.

**Rung 4 — report:** run 5's result is **FAILED** under the failure predicate: one failed command (`npm run test:e2e`, the fail-closed provider) and 4 open targets (1 Not Met, 3 Unverified). No test assertion failed anywhere; every suite that could run, ran and passed. The stage hands the result to the approval gate, where the maintainer decides whether to accept the failure or to run the manual review and the Jenkins job before the deploy.

## Run 4 (re-entry after loop-back 3)

### R4.1 What changed since run 3

`git diff --stat bd3b57b 0b01712 -- site preprocessor` lists 8 files, all Vitest test support or configuration: `site/tests/unit/astro-build-shared.test.ts` (new, +161), `site/tests/unit/hig-built-assets.test.ts`, `hig-built-html.test.ts`, `legacy-redirects-build.test.ts` and `profile-presentation.test.ts` (each drops its own build and `afterAll` removal), `site/tests/unit/support/astro-build.ts` (+147/−110, `sharedDefaultBuild()`), `site/tests/unit/support/shared-build-setup.ts` (new, +23) and `site/vitest.config.ts` (+4, the `globalSetup` entry). No Rust file, no `site/src`, `site/scripts` or `site/package.json` change, and no manual-review subject. The built site is therefore expected to be identical, and R4.2 and R4.6 confirm it.

### R4.2 Build

| Command | Exit | Output |
|---|---|---|
| `just preprocess` | 0 | `Found 19 sources (1 site pages)`; only the fixture's two deliberate warnings; `published 17 posts, 1 site pages, 3 assets` |
| `cd site && npx astro build` | 0 | 39 pages; `verified private profile approval boundary`; `wrote _redirects.json (12 rules)`; `_redirects.json` version 1, 12 rules; build 3.55 s |

**Build: SUCCESS.**

### R4.3 Unit-scoped commands (Step 9.2)

Only U3's `unit-test-instructions.md` changed: its Vitest command now includes `tests/unit/astro-build-shared.test.ts`, and its built-output and clean-up guidance names the shared build. The command that file gives ran:

`cd site && npx vitest run --config vitest.config.ts tests/unit/tag-urls.test.ts tests/unit/redirect-table.test.ts tests/unit/legacy-redirects.test.ts tests/unit/local-server.test.ts tests/unit/publish-dist.test.ts tests/unit/legacy-redirects-build.test.ts tests/unit/astro-build-shared.test.ts` — exit 0, 7 files, **64 tests passed** (8 + 19 + 8 + 11 + 7 + 4 + 7), 4.27 s.

Every other unit-scoped command is a subset of a full run: the Vitest file lists ran inside `npm run test:unit` in R4.4, and the Rust and HIG spec lists ran inside the recorded verification command at the U3 checkpoint on this same head `0b01712` (2026-11-20T09:07:43Z–09:14:17Z). `just preprocess` ran once in R4.2; `just crossunit` and `npm run test:e2e` are recorded in R4.4.

### R4.4 Full suite and gate commands

| Command | Exit | Result |
|---|---|---|
| `cd site && npm run test:unit` | 0 | 50 files, **583 tests passed**; 9.16 s first run (timing in R4.6) |
| `cd site && npm run test:e2e` | 1 | `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`, digest `3d578e5b…`; no spec ran |
| the recorded verification command | 0 at the U3 checkpoint | same head `0b01712`, 09:07:43Z–09:14:17Z: `cargo fmt --check` clean; 179 Rust tests; 583 unit tests; 36 properties; Prettier clean; `astro check` 0 errors; HIG 1,233 passed, 81 skipped, 0 failed in Chromium, Firefox and WebKit; crossunit 16/16 with JavaScript off in Chromium |

The checkpoint ran the full recorded command after loop-back 3 on this exact commit. Run 4 re-ran the only changed input (U3's Vitest command) and the full unit suite; nothing the other suites read changed after the checkpoint. No assertion failed anywhere.

### R4.5 Coverage report

`cd site && npm run test:coverage` — exit 0, 50 files, 583 tests.

| Metric | Run 3 (`bd3b57b`) | Run 4 (`0b01712`) |
|---|---|---|
| Lines | 53.98 % (5,766 / 10,681) | **54.03 % (5,771 / 10,681)** |
| Statements | — | 53.26 % (6,059 / 11,376) |
| Branches | — | 51.82 % (4,691 / 9,052) |
| Functions | — | 58.82 % (1,320 / 2,244) |

The included source set is unchanged (`src/**`, `scripts/**`; tests are excluded) and the line total is the same 10,681, so the +5 covered lines are not new product code. The figure stays far below the contract's 80 % floor (open decision 1). Report at `site/.artifacts/coverage/`.

### R4.6 Measurements

**Suite durations (U1 NFR6.6), same-day round-robin against pre-U1 `db7ecae`.** The baseline was checked out detached at `.claude/worktrees/pre-u1-db7ecae-run4`, with an APFS clone of `site/node_modules` and its own `just preprocess` against the fixture vault. Its first preprocess failed on the Mermaid diagram because the older Justfile does not set `PUPPETEER_EXECUTABLE_PATH`; it was rerun with the variable set and exited 0. One warm-up per tree, then 3 alternating rounds. The worktree was removed with `git worktree remove` afterwards. Head: 583 tests in 50 files; pre-U1: 449 tests in 37 files.

| Suite | pre-U1 `db7ecae` | This head `0b01712` | Ratio | Limit |
|---|---|---|---|---|
| `npm run test:unit`, wall clock (s; 3 rounds) | **13.19** (13.47, 13.19, 12.75; warm-up 15.42) | **10.72** (10.90, 10.72, 10.62; warm-up 10.07) | **0.813 ×** | ≤ 1.2 × |
| `npm run test:unit`, Vitest Duration (s; same rounds) | **12.11** (12.28, 12.11, 11.83) | **9.57** (9.66, 9.57, 9.45) | **0.790 ×** | ≤ 1.2 × |

- **U1-NFR6.6 is Met.** The suite is faster than pre-U1 because one shared default build now serves the four built-output test files, where pre-U1 ran three builds (the shared one plus `writing-empty-build`'s own).
- The loop-back 3 developer measured 9.07 s against 12.43 s = 0.730 × on the same head; this independent same-day run measures 0.790 × by Vitest's duration and 0.813 × by wall clock, both inside the limit.
- No timeout changed, and `site/package.json` is unchanged. The `globalSetup` builds nothing and removes its run's folder at teardown.
- **Clean-up:** no `astro-shared-build-*` folder remains in the OS temp folder after the suite and coverage runs (checked twice), and the scratch worktree is gone.

**Not re-measured, with the reason.** Transferred bytes and built HTML (R3.6: `/` 255,387 B, `/writing` 254,249 B, `/writing/all` 229,042 B, `/writing/tags` 202,262 B; `/` 18,159 B over U2 NFR1.8 and 36 B over U4 PD-ROOT-BYTES; built HTML 25,800 / 27,709 / 33,803 B): no product or build input changed in R4.1, and the HIG build at the U3 checkpoint used the same head. Fixture build time, real-content `/writing/all` and preprocessor timings: unchanged inputs since run 3.

### R4.7 Target Verification Matrix (finalized, run 4)

The full matrix is in `build-and-test-summary.md` → `## Target Verification Matrix`.

| Verdict | Count | Target IDs |
|---|---|---|
| Met | 79 | every row not listed below |
| Not Met | 6 | TC-SF-COV80, TEAM-E2E-A11Y, U2-NFR1.8, U4-PD-ROOT-BYTES, U4-NFR1.11, U4-NFR6.11 |
| Unverified | 6 | TEAM-RUST-COV, U1-NFR6.1, U1-SLO-NIGHTLY, U1-SLO-PAGECOUNT, U1-CG-R04, U2-AC3.4.1 |
| N/A | 1 | TC-SF-CI: CI Pipeline, later in this plan, sets up CI to run these tests before merge |

Total: 92 rows, the same set as run 3. No `Pending` remains.

- **To Met (1):** U1-NFR6.6, at 0.813 × wall clock (0.790 × by Vitest duration) against a same-day pre-U1 baseline (R4.6). The loop-back 3 review-03's three Minor items touch no graded target.
- **Unchanged:** the other 91 rows. The 6 Not Met and 6 Unverified are run 3's set minus U1-NFR6.6.
- **Net change from run 3:** Met +1 (78 → 79), Not Met −1 (7 → 6), Unverified ±0 (6), N/A ±0 (1).

### R4.8 Failure classification and estimated impact (failure-ladder rung 4), run 4

Rung 1 does not apply: no failure lies in test configuration, build scripts or environment set-up within this stage's remit. Rung 2 does not apply either: run 3's only code-level gap, U1-NFR6.6, is Met, and no remaining open target is a test defect this stage could fix. A font subset or a `/` markup trim exists in code, but each waits on the maintainer's page-weight decision first. The loop-back bound is exhausted at 3/3, so this run takes no loop-back and adds no entry. **Run 4:** 12 open targets, 6 Not Met and 6 Unverified, each with its owner and candidate fixes below.

| Target | Verdict | Why it is open | Owner | Candidate fixes (effort, cost, risk) |
|---|---|---|---|---|
| TC-SF-COV80 | Not Met | 54.03 % lines against the contract's 80 % floor. `team.md` says "report coverage, enforce no minimum" | the maintainer (open decision 1) | (a) Decide that team.md's report-only rule governs this scope floor, recorded as a human-made requirement change: about 15 min, no code, no product risk. (b) Write the tests to reach 80 %: about 2,800 more covered lines, mostly in code older than this intent; 3–5 days, low risk, high effort. (c) Accept the gap at the gate. Lowering or removing the floor without that decision is not an option. |
| U2-NFR1.8 | Not Met | `/` is 255,387 B against U2's budget of 237,228 B (+18,159 B). The weekly rows' Korean glyphs pull one more Pretendard subset (≈ 25.7 KB) | the maintainer (open decision 2: page-weight budget) | (a) Raise the budget through U2's NFR Requirements and NFR Design: about 20 min, no code. (b) A custom font subset for the week rows' glyphs: 0.5–1 day, medium risk to the font pipeline and HIG typography; U2 code-generation reopened. (c) Accept the gap at the gate. A ≥ 36 B trim does not reach this figure. |
| U4-PD-ROOT-BYTES | Not Met | `/` is 255,387 B against U4's absolute 255,351 B (+36 B). The record part is corrected (review-03 R-01 Fixed; U4's own delta is −95 B like for like); the overshoot stays | the maintainer (open decision 2) | (a) Raise or reset the budget: about 20 min, no code. (b) Trim ≥ 36 B of `/` markup: about 1 h, low risk, U4 code-generation reopened; it meets U4's figure only, not U2-NFR1.8, and it re-stales the 16-state record if it touches a review-subject file. (c) The font subset of U2-NFR1.8 (b) would meet both: 0.5–1 day, medium risk. |
| U4-NFR1.11 | Not Met | The text says `aria-current` appears "at most once per page"; the code emits one marker per surface (bar and sheet), only one of which renders at a time. The per-surface rule passes in 3 engines (review-03 R-05, Still applies) | the maintainer (open decision 3) | (a) Amend NFR1.11 to "at most once per surface; one surface renders at a given width" through a U4 NFR Requirements reopen (with the matching nfr-design line): 20–30 min, no code. (b) Accept as is; the verdict stays Not Met against the text as written. (c) Change the code to one marker per page, e.g. drop the sheet's marker: 1–2 h, medium risk to AC6.1.x, and it re-stales the 16-state record (`MobileNav.tsx`). Not recommended. |
| U4-NFR6.11 | Not Met | The measured values meet NFR6.11, but `nfr-design/performance-design.md` §1 still says "Writing stays" (review-03 R-06, Still applies) | nfr-design (U4), artifact text; the maintainer's go-ahead | (a) Correct the Page weight row and its trace line in `performance-design.md` §1 (plus `nfr-design/traceability.json`) through a U4 NFR Design reopen: about 20 min, no code, no risk. (b) Accept the wording gap at the gate. |
| TEAM-E2E-A11Y | Not Met | `npm run test:e2e` refuses: `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`, digest `3d578e5b…` | the maintainer (open decision 4: the 16-state manual review) | (a) Redo the 16-state accessibility review once the changes settle and before the deploy that ships the units: 2–4 h of the maintainer's time, no cost; then `npm run test:e2e`, about 2 min. No agent fix exists; working around the provider is not allowed. |
| U2-AC3.4.1 | Unverified | The empty-week homepage test is in `homepage.spec.ts`, which runs only under the refused `npm run test:e2e` | the maintainer (open decision 4), then build-and-test | (a) The same review, then `npm run test:e2e`. (b) Port the empty-week check to the HIG suite, which needs a second fixture build date: 1–2 h, low risk, U2 code-generation reopened; it does not close TEAM-E2E-A11Y. |
| U1-CG-R04 | Unverified | The FR2.2 rendered-site checks are in `homepage.spec.ts` and did not run; an inspection of the built site agrees with FR2.2 | the maintainer (open decision 4), then build-and-test | (a) The same review, then `npm run test:e2e`. (b) Move the FR2.2 built-output checks to a Vitest built-HTML test or the HIG suite: about 1 h, low risk, U1 code-generation reopened. |
| U1-NFR6.1 | Unverified | Jenkins Verify on the U1 merge commit; no merge exists yet | ci-pipeline (next stage), after the maintainer's merges to `develop` | Run `obsidian-blog-develop` after the merges (with `RUN_DEPLOY` unchecked for a validation-only run): about 10 min, no cost. Not doable in this stage. |
| U1-SLO-NIGHTLY | Unverified | 30-day production signal | observability-setup (later in this plan) | Read the Jenkins build history after 30 nightly runs: 30 days elapsed, about 15 min of work, no cost. |
| U1-SLO-PAGECOUNT | Unverified | 0 unexpected site-page counts per run, a production signal | observability-setup (later in this plan) | Check the nightly preprocess summary line per run once production runs exist: about 15 min to set up, no cost. |
| TEAM-RUST-COV | Unverified | No Rust coverage tool installed (`no such command` for both) | the maintainer's go-ahead; then build-and-test (tooling) | `cargo install cargo-llvm-cov` (about 10 min, a global developer tool, no project dependency, low risk), then `cd preprocessor && cargo llvm-cov --release` (about 5 min). That turns the row into a measured figure; whether Rust then counts toward TC-SF-COV80 is part of open decision 1. |

Eight of the twelve are the maintainer's decisions, artifact-text corrections or the manual review; three belong to later stages; one is a tool install that needs the maintainer's go-ahead. The cheapest no-code path to close the most rows is the five maintainer decisions (coverage floor, `/` budget, NFR1.11 wording, 16-state review, U4 design-text correction), about 1 h of reopened-stage work in total. **Run 4 result: FAILED** under the failure predicate — one failed command and 12 open targets; no test assertion failed.

## Run 3 (re-entry after loop-back 2)

### R3.1 What changed since run 2

`git diff --stat b9915d8 bd3b57b -- site preprocessor` lists 4 files: `site/src/lib/data.ts` (+26/−4, `resolveContentDir(env)` and `WR002`), `site/tests/unit/content-data.test.ts` (+47), `site/tests/e2e/hig-writing.spec.ts` (+29) and the new `site/tests/unit/header-navigation-failure.test.ts` (+61). No Rust file changed. Of the four, only `data.ts` is product code, and it renders nothing: it resolves the content folder once, at module load. R3.6 confirms that the rendered output is unchanged.

### R3.2 Build

| Command | Exit | Duration | Output |
|---|---|---|---|
| `just preprocess` | 0 | 4 s | `Found 19 sources (1 site pages)`; only the fixture's two deliberate warnings; `published 17 posts, 1 site pages, 3 assets` |
| `cd site && npx astro build` | 0 | 5 s | `verified private profile approval boundary`; `wrote _redirects.json (12 rules)`; `_redirects.json` version 1, 12 rules |

**Build: SUCCESS.**

### R3.3 Unit-scoped commands (Step 9.2), deduplicated, each run once

The commands come from the four `code-generation/unit-test-instructions.md` files, which have not changed since run 2. `just preprocess` (all four files) ran once in R3.2; `just crossunit` (U4, U3) and `npm run test:e2e` (U4) ran once in R3.4.

| # | Unit(s) | Command | Exit | Passed / failed / skipped | Duration |
|---|---|---|---|---|---|
| 1 | U1 | `cd preprocessor && cargo test --release --test cli_boundary_test --test walker_test --test stamping_order_test --test publication_catalog --test publication_transform --test publication_output --test scanner_test` | 0 | 79 / 0 / 0 (13 + 7 + 5 + 20 + 13 + 15 + 6) | 2 s |
| 2 | U1 | `cd site && npx vitest run --config vitest.config.ts tests/unit/sync-public-assets.test.ts tests/unit/content-data.test.ts` | 0 | 20 / 0 / 0 in 2 files (run 2: 15; +5 `WR002` cases) | 1 s |
| 3 | U2 | `cd site && npx vitest run --config vitest.config.ts tests/unit/writing-lists.test.ts tests/unit/content-data.test.ts` | 0 | 34 / 0 / 0 (run 2: 29) | 1 s |
| 4 | U2 | `cd site && PBT_RUNS=100 PBT_SEED=42 npx vitest run --config vitest.pbt.config.ts tests/pbt/u2/writing-lists.pbt.test.ts` | 0 | 4 / 0 / 0 | 2 s |
| 5 | U4 | `cd site && npx vitest run --config vitest.config.ts tests/unit/profile-metadata-navigation.test.ts tests/unit/profile-presentation.test.ts` | 0 | 65 / 0 / 0 | 5 s |
| 6 | U4 | `cd site && PBT_RUNS=100 PBT_SEED=42 npx vitest run --config vitest.pbt.config.ts tests/pbt/u1/profile-metadata-navigation.pbt.test.ts` | 0 | 5 / 0 / 0 | 1 s |
| 7 | U3 | `cd site && npx vitest run --config vitest.config.ts tests/unit/writing-lists.test.ts` | 0 | 20 / 0 / 0 | 1 s |
| 8 | U3 | `cd site && npx vitest run --config vitest.config.ts tests/unit/tag-urls.test.ts tests/unit/redirect-table.test.ts tests/unit/legacy-redirects.test.ts tests/unit/local-server.test.ts tests/unit/publish-dist.test.ts tests/unit/legacy-redirects-build.test.ts` | 0 | 57 / 0 / 0 in 6 files | 5 s |
| 9 | U3 | `cd site && npx vitest run --config vitest.config.ts --coverage tests/unit/tag-urls.test.ts tests/unit/redirect-table.test.ts tests/unit/legacy-redirects.test.ts` (reference report) | 0 | 35 / 0 / 0; lines 1.22 % (131 / 10,671) of the whole include set (reference only, unit-scoped); `tag-urls.mjs` 100 %, `redirect-table.mjs` 96.42 %, `legacy-redirects-integration.mjs` 83.78 % | 1 s |
| 10 | U1 | `cd site && npx playwright test --config playwright.hig.config.ts tests/e2e/hig-pages.spec.ts` | 0 | 156 / 0 / 6 | 41 s |
| 11 | U2 | `cd site && npx playwright test --config playwright.hig.config.ts tests/e2e/hig-writing.spec.ts tests/e2e/hig-pages.spec.ts` | 0 | 219 / 0 / 12 (run 2: 218 / 0 / 10; the new inline-script check runs in Chromium and is skipped in Firefox and WebKit) | 57 s |
| 12 | U4 | `cd site && npx playwright test --config playwright.hig.config.ts tests/e2e/hig-chrome.spec.ts` | 0 | 700 / 0 / 44 | 3.8 min |
| 13 | U3 | `cd site && npx playwright test --config playwright.hig.config.ts hig-pages.spec.ts hig-writing.spec.ts hig-search.spec.ts hig-profile.spec.ts hig-performance.spec.ts` | 0 | 417 / 0 / 36 (run 2: 416 / 0 / 34) | 1.9 min |

Three targeted checks of the loop-back 2 repairs. They come from no instruction file and are listed for the evidence only:

| Check | Exit | Result |
|---|---|---|
| `cd site && npx vitest run --config vitest.config.ts tests/unit/header-navigation-failure.test.ts` (U4 repair `bd3b57b`) | 0 | 4 / 0 / 0, run in Node through the Astro container. U4's `unit-test-instructions.md` step 2 does not name this file yet, but it also runs inside `npm run test:unit` (R3.4). |
| `cd site && npx playwright test --config playwright.hig.config.ts tests/e2e/hig-writing.spec.ts -g "NFR1.5"` (U2 repair `b7efd85`) | 0 | Chromium: both "request the same scripts as /writing/tags" and "carry the same inline scripts as /writing/tags" pass; the 4 Firefox and WebKit runs are skipped by design |
| `cd site && env -u VITEST CONTENT_DIR_OVERRIDE=/tmp/b3-nonexistent-tree npx astro build --outDir <temp dir>` (U2 repair `7b8aab7`, re-done independently) | **1** (expected) | stops with `WR002 CONTENT_DIR_OVERRIDE: set outside a Vitest run — unset it; it is test-only`. The temp output was outside the repository and has been deleted; `site/dist` was not touched. `VITEST` and `CONTENT_DIR_OVERRIDE` appear nowhere in `Jenkinsfile`, `Justfile` or `site/package.json`. |

Browser commands 10–13 and the `-g "NFR1.5"` run ran in real engines: Playwright 1.61.1 with Chromium, Firefox and WebKit, against the production server `scripts/local-server.mjs` on 127.0.0.1:4329, which the HIG config starts. The `vitest` commands ran in Node.

**Per unit, without double counting:**

| Unit | Commands | Result |
|---|---|---|
| U1 `u1-publish-boundary` | 1, 2, 10 (+ shared `just preprocess`) | pass |
| U2 `u2-writing-section` | 3, 4, 11 | pass |
| U4 `u4-navigation` | 5, 6, 12 (+ shared `just crossunit`, `npm run test:e2e`) | **1 failed**: the shared `npm run test:e2e` (closed provider, R3.4); the rest pass |
| U3 `u3-writing-moves` | 7, 8, 9, 13 (+ shared `just crossunit`) | pass |

### R3.4 Full suite and gate commands (Step 9.3–9.4)

| Command | Exit | Passed / failed / skipped | Duration |
|---|---|---|---|
| `cd preprocessor && cargo fmt --check` | 0 | clean | < 1 s |
| `cd preprocessor && cargo test --release` | 0 | 179 / 0 / 0 across 22 suites | 5 s |
| `cd site && npm run test:unit` | 0 | **576 / 0 / 0 in 49 files** (run 2: 567 in 48) | 18 s |
| `cd site && npm run test:pbt` | 0 | 36 / 0 / 0 in 6 files | 8 s |
| `cd site && npm run format:check` | 0 | all matched files use Prettier style | 1 s |
| `cd site && npx astro check` | 0 | 220 files: 0 errors, 0 warnings, 7 hints | 7 s |
| `cd site && npx playwright test --config playwright.hig.config.ts` | 0 | **1,233 / 0 / 81** of 1,314 (Chromium, Firefox, WebKit) | 5.9 min |
| `just crossunit` | 0 | link sweep: `816 internal references across 40 pages resolve, apart from 1 declared known broken link(s)` (`/posts/post-with-image/` → `/assets/nonexistent-image.png`); **16 / 0 / 0** no-JS tests (Chromium, JavaScript off) | 5 s |
| `cd site && npm run test:coverage` | 0 | 576 / 0 / 0; coverage in R3.5 | 19 s |
| `cd site && npm run test:e2e` | **1** | `{"name":"VerificationProviderError","errorCode":"MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE","stage":"verification.compose","rule":"LC-U1-18/LC-U1-19",…,"details":{"reviewSubjectDigest":"3d578e5b96f849a73c2dfeba708d5582305fffd625b28e8cb1efb4ac5855c0de"}}` then `CLI_COMMAND_FAILED: The routed command exited non-zero.` No spec ran. Recorded as it is; not worked around. | 76 s |

- `npx astro preview status` reported `No preview server is running.` before the browser runs, before and after `just crossunit`, and before `npm run test:e2e`.
- The review-subject digest has not changed since run 1 (`3d578e5b…`). Loop-back 2 changed no review-subject file: `Header.astro` is untouched, because the U4 test renders it through the container.
- **Recorded Construction Verification Command:** every part passes on head `bd3b57b` in this run: cargo fmt and test, `just preprocess`, unit, pbt, format, astro check, HIG and crossunit. The U4 checkpoint run of the same command on the same head (2026-11-20T07:45:37Z–07:52:20Z, exit 0) produced the same counts: cargo 179, unit 576 in 49 files, pbt 36, HIG 1,233 / 81 / 0, crossunit 16, and the same link sweep.
- After the browser runs, `just preprocess` and `npx astro build` restored the plain fixture state. `git status` shows no change under `site/`, `preprocessor/` or `content/`.

### R3.5 Coverage report (full suite, `cd site && npm run test:coverage`, exit 0)

- **Provider:** v8, through `site/vitest.config.ts`; no threshold, and none was added. The full-suite run came after the unit-scoped reference run (#9), so the report on disk is the full-suite report.
- **Report:** `site/.artifacts/coverage/` (`index.html`, `coverage-summary.json`).

| Metric | Run 3 | Run 2 |
|---|---|---|
| **Lines** | **53.98 % (5,766 / 10,681)** | 53.82 % (5,746 / 10,676) |
| Statements | 53.21 % (6,054 / 11,376) | 53.06 % |
| Branches | 51.80 % (4,689 / 9,052) | 51.67 % |
| Functions | 58.73 % (1,318 / 2,244) | 58.53 % |
| Files | 124 measured, 91 below 80 % | 124, 93 |

Modules this intent changed: `src/lib/data.ts` now measures 46.25 % (37/80), up from 42.7 %. The other modules match run 2: `tag-urls.mjs` 100 %, `writing-lists.ts` 98.14 %, `redirect-table.mjs` 96.42 %, `navigation.ts` 85.84 %, `legacy-redirects-integration.mjs` 83.78 %, `link-sweep.mjs` 64.28 %, `sync-public-assets.mjs` 59.09 %. `local-server.mjs` and every `.astro` file still show 0 %, for the reasons given in §5.

- **Rust:** not measured. `cargo llvm-cov --version` and `cargo tarpaulin --version` still answer `no such command`.
- **Floor:** the Testing Contract's "Meet an 80% line-coverage floor." is **Not Met**: 53.98 % against 80 %. No threshold was added, lowered or disabled.

### R3.6 Measurements

**Transferred bytes per route.** Measured with the §6.2 method: Chromium via Playwright, CDP `encodedDataLength`, cache disabled, 1440×900. `HIG_PORT=4401 node scripts/hig/build-and-serve.mjs` served the HIG fixture build, and each route ran in 3 fresh contexts. All 3 runs gave identical totals, and the server was stopped afterwards.

| Route | Run 2 (`b9915d8`) | Run 3 (`bd3b57b`) | Change |
|---|---|---|---|
| `/` | 255,387 B, 18 req | **255,387 B, 18 req** | 0 |
| `/writing` | 254,249 B, 18 req | 254,249 B, 18 req | 0 |
| `/writing/all` | 229,042 B, 17 req | 229,042 B, 17 req | 0 |
| `/writing/tags` | 202,262 B, 16 req | 202,262 B, 16 req | 0 |

- Every route loads the same 8 script files and contacts 0 foreign origins.
- Built HTML: `dist/index.html` 25,800 B, `dist/writing/index.html` 27,709 B, `dist/writing/all/index.html` 33,803 B, the same as run 2.
- Inline `<script>` blocks in the built HTML: `/`, `/writing`, `/writing/all` and `/writing/tags` each hold the same 6 blocks, with the same SHA-1 prefixes as in run 2. The HIG suite now also asserts this in Chromium (`b7efd85`).
- **Budgets:** `/` is still 18,159 B over U2 NFR1.8's 237,228 B and 36 B over U4's absolute 255,351 B. U4's own delta on `/` is −95 B like for like (U2 head 255,770 B against U4 head 255,675 B, from run 1). The −99 B in run 2's record compares the U2 head with assembled `40fa3e7`. This matches the corrected U4 `code-summary.md`.

**Not re-measured, with the reason.**

- *Fixture build time* (§6.1: 3.61 s, 1.003 × U1, 1.000 × U2, ≤ 3.81 s): the only product change is a constant-time environment check at `data.ts` module load, and the rendered output is identical.
- *Real-content `/writing/all`* (§6.4: 106,391 B): no row markup changed.
- *Preprocessor timings* (§6.4: 1.001 × with and without stamping): no Rust file changed since run 2.

**Suite durations (U1 NFR6.6), re-measured against a same-day pre-U1 baseline.** Run 2 compared today's durations with the pre-U1 durations in U1's `code-summary.md`, which were taken on another day. Today's first `npm run test:unit` medians came out at 18.40 s against that 15.29 s, which is 1.203 ×. So this run measured the pre-U1 commit `db7ecae` (merge base with `develop`) the same day, in a detached scratch worktree under the OS temp folder. The worktree used a cloned `node_modules`, the fixture content and a separate Cargo target folder, and it was removed afterwards. The unit heads were measured the same way, round-robin, 3 rounds after a warm-up:

| Suite | pre-U1 `db7ecae` | U1 head `0b21f4f` | U2 head `27e9489` | U4 head `1b9add2` | Assembled `bd3b57b` | Assembled ÷ pre-U1 | Target (U1 NFR6.6 design) |
|---|---|---|---|---|---|---|---|
| `npm run test:unit` (s; runs) | 13.39 (13.53, 13.39, 13.28) | 13.37 (13.32, 13.52, 13.37) | 13.58 | 13.59 | **19.25** (19.30, 19.25, 19.14) | **1.44 ×** | ≤ 1.2 × |
| `cargo test --release` (s) | 3.81 (10.85 first-run link, 3.81, 3.81) | — | — | — | 4.53 (5.67, 4.53, 4.52) | 1.19 × | ≤ 1.2 × |
| `npm run test:pbt` (s) | 6.72 (7.23, 6.71, 6.72) | — | — | — | 7.18 (7.57, 7.18, 7.18) | 1.07 × | ≤ 1.2 × |

- **Test counts:** pre-U1 449, U1 456, U2 476, U4 490, assembled 576.
- **Where the extra time goes:** the jump arrives after the U4 head, with the U3 commits and the loop-back repairs.
  - Excluding both isolated full-site builds brings the assembled suite to 13.15–13.28 s, the pre-U1 time. The command was `npx vitest run --config vitest.config.ts --exclude tests/unit/writing-empty-build.test.ts --exclude tests/unit/legacy-redirects-build.test.ts`.
  - The two builds are `tests/unit/legacy-redirects-build.test.ts` (U3, `722d572`) and `tests/unit/writing-empty-build.test.ts` (U2 loop-back 1, `0ef1e89`).
  - Excluding only the U3 build gives 14.54–14.78 s. Excluding only the U2 build gives 16.61–16.75 s.
  - Excluding the new U4 container test changes nothing (18.14 s).
- **Run 2's grading was wrong:** its 1.19 × rested on a cross-day baseline. The 15.29 s pre-U1 figure matches a cold first run today (15.36 s warm-up), not the warm median. No timeout changed since `develop`; the design's pass/fail rule is the 1.2 × duration ratio, and that is what is graded.

### R3.7 Target Verification Matrix (finalized, run 3)

The full matrix is in `build-and-test-summary.md` → `## Target Verification Matrix`.

| Verdict | Count | Target IDs |
|---|---|---|
| Met | 78 | every row not listed below |
| Not Met | 7 | TC-SF-COV80, TEAM-E2E-A11Y, U1-NFR6.6, U2-NFR1.8, U4-PD-ROOT-BYTES, U4-NFR1.11, U4-NFR6.11 |
| Unverified | 6 | TEAM-RUST-COV, U1-NFR6.1, U1-SLO-NIGHTLY, U1-SLO-PAGECOUNT, U1-CG-R04, U2-AC3.4.1 |
| N/A | 1 | TC-SF-CI: CI Pipeline, later in this plan, sets up CI to run these tests before merge |

Total: 92 rows, the same set as run 2. No `Pending` remains.

- **To Met (3):**
  - U2-NFR5.19: review-03 R-05 is Fixed; WR002 was re-checked end to end here.
  - U2-NFR1.5: R-06 is Fixed; the inline-script check passes in Chromium.
  - U4-NFR5.21: R-07 is Fixed; `header-navigation-failure.test.ts` passes 4 / 0.
- **To Not Met (1):** U1-NFR6.6, at 1.44 × against a same-day baseline (R3.6).
- **Unchanged:** U4-PD-ROOT-BYTES. Its record part is now corrected (U4 review-03 R-01 Fixed), but the 36 B overshoot stays.
- **Net change from run 2:** Met +2 (76 → 78), Not Met −2 (9 → 7), Unverified ±0 (6), N/A ±0 (1).

### R3.8 Failure classification and estimated impact (failure-ladder rung 2), run 3

Rung 1 does not apply in run 3. No failure lies in test configuration, build scripts or environment set-up within this stage's remit. The one exception is TEAM-RUST-COV, a tool install outside the project, left for the maintainer's go-ahead. This run started no loop-back and no jump, and added no loop-back entry. **Run 3:** 13 open targets: 7 Not Met and 6 Unverified. Each is listed below with its owner and every candidate fix, with estimated impact.

| Target | Verdict | Why it is open | Owner | Candidate fixes (effort, cost, risk) |
|---|---|---|---|---|
| TC-SF-COV80 | Not Met | 53.98 % lines against the contract's 80 % floor. `team.md` says "report coverage, enforce no minimum" | the maintainer (open decision 1) | (a) The maintainer decides that team.md's report-only rule governs this scope floor, recorded as a human-made requirement change: about 15 min, no code, no risk to the product. (b) Write the tests to reach 80 %: about 2,800 more covered lines, mostly in code older than this intent; 3–5 days, low risk, high effort. (c) Accept the gap at the gate. Lowering or removing the floor without that decision is not an option. |
| U1-NFR6.6 | Not Met (new in run 3) | The site unit suite takes 1.44 × the same-day pre-U1 duration (19.25 s against 13.39 s; the limit is 1.2 ×, 16.07 s). The two isolated full-site builds added by U3 (`legacy-redirects-build.test.ts`) and by U2's loop-back 1 (`writing-empty-build.test.ts`) account for it. U1's own head is at 1.00 × | code-generation (U3 and U2 test code); the maintainer for the scope question | (a) Share one isolated build between the two test files, or build only the routes each needs. Excluding just the U3 build already gives 14.5–14.8 s (≤ 16.07 s). About 1–2 h, no cost, low risk; test code only, U2 and U3 reopened. (b) Move the isolated full-site build tests into their own script (for example `test:build`), and add it to the recorded verification command, the `Justfile` and the Jenkins Verify stage. The unit suite returns to about 13.2 s. About 1–1.5 h, low–medium risk: the Jenkinsfile edit is a CI change, and if Verify stopped running these tests it would lose a production gate. (c) The maintainer decides whether NFR6.6 measures U1's fixture change, which is met at 1.00 ×, or the whole assembled suite. That is a U1 NFR Requirements and NFR Design wording decision, about 20 min with no code. It is the maintainer's call, never this stage's. |
| U2-NFR1.8 | Not Met | `/` is 255,387 B against U2's budget of 237,228 B (+18,159 B). The weekly rows' Korean glyphs pull one more Pretendard subset (≈ 25.7 KB) | the maintainer (open decision 2: page-weight budget) | (a) Raise the budget, a maintainer decision through U2's NFR Requirements and NFR Design: about 20 min, no code. (b) A custom font subset covering the week rows' glyphs: 0.5–1 day, medium risk to the font pipeline and the HIG typography; U2 code-generation reopened. (c) Accept the gap at the gate. A ≥ 36 B trim does not reach this figure. |
| U4-PD-ROOT-BYTES | Not Met | `/` is 255,387 B against U4's absolute 255,351 B (+36 B). The record is now corrected (review-03 R-01 Fixed; U4's own delta is −95 B like for like), and the overshoot stays | the maintainer (open decision 2) | (a) Raise or reset the budget (maintainer; about 20 min, no code). (b) Trim ≥ 36 B of `/` markup: about 1 h, low risk, U4 code-generation reopened. This meets U4's figure only, not U2-NFR1.8. If the trim touches `Header.astro` or another review-subject file, the 16-state record goes stale again. (c) The font subset of U2-NFR1.8 (b) would also meet this figure: 0.5–1 day, medium risk. |
| U4-NFR1.11 | Not Met | The text says `aria-current` appears "at most once per page". The code emits one marker per surface (bar and sheet), and only one surface renders at a time. The tests prove the per-surface rule in 3 engines (review-03 R-05, Still applies) | the maintainer (open decision 3) | (a) Amend the NFR1.11 wording to "at most once per surface; one surface renders at a given width" through a U4 NFR Requirements reopen (with the matching nfr-design line): about 20–30 min, no code, no risk. (b) Accept as is at the gate, and the verdict stays Not Met against the text as written. (c) Change the code to one marker per page, for example by dropping the sheet's marker: 1–2 h, medium risk to the AC6.1.x behaviour, and it would stale the 16-state record (`MobileNav.tsx`). Not recommended. |
| U4-NFR6.11 | Not Met | The measured values meet NFR6.11, but `nfr-design/performance-design.md` §1 still says "Writing stays" (review-03 R-06, Still applies); the file was not changed | nfr-design (U4), artifact text; the maintainer's go-ahead | (a) Correct the Page weight row and its trace line in `performance-design.md` §1 (plus `nfr-design/traceability.json`) to say that Tags, Graph, Résumé and Portfolio leave and Writing is added, through an NFR Design reopen for U4: about 20 min, no code, no risk. (b) Accept the wording gap at the gate. |
| TEAM-E2E-A11Y | Not Met | `npm run test:e2e` refuses: `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`, digest `3d578e5b…` | the maintainer (open decision 4: the 16-state manual review) | (a) The maintainer redoes the 16-state accessibility review once the changes settle and before the deploy that ships the units: 2–4 h of the maintainer's time, no cost. Then `npm run test:e2e`, about 2 min. No agent fix exists; working around the provider is not allowed. |
| U2-AC3.4.1 | Unverified | The empty-week homepage test is in `homepage.spec.ts`, which runs only under the refused `npm run test:e2e` | the maintainer (open decision 4), then build-and-test | (a) The same review, then `npm run test:e2e`. (b) Also port the empty-week check to the HIG suite, which would need a second fixture build date: about 1–2 h, low risk, U2 code-generation reopened. It does not close TEAM-E2E-A11Y. |
| U1-CG-R04 | Unverified | The FR2.2 rendered-site checks are in `homepage.spec.ts` and did not run. An inspection of the built site agrees with FR2.2 | the maintainer (open decision 4), then build-and-test | (a) The same review, then `npm run test:e2e`. (b) Move the FR2.2 built-output checks to a Vitest built-HTML test or to the HIG suite: about 1 h, low risk, U1 code-generation reopened. |
| U1-NFR6.1 | Unverified | Jenkins Verify on the U1 merge commit; no merge exists yet | ci-pipeline (next stage), after the maintainer's merges to `develop` | Run the Jenkins job `obsidian-blog-develop` after the merges (with `RUN_DEPLOY` unchecked for a validation-only run): about 10 min, no cost. Not doable in this stage. |
| U1-SLO-NIGHTLY | Unverified | 30-day production signal | observability-setup (later in this plan) | Read the Jenkins build history after 30 nightly runs: 30 days elapsed, about 15 min of work, no cost. |
| U1-SLO-PAGECOUNT | Unverified | 0 unexpected site-page counts per run, a production signal | observability-setup (later in this plan) | Check the nightly preprocess summary line per run once production runs exist: about 15 min to set up, no cost. |
| TEAM-RUST-COV | Unverified | No Rust coverage tool installed (`no such command` for both) | the maintainer's go-ahead; then build-and-test (tooling) | `cargo install cargo-llvm-cov` (about 10 min, a global developer tool, no project dependency, low risk), then `cd preprocessor && cargo llvm-cov --release` (about 5 min). That turns the row into a measured figure; whether Rust then counts toward TC-SF-COV80 is part of open decision 1. |

The cheapest no-code path to close the most rows is the maintainer's four open decisions plus two artifact corrections (U4 NFR1.11 and NFR6.11 text), at about 1 h of reopened-stage work in total. The only remaining code-level gap is U1-NFR6.6, about 1–2 h of test work in U2 and U3. The ci-pipeline and observability-setup rows cannot close in Construction.

---

The sections from here to `## Loop-Back Log` record **run 2** (head `b9915d8`) as written then. Run 3 supersedes its verdicts.

## 1. Build status

| Command | Exit | Duration | Output |
|---|---|---|---|
| `just preprocess` | 0 | 4.8 s | `Found 19 sources (1 site pages)`; warnings only for the fixture's deliberate `nonexistent-image.png` and `Nonexistent Heading`; last line `published 17 posts, 1 site pages, 3 assets` |
| `cd site && npx astro build` | 0 | 4.3 s | `[rvnnt-profile-build] verified private profile approval boundary`; `[rvnnt-legacy-redirects] wrote _redirects.json (12 rules)`; `_redirects.json` version 1, 12 rules |

**Build: SUCCESS.**

## 2. Unit-scoped commands (Step 9.2)

The commands come from the four `code-generation/unit-test-instructions.md` files, and identical commands ran once. `just preprocess` appears in all four files, `just crossunit` in U4 and U3, and `npm run test:e2e` in U4. Each of those ran once, in section 1 or 3. U1's old property command, which failed in run 1, is gone: U1's step 4 now says that no U1 property file remains (repair, U1 review-02 R-03 resolved).

| # | Unit(s) | Command | Exit | Passed / failed / skipped | Duration |
|---|---|---|---|---|---|
| 1 | U1 | `cd preprocessor && cargo test --release --test cli_boundary_test --test walker_test --test stamping_order_test --test publication_catalog --test publication_transform --test publication_output --test scanner_test` | 0 | 79 / 0 / 0 (13 + 7 + 5 + 20 + 13 + 15 + 6) | 2.3 s |
| 2 | U1 | `cd site && npx vitest run --config vitest.config.ts tests/unit/sync-public-assets.test.ts tests/unit/content-data.test.ts` | 0 | 15 / 0 / 0 in 2 files | 1 s |
| 3 | U2 | `cd site && npx vitest run --config vitest.config.ts tests/unit/writing-lists.test.ts tests/unit/content-data.test.ts` | 0 | 29 / 0 / 0 | 1 s |
| 4 | U2 | `cd site && PBT_RUNS=100 PBT_SEED=42 npx vitest run --config vitest.pbt.config.ts tests/pbt/u2/writing-lists.pbt.test.ts` | 0 | 4 / 0 / 0 | 2 s |
| 5 | U4 | `cd site && npx vitest run --config vitest.config.ts tests/unit/profile-metadata-navigation.test.ts tests/unit/profile-presentation.test.ts` | 0 | 65 / 0 / 0 (run 1: 50) | 5 s |
| 6 | U4 | `cd site && PBT_RUNS=100 PBT_SEED=42 npx vitest run --config vitest.pbt.config.ts tests/pbt/u1/profile-metadata-navigation.pbt.test.ts` | 0 | 5 / 0 / 0 | 1 s |
| 7 | U3 | `cd site && npx vitest run --config vitest.config.ts tests/unit/writing-lists.test.ts` (runner check) | 0 | 20 / 0 / 0 | 1 s |
| 8 | U3 | `cd site && npx vitest run --config vitest.config.ts tests/unit/tag-urls.test.ts tests/unit/redirect-table.test.ts tests/unit/legacy-redirects.test.ts tests/unit/local-server.test.ts tests/unit/publish-dist.test.ts tests/unit/legacy-redirects-build.test.ts` | 0 | 57 / 0 / 0 in 6 files (run 1: 52) | 4 s |
| 9 | U3 | `cd site && npx vitest run --config vitest.config.ts --coverage tests/unit/tag-urls.test.ts tests/unit/redirect-table.test.ts tests/unit/legacy-redirects.test.ts` (reference report) | 0 | 35 / 0 / 0; lines 1.22 % of the whole include set (reference only, unit-scoped); `tag-urls.mjs` 100 %, `redirect-table.mjs` 96.4 %, `legacy-redirects-integration.mjs` 83.8 % | 2 s |
| 10 | U1 | `cd site && npx playwright test --config playwright.hig.config.ts tests/e2e/hig-pages.spec.ts` | 0 | 156 / 0 / 6 | 40 s |
| 11 | U2 | `cd site && npx playwright test --config playwright.hig.config.ts tests/e2e/hig-writing.spec.ts tests/e2e/hig-pages.spec.ts` | 0 | 218 / 0 / 10 | 56 s |
| 12 | U4 | `cd site && npx playwright test --config playwright.hig.config.ts tests/e2e/hig-chrome.spec.ts` | 0 | 700 / 0 / 44 (run 1: 652) | 3.8 min |
| 13 | U3 | `cd site && npx playwright test --config playwright.hig.config.ts hig-pages.spec.ts hig-writing.spec.ts hig-search.spec.ts hig-profile.spec.ts hig-performance.spec.ts` | 0 | 416 / 0 / 34 | 1.9 min |

Browser commands 10–13 ran in real engines: Playwright 1.61.1 with Chromium, Firefox and WebKit, against the production server `scripts/local-server.mjs` on 127.0.0.1:4329. The commands with `--config vitest*.ts` ran in Node.

**Per unit, without double counting:**

| Unit | Commands | Result |
|---|---|---|
| U1 `u1-publish-boundary` | 1, 2, 10 (+ shared `just preprocess`) | pass |
| U2 `u2-writing-section` | 3, 4, 11 | pass |
| U4 `u4-navigation` | 5, 6, 12 (+ shared `just crossunit`, `npm run test:e2e`) | **1 failed**: the shared `npm run test:e2e` (closed provider, section 3); the rest pass |
| U3 `u3-writing-moves` | 7, 8, 9, 13 (+ shared `just crossunit`) | pass |

## 3. Full suite and gate commands (Step 9.3–9.4)

| Command | Exit | Passed / failed / skipped | Duration |
|---|---|---|---|
| `cd preprocessor && cargo fmt --check` | 0 | clean | < 1 s |
| `cd preprocessor && cargo test --release` | 0 | 179 / 0 / 0 across 22 suites (47 unit + 132 integration) | 5 s (timed medians in §6.5) |
| `cd site && npm run test:unit` | 0 | 567 / 0 / 0 in 48 files | 19 s |
| `cd site && npm run test:pbt` | 0 | 36 / 0 / 0 in 6 files | 8 s |
| `cd site && npm run format:check` | 0 | all matched files use Prettier style | 1 s |
| `cd site && npx astro check` | 0 | 0 errors, 0 warnings, 7 hints | 7 s |
| `cd site && npx playwright test --config playwright.hig.config.ts` | 0 | **1,232 / 0 / 79** of 1,311 (Chromium, Firefox, WebKit) | 5.8 min |
| `just crossunit` | 0 | link sweep: 816 internal references across 40 pages resolve, apart from the declared `/posts/post-with-image/` → `/assets/nonexistent-image.png`; **16 / 0 / 0** no-JS tests (Chromium, JavaScript off, 320×800 and 1440×900) | 5 s |
| `cd site && npm run test:coverage` | 0 | 567 / 0 / 0; coverage in section 5 | 19 s |
| `cd site && npm run test:e2e` | **1** | `{"errorCode":"MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE","stage":"verification.compose","rule":"LC-U1-18/LC-U1-19","details":{"reviewSubjectDigest":"3d578e5b96f849a73c2dfeba708d5582305fffd625b28e8cb1efb4ac5855c0de"}}` then `CLI_COMMAND_FAILED`. No spec ran. | 75 s |

- `npx astro preview status` reported no server before `just crossunit`, and none after it. The `--ignore-lock` fix from run 1 (`40fa3e7`) held.
- The review-subject digest is the same as in run 1 (`3d578e5b…`). The loop-back 1 repair changed no manual-review subject file, so the gap is still the U4/U3 changes that run 1 found.

**Recorded Construction Verification Command:** every part passes on head `b9915d8`: cargo fmt and test, `just preprocess`, unit, pbt, format, astro check, HIG and crossunit.

## 4. Failure details

| Command / target | Failure | Detail |
|---|---|---|
| `npm run test:e2e` | fail-closed provider | The manual 16-state accessibility record does not match the current review-subject digest, because U4 and U3 changed review-subject files (`navigation.ts`, `Header.astro`, `MobileNav.tsx`, `chrome.css`, `astro.config.mjs`, and U1's `index.astro`/`home.css`/`verification-provider.mjs`). So `homepage.spec.ts` did not execute. That spec holds the U1 FR2.2 rendered-site checks, the U2 AC3.4.1 empty week and the U4 one-link bar; the one-link bar is now also asserted in the HIG suite, which ran. |

No test assertion failed in any suite that ran.

## 5. Coverage report

- **Provider:** v8, through `site/vitest.config.ts` (`include: src/**/*.{ts,tsx,astro,js,mjs}, scripts/**/*.{ts,js,mjs}`; no threshold).
- **Command:** `cd site && npm run test:coverage`, exit 0. It ran after the unit-scoped reference command (#9), so the report on disk is the full-suite one.
- **Report:** `site/.artifacts/coverage/` (`index.html`, `coverage-summary.json`).

| Metric | Value |
|---|---|
| **Lines** | **53.82 % (5,746 / 10,676)**; run 1 53.80 % |
| Statements | 53.06 % (6,033 / 11,370) |
| Branches | 51.67 % (4,677 / 9,050) |
| Functions | 58.53 % (1,313 / 2,243) |
| Files | 124 measured, 93 below 80 % |

New or changed modules of this intent:

| File | Lines |
|---|---|
| `src/lib/tag-urls.mjs` (U3) | 100 % (19/19) |
| `src/lib/writing-lists.ts` (U2) | 98.1 % (53/54) |
| `scripts/redirect-table.mjs` (U3) | 96.4 % (81/84); run 1 95.2 % |
| `src/lib/navigation.ts` (U4) | 85.8 % (97/113); run 1 83.2 % |
| `scripts/build/legacy-redirects-integration.mjs` (U3) | 83.8 % (31/37) |
| `scripts/crossunit/link-sweep.mjs` (U1) | 64.3 % (45/70) |
| `scripts/sync-public-assets.mjs` (U1) | 59.1 % (13/22) |
| `src/lib/data.ts` (U1, U2) | 42.7 % (32/75) |
| `scripts/local-server.mjs` (U3) | 0 % (0/102). It runs only as a child process, which v8 does not follow; `local-server.test.ts` and the HIG suite exercise it over HTTP. |
| `src/pages/writing/**`, `src/components/writing/**`, `src/pages/index.astro` | 0 %: `.astro` files render only inside builds |

- **Rust:** not measured. `cargo llvm-cov --version` and `cargo tarpaulin --version` both answer "no such command".
- **Floor:** the Testing Contract's "Meet an 80% line-coverage floor." is **Not Met** (53.82 %). No threshold was added, lowered or disabled. Whether team.md's "report coverage, enforce no minimum" governs this scope floor is the maintainer's open decision.

## 6. Measurements

### 6.1 Build time (fixture content, `HOMEPAGE_TODAY_OVERRIDE=2025-08-13`)

Assembled head `b9915d8`, `npx astro build` in the main tree: one warm-up (3.73 s), then 3.65 s, 3.60 s and 3.61 s, **median 3.61 s**. Run 1's medians for the earlier heads were U1 3.60 s, U2 3.61 s and U4 3.58 s. They were not re-run, because the repair touched no head before U3's. Against them:

- assembled / U1 = 1.003 (U2 NFR6.8, ≤ 1.10);
- assembled / U2 = 1.000 (U4 NFR1.14, ≤ 1.05);
- 3.61 s ≤ 3.81 s (U4 performance-design §2).

### 6.2 Transferred bytes per route (Chromium via Playwright + CDP `encodedDataLength`, cache disabled, 1440×900)

The method is the same as in run 1. The HIG runner (`scripts/hig/build-and-serve.mjs`, `HIG_PORT=4401`) built the fixture site with the e2e fixture post and `HOMEPAGE_TODAY_OVERRIDE=2025-08-13`, and served it through `scripts/local-server.mjs`. Each route had 3 fresh contexts, and all 3 runs gave identical totals.

| Route | Run 1 (assembled `40fa3e7`) | Run 2 (assembled `b9915d8`) | Change |
|---|---|---|---|
| `/` | 255,671 B, 18 req | **255,387 B, 18 req** | −284 B |
| `/writing` | 254,633 B, 18 req | 254,249 B, 18 req | −384 B |
| `/writing/all` | 229,143 B, 17 req | 229,042 B, 17 req | −101 B |
| `/writing/tags` | 202,262 B, 16 req | 202,262 B, 16 req | 0 |

- Every route requests the same 8 script files (`Search`, `ThemeToggle`, `client`, `createLucideIcon`, `hooks.module`, `jsxRuntime.module`, `modal`, `preact.module`) and contacts 0 foreign origins.
- Inline `<script>` blocks in the built HTML: `/`, `/writing`, `/writing/all` and `/writing/tags` each hold the same 6 blocks, with identical SHA-1s (`85d939fd`, `924fd68f`, `9313b3e3`, `c3d30a36`, `d71a0abe`, `e7650fff`). This stage measured that once by hand; no test asserts it (U2 review-02 R-06).
- Run 1's reference figures for the earlier heads still stand: U1 229,039 B, U2 255,770 B, U4 255,675 B. The U2 design baseline of 255,351 B does not reproduce.
- **Budgets:** U2 NFR1.8 allows 237,228 B, so `/` is **18,159 B over**. U4's absolute budget is 255,351 B, so `/` is **36 B over**.

### 6.3 HTML bytes (the same HIG-style build)

| File | U2 head (run 1) | Run 1 assembled | Run 2 assembled |
|---|---|---|---|
| `dist/index.html` | 28,659 B | 27,222 B | 25,800 B |
| `dist/writing/index.html` | 31,120 B | 29,733 B | 27,709 B |
| `dist/writing/all/index.html` (fixture) | 35,807 B | 34,404 B | 33,803 B |

### 6.4 Real-content measurements (private copy of `Areas/Notes`, never the real vault)

**`/writing/all` (U2 NFR1.7, U4 PD-WALL)** was measured in run 1 at 106,391 B for 137 rows (777 B per row). It was not rebuilt here. The repair changed only stylesheet placement (`ae84c34`); it changed no row markup. The fixture `/writing/all` HTML shrank by 601 B (§6.3), so the real-content page cannot have grown.

**Preprocessor timing (U1 NFR6.3–6.5).** U1 repair `22e1468` changed `preprocessor/src/output.rs`, so run 1's grounds for reusing U1's timings ("the source is byte-identical") no longer hold. This run re-measured both binaries on the same day:

- **Binaries:** the pre-U1 `preprocessor/target/u1-baseline/obsidian-press-pre` and the current `preprocessor/target/release/obsidian-press` (built from `b9915d8`).
- **Input:** U1's private 2026-11-16 copy, `preprocessor/target/u1-baseline/vault/Notes`.
- **Order:** three round-robin rounds, from the repository root.
- **Output:** a temporary folder, deleted afterwards.
- **Stamping runs:** each worked on a fresh APFS clone of the copy; every run printed `Stamped 0 posts`.

| Mode | Pre-U1 runs (s) | Median | Current runs (s) | Median | Ratio | Target |
|---|---|---|---|---|---|---|
| no stamping | 169.49, 169.55, 169.23 | 169.49 s | 169.61, 169.54, 169.63 | 169.61 s | 1.001 × | ≤ 1.1 × (NFR6.5) |
| `--stamp-published` | 169.86, 169.96, 170.15 | 169.96 s | 170.06, 169.71, 170.29 | 170.06 s | 1.001 × | ≤ 1.5 × (NFR6.4) |

The current binary printed `published 155 posts, 0 site pages, 305 assets` each time, so the vault had not doubled (NFR6.7).

### 6.5 Static checks and suite durations

| Check | Value |
|---|---|
| `site/src/styles/writing.css` | **1,100 B** (U2 design target ≤ 3,072 B); run 1 3,998 B. Single-page rules moved to `home.css` (2,218 B) and the new `writing-all.css` (2,598 B) |
| `transition`/`animation` in `writing.css`, `writing-all.css`, `home.css` | none |
| `site/src/styles/chrome.css` | 9,717 B (≤ 10,000 B) |
| `grouped.css` | 6,632 B source; 3,910 B as the inline block on `/writing/tags` (< 4,096 B); 0 `_astro/*.css` files carry `.grouped-row`, `.tag-chip`, `.listing-header`, `.grouped-empty`, `.back-link` |
| `_astro/` | 176 files (run 1: 176, identical to the U4 head) |
| `_redirects.json` served | `200 application/json; charset=utf-8`; `/tags?x=1` → `301` to `/writing/tags?x=1` |
| FR2.2 in the built HIG site (inspection only) | no `dist/posts/fixture-homepage/`; `fixture-homepage` appears in no file under `dist/` (incl. `rss.xml`, `sitemap-0.xml`). `homepage.spec.ts`, the test that asserts this, did not run |
| `CONTENT_DIR_OVERRIDE` | read unconditionally by `site/src/lib/data.ts` line 9; set only by `writing-empty-build.test.ts`; not set or cleared in `Jenkinsfile` or `Justfile` |
| Suite durations, median of 3 (pre-U1 baseline from U1 `code-summary.md`) | `cargo test --release` 4.51 s (5.83, 4.49, 4.51; 3.86 s → **1.17 ×**); `npm run test:unit` 18.16 s (18.28, 18.16, 18.16; 15.29 s → **1.19 ×**); `npm run test:pbt` 7.18 s (7.17, 7.18, 7.20; 6.86 s → **1.05 ×**). The unit suite grew by 25 tests, including the isolated empty-content build, so it sits close to the 1.2 × limit |
| Timeouts | no change to `vitest.config.ts`, `vitest.pbt.config.ts`, `playwright.hig.config.ts` or `Cargo.toml` since `develop`; `tests/unit/support/astro-build.ts` gained only a child `env` parameter |

## 7. Target Verification Matrix (finalized)

The full matrix, with sources, expected and actual values and evidence, is in `build-and-test-summary.md` → `## Target Verification Matrix`. Final verdicts:

| Verdict | Count | Target IDs |
|---|---|---|
| Met | 76 | every row not listed below |
| Not Met | 9 | TC-SF-COV80, TEAM-E2E-A11Y, U2-NFR1.5, U2-NFR1.8, U2-NFR5.19, U4-PD-ROOT-BYTES, U4-NFR1.11, U4-NFR5.21, U4-NFR6.11 |
| Unverified | 6 | TEAM-RUST-COV, U1-NFR6.1, U1-SLO-NIGHTLY, U1-SLO-PAGECOUNT, U1-CG-R04, U2-AC3.4.1 |
| N/A | 1 | TC-SF-CI: CI Pipeline, later in this plan, sets up CI to run these tests before merge |

Total: 92 rows. Since run 1, eight targets moved to Met: U1-CG-R02, U2-PD-CSS3K, U2-AC4.1.3, U3-NFR5.22, U3-NFR5.25, and the run-1 test gaps in U4-NFR5.21 and U4-NFR1.11, which have now closed. U4-NFR5.21 and U4-NFR1.11 nonetheless stay Not Met, on other grounds (section 8). New Not Met rows: U2-NFR5.19 (review-02 R-05) and U4-NFR6.11 (review-02 R-06). New Unverified row: U1-CG-R04 (review-02 R-04). No `Pending` remains.

## 8. Failure classification and estimated impact (failure-ladder rung 2)

Rung 1 was not needed in this run: no failure lies in test configuration, build scripts or environment set-up. The one exception is TEAM-RUST-COV, a tool install outside the project, which this run did not perform without the maintainer's go-ahead. Every row below is either a gap in generated test or source code, or open for the maintainer or a later stage. This run started no loop-back and no jump.

### 8.1 Fixable by a code-generation loop-back (impact estimated)

| Target | Root cause | Unit | Candidate fix | Effort | Cost | Risk |
|---|---|---|---|---|---|---|
| U2-NFR1.5 | NFR1.5 forbids any `<script>` beyond the site-wide ones, but the new check compares only requested script files (Chromium). Inline blocks and layout-wide additions are outside it (U2 review-02 R-06, New). Measured today: inline sets are identical (§6.2). | code-generation, U2 | Add an inline-`<script>` count and SHA comparison of `/writing` and `/writing/all` against `/writing/tags`, either to `hig-writing.spec.ts` or as a built-HTML Vitest check | 30–45 min | none | low; test only |
| U2-NFR5.19 | The test-only `CONTENT_DIR_OVERRIDE` is read by every production build, and nothing makes it fail closed. If it ever reached the Jenkins or a maintainer shell, the nightly job or `just deploy` would publish lists from another content tree, with assets from the real one (U2 review-02 R-05, New) | code-generation, U2 | Honour it only when `VITEST` is set, else fail with a coded error, and add a failing-first test; optionally `unset` it in the Jenkins Build Site stage | 45 min – 1 h | none | low (`data.ts` only; the Jenkinsfile edit would be a CI change) |
| U4-NFR5.21 | No test shows that a failed navigation state stops the build at `Header.astro` (`throw TypeError`). Only a discarded mutation run showed it, so removing the throw leaves every test green (U4 review-02 R-07, New) | code-generation, U4 | Render `Header` with a stubbed failing state (Astro container) and expect the TypeError, or run one isolated fixture build with a hostile model and expect a non-zero exit | 1–1.5 h | none | low if test only; `Header.astro` is a manual-review subject, so any seam added to it would invalidate the 16-state record again |
| U4-NFR6.11 | The measured values meet NFR6.11. But `nfr-design/performance-design.md` §1 and `nfr-design/traceability.json` still say Writing "stays", while U4 adds it, so the design basis contradicts the requirement (U4 review-02 R-06, Unresolved) | nfr-design, U4 (artifact text; no code) | Correct the Page weight row and its trace line to "Tags, Graph, Résumé and Portfolio leave; Writing is added" | 10–15 min | none | none; no code |
| U4-PD-ROOT-BYTES (record part) | `code-summary.md` Step 8 still uses the non-reproducing baseline and gives no cause for the `/writing` request drop (U4 review-02 R-01, Major, Unresolved). Correcting the record does not change the verdict | code-generation, U4 (artifact only) | Cite §6.2 like-for-like figures, state that 255,351 B and 3.63 s did not reproduce, and name the "Résumé" `é` font subset | 20 min | none | none |

Total for 8.1: about 3–4 h of agent work, no financial cost, low risk. Loop-back 2 of 3 would reopen code-generation for U2 and U4 (plus U4's nfr-design text). U1 and U3 need nothing.

### 8.2 Awaiting a maintainer decision or a later stage (not fixable by a code-generation loop-back)

| Target | Why it is open | Owner | What closes it |
|---|---|---|---|
| TC-SF-COV80 (53.82 % < 80 %) | Open decision 1: the Testing Contract's 80 % floor against team.md's "report coverage, enforce no minimum". Reaching 80 % would need ≈ 2,800 more covered lines, mostly in code that predates this intent (3–5 days). | the maintainer | the decision; then either that test volume or a recorded, human-made requirement change |
| U2-NFR1.8 (`/` 255,387 B > 237,228 B) | Open decision 2: the page-weight budget. The weekly rows' Korean glyphs pull one more Pretendard subset (≈ 25.7 KB). A technical fix (a self-built subset covering the week rows' glyphs) is possible: 0.5–1 day, medium risk to the font pipeline and the HIG typography. | the maintainer | the budget decision, or a go-ahead for the font work |
| U4-PD-ROOT-BYTES (`/` 255,387 B > 255,351 B) | Open decision 2: the same budget. It is now 36 B over; U4's own delta is −99 B. A trim of ≥ 36 B of `/` markup would meet U4's absolute figure (≈ 1 h, low risk) but not U2-NFR1.8. | the maintainer | the budget decision (then, if it stands, the trim) |
| U4-NFR1.11 | Open decision 3: the wording "at most once per page" against the design's "once per surface". The code emits one marker on the bar and one in the sheet; one surface renders at a time. The run-1 test gap is closed: the bar's one link and at most one `aria-current` per surface are asserted in three engines (U4 review-02 R-05, Unresolved). | the maintainer (nfr-requirements, U4) | the wording decision; no code change is expected |
| TEAM-E2E-A11Y, U2-AC3.4.1, U1-CG-R04 | Open decision 4: when the 16-state manual accessibility review is redone. Until then `npm run test:e2e` refuses, and `homepage.spec.ts` (FR2.2 rendered-site checks, the AC3.4.1 empty week) cannot run (U1 review-02 R-04, Unresolved) | the maintainer | the review, once after the changes settle and before the deploy that ships the units (2–4 h of the maintainer's time); then `npm run test:e2e` |
| TEAM-RUST-COV | No Rust coverage tool is installed. This is in-stage environment work, but it installs a global developer tool, so this run left it for the maintainer's go-ahead | the maintainer / build-and-test | `cargo install cargo-llvm-cov`, then `cargo llvm-cov --release` (15–20 min, no project dependency) |
| U1-NFR6.1 | Needs the U1 merge commit on `develop` and a Jenkins run | ci-pipeline (later in this plan) and the maintainer's merge | the Jenkins job on `develop` after the merges |
| U1-SLO-NIGHTLY, U1-SLO-PAGECOUNT | 30-day production signals | observability-setup (later in this plan) | Jenkins build history after 30 nightly runs |

## Loop-Back Log

### Loop-back 1 — 2026-11-20T03:10:00Z

- **Diagnosis:** the build and the recorded Construction Verification Command pass. Build and Test fails on 11 Not Met and 6 Unverified targets. Of these, eight have root causes in generated test or source code: code-generation review findings that were never dispositioned, and tests that were never written. They are U3-NFR5.25, U3-NFR5.22, U4-NFR5.21, U4-NFR1.11 (test part), U2-NFR1.5, U2-PD-CSS3K, U2-AC4.1.3 and U1-CG-R02, plus U1's stale `unit-test-instructions.md` command. The remaining failures are not code defects and stay open for the maintainer:
  - TC-SF-COV80, the coverage-floor policy against team.md's "no minimum" rule;
  - U2-NFR1.8 and U4-PD-ROOT-BYTES, the page-weight budget;
  - U4-NFR1.11 wording;
  - TEAM-E2E-A11Y and U2-AC3.4.1, the manual 16-state review;
  - Unverified targets owned by ci-pipeline and observability-setup.
- **Root-cause stage:** code-generation, for all four units (u1-publish-boundary, u2-writing-section, u4-navigation, u3-writing-moves).
- **Planned fix:**
  - **U3:** a `publish-dist.sh` ordering test (a `PATH` shim makes `cp` fail; the old table stays byte-identical); unit cases for `isHeaderValueSafe`; a `local-server.test.ts` lone-surrogate case expecting 400 and then recovery.
  - **U4:** three fail-closed cases in `profile-metadata-navigation.test.ts` plus the hostile-model build check; the one-link bar assertion in `hig-chrome.spec.ts`.
  - **U2:** a Playwright script-set check; an empty-state isolated-build test (AC4.1.3); trim `writing.css` to 3 KiB or less.
  - **U1:** decide and test BR5.2 for embedded-post images; correct the stale PBT command in `unit-test-instructions.md`.
  - The maintainer's decisions on the coverage floor, the page-weight budget and the NFR1.11 wording are asked at the repaired plans' approval and built in where they need code.
- **Estimated impact:** about 5–7 h of agent work in total; no financial cost; low risk. Every change is a test or a small, scoped source change, and no behaviour the passing suite covers changes. Each reopened unit needs fresh Plan Approval and a fresh review.

### Loop-back 2 — 2026-11-20T06:20:00Z

- **Diagnosis:** run 2, after loop-back 1, passes the build, every unit command, the full recorded verification command and every test assertion. 9 targets are Not Met and 6 Unverified. Four have code-level root causes, all from the fresh code-generation reviews:
  - **U2-NFR5.19:** the test-only `CONTENT_DIR_OVERRIDE` is read by every production build and does not fail closed (U2 review-02).
  - **U2-NFR1.5:** the script-set check compares only fetched script files, not inline `<script>` blocks (U2 review-02).
  - **U4-NFR5.21:** no test shows that a failed navigation state stops the build at `Header.astro` (U4 review-02).
  - **U4 records:** R-01, the page-weight explanation in `code-summary.md`.
- U4-NFR6.11's wording sits in U4's nfr-design text, not in code. It is recorded for the maintainer and is not part of this fix.
- The remaining targets are not code defects. They await the maintainer or a later stage:
  - TC-SF-COV80, the coverage floor;
  - U2-NFR1.8 and U4-PD-ROOT-BYTES, the `/` page-weight budget;
  - U4-NFR1.11 wording;
  - TEAM-E2E-A11Y, U2-AC3.4.1 and U1-CG-R04, which wait on the manual 16-state review;
  - U1-NFR6.1, owned by ci-pipeline;
  - U1-SLO-NIGHTLY and U1-SLO-PAGECOUNT, owned by observability-setup;
  - TEAM-RUST-COV, a tool install.
- **Root-cause stage:** code-generation, for u2-writing-section and u4-navigation only. U1 and U3 keep their work, reviews and approvals.
- **Planned fix:**
  - **U2:** honour `CONTENT_DIR_OVERRIDE` only under Vitest; anywhere else it fails the build with a coded error, written failing-first. Extend the script-set check to inline scripts, comparing their count and a content hash against `/writing/tags`.
  - **U4:** add a test that a hostile navigation model or path stops the site build at the `Header.astro` call site, through an isolated build or a component-render test. Correct the page-weight explanation in `code-summary.md` like-for-like, as test-results §6.2 measured it.
- **Estimated impact:** about 3–4 h of agent work; no financial cost; low risk. Only tests change, plus one environment-variable guard in `data.ts`. If the U4 test needs `Header.astro` itself to change, the manual accessibility record goes stale again, which it already is. U2 and U4 each need fresh Plan Approval and a fresh review.

### Loop-back 3 — 2026-11-20T08:40:00Z

- **Diagnosis:** run 3, after loop-back 2, passes the build, every unit command, the full recorded verification command and every test assertion; U2-NFR5.19, U2-NFR1.5 and U4-NFR5.21 are now Met. 7 targets are Not Met and 6 Unverified. One has a code-level root cause:
  - **U1-NFR6.6:** `npm run test:unit` takes 19.25 s against 13.39 s pre-U1, measured the same day (1.44 × against a 1.2 × limit). Run 2 graded it Met against a recorded 15.29 s baseline that did not reproduce. Measured round-robin, the pre-U1, U1, U2 and U4 heads sit at 1.00–1.01 ×; the jump comes after the U4 head from two more isolated full-site builds (`legacy-redirects-build.test.ts`, U3; `writing-empty-build.test.ts`, U2 loop-back 1). `site/tests/unit/support/astro-build.ts` serialises every build through one lock, so the five files that build (`hig-built-assets`, `hig-built-html`, `profile-presentation`, `legacy-redirects-build`, `writing-empty-build`) run one after another; four of them build the same default fixture site. Excluding the two new builds brings the suite back to 13.2 s.
- The remaining targets are not code defects. They await the maintainer or a later stage:
  - TC-SF-COV80 (53.98 %), the coverage floor;
  - U2-NFR1.8 and U4-PD-ROOT-BYTES, the `/` page-weight budget;
  - U4-NFR1.11 wording, and U4-NFR6.11 (the "Writing stays" text in U4's `performance-design.md` §1, an NFR Design artifact);
  - TEAM-E2E-A11Y, U2-AC3.4.1 and U1-CG-R04, which wait on the manual 16-state review;
  - U1-NFR6.1, owned by ci-pipeline;
  - U1-SLO-NIGHTLY and U1-SLO-PAGECOUNT, owned by observability-setup;
  - TEAM-RUST-COV, a tool install.
- **Root-cause stage:** code-generation, for u3-writing-moves only: its test added the build that tips the suite over, and the fix lives in the shared test-support module. U1, U2 and U4 keep their work, reviews and approvals; `writing-empty-build.test.ts` keeps its own isolated build because it needs a different content tree.
- **Planned fix:** build the default fixture site once per `vitest run` and share it among the test files that need the default build, instead of one build per file. Keep the lock; key the shared build to the current run so a stale build is never reused; never let a test write into the shared output. Measure the suite the same day against the pre-U1 head, round-robin, and record the ratio.
- **Estimated impact:** about 1–2 h of agent work; no financial cost; low risk (test support only; no product file, no review-subject file, no CI change). U3 needs fresh Plan Approval and a fresh review. This is the last loop-back of 3.

### Loop-back 4 — 2026-11-20T12:05:00Z

- **Diagnosis:** run 5, the maintainer's directed retry after run 4, passes the build, every unit command, the full recorded verification command and every test assertion. 8 of run 4's 12 open targets moved to Met: TC-SF-COV80 (the obligation is report-only after the maintainer's decision), TEAM-RUST-COV (measured at 87.45 % lines), U1-CG-R04 and U2-AC3.4.1 (the two new test files run and pass), U2-NFR1.8 and U4-PD-ROOT-BYTES (the `/` budget reset to the measured 255,387 B, which the measurement meets), U4-NFR1.11 (the requirement reads "once per surface") and U4-NFR6.11 (the design text agrees). 4 targets stay open: TEAM-E2E-A11Y (Not Met), U1-NFR6.1, U1-SLO-NIGHTLY and U1-SLO-PAGECOUNT (Unverified). None of them has a code-level root cause this stage can close.
- **Root-cause stage:** none for the four open rows. The e2e refusal waits on the maintainer's manual 16-state accessibility review; U1-NFR6.1 waits on the Jenkins Verify run over the merge commit (ci-pipeline); the two SLO rows wait on 30 nightly production runs (observability-setup).
- **Planned fix:** none in this stage. The loop-back bound of 3 is exhausted and this run was the maintainer's directed retry, so the stage stops at the approval gate with the failure verdict and the four open rows named.
- **Estimated impact:** none. No further agent work is planned for this stage; the maintainer decides whether to accept the failure or to run the manual review and the Jenkins job before the deploy.
