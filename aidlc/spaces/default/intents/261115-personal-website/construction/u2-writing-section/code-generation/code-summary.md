# Code Summary — U2 `u2-writing-section`

Branch: `feature/u2-writing-section` off `feature/u1-publish-boundary`, local only, 8 commits. Nothing has been merged or pushed. Every step of the approved plan (1–10) is done.

## Files created / modified / deleted

| Step | Files |
|---|---|
| 1 | none (branch and runner check only; the planned build-time baseline was not recorded — see Deviations) |
| 2 | new `fixtures/vault/Notes/Undated Post.md`, `Notes/Post <b>Bold</b> & Co.md`, `Notes/This Week Post.md`; changed `site/scripts/hig/build-and-serve.mjs` (`HOMEPAGE_TODAY_OVERRIDE=2025-08-13`) |
| 3 | changed `site/src/lib/data.ts` (content-dir seam, `WR001`), `site/tests/unit/content-data.test.ts` (4 new tests) |
| 4 | new `site/src/lib/writing-lists.ts`, `site/tests/unit/writing-lists.test.ts`, `site/tests/pbt/u2/writing-lists.pbt.test.ts` |
| 5 | new `site/src/pages/writing/all.astro`, `site/src/components/writing/YearGroup.astro`, `site/src/styles/writing.css`, `site/tests/e2e/hig-writing.spec.ts`; changed `site/tests/e2e/support/hig.ts` (`/writing/all`, `writing` route kind) |
| 6 | new `site/src/pages/writing/index.astro`, `site/src/components/writing/RecentPosts.astro`, `site/src/components/writing/TopicList.astro`; changed `hig-writing.spec.ts`, `support/hig.ts` (`/writing`) |
| 7 | new `site/src/components/writing/WeeklyPostList.astro`; changed `site/src/pages/index.astro`, `site/src/styles/home.css`, `writing.css` (`.week-posts`), `site/tests/e2e/{hig-writing,hig-pages,homepage,crossunit}.spec.ts`, `site/tests/unit/content-data.test.ts`, `site/scripts/profile/homepage-fixture-content.mjs` (comment); deleted `site/src/lib/homepage.ts`, `site/tests/unit/homepage-composition.test.ts`, `site/tests/pbt/u2/homepage-composition.pbt.test.ts` |
| 8 | changed `site/tests/e2e/crossunit.spec.ts` (`/writing`, `/writing/all` with JavaScript off) |
| 9 | none (verification and measurements only) |
| 10 | changed `CLAUDE.md` |

## Commits

| Hash | Message |
|---|---|
| `d4875e1` | test: 이번 주·날짜 없음·특수문자 제목 fixture 글을 더하고 HIG 빌드 날짜를 고정합니다 |
| `d5de6ab` | feat: 글 메타데이터가 manifest 와 어긋나거나 manifest 가 없으면 WR001 로 빌드를 멈춥니다 |
| `a3f738e` | feat: 한국 시간 주·최근 글·연도별 묶음·주제 목록을 만드는 순수 함수를 더합니다 |
| `fb4c515` | feat: 모든 글 화면에 연도별 묶음과 고정 연도 머리글을 더합니다 |
| `3c2d276` | feat: Writing 화면에 최근 글과 주제 목록을 더합니다 |
| `806c6ac` | feat: 홈페이지에 이번 주 글 카드를 더합니다 |
| `ffb3c28` | test: Writing 화면의 자바스크립트 없는 탐색을 확인합니다 |
| `27e9489` | docs: Writing 화면과 데이터 규칙을 CLAUDE.md 에 기록합니다 |

## Key implementation decisions

