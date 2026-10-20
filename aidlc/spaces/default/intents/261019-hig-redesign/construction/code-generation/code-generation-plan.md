# Code Generation Plan: Repository Cleanup and HIG Redesign

## Summary

- Builds: the second Build and Test repair (loop-back 2) for two failed targets: links inside a highlight that fall under 4.5:1 off the page ground and on the dark homepage (NFR1-b), and search snippets cut off on one line (NFR1-e)
- Touches: `site/src/styles/post.css`, the homepage note's highlight style, `site/src/styles/search.css`, `site/tests/unit/hig-tokens.test.ts`, `site/tests/e2e/{hig-post,hig-pages,hig-chrome}.spec.ts` and `site/tests/e2e/support/hig.ts`
- Tests: about 10 new or extended checks, each written failing first: highlighted-link token pairs on every ground, a rendered highlighted-link check in three engines, and the 200%-text and six-width overflow checks extended to open dialogs and sheets with an HTTP status assertion

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, implement until it passes, refactor, and run the full existing suite before committing; for UI work, the failing tests are the Playwright browser and accessibility acceptance checks for the pages being changed.",
  "scope": "bugfix",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: The maintainer chose test-first development in the practices interview (Question 4, answer B). It matches the failing-test-first plans of March–April 2026 and the maintainer's global agent rules, and it replaces the build-first order of the July 2026 work.\n- **Ordering**: For each behaviour, write a failing test first, implement until it passes, refactor, and run the full existing suite before committing; for UI work, the failing tests are the Playwright browser and accessibility acceptance checks for the pages being changed.\n- The existing suites stay green on every change, and Jenkins runs them before every nightly deploy. They are `cargo test --release` (preprocessor unit, integration and proptest suites), `npm run test:unit` (Vitest examples and the obligation map) and `npm run test:pbt` (seeded fast-check properties).\n- Rust tests run against the real fixture vault in `fixtures/vault/`, never against mocks. The site's unit suite builds the site, so `content/` and the copied JSON files must exist first. `just preprocess` creates them, as do the fixture steps of the Jenkins Verify stage.\n- A bug fix starts with a failing test that reproduces the defect, and that test stays as the regression test.\n- When a property test finds a shrunk counterexample, we fix the defect and keep the counterexample as a permanent example regression next to the unchanged property.\n- Each UI change adds Playwright checks for the pages it touches. These are axe accessibility scans (WCAG 2.2 AA tags) at 320, 768, 1024 and 1440 px wide, in light and dark themes, plus a reduced-motion check. We do not keep screenshot comparison baselines.\n- Jenkins does not run every check, so before merging UI work we run the rest locally:\n  - `npx astro check`\n  - `just crossunit`, the JavaScript-off smoke test and link sweep over a built site\n  - the Playwright browser checks, including `npm run test:e2e` when the profile routes change\n- Some files are subjects of the human 16-state accessibility review: `site/src/styles/global.css`, `BaseLayout.astro`, `Header.astro`, `MobileNav.tsx`, `navigation.ts`, `site/package.json` and everything under `site/src/styles/profile/`, among others. Changing them invalidates the review record. For a large change such as a redesign, the maintainer redoes the review once, after the change settles, not after every merge.\n- We report test coverage but enforce no minimum percentage."
    },
    {
      "layer": "project",
      "text": "- Reproduced one Red step by setting aside an implementation written before its test (learned 2026-10-20) \n\n- Tested \"a fold above the current heading\" as folding the section being read, with its heading at the top of the viewport (learned 2026-10-20) \n\n- Added browser checks of rendered contrast beside the planned token pairs in the repair (learned 2026-10-20) \n\n- Ran the six-width overflow matrix as 14 route tests of 12 cells each instead of 168 separate tests (learned 2026-10-20)"
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
      "Include a targeted regression for the bug or vulnerability.",
      "Keep the existing test suite green."
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
  "input_sha256": "sha256:dec6ecce017d6a0683018544f835ebee8028e151365b82c1ca2c5a9528473062",
  "contract_sha256": "sha256:2085dde80bfeaaafa7953883e24262d789d46aa0f8a14584cb9e0994d2ec6102"
}
```

## Scope and Inputs

This is a zero-Unit build covering `requirements.md` (FR1–FR7, NFR1–NFR7) and the approved design in `inception/refined-mockups/`. How the contract's layers apply here:

- **Data model / database, Repository / data access, API / endpoint:** not applicable. There is no database, `data.ts` keeps its contract, and the local server is unchanged.
- **Business logic:** the pure modules: the appearance model, token contrast, the homepage section wrapper, search key handling, and in this attempt image sizing and the Mermaid CLI arguments.
- **Frontend behavior:** the pages and components, tested with Playwright and axe.

Every phase runs on its own short-lived branch off `develop` and merges back with `git merge --no-ff`. Commit messages are `<type>: <Korean description …합니다>`. Nothing is pushed, deployed, or written to the vault.

**This is the third attempt.**
- **Done:** Phases A–D (Steps 1–38) were built and approved in the first attempt, and Phase E (Steps 39–52) in the second. Their record is in `code-summary.md`.
- **Why this attempt exists:** Build and Test's second run met 22 of 28 targets. Two of the misses come from generated styles. `construction/build-and-test/test-results.md`, under "Loop-Back Log", Loop-back 2, gives the diagnosis.
- **What it builds:** only Phase F (Steps 53–60).

## Steps

### Phase A: Repository cleanup (FR1)

- [ ] **Step 1 — Test baseline.** Build the preprocessor and materialize the fixture content as the Jenkins Verify stage does (`./preprocessor/target/release/obsidian-press ./fixtures/vault ./content`, copy the four JSON files to `site/public/`, run `node scripts/crossunit/ensure-fixture-content.mjs`). Then run `cargo test --release --manifest-path preprocessor/Cargo.toml`, `npm run test:unit`, `npm run test:pbt` and `npx astro check` in `site/`. Record the counts (passed, failed, skipped) as the baseline in `code-summary.md`. (brownfield safeguard, NFR7)
- [ ] **Step 2 — Portfolio work: commit and merge (FR1.1).**
  - Run the portfolio unit tests (`portfolio-roles`, `portfolio-role-metadata`, `profile-presentation`) and confirm they pass.
  - On `codex/feature/infra-engineer-portfolio`, stage only these paths:
    - `site/src/components/profile/presentation.ts`
    - `site/src/lib/profile/portfolio-roles.ts`
    - `site/src/styles/profile/portfolio.css`
    - the deletion of `site/tests/e2e/portfolio-product-engineer.spec.ts`
    - `site/tests/unit/portfolio-role-metadata.test.ts`
    - `site/tests/unit/portfolio-roles.test.ts`
    - `site/tests/unit/profile-presentation.test.ts`
    - `site/tests/e2e/portfolio-roles.spec.ts`
    - `docs/portfolio/infra-engineer/`
  - Commit with a Korean `feat:` message, then merge into `develop` with `--no-ff`.
  - Delete the branch with `git branch -d`.
- [ ] **Step 3 — AI-DLC setup: commit and merge (FR1.3, review finding R-06 of the requirements).** On a new `chore/aidlc-setup` branch off `develop`, commit only the AI-DLC files:
  - `.claude/settings.json` and the new `.claude/` framework folders and files
  - `.mcp.json`
  - the AI-DLC block in `.gitignore`
  - the tracked `aidlc/` workspace (gitignored runtime files excluded)
  - the staged move of `aidlc-docs/` into `aidlc/spaces/default/intents/261019-obsidian-press-resume-an/`

  Approving this plan confirms that you want this commit. Then merge with `--no-ff` and delete the branch.
- [ ] **Step 4 — Mermaid fix and ignore entries (FR1.2, FR1.4).**
  - On a new `fix/mermaid-puppeteer-config` branch, run `git cherry-pick -x 9e1c203`.
  - Add the `.puppeteer-config.json` and `.aidlc/worktrees/` lines to `.gitignore`.
  - Run `cargo fmt --check` and `cargo test --release`, both green.
  - Commit, merge with `--no-ff`, and delete the branch.
- [ ] **Step 5 — Worktrees (FR1.5).** For each of `/Users/revenantonthemission/Projects/obsidian-blog-u1-nfr`, `.claude/worktrees/u2-home-boundary` and `.claude/worktrees/u3-quality-gates`:
  - Run `git -C <path> status --porcelain --untracked-files=all` and check that no process has its working directory there (`lsof +D <path>`).
  - If it is clean and unused, `git worktree remove <path>`. If not, report the changed files or processes and leave it in place.
  - Then run `git worktree prune`.
- [ ] **Step 6 — Merged branches (FR1.6).** First confirm that `git branch --merged develop` lists each name below, then delete it with `git branch -d`. Any refusal is reported and never forced. The 27 branches:
  - `codex/chore/reconcile-develop-main`, `codex/feature/kakaopay-data-platform-portfolio`, `codex/feature/portfolio-data-ai-rescope`, `codex/feature/resume-home-boundary`
  - `codex/feature/resume-profile-experience`, `codex/feature/resume-quality-gates`, `codex/fix/diagram-render-gate`, `codex/fix/jenkins-cargo-path`
  - `codex/fix/portfolio-korean-copy`, `codex/resume-product-engineer`, `feature/callouts-highlights-ui`, `feature/code-review-fixes`
  - `feature/code-review-fixes-2`, `feature/diagram-theme-sync`, `feature/image-embeds`, `feature/local-serving`
  - `feature/markdown-rendering-improvements`, `feature/phase1-scaffolding`, `feature/phase2-preprocessor`, `feature/phase3-site`
  - `feature/phase4-islands`, `feature/phase5-markdown-pipeline`, `feature/phase6-infrastructure`, `feature/phase7-deploy`
  - `feature/phase7-integration`, `feature/portfolio-docsuri`, `feature/remaining-review-fixes`

  A branch whose worktree Step 5 kept stays as well.
- [ ] **Step 7 — Scaffolding branch: the one forced deletion (FR1.2; requirements review finding R-01).** Record the tip SHA of `codex/chore/aidlc-scaffolding` and its 10-commit log in the cleanup report, then run `git branch -D codex/chore/aidlc-scaffolding`. This is the only forced deletion. The other 9 commits are dropped on purpose (Follow-up 1). They stay recoverable from the recorded SHA through the reflog.
- [ ] **Step 8 — Final inventory (AC1.1–AC1.5).**
  - Run `git branch`, `git worktree list` and `git log --oneline -8 develop`.
  - Confirm that `git rev-parse origin/develop origin/main` is unchanged from Step 1.
  - Rerun the Step 1 suites on `develop`; they must be green.
  - Write the cleanup report into `code-summary.md`.

### Phase B: HIG redesign on `feature/hig-redesign` (FR2–FR6)

- [ ] **Step 9 — Project structure and test runner readiness.**
  - Create `feature/hig-redesign` off `develop`.
  - Add `site/playwright.hig.config.ts`:
    - it builds once against the fixture content and serves `site/dist` with `scripts/local-server.mjs` on 127.0.0.1:4329
    - projects: chromium, firefox and webkit
    - viewport matrix: 320, 768, 1024 and 1440
    - color schemes: light and dark
  - Add `site/tests/e2e/support/hig.ts` (route list, axe tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, a target-size helper and an overflow helper).
  - Record the exact scoped commands in `unit-test-instructions.md`, and run an empty smoke spec to prove the runner works.
- [ ] **Step 10 — Business logic, Red.** Write the failing Vitest tests and record their output:
  - `site/tests/unit/hig-tokens.test.ts`: C-02 and C-03, which parse `site/src/styles/tokens.css`.
    - Opaque text pairs reach at least 4.5:1, and UI boundaries at least 3:1.
    - Glass in the worst case: primary text on the regular material; every text token on the thick material.
    - Non-text on the regular glass bar: the focus ring and the current-item indicator reach at least 3:1 (mockups review finding R-02).
    - Code-panel syntax pairs reach at least 4.5:1 on the actual code-panel token (mockups review finding R-01).
  - `site/tests/unit/appearance.test.ts`, for a pure `site/src/lib/appearance.ts`:
    - stored values parse to auto, light or dark; anything unrecognized gives auto
    - the cycle goes auto → light → dark → auto
    - `LEGACY_THEME_KEYS` is exactly `theme`, `theme-manual`, `solar`, `geo` and `geo-denied`
    - blocked storage gives auto
  - `site/tests/unit/render-sections.test.ts`: a rehype step wraps each homepage H2 section in `section.home-card` and leaves posts untouched (mockups review finding R-04).
  - `site/tests/unit/search-keys.test.ts`: the search key handler ignores Enter and the arrow keys while IME composition is active (`isComposing`, keyCode 229) (mockups review finding R-08).
- [ ] **Step 11 — Business logic, Green.**
  - Create `site/src/styles/tokens.css` with every token from `design-system-mapping.md`, including the review fixes:
    - Code panels get `--c-code-bg`: `#F5F5F7` in light mode, `#1C1C1E` in dark mode. Every Xcode-style color then reaches at least 4.95:1 (R-01).
    - On the regular glass bar, the focus ring and the current-item indicator use `--c-text` (worst case 8.48:1 light, 6.13:1 dark). The current section is marked by a 2 px `--c-text` underline and weight 600 instead of a tint pill. This changes mockup W1 (R-02).
  - Implement `appearance.ts`, the rehype section wrapper (homepage only, called from `render.ts` with an option) and the search key handler.
