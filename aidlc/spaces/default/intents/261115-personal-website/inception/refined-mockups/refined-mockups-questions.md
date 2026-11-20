# Refined Mockups Questions — first release

Known and not asked: the new pages reuse the site's existing HIG design system — Large Title page headers, inset grouped lists of one-link rows with a chevron, tag chips, capsule buttons, the floating glass top bar, the `--c-` colour tokens — and are checked at 320/768/1024/1440 px, light and dark, WCAG 2.2 AA (requirements NFR1).

## Q1. [Designer] How much does each post row show on `/writing` and `/writing/all`?

The homepage's current post rows show title, a two-line summary, date and reading time (about 60 px tall).

A. `/writing` uses the full rows (title, summary, date, reading time); `/writing/all` uses compact rows (title and date only), because it lists every post
B. Full rows on both pages
C. Compact rows on both pages
X. Other (please specify)

[Answer]: A

## Q2. [Product owner] Do topic hubs count as posts in the post lists?

Hubs are notes that collect other posts, shown at `/hubs/<slug>`. Today the homepage leaves them out of its post list. They already appear under "주제" on `/writing`.

A. No: hubs appear only as topics; the weekly list, "최근 글" and `/writing/all` show ordinary posts only
B. Yes: hubs also appear in the post lists, linking to their hub page
X. Other (please specify)

[Answer]: A

## Q3. [Designer] On the homepage, which of the two buttons is the prominent one?

HIG gives each view one prominent action; the other is a plain capsule.

A. "Résumé" is filled (tint), "Portfolio" is plain
B. "Portfolio" is filled, "Résumé" is plain
C. Both plain, equal weight
X. Other (please specify)

[Answer]: C

## Q4. [Product owner] What happens to a link in a post that points to the retired homepage note "Passion Project.md"?

Today posts may link to it and the link goes to `/`. Once the note is no longer published, the link needs an outcome.

A. It keeps going to `/`, the new homepage
B. It is shown as plain text, not a link
C. The nightly run stops with an error naming the post, so you fix the link
X. Other (please specify)

[Answer]: A

## Q5. [Designer] On `/writing/all`, how should the year headings behave while scrolling a long list?

A. Plain section headings (h2) that scroll away with the list
B. Headings that stick under the top bar while their year is on screen
X. Other (please specify)

[Answer]: B

## Consolidated Summary Confirmation

- Post rows: full rows (title, summary, date, reading time) on `/writing`; compact rows (title and date) on `/writing/all` (Q1)
- Topic hubs appear only as topics; the homepage weekly list, "최근 글" and `/writing/all` show ordinary posts only (Q2)
- Homepage buttons "Résumé" and "Portfolio" are both plain capsules of equal weight (Q3)
- A post's link to the retired homepage note keeps going to `/`, the new homepage (Q4)
- On `/writing/all`, year headings stick under the top bar while their year is on screen (Q5)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