- **`writing-lists.ts`**: pure functions over plain objects; every exported function takes the build date (or env plus clock) as an argument. `resolveKoreanBuildDate` accepts a valid `YYYY-MM-DD` override and otherwise shifts the build instant by 9 hours. Outputs are frozen, and the comparator is a strict total order: `published` descending, then title by UTF-16 code unit, then slug.
- **Week and lists**: `weekPosts` and `recentPosts` exclude undated posts; `postsByYear` puts "날짜 없음" last; `topics` counts only resolvable forward links to ordinary posts from `content/meta`. Hubs never appear as posts, only as topics.
- **`WR001`**: `getAllPostMeta()` takes an optional content directory (default `CONTENT_DIR`). A missing `manifest.json` throws `WR001 <path>: content manifest missing — run the preprocessor`; a `meta/*.json` set that differs from the manifest's `meta/` entries throws `WR001 <path>: meta files differ from manifest`.
- **`/writing/all`**: one `h2.year-header` per year with `data-material="thick"` and a `--year-header-height` override; `scroll-margin-block-start` on the focusable row anchor so a focused row clears the stuck header. Year headers are sticky and fall back to `--c-bg-grouped` under reduced transparency, no `backdrop-filter`, and increased contrast.
- **`/writing`**: "최근 글" shows at most five dated posts plus "모든 글 보기"; "주제" shows every hub with "글 N개". The Tags and Graph capsules point at the current `/tags` and `/graph` addresses; U3 moves them under `/writing/`.
- **Homepage `WeeklyPostList`**: full `PostCard` rows for the current Korean week, an empty row rendered as plain text when the week is empty, and always a final "모든 글 보기" row to `/writing/all`. `index.astro` imports `writing.css`; `home.css` keeps only the opening rules. `filterTodayPosts`, `resolveBuildDate`, `TodayPostLike` and `homepage.ts` are gone, with their unit and property tests.
- **No islands**: all three pages are static Astro; list values render through Astro text expressions, never `set:html`.
- **Crossunit stability**: the homepage no-JS check asserts the "이번 주 글" heading and the all-posts link instead of week contents, because `just crossunit` previews whatever `site/dist` exists (often the HIG fixture build).

## Test coverage summary

| Suite | Before U2 (U1 HEAD) | After U2 |
|---|---|---|
| `cargo test --release` | 178 | 178 — all pass |
| `npm run test:unit` | 456 | 476 — all pass (+20 net; the 2 interim homepage-composition examples are deleted) |
| `npm run test:pbt` | 34 | 36 — all pass (+4 writing-lists properties, −2 homepage-composition properties) |
| HIG Playwright (3 browsers) | 988 passed, 65 skipped | 1,129 passed, 71 skipped, 0 failed |
| `just crossunit` | 8 | 10 — all pass |

New test files:

| Test file | Tests | Kind |
|---|---|---|
| `site/tests/unit/writing-lists.test.ts` | 18 | Vitest |
| `site/tests/pbt/u2/writing-lists.pbt.test.ts` | 4 | fast-check |
| `site/tests/e2e/hig-writing.spec.ts` | homepage week card, `/writing`, `/writing/all`, axe matrix | Playwright |

Coverage on the whole project is reported by Build and Test on the full suite; no minimum percentage is enforced (team.md Testing Posture; maintainer decision 2026-11-20, human-made requirement change).

## TDD record (Red → Green)

| Step | Red command | Failing output | Green |
|---|---|---|---|
| 3 | `npx vitest run --config vitest.config.ts tests/unit/content-data.test.ts` | 4 new cases failed for the intended reason: the missing-manifest and mismatched-meta cases returned entries instead of throwing `WR001` | 10/10 in the file |
| 4 | `npx vitest run --config vitest.config.ts tests/unit/writing-lists.test.ts`; `PBT_RUNS=100 PBT_SEED=42 npx vitest run --config vitest.pbt.config.ts tests/pbt/u2/writing-lists.pbt.test.ts` | failed to resolve `../../src/lib/writing-lists` (module did not exist yet) | 18 + 4 |
| 5 | `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-writing.spec.ts --project=chromium` | the `/writing/all` block failed (route absent: h1 "모든 글" and the year groups not found) | 34 passed, 2 skipped across the then-current spec |
| 6 | same command, `/writing` block added | the `/writing` block failed (route absent) | spec green across the three browsers |
| 7 | same command plus `hig-pages` W5 filter | homepage block 9 failed (3 tests × 3 browsers: `week-list` absent), 52 passed, 2 skipped; W5 filter 3 failed | writing spec 61 passed, 2 skipped; W5 filter 15 passed |
| 8 | `npx playwright test --config playwright.crossunit.config.ts` | 2 failed: the new no-JS test counted 2 `astro-island` elements (header chrome islands, not Writing content) | 10/10 after scoping the assertion to `main astro-island` |

