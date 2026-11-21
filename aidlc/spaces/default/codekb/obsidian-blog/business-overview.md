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

## 현재 인텐트: post-deploy-runner (금번 집중 스캔)

완료된 `personal-website` 인텐트의 F-7 후속 작업이다. 배포가 끝난 뒤 실제 서비스가 살아 있는지를 자동으로 확인하고, 실패하면 rollback-runbook의 트리거에 연결하는 것이 목적이다. 확인 항목은 이 문서에서 한 번만 정의한다(다른 산출물은 여기를 교차 참조한다).

| 검사 | 기대값 | 비고 |
|---|---|---|
| H1 | 홈 `/` 가 HTTP 200 |야간/로컬 두 배포 경로 모두에서 확인 |
| H2 | 게시글 하나가 HTTP 200 | 글 하나의 URL만 확인하면 충분 |
| H3 | `/tags` 가 HTTP 301 + `Cache-Control: no-cache`, 리다이렉트 대상이 HTTP 200 | 리다이렉트 테이블 메커니즘은 `api-documentation.md` 참조 |

적용 범위는 두 갈래다. Jenkins의 Deploy 스테이지(`Jenkinsfile:107-118`)와 로컬 `just deploy`(`Justfile:28-29`)은 모두 `site/scripts/publish-dist.sh`를 호출하므로, 러너는 이 공통 게시 단계 뒤에 붙일 수 있다. 실패 시 연결 대상인 rollback-runbook의 T1/T2 트리거 정의는 아직 재검증되지 않았다(요구사항 단계에서 확인). 상세 증거는 `developer-scan.md`의 `## Handoff Summary`에 있다.
