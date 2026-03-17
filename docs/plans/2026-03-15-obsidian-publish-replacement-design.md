# Obsidian Publish Replacement — Design Document

**Date:** 2026-03-15
**Status:** Approved
**Approach:** Rust Preprocessor + Astro Frontend (Option C)

---

## 1. Motivation

Replace Obsidian Publish due to:
- Cost ($8/mo for limited control)
- D2 diagram rendering not supported
- Insufficient customization (layout, search, analytics)
- Performance limitations at 270+ notes
- Desire for full ownership of infrastructure

## 2. Architecture Overview

```
Obsidian Vault (.md)
       │
       ▼
┌──────────────────────────────────────┐
│ Rust Preprocessor (obsidian-press)   │
│                                      │
│  Pass 1: Scan & Index                │
│  Pass 2: Link Resolution             │
│  Pass 3: Content Transform           │
│  Pass 4: Search Index (Korean FTS)   │
│  Pass 5: Output                      │
└──────────┬───────────────────────────┘
           │ content/
           │  ├── posts/*.md
           │  ├── meta/*.json
           │  ├── graph.json
           │  ├── search-index.json
           │  └── assets/ (SVGs, images)
           ▼
┌──────────────────────────────────────┐
│ Astro Site                           │
│                                      │
│  - Layouts, pages, components        │
│  - Interactive islands (Preact)      │
│  - Outputs: dist/ (static HTML/CSS)  │
└──────────┬───────────────────────────┘
           │
           ▼
   S3 + CloudFront (AWS)
```

Two binaries, one build script:
- `obsidian-press` — Rust CLI, reads vault, outputs `content/`
- `astro build` — consumes `content/`, outputs `dist/`

## 3. Rust Preprocessor (`obsidian-press`)

### Pipeline Passes

**Pass 1: Scan & Index**
- Walk vault directory, collect all .md files
- Parse YAML frontmatter (tags, created, published)
- Build file index: slug <-> file path mapping
- Detect hub pages vs atomic posts

**Pass 2: Link Resolution**
- Parse all `[[wikilinks]]` and `[[link|alias]]`
- Resolve to actual file paths using the index
- Build forward link map and inverted backlink map
- Generate `graph.json` (nodes with metadata, edges)

**Pass 3: Content Transform**
- Resolve transclusions (`![[note]]`) -> inline content
- Convert `[[wikilinks]]` -> relative HTML links (`/posts/slug`)
- Convert callouts (`> [!type]`) -> `<div class="callout callout-{type}">`
- Pass LaTeX through unchanged (Astro side handles KaTeX)
- Pass Mermaid through unchanged (Astro side handles rendering)
- Render D2 fenced blocks -> shell out to `d2` CLI -> SVG to `assets/`
- Render Typst fenced blocks -> linked `typst` crate -> SVG to `assets/`
- Convert semantic footnotes to standard MD footnotes with proper anchors

**Pass 4: Search Index**
- Extract plain text per post (strip markdown syntax)
- Tokenize Korean text with `lindera` (MeCab dictionary)
- Build inverted index: token -> [(post_slug, position, context_snippet)]
- Output `search-index.json`

**Pass 5: Output**
- Write clean .md to `content/posts/`
- Write metadata JSON per post to `content/meta/`
- Write `graph.json`, `search-index.json`
- Copy/emit assets

### Key Rust Crates

| Purpose | Crate |
|---|---|
| Markdown parsing | `comrak` (GFM-compatible AST) |
| YAML frontmatter | `serde_yaml` |
| Korean tokenization | `lindera` + `lindera-ko-dic` |
| D2 rendering | `std::process::Command` (shell out to `d2` CLI) |
| Typst rendering | `typst` (linked as library) |
| File walking | `walkdir` |
| Parallel processing | `rayon` |
| Serialization | `serde_json` |

### Output Format (per post metadata)

```json
{
  "slug": "context-switch",
  "title": "Context Switch",
  "tags": ["os", "process"],
  "created": "2025-11-20",
  "published": "2025-12-01",
  "backlinks": ["scheduler", "process-control-block"],
  "forward_links": ["pcb", "tlb"],
  "is_hub": false,
  "hub_parent": "process-management",
  "reading_time_min": 8,
  "word_count": 2400
}
```

