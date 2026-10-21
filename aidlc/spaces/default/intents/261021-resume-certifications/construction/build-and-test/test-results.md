# Test Results: Résumé Certifications

## Run

### Run 1: before the maintainer's steps

- **When and where:** 2026-10-21, about 15:00–15:08 local time (06:00 UTC), on the build host. The checkout was `develop` at `b7836e8`, with the fixture vault.
- **Runner:** `pipefail`, so every exit status is the command's own.
- **Outcome:** the maintainer chose **Abort** at the halt-and-ask. The workflow paused.

### Run 2: after the maintainer's steps (this result)

- **When and where:** 2026-10-21, about 18:05–18:30 local time, on the build host, with the fixture vault.
- **What changed since Run 1:**
  - The maintainer finished the 16-state accessibility review for digest `ed6e16f63be3aa196326d08dddff380725f7a030262ac2091402f003d3aa15c9`. The first copy of the record held a 24-character digest, and the maintainer corrected it to the full value.
  - The maintainer wrote the PDF review record and promoted candidate `04d50301…` (receipt `4ce5e80b9fc8da2c5a1a39d3788269647659b3db513c7e123ba820c6ab075f57`).
  - Promotion made three unit tests fail. The tests read the live `current-release.json` as if it were still the r8 record. The fix (`1f825fb`, merged as `07bd16e`) reads a frozen copy of r8 instead.
- **Checkout:** `develop` at `07bd16e`.

## Build Status

| ID | Command | Result |
|---|---|---|
| B1–B4 | preprocessor build, fixture preprocess, JSON copy, homepage fixture | success (built by the HIG and `test:e2e` runs) |
| B5 | `npx astro build` | success: the r9 receipt matches the facts |

**Build: SUCCESS.**

## Test Results

| ID | Command | Result |
|---|---|---|
| Q2 | `npm run format:check` | clean (the r8 fixture is left out of formatting, like `verification/`) |
| Q3 / IT-7 | `npx astro check` | 0 errors, 0 warnings, 7 hints |
| IT-1 | `cargo test --release` | 113 passed |
| IT-2 | `npm run test:unit` | 435 passed (Run 2 first saw 3 failures in `resume-release-store.test.ts`, fixed by `1f825fb`) |
| IT-3 | `npm run test:pbt` | 37 passed |
| IT-4a | `hig-profile.spec.ts`, three engines | 93 passed |
| IT-4 | full HIG suite, three engines | 1,032 tests: **967 passed, 65 skipped, 0 failed** |
| IT-5a | `just crossunit` | exit 1 in Run 1, only on the fixture's deliberate `nonexistent-image.png`; this change does not affect it |
| IT-5b | crossunit Playwright half on its own | 8 passed (Run 1) |
| IT-6 | `npm run test:e2e` | **pass** (build `9a9ab32c…`), with the maintainer's record and the promoted PDF |
| IT-8 | `npm run resume:pdf:verify` | **pass**: 46 mapped facts, surface parity pass |
| ST-5 | `npm audit --omit=dev` | 27 advisories (1 critical, 18 high), unchanged since before the work (Run 1) |

## Failure Details

**IT-2 (Run 2, fixed).** The BR6.2 test "the stored r8 release record" read `verification/resume/current-release.json`. Promotion replaces that file with the r9 record, so the test was tied to whichever release is current. It now reads `site/tests/fixtures/resume/r8-release.json`, a byte-identical copy of the record from `48ddc54`, which `cmp` confirmed. The three tests pass, and the full suite passes 435.

**IT-4.** The four WebKit timeouts from Run 1 did not recur. The full suite ran clean.

**IT-5a and ST-5.** Unchanged from Run 1. They have no cause in this work.

## Coverage Report

No coverage figure. There is still no coverage provider.

## PDF Release

- **Candidate:** `04d50301aae81bca6199f0c50bec23761b0f6cc45127e1cbbc97203ef2262ee8`
- **PDF SHA-256:** `d683865ae9cc6121f77cf1f1e1496e63ff4611a4da76c7b9440f3cfc13beea73`
- **Pages:** 2.
- **Review:** written by the maintainer, at `.artifacts/profile/pdf/reviews/04d50301….review.json`.
- **Promoted:** by the maintainer, receipt `4ce5e80b…`. `resume:pdf:verify` passes.

