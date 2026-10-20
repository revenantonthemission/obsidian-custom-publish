# Integration Test Instructions: Repository Cleanup and HIG Redesign

The test strategy is Standard: 5–8 unit tests per component (written during Code Generation, see `unit-test-instructions.md`), plus integration tests for the key boundaries. This site has no services or databases. Its integration boundaries are:

1. **Preprocessor → `content/` → site build:** the emitted HTML contract, the homepage artifact, and the four JSON files the islands fetch.
2. **Built site → browsers:** island hydration, the fetches of `/search-index.json`, `/graph.json`, `/nav-tree.json` and `/previews.json`, the appearance bootstrap before first paint, and the modal dialogs.
3. **Built site → profile tooling:** the asset budget, the accessibility review contract, the PDF renderer and inspector.
4. **Built site → link sweep and JavaScript-off smoke test:** `just crossunit`.

## Framework Setup

- **Rust:** integration tests in `preprocessor/tests/` (77 tests in 16 files) run against `fixtures/vault/`, never against mocks.
- **Vitest:** `site/vitest.config.ts`, node environment. Isolated Astro builds take turns through `tests/unit/support/astro-build.ts`.
- **Playwright:** 1.61.1 with `@axe-core/playwright` 4.12.1, in three configurations:
  - `playwright.hig.config.ts` builds the fixture site once and serves `site/dist` on 127.0.0.1:4329 for Chromium, Firefox and WebKit.
  - `playwright.config.ts` is the `test:e2e` profile suite.
  - `playwright.crossunit.config.ts` is the cross-unit smoke test.
- **Prerequisite:** the fixture build steps in `build-instructions.md`.

## Commands

Run from the repository root unless a command starts with `cd site`.

| ID | Boundary | Command | Pass criterion |
|---|---|---|---|
| IT-1 | preprocessor and fixture vault | `cargo test --release --manifest-path preprocessor/Cargo.toml` | 0 failed (113 after the loop-back 1 repair: 36 unit, 77 integration) |
| IT-2 | content and site build (homepage, profile, HTML contract, obligation map, image sizing) | `cd site && npm run test:unit` | 0 failed (360 tests in 30 files after the repair) |
| IT-3 | seeded properties | `cd site && npm run test:pbt` | 37 passed |
| IT-4 | built site in three browsers: every redesign acceptance check, including the axe matrix, the six-width overflow matrix with clipping and the mobile-network Core Web Vitals | `cd site && npx playwright test --config playwright.hig.config.ts` | 0 failed. The 55 skips are the deliberate engine-only ones in `code-summary.md`: the first attempt's 15, plus the 12 mobile-network and 28 six-width matrix tests outside Chromium |
| IT-5 | built site, link sweep and no-JavaScript smoke test | `just crossunit` | no broken link; the Playwright half passes |
| IT-6 | profile routes and the verification provider | `cd site && npm run test:e2e` | the automated evidence passes, and the manual 16-state record matches the current review-subject digest |
| IT-7 | types across islands, components and scripts | `cd site && npx astro check` | 0 errors |
| IT-8 | built site, open dialogs and sheets (added in run 2; review finding R-18) | a scratch script (path in `test-results.md`) that applies the suite's `horizontalOverflow()` to the open search dialog with results, the navigation sheet, both outline-sheet tabs and the `/graph` list. It runs at 320 px with doubled text in three engines, and at six widths in both appearances in Chromium | no offender in any applicable state, and HTTP 200 for every load |

IT-8 existed because IT-4's overflow checks loaded every route with its dialogs and sheets closed. Since loop-back 2, IT-4 opens them itself (`OPEN_STATES` in `tests/e2e/support/hig.ts`). Run 3 therefore counts IT-8 as part of IT-4: 1,002 tests, 937 passing and 65 engine-only skips.

IT-4 also runs every scoped browser command in `unit-test-instructions.md` (the smoke, appearance, chrome, post, pages, search, profile and performance specs). It is the one invocation of those specs, so none of them runs twice.

## Test Data and Environment

- **`fixtures/vault/`:** 15 notes and 1 image, covering posts, hubs (including the empty `Empty Hub.md`), tags, callouts, diagrams, math and code.
- **Intended negative:** `Post With Image.md` links a missing `nonexistent-image.png`, so the IT-5 link sweep reports it on a fixture build. The sweep was designed to pass on a real-content build.
- **Error states:** produced in the browser with `page.route()` (search index, graph, nav tree). No test data is shared between tests.
- **Ports:** 127.0.0.1:4329 for the HIG runner. Run the configurations one after another: they share `site/dist`.

## Coverage Expectations

The team reports coverage and enforces no minimum. The site has no coverage provider installed (`@vitest/coverage-v8` is absent). Reporting a percentage needs that dev dependency in `site/package.json`, which is one of the files the accessibility review covers.