## 4. Diagram Strategy: D2 + Typst Hybrid

| Diagram Type | Tool | Reason |
|---|---|---|
| Flowcharts / process flows | D2 | Auto-layout excels |
| Architecture diagrams | D2 | Container nesting + auto-layout |
| Sequence diagrams | D2 | Native support |
| State machines | D2 | Auto-layout + edge routing |
| Network topology | D2 | Container nesting (VPC/subnet) |
| Tree/graph structures | D2 | Auto-layout for hierarchies |
| Data structure visualizations | Typst | Precise cell/pointer layout |
| Algorithm step-by-step | Typst | Exact positioning + LaTeX-quality math |

- D2: subprocess call, stdin/stdout piping, `--font-regular` for Korean
- Typst: linked as Rust library (zero subprocess overhead)
- Mermaid: legacy fallback, rendered by Astro's `rehype-mermaid`

## 5. Astro Site

### Page Structure

```
site/src/
├── layouts/
│   ├── BaseLayout.astro        # HTML shell, meta, theme, global CSS
│   ├── PostLayout.astro        # Single post: TOC, backlinks, hub nav
│   └── HubLayout.astro         # Hub page: child posts, progress
├── pages/
│   ├── index.astro             # Landing: recent posts, hub categories
│   ├── posts/[slug].astro      # Dynamic route per post
│   ├── hubs/[slug].astro       # Dynamic route per hub
│   ├── tags/[tag].astro        # Tag listing
│   ├── graph.astro             # Full vault graph
│   └── 404.astro
├── components/
│   ├── Header.astro
│   ├── Footer.astro
│   ├── PostCard.astro
│   ├── TableOfContents.astro
│   ├── BacklinkList.astro
│   ├── HubNav.astro            # Breadcrumb + prev/next
│   ├── HubProgress.astro       # Completed/total in hub
│   ├── TagCloud.astro
│   ├── Callout.astro
│   └── Footnote.astro
├── islands/                    # Client-side interactive (Preact)
│   ├── Search.tsx              # Cmd+K modal, Korean FTS
│   ├── GraphView.tsx           # d3-force full graph
│   ├── LocalGraph.tsx          # 2-hop sidebar graph
│   └── ThemeToggle.tsx
└── styles/
    ├── global.css
    ├── post.css
    ├── callouts.css
    └── diagrams.css
```

### Interactive Islands (Preact, 3KB runtime)

**Search** — Cmd+K modal, lazy-loads `search-index.json`, Korean-aware matching, keyboard navigation

**Graph View** — d3-force, full graph on `/graph`, local 2-hop graph in post sidebar, nodes colored by hub

**Theme Toggle** — CSS custom properties, `localStorage` persistence, respects `prefers-color-scheme`

### Rendering Responsibilities

| Feature | Handled By |
|---|---|
| Markdown -> HTML | Astro built-in (remark/rehype) |
| LaTeX | `rehype-katex` |
| Mermaid (legacy) | `rehype-mermaid` |
| D2/Typst diagrams | Already SVG from preprocessor |
| Syntax highlighting | Shiki (Astro built-in) |
| Callouts | CSS (preprocessor outputs `<div>`) |
| Wikilinks | Already `<a>` from preprocessor |
| Footnotes | remark-footnotes |

### Styling

- Typography: Pretendard (Korean body), JetBrains Mono (code)
- Layout: single-column mobile, post + right sidebar (TOC + local graph) on desktop
- Theme: CSS custom properties, dark/light
- No CSS framework — custom CSS, small bundle

## 6. Obsidian Feature Parity

All features preserved:

- [x] `[[wikilinks]]` and `[[link|alias]]`
- [x] Backlinks
- [x] Graph view (interactive)
- [x] Callouts (`> [!note]`, `> [!warning]`, etc.)
- [x] Tags and tag-based navigation
- [x] LaTeX math
- [x] Mermaid diagrams
- [x] D2 diagrams (native rendering)
- [x] Typst diagrams (native rendering, new)
- [x] YAML frontmatter metadata
- [x] Semantic footnotes
- [x] Embedded notes / transclusion

