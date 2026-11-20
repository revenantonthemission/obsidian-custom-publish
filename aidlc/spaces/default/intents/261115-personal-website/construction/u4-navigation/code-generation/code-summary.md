# Code Summary — U4 `u4-navigation`

## What shipped

The primary navigation is one item: Writing → `/writing`, in the floating bar and in the phone sheet. The
Writing marker is derived once, from the frozen model's href: `/writing` is `page`, every `/writing/…`
descendant is `section`, and every other path is unmarked. The rendered vocabulary is `aria-current="page"`
for the route itself, `aria-current="true"` for its sections, and no attribute everywhere else, with one
visible indicator per surface (weight, a 2 px `--c-bar-indicator` underline in the bar, the check icon in
the sheet).

## Files modified

| Path | Change |
|---|---|
| `site/src/lib/navigation.ts` | The primary model holds one frozen item; `resolveNavigationMarker(pathname)` returns `page`, `section` or null; the states carry `ariaCurrent` beside `current`; the marker is classified by one function (`markerForPath`) that both the exported marker and the shared state builder use; the existing validation and coded diagnostics are unchanged |
| `site/src/components/Header.astro` | The bar link renders `aria-current={item.ariaCurrent ?? undefined}`; the fail-closed `TypeError('Invalid primary navigation state.')` and the site title's own `aria-current="page"` on `/` are unchanged |
| `site/src/islands/MobileNav.tsx` | The sheet row renders `aria-current={item.ariaCurrent ?? undefined}`; the check icon still follows `current` (true for both marker values); the sheet stays a static native `<details>` with no island and no client directive |
| `site/src/styles/chrome.css` | The current-item rules are extended to `[aria-current='true']` for the bar link and for the sheet row's icon; no new token, no animation; 9,561 → 9,717 B |
| `site/tests/unit/profile-metadata-navigation.test.ts` | The shared navigation contracts: the one-item frozen model, the marker table, the rendered vocabulary, the unchanged profile model, three fail-closed cases, the frozen outputs |
| `site/tests/unit/profile-presentation.test.ts` | The one-item bar, the profile routes' unmarked primary navigation, the bar's marker values on `/writing` and `/writing/all` |
| `site/tests/pbt/u1/arbitraries/metadata.ts` | `navigationPathCaseArbitrary` generates `/writing`, `/writing/<segment>`, the profile routes and the prefix collisions, each with its expected marker value |
| `site/tests/pbt/u1/profile-metadata-navigation.pbt.test.ts` | U1-P10 asserts the one-item model, the marker vocabulary, the model/state equality and the frozen models |
| `site/tests/e2e/hig-chrome.spec.ts` | The one-row sheet, the no-JS navigation, the marker values on both surfaces, at most one marked item per surface, the indicator for both values, the focus ring on `/writing` |
| `site/tests/e2e/crossunit.spec.ts` | `CORE_NAV_TARGETS = ['/writing']` |
| `site/tests/e2e/homepage.spec.ts` | The bar carries the single `/writing` link; the opening keeps its Résumé and Portfolio capsules |
| `CLAUDE.md` | The one-item bar, the marker vocabulary and where the marker is derived, the `chrome.css` budget, the review-subject consequence, and the refreshed test counts |

No file was created in the application tree; no island, script, stylesheet, font or image was added.

## Key implementation decisions

1. **One derivation of "current" (BR1.2, BR1.3).** `markerForPath(path, href)` is the only classifier:
   exact → `page`, descendant → `section`, otherwise null. `resolveNavigationMarker(pathname)` reads the
   href from the frozen primary model instead of repeating the literal, and the shared state builder uses
   the same function, so the marker and the rendered attribute can never disagree.
2. **The two models share the builder but not the vocabulary.** The primary model maps `page` → `'page'` and
   `section` → `'true'`; the profile local model keeps `'page'` for its current route family (BR1.5), and
   `ProfileLocalNavigation.astro` is untouched.
3. **Fail-closed validation is unchanged.** The coded diagnostics `navigation.model.invalid@profile.navigation.model`
   and `navigation.current.invalid@profile.navigation.current` still stop the build; `Header.astro` still throws
   `TypeError('Invalid primary navigation state.')`. An invalid path yields no marker, never a guess.
4. **The sheet stays static.** The phone sheet is still a native `<details>` with static HTML, so it opens
   and navigates with JavaScript off and adds no request (NFR2.3, NFR3.3).