- [ ] **Step 12 — Business logic, Refactor.** Tidy while green. Rerun the four new unit files and `npm run test:unit`.
- [ ] **Step 13 — Appearance, Red (FR3; C-10, C-11).** Write `site/tests/e2e/hig-appearance.spec.ts`:
  - a first visit makes no geolocation request and no request to `api.sunrise-sunset.org`
  - a stale `theme=dark` with `theme-manual` set renders Automatic, and every legacy key is removed
  - an unrecognized `appearance` renders Automatic
  - a stored `light` renders light before first paint while the system is dark (check `data-theme` before any island hydrates)
  - blocked storage renders Automatic
  - with JavaScript disabled, the page follows the system appearance
  - the button cycles, announces the change, and its pre-hydration name matches the stored choice (R-07)

  Record the failing output.
- [ ] **Step 14 — Appearance, Green.**
  - Rewrite the ES5 bootstrap in `BaseLayout.astro`:
    - read `appearance`
    - remove the legacy keys
    - set `data-theme` only for light or dark
    - set `data-appearance` for the button's pre-hydration state
  - Rewrite `ThemeToggle.tsx` as the single cycling button: Korean names, a live region, three CSS-switched labels.
  - In CSS, make `prefers-color-scheme` the default with the `data-theme` overrides.
  - Delete `site/src/lib/solar.ts` and the `.theme-transitioning` rule.
  - Make `graphSim.ts` and `LocalGraph.tsx` listen for system appearance changes through `matchMedia`.
  - Update `tests/e2e/support/profile-page.ts` `applyTheme` to seed `appearance`.
