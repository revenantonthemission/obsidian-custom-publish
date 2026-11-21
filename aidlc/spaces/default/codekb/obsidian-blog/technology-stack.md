# Technology Stack

Versions are the resolved versions in `preprocessor/Cargo.lock` and `site/package-lock.json` at commit `db7ecae`, with the declared range in parentheses where it differs.

금번 집중 스캔에서는 lockfile을 열지 않았으므로 위 버전 목록은 이전 기록의 보존된 값이다. `site/package.json`의 선언 범위만 새로 확인했고(전체는 `dependencies.md` 참조), 그 결과는 아래 "금번 확인" 항목에 정리했다.

## Languages

| Language | Where | Notes |
|---|---|---|
| Rust (edition 2024) | `preprocessor/` | Uses `LazyLock`, let-chains (`if let ... && ...`), `Option::is_none_or`. Release profile: `lto = true`, `codegen-units = 1`. |
| TypeScript 5.9.3 (strict) | `site/src/`, tests, configs | `astro/tsconfigs/strict`, `jsxImportSource: preact`. |
| Astro components | `site/src/pages`, `layouts`, `components` | `.astro` files. |
| JavaScript (ESM `.mjs`) | `site/scripts/` | Node tooling; `.d.mts` declarations beside several modules. |
| CSS | `site/src/styles/` | Custom properties; no preprocessor. |
| Groovy (declarative) | `Jenkinsfile` | |
| just | `Justfile` | |
| Korean | all UI strings, vault content | |
| Bash (`set -eu`) | `site/scripts/publish-dist.sh` | 게시 스크립트. `rsync`/`cp`/`mv`/`mkdir`만 사용하며 npm 의존성 없음(금번 확인). |

## Runtimes and Platforms

- Node.js `^22.22.0 || >=24.0.0` (`engines`); launchd runs the server with an absolute nvm Node path.
- macOS (Apple Silicon) host: launchd services `dev.rvnnt.blog` and `dev.rvnnt.tunnel`, Jenkins (Homebrew, port 8081), Cloudflare Tunnel `obsidian-blog`.
- No cloud provider (AWS decommissioned 2026-08-17).

## Preprocessor Crates

| Crate | Version | Purpose |
|---|---|---|
| anyhow | 1.0.102 (`1`) | Error context and bail. |
| clap | 4.6.0 (`4`, derive) | CLI parsing. |
| serde / serde_json | 1 / 1.0.149 | JSON output. |
| serde_yml | 0.0.12 | YAML frontmatter (pre-1.0). |
| walkdir | 2.5.0 | Vault traversal. |
| regex | 1.12.3 | Obsidian syntax. |
| chrono | 0.4.44 | Local dates for stamping and file times. |
| tempfile | 3.27.0 | Temp files for diagram CLIs. |
| lindera | 2.3.2 (`2`, `embed-ko-dic`) | Korean morphological tokenizer for search. |
| proptest (dev) | 1.11.0 | Property tests. |

## Site Dependencies

| Package | Version | Purpose |
|---|---|---|
| astro | 7.4.1 (`^7.4.1`) | Static site generator (`output: 'static'`). CLAUDE.md still says Astro 6. |
| @astrojs/preact / preact | 6.1.0 / 10.29.1 | Islands. |
| @astrojs/sitemap | 3.7.4 | Sitemap. |
| @astrojs/rss | 4.0.19 | `/rss.xml`. |
| unified | 11.0.5 | Rendering pipeline. |
| remark-parse, remark-gfm (4.0.1), remark-math, remark-cjk-friendly, remark-definition-list, @richardtowers/remark-abbr, remark-rehype | per lockfile | Markdown parsing. |
| rehype-raw, rehype-slug, rehype-katex (7.0.1), rehype-parse, rehype-stringify, unist-util-visit | per lockfile | HTML pipeline. |
| @shikijs/rehype, @shikijs/transformers | 4.0.2 | Syntax highlighting (custom Xcode light/dark themes). |
| katex | 0.16.47 | Math, self-hosted CSS and fonts. |
| d3-force (3.0.0), d3-zoom, d3-drag, d3-selection | 3.x | Graph views. |
| lucide-static / lucide-preact | 1.8.0 / ^1.8.0 | Icons (build-time SVG / islands). |
| pretendard | 1.3.9 (pinned) | Self-hosted font, verified against `font-allowlist.json`. |
| sharp (override) | ^0.35.5 | Image processing dependency pin. |

## Dev and Test Tooling

| Tool | Version | Purpose |
|---|---|---|
| vite | 8.3.5 (pinned) | Bundler. |
| vitest + @vitest/coverage-v8 | 4.1.10 | Unit tests and coverage (no thresholds). |
| fast-check + @fast-check/vitest | 4.9.0 / ^0.4.1 | Property tests (custom seed runner). |
| @playwright/test | 1.61.1 (pinned) | Browser tests (Chromium, Firefox, WebKit). |
| @axe-core/playwright | 4.12.1 (pinned) | Accessibility scans (WCAG 2.2 AA tags). |
| pdfjs-dist | 5.4.624 (pinned) | PDF résumé inspection. |
| prettier + prettier-plugin-astro | 3.9.9 / 1.1.0 | Formatting of `site/` (`format:check`). |
| @astrojs/check | ^0.9.8 | `npx astro check` type check. |
| @types/d3-*, @types/hast, @shikijs/types | per lockfile | Types. |
| cargo test / cargo fmt | toolchain | Rust tests and formatting (no `rustfmt.toml`, no Clippy config). |

## External Build-time Tools

| Tool | Used by | Notes |
|---|---|---|
| `d2` | `d2.rs` | Themes `0` (light) / `200` (dark); optional Korean font. |
| `mmdc` (Mermaid CLI) | `mermaid.rs` | Needs Chrome via puppeteer: `PUPPETEER_EXECUTABLE_PATH` or `.puppeteer-config.json`; Jenkins prefers chrome-headless-shell. |
| `typst` | `typst_render.rs` | SVG compile. |
| `git` | `scanner.rs` | Last-commit dates for `updated`. |
| `rsync` | Justfile, Jenkinsfile, `publish-dist.sh` | Deploy to the web root (`-a --delete`, 리다이렉트 테이블 제외). |
| Jenkins, launchd, cloudflared | operations | Nightly publish, serving, tunnel. |

## Agent Tooling Configured in the Repo

`.mcp.json` declares MCP servers for the maintainer's coding agents (context7 over HTTP; AWS MCP proxy, pricing, IaC and serverless servers through `uvx`). They are not part of the build or the site.

## 금번 확인: `site/package.json` 선언 범위

| 구분 | 값 |
|---|---|
| 패키지 | `site`, ESM(`"type": "module"`), version `0.0.1` |
| 엔진 | Node `^22.22.0 \|\| >=24.0.0` |
| 의존성 수 | runtime 29개 선언(`astro ^7.4.1`, `@astrojs/*`, unified/remark/rehype, Shiki, KaTeX, d3, lucide, pretendard `1.3.9` 고정 등), dev 19개(`@playwright/test 1.61.1`, `@axe-core/playwright 4.12.1`, `prettier 3.9.9`, `vite 8.3.5`, `pdfjs-dist 5.4.624` 등 pinned 다수) |
| override | `sharp ^0.35.5` |
| 명령 | `dev`, `build`, `preview`, `astro`, `format`, `format:check`, 5개 프로필 CLI 위임 명령, `test:pbt:framework`, `test:coverage` |
| 주의 | review subject — 변경 시 accessibility review record 다이제스트가 무효화된다(`Justfile:46-48`). 새 배포/검사 명령은 여기에 넣지 않는다. |
