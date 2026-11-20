# Build vs. Buy — Passion Project personal website

Upstream: `ideation/intent-capture/intent-statement.md`.

**Decision status: open.** The owner has not decided yet (Q4). This document compares the options so the decision can be taken at a later stage; it recommends but does not decide.

## Current Situation

- The site already runs on a self-built pipeline: notes are written in the Obsidian vault and published nightly to the owner's own machine (intent statement Q5; repository `CLAUDE.md`).
- That pipeline was built to replace a hosted notes-publishing service (repository `CLAUDE.md`: "Obsidian Publish replacement").
- The site already follows Apple's HIG through its own design tokens and has automated HIG and accessibility checks (repository `CLAUDE.md`).

## Options

| Option | What it means |
|--------|---------------|
| A. Build on the current pipeline | Add the new pages to the existing self-built site |
| B. Buy a hosted site builder or publishing service | Move the personal website (and possibly the writing) to a hosted product |
| C. Adapt an open-source personal-site template | Bring in a ready-made layout and fit it onto the current pipeline |

## Assessment

Scores run from -2 (strongly favours buy/adopt) to +2 (strongly favours build).

| Factor | A. Build | B. Hosted service | C. Template | Score (build) |
|--------|----------|-------------------|-------------|---------------|
| Core differentiator? Connected notes and strict HIG (Q3) | Kept as is | Likely lost or limited (hypothesis) | Template design would have to be reworked to HIG | +2 |
| Writing in the vault, published nightly (Q5) | Already works | Would need a new import path (hypothesis) | Already works | +2 |
| Time to first release | New pages only | Migration of all content first | Fitting and restyling the template | +1 |
| Cost | No new subscription | Recurring fee (hypothesis) | None | +1 |
| Maintenance | Owner maintains everything | Vendor maintains the platform | Owner maintains the template too | -1 |
| Existing tests and accessibility checks | Extend the current suites | Not portable | Extend, after restyling | +2 |

## Recommendation (for the owner's decision)

Option A, building on the current pipeline, scores highest: every differentiator the owner chose (Q3) already lives in the current site, and the vault-based writing flow (Q5) already works. The trade-off is that the owner keeps all maintenance.

## Assumptions & Open Questions

- [assumption] Hosted builders cannot reproduce the Graph, hubs and backlinks without custom work; not verified against any specific product.
- Open: build vs. buy is still the owner's decision (Q4). It should be settled before requirements analysis fixes how the new pages are produced.
