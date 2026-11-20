# Delivery Planning Questions — first release

A **Bolt** is one build pass over a piece of the work that ends in something that runs and merges to `develop`. Settled, not asked: U1 goes first as the thin end-to-end slice (team Walking Skeleton); everything is built by the AI developer and reviewed by you (solo project); the only outside hold-ups are your own actions (rewording the `Areas/Notes` rule, restarting the server once, the manual accessibility review).

## Q1. [Product owner] After U1, in what order should the rest be built?

The units are U2 Writing, U3 Tags/Graph move with redirects, U4 Writing-only navigation. U3 and U4 both need U2.

A. U2, then U4, then U3 — one at a time. Recommended: U3's own "no old /tags or /graph links" check only passes once U4 has removed those menu items (units review R-01)
B. U2, then U3, then U4 — one at a time
C. U2, then U3 and U4 at the same time
X. Other (please specify)

[Answer]: A

## Q2. [Product owner] How big is one Bolt?

A. One unit per Bolt: four Bolts, each merged to `develop` on its own branch
B. U1 alone, then U2–U4 together as one Bolt
X. Other (please specify)

[Answer]: A

## Q3. [Product owner] What worries you most, so we tackle it early?

A. The publishing change (U1): a mistake there can drop or leak notes in the nightly publish
B. Old links breaking (U3)
C. The look and feel matching Apple's HIG (U2–U4)
D. Nothing in particular
X. Other (please specify)

[Answer]: B

## Consolidated Summary Confirmation

- Order: U1 (thin end-to-end slice), then U2, then U4, then U3, one at a time (Q1)
- Because the build order follows the unit dependency list, not this plan, the units file gains one edge — U3 depends on U4 — so the order above is what actually runs; U3 and U4 are no longer listed as parallel (follows from Q1; fixes units review R-01)
- One unit per Bolt: four Bolts, each merged to `develop` on its own branch (Q2)
- Main worry: old links breaking (U3) — U3's plan puts the redirect table, the server change, the restart before the next nightly, and a post-restart 301 check first (Q3)
- Settled: all Bolts built by the AI developer and reviewed by the owner; outside hold-ups are the owner's rule rewording (before U1 merges), one server restart (U3) and the final manual accessibility review

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
