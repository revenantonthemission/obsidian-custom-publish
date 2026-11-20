<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-16T01:10:00Z — Kept the existing homepage-transclusion errors (PUB004–PUB006) after retiring the homepage note, so an embed of the now-unpublished note fails loudly instead of vanishing
- 2026-11-16T01:10:00Z — Settled the corners without asking: missing Areas/Pages succeeds with a notice, a page/post slug clash fails closed, posts without a date sit under "날짜 없음", and Writing is aria-current="page" on /writing but "true" on its sub-pages (rough-mockups R-07)
- 2026-11-16T01:10:00Z — The Areas/Notes project rule must be reworded to name Areas/Pages before the change ships; recorded as a constraint, not edited

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
