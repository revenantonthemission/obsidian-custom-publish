# Component Inventory: obsidian-blog

> **Freshness (2026-10-21).** The profile sections below were refreshed by the focused `resume-certifications` scan at commit `96a6066`. Everything outside the profile subsystem comes from the 2026-10-19 full scan at `265b38a`, before the HIG redesign merged. It is stale in places: the theme system, tokens, fonts, chrome and the blog e2e coverage have changed since (see CLAUDE.md). The scope block in reverse-engineering-timestamp.md records which paths were verified.

Each H3 heading below is one component. The headings are also the component names recorded in reverse-engineering-timestamp.md. Each entry gives location, responsibility, dependencies, styling approach, accessibility hooks and the constraints that matter for the HIG redesign.

Cross-references:
- Stylesheet files, design tokens, breakpoints, motion, print rules and the emitted HTML class contract: code-structure.md
- Routes and data endpoints: api-documentation.md
- Tests that pin each component: code-quality-assessment.md

## Content Pipeline Components

### Preprocessor CLI
- **Location**: preprocessor/src (main.rs, scanner.rs, catalog.rs, linker.rs, related.rs, transform.rs, hub_dates.rs, syntax.rs, search.rs, preview.rs, nav_tree.rs, output.rs, types.rs, lib.rs)
- **Responsibility**: turn the vault into `content/`, enforce the publication boundary, resolve links, convert Obsidian syntax to HTML fragments, build the Korean search index, previews, navigation tree and graph.
- **Depends on**: clap, serde, serde_json, serde_yml, regex, walkdir, chrono, anyhow, lindera (KoDic), `git`; Diagram Renderers.
- **Used by**: Justfile, Jenkinsfile, Site Data Layer (through `content/`), the islands that fetch JSON.
- **Presentation relevance**: it emits classes the CSS depends on: `callout`, `callout-<type>`, `callout-title`, `diagram-container`, `diagram-light`, `diagram-dark`, `hub-child-date`, `diagram-download`, `diagram-d2-ascii`. Renaming any of them is a cross-language change.

### Diagram Renderers
- **Location**: preprocessor/src/mermaid.rs, d2.rs, typst_render.rs, and diagram handling in transform.rs
- **Responsibility**: render fenced `mermaid`, `d2` and `typst` blocks to files under `content/assets/`. Mermaid and D2 produce light and dark variants (Mermaid themes `default`/`dark`, D2 themes `0`/`200`, transparent background).
- **Depends on**: external `mmdc` with Chrome through `PUPPETEER_EXECUTABLE_PATH`. `mmdc` is found with `which`, falling back to fixed candidates that include a Node 25.9.0-specific Homebrew path (mermaid.rs:10-35). Also `d2` and `typst`. A fix that adds puppeteer configuration-file support (`9e1c203`) exists only on the unmerged `codex/chore/aidlc-scaffolding` branch.
- **Used by**: the Preprocessor CLI. Failures keep the source block; themed failures fail the run.
- **Presentation relevance**: the diagram colors come from the renderers' built-in themes, not from site tokens. Typst output has no dark variant. A redesigned palette does not reach diagrams unless the renderer themes change.

### Markdown Render Pipeline
- **Location**: site/src/lib/render.ts (154 lines)
- **Responsibility**: render post and homepage markdown to HTML. remark-parse, remark-gfm (`singleTilde: false`), remark-cjk-friendly, remark-definition-list, remark-abbr and remark-math, then remark-rehype, rehype-raw, Shiki dual theme (`github-light`/`github-dark`, `defaultColor: false`, `data-language` transformer), rehype-slug, code-filename, image-caption and table-wrapper plugins, rehype-katex (`strict: false`) and rehype-stringify.
- **Depends on**: the unified ecosystem, Shiki 4, KaTeX.
- **Used by**: Homepage Composition, PostLayout through posts/[slug].astro.
- **Presentation relevance**: defines the article markup: `pre.shiki[data-language]`, `.code-block` with `.code-filename`, `figure.image-figure`, `.table-wrapper`, KaTeX, footnotes. The code theme is fixed to the GitHub themes.
- **Tests**: site/tests/unit/render-extended-syntax.test.ts.

### Site Data Layer
- **Location**: site/src/lib/data.ts, types.ts, toc.ts
- **Responsibility**: read `content/` at build time, expose post metadata, content, hubs, tags, graphs, previews and the homepage artifact. `toc.ts` extracts headings h2 to h4 by regex.
- **Depends on**: `content/` (cwd-relative `../content`), `public/previews.json`.
- **Used by**: every blog page and layout.
- **Notes**: fails closed for the homepage (`HP001`/`HP002`). Formats dates in Korean (`formatDateKo`).

