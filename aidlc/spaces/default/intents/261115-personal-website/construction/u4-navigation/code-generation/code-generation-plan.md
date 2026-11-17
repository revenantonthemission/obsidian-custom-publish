# Code Generation Plan — U4 `u4-navigation`

## Summary

- Builds: the one-item primary navigation model (Writing → `/writing`), the pure Writing marker rule (`/writing` → `page`, `/writing/…` → `section`) and the bar and sheet rendering of `aria-current="page"` / `"true"` with one visible indicator.
- Touches: `site/src/lib/navigation.ts`, `site/src/components/Header.astro`, `site/src/islands/MobileNav.tsx`, `site/src/styles/chrome.css`, `site/tests/unit/profile-metadata-navigation.test.ts`, `site/tests/unit/profile-presentation.test.ts`, `site/tests/pbt/u1/profile-metadata-navigation.pbt.test.ts`, `site/tests/pbt/u1/arbitraries/metadata.ts`, `site/tests/e2e/hig-chrome.spec.ts`, `site/tests/e2e/homepage.spec.ts`, `site/tests/e2e/crossunit.spec.ts`, `CLAUDE.md`.
- Tests: about 30 rewritten or new examples, test-first. Vitest: about 18 in the navigation unit file, about 3 in the presentation file, 1 rewritten property. Playwright: about 6 chrome examples plus the existing axe matrix over `HIG_ROUTES`.

## Sources

- **Design:** `construction/u4-navigation/functional-design/` (rules BR1.1–BR2.5, functional spec, frontend components), `nfr-requirements/` (NFR1.11, NFR1.12, NFR1.14, NFR2.3, NFR3.3, NFR4.8, NFR5.21, NFR6.10, NFR6.11), `nfr-design/` (performance, security, logical components), `infrastructure-design/` (pipeline, monitoring, deployment).
- **Inception:** U4 in `unit-of-work.md` and `unit-of-work-dependency.md`; US6.1, US6.2 and the U4 share of US7.1; FR6.1–FR6.3, NFR1–NFR3, NFR6; AC6.1.1–AC6.1.5, AC6.2.1, AC7.1.1–AC7.1.4; mockups M0 with the interaction spec and the accessibility checklist; contract C3.

## Branch (decision at plan approval)

- **Default (option B):** build on `feature/u4-navigation`, created from `feature/u2-writing-section`, because U4 depends on U2 and only U2's branch carries the `/writing` routes the bar links to. It merges to `develop` after U2 (and U1).
- **Option A:** if the owner rewords the `Areas/Notes` project rule and U1 and U2 merge into `develop` first, the branch is created from `develop` instead. Nothing else in this plan changes.

## Resolutions of carried review findings

