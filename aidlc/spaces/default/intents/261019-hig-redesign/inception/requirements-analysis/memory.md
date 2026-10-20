<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-20T00:34:20Z — Read Liquid Glass on the web as a backdrop blur and saturation over a tinted translucent fill with an edge highlight, without refraction or lensing; CSS cannot reproduce the native material's lensing faithfully, so the requirement names the reproducible parts and records the rest as an assumption.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-20T00:34:20Z — Inspected the unmerged scaffolding branch's changed files before writing requirements and asked a follow-up after the maintainer chose to merge it whole; the merge would have reintroduced an outdated AI-DLC rules tree, stale AWS-era docs, ignored generated JSON and a lockfile change, and the maintainer then chose the Mermaid fix only.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-20T00:34:20Z — Set a 30 KiB gzip CSS budget per blog route (excluding KaTeX) from the maintainer's global web performance rules instead of leaving blog CSS unbounded; translucent materials add CSS weight, and profile routes keep their existing 24 KiB gate.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-10-20T00:34:20Z — How does a three-way appearance control fit the asset budget's rule against new client JavaScript reachable from profile routes?
- 2026-10-20T00:34:20Z — Should KaTeX be self-hosted, or stay on its CDN with an integrity hash?
