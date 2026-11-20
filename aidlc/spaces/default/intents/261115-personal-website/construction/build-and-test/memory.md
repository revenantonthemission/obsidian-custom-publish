<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-20T02:53:00Z — [stage] Graded the 80 % line-coverage floor from the Testing Contract as written (53.80 %, Not Met), although team.md reports coverage without enforcing it; whether the team rule governs this scope floor is the maintainer's decision, never a relaxation here.
- 2026-11-20T02:53:00Z — [stage] Applied the project learning to every open code-generation review finding that bears on a target: U3 R-01/R-02 (NFR5.25, NFR5.22), U4 R-02/R-03/R-05 (NFR5.21, NFR1.11), U2 R-01/R-04 (writing.css budget, NFR1.5) and U1 R-02 (BR5.2) are Not Met even where the behaviour measured correct today.
- 2026-11-20T02:53:00Z — [stage] Graded U4's `/` budget against the absolute 255,351 B (Not Met by 320 B), because its design says to grade absolute targets when the baseline does not reproduce, and the U2 head measures 255,770 B today.
- 2026-11-20T06:55:00Z — [stage] Run 2 (after loop-back 1): applied the review-findings learning to the review-02 findings as well. U2 R-05 (CONTENT_DIR_OVERRIDE not fail-closed) bears on U2-NFR5.19, U2 R-06 (inline scripts unchecked) on U2-NFR1.5, U4 R-07 (no build-stop test at Header) on U4-NFR5.21, U4 R-06 (design says Writing "stays") on U4-NFR6.11, and U4 R-05 on U4-NFR1.11. All five are Not Met, although each one's measured behaviour is correct today.
- 2026-11-20T06:55:00Z — [stage] Graded U2-AC4.1.3 Met on a Node isolated-build test, because the criterion concerns static built text, not native browser behaviour.
- 2026-11-20T06:55:00Z — [stage] Added U1-CG-R04 (homepage.spec.ts FR2.2 checks never ran) as Unverified rather than Not Met, the same as U2-AC3.4.1, because only the maintainer's stale manual record blocks it; an inspection of the built site agrees with FR2.2.
- 2026-11-20T09:46:00Z — [stage] Run 4 (after loop-back 3): re-graded U1-NFR6.6 with an independent same-day round-robin against pre-U1 `db7ecae` — 10.72 s against 13.19 s by wall clock (0.813 ×), 9.57 s against 12.11 s by Vitest's duration (0.790 ×), inside the 1.2 × limit. Met; 79 / 6 / 6 / 1 of 92 targets. The loop-back 3 developer measured 0.730 × on the same head, so both measurements agree.
- 2026-11-20T09:46:00Z — [stage] Run 4 graded the unchanged suites from the U3 checkpoint on the same head `0b01712` (recorded verification command, exit 0) and re-ran U3's changed Vitest command, the full unit suite, coverage and the gate command. No product file changed after the checkpoint, so no other suite's input changed.
- 2026-11-20T12:05:00Z — [stage] Run 5, the maintainer's directed retry: 87 Met / 1 Not Met / 3 Unverified / 1 N/A of 92 targets. 8 of run 4's 12 open targets moved to Met: TC-SF-COV80 (the obligation reads "report the coverage; enforce no minimum" after the maintainer's decision, so both figures are reported and no threshold applies), TEAM-RUST-COV (87.45 % of 2,764 Rust lines), U1-CG-R04 and U2-AC3.4.1 (the two new test files run and pass), U2-NFR1.8 and U4-PD-ROOT-BYTES (the `/` budget reset to the measured 255,387 B, which the measurement meets), U4-NFR1.11 ("once per surface") and U4-NFR6.11 (the design text agrees). 4 stay open: TEAM-E2E-A11Y (Not Met), U1-NFR6.1, U1-SLO-NIGHTLY and U1-SLO-PAGECOUNT (Unverified).
- 2026-11-20T12:05:00Z — [stage] Run 5 kept the learning that a target an unresolved code-generation review finding bears on is graded Not Met, but the three findings that held run 4's rows were dispositioned before the run (the maintainer's rewording of NFR1.11, the corrected U4 design text, and the new HIG discovery spec for U1 review-02 R-04), so the rule no longer holds any row back.
- 2026-11-20T12:05:00Z — [stage] Run 5 graded the two new tests by where they ran: the AC3.4.1 empty-week check on the built HTML in Node (one isolated build, 5 cases), and the FR2.2 rendered-site checks in Chromium, Firefox and WebKit. The sealed provider copy still refuses, and no browser behaviour is claimed for the Node-only check.
- 2026-11-20T12:05:00Z — [stage] Run 5's cross-unit gate reports 2 uncovered IDs (`NFR1`, `NFR6`), down from 4: `AC3.4.1` and, through it, `FR3.7` are now built. Both remaining IDs are requirement groups whose Code Generation rows are `Deferred` to this stage's command runs; every one of them is graded Met here except U1-NFR6.1.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-20T02:53:00Z — [stage] just crossunit failed with "Process from config.webServer exited early" because Astro 7.4.1 backgrounds astro preview when it detects an agent; added --ignore-lock to playwright.crossunit.config.ts (rung 1, attempt 1), stopped the stray preview server first, re-ran 16/16, committed 40fa3e7.
- 2026-11-20T03:10:00Z — [stage] Loop-back 1 of 3 (autonomous, failure-ladder rung 3): reopened code-generation for all four units to close the review findings and missing tests behind U3-NFR5.25, U3-NFR5.22, U4-NFR5.21, U4-NFR1.11 (test), U2-NFR1.5, U2-PD-CSS3K, U2-AC4.1.3 and U1-CG-R02 (about 5–7 h, low risk). The coverage-floor policy, the page-weight budget, the NFR1.11 wording and the manual 16-state review are the maintainer's, asked at the repaired plans' approval.
- 2026-11-20T06:20:00Z — [stage] Loop-back 2 of 3 (autonomous, rung 3): reopened code-generation for u2-writing-section and u4-navigation only, for U2-NFR5.19, U2-NFR1.5, U4-NFR5.21 and U4's page-weight record (about 3–4 h, low risk).
- 2026-11-20T08:40:00Z — [stage] Loop-back 3 of 3 (autonomous, rung 3): reopened code-generation for u3-writing-moves only, to build the default fixture site once per unit-suite run and share it, closing U1-NFR6.6 (1.44 × against 1.2 ×; about 1–2 h, low risk). The halt-and-ask was shown first because no loop-back can close the maintainer-owned targets; the person replied by carrying on, which in autonomous mode is rung 3.
- 2026-11-20T02:53:00Z — [stage] Measured build time and page bytes for the U1, U2 and U4 heads in detached scratch worktrees under the OS temp dir (cloned node_modules, identical fixture content), removed afterwards; the main working tree was never switched.
- 2026-11-20T02:53:00Z — [stage] Did not re-run the 167-second real-vault timings for U1 NFR6.4/6.5; graded them on U1's same-day measurement because the preprocessor source is byte-identical since the U1 head.
- 2026-11-20T06:55:00Z — [stage] Run 2: U1 repair 22e1468 changed preprocessor/src/output.rs, so the byte-identical premise above no longer held. Re-measured NFR6.3–6.5 the same day, round-robin, pre-U1 binary vs the current binary, on the private copy. Each stamping run used a fresh APFS clone, and the outputs went to a temp folder that was then deleted. The ratio was 1.001 × both with and without stamping.
- 2026-11-20T06:55:00Z — [stage] Run 2: in the non-stamping timing loop, the binary's output went to a temp file that was read with grep, instead of only to the tool result. The stamping loop piped it instead. The file was deleted with the temp folder.
- 2026-11-20T06:55:00Z — [stage] Run 2: did not rebuild the real-content /writing/all (U2 NFR1.7, U4 PD-WALL). The repair changed only stylesheet placement, and the fixture page shrank 601 B, so run 1's 106,391 B is an upper bound.
- 2026-11-20T06:55:00Z — [stage] Run 2: did not install cargo-llvm-cov for TEAM-RUST-COV. It is a global developer-tool install outside the project, so it is left for the maintainer's go-ahead.
- 2026-11-20T09:46:00Z — [stage] Run 4: measured the pre-U1 baseline in a detached worktree at `.claude/worktrees/pre-u1-db7ecae-run4` with an APFS clone of `site/node_modules` and its own `just preprocess`; the worktree was removed with `git worktree remove` afterwards and the main tree was never switched. The older Justfile there does not set `PUPPETEER_EXECUTABLE_PATH`, so its first preprocess failed on the Mermaid diagram and was rerun with that variable set.
- 2026-11-20T09:46:00Z — [stage] Run 4: no `astro-shared-build-*` folder was left in the OS temp folder after the suite and coverage runs, and no preview server was left running.
- 2026-11-20T12:05:00Z — [stage] Run 5: did not rebuild the real-content `/writing/all` and did not re-time the 167-second real-vault runs; no product or fixture file changed since run 4, so the recorded figures (777 B per row, 1.001 × both stamping ratios) stand. The Rust suite's wall clock was not recorded in the full verification run either, so U1-NFR6.6's cargo figure still comes from run 3; the site unit suite was measured at 0.889 ×.
- 2026-11-20T12:05:00Z — [stage] Run 5: measured the Rust coverage with cargo-llvm-cov 0.9.1, installed globally with the maintainer's go-ahead. It builds into its own target directory, so the release binary stays uninstrumented; the instrumented directory was deleted afterwards and the uninstrumented release binary rebuilt before the verification command.
- 2026-11-20T12:05:00Z — [stage] Run 5: measured the transferred bytes with a temporary CDP script under `site/.artifacts/` (gitignored) instead of adding a byte-budget test to the suite; the budget is a maintainer-set value that no committed test asserts, and the script is not part of the deliverable.
- 2026-11-20T12:05:00Z — [stage] Run 5: deleted U1's private vault copy `preprocessor/target/u1-baseline/` after the Rust coverage run, because the coverage measurement no longer needs it. This answers the open question recorded on 2026-11-20T02:53:00Z.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-20T02:53:00Z — [stage] Measured U2 NFR1.7 from U1's private 2026-11-16 copy of Areas/Notes in a scratch worktree rather than the real vault, so the real vault, content/ and site/dist were never touched; the copy is older than today's vault.
- 2026-11-20T12:05:00Z — [stage] Run 5 closed U1-CG-R04 and U2-AC3.4.1 by porting the checks into the HIG and Vitest suites instead of waiting for the sealed provider suite: the two gaps close in real engines and in Node, no review-subject file changes, and the 16-state record stays untouched.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-20T02:53:00Z — [stage] Should the private vault copy preprocessor/target/u1-baseline/ (≈ 87 MB) now be deleted, as U1's code summary asks after Build and Test re-measures? Left for the maintainer.
- 2026-11-20T02:53:00Z — [stage] Does the team rule "report coverage, enforce no minimum" override the feature scope's 80 % floor? It needs the maintainer's explicit decision; until then the floor stays Not Met.
- 2026-11-20T06:55:00Z — [stage] Run 2: four maintainer decisions are still open:
  - the coverage floor (53.82 %);
  - the `/` page-weight budget (255,387 B; U2 +18,159 B, U4 +36 B);
  - the NFR1.11 wording;
  - when the 16-state review is redone, which keeps `npm run test:e2e` closed.

  No code-generation loop-back can close them.
