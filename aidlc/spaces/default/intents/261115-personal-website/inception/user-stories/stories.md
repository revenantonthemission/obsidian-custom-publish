# User Stories — Passion Project personal website, first release

Source: `inception/requirements-analysis/requirements.md` (FR1–FR6, NFR1–NFR8); personas in `personas.md`. Grouped by feature area (Q1), one story per visible behaviour (Q3). Every story here is first-release scope; all are Must Have unless marked.

## Group 1 — Site pages from the vault (FR1)

### US1.1 — Keep site pages out of post lists

As the owner (P4), I want notes in `Areas/Pages` to be published as site pages that never appear among posts, so that later About and Now pages never show up in the writing lists, tags, graph, search or RSS.

**Priority:** Must Have · **Requirements:** FR1.1, FR1.2, FR1.3, FR1.7, NFR4

- **AC1.1.1** Given the fixture vault has a post folder and a pages folder with one page, When the publishing step runs, Then the page is written to the site-pages output with its title and rendered body, And it appears in no post metadata, graph, search index, link previews, navigation tree, tag index, related posts, backlinks or RSS feed.
- **AC1.1.2** Given a page folder containing a `Drafts` folder and a dot-file, When the publishing step runs, Then neither is published.
- **AC1.1.3** Given the same vault, When the publishing step runs twice, Then the site-pages output is byte-identical both times.
- **AC1.1.4** Given the publishing step is given only `Areas/Notes` and `Areas/Pages`, When it runs, Then it reads no file outside those two folders.

### US1.2 — Never stamp dates into site pages

As the owner (P4), I want the nightly date stamping to leave my site pages untouched, so that editing About or Now never rewrites their files.

**Priority:** Must Have · **Requirements:** FR1.4, NFR5

- **AC1.2.1** Given a page without a `published` date and a post without one, When the publishing step runs with date stamping on, Then the post gains a `published` date And the page file is byte-identical to before.

### US1.3 — Clear outcomes for a missing folder and a slug clash

As the owner (P4), I want a missing pages folder to be harmless and a page/post name clash to stop the run, so that I am never surprised by a page silently replacing a post.

**Priority:** Must Have · **Requirements:** FR1.5, FR1.6, NFR5

- **AC1.3.1** Given the pages folder does not exist, When the publishing step runs, Then it succeeds with zero site pages And prints one notice naming the missing folder.
- **AC1.3.2** Given the pages folder exists but is empty, When the publishing step runs, Then it succeeds with zero site pages.
- **AC1.3.3** Given a page and a post with the same slug, When the publishing step runs, Then it stops with a coded error naming both files And writes nothing.

## Group 2 — Retire the vault homepage note (FR2)

### US2.1 — Publish without a homepage note

As the owner (P4), I want the nightly publish to work without any note marked as the homepage, so that the site-built homepage can replace "Passion Project.md".

**Priority:** Must Have · **Requirements:** FR2.1, FR2.4

- **AC2.1.1** Given a vault with no note marked `visibility: homepage`, When the publishing step runs, Then it succeeds.
- **AC2.1.2** Given any vault, When the publishing step runs, Then the generated content contains no homepage artifact, And the site builds without reading one.

### US2.2 — Keep the old homepage note private

As the owner (P4), I want the note still marked `visibility: homepage` to stay in my vault without being published, so that I can keep it for reference.

**Priority:** Must Have · **Requirements:** FR2.2, FR2.3

- **AC2.2.1** Given a note marked `visibility: homepage`, When the publishing step runs, Then the note produces no post, page, metadata or index entry.
- **AC2.2.2** Given a published post that embeds that note, When the publishing step runs, Then it stops with the existing transclusion error And writes nothing.

## Group 3 — Site-built homepage (FR3)

### US3.1 — See who the owner is

As a recruiter (P1), I want the homepage to open with the site name and the owner's name and short introduction, so that I know whose site this is at a glance.

**Priority:** Must Have · **Requirements:** FR3.1, FR3.2, FR3.8, NFR1

- **AC3.1.1** Given the homepage, When it loads, Then its only level-1 heading is "Passion Project" And its document title is "Passion Project".
- **AC3.1.2** Given the approved profile facts, When the homepage loads, Then it shows the owner's name and short introduction And does not show the headline.
- **AC3.1.3** Given the homepage at 320, 768, 1024 and 1440 px in light and dark, When axe scans it, Then it reports no WCAG 2.2 AA violations.

