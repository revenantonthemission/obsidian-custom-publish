<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-16T02:15:00Z — Folded the domain-design review fixes into unit responsibilities: PostLayout/HubLayout tag links belong to U3 via one tag-URL helper (R-01), folder-first classification and two-homepage error kept (R-03), site-page links render as plain text (R-04), no post-deploy check claimed (R-05), homepage reads the Profile Domain (R-06)
- 2026-11-16T02:15:00Z — U4's marker rule is a pure path function so U4 stays independent of U3 and both can run in parallel

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
