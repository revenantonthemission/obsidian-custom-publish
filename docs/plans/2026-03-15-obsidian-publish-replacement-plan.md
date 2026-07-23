# Obsidian Publish Replacement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a custom static blog pipeline that replaces Obsidian Publish, using a Rust preprocessor for Obsidian-flavored markdown and Astro for the frontend.

**Architecture:** Rust CLI (`obsidian-press`) reads an Obsidian vault and outputs clean markdown + metadata JSON + search index + graph data. Astro consumes this output to build a static site. Deploy to S3 + CloudFront via Jenkins.

**Tech Stack:** Rust (comrak, lindera, serde, rayon, typst), Astro, Preact, d3-force, KaTeX, Terraform, Jenkins

**Design Doc:** `docs/plans/2026-03-15-obsidian-publish-replacement-design.md`

---

## Phase 1: Project Scaffolding

### Task 1: Initialize Rust workspace

**Files:**
- Create: `preprocessor/Cargo.toml`
- Create: `preprocessor/src/main.rs`
- Create: `.gitignore`

**Step 1: Create the Rust project**

```bash
mkdir obsidian-blog && cd obsidian-blog
cargo init --name obsidian-press preprocessor
```

**Step 2: Configure Cargo.toml with initial dependencies**

```toml
[package]
name = "obsidian-press"
version = "0.1.0"
edition = "2024"

[dependencies]
anyhow = "1"
comrak = { version = "0.36", default-features = false, features = ["shortcodes"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
serde_yaml = "0.9"
walkdir = "2"
rayon = "1.10"
clap = { version = "4", features = ["derive"] }
regex = "1"

[profile.release]
lto = true
codegen-units = 1
```

Note: `lindera`, `typst`, and `tempfile` are added in later tasks when needed.

**Step 3: Write minimal CLI entry point**

`preprocessor/src/main.rs`:
```rust
use clap::Parser;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "obsidian-press")]
#[command(about = "Obsidian vault to static site preprocessor")]
struct Cli {
    /// Path to the Obsidian vault
    vault: PathBuf,
    /// Output directory
    output: PathBuf,
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    println!("Vault: {:?}", cli.vault);
    println!("Output: {:?}", cli.output);
    Ok(())
}
```

**Step 4: Verify it compiles and runs**

Run: `cd preprocessor && cargo run -- /tmp/test-vault /tmp/test-output`

Expected: prints vault and output paths, exits 0.

**Step 5: Create .gitignore at repo root**

```
/target/
/content/
node_modules/
dist/
.DS_Store
```

**Step 6: Commit**

```bash
git init && git add -A
git commit -m "feat: initialize Rust workspace with CLI skeleton"
```

---

### Task 2: Initialize Astro project

**Files:**
- Create: `site/` (Astro project directory)

**Step 1: Scaffold Astro project**

```bash
bun create astro@latest site -- --template minimal --install --no-git
```

**Step 2: Install Astro dependencies**

```bash
cd site && bun add @astrojs/preact preact
```

**Step 3: Configure Astro**

`site/astro.config.mjs`:
```javascript
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  integrations: [preact()],
  output: 'static',
});
```

**Step 4: Create a placeholder index page**

`site/src/pages/index.astro`:
```astro
---
---
<html lang="ko">
  <head><meta charset="utf-8" /><title>Blog</title></head>
  <body><h1>obsidian-press blog</h1><p>Site is working.</p></body>
</html>
```

**Step 5: Verify Astro builds**

Run: `cd site && bun run astro build`

Expected: `dist/` directory created with `index.html`.

**Step 6: Commit**

```bash
cd .. && git add site/ && git commit -m "feat: initialize Astro project with Preact integration"
```

---

### Task 3: Create Justfile and test fixture vault

**Files:**
- Create: `Justfile`
- Create: `fixtures/vault/*.md` (8 test files)

**Step 1: Create Justfile**

