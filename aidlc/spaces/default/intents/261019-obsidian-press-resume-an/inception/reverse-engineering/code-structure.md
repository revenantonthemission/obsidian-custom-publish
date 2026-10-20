# Code Structure

## Build System

- **Rust**: Cargo manifest at `preprocessor/Cargo.toml`; the repository root is not a Cargo workspace.
- **Site**: npm lockfile v3 and Astro scripts in `site/package.json`; all documented site commands use npm/npx.
- **Orchestration**: Root `Justfile` composes preprocess, build, test, and explicit deploy recipes.
- **CI/CD**: Root `Jenkinsfile` schedules build and deployment.
- **Infrastructure**: Terraform configuration under `infra/`.
- **Canonical Content**: External iCloud Obsidian Vault, specifically `Areas/Notes/`.

## Key Module Hierarchy

- Root automation coordinates three logical packages:
  - `preprocessor/`: Rust CLI and library.
  - `site/`: Astro static application with Preact islands.
  - `infra/`: Terraform delivery infrastructure.
- `fixtures/vault/` supplies integration-test data to `preprocessor/`.
- The preprocessor writes generated `content/`.
- Astro reads `content/` and writes generated `site/dist/`.
- Explicit deployment sends `site/dist/` to the resources described by `infra/`.

## Existing Files Inventory

### Root Authored Files

- `AGENTS.md` - Binding project architecture, build, testing, Git-flow, and AI-DLC instructions.
- `CLAUDE.md` - Parallel project guidance currently modified in the working tree.
- `.gitignore` - Source/generated boundary and secret-pattern exclusions.
- `Justfile` - Local preprocess, build, test, deploy, and AI-DLC integrity recipes.
- `Jenkinsfile` - Scheduled checkout, install, preprocess, build, and deployment pipeline.
- `.puppeteer-config.json` - Local machine-specific Chrome path for Mermaid CLI; ignored and not portable source.
- `docs/plans/*.md` - Historical design and implementation plans; useful context but not executable source.
- `docs/project/codebase_audit.md` - Historical quality assessment; verified selectively against current code.
- `docs/aidlc/README.md` - AI-DLC usage and lifecycle guidance.
- `docs/aidlc/intent-template.md` - Reusable AI-DLC intent template.

### Rust Package Configuration

- `preprocessor/Cargo.toml` - Crate metadata, direct dependencies, and release optimization.
- `preprocessor/Cargo.lock` - Exact Rust dependency graph.

### Rust Implementation

- `preprocessor/src/main.rs` - CLI arguments and top-level scan/link/output orchestration.
- `preprocessor/src/lib.rs` - Public module exports.
- `preprocessor/src/types.rs` - Post, index, link graph, and graph JSON models.
- `preprocessor/src/syntax.rs` - Shared lazy regular expressions and frontmatter boundary helper.
- `preprocessor/src/scanner.rs` - Vault walking, frontmatter parsing, slug/heading/block indexes, source-date stamping, and date derivation.
- `preprocessor/src/linker.rs` - Wikilink resolution, backlinks, forward links, and graph serialization.
- `preprocessor/src/transform.rs` - Ordered Obsidian syntax transformation and diagram dispatch.
- `preprocessor/src/hub_dates.rs` - Automatic publish-date annotations on hub list links.
- `preprocessor/src/d2.rs` - D2 style migration and CLI rendering.
- `preprocessor/src/mermaid.rs` - Mermaid inference, theming, Chrome configuration, and CLI rendering.
- `preprocessor/src/typst_render.rs` - Optional Typst CLI rendering.
- `preprocessor/src/search.rs` - Korean tokenization and inverted-index generation.
- `preprocessor/src/preview.rs` - Plain-text summary generation.
- `preprocessor/src/related.rs` - Weighted related-post recommendations.
- `preprocessor/src/nav_tree.rs` - Hub hierarchy and orphan navigation generation.
- `preprocessor/src/output.rs` - Per-post/global artifact and asset materialization.

### Rust Tests

- `preprocessor/tests/block_ref_test.rs` - Block links, aliases, anchors, and transclusion.
- `preprocessor/tests/d2_test.rs` - D2 SVG and Korean rendering.
- `preprocessor/tests/heading_ref_test.rs` - Heading fragments, aliases, and Korean slugs.
- `preprocessor/tests/image_embed_test.rs` - Image syntax, sizing, copy behavior, and transclusion distinction.
- `preprocessor/tests/linker_test.rs` - Forward links, aliases, backlinks, and graph JSON.
- `preprocessor/tests/nav_tree_test.rs` - Navigation artifact and hub children.
- `preprocessor/tests/output_test.rs` - Output directory, Markdown, and metadata writes.
- `preprocessor/tests/preview_test.rs` - Preview artifact generation.
- `preprocessor/tests/scanner_test.rs` - Vault discovery, slugs, frontmatter, and hub detection.
- `preprocessor/tests/search_test.rs` - Search documents, tokenization, and serialization.
- `preprocessor/tests/transform_test.rs` - Wikilinks, transclusion, comments, highlights, callouts, LaTeX, footnotes, and hub dates.
- `preprocessor/tests/typst_test.rs` - Typst SVG and Korean rendering when Typst exists.