### Homepage Composition
- **Location**: site/src/pages/index.astro (112 lines), site/src/lib/homepage.ts (143 lines)
- **Responsibility**: render the vault homepage note, replace the `<!-- profile:slot -->` line with `section.home-profile`, and replace the legacy "이번주에 작성된 포스트" section with "오늘 발행된 글" (posts published on the build date).
- **Depends on**: Site Data Layer, Markdown Render Pipeline, Profile Domain (homepage projection).
- **Styling**: a scoped `<style>` (index.astro:60) plus an `is:global` block (index.astro:95-112) that sets homepage links to `--c-accent-hover` with underline and the site title color, placed here because global.css is a review subject.
- **Accessibility hooks**: `section.home-profile` with `aria-labelledby="home-profile-heading"`; `nav.home-profile-actions` with `aria-label="프로필 바로가기"` linking Résumé and Portfolio.
- **Tests**: site/tests/unit/homepage-composition.test.ts, site/tests/pbt/u2/homepage-composition.pbt.test.ts, site/tests/e2e/homepage.spec.ts (axe on chromium, 320x800 and 1440x900, only `cdn.jsdelivr.net` allowed as an external host), site/tests/e2e/crossunit.spec.ts.

## Site Chrome and Layout Components

### BaseLayout
- **Location**: site/src/layouts/BaseLayout.astro (212 lines). It is a review subject.
- **Responsibility**: the document shell for every route.
  - `<html lang="ko" data-theme="">`, metadata, canonical, RSS, favicon
  - head resources from the route policy (lines 98-104), JSON-LD (105-111)
  - the ES5 theme bootstrap (112-169)
  - skip link "본문으로 건너뛰기", `.reading-progress`, Header, `<main id="main-content" class="site-main">`, Search (`client:idle`), Footer
  - `button.back-to-top` "↑"
  - the inline scroll script (183-203)
  - global CSS imports (207-212)
- **Depends on**: Header, Footer, Search Island, Profile Layout Policy, global.css, callouts.css, diagrams.css, search.css.
- **Used by**: all pages and the other layouts.
- **Styling**: `<style is:global>` with four `@import`s. Every blog and profile route receives those four files.
- **Constraints**: the inline scripts are pinned by SHA-256 in site/scripts/profile/asset-budget.mjs (`INHERITED_INLINE_SCRIPT_BASELINES`). Any edit to the bootstrap or scroll script fails `test:e2e` with `PROFILE_INLINE_SCRIPT_UNAPPROVED` until the baselines are updated. Inline scripts must stay ES5 (CLAUDE.md).

### Header
- **Location**: site/src/components/Header.astro (110 lines). It is a review subject.
- **Responsibility**: sticky site header.
  - Site title "obsidian-press" with the Lucide `Split` mark; `aria-current="page"` on `/`.
  - Desktop nav `nav.desktop-nav` (`aria-label="주요 탐색"`) from `getPrimaryNavigationState`, with icons Tags, Waypoints (Graph), FileText (Résumé) and BriefcaseBusiness (Portfolio), `aria-current`, and `data-testid="primary-navigation-link-<route>"`.
  - Search trigger with the Search icon, `aria-label="검색 열기"` and `<kbd>⌘K</kbd>`.
  - ThemeToggle (`client:load`).
  - Mobile cluster `.mobile-nav`: search icon button, a second ThemeToggle, and MobileNav.
- **Depends on**: lucide-static, navigation.ts, ThemeToggle Island, MobileNav.
- **Styling**: global.css (`.site-header`, `.site-title`, `.site-nav-link`, `.nav-icon` 16px, mobile swap at 767px) plus a scoped `<style>` for `.search-trigger` (Header.astro:76).
- **Accessibility hooks**: labelled nav, `aria-current` on the current item (colored with `--c-accent-hover` for contrast), nav icons `aria-hidden="true"`. The site-title and search-button icons have no `aria-hidden`.
- **Constraints**: unit tests require `nav.desktop-nav` and `nav.mobile-nav-dropdown` to link exactly `/tags`, `/graph`, `/resume`, `/portfolio` in that order with exactly one `aria-current` item. The navigation model itself is validated against an approved list. `⌘K` is shown on every platform even though Ctrl+K also works.

### Footer
- **Location**: site/src/components/Footer.astro (7 lines)
- **Responsibility**: "Built with" plus the `Split` icon plus "obsidian-press".
- **Styling**: global.css `.site-footer` (centered, muted, 0.85rem).
- **Notes**: no navigation, copyright or contact links. Hidden in résumé print.

### PostLayout
- **Location**: site/src/layouts/PostLayout.astro (92 lines)
- **Responsibility**: the reading layout for `/posts/<slug>`.
  - HubNav when the post has a hub parent.
  - `article` with `.post-header`: `h1.post-title`; `.post-meta` with the published date, "수정:" updated date, "N분 읽기" and `.post-tag` links.
  - `div.post-content` filled through `set:html` (with a SECURITY comment); RelatedPosts for non-hub posts; BacklinkList.
  - `aside.post-sidebar` with NavTree, TableOfContents and LocalGraph.
  - Five hoisted scripts; MobileSidebar.
- **Depends on**: Site Data Layer, Markdown Render Pipeline, Blog Content Components, NavTree Island, LocalGraph Island, MobileSidebar Island, Post Enhancement Scripts.
- **Styling**: frontmatter imports of post.css, link-preview.css, nav-tree.css and mobile-sidebar.css (bundled into the route CSS). Two columns at 960px and above with a sticky sidebar (`top: 3.5rem`).
- **Notes**: `.site-main:has(.post-layout)` widens the main column by `--sidebar-width`.

### HubLayout
- **Location**: site/src/layouts/HubLayout.astro (64 lines)
- **Responsibility**: hub index pages. HubNav, `.hub-header` with h1, HubProgress and tags, then a PostCard list. Empty state: "이 허브에 연결된 글이 아직 없습니다."
- **Styling**: scoped `<style>` (HubLayout.astro:42).