5. **The indicator is reused, not redesigned.** The existing current-item rules were extended to
   `[aria-current='true']`; no new colour token, no motion, and the profile view keeps its own marker.
6. **The model, its items and its states stay frozen**, and `current` keeps its meaning so the sheet's icon
   logic and the profile view need no change.

## Test coverage summary

| Suite | Command | Result |
|---|---|---|
| Rust | `(cd preprocessor && cargo fmt --check && cargo test --release)` | 179 tests pass (47 in the library target + 132 across the integration targets), formatting clean — corrected in loop-back 1 (review R-04); the figure is the one the suite reports on `feature/u3-writing-moves` on 2026-11-20 |
| Vitest unit | `cd site && npm run test:unit` | 40 files, 490 tests pass |
| fast-check | `cd site && npm run test:pbt` | 6 files, 36 properties pass |
| Prettier | `cd site && npm run format:check` | clean |
| Type check | `cd site && npx astro check` | 0 errors, 0 warnings |
| HIG browser | `cd site && npx playwright test --config playwright.hig.config.ts` | 1,212 tests: 1,141 pass, 71 skip (engine limits) |
| No-JS and link sweep | `just crossunit` | 804 internal references across 40 pages resolve apart from the fixture's one declared broken image; 10 no-JS tests pass |

The recorded Construction Verification Command
`(cd preprocessor && cargo fmt --check && cargo test --release) && just preprocess && (cd site && npm run test:unit && npm run test:pbt && npm run format:check && npx astro check && npx playwright test --config playwright.hig.config.ts) && just crossunit`
exited 0 in this stage.

New or rewritten tests: 30 examples in the navigation unit file (the one-item model, the 9-path marker table
and the no-marker paths, the rendered vocabulary, the unchanged profile model, three fail-closed cases, the
frozen outputs), 3 expectations in the presentation file, the rewritten U1-P10 property and its path-case
arbitrary, 4 new plus 3 rewritten Playwright examples in `hig-chrome.spec.ts`, and the rewritten link
expectations in `crossunit.spec.ts` and `homepage.spec.ts`. Every former four-item expectation was updated,
none was deleted.

## Measurements (Step 8)

| Metric | Baseline (U2 head, Step 1) | After U4 | Budget | Verdict |
|---|---|---|---|---|
| Fixture build, median of 3 | 3.50 s (idle machine) | 5.18 s (load average 6.5); the base measured back-to-back under the same load: 5.17 s | ≤ 3.81 s | GAP, load-dependent: U4's own delta is +0.01 s (noise); the budget was met at the baseline conditions and is missed under this load by the base as well. Not relaxed. |
| `/` transferred bytes | 255,771 B (18 requests, 3 week rows) | 255,674 B (18 requests, 3 week rows) | ≤ 255,351 B | GAP: −97 B against the baseline, but still 323 B over a budget the baseline already missed by 420 B. Not relaxed. |
| `/writing` transferred bytes | 281,225 B (19 requests) | 254,634 B (18 requests) | recorded, no budget | −26,591 B and one request fewer |
| `/writing/all` HTML, real vault (137 ordinary posts) | 107,795 B (787 B/row) | 106,391 B (777 B/row) | ≤ 107,795 B | met, −1,404 B |
| `/writing/all` HTML, fixture (17 ordinary posts) | 35,808 B | 34,404 B | the 107,795 B budget is the real-vault figure | −1,404 B, consistent with the real-vault delta |
| `site/src/styles/chrome.css` | 9,561 B | 9,717 B | ≤ 10,000 B | met, +156 B |

The real-vault figures come from the vault's `Areas/Notes` with the fixture `Pages` folder; the vault's own
`Areas/Pages` is still missing and still awaits the owner's rewording of the project rule.

**Superseded (loop-back 2, review-02 R-01):** the `/` and `/writing` rows and the build-time row above are the
original Step 8 record and stay as written. Their page-weight explanation — a 255,771 B baseline, "the
baseline already missed by 420 B", and a 19 → 18 request drop with no cause — is replaced by the corrected
record below.

### Corrected page-weight record (loop-back 2, review-02 R-01)

Like-for-like figures from Build and Test `test-results.md` §6.2 (Chromium via Playwright + CDP
`encodedDataLength`, cache disabled, 1440×900, the HIG fixture build, 3 fresh contexts per route with
identical totals):