```just
vault       := env("VAULT_PATH", "./fixtures/vault")
content     := "./content"
site_dir    := "./site"

build: preprocess site-build

preprocess:
    cargo run --release --manifest-path preprocessor/Cargo.toml -- {{vault}} {{content}}

dev: preprocess
    cd {{site_dir}} && bun run astro dev

site-build:
    cd {{site_dir}} && bun run astro build

deploy: build
    aws s3 sync {{site_dir}}/dist/ s3://$S3_BUCKET --delete
    aws cloudfront create-invalidation --distribution-id $CF_DIST_ID --paths "/*"

test:
    cd preprocessor && cargo test

d2-watch file:
    d2 --watch {{file}}

typst-render file out:
    typst compile {{file}} {{out}}
```

**Step 2: Create test fixture vault**

Create these files in `fixtures/vault/`:

1. `Simple Post.md` — basic markdown, frontmatter with tags/created/published
2. `Post With Links.md` — contains `[[Simple Post]]`, `[[Simple Post|alias link]]`, `[[Nonexistent Page]]`
3. `Post With Callouts.md` — contains `> [!note]` and `> [!warning]` blocks
4. `Post With Math.md` — inline `$...$` and block `$$...$$` LaTeX
5. `Post With Transclusion.md` — contains `![[Simple Post]]`
6. `Post With Footnotes.md` — semantic footnotes `[^context-switch]`, `[^tlb-flush]`
7. `Hub Page.md` — frontmatter `is_hub: true`, links to child posts
8. `Post With Diagrams.md` — fenced D2 and Mermaid code blocks

Each file has YAML frontmatter with `tags`, `created`, `published` fields.

**Step 3: Verify just commands work**

Run: `just test`

Expected: `cargo test` runs (no tests yet, but compiles).

**Step 4: Commit**

```bash
git add Justfile fixtures/ && git commit -m "feat: add Justfile and test fixture vault"
```

---

## Phase 2: Rust Preprocessor — Core Passes

### Task 4: Pass 1 — Vault scanner and file index

**Files:**
- Create: `preprocessor/src/types.rs`
- Create: `preprocessor/src/scanner.rs`
- Create: `preprocessor/src/lib.rs`
- Modify: `preprocessor/src/main.rs`
- Create: `preprocessor/tests/scanner_test.rs`

**Step 1: Write the failing tests**

`preprocessor/tests/scanner_test.rs` — 4 tests:
- `test_scan_vault_finds_all_markdown_files` — asserts `index.posts.len() >= 7`
- `test_scan_vault_parses_frontmatter` — finds "simple-post", checks title/tags/created
- `test_scan_vault_generates_slugs_from_filename` — checks "post-with-links" slug
- `test_scan_vault_detects_hub_pages` — checks `is_hub == true` for "hub-page"

**Step 2: Run tests to verify they fail**

Run: `cd preprocessor && cargo test`

Expected: FAIL — module `scanner` not found.

**Step 3: Define shared types in `types.rs`**

- `PostMeta` struct: slug, title, file_path, tags, created, published, is_hub, hub_parent, raw_content
- `VaultIndex` struct: posts vec, slug_map (slug -> index), name_map (filename -> index)

**Step 4: Implement scanner in `scanner.rs`**

- Walk vault with `walkdir`, skip hidden dirs
- Parse YAML frontmatter (split on `---`)
- Generate slug from filename (lowercase, spaces to hyphens)
- Build slug_map and name_map

**Step 5: Wire up `lib.rs` and update `main.rs`**

`lib.rs` exports `pub mod scanner; pub mod types;`

`main.rs` calls `scan_vault()` and prints results.

**Step 6: Run tests to verify they pass**

Run: `cd preprocessor && cargo test`