The exact failing counts for Steps 3–6 were not preserved in this session (the first run of the stage was interrupted, and only Steps 7 and 8 re-ran Red in the recorded session). The Red commands above are the ones the plan named, and each failed before its implementation existed.

## Baselines and NFR measurements

Same machine, same day. The real-content run used a copy of `Areas/Notes` under `preprocessor/target/u2-measure/` (gitignored, deleted after the measurement); the real vault was never stamped or touched. Fixture content was restored with `just preprocess` afterwards.

| Measure | Value | Target | Result |
|---|---|---|---|
| Fixture `npx astro build` (median of 3) | 3.63 s (runs 4.75, 3.59, 3.63) | < 10 % over the U1 build (NFR6.8) | Not gradable here: the Step 1 baseline was not recorded (see Deviations); Build and Test re-measures |
| `/` wire bytes, HIG fixture build (2 post rows + all row) | 255,351 B (decoded 334,567 B, 18 requests) | ≤ 229,036 + 4,096 × 2 = 237,228 B (NFR1.8, the budget in force when this was measured) | **Not met at the time**: +18,123 B (7.6 %). One extra Pretendard woff2 subset (`.subset.86.XG7lTN_6.woff2`, 25,716 B) is requested by the Korean row text, and the row markup adds 538 B wire. No new stylesheet beyond `writing.css`. The maintainer reset the budget to the measured 255,387 B on 2026-11-20 (human-made requirement change); against the reset budget the measurement meets it |
| `/` wire bytes, empty-week build of the same code | 229,097 B | 229,036 B (U1) | +61 B: U1's interim section replaced by the empty weekly card |
| `/writing/all` HTML, real-content build | 107,795 B for 137 rows = 787 B/row | ≤ 2 KB/row and ≤ 350 KB uncompressed (NFR1.7) | Met |