### US3.2 — Reach the résumé and portfolio in one click

As a recruiter (P1), I want Résumé and Portfolio buttons on the homepage, so that I reach them in one click.

**Priority:** Must Have · **Requirements:** FR3.3, NFR7

- **AC3.2.1** Given the homepage, When I activate "Résumé", Then `/resume` opens.
- **AC3.2.2** Given the homepage, When I activate "Portfolio", Then `/portfolio` opens.
- **AC3.2.3** Given the homepage with JavaScript off, When I follow either button, Then the page opens.
- **AC3.2.4** Given each button, When measured, Then its target is at least 44 × 44 px.

### US3.3 — See this week's writing

As a friend (P3), I want the homepage to list what was published this week, so that I can catch up quickly.

**Priority:** Must Have · **Requirements:** FR3.4, FR3.5, FR3.6

- **AC3.3.1** Given a build date of Wednesday 2026-11-18 and posts published on Monday 2026-11-16, Sunday 2026-11-15 and Wednesday 2026-11-18, When the homepage builds, Then "이번 주 글" lists the Wednesday and Monday posts, newest first, And not the Sunday post.
- **AC3.3.2** Given two posts published the same day this week, When the homepage builds, Then they are ordered by title.
- **AC3.3.3** Given a build date of Sunday 2026-11-22, When the homepage builds, Then posts from Monday 2026-11-16 to Sunday 2026-11-22 are listed.
- **AC3.3.4** Given any week, When the homepage builds, Then the section ends with a "모든 글 보기" link to `/writing/all`.

### US3.4 — An honest empty week

As a friend (P3), I want a clear message when nothing was published this week, so that I don't think the page is broken.

**Priority:** Must Have · **Requirements:** FR3.7

- **AC3.4.1** Given no post published in the current week, When the homepage builds, Then the section shows "이번 주에 발행한 글이 없습니다." And the "모든 글 보기" link.

## Group 4 — Writing section (FR4)

### US4.1 — Browse recent posts and topics in one place

As an engineer (P2), I want `/writing` to show the newest posts and the topics together, so that I can start reading or pick a subject.

**Priority:** Must Have · **Requirements:** FR4.1, FR4.2, FR4.3, FR4.6, NFR1

- **AC4.1.1** Given 7 published posts, When `/writing` loads, Then its h1 is "Writing" And "최근 글" lists the 5 newest with their dates And ends with a link to `/writing/all`.
- **AC4.1.2** Given 3 published posts, When `/writing` loads, Then "최근 글" lists all 3.
- **AC4.1.3** Given no published posts, When `/writing` loads, Then it shows "아직 발행한 글이 없습니다."
- **AC4.1.4** Given the existing hubs, When `/writing` loads, Then "주제" lists each hub with its title, its number of listed posts and a link to `/hubs/<slug>`.
- **AC4.1.5** Given `/writing` has links to Tags and Graph, When I follow them, Then `/writing/tags` and `/writing/graph` open.
- **AC4.1.6** Given a site page exists, When `/writing` loads, Then the page is not listed.

### US4.2 — Find every post by date

As an engineer (P2), I want a full list of every post grouped by year, so that I can find anything the owner has written.

**Priority:** Must Have · **Requirements:** FR4.4, FR4.5, FR4.6, NFR8

- **AC4.2.1** Given the post metadata, When `/writing/all` builds, Then every published post appears exactly once.
- **AC4.2.2** Given posts from 2025 and 2026, When `/writing/all` loads, Then 2026 comes first, each year is a heading, and posts are newest first within a year, ties ordered by title.
- **AC4.2.3** Given a post without a `published` date, When `/writing/all` loads, Then it appears under a final "날짜 없음" heading.
- **AC4.2.4** Given a site page exists, When `/writing/all` loads, Then the page is not listed.

## Group 5 — Tags and Graph under Writing (FR5)

### US5.1 — Tags and Graph at their new addresses

As an engineer (P2), I want Tags and Graph under `/writing/...` with the same content, so that the writing section is in one place.

**Priority:** Must Have · **Requirements:** FR5.1, FR5.3, FR5.4, NFR1, NFR3

- **AC5.1.1** Given the built site, When I open `/writing/tags`, `/writing/tags/<tag>` and `/writing/graph`, Then each shows what `/tags`, `/tags/<tag>` and `/graph` show today.
- **AC5.1.2** Given the built site, When the link sweep runs, Then no rendered link points to `/tags` or `/graph`.
- **AC5.1.3** Given the built site, When I list its files, Then no page exists at `/tags`, `/tags/<tag>` or `/graph`.

