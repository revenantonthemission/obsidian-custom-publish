<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-16T02:00:00Z — Catalogued only added or changed components (brownfield); unchanged ones are referenced, not re-specified. Recorded the hubs-not-posts and KST week decisions as ADR-003/004 so the open requirements/story review findings have a design home
- 2026-11-16T02:00:00Z — NightlyPipeline calls PreprocessorCli but sits outside the code graph; left PreprocessorCli.dependents empty and noted it, which breaks strict depends_on/dependents symmetry on purpose

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