### Site Configuration

- `site/package.json` - Node requirement, Astro scripts, direct dependencies, and development dependencies.
- `site/package-lock.json` - Exact npm dependency graph; contains pre-existing user modifications.
- `site/astro.config.mjs` - Static output, canonical site URL, Preact integration, and sitemap integration.
- `site/tsconfig.json` - Astro TypeScript configuration and Preact JSX source.

### Astro Components

- `site/src/components/BacklinkList.astro` - Backlink metadata list.
- `site/src/components/Footer.astro` - Site footer.
- `site/src/components/Header.astro` - Desktop header, navigation, search trigger, theme control, and mobile entry point.
- `site/src/components/HubNav.astro` - Hub breadcrumb and previous/next navigation.
- `site/src/components/HubProgress.astro` - Hub completion progress.
- `site/src/components/PostCard.astro` - Post summary card.
- `site/src/components/RelatedPosts.astro` - Related-post cards.
- `site/src/components/TableOfContents.astro` - TOC derived from rendered heading IDs.

### Preact Islands

- `site/src/islands/GraphView.tsx` - Full interactive knowledge graph.
- `site/src/islands/LocalGraph.tsx` - Current-post neighborhood graph.
- `site/src/islands/MobileNav.tsx` - Mobile header navigation.
- `site/src/islands/MobileSidebar.tsx` - Mobile post navigation, TOC, and local context.
- `site/src/islands/NavTree.tsx` - Desktop generated navigation tree loader.
- `site/src/islands/Search.tsx` - Keyboard-accessible search launcher, lazy index loading, matching, and results.
- `site/src/islands/ThemeToggle.tsx` - Manual and solar-aware theme interaction.
- `site/src/islands/TreeNodeItem.tsx` - Recursive navigation-tree node.

### Astro Layouts

- `site/src/layouts/BaseLayout.astro` - HTML shell, SEO defaults, theme bootstrap, shared header/footer/search, progress, and global styles.
- `site/src/layouts/HubLayout.astro` - Hub shell and child-post presentation.
- `site/src/layouts/PostLayout.astro` - Post shell, metadata, navigation, TOC, related posts, backlinks, local graph, and enhancement scripts.

### Site Libraries

- `site/src/lib/data.ts` - Build-time filesystem data access and caching.
- `site/src/lib/graphSim.ts` - Shared D3 simulation and navigation behavior.
- `site/src/lib/graphUtils.ts` - Graph models, colors, and radius calculations.
- `site/src/lib/render.ts` - Actual Unified Markdown-to-HTML pipeline.
- `site/src/lib/solar.ts` - Geolocation, sunrise/sunset fetch/cache, and theme timing.
- `site/src/lib/toc.ts` - Rendered-heading extraction.
- `site/src/lib/types.ts` - TypeScript models matching generated Rust JSON.

### Astro Pages

- `site/src/pages/index.astro` - Homepage backed by `passion-project` plus dynamically inserted posts published today.
- `site/src/pages/posts/[slug].astro` - Static route for every post and hub note.
- `site/src/pages/hubs/[slug].astro` - Static hub-specific route.
- `site/src/pages/tags/index.astro` - Tag index.
- `site/src/pages/tags/[tag].astro` - Static tag result route.
- `site/src/pages/graph.astro` - Full graph page.
- `site/src/pages/rss.xml.ts` - Build-time RSS GET endpoint.
- `site/src/pages/404.astro` - Error recovery page.

### Browser Enhancement Scripts

- `site/src/scripts/copy-button.ts` - Code-copy buttons and feedback.
- `site/src/scripts/diagram-wrap.ts` - Runtime diagram wrapper normalization.
- `site/src/scripts/heading-fold.ts` - Collapsible post sections and TOC expansion.
- `site/src/scripts/link-preview.ts` - Desktop tooltip and mobile preview card.
- `site/src/scripts/toc-highlight.ts` - Intersection-observer TOC state.

### Styles

- `site/src/styles/global.css` - Design tokens, base layout, typography, header/footer, cards, tags, and responsive rules.
- `site/src/styles/post.css` - Rendered post typography, code, table, image, footnote, and heading behavior.
- `site/src/styles/callouts.css` - Obsidian callout variants and collapsing.
- `site/src/styles/diagrams.css` - Diagram containers and theme crossfade.
- `site/src/styles/link-preview.css` - Link preview surfaces.
- `site/src/styles/mobile-sidebar.css` - Mobile post sidebar.
- `site/src/styles/nav-tree.css` - Navigation tree adjustments.
- `site/src/styles/search.css` - Search dialog and result presentation.

### Authored Static Files

- `site/public/favicon.ico` - Browser favicon.
- `site/public/favicon.svg` - Vector favicon.
- `site/public/robots.txt` - Crawler policy.

