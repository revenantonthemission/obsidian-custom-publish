# Code Generation Plan — U3 `u3-writing-moves`

## Summary

- Builds: Tags and Graph moved under `/writing/...`, one tag-address module, a build-time redirect table, and a static server that answers the old addresses with 301 and serves directory indexes
- Touches: `site/src/lib/tag-urls.mjs`, `site/scripts/redirect-table.mjs`, `site/scripts/build/legacy-redirects-integration.mjs`, `site/scripts/local-server.mjs`, `site/scripts/publish-dist.sh`, the moved pages under `site/src/pages/writing/`, `BackLink.astro`, two layouts, two stylesheets, `astro.config.mjs`, `Justfile`, `Jenkinsfile`, and the HIG and crossunit specs
- Tests: about 45 new Vitest tests in 6 files (module, lookup, writer, server, deploy script, built output), plus updated and added Playwright checks in 6 HIG specs, the shared HIG fixture and the crossunit spec

## Context

- **Unit:** `u3-writing-moves`, kind `ui`, scope `feature`, Standard test strategy, brownfield.
- **Stories:** US5.1 (Tags and Graph at their new addresses), US5.2 (old links keep working), US4.1 (AC4.1.5: the Writing capsules point at `/writing/...`), US7.1 (every changed page stays fast, private and accessible).
- **Design inputs:** `functional-design/` (BR1.1–BR4.4, BR3.6), `nfr-requirements/`, `nfr-design/` (security §2–§8, performance §1–§3), `infrastructure-design/` (the two-copy deploy, the restart order). Decisions carried from the last three reviews, recorded in the stage diaries and built here:
  - the 301 carries `Cache-Control: no-cache`;
  - the writer runs the same G1–G8 validator the server uses and fails the build on a violation or a missing target (`REDIRECT_TARGET_MISSING`);
  - the inline-size guard reads the `<style>` element that carries `grouped.css`;
  - the dotted-key server test takes a free port, never 8080 or 4329;
  - the table is placed with `cp` to a temporary name and `mv` (fresh mtime, atomic rename), from one script both deploy definitions call;
  - the server's start-up line names the table state.
- **Branch:** U1, U2 and U4 are not yet merged into `develop` (U1 is waiting on follow-up F4). U3 builds on U2's pages and U4's navigation, so this work is on `feature/u3-writing-moves`, created from the tip of `feature/u4-navigation` (`1b9add2`). It merges into `develop` with `git merge --no-ff` after U1, U2 and U4 have merged, in that order. This is a deviation from "branch off `develop`", forced by the unmerged dependencies; the maintainer approves it with this plan.
- **Files that are the person's and change here, named as the rules require:**
  - `Justfile` and `Jenkinsfile` — the deploy lines call the new script;
  - `CLAUDE.md` — one short section on the redirect table and the two-copy deploy, as U4 did for its rules;
  - `site/astro.config.mjs` — registers the integration. It is a manual-review subject, so `npm run test:e2e` fails closed until the 16-state review is redone.

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

**How the contract's layers map to this unit.**
- **Data model:** the redirect table's shape and grammar.
- **Repository:** the table loader.
- **Business logic:** the address module, the lookup and the writer.
- **API / endpoint:** the static server's HTTP answers.
- **Frontend:** the moved pages, checked in Playwright.

Each layer gets a Red step that records the failing command's output, a Green step, and a refactor folded into the step's commit while the suite stays green. The Data model and Repository layers are both inside `redirect-table.mjs` and share one Red/Green pair (Steps 4–5). Every Red step runs before the code it tests exists; nothing is written ahead of its test.

## Steps

### Step 1 — Branch and runner readiness

- [x] Create `feature/u3-writing-moves` from `feature/u4-navigation` (`1b9add2`); confirm the working tree's unrelated AI-DLC changes are left untouched and unstaged.
- [x] Run `just preprocess` (fixture vault → `content/` and the copied JSON), then confirm the runner with the exact unit-scoped command on an existing file: `cd site && npx vitest run --config vitest.config.ts tests/unit/writing-lists.test.ts` passes. Record the command in `unit-test-instructions.md` (already written).
- Stories: all (setup).

### Step 2 — Address module: Red