### Blog Content Components
- **Location**: site/src/components/

| Component | Lines | Role | Styling | Accessibility notes |
|---|---|---|---|---|
| PostCard.astro | 79 | Title link, date, two-line clamped summary (from previews), up to three tags | scoped; duplicates the `.post-tag` look | none specific |
| BacklinkList.astro | 25 | "이 페이지를 참조하는 글" list | post.css and global classes | heading-based |
| RelatedPosts.astro | 63 | "관련 글" list | scoped | none specific |
| TableOfContents.astro | 59 | `nav.toc` with h3 "목차" and depth classes; the active entry is highlighted by toc-highlight.ts | scoped (accent for active) | `aria-label="Table of contents"` is English on a Korean page |
| HubNav.astro | 83 | Breadcrumb to the hub plus previous and next siblings | scoped, with a `max-width: 479px` rule | `aria-label="Hub navigation"` is English |
| HubProgress.astro | 23 | "N개 글" count | scoped | none specific |

### Blog Pages
- **Location**: site/src/pages/404.astro, graph.astro, tags/index.astro, tags/[tag].astro, posts/[slug].astro, hubs/[slug].astro, rss.xml.ts. The homepage is under Homepage Composition.
- **Responsibility**:
  - 404: five most recent posts and a search button using `data-search-open`.
  - graph: h1 "그래프 뷰" and GraphView inside `.graph-container` (height `calc(100vh - 16rem)`).
  - tags: tag cloud.
  - tag: PostCard list.
  - posts and hubs: delegate to their layouts.
  - RSS feed.
- **Styling**: scoped `<style>` in 404, graph, tags/index and tags/[tag]. graph.astro also has an `is:global` block for the graph controls (pill radius 999px, `:focus-visible` outlines in the accent).
- **Tests**: none in a browser. These routes have no Playwright or axe coverage.

## Interactive Islands

### ThemeToggle Island
- **Location**: site/src/islands/ThemeToggle.tsx (133 lines); rendered twice by Header with `client:load`.
- **Responsibility**: toggle light and dark, persist `theme`, run sunrise and sunset auto-switching (Theme System).
- **Depends on**: lucide-preact `Sun` and `Moon` (size 16), solar.ts.
- **Styling**: inline style object (ThemeToggle.tsx:118-128). There is no class, so global hover and focus styles do not apply beyond the `:focus-visible` ring.
- **Accessibility hooks**: `aria-label` "Switch to dark mode" or "Switch to light mode" (English).
- **Notes**: both instances run their own geolocation request, solar fetch and boundary timer. `withTransition` adds `.theme-transitioning` for 350 ms.

### Search Island
- **Location**: site/src/islands/Search.tsx (181 lines), `client:idle` in BaseLayout; styles in site/src/styles/search.css.
- **Responsibility**:
  - Full-text search overlay opened by ⌘K or Ctrl+K, or by the `open-search` event (Header and 404 buttons); closed by Escape.
  - Lazily fetches `/search-index.json` (errors swallowed), 200 ms debounce, prefix binary search over sorted tokens, title boost, top 10 results.
  - Arrow keys and Enter move and open results through `window.location`.
- **Styling**: search.css (overlay `rgba(0,0,0,.5)`, modal max-width 560px, `.search-result.selected`, ellipsis snippets, `max-width: 479px` rule). `.search-input` sets `outline: none` with no replacement focus style.
- **Accessibility gaps**:
  - The input has no label.
  - The overlay has no `role="dialog"` or `aria-modal`, no focus trap and no focus return.
  - Results are `<li onClick>` without listbox or option semantics or an active-descendant link.
  - No ARIA attribute appears anywhere in the file.

### MobileNav
- **Location**: site/src/islands/MobileNav.tsx (32 lines). It is a review subject. Header renders it without a client directive, so it ships as static HTML.
- **Responsibility**: below 768px, show the primary navigation in a native disclosure:
  - `details.mobile-nav-disclosure` with `summary.mobile-nav-toggle`: `aria-label="주요 탐색 메뉴"`, visible text "메뉴", `data-testid="mobile-navigation-toggle"`.
  - `nav.mobile-nav-dropdown` (`aria-label="주요 탐색"`) with `data-testid="mobile-navigation-link-<route>"` links and `aria-current`.
- **Styling**: global.css:377-449. The toggle has `min-height: 2rem` (32 px), below the 44 pt target HIG recommends. The dropdown is absolutely positioned under the header. The current link uses `--c-accent`, which the code's own note measures at 3.59:1 in light mode.
- **Constraints**: site/tests/unit/profile-presentation.test.ts asserts the `details` is closed, has no `client` attribute and is not inside an `astro-island`. Obligation `NEG-NO-JS-MOBILE-ANCHORS` requires it to work without JavaScript.

