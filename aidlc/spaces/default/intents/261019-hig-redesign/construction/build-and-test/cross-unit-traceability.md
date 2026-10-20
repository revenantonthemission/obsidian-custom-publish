# Cross-Unit Traceability: Repository Cleanup and HIG Redesign

## Verdict

**FAIL: 2 of 52 requirements are not covered with status `OK`.** FR6.2 (promote the new PDF résumé) and FR6.4 (the maintainer's 16-state accessibility review) are `Deferred` to the maintainer.

The other 50 FR and NFR IDs are `OK`, and every `OK` target file exists: the traceability check reports no invalid target. The verdict is unchanged since run 1. Run 3 re-checked it at `987f497`: the check's only finding is still AC2.1.

## Method

- **Requirements checked.** Every `FR` and `NFR` ID in `inception/requirements-analysis/requirements.md`, the same set the traceability check extracts: FR1–FR7 with their sub-requirements, and NFR1–NFR7.
- **No three-segment AC IDs.** No User Stories stage ran in this scope, so there are none to check.
- **Coverage source.** This is zero-Unit work, so the only coverage file is the stage-level `construction/code-generation/traceability.json`, which the loop-back 1 repair updated. There are no per-Unit files.
- **Re-checked in run 2.** `aidlc engine sensor-traceability --stage code-generation --output-path <that file>` reported no missing row, no undeclared ID and no invalid target. Its one finding is the acceptance-criterion gap AC2.1. AC4.1 was a gap in run 1; the repair's six-width matrix now covers it.

## Coverage

All rows are stage-level (zero-Unit). Paths are relative to the repository root.

| ID | Status | Target |
|---|---|---|
| FR1 | OK | `aidlc/.../construction/code-generation/code-summary.md` (cleanup report) |
| FR1.1 | OK | `site/src/lib/profile/portfolio-roles.ts` |
| FR1.2 | OK | `preprocessor/src/mermaid.rs` |
| FR1.3 | OK | `.mcp.json` |
| FR1.4 | OK | `.gitignore` |
| FR1.5 | OK | cleanup report |
| FR1.6 | OK | cleanup report |
| FR1.7 | OK | cleanup report |
| FR2 | OK | `site/src/styles/tokens.css` |
| FR2.1 | OK | `site/src/styles/tokens.css` |
| FR2.2 | OK | `site/tests/unit/hig-built-assets.test.ts` |
| FR2.3 | OK | `site/src/styles/tokens.css` |
| FR2.4 | OK | `site/tests/e2e/hig-chrome.spec.ts` |
| FR2.5 | OK | `site/src/styles/base.css` |
| FR2.6 | OK | `site/tests/e2e/hig-chrome.spec.ts` |
| FR3 | OK | `site/src/lib/appearance.ts` |
| FR3.1 | OK | `site/tests/e2e/hig-appearance.spec.ts` |
| FR3.2 | OK | `site/src/layouts/BaseLayout.astro` |
| FR3.3 | OK | `site/src/styles/diagrams.css` |
| FR3.4 | OK | `site/tests/unit/appearance.test.ts` |
| FR4 | OK | `site/src/layouts/BaseLayout.astro` |
| FR4.1 | OK | `site/src/components/Header.astro` |
| FR4.2 | OK | `site/tests/e2e/hig-post.spec.ts` |
| FR4.3 | OK | `site/tests/e2e/hig-pages.spec.ts` |
| FR4.4 | OK | `site/tests/e2e/hig-profile.spec.ts` |
| FR4.5 | OK | `site/tests/e2e/hig-pages.spec.ts` |
| FR5 | OK | `site/tests/e2e/hig-chrome.spec.ts` |
| FR5.1 | OK | `site/tests/unit/hig-tokens.test.ts` |
| FR5.2 | OK | `site/tests/e2e/hig-search.spec.ts` |
| FR5.3 | OK | `site/tests/e2e/hig-post.spec.ts` |
| FR5.4 | OK | `site/tests/e2e/hig-post.spec.ts` |
| FR5.5 | OK | `site/tests/unit/hig-built-html.test.ts` |
| FR5.6 | OK | `site/tests/e2e/hig-pages.spec.ts` |
| FR5.7 | OK | `site/tests/e2e/hig-post.spec.ts` |
| FR5.8 | OK | `site/tests/e2e/hig-chrome.spec.ts` |
| FR5.9 | OK | `site/tests/unit/hig-built-html.test.ts` |
| FR5.10 | OK | `site/tests/unit/hig-built-html.test.ts` |
| FR5.11 | OK | `site/tests/e2e/hig-chrome.spec.ts` |
| FR6 | OK | `site/src/styles/profile/print.css` |
| FR6.1 | OK | `site/tests/e2e/hig-profile.spec.ts` |
| **FR6.2** | **Deferred (uncovered)** | the maintainer reviews candidate `8017640e…` and runs `npm run resume:pdf -- --promote` |
| FR6.3 | OK | `site/scripts/profile/asset-budget.mjs` |
| **FR6.4** | **Deferred (uncovered)** | the maintainer's 16-state review record, for the current digest `be3fa9c6…48ed9d` |
| FR7 | OK | `site/.prettierrc` |
| FR7.1 | OK | `site/package.json` |
| NFR1 | OK | `site/tests/e2e/hig-chrome.spec.ts` |
| NFR2 | OK | `site/tests/e2e/hig-performance.spec.ts` |
| NFR3 | OK | `site/playwright.hig.config.ts` |
| NFR4 | OK | `site/tests/e2e/hig-performance.spec.ts` |
| NFR5 | OK | `site/src/styles/tokens.css` |
| NFR6 | OK | cleanup report |
| NFR7 | OK | `site/playwright.hig.config.ts` |

## Findings

Each finding below is for the approval decision.

1. **FR6.2 and FR6.4 are not covered.** Both wait on the maintainer, and no later stage in this workflow owns them.
2. **FR6.4's digest.** Loop-back 2 corrected the row in `traceability.json`, which had named the first attempt's `4b45fd8f…37e47`. It now names `be3fa9c63c1973455c247bed56ae3462175a68d34a6b08d032f2b4143848ed9d`, the digest `npm run test:e2e` reported in runs 2 and 3. Loop-back 2 touched no review subject. The maintainer's record must carry this digest.
3. **Some `OK` rows overstate their coverage.** These rows meet this check's rule (status `OK` with an existing target), but the requirements are only partly met:
   - **Accepted at the Code Generation approvals:**
     - FR2.3: the breakpoints are not all mobile-first (R-04).
     - FR2.6: graph motion ignores reduced motion (R-02).
     - FR5.8: several 44 px targets are never measured (R-03).
   - **Found in run 2, resolved by loop-back 2:**
     - NFR1: highlighted-link contrast (NFR1-b, R-17) and the clipped search snippet (NFR1-e, R-18). Run 3 grades every NFR1 target Met.
4. **Acceptance criteria outside this check.** Two-segment AC IDs are not part of this check, but the stage-level file declares them:
   - AC2.1 is still `GAP`: some literal colors remain outside the token file.
   - AC4.1 is `OK`. Since loop-back 2, the six-width matrix also opens the search dialog, both sheets and the graph list, asserts each route's HTTP status, and passes.
   - AC5.4 is `OK`, but R-03 shows it is only partly measured.