| Measurement | `/` transferred | Source |
|---|---|---|
| Run 1, U2 head | 255,770 B | §6.2 "Run 1's reference figures" |
| Run 1, U4 head | 255,675 B | §6.2 "Run 1's reference figures" |
| U4's own delta on `/` | −95 B, like for like (U2 head 255,770 B against U4 head 255,675 B). Build and Test's −99 B (§8, the summary's U4-PD-ROOT-BYTES row) compares the U2 head with the run-1 assembled head `40fa3e7` (255,671 B), which also carries U3's changes | §6.2, §8 |
| Run 2, assembled `b9915d8` | 255,387 B, 18 requests | §6.2 table |
| U4 absolute budget | 255,351 B → 36 B over. The maintainer reset this budget to the measured 255,387 B on 2026-11-20 (human-made requirement change), which the measurement meets | §6.2 "Budgets"; maintainer decision 2026-11-20 |

- **Which baseline reproduces:** the U2 head measured like for like (255,770 B) is the baseline that
  reproduces. The design baseline of 255,351 B does not reproduce on the U2 head, and neither does the
  design's 3.63 s build time (Build and Test §6.1 measures U2 at 3.61 s and U4 at 3.58 s medians). U4's
  `/` budget is therefore graded against the absolute 255,351 B, as the design directs when the baseline
  does not reproduce. That grade stays **Not Met (GAP)** and is the maintainer's decision (open decision 2);
  nothing was relaxed.
- **Budget reset (2026-11-20):** the maintainer reset the `/` budget to the measured 255,387 B (open
  decision 2), recorded as a human-made requirement change, so the 36 B overshoot is closed without any
  product change. A custom Pretendard subset for the week rows' glyphs stays a follow-up.
- **U4's own effect on `/` is a reduction** (−95 B like for like; the −99 B graded figure is measured
  against the assembled head `40fa3e7`). The overshoot belongs to the base the unit was built on, not to the
  navigation change.
- **Why `/writing` dropped one request (19 → 18):** removing "Résumé" from the bar dropped the Pretendard
  font subset that only its `é` needed, so that subset file is no longer requested (Build and Test, review-02
  R-01). The size of that dropped file was not measured on its own. The −26,591 B drop is of the same order
  as a comparable Pretendard subset (the ≈ 25.7 KB subset the week rows pull onto `/`, Build and Test §8),
  but that is a different file. The `/writing` baseline of 281,225 B comes from Step 1 and was not
  re-measured like for like in Build and Test.

## Tests written but not executed in this stage

- `site/tests/e2e/homepage.spec.ts` — the evidence-sealed provider (`npm run test:e2e`) fails closed with
  `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`, because U4 changes four manual-accessibility review-subject
  files (`site/src/lib/navigation.ts`, `site/src/components/Header.astro`, `site/src/islands/MobileNav.tsx`,
  `site/src/styles/chrome.css`). The owner redoes the 16-state review once at release end; the record was
  never re-stamped here. The same behaviour is executed in this stage by the HIG suite (the bar carries one
  `/writing` link, the marker values, the one-row sheet) and by `just crossunit` (the homepage's own Résumé
  and Portfolio capsules with JavaScript off).
- `npm run test:e2e` as a whole — the same reason; it is not part of the merge gate.

## Deviations from the plan

1. **Steps 2 and 3 were committed together** (commit `12d3e89`). The property test covers the same one-item
   model and marker behaviour as the unit test; writing it after the Step 2 implementation would have
   skipped its failing-test-first Red, and committing it before would have left the suite red between the
   two commits, which the team's green-suite rule forbids. The property's Red was still recorded: the
   implementation was set aside and the property was run against the base implementation, where it failed
   on the four-item model.
2. **The stale four-item expectations moved into the Step 2–3 commit.** The plan assigned
   `site/tests/unit/profile-presentation.test.ts` to Step 4, but the model change invalidates that file's
   constant and the property's expectations, and the suite must be green before every commit. Step 4
   therefore carries the new marker-value Red (`/writing` → `page`, `/writing/all` → `true` in the bar)
   instead of the stale constant.
3. **Steps 7 and 9 changed no file**, so they carry no commit of their own; both are recorded here as
   verification results.
