# Code Generation Plan — U1 `u1-publish-boundary`

## Summary

- Builds: the site-pages publishing boundary (`--pages`, folder guard, shared walker, PUB008/PUB009, check-then-stamp, `pages/` and `assets/pages/` output, summary line) and the site-built homepage opening, with no homepage artifact
- Touches: `preprocessor/src/{main,boundary,walker,scanner,catalog,transform,output,linker,types}.rs`, `preprocessor/tests/*`, `fixtures/vault/{Notes,Pages}`, `site/src/lib/{data,homepage}.ts`, `site/src/pages/index.astro`, `site/src/styles/home.css`, `site/scripts/{sync-public-assets.mjs,hig/build-and-serve.mjs,profile/homepage-fixture-content.mjs}`, `site/tests/**`, `Jenkinsfile`, `Justfile`, `.gitignore`, `CLAUDE.md`, contract C1/C2
- Tests: about 60 new or rewritten tests, test-first. Rust: about 40 example tests and 3 properties across 6 files. Vitest: about 10. Playwright: about 10 (homepage W5 block, NFR1-b on a fixture post, JS-off).

## Sources

- Design: `construction/u1-publish-boundary/functional-design/` (entities, rules BR1.1–BR7.3, functional-spec), `nfr-requirements/`, `nfr-design/`, `infrastructure-design/` (change list, cicd-pipeline).
- Inception: `units-generation/unit-of-work.md` (U1), `unit-of-work-story-map.md` (US1.1–US3.2, US7.1), `requirements-analysis/requirements.md` (FR1–FR3, NFR1–NFR7), `contract-design/contract-summary.md` (C1, C2).
- Owner decisions carried in from the design reviews:
  - functional design: option 1;
  - NFR stages: a symbolic link is skipped (Q2) and a warning is printed once (NFR design Q4);
  - infrastructure Q1: rollout order.

## Resolutions of open review findings (decided in this plan)

| Finding (stage) | Resolution in this plan |
|---|---|
| ContentData must expose ordinary posts and hubs separately (FD R-major) | Step 13: `getOrdinaryPosts()` in `site/src/lib/data.ts` (`is_hub === false`), beside the existing `getHubs()` |
| Empty pages folder prints a notice, as FR1.5 says (FD R-major; owner chose 1) | Step 7: an `is empty` notice after the PAGES walk |
| A symlinked `.md` file is read and stamped today (NFR-req R-major) | Step 6: the walker skips any entry whose own metadata is a link, for both scanning and stamping |
| Page images need matching URLs (NFR-design R-major) | Step 11: the transform takes an asset namespace. Post bodies use `/assets/…`; site-page bodies use `/assets/pages/…` for image embeds, Markdown images and diagrams. |
| `../` in an image embed escapes OUTPUT (NFR-design R-major) | Step 11: the copy destination and the emitted URL both use the embed's final file-name component only. A regression test is written first. |
| Skipped-link warning printed 2–3 times (NFR-design minor) | Step 6/9: the walker returns skipped links. The run prints them once, from the first scan; the stamper and the rescan stay silent. |
| NFC comparison would need a new crate (NFR-design minor) | No new dependency (tech-stack decision wins). Existing path components are compared by their canonical on-disk names, which APFS returns. The not-yet-existing tail is compared after Unicode lowercase only. This is recorded as a deviation from `security-design.md` §2. |
| NOTES passed as a symbolic link would be skipped (NFR-design minor) | Step 6: the walker roots at the guard's canonical path, so the root itself is never a link |
| Two usage errors lacked fixed text (NFR-design minor) | Step 5: `error: posts folder <NOTES> is not a folder` and `error: cannot resolve <path>: '..' after a missing folder` (both exit 2) |
| Existing stdout lines (NFR-design minor) | `Homepage source: …` is removed. `Done.` is replaced by the summary line as the last stdout line. The progress lines (`Stamping…`, `Scanning…`, `Found … sources`, `Writing output…`) stay. |
| NFR1-b highlight fixture does not render (infra R-01) | The fixture uses `==[Simple Post](/posts/simple-post/)==` in `Notes/Post With Formatting.md`. A Markdown link has no `=`, so the existing highlight pass renders `<mark><a …>`. The transform order is not changed. A Rust test asserts the rendered `<mark><a`. |
| Local gate vs Verify fixture prep (infra R-06) | Step 15: Jenkins Verify drops the `ensure-fixture-content.mjs` call, so Verify and the local gate prepare identical inputs (fixture pair, then JSON copies). The script and its call from `build-and-serve.mjs` and `verification-provider.mjs` stay, renamed, writing only the e2e fixture post. |
| Rollback leaves page images live (infra minor) | Step 2 lands the shared asset-sync script as its own first commit, so reverting the U1 feature merge's later commits does not bring back the add-only copy. Rollback is documented as reverting commits after Step 2. |
| Asset copy duplicated in four places (infra minor) | Step 2: one script, `site/scripts/sync-public-assets.mjs`, called by the Jenkinsfile, both Justfile recipes and the HIG runner. Vitest imports and tests its function. |
| C1 text (infra R-09) | Step 17 updates C1: exit 2 and usage messages, notices, PUB008 cases, PUB009, summary line, skipped-link warning. C2 gains `assets/pages/`. |
| Residual R2: stamping replaces `published:` anywhere in a note (NFR-design minor) | Out of U1 scope (existing stamper behaviour). Recorded in `code-summary.md` as a known limitation. |

