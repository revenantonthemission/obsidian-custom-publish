# obsidian-blog (obsidian-press)

Obsidian Publish replacement: Rust preprocessor + Astro static site.
Self-hosted on this machine: https://rvnnt.dev via Cloudflare Tunnel → launchd service `dev.rvnnt.blog` on 127.0.0.1:8080 (AWS decommissioned)

## Architecture
- `preprocessor/` — Rust CLI, 5-pass pipeline (scan → link → transform → search → output). Shared regexes in `syntax.rs`, preview generation in `preview.rs`, nav tree in `nav_tree.rs`
- `site/` — Astro 6 + Preact islands, consumes `content/` from preprocessor
- `site/src/lib/render.ts` — custom unified pipeline (remark/rehype/Shiki/KaTeX). This is the actual rendering path, NOT `astro.config.mjs` markdown settings
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

## Local Serving (AWS fully decommissioned 2026-08-17)
- All AWS resources (S3 buckets, CloudFront, ACM cert, tfstate bucket) destroyed; `infra/` removed
- Web root: `~/Sites/obsidian-blog` — `just deploy` rsyncs `site/dist/` there
- Server: `site/scripts/local-server.mjs` (dependency-free Node, clean-URL rewrite + 404.html, port 8080, HOST=0.0.0.0 — reachable from LAN)
- launchd service: `dev.rvnnt.blog` (`~/Library/LaunchAgents/dev.rvnnt.blog.plist`, KeepAlive; node path is the absolute nvm binary — update plist when node version changes)
- Logs: `~/Library/Logs/obsidian-blog-server.log`; restart: `launchctl kickstart -k gui/$UID/dev.rvnnt.blog`
- Public: https://rvnnt.dev — Cloudflare Tunnel `obsidian-blog` (launchd `dev.rvnnt.tunnel`, config `~/.cloudflared/obsidian-blog.yml` — dedicated file, the shared `~/.cloudflared/config.yml` belongs to other tunnels on this machine; logs `~/Library/Logs/obsidian-blog-tunnel.log`); DNS CNAME managed by `cloudflared tunnel route dns`
- Ports: blog 8080 (0.0.0.0), Jenkins 8081 (127.0.0.1 only, set in both `~/Library/LaunchAgents/homebrew.mxcl.jenkins.plist` and the brew template at `/opt/homebrew/opt/jenkins/` — re-apply after `brew upgrade jenkins` regenerates the template), astro dev 4321
- NEVER start Jenkins via `brew services start jenkins` — it regenerates the LaunchAgent plist with port 8080, hijacking 127.0.0.1:8080 from the blog (rvnnt.dev serves Jenkins 403). Use `launchctl bootstrap gui/$UID ~/Library/LaunchAgents/homebrew.mxcl.jenkins.plist` after verifying the plist says 8081 (happened 2026-08-29)
- Jenkins daily publish: job `obsidian-blog-develop` (cron `H 0 * * *` in Jenkinsfile, builds origin/develop) stamps published dates, builds, deploys to web root — this IS the daily auto-publish system

## Git Flow
- Feature branches per phase off `develop`, `--no-ff` merges back
- Never pile multiple phases on one feature branch

## Rust Gotchas
- `Vec::dedup()` only removes consecutive duplicates — always `sort()` first
- lindera token field is `surface`, not `text`; feature is `embed-ko-dic`
- Compile regexes with `LazyLock`, not inside functions
- Regex transforms in `transform.rs` must use `transform_outside_fences()` to skip fenced code blocks
- Korean (Hangul) is alphabetic, not logographic — don't count syllable blocks as individual words
- `![[image.png]]` embeds → `<img>` tags with optional `|width` or `|widthxheight` sizing; only referenced images are copied from `attachment/` to output assets
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
- 85 Rust tests (33 unit + 52 integration) using `fixtures/vault/` (11 test markdown files)
- Tests run against real fixture data, not mocks
- `cargo test` from `preprocessor/` directory (tests use relative path `../fixtures/vault`)
- Diagram rendering tests use inline closures for `render_fn` parameter (no real CLI spawn) — see `test_render_themed_diagram_wraps_in_container`
