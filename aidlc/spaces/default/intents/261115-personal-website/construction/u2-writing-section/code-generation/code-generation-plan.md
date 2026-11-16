# Code Generation Plan — U2 `u2-writing-section`

## Summary

- Builds: the WritingLists module (Korean-time week, recent 5, by year, topics), `/writing`, `/writing/all` with sticky glass year headers, and the homepage "이번 주 글" section that replaces U1's interim list
- Touches: `site/src/lib/{writing-lists,data,homepage}.ts`, `site/src/pages/{index.astro,writing/index.astro,writing/all.astro}`, `site/src/components/writing/*`, `site/src/styles/writing.css`, `site/tests/**`, `site/scripts/hig/build-and-serve.mjs`, `fixtures/vault/Notes/` (3 new notes)
- Tests: about 45 new or rewritten tests, test-first. Vitest: about 25 examples and 4 properties. Playwright: about 16, plus the axe matrix for the 2 new routes.

## Sources

- **Design:** `construction/u2-writing-section/functional-design/`, `nfr-requirements/`, `nfr-design/`, `infrastructure-design/`.
- **Inception:** U2 in `unit-of-work.md`; US3.3, US3.4, US4.1, US4.2 and US7.1; FR3.4–FR3.7, FR4.1–FR4.6, NFR1–NFR4, NFR6, NFR8; mockups M1–M3 with the interaction spec, design-system mapping and accessibility checklist; contract C3.

## Branch (decision at plan approval)

- **Default (option B):** build on `feature/u2-writing-section`, created from `feature/u1-publish-boundary` because U2 needs U1's data layer and homepage opening. It merges to `develop` after U1.
- **Option A:** if the owner rewords the `Areas/Notes` project rule and U1 merges first, the branch is created from `develop` instead. Nothing else in this plan changes.

## Resolutions of carried review findings

| Finding (stage) | Resolution |
|---|---|
| The interim list, its helpers and its tests must be replaced (FD Major) | Step 7 removes `filterTodayPosts`, `resolveBuildDate` and `TodayPostLike` from `homepage.ts` (the file is deleted if empty), and the `.recent-posts` rules from `home.css`. It updates the unit, property and e2e tests that assert "오늘 발행된 글". The fixture script's pinned 2024-03-01 today-case stays only where the e2e profile suite still needs the post, not the date. |
| Missing fixtures and build-date setup (FD Major; infra) | Step 2 adds three notes to `Notes/`: an undated ordinary post; a post whose file name holds `<b>` and `&`; and a post dated inside the fixed HIG week. Their tags avoid `test`, so the existing tag counts (`test, 글 11개`) stay unchanged. The HIG runner sets `HOMEPAGE_TODAY_OVERRIDE` to a date in that week. An existing note dated 2024 provides the second year. |
| Requirements under the wrong parent NFR; no deterministic or missing-data rule (NFR-req Major) | The plan traces by behaviour. Step 4 adds a determinism test (the same input gives byte-equal list JSON). Step 5 adds `WR001` fail-closed (next row). |
| WR001 misses real failures (NFR-design Major) | `data.ts` takes a content directory (default `CONTENT_DIR`) as a test seam. `getAllPostMeta()` throws `WR001 <path>: content manifest missing — run the preprocessor` when `manifest.json` is absent, and `WR001 <path>: meta files differ from manifest` when the `meta/*.json` set differs from the manifest's `meta/` entries. |
| `--year-header-height` undefined; scroll-margin target (NFR-design Major) | `writing.css` defines `--year-header-height` on `.writing-all` (min block size of the header: `calc(var(--target) + var(--space-2))`). `scroll-margin-block-start` goes on the focusable `<a>`. |
| Glass fallbacks (NFR-design minor) | The header uses `data-material="thick"`, with a `.year-header` override of higher specificity. All three material fallbacks (reduced transparency, no `backdrop-filter`, increased contrast) use `--c-bg-grouped`. |
| Jenkins has no link sweep, so rollback ordering is unprotected (infra Major) | Recorded in the rollback note in `code-summary.md`: reverting U2 after U3/U4 merge must revert them too, and the local gate's `just crossunit` must run before pushing a revert. No Jenkins change in U2: adding crossunit to Jenkins changes the production gate and is listed as a follow-up for the owner. |
| The Vitest site build reads the real clock (infra minor) | The list functions take the date as an argument. Page-level week tests run only in the HIG build, which sets the override; the Vitest build asserts structure only. |
| Total order and code-point comparison (FD minor) | The comparator is `published` descending, then title by UTF-16 code unit (`a < b`), then slug. A property test asserts a strict total order. |
| A malformed override such as `2026-13-45` (FD minor) | `resolveKoreanBuildDate` validates a real calendar date and ignores an invalid one (new behaviour, tested). |

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

