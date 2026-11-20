# Feasibility Questions — Passion Project personal website

Known from the repository and the team rules, so not asked: the site is self-hosted on the owner's machine (no AWS since 2026-08), built nightly from `develop`, publishes only the vault folder `Areas/Notes`, already follows Apple HIG through its own design tokens, and has automated HIG and accessibility checks plus a manual 16-state accessibility review.

## Q1. [Architect] Build or buy: what do you decide?

Market Research left this open and recommended building on the current site, because the connected notes, the HIG design and the vault publishing already live there.

A. Build the new pages onto the current site
B. Move to a hosted site builder or publishing service
C. Adapt an open-source personal-site template onto the current site
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. [Architect] Where in the vault should the About, Now and Projects notes live?

The nightly publish reads only `Areas/Notes`, and the project rules forbid pointing it at the whole vault. The pages also must not show up as posts in the Writing list.

A. Inside `Areas/Notes`, in their own subfolder, marked as site pages rather than posts
B. In a new vault folder outside `Areas/Notes`, which widens what the nightly run reads
C. Not yet defined
X. Other (please specify)

[Answer]: C

## Q3. [Product owner] What is the single source for project facts?

The résumé and role-based portfolio already hold approved project facts in the website's own files. The new Projects showcase is written in the vault.

A. Keep both: the portfolio facts stay as they are; the vault holds separate project write-ups for the showcase
B. The showcase reuses the approved portfolio facts; the vault adds only the longer write-up for each project
C. Move all project facts into the vault and retire the portfolio's own copy
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q4. [Product owner] Is there a deadline?

A. No deadline
B. Yes, a target date (please give it)
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q5. [Developer] When do you redo the manual 16-state accessibility review?

The new pages change files under that review (the header, navigation and base layout), so the review record becomes invalid and `npm run test:e2e` fails until you redo it.

A. Once, after all the new pages are done
B. Once after the first page ships, and again at the end
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q6. [Developer] How should your email address appear on the site?

Contact and links includes email; an address in plain page text is easy for spam scrapers to collect.

A. A plain `mailto:` link
B. Shown in a way that is harder for scrapers to read
C. No email; only GitHub, LinkedIn and RSS
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q7. [Developer] What happens to the current Tags and Graph addresses (`/tags`, `/graph`)?

The request moves Tags and Graph under the Writing section. Links to the old addresses may exist elsewhere.

A. Move them under `/writing/...` and keep the old addresses working by redirecting them
B. Move them and let the old addresses stop working
C. Keep the current addresses; group them under Writing only in the navigation
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Build or buy: build the new pages onto the current site (Q1)
- Vault location of About, Now and Projects notes: not yet defined (Q2)
- Project facts: move all project facts into the vault and retire the portfolio's own copy in the website's files (Q3)
- Deadline: none (Q4)
- Manual 16-state accessibility review: redone once, after all the new pages are done (Q5)
- Email: a plain `mailto:` link (Q6)
- `/tags` and `/graph`: move under `/writing/...` and redirect the old addresses (Q7)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
