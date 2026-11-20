## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-20T03:24:59Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | preprocessor/src/output.rs > `write_posts` (`targets.slug_map.get(&post.slug)`), with preprocessor/src/catalog.rs > `check_site_page_slugs` and preprocessor/src/scanner.rs > `build_index` | The retired homepage note can still be published, which FR2.2 forbids ("not published anywhere"). The writer finds each post's body through the slug lookup of the all-entries view. That lookup is built with last-one-wins `insert` in (slug, source, path) order. A clash between a post and the retired note is not a catalog error: PUB008 covers site pages only, and the scanner only prints `slug collision`. When the retired note's path sorts after the post's (example: post `Passion Project!.md` and retired `Passion Project.md`, both slug `passion-project`; `!` sorts before `.`), `full_idx` points at the retired note. Its body is then written to `posts/passion-project.md` under the post's metadata. The same lookup existed before U1, but the homepage body was public then. U1 makes the note private, so this path now leaks private content. No test covers a post sharing a slug with the retired note. | Close the leak in one of two ways. Make a post and the retired note sharing a slug stop the run with a coded catalog error, batched like PUB008. Or have `write_posts` find each post's entry in the all-entries view by identity (position or file path), not by slug. Add a failing-first test: a post and a `visibility: homepage` note with the same slug, where the retired note's path sorts later, and the retired body appears in no output file. | Resolved (reviewer) |
| R-02 | Minor | preprocessor/src/transform.rs > `transform_note` (transclusions resolved before `convert_markdown_images`), with preprocessor/src/output.rs > `find_attachment` | BR5.2 allows a site page to embed a post. A Markdown image inside the embedded post is rewritten to `/assets/pages/<name>`, but the copy looks only under the page's own root (PAGES). A post image therefore never reaches `assets/pages/`, and the page shows a broken image with only an `attachment not found` warning. | Decide what should happen and record it. Either embedded post images are not supported on site pages (say so in C1/CLAUDE.md), or look them up and namespace them using the embedded note's own source root. Add a test for the chosen behaviour. | Resolved (reviewer) |
| R-03 | Minor | aidlc/spaces/default/intents/261115-personal-website/construction/u1-publish-boundary/code-generation/unit-test-instructions.md > "How to run this unit's tests" step 4 | The property-test command `npx vitest run --config vitest.config.ts tests/pbt/u2/homepage-composition.pbt.test.ts` finds no files. I re-ran it: vitest prints the filter and `include: tests/unit/**/*.test.ts, …` and runs nothing. `code-summary.md` admits this but the instructions were not corrected. | Replace step 4 with the working form recorded in code-summary.md: `PBT_RUNS=100 PBT_SEED=42 npx vitest run --config vitest.pbt.config.ts tests/pbt/u2/homepage-composition.pbt.test.ts`. | Resolved (reviewer) |
| R-04 | Minor | aidlc/spaces/default/intents/261115-personal-website/construction/u1-publish-boundary/code-generation/code-summary.md > "Tests written but not executed" and "Verification command (Step 16)" | Two checks have no passing run behind them. The updated `site/tests/e2e/homepage.spec.ts` (keeps the "no `/posts/fixture-homepage/`, no RSS or sitemap entry" checks for FR2.2) has never run. `just crossunit` exited 1, which the summary attributes to the fixture's deliberate `nonexistent-image.png`. In this review I could not run the full 3-browser HIG suite or `just crossunit` either, so neither result is confirmed here. | Before merge, run `npm run test:e2e` (or at least `homepage.spec.ts`) and `just crossunit`, record the results, and show that the crossunit failure also happens on `develop`. | Unresolved |

> R-01 Reviewer note: `preprocessor/src/catalog.rs` `check_slug_clashes` (lines 273-310) now raises PUB008 `post slug "<slug>" clashes with retired homepage note <path>` for a post/retired pair, batched like the other PUB008 cases. `preprocessor/tests/publication_catalog.rs` lines 218 and 240 cover both sort orders, including the case where the retired note sorts later. I ran `cargo test --release --test publication_catalog --test publication_output` and got 20 + 15 passed.

> R-02 Reviewer note: Decided as unsupported. Commit `22e1468` documents it in `CLAUDE.md` (C1 section). `write_site_pages` now adds ` (site page <path>)` to the not-found warning. The new test `an_embedded_posts_image_on_a_site_page_is_unsupported_and_named` (`preprocessor/tests/publication_output.rs`) pins exit 0, the exact warning line, that no `assets/pages/diagram.png` is created or listed in the manifest, that the post keeps its own copy, and that the page body still points at `/assets/pages/diagram.png`. It passes in my run.

> R-03 Reviewer note: `unit-test-instructions.md` step 4 no longer gives a command that finds no files. It says no U1 property file remains after U2's commit `806c6ac` and names U2's covering tests.

> R-04 Reviewer note: Half fixed. Crossunit now passes: the developer reports 16/16, and `40fa3e7` added `--ignore-lock`. But `site/tests/e2e/homepage.spec.ts` has still never run. It is matched only by `site/playwright.config.ts` (projects `homepage-firefox` and `homepage-webkit`), and that run still fails closed with `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`. `git grep fixture-homepage` finds the rendered-site FR2.2 checks (no `/posts/fixture-homepage/`, no RSS or sitemap entry) only in that spec; the Rust tests cover the preprocessor output alone. Separately, `unit-test-instructions.md` step 5 is labelled "homepage and crossunit specs", but its command runs only `hig-pages.spec.ts` under the HIG config, which cannot match `homepage.spec.ts`. The cause is the maintainer's stale accessibility record, not code, so this stays Minor.

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `cargo test --release --test publication_output --test publication_catalog` (run by this reviewer) | PASS: 20 and 15 passed, 0 failed | Confirms the R-01 clash tests and the new R-02 test pass on the current tree. |
| `git show 22e1468` | 3 files: `CLAUDE.md`, `preprocessor/src/output.rs`, `preprocessor/tests/publication_output.rs` | The repair stays narrow. It adds an `origin` parameter to `copy_referenced_images`, passes an empty string for posts and does not change post behaviour. |
| Sensors: required-sections, traceability | PASS (reported by the dispatch) | No structural gaps. |
| Full verification command | Not rerun here; developer reports exit 0 | Taken as reported. I did not rerun the full HIG, crossunit or format gates in this review. |

### Summary

The private-body leak (R-01) is closed by a coded PUB008 error with tests for both orders, and embedded-post images on site pages are now a documented, tested unsupported case. The only open item is that `homepage.spec.ts` has never run, which waits on the maintainer's accessibility record rather than on code.