| Contract layer | What it means for U2 |
|---|---|
| Data model and API/endpoint | Not applicable: no schema, and the C3 routes are covered by the frontend layer |
| Repository / data access | `data.ts` content seam and `WR001` |
| Business logic | `writing-lists.ts` |
| Frontend behavior | the three pages and `writing.css` |

## Steps

- [x] **Step 1 — Branch and runner check** (US7.1)
  - Create `feature/u2-writing-section` from the base chosen at approval.
  - Run the unit-scoped commands in `unit-test-instructions.md` green on the base.
  - Record the baselines on the base: build time (median of 3 fixture `npx astro build` runs) and bytes transferred for `/` on the fixture HIG build.

- [x] **Step 2 — Fixtures and build date** (infra change list; FD Major 2)
  - Add three notes to `fixtures/vault/Notes/`:
    - `Undated Post.md`, with no `published:` (the stamper is never run on fixtures);
    - `Post <b>Bold</b> & Co.md`, the hostile title, dated in the HIG week;
    - `This Week Post.md`, dated in the HIG week.
  - Their tags must not be `test`.
  - Set `HOMEPAGE_TODAY_OVERRIDE=<a Wednesday in that week>` in `site/scripts/hig/build-and-serve.mjs` for the Astro build.
  - Confirm that `cargo test --release` and the existing HIG counts are unchanged. If a count does change, fix the fixture, never the assertion.

- [x] **Step 3 — Content seam and WR001: Red → Green → Refactor** (NFR5.19; NFR-design Major)
  - Red: extend `site/tests/unit/content-data.test.ts` with 4 tests against a temporary content directory:
    - manifest missing → `WR001`;
    - meta files differ from the manifest → `WR001`;
    - matching manifest and meta → entries returned;
    - empty manifest and empty meta → `[]`.
  - Green: `data.ts` takes a content-dir parameter (default unchanged) and enforces `WR001`.

- [x] **Step 4 — WritingLists: Red → Green → Refactor** (BR1.1–BR1.7; AC3.3.1–AC3.3.3, AC4.1.1–AC4.1.4, AC4.2.1–AC4.2.3; NFR4.7)
  - Red: `site/tests/unit/writing-lists.test.ts`, about 18 examples:
    - week bounds for Wednesday, Sunday and Monday, and the 15:30Z instant;
    - malformed overrides;
    - title tiebreak, then slug tiebreak;
    - undated posts excluded from the week and recent lists;
    - recent list with 7, 3 and 0 posts;
    - by-year grouping with "날짜 없음" last;
    - topic counts, including 0 and unresolvable links;
    - hubs excluded;
    - frozen output;
    - byte-equal JSON for the same input.
  - Red: `site/tests/pbt/u2/writing-lists.pbt.test.ts`, 4 properties:
    - every ordinary post appears exactly once in `postsByYear`;
    - the comparator is a strict total order;
    - `weekPosts` stays within Monday to Sunday;
    - 1,000 generated posts complete under the default property-test timeout.
  - Green: `site/src/lib/writing-lists.ts`, with `resolveKoreanBuildDate(env, now)`, `weekPosts`, `recentPosts`, `postsByYear` and `topics`.

