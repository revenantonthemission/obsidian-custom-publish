# Build and Test Summary — `261115-personal-website`

## Overall status

This is the fifth Build and Test run (run 5), the retry the maintainer approved at the run 4 gate. Runs 1–4 are summarised in `test-results.md` under "Run history" and `## Loop-Back Log`. Run 5's evidence is in `test-results.md` → `## Run 5` (sections R5.1–R5.8).

| Item | Status |
|---|---|
| Assembled project | `fix/close-open-build-and-test-targets`, head `8d19fde`, off `develop` = `5cecf58`: the four units merged into `develop` (`c8a64f1` U1, `2637157` U2, `8982bfe` U4, `5cecf58` U3), plus this branch's seven commits (two new test files and five artifact corrections). No product file changed since run 4's head `0b01712` |
| Build | **Success**: `just preprocess` (exit 0) and the HIG fixture build `npx astro build` (exit 0; `dist/_astro` holds 176 files, `_redirects.json` with 12 rules) |
| Recorded verification command | **Passes in every part** on this head: cargo fmt; 179 Rust tests; 588 unit tests in 51 files; 36 properties; Prettier; `astro check` (0 errors, 0 warnings); HIG 1,242 passed, 81 skipped, 0 failed in Chromium, Firefox and WebKit; crossunit 16/16 with JavaScript off in Chromium. The command does not include `npm run test:e2e` (delivery-planning's recorded decision, because the manual record is invalid by design until the end-of-release review) |
| Commands that failed | 1: `npm run test:e2e` (`MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`; the manual 16-state record is stale, digest `3d578e5b…`) |
| Targets | 92: **87 Met, 1 Not Met, 3 Unverified, 1 N/A** (run 4: 79 / 6 / 6 / 1; run 3: 78 / 7 / 6 / 1; run 2: 76 / 9 / 6 / 1; run 1: 73 / 11 / 6 / 1 of 91) |
| Stage result | **Failed** under the failure predicate (one failed command; Not Met and Unverified targets). 8 of run 4's 12 open targets moved to Met: TC-SF-COV80, TEAM-RUST-COV, U1-CG-R04, U2-NFR1.8, U2-AC3.4.1, U4-NFR1.11, U4-NFR6.11 and U4-PD-ROOT-BYTES. 4 stay open: TEAM-E2E-A11Y (Not Met), U1-NFR6.1, U1-SLO-NIGHTLY and U1-SLO-PAGECOUNT (Unverified). The classification is in `test-results.md` R5.8. No code-level test gap remains that a code-generation loop-back could close, and the loop-back bound is exhausted at 3/3. |

Prerequisites: Rust (edition 2024), Node `^22.22.0 || >=24.0.0`, npm, `just`, and Playwright 1.61.1 browsers; see `build-instructions.md`.

## Test type inventory

| Type | Generated here | Where it runs | Status |
|---|---|---|---|
| Unit (Rust) | per unit in Code Generation | `cargo test --release` | 179 pass |
| Unit + integration (Vitest) | per unit; boundaries listed in `integration-test-instructions.md` | Node (including the Astro container render of `Header.astro`, the isolated site builds and the shared default build) | 588 pass in 51 files |
| Property (fast-check, proptest) | per unit | Node / Rust | 36 + Rust properties pass |
| Browser E2E and accessibility (HIG) | per unit | **real engines: Chromium, Firefox, WebKit** via Playwright | 1,242 pass, 0 fail, 81 skipped by design |
| No-JS smoke + link sweep (crossunit) | U1–U4 | **Chromium with JavaScript off** | 16 pass; link sweep clean apart from the declared fixture image |
| Performance (CWV, request sets, inline-script sets, bytes, build, preprocess and suite time) | HIG performance spec, `hig-writing.spec.ts` NFR1.5 checks + this stage's measurements | Chromium (CDP throttling, request collector, `encodedDataLength`); wall-clock timing | see matrix |
| Evidence-sealed provider E2E (`npm run test:e2e`) | U1, U2, U4 specs | Playwright provider | **refused** (manual record stale) |
| Coverage | `npm run test:coverage`, `cargo llvm-cov --release` | Node (v8), Rust (llvm-cov) | 54.01 % site lines; 87.45 % Rust lines |

Instruction files: `build-instructions.md` and `integration-test-instructions.md` (Standard strategy). There is no performance or security instruction file; those belong to the Comprehensive strategy. Sources consumed: every unit's `code-generation/code-generation-plan.md` (`## Testing Contract`), `code-generation/unit-test-instructions.md` and `code-generation/code-summary.md`, plus the units' `nfr-requirements/` and `nfr-design/` artifacts and `reviews/review-03.md` for U2 and U4.

## Coverage expectations

- **Project:** the Testing Contract's coverage obligation (all four units) reads "report the coverage; enforce no minimum", after the maintainer's decision of 2026-11-20, recorded as a human-made requirement change: the team practice in `team.md` governs. Measured: **54.01 %** of 10,681 site lines (5,769 covered; v8; run 4: 54.03 %) and **87.45 %** of 2,764 Rust lines (2,417 covered; cargo-llvm-cov 0.9.1; functions 86.26 %, regions 83.27 %). The three site runs of the same day gave 5,766 / 5,769 / 5,771 covered lines on the same source set, so the figure moves by a few lines between runs; the new test file does not move it (a control run with the file set aside gives exactly 5,766). No threshold exists or was added, lowered or disabled by this stage.
- **Per unit (reference only, not a unit target):** the figures below are run 4's per-file numbers; the site totals moved by a few lines since.
  - U3: `tag-urls.mjs` 100 %, `redirect-table.mjs` 96.4 %, `legacy-redirects-integration.mjs` 83.8 %, `local-server.mjs` 0 % (it runs as a child process and is exercised over HTTP).
  - U2: `writing-lists.ts` 98.1 %.
  - U4: `navigation.ts` 85.8 %.
  - U1: `sync-public-assets.mjs` 59.1 %, `link-sweep.mjs` 64.3 %, `data.ts` 46.3 % (U1 and U2; run 2: 42.7 %).
  - No coverage target is set for any single unit, so no unit-scoped verdict applies.

## Target Verification Matrix

**Source shorthand:**

- `uN/req/<x>` = `construction/<unit>/nfr-requirements/<x>-requirements.md`
- `uN/des/<x>` = `construction/<unit>/nfr-design/<x>-design.md`
- `uN/cg-rNN` = `construction/<unit>/code-generation/reviews/review-NN.md`
- `contract` = the `## Testing Contract` in every unit's `code-generation/code-generation-plan.md`

**Evidence shorthand:**

- "HIG" = the Playwright HIG suite in Chromium, Firefox and WebKit (run 5: 1,242 passed, 0 failed on head `8d19fde`).
- "crossunit" = Chromium with JavaScript off.
- "§" = a run-2 section of `test-results.md`; "R3.x" = a run-3 section; "R4.x" = a run-4 section; "R5.x" = a run-5 section. Where a row cites only §, R3.x or R4.x, run 5 re-ran or re-cited that evidence; no product file changed after run 4 (R5.1).

**Grading rule:** a target that an unresolved code-generation review finding bears on is graded Not Met, even where today's measurement is correct (project learning). Run 5 uses the newest reviews: `review-03.md` for U2, U3 and U4, and `review-02.md` for U1. U3's review-03 is READY with three Minor items (environment-inherited run token, watch-mode stale-build reuse, per-writer retry after a failed build), none of which bears on a graded target. The three findings that bore on run 4's rows were dispositioned before run 5: U4 review-03 R-03 and R-06 by the maintainer's rewording of NFR1.11 and the corrected `performance-design.md` text (R5.1), and U1 review-02 R-04 by the new HIG discovery spec.

### Testing Contract and team practice

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-SF-COV80 | contract → `obligations.scope_floor[0]` | report the coverage; enforce no minimum (the maintainer's decision of 2026-11-20, a human-made requirement change; `team.md` governs) | 54.01 % site lines (5,769/10,681) and 87.45 % Rust lines (2,417/2,764), both reported; no threshold exists | `cd site && npm run test:coverage` exit 0 (run 5, full suite, 588/0/0); `site/.artifacts/coverage/coverage-summary.json`; `cargo-llvm-cov llvm-cov --release` exit 0; `preprocessor/target/llvm-cov/coverage-summary.json`; R5.5 | build-and-test | Met |
| TC-SF-CI | contract → `obligations.scope_floor[1]` | selected tests run in CI before merge | CI Pipeline is `[ ]` in `aidlc-state.md` | CI Pipeline, later in this plan, sets up CI to run these tests before merge | ci-pipeline | N/A |
| TC-ST-VOL | contract → `strategy_volume[0]` | 5–8 tests per component (Standard, soft guideline) | U1 5–15, U2 4–18, U3 4–16, U4 1–30 per component; the low counts are single-property or single-expectation components named in each instruction file | the four `unit-test-instructions.md` tables; suites pass | build-and-test | Met |
| TC-ST-INT | contract → `strategy_volume[1]` | unit tests plus integration tests for key boundaries | boundaries B1–B7 each covered (`integration-test-instructions.md` §3); all pass | cargo, Vitest (Node), HIG, crossunit runs | build-and-test | Met |
| TC-ST-ADD | contract → `strategy_volume[2]` | E2E, performance or security tests where requirements demand them | browser E2E (HIG, 3 engines), CWV and request-set checks (Chromium), C4 grammar and HTTP security cases | HIG + U3 Vitest; gaps graded in their own rows | build-and-test | Met |
| TEAM-AXE | `team.md` Testing Posture | each UI change adds axe WCAG 2.2 AA scans at 320/768/1024/1440 px, light and dark, plus reduced motion | every changed route in `HIG_ROUTES`; all pass | HIG (Chromium, Firefox, WebKit) | build-and-test | Met |
| TEAM-FMT | `team.md` Code Style / Testing Posture | `cargo fmt --check`, `npm run format:check`, `npx astro check` clean | all clean; 0 errors, 0 warnings | §3 | build-and-test | Met |
| TEAM-E2E-A11Y | `team.md` Testing Posture (`npm run test:e2e` when profile routes change; 16-state review subjects) | `npm run test:e2e` passes with a manual record matching the review-subject digest | runs 3, 4 and 5: exit 1, `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`, digest `3d578e5b…` (unchanged since run 1); no spec ran. Run 5 changed no review-subject file, so the record stays valid to redo once after the change settles | `npm run test:e2e` output, R5.4 (run 4: R4.4; run 3: R3.4) | the maintainer (the 16-state manual review) | Not Met |
| TEAM-RUST-COV | contract scope floor (Rust part); U1 `unit-test-instructions.md` "Rust coverage is reported if a tool is available" | Rust line coverage measured | measured: **87.45 %** lines (2,417/2,764), 86.26 % functions (314/364), 83.27 % regions (2,614/3,139) with cargo-llvm-cov 0.9.1; the instrumented target directory was deleted afterwards and the uninstrumented release binary rebuilt | `cargo-llvm-cov llvm-cov --release` exit 0 (run 5); `preprocessor/target/llvm-cov/coverage-summary.json` (gitignored); R5.5 | build-and-test | Met |

### U1 `u1-publish-boundary`

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| U1-NFR6.3 | u1/req/performance; u1/des/performance §3 | pre-U1 baseline, median of 3, ± stamping | re-recorded today with the pre-U1 binary: 169.49 s / 169.96 s | §6.4 round-robin runs on the private copy | build-and-test | Met |
| U1-NFR6.4 | u1/req/performance | stamping run ≤ 1.5 × baseline | 1.001 × (170.06 / 169.96 s) | §6.4 (re-measured, because `22e1468` changed `output.rs`) | build-and-test | Met |
| U1-NFR6.5 | u1/req/performance | non-stamping run ≤ 1.1 × baseline | 1.001 × (169.61 / 169.49 s) | §6.4 | build-and-test | Met |
| U1-NFR6.6 | u1/req/performance; u1/des/performance §2 | the Rust and site suites each ≤ 1.2 × their pre-U1 duration on the same machine; no timeout changed | same-day round-robin medians of 3 against pre-U1 `db7ecae`: `npm run test:unit` **11.73 s vs 13.19 s = 0.889 ×** (run 4: 10.72 s = 0.813 ×; run 3: 19.25 s = 1.44 ×, Not Met). The property suite: 6.21 s vs the pre-U1 6.72 s = 0.924 ×. The Rust suite's wall clock was not recorded in run 5, so run 3's 4.53 s vs 3.81 s = 1.19 × stands; no Rust file changed since. No timeout changed | R5.4; R5.6; run 4 R4.6; run 3 R3.6 | build-and-test | Met |
| U1-NFR6.7 | u1/req/scalability | budgets re-measured if the vault doubles | 155 posts in the 2026-11-16 copy, as at U1's measurement | §6.4 output line | build-and-test | Met |
| U1-NFR1.4 | u1/req/performance | `/` transferred ≤ pre-U1 320,156 B; no added font/image/script/island | 255,387 B, 18 requests, the same 8 scripts as every route (runs 2, 3 and 5, identical) | Chromium + CDP, R5.6 (run 3: R3.6; run 4: R4.6) | build-and-test | Met |
| U1-NFR1.1 | u1/req/performance | `/` axe 0 violations, 4 widths × 2 themes + reduced motion | 0 violations | HIG | build-and-test | Met |
| U1-NFR1.2 | u1/req/performance | exactly one h1 "Passion Project" | 1 | HIG `hig-pages.spec.ts` W5 | build-and-test | Met |
| U1-NFR1.3 | u1/req/performance | capsules ≥ 44 × 44 px | pass at every tested width | HIG | build-and-test | Met |
| U1-NFR5.10 | u1/req/reliability | omitted/missing/empty Pages → exit 0 + notice | pass | `cli_boundary_test` 13/13 | build-and-test | Met |
| U1-NFR5.11 | u1/req/reliability | no retired note → success | pass | `publication_catalog` 20/20 | build-and-test | Met |
| U1-NFR5.12 | u1/req/reliability | every new failure path tested (exit, message, unchanged files) | pass | `cli_boundary_test`, `publication_catalog`, `stamping_order_test` | build-and-test | Met |
| U1-NFR5.13 | u1/req/reliability | PUB007 behaviour and Jenkins stage order unchanged | PUB007 test passes; Verify → Preprocess → Build Site → Deploy | `cargo test --release`; `Jenkinsfile` | build-and-test | Met |
| U1-NFR5.14 | u1/req/reliability | stale `content/homepage/` removed | absent after `just preprocess` | `publication_output` 15/15 | build-and-test | Met |
| U1-NFR6.1 | u1/req/reliability | Jenkins Verify green on the U1 merge commit | the merge exists now (`c8a64f1` into `develop`), but no Jenkins run has happened: pushing `develop` is a release and stays the maintainer's call. The same fixture preparation and suites pass locally | local gate run (R5.4); Jenkins not run | ci-pipeline (Jenkins on `develop` after the maintainer's push) | Unverified |
| U1-NFR6.2 | u1/req/reliability | recorded verification command passes | every part passes on head `8d19fde` (run 5): cargo fmt and test, `just preprocess`, unit, pbt, format, astro check, HIG and crossunit | R5.4 | build-and-test | Met |
| U1-NFR7.1 | u1/req/reliability | Résumé and Portfolio one click from `/` | pass | HIG W5 | build-and-test | Met |
| U1-NFR7.2 | u1/req/reliability | `/` keeps a post list | the weekly card (2 post rows + "모든 글 보기") | HIG `hig-writing.spec.ts`, `hig-pages.spec.ts` | build-and-test | Met |
| U1-NFR4.5 | u1/req/scalability | O(n) checks; 500-note property within the suite time | property vs brute-force reference passes; suite 4.51 s | `publication_catalog` | build-and-test | Met |
| U1-NFR4.6 | u1/req/scalability | flat, sorted, deterministic output | determinism property passes | `publication_output` | build-and-test | Met |
| U1-NFR5.1 | u1/req/security | nothing read outside NOTES/PAGES | pass | Rust sentinel tests | build-and-test | Met |
| U1-NFR5.2 | u1/req/security | image lookup bounded to the source root | pass, including the embedded-post case on a site page (no `assets/pages/<image>` written) | `publication_output` | build-and-test | Met |
| U1-NFR5.3 | u1/req/security | links never leave the boundary | pass | `walker_test`, `publication_output` | build-and-test | Met |
| U1-NFR5.4 | u1/req/security | overlap / non-folder `--pages` → exit 2 before any read | pass | `cli_boundary_test` | build-and-test | Met |
| U1-NFR5.5 | u1/req/security | coded error leaves the vault byte-identical, also when stamping | pass | `stamping_order_test` | build-and-test | Met |
| U1-NFR5.6 | u1/req/security | stamping never writes under PAGES | pass | `stamping_order_test` | build-and-test | Met |
| U1-NFR5.7 | u1/req/security | unpublished notes never in output | pass | `publication_output`, `publication_catalog` | build-and-test | Met |
| U1-NFR5.8 | u1/req/security | any site-page slug clash → PUB008 | pass (incl. post vs retired note, both sort orders) | `publication_catalog` | build-and-test | Met |
| U1-NFR5.9 | u1/req/security | diagnostics name only passed paths | exact-text CLI assertions pass | `cli_boundary_test` | build-and-test | Met |
| U1-NFR2.1 | u1/req/security | `/` requests only the site origin | 0 foreign origins | HIG; Chromium §6.2 | build-and-test | Met |
| U1-NFR3.1 | u1/req/security | opening and capsules work without JavaScript | pass at 320 and 1440 px | crossunit (Chromium, JS off) | build-and-test | Met |
| U1-NFR4.4 | u1/req/observability | summary line last on stdout | `published 17 posts, 1 site pages, 3 assets` | `just preprocess`; CLI tests | build-and-test | Met |
| U1-NFR5.15 | u1/req/observability | three exact notice texts | pass | `cli_boundary_test` | build-and-test | Met |
| U1-NFR5.16 | u1/req/observability | sorted coded diagnostics | pass | `publication_catalog` | build-and-test | Met |
| U1-NFR5.17 | u1/req/observability | usage errors exit 2 | pass | `cli_boundary_test` | build-and-test | Met |
| U1-NFR5.18 | u1/req/observability | existing warnings unchanged | pass; the post warning text is unchanged (the site-page suffix applies to pages only) | cargo suite; `just preprocess` output | build-and-test | Met |
| U1-SLO-NIGHTLY | u1/req/observability → SLI/SLO | nightly job green ≥ 95 % over 30 days | not measurable before the merge and 30 nightly runs | — | observability-setup (deferred; production signal) | Unverified |
| U1-SLO-PAGECOUNT | u1/req/observability → SLI/SLO | 0 unexpected site-page counts per run | not measurable before production runs | — | observability-setup (deferred; production signal) | Unverified |
| U1-CG-R02 | u1/cg-r01 and cg-r02 R-02 (BR5.2) | a recorded decision on images inside a post embedded in a site page, plus a test | decided "unsupported", documented in `CLAUDE.md` C1; the warning names the site page; test passes | `publication_output` `an_embedded_posts_image_on_a_site_page_is_unsupported_and_named`; review-02 R-02 Resolved | build-and-test | Met |
| U1-CG-R04 | u1/cg-r02 R-04 (FR2.2 rendered site) | `homepage.spec.ts` rendered-site FR2.2 checks (no `/posts/fixture-homepage/`, no RSS or sitemap entry) run and pass | the checks run and pass in the new HIG discovery spec `site/tests/e2e/hig-discovery.spec.ts`: 3 cases in Chromium, Firefox and WebKit. The sealed copy under `npm run test:e2e` still refuses, but the rendered-site gap the finding named is closed in a real engine | `hig-discovery.spec.ts` (3 engines, inside the full HIG run of 1,242 passed); R5.3, R5.4 | build-and-test | Met |

### U2 `u2-writing-section`

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| U2-NFR1.5 | u2/req/performance; u2/cg-r03 R-04 (Accepted risk), R-06 (Fixed) | no `<script>` beyond the site-wide ones on `/writing`, `/writing/all`, proven by a script-set comparison | the requested script files and the inline `<script>` blocks (count and sorted SHA-256 of their bodies) on `/writing` and `/writing/all` equal `/writing/tags`; both checks pass. The built HTML of `/`, `/writing`, `/writing/all` and `/writing/tags` holds the same 6 inline blocks (R3.6). Layout-wide additions remain outside a same-layout comparison, which review-03 accepted | HIG `hig-writing.spec.ts` "Writing pages load no new script (NFR1.5)", both tests passing in **Chromium via Playwright** (skipped by design in Firefox and WebKit); commit `b7efd85`; R3.3 | build-and-test | Met |
| U2-NFR1.6 | u2/req/performance | sticky year header animates nothing | no `transition`/`animation` in `writing.css`, `writing-all.css`, `home.css`; reduced-motion checks pass | §6.5; HIG | build-and-test | Met |
| U2-NFR1.7 | u2/req/performance | `/writing/all` ≤ 2 KB per row, no row images, ≤ 350 KB | 106,391 B for 137 rows = 777 B/row (run 1); the repair shrank the fixture page by 601 B and changed no row markup | §6.4; §6.3 | build-and-test | Met |
| U2-NFR1.8 | u2/req/performance; u2/des/performance §1 | `/` transferred ≤ 255,387 B, the value measured on the assembled build (the budget the maintainer reset on 2026-11-20, a human-made requirement change) | **255,387 B**, 18 requests — exactly at the budget (runs 3 and 5, identical) | Chromium + CDP, R5.6 (run 3: R3.6) | build-and-test | Met |
| U2-NFR4.7 | u2/req/performance | list building O(n log n); 1,000-post property within PBT time | pass | `writing-lists.pbt.test.ts` | build-and-test | Met |
| U2-NFR6.8 | u2/req/performance; u2/des/performance §1 | fixture build median ≤ 1.10 × the U1 build | 3.61 s vs 3.60 s = 1.003 × | §6.1 | build-and-test | Met |
| U2-NFR5.19 | u2/req/security; u2/cg-r03 R-05 (Fixed) | lists hold only ordinary posts from `content/meta`; `/writing/all` link set = ordinary-post set | the list tests pass. `CONTENT_DIR_OVERRIDE` is now honoured only under Vitest; anywhere else a real `astro build` stops with `WR002` before rendering (re-checked independently here: exit 1). `VITEST` and the override appear nowhere in `Jenkinsfile`, `Justfile` or `package.json`. Review-03's one new Minor item (no automated build-level WR002 test) names the hand-run check as an acceptable alternative, and this run repeated that check | `content-data.test.ts` 14/14 in Node (inside unit commands #2 and #3); `writing-empty-build.test.ts` 3/3; HIG NFR8 equality (3 engines); `env -u VITEST CONTENT_DIR_OVERRIDE=… npx astro build` exit 1 with WR002 (R3.3) | build-and-test | Met |
| U2-NFR5.20 | u2/req/security | hostile title renders literally | "Post <b>Bold & Co" renders as text | HIG `hig-writing.spec.ts` | build-and-test | Met |
| U2-NFR2.2 | u2/req/security | same-origin only on `/writing`, `/writing/all` | 0 foreign origins | HIG; §6.2 | build-and-test | Met |
| U2-NFR3.2 | u2/req/security | `/`, `/writing`, `/writing/all` work without JavaScript | pass | crossunit (Chromium, JS off) | build-and-test | Met |
| U2-NFR1.9 | u2/req/security | axe matrix pass; focus never hidden under the sticky header | pass | HIG (3 engines) | build-and-test | Met |
| U2-NFR1.10 | u2/req/security | one h1, h2 per section, ≥ 44 px targets | pass | HIG | build-and-test | Met |
| U2-NFR6.9 | u2/req/security | suites green on the merge | pass (run 5: the full recorded verification command passes on `8d19fde`) | R5.4 | build-and-test | Met |
| U2-PD-CSS3K | u2/des/performance §2; u2/cg-r01 R-01 | `writing.css` ≤ 3 KiB unminified | 1,100 B; single-page rules moved to `home.css` and `writing-all.css`; a size test guards it | `wc -c`; `writing-css-size.test.ts` 2/2 | build-and-test | Met |
| U2-PD-CSS30K | u2/des/performance §2 | per-route CSS ≤ 30 KiB for `/`, `/writing`, `/writing/all` | pass | HIG `hig-performance.spec.ts` CSS budget (Chromium) | build-and-test | Met |
| U2-AC3.4.1 | u2 `code-generation/traceability.json` (OK) | empty-week homepage test runs and passes | the new unit test builds an isolated site with `HOMEPAGE_TODAY_OVERRIDE=2025-08-20` and asserts the empty-week section: one plain row "이번 주에 발행한 글이 없습니다.", the "모든 글 보기" row, no "오늘 발행된 글" section, posts still on `/writing/all`, and the secondary text token. 5 cases pass in Node. The sealed copy under `npm run test:e2e` stays for the end-of-release accessibility review | `homepage-empty-week.test.ts` 5/5 (Node, isolated build; R5.3) | build-and-test | Met |
| U2-AC4.1.3 | u2 `code-generation/traceability.json` | `/writing` empty state shows "아직 발행한 글이 없습니다." | an isolated build over an empty content tree renders the plain-text row, offers no post or "모든 글 보기" row and omits "주제" | `writing-empty-build.test.ts` 3/3 (Node; the built HTML is static text, so no browser behaviour is claimed) | build-and-test | Met |

### U4 `u4-navigation`

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| U4-NFR4.8 | u4/req/performance | pure, deterministic, frozen; ≤ 1 item marked | pass | `profile-metadata-navigation.test.ts`, U1-P10 property | build-and-test | Met |
| U4-NFR6.11 | u4/req/performance; u4/cg-r03 R-06 (Fixed) | 0 new files, 0 new script requests; `/` and `/writing` HTML ≤ the U2 measurement; design basis agrees | the values meet the target: `/` 25,800 B ≤ 28,659 B, `/writing` 27,709 B ≤ 31,120 B, the same 8 scripts, no file added by U4 (measured in run 3; re-measured in run 5). The design basis agrees now: `nfr-design/performance-design.md` §1 says Writing is added and Tags, Graph, Résumé and Portfolio leave, and its trace carries the same wording (commit `2425cc3`) | R5.6; R3.6; U4 `nfr-design/performance-design.md` §1 | build-and-test | Met |
| U4-PD-ROOT-BYTES | u4/des/performance §2–3; u4/cg-r03 R-01 (Fixed) | `/` transferred ≤ 255,387 B, the value measured on the assembled build (the budget the maintainer reset on 2026-11-20, a human-made requirement change) | **255,387 B**, 18 requests — exactly at the budget (runs 3 and 5, identical). The record part stays corrected: U4's own delta is −95 B like for like (U2 head 255,770 B against U4 head 255,675 B) | Chromium + CDP, R5.6; R3.6; U4 `code-summary.md` "Corrected page-weight record" | build-and-test | Met |
| U4-PD-WALL | u4/des/performance §2 | real-content `/writing/all` ≤ 107,795 B | 106,391 B (run 1); the fixture page shrank 601 B since | §6.4 | build-and-test | Met |
| U4-PD-CHROME | u4/des/performance §2 | `chrome.css` ≤ 10,000 B | 9,717 B | `wc -c` | build-and-test | Met |
| U4-NFR1.14 | u4/req/performance; u4/des/performance §3 | no new animation; fixture build ≤ 3.81 s and within 5 % of the U2 merge | no new animation; 3.61 s; 1.000 × the U2 head | §6.1; reduced-motion checks in HIG | build-and-test | Met |
| U4-NFR5.21 | u4/req/security; u4/cg-r03 R-02 (Resolved), R-07 (Fixed) | all five unnormalisable path classes fail closed; the build fails on a hostile model | all five classes and five hostile models tested. `header-navigation-failure.test.ts` renders the real `Header.astro` through the Astro container and expects `TypeError('Invalid primary navigation state.')` on rejected paths, with two positive renders proving the harness. Review-03 cites a mutation run in which removing the throw fails it | `header-navigation-failure.test.ts` 4/4 (Node, Astro container; run separately and inside `npm run test:unit`, R3.3–R3.4); `profile-metadata-navigation.test.ts` (command #5, 65/0) | build-and-test | Met |
| U4-NFR1.11 | u4/req/security; u4/cg-r03 R-03 (Resolved), R-05 (Fixed) | axe pass on every HIG route; only `page`/`true`, **at most once per surface** — the desktop bar and the phone sheet each carry one; indicator not colour alone | axe passes in 3 engines; the bar holds exactly one link and at most one `aria-current`, and so does the sheet. The requirement now reads "once per surface", reworded by the maintainer on 2026-11-20 as a human-made requirement change, so the two surfaces together carry two without contradicting the rule | HIG `hig-chrome.spec.ts` (Chromium, Firefox, WebKit via Playwright; 3 engines, inside the full HIG run of 1,242 passed); U4 `security-requirements.md` NFR1.11 | build-and-test | Met |
| U4-NFR1.12 | u4/req/security | ≥ 44 px link, 52 px sheet row, keyboard reach, page hidden behind the open sheet | pass | HIG `hig-chrome.spec.ts` | build-and-test | Met |
| U4-NFR2.3 | u4/req/security | site origin only | 0 foreign origins | HIG; §6.2 | build-and-test | Met |
| U4-NFR3.3 | u4/req/security | bar, Writing link and sheet work without JavaScript | pass | crossunit (Chromium, JS off) | build-and-test | Met |
| U4-NFR6.10 | u4/req/security | suites green; four-item expectations updated, not deleted | pass (run 5: the full recorded verification command passes on `8d19fde`) | R5.4 | build-and-test | Met |

### U3 `u3-writing-moves`

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| U3-NFR4.9 | u3/req/performance | deterministic sorted unique table, one rule per tag page + 2, inside the build's own output | 12 = 10 + 2; writer byte-identical across runs | `legacy-redirects*.test.ts`; `site/dist/_redirects.json` | build-and-test | Met |
| U3-NFR4.10 | u3/req/performance | 0 table reads per request between changes; 1 lookup | pass (counting stubs) | `redirect-table.test.ts` (Node) | build-and-test | Met |
| U3-NFR6.12 | u3/req/performance | LCP ≤ 2500 ms, CLS ≤ 0.1, TBT ≤ 200 ms on the measured routes incl. `/writing/graph` | pass | HIG `hig-performance.spec.ts` (Chromium only) | build-and-test | Met |
| U3-NFR6.13 | u3/req/performance | exactly 1 new output file; isolated build ≤ 60 s | only `_redirects.json` added (run 1 file-list diff; the repair added no output file); isolated build passes | `legacy-redirects-build.test.ts` | build-and-test | Met |
| U3-NFR6.14 | u3/req/performance | no new request on moved routes; 0 hashed files added/renamed/changed; grouped.css < 4,096 B inline | request sets equal; `_astro` 176 files; 3,910 B inline; selectors absent from `_astro/*.css` | HIG request collector (Chromium); §6.5 | build-and-test | Met |
| U3-NFR5.22 | u3/req/security; u3/des/security §4; u3/cg-r02 R-02 | `Location` from `to` + raw query only; 400 for encoded control bytes; the handler never throws, with each guard proven | `isHeaderValueSafe` cases; a lone-surrogate `to` answers 400 with no `Location`, then 301 and 200 follow (R-02 Resolved) | `redirect-table.test.ts`, `local-server.test.ts` (Node, real server over HTTP) | build-and-test | Met |
| U3-NFR5.23 | u3/req/security | table accepted only in C4 shape; rejection = no redirect, one error line | pass | `redirect-table.test.ts` | build-and-test | Met |
| U3-NFR5.24 | u3/req/security | no target leaves the site | pass | `redirect-table.test.ts`, `local-server.test.ts` | build-and-test | Met |
| U3-NFR5.25 | u3/req/security; u3/des/security §6.1; u3/cg-r02 R-01 | no 301 to an unservable address, including the deploy ordering (pages first, table second) | the ordering test stops the script after the mirror: old table byte-identical, no tmp file, non-zero exit; removing either `--exclude` fails it (R-01 Resolved) | `publish-dist.test.ts` | build-and-test | Met |
| U3-NFR2.4 | u3/req/security | moved pages same-origin; table served as `application/json; charset=utf-8` | 0 foreign origins; `200 application/json; charset=utf-8` | HIG; `curl` against the production server §6.5 | build-and-test | Met |
| U3-NFR3.4 | u3/req/security | moved routes and the graph's list panel work without JavaScript; no `/tags` or `/graph` link | pass; link sweep clean | crossunit (Chromium, JS off) | build-and-test | Met |
| U3-NFR1.15 | u3/req/security | axe on the moved routes; one h1; back link ≥ 44 px with focus style | pass | HIG (3 engines) | build-and-test | Met |
| U3-NFR6.15 | u3/req/security | suites green; no stray `/tags`/`/graph` literal | pass | §3 | build-and-test | Met |
| U3-NFR6.16 | u3/req/security | HTTP-level 301/404/400 evidence from the shipped server; dotted key served | pass | HIG `hig-pages.spec.ts` against `local-server.mjs`; `local-server.test.ts` | build-and-test | Met |

## Open targets: what closes each

Run 5 leaves 4 open targets: 1 Not Met and 3 Unverified. `test-results.md` R5.8 gives each one's root cause. In short: **no code-level test gap remains.** 8 of run 4's 12 open targets moved to Met — TC-SF-COV80, TEAM-RUST-COV, U1-CG-R04, U2-NFR1.8, U2-AC3.4.1, U4-NFR1.11, U4-NFR6.11 and U4-PD-ROOT-BYTES — and the 4 that stay open wait on the maintainer or on a later stage.

The maintainer's four decisions from the run 4 gate are now recorded in the artifacts and closed: the coverage obligation reads "report the coverage; enforce no minimum" (`37b2a62`), the `/` budget is reset to the measured 255,387 B (`53a1749`), NFR1.11 reads "once per surface" and the U4 design text agrees (`2425cc3`), and the F4 dependency is resolved (`33bcb44`; `1cf9e63` in `develop`).

### The maintainer's own work

| Open item | Targets | What closes it (impact) |
|---|---|---|
| The 16-state manual accessibility review, redone once after the change settles | TEAM-E2E-A11Y (Not Met) | The review, 2–4 h of the maintainer's time, then `npm run test:e2e` (about 2 min). The two rows that used to wait on it — U2-AC3.4.1 and U1-CG-R04 — are closed by the new Vitest and HIG specs, so the review closes the last row of this group |
| The Jenkins Verify run over the merge commit | U1-NFR6.1 (Unverified) | ci-pipeline, the next stage: the Jenkins job runs on `develop` after the maintainer's push (about 10 min, no cost) |

### Later stages

- **U1-SLO-NIGHTLY, U1-SLO-PAGECOUNT:** owned by observability-setup. They need 30 days of production signal, then about 15 min each.

## Readiness assessment

| Readiness | Status | Why |
|---|---|---|
| Build-ready | **Yes** | build and preprocess succeed; output verified; rendered output identical to run 3 (no product file changed) |
| Test-ready | **Partly** | Every suite passes, the browser suites in real engines, with no failed assertion anywhere. The sealed provider suite is refused until the manual review is redone. 1 target is Not Met. |
| Deployment-ready | **No** | The stage failed. Open: the maintainer's 16-state manual review and the Jenkins Verify run over the merge commit, plus the two 30-day SLO rows that observability-setup owns. No code-level test gap remains. The maintainer's merges, the `dev.rvnnt.blog` restart (BR3.5) and the 16-state review also come before the first nightly deploy. |

Every browser behaviour graded `Met` above ran in a real engine: Playwright with Chromium, Firefox and WebKit, or Chromium with JavaScript off. The performance checks and both NFR1.5 script-set comparisons ran in Chromium only. Node-only evidence is graded only where a target concerns built output, HTTP or a build failure, not native browser behaviour. That covers Vitest, including the isolated builds, the real server over HTTP, and the Astro container render of `Header.astro` for U4-NFR5.21.

## Known limitations and outstanding items

- **U2-NFR1.7 and U4-PD-WALL** were not rebuilt from real content in runs 2–5. Run 1 measured 106,391 B. Since then only stylesheet placement and tests changed, and the fixture page shrank, so the run-1 figure is an upper bound.
- **Fixture build time** (U2-NFR6.8, U4-NFR1.14) was re-timed in run 5: four runs of the fixture build give 2.99 / 2.98 / 3.00 / 2.99 s, median **2.99 s** against U1's 3.60 s (0.83 ×) and U2's 3.61 s (0.83 ×). The rendered output is identical to run 3 (R5.6).
- **U1-NFR6.6** is graded against a same-day pre-U1 baseline in a removed scratch worktree: 0.889 × wall clock in run 5 (0.813 × in run 4), against a limit of 1.2 ×.
- **Run 5 ran the full recorded command end to end** on head `8d19fde`: cargo fmt and test, `just preprocess`, unit, pbt, format, astro check, HIG and crossunit, every part passing (R5.4). The Rust suite's wall clock was not recorded in that run, so U1-NFR6.6's cargo figure still comes from run 3.
- **Private vault copy:** U1's copy (`preprocessor/target/u1-baseline/`) was deleted after the Rust coverage run on 2026-11-20, because the coverage measurement no longer needs it. The instrumented `preprocessor/target/llvm-cov-target/` was deleted too, and the uninstrumented release binary rebuilt.
- **Documentation-only findings, not graded as targets:**
  - U2 review-03 R-02 and R-03 (summary and plan wording, accepted risks), and R-07 (a killed empty-build test can leave a temp folder);
  - U2 review-03's optional new item, an automated build-level WR002 test;
  - U4 review-03's two Minor citation slips in the corrected page-weight record, which the record's later edit addresses (−95 B, §8);
  - U4 `unit-test-instructions.md` step 2 does not name `header-navigation-failure.test.ts`, which runs only inside `npm run test:unit`;
  - U1 review-02 R-04's note that U1 `unit-test-instructions.md` step 5 says "homepage and crossunit specs" but runs only `hig-pages.spec.ts`.
- **Cross-unit traceability** still fails with 2 uncovered IDs (`NFR1`, `NFR6`); see `cross-unit-traceability.md`. Run 4 had 4 (`FR3.7`, `NFR1`, `NFR6`, `AC3.4.1`): the new Vitest and HIG specs close `AC3.4.1` and, through it, `FR3.7`.
