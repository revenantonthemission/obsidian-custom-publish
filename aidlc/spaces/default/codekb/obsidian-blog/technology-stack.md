# Technology Stack: obsidian-blog

Versions are the declared manifest ranges: caret ranges from site/package.json and major versions from preprocessor/Cargo.toml. Resolved versions are in site/package-lock.json and preprocessor/Cargo.lock, which this scan did not parse. The full package-by-package inventory is in dependencies.md.

## Languages

| Language | Where | Standard and settings |
|---|---|---|
| Rust | preprocessor/ | edition 2024 (needs a recent stable toolchain; no `rust-toolchain` file pins one); release profile `lto = true`, `codegen-units = 1` |
| TypeScript | site/src, site/tests | ^5.9.3; `astro/tsconfigs/strict`; `jsxImportSource: "preact"`; site/tsconfig.profile-tools.json compiles pure profile modules for Node tooling |
| JavaScript (ESM `.mjs`) | site/scripts | Node ESM with `.d.mts` declarations for typed test imports |
| Astro component syntax | site/src/pages, layouts, components | Astro 6 templates, scoped and global styles |
| TSX (Preact) | site/src/islands | function components with hooks |
| CSS | site/src/styles | plain CSS with custom properties. No preprocessor, utility framework or CSS modules |
| Markdown (Obsidian flavor) | vault, fixtures/vault | wikilinks, callouts, transclusions, highlights, comments, math, fenced diagrams |
| Groovy (declarative pipeline) | Jenkinsfile | Jenkins cron job |
| just | Justfile | task runner |
| JSON | receipts, allowlists, obligation map, generated artifacts | schema-versioned records |

## Runtimes and Platforms

| Runtime | Version | Notes |
|---|---|---|
| Node.js | `^22.12.0 \|\| >=24.0.0` (site/package.json engines) | launchd runs an absolute nvm Node binary (CLAUDE.md). When `which mmdc` fails, preprocessor/src/mermaid.rs:22-26 falls back to fixed paths, including a Node 25.9.0-specific `mmdc` |
| Rust toolchain | edition 2024 | built by Jenkins with `cargo build --release` |
| macOS | not pinned | launchd services, Homebrew, iCloud vault path; production runs on the maintainer's Mac |
| Browsers (verification) | Playwright 1.61.1 bundles | Chromium, Firefox and WebKit projects; Chrome or chrome-headless-shell for Mermaid rendering |

## Application Frameworks and Libraries

| Technology | Version | Purpose |
|---|---|---|
| Astro | ^6.0.4 | static site generator (`output: 'static'`, `site: 'https://rvnnt.dev'`) |
| Vite | 7.3.2 (exact) | bundler under Astro, pinned in devDependencies |
| Preact with @astrojs/preact | ^10.29.0, ^5.0.0 | islands |
| @astrojs/sitemap, @astrojs/rss | ^3.7.1, ^4.0.17 | sitemap and feed |
| unified with the remark and rehype ecosystem | unified ^11.0.5 | custom markdown pipeline in site/src/lib/render.ts |
| Shiki (@shikijs/rehype, @shikijs/transformers) | ^4.0.2 | code highlighting with `github-light` and `github-dark` |
| KaTeX through rehype-katex | ^7.0.1 (CSS 0.16.22 from CDN) | math |
| d3-force, d3-selection, d3-zoom, d3-drag | ^3 | graph visualization |
| lucide-static, lucide-preact | ^1.8.0 | icons |
| pretendard | 1.3.9 (exact) | source of the local profile font |
| clap | 4 (derive) | preprocessor CLI parsing |
| serde, serde_json, serde_yml | 1, 1, 0.0.12 | JSON output and YAML frontmatter |
| regex, walkdir, chrono, anyhow, tempfile | 1, 2, 0.4, 1, 3 | preprocessing utilities |
| lindera | 2 with `embed-ko-dic` | Korean morphological tokenization for search |