- 2026-11-20T09:46:00Z — [stage] Run 4: the five maintainer decisions are still open, with U1-NFR6.6 closed by loop-back 3:
  - the coverage floor (54.03 %);
  - the `/` page-weight budget (255,387 B; U2 +18,159 B, U4 +36 B);
  - the NFR1.11 wording;
  - when the 16-state review is redone, which keeps `npm run test:e2e` closed;
  - the U4 `nfr-design/performance-design.md` §1 wording ("Writing stays").

  The loop-back bound is exhausted (3/3) and no code-generation loop-back can close any of them.
- 2026-11-20T12:05:00Z — [stage] Run 5: the maintainer's decisions from the run 4 gate are all recorded in the artifacts and closed (coverage obligation, `/` budget, NFR1.11 wording, the U4 design text, F4). What stays open is not the maintainer's decision but their time and a later stage:
  - the 16-state manual accessibility review, redone once after the change settles (2–4 h), which keeps `npm run test:e2e` failing closed (digest `3d578e5b…`) and TEAM-E2E-A11Y Not Met;
  - the Jenkins Verify run over the merge commit on `develop` (ci-pipeline), which closes U1-NFR6.1 once the maintainer pushes;
  - 30 nightly production runs, which close U1-SLO-NIGHTLY and U1-SLO-PAGECOUNT (observability-setup).

  The loop-back bound stays exhausted (3/3), and run 5 was the maintainer's directed retry, so the stage stops at the approval gate with the failure verdict.