### MobileSidebar Island
- **Location**: site/src/islands/MobileSidebar.tsx (134 lines), `client:visible` in PostLayout; styles in mobile-sidebar.css.
- **Responsibility**: below 960px, a floating button (`aria-label="목차 열기"`) opens an overlay card with two tabs, table of contents and navigation tree (lazy `/nav-tree.json`), and a close button (`aria-label="사이드바 닫기"`).
- **Styling**: mobile-sidebar.css (button `z-index: 90`, overlay `z-index: 200`, card max 400px, accent tab underline). `body:has(.mobile-sidebar-btn)` moves back-to-top to the left. Inline style objects for empty states.
- **Accessibility hooks**: `role="tablist"` (`aria-label="사이드바 탭"`), `role="tab"`, `role="tabpanel"` with Korean labels.
- **Accessibility gaps**: no arrow-key tab switching, no dialog semantics, no focus management for the overlay.

### NavTree Island
- **Location**: site/src/islands/NavTree.tsx (47 lines) and TreeNodeItem.tsx (68 lines), `client:visible` in the post sidebar; nav-tree.css.
- **Responsibility**: render the hub navigation tree from `/nav-tree.json` (errors swallowed) under an h3 "탐색" and highlight the current post.
- **Styling**: nav-tree.css (active link fallback color `#2563eb`), inline chevron rotation (TreeNodeItem.tsx:21).
- **Accessibility gaps**: the toggle `aria-label` is "Collapse" or "Expand" (English) with no `aria-expanded`. The tree has no tree or group semantics.

### GraphView Island
- **Location**: site/src/islands/GraphView.tsx (270 lines), `client:load` on `/graph`; helpers in site/src/lib/graphUtils.ts and graphSim.ts.
- **Responsibility**: interactive force-directed graph of all notes.
  - d3 SVG with zoom 0.2 to 4 and drag; node radius 4 to 12 by backlink count; colors by category tag; 11px labels with zoom-dependent opacity.
  - Hover, search and legend emphasis; settles 300 ticks, then fits.
  - MutationObserver repaint on theme change.
- **Styling**: graph.astro scoped and global styles; colors hardcoded in graphUtils.ts (os, web, db, network, hub, default).
- **Accessibility hooks**: `input.graph-search` (`aria-label="그래프에서 노트 검색"`), `role="status"` match count, legend chips with `aria-pressed` inside `role="group"` (`aria-label="그래프 범례 및 필터"`), SVG `role="img"` with a Korean label.
- **Accessibility gaps**: nodes are not keyboard reachable, so navigation through the graph is pointer-only. The color legend relies on hue.
- **Tests**: site/tests/unit/graph-view.test.ts (helpers only).

### LocalGraph Island
- **Location**: site/src/islands/LocalGraph.tsx (142 lines), `client:visible` in the post sidebar.
- **Responsibility**: 240 px canvas showing the 2-hop neighborhood; click to navigate.
- **Styling**: reads `--c-accent`, `--c-text` and `--c-border` through `getComputedStyle`; font hardcoded to `10px sans-serif`; inline-styled h3 "로컬 그래프".
- **Accessibility hooks**: canvas `role="img"` with a Korean `aria-label`. Pointer-only interaction.

## Client Enhancement Scripts

### Post Enhancement Scripts
- **Location**: site/src/scripts/, imported as hoisted `<script>` modules in PostLayout.astro:76-90.

| Script | Lines | Behavior | Accessibility notes |
|---|---|---|---|
| copy-button.ts | 44 | Wraps each `pre.shiki` in `.code-block-wrapper` and adds `button.copy-btn` with an inline SVG built through `innerHTML`; clipboard errors swallowed | `aria-label` "Copy code" (English); visible on hover or `:focus-visible` |
| link-preview.ts | 160 | Desktop: 300 ms hover shows a 280px card for `/posts/` links from `/previews.json`. At 767px and below, taps are intercepted and a bottom sheet with "방문 →" opens, so navigation takes two taps. Builds content with `textContent` | no keyboard or focus trigger |
| toc-highlight.ts | 18 | IntersectionObserver (`rootMargin: -64px 0px -80% 0px`) marks the active TOC entry | none |
| heading-fold.ts | 55 | Prepends `button.heading-fold-toggle` (▶) to each h2 and h3 and hides the following siblings when collapsed | `aria-label="섹션 접기/펼치기"`, no `aria-expanded` |
| diagram-wrap.ts | 7 | Wraps diagrams in `.diagram-wrapper` for horizontal scrolling | none |

### Inline Layout Scripts
- **Location**: BaseLayout.astro:105-111 (JSON-LD), 112-169 (theme bootstrap), 183-203 (reading progress and back-to-top); Header.astro:68-74 (hoisted `data-search-open` dispatcher).
- **Responsibility**: no-flash theming, scroll progress, back-to-top visibility past 400 px with smooth scrolling, search opening.
- **Constraints**: the asset budget lists six exact inline script baselines (type, byte length, SHA-256; for example 2,311, 130, 3,483, 316 and 769 byte classic scripts and one 149 byte module) that profile routes may contain. Changing any of them, or adding one, fails `test:e2e`. The progress bar animates `width` on every scroll event.

## Presentation Systems

### Theme System
- **Location**: site/src/styles/global.css:2-32 and 338-344 (tokens and transition), site/src/layouts/BaseLayout.astro:112-169 (bootstrap), site/src/islands/ThemeToggle.tsx, site/src/lib/solar.ts (212 lines), site/src/styles/diagrams.css (crossfade), site/src/lib/graphSim.ts (`observeThemeChange`). Token values are in code-structure.md.
- **Resolution order at first paint** (bootstrap):
  1. If a manual override and today's sunrise data both exist, keep the saved `theme` unless a sunrise or sunset boundary has passed or the override is older than 24 hours. In that case, clear the override and use the solar theme.
  2. Otherwise, if today's sunrise data exists, use light between sunrise and sunset and dark otherwise.
  3. Otherwise use the saved `theme`, or dark when the OS prefers dark. If nothing applies, no attribute is set and light tokens apply.
