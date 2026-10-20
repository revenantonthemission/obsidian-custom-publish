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
- AI-DLC Construction worktrees live under `.aidlc/worktrees/`, which `.gitignore` ignores; never commit a nested worktree

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
- BaseLayout.astro `<script is:inline>` blocks must be ES5 (no const/let, no arrow functions) — they run before any polyfills. Prettier's `trailingComma: "es5"` keeps them ES5. Their exact bytes are pinned in `INHERITED_INLINE_SCRIPT_BASELINES` (`scripts/profile/asset-budget.mjs`): any edit, a reformat included, needs a new baseline from a `PROFILE_VERIFICATION_BUILD=1` build
- Preact island `.tsx` files trigger spurious `JSX.IntrinsicElements` TS errors in IDE — `npx astro build` is the source of truth
- `SVGSVGElement` has no `offsetHeight` — use `getBoundingClientRect()` to trigger reflow on SVG elements
- `set:html` in PostLayout trusts vault content — revisit if vault ever accepts third-party content
- BaseLayout uses `<style is:global>` — scoped styles don't match `set:html` content (callout divs, diagram imgs, code blocks)
- Rehype wraps `<img>` with non-empty `alt` in `<figure>` + `<figcaption>` — use `alt=""` for decorative images (diagrams)
- Icon libraries: `lucide-static` (build-time SVG via `set:html`, through `decorativeIcon()` in `src/lib/icons.ts`) + `lucide-preact` (interactive islands only). Post-page scripts build their icons with DOM APIs in `src/scripts/svg-icon.ts`, never `innerHTML`. Every icon is `aria-hidden` at a 1.75 stroke; the control around it carries the Korean name
- Homepage renders `Passion Project.md` from vault; "이번주에 작성된 포스트" section is dynamically replaced with today's published posts ("오늘 발행된 글")
- Design tokens (HIG) live in `src/styles/tokens.css`: light values on `:root`, dark values twice — under `@media (prefers-color-scheme: dark)` as `:root:not([data-theme='light'])` and as `:root[data-theme='dark']` — and the two dark blocks must agree (`tests/unit/hig-tokens.test.ts`, which also checks contrast). `global.css` only imports `tokens.css`, `base.css`, `chrome.css` and `search.css`; `fonts.css` is imported by BaseLayout's frontmatter (see the fonts note below)
- Color variables use the `--c-` prefix: `--c-text`, `--c-text-secondary`, `--c-tint`, `--c-tint-fill`, `--c-on-tint`, `--c-bg`, `--c-bg-grouped`, `--c-surface`, `--c-separator`, `--c-code-bg`, `--c-graph-*`, etc. Never use unprefixed color names. Scales have their own prefixes: `--space-*`, `--text-*`, `--leading-*`, `--radius-*`, `--dur-*`, `--ease-*`, plus `--target` (44px) and `--max-width`/`--max-reading`. The old `--c-text-muted`, `--c-border` and `--c-accent` are gone
- Appearance model: one localStorage key, `appearance` = `auto` | `light` | `dark` (anything else means `auto`). BaseLayout's inline bootstrap sets `data-appearance` on `<html>` before first paint, sets `data-theme` only for an explicit light or dark (`auto` follows `prefers-color-scheme`), and deletes the retired keys `theme`, `theme-manual`, `solar`, `geo`, `geo-denied`. `src/lib/appearance.ts` holds the same rules for the ThemeToggle island (자동 → 라이트 → 다크); keep the two in step. `solar.ts` (sunrise and geolocation switching) is removed
- Fonts and KaTeX are self-hosted; no route requests another origin (`hig-performance.spec.ts`). Pretendard 1.3.9 comes from the `pretendard` npm package, is verified against `scripts/profile/font-allowlist.json` and materialized at build time into the gitignored `site/.generated/profile-font/`; `fonts.css` declares the dynamic subsets and BaseLayout preloads subsets 90 and 91. BaseLayout imports `fonts.css` from its frontmatter, never through `global.css`: inside the `<style is:global>` @import chain Vite leaves nested `url()`s unresolved and emits no font files, which only the built output shows (`tests/unit/hig-built-assets.test.ts` guards it). KaTeX CSS and fonts come from the `katex` package, imported by `PostLayout.astro` and `pages/index.astro`
- Inline KaTeX overridden to `font-size: 1em` in post.css (default `1.21em` is too large for Pretendard body text)
- Shiki code blocks get `data-language` via custom transformer in render.ts — `src/scripts/copy-button.ts` turns it into the `.code-language` label in the code panel's bar, next to the copy button
- Prettier formats `site/`: `npm run format`, and `npm run format:check` must pass (`.prettierrc`: single quotes, width 100, `trailingComma: "es5"`). prettier-plugin-astro puts mixed inline children on separate lines, and that whitespace renders between inline elements: where two inline nodes must touch, put `{/* prettier-ignore */}` on the line before (see `pages/tags/index.astro`)
- Package manager: npm/npx everywhere (Justfile, Jenkinsfile). Not bun.

## Testing
- 113 Rust tests (36 unit + 77 integration) using `fixtures/vault/` (15 markdown files and one image)
- Tests run against real fixture data, not mocks
- `cargo test` from `preprocessor/` directory (tests use relative path `../fixtures/vault`)
- Diagram rendering tests use inline closures for `render_fn` parameter (no real CLI spawn) — see `test_render_themed_diagram_wraps_in_container`
- Site, from `site/`: `npm run test:unit` (Vitest, 360 tests), `npm run test:pbt` (fast-check, 37), `npx astro check`, `npm run format:check`
- HIG browser checks: `npx playwright test --config playwright.hig.config.ts` preprocesses `fixtures/vault`, builds, serves `dist/` through `local-server.mjs` on 127.0.0.1:4329 and runs `tests/e2e/hig-*.spec.ts` in Chromium, Firefox and WebKit (1,002 tests: 937 pass; 65 skip where an engine cannot run them, such as the Chromium-only Core Web Vitals checks, CPU-throttled and on Lighthouse's mobile network profile, and the six-width overflow matrix). The overflow checks also open the search dialog, the navigation sheet, both outline-sheet tabs and the `/graph` list (`OPEN_STATES` in `tests/e2e/support/hig.ts`). Select one project with `--project=chromium`: `--project chromium <file>` reads the file as a second project name. `HIG_SKIP_BUILD=1` reuses the current `dist/`. The run overwrites the gitignored `content/` and `site/public/*.json` with fixture output; `just preprocess` restores real vault output
- `just crossunit`: the link sweep plus no-JS navigation checks. On the fixture build the sweep reports exactly one broken link, the fixture's deliberate `nonexistent-image.png` in `Post With Image.md`
- `npm run test:e2e` (the profile's evidence-sealed suite) also needs the maintainer's manual accessibility record, `site/verification/profile/manual-web-accessibility.json` (16 states). Any change to a review-subject file (listed in `scripts/profile/accessibility-review-contract.mjs`) makes it fail with `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` until the review is redone. Never write or re-stamp that record on the maintainer's behalf
