# Requirements — Passion Project personal website, first release

Upstream: `ideation/intent-capture/intent-statement.md`; `ideation/scope-definition/scope-document.md`, `intent-backlog.md`; `ideation/approval-handoff/initiative-brief.md`; `ideation/rough-mockups/wireframes.md`; codekb `business-overview.md`, `architecture.md`, `code-structure.md`; `inception/practices-discovery/team-practices.md`. Answers: `requirements-analysis-questions.md` (Q1–Q8).

## Intent Analysis

The owner is preparing for a job search and wants the blog to work as a personal website (intent statement). This first release (initiative brief, B1–B4) does four things:

- gives the site a home for non-post pages in the vault, so later About and Now pages never leak into post lists;
- adds a Writing section where every published post can be found by date or topic;
- replaces the vault-note homepage with a site-built one that says who the owner is and links straight to the résumé and portfolio;
- moves Tags and Graph under Writing without breaking old links.

Type: enhancement across the preprocessor and the site. Scope: multi-component. Complexity: standard.

## Functional Requirements

### FR1 — Site pages from the vault (B1)

- **FR1.1** The publishing step reads site pages from the vault folder `Areas/Pages` in addition to posts from `Areas/Notes`, and reads no other part of the vault (Q1; scope document). The site-pages folder location is a separate, explicit input; the posts location is unchanged.
- **FR1.2** A note in `Areas/Pages` is a site page, never a post: it does not appear in post metadata, the post list, the Writing pages, topics, tags, the graph, search, link previews, the navigation tree, related posts, backlinks or the RSS feed (scope document B1; intent success metric).
- **FR1.3** Each site page is written to the generated content under its own namespace with its title and rendered body, using the same Markdown transforms as posts, so later releases can render it. This release adds no route for site pages (initiative brief).
- **FR1.4** The nightly date stamping writes `published` dates only into notes in `Areas/Notes`; it never modifies a note in `Areas/Pages` (scope document; feasibility constraint C-T2).
- **FR1.5** When `Areas/Pages` does not exist or is empty, the run succeeds with zero site pages and prints one notice naming the missing folder (corner checklist: missing path).
- **FR1.6** When a site page and a post have the same slug, the run stops before writing anything, with a coded error naming both files (corner checklist: two things share a key; team rule: errors fail closed with coded diagnostics).
- **FR1.7** The rules that skip dot-entries and `Drafts` folders apply to `Areas/Pages` as they do to `Areas/Notes` (codekb architecture, scan step).

### FR2 — Retire the vault homepage note (B3)

- **FR2.1** The publishing step no longer requires a note marked `visibility: homepage`; a run with none succeeds (Q2).
- **FR2.2** A note still marked `visibility: homepage` (today "Passion Project.md") is not published anywhere: it produces no post, page, homepage artifact, metadata, or entry in any index (Q2).
- **FR2.3** Embedding that note (`![[...]]`, with or without a heading or block) in a published note still stops the run with the existing transclusion errors, so no content silently disappears (codekb api-documentation PUB004–PUB006).
- **FR2.4** The generated content no longer contains a homepage artifact, and the site build no longer reads one; the homepage build checks that depended on it are removed (Q2; codekb HP001–HP004).

### FR3 — Site-built homepage `/` (B3)

- **FR3.1** The homepage shows "Passion Project" as its only level-1 heading (rough mockups Q4).
- **FR3.2** Below it, the homepage shows the owner's name and short introduction from the approved profile facts, without the headline (Q4).
- **FR3.3** The homepage opening has a "Résumé" button linking to `/resume` and a "Portfolio" button linking to `/portfolio` (Q3, Q8).
- **FR3.4** The homepage lists posts whose `published` date falls in the current week, Monday to Sunday, in Korean time (UTC+9), relative to the build date; the existing build-date override keeps working for tests (Q5; codekb `resolveBuildDate`).
- **FR3.5** The list is ordered newest first; posts with the same date are ordered by title (corner checklist: ordering with a deterministic tiebreaker).
- **FR3.6** The list section is headed "이번 주 글" and ends with a "모든 글 보기" link to `/writing/all` (Q5, Q6).
- **FR3.7** When no post falls in the current week, the section shows "이번 주에 발행한 글이 없습니다." and the "모든 글 보기" link (rough mockups wireframes, empty state; Q5).
- **FR3.8** The homepage's document title is "Passion Project" (existing `documentTitle()` behaviour).

### FR4 — Writing section (B2)

- **FR4.1** `/writing` shows the level-1 heading "Writing", links to Tags and Graph, a "최근 글" list of the 5 newest published posts with their dates, then a "주제" list of topics (Q6; rough mockups Q3).
- **FR4.2** The "최근 글" list ends with a link to `/writing/all`. When fewer than 5 posts exist, it shows all of them; when none exist, it shows "아직 발행한 글이 없습니다." (Q6; corner checklist: empty and single-item lists).
- **FR4.3** Each topic row is an existing hub page: its title, the number of posts it lists, and a link to `/hubs/<slug>` (rough mockups wireframes W3; codekb hubs).
- **FR4.4** `/writing/all` lists every published post exactly once, grouped under year headings by `published` date, newest year first and newest post first within a year; posts with the same date are ordered by title (Q6; intent success metric).
- **FR4.5** A post without a `published` date appears on `/writing/all` under a final group headed "날짜 없음", ordered by title (corner checklist: unknown vs zero).
- **FR4.6** Site pages never appear on `/writing` or `/writing/all` (FR1.2).

### FR5 — Tags and Graph under Writing, old addresses redirected (B4)

