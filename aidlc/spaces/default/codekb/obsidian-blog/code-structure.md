# Code Structure: obsidian-blog

> **Freshness (2026-10-21).** The profile sections below were refreshed by the focused `resume-certifications` scan at commit `96a6066`. Everything outside the profile subsystem comes from the 2026-10-19 full scan at `265b38a`, before the HIG redesign merged. It is stale in places: the theme system, tokens, fonts, chrome and the blog e2e coverage have changed since (see CLAUDE.md). The scope block in reverse-engineering-timestamp.md records which paths were verified.

This artifact owns these inventories: the repository layout, the file classification, the stylesheet inventory and loading, design tokens, breakpoints, motion, print styles, and the emitted HTML class contract. Components and their styling approach are in component-inventory.md. Routes are in api-documentation.md.

## Repository Layout

```text
obsidian-blog/
├── CLAUDE.md                      operational runbook (hosting, gotchas, commands)
├── Justfile                       11 recipes: preprocess, build, dev, deploy, serve, test, crossunit, ...
├── Jenkinsfile                    nightly build of develop, optional deploy
├── preprocessor/                  Rust crate obsidian-press (edition 2024)
│   ├── Cargo.toml, Cargo.lock
│   ├── src/                       17 modules, about 3,500 lines
│   ├── tests/                     16 integration test files plus common/ and a proptest regression file
│   └── .astro/                    stray generated Astro type stubs (tracked)
├── fixtures/vault/                13 markdown fixtures plus attachment/test-image.png
├── site/                          Astro 6 project (npm package "site")
│   ├── astro.config.mjs           static output, preact, sitemap, profile build integration
│   ├── src/
│   │   ├── pages/                 11 route sources (see api-documentation.md)
│   │   ├── layouts/               BaseLayout, PostLayout, HubLayout
│   │   ├── components/            8 blog components plus profile/ (10 Astro components and presentation.ts)
│   │   ├── islands/               8 Preact .tsx files
│   │   ├── scripts/               5 client enhancement scripts for post pages
│   │   ├── lib/                   data, render, homepage, navigation, solar, graph helpers, layout/, profile/
│   │   └── styles/                8 blog stylesheets plus profile/ (5 stylesheets)
│   ├── scripts/
│   │   ├── local-server.mjs       production static server
│   │   ├── crossunit/             link sweep and fixture content for the U3 gate
│   │   └── profile/               verification, font, PDF release and process-supervision tooling (33 files)
│   ├── tests/                     unit/, pbt/, e2e/, fixtures/, obligations/
│   ├── verification/              tracked human-gate records (profile/, resume/)
│   └── public/                    favicon.svg, favicon.ico, robots.txt, resume.pdf (+ generated JSON and assets, ignored)
├── docs/                          plans/, superpowers/, project/, portfolio/, resume/
├── tmp/pdfs/                      tracked scratch: PDF text extracts, export script, PNG renders
└── output/pdf/                    tracked scratch: two exported PDFs
```

Directories that are ignored or generated are listed under Generated and Derived Files below.

## Module Organization

### Preprocessor (preprocessor/src)

| Module | Lines | Pass and role |
|---|---|---|
| main.rs | 72 | CLI entry (`clap`). Runs scan, catalog build, reference validation, link, transform, search, output, then fails on diagram failures |
| lib.rs | 15 | Re-exports modules for the integration tests |
| types.rs | 83 | `Post`, `Link`, vault index types |
| scanner.rs | 372 | Pass 1: walk the vault (skips dotfiles and `Drafts`), parse frontmatter (`serde_yml`), slug from filename, heading and block maps, batched `git log` for `updated`, `stamp_published_dates` |
| catalog.rs | 271 | Publication boundary: `visibility` scope, single homepage, homepage transclusion checks, diagnostics `PUB001`–`PUB007` |
| linker.rs | 81 | Pass 2: wikilink resolution, backlinks, forward links, graph edges |
| related.rs | 114 | Related posts (+2 shared tag, +3 link, +1 same hub, top 5) through an inverted index |
| transform.rs | 826 | Pass 3: frontmatter and comment stripping, image embeds, transclusions, wikilinks, hub dates, block anchors, highlights, callouts, diagram blocks (all regex transforms skip fenced code) |
| hub_dates.rs | 410 | `@YYYY-MM-DD` hub child dates to `<time class="hub-child-date">` (25 tests) |
| mermaid.rs | 175 | `mmdc` invocation with injected theme, light and dark |
| d2.rs | 215 | `d2` invocation, theme pairs (light `0`, dark `200`), output formats |
| typst_render.rs | 34 | `typst compile` to SVG |
| syntax.rs | 91 | Shared `LazyLock` regexes (`WIKILINK_RE`, `BLOCK_ID_RE`, ...) and `frontmatter_range()` |
| search.rs | 183 | Pass 4: Lindera KoDic tokens (2+ characters), title weight 2, `BTreeMap` inverted index, 200-character snippets |
| preview.rs | 100 | First sentence or 150 characters per post |
| nav_tree.rs | 130 | Hub tree roots and orphans |
| output.rs | 331 | Pass 5: clean managed namespaces, write posts, meta, assets, homepage, JSON artifacts, manifest |

