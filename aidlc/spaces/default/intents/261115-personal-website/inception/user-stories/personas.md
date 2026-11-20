# Personas — Passion Project personal website, first release

Source: intent statement (audiences, Q2) and requirements (FR1–FR6, NFR7–NFR8). The owner persona was confirmed in user-stories Q2.

## P1 — Recruiter (Mina)

- **Role:** recruiter or hiring manager evaluating the owner.
- **Goals:** see who the owner is in seconds; reach the résumé and the portfolio; get a sense of the owner's depth.
- **Pain points:** today the homepage is a list of note links; the résumé and portfolio sit in the top bar beside Tags and Graph, with no introduction.
- **Context:** arrives from a job application link, usually on desktop, sometimes on a phone; reads Korean.
- **Tech comfort:** medium. **Frequency:** one or two visits.

## P2 — Engineer or reader (Junho)

- **Role:** software engineer or student who comes for the writing.
- **Goals:** browse all posts by date or topic; follow tags and the graph; keep old bookmarks working.
- **Pain points:** no single list of every post; topics only reachable through the homepage note's link lists.
- **Context:** arrives from search or a shared link, often deep inside a post; may use a keyboard or a screen reader.
- **Tech comfort:** high. **Frequency:** repeat visits.

## P3 — Friend or community member (Seoyeon)

- **Role:** friend, classmate or member of a community the owner belongs to.
- **Goals:** see what the owner wrote recently.
- **Pain points:** the current homepage only shows posts published today, so it is usually empty.
- **Context:** phone first, often from a messenger link.
- **Tech comfort:** medium. **Frequency:** occasional.

## P4 — Owner and author (the maintainer)

- **Role:** writes posts in `Areas/Notes` and site pages in `Areas/Pages` in Obsidian; the nightly run publishes them.
- **Goals:** keep site pages out of post lists; retire the homepage note without breaking the nightly publish; be told clearly when something in the vault would break the site.
- **Pain points:** the publishing step reads one folder and treats every note as a post; the homepage note is a hard requirement today.
- **Context:** writes on Mac and iPhone through iCloud; checks the site after the nightly deploy.
- **Tech comfort:** high. **Frequency:** daily.

## Relationships and Priority

| Priority | Persona | Why |
|----------|---------|-----|
| 1 | P1 Recruiter | The job search is the trigger (intent statement) |
| 2 | P2 Engineer or reader | The one confirmed visitor expectation is a list of all writing (market research Q2) |
| 3 | P4 Owner | Every page depends on the publishing rules being right |
| 4 | P3 Friend | Served by the same homepage list as P1 and P2 |