## Target Verification Matrix (final)

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-1 | Testing Contract | `cargo test` 0 failed | 113 passed | IT-1 | build-and-test | Met |
| TC-2 | Testing Contract | `npm run test:unit` 0 failed | 435 passed | IT-2 | build-and-test | Met |
| TC-3 | Testing Contract | `npm run test:pbt` 0 failed | 37 passed | IT-3 | build-and-test | Met |
| TC-4 | team practice | `npx astro check` 0 errors | 0 errors | Q3 | build-and-test | Met |
| TC-5 | team practice | `just crossunit` passes | only the fixture's deliberate broken link fails; no-JS 8/8 | IT-5 | build-and-test | Not Met |
| TC-6 | team practice | Playwright checks and `test:e2e` pass | HIG 967 passed, 0 failed; `test:e2e` passes | IT-4, IT-6 | build-and-test | Met |
| TC-7 | team Code Style | formatting clean | Prettier and `cargo fmt` clean | Q1 (Run 1), Q2 | build-and-test | Met |
| TC-8 | Testing Contract: `tdd` | a failing test before each behaviour | Reds recorded before each Green (`code-summary.md`); the Run 2 fix began from the 3 failing tests | code-summary, IT-2 | build-and-test | Met |
| FR1 | FR1.1–FR1.5 | the confirmed certificate facts | AWS and OPIc as confirmed; HSK absent | IT-2, IT-4 | build-and-test | Met |
| FR2 | FR2.1–FR2.3 | full dates valid only as real days, in every layer | pass | IT-2, IT-3 | build-and-test | Met |
| FR3 | FR3.1–FR3.5 | 자격증 before 어학 자격, one section each | pass | IT-2, IT-4a | build-and-test | Met |
| FR4 | FR4.1–FR4.2 | dotted dates, with web, print and PDF parity | parity passes in the released PDF | IT-2, IT-8 | build-and-test | Met |
| FR5 | FR5.1–FR5.3 | r9 inventory, E16/E17, receipt | build passes against the r9 receipt | B5, IT-2 | build-and-test | Met |
| FR6.1–FR6.2 | FR6 | a PDF with parity, at most one extra page | 2 pages, parity pass | IT-8 | build-and-test | Met |
| FR6.3 | FR6 | promotion by the maintainer | promoted, receipt `4ce5e80b…`; verify passes | IT-8 | build-and-test | Met |
| NFR1-a | NFR1 | zero axe violations, keyboard access, heading order | pass in three engines | IT-4a | build-and-test | Met |
| NFR1-b | NFR1 | 16-state manual review redone | the maintainer's record for `ed6e16f6…` passes | IT-6 | build-and-test | Met |
| NFR2 | NFR2 | only confirmed facts | facts match the confirmation; E16/E17 recorded | IT-2, revision-r9.md | build-and-test | Met |
| NFR3 | NFR3 | fail-closed approval | build verifies the receipt; promotion required the maintainer's review record | B5, IT-8 | build-and-test | Met |
| NFR4 | NFR4 | reproducible digests | inventory digest reproduced independently | code-summary | build-and-test | Met |
| NFR5 | NFR5 | test-first; suites green | see TC-1 to TC-3 and TC-8 | — | build-and-test | Met |
| NFR6 | NFR6 | profile CSS ≤ 24,576 B gzip | budget test passed | IT-4a | build-and-test | Met |
| SEC-1 | ST-5 | no high or critical advisory | 27 pre-existing advisories | ST-5 | build-and-test | Not Met |

**Totals:** 23 targets: 21 Met, 2 Not Met, 0 Unverified.

## Failure Handling

**Failure predicate met.** Two targets are Not Met:
- **TC-5:** `just crossunit` exits 1.
- **SEC-1:** `npm audit` reports advisories.

**Rung 1, in-stage fix.** The 3 unit failures caused by promotion were fixed (`07bd16e`). Nothing in this stage fixes TC-5 or SEC-1.

**Rung 2, classification: no root cause in generated code.**
- **TC-5:** the fixture vault's deliberate negative case.
- **SEC-1:** pre-existing advisories that need a dependency refresh of their own.

**Rung 3: does not apply.** Construction Autonomy Mode is not set.

**Rung 4, halt and ask (no-fix variant).** Loop-backs used: 0 of 3. Presented to the maintainer again after Run 2. The maintainer chose **Accept failure** on 2026-10-21: TC-5 and SEC-1 are accepted known issues, and the stage goes to its approval gate.

## Loop-Back Log

None.