- [ ] **Step 15 — Appearance, Refactor.** Run the appearance spec and `npm run test:unit` until both are green.
- [ ] **Step 16 — Shared chrome, Red (FR4.1, FR2.2–FR2.6, FR5.8–FR5.10; C-01, C-04, C-08, C-09, C-12, C-13, C-14).**
  - Write `site/tests/e2e/hig-chrome.spec.ts`:
    - axe on every route listed in `accessibility-checklist.md` C-01, at 4 widths × 2 appearances, with reduced motion
    - target classes T1–T4, including the mockups-review R-06 additions (footer links, breadcrumbs, disclosure summaries and the site mark in T1; search rows in T2)
    - a sheet that opens without JavaScript and hides the content behind it
    - fallbacks under reduced transparency and increased contrast
    - no horizontal overflow at 320 px with 200% text
  - Write `site/tests/unit/hig-built-html.test.ts` (C-12 Korean names, C-13 decorative SVGs and the platform shortcut hint).
- [ ] **Step 17 — Shared chrome, Green.**
  - Serve self-hosted Pretendard on every route through the existing font materializer, and remove the CDN font from the `LEGACY_BASE_LAYOUT_RESOURCES` set in `profile-resources.ts`.
  - Preload the critical subsets and add a metric-matched fallback `@font-face` (`size-adjust`, `ascent-override`, `descent-override`) so the font swap stays under the CLS limit (mockups review finding R-10).
  - Apply the type, spacing, radius and motion tokens, the glass materials and their fallbacks.
  - Rebuild `Header.astro`, `MobileNav.tsx` (the `details` sheet with `body:has()` hiding the content), `Footer.astro`, the skip link (transform), the reading progress (`scaleX` in requestAnimationFrame) and back to top (reduced-motion aware).
  - Split `global.css` into `tokens.css`, `base.css` and `chrome.css` so no file exceeds 800 lines.
