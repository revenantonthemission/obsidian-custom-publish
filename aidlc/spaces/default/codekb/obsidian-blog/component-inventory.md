# Component Inventory

Each heading below is a component name. Depth notes say how closely the component was read in this scan.

## Preprocessor (`preprocessor/`)

### Preprocessor CLI
- **Files**: `preprocessor/src/main.rs`
- **Responsibility**: parse `<vault> <output> [--stamp-published]`; run stamping, scan, catalog build, reference validation, output write and the diagram failure check, in that order; exit 1 on any diagnostic.
- **Depends on**: Vault Scanner, Publication Catalog, Output Writer, Transform Pipeline (failure list).

### Vault Scanner
- **Files**: `preprocessor/src/scanner.rs`
- **Responsibility**: walk one vault root (skip `.`-prefixed entries and `Drafts`), parse frontmatter (dates as strings, raw `visibility`), slugify file names, index headings and block IDs, read `updated` from a batched `git log`, `created` from frontmatter or birth time; `stamp_published_dates` writes `published` into notes.
- **Depends on**: Shared Syntax, Core Types; external `git`; walkdir, serde_yml, chrono.

### Publication Catalog
- **Files**: `preprocessor/src/catalog.rs`
- **Responsibility**: classify notes as `Post` or `Homepage`; require exactly one homepage (PUB001–PUB003); expose `full()` and `posts_only()` views; reject homepage transclusions (PUB004–PUB006); format and sort diagnostics.
- **Depends on**: Core Types, Shared Syntax, Transform Pipeline (`strip_frontmatter`, `transform_outside_fences`).

### Link Resolver
- **Files**: `preprocessor/src/linker.rs`
- **Responsibility**: resolve `[[wikilinks]]` by note title into forward links and backlinks; project to `graph.json` (undirected, sorted, deduped edges).
- **Depends on**: Shared Syntax, Core Types.

### Transform Pipeline
- **Files**: `preprocessor/src/transform.rs`, `preprocessor/src/hub_dates.rs`
- **Responsibility**: turn raw note content into site-ready Markdown + HTML (comments, image embeds, transclusions, Markdown images, wikilinks incl. homepage `/`, hub child dates, block anchors, highlights, callouts, diagrams); keep a process-global list of diagram failures.
- **Depends on**: Shared Syntax, Core Types, Diagram Renderers, Vault Scanner (`slugify_heading`).

### Diagram Renderers
- **Files**: `preprocessor/src/d2.rs`, `preprocessor/src/mermaid.rs`, `preprocessor/src/typst_render.rs`
- **Responsibility**: call `d2` (with style migration and binary formats), `mmdc` (puppeteer/Chrome, theme handling), `typst` and return SVG or bytes.
- **Depends on**: external CLIs; tempfile.

### Discovery Index Builders
- **Files**: `preprocessor/src/search.rs`, `preprocessor/src/preview.rs`, `preprocessor/src/nav_tree.rs`, `preprocessor/src/related.rs`
- **Responsibility**: Korean full-text index (lindera ko-dic, title tokens boosted ×2, tokens of 2+ chars); first-sentence previews (Hangul-safe truncation); hub navigation tree with orphans; top-5 related posts by tag/link/hub scoring.
- **Depends on**: Core Types, Link Resolver output, Shared Syntax; lindera.

### Output Writer
- **Files**: `preprocessor/src/output.rs`
- **Responsibility**: clean managed namespaces; write `posts/`, `meta/`, `homepage/`, `assets/`, `graph.json`, `search-index.json`, `previews.json`, `nav-tree.json`, `manifest.json`; copy referenced images from the nearest `attachment/` (up to 10 parents, file name sanitized); reading time at 200 words per minute; PUB007 on write errors.
- **Depends on**: Publication Catalog, Link Resolver, Transform Pipeline, Discovery Index Builders.

### Shared Syntax
- **Files**: `preprocessor/src/syntax.rs`
- **Responsibility**: single home of the Obsidian regexes (`WIKILINK_RE`, `BLOCK_ID_RE`, `IMAGE_EMBED_RE`, `IMAGE_SIZE_RE`, `MARKDOWN_IMAGE_RE`, `TRANSCLUSION_RE`, `HEADING_RE`, strip regexes) and `frontmatter_range`.
- **Depends on**: regex.

### Core Types
- **Files**: `preprocessor/src/types.rs`, `preprocessor/src/lib.rs`
- **Responsibility**: `PostMeta`, `RawVisibility`, `VaultIndex` (posts, `slug_map`, `name_map`, `heading_map`, `block_map`), `LinkGraph`, graph JSON types, `is_korean`.
- **Depends on**: serde.