- [x] Write `site/tests/unit/tag-urls.test.ts` (8 tests). Cover:
  - `sanitizeTag` gives the same result as today's `data.ts` for `OS`, `a/b`, `two words`, `운영체제`, `node.js`;
  - `tagPath('운영체제')` is `/writing/tags/운영체제` (decoded);
  - `tagHref` encodes each segment exactly once (`/writing/tags/%EC%9A%B4…`, a space as `%20`, a dot left as is);
  - `legacyTagPath` is `/tags/<key>`;
  - `tagIndexPath` and `graphPath`;
  - a key that sanitizes to empty is refused with a coded error;
  - every function is pure.
- [x] Run `cd site && npx vitest run --config vitest.config.ts tests/unit/tag-urls.test.ts` and record the failing output (module not found).
- Stories: US5.1, US5.2 (BR2.1, BR2.2).

### Step 3 — Address module: Green and refactor

- [x] Write `site/src/lib/tag-urls.mjs` and `site/src/lib/tag-urls.d.mts`.
- [x] `data.ts`'s `sanitizeTag` re-exports the module's, so there is one owner of the rule.
- [x] Make Step 2's tests pass, then run `npm run test:unit` before committing.
- [x] Commit: `feat: 태그 주소를 한곳에서 만드는 모듈을 더합니다`.
- Stories: US5.1, US5.2.

### Step 4 — Redirect table and lookup (data model, loader, lookup): Red

- [x] Write `site/tests/unit/redirect-table.test.ts` (16 tests).
- [x] **Table acceptance.** Valid version-1 tables are accepted, including `/tags/운영체제` and `/tags/node.js`. Each of these is rejected as a whole table, with one error:
  - a relative path;
  - `//evil.example/x`;
  - `/\evil.example/x`;
  - a NUL byte, and a line-feed byte;
  - `/tags?x=1` and `/tags#x`;
  - `/tags/../evil`;
  - `https://elsewhere.example/x`;
  - `/tags/` and `/`;
  - `/%2F%2Fevil.example`;
  - a wrong version, a non-list `rules`, and invalid JSON.
- [x] **Lookup.**
  - `matchRedirect` matches exactly: `/graph.json` does not match `/graph`.
  - `redirectLocation` encodes `to` once and appends the raw query byte-for-byte (`?x=a b` stays `?x=a b`; `?q=%ED%95%9C` stays as is).
  - `isHostileQuery` is true for `%0d`, `%0A`, `%00`, `%1f`, `%7F`, and false for `%20`, `%2F` and a Korean encoded query.
- [x] **Loader** (`loadRedirectTable(tablePath, { readFile, stat })` with counting stubs):
  - 100 lookups between changes read the file 0 extra times;
  - a modification-time change re-reads once;
  - a table that appears after a "missing" start is picked up;
  - a table that disappears clears the rules;
  - an invalid table clears the rules and reports one error per read, not per request.
- [x] Run `cd site && npx vitest run --config vitest.config.ts tests/unit/redirect-table.test.ts` and record the failing output.
- Stories: US5.2 (BR3.2–BR3.5, NFR5.22–NFR5.24, NFR4.10).

### Step 5 — Redirect table and lookup: Green and refactor

- [x] Write `site/scripts/redirect-table.mjs` and `.d.mts`:
  - `validateRedirectTable` (G1–G8, exported for the writer);
  - `loadRedirectTable`;
  - `matchRedirect`;
  - `redirectLocation`;
  - `isHostileQuery` (`/%(?:[01][0-9a-f]|7f)/i`).
- [x] Data is frozen, and errors carry codes.
- [x] Make Step 4 pass, then run `npm run test:unit`.
- [x] Commit: `feat: 리다이렉트 표를 검증하고 찾는 모듈을 더합니다`.
- Stories: US5.2.

### Step 6 — Table writer: Red

- [x] Write `site/tests/unit/legacy-redirects.test.ts` (8 tests). Each test runs over a temporary build-output directory:
  - one rule per `writing/tags/<key>/index.html` plus `/tags` → `/writing/tags` and `/graph` → `/writing/graph`;
  - the rules are sorted by `from` and unique;
  - two runs give byte-identical files;
  - a dotted key (`node.js`) gets its rule;
  - a removed `writing/tags/<key>/index.html` throws `REDIRECT_TARGET_MISSING` naming the rule and writes no table;
  - a missing `writing/graph/index.html` throws the same error;
  - a key that breaks the grammar fails with the validator's code and writes no table;
  - no rule's `to` equals any rule's `from`.
