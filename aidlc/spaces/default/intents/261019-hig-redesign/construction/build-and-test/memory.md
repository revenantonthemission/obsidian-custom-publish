<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-20T11:08:39Z — Built the target inventory from the plan's Testing Contract and the NFRs in requirements.md, because this scope ran no NFR Requirements or NFR Design stage; without them the inventory would hold no performance or accessibility target at all.
- 2026-10-20T11:08:39Z — Ran the HIG browser suite once as the full configuration instead of once per spec file; the full run executes every scoped browser command in the test instructions exactly once and matches the counts Code Generation recorded.
- 2026-10-20T14:41:00Z — Graded NFR1-b on a highlighted link that no fixture note renders; a link inside a highlight in a callout, a table or the homepage note is ordinary note content, so the state was set up on the page and measured in three engines, as the repair's own browser checks do.
- 2026-10-20T14:41:00Z — Counted the Reds recorded by setting an implementation aside (Step 31, Steps 48–49) as meeting TC-9; each test was seen failing without its behaviour and passing with it, the practice the maintainer kept as a project learning, and the matrix discloses the commit order.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-20T11:08:39Z — Generated performance and security test instructions although the Standard strategy asks only for integration instructions; NFR2 and NFR4 set measurable targets that would otherwise have had no instructions or evidence.
- 2026-10-20T11:08:39Z — Measured Core Web Vitals and INP with a scratch Playwright script under Lighthouse's mobile network and CPU throttling instead of Lighthouse itself, which is not installed; the script reproduces the throttling, not Lighthouse's scoring.
- 2026-10-20T11:17:56Z — Loop-back 1 to Code Generation on the maintainer's Retry with fix; six failed targets (diagram LCP, two contrast pairs, the clipping-blind overflow check, missing Red and regression tests) trace to generated code and tests, while the fixture's broken link, the manual review, coverage tooling and dependency advisories stay open.
- 2026-10-20T14:41:00Z — Ran two scratch checks the instructions did not list, the open dialogs and sheets (IT-8) and the highlighted-link pairs; grading NFR1-b and NFR1-e on the suite alone would have repeated the blind spots of review findings R-17 and R-18. IT-8 is now in the integration instructions.
- 2026-10-20T14:41:00Z — Recomputed the CSS budget figures from the built HTML with the specs' own method; the budget tests assert the limits but print no figure to compare with Step 31.
- 2026-10-20T15:52:08Z — Rewrote the PT-3 and CSS budget scripts with run 2's settings, because the session's scratch folder was cleared and the originals were lost; the open-state and highlighted-link checks needed no rewrite, since loop-back 2 moved them into the HIG suite.
- 2026-10-20T14:43:01Z — Loop-back 2 to Code Generation on the maintainer's Retry with fix; two failed targets trace to generated styles (a link inside a highlight under 4.5:1 off the page ground and in the dark homepage note; the search snippet clipped to one line), while the fixture's broken link, the manual review, coverage tooling and dependency advisories stay open.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-20T11:08:39Z — Graded the targets that Code Generation review findings bear on as Not Met even though those findings were accepted as risks at the last approval; accepting a risk does not make a target met, and the approval step should show the gap.
- 2026-10-20T14:41:00Z — Graded NFR1-e Not Met although the one-line, ellipsis-ended search snippet predates the work and the refined mockup draws it; NFR1 says 200% text loses no content, AC4.1 says no content is clipped, and the repair's own overflow rule reports it, the rule that fixed the post-row summary for the same reason.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-10-20T11:08:39Z — Should `just crossunit` run against a real-content build before UI merges? On the fixture vault it always fails on the deliberately broken image link, so it can never pass where the other checks run.
- 2026-10-20T11:08:39Z — Should the site add a coverage provider so the team's "report coverage" practice yields a number? It means a dev dependency in site/package.json, which the accessibility review covers.
- 2026-10-20T14:41:00Z — Should search snippets wrap to two lines, or does the mockup's one-line excerpt stand? The answer decides whether NFR1-e is fixed in search.css or stays an accepted failure.