- [ ] **Step 18 — Shared chrome, Refactor.** Run the chrome specs, `npm run test:unit` and `npm run test:pbt`.
- [ ] **Step 19 — Post page, Red (FR4.2, FR5.3–FR5.7; C-05, C-06, C-07, C-14).** Write `site/tests/e2e/hig-post.spec.ts`:
  - the outline panel at 1100 px and wider; the outline sheet below 1100 px (tab arrow keys, focus trap and return, Escape)
  - 44 px outline rows everywhere, because FR5.8 counts navigation links (mockups review finding R-03 is resolved in favor of the requirement)
  - heading fold with `aria-expanded`
  - copy button success and failure announcements
  - callout title contrast
  - narrow-width rules (mockups review finding R-05):
    - tables and display math scroll inside keyboard-focusable regions
    - diagrams scale to 100% width or scroll in `.diagram-wrapper`
    - long strings and inline code wrap with `overflow-wrap: anywhere`
  - link preview opens on focus and hover, closes on Escape, can be hovered, and navigates in one tap on touch
  - backlinks, related posts and the local graph sit below the article
- [ ] **Step 20 — Post page, Green.**
  - `PostLayout.astro` gets the outline panel and sheet, which replace `aside.post-sidebar` and `MobileSidebar.tsx`.
  - Restyle `post.css` (split if over 800 lines), `callouts.css` (system color tokens) and `diagrams.css` (opacity crossfade only).
  - `link-preview.ts`: focus trigger, `role="tooltip"`, Escape, no touch interception. The browser's native press-and-hold preview stands in for the touch affordance, recorded as an amendment to FR5.7 (mockups review finding R-11).
  - `copy-button.ts` and `heading-fold.ts`: Korean labels, `aria-expanded`, and errors surfaced.
  - `toc-highlight.ts`: `aria-current="location"`.
  - `NavTree` and `TreeNodeItem`: `aria-expanded` and Korean names.
  - Korean labels in `TableOfContents` and `HubNav`.
  - Custom Shiki themes in `site/src/lib/shiki-themes/xcode-{light,dark}.json`, wired into `render.ts`.
- [ ] **Step 21 — Post page, Refactor.** Run the post spec and `npm run test:unit` (`render-extended-syntax`).
- [ ] **Step 22 — Other blog pages, Red (FR4.3, FR4.5, FR5.6).** Write `site/tests/e2e/hig-pages.spec.ts`:
  - homepage section cards, the profile slot card and the "오늘 발행된 글" empty state
  - the hub grouped list and its empty state
  - tag chips and the tag page
  - 404
  - the graph list view, reachable by keyboard
  - legend shapes and labels
  - graph and tree error states with retry
- [ ] **Step 23 — Other blog pages, Green.**
  - Restyle `index.astro` (drop the `is:global` overrides), `HubLayout.astro`, `PostCard.astro` (as grouped rows), `RelatedPosts.astro`, `BacklinkList.astro`, the tags pages and `404.astro`.
  - `graph.astro` and `GraphView.tsx`: the list view, a segmented control, shapes, token colors, and a 24 px transparent hit area per node (the list view remains the keyboard path).
  - `LocalGraph.tsx`: a list toggle and the Caption font.
  - `graphUtils.ts` colors become system tokens.