- **After hydration** (each ThemeToggle):
  - The initial state is the saved theme or the OS preference, then it is saved to `localStorage` immediately. From then on, the OS appearance is never consulted again, and OS appearance changes are not observed.
  - The island requests geolocation if none is cached or denied, fetches sunrise and sunset times, applies the solar theme unless overridden, and schedules a boundary timer (at least 60 s) that clears the manual override and refreshes.
- **Rendering**: `[data-theme="dark"]` token overrides; `html.theme-transitioning` 300 ms color transitions; diagram pairs crossfade; the graph islands repaint via MutationObserver or computed styles; Shiki switches between its light and dark variables.
- **HIG relevance**: Apple's guidance is to respect the system appearance setting. Here, location and time drive the appearance, a location prompt appears without context, and the logic is duplicated across ES5 and TypeScript. The profile verification matrix seeds the theme through `localStorage` (site/tests/e2e/support/profile-page.ts `applyTheme`), so changing the mechanism affects those tests as well.

### Font Loading
- **Blog and legacy routes**:
  - `<link rel="preconnect" href="https://cdn.jsdelivr.net">` and the Pretendard Variable 1.3.9 dynamic-subset stylesheet from jsDelivr, plus KaTeX 0.16.22 CSS (and its fonts) from jsDelivr, all through `LEGACY_BASE_LAYOUT_RESOURCES` (site/src/lib/layout/profile-resources.ts:49-69).
  - `--font-body` is `"Pretendard Variable", "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif`.
- **Profile routes**:
  - No head resources. profile/font.css imports `site/.generated/profile-font/pretendard-profile.css`, which font-materializer.mjs produces from the `pretendard` npm package.
  - The package is verified against `font-allowlist.json` (package sha512 integrity, OFL license, 92 WOFF2 subsets with sha256, CSS URL order, weight range `45 920`) and renamed to the family `RVNNT Profile`. Vite emits the subsets as hashed WOFF2 assets and keeps the OFL header.
- **Code font**: `--font-code` names JetBrains Mono, which no route loads, so code renders in `ui-monospace`, `SFMono-Regular`, Menlo or monospace. On Apple platforms that means SF Mono.
- **Constraints**:
  - The profile request ledger must observe at least one `.woff2` request.
  - The PDF renderer requires a `font/woff2` response and `document.fonts.check('10pt "RVNNT Profile"')`.
  - Profile routes must not request `cdn.jsdelivr.net` (asserted in unit and e2e tests).
  - The homepage e2e test allows only `cdn.jsdelivr.net` as an external host.

### Icon Sources

| Source | Where | Icons | Notes |
|---|---|---|---|
| lucide-static ^1.8.0 (build-time SVG strings via `set:html`) | Header.astro, Footer.astro | Split (site mark), Tags, Waypoints, FileText, BriefcaseBusiness, Search | 16px through `.nav-icon svg` |
| lucide-preact ^1.8.0 | ThemeToggle.tsx | Sun, Moon | size 16 |
| Lucide SVG data URIs used as CSS `mask-image` | callouts.css | one per callout type group | color comes from the callout border variable |
| Inline SVG markup | copy-button.ts | copy and check glyphs | built with `innerHTML` |
| Unicode glyphs | BaseLayout (↑ back-to-top), heading-fold.ts and callouts.css (▶), PortfolioContent.astro (↘, `aria-hidden`), resume.css (+ and − markers), link-preview.ts (→ in "방문 →"), Header (⌘K) | n/a | mixed with SVG icons |
| Favicon | site/public/favicon.svg (Lucide split glyph with `currentColor`), favicon.ico | n/a | no apple-touch-icon or manifest |

HIG relevance: SF Symbols cannot be licensed for the web, so the Lucide set is the practical analogue. The site mixes three icon delivery mechanisms and several Unicode glyphs.

### Accessibility Hooks
- **Global**:
  - The skip link `a.skip-link` to `#main-content` slides in on focus. It is white text on `--c-accent`, about 3.7:1 in light and about 1.9:1 in dark (computed from the token values).
  - Global `:focus-visible` ring: 2px solid `--c-accent`, offset 2px.
  - `prefers-reduced-motion` override (global.css:329-336).
  - `lang="ko"` on `<html>`.
  - `aria-hidden` on the progress bar.
  - Labelled navigation landmarks: "주요 탐색", "프로필 탐색", "직무별 포트폴리오", "프로젝트 바로가기", "프로필 바로가기".
- **Testing hooks**: `data-testid` attributes on navigation, profile shell, contact actions, résumé entries and case studies. The `data-profile-*` attributes are part of the profile parity contract (code-structure.md).
- **Language mix**: English labels on a Korean page in ThemeToggle, TreeNodeItem, TableOfContents ("Table of contents"), HubNav ("Hub navigation") and copy-button ("Copy code"). Visible English navigation labels: Tags, Graph, Résumé, Portfolio.
- **Known contrast note**: blog links use `--c-accent`. The code's own comment (global.css:217-219) records 3.59:1 on the light background, and only the homepage and the current desktop nav item use the darker `--c-accent-hover`. The detailed gap list is in code-quality-assessment.md.

