# Unit Test Instructions: Résumé Certifications

## Framework Setup

The existing test tools are used unchanged:
- **Vitest:** `site/vitest.config.ts`, node environment.
- **fast-check:** through `npm run test:pbt` and its seeded runner.
- **Playwright 1.61.1** with `@axe-core/playwright`, through `site/playwright.hig.config.ts`.

No new dependency or configuration is needed.

**Prerequisites** (fixture content, never the real vault):
- `cargo build --release --manifest-path preprocessor/Cargo.toml`
- `./preprocessor/target/release/obsidian-press ./fixtures/vault ./content`
- `cp content/search-index.json content/graph.json content/previews.json content/nav-tree.json site/public/`
- in `site/`: `node scripts/crossunit/ensure-fixture-content.mjs`

## Run Commands (scoped to this work)

Run every command from `site/`. Each one names its exact files. If a test lands in a different existing file, the developer records the actual path in `code-summary.md` and updates this list.

- **Date model and fact approval** (Steps 2, 4):
  `npx vitest run tests/unit/profile-validation.test.ts tests/unit/fact-approval.test.ts`
- **Dotted display, PDF parsers and manifest** (Steps 3, 4, 6):
  `npx vitest run tests/unit/profile-presentation.test.ts tests/unit/resume-document.test.ts tests/unit/resume-pdf.test.ts tests/unit/resume-manifest.test.ts`
- **Fact set, receipt and release record** (Steps 7, 9):
  `npx vitest run tests/unit/production-profile.test.ts tests/unit/resume-release-store.test.ts`
- **Property generators** (Steps 4, 6):
  `npm run test:pbt`. This command is project-wide by design: the runner refuses file filters without an explicit seed. Seeded focus uses `PBT_SEED=<seed> PBT_PATH=<file>::<test name> npm run test:pbt`, as the README describes.
- **Résumé page in three engines** (Step 7):
  `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-profile.spec.ts`

The existing suites are the regression gate in Steps 5, 10 and 11:
- `npm run test:unit`
- `cargo test --release`
- `npx astro check`
- `npm run format:check`
- the full HIG suite
- `just crossunit`
- `npm run test:e2e`

## Commands Actually Run (Code Generation, 2026-10-21)

**Test files.** The four files this list names did not exist and were created under exactly these names: `profile-validation.test.ts`, `fact-approval.test.ts`, `resume-manifest.test.ts` and `resume-release-store.test.ts`. The seven-section manifest tests are in `resume-manifest.test.ts`, and the r8-record tests in `resume-release-store.test.ts`. The BR4.1 duplicate-id tests are in `profile-validation.test.ts`. Every scoped command above ran as written.

**Additional focused forms used:**
- `npx vitest run tests/unit/profile-presentation.test.ts -t "displays the period"` and `-t "자격증|omits a section"`. These run the renderer-neutral cases without the Astro build in that file's second group.
- `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-profile.spec.ts -g "résumé certifications"`, for the Step 7 Red.
- `PBT_SEED=1995362876 npm run test:pbt`, to recheck a failing seed after the oracle updates.
- `HIG_SKIP_BUILD=1 npx playwright test --config playwright.hig.config.ts --project=webkit tests/e2e/hig-chrome.spec.ts -g "reduced motion"`, to rerun baseline WebKit timeouts alone.

**Regression gate notes:**
- `cargo test --release` and `cargo fmt --check` run from `preprocessor/`.
- `just crossunit` stops after the link sweep on the fixture's `nonexistent-image.png`, so its no-JS checks never start. They were run on their own with `npx playwright test --config playwright.crossunit.config.ts`.
- `npm run test:e2e` stops at `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` until the maintainer redoes the 16-state review.

**PDF link-fact pairing (option A).** The tests are in `tests/unit/resume-pdf.test.ts`. They use two new seams: `resumePdfInspectorTesting.extractOccurrences` and `resumeReceiptsTesting.validateFullMapping`. The scoped run is `npx vitest run tests/unit/resume-pdf.test.ts tests/unit/resume-document.test.ts tests/unit/resume-release.test.ts`.

**PDF candidate (Step 12).**
- `npm run resume:pdf -- --prepare`, then `npm run resume:pdf:verify`, which reports `RELEASE_STALE` until promotion.
- To diagnose a failed prepare: the command line prints only the error code. Calling `prepareResumeRelease` from `scripts/profile/resume-coordinator.mjs` in a scratch script exposes the error's `details` (fact order and text).
- Page images for inspection: `pdftoppm -r 80 -png <candidate.pdf> <prefix>`.

**r9 digest computation (Step 9).** A scratch vitest config and script outside the repository called `productionProfileTesting.materialize`, `buildReviewRecords`, `evidenceSources` and `canonicalDigest`, and printed the inventory and digests; nothing was written by the script. The committed inventory was diffed against that output, and its digest was recomputed with Python's canonical JSON hash:

```
python3 -c "import json,hashlib;d=json.load(open('docs/resume/product-engineer/inventory-r9.json'));print(hashlib.sha256(json.dumps(d,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest())"
```

## Expected Coverage

Standard strategy: 5–8 tests per component.

| Component | New or changed tests |
|---|---|
| validation | 6 (BR1.1–BR1.3) |
| fact approval | 3 |
| presentation formatter | 5 (BR3.1, every precision and `현재`) |
| PDF evidence reader and inspector | 6 (BR3.2) |
| manifest | 5 (date points, seven-section order, r8 compatibility; BR6.2) |
| production profile | 6 (BR5.1, BR5.2, BR6.1) |
| browser checks | 5 (BR4.2, BR4.3, NFR1) |

Coverage is reported, and no minimum is enforced (team practice). Every test file covers the happy path and at least two error or edge cases.

## Mocking and Stubbing

- **No mocks for facts.** The tests read the real `profile-data.ts` and the pinned receipt.
- **Pure fixtures.** Validation and manifest tests build small profiles in the test itself.
- **Browser tests.** They run against the fixture build served on loopback.

## Test Data

- **Dates:**
  - `2025-09-06`, `2027-09-06`, `2026-07-17` and `2029-07-17`;
  - the invalid days `2026-02-29` and `2025-09-31`;
  - the malformed `2025-9-6`.
- **The r8 release record:** `site/verification/resume/current-release.json`, used to check that the old record stays readable.
