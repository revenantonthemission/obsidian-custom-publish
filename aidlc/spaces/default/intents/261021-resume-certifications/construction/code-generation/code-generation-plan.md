# Code Generation Plan: Résumé Certifications

## Summary

- Builds: day-precision dates with dotted display in every profile layer, a separate 자격증 section, and the r9 fact revision (AWS added with its 인증 확인 링크, OPIc dated with ACTFL, HSK removed), then a new PDF candidate
- Touches: `site/src/lib/profile/{types,validation,issues,fact-approval,resume-manifest,resume-evidence,production-profile,profile-data}.ts`, `site/scripts/profile/pdf-inspector.mjs`, `site/src/components/profile/{presentation.ts,ResumeContent.astro}`, profile CSS, tests and PBT generators, `docs/resume/product-engineer/` r9 files, `site/verification/profile/fact-approval.json`
- Tests: about 30 new or changed checks, each written failing first: unit tests per layer for full dates and dotted text, manifest order and r8 compatibility, the fact set, PBT generators with date points, and Playwright checks of the 자격증 section and link

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, implement until it passes, refactor, and run the full existing suite before committing; for UI work, the failing tests are the Playwright browser and accessibility acceptance checks for the pages being changed.",
  "scope": "refactor",
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
  "input_sha256": "sha256:358d7d8944b3d79afdc5b1405fd5a233fff278c2e197786f4c9be2c5308811e4",
  "contract_sha256": "sha256:29c3c2c18632ba85523158e68c3941a7cefb56a5e5542fb16e7d8d383b4c0cd5"
}
```

## Scope and Inputs

This is a zero-Unit build. Its inputs are:
- `inception/requirements-analysis/requirements.md` (FR1–FR6, NFR1–NFR6);
- the approved design in `construction/functional-design/` (BR1.1–BR6.3);
- the code map in `aidlc/spaces/default/codekb/obsidian-blog/`.

**How the contract's layers apply:**
- **Data model / database:** not applicable. There is no database; the "data model" here is the profile type layer, which is tested as business logic.
- **Repository / data access, API / endpoint:** not applicable.
- **Business logic:** the profile modules, which are pure functions: validation, fact approval, manifest, PDF evidence and the inspector, presentation.
- **Frontend behaviour:** the résumé page, tested with Playwright and axe.

**The design review's five points**, each now a step here:
- **R-01, manifest:** Step 6.
- **R-02, dotted parsers:** Steps 3–4.
- **The wider `credentials` reach:** Steps 6–7.
- **The promoted-PDF check:** Step 12.
- **The unlabelled range as your choice:** Step 13.

**Ground rules:**
- **Git.** Each branch starts from `develop`, merges back with `git merge --no-ff --no-edit`, and is then deleted with `git branch -d`. Commit messages are `<type>: <Korean description …합니다>`.
- **Never:**
  - push, deploy, or touch the vault;
  - stage `aidlc/` files;
  - run `--promote`;
  - write, stage or re-stamp `site/verification/profile/manual-web-accessibility.json`. The maintainer's uncommitted 2026-10-21 record stays exactly as the maintainer left it, in the working tree.

## Steps

### Branch `feature/resume-day-dates`: full dates and dotted display (FR2, FR4; BR1.x, BR2.1, BR3.x)

This branch changes no fact, so the r8 receipt stays valid on it.

- [x] **Step 1 — Runner readiness.**
  - Build the fixture content as Jenkins does.
  - Confirm that the scoped commands in `unit-test-instructions.md` run.
  - Record the baseline counts:
    - `cargo test --release`
    - `npm run test:unit`
    - `npm run test:pbt`
    - `npx astro check`
    - the HIG suite
- [x] **Step 2 — Red: the date model (BR1.1–BR1.3, BR2.1).** Add failing unit tests to the profile validation and fact-approval test files:
  - a `date` point `2025-09-06` is accepted;
  - `2026-02-29`, `2025-09-31`, `2025-13-01` and `2025-9-6` are rejected with the existing codes;
  - mixed `date`/`year-month` ends are rejected;
  - a reversed `date` range is rejected;
  - a future end such as `2029-07-17` is accepted;
  - fact approval accepts a `date` point and rejects a malformed one.
- [x] **Step 3 — Red: the dotted display and its parsers (BR3.1, BR3.2; review R-02).**
  - Presentation tests:
    - `periodView().text` is `2025.09.06 – 2027.09.06`, `2023.07 – 2023.08`, `2019 – 2026` and `2024.03 – 현재`.
  - `resume-evidence.ts` tests:
    - its PERIOD patterns read the dotted forms of all three precisions;
    - they reject the old hyphen forms in displayed text.
  - `pdf-inspector.mjs` tests:
    - its PERIOD_POINT pattern does the same, including `현재`.
  - Manifest tests:
    - it serializes a `date` point;
    - it rejects a malformed one.
- [x] **Step 4 — Green.** Implement until Steps 2–3 pass:
  - add the `date` precision to `types.ts`, `validation.ts`, `issues.ts`, `fact-approval.ts`, `resume-manifest.ts` and `resume-evidence.ts`;
  - update `pdf-inspector.mjs`;
  - add the dotted formatter in `presentation.ts`, as one function that every profile period uses;
  - update the PBT generators in `tests/pbt/u1/arbitraries/` so they also produce `date` periods, with real days only.

  Stored values stay hyphenated ISO; only the display changes.
- [x] **Step 5 — Refactor.**
  - Where the same date pattern is restated within one layer, share it inside that layer. Keep `resume-evidence.ts`'s deliberate separation, and note why.
  - Run `npm run test:unit`, `npm run test:pbt`, `npx astro check`, `npm run format:check`, the HIG profile spec and `npm run test:e2e`. `test:e2e` stops at the manual record, with a new digest; that is expected.
  - Merge.

### Branch `feature/resume-credentials-r9`: the 자격증 section and the r9 facts (FR1, FR3, FR5; BR4.x, BR5.x, BR6.1, BR6.2)

The new collection and the fact change share one branch, because adding `credentials` already moves the approved fingerprints. Each merged state builds with a matching receipt.

- [x] **Step 6 — Red: the manifest and the r8 record (BR6.2; review R-01).**
  - Manifest tests:
    - a new manifest records seven sections in the order `intro-contact, skills, highlights, project-summaries, education, credentials, certifications`;
    - an empty collection takes no slot.
  - Release-store tests:
    - the stored r8 release record (`site/verification/resume/current-release.json`, six sections, `certifications` at 6) still validates.

    So the section order is versioned: the existing order is kept as the schema-1 order, and the new order is schema 2. A record is validated against the order of its own schema version.
  - Update the manifest PBT oracle (`arbitraries/manifest.ts`), which currently pins `certifications` at 6.
- [x] **Step 7 — Red: the section and the facts (BR4.1–BR4.3, BR5.1, BR5.2, BR6.1).**
  - Presentation tests:
    - a `credentials` view kind with heading `자격증` comes after `학력` and before `어학 자격`;
    - a section is omitted when its collection is empty;
    - an id in both collections is rejected.
  - `production-profile.test.ts` expects:
    - the r9 receipt;
    - the new fact count;
    - AWS with title `AWS Certified Solutions Architect – Associate` (U+2013), issuer `Amazon Web Services`, period `2026-07-17`–`2029-07-17`, and evidence `인증 확인 링크` pointing at `https://cp.certmetrics.com/amazon/en/public/verify/credential/eede0b68fb004a24bdcce600d3dd92cf`;
    - OPIc IH with issuer `ACTFL` and period `2025-09-06`–`2027-09-06`;
    - no `hsk-6` anywhere;
    - E16 cited by every changed fact.

    Update the existing "no certification has an issuer" pin accordingly.
  - A Playwright check in the profile spec, run in three engines:
    - the 자격증 `h2` comes before the 어학 자격 `h2`;
    - the text and dates read `2026.07.17 – 2029.07.17` and `2025.09.06 – 2027.09.06`;
    - 新HSK is absent;
    - the link is keyboard-reachable, with an accessible name naming the certificate;
    - axe is clean at the four widths, light and dark.
