# Cross-Unit Traceability — `261115-personal-website`

- **Source:** `aidlc engine sensor-traceability --stage build-and-test`, run 2026-11-20 during Build and Test run 5, on the branch `fix/close-open-build-and-test-targets` at head `8d19fde`, the retry the maintainer approved at the run 4 gate.
- **What the tool reads:** the four units' `code-generation/traceability.json` files. Run 5 corrected three rows, because the Code Generation stage requires every `OK` target to be one existing workspace-relative implementation or test file, and the prose put in those cells made the whole cell read as a path that does not exist:
  - U1's `AC2.2.1` → `preprocessor/tests/publication_output.rs` (the publishing step's own check; the rendered-site half is the new `site/tests/e2e/hig-discovery.spec.ts`, recorded in the unit's `code-summary.md`);
  - U2's `AC3.4.1` → `site/tests/unit/homepage-empty-week.test.ts`;
  - U2's `NFR1.8` → `site/src/pages/index.astro` (the budget reset and the measurement stay in `code-summary.md` and in the stage matrix).
- The two new test files are in the units' source manifests, traces, unit test instructions and summaries (`33bcb44`), so the tool now sees them.

## Verdict

**FAIL**: `"pass": false`, with 2 uncovered IDs: `NFR1` and `NFR6`. Runs 2, 3 and 4 reported 4 (`FR3.7`, `NFR1`, `NFR6`, `AC3.4.1`); run 1 reported 9. `AC3.4.1` is now built by the new Vitest file, and `FR3.7` is covered through it, so both leave the uncovered set. Each of the two IDs that remain is a Build and Test finding for the approval gate.

## Uncovered elements

| ID | Why the tool reports it uncovered | Owning stage / Unit | Target file | Status after this stage's runs |
|---|---|---|---|---|
| NFR1 | the tool lists `u2-writing-section: NFR1.7` as not built: its Code Generation row is `Deferred`, because the real-content row-markup measurement belongs to Build and Test | u2-writing-section | `site/src/pages/writing/all.astro` | Graded here: **Met** — 106,391 B for 137 rows = 777 B/row (§6.4, run 1; no row markup changed since, R5.6) |
| NFR6 | the tool lists `u1-publish-boundary: NFR6.2–NFR6.7` and `u2-writing-section: NFR6.8, NFR6.9` as not built (`Deferred` to Build and Test) | u1-publish-boundary, u2-writing-section | the recorded verification command and this stage's measurements | Graded here: NFR6.2–NFR6.5, NFR6.6, NFR6.7, NFR6.8 and NFR6.9 **Met**. U1 `NFR6.1` is **Unverified**: it needs Jenkins Verify on the merge commit (ci-pipeline) |

This stage's grades do not change the tool's verdict, because the tool reads the code-generation traceability files:

- `NFR1` stays uncovered while U2's NFR1.7 row is `Deferred`, although this stage measured and graded it Met.
- `NFR6` stays uncovered while those rows are `Deferred`, although this stage ran and graded them Met, except U1 NFR6.1.
- `FR3.7` and `AC3.4.1` left the uncovered set: the new unit test builds the empty-week homepage.

## Per-ID coverage

### Functional requirements