4. **The `/writing/all` budget was compared like for like.** The plan names 107,795 B "at the fixture post
   count", but that figure was measured on the real vault (137 ordinary posts); the fixture has 17. Both
   were measured before and after and both are recorded above.
5. **The build-time budget was measured under load.** The branch and the base were measured back-to-back
   under the same machine load so that U4's own contribution is separated from the load; the absolute
   budget's miss under that load is recorded as a GAP, never relaxed.

## Loop-back 1 repair

Build and Test (loop-back 1 of 3, 2026-11-20) graded U4-NFR5.21 and U4-NFR1.11 Not Met. Steps 11–13 of the
plan were built on `feature/u3-writing-moves` (the assembled stack U1 → U2 → U4 → U3); no application source
changed, only tests and records.

### Step 11 — fail-closed paths and the hostile model (NFR5.21; review R-02)

- `site/tests/unit/profile-metadata-navigation.test.ts` gains 16 cases (the file now holds 45 tests):
  - control or whitespace characters — `/writing` + NUL, `/writing` + tab + `all`, `/writing all`,
    `/writing/all` + DEL;
  - bad percent escapes — `/writing%zz`, `/writing/all%E`, `/writing%`;
  - backslashes — `/writing\all` and its encoded form `/writing%5Call`;
  - each expects exactly `navigation.current.invalid@profile.navigation.current` from
    `getPrimaryNavigationState` and no marker from `resolveNavigationMarker`. With the existing encoded-slash
    and double-slash cases, all five NFR5.21 path classes are now tested.
- The hostile-model check uses the existing validation entry point. The site build reaches the model only
  through `getPrimaryNavigationState` in `Header.astro`, which validates through `getNavigationState` and
  throws `TypeError('Invalid primary navigation state.')` on a failed result. The test feeds
  `getNavigationState` five hostile models on `/writing` — two items, Writing → `/blog`, Writing →
  `/writing/all`, `/writing` relabelled `Blog`, and an empty model. Each fails with exactly
  `navigation.model.invalid@profile.navigation.model`. A sixth case asserts that the build entry equals
  that validation for the frozen model. No isolated `buildSiteInto` build was needed, because a unit-level
  entry exists.
- Red: all 16 cases passed on the first run (`npx vitest run --config vitest.config.ts
  tests/unit/profile-metadata-navigation.test.ts -t "fails closed|hostile|build entry"` → 16 passed), because
  `navigation.ts` already rejected these inputs. To show that the tests can fail, `navigation.ts` was
  mutated locally for one run. Path normalisation was bypassed and `resolveApprovedModel` accepted any
  model. 14 failed: the existing fail-closed test, the 9 new path cases and the 4 non-empty hostile models.
  The empty model and the build-entry equality still passed, as expected: an empty model is rejected
  earlier by the item inspection. The mutation was reverted with the editor (no git restore), and
  `git status -- site/src` was clean afterwards.
- While building Step 12 a second mutation (Writing plus `/writing/all`) made the fixture build itself
  fail on `/writing/all`. Header threw `TypeError('Invalid primary navigation state.')` from the
  `navigation.current.invalid` diagnostic. This is incidental evidence that a hostile model stops the real
  build.
- `unit-test-instructions.md` "Test data" now lists exactly the paths and models the tests exercise.
- Commit `6f7cf1d` `test: 주요 탐색이 잘못된 경로와 모델에서 닫힌 채 실패함을 확인합니다`.

### Step 12 — one link in the bar, asserted in Playwright (NFR1.11; review R-03)

- `site/tests/e2e/hig-chrome.spec.ts` gains the block "one Writing link in the bar". At 1024 px it visits
  every `HIG_ROUTES` route — the same set the chrome-targets block visits, now including U3's
  `/writing/tags`, `/writing/tags/test` and `/writing/graph`. It asserts the expected HTTP status, that
  `.desktop-nav` holds exactly one link and that the link goes to `/writing`. It also asserts that the bar
  and the sheet (`nav.mobile-nav-dropdown`, counted in the DOM of the closed `<details>`) each carry at most
  one `aria-current`. That is 16 routes × 3 engines = 48 tests.
- Red: all 48 passed on the first run, because the behaviour exists. Two temporary local mutations showed
  the test can fail, each in Chromium:
  - a second primary item (`/resume`) made all 16 routes fail on `toHaveCount(1)` (received 2);
  - doubled sheet rows in `MobileNav.tsx` made exactly the five marked routes (`/writing`, `/writing/all`,
    `/writing/tags`, `/writing/tags/test`, `/writing/graph`) fail on "the sheet marks at most one item"
    (received 2).
  Both mutations were reverted with the editor, and `git status -- site/src` was clean afterwards. The full
  `hig-chrome.spec.ts` then passed: 700 passed, 44 skipped.
