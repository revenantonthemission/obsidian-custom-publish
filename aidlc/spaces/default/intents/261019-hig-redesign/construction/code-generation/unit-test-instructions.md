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
  - `npx playwright test --config playwright.hig.config.ts --project=chromium tests/e2e/hig-performance.spec.ts`
- Runner readiness (plan Step 9, before the first Red):
  `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-smoke.spec.ts`
- Prettier (plan Step 34): `npm run format:check`

The existing suites (`npm run test:unit`, `npm run test:pbt`, `cargo test --release`, `npx astro check`, `just crossunit`) are run as the regression gate in plan Steps 1, 8, 32, 35 and 51. They are not this work's scoped commands.

## Loop-back 1 Repair Commands (plan Steps 39–50)

Run from `site/` unless a command starts with `cargo`, which runs from the repository root.

- Image sizing and loading (Steps 39–41):
  - `npx vitest run tests/unit/render-images.test.ts`
  - `npx playwright test --config playwright.hig.config.ts --project=chromium tests/e2e/hig-performance.spec.ts`. It now includes the mobile-network profile test. Write `--project=chromium`: with a space, Playwright reads the spec path as a second project name.
- Contrast pairs (Steps 42–44):
  - `npx vitest run tests/unit/hig-tokens.test.ts`
  - `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-pages.spec.ts tests/e2e/hig-profile.spec.ts tests/e2e/hig-search.spec.ts tests/e2e/hig-post.spec.ts -g "selection states|segmented navigation selection|snippet takes|highlights"`: the browser checks that the stylesheets draw the new state colors.
- Overflow and clipping (Steps 45–47):
  - `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-chrome.spec.ts tests/e2e/hig-pages.spec.ts tests/e2e/hig-profile.spec.ts tests/e2e/hig-post.spec.ts -g "320, 375|no horizontal overflow|never scrolls sideways|diagrams fit the column|long identifiers|wide tables"`: every check that uses the overflow helper.
  - The six-width, two-appearance overflow matrix runs in the `chromium` project. The 320 px, 200%-text check runs in all three projects.
- Outline fold (Step 48): `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-post.spec.ts -g "aria-current"`
- Inline-sheet tracing (Step 49): `npx vitest run tests/unit/profile-tooling.test.ts -t "inlined"`
- Mermaid CLI arguments (Step 50): `cargo test --release --manifest-path preprocessor/Cargo.toml mermaid`

## Loop-back 2 Repair Commands (plan Steps 53–58)

Run from `site/`.

- Highlighted links (Steps 53–55):
  - `npx vitest run tests/unit/hig-tokens.test.ts`: the highlighted-link pairs on the page, the grouped background and the homepage card (both under the homepage note), the table header and every callout ground, in both appearances. The test reads the link's colors from `src/styles/*.css`, so it checks what `highlight.css` paints.
  - `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-post.spec.ts tests/e2e/hig-pages.spec.ts -g "highlight"`: the rendered checks in a callout, a table header and the homepage note, in three engines.
- Open-state overflow (Steps 56–58): `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-chrome.spec.ts -g "200 % text|six widths|open"`. This runs the C-14 check in three engines and the six-width matrix in Chromium, each extended to the open search dialog, the navigation sheet, both outline-sheet tabs and the `/graph` list. Each test name carries the state it opens, so the filter keeps every open-state test. The filter ran as written: 82 passed and 38 skipped (the 19 Chromium-only matrix tests in Firefox and WebKit). The states and their openers are `OPEN_STATES` in `tests/e2e/support/hig.ts`.

## Test Inventory and Expected Coverage

| File | Tests | Covers |
|---|---|---|
| `tests/unit/hig-tokens.test.ts` | 8 | C-02, C-03 including non-text and code-panel pairs |
| `tests/unit/appearance.test.ts` | 7 | stored-value parsing, the cycle, legacy keys, blocked storage |
| `tests/unit/render-sections.test.ts` | 5 | homepage section wrapping; posts untouched; no H2 present; nested headings |
| `tests/unit/search-keys.test.ts` | 5 | composition ignored; arrows, Enter, Escape; empty results |
| `tests/unit/hig-built-html.test.ts` | 6 | C-12, C-13 |
| `tests/e2e/hig-*.spec.ts` (7 files) | about 60 matrix tests | C-01, C-04 to C-11, C-14, NFR2 |
| `tests/unit/render-images.test.ts` (loop-back 1) | 6 | NFR2: SVG and raster sizes; the first image or diagram pair is eager; later images are lazy; a missing asset leaves the markup unchanged |
| `tests/unit/hig-tokens.test.ts` additions (loop-back 1) | 5 | NFR1: selected segment against its track; selected search snippet; highlighted code lines; links inside `mark`; the current tag chip |
| `tests/e2e/hig-performance.spec.ts` addition (loop-back 1) | 6 routes | NFR2: LCP and CLS on the mobile network profile |
| `tests/e2e/support/hig.ts` and the overflow matrix (loop-back 1) | 14 routes × 6 widths × 2 appearances | AC4.1, C-14: horizontal overflow and clipping |
| `tests/e2e/hig-post.spec.ts` addition (loop-back 1) | 1 | the fold moves `aria-current` without scrolling |
| `preprocessor` Mermaid argument test (loop-back 1) | 2 | `-p` passed only when `.puppeteer-config.json` exists |

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