- **Delta breakdown**: 255,351 − 229,097 = 26,254 B wire (27,118 B decoded) = 25,716 B extra font subset + 538 B wire row markup. The budget's 4,096 B per row covers markup, not the one-time Hangul coverage subset the new rows need; the cost is inherent to rendering real Korean titles and dates. The maintainer reset the budget to the measured 255,387 B on 2026-11-20 (human-made requirement change) instead of adding a custom font subset; the subset work stays a follow-up.
- **Post count**: the vault copy held 137 published posts on this run (the vault has changed since U1's 155). Rows on `/writing/all` = 137.
- **Origins**: one origin on every page, before and after.

## Verification command (Step 9)

Exit 0.

| Part | Result |
|---|---|
| `cargo fmt --check` | pass |
| `cargo test --release` | pass (178) |
| `just preprocess` | pass (`published 17 posts, 1 site pages, 3 assets`) |
| `npm run test:unit` | pass (476) |
| `npm run test:pbt` | pass (36) |
| `npm run format:check` | pass |
| `npx astro check` | pass (0 errors, 0 warnings) |
| HIG Playwright | pass (1,129 / 71 skipped / 0 failed; ~5.5 min) |
| `just crossunit` | pass (link sweep: 1,044 references over 40 pages, 1 declared known-broken; crossunit 10/10) |

## Tests written but not executed

- `site/tests/e2e/homepage.spec.ts` empty-week test (AC3.4.1). It runs under `npm run test:e2e`, which the plan excludes until the owner's end-of-release accessibility review restores the manual record; the HIG run skips it via `test.skip(Boolean(HOMEPAGE_TODAY_OVERRIDE))`.
- **Closed later (Build and Test run 5, 2026-11-20):** the same empty-week check now also runs in the unit suite, as `site/tests/unit/homepage-empty-week.test.ts` — an isolated build with `HOMEPAGE_TODAY_OVERRIDE=2025-08-20` that asserts the empty-week row, the "모든 글 보기" link and the muted text colour. The sealed Playwright copy stays for the end-of-release review.
- The axe matrix for `/writing` and `/writing/all` runs inside the HIG suite, so it did execute.

## Deviations from the plan

- **Step 1 build-time baseline missing.** The first stage run was interrupted (subagent dispatch failed on API credit) and the base build-time baseline was never recorded. The Step 9 build time is therefore recorded without a before value.
- **Steps 3–6 Red evidence counts.** Not preserved from the interrupted run (only the commands and the intended failure reasons survive). Steps 7 and 8 re-ran Red in the recorded session.
- **Exact verification test count for Steps 5/6.** The writing spec grew across Steps 5–7; the count in the TDD table is the count at that step's green run.
- **Crossunit homepage assertion.** It is week-state agnostic because the crossunit runner previews whatever `dist` exists (often the HIG fixture build), not only the empty-week build.
- **`homepage-fixture-content.mjs`.** Kept: the profile e2e suite still needs the 2024-03-01 post, not its date. Only the comment changed.
- **`render.ts:310`.** The stale recent-posts comment was deliberately left; the plan does not list the file.
- **Step 2 is fixture infrastructure**, so it had no Red step; the existing cargo and HIG counts were confirmed unchanged.
- **NFR1.8 is measured over budget** and recorded as Not Met rather than relaxed. The numbers, the attribution and the one-time font-subset cause are above.

## Known limitations and leftovers

- **NFR1.8** needs a decision at Build and Test: either accept the font subset as a first-load cost of real Korean weekly rows, or re-plan the homepage weight budget. No test, threshold or budget was relaxed.
- **NFR6.8** cannot be graded from Code Generation because the baseline is missing; Build and Test should measure both sides from git history.
- **Rollback ordering** (plan resolution, infra Major): reverting U2 after U3/U4 merge must revert them too, and `just crossunit` must run locally before pushing a revert. Jenkins has no link sweep; adding one is an owner follow-up.
- **Merge preconditions** follow U1's: the branch merges into `develop` only after U1 (and the owner's `Areas/Notes` rule rewording); nothing is merged or pushed here.
- No private vault copy is left on disk (`preprocessor/target/u2-measure/` deleted).

## Loop-back 1 repair (2026-11-20)

Build and Test graded U2-NFR1.5 and U2-PD-CSS3K Not Met and U2-AC4.1.3 Unverified (review findings R-04 and R-01, and a test never written). Steps 11–14 repair them on `feature/u3-writing-moves`, the assembled stack (U1 → U2 → U4 → U3), whose current state was the base: Tags and Graph live at `/writing/tags` and `/writing/graph`, and the `.back-link` rules are in `grouped.css`. Steps 1–10 were confirmed present and not redone. U2-NFR1.8 (the `/` byte budget) stays the maintainer's decision and is untouched.

### Commits

| Hash | Message |
|---|---|
| `0f312eb` | test: Writing 화면이 새 스크립트를 싣지 않음을 확인합니다 |
| `0ef1e89` | test: 글이 없을 때 Writing 화면의 빈 상태를 확인합니다 |
| `ae84c34` | refactor: writing.css 를 한 화면에서만 쓰는 규칙 없이 3 KiB 안으로 줄입니다 |

### Files