Expected: all 4 tests PASS.

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: implement vault scanner (Pass 1) with frontmatter parsing"
```

---

### Task 5: Pass 2 — Link resolution and graph building

**Files:**
- Create: `preprocessor/src/linker.rs`
- Modify: `preprocessor/src/types.rs` (add Link, LinkGraph, GraphJson types)
- Create: `preprocessor/tests/linker_test.rs`

**Step 1: Write the failing tests**

`preprocessor/tests/linker_test.rs` — 4 tests:
- `test_forward_links_detected` — "Post With Links" has forward link to "simple-post"
- `test_backlinks_built` — "simple-post" has backlinks from "post-with-links" and "hub-page"
- `test_alias_links_resolved` — alias link carries `Some("alias link")`
- `test_graph_json_structure` — `to_graph_json()` returns non-empty nodes and edges

**Step 2: Run tests to verify they fail**

Run: `cd preprocessor && cargo test`

Expected: FAIL — module `linker` not found.

**Step 3: Add link types to `types.rs`**

- `Link { target_slug, alias }`
- `LinkGraph { forward_links: Vec<Vec<Link>>, backlinks: Vec<Vec<String>> }`
- `GraphJson { nodes: Vec<GraphNode>, edges: Vec<GraphEdge> }`
- `GraphNode { slug, title, tags, is_hub, backlink_count }`
- `GraphEdge { source, target }`

**Step 4: Implement linker**

- Regex `\[\[([^\]|]+)(?:\|([^\]]+))?\]\]` to parse wikilinks
- Resolve targets via `index.name_map`
- Build forward_links per post, invert to backlinks, deduplicate
- `to_graph_json()` method on LinkGraph

**Step 5: Register module, run tests**

Run: `cd preprocessor && cargo test`

Expected: all tests PASS.

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: implement link resolution and graph building (Pass 2)"
```

---

### Task 6: Pass 3 — Content transformation (wikilinks, callouts, transclusions)

**Files:**
- Create: `preprocessor/src/transform.rs`
- Create: `preprocessor/tests/transform_test.rs`

**Step 1: Write the failing tests**

`preprocessor/tests/transform_test.rs` — 7 tests:
- `test_wikilinks_converted_to_html_links` — `[[Simple Post]]` becomes `<a href="/posts/simple-post">`
- `test_alias_links_use_alias_text` — `[[Simple Post|alias link]]` displays "alias link"
- `test_callouts_converted_to_divs` — `> [!note]` becomes `<div class="callout callout-note">`
- `test_transclusions_inlined` — `![[Simple Post]]` replaced with content
- `test_latex_passed_through_unchanged` — `$f(x)$` preserved as-is
- `test_footnotes_preserved` — `[^context-switch]` preserved as-is
- `test_unresolved_wikilinks_become_plain_text` — `[[Nonexistent Page]]` becomes plain text

**Step 2: Run tests to verify they fail**

Run: `cd preprocessor && cargo test`

Expected: FAIL — module `transform` not found.

**Step 3: Implement transform**

Key functions:
- `transform_content(index, graph, post_idx) -> String`
- `strip_frontmatter(content) -> String`
- `resolve_transclusions(content, index) -> String` — regex `!\[\[(.+?)\]\]`
- `convert_wikilinks(content, index) -> String` — regex, resolve via name_map, unresolved -> plain text
- `convert_callouts(content) -> String` — line-by-line parser for blockquote callout syntax

