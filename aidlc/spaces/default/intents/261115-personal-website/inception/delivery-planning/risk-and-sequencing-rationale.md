# Risk and Sequencing Rationale — first release

A **Bolt** is one build pass over one unit, ending in something that runs. The **walking skeleton** is the thinnest version that runs end to end, built first to prove the pieces connect.

## Heuristic

Walking-skeleton first (Cockburn), then dependency order, with the owner's main worry front-loaded inside its Bolt. No formal scoring model (such as WSJF, which ranks work by value and urgency against size) was used: with four small units in a strict chain, the dependencies decide the order.

## Order and Why

1. **U1 first** — the team practice requires the first unit to be the thin end-to-end slice. U1 is also the riskiest change to the nightly publish (it alters what gets published), so it is better proven before pages build on it.
2. **U2 second** — both remaining units link to `/writing`, which U2 creates.
3. **U4 before U3** — U3's own check that no rendered link points to `/tags` or `/graph` can only pass once U4 has removed those menu items; U3 then checks the Writing marker on the pages it moves. This deviates from the earlier "U3 and U4 in parallel" topology; the units file now records U3 depends on U4 (delivery-planning Q1; units review R-01).
4. **U3 last, with redirects first inside it** — the owner's main worry is old links breaking (Q3). U3's Definition of Done orders the redirect table and server tests before the page moves, and includes the restart and a 301 check before the next nightly deploy.

## Risks Carried Into Construction

| Risk | Bolt | Mitigation |
|------|------|------------|
| Nightly publish drops or leaks notes | 1 | Fixture cases for every classification; existing suites green; owner reviews the skeleton before Bolt 2 |
| Weekly list off by a day at KST midnight | 2 | Boundary test at 2026-11-15T15:30Z |
| Old links break between merge and restart | 4 | Restart before the next nightly; `curl -I` 301 check |
| Open contract gaps from the contract review (fixture folder layout, attachment lookup outside the two folders, how the redirect file is produced) | 1, 4 | Settled in each unit's Functional Design before code |
| Manual accessibility record invalid for the whole release | 3 | Expected; owner redoes it once at the end |