## Presentation Stack

| Concern | Current technology | Location |
|---|---|---|
| Styling | 13 hand-written stylesheets (8 blog, 5 profile), `--c-` custom properties, scoped Astro styles, inline island styles | site/src/styles, code-structure.md |
| Theming | `data-theme` attribute, inline ES5 bootstrap, sunrise and sunset auto-switching through the browser Geolocation API and api.sunrise-sunset.org | component-inventory.md Theme System |
| Body typography | Pretendard Variable 1.3.9 from jsDelivr (blog), the local `RVNNT Profile` alias (profile), system stack fallback | component-inventory.md Font Loading |
| Code typography | `--font-code` declares JetBrains Mono, which is never loaded; renders as `ui-monospace` or SF Mono | global.css:16 |
| Icons | Lucide (static SVG and Preact), CSS mask data URIs, Unicode glyphs | component-inventory.md Icon Sources |
| Diagrams | Mermaid CLI, D2 and Typst at build time; light and dark SVG pairs | preprocessor |
| Data visualization | d3 SVG (global graph), Canvas 2D (local graph) | site/src/islands |
| Component library or design system | none | n/a |

## Testing and Verification Tools

| Tool | Version | Use |
|---|---|---|
| cargo test with proptest | proptest 1.11.0 | Rust unit, integration and property tests |
| Vitest | ^4.1.10 | unit and obligation tests (node environment) |
| fast-check with @fast-check/vitest | ^4.9.0, ^0.4.1 | property tests with seeded replay |
| Playwright | 1.61.1 (exact) | e2e matrix, PDF rendering, browser preflight |
| @axe-core/playwright | 4.12.1 (exact) | WCAG 2.2 AA scans (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) |
| pdfjs-dist | 5.4.624 (exact) | PDF inspection |
| TypeScript compiler | ^5.9.3 | compiling profile tools for Node |
| @astrojs/check | ^0.9.8 | installed; used ad hoc per project records, not in scripts or CI |

## Build, Delivery and Hosting

| Element | Technology | Notes |
|---|---|---|
| Task runner | just | 11 recipes (api-documentation.md) |
| Package managers | Cargo, npm (lockfileVersion 3) | `npm ci` in CI; CLAUDE.md says to use npm or npx, not bun |
| CI | Jenkins declarative pipeline, job `obsidian-blog-develop`, cron `H 0 * * *` | runs on the same Mac at 127.0.0.1:8081 |
| Deploy | `rsync -a --delete site/dist/` to `~/Sites/obsidian-blog` | gated by `RUN_DEPLOY` |
| Web server | site/scripts/local-server.mjs under launchd `dev.rvnnt.blog` | port 8080 |
| Ingress | Cloudflare Tunnel `obsidian-blog` (launchd `dev.rvnnt.tunnel`, config `~/.cloudflared/obsidian-blog.yml`) | DNS managed by `cloudflared tunnel route dns` |
| Previous hosting | AWS S3, CloudFront, ACM, Terraform | decommissioned 2026-08-17; `infra/` removed |

Local ports: blog 8080, Jenkins 8081 (loopback), `astro dev` 4321, crossunit preview 4326. The verification previews use kernel-chosen loopback ports.

## Version Pinning Notes

- Exact pins are deliberate. `pretendard` 1.3.9 is bound to the font allowlist integrity. Playwright, axe-core, pdfjs-dist and Vite are pinned because:
  - the accessibility review-subject digest includes the node, astro, vite, playwright and axe versions;
  - the résumé evidence records playwright, pdfjs and pretendard versions.
- Upgrading any of these, or Astro or Node, changes digests and requires the human gates to be redone (code-quality-assessment.md).
- `serde_yml` 0.0.12 is pre-1.0, so it carries no semver stability promise (also flagged in docs/project/codebase_audit.md).
- The Rust toolchain and the macOS host are not pinned. Node is constrained only by the engines range, while the review digest records the actual Node version used.