- [x] Run `cd site && npx vitest run --config vitest.config.ts tests/unit/legacy-redirects.test.ts` and record the failing output.
- Stories: US5.2 (BR3.1, NFR4.9, NFR5.23, NFR5.25).

### Step 7 — Table writer: Green and refactor

- [x] Write `site/scripts/build/legacy-redirects-integration.mjs` and `.d.mts`. It exports the pure `writeRedirectTable(outDir)` and the integration factory, whose `astro:build:done` hook calls it with the hook's `dir`. The writer validates with `validateRedirectTable` before writing.
- [x] Do not register the integration yet; that is Step 13 (the moved pages' Green step).
- [x] Make Step 6 pass, then run `npm run test:unit`.
- [x] Commit: `feat: 빌드 결과에서 리다이렉트 표를 쓰는 통합을 더합니다`.
- Stories: US5.2.

### Step 8 — Static server: Red

- [x] Write `site/tests/unit/local-server.test.ts` (10 tests). Setup: take a free port from a `node:net` listener on `127.0.0.1` at port 0 (never 8080 or 4329). Then spawn `node scripts/local-server.mjs <tmp-root>` with `PORT` and `HOST=127.0.0.1`, and wait for the start-up line. Teardown kills the child and removes the root, also on failure. Assert:
  - the start-up line reads `redirects: none`, then `redirects: 3 rules` for a seeded table, and `redirects: table rejected` for a hostile one;
  - `/tags` answers 301 with `Location: /writing/tags` and `Cache-Control: no-cache`;
  - `/tags/` answers the same as `/tags`;
  - `/tags/node.js` answers 301 to `/writing/tags/node.js`, and that target answers 200 through the directory index (BR3.6);
  - `/tags/%EC%9A%B4%EC%98%81%EC%B2%B4%EC%A0%9C` answers 301 to the once-encoded target;
  - `?x=a` is kept;
  - `/tags?x=%0d%0a` answers 400, and the next request answers normally;
  - `/graph.json` is served as a file;
  - an unknown tag answers 404;
  - a table written after start is picked up without a restart;
  - `//evil.example` answers 404, never a foreign `Location`.
- [x] Run `cd site && npx vitest run --config vitest.config.ts tests/unit/local-server.test.ts` and record the failing output.
- Stories: US5.2 (BR3.2–BR3.6, NFR5.22, NFR6.16).

### Step 9 — Static server: Green and refactor

- [x] Edit `site/scripts/local-server.mjs`:
  - split the raw target on its first `?`;
  - look up the decoded path, with one trailing slash stripped, before the file lookup;
  - on a match, answer 400 for a hostile query, otherwise answer 301 with `Location` and `Cache-Control: no-cache`, with the write guarded;
  - extend the directory-index branch;
  - wrap the file lookup so the handler never throws;
  - make the start-up line name the table state.
- [x] Keep `listen` at module scope, exactly as launchd runs it.
- [x] Make Step 8 pass, then run `npm run test:unit`.
- [x] Commit: `feat: 정적 서버가 옛 주소를 301로 답하고 폴더 색인을 내보냅니다`.
- Stories: US5.2.

### Step 10 — Deploy script: Red

- [x] Write `site/tests/unit/publish-dist.test.ts` (6 tests). Each runs `bash scripts/publish-dist.sh <dist> <web-root>` against scratch directories:
  - the tree is mirrored and removed pages are deleted;
  - the table is replaced and its mtime is newer than before the run, even when the old table had equal size and mtime;
  - a build with no table removes the web root's table;
  - no `.redirects.json.tmp` is left behind;
  - a missing argument exits non-zero with a usage line and touches nothing;
  - the web root is created when absent.
- [x] Run `cd site && npx vitest run --config vitest.config.ts tests/unit/publish-dist.test.ts` and record the failing output.
- Stories: US5.2 (NFR5.25, infrastructure two-copy deploy).

### Step 11 — Deploy script: Green, and the deploy definitions call it

- [x] Write `site/scripts/publish-dist.sh` (`set -eu`):
  1. `mkdir -p`;
  2. `rsync -a --delete --exclude=/_redirects.json --exclude=/.redirects.json.tmp`;
  3. then either `cp` the table to `.redirects.json.tmp` and `mv -f` it onto `_redirects.json`, or `rm -f` the table.
- [x] `Justfile` `deploy`: replace the two lines with `bash {{site_dir}}/scripts/publish-dist.sh {{site_dir}}/dist "{{web_root}}"`.
- [x] `Jenkinsfile` Deploy: replace them with `sh 'bash site/scripts/publish-dist.sh site/dist "${WEB_ROOT}"'`.
- [x] Make Step 10 pass.
- [x] Commit: `ci: 배포가 리다이렉트 표를 페이지 다음에 놓도록 바꿉니다`.
- Stories: US5.2.

### Step 12 — Moved pages and built output: Red (browser and built-output checks first)

- [x] **Update the old-address expectations to the new addresses**, deleting none (NFR6.15):
  - `site/tests/e2e/support/hig.ts:45-47` (`HIG_ROUTES`) and `:145` (the graph's list-tab open state);
  - `hig-pages.spec.ts` (the tag, tag-page and graph checks and the route lists, `:173-500`);
  - `hig-writing.spec.ts:151-152` (the capsule `href`s become `/writing/tags` and `/writing/graph`);
  - `hig-performance.spec.ts:16,26` (`/writing/graph`);
  - `hig-search.spec.ts:75`;
  - `hig-profile.spec.ts:30`.
- [x] **Add HIG checks.**
  - The back link on the three moved routes: `data-testid="back-link"`, its `href` is `/writing`, a target of at least 44 × 44 px, and a visible focus.
  - The moved routes carry `aria-current="true"` on the Writing marker.
  - Each moved route's request collector compares logical resources and the count with the expected list.
  - HTTP-level redirects against the HIG server: `/tags`, `/tags/`, `/graph`, `/graph/`, `/tags/test`, `/tags/test/` answer 301 with the right `Location`, the query is kept, and `Cache-Control: no-cache` is set; `/graph.json` is a file; an unknown tag answers 404; `/tags?x=%0d%0a` answers 400.
  - The three moved routes join the axe matrix.
- [x] **Extend crossunit** (`crossunit.spec.ts`): the three moved routes render with JavaScript off, the graph's list panel is visible, and the back link works.
- [x] Add `site/tests/unit/legacy-redirects-build.test.ts` (4 tests), which builds once through `buildSiteInto`:
  - the output holds `_redirects.json` with one rule per built tag page plus two;
  - `writing/tags/index.html`, `writing/graph/index.html` and one tag page exist, and no `tags/` or `graph/` page tree does;
  - the tag index's `<style>` element that carries `.site-main:has(.listing-header)` is under 4096 bytes and contains `.back-link`;
  - no file under `_astro/` contains `.grouped-row`, `.tag-chip`, `.listing-header`, `.grouped-empty`, `.back-link` or `.back-link-chevron`.
- [x] Run `cd site && npx vitest run --config vitest.config.ts tests/unit/legacy-redirects-build.test.ts` and `cd site && npx playwright test --config playwright.hig.config.ts hig-pages.spec.ts hig-writing.spec.ts hig-search.spec.ts hig-profile.spec.ts hig-performance.spec.ts`. Record the failing output.
- Stories: US5.1, US5.2, US4.1 (AC4.1.5), US7.1 (BR1.1–BR1.3, BR2.3, BR2.4, BR4.1–BR4.4, NFR1.15, NFR2.4, NFR3.4, NFR6.12, NFR6.14).

### Step 13 — Moved pages: Green and refactor

- [x] `git mv site/src/pages/tags site/src/pages/writing/tags` and `git mv site/src/pages/graph.astro site/src/pages/writing/graph.astro`, and fix their relative imports.
- [x] Write `site/src/components/writing/BackLink.astro`, with the same markup, class and test id `/writing/all` uses today. Use it on the three moved pages and on `/writing/all` (U3's declared cross-unit edit).
- [x] Move `.back-link` and `.back-link-chevron` from `site/src/styles/writing.css` into `site/src/styles/grouped.css` (the other declared cross-unit edit).
- [x] Tag links come from the address module:
  - `site/src/pages/writing/tags/index.astro` and `[tag].astro`;
  - `site/src/layouts/PostLayout.astro:80` and `site/src/layouts/HubLayout.astro:31`;
  - the capsules in `site/src/pages/writing/index.astro:27,30`.
- [x] Register `legacyRedirectsIntegration()` in `site/astro.config.mjs`, after the profile integration.
- [x] Make Step 12 pass, then run `npm run test:unit`, `npm run test:pbt` and `just crossunit`.
- [x] Repository-wide grep for the quoted `/tags` and `/graph` literals across `site/`, `preprocessor/`, `Justfile` and `Jenkinsfile`. Each hit is updated, or confirmed as `/graph.json`, `resolveRouteResourcePolicy('/tags')` or a property-test arbitrary.
- [x] Commits:
  - `feat: 태그와 그래프를 Writing 아래로 옮기고 뒤로 링크를 더합니다`;
  - `test: 옮긴 주소의 브라우저 기대값과 리다이렉트 확인을 더합니다`.
- Stories: US5.1, US5.2, US4.1, US7.1.

### Step 14 — Full verification

- [x] Run, in order:
  - `cargo test --release --manifest-path preprocessor/Cargo.toml`;
  - `cd site && npm run test:unit && npm run test:pbt`;
  - `npm run format:check`;
  - `npx astro check`;
  - `npx playwright test --config playwright.hig.config.ts`;
  - `just crossunit`.
- [x] Record each result in `code-summary.md`. Do not run `npm run test:e2e` as a gate: it fails closed with `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` once `astro.config.mjs` changes, and the maintainer redoes that review before the deploy that ships U3.
- [x] Coverage: `npm run test:coverage`. It is reported, not enforced (team.md; maintainer decision 2026-11-20, human-made requirement change). Build and Test reports the site's and Rust's coverage on the full suite.
- Stories: US7.1.

### Step 15 — Documentation and traceability

- [x] `CLAUDE.md` gets one short section:
  - the tag-address module is the only place a tag address is written;
  - the table is written by the build and placed after the pages by `publish-dist.sh`;
  - the server must be restarted from a working copy at the merged commit;
  - the inline-size guard on `grouped.css`.
- [x] Commit: `docs: 리다이렉트 표와 두 단계 배포를 CLAUDE.md 에 기록합니다`.
- [x] Write `code-summary.md`, `source-manifest.json` and `traceability.json` (Step 5 of the stage).
- Stories: all.

### Repair from Build and Test loop-back 1 (2026-11-20)

Build and Test graded U3-NFR5.25 and U3-NFR5.22 Not Met, from review findings R-01 and R-02, which were test gaps. Branch: `feature/u3-writing-moves`. Commit with `git add <path>` per file.

- [x] **Step 16 — Deploy ordering is proven (NFR5.25; review R-01): Red → Green**
  - Red: add a case to `site/tests/unit/publish-dist.test.ts` that stops `publish-dist.sh` after the page copy and before the table copy. Put a `PATH` shim directory first in `PATH` for the child process only, holding a `cp` that exits 1. Assert all of:
    - the script exits non-zero;
    - the web root's old `_redirects.json` is byte-identical to before;
    - the new pages are present and the removed pages are gone;
    - no `.redirects.json.tmp` is left.
  - Show the test can fail: temporarily drop `--exclude=/_redirects.json` from the script, see the test fail, revert, and record both outputs.
  - Green: none needed unless the test fails against today's script.
  - Commit: `test: 배포가 페이지를 먼저 놓고 리다이렉트 표를 나중에 놓음을 확인합니다`.
- [x] **Step 17 — The server's last-resort 400 (NFR5.22; review R-02): Red → Green**
  - Red, in `site/tests/unit/redirect-table.test.ts`: unit cases for `isHeaderValueSafe` (true for an ordinary encoded path and query; false for CR, LF, NUL and DEL), plus a `redirectLocation` case with a lone-surrogate `to` (`/writing/tags/\ud800`) that throws.
  - Red, in `site/tests/unit/local-server.test.ts`: a case serving a table whose rule has a lone-surrogate `to`. Requesting its `from` answers 400, and the next ordinary request still answers normally. Use the same free-port, temporary-root and teardown pattern as the file's other cases.
  - Record the output, and show the server case can fail by temporarily removing the `catch`, then revert.
  - Green: none needed unless a case fails.
  - Commit: `test: 리다이렉트 응답이 잘못된 표에서도 400 으로 답하고 서버가 살아 있음을 확인합니다`.
- [x] **Step 18 — Records**
  - Add a "Loop-back 1 repair" section to `code-summary.md`.
  - Update `source-manifest.json` (keep every entry; application-source paths only) and `traceability.json` (NFR5.25 and NFR5.22 point at their tests).
  - Run the full recorded verification command; it must exit 0.

### Repair from Build and Test loop-back 3 (2026-11-20)

Build and Test run 3 graded U1-NFR6.6 Not Met: `npm run test:unit` takes 19.25 s against 13.39 s pre-U1, measured the same day (1.44 × against the 1.2 × limit). The rise comes after the U4 head, from this unit's `legacy-redirects-build.test.ts` and U2's `writing-empty-build.test.ts`, each running a full `astro build`. `site/tests/unit/support/astro-build.ts` makes every build take turns through one lock, and four of the five building test files (`hig-built-assets`, `hig-built-html`, `profile-presentation`, `legacy-redirects-build`) build the same default fixture site. Branch: `feature/u3-writing-moves`. Commit with `git add <path>` per file.

- [x] **Step 19 — One shared default build per unit-suite run (U1-NFR6.6): Red → Green → Refactor**
  - Baseline first, before any edit: time `npm run test:unit` (median of 3) on this head, and on the pre-U1 head in a temporary worktree under the project (removed afterwards), round-robin, the same day. Record both.
  - Red: a Vitest test in `site/tests/unit/` for the support module. Two calls for the default build in the same run return the same output folder, and the build runs once; a call with an `env` (for example `CONTENT_DIR_OVERRIDE`) still gets its own isolated build. Record the failing output.
  - Green: in `site/tests/unit/support/astro-build.ts`, add a shared default build (for example `sharedDefaultBuild()`). The first caller builds under the existing lock into one folder; later callers in the same `vitest run`, in any worker, reuse it.
    - Key the shared folder to the current run, so a build left by an earlier run is never reused. A Vitest `globalSetup` that only sets a run token is acceptable; it must not build anything itself, so a focused run of one test file stays as fast as today.
    - Remove the shared folder at the end of the run. A killed run's folder must not be picked up by the next one.
    - Move `hig-built-assets`, `hig-built-html`, `profile-presentation` and `legacy-redirects-build` onto it. None of them may write into the shared output; check each and keep any test that writes on its own isolated build. `writing-empty-build` keeps `buildSiteInto` with its own content tree.
  - Every existing assertion stays as it is; no test is skipped, loosened or deleted.
  - Measure again (median of 3, round-robin against pre-U1, same day). The ratio must be ≤ 1.2 ×. If it is not, record the figures and the next cause found; never raise the limit.
  - Commit: `test: 단위 시험의 기본 사이트 빌드를 한 번만 하여 공유합니다`.
- [x] **Step 20 — Records**
  - Add a "Loop-back 3 repair" section to `code-summary.md` with the before and after timings and their method.
  - Update `unit-test-instructions.md` if a command or prerequisite changed.
  - Update `source-manifest.json` (keep every entry; application-source paths only; add every changed or new test-support and config file) and `traceability.json` (plain file paths as targets).
  - Run the full recorded verification command; it must exit 0.

## Operational steps this plan does not perform

These are the maintainer's, after the merge. They are listed so the build does not attempt them:
1. Merge U1, U2, U4 and then U3 into `develop`, in that order.
2. Restart `dev.rvnnt.blog` from a working copy at the merge commit (`launchctl kickstart -k gui/$(id -u)/dev.rvnnt.blog`), and check that the start-up line says `redirects: none`.
3. Redo the 16-state accessibility review before the first nightly deploy that ships the moved pages.
4. After that deploy, request `/tags` and its target.

No `just deploy` is run by this plan.
