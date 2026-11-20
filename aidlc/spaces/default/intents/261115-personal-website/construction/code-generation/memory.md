<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-16T05:30:00Z [unit u1-publish-boundary] — contract-summary C1/C2 updated on disk but not committed on the feature branch, because the whole intent record under aidlc/ is untracked; it goes in with the record.
- 2026-11-16T05:30:00Z [unit u1-publish-boundary] — the unit-scoped property command in unit-test-instructions.md finds no files; the working form needs vitest.pbt.config.ts with PBT_RUNS and PBT_SEED.

## Open questions
- 2026-11-16T05:30:00Z [unit u1-publish-boundary] — just crossunit exits 1 on the fixture's deliberate broken image before and after U1; confirm in Build and Test whether the recorded verification command ever passed end to end.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