## Profile Components

### Profile Domain
- **Location**: site/src/lib/profile/ (18 modules, about 13,350 lines as of 2026-10-21; largest validation.ts 1,881, resume-evidence.ts 1,754, fact-approval.ts 1,541, resume-receipts.ts 1,437, resume-manifest.ts 1,387, production-profile.ts 1,114)
- **Responsibility**: approved profile facts and their guarantees.

| Module group | Modules | Role |
|---|---|---|
| Data and types | profile-data.ts, types.ts | approved identity, narrative, contact, skills, experience (hansono), projects (docsuri, mcp-local-reference, obsidian-custom-publish, adiubear), education (sogang-university), certifications (`opic-ih` OPIc IH, period 2025-09 to 2025-09; `hsk-6` 新HSK 6급, period 2024-09 to 2024-09; no issuers, details or evidence links); branded types. Periods use only `year` and `year-month` points (code-structure.md, Profile Period Model) |
| Validation and normalization | validation.ts, normalization.ts, issues.ts | 3 to 6 projects, 1 to 6 résumé projects, kebab IDs, order and period rules; trim, LF and NFC normalization; diagnostics |
| Approval | fact-approval.ts, production-profile.ts | receipt `profile-fact-approval-2026-09-27-r2`, 120 facts mapped to evidence E01 to E15, cached `getProductionProfileAssembly`, `assertNoProfileApprovalLeak` |
| Projection | assembly.ts, selectors.ts, portfolio-roles.ts | per-surface projections (résumé, portfolio, homepage, metadata, PDF); role editions select fact IDs |
| Metadata | metadata.ts | titles, descriptions, canonical, Open Graph, JSON-LD |
| Documents and evidence | document-boundary.ts, current-resume-document.ts, resume-manifest.ts, resume-evidence.ts, resume-receipts.ts, canonical-digest.ts | `/resume.pdf` link boundary ("PDF 이력서 다운로드"), current-release check, fact manifest, four-surface parity (manifest, web, print, PDF), receipts with 11 manual review items and machine checks (A4, 12 mm, at least 10 pt, line-height at least 1.35, woff2, loopback), TLV canonical digests through WebCrypto |
| Barrel | index.ts | public exports |

- **Used by**: Profile Pages, Homepage Composition, Profile Build Integration, Verification Provider, Resume PDF Release.
- **Constraint for the redesign**: copy and fact changes require a new approval receipt. The period display is parsed back for PDF parity (resume-evidence.ts:813-840 as of 2026-10-21).
- **Constraints for the certifications intent (2026-10-21)**:
  - A day precision is rejected at validation (`period.precision`), at approval (`isDatePoint`), at manifest serialization (throws) and at PDF parsing (`null`), until each layer learns it.
  - `Certification` has no category, so a separate `자격증` section needs either a category field or a new collection with its own entity kind and canonical path. Either option changes the source-shape key lists in production-profile.ts (lines 592 and 616), the structural decisions and the canonical digest.
  - selectors.ts:58-61 omits `certifications` from the résumé projection when the list is empty, and presentation.ts adds the section only when it is present.

### Profile Presentation
- **Location**: site/src/components/profile/ (presentation.ts plus 10 Astro components)
- **Responsibility**: render the résumé and portfolio from renderer-neutral view models.

| Component | Role and markup |
|---|---|
| presentation.ts | View models (621 lines). Section headings are literal types: 프로필, 핵심 역량, 경력·대표 성과 (with 경력 and 대표 성과 groups), 프로젝트, 학력, 어학 자격 (the `certifications` kind, lines 189-193 and 310-318), 대표 프로젝트. Case-study dimensions 문제, 역할, 핵심 결정, 구조, 결과, 배운 점. `CertificationView` carries title, optional issuer, optional period, details and evidence (lines 149-157). Period text `start – end` with raw point values and 현재 for present (lines 603-617) |
| ProfileShell.astro | `.profile-shell-<route>` wrapper with the h1 label and local navigation |
| ProfileLocalNavigation.astro | `nav.profile-local-navigation` (`aria-label="프로필 탐색"`): 홈, Résumé, Portfolio |
| PortfolioRoleNavigation.astro | `nav.portfolio-role-navigation` (`aria-label="직무별 포트폴리오"`): Data Engineer / AI, Product Engineer, Infra Engineer |
| ContactActions.astro | `role="group"` with a label; links carry `data-profile-*` attributes |
| ContentBlocks.astro, ContentText.astro | paragraphs, lists, `h5.profile-content-subtitle` topic labels |
| CaseStudy.astro | `article#project-<id>` with six dimensions; key decisions, architecture and lessons in `details.case-study-details` ("… 자세히 보기") when they have more than one block; decorative numbers `aria-hidden` |
| PortfolioContent.astro | intro, eyebrow, summary, `nav.portfolio-project-navigation` ("프로젝트 바로가기") with ↘ arrows, case studies |
| ResumeContent.astro, ResumeEntry.astro | résumé sections; entries as `details` whose summary holds `span.resume-entry-heading` with `role="heading" aria-level="4"`. ResumeContent dispatches on `section.kind` with a ternary chain whose final `else` renders certifications as `section.resume-certifications[data-profile-section="certifications"]` with `article.resume-certification-entry` (title as h3, issuer as `p`, period as `p.profile-period`). Any unhandled kind would fall into that branch |

