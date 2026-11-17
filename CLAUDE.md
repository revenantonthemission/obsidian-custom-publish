# obsidian-blog (obsidian-press)

Obsidian Publish replacement: Rust preprocessor + Astro static site.
Self-hosted on this machine: https://rvnnt.dev via Cloudflare Tunnel → launchd service `dev.rvnnt.blog` on 127.0.0.1:8080 (AWS decommissioned)

## Architecture
- `preprocessor/` — Rust CLI, 5-pass pipeline (scan → link → transform → search → output). Shared regexes in `syntax.rs`, preview generation in `preview.rs`, nav tree in `nav_tree.rs`
- `site/` — Astro 6 + Preact islands, consumes `content/` from preprocessor
- `site/src/lib/render.ts` — custom unified pipeline (remark/rehype/Shiki/KaTeX). This is the actual rendering path, NOT `astro.config.mjs` markdown settings
- `content/` — generated, gitignored

## Build Commands
- `just preprocess` — run preprocessor against the fixture pair by default (`VAULT_PATH` → `./fixtures/vault/Notes`, `PAGES_PATH` → `./fixtures/vault/Pages`); copies search-index.json, graph.json, previews.json, nav-tree.json to site/public/ and replaces `site/public/assets` with `content/assets` through `site/scripts/sync-public-assets.mjs` (the one asset copy the Jenkinsfile, both Justfile recipes and the HIG runner share; it fails with `SYNC001` when `content/assets` is missing)
- `just build` — preprocess + astro build
- `just test` — cargo test in preprocessor/
- `cd site && npx astro build` — build site only (bun not in PATH, use npm/npx)
- `cd site && npx astro dev` — dev server

## Vault Path
`/Users/revenantonthemission/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault`
Note: iCloud path uses tildes (`iCloud~md~obsidian`), not dots.
Two folders are published: `Areas/Notes/` (posts; `VAULT_PATH`) and `Areas/Pages/` (site pages; `PAGES_PATH`, Jenkins `OBSIDIAN_PAGES_PATH`). Point `VAULT_PATH` at `Areas/Notes` and `PAGES_PATH` at `Areas/Pages`, never at the vault root.
Image attachments live in each folder's own `attachment/` (`Areas/Notes/attachment/`, `Areas/Pages/attachment/`); the lookup never searches above the folder the note came from.

## Publishing CLI (contract C1)
- `obsidian-press <NOTES> <OUTPUT> [--pages <PAGES>] [--stamp-published]`
- Run order: folder guard → pages notice → scan both folders → catalog checks → stamp NOTES (only with `--stamp-published`) → rescan only if a file was stamped → write → diagram check → summary. Nothing is stamped or written before every check passed
- Exit 0 success; exit 1 for a coded catalog finding, an uncoded read error (missing NOTES, unreadable file), PUB007 or a diagram failure; exit 2 for a usage error (clap parse errors too). Usage errors, each one line on stderr with resolved paths:
  - `error: --pages <PAGES> overlaps posts folder <NOTES>`
  - `error: output folder <OUTPUT> overlaps posts folder <NOTES>`
  - `error: output folder <OUTPUT> overlaps site pages folder <PAGES>`
  - `error: site pages folder <PAGES> is not a folder`
  - `error: posts folder <NOTES> is not a folder`
  - `error: cannot resolve <path>: '..' after a missing folder`
  - Overlap means equal or one inside the other, compared by path component after lowercasing (APFS is case-insensitive); a missing PAGES or OUTPUT resolves as its nearest existing ancestor plus the missing tail
