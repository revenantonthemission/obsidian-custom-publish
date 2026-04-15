# obsidian-blog (obsidian-press)

Obsidian Publish replacement: Rust preprocessor + Astro static site.
Live at https://rvnnt.dev

## Architecture
- `preprocessor/` — Rust CLI, 5-pass pipeline (scan → link → transform → search → output). Shared regexes in `syntax.rs`, preview generation in `preview.rs`, nav tree in `nav_tree.rs`
- `site/` — Astro 6 + Preact islands, consumes `content/` from preprocessor
- `site/src/lib/render.ts` — custom unified pipeline (remark/rehype/Shiki/KaTeX). This is the actual rendering path, NOT `astro.config.mjs` markdown settings
- `infra/` — Terraform for S3 + CloudFront
- `content/` — generated, gitignored

## Build Commands
- `just preprocess` — run preprocessor against vault (copies search-index.json, graph.json, previews.json, nav-tree.json to site/public/)
- `just build` — preprocess + astro build
- `just test` — cargo test in preprocessor/
- `cd site && npx astro build` — build site only (bun not in PATH, use npm/npx)
- `cd site && npx astro dev` — dev server

## Vault Path
`/Users/revenantonthemission/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault`
Note: iCloud path uses tildes (`iCloud~md~obsidian`), not dots.
Only `Areas/Notes/` is published. Set `VAULT_PATH` to the `Areas/Notes` subdirectory when running locally.
Image attachments live in `Areas/Notes/attachment/`.

## AWS
- Profile: `mfa` (use `AWS_PROFILE=mfa` for all aws/terraform commands)
- S3: `obsidian-custom-s3`, CloudFront: `E35HZFVGD0OJ04`
- ACM cert in us-east-1, domain DNS on Cloudflare

## Git Flow
- Feature branches per phase off `develop`, `--no-ff` merges back
- Never pile multiple phases on one feature branch

## Rust Gotchas
- `Vec::dedup()` only removes consecutive duplicates — always `sort()` first
- lindera token field is `surface`, not `text`; feature is `embed-ko-dic`
- Compile regexes with `LazyLock`, not inside functions
- Regex transforms in `transform.rs` must use `transform_outside_fences()` to skip fenced code blocks
- Korean (Hangul) is alphabetic, not logographic — don't count syllable blocks as individual words
- `![[image.png]]` embeds → `<img>` tags with optional `|width` or `|widthxheight` sizing
- Shared regexes (`WIKILINK_RE`, `BLOCK_ID_RE`, etc.) live in `syntax.rs` — never duplicate in other modules
- Korean text is multi-byte UTF-8 (3 bytes/char) — use `char_indices()` not byte slicing for truncation

## Astro Gotchas
- Preprocessor outputs raw HTML (callout divs, wikilink anchors) — `rehype-raw` is required in the unified pipeline
- KaTeX set to `strict: false` for Korean text in math blocks
- Tags may contain `/` — sanitized to `-` via `sanitizeTag()` in `data.ts`
- Korean filenames produce slugs with special chars — slugify strips non-alphanumeric except Korean + hyphens
- `rehype-slug` generates heading IDs — TOC component depends on these `id` attributes
- D2 and Mermaid diagrams are dual-rendered (light/dark SVGs); themed pairs wrapped in `.diagram-container`, CSS crossfades via `opacity` (not `display`). Typst has no theme support.
- BaseLayout.astro `<script is:inline>` blocks must be ES5 (no const/let, no arrow functions) — they run before any polyfills
- Preact island `.tsx` files trigger spurious `JSX.IntrinsicElements` TS errors in IDE — `npx astro build` is the source of truth
- `SVGSVGElement` has no `offsetHeight` — use `getBoundingClientRect()` to trigger reflow on SVG elements
- `set:html` in PostLayout trusts vault content — revisit if vault ever accepts third-party content
- BaseLayout uses `<style is:global>` — scoped styles don't match `set:html` content (callout divs, diagram imgs, code blocks)
- Rehype wraps `<img>` with non-empty `alt` in `<figure>` + `<figcaption>` — use `alt=""` for decorative images (diagrams)
- Icon libraries: `lucide-static` (build-time SVG via `set:html`) + `lucide-preact` (interactive islands only)
- Homepage renders `Passion Project.md` from vault; "이번주에 작성된 포스트" section is dynamically replaced with today's published posts ("오늘 발행된 글")
- CSS variables use `--c-` prefix: `--c-text-muted`, `--c-border`, `--c-accent`, `--c-surface`, etc. Never use unprefixed names.
- Inline KaTeX overridden to `font-size: 1em` in post.css (default `1.21em` is too large for Pretendard body text)
- Shiki code blocks get `data-language` via custom transformer in render.ts — CSS `::before` pseudo-element renders language badge
- Package manager: npm/npx everywhere (Justfile, Jenkinsfile). Not bun.

## Testing
- 55 Rust tests (7 unit + 48 integration) using `fixtures/vault/` (10 test markdown files)
- Tests run against real fixture data, not mocks
- `cargo test` from `preprocessor/` directory (tests use relative path `../fixtures/vault`)
- Diagram rendering tests use inline closures for `render_fn` parameter (no real CLI spawn) — see `test_render_themed_diagram_wraps_in_container`
