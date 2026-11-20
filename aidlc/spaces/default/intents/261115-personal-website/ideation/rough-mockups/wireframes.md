# Wireframes (low fidelity) — Passion Project personal website

Upstream: `ideation/intent-capture/intent-statement.md`; `ideation/scope-definition/scope-document.md`, `intent-backlog.md`.

Low-fidelity structure only. Colours, type sizes and materials come from the site's existing Apple HIG design tokens and the floating glass top bar; nothing here changes them. Content is Korean; top-bar labels are English (Q2). Widths: phone 320 px, tablet 768 px, desktop 1024 and 1440 px.

## Information Architecture

```
/                      Homepage                         (first release, B3)
/writing               Writing: recent posts + topics   (first release, B2)
/writing/tags          Tags        (was /tags,  redirects)   (B4, may slip)
/writing/tags/<tag>    One tag     (was /tags/<tag>)         (B4)
/writing/graph         Graph       (was /graph, redirects)   (B4)
/posts/<slug>          A post      (unchanged)
/hubs/<slug>           A topic hub (unchanged)
/projects              Projects showcase                     (later, B8)
/projects/<slug>       Project detail                        (later, B8)
/about                 About; links to the résumé            (later, B5)
/now                   Now                                   (later, B9)
/resume                Résumé      (unchanged address)
/portfolio             Portfolio   (unchanged address)
/rss.xml               RSS         (unchanged)
```

Every page is reachable within 2 clicks of the homepage: the top bar reaches each section, and each section lists its items.

## W1 — Top bar (all pages)

Desktop (≥ 768 px):

```
+------------------------------------------------------------------------+
| [mark] Passion Project     Writing  Projects  About  Now     [⌕ ⌘K] [◐] |
+------------------------------------------------------------------------+
```

Phone (< 768 px):

```
+--------------------------------------+
| [mark] Passion Project    [⌕] [◐] [≡] |
+--------------------------------------+
  [≡] opens the navigation sheet:
  | Writing   |
  | Projects  |
  | About     |
  | Now       |
```

- Sections in order: Writing, Projects, About, Now (Q1). Résumé and Portfolio leave the bar; Tags and Graph move inside Writing (Q1).
- Until Projects, About and Now ship, the bar shows only the sections that exist, so no item leads to a missing page.
- The current section is marked (`aria-current="page"`), not only by colour.

Accessibility: `<header>` landmark with `<nav aria-label="주요 탐색">`; first keyboard stop is the skip link to `<main>`; every control is at least 44 × 44 px.

## W2 — Homepage `/` (first release)

Desktop:

```
+------------------------------------------------------------------------+
| top bar                                                                |
+------------------------------------------------------------------------+
|                                                                        |
|  Passion Project                                   <- Large Title (h1) |
|  조준희 — <one-line headline>                                           |
|  <one-line introduction>                                               |
|  ( Writing )  ( Résumé )  ( About — later )         <- capsule links   |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | 최근 글  (last 7 days)                                  (h2)     |  |
|  |------------------------------------------------------------------|  |
|  | Post title                                      2026-11-14   >   |  |
|  | Post title                                      2026-11-12   >   |  |
|  |------------------------------------------------------------------|  |
|  | 모든 글 보기                                                  >   |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | Featured projects                                (h2, later B10) |  |
|  +------------------------------------------------------------------+  |
|  +------------------------------------------------------------------+  |
|  | Now                                              (h2, later B10) |  |
|  +------------------------------------------------------------------+  |
+------------------------------------------------------------------------+
```

Phone: the same blocks stacked in one column; capsule links wrap onto a second line.

- Opening: "Passion Project" is the Large Title, then the owner's name, headline and one-line introduction (Q4). The name and introduction come from the approved profile facts until the About note exists (assumption below).
- A Résumé capsule sits in the opening, so the résumé stays one click from the homepage even though it leaves the top bar (Q1; intent statement, recruiters).
- Section order: latest writing, then featured projects (later), then current work from Now (later) (Q5).
- Recent writing lists posts published in the last 7 days, newest first, ending with a link to all writing (Q6).

