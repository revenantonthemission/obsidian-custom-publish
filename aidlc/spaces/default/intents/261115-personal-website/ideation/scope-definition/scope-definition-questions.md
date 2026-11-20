# Scope Definition Questions — Passion Project personal website

The capabilities in play (intent statement, feasibility): a site-built homepage; a Writing section with Tags and Graph moved under `/writing/...` and the old addresses redirected; About; Contact and links; a Projects showcase with detail pages, with all project facts moved into the vault; and a Now page. No deadline (feasibility Q4).

## Q1. [Product owner] Which capabilities must be in the first release? (select all that apply)

Everything not picked here is still in scope, just later.

A. The Writing section (all posts by date and topic, with Tags and Graph under it)
B. The new site-built homepage
C. About, and Contact and links
D. The Projects showcase, with project facts moved into the vault
E. The Now page
X. Other (please specify)

[Answer]: A, B

## Q2. [Product owner] What could slip to a later release if it turns out larger than expected? (select all that apply)

A. The Now page
B. The Projects showcase and the project-facts move
C. Moving Tags and Graph under `/writing/...` with redirects
D. None: everything is a must for this work
X. Other (please specify)

[Answer]: C

## Q3. [Product owner] In what order should the work be built?

A. Value first: the pages visitors see most (Writing, homepage) before the rest
B. Risk first: the project-facts move first, because it touches the approved résumé and portfolio
C. Dependency first: settle how site pages are marked in the vault first, then build the pages that use it
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q4. [Product owner] How far does the project-facts move go?

In Feasibility you chose to move all project facts into the vault and retire the portfolio's own copy. Those facts also feed the approved résumé and the reviewed PDF résumé.

A. Portfolio and Projects showcase only; the résumé and PDF résumé keep their current approved source
B. Everything, including the résumé and the PDF résumé
C. Not yet defined
X. Other (please specify)

[Answer]: B

## Q5. [Architect] Where do the About, Now and Projects notes live in the vault?

In Feasibility you left this undecided. The nightly run publishes only `Areas/Notes`, and the scope boundary depends on whether that changes.

A. Inside `Areas/Notes`, in their own subfolder, marked as site pages (the publish boundary stays as it is)
B. Outside `Areas/Notes` (the publish boundary is widened, and the project rule changes)
C. Still undecided; settle it in Requirements Analysis
X. Other (please specify)

[Answer]: B

## Consolidated Summary Confirmation

- First release must include: the Writing section (all posts by date and topic, with Tags and Graph under it) and the new site-built homepage (Q1)
- Still in scope, after the first release: About, Contact and links, the Projects showcase with the project-facts move, and the Now page (Q1)
- May slip if it grows: moving Tags and Graph under `/writing/...` with redirects (Q2)
- Build order: dependency first; settle how site pages are marked in the vault before building the pages that use it (Q3)
- Project-facts move: everything, including the résumé and the reviewed PDF résumé, moves to a vault source (Q4)
- Vault location: the About, Now and Projects notes live outside `Areas/Notes`; the publish boundary is widened and the project rule "VAULT_PATH must point at `Areas/Notes`, the only published folder" has to change (Q5)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