- [x] **Step 5 — `/writing/all`: Red (Playwright) → Green → Refactor** (BR1.5, BR2.3, BR2.4, BR2.6; AC4.2.1–AC4.2.4; NFR1.9, NFR1.10, NFR5.19, NFR5.20, NFR2.2)
  - Red: `site/tests/e2e/hig-writing.spec.ts` `/writing/all` block:
    - h1 "모든 글" and the document title;
    - count "글 N개";
    - year h2s, newest first, with "날짜 없음" last;
    - each row has a `<time datetime>`;
    - NFR8: the row links equal the ordinary-post set in `content/meta`;
    - the hostile title renders literally;
    - the sticky header is stuck under the bar after scrolling;
    - a focused row under a stuck header is fully visible;
    - the reduced-transparency fallback background is `--c-bg-grouped`;
    - all requests are same-origin;
    - 44 px targets.
  - Add `/writing/all` to `HIG_ROUTES` with a new `writing` route kind under the CSS budget.
  - Green: `site/src/pages/writing/all.astro`, `components/writing/YearGroup.astro`, and `styles/writing.css` (`--year-header-height`, data-material override, scroll margin on `<a>`).

- [x] **Step 6 — `/writing`: Red → Green → Refactor** (BR1.4, BR1.6, BR2.2; AC4.1.1–AC4.1.6)
  - Red: `hig-writing.spec.ts` `/writing` block:
    - h1 "Writing" and the document title;
    - capsules Tags → `/tags` and Graph → `/graph`, which open;
    - "최근 글" has at most 5 rows plus "모든 글 보기" → `/writing/all`;
    - "주제" rows show "글 N개" and link to `/hubs/<slug>`;
    - no site page or hub appears among the posts;
    - the click path `/writing` → "모든 글 보기" → `/writing/all`.
  - Add `/writing` to `HIG_ROUTES`.
  - Green: `site/src/pages/writing/index.astro`, `components/writing/RecentPosts.astro` and `TopicList.astro`.

- [x] **Step 7 — Homepage "이번 주 글": Red → Green → Refactor** (BR1.2, BR1.3, BR2.1; AC3.3.1, AC3.3.4, AC3.4.1; FD Major 1)
  - Red:
    - `hig-writing.spec.ts` homepage block: "이번 주 글" h2 lists the fixture week's posts, newest first, then "모든 글 보기";
    - a second build-date case (an empty fixture week) shows the empty row as plain text;
    - update `hig-pages.spec.ts` W5, `tests/e2e/homepage.spec.ts` and `crossunit.spec.ts` to the new section;
    - delete or replace the interim-list unit and property tests.
  - Green:
    - `index.astro` uses `WeeklyPostList`;
    - remove `filterTodayPosts`, `resolveBuildDate` and `TodayPostLike` (delete `homepage.ts` if it is empty);
    - remove `.recent-posts` from `home.css`;
    - `writing.css` is imported on `/`.

- [ ] **Step 8 — JS-off and checkpoint** (NFR3.2; AC7.1.3)
  - Extend `crossunit.spec.ts` to `/writing` and `/writing/all` with JavaScript off.
  - Run `npm run format:check` and `npx astro check`.

- [ ] **Step 9 — Full verification and measurements** (NFR1.7, NFR1.8, NFR6.8, NFR6.9; AC7.1.4)
  - Run the recorded verification command; it must exit 0.
  - Measure:
    - fixture build time (median of 3) against the Step 1 baseline;
    - `/` bytes against 229,036 B + 4,096 B per weekly row;
    - `/writing/all` HTML size on a real-content build: `VAULT_PATH` on a copy of `Areas/Notes`, no stamping, then restore the fixture content with `just preprocess`.

- [ ] **Step 10 — Documentation**
  - `CLAUDE.md`: the new routes; `WR001`; the rule that `HOMEPAGE_TODAY_OVERRIDE` is test-only; `writing.css`.
  - Write `code-summary.md`, `source-manifest.json` and `traceability.json`.

## Story → step traceability

| Story | Steps |
|---|---|
| US3.3 See this week's writing | 2, 4, 7 |
| US3.4 An honest empty week | 4, 7 |
| US4.1 Recent posts and topics | 4, 6 (AC4.1.5's final addresses arrive with U3) |
| US4.2 Every post by date | 2, 4, 5 |
| US7.1 (U2 share) | 5, 6, 8, 9 |