| Step | Files |
|---|---|
| 11 | changed `site/tests/e2e/hig-writing.spec.ts` (new "Writing pages load no new script (NFR1.5)" block, Chromium only) |
| 12 | new `site/tests/unit/writing-empty-build.test.ts`; changed `site/tests/unit/support/astro-build.ts` (optional `env` for the build process only), `site/src/lib/data.ts` (test-only `CONTENT_DIR_OVERRIDE`), `CLAUDE.md` (the seam documented) |
| 13 | new `site/src/styles/writing-all.css`, `site/tests/unit/writing-css-size.test.ts`; changed `site/src/styles/writing.css`, `site/src/styles/home.css`, `site/src/pages/writing/all.astro`, `CLAUDE.md` (where the Writing rules live) |

### TDD record

| Step | Red command (from `site/`) | Failing output | Green |
|---|---|---|---|
| 11 | `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-writing.spec.ts --project=chromium -g "no new script"` | None, as the plan expected: `1 passed`. The sets were already equal, so this step adds evidence, not behaviour. To show the check can fail, `/writing/graph` was added to the compared paths for one run: it failed with `+ "/_astro/GraphView"`, `+ "/_astro/graph.astro_astro_type_script_index_0_lang"`, `+ "/_astro/graphSim"`, `+ "/_astro/tabs"` against the `/writing/tags` set; the probe was reverted before commit | 62 passed, 4 skipped (whole writing spec, 3 browsers) |
| 12 | `npx vitest run --config vitest.config.ts tests/unit/writing-empty-build.test.ts` | 3 failed: the isolated build ignored the empty tree and read the shared `content/`, so `expected '<h2 id="recent-heading" …' to match /<li[^>]*data-testid="empty-row"…/`, `… not to contain 'data-testid="all-posts-link"'`, and `… not to contain 'data-testid="topic-row"'` | 3 passed after `data.ts` reads `CONTENT_DIR_OVERRIDE` |
| 13 | `npx vitest run --config vitest.config.ts tests/unit/writing-css-size.test.ts` | 2 failed: `expected 3998 to be less than or equal to 3072`; `.week-posts: expected '…' not to contain '.week-posts'` | 2 passed |

### Decisions

- **Script-set check (Step 11).** A request whose `resourceType()` is `script`, while the page loads and settles, counts. `/_astro/<name>.<hash>.js` reduces to `/_astro/<name>`. The reference `/writing/tags` set must be non-empty, so an empty-vs-empty comparison cannot pass.
- **Content seam (Step 12).** `buildSiteInto` had no way to point a build at another content tree, so `data.ts` now resolves its content folder from `CONTENT_DIR_OVERRIDE` when set, else `../content` as before. The variable is test-only and documented in `CLAUDE.md`. `buildSiteInto(outDir, timeout, env)` passes it to the spawned build only, still through the build lock. The empty tree (`manifest.json` `[]`, empty `meta/`) and the build output live in one temporary folder that the test removes. `site/dist` and the shared `content/` are never written.
- **CSS split (Step 13).** Before moving anything, the stylesheets each page loads were checked: `/` loads `grouped.css`, `home.css` and `writing.css`; `/writing` and `/writing/all` load `grouped.css` and `writing.css`. The homepage-only weekly-card block moved to the end of `home.css`, which only `/` loads. The `/writing/all`-only block (year headers, compact rows, `--year-header-height`, the three material fallbacks) moved to a new `writing-all.css`, imported after `writing.css`. Every moved rule keeps its order relative to `grouped.css` and `base.css`; the one equal-specificity pair whose order changed (`.week-posts > .writing-section-title` and `.writing-section-title:first-of-type`) sets the same `margin-block-start: 0`. Nothing moved into `grouped.css`, which stays under U3's 4096-byte inline guard. `writing.css` keeps the shared `.writing-section-title` and `/writing`'s capsules and topic counts.
- **No rendered change, measured.** A temporary Chromium probe hashed every element's computed style, including `::before` and `::after`, on `/`, `/writing` and `/writing/all` at 320 and 1024 px, light and dark, with and without increased contrast: 24 cells. Custom properties were sorted first, because Chromium lists them in no fixed order. All 24 hashes before the move equal all 24 after it. The probe file was deleted and never committed. Every page still inlines its CSS: no new stylesheet request, and the HTML shrank on all three pages (`/` 27,222 → 25,800 B, `/writing` 29,733 → 27,709 B, `/writing/all` 34,404 → 33,803 B, HIG fixture build).

