# Unit Test Instructions: Repository Cleanup and HIG Redesign

## Framework Setup

- **Vitest** (existing, `site/vitest.config.ts`, node environment) runs the new unit tests. No new configuration is needed.
- **Playwright** 1.61.1 with `@axe-core/playwright` 4.12.1 (existing) runs the new browser checks. They use a dedicated config, `site/playwright.hig.config.ts`, created in plan Step 9:
  - it builds the site once against the fixture content
  - it serves `site/dist` with `scripts/local-server.mjs` on `127.0.0.1:4329`
  - projects: chromium, firefox and webkit
  - viewports: 320, 768, 1024 and 1440
  - color schemes: light and dark
- **Rust** tests are unchanged (`cargo test --release --manifest-path preprocessor/Cargo.toml`).
- **Prerequisites** (fixture content, never the real vault):
  - `cargo build --release --manifest-path preprocessor/Cargo.toml`
  - `./preprocessor/target/release/obsidian-press ./fixtures/vault ./content`
  - `cp content/search-index.json content/graph.json content/previews.json content/nav-tree.json site/public/`
  - in `site/`: `node scripts/crossunit/ensure-fixture-content.mjs`
- Playwright browsers must be installed (`npx playwright install chromium firefox webkit`, already present for the profile suite).

## Run Commands (scoped to this work)

Run every command from `site/`. Each one names exact files.

- Unit, business logic (plan Steps 10–12):
  `npx vitest run tests/unit/hig-tokens.test.ts tests/unit/appearance.test.ts tests/unit/render-sections.test.ts tests/unit/search-keys.test.ts`
- Unit, built HTML (plan Step 16; needs a build in `dist/`):
  `npx vitest run tests/unit/hig-built-html.test.ts`
- Browser, by page group (plan Steps 13, 16, 19, 22, 25, 28 and 31):
  - `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-appearance.spec.ts`
  - `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-chrome.spec.ts`
  - `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-post.spec.ts`
  - `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-pages.spec.ts`
  - `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-search.spec.ts`
  - `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-profile.spec.ts`
  - `npx playwright test --config playwright.hig.config.ts --project chromium tests/e2e/hig-performance.spec.ts`
- Runner readiness (plan Step 9, before the first Red):
  `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-smoke.spec.ts`
- Prettier (plan Step 34): `npm run format:check`

The existing suites (`npm run test:unit`, `npm run test:pbt`, `cargo test --release`, `npx astro check`, `just crossunit`) are run as the regression gate in plan Steps 1, 8, 32 and 35. They are not this work's scoped commands.

## Test Inventory and Expected Coverage

| File | Tests | Covers |
|---|---|---|
| `tests/unit/hig-tokens.test.ts` | 8 | C-02, C-03 including non-text and code-panel pairs |
| `tests/unit/appearance.test.ts` | 7 | stored-value parsing, the cycle, legacy keys, blocked storage |
| `tests/unit/render-sections.test.ts` | 5 | homepage section wrapping; posts untouched; no H2 present; nested headings |
| `tests/unit/search-keys.test.ts` | 5 | composition ignored; arrows, Enter, Escape; empty results |
| `tests/unit/hig-built-html.test.ts` | 6 | C-12, C-13 |
| `tests/e2e/hig-*.spec.ts` (7 files) | about 60 matrix tests | C-01, C-04 to C-11, C-14, NFR2 |

Coverage is reported, with no minimum enforced (team practice). Each component gets 5 to 8 tests (Standard strategy). Every new test file covers the happy path and at least two error or edge cases.

## Mocking and Stubbing

- **Unit tests** are pure: `appearance.ts` takes a storage interface and a `matchMedia` result as arguments, so tests pass fakes, including one whose storage throws. The token test reads `tokens.css` from disk.
- **Browser tests** use Playwright's `page.route()` to fail `/search-index.json`, `/graph.json` and `/nav-tree.json` for the error states. They use `context.grantPermissions([])` and request logging to prove that no geolocation request and no third-party request happen. They use `emulateMedia` for `colorScheme`, `reducedMotion`, `forcedColors` and `prefers-contrast`, and the `javaScriptEnabled: false` context for C-10. They use `hasTouch` and `isMobile` contexts for the one-tap navigation check.
- **No mocks for content.** The tests run against the real fixture vault output (team practice).

## Test Data

- `fixtures/vault/` (13 notes plus an image) provides posts, hubs, tags, callouts, diagrams, math and code.
- `scripts/crossunit/ensure-fixture-content.mjs` and `scripts/profile/homepage-fixture-content.mjs` provide the homepage note with its profile slot.
- An empty "today" list comes from the fixture build date (no post published today). A non-empty case uses a route-level fixture page in the HIG config.
- `localStorage` seeds for C-11:
  - `theme=dark` with `theme-manual` set to an ISO timestamp
  - `appearance=bogus`
  - `appearance=light`