- [ ] **Step 24 — Other blog pages, Refactor.** Run the pages spec and the homepage unit and property tests.
- [ ] **Step 25 — Search, Red (FR5.2; C-05, C-06).** Write `site/tests/e2e/hig-search.spec.ts`:
  - the dialog: `role`, `aria-modal`, a label
  - focus trapped while open and returned on close
  - combobox and listbox keyboard behavior
  - IME composition does not open a result
  - a visible close button at every width
  - the idle, loading, results, empty and error states, with retry
- [ ] **Step 26 — Search, Green.** Rewrite `Search.tsx` and `search.css`. Errors loading the index are shown, no longer swallowed.
- [ ] **Step 27 — Search, Refactor.** Run the search spec.
- [ ] **Step 28 — Profile pages and print, Red (FR4.4, FR6.1).**
  - Write `site/tests/e2e/hig-profile.spec.ts`: segmented local navigation and role navigation, chips, case-study cards, target sizes, 24 KiB CSS budget.
  - Update `profile-presentation.test.ts` in the same commit as any markup or class it pins changes (FR6.3).
  - Extend the print expectations: every text run is at least 10 pt with a line height of at least 1.35, A4 with 12 mm margins (mockups review finding R-09).
- [ ] **Step 29 — Profile pages and print, Green.**
  - Restyle `profile/foundation.css`, `resume.css`, `portfolio.css` and `print.css`, with print sizes in pt.
  - Change markup in `components/profile/*` only where needed, keeping every `data-profile-*` attribute and the approved fact text.
  - Keep the screen-only selector names, so `pdf-renderer.mjs` does not change.
- [ ] **Step 30 — Profile pages, Refactor, and verification baselines (FR6.3).**
  - Update `INHERITED_INLINE_SCRIPT_BASELINES` in `asset-budget.mjs` for the changed bootstrap and scroll scripts, with a comment citing FR3.2 and FR5.10.
  - Confirm the profile CSS gzip is at most 24 KiB.
  - Update the obligation map where test names changed.
- [ ] **Step 31 — Environment and build configuration (NFR4).**
  - Self-host the KaTeX CSS and fonts from the installed `katex` package, and remove the KaTeX CDN link, so no route requests a third party.
  - In `homepage.spec.ts`, remove `cdn.jsdelivr.net` from the allowed hosts.
  - Add `site/tests/e2e/hig-performance.spec.ts` (Chromium, 4× CPU throttling): LCP under 2.5 s, CLS under 0.1 and TBT under 200 ms on `/`, a long post, `/graph` and `/resume`, plus blog route CSS at most 30 KiB gzip (NFR2).
- [ ] **Step 32 — Full verification on the feature branch (NFR7).**
  - `cargo test --release`
  - `npm run test:unit`
  - `npm run test:pbt`
  - `npx astro check` with 0 errors
  - `just crossunit`
  - the whole HIG Playwright suite in 3 browsers

  Fix anything red. Never lower a threshold.
- [ ] **Step 33 — Merge the redesign.** Merge `feature/hig-redesign` into `develop` with `--no-ff`, then delete the branch.

### Phase C: Prettier on `chore/prettier-site` (FR7.1)

- [ ] **Step 34 — Prettier, Red then Green.**
  - Add `prettier` and `prettier-plugin-astro` at pinned exact versions.
  - Add `.prettierrc` (2 spaces, semicolons, `singleQuote: true`) and `.prettierignore` (generated, public JSON, `.generated`, `dist`).
  - Add the npm scripts `format` and `format:check`.
  - Show that `format:check` fails, then run `format` as one dedicated reformatting commit.
- [ ] **Step 35 — Prettier, Refactor and merge.** Refresh the inline-script baselines the reformat changed. Rerun the Step 32 suites, merge with `--no-ff`, and delete the branch.

### Phase D: Hand-off

- [ ] **Step 36 — PDF candidate (FR6.2).** On `develop`, run `npm run resume:pdf -- --prepare` and give the maintainer the review page. Promotion (`--promote`) is the maintainer's decision after their review. It is never run by the build.
- [ ] **Step 37 — Accessibility review hand-off (FR6.4).** Build `develop` and hand the maintainer the M-01 to M-05 checklist and the 16-state review. Do not write or re-stamp `site/verification/profile/manual-web-accessibility.json`. `npm run test:e2e` stays red until that review is recorded. Until then, the HIG Playwright suite is the interim signal.
- [ ] **Step 38 — Documentation and traceability.**
  - In `CLAUDE.md`, update the appearance model, tokens, self-hosted fonts and KaTeX, the removal of `solar.ts`, the HIG test commands, the `.aidlc/worktrees/` ignore, and the test counts.
  - In `site/README.md`, fix the 12→16 state drift.
  - Commit on a `docs/hig-redesign` branch, merge with `--no-ff`, and delete the branch.
  - The conductor then writes `code-summary.md` and `traceability.json`.

### Phase E: Build and Test repair, loop-back 1 (NFR1, NFR2, NFR7)