### Measurements

| Measure | Before | After | Target |
|---|---|---|---|
| `wc -c site/src/styles/writing.css` | 3,998 B | 1,100 B | ≤ 3,072 B (R-01) — Met |
| `site/src/styles/writing-all.css` | — | 2,598 B | none set; inlined on `/writing/all` |
| `site/src/styles/home.css` | 1,209 B | 2,218 B | none set; inlined on `/` |

### Verification command

`(cd preprocessor && cargo fmt --check && cargo test --release) && just preprocess && (cd site && npm run test:unit && npm run test:pbt && npm run format:check && npx astro check && npx playwright test --config playwright.hig.config.ts) && just crossunit` — **exit 0**.

| Part | Result |
|---|---|
| `cargo fmt --check` | pass |
| `cargo test --release` | pass (179) |
| `just preprocess` | pass (`published 17 posts, 1 site pages, 3 assets`) |
| `npm run test:unit` | pass (547 tests, 48 files; +5 from Steps 12–13) |
| `npm run test:pbt` | pass (36) |
| `npm run format:check` | pass |
| `npx astro check` | pass (0 errors, 0 warnings) |
| HIG Playwright (3 browsers) | pass (1,184 passed, 79 skipped, 0 failed; 5.7 min) |
| `just crossunit` | pass (link sweep: 816 references over 40 pages, 1 declared known-broken; 16/16) |

The crossunit line was output-silenced inside the chained command. It was re-run on its own afterwards to read its counts, also with exit 0.

### Deviations

- **Per-step full suite.** Before the Step 11 commit, the whole writing spec ran in three browsers. Before the Step 12 commit, the unit suite ran. Before the Step 13 commit, the full HIG suite, the unit suite and `astro check` ran. The full recorded command ran once, in Step 14, over the final tree.
- **Step 11 had no failing Red.** The plan said it would pass on today's code. The temporary `/writing/graph` run above is the evidence that the check can fail.
- **`CLAUDE.md` in Step 13.** The note on where the Writing styles live was updated alongside the move, so the documentation stays true.

## Loop-back 2 repair (2026-11-20)

Build and Test run 2 graded U2-NFR5.19 and U2-NFR1.5 Not Met, from U2 review-02's Minor findings R-05 (`CONTENT_DIR_OVERRIDE` does not fail closed) and R-06 (inline scripts unchecked). Steps 15–17 repair them on `feature/u3-writing-moves`. Steps 1–14 were confirmed present (commits `0f312eb`, `0ef1e89`, `ae84c34` and the earlier U2 commits; `writing-lists.ts`, the Writing pages and components, `writing-all.css`, the empty-build and CSS-size tests; `homepage.ts` gone; `writing.css` 1,100 B) and not redone.

### Commits

| Hash | Message |
|---|---|
| `7b8aab7` | fix: 콘텐츠 경로 덮어쓰기를 시험 실행에서만 받아들이도록 합니다 |
| `b7efd85` | test: Writing 화면의 인라인 스크립트도 태그 화면과 같은지 확인합니다 |

### Files

| Step | Files |
|---|---|
| 15 | changed `site/src/lib/data.ts` (exported `resolveContentDir(env)`, `WR002`), `site/tests/unit/content-data.test.ts` (5 new tests), `CLAUDE.md` (the rule and `WR002`) |
| 16 | changed `site/tests/e2e/hig-writing.spec.ts` (inline-script check in the NFR1.5 block, Chromium only) |

`site/src/pages/writing/index.astro` was edited for the Step 16 Red probe only and reverted before the commit; it has no diff.

### TDD record