- **FR5.1** The tag index is served at `/writing/tags`, each tag page at `/writing/tags/<tag>`, and the graph at `/writing/graph`, with the same content as today (feasibility Q7; Q7).
- **FR5.2** The site's static server answers `/tags`, `/tags/` , every `/tags/<tag>` (with or without a trailing slash) and `/graph` (with or without a trailing slash) with a permanent (301) redirect to the matching `/writing/...` address, keeping any query string (Q7).
- **FR5.3** Every link the site itself renders (header, post tag chips, hub pages, Writing, mobile navigation) points to the new addresses; a built site contains no link to `/tags` or `/graph` (Q7; team rule: link sweep).
- **FR5.4** The build no longer produces pages at `/tags`, `/tags/<tag>` or `/graph` (Q7).

### FR6 — Navigation (B2, B3)

- **FR6.1** In this release the primary navigation holds one section, "Writing", linking to `/writing`; Tags, Graph, Résumé and Portfolio leave the top bar and the navigation sheet (Q3; rough mockups Q1–Q2).
- **FR6.2** On `/writing` the Writing item is marked as the current page (`aria-current="page"`); on `/writing/all`, `/writing/tags`, `/writing/tags/<tag>` and `/writing/graph` it is marked as the current section (`aria-current="true"`); elsewhere it carries no current marker (rough-mockups review R-07).
- **FR6.3** The profile pages' local navigation (홈, Résumé, Portfolio) is unchanged.

## Non-Functional Requirements

- **NFR1 — Accessibility and HIG.** Each new or changed page (`/`, `/writing`, `/writing/all`, `/writing/tags`, `/writing/tags/<tag>`, `/writing/graph`) passes axe WCAG 2.2 AA scans at 320, 768, 1024 and 1440 px wide, in light and dark themes, plus a reduced-motion check, through new Playwright checks; it has exactly one h1, h2 per section, and every control is at least 44 × 44 px (intent success metric; team Testing Posture; wireframes accessibility notes).
- **NFR2 — No new origins.** No new or changed page requests any origin other than the site's own (codekb technology stack; existing `hig-performance` rule).
- **NFR3 — Works without JavaScript.** The homepage, `/writing`, `/writing/all` and the tag pages show all their content and links with JavaScript off; `just crossunit` passes, with its link sweep reporting only the fixture's deliberate broken image (team Testing Posture).
- **NFR4 — Deterministic output.** Running the publishing step twice on the same vault produces byte-identical site-page output and post lists; all new lists use a stated order with a tiebreaker (team Code Style).
- **NFR5 — Fail closed.** New preprocessor failures use coded diagnostics and write nothing; the vault is never modified by a failed run in a way this release introduces (team Code Style; FR1.4).
- **NFR6 — Existing suites stay green.** `cargo test --release`, `npm run test:unit`, `npm run test:pbt`, `npm run format:check`, `npx astro check` and the HIG Playwright suites pass on every merge; every behaviour lands test-first (team Testing Posture).
- **NFR7 — Job-search reach.** From the homepage, the résumé and the portfolio are each reachable in 1 click, checked by a browser test (Q8).
- **NFR8 — Writing reach.** Every published post is reachable from `/writing` in at most 2 clicks (through `/writing/all`), checked by a test that compares `/writing/all` with the post metadata (intent success metric).

## Constraints

- Build on the current self-built site; no hosted builder or template (feasibility Q1).
- The publish boundary is `Areas/Notes` plus `Areas/Pages`, never the whole vault (Q1). The project rule "NEVER run the preprocessor against the whole vault. `VAULT_PATH` must point at `Areas/Notes`, the only published folder." must be reworded by the owner to name `Areas/Pages` before the change ships, and the old line removed by hand (practices-discovery follow-up F4).
- Korean content; English section labels (rough mockups Q2; intent statement Q9).
- Self-hosted fonts and assets; the static server is `site/scripts/local-server.mjs` behind the Cloudflare Tunnel (codekb architecture).
- Work merges to `develop` one phase at a time on its own branch, test-first (team Way of Working, Testing Posture).
- Changing `navigation.ts`, `Header.astro`, `MobileNav.tsx` and `BaseLayout.astro` invalidates the manual 16-state accessibility review; the owner redoes it once at the end (feasibility Q5).
- The Jenkins Verify stage and fixture materializers that depend on the homepage artifact must be updated with the code that removes it (codekb; reverse-engineering findings).

## Assumptions

- [assumption] In this release no post links to a site page; links into `Areas/Pages` are handled when About and Now get routes. Reason: the folder holds nothing the site shows yet (Q1).
- [assumption] The fixture vault gains a small `Pages` folder (and keeps a note marked `visibility: homepage`) so tests cover FR1 and FR2 without the real vault. Reason: Rust tests run against the real fixture vault, never mocks (team Testing Posture).
- [assumption] The homepage's weekly list has no cap; the owner publishes a handful of posts a week. Reason: no cap was asked for.
- [assumption] Topic post counts use each hub's listed child posts as today. Reason: topics are the existing hubs (rough mockups Q3).

## Out of Scope

- About, Contact and links, Projects, the project-facts move (résumé, PDF résumé, portfolio), Now, homepage additions (backlog B5–B10; initiative brief Q3).
- Routes for site pages (FR1.3).
- An English translation (intent statement Q9).
- Practices follow-ups F1–F3, F5, F6 (Jenkins HTTP 200 check, deterministic related/backlink order, branch deletion, CLAUDE.md Astro version, site README) — separate work (practices-discovery evidence).

## Open Questions

- Exact Korean wording beyond the headings fixed above (Refined Mockups).
- Whether `/writing/all` needs page-by-page splitting once the post count grows large (none today; revisit above ~500 posts).