### Site source (site/src)

| Directory | Contents | Notes |
|---|---|---|
| pages/ | `index.astro`, `404.astro`, `graph.astro`, `resume.astro`, `portfolio.astro`, `portfolio/[role].astro`, `posts/[slug].astro`, `hubs/[slug].astro`, `tags/index.astro`, `tags/[tag].astro`, `rss.xml.ts` | Build-time route handlers |
| layouts/ | `BaseLayout.astro` (212 lines), `PostLayout.astro` (92), `HubLayout.astro` (64) | BaseLayout owns head, theme bootstrap, chrome and global CSS |
| components/ | `Header`, `Footer`, `PostCard`, `BacklinkList`, `RelatedPosts`, `TableOfContents`, `HubNav`, `HubProgress` | Astro, mostly scoped styles |
| components/profile/ | `ProfileShell`, `ProfileLocalNavigation`, `PortfolioRoleNavigation`, `ContactActions`, `ContentBlocks`, `ContentText`, `CaseStudy`, `PortfolioContent`, `ResumeContent` (175 lines), `ResumeEntry`, `presentation.ts` (621 lines, 2026-10-21) | No component-local CSS (enforced by the asset budget). The whole directory is an accessibility review subject |
| islands/ | `ThemeToggle`, `Search`, `MobileNav`, `MobileSidebar`, `NavTree`, `TreeNodeItem`, `GraphView`, `LocalGraph` | Preact. `MobileNav` is rendered without hydration |
| scripts/ | `copy-button.ts`, `link-preview.ts`, `toc-highlight.ts`, `heading-fold.ts`, `diagram-wrap.ts` | Hoisted `<script>` modules in PostLayout |
| lib/ | `data.ts`, `render.ts`, `homepage.ts`, `navigation.ts` (345), `solar.ts` (212), `graphUtils.ts`, `graphSim.ts`, `toc.ts`, `types.ts` | Build-time data and shared client helpers |
| lib/layout/ | `profile-resources.ts` (355), `json-ld.ts` (495) | Head resource policy per route, safe JSON-LD serialization |
| lib/profile/ | 18 modules, about 13,350 lines (2026-10-21) | Profile domain and fact-approval chain (see component-inventory.md and Profile Period Model below). Not an accessibility review subject |
| styles/ | `global.css`, `callouts.css`, `diagrams.css`, `search.css`, `post.css`, `link-preview.css`, `nav-tree.css`, `mobile-sidebar.css`, `profile/{font,foundation,resume,portfolio,print}.css` | Inventory below |

### Site tooling (site/scripts)

- `local-server.mjs` (150 lines): production server (see api-documentation.md).
- `crossunit/link-sweep.mjs`, `crossunit/ensure-fixture-content.mjs`: U3 cross-unit gate helpers.
- `profile/` (33 files; the 22 `.mjs` modules total about 13,270 lines as of 2026-10-21, verification-provider.mjs 3,412): `cli.mjs` command router; `verification-provider.mjs` (3,847 lines); `asset-budget.mjs`; `request-ledger.mjs`; `accessibility-review-contract.mjs`; `astro-profile-integration.mjs`; `font-materializer.mjs` with `font-allowlist.json`; `clean-profile-build.mjs`; `preview-supervisor.mjs`; `startup-retry.mjs`; `owned-process-registry.mjs`; `owned-node-bootstrap.mjs`; `browser-launch-preflight.mjs`; `compile-profile-tools.mjs`; `pbt-runner.mjs`; `resume-coordinator.mjs`; `pdf-renderer.mjs`; `pdf-inspector.mjs`; `pdf-viewer.mjs`; `release-store.mjs`; `profile-paths.mjs`; `homepage-fixture-content.mjs`; `.d.mts` declarations for typed imports from tests.

### Tests

The test inventory and coverage are owned by code-quality-assessment.md. Layout: Rust unit tests inline in preprocessor/src, Rust integration tests in preprocessor/tests/, Vitest suites in site/tests/unit/ and site/tests/pbt/, and Playwright specs in site/tests/e2e/ with support/ helpers.

## File Classification

