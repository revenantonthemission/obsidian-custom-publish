## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-16T06:20:15Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | preprocessor/src/output.rs > `write_posts` (`targets.slug_map.get(&post.slug)`), with preprocessor/src/catalog.rs > `check_site_page_slugs` and preprocessor/src/scanner.rs > `build_index` | The retired homepage note can still be published, which FR2.2 forbids ("not published anywhere"). The writer finds each post's body through the slug lookup of the all-entries view. That lookup is built with last-one-wins `insert` in (slug, source, path) order. A clash between a post and the retired note is not a catalog error: PUB008 covers site pages only, and the scanner only prints `slug collision`. When the retired note's path sorts after the post's (example: post `Passion Project!.md` and retired `Passion Project.md`, both slug `passion-project`; `!` sorts before `.`), `full_idx` points at the retired note. Its body is then written to `posts/passion-project.md` under the post's metadata. The same lookup existed before U1, but the homepage body was public then. U1 makes the note private, so this path now leaks private content. No test covers a post sharing a slug with the retired note. | Close the leak in one of two ways. Make a post and the retired note sharing a slug stop the run with a coded catalog error, batched like PUB008. Or have `write_posts` find each post's entry in the all-entries view by identity (position or file path), not by slug. Add a failing-first test: a post and a `visibility: homepage` note with the same slug, where the retired note's path sorts later, and the retired body appears in no output file. | New |
| R-02 | Minor | preprocessor/src/transform.rs > `transform_note` (transclusions resolved before `convert_markdown_images`), with preprocessor/src/output.rs > `find_attachment` | BR5.2 allows a site page to embed a post. A Markdown image inside the embedded post is rewritten to `/assets/pages/<name>`, but the copy looks only under the page's own root (PAGES). A post image therefore never reaches `assets/pages/`, and the page shows a broken image with only an `attachment not found` warning. | Decide what should happen and record it. Either embedded post images are not supported on site pages (say so in C1/CLAUDE.md), or look them up and namespace them using the embedded note's own source root. Add a test for the chosen behaviour. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261115-personal-website/construction/u1-publish-boundary/code-generation/unit-test-instructions.md > "How to run this unit's tests" step 4 | The property-test command `npx vitest run --config vitest.config.ts tests/pbt/u2/homepage-composition.pbt.test.ts` finds no files. I re-ran it: vitest prints the filter and `include: tests/unit/**/*.test.ts, …` and runs nothing. `code-summary.md` admits this but the instructions were not corrected. | Replace step 4 with the working form recorded in code-summary.md: `PBT_RUNS=100 PBT_SEED=42 npx vitest run --config vitest.pbt.config.ts tests/pbt/u2/homepage-composition.pbt.test.ts`. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261115-personal-website/construction/u1-publish-boundary/code-generation/code-summary.md > "Tests written but not executed" and "Verification command (Step 16)" | Two checks have no passing run behind them. The updated `site/tests/e2e/homepage.spec.ts` (keeps the "no `/posts/fixture-homepage/`, no RSS or sitemap entry" checks for FR2.2) has never run. `just crossunit` exited 1, which the summary attributes to the fixture's deliberate `nonexistent-image.png`. In this review I could not run the full 3-browser HIG suite or `just crossunit` either, so neither result is confirmed here. | Before merge, run `npm run test:e2e` (or at least `homepage.spec.ts`) and `just crossunit`, record the results, and show that the crossunit failure also happens on `develop`. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `cd preprocessor && cargo test --release --test cli_boundary_test --test walker_test --test stamping_order_test --test publication_catalog --test publication_transform --test publication_output --test scanner_test` | PASS: 13 + 18 + 13 + 13 + 6 + 5 + 7 = 75 passed, 0 failed | The unit's guard, walker, stamping order, catalog, link and output tests are green. |
| `cd preprocessor && cargo fmt --check` | PASS (exit 0) | Formatting is clean. |
| `cd preprocessor && cargo test --release` | PASS: every target ok, 0 failed (47 unit tests; the integration and property suites all pass) | The existing suite stays green. |
| `just preprocess` (fixtures; `VAULT_PATH`/`PAGES_PATH` confirmed unset) | PASS: `Found 16 sources (1 site pages)` … last line `published 14 posts, 1 site pages, 3 assets`; writes `content/pages/about.{md,json}` and `content/assets/pages/portrait.png`; no `content/homepage/` | `about.md` links to the post as `/posts/simple-post`, links to the retired note as `<a href="/">` with no fragment, and its image uses `/assets/pages/portrait.png`. The manifest is sorted and has no `homepage/*` entry. |
| `cd site && npx vitest run --config vitest.config.ts tests/unit/sync-public-assets.test.ts tests/unit/content-data.test.ts tests/unit/homepage-composition.test.ts` | PASS: 3 files, 15 tests | The data layer and asset sync tests are green. |
| `cd site && npm run test:unit` / `npm run test:pbt` | PASS: 451 / 34 | Run right after `just preprocess` and without `ensure-fixture-content.mjs`. The suites pass on the same inputs Jenkins Verify now prepares. |
| `cd site && npx astro check` / `npm run format:check` | PASS: 0 errors, 0 warnings (7 hints) / all files formatted | Clean. |
| `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-pages.spec.ts --project=chromium` | PASS: 38 passed | Covers the homepage W5 block and NFR1-b on `/posts/post-with-formatting/` in Chromium only. The full 3-browser HIG run and `just crossunit` were not run (see the Minor finding). |
| Source manifest vs `git diff --stat develop...feature/u1-publish-boundary` | PASS: all 68 changed paths are covered by the manifest entries | No unclaimed or unrelated change. |
| traceability.json | 91 ids: 84 OK, 7 Deferred (Build and Test items); every OK target exists | Spot-checked `hig-chrome.spec.ts`, which is unchanged: its axe matrix runs over `HIG_ROUTES` at every width, in both appearances, with reduced motion. That is a plausible target for BR6.6, AC7.1.1 and NFR1.1. |
| Bounded attachment lookup on real data (`preprocessor/target/u1-baseline/out-pre` vs `out-post`) | 305 vs 305 asset entries in each manifest; the `assets/` lists are identical | Bounding the lookup to the source root drops no real image. |

### Summary

The implementation matches the rules I traced:

- the guard: case folding, `..` after a missing folder and exit 2;
- one link-skipping walker shared by the scan and the stamper;
- check-then-stamp, with no vault write on a PUB008 failure;
- PUB008 and PUB009;
- retired-note links to `/` and site-page links as text;
- `pages/` and `assets/pages/`, and file-name-only copy destinations;
- the summary line printed last;
- one asset-sync script in all four places, and Verify without `ensure-fixture-content`.

All the suites I ran are green. The one Major gap: a post sharing a slug with the retired homepage note can still publish the retired note's private body, because the writer finds bodies by slug. It is reachable but needs an unusual file-name clash. Fix it before merge.