### Infrastructure

- `infra/main.tf` - Provider, remote backend, S3, OAC, logging, CloudFront, rewrite function, security headers, errors, and TLS.
- `infra/variables.tf` - Region, bucket, domain, and certificate inputs.
- `infra/outputs.tf` - Distribution ID/domain and bucket outputs.
- `infra/.terraform.lock.hcl` - Exact Terraform provider lock.

### Test Fixtures

- `fixtures/vault/Hub Page.md` - Hub frontmatter and child links.
- `fixtures/vault/Post With Block Refs.md` - Block IDs and references.
- `fixtures/vault/Post With Callouts.md` - Callout variants.
- `fixtures/vault/Post With Diagrams.md` - Diagram fences.
- `fixtures/vault/Post With Footnotes.md` - Footnote preservation.
- `fixtures/vault/Post With Formatting.md` - General Markdown formatting.
- `fixtures/vault/Post With Links.md` - Wikilinks and aliases.
- `fixtures/vault/Post With Math.md` - Inline and block math.
- `fixtures/vault/Post With Transclusion.md` - Note and heading transclusion.
- `fixtures/vault/Simple Post.md` - Basic scan and output case.
- `fixtures/vault/attachment/test-image.png` - Real image-copy fixture.

### External Canonical File Relevant to This Intent

- `Areas/Notes/Passion Project.md` in the external Vault - Current source of the homepage's GitHub, Résumé, and Portfolio links.

## Generated Files and Directories

These are build outputs, not behavioral source:

- `content/posts/`, `content/meta/`, `content/assets/`
- `content/search-index.json`, `content/graph.json`, `content/previews.json`, `content/nav-tree.json`
- `site/dist/`
- Rust `target/`
- `site/public/search-index.json`, `site/public/graph.json`, `site/public/previews.json`, `site/public/nav-tree.json`, `site/public/assets/`

Three generated public JSON files are both tracked and currently dirty. They must remain preserved and must not become the only implementation surface.

## Design Patterns

### Compiler Pipeline

- **Location**: `preprocessor/src/main.rs`, scanner, linker, transform, search, and output modules.
- **Purpose**: Separate discovery, relationship resolution, transformation, indexing, and materialization.
- **Implementation**: Shared `VaultIndex` and `LinkGraph` contracts pass through ordered build stages.

### Static Site Generation

- **Location**: Astro page modules and `data.ts`.
- **Purpose**: Remove runtime server dependencies and pre-render all content routes.
- **Implementation**: `getStaticPaths()` plus synchronous generated-content reads during build.

### Islands Architecture

- **Location**: `site/src/islands/`.
- **Purpose**: Keep most pages static while hydrating search, graph, navigation, and theme controls.
- **Implementation**: Preact islands with Astro client directives.

### Unified Rendering Pipeline

- **Location**: `site/src/lib/render.ts`.
- **Purpose**: Preserve raw preprocessor HTML while adding GFM, math, slugs, syntax highlighting, captions, tables, and stringification.
- **Implementation**: Ordered remark/rehype plugins with `rehype-raw`.

### Generated Contract Boundary

- **Location**: `content/` and selected `site/public/` files.
- **Purpose**: Decouple Vault syntax processing from presentation.
- **Implementation**: Rust JSON/Markdown outputs consumed by build-time and runtime frontend code.

### Cached Build-Time Repository

- **Location**: `site/src/lib/data.ts`.
- **Purpose**: Avoid repeated filesystem reads during static generation.
- **Implementation**: Module-level caches for metadata, graph, and previews.

### Theme-Aware Dual Rendering

- **Location**: Rust diagram modules and `site/src/styles/diagrams.css`.
- **Purpose**: Keep D2 and Mermaid readable across themes.
- **Implementation**: Light/dark SVG pairs in a shared container with opacity crossfade.

## Critical Dependencies

- **Generated content contract**: Changes spanning Rust and TypeScript must keep schemas and slug semantics aligned.
- **Raw HTML handling**: `rehype-raw` is required by callout, wikilink, hub-date, and diagram output.
- **Heading IDs**: Rust heading references and frontend `rehype-slug` behavior must remain compatible.
- **External Vault**: Homepage profile links currently cannot be changed exclusively inside the repository without changing the integration model.
- **Current working tree**: Existing authored and generated changes are user-owned and must not be overwritten.
- **Git base**: `main` and `develop` divergence prevents safe compliance with the normal develop-based branch flow until resolved.

## Obsidian Press Extension Compliance

- **OBSIDIAN-01**: Compliant. Relevant project constraints are attached to concrete files.
- **OBSIDIAN-02**: Compliant. Source and generated inventories are separate.
- **OBSIDIAN-03**: N/A for structural documentation.
- **OBSIDIAN-04**: Compliant. Branch-base blockage is recorded.
- **OBSIDIAN-05**: Compliant. Inventory belongs to the only active workflow.
