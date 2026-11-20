# Unit Test Instructions — U4 `u4-navigation`

## Framework setup

U4 adds no new framework and changes no configuration file.

| Runner | Config | Notes |
|---|---|---|
| Vitest | `site/vitest.config.ts` (unit) | |
| Vitest | `site/vitest.pbt.config.ts` (properties) | needs `PBT_RUNS` and `PBT_SEED` set |
| Playwright | `site/playwright.hig.config.ts` | its web server builds the fixture site and serves `site/dist` on 127.0.0.1:4329 |
| Playwright | `site/playwright.crossunit.config.ts` | JavaScript disabled at the project level; matches `crossunit.spec.ts` only |
| Playwright | `site/playwright.config.ts` | the evidence-sealed provider route (`npm run test:e2e`); closed on this branch while the manual accessibility record is stale |

## How to run this unit's tests (from the repository root)

1. Fixture content for the site tests:
   ```
   just preprocess
   ```
2. Unit tests (the model, the marker rule and the rendered chrome):
   ```
   cd site && npx vitest run --config vitest.config.ts tests/unit/profile-metadata-navigation.test.ts tests/unit/profile-presentation.test.ts
   ```
3. Property test U1-P10:
   ```
   cd site && PBT_RUNS=100 PBT_SEED=42 npx vitest run --config vitest.pbt.config.ts tests/pbt/u1/profile-metadata-navigation.pbt.test.ts
   ```
4. Browser tests for the bar and the sheet:
   ```
   cd site && npx playwright test --config playwright.hig.config.ts tests/e2e/hig-chrome.spec.ts
   ```
5. The JavaScript-off smoke and the link sweep:
   ```
   just crossunit
   ```
6. The homepage expectation (`site/tests/e2e/homepage.spec.ts`) runs in the evidence-sealed provider route, `npm run test:e2e`, which is project-wide and stays closed on this branch: U4 changes four review-subject files, so the provider refuses with `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` until the owner redoes the manual 16-state accessibility review. The updated expectation is therefore written in Step 6 and recorded as not executed in this unit; it runs at Build and Test after that refresh. The same behaviour is asserted in the HIG suite (Step 5), which does run here.

The full gate is the recorded verification command, run once in Step 9 and again in Build and Test.

## Expected coverage targets

| Component | Tests |
|---|---|
| Navigation model and marker rule (`site/src/lib/navigation.ts`) | 14 examples in `tests/unit/profile-metadata-navigation.test.ts` |
| Marker property (U1-P10) | 1 property over the path-case arbitrary |
| Rendered chrome (`Header.astro`, `MobileNav.tsx`) | 3 rewritten expectations in `tests/unit/profile-presentation.test.ts` |
| Bar and sheet (`site/tests/e2e/hig-chrome.spec.ts`) | about 6 Playwright examples |
| Homepage header (`site/tests/e2e/homepage.spec.ts`) | 1 rewritten expectation (provider route, closed on this branch) |
| No-JS header (`site/tests/e2e/crossunit.spec.ts`) | 1 rewritten expectation |
| Axe matrix | the existing `HIG_ROUTES` matrix at 4 widths × 2 themes, plus reduced motion |

The 80 % line-coverage scope floor is measured by Build and Test on the full suite. No threshold is changed here.

## Mocking and stubbing

- No mocks. The model, the marker rule and the rendered markup are exercised against the real sources; the browser checks run against the fixture build the HIG runner serves.
- The marker rule reads no clock and no environment, so no time injection is needed.

## Test data

- **Fixture vault:** unchanged. U4 adds, removes and rewrites no fixture note; the `/writing` routes come from U2's branch.
- **Paths:** `tests/unit/profile-metadata-navigation.test.ts` exercises exactly these literal paths:
  - marker `page`: `/writing`, `/writing/`, `/writing?ref=nav#top`;
  - marker `section`: `/writing/all`, `/writing/all/`, `/writing/all?from=writing`, `/writing/tags`, `/writing/tags/%EC%9A%B4%EC%98%81%EC%B2%B4%EC%A0%9C` (a percent-encoded Korean tag), `/writing/graph`;
  - no marker: `/`, `/writing-old`, `/writingold`, `/Writing`, `/WRITING/all`, `/resume`, `/portfolio`, `/posts/post-with-code`; the profile local state on `/portfolio/example`;
  - fail closed with `navigation.current.invalid@profile.navigation.current` (NFR5.21's five classes): an encoded slash `/writing%2fhidden`; a double slash `/writing//all`; control or whitespace characters `/writing` + NUL (U+0000), `/writing` + tab + `all`, `/writing all` (a space), `/writing/all` + DEL (U+007F); bad percent escapes `/writing%zz`, `/writing/all%E`, `/writing%`; backslashes `/writing\all` and its encoded form `/writing%5Call`;
  - hostile primary models, fed to `getNavigationState` (the validation `getPrimaryNavigationState` and so `Header.astro` build through) on `/writing`, each failing with `navigation.model.invalid@profile.navigation.model`: the model plus a second item (`/extra` and `/tags`), Writing → `/blog`, Writing → `/writing/all`, `/writing` relabelled `Blog`, and an empty model.

  The property's arbitrary generates `/writing` and `/writing/<segment>` cases.
- **Real content:** no real-content measurement belongs to this unit; the fixture build is the measurement target.