- [x] **Step 8 — Green.**
  - Add `credentials` to the profile model, validation, normalization, the manifest (with the versioned order), presentation and `ResumeContent.astro`. Each section kind gets an explicit branch, so there is no fallback `else`.
  - Extend the `.resume-certifications` styles to the new section in `resume.css` and `print.css`, using `--c-` tokens only.
  - In `profile-data.ts`:
    - move nothing; add the AWS entry to `credentials`;
    - give OPIc its issuer and its full dates;
    - remove `hsk-6`.
  - Add evidence `E16`: the maintainer's confirmation of 2026-10-21. Map the changed facts to it in `EVIDENCE_MEMBERSHIP`.
- [x] **Step 9 — Fact revision r9 (BR6.1).**
  - Write `docs/resume/product-engineer/inventory-r9.json`.
  - Compute its canonical digest and the approved-records, materialized and production-diff digests once, with the existing digest functions, the way r7 and r8 were made.
  - Pin them in `production-profile.ts` (`EXPECTED_RECEIPT`, `EXPECTED_MATERIALIZED_DIGEST`).
  - Write the matching `site/verification/profile/fact-approval.json`, with receipt id `profile-fact-approval-2026-10-21-r1`, decision `Approved`, and an audit id and time from the confirmation.
  - Write `revision-r9.md`, which records:
    - the request and the confirmed facts;
    - the evidence;
    - the digests;
    - that the PDF layout and the manual review are not part of the confirmation.