- This corrects the R-03 attribution. The bar's one-link count is now asserted by the HIG suite, which runs
  here, as well as by `site/tests/unit/profile-presentation.test.ts` and the sealed
  `site/tests/e2e/homepage.spec.ts`.
- Commit `bea8e2f` `test: 상단 막대에 Writing 링크가 하나뿐임을 브라우저에서 확인합니다`.

### Step 13 — records

- **NFR1.11 wording: pending with the maintainer.** NFR1.11 says `aria-current` is emitted "at most once
  per page". The design, the code and the new Step 12 test mark at most one item per surface, and only one
  surface renders at a given width (bar ≥ 768 px, sheet below). The maintainer approved the repaired plan
  without choosing between the two options, and this repair does not choose for them:
  - **(a)** amend NFR1.11 to "at most once per surface, and only one surface renders at a given width".
    This reopens U4's NFR Requirements stage, a separate, small step.
  - **(b)** accept the per-surface reading as meeting NFR1.11 and record that acceptance here.
  Until the maintainer decides, the requirement text and the implementation still read differently (review
  R-05). The test half of NFR1.11 is in place whatever the decision.
- The Rust row of the test coverage summary is corrected to the number the suite reports: 179 = 47 + 132
  (review R-04).
- `source-manifest.json` keeps all 12 entries. The repair wrote only two application files, both already
  listed: `site/tests/unit/profile-metadata-navigation.test.ts` and `site/tests/e2e/hig-chrome.spec.ts`.
- `traceability.json`: NFR5.21 now targets the test file that proves all five path classes and the hostile
  models. NFR1.11 stays on `hig-chrome.spec.ts`, which now asserts the one-link bar and the per-surface
  limit.
- Plan deviation (review R-02): the original Step 2 named a control-character fail-closed case that was not
  written in the first pass. It is written now, together with the bad-percent-escape, backslash and
  hostile-model cases that NFR5.21 names.
- Still the maintainer's and not part of this repair: the `/` page-weight budget (U4-PD-ROOT-BYTES, review
  R-01, shared with U2-NFR1.8), the R-06 design wording, and the manual 16-state accessibility review.

### Verification (loop-back 1)

The recorded Construction Verification Command exited **0** on `feature/u3-writing-moves` after `bea8e2f`.
The HIG step ran with `--reporter=dot --quiet` added for output size; no test or project selection changed.

| Step | Result |
|---|---|
| `cargo fmt --check && cargo test --release` | clean; 179 passed (47 + 132), 0 failed |
| `just preprocess` | 19 sources, 17 posts, 1 site page, 3 assets |
| `npm run test:unit` | 48 files, 562 tests pass |
| `npm run test:pbt` | 6 files, 36 properties pass |
| `npm run format:check` | clean |
| `npx astro check` | 219 files, 0 errors, 0 warnings, 7 hints |
| `npx playwright test --config playwright.hig.config.ts` | 1,311 tests: 1,232 passed, 79 skipped (engine limits), 0 failed |
| `just crossunit` | 816 internal references across 40 pages resolve, apart from the 1 declared broken fixture image; 16 no-JS tests pass |

## Loop-back 2 repair

Build and Test run 2 (2026-11-20) graded U4-NFR5.21 Not Met (review-02 R-07) and found the page-weight record
uncorrected (review-02 R-01). Steps 14–16 were built on `feature/u3-writing-moves`. No application source
changed: `site/src/components/Header.astro`, `site/package.json` and `site/vitest.config.ts` are untouched.

### Step 14 — a failed navigation state stops the build at `Header.astro` (NFR5.21; review-02 R-07)

- New file `site/tests/unit/header-navigation-failure.test.ts` (4 tests). It renders the real
  `Header.astro` through Astro's container API (`experimental_AstroContainer` from `astro/container`, with
  the Preact container renderer loaded through `loadRenderers` from `astro:container`):
  - `/writing%zz` and `/writing\all` each make the render reject with a `TypeError` whose message is
    "Invalid primary navigation state.";
  - `/writing` renders a `.desktop-nav` that holds exactly one link, to `/writing`, and exactly one
    `aria-current` (`"page"`), so the rejection cases cannot pass for the wrong reason;
  - `/writing/all` renders exactly one `aria-current="true"` in the bar and no `"page"`.