- Notices (stderr, at most one per run): `notice: no site pages folder given; publishing no site pages`, `notice: site pages folder <path> not found; publishing no site pages`, and, after the walk, `notice: site pages folder <path> is empty; publishing no site pages` (no `.md` left after the skip rules)
- One walker (`walker.rs`) feeds the scan and the stamper in both folders: dot entries and `Drafts` are skipped with their subtree, and any symbolic link (file or folder) is skipped and reported once per run as `warning: skipped symbolic link <path>`. Stamping walks NOTES only and never writes through a link
- Folder-first classification (`catalog.rs`): every note in PAGES is a site page whatever its `visibility`; a NOTES note is a post (no `visibility` or `post`), the retired homepage note (`homepage`, at most one, optional) or PUB001. Site pages and the retired note are absent from posts, meta, graph, search, previews, nav tree, backlinks and related posts. Links render as: post → `/posts/<slug>[#fragment]`; retired note → `/` with no fragment (alias kept); site page → plain text; links from a site page add no backlink
- Coded diagnostics, `CODE path: detail`, batched and sorted by (path, code, other path): PUB001 unknown visibility (NOTES only), PUB003 more than one homepage note, PUB004–PUB006 whole/heading/block embed of the retired note, PUB007 write failure, PUB008 `site page slug "<slug>" clashes with <post|site page|retired homepage note> <other path>` or, for a post sharing the retired homepage note's slug, `post slug "<slug>" clashes with retired homepage note <other path>` (the post is `path`; otherwise the slug lookup could publish the private note's body under the post's metadata), PUB009 `<whole|heading|block> transclusion of site page: <embed>`. PUB002 (no homepage note) is retired; two posts sharing a slug keep the `slug collision` warning
- Last stdout line on success: `published <N> posts, <M> site pages, <K> assets` (K counts copied images, as listed in the manifest). The old `Homepage source:` and `Done.` lines are gone
- A site page whose files live in PAGES is the owner's choice of what to publish: anything placed in `Areas/Pages` is published as a page (folder-first; no `visibility` gate)

