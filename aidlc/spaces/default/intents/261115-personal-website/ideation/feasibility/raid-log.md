# RAID Log — Passion Project personal website

Upstream: `ideation/intent-capture/intent-statement.md`; `ideation/market-research/competitive-analysis.md`, `build-vs-buy.md`.

## Risks

| ID | Risk | Likelihood | Impact | Mitigation | Source |
|----|------|------------|--------|------------|--------|
| R1 | Moving all project facts into the vault breaks the approved résumé, the role-based portfolio or the reviewed PDF résumé, which today rely on approved facts in the website's files | High | High | Define the exact extent of the move in Requirements Analysis; keep the existing approval and identity checks green until the vault source replaces them | Q3 |
| R2 | About, Now or project notes appear in the Writing list as if they were posts, breaking "every published post is reachable from Writing" | Medium | Medium | Give site pages a distinct marking and test that Writing lists posts only | Q2; intent statement |
| R3 | The vault location is chosen outside `Areas/Notes` and the nightly run is widened beyond the published folder | Low | High | Treat the project rule as fixed; settle the location (Q2) inside the published boundary unless the owner changes the rule | Q2; project rules |
| R4 | Old `/tags` and `/graph` links break after the move | Low | Medium | Redirects plus a link-sweep check | Q7 |
| R5 | Merges before the final manual accessibility review leave `npm run test:e2e` failing for a long stretch | High | Low | Expected by decision; automated HIG checks keep running on every merge | Q5 |
| R6 | A plain email link attracts spam | Medium | Low | Accepted by the owner | Q6 |

## Assumptions

| ID | Assumption | Owner | Status |
|----|------------|-------|--------|
| A1 | The existing HIG design tokens and components are enough for the new pages, with additions rather than a redesign | Maintainer | Unvalidated |
| A2 | Hosting, nightly build and tunnel setup need no change for the new pages | Maintainer | Unvalidated |
| A3 | The owner will write the About, Now and project notes before the matching pages ship | Maintainer | Unvalidated |

## Issues

| ID | Issue | Source |
|----|-------|--------|
| I1 | The vault location of About, Now and Projects notes is undecided | Q2 |

## Dependencies

| ID | Dependency | Source |
|----|------------|--------|
| D1 | The owner's vault notes (About, Now, projects) for real content | Intent statement (Q5) |
| D2 | The nightly Jenkins run on the owner's machine to publish vault changes | Team rules (Deployment) |
| D3 | The owner's manual 16-state accessibility review at the end | Q5 |