## Working rules

- Branch `feature/u1-publish-boundary` off `develop`, local only. One commit per step, `<type>: <Korean …합니다>`.
- Commit only the files this plan names. The working tree's uncommitted AI-DLC framework changes (`.claude/`, `.opencode/`, `.aidlc/`, `aidlc/`) and their `.gitignore` hunks are not U1's: stage U1's own `.gitignore` lines alone (`git apply --cached` of the U1 hunk).
- Test-first for every behaviour. Record each Red command's failing output in `code-summary.md` before Green. Run the full existing suite before each commit.
- Never relax a test, threshold or budget to pass; surface the gap.
- No merge in this stage. The merge waits for the U1 checkpoint and the owner's rewording of the `Areas/Notes` project rule (F4).

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, implement until it passes, refactor, and run the full existing suite before committing; for UI work, the failing tests are the Playwright browser and accessibility acceptance checks for the pages being changed.",
  "scope": "feature",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: The maintainer chose test-first development in the 2026-10-20 practices interview (Question 4, answer B). It matches the failing-test-first plans of March–April 2026 and the maintainer's global agent rules, and it replaces the build-first order of the July 2026 work. The 2026-11-15 re-run found nothing that contradicts it, and the initiative brief for the personal-website work restates \"test-first\".\n- **Ordering**: For each behaviour, write a failing test first, implement until it passes, refactor, and run the full existing suite before committing; for UI work, the failing tests are the Playwright browser and accessibility acceptance checks for the pages being changed.\n- The existing suites stay green on every change, and Jenkins runs them before every nightly deploy. They are `cargo test --release` (preprocessor unit, integration and proptest suites), `npm run test:unit` (Vitest examples and the obligation map) and `npm run test:pbt` (seeded fast-check properties).\n- Rust tests run against the real fixture vault in `fixtures/vault/`, never against mocks. The site's unit suite builds the site, so `content/` and the copied JSON files must exist first. `just preprocess` creates them, as do the fixture steps of the Jenkins Verify stage.\n- A bug fix starts with a failing test that reproduces the defect, and that test stays as the regression test.\n- When a property test finds a shrunk counterexample, we fix the defect and keep the counterexample as a permanent example regression next to the unchanged property.\n- Each UI change adds Playwright checks for the pages it touches. These are axe accessibility scans (WCAG 2.2 AA tags) at 320, 768, 1024 and 1440 px wide, in light and dark themes, plus a reduced-motion check. We do not keep screenshot comparison baselines.\n- Jenkins does not run every check, so before merging UI work we run the rest locally:\n  - `npm run format:check`\n  - `npx astro check`\n  - `just crossunit`, the JavaScript-off smoke test and link sweep over a built site\n  - the Playwright browser checks, including `npm run test:e2e` when the profile routes change\n- Some files are subjects of the human 16-state accessibility review: `site/src/styles/global.css`, `BaseLayout.astro`, `Header.astro`, `MobileNav.tsx`, `navigation.ts`, `site/package.json` and everything under `site/src/styles/profile/`, among others. Changing them invalidates the review record. For a large change such as a redesign, the maintainer redoes the review once, after the change settles, not after every merge.\n- We report test coverage (`npm run test:coverage`, v8, written to `.artifacts/coverage/`) but enforce no minimum percentage."
    },
    {
      "layer": "project",
      "text": "- Reproduced one Red step by setting aside an implementation written before its test (learned 2026-10-20) \n\n- Tested \"a fold above the current heading\" as folding the section being read, with its heading at the top of the viewport (learned 2026-10-20) \n\n- Added browser checks of rendered contrast beside the planned token pairs in the repair (learned 2026-10-20) \n\n- Ran the six-width overflow matrix as 14 route tests of 12 cells each instead of 168 separate tests (learned 2026-10-20) \n\n- Checked highlighted links over the homepage card and the grouped background as well as the planned grounds, because the rendered check showed the homepage note sits on both. (learned 2026-10-20) \n\n- Graded the targets that Code Generation review findings bear on as Not Met even though those findings were accepted as risks at the last approval (learned 2026-10-20) \n\n- Graded NFR1-b on a highlighted link that no fixture note renders (learned 2026-10-20)"
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Report line coverage on the whole project and enforce no minimum percentage (team.md Testing Posture, affirmed 2026-10-20, re-run 2026-11-15). Maintainer decision 2026-11-20, recorded as a human-made requirement change: the team posture governs this scope floor.",
      "Run the selected tests in CI before merge."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "tdd",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - Red: write the failing tests and record the failing command output.",
      "Data model / database behavior - Green: implement only enough behavior to pass.",
      "Data model / database behavior - Refactor: improve the implementation while tests stay green.",
      "Repository / data access - Red: write the failing tests and record the failing command output.",
      "Repository / data access - Green: implement only enough behavior to pass.",
      "Repository / data access - Refactor: improve the implementation while tests stay green.",
      "Business logic - Red: write the failing tests and record the failing command output.",
      "Business logic - Green: implement only enough behavior to pass.",
      "Business logic - Refactor: improve the implementation while tests stay green.",
      "API / endpoint - Red: write the failing tests and record the failing command output.",
      "API / endpoint - Green: implement only enough behavior to pass.",
      "API / endpoint - Refactor: improve the implementation while tests stay green.",
      "Frontend behavior - Red: write the failing tests and record the failing command output.",
      "Frontend behavior - Green: implement only enough behavior to pass.",
      "Frontend behavior - Refactor: improve the implementation while tests stay green.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:a4416f6cdd580aec6e4ba80dcd296c60b5e48cdfaf1258ca040898eead55227a",
  "contract_sha256": "sha256:47b8493e4e0a58d4ee4d9e93b43f76f2ce599f09dea1f16ff7e876c274e11ec3"
}
```

Layer mapping for this unit:

| Contract layer | U1 meaning |
|---|---|
| Data model | note source tag, catalog kinds, run notices (`types.rs`) |
| Repository / data access | folder guard, shared walker, scanner (`boundary.rs`, `walker.rs`, `scanner.rs`) |
| Business logic | catalog checks, link rendering, stamping order, output (`catalog.rs`, `transform.rs`, `linker.rs`, `main.rs`, `output.rs`) |
| API / endpoint | the CLI contract C1 (args, exit codes, stdout/stderr) and the `content/` contract C2 |
| Frontend behavior | site data layer and the homepage `/` |

## Steps

### Project structure and runner readiness

- [x] **Step 1 — Branch, runner check, baselines** (NFR6.3, NFR1.4; US7.1)
  - Create `feature/u1-publish-boundary` off `develop`.
  - Verify the runners with the exact unit-scoped commands in `unit-test-instructions.md` (Rust `cargo test --release --test …`, Vitest `npx vitest run --config vitest.config.ts <files>`, Playwright `npx playwright test --config playwright.hig.config.ts <spec>`). All must run green on `develop` before any change.
  - Record the pre-U1 baselines (performance-design §3) in `code-summary.md`. The real-vault runs operate on a temporary copy of `Areas/Notes` so the vault is never stamped:
    - `obsidian-press` median of 3 runs, with and without `--stamp-published`, output to a temporary folder;
    - suite durations;
    - bytes transferred for `/` from the fixture HIG build.
  - Record the post count P (`content/posts/*.md`) from the last pre-U1 Jenkins workspace if reachable; otherwise note it for the owner.

- [x] **Step 2 — Shared asset sync (own commit, `ci:`)** (infra R-02; NFR4.6; US1.1)
  - Red: `site/tests/unit/sync-public-assets.test.ts` (5 tests):
    - copies `content/assets/` into a temporary `public/assets/`;
    - removes a stale file;
    - removes a stale `pages/` image after the page is withdrawn;
    - leaves the target equal to the source;
    - fails with a coded `SYNC001` error when the source is missing.
  - Green: `site/scripts/sync-public-assets.mjs`, exporting `syncPublicAssets(src, dest)` plus a CLI entry. Replace the copy in the Jenkinsfile Preprocess, the Justfile `preprocess` and `deploy-preprocess`, and `site/scripts/hig/build-and-serve.mjs` with a call to it.
  - Refactor while green.

### Data model / repository (fixtures, guard, walker, scanner)

- [x] **Step 3 — Fixture restructure (refactor, behaviour unchanged)** (BR7.3; infra R-04, R-05)
  - `git mv` the 15 fixture notes and `attachment/` into `fixtures/vault/Notes/`.
  - Change `../fixtures/vault` to `../fixtures/vault/Notes` in the 13 Rust test files: scanner, search, nav_tree, block_ref, image_embed, output, preview, transform, linker, heading_ref, publication_output, publication_catalog, publication_transform.
  - Move the `.gitignore` fixture rules to `fixtures/vault/Notes/attachment/`.
  - Justfile `vault` defaults to `./fixtures/vault/Notes`; Jenkins Verify and `build-and-serve.mjs` point at the new path.
  - Run `cargo test --release` and the HIG build green, with output identical to before (compare `content/manifest.json`).

- [x] **Step 4 — Pages fixture**
  - Add to `fixtures/vault/Pages/`:
    - `About.md`: body with a heading, a link to a post, a link to the retired note and a page image `![[portrait.png]]`;
    - `attachment/portrait.png`;
    - `Drafts/Now.md`;
    - `.hidden.md`.
  - Add one highlighted Markdown link to `Notes/Post With Formatting.md`: `==[Simple Post](/posts/simple-post/)==`.

- [x] **Step 5 — Folder guard: Red → Green → Refactor** (BR1.2, BR1.3; NFR5.4, NFR5.17; AC1.1.4)
  - Red: `preprocessor/tests/cli_boundary_test.rs` (8 tests). Each runs the binary via `env!("CARGO_BIN_EXE_obsidian-press")` on temporary folders and asserts the exit code, exact stderr, and that vault and OUTPUT hashes are unchanged:
    1. PAGES = NOTES
    2. PAGES inside NOTES
    3. PAGES containing NOTES (vault root)
    4. OUTPUT inside NOTES
    5. OUTPUT = PAGES with different letter case
    6. `--pages` is a file
    7. NOTES is a file
    8. `..` after a missing folder
  - Green: `preprocessor/src/boundary.rs` (resolve + overlap, exit 2) and the clap `--pages <PAGES>` option in `main.rs`.
  - Refactor while green.

- [x] **Step 6 — Shared walker: Red → Green → Refactor** (BR1.4, BR1.5; NFR5.1, NFR5.3, NFR5.6)
  - Red: `preprocessor/tests/walker_test.rs` (7 tests):
    - dot entries and `Drafts` are skipped in both roots;
    - a symlinked `.md` file is skipped and reported;
    - a symlinked folder is skipped and reported;
    - a link to outside the vault is never yielded;
    - walk order is sorted;
    - the root is the canonical path, so a NOTES passed as a link is still walked;
    - only regular `.md` files are yielded.
  - Green: `preprocessor/src/walker.rs` returning `(files, skipped_links)`.
  - Add a `source: NoteSource { Notes, Pages }` field to `PostMeta` (`#[serde(default)]`), and update the constructors in `hub_dates.rs` tests and `tests/common/mod.rs`.
  - `scan_vault` and `stamp_published_dates` use the walker; the stamper returns the count of files it rewrote and prints no link warnings.
  - Refactor while green.

- [x] **Step 7 — Pages scan and notices: Red → Green → Refactor** (FR1.5, FR1.7; BR1.3, BR1.7; NFR5.10, NFR5.15; AC1.1.2, AC1.3.1, AC1.3.2)
  - Red: `cli_boundary_test.rs` additions (5 tests), each asserting the exact notice text, exit 0 and the page count:
    - `--pages` omitted;
    - path missing;
    - folder with only `.DS_Store` and `Drafts/`;
    - folder holding only an image;
    - fixture `Pages/` present (no notice).
  - Also in `scanner_test.rs`: notes carry their source, and the sort is (slug, source, path).
  - Green: scan both roots into one index, sorted; print the notices.
  - Refactor while green.

### Business logic (catalog, links, stamping, output)

- [x] **Step 8 — Catalog: Red → Green → Refactor** (BR2.1–BR2.8; FR1.2, FR1.6, FR2.1–FR2.3; NFR5.7, NFR5.8, NFR4.5; AC1.3.3, AC2.1.1, AC2.2.1, AC2.2.2)
  - Red: `preprocessor/tests/publication_catalog.rs` rewritten and extended (14 examples, 1 property).
    - Examples:
      - folder-first (a `visibility: homepage` note in Pages is a site page);
      - zero retired notes is OK; two give PUB003;
      - PUB001 only for Notes;
      - PUB008 page/post, page/page, page/retired, each naming both files; post/post gives a warning only;
      - PUB009 whole, heading and block, from a post and from a page;
      - PUB004–006 from a site page;
      - the retired note's own embeds are not checked;
      - diagnostics are sorted.
    - Property: a 500-note generator compared against a brute-force reference for PUB008/PUB009.
  - Green: `catalog.rs` rework.
    - Kinds: Post, SitePage, RetiredHomepage (optional).
    - Views: `posts_only()` holds posts only; `link_targets()` holds all entries.
    - Accessors: `site_pages()` and `retired()`.
    - Remove PUB002 and `homepage()`.
  - Refactor while green.

- [x] **Step 9 — Check-then-stamp: Red → Green → Refactor** (BR4.1, BR4.2; NFR5.5, NFR5.6; AC1.2.1)
  - Red: `preprocessor/tests/stamping_order_test.rs` (5 tests):
    - stamping with a PUB008 vault leaves every vault file byte-identical (hash all);
    - a page without `published` is byte-identical after a stamping run while a post gains the date;
    - a linked `.md` target outside the vault is untouched;
    - each skipped-link warning appears exactly once on a stamping run;
    - no rescan when 0 files were stamped (observable as the `Scanning` line appearing once).
  - Green: `main.rs` run coordinator order: guard → notice → scan → catalog → stamp → rescan if the count is above 0 → catalog → write → summary.
  - Refactor while green.

- [x] **Step 10 — Link rendering: Red → Green → Refactor** (BR3.1–BR3.4; FR1.2, FR2.2)
  - Red: `preprocessor/tests/publication_transform.rs` additions (6 tests):
    - a link to the retired note gives `<a href="/">` with no fragment, alias kept;
    - a heading link to it also gives `/` with no fragment;
    - a link to a site page gives plain text (alias or name);
    - a post link is unchanged;
    - a link from a site page adds no backlink to the post;
    - the graph has no site-page or retired node.
  - Also add the `<mark><a` highlight-link test on `Post With Formatting`.
  - Green: `transform.rs` `convert_wikilinks` uses the catalog's target kind; `linker.rs` stays on the posts-only view.
  - Refactor while green.

- [x] **Step 11 — Output, attachments, summary: Red → Green → Refactor** (BR1.6, BR5.1–BR5.7; FR1.3, FR2.4; NFR4.4, NFR4.6, NFR5.2, NFR5.3, NFR5.14; AC1.1.1, AC1.1.3, AC1.1.4, AC2.1.2)
  - Red: `preprocessor/tests/publication_output.rs` rewritten and extended (12 examples, 1 property).
    - `pages/about.md` and `pages/about.json` (`{slug,title}`, sorted keys).
    - The page image goes to `assets/pages/portrait.png`, and the body references `/assets/pages/portrait.png`.
    - Manifest: sorted, includes `pages/*`, no `homepage/*`.
    - A seeded stale `homepage/` is removed.
    - Site pages are absent from meta, graph, search, previews, nav tree, backlinks and related posts.
    - Bounded lookup: an image only in `<parent of NOTES>/attachment/` is not copied and gives a warning.
    - A symlinked image is not copied.
    - `![[../../x.png]]` copies to `assets/x.png` only, and nothing outside OUTPUT.
    - The summary line `published <N> posts, <M> site pages, <K> assets` is the last stdout line.
    - The existing PUB007 test is unchanged.
    - Property: output (pages and manifest) is byte-identical across two runs with shuffled input order.
  - Green: `output.rs` (`write_site_pages`, attachment resolver bounded to the source root, file-name-only destinations, `pages/` in the clean, `homepage/` removed from writing but kept in the clean) and the `transform.rs` asset-namespace parameter.
  - Refactor while green.

- [x] **Step 12 — Existing suite and determinism checkpoint**
  - `cargo fmt --check` and the full `cargo test --release`.
  - `just preprocess` on the fixture pair: notice-free run, summary line present, `content/pages/about.*` present, no `content/homepage/`.

### Frontend behaviour (site)

- [x] **Step 13 — Site data layer: Red → Green → Refactor** (BR6.1, BR6.5; FR2.4, FR3.4; NFR7.2; FD R-major posts/hubs)
  - Red: `site/tests/unit/content-data.test.ts` (6 tests):
    - `getOrdinaryPosts()` excludes hubs and is frozen;
    - `getHubs()` is unchanged;
    - the data module exports no homepage reader;
    - `filterTodayPosts` on ordinary posts uses `resolveBuildDate` with the override;
    - no reference to `content/homepage` remains in `site/src` (file scan).
  - Delete the artifact, slot and HP-code tests from `site/tests/unit/homepage-composition.test.ts` and `site/tests/pbt/u2/homepage-composition.pbt.test.ts`; keep their `resolveBuildDate` and `filterTodayPosts` cases.
  - Green:
    - `data.ts`: remove `getHomepage` and `HomepageData`; add `getOrdinaryPosts`.
    - `homepage.ts`: remove the slot, split, chunk and HP001–HP004 code; keep `resolveBuildDate` and `filterTodayPosts`.
  - Refactor while green.

- [x] **Step 14 — Homepage opening: Red (Playwright) → Green → Refactor** (BR6.2–BR6.6; FR3.1–FR3.3, FR3.8; NFR1.1–NFR1.4, NFR2.1, NFR3.1, NFR7.1; AC3.1.1–AC3.1.3, AC3.2.1–AC3.2.4, AC7.1.1–AC7.1.3)
  - Red: rewrite `site/tests/e2e/hig-pages.spec.ts` `homepage (W5)` (5 tests):
    - exactly one h1 "Passion Project" and the document title "Passion Project";
    - name and short intro shown, headline absent;
    - capsules "Résumé" → `/resume` and "Portfolio" → `/portfolio`, each ≥ 44 × 44 px with equal styling;
    - the interim "오늘 발행된 글" section with its empty message;
    - all requests same-origin.
  - Ensure `/` is in the axe matrix spec at 4 widths × 2 themes plus reduced motion.
  - Move the NFR1-b test to `/posts/post-with-formatting/` `.post-content mark a`, in light and dark (no DOM injection).
  - Update `tests/e2e/homepage.spec.ts`: keep the "no `/posts/fixture-homepage/`, no RSS or sitemap entry" checks; rewrite the render checks.
  - Update `tests/e2e/crossunit.spec.ts`: homepage JS-off shows the opening and both capsules.
  - Green: rewrite `site/src/pages/index.astro`:
    - BaseLayout `title={SITE_NAME}`;
    - `<h1 class="home-title">`;
    - an opening section with name, intro and the two capsules (routes from the Profile Domain);
    - the interim list from `getOrdinaryPosts()`.
  - Adjust `site/src/styles/home.css` only (no `global.css`), using the `--c-` tokens; add `data-testid` on the capsules.
  - Refactor while green.

### Environment / build configuration

- [x] **Step 15 — Pipeline wiring** (BR7.1, BR7.2; NFR6.1; infra change list)
  - Jenkinsfile:
    - `PAGES_PATH = env.OBSIDIAN_PAGES_PATH ?: '<vault>/Areas/Pages'`;
    - Verify runs `obsidian-press ./fixtures/vault/Notes ./content --pages ./fixtures/vault/Pages` and drops `ensure-fixture-content.mjs` and its HP001 comment;
    - Preprocess adds `--pages "${PAGES_PATH}"`.
  - Justfile:
    - `pages := env("PAGES_PATH", "./fixtures/vault/Pages")`;
    - `publish_pages := env("PAGES_PATH", "<vault>/Areas/Pages")`;
    - `preprocess` and `deploy-preprocess` pass `--pages`.
  - `build-and-serve.mjs` passes the fixture pair.
  - `homepage-fixture-content.mjs`: rename the function to `ensureE2eFixtureContent`, stop writing `content/homepage/`, and change the log to `ensure-fixture-content: e2e fixture post present`. Update its callers.
  - Verify with `just preprocess` and a dry read of the Jenkinsfile commands.

### Documentation and traceability

- [x] **Step 16 — Full verification**
  - Run the recorded verification command in full.
  - Record the after-U1 timings and the `/` bytes beside the Step 1 baselines.
  - Note `npm run test:e2e` as not run: the manual accessibility record is invalid until the owner's end-of-release review.

- [x] **Step 17 — Documentation**
  - `CLAUDE.md`:
    - new CLI and `--pages`;
    - exit 2;
    - PUB008, PUB009, notices, summary line, skipped-link warning;
    - `pages/` and `assets/pages/`;
    - removed `homepage/`, PUB002 and HP001–HP004;
    - folder-first rule;
    - fixture layout.
  - Update contract C1/C2 in `inception/contract-design/contract-summary.md` to match.
  - Write `code-summary.md`, `source-manifest.json` and `traceability.json`.

### Repair requested by the owner at the skeleton checkpoint (2026-11-16)

The owner asked for this step after skeleton verification failed at the link sweep and after the code review's Major finding.

- [x] **Step 18 — Known broken fixture link and retired-note slug clash: Red → Green → Refactor** (NFR3, AC7.1.3; FR2.2, BR2.4, AC2.2.1; review finding R-01)
  - **18a — link sweep.**
    - Red: `site/tests/unit/link-sweep.test.ts` (5 tests) runs the sweep's exported checker on a temporary `dist/`:
      - a build whose only broken link is a declared known-broken target passes;
      - an undeclared broken link fails;
      - a declared target that now resolves fails (the declaration is stale);
      - a declared target that appears on a page other than its declared page fails;
      - an empty declaration list behaves as today.
    - Green: `site/scripts/crossunit/link-sweep.mjs` exports `sweep(distDir, knownBroken)` and reads `site/scripts/crossunit/known-broken-links.json`. That file holds exactly one entry: page `/posts/post-with-image/index.html`, target `/assets/nonexistent-image.png`, reason "deliberate fixture broken image (warning test)".
    - The CLI prints the known broken link as an expected line and exits 0 only when the failures equal the declared set.
  - **18b — retired-note slug clash.**
    - Red: add 2 examples to `preprocessor/tests/publication_catalog.rs`. A post and the retired homepage note sharing a slug (`Passion Project!.md` and `Passion Project.md`) give PUB008 naming both files, for either file-name order.
    - Red: add 1 test to `preprocessor/tests/publication_output.rs`. On that vault the run exits 1 and writes nothing, and the retired note's marker text appears in no file.
    - Green: `catalog.rs` extends PUB008 to post/retired clashes; post/post clashes keep the warning.
    - Update BR2.4's wording in `CLAUDE.md` and contract C1 (PUB008 now also covers post/retired).
  - Run the full recorded verification command; it must exit 0.

### Repair from Build and Test loop-back 1 (2026-11-20)

Build and Test graded U1-CG-R02 Not Met (review finding R-02, never decided), and found a stale command in this unit's test instructions. Branch: `feature/u3-writing-moves`, the assembled stack. Commit there with `git add <path>` per file.

- [x] **Step 19 — Embedded-post images on a site page (BR5.2; review finding R-02): Red → Green**
  - **Decision (cheapest, low risk; the maintainer may choose "support" instead at this plan's approval):** a site page that embeds a post does **not** support that post's Markdown images.
  - Red: add a test in `preprocessor/tests/` (fixture-vault based, no mocks): a site page embedding a post with an image produces the `attachment not found` warning naming the image and the page, and the run still exits 0. Record the failing output if the warning text does not yet name the page.
  - Green: make the warning name the embedding page.
  - Document it: one line in `CLAUDE.md` (site pages) and one line in contract C1 (`inception/contract-design/contract-summary.md`).
  - Commit: `test: 사이트 페이지에 넣은 글의 이미지는 지원하지 않음을 시험으로 고정합니다`.
- [x] **Step 20 — Stale test command**
  - `unit-test-instructions.md` named `tests/unit/homepage-composition.test.ts` and `tests/pbt/u2/homepage-composition.pbt.test.ts`, both deleted by U2 (`806c6ac`). The instructions have already been corrected in this plan's revision.
  - Re-run every command in the file; each must exit 0.
- [x] **Step 21 — Records**
  - Update `code-summary.md`, `source-manifest.json` (add the files Steps 19–20 touch) and `traceability.json`.
  - Run the full recorded verification command; it must exit 0.

## Story → step traceability

| Story | Steps |
|---|---|
| US1.1 Keep site pages out of post lists | 4, 6, 7, 8, 10, 11 |
| US1.2 Never stamp site pages | 6, 9 |
| US1.3 Missing folder and slug clash | 5, 7, 8 |
| US2.1 Publish without a homepage note | 8, 11, 13, 15 |
| US2.2 Keep the old homepage note private | 8, 10, 11 |
| US3.1 See who the owner is | 13, 14 |
| US3.2 Résumé and Portfolio in one click | 14 |
| US7.1 (U1 share) accessibility, origins, JS-off, suites | 1, 12, 14, 16 |