## Generated content (contract C2)
- `posts/<slug>.md` + `meta/<slug>.json` (posts only); `pages/<slug>.md` + `pages/<slug>.json` (`{slug, title}`) for site pages
- `assets/` holds post images and diagrams; `assets/pages/` holds site-page images and diagrams, and page bodies point at `/assets/pages/…`. An embed is reduced to its file name, so `![[../x.png]]` can never write outside OUTPUT
- `graph.json`, `search-index.json`, `previews.json`, `nav-tree.json`, `manifest.json` (sorted, lists `pages/*`, never `homepage/*`)
- The site's data layer fails closed with `WR001 <path>: content manifest missing — run the preprocessor` or `WR001 <path>: meta files differ from manifest` when `content/meta` disagrees with the preprocessor's `manifest.json`; `getAllPostMeta()` takes an optional content folder as a test seam
- No `homepage/` is written; a stale one from an older run is removed with the other managed namespaces. The site has no homepage artifact reader, and HP001–HP004 and the profile slot are gone

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
- `![[image.png]]` embeds → `<img>` tags; a numeric pipe value (`|width` or `|widthxheight`) sizes the image and any other pipe value becomes its caption; Markdown `![alt](file.png)` sources are rewritten to `/assets/` and copied too; only referenced images are copied from `attachment/` to output assets
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
- Rehype wraps `<img>` with non-empty `alt` in `<figure>` + `<figcaption>`; a standalone image's figure replaces its paragraph (no `<p><figure>` nesting), while inline or linked images keep alt only — use `alt=""` for decorative images (diagrams)
- Icon libraries: `lucide-static` (build-time SVG via `set:html`, through `decorativeIcon()` in `src/lib/icons.ts`) + `lucide-preact` (interactive islands only). Post-page scripts build their icons with DOM APIs in `src/scripts/svg-icon.ts`, never `innerHTML`. Every icon is `aria-hidden` at a 1.75 stroke; the control around it carries the Korean name
- Site identity lives in `src/lib/site.ts` (`SITE_NAME` = "Passion Project", description, URL, locale). Header, homepage Large Title and `<title>`, RSS, `og:site_name` all read it; `documentTitle()` renders "<page> — Passion Project" (homepage: the name alone). Icons: `public/favicon.svg` (tint tile, adapts to dark), `favicon.ico` (32 px), `apple-touch-icon.png` (180 px, opaque full-bleed — iOS applies its own mask), `icon-192/512.png`, `manifest.webmanifest` (served by `local-server.mjs` as `application/manifest+json`). The internal name `obsidian-press` stays for the engine, the preprocessor binary and the profile digest domains (`obsidian-press:*`) — never rename those, they are identities
- The homepage (`pages/index.astro`) is site-built and reads no vault note: one h1 "Passion Project", an opening (`.home-opening`) with the owner's name and short introduction from the approved profile (never the headline) and two equal capsules, Résumé → `/resume` and Portfolio → `/portfolio` (`data-testid` `home-opening-resume-link` / `home-opening-portfolio-link`), then the "이번 주 글" card (`components/writing/WeeklyPostList.astro`): full rows for the ordinary posts of the build's Korean Monday–Sunday week (`weekPosts` + `resolveKoreanBuildDate` in `src/lib/writing-lists.ts`), an empty row when there are none, and always "모든 글 보기" → `/writing/all`. `data.ts` exposes `getOrdinaryPosts()` (non-hub posts, frozen) beside `getHubs()`
- The Writing section is `/writing` (recent posts and topics) and `/writing/all` (every post by year, sticky year headers), both static Astro with no islands. Their shared styles live in `src/styles/writing.css`, loaded only by those routes and `/`. `HOMEPAGE_TODAY_OVERRIDE=YYYY-MM-DD` is test-only (the HIG runner pins `2025-08-13`); Jenkins and `just deploy` never set it, and production uses the build's Korean date
- The primary navigation is one item, Writing → `/writing` (`PRIMARY_NAVIGATION` in `src/lib/navigation.ts`, frozen). The marker is derived once, from that model's href: `resolveNavigationMarker(pathname)` returns `page` for `/writing` itself, `section` for every `/writing/…` descendant and null everywhere else; the query, the fragment and one trailing slash are dropped first. The states carry `ariaCurrent` — `page` → `aria-current="page"`, `section` → `aria-current="true"`, null → no attribute — and the profile local navigation keeps its own `page` marker for its current route. The bar (`Header.astro`) and the phone sheet (`MobileNav.tsx`, a static `<details>` with no island) render the same `ariaCurrent`, and `chrome.css` extends the current-item rules to `[aria-current='true']` (weight 600, 2 px `--c-bar-indicator` underline, the sheet's check icon) and stays at or below 10,000 bytes (9,717 today). Those four files are manual-accessibility review subjects, so changing them invalidates `site/verification/profile/manual-web-accessibility.json` until the owner redoes the 16-state review
- Design tokens (HIG) live in `src/styles/tokens.css`: light values on `:root`, dark values twice — under `@media (prefers-color-scheme: dark)` as `:root:not([data-theme='light'])` and as `:root[data-theme='dark']` — and the two dark blocks must agree (`tests/unit/hig-tokens.test.ts`, which also checks contrast). `global.css` only imports `tokens.css`, `base.css`, `chrome.css` and `search.css`; `fonts.css` is imported by BaseLayout's frontmatter (see the fonts note below)
- Color variables use the `--c-` prefix: `--c-text`, `--c-text-secondary`, `--c-tint`, `--c-tint-fill`, `--c-on-tint`, `--c-bg`, `--c-bg-grouped`, `--c-surface`, `--c-separator`, `--c-code-bg`, `--c-graph-*`, etc. Never use unprefixed color names. Scales have their own prefixes: `--space-*`, `--text-*`, `--leading-*`, `--radius-*`, `--dur-*`, `--ease-*`, plus `--target` (44px) and `--max-width`/`--max-reading`. The old `--c-text-muted`, `--c-border` and `--c-accent` are gone
- Appearance model: one localStorage key, `appearance` = `auto` | `light` | `dark` (anything else means `auto`). BaseLayout's inline bootstrap sets `data-appearance` on `<html>` before first paint, sets `data-theme` only for an explicit light or dark (`auto` follows `prefers-color-scheme`), and deletes the retired keys `theme`, `theme-manual`, `solar`, `geo`, `geo-denied`. `src/lib/appearance.ts` holds the same rules for the ThemeToggle island (자동 → 라이트 → 다크); keep the two in step. `solar.ts` (sunrise and geolocation switching) is removed
- Fonts and KaTeX are self-hosted; no route requests another origin (`hig-performance.spec.ts`). Pretendard 1.3.9 comes from the `pretendard` npm package, is verified against `scripts/profile/font-allowlist.json` and materialized at build time into the gitignored `site/.generated/profile-font/`; `fonts.css` declares the dynamic subsets and BaseLayout preloads subsets 90 and 91. BaseLayout imports `fonts.css` from its frontmatter, never through `global.css`: inside the `<style is:global>` @import chain Vite leaves nested `url()`s unresolved and emits no font files, which only the built output shows (`tests/unit/hig-built-assets.test.ts` guards it). KaTeX CSS and fonts come from the `katex` package, imported by `PostLayout.astro`
- Inline KaTeX overridden to `font-size: 1em` in post.css (default `1.21em` is too large for Pretendard body text)
- Shiki code blocks get `data-language` via custom transformer in render.ts — `src/scripts/copy-button.ts` turns it into the `.code-language` label in the code panel's bar, next to the copy button
- Prettier formats `site/`: `npm run format`, and `npm run format:check` must pass (`.prettierrc`: single quotes, width 100, `trailingComma: "es5"`). prettier-plugin-astro puts mixed inline children on separate lines, and that whitespace renders between inline elements: where two inline nodes must touch, put `{/* prettier-ignore */}` on the line before (see `pages/tags/index.astro`)
- Package manager: npm/npx everywhere (Justfile, Jenkinsfile). Not bun.