| Finding (stage) | Resolution |
|---|---|
| The four-item expectations are not all listed (FD Major) | Step 2 rewrites the navigation unit file; Step 4 rewrites the profile presentation expectations (the constant and the two current-anchor assertions); Step 5 rewrites the chrome focus-ring check; Step 6 rewrites `homepage.spec.ts` and `crossunit.spec.ts`. Every expectation stays as a regression; none is deleted. |
| BR2.3 names routes U3 owns (FD minor) | Step 7 runs the axe matrix over `HIG_ROUTES` as it stands at the U4 merge (`/`, the posts, the hub, `/tags`, `/tags/test`, `/graph`, `/writing`, `/writing/all`, `/404`, `/resume`, `/portfolio`, the two role pages). `/writing/tags`, `/writing/tags/<tag>` and `/writing/graph` join `HIG_ROUTES` with U3, which also checks the section marker there; U4 covers their marker in the unit and property tests. |
| Two derivations of "current" (FD minor) | One derivation, in Step 2: the shared state builder marks an exact href match `page` and a descendant `true`; `resolveNavigationMarker(pathname)` reads the primary item's href from the frozen model instead of repeating the literal; the profile local view keeps `current` and renders `aria-current="page"` as today, so BR1.5 does not change. The U1-P10 equality (`getPrimaryNavigationState(path)` equals `getNavigationState(model, path)`) stays as the check. |
| `aria-current` is emitted once per surface, not once per page (NFR-req Major) | Step 5 asserts per surface: exactly one marked link in `.desktop-nav` and exactly one marked row in `.mobile-nav-dropdown`. Only one of the two surfaces renders at a given width (the bar at ≥ 768 px, the sheet below), so the rendered page carries one marked link. |
| The axe route set (NFR-req Major) | The same split as the FD finding: Step 7 uses the `HIG_ROUTES` list at the U4 merge, including `/resume` and `/portfolio`; the U3 routes join later. |
| "U4 removes three links" count (NFR-req minor) | The plan states the model change as four items leaving the bar and the sheet and Writing added (net −3 anchors per surface), in Step 2 and in the Step 8 measurements. |
| Baselines no artifact defines (NFR-req minor) | Step 1 records the baseline numbers on the base branch (fixture build median of 3, `/` transferred bytes, `/writing/all` HTML bytes at the fixture post count, `chrome.css` size); Step 8 compares against them and the absolute budgets (≤ 3.81 s, ≤ 255,351 B, ≤ 107,795 B, ≤ 10,000 B). The baselines are cited as "U2 head, Construction verification", so the plan needs no sibling artifact path. |
| The fail-closed diagnostic (NFR-req minor) | Step 2 keeps the existing coded diagnostics `navigation.model.invalid` and `navigation.current.invalid` (paths `profile.navigation.model`, `profile.navigation.current`) and `Header.astro` still throws `TypeError('Invalid primary navigation state.')`; the failing build carries the coded issue, so no uncoded error is introduced. |
| The no-JS sheet check had no named verification (NFR-req minor) | Step 5 runs the sheet open-and-navigate check with JavaScript disabled in `hig-chrome.spec.ts`; Step 7 runs `just crossunit`. Both are named here. |
| The test table misses two broken expectations (NFR-design Major) | Step 6 covers `homepage.spec.ts` (the bar's single `/writing` link plus the homepage's own Résumé and Portfolio capsules) and Step 5 covers the `hig-chrome` focus-ring check, which moves to `/writing` and selects the marked link for both marker values. Both files are in the Step 6 test inventory and in the `traceability.json` NFR6.10 row. |
| The profile pages' current-anchor expectations (NFR-design minor) | Step 4 replaces the two current-anchor assertions: the primary nav carries no current anchor on `/resume`, `/portfolio` and the role pages, while the local navigation keeps marking the current route. |
| "Writing stays" wording (NFR-design minor) | The plan states that four items leave the bar and the sheet and Writing is added; the byte arithmetic (net −3 anchors per surface) is unchanged. |
| The per-page marker limit (NFR-design minor) | Step 5 asserts the marker per surface and records that only one surface renders at a given width. |
| `/writing` was never size-checked (NFR-design minor) | Step 8 records the `/writing` transferred bytes and request count beside `/` and `/writing/all`. |
| The baselines need the U2 routes present (NFR-design minor) | Step 1 records the precondition: the U2 routes must be present in the build under test; when they are not, the baseline is recorded as not reproducible and the absolute budgets still apply. |
| Six accuracy findings in the frozen infrastructure artifacts (infra iteration 2, Minor) | No code change: they concern the pipeline description (the pipeline's credential surface, the unscheduled deployed-chrome observation, the unobserved `/writing/all` budget, two copies of the unqualified `cargo test --release`, the withdrawn cut-over sentence, the phantom `site/public/*.json` consumer), and U4 changes no pipeline file. This plan's own commands use the qualified form (`cargo test --release` inside `preprocessor/`, `--manifest-path preprocessor/Cargo.toml` in the verification command). |

## Working rules

- One commit per step; messages `<type>: <Korean …합니다>`. Commit only the files this plan names; never commit, stash or revert the uncommitted AI-DLC framework files.
- Test-first for every behaviour, recording each Red command's failing output. Run the full suite before each commit.
- Never relax a test, threshold or budget to make it pass.
- No merge in this stage.

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
      "Meet an 80% line-coverage floor.",
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

How the contract's layers apply to this unit:

| Contract layer | What it means for U4 |
|---|---|
| Data model and database behavior | Not applicable: U4 owns no persisted data |
| Repository / data access | Not applicable: U4 reads no content source; the model is a frozen constant in `navigation.ts` |
| Business logic | the marker rule and the one-item model in `site/src/lib/navigation.ts` |
| API / endpoint | Not applicable: U4 owns no endpoint; the `/writing` routes are U2's |
| Frontend behavior | `Header.astro`, `MobileNav.tsx`, `chrome.css` and the browser checks |

## Test files

| Test file | Kind | Cases (new or rewritten) |
|---|---|---|
| `site/tests/unit/profile-metadata-navigation.test.ts` | Vitest unit | 14 examples: the one-item model and its frozen shape; the marker table (9 paths); the rendered vocabulary; the unchanged profile model; 3 fail-closed cases; 2 frozen-output cases |
| `site/tests/unit/profile-presentation.test.ts` | Vitest unit (rendered HTML) | 3 rewritten expectations: the `PRIMARY_NAVIGATION` constant, the desktop and sheet current-anchor assertions, the one-item bar on the profile routes |
| `site/tests/pbt/u1/profile-metadata-navigation.pbt.test.ts` and `site/tests/pbt/u1/arbitraries/metadata.ts` | property | 1 rewritten property (U1-P10) and the path-case arbitrary, which now generates `/writing` and `/writing/<segment>` cases and the expected marker value |
| `site/tests/e2e/hig-chrome.spec.ts` | Playwright | 5 rewritten or new examples: the sheet's single 52 px row; the no-JS open-and-navigate to `/writing`; the marker values on `/writing` and `/writing/all`; no marker on `/` and `/resume`; the focus ring on the marked link; the indicator for both marker values |
| `site/tests/e2e/homepage.spec.ts` | Playwright | 1 rewritten expectation: the bar carries `/writing`; the homepage's own Résumé and Portfolio capsules stay |
| `site/tests/e2e/crossunit.spec.ts` | Playwright (no-JS) | 1 rewritten expectation: `CORE_NAV_TARGETS = ['/writing']` |
| `site/tests/e2e/support/hig.ts` | Playwright support | unchanged: `HIG_ROUTES` already lists every route that exists at the U4 merge |

## Steps

- [x] **Step 1 — Branch and runner check** (US7.1)
  - Create `feature/u4-navigation` from the base chosen at approval.
  - Run the unit-scoped commands in `unit-test-instructions.md` green on the base.
  - Record the baselines on the base: the fixture build median of 3, the `/` transferred bytes, the `/writing/all` HTML bytes at the fixture post count, and `wc -c site/src/styles/chrome.css`.
  - Precondition: the U2 routes must be present in the build under test. When they are not, record the baseline as not reproducible and keep the absolute budgets.

- [x] **Step 2 — Business logic: the one-item model and the marker rule — Red → Green → Refactor** (BR1.1–BR1.4; AC6.1.1–AC6.1.4; NFR1.11, NFR1.12, NFR4.8, NFR5.21)
  - Red: `site/tests/unit/profile-metadata-navigation.test.ts` — rewrite the shared navigation contracts:
    - the primary model is exactly `[{ href: '/writing', label: 'Writing' }]`, frozen;
    - the marker table: `/writing` → `page`; `/writing/` → `page`; `/writing?ref=nav#top` → `page`; `/writing/all` → `section`; `/writing/all/` → `section`; `/writing/all?from=writing` → `section`; `/writing/tags` → `section`; `/writing/tags/%EC%9A%B4%EC%98%81%EC%B2%B4%EC%A0%9C` → `section`; `/writing/graph` → `section`;
    - no marker: `/`, `/writing-old`, `/writingold`, `/Writing`, `/WRITING/all`, `/resume`, `/portfolio`, `/posts/post-with-code`;
    - the rendered vocabulary: `page` → `aria-current="page"`, `section` → `aria-current="true"`, none → the attribute is absent;
    - the profile local model is unchanged (홈, Résumé, Portfolio) and keeps marking exactly its current route with `page`;
    - fail closed: `/resume%2fhidden`, `/writing//all` and a control character → `navigation.current.invalid@profile.navigation.current`; an altered model → `navigation.model.invalid@profile.navigation.model` — the old reverse trick no longer detects an altered one-item model, so the test alters the model by adding an item;
    - the models, the states and the items stay frozen.
  - Green: `site/src/lib/navigation.ts` — one derivation for "current": the shared state builder marks an exact href match `page` and a descendant `true`; `resolveNavigationMarker(pathname)` reads the primary item's href from the frozen model instead of repeating the literal; the states carry `ariaCurrent` (`'page' | 'true' | null`); the primary model holds one item; the existing validation and coded diagnostics are unchanged.
  - Refactor: keep the marker a pure function of the normalised path and reuse the existing normalisation, so an invalid path is rejected by the existing validation and never guessed.

- [x] **Step 3 — Property test U1-P10: Red → Green → Refactor** (BR1.4; NFR4.8)
  - Red: `site/tests/pbt/u1/arbitraries/metadata.ts` — `navigationPathCaseArbitrary` gains `/writing` and `/writing/<segment>` cases and an expected primary marker value; `site/tests/pbt/u1/profile-metadata-navigation.pbt.test.ts` — U1-P10 asserts the one-item primary model, the marker vocabulary, the equality of `getPrimaryNavigationState(path)` and `getNavigationState(model, path)`, and that the models are not mutated.
  - Green, then Refactor: the property's kind does not change; only the model's shape and the marker expectation change.

- [x] **Step 4 — Bar rendering: Red → Green → Refactor** (BR2.1; AC6.1.1; NFR1.14)
  - Red: `site/tests/unit/profile-presentation.test.ts` — `PRIMARY_NAVIGATION = ['/writing']`; the desktop bar and the sheet each carry exactly one link to `/writing`; on `/resume`, `/portfolio` and the two role pages the primary nav carries no current anchor while the local navigation keeps marking the current route; the sheet stays a static `<details>` with no island and no `open` attribute.
  - Green: `site/src/components/Header.astro` renders `aria-current` from the state's marker value (`page` or `true`); the site title's own `aria-current="page"` on `/` is unchanged, and the fail-closed throw stays.

- [x] **Step 5 — Sheet rendering and the indicator styles: Red → Green → Refactor** (BR1.3, BR2.2; AC6.1.2–AC6.1.5; NFR1.11, NFR1.12, NFR3.3)
  - Red (Playwright, `site/tests/e2e/hig-chrome.spec.ts`):
    - the bar carries exactly one link, to `/writing`, on every route it is checked on;
    - the open sheet lists one 52 px row at 320 px, and the page behind it stays hidden from view and focus;
    - with JavaScript off the sheet opens and the Writing link navigates to `/writing`;
    - on `/writing` the bar link and the sheet row carry `aria-current="page"`; on `/writing/all` both carry `aria-current="true"`; on `/` and `/resume` the bar link carries no `aria-current`;
    - each surface carries at most one marked item (the bar renders at ≥ 768 px and the sheet below it, so the rendered page carries one marked link);
    - the indicator is visible for both values — the current-text weight and the 2 px underline in the bar, the check icon in the sheet — so it is not colour alone;
    - the focus-ring check moves from `/tags` to `/writing` and focuses the marked link.
  - Green: `site/src/islands/MobileNav.tsx` renders `aria-current` from the marker value and shows the check icon whenever the marker is set (the chevron otherwise); `site/src/styles/chrome.css` extends the current-item rules to `[aria-current='true']` for the bar link and for the sheet row's icon.
  - Guard: `chrome.css` stays at or below 10,000 B (9,561 B today); record `wc -c site/src/styles/chrome.css`.

- [x] **Step 6 — The remaining broken expectations across the suites: Red → Green → Refactor** (BR2.3, BR2.5; AC7.1.1, AC7.1.2)
  - Red, then Green:
    - `site/tests/e2e/homepage.spec.ts`: the shared header carries the single `/writing` link, and the homepage's own Résumé and Portfolio capsules stay (the four-item list is gone);
    - `site/tests/e2e/crossunit.spec.ts`: `CORE_NAV_TARGETS = ['/writing']`; the profile routes stay reachable through the homepage capsules the file's own comment points at;
    - `site/tests/e2e/support/hig.ts`: unchanged — `HIG_ROUTES` already lists every route that exists at the U4 merge.

- [x] **Step 7 — No-JS sweep and the accessibility matrix** (BR2.3, BR2.4; AC7.1.1–AC7.1.3; NFR2.3, NFR3.3)
  - `just crossunit`: the link sweep reports only the fixture's deliberate broken image, and the bar, the Writing link and the sheet work with JavaScript off.
  - The HIG axe matrix over `HIG_ROUTES` at 320, 768, 1024 and 1440 px, in light and dark, with reduced motion; no page makes a request to another origin; no new island is added.

- [x] **Step 8 — Measurements against the NFR budgets** (NFR1.14, NFR6.11)
  - The fixture build median of 3 against the Step 1 baseline and the ≤ 3.81 s budget.
  - The `/` transferred bytes against 255,351 B; the `/writing` transferred bytes and request count; the `/writing/all` HTML against 107,795 B at the fixture post count.
  - `chrome.css` against 10,000 B.
  - Record the numbers in `code-summary.md`; a budget that is missed is recorded as a GAP, never relaxed.

- [x] **Step 9 — Full verification** (BR2.5; AC7.1.4; NFR6.10)
  - Run the recorded Construction Verification Command; it must exit 0.
  - The manual 16-state accessibility record stays closed on this branch: U4 changes four review-subject files, so `npm run test:e2e` reports `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` until the owner redoes the review at release end. This is expected and is not part of the merge gate.

- [x] **Step 10 — Documentation, source manifest and traceability**
  - `CLAUDE.md`: the one-item bar, the marker vocabulary and where the marker is derived, the `chrome.css` budget, and the fact that the four chrome files invalidate the manual accessibility record.
  - Write `code-summary.md`, `source-manifest.json` and `traceability.json`; every `OK` target is one existing workspace-relative file.

## Story → step traceability

| Story | Steps |
|---|---|
| US6.1 One Writing entry in the bar and the sheet | 2, 4, 5, 6 |
| US6.2 The Writing marker on `/writing` and its sections | 2, 3, 5, 7 |
| US7.1 (U4 share) | 1, 7, 8, 9, 10 |