## Site (`site/`)

### Content Data Access
- **Files**: `site/src/lib/data.ts`, `site/src/lib/types.ts`
- **Responsibility**: the only reader of `content/` (`../content` from the site cwd): post metadata sorted by `published`, post bodies, the fail-closed homepage artifact (HP001/HP002), graph and 2-hop local graph, hubs, tag index (`sanitizeTag`), Korean date format, preview summaries (from `site/public/previews.json`).
- **Depends on**: Output Writer's file contract; Node `fs`.

### Markdown Renderer
- **Files**: `site/src/lib/render.ts`, `site/src/lib/image-size.ts`, `site/src/lib/shiki-themes/`
- **Responsibility**: unified pipeline (remark GFM with `singleTilde: false`, CJK-friendly, definition lists, abbreviations, math → rehype-raw → Shiki Xcode light/dark with `data-language` → slug → code file names → image loading/sizing → captions as `<figure>` → table wrapper → KaTeX `strict: false` → optional home sections).
- **Depends on**: Homepage Composition (`rehypeHomeSections`); unified/remark/rehype/Shiki/KaTeX.

### Homepage Composition
- **Files**: `site/src/pages/index.astro`, `site/src/lib/homepage.ts`, `site/src/lib/home-sections.ts`
- **Responsibility**: render the homepage artifact with exactly one profile slot (HP003/HP004), split at the slot and the legacy recent-posts heading, wrap H2 sections as cards, insert "오늘 발행된 글" (build date, `HOMEPAGE_TODAY_OVERRIDE`) and the profile card.
- **Depends on**: Content Data Access, Markdown Renderer, Profile Domain, BaseLayout, Listing Components.

### Site Identity
- **Files**: `site/src/lib/site.ts`
- **Responsibility**: `SITE_NAME` "Passion Project", description, URL, locale, `documentTitle()`.
- **Depends on**: nothing.

### Primary Navigation
- **Files**: `site/src/lib/navigation.ts`
- **Responsibility**: frozen primary (Tags, Graph, Résumé, Portfolio) and profile-local (홈, Résumé, Portfolio) models; validated current-state computation; rejects any model other than the two approved ones. Review-subject file.
- **Depends on**: Profile Domain (`issues.ts`, `types.ts`).

### BaseLayout
- **Files**: `site/src/layouts/BaseLayout.astro`
- **Responsibility**: document head (title, description, Open Graph, Twitter, canonical, RSS, icons, manifest, font preloads), route resource policy and JSON-LD validation, ES5 inline appearance bootstrap and reading-progress script, skip link, Header, Search island, back-to-top. Review-subject file; inline script bytes pinned by `asset-budget.mjs`.
- **Depends on**: Header, Search island, Site Identity, `lib/layout/`, Profile Domain metadata types, Design System Styles.

### PostLayout
- **Files**: `site/src/layouts/PostLayout.astro`
- **Responsibility**: post article (title, dates, reading time, tag chips linking `/tags/<tag>`), unescaped content (`set:html`), outline panel and sheet, hub navigation, backlinks, related posts, local graph, post scripts.
- **Depends on**: BaseLayout, Content Data Access, Listing Components, LocalGraph island, Post Page Scripts.

### HubLayout
- **Files**: `site/src/layouts/HubLayout.astro`, `site/src/pages/hubs/[slug].astro`
- **Responsibility**: hub page with breadcrumb, post count, tag chips and the hub's posts as a grouped list.
- **Depends on**: BaseLayout, Listing Components, Content Data Access.

### Header
- **Files**: `site/src/components/Header.astro`, `site/src/islands/MobileNav.tsx`
- **Responsibility**: floating glass bar: site title link to `/`, desktop primary navigation, search trigger with ⌘K/Ctrl K hint, ThemeToggle, static `<details>` navigation sheet under 768 px. Throws on an invalid navigation state. Review-subject files.
- **Depends on**: Primary Navigation, Site Identity, ThemeToggle island, lucide icons.

### Discovery Pages
- **Files**: `site/src/pages/posts/[slug].astro`, `site/src/pages/tags/index.astro`, `site/src/pages/tags/[tag].astro`, `site/src/pages/graph.astro`, `site/src/pages/rss.xml.ts`, `site/src/pages/404.astro`
- **Responsibility**: post routes for every meta (hubs included), tag index and tag pages, graph page (graph tab + list tab), RSS feed, not-found page with recent posts.
- **Depends on**: Content Data Access, Markdown Renderer, PostLayout, BaseLayout, Listing Components, GraphView island.

