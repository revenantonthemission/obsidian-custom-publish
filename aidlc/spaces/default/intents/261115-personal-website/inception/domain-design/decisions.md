# Architecture Decision Records — Domain Design, first release

## ADR-001: One scan, one catalog classifies posts, site pages and the retired homepage note

- **Context** — The publishing step must read `Areas/Pages` as well as `Areas/Notes` (requirements FR1.1), keep site pages out of every list (FR1.2), stop on page/post slug clashes (FR1.6), stop requiring a homepage (FR2.1) and keep the retired note private (FR2.2), while links to that note go to `/` (mockups Q4). Today one scan feeds one catalog that splits "homepage" from "posts".
- **Decision** — Scan both folders in one pass; each scanned note records its source folder. The publication catalog classifies every note as Post, SitePage or RetiredHomepage and exposes a full view (link resolution) and a posts-only view (lists and indexes) (domain-design Q1).
- **Consequences** — Positive: one classification point; slug clashes found in one check; link resolution unchanged in shape; the existing posts-only discipline extends naturally. Negative: the scanner and catalog both change, and the catalog's homepage tests must be rewritten. Neutral: site pages are rendered by the same transform pipeline as posts.
- **Alternatives Rejected** — Two independent scans and catalogs merged at output: simpler scanner, but a second cross-check for slug clashes and cross-folder links, and two code paths to keep in step.

## ADR-002: Redirects as a build-generated table read by the static server

- **Context** — `/tags`, `/tags/<tag>` and `/graph` must answer 301 to their `/writing/...` addresses (FR5.2). The static server runs as a long-lived launchd service; the nightly deploy only copies files and never restarts it (requirements review R-02). Rollback is revert-and-rebuild.
- **Decision** — The build writes a sorted redirect table into the site output. The static server reads the table from the web root on each request (decode the path once, normalise a trailing slash, exact match, answer 301 with a percent-encoded target and the original query). The server change ships once and needs one manual restart; afterwards redirects and rollbacks ship with the nightly copy (domain-design Q2).
- **Consequences** — Positive: redirects, their removal and rollbacks travel with the build; new tags get redirects automatically; no Jenkins restart step. Negative: one manual restart on first release; a small per-request file read (cacheable by modification time). Neutral: a missing or unreadable table means no redirects, never a server error.
- **Alternatives Rejected** — Rules in server code with a Jenkins restart after deploy: couples deploy to service control and rollback to the restart. Rules in server code with manual restarts: easy to forget, so old links break until someone notices.

## ADR-003: Hubs are not posts in lists

- **Context** — Hub notes are in the post metadata; the homepage and 404 already filter them out. Requirements said "every published post", which the review found ambiguous.
- **Decision** — Every list (this week, recent, all posts) contains ordinary posts only; hubs appear as Writing topics (refined-mockups Q2). `ContentData` exposes the two sets separately and `WritingLists` never mixes them.
- **Consequences** — Positive: matches today's homepage behaviour; NFR8's check compares against ordinary posts. Negative: the requirement wording must be read with this definition. Neutral: hubs stay reachable from Writing → topics.
- **Alternatives Rejected** — Listing hubs among posts: duplicates them (topic and post) and changes today's behaviour.

## ADR-004: Week window computed in Korean time inside a pure list module

- **Context** — The homepage lists the current Monday–Sunday week in Korean time (requirements Q5); the nightly build starts just after local midnight, when the UTC date is still the previous day (user-stories review R-03).
- **Decision** — `WritingLists` converts the build instant to UTC+9 first, then takes that date's Monday to Sunday. The build instant comes from the existing build-date resolver so tests can fix it.
- **Consequences** — Positive: one tested place for the rule, including the midnight boundary. Negative: none significant.
- **Alternatives Rejected** — Using the build machine's local date: correct on this machine but untestable and wrong in a UTC CI container.
