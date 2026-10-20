# Performance Test Instructions: Repository Cleanup and HIG Redesign

## Targets

From NFR2 in `requirements.md`, measured on the homepage, a long post with diagrams and math, `/graph` and `/resume`:

| Target | Expected |
|---|---|
| Largest Contentful Paint | under 2.5 s on a mid-range mobile profile |
| Cumulative Layout Shift | under 0.1, with font loading adding no shift |
| Interaction to Next Paint | under 200 ms |
| Total Blocking Time | under 200 ms |
| Blog CSS per route, KaTeX excluded | at most 30 KiB (30,720 B) gzip |
| Profile CSS | within the existing 24 KiB (24,576 B) gzip budget |

## Framework Setup

- **Automated spec:** `site/tests/e2e/hig-performance.spec.ts`, Chromium only.
  - It uses a 412 × 823 viewport and 4× CPU throttling through the Chrome DevTools Protocol, against the fixture build on the loopback server.
  - It records LCP, CLS and TBT, the blog CSS per route, and every cross-origin request.
  - Network throttling is not part of it, as `code-summary.md` (Step 31) discloses.
- **Profile CSS budget:** enforced by the "profile CSS budget" test in `hig-profile.spec.ts` and by the asset-budget analysis (`PROFILE_VERIFICATION_BUILD=1 npx astro build`, then the profile tooling).
- **Mobile network profile run (this stage).** A scratch Playwright script runs against the fixture production build served by `site/scripts/local-server.mjs`. Its path and output are in `test-results.md`.
  - Chromium emulates the mobile profile Lighthouse uses: 4× CPU throttling, 150 ms round trip, 1.6 Mbps down and 750 kbps up.
  - It records LCP, CLS (including shifts after deferred scripts run) and TBT on the four pages.
  - It records INP from scripted interactions through the Event Timing API: the appearance button, opening search and typing, the outline tabs and tree toggles, and the graph's list switch.
  - Lighthouse itself is not installed. The script reproduces Lighthouse's throttling settings, not its scoring.

## Commands

| ID | Command | Pass criterion |
|---|---|---|
| PT-1 | `cd site && npx playwright test --config playwright.hig.config.ts --project=chromium tests/e2e/hig-performance.spec.ts` (also run by IT-4). The loop-back 1 repair added the mobile-network test: Lighthouse's DevTools profile, asserting LCP and CLS on six routes | every test passes |
| PT-2 | the profile CSS budget test in IT-4 | at most 24,576 B gzip |
| PT-3 | the mobile network profile script (see `test-results.md`). It is still needed for INP, which no automated test measures | LCP < 2,500 ms, CLS < 0.1, TBT < 200 ms and INP < 200 ms on all four pages |

`--project=chromium` needs the equals sign. With a space, Playwright reads the spec path as a second project name and refuses to run.

## Regression Detection

Compare against the Step 31 numbers in `code-summary.md`: LCP 72–204 ms, CLS 0.000 and TBT 0 ms with CPU-only throttling. Blog CSS peaked at 26,969 B, and profile CSS was 4,487 B. A rise of more than 10% in any CSS figure, or any Core Web Vital crossing its target, is a regression.

## Test Data and Environment

- The fixture build described in `build-instructions.md`.
- Run nothing else against `site/dist` while measuring, and run the measurements one after another, so CPU contention does not distort them.