LaTeX and footnotes pass through unchanged (handled by Astro's remark/rehype).

**Step 4: Run tests to verify they pass**

Run: `cd preprocessor && cargo test`

Expected: all tests PASS.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: implement content transformation (Pass 3) — wikilinks, callouts, transclusions"
```

---

### Task 7: Pass 3 extension — D2 diagram rendering

**Files:**
- Create: `preprocessor/src/d2.rs`
- Modify: `preprocessor/src/transform.rs` (add D2 block handling)
- Create: `preprocessor/tests/d2_test.rs`

**Prerequisite:** `d2` CLI must be installed.

**Step 1: Write the failing tests**

`preprocessor/tests/d2_test.rs` — 2 tests:
- `test_d2_renders_svg` — simple graph renders to SVG string containing `<svg`
- `test_d2_with_korean_text` — Korean labels render without error

**Step 2: Run tests to verify they fail**

**Step 3: Implement D2 renderer**

`d2.rs`:
- `render_d2(source, font_path) -> Result<String>`
- Spawn `d2` process with stdin (`-`) and stdout (`-`) piping
- Optional `--font-regular` flag for Korean font

**Step 4: Integrate into transform**

Add `render_d2_blocks(content, asset_dir)` to transform pipeline:
- Regex match `` ```d2\n...\n``` `` blocks
- Render each to SVG, write to `assets/d2-N.svg`
- Replace block with `<img src="/assets/d2-N.svg" class="diagram" />`

**Step 5: Run tests, commit**

```bash
git add -A && git commit -m "feat: add D2 diagram rendering (Pass 3 extension)"
```

---

### Task 8: Pass 3 extension — Typst diagram rendering

**Files:**
- Create: `preprocessor/src/typst_render.rs`
- Modify: `preprocessor/Cargo.toml` (add `tempfile = "3"`)
- Create: `preprocessor/tests/typst_test.rs`

**Prerequisite:** `typst` CLI must be installed.

**Step 1: Write the failing tests**

`preprocessor/tests/typst_test.rs` — 2 tests:
- `test_typst_renders_svg` — fletcher diagram renders to SVG
- `test_typst_with_korean` — Korean text table renders

**Step 2: Run tests to verify they fail**

**Step 3: Implement Typst renderer (subprocess approach)**

`typst_render.rs`:
- `render_typst(source) -> Result<String>`
- Write source to temp file, run `typst compile input.typ output.svg`
- Read SVG output, return as string

Note: Library linking is a future optimization. Subprocess is simpler for initial implementation.

**Step 4: Integrate into transform**

Same pattern as D2: match `` ```typst\n...\n``` ``, render, replace with `<img>`.

**Step 5: Run tests, commit**

```bash
git add -A && git commit -m "feat: add Typst diagram rendering (Pass 3 extension)"
```

---

### Task 9: Pass 4 — Korean full-text search index

**Files:**
- Create: `preprocessor/src/search.rs`
- Modify: `preprocessor/Cargo.toml` (add `lindera = "0.38"`)
- Create: `preprocessor/tests/search_test.rs`

**Step 1: Write the failing tests**

`preprocessor/tests/search_test.rs` — 3 tests:
- `test_search_index_contains_all_posts` — document count matches post count
- `test_search_index_tokenizes_content` — inverted_index is non-empty
- `test_search_index_serializes_to_json` — JSON contains "documents" and "inverted_index"

**Step 2: Run tests to verify they fail**

**Step 3: Implement search index builder**

`search.rs`:
- `SearchIndex { documents: Vec<SearchDocument>, inverted_index: HashMap<String, Vec<SearchHit>> }`
- `SearchDocument { slug, title, snippet (first 200 chars) }`
- `SearchHit { doc_idx, positions }`
- `build_search_index(index) -> SearchIndex`
- Strip markdown, tokenize with `lindera` (Korean MeCab dictionary)
- Build inverted index: token -> list of (doc_idx, positions)
- Skip tokens shorter than 2 characters (particles)

**Step 4: Run tests, commit**

```bash
git add -A && git commit -m "feat: implement Korean full-text search index (Pass 4)"
```

---

### Task 10: Pass 5 — Output writer and CLI integration

**Files:**
- Create: `preprocessor/src/output.rs`
- Modify: `preprocessor/src/main.rs` (wire all passes)
- Create: `preprocessor/tests/output_test.rs`

**Step 1: Write the failing tests**

`preprocessor/tests/output_test.rs` — 3 tests:
- `test_output_creates_directory_structure` — posts/, meta/, assets/, graph.json, search-index.json exist
- `test_output_writes_post_markdown` — `posts/simple-post.md` exists and contains expected content
- `test_output_writes_metadata_json` — `meta/simple-post.json` is valid JSON with correct fields

**Step 2: Run tests to verify they fail**

**Step 3: Implement output writer**

`output.rs`:
- `write_output(index, graph, output_dir) -> Result<()>`
- Create directory structure (posts/, meta/, assets/)
- For each post: transform content, write .md, calculate word_count/reading_time, write meta JSON
- Write graph.json (from LinkGraph)
- Write search-index.json (from build_search_index)

**Step 4: Wire everything in main.rs**

```rust
let index = scan_vault(&cli.vault)?;
let graph = resolve_links(&index);
write_output(&index, &graph, &cli.output)?;
```

**Step 5: End-to-end test with fixture vault**

Run: `just preprocess && ls content/posts/ && ls content/meta/`

Expected: all directories populated, JSON files valid.

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: implement output writer and wire full CLI pipeline (Pass 5)"
```

---

## Phase 3: Astro Site — Core Pages

### Task 11: Data loading layer

**Files:**
- Create: `site/src/lib/types.ts`
- Create: `site/src/lib/data.ts`

**Step 1: Define TypeScript types**

`types.ts`: PostMeta, GraphData, GraphNode, GraphEdge, SearchIndex, SearchDocument, SearchHit — matching the preprocessor's JSON output.

**Step 2: Implement data loading functions**

`data.ts`:
- `getAllPostMeta()` — read all `content/meta/*.json`
- `getPostMeta(slug)` — read single meta file
- `getPostContent(slug)` — read `content/posts/{slug}.md`
- `getGraph()` — read `content/graph.json`
- `getHubs()` — filter all posts where `is_hub == true`
- `getTagIndex()` — aggregate tags into `Record<string, PostMeta[]>`

Uses `node:fs` and `node:path` for file reading at Astro build time.

**Step 3: Verify by running Astro dev**

Run: `just preprocess && cd site && bun run astro dev`

Expected: dev server starts without errors.

**Step 4: Commit**

```bash
git add site/src/lib/ && git commit -m "feat: add data loading layer for preprocessor output"
```

---

### Task 12: Base layout and global styles

**Files:**
- Create: `site/src/layouts/BaseLayout.astro`
- Create: `site/src/styles/global.css`
- Create: `site/src/styles/post.css`
- Create: `site/src/styles/callouts.css`
- Create: `site/src/styles/diagrams.css`

**Step 1: Create BaseLayout**

- HTML shell with `lang="ko"`, meta tags, Pretendard + JetBrains Mono fonts
- Site header (nav: title, Tags, Graph links)
- `<slot />` for page content
- Site footer
- Import global.css

**Step 2: Create global.css**

- CSS custom properties for light/dark themes
- `[data-theme='dark']` overrides
- `prefers-color-scheme` media query for auto theme
- Base typography, links, code, layout (max-width 720px + sidebar)

**Step 3: Create post.css, callouts.css, diagrams.css**

Minimal initial versions — refine during design iteration phase.

**Step 4: Commit**

```bash
git add site/src/layouts/ site/src/styles/ && git commit -m "feat: add BaseLayout and global styles"
```

---

### Task 13: Post page with TOC and backlinks

**Files:**
- Create: `site/src/pages/posts/[slug].astro`
- Create: `site/src/layouts/PostLayout.astro`
- Create: `site/src/components/TableOfContents.astro`
- Create: `site/src/components/BacklinkList.astro`

**Step 1: Create dynamic route**

`pages/posts/[slug].astro`:
- `getStaticPaths()` returns all post slugs
- Loads meta and content for current slug
- Renders with PostLayout

**Step 2: Create PostLayout**

- Wraps BaseLayout
- Two-column: article (content + backlinks) + sidebar (TOC)
- Article header: title, published date, reading time, tags
- `set:html` for transformed content (or use Astro's markdown rendering)

**Step 3: Create TableOfContents**

- Extract h2-h4 headings from content via regex
- Render as nested `<nav>` list with anchor links
- Handle Korean heading text in slug generation

**Step 4: Create BacklinkList**

- Receive backlink slugs as prop
- Load meta for each backlink
- Render as "이 페이지를 참조하는 글" section

**Step 5: Build and verify**

Run: `just build && ls dist/posts/`

Expected: HTML files for each post.

**Step 6: Commit**

```bash
git add site/src/ && git commit -m "feat: add post page with TOC, backlinks, and PostLayout"
```

---

### Task 14: Index page, hub pages, and tag pages

**Files:**
- Modify: `site/src/pages/index.astro`
- Create: `site/src/pages/hubs/[slug].astro`
- Create: `site/src/layouts/HubLayout.astro`
- Create: `site/src/pages/tags/index.astro`
- Create: `site/src/pages/tags/[tag].astro`
- Create: `site/src/components/PostCard.astro`
- Create: `site/src/components/HubNav.astro`
- Create: `site/src/components/HubProgress.astro`

**Step 1: Create PostCard**

- Post preview card: title (link), date, reading time, tags (first 3)

**Step 2: Update index.astro**

- Recent posts (sorted by published, top 10)
- Hub categories listing

**Step 3: Create hub page and layout**

- HubLayout: list child posts, show progress
- HubNav: breadcrumb navigation (hub -> post), prev/next within hub
- HubProgress: completed/total count

**Step 4: Create tag pages**

- `tags/index.astro`: all tags with post counts
- `tags/[tag].astro`: all posts for a tag

**Step 5: Build and verify**

Run: `just build && ls dist/`

Expected: index.html, posts/, hubs/, tags/ in dist/.

**Step 6: Commit**

```bash
git add site/src/ && git commit -m "feat: add index, hub, and tag pages"
```

---

## Phase 4: Interactive Islands

### Task 15: Theme toggle island

**Files:**
- Create: `site/src/islands/ThemeToggle.tsx`
- Modify: `site/src/layouts/BaseLayout.astro`

**Step 1: Create ThemeToggle**

Preact component:
- Read theme from localStorage on mount, fall back to `prefers-color-scheme`
- Set `data-theme` attribute on `<html>`
- Toggle button, persist to localStorage

**Step 2: Add to BaseLayout with `client:load`**

**Step 3: Build, commit**

```bash
git add -A && git commit -m "feat: add theme toggle island"
```

---

### Task 16: Search island

**Files:**
- Create: `site/src/islands/Search.tsx`
- Modify: `site/src/layouts/BaseLayout.astro`
- Modify: `Justfile` (copy search-index.json to public/)

**Step 1: Create Search component**

Preact component:
- `Cmd+K` / `Ctrl+K` keyboard shortcut to open modal
- `Esc` to close
- Lazy-load `search-index.json` on first open
- Debounced input, match against pre-built inverted index
- Title matching boosted (weight 100)
- Arrow key navigation, Enter to navigate
- Korean text display in results (title + snippet)

**Step 2: Add to BaseLayout with `client:idle`**

**Step 3: Update Justfile preprocess step**

Add: `cp content/search-index.json site/public/search-index.json`

**Step 4: Build, commit**

```bash
git add -A && git commit -m "feat: add search island with Korean FTS and keyboard navigation"
```

---

### Task 17: Graph view island

**Files:**
- Create: `site/src/islands/GraphView.tsx`
- Create: `site/src/islands/LocalGraph.tsx`
- Create: `site/src/pages/graph.astro`
- Modify: `site/src/layouts/PostLayout.astro`

**Step 1: Install d3**

```bash
cd site && bun add d3-force d3-selection d3-zoom && bun add -d @types/d3
```

**Step 2: Create GraphView**

Full vault graph:
- d3-force simulation with nodes and links
- SVG rendering (crisp at any zoom)
- Zoom/pan via d3-zoom
- Nodes colored by hub category (from tags)
- Node size proportional to backlink_count
- Click node -> navigate to post

**Step 3: Create LocalGraph**

2-hop neighborhood graph:
- Takes current `slug` and full `GraphData`
- Filters to nodes within 2 hops of current post
- Same d3-force rendering, smaller canvas
- Highlight current node

**Step 4: Create graph page**

`pages/graph.astro`: full-screen GraphView with `client:load`

**Step 5: Add LocalGraph to PostLayout sidebar with `client:visible`**

**Step 6: Build, commit**

```bash
git add -A && git commit -m "feat: add graph view and local graph islands"
```

---

## Phase 5: Astro Markdown Pipeline

### Task 18: Configure Astro remark/rehype plugins

**Files:**
- Modify: `site/astro.config.mjs`
- Modify: `site/src/layouts/BaseLayout.astro` (add KaTeX CSS)

**Step 1: Install plugins**

```bash
cd site && bun add rehype-katex remark-math remark-gfm katex
```

**Step 2: Configure Astro markdown pipeline**

`astro.config.mjs`:
- remarkPlugins: remark-math, remark-gfm
- rehypePlugins: rehype-katex
- shikiConfig: theme 'github-dark'

**Step 3: Add KaTeX CSS link to BaseLayout head**

**Step 4: Build, verify LaTeX rendering in post HTML output**

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: configure remark/rehype for LaTeX, GFM, and syntax highlighting"
```

---

## Phase 6: Infrastructure

### Task 19: Terraform for S3 + CloudFront

**Files:**
- Create: `infra/main.tf`
- Create: `infra/variables.tf`
- Create: `infra/outputs.tf`

**Step 1: Write Terraform config**

Resources:
- `aws_s3_bucket` with website configuration
- `aws_s3_bucket_public_access_block` (all blocked — CloudFront only)
- `aws_cloudfront_origin_access_control` (OAC for S3)
- `aws_cloudfront_distribution` (HTTPS, gzip, 404 handling)
- `aws_s3_bucket_policy` (allow CloudFront via OAC)

Variables: aws_region (default: ap-northeast-2), bucket_name, domain_name (optional)

Outputs: cloudfront_distribution_id, cloudfront_domain, s3_bucket_name

**Step 2: Validate**

Run: `cd infra && terraform init && terraform validate`

Expected: "Success! The configuration is valid."

**Step 3: Commit**

```bash
git add infra/ && git commit -m "feat: add Terraform config for S3 + CloudFront"
```

---

### Task 20: Jenkinsfile

**Files:**
- Create: `Jenkinsfile`

**Step 1: Write Jenkinsfile**

Pipeline stages:
1. **Checkout** — checkout scm
2. **Install Tools** — install D2 CLI, Bun, Astro deps
3. **Preprocess** — cargo build + run obsidian-press
4. **Build Site** — bun run astro build
5. **Deploy** (main branch only) — s3 sync + CloudFront invalidation

Agent: Docker with `rust:latest` image, cargo registry volume mount.
Tools: nodejs 'node-22'.
Credentials: `aws-blog-deploy` (IAM), `cloudfront-dist-id` (secret text).

**Step 2: Commit**

```bash
git add Jenkinsfile && git commit -m "feat: add Jenkins pipeline for build and deploy"
```

---

## Phase 7: Integration and Polish

### Task 21: End-to-end test with real vault

**Step 1: Run full pipeline against actual Obsidian vault**

```bash
VAULT_PATH="/path/to/obsidian/vault" just build
```

**Step 2: Verify output**

- `content/` has all expected posts
- `content/graph.json` is valid JSON
- `content/search-index.json` is valid JSON
- `dist/` has all HTML pages
- Open `dist/index.html` in browser

**Step 3: Check specific features**

- Korean slugs generate correctly
- Wikilinks with special characters resolve
- D2 diagrams render as SVG
- Typst diagrams render as SVG
- LaTeX renders via KaTeX
- Callouts styled correctly
- Backlinks appear on posts
- Search finds Korean text
- Graph view renders nodes and edges
- Theme toggle works
- Mobile responsive layout

**Step 4: Fix issues, commit**

```bash
git add -A && git commit -m "fix: resolve integration issues from real vault testing"
```

---

### Task 22: Deploy infrastructure and first publish

**Step 1: Apply Terraform**

```bash
cd infra && terraform apply -var="bucket_name=your-blog-bucket"
```

**Step 2: Deploy site**

```bash
just deploy
```

**Step 3: Verify live site**

Visit CloudFront domain URL. Check all features work in production.

**Step 4: Commit any final fixes**

---

## Task Dependency Graph

```
Phase 1: Scaffolding
  Task 1 (Rust) ──┐
  Task 2 (Astro) ─┤── Task 3 (Justfile + fixtures)
                   │
Phase 2: Preprocessor
  Task 4 (Scanner) → Task 5 (Linker) → Task 6 (Transform)
                                         ├→ Task 7 (D2)
                                         └→ Task 8 (Typst)
                     Task 9 (Search) → Task 10 (Output)

Phase 3: Astro Core
  Task 11 (Data) → Task 12 (Layout) → Task 13 (Post) → Task 14 (Index/Hub/Tags)

Phase 4: Islands
  Task 15 (Theme) ─┐
  Task 16 (Search) ┼── independent, parallelizable
  Task 17 (Graph)  ─┘

Phase 5: Markdown Pipeline
  Task 18 (Remark/Rehype)

Phase 6: Infrastructure
  Task 19 (Terraform) → Task 20 (Jenkins)

Phase 7: Integration
  Task 21 (E2E test) → Task 22 (Deploy)
```

**Parallelization opportunities:**
- Phase 2 and Phase 6 can start in parallel after Phase 1
- Phase 3 can start after Task 10 is complete
- Phase 4 tasks (15, 16, 17) are independent of each other
- Phase 5 can start after Task 12
