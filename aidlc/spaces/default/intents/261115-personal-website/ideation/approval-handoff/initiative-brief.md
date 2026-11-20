# Initiative Brief — Passion Project personal website

Upstream: `ideation/intent-capture/intent-statement.md`, `stakeholder-map.md`; `ideation/market-research/competitive-analysis.md`; `ideation/feasibility/feasibility-assessment.md`, `constraint-register.md`; `ideation/scope-definition/scope-document.md`, `intent-backlog.md`; `ideation/rough-mockups/wireframes.md`.

## Intent and Problem

Turn the Passion Project blog into a personal website. Visitors cannot quickly tell who the owner is, the writing has no single list of all posts, projects only show through the role-based portfolio, and the homepage is a vault note made of link lists (intent statement). The trigger is a job search (intent statement).

## Market Validation

Compared with software-engineer personal sites in general (hypotheses, no survey). The one confirmed visitor expectation is a single list of all writing, which the site lacks today. Differentiators: connected notes (Graph, hubs, backlinks), a strict Apple HIG look, and deep Korean CS writing (competitive analysis).

## Feasibility and Risk Highlights

Feasible; build on the current self-built site (feasibility assessment). Top risks:

| Risk | Status for this round |
|------|----------------------|
| Moving all project facts, including the résumé and reviewed PDF résumé, into the vault | Outside this round (later backlog item B7) |
| Site-pages folder outside `Areas/Notes` needs the owner's project rule reworded | In this round (B1) |
| Site pages leaking into the Writing list | In this round (B1, B2) |
| Accepted review findings: no job-search measure, no first-release portfolio link, no address for the full date list | Accepted; settled in Requirements Analysis (Q1) |

## Scope Boundary

**Approved for detailed requirements and design now (Q3):**

| ID | Item |
|----|------|
| B1 | Site pages from the vault: a named folder outside `Areas/Notes`, published with it, never the whole vault; its notes kept out of post lists |
| B2 | Writing section: recent posts and topics on one page, plus a full list of every post by date |
| B3 | Site-built homepage: "Passion Project" Large Title, owner name and introduction, posts from the last 7 days |
| B4 | Tags and Graph under `/writing/...` with redirects (may slip) |

**Kept in the backlog, planned later (Q3):** About (B5), Contact and links (B6), project facts from the vault (B7), Projects showcase (B8), Now (B9), homepage additions (B10).

**Out of scope:** an English translation; a hosted builder or template; publishing the whole vault (scope document).

## Concept Visuals

Low-fidelity wireframes for the top bar, homepage and Writing, and outlines of the later pages, are in `ideation/rough-mockups/wireframes.md`. The owner considers them mostly right; details change in Refined Mockups (Q2).

## Team Plan

One maintainer decides scope, writes the content and reviews everything; the AI-DLC agents do the analysis, design and code (stakeholder map). Team Formation was skipped as a solo project. Work merges to `develop` one phase at a time; test-first; the manual accessibility review is redone once at the end (constraint register).

## Recommendation

**Go — for the first release only** (Q3). Proceed to Inception for B1–B4. Revisit B5–B10 as a later round once the first release ships.

## Assumptions & Open Questions

- Open: the name and vault path of the site-pages folder (scope document).
- Open: the exact Korean headings and empty-state wording (wireframes).
- [assumption] The homepage opening uses the approved profile facts for the owner's name and introduction until an About note exists.