| Step | Red command (from `site/`) | Failing output | Green |
|---|---|---|---|
| 15 | `npx vitest run --config vitest.config.ts tests/unit/content-data.test.ts` | `5 failed \| 9 passed (14)`: `expected 'undefined' to be 'function'` and `TypeError: resolveContentDir is not a function`; the two fail-closed cases `expected [Function] to throw error matching /^WR002 CONTENT_DIR_OVERRIDE: / but got 'resolveContentDir is not a function'` | `17 passed` with `writing-empty-build.test.ts` in the same run (14 + 3) |
| 16 | `npx playwright test --config playwright.hig.config.ts --project=chromium -g "NFR1.5" tests/e2e/hig-writing.spec.ts`, with a temporary `<script is:inline>window.__redProbe = 1;</script>` in `writing/index.astro` | `1 failed`, `1 passed`: on `/writing`, `- "count": 6` / `+ "count": 7` and one extra hash `+ "ee4afc04…fc68a8"`. The request-based check still passed, which is the gap R-06 named | Probe reverted: `2 passed`; whole writing spec in 3 browsers `63 passed, 6 skipped` |

Against today's code the new Step 16 check passed before the probe, as the plan expected: the Writing pages carry the same six inline scripts as `/writing/tags`.

### Decisions

- **Marker (Step 15).** The override is honoured only when `VITEST` is non-empty. Vitest sets it in its workers, and `buildSiteInto` spreads `process.env` into the child build, so the child inherits it: the Step 12 empty-build test passes unchanged, which is the evidence. No second marker was needed. An empty `VITEST` does not count.
- **Where it fails.** `CONTENT_DIR` is resolved once at module load from `resolveContentDir(process.env)`, so a stray override fails the whole build before any page renders. Checked end to end: `env -u VITEST CONTENT_DIR_OVERRIDE=/tmp/nonexistent-tree npx astro build --outDir <tmp>` exits 1 with `WR002 CONTENT_DIR_OVERRIDE: set outside a Vitest run — unset it; it is test-only`. The temporary output was outside the repository; `site/dist` was not written.
- **Code.** `WR002` continues the U2 `WR` family (`WR001` is the manifest check). The message names the variable first, after the code, like `WR001` names its path.
- **Assets folder.** The override still moves only `data.ts`'s reads, not `render.ts`'s `../content/assets`; `CLAUDE.md` now says so (R-05's second point). With the override confined to tests, no production build can mix two trees.
- **Inline-script check (Step 16).** Every `script:not([src])` in the settled page counts, including the JSON-LD and the `BaseLayout` bootstrap scripts. The comparison is the count plus the sorted SHA-256 of each `textContent`, so order differences do not matter but any added, removed or changed body does. The reference set must be non-empty.

### Verification command

`(cd preprocessor && cargo fmt --check && cargo test --release) && just preprocess && (cd site && npm run test:unit && npm run test:pbt && npm run format:check && npx astro check && npx playwright test --config playwright.hig.config.ts) && just crossunit` — **exit 0**. `npx astro preview status` reported no preview server before and after.

| Part | Result |
|---|---|
| `cargo fmt --check` | pass |
| `cargo test --release` | pass (179) |
| `just preprocess` | pass (`published 17 posts, 1 site pages, 3 assets`) |
| `npm run test:unit` | pass (572 tests, 48 files) |
| `npm run test:pbt` | pass (36) |
| `npm run format:check` | pass |
| `npx astro check` | pass (0 errors, 0 warnings) |
| HIG Playwright (3 browsers) | pass (1,233 passed, 81 skipped, 0 failed; 5.9 min) |
| `just crossunit` | pass (link sweep: 816 references over 40 pages, 1 declared known-broken; 16/16) |

The output of the chained command was written to a log file and the counts read from it.

### Deviations

- **Per-step full suite.** Before the Step 15 commit, the unit and property suites and `astro check` ran. Before the Step 16 commit, the whole writing spec ran in three browsers and `astro check` ran. The full recorded command ran once, in Step 17, over the final tree.
- **`source-manifest.json` unchanged.** Every file Steps 15–16 touched was already listed.
