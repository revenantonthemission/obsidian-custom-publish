# Dependencies: obsidian-blog

> **Freshness (2026-10-21).** The profile sections below were refreshed by the focused `resume-certifications` scan at commit `96a6066`. Everything outside the profile subsystem comes from the 2026-10-19 full scan at `265b38a`, before the HIG redesign merged. It is stale in places: the theme system, tokens, fonts, chrome and the blog e2e coverage have changed since (see CLAUDE.md). The scope block in reverse-engineering-timestamp.md records which paths were verified.

This artifact owns the package-level dependency inventory, the external tools and services, and the internal module dependency graph. Framework-level summaries are in technology-stack.md.

## npm Runtime Dependencies

Declared in site/package.json `dependencies`. Resolved versions are in site/package-lock.json (lockfileVersion 3), which was not parsed.

| Package | Range | Used by | Purpose |
|---|---|---|---|
| astro | ^6.0.4 | whole site | static site generator |
| @astrojs/preact | ^5.0.0 | site/astro.config.mjs | Preact islands integration |
| @astrojs/sitemap | ^3.7.1 | site/astro.config.mjs | `sitemap-index.xml` |
| @astrojs/rss | ^4.0.17 | site/src/pages/rss.xml.ts | RSS feed |
| preact | ^10.29.0 | site/src/islands | island runtime |
| unified | ^11.0.5 | site/src/lib/render.ts | markdown processor |
| remark-parse | ^11.0.0 | render.ts | markdown parser |
| remark-gfm | ^4.0.1 | render.ts | tables, footnotes, task lists, strikethrough (`singleTilde: false`) |
| remark-cjk-friendly | ^2.3.1 | render.ts | emphasis next to Korean text |
| remark-definition-list | ^2.0.0 | render.ts | `dl/dt/dd` |
| @richardtowers/remark-abbr | ^1.1.5 | render.ts | `abbr` definitions |
| remark-math | ^6.0.0 | render.ts | math syntax |
| remark-rehype | ^11.1.2 | render.ts | markdown to HTML AST |
| rehype-raw | ^7.0.0 | render.ts | keeps preprocessor HTML (required, per CLAUDE.md) |
| @shikijs/rehype | ^4.0.2 | render.ts | code highlighting |
| @shikijs/transformers | ^4.0.2 | render.ts | Shiki transformers (line highlights) |
| rehype-slug | ^6.0.0 | render.ts | heading ids used by the TOC |
| rehype-katex | ^7.0.1 | render.ts | KaTeX rendering (`strict: false`) |
| rehype-stringify | ^10.0.1 | render.ts | HTML output |
| unist-util-visit | ^5.1.0 | render.ts custom plugins | AST traversal |
| d3-force | ^3.0.0 | site/src/lib/graphSim.ts | force simulation |
| d3-selection, d3-zoom, d3-drag | ^3.0.0 | site/src/islands/GraphView.tsx | SVG graph interaction |
| lucide-static | ^1.8.0 | site/src/components/Header.astro, Footer.astro | build-time SVG icons |
| lucide-preact | ^1.8.0 | site/src/islands/ThemeToggle.tsx | Sun and Moon icons |
| pretendard | 1.3.9 (exact) | site/scripts/profile/font-materializer.mjs | source of the local `RVNNT Profile` font (allowlisted by sha512 and per-file sha256) |

## npm Development Dependencies

| Package | Range | Used by | Purpose |
|---|---|---|---|
| vite | 7.3.2 (exact) | Astro build, profile-tooling tests | bundler pin |
| typescript | ^5.9.3 | compile-profile-tools.mjs, pbt-runner.mjs (TypeScript AST) | type checking and tool compilation |
| vitest | ^4.1.10 | test:unit, test:pbt | test runner |
| fast-check | ^4.9.0 | site/tests/pbt | property testing |
| @fast-check/vitest | ^0.4.1 | site/tests/pbt | `test.prop` integration |
| @playwright/test | 1.61.1 (exact) | site/tests/e2e, pdf-renderer.mjs, browser-launch-preflight.mjs | browser automation |
| @axe-core/playwright | 4.12.1 (exact) | site/tests/e2e | WCAG scans |
| pdfjs-dist | 5.4.624 (exact) | pdf-inspector.mjs | PDF text, structure and annotation extraction |
| @astrojs/check | ^0.9.8 | not referenced by scripts | ad hoc `astro check` |
| @types/d3-drag, @types/d3-force, @types/d3-selection, @types/d3-zoom | ^3.0.7, ^3.0.10, ^3.0.11, ^3.0.8 | TypeScript | d3 typings |
| @types/hast | ^3.0.4 | render.ts plugins | HAST typings |