- Approach: the container, not an isolated build. The existing unit config (`site/vitest.config.ts`) is
  already built with Astro's `getViteConfig`, so it compiles `.astro` imports, and `npm run test:unit`
  (`vitest run --config vitest.config.ts tests/unit`) picks the file up through its existing
  `tests/unit/**/*.test.ts` include. No separate config, no `package.json` change. Header's islands render
  in the container: ThemeToggle as a `client:load` island and MobileNav as static Preact HTML. The
  assertions read only the `.desktop-nav` element, because the rendered MobileNav sheet carries its own
  copy of the marked row.
- Red: against today's `Header.astro` all 4 tests passed on the first run (4 passed), because the throw
  exists. To show the test catches the defect, the `throw` was replaced locally with a fallback one-item
  bar (`navigationResult.ok ? navigationResult.value : [Writing, unmarked]`) for one run: **2 failed, 2
  passed** — both rejected pathnames failed on `rejects.toThrow(TypeError)` because the render resolved to
  the fallback bar's HTML. The file was restored with the editor, `git diff --exit-code
  site/src/components/Header.astro` exited 0, and the test passed again (4 passed).
- `npm run format:check` on the new file: clean. `npx astro check`: 220 files, 0 errors, 0 warnings.
- Commit `bd3b57b` `test: 잘못된 탐색 상태가 Header 에서 빌드를 멈추는지 확인합니다`.

### Step 15 — page-weight record (review-02 R-01)

The Step 8 page-weight explanation is now the corrected record under "Corrected page-weight record
(loop-back 2, review-02 R-01)" in Measurements; the original rows stay, marked superseded. U4's own delta
on `/` is −95 B like for like (U2 head against U4 head); Build and Test's −99 B compares the U2 head with
the assembled head `40fa3e7` (corrected after review-03). Either way U4 lowers `/`, and the GAP against
255,351 B stands.

### Step 16 — records

- `source-manifest.json` keeps all 12 entries and adds `site/tests/unit/header-navigation-failure.test.ts`
  (13 entries). No config file was added.
- `traceability.json`: NFR5.21 now targets `site/tests/unit/header-navigation-failure.test.ts`, the file
  that ties a rejected state to the throw at Header. The path classes and hostile models stay tested in
  `site/tests/unit/profile-metadata-navigation.test.ts`.
- Still the maintainer's and not part of this repair: the `/` budget (open decision 2), the NFR1.11
  wording (review-02 R-05) and the U4-NFR6.11 design wording (review-02 R-06).

### Verification (loop-back 2)

The recorded Construction Verification Command exited **0** on `feature/u3-writing-moves` at `bd3b57b`'s
tree. The HIG step ran with `--reporter=dot --quiet` added for output size; no test or project selection
changed. `npx astro preview status` reported no preview server before `just crossunit`.

| Step | Result |
|---|---|
| `cargo fmt --check && cargo test --release` | clean; 179 passed, 0 failed |
| `just preprocess` | 19 sources, 17 posts, 1 site page, 3 assets |
| `npm run test:unit` | 49 files, 576 tests pass |
| `npm run test:pbt` | 6 files, 36 properties pass |
| `npm run format:check` | clean |
| `npx astro check` | 220 files, 0 errors, 0 warnings, 7 hints |
| `npx playwright test --config playwright.hig.config.ts` | 1,314 tests: 1,233 passed, 81 skipped (engine limits), 0 failed |
| `just crossunit` | 816 internal references across 40 pages resolve, apart from the 1 declared broken fixture image; 16 no-JS tests pass |

## Notes for the next stage

- `site/verification/profile/manual-web-accessibility.json` is stale for this branch: the owner redoes the
  16-state review once, after the chrome settles, not after every merge.
- U3 owns `/writing/tags`, `/writing/tags/<tag>` and `/writing/graph`. The marker rule already covers them
  (`section`), and the unit and property tests assert it; the browser checks for those routes join with U3.
- Nothing was merged or pushed in this stage. The branch `feature/u4-navigation` sits on
  `feature/u2-writing-section` and merges into `develop` after U2 (and U1), with a merge commit.