### US5.2 — Old links keep working

As an engineer (P2) with an old bookmark, I want `/tags`, `/tags/<tag>` and `/graph` to redirect permanently, so that my bookmark still works.

**Priority:** Could Have — may slip with B4 (scope document) · **Requirements:** FR5.2

- **AC5.2.1** Given the site server, When I request `/tags` or `/tags/`, Then it answers 301 with `Location: /writing/tags`.
- **AC5.2.2** Given the site server, When I request `/tags/<tag>` with or without a trailing slash, Then it answers 301 to `/writing/tags/<tag>`, And a Korean tag is percent-encoded in `Location`.
- **AC5.2.3** Given the site server, When I request `/graph` or `/graph/`, Then it answers 301 to `/writing/graph`.
- **AC5.2.4** Given a query string, When any old address redirects, Then the query string is kept.
- **AC5.2.5** Given the site server, When I request `/graph.json`, Then it is served as a file, not redirected.

## Group 6 — Navigation (FR6)

### US6.1 — One clear section in the top bar

As an engineer (P2), I want the top bar to offer Writing, marked when I am in it, so that I always know where I am.

**Priority:** Must Have · **Requirements:** FR6.1, FR6.2, NFR1, NFR3

- **AC6.1.1** Given any page, When the top bar or the navigation sheet renders, Then it holds exactly one section, "Writing", linking to `/writing`.
- **AC6.1.2** Given `/writing`, When it renders, Then the Writing item has `aria-current="page"`.
- **AC6.1.3** Given `/writing/all`, `/writing/tags`, `/writing/tags/<tag>` or `/writing/graph`, When it renders, Then the Writing item has `aria-current="true"`.
- **AC6.1.4** Given any other page, When it renders, Then the Writing item has no `aria-current`.
- **AC6.1.5** Given JavaScript off on a phone-width screen, When I open the navigation sheet, Then Writing is listed and opens `/writing`.

### US6.2 — Profile pages keep their local navigation

As a recruiter (P1), I want the résumé and portfolio pages to keep their 홈 / Résumé / Portfolio links, so that I can move between them.

**Priority:** Must Have · **Requirements:** FR6.3

- **AC6.2.1** Given `/resume` or `/portfolio`, When it renders, Then the local navigation lists 홈, Résumé and Portfolio as today.

## Cross-cutting

### US7.1 — Every changed page stays fast, private and accessible

As any visitor (P1–P3), I want every new or changed page to meet the site's accessibility and privacy rules, so that I can use it with any device or assistive technology and no third party sees my visit.

**Priority:** Must Have · **Requirements:** NFR1, NFR2, NFR3, NFR6

- **AC7.1.1** Given `/`, `/writing`, `/writing/all`, `/writing/tags`, `/writing/tags/<tag>` and `/writing/graph` at 320, 768, 1024 and 1440 px in light and dark, When axe scans them, Then there are no WCAG 2.2 AA violations, And the reduced-motion check passes.
- **AC7.1.2** Given those pages, When they load, Then no request goes to another origin.
- **AC7.1.3** Given JavaScript off, When `just crossunit` runs, Then it passes with only the fixture's deliberate broken image reported.
- **AC7.1.4** Given any merge, When the existing Rust, unit, property, format and type checks run, Then they all pass.

## Dependencies

| Story | Depends on | Why |
|-------|-----------|-----|
| US1.3 | US1.1 | The clash check needs pages to be read |
| US2.2 | US2.1 | The note can only be private once a homepage is optional |
| US3.1–US3.4 | US2.1 | The site-built homepage replaces the homepage artifact |
| US3.3, US3.4 | US4.2 | "모든 글 보기" links to `/writing/all` |
| US4.1, US4.2 | US1.1 | Site pages must already be kept out of post lists |
| US5.2 | US5.1 | Redirects point at the new addresses |
| US6.1 | US4.1 | Writing must exist before the bar links to it |

Each story is still testable on its own with the fixture vault and a fixed build date.

## INVEST Notes

- **Independent:** stories depend only on earlier groups' outputs, never on each other's internals; each has its own fixture-based tests.
- **Small:** each story is one page area or one publishing rule.
- **Testable:** every criterion is Given/When/Then with a fixed date, fixture or HTTP response.
- **Valuable:** each names the persona it serves; the owner's stories prevent silent content loss.