| Category | Files |
|---|---|
| Model/Entity | preprocessor/src/types.rs; site/src/lib/types.ts; site/src/lib/profile/types.ts; site/src/lib/profile/profile-data.ts (approved data) |
| Controller/Handler | preprocessor/src/main.rs; site/src/pages/**; site/scripts/profile/cli.mjs; site/scripts/local-server.mjs |
| Service/UseCase | preprocessor/src/{scanner,catalog,linker,related,transform,hub_dates,search,preview,nav_tree,output}.rs; site/src/lib/{render,homepage,navigation}.ts; site/src/lib/profile/{validation,assembly,selectors,metadata,fact-approval,production-profile,resume-manifest,resume-evidence,resume-receipts,current-resume-document,document-boundary,portfolio-roles}.ts; site/src/components/profile/presentation.ts; site/scripts/profile/{verification-provider,asset-budget,resume-coordinator,pdf-renderer,pdf-inspector,pdf-viewer,clean-profile-build}.mjs |
| Repository/DAO | site/src/lib/data.ts (reads content/); site/scripts/profile/release-store.mjs (journal, lock, receipts); site/scripts/profile/font-materializer.mjs (generated font store) |
| Utility/Helper | preprocessor/src/syntax.rs; site/src/lib/{graphUtils,graphSim,solar,toc}.ts; site/src/lib/profile/{normalization,canonical-digest,issues,index}.ts; site/src/lib/layout/json-ld.ts; site/scripts/profile/{profile-paths,owned-process-registry,owned-node-bootstrap,startup-retry,preview-supervisor,browser-launch-preflight,compile-profile-tools}.mjs |
| Configuration | preprocessor/Cargo.toml; site/package.json; site/astro.config.mjs; site/tsconfig.json; site/tsconfig.profile-tools.json; site/vitest.config.ts; site/vitest.pbt.config.ts; site/playwright.config.ts; site/playwright.crossunit.config.ts; Justfile; Jenkinsfile; site/scripts/profile/font-allowlist.json; site/src/lib/layout/profile-resources.ts (route resource policy) |
| Middleware | site/scripts/profile/astro-profile-integration.mjs (Astro build hooks); site/scripts/profile/request-ledger.mjs (request interception during tests) |
| Test | preprocessor/src (inline), preprocessor/tests/; site/tests/**; fixtures/vault/; site/scripts/profile/pbt-runner.mjs; site/scripts/crossunit/; site/scripts/profile/homepage-fixture-content.mjs |
| Migration | none |
| Static/Asset | site/src/styles/**; site/src/layouts/**; site/src/components/**/*.astro; site/src/islands/**; site/src/scripts/**; site/public/** |

## Presentation Surface Structure

### Stylesheet Inventory and Loading

| Stylesheet | Lines | Loaded by | Mechanism | Routes | Covers |
|---|---|---|---|---|---|
| site/src/styles/global.css | 449 | BaseLayout.astro:207-212 | `<style is:global>` with `@import` | every route | tokens, Shiki variables, skip link, focus ring, reset, base typography, header and nav, main width rules, footer, reading progress, back-to-top, skeleton, reduced motion, theme transition, phone and tablet rules, mobile nav |
| site/src/styles/callouts.css | 260 | BaseLayout.astro | same `@import` | every route | callout box, title row, per-type palettes and dark variants, Lucide icon masks, collapsible marker |
| site/src/styles/diagrams.css | 75 | BaseLayout.astro | same `@import` | every route | diagram sizing, horizontal scroll wrapper, light and dark stacking and crossfade |
| site/src/styles/search.css | 79 | BaseLayout.astro | same `@import` | every route | search overlay, modal, input, result list |
| site/src/styles/post.css | 409 | PostLayout.astro frontmatter `import` | bundled by Vite into the route CSS | posts | article grid and sidebar, post header and tags, inline elements, KaTeX sizing, code blocks and copy button, language badge, figures, tables, footnotes, heading fold, hub child dates |
| site/src/styles/link-preview.css | 123 | PostLayout.astro import | bundled | posts | hover preview card and mobile bottom sheet |
| site/src/styles/nav-tree.css | 11 | PostLayout.astro import | bundled | posts | nav-tree active link (falls back to `#2563eb`, a blue unrelated to the teal accent) |
| site/src/styles/mobile-sidebar.css | 175 | PostLayout.astro import | bundled | posts | floating button, overlay card, tabs, back-to-top repositioning |
| site/src/styles/profile/font.css | 5 | resume.astro, portfolio.astro, portfolio/[role].astro | frontmatter `import`, which `@import`s site/.generated/profile-font/pretendard-profile.css | profile routes | `--c-profile-font-family` and the local `RVNNT Profile` faces |
| site/src/styles/profile/foundation.css | 180 | profile pages | frontmatter `import` | profile routes | profile shell, header, pill links, sections, periods, breakpoints |
| site/src/styles/profile/resume.css | 252 | resume.astro | frontmatter `import` | `/resume` | résumé hierarchy, skills grid, `details.resume-entry` |
| site/src/styles/profile/portfolio.css | 328 | portfolio.astro, portfolio/[role].astro | frontmatter `import` | `/portfolio`, `/portfolio/<role>` | intro, eyebrow, project jump nav, case studies, role navigation, print rules |
| site/src/styles/profile/print.css | 253 | resume.astro | frontmatter `import` | `/resume` | `@page` A4 12 mm, print typography, screen-only hiding, break rules |
| KaTeX 0.16.22 CSS | n/a | site/src/lib/layout/profile-resources.ts:49-69 via BaseLayout.astro:98-104 | `<link rel="stylesheet">` from cdn.jsdelivr.net | every non-profile route | math rendering |
| Pretendard 1.3.9 dynamic subset CSS | n/a | same | `<link rel="stylesheet">` from cdn.jsdelivr.net with `preconnect` | every non-profile route | body font |

Other styling channels:
- Scoped `<style>` blocks in Header.astro, HubLayout.astro, PostCard.astro, RelatedPosts.astro, TableOfContents.astro, HubNav.astro, HubProgress.astro, 404.astro, tags/index.astro, tags/[tag].astro, graph.astro and index.astro.
- `<style is:global>` additions in index.astro:95-112 (homepage link and title colors) and graph.astro:42 (graph UI controls). The comment in index.astro says the override lives there because global.css is a review subject.
- Inline style objects in ThemeToggle.tsx:118-128, TreeNodeItem.tsx:21, LocalGraph.tsx (heading) and MobileSidebar.tsx (empty states).
- Runtime inline styles: the reading-progress `style.width` (BaseLayout.astro:183-203), KaTeX inline sizing, and Shiki per-token CSS variables.

Because blog pages load global.css through `is:global` while profile pages add their own imports, the profile pages also receive global.css, callouts.css, diagrams.css and search.css (BaseLayout is shared). The asset budget counts that union (see code-quality-assessment.md).

### Design Tokens

Values are from site/src/styles/global.css:2-32 and site/src/styles/profile/foundation.css:17-21. The hex values match the Tailwind CSS stone and teal palettes, although Tailwind is not a dependency.

| Token | Light (`:root`) | Dark (`[data-theme="dark"]`) | Role and notes |
|---|---|---|---|
| `--c-bg` | `#fafaf9` | `#0c0a09` | page background (`html`) |
| `--c-surface` | `#ffffff` | `#1c1917` | header, cards, overlays, back-to-top |
| `--c-text` | `#1c1917` | `#e7e5e4` | body text |
| `--c-text-muted` | `#78716c` | `#a8a29e` | metadata, footer, blockquotes, nav links |
| `--c-border` | `#e7e5e4` | `#292524` | dividers and outlines |
| `--c-accent` | `#0d9488` | `#2dd4bf` | links, focus ring, progress bar, active borders. The code notes 3.59:1 on the light background, below AA for text |
| `--c-accent-hover` | `#0f766e` | `#5eead4` | hover, current desktop nav item, homepage links (5.3:1 on light) |
| `--c-code-bg` | `#f5f5f4` | `#1c1917` | inline code, plain code blocks, hover fills |
| `--c-callout-note`, `--c-callout-warning`, `--c-callout-note-border`, `--c-callout-warning-border` | not defined | `#1e3a5f`, `#422006`, `#3b82f6`, `#f59e0b` | defined but referenced nowhere |
| `--radius` | `6px` | same | shared corner radius |
| `--max-width` | `820px` | same | reading width; main grows by `--sidebar-width` on posts and to `min(1700px, 100%)` on the graph |
| `--sidebar-width` | `260px` | same | post sidebar column |
| `--font-body` | `"Pretendard Variable", "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif` | same | body text |
| `--font-code` | `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace` | same | JetBrains Mono is never loaded |
| `--c-profile-font-family` | `"RVNNT Profile", -apple-system, BlinkMacSystemFont, system-ui, sans-serif` | same | profile routes only (profile/font.css) |
| `--c-profile-accent-text` | `#0f766e` | `var(--c-accent)` | text accents inside `.profile-shell` |
| `--callout-bg`, `--callout-border` | per callout type group | per group dark values | local to callouts.css |
| `--shiki-light`, `--shiki-light-bg`, `--shiki-dark`, `--shiki-dark-bg` | inline from Shiki | same | code token colors, switched by `[data-theme="dark"]` selectors in global.css:45-55 |

Hardcoded colors outside tokens:
- callouts.css group palettes: blue `#dbeafe`/`#3b82f6`, amber `#fef3c7`/`#f59e0b`, green `#dcfce7`/`#22c55e`, red `#fee2e2`/`#ef4444`, purple `#f3e8ff`/`#a855f7`, stone `#f5f5f4`/`#a8a29e`, with dark variants.
- Graph category colors in site/src/lib/graphUtils.ts: os `#3b82f6`, web `#10b981`, db `#f59e0b`, network `#8b5cf6`, hub `#ef4444`, default `#6b7280`.
- `#fff` text on `--c-accent` in the skip link (global.css:65-77) and the mobile preview button (link-preview.css:107-116). Computed from the token values, that is about 3.7:1 in light and about 1.9:1 in dark.
- `rgba(0,0,0,.5)` search overlay, success green `#22c55e` for the copied state, and shadows.

Typography scale: `html` line-height 1.7, antialiased. Headings weight 650, line-height 1.3, `scroll-margin-top: 3.5rem`. Sizes are h1 `2rem`, h2 `1.5rem`, h3 `1.25rem`; below 480px they are `1.6rem`, `1.25rem`, `1.1rem`; from 480px to 767px h1 is `1.75rem` and h2 `1.35rem`. Header nav links are `0.9rem`; footer `0.85rem`. Profile pages use their own scale (`.resume-name` `2.35rem` weight 750, `clamp()` sizes and `word-break: keep-all` in portfolio.css).

Spacing and layout: main padding `2rem 1.5rem` (phone `1.5rem 1rem`). Sticky header `z-index: 100`. Progress bar `z-index: 200`. Skip link `z-index: 300`. Search overlay `z-index: 100`. Mobile sidebar button `z-index: 90` and overlay `z-index: 200`. Mobile nav dropdown `z-index: 99`.

### Theme Mechanism in CSS

- Only the `data-theme` attribute on `<html>` switches themes. No stylesheet reads `prefers-color-scheme`. The OS appearance is consulted only in JavaScript, as a first-visit fallback (BaseLayout.astro:153-157, ThemeToggle.tsx:16-23). The full flow is under Theme System in component-inventory.md.
- `html.theme-transitioning` applies 300 ms transitions of `background-color`, `color`, `border-color` and `box-shadow` with `!important` to every element (global.css:338-344) while a switch is in progress (350 ms window).
- Diagram pairs inside `.diagram-container` stack the dark image over the light one and crossfade by `opacity` (diagrams.css:74). The transition is active only during a theme switch.
- Profile pages inherit the same tokens and override the accent text color through `--c-profile-accent-text`.

### Breakpoints

| Query | Where | Purpose |
|---|---|---|
| `max-width: 479px` | global.css:347, search.css:76, post.css:390, mobile-sidebar.css:53, HubNav.astro:79, profile/foundation.css:143, profile/resume.css:236, profile/portfolio.css:210 | phone spacing and type scale |
| `min-width: 360px and max-width: 479px` | profile/portfolio.css:204 | small-phone portfolio tweaks |
| `min-width: 480px and max-width: 767px` | global.css:361, post.css:399, mobile-sidebar.css:59, profile/foundation.css:160, profile/portfolio.css:216 | large phone |
| `max-width: 767px` | global.css:370 and 381, post.css:143, link-preview.css:43, graph.astro:35 and 126 | mobile navigation swap, larger nav touch padding, link preview becomes a bottom sheet |
| `min-width: 480px` | mobile-sidebar.css:31 | sidebar card sizing |
| `min-width: 768px` | link-preview.css:120, mobile-sidebar.css:38, profile/foundation.css:171, profile/portfolio.css:226 | tablet and desktop |
| `min-width: 768px and max-width: 959px` | mobile-sidebar.css:65 | tablet sidebar overlay |
| `max-width: 959px` | mobile-sidebar.css:46 | floating sidebar button shown |
| `min-width: 960px` | post.css:8 and 62, mobile-sidebar.css:1 | two-column post layout with sticky sidebar, floating button hidden |
| `print` | profile/print.css:7, profile/portfolio.css:256 | print rendering |
| `prefers-reduced-motion: reduce` | global.css:329 | motion reduction |

The breakpoint system (480, 768 and 960) comes from docs/plans/2026-03-17-responsive-design.md, which specified mobile-first `min-width` queries. The code mixes `max-width` and `min-width` queries.

### Motion

| Where | What animates | Timing |
|---|---|---|
| global.css:71 | skip link `top` (a layout property) | 0.15s |
| global.css:208 | header nav link background and color | 0.15s |
| global.css:276 | reading progress `width` (a layout property, updated on every scroll event) | 50ms linear |
| global.css:294 | back-to-top opacity and visibility | 0.2s |
| global.css:311-324 | `.skeleton` shimmer keyframes | 1.5s infinite |
| global.css:343 | theme switch colors on every element | 300ms during the switch window |
| global.css:438 | mobile nav link background | 0.15s |
| callouts.css:242 | collapsible callout marker rotation | 0.2s |
| link-preview.css:14 and 71 | desktop card opacity, mobile sheet `transform` | 0.15s, 0.2s ease-out |
| diagrams.css:74 | diagram crossfade | 300ms |
| post.css:182 and 374 | copy button; heading fold toggle opacity and transform | 0.2s, 0.15s |
| mobile-sidebar.css:24, 115, 158 | button, tab and link color changes | 0.15s |
| Header.astro:88, 404.astro:61, graph.astro:102 | search trigger, 404 button, graph legend chips | 0.15s |
| TreeNodeItem.tsx:21 | chevron rotation (inline style) | 0.15s |
| BaseLayout.astro:196-198 | back-to-top `window.scrollTo` with `behavior: "smooth"` | browser default |

Reduced motion: global.css:329-336 sets `animation-duration` and `transition-duration` to 0.01 ms, one iteration and `scroll-behavior: auto` for all elements. The scripted smooth scroll in BaseLayout does not check the preference itself. site/tests/e2e/profile-accessibility.spec.ts asserts that no transition longer than 0.1 s survives reduced motion on profile routes. Blog routes have no such check.

### Profile Period Model (2026-10-21)

The profile represents dates only as period facts. Every place that defines or interprets the vocabulary:

| Layer | Location | Behavior | Tag-specific? |
|---|---|---|---|
| Types | site/src/lib/profile/types.ts:86-107 | `DatePoint = YearPoint \| YearMonthPoint` (`{ tag, value: string }`); `PeriodEnd` adds `{ tag: 'present' }`; `Period = { start, end }` | yes |
| Source data | site/src/lib/profile/profile-data.ts:95-97, 557-559, 570-583 | Four periods. `experience-hansono-period` 2023-07 to 2023-08 (year-month); `education-sogang-university-period` 2019 to 2026 (year); `certification-opic-ih-period` 2025-09 to 2025-09; `certification-hsk-6-period` 2024-09 to 2024-09 | data |
| Shape inspection | validation.ts:512-554 | requires `tag` and, unless `present`, a string `value` | no |
| Validation | validation.ts:48-49, 1525-1608 | `year` `^\d{4}$` (at least 1); `year-month` `^(\d{4})-(0[1-9]\|1[0-2])$`. Any other tag is `period.precision`. A start may not be `present` (`period.value`). Start and end must share one precision (`period.precision`). An end before the start is `period.range`, compared by year×12+month | yes |
| Issue messages | issues.ts:56-58 | `period.precision` reads "기간은 year 또는 year-month의 같은 정밀도를 사용해야 합니다." | yes (text) |
| Normalization | normalization.ts:276-295 | clones `{ tag, value }` | no |
| Fact approval | fact-approval.ts:1100-1120, 1313-1340, 1386-1404 | collects `{ kind: 'period', value }`; `isDatePoint` accepts only `year` and `year-month`; value equality compares tag and value generically | partly |
| Production source shape | production-profile.ts:447-458 | allows the keys `tag` and `value`, or only `tag` for `present` | no |
| Résumé source digest | canonical-digest.ts:386-397 | `variant(tag, { value })`, or `variant('present')` | no |
| Manifest | resume-manifest.ts:152-153, 783-812 | token `start:<tag>:<value>\|end:<tag>:<value>` or `…\|end:present`; start and end tags must match and `end.value >= start.value` by string comparison; unknown tags throw `Invalid résumé period point.` | yes |
| Presentation | site/src/components/profile/presentation.ts:603-617 | `PeriodView.text = '<start> – <end>'` (U+2013, raw values, `현재` for present) | no |
| Markup | ResumeContent.astro:86-89, 126-129, 157-160; ResumeEntry.astro | `p.profile-period` or `span.resume-entry-period` with `data-profile-fact-id` | no |
| PDF evidence | resume-evidence.ts:31-33, 813-840 | `parsePeriodDisplayText` splits on `\s*–\s*` and maps each point back to `year:`, `year-month:` or `present`; anything else returns `null` | yes |
| PDF inspector | site/scripts/profile/pdf-inspector.mjs:8-9, 355-370 | `inferValueKind` treats a fact as a period only when both halves match `^(?:\d{4}\|\d{4}-(?:0[1-9]\|1[0-2])\|현재)$` | yes |
| Test generators | site/tests/pbt/u1/arbitraries/profile.ts:19, 132-155, 811-836; arbitraries/manifest.ts:572-575 | `PeriodMode = 'year' \| 'year-month' \| 'present'`; oracle token mirrors the manifest | yes |

A day-precision point needs changes in every row marked yes or partly. A tag that sorts correctly as a string, such as zero-padded `YYYY-MM-DD`, keeps the manifest's string range check valid. Validation would need a new ordinal (for example days since an epoch) and a calendar check, because a pattern alone accepts `2025-02-30`.

### Résumé Section Structure (2026-10-21)

| Order | Manifest key (resume-manifest.ts:36-43) | View kind and heading (presentation.ts:159-193) | DOM (ResumeContent.astro) | Shown when |
|---|---|---|---|---|
| 1 | `intro-contact` | `intro`, 프로필 | `section.resume-intro[data-profile-section="intro"]` | always |
| 2 | `skills` | `skills`, 핵심 역량 | `section.resume-skills` | always |
| 3 | `highlights` | `highlights`, 경력·대표 성과 | `section.resume-highlights`, groups 경력 and 대표 성과 | always |
| 4 | `project-summaries` | `projects`, 프로젝트 | `section.resume-projects` | always |
| 5 | `education` | `education`, 학력 | `section.resume-education` | `education` non-empty |
| 6 | `certifications` | `certifications`, 어학 자격 | `section.resume-certifications`, entries `article.resume-certification-entry` (final `else` branch, lines 142-172) | `certifications` non-empty |

`addSection` (resume-manifest.ts:570-582) refuses any key whose position differs from `RESUME_SECTION_ORDER`. The heading `어학 자격` is a literal in the view type, so every certification is presented as a language qualification today.

### Print Styles

- site/src/styles/profile/print.css (résumé only):
  - `@page { size: A4; margin: 12mm }`.
  - Under `@media print`: 10 pt body, line-height 1.35, black on white.
  - Hides `.site-header`, `.site-footer`, `.profile-local-navigation`, `.reading-progress`, `.back-to-top`, `.search-overlay`, `.skip-link` and `[data-profile-action-kind="document"]`.
  - Forces `details` content open; `break-inside: avoid-page` for entries; headings `break-after: avoid-page`.
  - The PDF renderer's `SCREEN_ONLY_SELECTORS` (site/scripts/profile/pdf-renderer.mjs:20-27) and print-contract checks mirror these rules.
- Certification entries print as a two-column grid with the period in the right column (print.css:312-331); education and certification entries drop their card surfaces (print.css:162-164, 266-290). On screen, resume.css:190-222 styles projects, education and certifications as grouped cards, and foundation.css:134-138 sets `.profile-period` to tabular numerals in `--c-text-secondary`.
- site/src/styles/profile/portfolio.css:256 adds print rules for case-study details (`::details-content`).
- Blog routes have no print stylesheet.
- tmp/pdfs/export-portfolio.mjs injects its own print CSS (A4 with 16/17/19 mm margins, 10.5 pt) to export a portfolio PDF outside the release tooling.

### Emitted HTML Contract

This is the class and markup vocabulary that CSS and client scripts depend on. Changing a name requires coordinated changes in the emitter, the stylesheet and, where noted, tests.

| Construct | Emitter | Emitted markup | Styled or used by |
|---|---|---|---|
| Image embed `![[f.png\|300]]` | preprocessor transform.rs | `<img src="/assets/f.png" alt="" width="300" />` (optional `\|WxH` sizing) | global.css `img`. render.ts adds `loading="lazy" decoding="async"` |
| Wikilink | transform.rs | `<a href="/posts/<slug>[#fragment]">text</a>`. A homepage target becomes `/`, a heading link shows `Note &gt; Heading`, an unresolved link becomes plain text | global.css `a`; link-preview.ts attaches previews to `/posts/` links |
| Block anchor | transform.rs | `<span id="^<id>"></span>` | link targets |
| Highlight `==x==` | transform.rs | `<mark>` | post.css |
| Comment `%%x%%` | transform.rs | removed | none |
| Callout `> [!type] Title` | transform.rs | `<div class="callout callout-<type>"><div class="callout-title">…</div>…</div>` | callouts.css |
| Foldable callout `[!type]-` or `[!type]+` | transform.rs | `<details class="callout callout-<type>"[ open]><summary class="callout-title">…</summary>…</details>` | callouts.css (rotating marker) |
| Hub child date `@YYYY-MM-DD` | hub_dates.rs | `<time class="hub-child-date" datetime="…">YYYY년 M월 D일</time>` | post.css |
| Themed diagram (Mermaid, D2 SVG) | transform.rs, mermaid.rs, d2.rs | `<div class="diagram-container"><img class="diagram diagram-<lang> diagram-light" src="/assets/<slug>-<lang>-<n>-light.svg" alt="" /><img class="diagram diagram-<lang> diagram-dark" … /></div>` | diagrams.css; diagram-wrap.ts wraps diagrams in `.diagram-wrapper` |
| D2 PNG or GIF | d2.rs | `<img class="diagram diagram-d2">` | diagrams.css |
| D2 PDF or PPTX | d2.rs | `<a … download class="diagram-download">PDF 다운로드</a>` | no CSS |
| D2 text or ASCII | d2.rs | `<pre class="diagram diagram-d2-ascii">` | no CSS |
| Typst | typst_render.rs | `<img class="diagram diagram-typst">` (no dark variant) | diagrams.css |
| Diagram render failure | transform.rs | the original fenced block is kept | rendered by Shiki |
| Code block | render.ts (Shiki, custom transformer) | `pre.shiki[data-language]` with per-token `--shiki-*` variables; a `title="…"` meta adds a `.code-block` wrapper with a `.code-filename` caption | global.css:35-55, post.css (`::before` language badge) |
| Copy button | copy-button.ts (client) | wraps `pre.shiki` in `.code-block-wrapper`, adds `button.copy-btn` (`aria-label` "Copy code", inline SVG) | post.css (visible on hover or `:focus-visible`) |
| Captioned image | render.ts `rehypeImageCaption` | non-empty `alt` other than "image": `<figure class="image-figure"><img …><figcaption>alt</figcaption></figure>` | post.css; diagrams use `alt=""` to stay unwrapped |
| Table | render.ts | `<div class="table-wrapper"><table>` | post.css |
| Headings | render.ts (`rehype-slug`), heading-fold.ts (client) | `h2`–`h4` with `id`; `button.heading-fold-toggle` (▶, `aria-label` "섹션 접기/펼치기") prepended inside `h2` and `h3` | post.css; TableOfContents and toc-highlight depend on the ids |
| Math | render.ts (`rehype-katex`, `strict: false`) | `.katex`, `.katex-display` | KaTeX CDN CSS; post.css sets inline math to `1em` |
| Footnotes, task lists, definition lists, abbreviations, strikethrough | render.ts | GFM footnote section with `data-footnote-ref`; disabled checkboxes; `dl/dt/dd`; `abbr[title]`; `del` for `~~` only | post.css |
| Profile DOM | components/profile/*.astro | `data-profile-section` (résumé values `intro`, `skills`, `highlights`, `projects`, `education`, `certifications`; the PDF skeleton maps them to manifest ordinals in DOM order), `data-profile-entity-kind` (`certification` for certification entries), `data-profile-entity-id`, `data-profile-entity-order`, `data-profile-fact-id`, `data-profile-label-fact-id`, `data-profile-destination-fact-id`, `data-profile-dimension`, `data-profile-action-kind`, `data-testid` | parity, PDF inspection and tests; the attributes are a contract |

## Code Patterns

- **Fail closed.** The preprocessor exits non-zero on publication diagnostics or diagram failures. The homepage gateway throws `HP001`–`HP004`. Profile validation returns `ValidationResult` with aggregated issues and never yields a partial value. Tooling errors carry `code`, `stage`, `rule` and `details`.
- **Branded types and capabilities.** Validated profile values are branded, and capabilities are tracked in WeakSets, so a structural imitation is rejected (site/tests/unit/profile-domain.test.ts).
- **Immutability.** `deepFreeze` and `Object.freeze` are used throughout the tooling and the profile domain.
- **Determinism.** Rust uses `BTreeMap` for the search index and sorted outputs (proptest suites assert byte-identical output). Exceptions: backlink collection through a `HashSet` in linker.rs and tie ordering in related.rs.
- **Shared syntax.** Regexes are compiled once with `LazyLock` in syntax.rs, and regex transforms skip fenced code through `transform_outside_fences()` (CLAUDE.md).
- **Atomic file writes.** Temporary file then rename for evidence, fonts and releases, plus a lock and journal for releases.
- **Process ownership.** Spawned servers and browsers are tracked by process group and token, and cleanup is proven before a retry (startup-retry.mjs, owned-process-registry.mjs).
- **Traceable rules.** Comments and errors cite rule identifiers from the previous AI-DLC intent (`BR-U2-0xx`, `NFR-U1-0xx`, `LC-U1-xx`, `RES-01`).
- **Astro conventions.** `set:html` for trusted HTML, scoped styles by default, `is:global` for global CSS, ES5-only inline scripts that run before any polyfill (CLAUDE.md).
- **Islands.** Preact function components with hooks; inline style objects for small visual details; lazy `fetch` of JSON with errors swallowed and an empty state shown.

## Generated and Derived Files

| Path | Produced by | Tracked | Notes |
|---|---|---|---|
| content/ | preprocessor | no (`/content/` ignored) | input to the Astro build |
| site/public/search-index.json, graph.json, previews.json, nav-tree.json, site/public/assets/ | `just preprocess` and Jenkins copy steps | no | served as static files |
| site/.generated/profile-font/ | font-materializer.mjs during every build | no | `RVNNT Profile` CSS and 92 WOFF2 subsets |
| site/.artifacts/profile/ | verification and release tooling | no | build manifest, evidence JSON, PDF candidates, release journal, compiled tools |
| site/dist/, site/.astro/, preprocessor/target/ | builds | no | build output |
| site/public/resume.pdf, site/verification/resume/current-release.json | release-store.mjs promotion | yes | the only tracked files the release transaction may change |
| site/verification/profile/fact-approval.json, manual-web-accessibility.json | human gates | yes | receipts bound to digests |
| preprocessor/.astro/ | an Astro run in the wrong directory (inferred) | yes | stray, unused |
| tmp/pdfs/, output/pdf/ | ad hoc exports | yes | scratch artifacts, including a third-party job-guide text extract |