Only these steps are built in this attempt. Each branch starts from `develop`, merges back with `--no-ff` after its own checks pass, and is deleted with `git branch -d`. Every Red is recorded in `code-summary.md` before its Green. Where an implementation already exists, its Red is reproduced by setting the implementation aside, running the test, and restoring it (project practice). Never lower a threshold, and never excuse an element inside a test helper to make a check pass.

**Branch `fix/hig-image-loading` (NFR2: diagram LCP and CLS).**

- [ ] **Step 39 — Red.**
  - In `site/tests/e2e/hig-performance.spec.ts`, add a Chromium test on Lighthouse's DevTools mobile profile:
    - 412 × 823 viewport at DPR 1.75;
    - 4× CPU throttling;
    - 562.5 ms request latency, 1,474.56 kbps down and 675 kbps up, through `Network.emulateNetworkConditions`.

    It asserts LCP < 2,500 ms and CLS < 0.1 on `/`, `/posts/post-with-diagrams`, `/posts/post-with-math`, `/posts/post-with-code`, `/graph` and `/resume`. The diagrams post is expected to fail at about 3.5 s.
  - Add `site/tests/unit/render-images.test.ts` for the post rendering in `render.ts`:
    - `/assets/*.svg` images receive `width` and `height` from the SVG's own `width`/`height` or `viewBox`;
    - PNG, JPEG, GIF and WebP images receive their header dimensions;
    - the first image in a document, or the first light/dark diagram pair, is not lazy;
    - later images stay `loading="lazy"`;
    - a missing or unreadable asset keeps today's markup and does not throw.
- [ ] **Step 40 — Green.**
  - Add a pure size reader in `site/src/lib/` with no new dependency. It reads the SVG attributes and the raster headers from `content/assets/`.
  - Use it in `rehypeImageCaption()`. Keep `max-width: 100%; height: auto` in CSS, so the attributes set only the aspect ratio, and keep the light/dark opacity crossfade.
- [ ] **Step 41 — Refactor.** Run the performance spec, `hig-post.spec.ts`, `render-images` and `render-extended-syntax`, and `npm run test:unit`. Merge.

**Branch `fix/hig-contrast-pairs` (NFR1: text 4.5:1, UI components 3:1).**

- [ ] **Step 42 — Red.** Add these pairs to `site/tests/unit/hig-tokens.test.ts`:
  - The selected segment indicator against its track: at least 3:1 in both appearances, on `--c-bg`, `--c-bg-grouped` and the worst-case thick glass. This covers `segmented.css` and the profile navigation in `profile/foundation.css` (R-05).
  - The selected search option's secondary text on its selection fill over thick glass, in the worst case, with and without the scrim: at least 4.5:1 (R-12).
  - Every Xcode syntax color on a highlighted code line: at least 4.5:1.
  - A tint link inside `mark`: at least 4.5:1.
  - The current tag chip's mark and count on `--c-tint-fill`: at least 4.5:1, or the dormant rule is removed (R-12).
- [ ] **Step 43 — Green.**
  - Add or adjust tokens in `tokens.css`, both dark blocks included.
  - Apply them in `segmented.css`, `profile/foundation.css`, `search.css`, `post.css` and `grouped.css`.
  - Record each departure from `design-system-mapping.md` in `code-summary.md`.
- [ ] **Step 44 — Refactor.** Run `hig-tokens`, `hig-pages`, `hig-profile`, `hig-search`, `hig-post` and the axe matrix in `hig-chrome`, and `npm run test:unit`. Merge.

**Branch `fix/hig-overflow-check` (NFR1 200% text, AC4.1).**

- [ ] **Step 45 — Red.**
  - In `site/tests/e2e/support/hig.ts`, excuse only `auto` and `scroll` ancestors. Report content that a `hidden` or `clip` ancestor cuts off sideways (R-08).
  - Add an overflow matrix in Chromium: every route in `HIG_ROUTES` at 320, 375, 768, 1024, 1440 and 1920 px, in light and dark (AC4.1).
  - Keep the 320 px, 200%-text check (C-14) in all three engines.
  - Record what fails.
- [ ] **Step 46 — Green.** Fix each reported case in the stylesheets (wrapping, `min-width: 0`, scroll regions), never in the helper.
- [ ] **Step 47 — Refactor.** Run the whole HIG suite in three browsers. Merge.

**Branch `fix/hig-missing-red` (TDD exceptions, R-09).**

- [ ] **Step 48 — Outline fold.**
  - Add a check to `hig-post.spec.ts`: folding a section above the current heading moves `aria-current="location"` without any scroll.
  - Record it failing with the `ResizeObserver` line in `toc-highlight.ts` set aside, then passing once that line is restored.
- [ ] **Step 49 — Inline-sheet tracing.** Run the two tracing tests in `profile-tooling.test.ts` against the resolver as it was before `ea2993b`, with only that hunk set aside. Record the failure, restore, and record green. Merge.

**Branch `fix/mermaid-puppeteer-test` (targeted regression for `a029615`).**