- **Styling**: only the five profile stylesheets plus the shared global CSS. Component-local CSS is rejected by the asset budget (`PROFILE_CSS_SOURCE_UNAPPROVED`).
- **Constraints**: unit tests pin the class names, heading texts, heading order, closed disclosures, `aria-label` and `aria-current` values, the absence of em dashes in case studies, and the absence of `<form>`. E2E specs pin responsive behavior (no overflow, clipping, ellipsis or line clamp), print, axe, keyboard and focus.

### Profile Pages
- **Location**: site/src/pages/resume.astro (36 lines as of 2026-10-21), portfolio.astro (31), portfolio/[role].astro (39)
- **Responsibility**: assemble shell, content, metadata and JSON-LD per route. `/resume` also decides whether to show the PDF link (`getCurrentResumeDocumentLink`).
- **Styling**: frontmatter imports. `/resume` uses font.css, foundation.css, resume.css and print.css. The portfolio routes use font.css, foundation.css and portfolio.css.
- **Notes**: resume.astro and portfolio.astro are review subjects. Since the HIG redesign both pass `surface="grouped"` to BaseLayout. `infra-engineer` is committed and live (it was uncommitted work at the 2026-10-19 scan). resume.astro composes `getProductionProfileAssembly()`, `buildApprovedResumeMetadata`, `getCurrentResumeDocumentLink` and `buildResumePresentation`. The role pages render case studies only, never certifications or education.

### Profile Fact Approval Chain
- **Location**: site/src/lib/profile/fact-approval.ts (1,541 lines), site/src/lib/profile/production-profile.ts (1,114), site/verification/profile/fact-approval.json, docs/resume/product-engineer/inventory-r7.json and inventory-r8.json, docs/resume/product-engineer/revision-r7.md and publication-record.md
- **Responsibility**: make the build refuse any profile fact that a human-authorized receipt does not cover.
  - fact-approval.ts collects every fact into `MaterializedFact` records with a canonical path, normalized value, target surfaces and requirement. Certifications target `resume` and `pdf` and are `optional`. It verifies the value kinds, including `isCanonicalPeriod`.
  - production-profile.ts checks the exact source shape and validates the profile. It assigns each fact to one evidence source through `createEvidenceMembership` (lines 882-1000) and builds the review records stamped with the receipt's decision. It then computes three digests: `approvedRecordsDigest`, `materializedProfileDigest` over the facts plus `deriveStructuralDecisions` (lines 709-786), and `productionDiffDigest`. It requires all three to equal the receipt, and the receipt to equal `EXPECTED_RECEIPT` (lines 40-52) key for key.
  - The inventory digest is not recomputed in the build. It is pinned, and its input is the tracked inventory JSON.
- **Current state**:
  - Receipt `profile-fact-approval-2026-09-27-r2`, inventory `profile-facts-r8`, 120 facts, evidence sources E01–E15.
  - Certification facts: `certification-opic-ih-title`, `certification-opic-ih-period`, `certification-hsk-6-title` and `certification-hsk-6-period`, all in the E01 group (lines 900-919). E01 is the user-provided 2025 portfolio PDF.
- **Change procedure** (revision-r7.md and publication-record.md):
  1. Edit profile-data.ts and the evidence membership. Add an evidence source when a new justification is needed.
  2. Save the new inventory JSON (`inventory-r<N>.json`) and compute its digest with `productionProfileTesting.canonicalDigest` (equivalently, the SHA-256 of the sorted-key compact JSON).
  3. Compute the other digests.
  4. Pin all values in `EXPECTED_RECEIPT` and fact-approval.json with a new receipt ID, decision audit ID and timestamp.
  5. Update `EXPECTED_MATERIALIZED_DIGEST` and the fact count in site/tests/unit/production-profile.test.ts.
  6. Record the revision in docs/resume/product-engineer/.
- **Used by**: Profile Build Integration (every build), Profile Pages, Homepage Composition, Resume PDF Release (compiled copy).
- **Constraints**: neither file is an accessibility review subject. A wrong digest fails every `astro build`, including blog-only builds, through the build integration.

### Profile Layout Policy
- **Location**: site/src/lib/navigation.ts (345 lines), site/src/lib/layout/profile-resources.ts (355), site/src/lib/layout/json-ld.ts (495). All are review subjects (navigation.ts by name, lib/layout by directory).
- **Responsibility**: approved primary and profile-local navigation models with current-state derivation; route resource policy (legacy CDN set versus profile none); safe JSON-LD serialization with a round-trip check.
- **Used by**: Header, MobileNav, ProfileLocalNavigation, BaseLayout, profile pages.

## Build, Verification and Release Tooling

### Profile Build Integration
- **Location**: site/scripts/profile/astro-profile-integration.mjs (525 lines), font-materializer.mjs (1,494), font-allowlist.json
- **Responsibility**:
  - `astro:config:setup`: validate the production profile and materialize the font. This runs on every build and dev start, including blog-only work.
  - `astro:build:setup`: when `PROFILE_VERIFICATION_BUILD=1`, add page-graph and provenance plugins.
  - `astro:build:done`: write the private build manifest (verification builds only) and always run `assertNoProfileApprovalLeak`.