| ID | Covered | Through | Owning Unit(s) |
|---|---|---|---|
| FR1.1, FR1.2, FR1.3, FR1.7 | yes | AC1.1.1–AC1.1.4 | u1-publish-boundary |
| FR1.4 | yes | AC1.2.1 | u1-publish-boundary |
| FR1.5, FR1.6 | yes | AC1.3.1–AC1.3.3 | u1-publish-boundary |
| FR2.1, FR2.4 | yes | AC2.1.1, AC2.1.2 | u1-publish-boundary |
| FR2.2, FR2.3 | yes | AC2.2.1, AC2.2.2 | u1-publish-boundary (the rendered-site half runs in `site/tests/e2e/hig-discovery.spec.ts`) |
| FR3.1, FR3.2, FR3.8 | yes | AC3.1.1–AC3.1.3 | u1-publish-boundary |
| FR3.3 | yes | AC3.2.1–AC3.2.4 | u1-publish-boundary |
| FR3.4, FR3.5, FR3.6 | yes | AC3.3.1–AC3.3.4 | u2-writing-section |
| FR3.7 | yes | AC3.4.1 | u2-writing-section |
| FR4.1, FR4.2, FR4.3 | yes | AC4.1.1–AC4.1.6 | u2-writing-section (AC4.1.5: u3-writing-moves) |
| FR4.4, FR4.5 | yes | AC4.2.1–AC4.2.4 | u2-writing-section |
| FR4.6 | yes | AC4.1.1–AC4.1.6, AC4.2.1–AC4.2.4 | u2-writing-section |
| FR5.1, FR5.3, FR5.4 | yes | AC5.1.1–AC5.1.3 | u3-writing-moves |
| FR5.2 | yes | AC5.2.1–AC5.2.5 | u3-writing-moves |
| FR6.1, FR6.2 | yes | AC6.1.1–AC6.1.5 | u4-navigation |
| FR6.3 | yes | AC6.2.1 | u4-navigation |

### Non-functional requirements

| ID | Covered | Through | Not built (per the tool) |
|---|---|---|---|
| NFR1 | no | U1 NFR1.1–1.4; U2 NFR1.5–1.10; U3 NFR1.15; U4 NFR1.11, 1.12, 1.14 | U2 NFR1.7 |
| NFR2 | yes | U1 NFR2.1; U2 NFR2.2; U3 NFR2.4; U4 NFR2.3 | — |
| NFR3 | yes | U1 NFR3.1; U2 NFR3.2; U3 NFR3.4; U4 NFR3.3 | — |
| NFR4 | yes | U1 NFR4.5, 4.6; U2 NFR4.7; U3 NFR4.9, 4.10; U4 NFR4.8 | — |
| NFR5 | yes | U1 NFR5.1–5.14; U2 NFR5.19, 5.20; U3 NFR5.22–5.25; U4 NFR5.21 | — |
| NFR6 | no | U1 NFR6.1–6.7; U2 NFR6.8, 6.9; U3 NFR6.12–6.16; U4 NFR6.10, 6.11 | U1 NFR6.2–6.7; U2 NFR6.8, NFR6.9 |
| NFR7 | yes | U1 NFR7.1, 7.2 | — |
| NFR8 | yes | AC4.2.1–AC4.2.4 | — |

The tool reports `NFR5` as fully covered, and run 5 agrees. The three sub-targets that run 2 graded Not Met are **Met**:

| Sub-target | Repair | Evidence |
|---|---|---|
| U2 NFR5.19 | `7b8aab7` (review-03 R-05 Fixed) | `content-data.test.ts` in Node; `env -u VITEST CONTENT_DIR_OVERRIDE=… npx astro build` exits 1 with `WR002` |
| U4 NFR5.21 | `bd3b57b` (review-03 R-07 Fixed) | `header-navigation-failure.test.ts` 4/4 in Node, through the Astro container |
| U2 NFR1.5 | `b7efd85` (review-03 R-06 Fixed) | `hig-writing.spec.ts` inline-script check, in Chromium via Playwright |

The two sub-targets that run 4 graded Not Met are **Met** in run 5:

| Sub-target | Why |
|---|---|
| U4 NFR1.11 | the requirement now reads "at most once per surface" (the maintainer's rewording of 2026-11-20); the bar and the sheet each carry exactly one marked item, asserted in three engines |
| U4 NFR6.11 | `performance-design.md` §1 now says Writing is added and Tags, Graph, Résumé and Portfolio leave; the trace carries the same wording, and the measured `/` and `/writing` HTML meet the target |

U1 NFR6.6, which run 3 graded Not Met at 1.44 ×, is **Met** in run 5 at 0.889 × against the same-day pre-U1 baseline.

### Acceptance criteria (built in)

| ID | Unit: file |
|---|---|
| AC1.1.1, AC1.1.3, AC1.1.4, AC2.2.1 | u1: `preprocessor/tests/publication_output.rs` |
| AC1.1.2 | u1: `preprocessor/tests/walker_test.rs` |
| AC1.2.1 | u1: `preprocessor/tests/stamping_order_test.rs` |
| AC1.3.1, AC1.3.2 | u1: `preprocessor/tests/cli_boundary_test.rs` |
| AC1.3.3, AC2.1.1, AC2.2.2 | u1: `preprocessor/tests/publication_catalog.rs` |
| AC2.1.2 | u1: `site/tests/unit/content-data.test.ts` |
| AC3.1.1, AC3.1.2, AC3.2.1, AC3.2.2, AC3.2.4 | u1: `site/tests/e2e/hig-pages.spec.ts` |
| AC3.1.3 | u1: `site/tests/e2e/hig-chrome.spec.ts` |
| AC3.2.3 | u1: `site/tests/e2e/crossunit.spec.ts` |
| AC3.3.1–AC3.3.3, AC4.1.2, AC4.1.4, AC4.1.6, AC4.2.2–AC4.2.4 | u2: `site/tests/unit/writing-lists.test.ts` |
| AC3.3.4, AC4.1.1 | u2: `site/tests/e2e/hig-writing.spec.ts` |
| AC4.2.1 | u2: `site/tests/pbt/u2/writing-lists.pbt.test.ts` |
| AC3.4.1 | u2: `site/tests/unit/homepage-empty-week.test.ts` (new in run 5; the sealed copy in `site/tests/e2e/homepage.spec.ts` still waits for the end-of-release accessibility review) |
| AC4.1.3 | u2: `site/tests/unit/writing-empty-build.test.ts` (passes, Node isolated build) |
| AC4.1.5 | u3: `site/src/pages/writing/index.astro` |
| AC5.1.1 | u3: `site/src/pages/writing/tags/index.astro` |
| AC5.1.2 | u3: `site/src/lib/tag-urls.mjs` |
| AC5.1.3 | u3: `site/tests/unit/legacy-redirects-build.test.ts` |
| AC5.2.1, AC5.2.3 | u3: `site/scripts/local-server.mjs` |
| AC5.2.2, AC5.2.4 | u3: `site/scripts/redirect-table.mjs` |
| AC5.2.5 | u3: `site/tests/unit/local-server.test.ts` |
| AC6.1.1 | u4: `site/src/components/Header.astro` |
| AC6.1.2–AC6.1.4 | u4: `site/src/lib/navigation.ts` |
| AC6.1.5 | u4: `site/src/islands/MobileNav.tsx` |
| AC6.2.1 | u4: `site/src/components/profile/ProfileLocalNavigation.astro` |
| AC7.1.1 | u1, u4: `site/tests/e2e/hig-chrome.spec.ts`; u2: `hig-writing.spec.ts`; u3: `site/tests/e2e/support/hig.ts` |
| AC7.1.2 | u1, u3: `hig-pages.spec.ts`; u2: `hig-writing.spec.ts`; u4: `hig-performance.spec.ts` |
| AC7.1.3 | u1: `site/tests/unit/link-sweep.test.ts`; u2, u3: `crossunit.spec.ts`; u4: `site/scripts/crossunit/link-sweep.mjs` |
| AC7.1.4 | u4: `site/tests/unit/profile-metadata-navigation.test.ts`; graded here through the recorded verification command (passes in run 5) |

The rendered-site FR2.2 checks also run in u1's new `site/tests/e2e/hig-discovery.spec.ts` (3 cases in Chromium, Firefox and WebKit), which is not an acceptance criterion's own file but closes U1 review-02 R-04's gap.

Where these criteria describe browser behaviour, their files ran in real engines in run 5's suites:

- the HIG specs, including the new discovery spec, in Chromium, Firefox and WebKit via Playwright (1,242 passed, 81 skipped by design, 0 failed);
- `crossunit.spec.ts` in Chromium with JavaScript off (16 passed).

The Vitest files ran in Node.
