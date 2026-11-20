# Feasibility Assessment — Passion Project personal website

Upstream: `ideation/intent-capture/intent-statement.md`; `ideation/market-research/competitive-analysis.md`, `market-trends.md`, `build-vs-buy.md`.

## Verdict

**Feasible, with one high-risk decision.** Building the new pages onto the current site (Q1) is technically straightforward for the homepage, Writing, About, Now and Contact. The decision to move all project facts into the vault and retire the portfolio's own copy (Q3) is feasible but is the largest and riskiest part of the work, because those facts currently feed the approved résumé and its reviewed PDF.

## Build-or-Buy Decision

The owner decided to build on the current site (Q1), closing the open item from `build-vs-buy.md`. Every differentiator chosen in `competitive-analysis.md` (connected notes, strict HIG, Korean writing) already lives in the current site.

## Technical Viability by Capability

| Capability (intent statement) | Viability | Basis | Risk |
|-------------------------------|-----------|-------|------|
| Site-built landing homepage replacing the vault homepage note | High | The publishing step already singles out one note as the homepage; replacing it with a site-built page removes a special case rather than adding one | Low |
| Writing section with all posts by date and topic | High | Post dates, tags and hub topics are already produced for every post | Low |
| Tags and Graph under `/writing/...`, old addresses redirecting (Q7) | High | The local server already rewrites addresses; redirects are a small addition | Low |
| About and Now pages written in the vault | Medium | Needs a way to tell a site page from a post, and a vault location that is still undecided (Q2) | Medium |
| Contact and links with a plain `mailto:` link (Q6) | High | Static links only | Low |
| Projects showcase with detail pages, sourced from the vault (Q3) | Medium | The vault pipeline can carry project notes; replacing the approved portfolio facts is the hard part | High |
| Strict HIG and accessibility on every new page | High | Design tokens, components and an automated HIG/accessibility suite already exist; each new page needs its own checks added | Medium |

## Key Risks (summary; detail in `raid-log.md`)

1. **Project facts move (Q3).** The résumé, the role-based portfolio and the reviewed PDF résumé are built from approved facts in the website's files, with an approval record and identity checks. Moving the facts to the vault means rebuilding that approval flow, or narrowing the move. This should be decided precisely in Requirements Analysis.
2. **Vault location undecided (Q2).** Until settled, the About, Now and Projects notes cannot be published safely: the nightly run reads only `Areas/Notes`, and the project rules forbid widening it to the whole vault.
3. **Manual accessibility review (Q5).** It is redone once at the end; until then the profile end-to-end suite fails by design, so merges in between rely on the automated checks.

## Timeline

No deadline (Q4). Work can be split into several separately built pieces, each merged to `develop` on its own, which the team's working rules already expect.

## Assumptions & Open Questions

- [assumption] Viability ratings come from reading the current repository, not from a prototype.
- Open: where the About, Now and Projects notes live in the vault (Q2).
- Open: the exact extent of the project-facts move — whether the résumé and PDF résumé also read from the vault, or only the portfolio and showcase (Q3).
