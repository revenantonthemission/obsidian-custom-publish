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
| Rust | `(cd preprocessor && cargo fmt --check && cargo test --release)` | 175 tests pass (47 unit + 128 integration), formatting clean |
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

## Notes for the next stage

- `site/verification/profile/manual-web-accessibility.json` is stale for this branch: the owner redoes the
  16-state review once, after the chrome settles, not after every merge.
- U3 owns `/writing/tags`, `/writing/tags/<tag>` and `/writing/graph`. The marker rule already covers them
  (`section`), and the unit and property tests assert it; the browser checks for those routes join with U3.
- Nothing was merged or pushed in this stage. The branch `feature/u4-navigation` sits on
  `feature/u2-writing-section` and merges into `develop` after U2 (and U1), with a merge commit.