States of "최근 글":

| State | What shows |
|-------|-----------|
| Populated | The posts from the last 7 days, newest first, then "모든 글 보기" |
| One post | The same list with one row |
| Empty (no post in 7 days) | "이번 주에 새로 발행한 글이 없습니다." and "모든 글 보기" |
| Many posts (e.g. 20 in a week) | All of them; no cap is set yet (open question) |

There is no loading or error state: the page is built ahead of time and shows no live data.

Accessibility: one h1 ("Passion Project"), then h2 per section; landmarks header / main / nav; keyboard entry is the skip link, then the capsule links in reading order.

## W3 — Writing `/writing` (first release)

Desktop:

```
+------------------------------------------------------------------------+
| top bar  (Writing marked current)                                      |
+------------------------------------------------------------------------+
|  Writing                                           <- Large Title (h1) |
|  ( Tags )  ( Graph )                               <- capsule links    |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | 최근 글                                                    (h2)  |  |
|  | Post title                                      2026-11-14   >   |  |
|  | Post title                                      2026-11-12   >   |  |
|  | ... (a short list)                                               |  |
|  | 날짜순 전체 보기                                              >   |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | 주제                                                       (h2)  |  |
|  | Computer Engineering                                  12 글   >  |  |
|  | Computer Science                                      34 글   >  |  |
|  | Linguistics                                            5 글   >  |  |
|  | etc.                                                   8 글   >  |  |
|  +------------------------------------------------------------------+  |
+------------------------------------------------------------------------+
```

Phone: same two grouped lists stacked; each row at least 44 px tall.

- One page with both: a short list of recent posts, then the topics (Q3).
- "날짜순 전체 보기" opens the full list of every published post by date, so every post is reachable from Writing (intent success metric).
- Topics are the existing hub topics; each row opens its topic page.
- Tags and Graph are reached from Writing (Q1).
- Site pages (About, Now, project notes) never appear here (scope document B1).

States:

| State | What shows |
|-------|-----------|
| Populated | Recent posts, then topics |
| No posts at all | "아직 발행한 글이 없습니다." in place of both lists |
| A post without a topic | Still appears in recent posts and in the full date list |
| Very long Korean title | Wraps to more lines; never truncated mid-character |

Accessibility: h1 "Writing", h2 per list; lists are real lists; the row's whole area is the link.

## W3a — All posts by date `/writing` full list

```
|  Writing › 날짜순                                   <- title (h1)      |
|  +------------------------------------------------------------------+  |
|  | 2026                                                       (h2)  |  |
|  | Post title                                      11-14        >   |  |
|  | Post title                                      11-12        >   |  |
|  | 2025                                                       (h2)  |  |
|  | ...                                                              |  |
|  +------------------------------------------------------------------+  |
```

Year headings group the list; within a year, newest first.

## W4 — Later pages (outline only; detailed in Refined Mockups)

| Page | Outline | Backlog |
|------|---------|---------|
| About `/about` | Large Title "About"; the note from the vault; a "Résumé" and "Portfolio" capsule; contact links (email `mailto:`, GitHub, LinkedIn, RSS) | B5, B6 |
| Now `/now` | Large Title "Now"; the note from the vault; "last updated" date | B9 |
| Projects `/projects` | Large Title "Projects"; grouped cards, one per project: name, one-line summary, role, years | B8 |
| Project detail `/projects/<slug>` | Project name (h1); what you did and the outcome; links | B8 |

## Assumptions & Open Questions

- [assumption] Until the About note exists, the homepage name, headline and introduction come from the approved profile facts used today.
- [assumption] The top bar shows only sections that already exist, so links never point to a missing page.
- Open: whether the 7-day recent list needs a cap for very busy weeks.
- Open: the exact Korean wording of section headings and empty-state messages (shown here as drafts).
