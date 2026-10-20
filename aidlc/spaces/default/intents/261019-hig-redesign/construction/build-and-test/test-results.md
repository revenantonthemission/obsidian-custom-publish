# Test Results: Repository Cleanup and HIG Redesign

The stage has run three times:
- **Run 3** is current. It ran after loop-back 2's repair and comes first below.
- **Run 2** led to loop-back 2, and **Run 1** to loop-back 1. Their records follow unchanged.

The Loop-Back Log at the end is append-only.

## Run 3 (after loop-back 2)

### Run

- **When and where:** 2026-10-20, 15:40–15:52 UTC, on the build host (macOS 27.0.1). The checkout was `develop` at `987f497`, the state the loop-back 2 repair finished in, and the build used the fixture vault.
- **What ran:**
  - every command in the four instruction files of this folder, with the same runner as run 2 (`pipefail`, so each exit status is the command's own);
  - the scoped unit commands in `unit-test-instructions.md`;
  - R0, the Mermaid regression tests on their own.
- **Run 2's two scratch checks are now part of IT-4.** Loop-back 2 moved them into the HIG suite:
  - the open dialogs and sheets are in `OPEN_STATES` in `tests/e2e/support/hig.ts`;
  - the highlighted-link contrast is in `hig-tokens.test.ts`, `hig-post.spec.ts` and `hig-pages.spec.ts`.

  The scratch scripts of run 2 were lost when the session's scratch folder was cleared. PT-3 and the CSS budget figures were re-run with rewritten scripts that use the same settings: `bt3-mobile-profile.mjs` and `bt3-css-budget.mjs`, in `/private/tmp/claude-501/-Users-revenantonthemission-Projects-obsidian-blog/2a53a821-c6d3-4f56-935f-36069a2a8404/scratchpad/`.
- **Side effects:** `git status` before and after showed no change to any tracked file under `site/`, `preprocessor/` or `fixtures/`, or to `CLAUDE.md`.

### Build Status

| ID | Command | Result |
|---|---|---|
| B1 | `cargo build --release` | success (up to date) |
| B2 | `obsidian-press ./fixtures/vault ./content` | success: 14 posts and 1 homepage artifact, with the two expected fixture warnings |
| B3, B4 | copy the JSON files; `ensure-fixture-content.mjs` | success ("homepage artifact present") |
| B5 | `npx astro build` | success: 34 pages in 4.80 s |
| B6 | `npx astro build`, rebuilt after IT-6 for the measurement runs | success |

**Build: SUCCESS.**

### Test Results

| ID | Command | Total | Passed | Failed | Skipped | Result |
|---|---|---|---|---|---|---|
| Q1 | `cargo fmt --check` | — | — | — | — | clean |
| Q2 | `npm run format:check` | — | — | — | — | all files match |
| Q3 / IT-7 | `npx astro check` | 189 files | — | 0 errors | — | 0 errors, 0 warnings, 7 hints |
| U1 | the five scoped unit files (`hig-tokens`, `appearance`, `render-sections`, `search-keys`, `render-images`) | 38 | 38 | 0 | 0 | pass |
| U2 | `hig-built-html`, `hig-built-assets` | 8 | 8 | 0 | 0 | pass |
| U3 | `profile-tooling.test.ts -t inlined` | 2 | 2 | 0 | 29 by the filter | pass |
| R0 | `cargo test --release mermaid` | 3 | 3 | 0 | 0 | pass |
| IT-1 | `cargo test --release` | 113 | 113 | 0 | 0 | pass: 36 unit, 77 integration |
| IT-2 | `npm run test:unit` | 360 | 360 | 0 | 0 | pass (30 files) |
| IT-3 | `npm run test:pbt` | 37 | 37 | 0 | 0 | pass (6 files) |
| IT-4 | `npx playwright test --config playwright.hig.config.ts` | 1,002 | 937 | 0 | 65 | pass in 5.0 min (Chromium, Firefox, WebKit) |
| IT-5a | `just crossunit`, link sweep | 34 pages | — | 1 broken link | — | **FAIL, exit 1**: only the fixture's deliberate `nonexistent-image.png` |
| IT-5b | the crossunit Playwright half on its own | 8 | 8 | 0 | 0 | pass |
| IT-6 | `npm run test:e2e` | 6 spec files | 6 | 0 | 0 | **FAIL, exit 1**: the browser evidence passed, then the run stopped at `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` for digest `be3fa9c6…48ed9d`, unchanged since run 2 |

The 65 IT-4 skips are run 2's 55 plus the 5 open-state matrix tests in Firefox and WebKit (10), which run in Chromium only. The 200%-text open-state checks run in all three engines.

**What IT-4 now covers that run 2 failed:**
- **NFR1-b:** a link inside a highlight, over the page, grouped, card, table-header and all six callout grounds, computed in `hig-tokens.test.ts`. The rendered checks in a callout, a table header and the homepage note run in three engines, light and dark.
  - Loop-back 2 recorded the rendered values: at least 5.63:1 in light mode (blue callout) and 5.37:1 in dark (table header). The homepage note is 5.88:1 / 8.65:1, where it was 1.73:1 in dark mode.
- **NFR1-e:** the open search dialog with results, the navigation sheet, both outline-sheet tabs and the `/graph` list.
  - Measured at 320 px with doubled text in three engines, and at six widths in both appearances in Chromium.
  - Each route's HTTP status is asserted.
  - No offender anywhere: the snippet now wraps to two lines.

### Coverage Report

No coverage figure could be produced. Nothing changed since run 1: no Vitest coverage provider is installed.

### Performance (PT-3)

- **Script:** `bt3-mobile-profile.mjs`, with output in `pt3-result-run3.json`. It runs against the B6 build on 127.0.0.1:4391, between 15:49:38 and 15:52:08 UTC, with nothing else running.
- **Profile:** run 2's: 412 × 823 at DPR 1.75 with touch, 4× CPU, 562.5 ms latency, 1,474.56 kbps down and 675 kbps up.
- **Sampling:** three cold loads per page, then the page's scripted interactions. The table shows the median, with the worst run in parentheses.

| Page | LCP ms | CLS | TBT ms | INP ms | Interactions per run |
|---|---|---|---|---|---|
| `/` | 1,648 (1,744) | 0 (0) | 0 (10) | 32 (40) | 8 / 9 / 12 |
| `/posts/post-with-diagrams` | 1,696 (1,712) | 0 (0) | 0 (0) | 32 (32) | 5 / 5 / 4 |
| `/posts/post-with-math` | 1,760 (1,780) | 0.0001 (0.0001) | 25 (29) | 32 (40) | 4 / 4 / 5 |
| `/posts/post-with-code` | 1,800 (1,824) | 0.0025 (0.0025) | 68 (74) | 40 (40) | 8 / 8 / 8 |
| `/graph` | 1,600 (1,612) | 0.0087 (0.0087) | 0 (0) | 40 (40) | 6 / 6 / 6 |
| `/resume` | 1,648 (1,668) | 0 (0) | 6 (18) | 40 (40) | 6 / 6 / 6 |

Every page meets every target. The figures are within run 2's range.

**CSS budget figures** (`bt3-css-budget.mjs`, the budget tests' method, from the B6 HTML):
- **Blog CSS:** peaks at 27,673 B on the post pages. That is 2.6% above Step 31's 26,969 B, under both the 10% regression line and the 30,720 B budget.
- **Profile-only CSS:** 4,489 B, unchanged.

### Dependency Audit (ST-5)

`npm audit --omit=dev` found the same 27 advisories (exit 1): 1 critical, 18 high, 2 moderate and 6 low. Loop-back 2 changed no dependency: `package.json` and the lockfile are unchanged since `204066f`.

### Security

| ID | Result | Evidence |
|---|---|---|
| ST-1, ST-2 | pass | in IT-4 |
| ST-3 | pass | no hit at `987f497` |
| ST-4 | pass | the same 15 `set:html` sites as run 2. The only new match is a comment in `highlight.css` |
| ST-5 | **fail (pre-existing)** | 27 advisories, unchanged |
| ST-6 | partial | unchanged (R-14) |
| ST-7 | pass | `image-size.ts` and its containment test are unchanged since run 2, and U1 passed |

### Target Verification Matrix (final)

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-1 | Testing Contract | `cargo test --release` 0 failed | 113 passed | IT-1 | build-and-test | Met |
| TC-2 | Testing Contract | `npm run test:unit` 0 failed | 360 passed in 30 files | IT-2 | build-and-test | Met |
| TC-3 | Testing Contract | `npm run test:pbt` 0 failed | 37 passed | IT-3 | build-and-test | Met |
| TC-4 | Testing Contract | `npx astro check` 0 errors | 0 errors in 189 files | Q3 | build-and-test | Met |
| TC-5 | Testing Contract | `just crossunit` passes | only the fixture's deliberate broken image link fails (exit 1); the no-JS half passes 8 of 8 | IT-5a, IT-5b | build-and-test | Not Met |
| TC-6 | Testing Contract, NFR7, FR6.4 | Playwright checks and `npm run test:e2e` pass | the HIG suite passes (937, 0 failed, 65 deliberate skips). `test:e2e` passes 6 of 6 spec files, then stops at the manual record for digest `be3fa9c6…48ed9d` | IT-4, IT-6 | build-and-test (the maintainer's review) | Unverified |
| TC-7 | Testing Contract, NFR1 | 0 axe violations, 4 widths × 2 appearances, reduced motion | every C-01 axe cell passes in three engines | IT-4 | build-and-test | Met |
| TC-8 | Testing Contract | a coverage figure is reported | no coverage provider is installed | Coverage Report | build-and-test | Unverified |
| TC-9 | Testing Contract: `tdd` | a failing test before each behaviour | Steps 53–58 recorded Red before Green (`code-summary.md`, "Loop-back 2 Repair"). Run 2's grading of the earlier steps stands | `code-summary.md`, `review-03.md` | build-and-test | Met |
| TC-10 | scope floor (`bugfix`) | a regression test per defect fixed | both run-2 defects have tests that failed first and stay as regressions | IT-2, IT-4 | build-and-test | Met |
| TC-11 | team.md Code Style | `cargo fmt --check` clean | clean | Q1 | build-and-test | Met |
| TC-12 | AC7.1 | `npm run format:check` passes | passes | Q2 | build-and-test | Met |
| NFR1-b | NFR1 | text 4.5:1, including on materials | every text pair passes. A link inside a highlight is at least 5.63:1 (light) and 5.37:1 (dark) on every ground, including the homepage note (R-17, resolved) | U1, IT-4 | build-and-test | Met |
| NFR1-c | NFR1 | UI components 3:1 | unchanged since run 2: the selected segment's ring is 3.81–6.56:1. The reading-progress line and the graph edges are treated as decorative (R-21) | U1, IT-4 | build-and-test | Met |
| NFR1-d | NFR1 | keyboard operation, visible focus | unchanged: the keyboard paths pass. The ring check reads only `outline-color` (R-19) | IT-4 | build-and-test | Met |
| NFR1-e | NFR1 | 200% text, no loss of content | no overflow or cut-off content at 320 px with doubled text, on every route and in every open dialog and sheet, in three engines, and at six widths in both appearances (R-18, resolved) | IT-4 | build-and-test | Met |
| NFR2-a | NFR2 | LCP < 2,500 ms, mobile profile | 1,600–1,800 ms median, 1,824 ms worst | PT-3, IT-4 | build-and-test | Met |
| NFR2-b | NFR2 | CLS < 0.1 | worst 0.0087 | PT-3, IT-4 | build-and-test | Met |
| NFR2-c | NFR2 | INP < 200 ms | worst 40 ms | PT-3 | build-and-test | Met |
| NFR2-d | NFR2 | TBT < 200 ms | worst 74 ms | PT-3, IT-4 | build-and-test | Met |
| NFR2-e | NFR2 | blog CSS ≤ 30,720 B gzip | 27,673 B peak; the budget test passes | IT-4, CSS figures | build-and-test | Met |
| NFR2-f | NFR2 | profile CSS ≤ 24,576 B gzip | 4,489 B; the budget test passes | IT-4, CSS figures | build-and-test | Met |
| NFR3 | NFR3 | Chromium, Firefox and WebKit pass | all three pass | IT-4 | build-and-test | Met |
| NFR4 | NFR4 | no third-party request | ST-1 and ST-2 pass | IT-4 | build-and-test | Met |
| NFR5-a | NFR5 | changed frontend files < 800 lines | loop-back 2's largest changed file is `hig-tokens.test.ts` at 549 lines. Its largest `site/src` file is `post.css`, which went from 456 to 451 lines. Run 2's figures otherwise stand | `git diff 204066f 987f497` | build-and-test | Met |
| NFR5-b | NFR5 | `--c-` colors; motion on transform and opacity only | `highlight.css` uses only `--c-` tokens and adds no motion | `git diff` | build-and-test | Met |
| NFR6 | NFR6 | no change lost in cleanup | only `develop` (`987f497`) and `main` remain; loop-back 2's three branches merged with `--no-ff` and were deleted with `-d`; `origin` is unchanged | git | build-and-test | Met |
| SEC-1 | ST-5 | no high or critical advisory | 27 advisories, identical to before this work | Dependency Audit | build-and-test | Not Met |

**Totals:** 28 targets: 24 Met, 2 Not Met, 2 Unverified. Run 2 was 22 Met, 4 Not Met and 2 Unverified.

### Failure Handling

**Failure predicate met.**
- Three commands failed: `just crossunit`, `npm run test:e2e` and `npm audit`.
- TC-5 and SEC-1 are Not Met.
- TC-6 and TC-8 are Unverified.

**Rung 1, in-stage fixes: none possible.** Each remaining item needs the maintainer:
- TC-5 needs a real-content build, which reads the vault.
- TC-6 needs the 16-state review.
- TC-8 needs a dev dependency in a review-subject file.

**Rung 2, classification: no root cause in generated code.**
- TC-5 is the fixture vault's deliberate negative.
- TC-6 is the maintainer's manual review.
- TC-8 is a tooling decision.
- SEC-1 is the pre-existing advisories, which need a separate dependency refresh.

No candidate fix in any swappable dimension remains for this workflow to retry.

**Rung 3: does not apply.** Construction Autonomy Mode is not set.

**Rung 4, halt and ask (no-fix variant): presented to the maintainer.** Loop-backs used: 2 of 3. The maintainer chose **Accept failure**. TC-5, TC-6, TC-8 and SEC-1 stay open as recorded above and pass to the maintainer:
- the 16-state review record for digest `be3fa9c6…48ed9d`;
- a coverage provider;
- a dependency refresh;
- a real-content link sweep.

## Run 2 (after loop-back 1)

### Run

- **When and where:** 2026-10-20, 14:11–14:37 UTC, on the build host (macOS 27.0.1). The checkout was `develop` at `204066f`, the state the loop-back 1 repair finished in, and the build used the fixture vault.
- **What ran:**
  - every command in the four instruction files of this folder;
  - the scoped unit commands in `unit-test-instructions.md`, which now include `render-images.test.ts` and the profile-tooling `inlined` tests;
  - R0, the Mermaid regression tests on their own.
- **Exit codes:** the runner set `pipefail`, so each `exit:` line is the command's own status.
- **Added checks.** Grading found two evidence gaps:
  - the open dialogs and sheets, which no overflow check opens (IT-8);
  - a link inside a highlight away from the page ground (Highlighted Links).

  Scratch checks against the B6 build filled both. Both CSS budget figures were also recomputed from that build.
- **Side effects:** `git status` afterwards showed no change to any tracked file under `site/`, `preprocessor/` or `fixtures/`, or to `CLAUDE.md`.

The scratch scripts and their raw output are in `/private/tmp/claude-501/-Users-revenantonthemission-Projects-obsidian-blog/2a53a821-c6d3-4f56-935f-36069a2a8404/scratchpad/` (the "scratchpad folder" below).

### Build Status

| ID | Command | Result |
|---|---|---|
| B1 | `cargo build --release --manifest-path preprocessor/Cargo.toml` | success in 13.7 s |
| B2 | `./preprocessor/target/release/obsidian-press ./fixtures/vault ./content` | success: 14 posts and 1 homepage artifact, with the two expected fixture warnings (`nonexistent-image.png`, `Nonexistent Heading`) |
| B3 | copy the four JSON files into `site/public/` | success |
| B4 | `node scripts/crossunit/ensure-fixture-content.mjs` | success ("homepage artifact present") |
| B5 | `npx astro build` | success: 34 pages in 5.09 s; "verified private profile approval boundary" |
| B6 | `npx astro build`, rebuilt after IT-6 for the measurement runs | success: 34 pages in 4.92 s |

**Build: SUCCESS.**

### Test Results

| ID | Command | Total | Passed | Failed | Skipped | Result |
|---|---|---|---|---|---|---|
| Q1 | `cargo fmt --check` | — | — | — | — | clean |
| Q2 | `npm run format:check` | — | — | — | — | "All matched files use Prettier code style!" |
| Q3 / IT-7 | `npx astro check` | 189 files | — | 0 errors | — | 0 errors, 0 warnings, 7 hints |
| U1 | `npx vitest run tests/unit/hig-tokens.test.ts tests/unit/appearance.test.ts tests/unit/render-sections.test.ts tests/unit/search-keys.test.ts tests/unit/render-images.test.ts` | 38 | 38 | 0 | 0 | pass (5 files) |
| U2 | `npx vitest run tests/unit/hig-built-html.test.ts tests/unit/hig-built-assets.test.ts` | 8 | 8 | 0 | 0 | pass (2 files) |
| U3 | `npx vitest run tests/unit/profile-tooling.test.ts -t inlined` | 2 | 2 | 0 | 29 by the filter | pass |
| R0 | `cargo test --release mermaid` | 3 | 3 | 0 | 0 | pass: the Step 50 regression tests |
| IT-1 | `cargo test --release` | 113 | 113 | 0 | 0 | pass: 36 unit tests and 77 integration tests in 16 files |
| IT-2 | `npm run test:unit` | 360 | 360 | 0 | 0 | pass (30 files) |
| IT-3 | `npm run test:pbt` | 37 | 37 | 0 | 0 | pass (6 files) |
| IT-4 | `npx playwright test --config playwright.hig.config.ts` | 960 | 905 | 0 | 55 | pass in 4.6 min (Chromium, Firefox, WebKit) |
| IT-5a | `just crossunit`, link sweep | 34 pages | — | 1 broken link | — | **FAIL, exit 1** |
| IT-5b | `npx playwright test --config playwright.crossunit.config.ts` on its own | 8 | 8 | 0 | 0 | pass |
| IT-6 | `npm run test:e2e` | 6 spec files | 6 | 0 | 0 | **FAIL, exit 1**: the automated browser evidence passed, then the run stopped at the manual record |
| IT-8 | open dialogs and sheets, scratch check (below) | 75 loads | 44 | 15 | 16 not applicable | **FAIL**: the open search dialog |

The 55 IT-4 skips are the deliberate ones in `code-summary.md`:
- run 1's 15;
- the 6 mobile-network tests in Firefox and WebKit (12);
- the 14 six-width matrix tests in Firefox and WebKit (28).

### Failure Details

**IT-5a, `just crossunit` link sweep.** Unchanged from run 1:

```text
link-sweep: /posts/post-with-image/index.html -> /assets/nonexistent-image.png has no emitted target
link-sweep: 1 broken internal link(s) across 34 pages
error: recipe `crossunit` failed on line 51 with exit code 1
```

**IT-6, `npm run test:e2e`.**

```text
{"name":"VerificationProviderError","errorCode":"MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE","stage":"verification.compose","rule":"LC-U1-18/LC-U1-19", ... "details":{"reviewSubjectDigest":"be3fa9c63c1973455c247bed56ae3462175a68d34a6b08d032f2b4143848ed9d"}}
CLI_COMMAND_FAILED: The routed command exited non-zero.
```

`site/.artifacts/profile/verification/browser-evidence.json` (written 23:18 local time) records `result: "pass"` with 6 discovered, 6 passed and 0 failed. The run then stops where the plan expects: the maintainer's 16-state record does not exist for the current digest.

**IT-8, open dialogs and sheets (NFR1-e, AC4.1; review finding R-18).**

Why it was run: the suite's C-14 check (200% text at 320 px) and its AC4.1 matrix load each route with every dialog and sheet closed, so R-18 left those states unmeasured.

How it was run:
- **Script:** `bt2-open-states-overflow.mjs` in the scratchpad folder. Its rows are in `bt2-open-states-overflow.json` and `bt2-open-states-overflow.log`.
- **Method:** it opens each state on the B6 build and applies `horizontalOverflow()` from `tests/e2e/support/hig.ts` at `204066f`, unchanged except that type annotations are removed. Motion is frozen first, as `freezeMotion()` does.
- **States:**
  - the search dialog with results for "post";
  - the navigation sheet;
  - the outline sheet on both of its tabs;
  - the `/graph` list.
- **Matrix:**
  - Part A: 320 px with the text doubled, in Chromium, Firefox and WebKit.
  - Part B: 320, 375, 768, 1024, 1440 and 1920 px in light and dark, in Chromium.
  - A state whose opener is not shown at a width is not applicable there. The navigation toggle is hidden from 768 px, and the outline button from 1100 px.
- **Status:** every one of the 75 loads returned HTTP 200.

| State | Part A (200% text, 320 px, 3 engines) | Part B (six widths × two appearances) |
|---|---|---|
| search dialog with results | **fail in all 3** | **fail in all 12** |
| navigation sheet | pass | pass at 320 and 375; not applicable from 768 |
| outline sheet, 목차 tab | pass | pass up to 1024; not applicable at 1440 and 1920 |
| outline sheet, 탐색 tab | pass | pass up to 1024; not applicable at 1440 and 1920 |
| `/graph` 목록 tab | pass | pass |

Every failure is the same element: each result's `span.search-option-snippet`. The helper lists up to 8 offenders.

```text
A chromium  320 light x2  search dialog with results  FAIL span.search-option-snippet cuts off content: scrollWidth=2238 clientWidth=288; … scrollWidth=639 clientWidth=288 …
B chromium 1024 light x1  search dialog with results  FAIL span.search-option-snippet cuts off content: scrollWidth=1119 clientWidth=528; … scrollWidth=745 clientWidth=528 …
```

- **Cause.** `site/src/styles/search.css:172–178` sets `.search-option-snippet` to `overflow: hidden`, `text-overflow: ellipsis` and `white-space: nowrap`. Each snippet is therefore one line that ends in an ellipsis at every size. With the text doubled at 320 px, about 288 px of snippets 639–2,742 px long stays visible.
- **Where the style comes from.** The site had the same style before the redesign (`.search-result-snippet` at `7896636`), and the refined mockup draws the snippet as one line ending in "…".
- **Why the repair's rule fails it.** That rule reports text cut off sideways in a `hidden` box, and Step 46 fixed `.grouped-row-summary` for the same reason.

### Coverage Report

No coverage figure could be produced. The site still has no Vitest coverage provider, so nothing changed since run 1 (see run 1's Coverage Report).

### Performance (PT-3)

Run 1's setup was repeated:
- **Script:** `pt3-mobile-profile.mjs` in the scratchpad folder, with output in `pt3-result-run2.json`.
- **Target:** the B6 build, served by `site/scripts/local-server.mjs` on 127.0.0.1:4391.
- **Time:** 14:19:51–14:22:00 UTC. Nothing else ran against the build.
- **Profile:** 412 × 823 at DPR 1.75 with touch, 4× CPU, 562.5 ms latency, 1,474.56 kbps down and 675 kbps up.
- **Sampling:** three cold loads per page. The table shows the median, with the worst run in parentheses.

| Page | LCP ms | CLS | TBT ms | INP ms | Interactions |
|---|---|---|---|---|---|
| `/` | 1,632 (1,720) | 0 (0) | 0 (0) | 64 (64) | appearance button, search open and typing |
| `/posts/post-with-diagrams` | 1,696 (1,696) | 0 (0) | 0 (0) | 48 (72) | outline open and close (no fold toggle in view) |
| `/posts/post-with-math` | 1,716 (1,716) | 0.0001 (0.0001) | 23 (24) | 48 (72) | outline open and close (no fold toggle in view) |
| `/posts/post-with-code` | 1,744 (1,760) | 0.0025 (0.0025) | 48 (66) | 48 (64) | heading fold, outline open and close |
| `/graph` | 1,584 (1,588) | 0.0087 (0.0087) | 0 (0) | 40 (40) | list view, then graph view and a legend chip |
| `/resume` | 1,652 (1,680) | 0 (0) | 4 (15) | 56 (64) | disclosure, appearance button |

Every page meets every target.
- **The diagrams post:** LCP fell from 3,508 ms in run 1 to 1,696 ms, and CLS from 0.0832 to 0.
- **Why:** the B6 build marks the first diagram `loading="eager"` and `fetchpriority="high"`, and every diagram carries its `width` and `height` (Steps 39–41).

**CSS budget figures.** These were computed from the B6 HTML the way the two budget tests compute them in the browser: linked and inline sheets, gzip level 9, with KaTeX left out of the blog figure. The script is `bt2-css-budget.mjs`.
- **Blog CSS:** peaks at 27,570 B on the post pages, against 26,969 B at Step 31. That is a 2.2% rise, under the 10% regression line and the 30,720 B budget.
- **Profile-only CSS:** 4,489 B, against 4,487 B.

### Highlighted Links (NFR1-b; review finding R-17)

The repair checked `--c-mark-fill` only over the page ground. Links are `--c-tint` everywhere (`base.css:81`), and callouts do not override that color.

Two checks covered the other grounds a highlight can sit on:
- **Computed:** `bt2-r17-pairs.mjs` uses the token test's formula. That is WCAG relative luminance, with the fill composited over its ground and `color-mix()` in sRGB for callouts. It covers every ground.
- **Rendered:** `bt2-r17-browser.mjs` sets up a highlighted link on the page, because no fixture note has one. It does this in the homepage note, in the first callout of `/posts/post-with-callouts` (blue) and in a table header of `/posts/post-with-code`. It then measures the rendered colors in Chromium, Firefox and WebKit. All three engines gave the same values, and they match the computed ones.

| Ground | Light | Dark | Source |
|---|---|---|---|
| page (`--c-bg`) | 4.66 | 6.88 | computed |
| table header (`--c-surface-2`) | **4.33** | **4.27** | computed and rendered |
| callout, blue | **4.07** | 5.68 | computed and rendered |
| callout, gray / green / orange / red / purple | **4.22 / 4.28 / 4.31 / 4.08 / 4.11** | 5.24 / 5.03 / 4.79 / 5.33 / 5.39 | computed |
| homepage note | 5.10 | **1.73** | rendered |

**The homepage note loads no highlight style.** The `.post-content mark` rule ships only in the post pages' stylesheet. A highlight in the homepage note therefore keeps the browser's yellow `mark`, which stays yellow in dark mode, and a dark-mode link on it reaches 1.73:1.

What passes, computed:
- plain text in a highlight: at least 7.30:1 on every ground;
- a link with no highlight: at least 4.66:1 in light mode and 7.49:1 in dark;
- a link in `--c-tint-hover`: at least 5.63:1 on every highlight ground in light mode and 5.37:1 in dark.

Why the existing checks miss it: no fixture note renders a highlighted link inside a callout, a table header or the homepage note, so neither axe nor the rendered-contrast checks reach this state.

A misleading comment: `post.css:81` says `--c-mark-fill` keeps such a link at 4.5:1. That holds only over the page ground.

### Dependency Audit (ST-5)

`cd site && npm audit --omit=dev` found the same 27 advisories as run 1 (exit 1): 1 critical, 18 high, 2 moderate and 6 low. The package, severity and advisory-source sets are identical to run 1's audit, and run 1 found the same set in the lockfile from before this work. The repair changed no dependency.

### Security

| ID | Result | Evidence |
|---|---|---|
| ST-1 | pass | "third parties (NFR4)" in `hig-performance.spec.ts` passed in IT-4 |
| ST-2 | pass | the first-visit test in `hig-appearance.spec.ts` passed in IT-4 |
| ST-3 | pass | the secret pattern scan at `204066f` found nothing (`git grep` exit 1) |
| ST-4 | pass | the injection sinks are identical to `aeb36cc`: the two listings do not differ. There are 15 `set:html` sites: 12 icon constants (`decorativeIcon` and the HubNav separator), the vault HTML at `PostLayout.astro:93` and `index.astro:47`, and the JSON-LD payload at `BaseLayout.astro:105`. Run 1's record counted 16 sites and 13 icons; the listing holds 15 and 12. `site/src` has no other sink. `svg-icon.ts:3` mentions `innerHTML` only in a comment |
| ST-5 | **fail (pre-existing)** | 27 advisories, identical to run 1; see Dependency Audit |
| ST-6 | partial | unchanged: `NavTree.tsx:28` casts `/nav-tree.json` without validation (R-14) |
| ST-7 | pass | `assetImageSize()` resolves the source against the assets folder and gives no size unless the result stays inside it (`image-size.ts:27–29`). In U1, `render-images.test.ts:268` plants a real 50 × 50 PNG one folder above the assets folder and confirms `/assets/../outside.png` stays unsized. Missing, folder, non-image and sizeless files give no size without throwing. Not tested: a symbolic link inside the assets folder would be followed, and a truncated header with a valid signature (R-20). The folder holds the preprocessor's copies of the vault's own attachments |

### Target Verification Matrix (final)

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-1 | Testing Contract | `cargo test --release` 0 failed | 113 passed (36 unit, 77 integration), 0 failed | IT-1 | build-and-test | Met |
| TC-2 | Testing Contract | `npm run test:unit` 0 failed | 360 passed in 30 files | IT-2 | build-and-test | Met |
| TC-3 | Testing Contract | `npm run test:pbt` 0 failed | 37 passed in 6 files | IT-3 | build-and-test | Met |
| TC-4 | Testing Contract | `npx astro check` 0 errors | 0 errors, 0 warnings, 7 hints in 189 files | Q3 | build-and-test | Met |
| TC-5 | Testing Contract | `just crossunit` passes | the link sweep finds the fixture's deliberately broken image link (exit 1); the no-JS half passes 8 of 8 on its own | IT-5a, IT-5b | build-and-test | Not Met |
| TC-6 | Testing Contract, NFR7, FR6.4 | Playwright checks and `npm run test:e2e` pass | the HIG suite passes (905, 0 failed, 55 deliberate skips). `test:e2e` passes 6 of 6 automated spec files, then stops at `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` for digest `be3fa9c6…48ed9d` | IT-4, IT-6 | build-and-test (the maintainer's review; no later stage owns it) | Unverified |
| TC-7 | Testing Contract, NFR1 | 0 axe violations, 4 widths × 2 appearances, reduced motion | every C-01 axe cell passes in Chromium, Firefox and WebKit | IT-4 (`hig-chrome.spec.ts`) | build-and-test | Met |
| TC-8 | Testing Contract | a coverage figure is reported | no coverage provider is installed, so no figure | Coverage Report | build-and-test | Unverified |
| TC-9 | Testing Contract: `tdd` | a failing test before each behaviour | every behaviour now has a test seen failing without it and passing with it. Steps 39–50 recorded Red before Green. The first attempt's three gaps were closed by setting the implementation aside: Step 31, the `8e1dce2` fold (Step 48) and the `ea2993b` tracing (Step 49). For those three the commits put the code before the test | `code-summary.md`, `review-02.md` | build-and-test | Met |
| TC-10 | scope floor (`bugfix`) | a regression test per defect fixed | the font defect has `hig-built-assets.test.ts`, and the Mermaid fix (`a029615`) has three tests that failed first (R0). Each repair defect has a test that failed first. The Mermaid tests cover the arguments, not the call in `render_mermaid` that uses them (R-20) | IT-1, R0, `code-summary.md` | build-and-test | Met |
| TC-11 | team.md Code Style | `cargo fmt --check` clean | clean | Q1 | build-and-test | Met |
| TC-12 | AC7.1 | `npm run format:check` passes | passes | Q2 | build-and-test | Met |
| NFR1-b | NFR1 | text 4.5:1, including on materials | every pair a fixture page renders passes. A link inside a highlight falls short, measured in 3 engines with the state set up on the page: **4.07–4.33:1** in light mode on callout and table-header grounds, **4.27:1** in dark mode on the table header, and **1.73:1** in dark mode in the homepage note, which loads no highlight style (R-17) | U1, IT-4, Highlighted Links | build-and-test | Not Met |
| NFR1-c | NFR1 | UI components 3:1 | the selected segment's ring is 3.81–6.56:1 against its track (R-05 resolved). Control borders are 3.25–6.44:1. The reading-progress line and the graph edges are treated as decorative and are not recorded as exempt (R-21) | U1, IT-4 | build-and-test | Met |
| NFR1-d | NFR1 | keyboard operation, visible focus | the keyboard paths pass, with a global 2 px `:focus-visible` ring. The automated ring check still reads only `outline-color` (R-19), and forced-colors mode loses some marks (R-13) | IT-4, review | build-and-test | Met |
| NFR1-e | NFR1 | 200% text, no loss of content | the closed page passes at 320 px with text doubled on 14 routes in 3 engines, now with clipping measured, and at six widths in both appearances. The open search dialog cuts every result snippet off on one line, in 3 engines and at every width. The navigation sheet, both outline tabs and the graph list pass | IT-4, IT-8 | build-and-test | Not Met |
| NFR2-a | NFR2 | LCP < 2,500 ms on 4 pages, mobile profile | 1,584–1,744 ms median and 1,760 ms worst on all six pages; the diagrams post went from 3,508 to 1,696 ms | PT-3, IT-4 | build-and-test | Met |
| NFR2-b | NFR2 | CLS < 0.1; fonts add no shift | worst 0.0087 (`/graph`); 0 on `/`, the diagrams post and `/resume` | PT-3, IT-4 | build-and-test | Met |
| NFR2-c | NFR2 | INP < 200 ms | worst 72 ms over the scripted interactions | PT-3 | build-and-test | Met |
| NFR2-d | NFR2 | TBT < 200 ms | worst 66 ms (PT-3); the CPU-only spec also passes | PT-3, IT-4 | build-and-test | Met |
| NFR2-e | NFR2 | blog CSS ≤ 30,720 B gzip | the "blog CSS budget" test passes; 27,570 B peak (26,969 B at Step 31) | IT-4, CSS budget figures | build-and-test | Met |
| NFR2-f | NFR2 | profile CSS ≤ 24,576 B gzip | the "profile CSS budget" test passes in 3 engines; 4,489 B | IT-4, CSS budget figures | build-and-test | Met |
| NFR3 | NFR3 | Chromium, Firefox and WebKit pass | all three pass (905 passed, 0 failed); real Safari, iOS and Edge were not run | IT-4 | build-and-test | Met |
| NFR4 | NFR4 | no third-party request; self-hosted fonts and KaTeX | ST-1 and ST-2 pass; fonts and KaTeX are served from the site (KaTeX resolves by hoisting, R-01) | IT-4, ST-1, ST-2 | build-and-test | Met |
| NFR5-a | NFR5 | changed frontend files < 800 lines | the largest `site/src` file changed beyond formatting is `post.css` at 456 lines. Every changed file over 800 lines was larger before the work and shrank. Two had real changes: `asset-budget.mjs` (1,730 → 1,604) and `profile-tooling.test.ts` (1,646 → 1,505). Fourteen others changed only through Prettier (`54e48ea`) | `git diff 7896636 204066f`, `wc -l` | build-and-test | Met |
| NFR5-b | NFR5 | `--c-` colors; motion on transform and opacity only | the repair added four `--c-` tokens and no transition or animation. Every `var()` in `site/src` resolves, except Shiki's own `--shiki-light` and `--shiki-dark`, which the highlighter sets on each element | `git diff aeb36cc 204066f`, token scan | build-and-test | Met |
| NFR6 | NFR6 | no commit made unreachable by FR1.5/FR1.6; no change lost | only `develop` (`204066f`) and `main` (`23e08e6`) and one worktree remain. The repair's six branches merged with `--no-ff` and were deleted with `-d`. `origin/develop` `5df7e25` and `origin/main` `23e08e6` are unchanged | git | build-and-test | Met |
| SEC-1 | `security-test-instructions.md` ST-5 | no high or critical advisory | 27 advisories (1 critical, 18 high), identical to run 1 and to before this work | Dependency Audit | build-and-test | Not Met |

**Totals:** 28 targets: 22 Met, 4 Not Met, 2 Unverified. Run 1 was 18 Met, 7 Not Met and 3 Unverified.

### Failure Handling

**Failure predicate met.**
- Three commands failed: `just crossunit`, `npm run test:e2e` and `npm audit`. The IT-8 scratch check also failed.
- Four targets are Not Met: TC-5, NFR1-b, NFR1-e and SEC-1.
- Two are Unverified: TC-6 and TC-8.

**Rung 1, in-stage fixes: none attempted.** TC-5, TC-6 and TC-8 still need the maintainer, as in run 1. The two new causes are in generated code, not in this stage's scaffolding.

**Rung 2, classification.**

- **Root causes in the generated source:**
  - **NFR1-b.** `.post-content mark` (`post.css:82–87`) uses `--c-mark-fill`, which Step 43 tuned only over `--c-bg`. A link inside a highlight falls to 4.07–4.33:1 on light callout and table-header grounds and to 4.27:1 on the dark table header. The rule ships only with the post pages, so the homepage note keeps the browser's yellow `mark`, where a dark-mode link reaches 1.73:1 (R-17).
  - **NFR1-e.** `.search-option-snippet` (`search.css:172–178`) is one non-wrapping line clipped with an ellipsis. The open search dialog cuts every snippet off at 200% text and at every width, and the suite never measures that dialog (R-18).
- **Candidate fix:** one more Code Generation loop-back, test-first, each item on its own branch off `develop`:
  1. **Highlighted links.**
     - Tests first: add the highlighted-link pairs over the page, table-header and every callout ground to `hig-tokens.test.ts`. Add a browser check that sets up a highlighted link in a callout, a table header and the homepage note, in both appearances. Both fail first.
     - Then bring every pair to 4.5:1, for example by coloring a link inside a highlight `--c-tint-hover`, which reaches at least 5.37:1 on every highlight ground.
     - Give the homepage note the same `mark` rule, and correct the comment at `post.css:81`.
  2. **Open-state overflow.**
     - Tests first: extend the C-14 check (200% text at 320 px, three engines) and the AC4.1 matrix (six widths, two appearances) to the open search dialog with results, the navigation sheet, both outline-sheet tabs and the `/graph` list. Also assert each route's HTTP status (R-18). The new checks fail first on the snippet.
     - Then let the snippet wrap to at most two lines with `overflow-wrap: anywhere`, as Step 46 did for `.grouped-row-summary`.
- **Estimated impact:**
  - **Effort:** about 1–2 hours of build time, plus a fresh Build and Test run of about 30 minutes.
  - **Financial cost:** none beyond build time; no new dependency or service.
  - **Risk:** low.
    - The code change is small: a few style rules in `post.css`, wherever the homepage note's highlight style lands, and `search.css`.
    - Search results grow to two snippet lines, so fewer fit on a phone screen at once. This departs from the refined mockup's one-line snippet.
    - The accessibility review digest changes again only if the fix touches a review-subject file, such as `tokens.css` or `global.css`.
    - The wider overflow checks measure states never measured before and may find more cut-off content, which would lengthen the repair.
- **Not a code root cause, unchanged since run 1:**
  - TC-5: the fixture's deliberately broken link.
  - TC-6: the maintainer's 16-state review.
  - TC-8: a coverage provider is a dependency decision.
  - SEC-1: pre-existing advisories that need a dependency refresh of their own.

**Rung 3, autonomous loop-back: does not apply.** Construction Autonomy Mode is not set.

**Rung 4, halt and ask: presented to the maintainer.** Loop-backs used: 1 of 3. The maintainer chose **Retry with fix**, which became loop-back 2 (see the Loop-Back Log).

## Run 1 (before loop-back 1)

### Run

- **When and where:** 2026-10-20, 11:00–11:15 UTC, on the build host (macOS 27.0.1). The checkout was `develop` at `aeb36cc`, the state Code Generation finished in, and the build used the fixture vault.
- **What ran:** every command in `build-instructions.md`, `integration-test-instructions.md`, `performance-test-instructions.md` and `security-test-instructions.md`. The redesign's scoped unit and browser commands come from `unit-test-instructions.md` (Code Generation, recorded in `code-summary.md`).
- **How the exit codes were read:** the runner piped most commands through `tail`, so its own `exit:` lines show `tail`'s status. Each command's real status below comes from its own output. The two non-zero results are `just crossunit`, which printed `recipe crossunit failed ... exit code 1`, and `npm run test:e2e`, which printed `CLI_COMMAND_FAILED`.
- **Side effects:** `git status` afterwards showed no change to any tracked file under `site/`, `preprocessor/` or `fixtures/`. Every run wrote only gitignored build and evidence output.

### Build Status

| ID | Command | Result |
|---|---|---|
| B1 | `cargo build --release --manifest-path preprocessor/Cargo.toml` | success in 13.5 s |
| B2 | `./preprocessor/target/release/obsidian-press ./fixtures/vault ./content` | success: 14 posts and 1 homepage artifact. Two expected fixture warnings: `attachment not found: nonexistent-image.png` and `heading 'Nonexistent Heading' not found in 'Simple Post'` |
| B3 | copy the four JSON files into `site/public/` | success |
| B4 | `node scripts/crossunit/ensure-fixture-content.mjs` | success ("homepage artifact present") |
| B5 | `npx astro build` | success: 34 pages in 4.79 s; "verified private profile approval boundary" |
| B6 | `npx astro build`, rebuilt before the performance run | success |

**Build: SUCCESS.**

### Test Results

| ID | Command | Total | Passed | Failed | Skipped | Result |
|---|---|---|---|---|---|---|
| Q1 | `cargo fmt --check` | — | — | — | — | clean |
| Q2 | `npm run format:check` | — | — | — | — | "All matched files use Prettier code style!" |
| Q3 / IT-7 | `npx astro check` | 187 files | — | 0 errors | — | 0 errors, 0 warnings, 7 hints |
| U1 | `npx vitest run tests/unit/hig-tokens.test.ts tests/unit/appearance.test.ts tests/unit/render-sections.test.ts tests/unit/search-keys.test.ts` | 26 | 26 | 0 | 0 | pass (4 files) |
| U2 | `npx vitest run tests/unit/hig-built-html.test.ts tests/unit/hig-built-assets.test.ts` | 8 | 8 | 0 | 0 | pass (2 files) |
| IT-1 | `cargo test --release` | 110 | 110 | 0 | 0 | pass: 33 unit tests and 77 integration tests in 16 files |
| IT-2 | `npm run test:unit` | 348 | 348 | 0 | 0 | pass (29 files) |
| IT-3 | `npm run test:pbt` | 37 | 37 | 0 | 0 | pass (6 files) |
| IT-4 | `npx playwright test --config playwright.hig.config.ts` | 861 | 846 | 0 | 15 | pass in 3.9 min (Chromium, Firefox, WebKit) |
| IT-5a | `just crossunit`, link sweep | 34 pages | — | 1 broken link | — | **FAIL, exit 1** |
| IT-5b | `npx playwright test --config playwright.crossunit.config.ts`, the recipe's second half run on its own | 8 | 8 | 0 | 0 | pass |
| IT-6 | `npm run test:e2e` | 6 spec files | 6 | 0 | 0 | **FAIL, non-zero exit**: the automated browser evidence passed, then the run stopped at the manual record |

The 15 IT-4 skips are the deliberate ones in `code-summary.md`:
- 2 reduced-transparency tests outside Chromium;
- 1 Firefox touch test;
- 12 Chromium-only performance tests, which skip in Firefox and WebKit.

### Failure Details

**IT-5a, `just crossunit` link sweep.**

```text
link-sweep: /posts/post-with-image/index.html -> /assets/nonexistent-image.png has no emitted target
link-sweep: 1 broken internal link(s) across 34 pages
error: recipe `crossunit` failed on line 51 with exit code 1
```

- The broken link comes from the fixture vault's deliberately missing image (`fixtures/vault/Post With Image.md`, present since March).
- The recipe chains its two halves with `&&`, so the JavaScript-off smoke test did not run. Run on its own (IT-5b), it passed 8 of 8.
- On the fixture vault this command cannot pass. A real-content build was not made here, because that needs the vault (see the halt-and-ask below).

**IT-6, `npm run test:e2e`.**

```text
{"name":"VerificationProviderError","errorCode":"MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE","stage":"verification.compose","rule":"LC-U1-18/LC-U1-19", ... "details":{"reviewSubjectDigest":"4b45fd8f0a243c942fcda10e7b1228d8f6fc5aecb754bd07456c25bc4bb37e47"}}
CLI_COMMAND_FAILED: The routed command exited non-zero.
```

- `site/.artifacts/profile/verification/browser-evidence.json` (written 20:06 local time) records `result: "pass"` and `{"discovered":6,"passed":6,"failed":0}`, across profile routes, responsive, accessibility, cross-browser, print and resources.
- The run then stops where the plan expects: the maintainer's 16-state record (FR6.4) does not exist yet for digest `4b45fd8f…37e47`.

### Coverage Report

No coverage figure could be produced. The site has no Vitest coverage provider installed (`site/node_modules/@vitest/` holds no `coverage-v8` or `coverage-istanbul`), and the team reports coverage without a minimum. Producing a figure needs `@vitest/coverage-v8` at the version matching Vitest 4.1.10 in `site/package.json`'s dev dependencies, then `npx vitest run --coverage`. `site/package.json` is a file the accessibility review covers, so adding it changes the review digest.

### Performance (PT-3)

**How the run was set up.**

- **Script:** `/private/tmp/claude-501/-Users-revenantonthemission-Projects-obsidian-blog/2a53a821-c6d3-4f56-935f-36069a2a8404/scratchpad/pt3-mobile-profile.mjs`. Its raw output is in `pt3-result.json` in the same folder.
- **Target:** the fixture build (B6), served by `site/scripts/local-server.mjs` on 127.0.0.1:4391.
- **Browser profile:** Chromium at 412 × 823 and DPR 1.75, with touch.
- **Throttling:** 4× CPU, plus Lighthouse's DevTools mobile network profile: 562.5 ms request latency, 1,474.56 kbps down, 675 kbps up.
- **Sampling:** each page loaded three times in a fresh context with a cold cache. The table shows the median, with the worst run in parentheses.
- **INP:** taken from the Event Timing API, as the longest interaction across that page's scripted interactions.

| Page | LCP ms | CLS | TBT ms | INP ms | Interactions |
|---|---|---|---|---|---|
| `/` | 1,640 (1,648) | 0 (0) | 0 (0) | 40 (56) | appearance button, search open and typing |
| `/posts/post-with-diagrams` | **3,508 (3,516)** | 0.0832 (0.0832) | 0 (0) | 48 (48) | outline open and close (no fold toggle in view) |
| `/posts/post-with-math` | 1,728 (1,736) | 0.0001 (0.0001) | 26 (30) | 40 (48) | outline open and close |
| `/posts/post-with-code` | 1,756 (1,760) | 0.0025 (0.0025) | 42 (43) | 32 (48) | heading fold, outline open and close |
| `/graph` | 1,596 (1,604) | 0.0087 (0.0087) | 0 (0) | 40 (48) | list view, then graph view and a legend chip |
| `/resume` | 1,640 (1,652) | 0 (0) | 0 (0) | 48 (48) | disclosure, appearance button |

**Diagnosis of the diagrams post.** A follow-up run of `pt3-diagnose.mjs` (same folder) found the following:

- **The LCP element is the first d2 diagram,** `img.diagram.diagram-d2.diagram-light` (`/assets/post-with-diagrams-d2-1-light.svg`, 6.8 kB). It finished loading at 3,312 ms.
- **Why it loads late:**
  - `rehypeImageCaption()` in `site/src/lib/render.ts:87` marks every content image `loading="lazy"`. This rule predates the work: it is `render.ts:63` at `7896636`.
  - Lazy loading makes the in-view diagrams start only after layout, at 1,646 ms. They then queue behind five Pretendard subsets (about 25 kB each) and the island modules, under 562.5 ms of latency per request.
  - Both theme variants of every diagram download, although one is hidden by opacity.
- **What shifts the layout:** the diagram `<img>` elements have no `width` or `height`. When they arrive at about 3.3 s they push `.post-after` and a paragraph down by 129 px and then 65 px, for a CLS of 0.0648 + 0.0184.
- **The other pages are not affected:**
  - Their LCP is text at 1.6–1.8 s, and the font swap adds no shift (CLS 0 on `/` and `/resume`).
  - On the code post, the late code-block bar that review finding R-06 predicted shifts the next heading by 0.0025.

### Dependency Audit (ST-5)

`cd site && npm audit --omit=dev` found 27 advisories: 1 critical, 18 high, 2 moderate and 6 low.

- **Critical:** `astro` 6.1.5 (direct). The advisories include XSS through `define:vars` sanitization, server-island parameter replay, and unescaped spread attribute names.
- **High:**
  - `vite` 7.3.2 (direct; the fix is 7.3.7, outside Astro's stated range);
  - `@astrojs/markdown-remark`, `browserslist`, `css-tree`, `csso`, `devalue`, `fast-xml-builder`, `fast-xml-parser`, `http-cache-semantics`, `js-yaml`, `magicast`, `nanoid`, `postcss`, `sharp`, `smol-toml`, `source-map-js`, `svgo` and `unifont`.

The same audit on the lockfile from before this work (`7896636`, run with `--package-lock-only` in the scratchpad) gives the same 27 advisories in the same packages. The work introduced none.

- **Who is exposed:** these are build-time packages for a static site. Readers receive only the built HTML, CSS and JS.
- **Fix:** `npm audit fix` can update Astro within its range. That is a dependency refresh in `site/package.json` and `site/package-lock.json`, outside this redesign.

### Security

| ID | Result | Evidence |
|---|---|---|
| ST-1 | pass | "third parties (NFR4)" in `hig-performance.spec.ts` passed in IT-4: no cross-origin request on any route |
| ST-2 | pass | the first-visit test in `hig-appearance.spec.ts` passed in IT-4: no geolocation call and no sunrise service request |
| ST-3 | pass | the secret pattern scan of `site/src`, `site/scripts`, `site/tests` and `preprocessor/src` at `aeb36cc` found nothing (`git grep` exit 1) |
| ST-4 | pass | the only HTML injection points are 16 `set:html` sites. 13 receive Lucide icon constants (`decorativeIcon`, the HubNav separator). `PostLayout.astro:93` and `index.astro:47` receive vault HTML, which a recorded SECURITY comment trusts. `BaseLayout.astro:105` receives JSON-LD payloads that `json-ld.ts` serializes, escapes for the script context and checks for unsafe patterns. `site/src` has no `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `dangerouslySetInnerHTML` |
| ST-5 | **fail (pre-existing)** | 27 advisories (1 critical, 18 high) in production dependencies, identical before this work; see Dependency Audit |
| ST-6 | partial | `GraphView.tsx` (`parseGraphData`), `Search.tsx` (`prepareSearchIndex`) and `link-preview.ts` (`toEntry`) validate their payloads. `NavTree.tsx:28` casts `/nav-tree.json` without validation (R-14, accepted as a risk). The file is first-party build output |

### Target Verification Matrix (run 1)

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-1 | Testing Contract | `cargo test --release` 0 failed | 110 passed, 0 failed | IT-1 | build-and-test | Met |
| TC-2 | Testing Contract | `npm run test:unit` 0 failed | 348 passed in 29 files | IT-2 | build-and-test | Met |
| TC-3 | Testing Contract | `npm run test:pbt` 0 failed | 37 passed in 6 files | IT-3 | build-and-test | Met |
| TC-4 | Testing Contract | `npx astro check` 0 errors | 0 errors, 0 warnings, 7 hints in 187 files | Q3 | build-and-test | Met |
| TC-5 | Testing Contract | `just crossunit` passes | the link sweep finds the fixture's deliberately broken image link (exit 1); the no-JS half passes 8 of 8 on its own | IT-5a, IT-5b | build-and-test | Not Met |
| TC-6 | Testing Contract, NFR7, FR6.4 | Playwright checks and `npm run test:e2e` pass | the HIG suite passes (846, 0 failed, 15 deliberate skips); `test:e2e` passes 6 of 6 automated spec files, then stops at `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` | IT-4, IT-6 | build-and-test (the maintainer's review; no later stage owns it) | Unverified |
| TC-7 | Testing Contract, NFR1 | 0 axe violations, 4 widths × 2 appearances, reduced motion | every C-01 axe cell passes in Chromium, Firefox and WebKit | IT-4 (`hig-chrome.spec.ts`) | build-and-test | Met |
| TC-8 | Testing Contract | a coverage figure is reported | no coverage provider is installed, so no figure | Coverage Report | build-and-test | Unverified |
| TC-9 | Testing Contract: `tdd` | a failing test before each behaviour | Red was recorded before Green for Steps 10–35 and the font fix. Three exceptions: Step 31's Red was reproduced after the implementation (disclosed); commit `8e1dce2` changed behaviour (a ResizeObserver) with no test (R-09); the `ea2993b` asset-budget tracing tests have no recorded Red (R-09) | `code-summary.md`, `review-01.md` | build-and-test | Not Met |
| TC-10 | scope floor (`bugfix`) | a regression test per defect fixed | the font defect has `hig-built-assets.test.ts` (failed first). The Mermaid puppeteer-config fix (`a029615`) has no regression test: Rust tests are still 110, and the cherry-pick touched only `mermaid.rs` | IT-1, `code-summary.md` | build-and-test | Not Met |
| TC-11 | team.md Code Style | `cargo fmt --check` clean | clean | Q1 | build-and-test | Met |
| TC-12 | AC7.1 | `npm run format:check` passes | passes | Q2 | build-and-test | Met |
| NFR1-b | NFR1 | text 4.5:1, including on materials | every token pair in `hig-tokens.test.ts` passes, including worst-case glass. The selected search snippet is 3.81:1 in dark mode over bright content; highlighted code lines and a link inside a highlight are under 4.5:1 but not yet rendered on any page (R-12) | U1, `review-01.md` R-12 | build-and-test | Not Met |
| NFR1-c | NFR1 | UI components 3:1 | control borders are 3.25–6.44:1. The selected segment in dark mode is 1.01:1 against its track, on `/graph`, the local graph and the profile navigation (R-05) | U1, R-05 | build-and-test | Not Met |
| NFR1-d | NFR1 | keyboard operation, visible focus | the keyboard paths pass (C-05). A global 2 px `:focus-visible` ring, plus a `--c-text` ring on glass, is in `base.css` and `chrome.css`. The automated ring check reads only `outline-color` (R-08), and forced-colors mode loses some marks (R-13) | IT-4, review | build-and-test | Met |
| NFR1-e | NFR1 | 200% text, no loss of content | no horizontal overflow at 320 px on 14 routes in 3 engines (C-14). Clipping inside `overflow: hidden` containers is never measured (R-08), and other widths are not checked | IT-4, R-08 | build-and-test | Unverified |
| NFR2-a | NFR2 | LCP < 2,500 ms on 4 pages, mobile profile | 1,596–1,756 ms on `/`, `/graph`, `/resume` and the math and code posts; **3,508 ms** on `/posts/post-with-diagrams` (its LCP is a lazy-loaded diagram) | PT-3 | build-and-test | Not Met |
| NFR2-b | NFR2 | CLS < 0.1; fonts add no shift | worst 0.0832 (unsized diagram images on the diagrams post); 0 on `/` and `/resume` | PT-3 | build-and-test | Met |
| NFR2-c | NFR2 | INP < 200 ms | worst 56 ms over the scripted interactions | PT-3 | build-and-test | Met |
| NFR2-d | NFR2 | TBT < 200 ms | worst 43 ms (PT-3); the CPU-only spec also passes | PT-3, IT-4 | build-and-test | Met |
| NFR2-e | NFR2 | blog CSS ≤ 30,720 B gzip | the "blog CSS budget" test passes (26,969 B peak at Step 31) | IT-4 | build-and-test | Met |
| NFR2-f | NFR2 | profile CSS ≤ 24,576 B gzip | the "profile CSS budget" test passes in 3 engines (4,487 B) | IT-4 | build-and-test | Met |
| NFR3 | NFR3 | Chromium, Firefox and WebKit pass | all three pass (846 passed, 0 failed); real Safari, iOS and Edge were not run | IT-4 | build-and-test | Met |
| NFR4 | NFR4 | no third-party request; self-hosted fonts and KaTeX | ST-1 and ST-2 pass; fonts and KaTeX are served from the site (KaTeX resolves by hoisting, R-01) | IT-4, ST-1, ST-2 | build-and-test | Met |
| NFR5-a | NFR5 | changed frontend files < 800 lines | the largest changed `site/src` file is `post.css` at 451 lines. Two changed tooling and test files were over 800 lines before and shrank (`profile-tooling.test.ts` 1,646 → 1,505; `asset-budget.mjs` 1,730 → 1,604) | `wc -l` | build-and-test | Met |
| NFR5-b | NFR5 | `--c-` colors; motion on transform and opacity only | every `var(--…)` is defined and no retired token is read; every CSS transition and keyframe animates transform or opacity. Canvas graph motion is FR2.6's concern (R-02) | panel evidence, `review-01.md` | build-and-test | Met |
| NFR6 | NFR6 | no commit made unreachable by FR1.5/FR1.6; no change lost | worktrees were checked clean before removal; 30 safe deletes, none refused; the only forced delete was the FR1.2 scaffolding branch, tip recorded; origin refs unchanged | cleanup report in `code-summary.md`, git | build-and-test | Met |
| SEC-1 | `security-test-instructions.md` ST-5 | no high or critical advisory | 27 advisories (1 critical, 18 high), identical to before this work | Dependency Audit | build-and-test | Not Met |

### Failure Handling

**Failure predicate met.**
- Three commands failed: `just crossunit`, `npm run test:e2e` and `npm audit`.
- Seven targets are Not Met: TC-5, TC-9, TC-10, NFR1-b, NFR1-c, NFR2-a and SEC-1.
- Three are Unverified: TC-6, TC-8 and NFR1-e.

**Rung 1, in-stage fixes: none attempted.** The candidates inside this stage's remit all need the maintainer:

| Target | Possible fix | Why it waits for the maintainer |
|---|---|---|
| TC-8 | add a coverage provider | it is a dev dependency in `site/package.json`, a review-subject file, and needs its own branch |
| TC-5 | run the link sweep on a real-content build | it reads the vault; this work has used only the fixture vault |
| TC-6 | none | it needs the maintainer's own 16-state review |

**Rung 2, classification.**

- **Root causes in the generated source and tests:**
  - NFR2-a: `render.ts` lazy-loads and leaves unsized the in-view diagram images.
  - NFR1-b and NFR1-c: token pairs (R-05, R-12).
  - NFR1-e: the overflow helper's clipping blind spot (R-08).
  - TC-9 and TC-10: missing tests (R-09, the Mermaid fix).
- **Candidate fix:** a Code Generation loop-back with a repair plan covering those six targets. Estimated impact:
  - **Effort:** about 3–5 hours of build time, including a fresh Build and Test run.
  - **Financial cost:** no new dependency or service; build time only.
  - **Risk:** low to medium.
    - `render.ts` renders every post.
    - The token and profile files are review subjects, so the accessibility digest changes again before the maintainer's first review.
    - A stronger clipping check may surface new defects and lengthen the repair.
    - A change that reaches print styles would need a fresh PDF `--prepare`.
- **Not a code root cause:**
  - TC-5: the fixture's deliberate negative.
  - TC-6: the maintainer's review.
  - SEC-1: pre-existing advisories that need a dependency refresh of its own.

  These stay failed after a retry unless the maintainer acts.

**Rung 3, autonomous loop-back: does not apply.** Construction Autonomy Mode is not set.

**Rung 4, halt and ask: presented to the maintainer.** Loop-backs used: 0 of 3. The maintainer chose **Retry with fix**.

## Loop-Back Log

### Loop-back 1 — 2026-10-20T11:17:56Z

**Diagnosis.** Six failed targets have root causes in what Code Generation produced:

| Target | Cause |
|---|---|
| NFR2-a | `site/src/lib/render.ts` (`rehypeImageCaption`) marks every content image `loading="lazy"` and gives none a size. On `/posts/post-with-diagrams` the first diagram, which is the LCP element, starts loading only after layout. Under the mobile profile it paints at 3,508 ms, and its arrival shifts the page (CLS 0.0832). |
| NFR1-c | The selected segment's `--c-surface` pill sits on a `--c-fill` track at 1.01:1 in dark mode (R-05). |
| NFR1-b | The selected search option's secondary-text snippet is 3.81:1 on thick glass in dark mode over bright content. Highlighted code lines and links inside highlights are under 4.5:1 (R-12). |
| NFR1-e | The overflow helper (`site/tests/e2e/support/hig.ts`) treats `overflow: hidden` and `clip` ancestors as scrollers, so clipped text is never detected, and it runs at 320 px only (R-08, AC4.1). |
| TC-9 | The `8e1dce2` ResizeObserver behaviour (folding moves the current outline mark) has no test. The `ea2993b` inline-sheet tracing tests have no recorded Red (R-09). |
| TC-10 | The Mermaid puppeteer-config fix (`a029615`) has no regression test. |

**Root-cause stage.** Code Generation, which is zero-Unit work, so the whole stage reopens.

**Planned fix.** A repair phase added to `code-generation-plan.md` and built test-first, each item on its own branch off `develop`:
1. Size content and diagram images at build time from the SVG `viewBox` or the file's dimensions. Load the first in-view diagram pair eagerly. Extend `hig-performance.spec.ts` with a mobile-network LCP and CLS check that fails first.
2. Give the selected segment a dark value that stands off its track, and fix the selected search snippet and the latent highlight pairs. Add every pair to `hig-tokens.test.ts` first.
3. Make the overflow helper report content clipped by `hidden` or `clip` containers, and run the overflow check at 320, 375, 768, 1024, 1440 and 1920 px in both appearances (AC4.1). Fix whatever it then finds.
4. Add the missing tests: folding a section moves `aria-current` without scrolling; the inline-sheet tracing Red, shown failing against the old resolver; and a Rust test that `mmdc` receives `-p` when `.puppeteer-config.json` exists.

**Estimated impact.**
- **Effort:** about 3–5 hours of build time, plus a fresh Build and Test run.
- **Financial cost:** none beyond build time (no new dependency or service).
- **Risk:** low to medium.
  - `render.ts` renders every post.
  - The token and profile stylesheets are accessibility-review subjects, so the review digest changes again before the maintainer's first review.
  - The stronger overflow check may surface new defects and lengthen the repair.
  - A change that reaches print styles would need a fresh PDF `--prepare`.

**Not addressed by this loop-back:**
- TC-5: the fixture's deliberately broken link.
- TC-6: the maintainer's 16-state review.
- TC-8: the coverage provider is a dependency decision.
- SEC-1: a separate dependency refresh.

These stay open after the retry.

### Loop-back 2 — 2026-10-20T14:43:01Z

**Diagnosis.** Run 2 met 22 of 28 targets. Two of the six it missed have causes in what Code Generation produced:

| Target | Cause |
|---|---|
| NFR1-b | `.post-content mark` (`site/src/styles/post.css:82–87`) uses `--c-mark-fill`, which Step 43 tuned only over `--c-bg`. A `--c-tint` link inside a highlight reaches only 4.07–4.33:1 on light callout and table-header grounds and 4.27:1 on the dark table header. The rule ships only in the post pages' stylesheet, so the homepage note keeps the browser's yellow `mark`, where a dark-mode link reaches 1.73:1. All three engines give the same values (R-17). |
| NFR1-e | `.search-option-snippet` (`site/src/styles/search.css:172–178`) is one non-wrapping line clipped with an ellipsis. The open search dialog cuts every result snippet off at 200% text in three engines and at all six widths. The suite's overflow checks load every route with its dialogs closed, so they never measured it (R-18). |

**Root-cause stage.** Code Generation, which is zero-Unit work, so the whole stage reopens.

**Planned fix.** A second repair phase added to `code-generation-plan.md` and built test-first, each item on its own branch off `develop`:
1. **Highlighted links.**
   - Tests first: add the highlighted-link pairs over the page, table-header and every callout ground to `hig-tokens.test.ts`. Add a browser check that sets up a highlighted link in a callout, a table header and the homepage note, in light and dark, in all three engines. Both fail first.
   - Then bring every such link to at least 4.5:1, for example by coloring a link inside a highlight `--c-tint-hover` (at least 5.37:1 on every highlight ground).
   - Give the homepage note the same `mark` rule, and correct the comment at `post.css:81`.
2. **Open-state overflow.**
   - Tests first: extend the C-14 check (200% text at 320 px, three engines) and the AC4.1 matrix (six widths, two appearances) to the open search dialog with results, the navigation sheet, both outline-sheet tabs and the `/graph` list. Also assert each route's HTTP status (R-18). The new checks fail first on the search snippet.
   - Then let the snippet wrap to at most two lines with `overflow-wrap: anywhere`, as Step 46 did for `.grouped-row-summary`, and fix anything else the wider checks find.

**Estimated impact.**
- **Effort:** about 1–2 hours of build time, plus a fresh Build and Test run of about 30 minutes.
- **Financial cost:** none beyond build time; no new dependency or service.
- **Risk:** low.
  - The code change is a few style rules: in `post.css`, wherever the homepage note's highlight style lands, and in `search.css`.
  - Search results grow to two snippet lines, so fewer fit on a phone screen at once. This departs from the refined mockup's one-line snippet, and the maintainer accepted that by choosing this retry.
  - The accessibility review digest changes again only if the fix touches a review-subject file, such as `tokens.css` or `global.css`.
  - The wider overflow checks measure states never measured before and may find more cut-off content, which would lengthen the repair.

**Not addressed by this loop-back:**
- TC-5: the fixture's deliberately broken link.
- TC-6: the maintainer's 16-state review.
- TC-8: the coverage provider is a dependency decision.
- SEC-1: a separate dependency refresh.
- The accepted review findings that fail no target, including R-16 (the lead image's eager loading).

These stay open after the retry.