### Verification Provider
- **Location**: site/scripts/profile/verification-provider.mjs (3,847 lines), asset-budget.mjs (1,730), request-ledger.mjs (669), accessibility-review-contract.mjs (105), clean-profile-build.mjs (931), preview-supervisor.mjs (1,395), startup-retry.mjs (779), owned-process-registry.mjs (977), owned-node-bootstrap.mjs (339), browser-launch-preflight.mjs (163), profile-paths.mjs (267)
- **Responsibility**: `npm run test:e2e`, the evidence-bound verification described in architecture.md. Its gates:
  - **Asset budget**: profile CSS at most 24 KiB gzip; approved CSS roots only; no new profile client JavaScript; the inherited islands are limited to the Preact client, Search and ThemeToggle; exact inline style and script baselines; no external resources.
  - **Request ledger**: loopback only, and `.css` and `.woff2` must be observed.
  - **Browser matrix**: 48 keys over 6 required spec files and 10 obligations.
  - **Link and metadata evidence**.
  - **Manual accessibility record**: 16 states (`/resume` and `/portfolio` x 320x800 and 1440x900 x light and dark x details closed and all-open) bound to the review-subject digest. The digest covers authored source plus node, astro, vite, playwright and axe versions.
- **Review subjects** (accessibility-review-contract.mjs:81-111, 2026-10-21):
  - astro.config.mjs, package-lock.json, package.json, the contract file itself
  - astro-profile-integration.mjs, clean-profile-build.mjs, preview-supervisor.mjs, profile-paths.mjs, request-ledger.mjs
  - Header.astro, MobileNav.tsx, BaseLayout.astro, navigation.ts, portfolio.astro, resume.astro
  - base.css, chrome.css, fonts.css, global.css, tokens.css
  - every file under src/components/profile, src/lib/layout and src/styles/profile

  site/src/lib/profile is deliberately not a subject.
- **Current state (2026-10-21)**: site/verification/profile/manual-web-accessibility.json holds a 16-state record by 조준희, `reviewedAt` 2026-10-21T11:05:26.512Z, result `pass`. It is modified but uncommitted on branch `chore/manual-a11y-review`. Whether its digest matches the current subjects was not recomputed in this scan. Any edit to presentation.ts, ResumeContent.astro, resume.css, print.css or resume.astro invalidates it. The 2026-10-19 note that the record had a 12-state shape is superseded.
- **Scope gap**: the asset budget analyzes `/resume` and `/portfolio` only. The role editions are not analyzed.

### Resume PDF Release
- **Location**: site/scripts/profile/cli.mjs (364 lines), resume-coordinator.mjs (298), pdf-renderer.mjs (720), pdf-inspector.mjs (689), pdf-viewer.mjs (156), release-store.mjs (1,282), compile-profile-tools.mjs (365); tracked outputs site/public/resume.pdf and site/verification/resume/current-release.json
- **Responsibility**: prepare a private PDF candidate from a clean build of `/resume`.
  - Render: A4, 12 mm margins, `preferCSSPageSize`, tagged with an outline, no backgrounds.
  - Inspect it against the fact manifest and write a local review page.
  - After a human review of the exact SHA, promote it through a journaled state machine with snapshot and rollback (sequence in architecture.md).
- **Constraints**: the renderer hides `SCREEN_ONLY_SELECTORS` (`.site-header`, `.site-footer`, `.profile-local-navigation`, `.reading-progress`, `.skip-link`, `[data-profile-action-kind="document"]`) and checks the print contract. A redesign that renames chrome classes must update these selectors and print.css together.

### Test Tooling
- **Location**: site/scripts/profile/pbt-runner.mjs (319 lines), site/tests/pbt/u1/setup.ts, site/scripts/crossunit/link-sweep.mjs and ensure-fixture-content.mjs, site/scripts/profile/homepage-fixture-content.mjs, site/tests/e2e/support/ (matrix.ts, profile-page.ts, environment.ts, evidence.ts, global setup and teardown), site/tests/obligations/u1-profile.json
- **Responsibility**: seedable and replayable property runs; fixture homepage content for builds without a vault; link sweep over a built site; Playwright helpers that seed the theme and disclosure states and detect overflow and clipping; the obligation map tying each requirement ID to one canonical test.

## Delivery and Hosting

### Local Static Server
- **Location**: site/scripts/local-server.mjs (150 lines); launchd service `dev.rvnnt.blog` and Cloudflare Tunnel `dev.rvnnt.tunnel` (both outside the repository)
- **Responsibility**: serve the web root with clean URLs, 404 handling, gzip and cache headers (contract in api-documentation.md).
- **Notes**: no security headers beyond `nosniff`.

### Delivery Pipeline
- **Location**: Justfile, Jenkinsfile (job `obsidian-blog-develop`, cron `H 0 * * *`)
- **Responsibility**: nightly verify, preprocess with date stamping, build and deploy (sequence in architecture.md).
- **Notes**: the e2e verification and the crossunit gate are not part of the pipeline. Defaults hardcode the maintainer's home paths.
