<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-20T00:21:15Z — Recorded that hotfixes also land on develop, so Construction hotfix work branches from and merges back into develop, never main; nothing builds or deploys from main, and the workflow's default would otherwise send hotfix work to main.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-20T00:21:15Z — Condensed the draft's twenty open interview points into ten questions, bundling nine smaller points into one accept-or-review question; Standard depth aims for five to eight questions, and the smaller points each had a clear evidence-backed suggestion.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-20T00:21:15Z — Kept the hard-rule candidates the maintainer did not confirm (ES5 inline scripts, shared LazyLock regexes, npm rather than bun, Jenkins on port 8081) as ordinary practice wording instead of deleting them; they stay visible as conventions without becoming absolute rules.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-10-20T00:21:15Z — .aidlc/worktrees/ is not gitignored, which clashes with the new rule never to commit nested worktree checkouts; add an ignore entry before Construction creates one.
- 2026-10-20T00:21:15Z — Adding Prettier after the redesign would reformat files under the 16-state accessibility review and void the one-time review; land Prettier before that review, or accept a second review?
- 2026-10-20T00:21:15Z — The post-deploy HTTP 200 check has no runner yet; it needs a Jenkinsfile step, which this plan does not cover.
- 2026-10-20T00:21:15Z — Should the redesign be proven on one representative post page (tokens, layout, both themes) before the other pages are restyled? The interview did not ask it.
