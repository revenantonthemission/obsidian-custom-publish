# Requirements Analysis Questions — Passion Project personal website, first release

This round covers only the approved first release (initiative brief): B1 site pages from the vault, B2 Writing, B3 the new homepage, B4 Tags and Graph under `/writing/...`. These questions settle what earlier stages left open and what the reviews flagged.

## Q1. [Product owner] What is the vault folder for site pages called, and where does it sit?

It sits outside `Areas/Notes` (your decision). The nightly run will read `Areas/Notes` plus exactly this folder, never the rest of the vault. In this first release it holds nothing the site shows yet (About and Now come later), so this mainly fixes the boundary.

A. `Areas/Site` (a sibling of `Areas/Notes`)
B. `Areas/Pages`
C. A top-level vault folder, `Site`
X. Other (please specify)

[Answer]: B

## Q2. [Product owner] What happens to the current homepage note, "Passion Project.md", once the site builds its own homepage?

Today the publishing step requires exactly one note marked as the homepage and stops with an error otherwise.

A. It stays in your vault but is no longer published at all; the "exactly one homepage" requirement is removed
B. It becomes an ordinary published post
C. You delete it from the vault yourself; the requirement is removed
X. Other (please specify)

[Answer]: A

## Q3. [Product owner] Which items does the top bar show in the first release, before Projects, About and Now exist?

Your final top bar is Writing, Projects, About, Now. The review found that if Résumé and Portfolio leave the bar now, nothing in the first release links to the portfolio.

A. Writing, Résumé, Portfolio (Résumé and Portfolio leave once About exists)
B. Writing only; the homepage opening carries Résumé and Portfolio buttons
C. Writing, Résumé, Portfolio, and also Résumé and Portfolio buttons on the homepage
X. Other (please specify)

[Answer]: B

## Q4. [Product owner] Where does the homepage's name and one-line introduction come from in this release?

The approved profile facts already hold your name, headline and a short introduction (the homepage profile card shows them today).

A. The approved profile facts: name, headline and short introduction, as today
B. The approved profile facts: name and short introduction only, without the headline
C. Text written in the site-pages vault folder
X. Other (please specify)

[Answer]: B

## Q5. [Product owner] What exactly counts as "the last 7 days" for the homepage's recent posts?

The site is rebuilt every night, so the window is fixed at build time.

A. Posts whose published date falls within the 7 calendar days ending on the build date, in Korean time (today and the 6 days before)
B. The current week, Monday to Sunday, in Korean time
X. Other (please specify)

[Answer]: B

## Q6. [Product owner] On the Writing page, how many recent posts does the short list show, and where does the full list by date live?

A. The 5 newest posts; the full list is its own page at `/writing/all`
B. The 10 newest posts; the full list is its own page at `/writing/all`
C. The 5 newest posts; the full list is further down the same `/writing` page
X. Other (please specify)

[Answer]: A

## Q7. [Developer] How should the old addresses `/tags`, `/tags/<tag>` and `/graph` lead to their new places?

The site has no redirects today. The local server can answer with a permanent redirect, which search engines and bookmarks follow; a static page can only send the browser on after it loads.

A. Permanent (301) redirects from the server, for `/tags`, every `/tags/<tag>` and `/graph`
B. Static pages at the old addresses that send the browser on, with a link for when JavaScript or refresh is off
X. Other (please specify)

[Answer]: A

## Q8. [Product owner] Should the job-search goal get a pass/fail measure?

The review noted that your main reason for the work has no success check.

A. Yes: from the homepage, the résumé and the portfolio are each reachable in 1 click
B. Yes: from the homepage, the résumé is reachable in 1 click and the portfolio in at most 2
C. No: leave it unmeasured on purpose
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Site-pages folder: `Areas/Pages`, outside `Areas/Notes`; the nightly run reads `Areas/Notes` plus exactly this folder, never the rest of the vault (Q1)
- Current homepage note "Passion Project.md": stays in the vault but is no longer published; the "exactly one homepage" requirement is removed (Q2)
- First-release top bar: Writing only; the homepage opening carries Résumé and Portfolio buttons (Q3)
- Homepage opening text: the owner's name and short introduction from the approved profile facts, without the headline (Q4)
- Homepage recent posts: posts published in the current week, Monday to Sunday, in Korean time (Q5)
- Writing page: the 5 newest posts, then topics; the full list by date is its own page at `/writing/all` (Q6)
- Old addresses `/tags`, every `/tags/<tag>` and `/graph`: permanent (301) redirects from the server to their `/writing/...` places (Q7)
- Job-search measure: from the homepage, the résumé and the portfolio are each reachable in 1 click (Q8)

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