tmp/pdfs/export-portfolio.mjs imports `playwright-core` through a relative path into site/node_modules. That is a transitive package used outside the manifest.

## Cargo Dependencies

Declared in preprocessor/Cargo.toml. Resolved versions are in preprocessor/Cargo.lock, which was not parsed.

| Crate | Version | Used by | Purpose |
|---|---|---|---|
| clap | 4 (`derive`) | main.rs | CLI arguments |
| anyhow | 1 | whole crate | error propagation |
| serde | 1 (`derive`) | types.rs, output.rs | serialization |
| serde_json | 1 | output.rs | JSON artifacts |
| serde_yml | 0.0.12 | scanner.rs | YAML frontmatter (pre-1.0) |
| walkdir | 2 | scanner.rs, output.rs | directory traversal |
| regex | 1 | syntax.rs and transforms | Obsidian syntax patterns (`LazyLock`) |
| chrono | 0.4 | scanner.rs, hub_dates.rs | dates for stamping and hub child dates |
| tempfile | 3 | diagram renderers | temporary files for CLI rendering |
| lindera | 2 (`embed-ko-dic`) | search.rs | Korean tokenization with an embedded dictionary |
| proptest (dev) | 1.11.0 | preprocessor/tests | property tests for catalog, transform and output determinism |

## External Command-Line Tools

| Tool | Needed by | Configured where | Notes |
|---|---|---|---|
| `mmdc` (Mermaid CLI) | mermaid.rs | `which mmdc`, then `/opt/homebrew/bin/mmdc`, `/usr/local/bin/mmdc` and `/opt/homebrew/Cellar/node/25.9.0_2/bin/mmdc` (mermaid.rs:10-35) | if PATH lacks `mmdc` (for example under launchd or Jenkins), the version-specific fallback breaks after a Node upgrade |
| Chrome or chrome-headless-shell | `mmdc` via puppeteer | `PUPPETEER_EXECUTABLE_PATH` (Justfile, Jenkinsfile prefers the puppeteer cache) | desktop Chrome is the fallback |
| `d2` | d2.rs, `just d2-watch` | PATH | themes `0` and `200` |
| `typst` | typst_render.rs, `just typst-render` | PATH | typst tests skip when absent; the d2 tests have no skip guard |
| `git` | scanner.rs | PATH | one batched `git log` for `updated` dates (the vault must be a git repository for real dates) |
| `cargo` and `rustc` | Justfile, Jenkinsfile | PATH | release builds |
| `node`, `npm`, `npx` | everything in site/ | PATH, nvm | Node `^22.12.0 \|\| >=24.0.0` |
| `just`, `rsync` | Justfile, Jenkinsfile | PATH | deploy uses `rsync -a --delete` |
| `cloudflared`, `launchctl`, Jenkins | hosting (outside the repository) | CLAUDE.md | services `dev.rvnnt.blog`, `dev.rvnnt.tunnel`, Jenkins on 8081 |

## External Services and Network Dependencies

| Service | When | Used by | Failure behavior | Security and privacy |
|---|---|---|---|---|
| jsDelivr (`cdn.jsdelivr.net`) | every page view on non-profile routes | site/src/lib/layout/profile-resources.ts:49-69 | body text falls back to system fonts; math loses its styling | no Subresource Integrity. Pretendard is fetched by GitHub tag path (`gh/orioncactus/pretendard@v1.3.9`) |
| api.sunrise-sunset.org | at most once per day per browser, when location is known | site/src/lib/solar.ts:90-110 | falls back to 06:30 and 18:30 | sends the reader's coordinates to a third party without explanation |
| Browser Geolocation API | first visit, unless denied | solar.ts `requestGeoAndCache` | stores the denial | prompt appears without a user gesture |
| Cloudflare Tunnel | all public traffic | outside the repository | site unreachable | edge headers and TLS are configured outside the repository |
| iCloud Drive | vault storage | Justfile and Jenkins vault paths | build uses whatever is synced | `--stamp-published` writes to synced files (lost-write risk noted in docs/project/codebase_audit.md) |
| GitHub | outbound links only | profile evidence links, git history | none at build time | none |