### Listing Components
- **Files**: `site/src/components/PostCard.astro`, `HubProgress.astro`, `HubNav.astro`, `BacklinkList.astro`, `RelatedPosts.astro`, `GraphList.astro`, `OutlineTabs.astro`, `TableOfContents.astro`
- **Responsibility**: grouped post row linking `/posts/<slug>`; post count; hub breadcrumb with previous/next; backlinks; related posts; graph as a link list; outline tabs (목차 | 탐색) with the NavTree island; table of contents from rendered heading IDs.
- **Depends on**: Content Data Access, `lib/toc.ts`, NavTree island, lucide-static icons.

### Client Islands
- **Files**: `site/src/islands/Search.tsx`, `GraphView.tsx`, `LocalGraph.tsx`, `NavTree.tsx`, `TreeNodeItem.tsx`, `ThemeToggle.tsx`
- **Responsibility**: search dialog over `/search-index.json`; force-directed graph over `/graph.json`; 2-hop local graph from props; hub tree over `/nav-tree.json`; appearance toggle (자동 → 라이트 → 다크).
- **Depends on**: `lib/search.ts`, `lib/search-keys.ts`, `lib/modal.ts`, `lib/graphUtils.ts`, `lib/graphSim.ts`, `lib/appearance.ts`; preact, d3, lucide-preact.

### Post Page Scripts
- **Files**: `site/src/scripts/*.ts` (8)
- **Responsibility**: code copy buttons, heading folding, link previews (`/previews.json`), outline sheet, scroll regions, DOM-built icons, segmented tabs, table-of-contents highlight.
- **Depends on**: PostLayout markup; `/previews.json`. Depth: header comments only.

### Design System Styles
- **Files**: `site/src/styles/*.css`, `site/src/styles/profile/*.css`
- **Responsibility**: HIG tokens (`--c-` colors, spacing, type, radius, motion), base and chrome, page styles, profile and print styles; `fonts.css` imported from BaseLayout's frontmatter. Several are review subjects. Depth: file list and CLAUDE.md rules only.
- **Depends on**: Pretendard materialized font, KaTeX CSS.

### Profile Domain
- **Files**: `site/src/lib/profile/` (18 files), `site/src/components/profile/`, `site/src/pages/resume.astro`, `site/src/pages/portfolio.astro`, `site/src/pages/portfolio/[role].astro`, `site/src/lib/layout/`
- **Responsibility**: approved profile facts (`profile-data.ts`), validation, digest-sealed fact approval against `verification/profile/fact-approval.json`, projections for résumé, portfolio roles and homepage, page metadata and JSON-LD, the résumé manifest and PDF document link bound to `verification/resume/current-release.json` and `public/resume.pdf`. Depth: exports and entry points only.
- **Depends on**: `site/verification/`, Node crypto/fs (build only).

### Profile Tooling
- **Files**: `site/scripts/profile/` (≈30 files), `site/astro.config.mjs`
- **Responsibility**: the closed five-command CLI (`test:unit`, `test:pbt`, `test:e2e`, `resume:pdf`, `resume:pdf:verify`), the Astro integration (profile assembly + font materialization at config setup, provenance in verification builds, approval-leak check after build), PDF render/inspect/view, release store and coordinator, verification provider, process custody, PBT runner, asset budget, accessibility review subject contract, homepage fixture content. Depth: headers and the two files named in the scan.
- **Depends on**: Profile Domain, pretendard, pdfjs-dist, Playwright.

### Local Static Server
- **Files**: `site/scripts/local-server.mjs`
- **Responsibility**: production HTTP server for the web root (clean URLs, 404 page, caching, gzip, path containment); also serves `dist/` for HIG checks.
- **Depends on**: Node standard library only. Depth: 이전 스캔 기록만(금번 스냅샷 범위 밖, 미재검증).

### Verification Fixtures
- **Files**: `fixtures/vault/`, `site/scripts/profile/homepage-fixture-content.mjs`, `site/scripts/crossunit/ensure-fixture-content.mjs`
- **Responsibility**: the 15-note test vault (homepage fixture with a profile slot, hub, posts per syntax feature, a deliberate missing image); writing a fixture homepage artifact and one fixture post into `content/` only when absent.
- **Depends on**: Preprocessor CLI (fixture runs), Content Data Access contract. Depth: `ensure-fixture-content.mjs`는 금번 심독(9줄 전체, `ensureE2eFixtureContent()` 위임).

