# Build and Test Summary: Repository Cleanup and HIG Redesign

This summary covers the zero-Unit build recorded in `code-summary.md`, planned in `code-generation-plan.md`, and tested by the commands in `unit-test-instructions.md` (all in `construction/code-generation/`). The full evidence is in `test-results.md`.

The stage has run three times:
- **Run 1**, at `aeb36cc`: six targets traced to generated code. Loop-back 1 repaired them.
- **Run 2**, at `204066f`: two accessibility targets traced to generated styles. Loop-back 2 repaired them.
- **Run 3**, at `987f497`, is the run this summary reports.

## Build Status

**Build: SUCCESS** on `develop` at `987f497` with the fixture vault.
- `cargo build --release` passed.
- The fixture preprocess produced 14 posts and 1 homepage artifact, with the two expected fixture warnings.
- `npx astro build` produced 34 pages.

Prerequisites are in `build-instructions.md`: Node 24, npm 11, Rust 1.99, `just`, `d2`, `mmdc`, and Playwright's three browsers.

## Test Type Inventory

| Type | Instruction file | Generated here | Result (run 3) |
|---|---|---|---|
| Unit | `construction/code-generation/unit-test-instructions.md` | no (Code Generation) | 48 scoped tests pass; the full unit suite passes 360 |
| Integration | `integration-test-instructions.md` | yes (Standard strategy) | IT-1 to IT-4 and IT-7 pass. IT-5 (`just crossunit`) fails only on the fixture's deliberate broken link. IT-6 (`npm run test:e2e`) stops at the manual review record. IT-8 is now part of IT-4 |
| Browser and accessibility | `integration-test-instructions.md` (IT-4, IT-6) | yes | 937 pass, 0 fail, 65 deliberate skips; the profile evidence passes 6 of 6 |
| Performance | `performance-test-instructions.md` | yes (NFR2) | every page meets LCP, CLS, TBT and INP on the mobile network profile; both CSS budgets hold |
| Security | `security-test-instructions.md` | yes (NFR4, guardrails) | no third-party request, secret or unsafe injection point; 27 pre-existing dependency advisories |

## Coverage Expectations

