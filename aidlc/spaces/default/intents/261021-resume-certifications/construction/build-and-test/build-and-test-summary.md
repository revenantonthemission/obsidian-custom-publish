# Build and Test Summary: Résumé Certifications

This summary covers the zero-Unit build recorded in `construction/code-generation/code-summary.md`. The full evidence is in `test-results.md`; this is Run 2, after the maintainer's review and PDF promotion.

## Build Status

**Build: SUCCESS** on `develop` at `07bd16e` with the fixture vault. The build passes against the r9 approval receipt.

## Test Type Inventory

| Type | Instruction file | Result |
|---|---|---|
| Unit | `construction/code-generation/unit-test-instructions.md` | the full unit suite passes 435, after the r8 fixture fix |
| Integration | `integration-test-instructions.md` | IT-1 to IT-4, IT-6, IT-7 and IT-8 pass. IT-5 stops only on the fixture's deliberate broken link |
| Performance | `performance-test-instructions.md` | the CSS budgets and the mobile vitals on `/resume` pass (in IT-4) |
| Security | `security-test-instructions.md` | the link is validated and backed by E17; the approval gate is unchanged; there is no new dependency; 27 advisories predate the work |

## Coverage Expectations

The Standard strategy calls for 5–8 tests per component, and this change meets it. No coverage figure exists, because there is no coverage provider.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-1 | Testing Contract | `cargo test` 0 failed | 113 passed | IT-1 | build-and-test | Met |
| TC-2 | Testing Contract | `npm run test:unit` 0 failed | 435 passed | IT-2 | build-and-test | Met |
| TC-3 | Testing Contract | `npm run test:pbt` 0 failed | 37 passed | IT-3 | build-and-test | Met |
| TC-4 | team practice | `npx astro check` 0 errors | 0 errors | Q3 | build-and-test | Met |
| TC-5 | team practice | `just crossunit` passes | only the fixture's deliberate broken link fails | IT-5 | build-and-test | Not Met |
| TC-6 | team practice | Playwright and `test:e2e` pass | HIG 967 passed, 0 failed; `test:e2e` passes | IT-4, IT-6 | build-and-test | Met |
| TC-7 | team Code Style | formatting clean | clean | Q1, Q2 | build-and-test | Met |
| TC-8 | Testing Contract: `tdd` | Red before Green | recorded for every behaviour | code-summary | build-and-test | Met |
| FR1 | FR1.1–FR1.5 | the confirmed certificate facts | present and exact; HSK absent | IT-2, IT-4 | build-and-test | Met |
| FR2 | FR2.1–FR2.3 | full dates in every layer | pass | IT-2, IT-3 | build-and-test | Met |
| FR3 | FR3.1–FR3.5 | the 자격증 section, order, one section each | pass | IT-2, IT-4a | build-and-test | Met |
| FR4 | FR4.1–FR4.2 | dotted dates and parity | pass | IT-2, IT-8 | build-and-test | Met |
| FR5 | FR5.1–FR5.3 | r9 inventory, E16/E17, receipt | build passes against the receipt | B5, IT-2 | build-and-test | Met |
| FR6.1–FR6.2 | FR6 | PDF with parity | 2 pages, parity pass | IT-8 | build-and-test | Met |
| FR6.3 | FR6 | promotion | promoted by the maintainer; verify passes | IT-8 | build-and-test | Met |
| NFR1-a | NFR1 | automated accessibility | pass | IT-4a | build-and-test | Met |
| NFR1-b | NFR1 | 16-state manual review | passes for `ed6e16f6…` | IT-6 | build-and-test | Met |
| NFR2 | NFR2 | only confirmed facts | yes | IT-2 | build-and-test | Met |
| NFR3 | NFR3 | fail-closed approval | yes | B5, IT-8 | build-and-test | Met |
| NFR4 | NFR4 | reproducible digests | yes | code-summary | build-and-test | Met |
| NFR5 | NFR5 | test-first; suites green | yes | TC-1 to TC-3, TC-8 | build-and-test | Met |
| NFR6 | NFR6 | profile CSS budget | pass | IT-4a | build-and-test | Met |
| SEC-1 | ST-5 | no high or critical advisory | 27 pre-existing | ST-5 | build-and-test | Not Met |

**Totals:** 23 targets: 21 Met, 2 Not Met, 0 Unverified. Neither open target has a cause in this work.

## Readiness Assessment

| Readiness | Verdict | Why |
|---|---|---|
| Build-ready | yes | Builds against the r9 receipt; types and formatting are clean. |
| Test-ready | yes | Every suite that gates the nightly deploy passes, and the browser suite passes in full. |
| Deployment-ready | yes, once pushed | The PDF is promoted and the manual review passes. What remains is committing the maintainer's records (the review record, the release pointer and `public/resume.pdf`) and pushing `develop`, which is the release. |

## Known Limitations

- **The printed verification link** has no underline or visible URL (code review, minor). The maintainer accepted it in the PDF review.
- **The leap-year century cases** (1900, 2000, 2100) have no pinned examples, and the new browser checks have no reduced-motion case (code review, minor).
- **`just crossunit`** keeps failing on the fixture's deliberate broken link, and **`npm audit`** reports 27 pre-existing advisories. Both predate the work.
