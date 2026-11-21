# Code Generation Plan — post-deploy-runner

## Summary

- Builds: 게시 직후 H1–H3를 로컬·공개에서 확인하고 실패 시 되돌리는 Node 러너
- Touches: `site/scripts/post-deploy-check.mjs`, `site/tests/unit/post-deploy-check.test.ts`, `Jenkinsfile`, `Justfile`
- Tests: 요구사항별 단위 테스트 약 8개(Vitest, happy-path), TDD Red→Green→Refactor

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, implement until it passes, refactor, and run the full existing suite before committing; for UI work, the failing tests are the Playwright browser and accessibility acceptance checks for the pages being changed.",
  "scope": "express",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require\n  the existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
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
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
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
  "input_sha256": "sha256:00bb0c868709af99bff45e4219e83fddde1b3c4f0fa0db7c802e00f85f3e2063",
  "contract_sha256": "sha256:397ba0d46e61713119447fa5a695344f8de96f6d9a1182ee14faafecf7a52b03"
}
```

## 계획 단계 (TDD, 요구사항 추적 포함)

- [ ] Step 1 — 프로덕션 스켈레톤: `site/scripts/post-deploy-check.mjs` 모듈 구조와 CLI 인자 골격(FR1, FR2)
- [ ] Step 2 — 테스트 러너 확인: `cd site && npx vitest run --config vitest.config.ts tests/unit/post-deploy-check.test.ts`(FR4, FR4.1)
- [ ] Step 3 — 비즈니스 로직 Red: 링크 파싱·재시도·T1/T2 매핑 실패 테스트(FR1.2, FR1.3, FR3)
- [ ] Step 4 — 비즈니스 로직 Green: 최소 구현
- [ ] Step 5 — 비즈니스 로직 Refactor: 결과 포맷·로그 정리(FR1.5, NFR3)
- [ ] Step 6 — HTTP 경계 Red: 두 오리진 H1/H2/H3 검증 실패 테스트(FR1.1, FR1.4)
- [ ] Step 7 — HTTP 경계 Green: `fetch` 주입 구현
- [ ] Step 8 — HTTP 경계 Refactor: 타임아웃·재시도 정리(NFR1)
- [ ] Step 9 — 환경/배포 설정: Jenkins Deploy/Justfile deploy 연결, revert → `just deploy --no-post-check`(FR2, FR3.1, FR3.2)
- [ ] Step 10 — 문서·추적성: code-summary·traceability 작성, 기존 스위트 확인(FR4.1, NFR4)