## Testing
- 175 Rust tests (47 unit + 128 integration). Fixture layout mirrors production: `fixtures/vault/Notes/` (15 notes, including the retired `Fixture Homepage.md`, plus `attachment/` with two images) and `fixtures/vault/Pages/` (`About.md`, `attachment/portrait.png`, `Drafts/Now.md`, `.hidden.md`). `Notes/Post With Formatting.md` holds a highlighted link (`==[Simple Post](/posts/simple-post/)==`), the subject of the NFR1-b highlight check
- Tests run against real fixture data, not mocks; clash, embed, overlap and symbolic-link cases build temporary on-disk vaults, and CLI cases run the binary (`cli_boundary_test.rs`, `stamping_order_test.rs`)
- `cargo test` from `preprocessor/` directory (tests use relative paths `../fixtures/vault/Notes` and `../fixtures/vault/Pages`)
- Diagram rendering tests use inline closures for `render_fn` parameter (no real CLI spawn) — see `test_render_themed_diagram_wraps_in_container`
- Site, from `site/`: `npm run test:unit` (Vitest, 490 tests), `npm run test:pbt` (fast-check, 36), `npx astro check`, `npm run format:check`. A single property file runs as `PBT_RUNS=100 PBT_SEED=<n> npx vitest run --config vitest.pbt.config.ts <file>` (the setup refuses to run without both values)
- `npm run test:coverage` runs the unit suite with v8 coverage of `src/` and `scripts/` and writes `.artifacts/coverage/` (text summary, HTML, `coverage-summary.json`). Coverage is reported, never enforced: there are no thresholds. It counts only code the unit suite runs in-process, not the browser suites or the profile scripts the tests spawn as subprocesses
- HIG browser checks: `npx playwright test --config playwright.hig.config.ts` preprocesses the fixture pair (`fixtures/vault/Notes` with `--pages fixtures/vault/Pages`), builds, serves `dist/` through `local-server.mjs` on 127.0.0.1:4329 and runs `tests/e2e/hig-*.spec.ts` in Chromium, Firefox and WebKit (1,212 tests: 1,141 pass; 71 skip where an engine cannot run them, such as the Chromium-only Core Web Vitals checks, CPU-throttled and on Lighthouse's mobile network profile, and the six-width overflow matrix; four WebKit page-load timeouts pass when rerun alone). The overflow checks also open the search dialog, the navigation sheet, both outline-sheet tabs and the `/graph` list (`OPEN_STATES` in `tests/e2e/support/hig.ts`). Select one project with `--project=chromium`: `--project chromium <file>` reads the file as a second project name. `HIG_SKIP_BUILD=1` reuses the current `dist/`. The run overwrites the gitignored `content/` and `site/public/*.json` with fixture output; `just preprocess` restores real vault output
- `just crossunit`: the link sweep plus no-JS navigation checks. On the fixture build the sweep reports exactly one broken link, the fixture's deliberate `nonexistent-image.png` in `Post With Image.md`
- `npm run test:e2e` (the profile's evidence-sealed suite) also needs the maintainer's manual accessibility record, `site/verification/profile/manual-web-accessibility.json` (16 states). Any change to a review-subject file (listed in `scripts/profile/accessibility-review-contract.mjs`) makes it fail with `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` until the review is redone. Never write or re-stamp that record on the maintainer's behalf
