# Business Overview

## Purpose

`obsidian-blog` (internal engine name `obsidian-press`) replaces Obsidian Publish for one author. It turns the published folder of a personal Obsidian vault into a static website, "Passion Project", served from the maintainer's own machine at https://rvnnt.dev. The site combines a Korean-language knowledge base of notes ("posts") with a professional profile: a résumé page, role-specific portfolio pages and a downloadable PDF résumé.

## Business Domain

- **Personal publishing**: the author writes in Obsidian; nothing is written for the web separately. Only `Areas/Notes` of the vault is published (`VAULT_PATH` must point at it).
- **Knowledge-base navigation**: posts link to each other with wikilinks, are grouped by hub notes and tags, and can be explored as a graph, a hub navigation tree, backlinks, related posts and full-text search tuned for Korean.
- **Professional profile**: approved facts about the author (identity, contact, skills, experience, projects, certifications) render as `/resume`, `/portfolio`, `/portfolio/product-engineer`, `/portfolio/infra-engineer` and `/resume.pdf`. Facts are hand-approved and digest-sealed; a page cannot build from unapproved facts.

## Key Functionality

| Capability | Where it lives | Notes |
|---|---|---|
| Daily publish | `Jenkinsfile` (nightly, cron `H 0 * * *`) | Stamps missing or outdated `published` dates into the vault, preprocesses, builds and deploys `origin/develop`. Pushing `develop` is the release. |
| Obsidian syntax support | `preprocessor/src/transform.rs` | Wikilinks with heading/block fragments, transclusions, callouts, highlights, comments, block anchors, image embeds with sizes or captions, D2/Mermaid/Typst diagrams (light and dark). |
| Homepage | vault note with `visibility: homepage` + `site/src/pages/index.astro` | Exactly one homepage note; it must contain one `<!-- profile:slot -->`; the page adds a profile card and "오늘 발행된 글" (posts published today). |
| Post reading | `site/src/layouts/PostLayout.astro` | Table of contents and hub tree, heading folding, code copy, link previews, backlinks, related posts, local graph. |
| Discovery | `/tags`, `/tags/<tag>`, `/hubs/<slug>`, `/graph`, search dialog, `/rss.xml`, sitemap | All discovery derives from posts only; the homepage note never appears in lists, the graph or search. |
| Profile | `site/src/lib/profile/`, `/resume`, `/portfolio*`, `/resume.pdf` | Three human gates: fact approval, manual web accessibility review (16 states), PDF release review. |
| Self-hosting | `site/scripts/local-server.mjs`, launchd `dev.rvnnt.blog`, Cloudflare Tunnel | Dependency-free Node server on port 8080 with clean URLs and a 404 page. AWS was decommissioned on 2026-08-17. |

## Actors

- **Maintainer/author** (single owner): writes vault notes, approves profile facts, performs the human review gates, triggers `just deploy` by hand when needed.
- **Visitors**: read posts and profile pages; Korean UI throughout.
- **Nightly Jenkins job** `obsidian-blog-develop`: the automated publisher.

## Business Rules Worth Knowing

- Publication scope is declared per note by `visibility` (`post` default, or `homepage`); any other value fails the run (PUB001). Zero or several homepages fail it too (PUB002/PUB003), and transcluding the homepage into a post is forbidden (PUB004–PUB006).
- A failed validation leaves the previous output untouched; output is cleaned and fully regenerated only after validation passes.
- A diagram that fails to render fails the run after output is written, so a page never ships silently without its picture.
- Profile facts are the only content not authored in the vault; they live in `site/src/lib/profile/profile-data.ts` and need a matching approval receipt.

## Direction (active intent `personal-website`)

The approved first release turns the blog into a personal website: publish "site pages" from a named vault folder outside `Areas/Notes` and keep them out of post lists; add a Writing section (recent posts, topics, every post by date); replace the vault homepage note with a site-built homepage; move Tags and Graph under `/writing/...` with redirects from `/tags`, `/tags/<tag>` and `/graph`. Later rounds add About, Contact, Projects (with profile facts moved into the vault, including the résumé and PDF résumé) and Now.
