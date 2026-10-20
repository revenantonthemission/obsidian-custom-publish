# Code Generation Plan: Repository Cleanup and HIG Redesign

## Summary

- Builds: the repository cleanup, then the HIG redesign of every page (tokens, Liquid Glass, appearance model, 13 accessibility fixes, print), then Prettier
- Touches: git branches and worktrees, `.gitignore`, `site/src/{styles,layouts,components,islands,scripts,lib,pages}`, `site/scripts/profile/asset-budget.mjs`, `site/tests/{unit,e2e}`, `site/package.json`, `CLAUDE.md`
- Tests: 4 new Vitest files (about 30 tests) and 7 new Playwright specs (axe matrix 4 widths × 2 appearances × reduced motion, keyboard, focus, target size, overflow), all written failing first

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
  "input_sha256": "sha256:b844865fa9f6aa61a600897c91b61ecc6311b337ef8e152006d8303a7d082d0b",
  "contract_sha256": "sha256:ac0779166b66a4286785ea3e70cbf32395cfaea41c8dfd42805488e2f8372a75"
}
```

## Scope and Inputs

This is a zero-Unit build covering `requirements.md` (FR1–FR7, NFR1–NFR7) and the approved design in `inception/refined-mockups/`. How the contract's layers apply here:

- **Data model / database, Repository / data access, API / endpoint:** not applicable. There is no database, `data.ts` keeps its contract, and the local server is unchanged.
- **Business logic:** the pure modules (appearance model, token contrast, homepage section wrapper, search key handling).
- **Frontend behavior:** the pages and components, tested with Playwright and axe.

Every phase runs on its own short-lived branch off `develop` and merges back with `git merge --no-ff`. Commit messages are `<type>: <Korean description …합니다>`. Nothing is pushed, deployed, or written to the vault.

## Steps

### Phase A: Repository cleanup (FR1)

- [x] **Step 1 — Test baseline.** Build the preprocessor and materialize the fixture content as the Jenkins Verify stage does (`./preprocessor/target/release/obsidian-press ./fixtures/vault ./content`, copy the four JSON files to `site/public/`, run `node scripts/crossunit/ensure-fixture-content.mjs`). Then run `cargo test --release --manifest-path preprocessor/Cargo.toml`, `npm run test:unit`, `npm run test:pbt` and `npx astro check` in `site/`. Record the counts (passed, failed, skipped) as the baseline in `code-summary.md`. (brownfield safeguard, NFR7)
- [x] **Step 2 — Portfolio work: commit and merge (FR1.1).**
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

## Traceability

| Requirement | Steps |
|---|---|
| FR1.1–FR1.7, AC1.1–AC1.5, NFR6 | 1–8 |
| FR2.1–FR2.6, AC2.1–AC2.4 | 10–12, 16–18, 31 |
| FR3.1–FR3.4, AC3.1–AC3.4 | 10–15 |
| FR4.1–FR4.5, AC4.1–AC4.3 | 16–29 |
| FR5.1–FR5.11, AC5.1–AC5.4 | 10–27 |
| FR6.1–FR6.4, AC6.1–AC6.2 | 28–30, 36–37 |
| FR7.1, AC7.1 | 34–35 |
| NFR1 | 10, 16, 19, 22, 25, 28, 32 |
| NFR2 | 17, 31 |
| NFR3 | 9, 32 |
| NFR4 | 14, 17, 31 |
| NFR5 | 17, 20, 23 |
| NFR7 | 1, 9, 32, 35 |

## Risks and Blast Radius

- **Review subjects.** Every edit to `global.css`, `BaseLayout.astro`, `Header.astro`, `MobileNav.tsx`, `navigation.ts`, `package.json`, `package-lock.json` and `src/styles/profile/**` invalidates the accessibility record. That is expected; the record is redone once (Step 37).
- **Asset budget.** Inline-script baselines change twice (Steps 30 and 35), deliberately. Removing the `MobileSidebar` island reduces client JavaScript. No new island is added.
- **Markup contracts.**
  - The primary navigation stays exactly `/tags`, `/graph`, `/resume`, `/portfolio`.
  - `MobileNav` stays an unhydrated `details`.
  - Profile `data-profile-*` attributes and the screen-only selectors do not change.
  - `profile-presentation.test.ts` changes only together with the markup it pins.
- **Preprocessor.** Its HTML contract is untouched. Diagram renderer themes are unchanged, so diagram colors will not match the tokens exactly (a known gap).
- **Git operations.**
  - Step 7 is the one forced deletion; its SHA is recorded first.
  - Worktrees with changes are kept.
  - Nothing is pushed, so `origin` stays exactly as it is.
- **Design changes made by this plan.**
  - W1's current-section pill becomes an underline (R-02).
  - Code panels use `--c-code-bg` (R-01).
  - Outline rows are 44 px (R-03).
  - The touch preview is the native press-and-hold (R-11).