### Cross-unit Gate
- **Files**: `site/scripts/crossunit/link-sweep.mjs`, `site/scripts/crossunit/known-broken-links.json`, `site/tests/e2e/crossunit.spec.ts`, `site/playwright.crossunit.config.ts`, `Justfile` `crossunit`
- **Responsibility**: static check that every root-relative `href`/`src` in `dist/` resolves to an emitted file (`/resume.pdf` deferred); JavaScript-off navigation checks via `astro preview` on port 4326. 금번 심독에서 확인: `sweep()`는 broken link를 `expected`/`unexpected`/`stale`로 분류하고 `ok`는 양쪽이 비었을 때만 true, `loadKnownBroken()`은 `{ page, target, reason }` 배열을 검증해 형식 오류를 `LINK001`로 fail closed, `known-broken-links.json`은 의도적 깨진 이미지 1건을 선언.
- **Depends on**: an existing `site/dist/`; `site/scripts/crossunit/ensure-fixture-content.mjs`. Depth: `link-sweep.mjs`(167줄)와 데이터 파일 심독.

### HIG Browser Harness
- **Files**: `site/scripts/hig/build-and-serve.mjs`, `site/playwright.hig.config.ts`, `site/tests/e2e/hig-*.spec.ts`, `site/tests/e2e/support/hig.ts`
- **Responsibility**: fixture preprocess + build + local-server on 127.0.0.1:4329; axe scans and layout checks across widths, themes, reduced motion, and Chromium/Firefox/WebKit over the `HIG_ROUTES` table. 금번 심독에서 확인: 릴리스 전처리기 바이너리 경로를 직접 지정하고, 4개 JSON을 복사한 뒤 `syncPublicAssets()`로 자산을 동기화하며, `HOMEPAGE_TODAY_OVERRIDE=2025-08-13`으로 빌드하고, `HIG_SKIP_BUILD=1`이면 기존 `dist/`를 재사용한다.
- **Depends on**: Preprocessor CLI release binary, Local Static Server, Verification Fixtures, `site/scripts/sync-public-assets.mjs`. Depth: `build-and-serve.mjs`(85줄) 심독.

### Build Orchestration
- **Files**: `Justfile`
- **Responsibility**: `preprocess`, `build`, `dev`, `site-build`, `deploy`, `deploy-preprocess`, `serve`, `test`, `crossunit`, `d2-watch`, `typst-render`; `VAULT_PATH` defaults to fixtures for dev and to `Areas/Notes` for deploy. 금번 심독에서 확인: `deploy: deploy-preprocess site-build` 뒤에 `publish-dist.sh` 호출(29줄), `crossunit`은 `site/package.json`이 review subject라서 여기에 둠(46-48줄).
- **Depends on**: cargo, npx, rsync, node, bash. Depth: 56줄 전체 심독.

### Nightly Pipeline
- **Files**: `Jenkinsfile`
- **Responsibility**: nightly Checkout → Install → Verify → Preprocess (`--stamp-published`, chrome-headless-shell preferred) → Build Site → Deploy (`RUN_DEPLOY`). 금번 심독에서 확인: Deploy 스테이지는 `publish-dist.sh` 호출로 끝나고(116줄), `post.success`는 `echo` 한 줄뿐(121-124줄) — 배포 후 HTTP 검사 없음.
- **Depends on**: Build Orchestration steps (inlined), Publish-Dist Deploy Script, Jenkins on 127.0.0.1:8081, the real vault path, the web root. Depth: 125줄 전체 심독.

### Publish-Dist Deploy Script
- **Files**: `site/scripts/publish-dist.sh`
- **Responsibility**: 두 배포 경로가 공유하는 단일 게시 진입점. `set -eu`, 인자 2개 검증(오용 exit 2, 잘못된 DIST exit 1), `mkdir -p` 후 `_redirects.json`/임시 파일을 제외한 `rsync -a --delete`, 이어서 리다이렉트 테이블을 임시 이름으로 복사하고 `mv -f`로 원자적 교체(없으면 웹 루트에서 제거). 주석(1-16줄)은 순서의 이유를 기록한다.
- **Depends on**: `rsync`, `cp`, `mv`, `mkdir`; 빌드 산출물 `site/dist/`; 웹 루트. 외부 npm 의존성 없음. Depth: 44줄 전체 심독.

### Site Command Surface
- **Files**: `site/package.json`
- **Responsibility**: npm 명령의 닫힌 집합(`test:unit`, `test:pbt`, `test:e2e`, `resume:pdf`, `resume:pdf:verify`는 `scripts/profile/cli.mjs`로 위임)과 pinned dev/tool 의존성. accessibility review subject이므로 변경 시 review record 다이제스트가 깨진다(`Justfile:46-48`). `crossunit` 명령은 의도적으로 여기에 없고 `Justfile`에 있다.
- **Depends on**: `site/scripts/profile/cli.mjs`; Prettier/Vitest/Playwright 도구 체인. Depth: 77줄 전체 심독.