- [ ] **Step 50 — Red, then Green.**
  - Add a Rust test that the Mermaid CLI receives `-p <path>` when `.puppeteer-config.json` exists, and no `-p` when it does not, with the argument list built by a pure function in `preprocessor/src/mermaid.rs`.
  - Record the failing run (the function does not exist yet), extract the function, and run `cargo fmt --check` and `cargo test --release`. Merge.

**Verification and records.**

- [ ] **Step 51 — Full verification on `develop` (NFR7).** Run all of these:
  - `cargo test --release` and `cargo fmt --check`
  - `npm run test:unit`, `npm run test:pbt`, `npx astro check` and `npm run format:check`
  - the whole HIG suite in three browsers, including the new mobile-profile performance check
  - `just crossunit`: expected to stop only on the fixture vault's deliberately broken image link
  - `npm run test:e2e`: expected to stop only at the manual record

  Record the new review-subject digest for the maintainer. Fix anything else that is red.
- [ ] **Step 52 — Records.**
  - Add a "Loop-back 1 repair" section to `code-summary.md`, and update the scoped commands in `unit-test-instructions.md`.
  - Update the test counts in `CLAUDE.md` on a `chore/` branch.
  - If any change reaches the résumé's print output, rerun `npm run resume:pdf -- --prepare` and hand over the new candidate. Never run `--promote`.

**Not in this repair.** These stay as they were accepted at the first approval, unless the maintainer adds them now:
- the Code Generation review findings R-01 (undeclared `katex`), R-02 (graph motion under reduced motion), R-03 (unmeasured 44 px targets), R-06 (code-block bar shift), R-07 (review-subject file list), and R-10, R-11, R-13, R-14 and R-15;
- AC2.1 (literal colors outside the token file);
- the fixture vault's broken link (`just crossunit`);
- the manual 16-state review;
- a coverage provider;
- the pre-existing dependency advisories.

### Phase F: Build and Test repair, loop-back 2 (NFR1)

Only these steps are built in this attempt. The Phase E rules hold: each branch starts from `develop`, merges back with `--no-ff` after its own checks pass, and is deleted with `git branch -d`. Every Red is recorded in `code-summary.md` before its Green. Never lower a threshold, and never excuse an element inside a test helper to make a check pass.

**Branch `fix/hig-highlight-links` (NFR1-b: text 4.5:1; review finding R-17).**

- [x] **Step 53 — Red.**
  - In `site/tests/unit/hig-tokens.test.ts`, extend the highlight test: a link inside `mark` reaches at least 4.5:1, in both appearances, on `--c-mark-fill` composited over:
    - `--c-bg`;
    - `--c-surface-2` (table headers);
    - every callout ground, `color-mix()` of each callout hue at `--c-callout-mix` into `--c-bg`.

    Today's values are 4.07–4.33:1 in light mode and 4.27:1 on the dark table header.
  - In `site/tests/e2e/hig-post.spec.ts`, add a rendered check in all three engines, light and dark. It sets up a highlighted link inside the first callout of `/posts/post-with-callouts` and inside a table header of `/posts/post-with-code`, then measures it with `renderedContrast()`. No fixture note renders that state, so the test sets it up, as the Step 42 checks do.
  - In `site/tests/e2e/hig-pages.spec.ts`, add the same check for a highlighted link in the homepage note. It also checks that the homepage's `mark` takes `--c-mark-fill`, not the browser's yellow. Today it reaches 1.73:1 in dark mode.
  - Record the failing output.
- [x] **Step 54 — Green.**
  - Make every highlighted link reach 4.5:1 on every ground. The planned way is to color a link inside a highlight `--c-tint-hover`, which reaches at least 5.63:1 in light mode and 5.37:1 in dark. Hover then needs its own cue (the underline thickens) instead of a color change.
  - If that change needs a new token, add it to `tokens.css` with both dark blocks, and record the departure in `code-summary.md`.
  - Ship the `mark` rule to the homepage note as well, for example by moving it to a stylesheet both pages load, so it no longer exists only in the post pages' bundle.
  - Correct the comment at `post.css:81`.
- [x] **Step 55 — Refactor.** Run `hig-tokens`, `hig-post`, `hig-pages` and the axe matrix in `hig-chrome`, plus `npm run test:unit`. Merge.

**Branch `fix/hig-open-state-overflow` (NFR1-e: 200% text; AC4.1; review finding R-18).**

- [x] **Step 56 — Red.**
  - In `site/tests/e2e/hig-chrome.spec.ts`, extend the C-14 check (320 px, text doubled, three engines) to the open states. The AC4.1 six-width matrix (Chromium, light and dark) gets the same states, wherever their opener is shown at that width. The states:
    - the search dialog with results for "post";
    - the navigation sheet;
    - the outline sheet on both of its tabs;
    - the `/graph` list.
  - Motion is frozen before measuring, through the existing `freezeMotion()`.
  - Assert the expected HTTP status for every route the matrix loads (R-18).
  - Record what fails. The search snippet is expected to fail in every engine and at every width.
- [x] **Step 57 — Green.**
  - In `search.css`, let `.search-option-snippet` wrap to at most two lines with `overflow-wrap: anywhere`, as Step 46 did for `.grouped-row-summary`. Lines after the second stay clamped.
  - Fix anything else the wider checks report, in the stylesheets, never in the helper.
  - Record the departure from the refined mockup's one-line snippet in `code-summary.md`.