- [x] **Step 10 — Refactor and merge.** Run every suite from Step 5 plus `just crossunit`, then merge.

### Verification, PDF and records

- [x] **Step 11 — Full verification on `develop` (NFR3–NFR6).** Run all of these:
  - `cargo test --release` and `cargo fmt --check`;
  - `npm run test:unit`, `npm run test:pbt`, `npx astro check` and `npm run format:check`;
  - the HIG suite in three engines;
  - the profile CSS budget;
  - `just crossunit`, expected to stop only on the fixture's broken image;
  - `npm run test:e2e`, expected to stop only at the manual record.

  Record the new review-subject digest.
- [x] **Step 12 — PDF candidate (FR6; BR6.3).**
  - Run `npm run resume:pdf -- --prepare` once.
  - Confirm the parity checks pass with the dotted text.
  - Inspect each page for clipping, an orphaned heading, and body text under 10 pt.
  - Record the candidate id and SHA.
  - State whether `npm run resume:pdf:verify` (the check that the promoted PDF matches the current facts) now fails until promotion, and record its message (review minor).
  - Never run `--promote`.
- [x] **Step 13 — Records.**
  - Write `code-summary.md`. It records the unlabelled issue-to-expiry range as the maintainer's choice (requirements Q1, option B, with dots everywhere), which closes the review's minor point.
  - Update `unit-test-instructions.md` with the commands actually run.
  - Update the test counts in `CLAUDE.md` on a `chore/` branch.
  - The conductor writes `traceability.json`.

## Traceability

| Requirement | Steps |
|---|---|
| FR1.1–FR1.5 | 7–9 |
| FR2.1–FR2.3 | 2, 4 |
| FR3.1–FR3.5 | 6–8 |
| FR4.1–FR4.2 | 3–4, 12 |
| FR5.1–FR5.3 | 8–9 |
| FR6.1–FR6.3 | 12 |
| NFR1 | 7, 11 |
| NFR2 | 7–9 |
| NFR3 | 9, 11 |
| NFR4 | 6, 9 |
| NFR5 | 2–3, 6–7, 11 |
| NFR6 | 8, 11 |

## Risks and Blast Radius

- **Review subjects change.** `presentation.ts`, `ResumeContent.astro`, `resume.css`, `print.css` and possibly `resume.astro` all change. The 2026-10-21 manual record goes stale, and the maintainer redoes the 16-state review after this work.
- **Release records.** The versioned section order must keep the r8 record readable. A test pins that.
- **Fact chain.** The digests are computed once and pinned. A mistake makes the build fail closed, which is the safe direction.
- **Portfolio dates.** The portfolio pages turn dotted too, through the shared formatter. This is recorded as an assumption in the requirements.
- **PDF length.** It may grow by a page.
- **Uncommitted file.** The working tree holds the maintainer's uncommitted review record. Branch switches carry it along unchanged; it is never staged.
