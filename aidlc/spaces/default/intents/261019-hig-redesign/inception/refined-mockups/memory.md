<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-20T01:03:34Z — Met the requirement for an explicit touch preview affordance with the browser's native press-and-hold link preview instead of custom UI; a tap now navigates in one step, and the choice is flagged for the maintainer at the gate.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-20T01:03:34Z — Closed three requirement findings the maintainer had accepted as risks (legacy appearance storage, worst-case contrast on glass, touch-target classes) inside the design artifacts; left open they would have made parts of the build unverifiable.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-20T01:03:34Z — Limited the translucent bar material to primary text and added a near-opaque material for panels that carry secondary text; worst-case contrast math showed secondary and tinted text fall below 4.5:1 on a fully translucent surface over dark content.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-10-20T01:03:34Z — Mermaid and D2 diagrams keep their renderer themes, so their palettes will not match the new tokens; worth a later preprocessor change?
- 2026-10-20T01:03:34Z — The graph's list view is the guaranteed keyboard path; should graph nodes themselves become focusable later?