## Internal Dependency Graph

### Preprocessor modules (from `use crate::` statements and inline paths)

| Module | Depends on |
|---|---|
| main.rs | catalog (`PublicationCatalog`, `report_diagnostics`), output (`write_output`), scanner (`scan_vault`, `stamp_published_dates`) |
| output.rs | catalog, linker (`resolve_links`), nav_tree, preview, related, search, transform (`transform_content_publication`), types |
| catalog.rs | syntax (`TRANSCLUSION_RE`), transform (`strip_frontmatter`, `transform_outside_fences`), types |
| transform.rs | syntax, types, hub_dates (inline `crate::hub_dates::augment_hub_child_links`), d2, mermaid, typst_render |
| hub_dates.rs | transform (`transform_outside_fences`), types |
| scanner.rs | syntax, types |
| linker.rs | syntax (`WIKILINK_RE`), types |
| search.rs, preview.rs | syntax, transform (`strip_frontmatter`), types |
| related.rs, nav_tree.rs | types |

Circular reference flagged: transform.rs and hub_dates.rs reference each other. This is legal inside one Rust crate, but it couples the hub-date feature to transform internals.

### Site modules (principal edges)

| From | To |
|---|---|
| site/astro.config.mjs | @astrojs/preact, @astrojs/sitemap, site/scripts/profile/astro-profile-integration.mjs |
| astro-profile-integration.mjs | site/src/lib/profile/production-profile.ts (through Vite), font-materializer.mjs |
| BaseLayout.astro | Header.astro, Footer.astro, islands/Search.tsx, lib/layout/profile-resources.ts, styles/global.css, callouts.css, diagrams.css, search.css |
| Header.astro | islands/ThemeToggle.tsx, islands/MobileNav.tsx, lib/navigation.ts, lucide-static |
| PostLayout.astro | BaseLayout, TableOfContents, BacklinkList, RelatedPosts, HubNav, islands/LocalGraph, islands/NavTree, islands/MobileSidebar, lib/data.ts, styles/post.css, link-preview.css, nav-tree.css, mobile-sidebar.css, scripts/* |
| pages/index.astro | BaseLayout, lib/data.ts, lib/render.ts, lib/homepage.ts, lib/profile (production assembly) |
| pages/posts/[slug].astro, hubs/[slug].astro, tags/*, graph.astro, 404.astro | layouts, lib/data.ts, lib/render.ts (posts), islands/GraphView (graph) |
| pages/resume.astro, portfolio.astro, portfolio/[role].astro | BaseLayout, components/profile/*, presentation.ts, lib/profile/{metadata,production-profile,current-resume-document,portfolio-roles}, styles/profile/* |
| islands/ThemeToggle.tsx | lib/solar.ts, lucide-preact |
| islands/GraphView.tsx, LocalGraph.tsx | lib/graphUtils.ts, lib/graphSim.ts, d3 modules |
| islands/NavTree.tsx | islands/TreeNodeItem.tsx |
| components/profile/presentation.ts | lib/navigation.ts (`getProfileLocalNavigationState`), lib/profile/portfolio-roles.ts, lib/profile types and document-boundary types (2026-10-21) |
| components/profile/ResumeContent.astro | ContactActions.astro, ContentBlocks.astro, ResumeEntry.astro, presentation.ts types |
| pages/resume.astro | BaseLayout, ProfileShell, ResumeContent, presentation.ts, lib/profile/{current-resume-document,metadata,production-profile}, styles/profile/{font,foundation,resume,print}.css |
| lib/profile/production-profile.ts | verification/profile/fact-approval.json (JSON import), profile-data.ts, validation.ts, fact-approval.ts, assembly.ts, `node:crypto` |
| lib/profile/fact-approval.ts | issues.ts, normalization.ts, validation.ts (`hasValidatedProfileCapability`) |
| lib/profile/validation.ts | issues.ts, normalization.ts |
| lib/profile/resume-manifest.ts | canonical-digest.ts, fact-approval.ts, issues.ts, selectors.ts, validation.ts, types; restates the period grammar locally |
| lib/profile/resume-evidence.ts | issues.ts, resume-manifest.ts (a runtime import of `compareResumeFactManifests` and `RESUME_MANIFEST_SCHEMA_VERSION`), types. It restates the period grammar locally; its comment says this keeps the manifest builder out of the PDF path, but the module already imports resume-manifest.ts |
| scripts/profile/pdf-inspector.mjs | profile-paths.mjs, `node:crypto`, `node:fs`; restates the period point pattern (line 9) |
| scripts/profile/cli.mjs | verification-provider.mjs, resume-coordinator.mjs, release-store.mjs, pbt-runner.mjs |
| verification-provider.mjs | asset-budget, request-ledger, accessibility-review-contract, clean-profile-build, preview-supervisor, startup-retry, browser-launch-preflight, homepage-fixture-content, profile-paths |
| resume-coordinator.mjs | clean-profile-build, compile-profile-tools, pdf-renderer, pdf-inspector, pdf-viewer, preview-supervisor, release-store |
| clean-profile-build.mjs, preview-supervisor.mjs | owned-process-registry, owned-node-bootstrap, profile-paths |

### Cross-package and data dependencies

- **The site depends on preprocessor output files, not on the Rust crate.** `content/` must exist before `astro build` (data.ts reads `../content`). `public/previews.json` is read at build time relative to the working directory. `npm run test:unit` builds the site, so it also needs `content/` and the copied JSON. Jenkins provides them by preprocessing the fixture vault first. site/scripts/crossunit/ensure-fixture-content.mjs fills a homepage fixture when one is absent.
- **The profile tooling depends on the site.** It compiles six pure profile modules into `site/.artifacts/profile/tools` (compile-profile-tools.mjs) so Node can load them, and it drives `astro build` with `PROFILE_VERIFICATION_BUILD=1`.
- **Tracked records bind code to human decisions.**
  - site/verification/profile/fact-approval.json binds the profile data digests. It must equal `EXPECTED_RECEIPT` in production-profile.ts key for key, so a receipt change is always a two-file change plus the test pin in production-profile.test.ts.
  - docs/resume/product-engineer/inventory-r<N>.json is the exact input of the pinned `inventoryDigest`. The build does not read it; reproducibility is by convention (revision-r7.md).
  - site/verification/profile/manual-web-accessibility.json binds the review-subject digest.
  - site/verification/resume/current-release.json binds the public PDF.

## Dependency Risks

| Risk | Where | Impact on the redesign |
|---|---|---|
| CDN stylesheets without SRI and a tag-addressed Pretendard path | profile-resources.ts:49-69 | a font or CSS change at the CDN changes rendering. Self-hosting fonts would remove the dependency |
| Third-party geolocation-based API in the theme path | solar.ts | an HIG-aligned appearance model would drop or demote it |
| Exact pins coupled to review digests | package.json and the review-subject list | any dependency bump (Astro, Vite, Playwright, axe) invalidates the human accessibility record |
| Version-specific `mmdc` fallback path | mermaid.rs:22-26 | when PATH lacks `mmdc`, a Node upgrade breaks diagram rendering and the preprocessor fails the run |
| Pre-1.0 `serde_yml` | Cargo.toml | frontmatter parsing changes on upgrade |
| Root node_modules/ without a manifest | repository root (ignored) | unknown provenance; candidate for cleanup |
| Period grammar restated in eight production sites plus test generators | types.ts, validation.ts, issues.ts, fact-approval.ts, resume-manifest.ts, resume-evidence.ts, pdf-inspector.mjs, tests/pbt/u1/arbitraries | a new date precision must be added everywhere at once, or parity fails closed (2026-10-21) |
| Lockfiles not analyzed | site/package-lock.json, preprocessor/Cargo.lock | resolved transitive versions and advisories are unknown in this scan |
