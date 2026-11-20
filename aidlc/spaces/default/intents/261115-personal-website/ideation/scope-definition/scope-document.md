# Scope Document — Passion Project personal website

Upstream: `ideation/intent-capture/intent-statement.md`; `ideation/feasibility/feasibility-assessment.md`, `constraint-register.md`.

## Scope Statement

Turn the Passion Project blog into a personal website, built on the current self-built site (feasibility Q1). The first release delivers the Writing section and a new site-built homepage (Q1). The rest of the requested capabilities — About, Contact and links, the Projects showcase with the project-facts move, and the Now page — stay in scope for this work and ship in later releases (Q1).

## In Scope

| Capability | Release | Source |
|------------|---------|--------|
| Site-page marking in the vault: a named vault folder outside `Areas/Notes` for site pages, published alongside `Areas/Notes`, never the whole vault | Foundation (built first) | Q3, Q5 |
| Writing section: all posts by date and by topic | First release | Q1; intent statement |
| Tags and Graph moved under `/writing/...` with the old `/tags` and `/graph` redirecting | First release, may slip | Q1, Q2; constraint C-T6 |
| Site-built homepage replacing the vault homepage note | First release | Q1; intent statement |
| About page, written in the vault | Later release | Q1; intent statement |
| Contact and links: plain `mailto:` email, GitHub, LinkedIn, RSS | Later release | Q1; constraint C-T7 |
| Projects showcase with detail pages, written in the vault | Later release | Q1; intent statement |
| Project-facts move: the portfolio, the résumé and the reviewed PDF résumé all read their project facts from the vault | Later release | Q4; feasibility Q3 |
| Now page, written in the vault | Later release | Q1; intent statement |
| HIG and accessibility checks for every new page | Every release | Intent statement; constraint C-O3 |

## Out of Scope

| Item | Source |
|------|--------|
| An English translation | Intent statement (Q9) |
| A hosted site builder or template | Feasibility Q1 |
| Publishing the whole vault | Q5 (only one named folder is added); project rules |

## Boundary Change to the Project Rules

Placing site pages outside `Areas/Notes` (Q5) conflicts with the affirmed project rule "NEVER run the preprocessor against the whole vault. `VAULT_PATH` must point at `Areas/Notes`, the only published folder." The owner confirmed the scope with this change: the publish boundary becomes `Areas/Notes` plus one named site-pages folder, and the rule's wording is updated by the owner once that folder is named. Until then the rule stands, and nothing reads outside `Areas/Notes`.

## Minimum Viable Scope

The first release is the minimum: the site-page marking it depends on, the Writing section and the new homepage (Q1, Q3). It fixes the one visitor expectation Market Research confirmed (a single list of all writing) and the "homepage made of link lists" problem (intent statement).

## Sequencing

Dependency first (Q3): settle how site pages are marked and published from the vault, then build the pages that use it. No deadline applies (feasibility Q4).

## Assumptions & Open Questions

- Open: the name and vault path of the site-pages folder (Q5).
- Open: how the approved résumé facts and the reviewed PDF résumé keep their approval and identity checks once their source moves to the vault (Q4; feasibility risk R1).
- [assumption] The homepage can show "featured projects" and "current work" only once Projects and Now exist; the first-release homepage shows what exists at that point.