- [x] **Step 58 — Refactor.** Run the whole HIG suite in three browsers. Merge.

**Verification and records.**

- [x] **Step 59 — Full verification on `develop` (NFR7).** Run all of these:
  - `cargo test --release` and `cargo fmt --check`
  - `npm run test:unit`, `npm run test:pbt`, `npx astro check` and `npm run format:check`
  - the whole HIG suite in three browsers
  - `just crossunit`: expected to stop only on the fixture vault's deliberately broken image link
  - `npm run test:e2e`: expected to stop only at the manual record

  If a review-subject file changed, record the new review-subject digest for the maintainer. Fix anything else that is red.
- [x] **Step 60 — Records.**
  - Add a "Loop-back 2 repair" section to `code-summary.md`, and update the scoped commands in `unit-test-instructions.md`.
  - Update the test counts in `CLAUDE.md` on a `chore/` branch.
  - If any change reaches the résumé's print output, rerun `npm run resume:pdf -- --prepare` and hand over the new candidate. Never run `--promote`.

**Not in this repair.** Everything listed under Phase E's "Not in this repair" stays as it is. So do the accepted findings of the second review that fail no target: R-16 (the first image's eager loading wherever it sits), R-19, R-20 and R-21.

## Traceability

| Requirement | Steps |
|---|---|
| FR1.1–FR1.7, AC1.1–AC1.5, NFR6 | 1–8 |
| FR2.1–FR2.6, AC2.1–AC2.4 | 10–12, 16–18, 31 |
| FR3.1–FR3.4, AC3.1–AC3.4 | 10–15 |
| FR4.1–FR4.5, AC4.1–AC4.3 | 16–29, 45–47, 56–58 |
| FR5.1–FR5.11, AC5.1–AC5.4 | 10–27, 42–44, 53–57 |
| FR6.1–FR6.4, AC6.1–AC6.2 | 28–30, 36–37, 52 |
| FR7.1, AC7.1 | 34–35 |
| NFR1 | 10, 16, 19, 22, 25, 28, 32, 42–47, 53–58 |
| NFR2 | 17, 31, 39–41 |
| NFR3 | 9, 32, 47, 51, 58–59 |
| NFR4 | 14, 17, 31 |
| NFR5 | 17, 20, 23 |
| NFR7 | 1, 9, 32, 35, 48–51, 59 |

## Risks and Blast Radius

- **Review subjects.** Every edit to `global.css`, `BaseLayout.astro`, `Header.astro`, `MobileNav.tsx`, `navigation.ts`, `package.json`, `package-lock.json` and `src/styles/profile/**` invalidates the accessibility record. That is expected; the record is redone once (Step 37). Step 43 edits `profile/foundation.css`, so the digest handed over at Step 37 changes again; Step 51 records the new one.
- **Asset budget.** Inline-script baselines change twice (Steps 30 and 35), deliberately. Removing the `MobileSidebar` island reduces client JavaScript. No new island is added. Phase E adds none either.
- **Markup contracts.**
  - The primary navigation stays exactly `/tags`, `/graph`, `/resume`, `/portfolio`.
  - `MobileNav` stays an unhydrated `details`.
  - Profile `data-profile-*` attributes and the screen-only selectors do not change.
  - `profile-presentation.test.ts` changes only together with the markup it pins.
- **Rendering.** Step 40 changes `render.ts`, which renders every post and the homepage note. Images keep their sources, `alt` text and figure wrapping; only `width`, `height`, `loading` and `fetchpriority` change.
- **Stronger checks.** The overflow check in Step 45 may find real defects that are not known yet, which would lengthen Steps 46–47.
- **Preprocessor.** Its HTML contract is untouched. Step 50 refactors only how `mermaid.rs` builds its command arguments. Diagram renderer themes are unchanged, so diagram colors will not match the tokens exactly (a known gap).
- **Git operations.**
  - Step 7 is the one forced deletion; its SHA is recorded first.
  - Worktrees with changes are kept.
  - Nothing is pushed, so `origin` stays exactly as it is.
- **Design changes made by this plan.**
  - W1's current-section pill becomes an underline (R-02).
  - Code panels use `--c-code-bg` (R-01).
  - Outline rows are 44 px (R-03).
  - The touch preview is the native press-and-hold (R-11).
  - Phase E adjusts the segment, search-selection and highlight tokens where their contrast falls short.
  - Phase F colors links inside highlights differently and wraps search snippets to two lines. The maintainer accepted the snippet change by choosing Retry with fix.
- **Phase F blast radius.**
  - Steps 53–57 change only styles and tests. The homepage `mark` rule may move into a shared stylesheet. If that stylesheet is a review subject (`global.css`, `tokens.css`, `src/styles/profile/**`), the review digest changes again, and Step 59 records the new one.
  - Search options grow by up to one line, so fewer results fit on a phone screen at once.
  - The open-state checks measure states never measured before, so they may find more defects and lengthen Steps 57–58.
