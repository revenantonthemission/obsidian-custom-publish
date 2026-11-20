# Unit Test Instructions — U2 `u2-writing-section`

## Framework setup

U2 adds no new framework.

| Runner | Config | Notes |
|---|---|---|
| Vitest | `site/vitest.config.ts` (unit) | |
| Vitest | `site/vitest.pbt.config.ts` (properties) | needs `PBT_RUNS` and `PBT_SEED` set |
| Playwright | `site/playwright.hig.config.ts` | its web server builds the fixture site with `HOMEPAGE_TODAY_OVERRIDE` set |

## How to run this unit's tests (from the repository root)

1. Fixture content for the site tests:
   ```
   just preprocess
   ```
2. Unit tests:
   ```
   cd site && npx vitest run --config vitest.config.ts tests/unit/writing-lists.test.ts tests/unit/content-data.test.ts tests/unit/homepage-empty-week.test.ts
   ```
3. Property tests:
   ```
   cd site && PBT_RUNS=100 PBT_SEED=42 npx vitest run --config vitest.pbt.config.ts tests/pbt/u2/writing-lists.pbt.test.ts
   ```
4. Browser tests for the three pages:
   ```
   cd site && npx playwright test --config playwright.hig.config.ts tests/e2e/hig-writing.spec.ts tests/e2e/hig-pages.spec.ts
   ```

The full gate is the recorded verification command, run once in Step 9 and again in Build and Test.

## Expected coverage targets

| Component | Tests |
|---|---|
| WritingLists | 18 examples and 4 properties |
| Content seam (`WR001`) | 4 |
| `/writing/all` | about 10 Playwright tests |
| `/writing` | about 7 Playwright tests |
| Homepage weekly section | about 4 Playwright tests |
| Homepage empty week | 5 Vitest cases over an isolated build (`homepage-empty-week.test.ts`) |
| Axe matrix | 2 new routes at 4 widths × 2 themes, plus reduced motion |

Coverage on the whole project is reported by Build and Test on the full suite; no minimum percentage is enforced (team.md Testing Posture; maintainer decision 2026-11-20, human-made requirement change). No threshold is changed here.

## Mocking and stubbing

- No mocks of the content files. The `WR001` tests use temporary content directories passed through the new parameter.
- The clock is injected into `resolveKoreanBuildDate(env, now)`. Page-level week behaviour is tested only in the HIG build, which has a fixed override.

## Test data

- **Fixture vault:** `fixtures/vault/Notes/` gains `Undated Post.md`, `Post <b>Bold</b> & Co.md` and `This Week Post.md`. None is tagged `test`. An existing note dated 2024 provides the second year.
- **Weekly list:** the HIG runner's override date puts two fixture posts in "이번 주 글". The empty week for AC3.4.1 is built by the unit suite: `site/tests/unit/homepage-empty-week.test.ts` runs an isolated build with `HOMEPAGE_TODAY_OVERRIDE=2025-08-20`, so the check no longer waits for the sealed `npm run test:e2e` provider.
- **Real content:** real-content measurements use a temporary copy of `Areas/Notes` and are never stamped. Run `just preprocess` afterwards to restore the fixture content.