This is a single, zero-Unit build:
- **Volume:** the Standard strategy calls for 5–8 tests per component plus integration tests for the key boundaries. Both are present. They include the two repairs' checks: image sizing, contrast pairs, highlighted links, overflow at six widths and in open states, and Mermaid arguments.
- **Coverage figure:** the team reports coverage and enforces no minimum, but no figure exists. The site has no coverage provider installed (target TC-8).

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-1 | Testing Contract | `cargo test --release` 0 failed | 113 passed (36 unit, 77 integration) | IT-1 | build-and-test | Met |
| TC-2 | Testing Contract | `npm run test:unit` 0 failed | 360 passed in 30 files | IT-2 | build-and-test | Met |
| TC-3 | Testing Contract | `npm run test:pbt` 0 failed | 37 passed in 6 files | IT-3 | build-and-test | Met |
| TC-4 | Testing Contract | `npx astro check` 0 errors | 0 errors, 0 warnings, 7 hints in 189 files | Q3 | build-and-test | Met |
| TC-5 | Testing Contract | `just crossunit` passes | the link sweep finds only the fixture's deliberately broken image link (exit 1); the no-JS half passes 8 of 8 | IT-5a, IT-5b | build-and-test | Not Met |
| TC-6 | Testing Contract, NFR7, FR6.4 | Playwright checks and `npm run test:e2e` pass | the HIG suite passes (937, 0 failed, 65 deliberate skips). `test:e2e` passes 6 of 6 automated spec files, then stops at `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` for digest `be3fa9c6…48ed9d` | IT-4, IT-6 | build-and-test (the maintainer's review; no later stage owns it) | Unverified |
| TC-7 | Testing Contract, NFR1 | 0 axe violations, 4 widths × 2 appearances, reduced motion | every C-01 axe cell passes in Chromium, Firefox and WebKit | IT-4 | build-and-test | Met |
| TC-8 | Testing Contract | a coverage figure is reported | no coverage provider is installed, so no figure | `test-results.md` Coverage Report | build-and-test | Unverified |
| TC-9 | Testing Contract: `tdd` | a failing test before each behaviour | every behaviour has a test seen failing without it. Steps 39–58 recorded Red before Green. Three earlier gaps were closed by setting the implementation aside: Step 31, Step 48 and Step 49 | `code-summary.md`, `review-02.md`, `review-03.md` | build-and-test | Met |
| TC-10 | scope floor (`bugfix`) | a regression test per defect fixed | the font defect, the Mermaid fix and every repair defect have tests that failed first. The Mermaid tests cover the arguments, not the call in `render_mermaid` (R-20) | IT-1, R0, IT-2, IT-4 | build-and-test | Met |
| TC-11 | team.md Code Style | `cargo fmt --check` clean | clean | Q1 | build-and-test | Met |
| TC-12 | AC7.1 | `npm run format:check` passes | passes | Q2 | build-and-test | Met |
| NFR1-b | NFR1 | text 4.5:1, including on materials | every text pair passes. A link inside a highlight is at least 5.63:1 in light mode and 5.37:1 in dark, on every ground and in the homepage note (R-17 resolved) | U1, IT-4 | build-and-test | Met |
| NFR1-c | NFR1 | UI components 3:1 | the selected segment's ring is 3.81–6.56:1 against its track, and control borders are 3.25–6.44:1. The reading-progress line and the graph edges are treated as decorative and not recorded as exempt (R-21) | U1, IT-4 | build-and-test | Met |
| NFR1-d | NFR1 | keyboard operation, visible focus | the keyboard paths pass, with a global 2 px focus ring. The automated ring check reads only `outline-color` (R-19) | IT-4 | build-and-test | Met |
| NFR1-e | NFR1 | 200% text, no loss of content | nothing overflows or is cut off at 320 px with text doubled, on 14 routes and in every open dialog and sheet, in 3 engines. The same holds at six widths in both appearances (R-18 resolved) | IT-4 | build-and-test | Met |
| NFR2-a | NFR2 | LCP < 2,500 ms on 4 pages, mobile profile | 1,600–1,800 ms median, worst 1,824 ms | PT-3, IT-4 | build-and-test | Met |
| NFR2-b | NFR2 | CLS < 0.1; fonts add no shift | worst 0.0087 (`/graph`); 0 on `/`, the diagrams post and `/resume` | PT-3, IT-4 | build-and-test | Met |
| NFR2-c | NFR2 | INP < 200 ms | worst 40 ms | PT-3 | build-and-test | Met |
| NFR2-d | NFR2 | TBT < 200 ms | worst 74 ms | PT-3, IT-4 | build-and-test | Met |
| NFR2-e | NFR2 | blog CSS ≤ 30,720 B gzip | budget test passes; 27,673 B peak (26,969 B at Step 31, +2.6%) | IT-4, CSS budget figures | build-and-test | Met |
| NFR2-f | NFR2 | profile CSS ≤ 24,576 B gzip | budget test passes; 4,489 B | IT-4, CSS budget figures | build-and-test | Met |
| NFR3 | NFR3 | Chromium, Firefox and WebKit pass | all three pass; real Safari, iOS and Edge were not run | IT-4 | build-and-test | Met |
| NFR4 | NFR4 | no third-party request; self-hosted fonts and KaTeX | ST-1 and ST-2 pass | IT-4 | build-and-test | Met |
| NFR5-a | NFR5 | changed frontend files < 800 lines | the largest `site/src` file changed beyond formatting is `post.css` at 451 lines. Every changed file over 800 lines was larger before the work and shrank | `git diff`, `wc -l` | build-and-test | Met |
| NFR5-b | NFR5 | `--c-` colors; motion on transform and opacity only | both repairs added only `--c-` tokens and no motion | `git diff`, token scan | build-and-test | Met |
| NFR6 | NFR6 | no commit made unreachable by FR1.5/FR1.6; no change lost | only `develop` and `main` and one worktree remain. Every repair branch merged with `--no-ff` and was deleted with `-d`. `origin` is unchanged | git | build-and-test | Met |
| SEC-1 | `security-test-instructions.md` ST-5 | no high or critical advisory | 27 advisories (1 critical `astro`, 18 high), identical to before this work | `test-results.md` Dependency Audit | build-and-test | Not Met |

**Totals:** 28 targets: 24 Met, 2 Not Met, 2 Unverified.
- Run 1 was 18 / 7 / 3, and run 2 was 22 / 4 / 2.
- No target that remains open has a cause in generated code.

## Readiness Assessment

| Readiness | Verdict | Why |
|---|---|---|
| Build-ready | yes | The fixture and production build paths both build, and types and formatting are clean. |
| Test-ready | yes, with gaps | Every suite that gates the nightly deploy passes: Rust, unit and properties. So does the full browser suite. No coverage figure exists. Two checks are weaker than they claim (R-19). |
| Deployment-ready | not until the maintainer acts | Every code-side target is met. Before release, the maintainer must still record the 16-state accessibility review for digest `be3fa9c6…48ed9d` and decide on the PDF promotion and the push of `develop`. The local link sweep cannot pass on the fixture vault, and the dependency advisories predate this work. |

The stage result is still a **failure** by its own rule: commands failed, and two targets are Not Met and two Unverified. None of them has a fix this workflow can make, so `test-results.md` records the no-fix halt-and-ask.

## Known Limitations

- **Maintainer steps outside this workflow:**
  - the 16-state accessibility review (FR6.4), whose record must carry digest `be3fa9c63c1973455c247bed56ae3462175a68d34a6b08d032f2b4143848ed9d`;
  - promoting the PDF résumé (FR6.2), with candidate `8017640e…` still current.
- **Accepted findings still apply.** The Code Generation approvals accepted R-01 to R-23 as risks, except R-05, R-17 and R-18, which the repairs resolved. The targets above are graded on the evidence, not on that acceptance.
  - R-16 (Major) fails no measured target. On a real post whose first image is several screens down, that image still loads eagerly at high priority, which this run cannot measure.
  - R-23 asks the maintainer to confirm the departure: a highlighted link is drawn darker than other links.
- **Performance figures are lab measurements:** loopback serving with Lighthouse-style throttling, not field data and not Lighthouse's own scoring.
- **Real content was not built.** The vault was never read, so behaviour on real content is unmeasured: many diagrams per post, real images, highlighted links in callouts and tables.