## 7. AWS Infrastructure

```
CloudFront (CDN, HTTPS, custom domain)
├── /* -> S3 (static site)
└── Analytics: Umami Cloud (free tier initially)
```

| Component | Service | Est. Cost/mo |
|---|---|---|
| Static hosting | S3 | ~$0.50 |
| CDN + HTTPS | CloudFront + ACM | ~$1-2 |
| DNS | Route 53 | ~$0.50 |
| Analytics | Umami Cloud free tier | $0 |
| **Total** | | **~$2-3** |

Self-hosted analytics (Fargate + RDS) can be added later if traffic outgrows the free tier.

## 8. CI/CD — Jenkins

Pipeline runs on existing Jenkins instance.

```groovy
pipeline {
    agent {
        docker {
            image 'rust:latest'
            args '-v $HOME/.cargo/registry:/usr/local/cargo/registry'
        }
    }

    environment {
        AWS_REGION  = 'ap-northeast-2'
        S3_BUCKET   = 'blog-bucket'
        CF_DIST_ID  = credentials('cloudfront-dist-id')
        VAULT_PATH  = './vault'
    }

    tools {
        nodejs 'node-22'
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }
        stage('Install Tools') {
            steps {
                sh '''
                    curl -fsSL https://d2lang.com/install.sh | sh -s --
                    curl -fsSL https://bun.sh/install | bash
                    export PATH="$HOME/.bun/bin:$PATH"
                    cd site && bun install
                '''
            }
        }
        stage('Preprocess') {
            steps {
                sh 'cargo build --release -p obsidian-press'
                sh './target/release/obsidian-press ${VAULT_PATH} ./content'
            }
        }
        stage('Build Site') {
            steps {
                sh '''
                    export PATH="$HOME/.bun/bin:$PATH"
                    cd site && bun run astro build
                '''
            }
        }
        stage('Deploy') {
            when { branch 'main' }
            steps {
                withAWS(credentials: 'aws-blog-deploy', region: "${AWS_REGION}") {
                    sh "aws s3 sync site/dist/ s3://${S3_BUCKET} --delete"
                    sh "aws cloudfront create-invalidation --distribution-id ${CF_DIST_ID} --paths '/*'"
                }
            }
        }
    }

    post {
        success { echo 'Blog deployed successfully.' }
        failure { echo 'Build or deploy failed.' }
    }
}
```

Jenkins requirements: Docker Pipeline, NodeJS, Pipeline: AWS Steps plugins. Credentials: `aws-blog-deploy` (IAM), `cloudfront-dist-id` (secret text).

## 9. Project Structure

```
obsidian-blog/
├── preprocessor/           # Rust workspace
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs         # CLI entry point
│       ├── scanner.rs      # Pass 1: vault scanning & indexing
│       ├── linker.rs       # Pass 2: wikilink/backlink resolution
│       ├── transform.rs    # Pass 3: content transformation
│       ├── search.rs       # Pass 4: Korean FTS index
│       ├── d2.rs           # D2 -> SVG (subprocess)
│       ├── typst.rs        # Typst -> SVG (library link)
│       └── output.rs       # Pass 5: write content/
├── site/                   # Astro project
│   ├── astro.config.mjs
│   ├── package.json
│   └── src/
├── content/                # Generated (gitignored)
├── infra/                  # Terraform
│   └── main.tf
├── Jenkinsfile
├── Justfile
└── README.md
```

## 10. Build & Development Commands

```just
vault    := "/path/to/obsidian/vault"
content  := "./content"
site     := "./site"

build: preprocess site-build

preprocess:
    cargo run --release -p obsidian-press -- {{vault}} {{content}}

dev: preprocess
    cd {{site}} && astro dev

site-build:
    cd {{site}} && astro build

deploy: build
    aws s3 sync {{site}}/dist/ s3://blog-bucket --delete
    aws cloudfront create-invalidation --distribution-id $CF_DIST_ID --paths "/*"

d2-watch file:
    d2 --watch {{file}}

typst-render file out:
    typst compile {{file}} {{out}}
```
