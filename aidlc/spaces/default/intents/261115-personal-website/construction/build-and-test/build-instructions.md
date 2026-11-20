# Build Instructions — `261115-personal-website` (assembled project)

The assembled project is branch `feature/u3-writing-moves`, which stacks the four units in merge order: U1 `u1-publish-boundary` → U2 `u2-writing-section` → U4 `u4-navigation` → U3 `u3-writing-moves`. The first Build and Test run used commit `de49692`, plus this stage's one test-configuration commit `40fa3e7`. The re-run after loop-back 1 used head `b9915d8`, which adds the repair commits `22e1468` (U1), `0f312eb`, `0ef1e89`, `ae84c34` (U2), `6f7cf1d`, `bea8e2f` (U4), `d0ccdfd` and `b9915d8` (U3). Run 3, after loop-back 2, used head `bd3b57b`, which adds `7b8aab7`, `b7efd85` (U2) and `bd3b57b` (U4). The build output there is identical to run 2's. See `test-results.md`.

## Sources

- `construction/u1-publish-boundary/code-generation/{code-summary,unit-test-instructions,code-generation-plan}.md`
- `construction/u2-writing-section/code-generation/{code-summary,unit-test-instructions,code-generation-plan}.md`
- `construction/u4-navigation/code-generation/{code-summary,unit-test-instructions,code-generation-plan}.md`
- `construction/u3-writing-moves/code-generation/{code-summary,unit-test-instructions,code-generation-plan}.md`
- `aidlc-state.md` → Construction Verification Command

## 1. Prerequisites

| Tool | Version on the build machine | Used for |
|---|---|---|
| Rust toolchain (`cargo`, `rustfmt`) | edition 2024, release profile | the preprocessor `obsidian-press` |
| Node.js | `^22.22.0 \|\| >=24.0.0` (`site/package.json` engines) | the Astro site, Vitest, Playwright |
| npm / npx | bundled with Node | the Justfile and the Jenkinsfile depend on npm, not another package manager |
| `just` | any recent | the `preprocess`, `site-build`, `crossunit` recipes |
| Playwright browsers | `@playwright/test` 1.61.1; Chromium, Firefox and WebKit installed | the HIG and crossunit browser checks |
| Google Chrome (or `chrome-headless-shell`) | only for diagram rendering through Puppeteer | posts that hold Mermaid diagrams; the fixtures render through `.puppeteer-config.json` |

No new dependency was added by any of the four units (all four `nfr-requirements/tech-stack-decisions.md`).

## 2. Dependency installation

```sh
cd site && npm ci          # Node dependencies, from package-lock.json
npx playwright install      # only once per machine: Chromium, Firefox, WebKit
```

Cargo fetches the preprocessor's crates on the first build.

## 3. Environment

| Variable | Default | Notes |
|---|---|---|
| `VAULT_PATH` | `./fixtures/vault/Notes` (Justfile `vault`) | NEVER point it at the whole vault; real content is only ever `Areas/Notes` (project rule). Build and Test uses the fixtures. |
| `PAGES_PATH` | `./fixtures/vault/Pages` (Justfile `pages`) | U1's site-pages folder; the fixture holds `About.md` |
| `HOMEPAGE_TODAY_OVERRIDE` | unset | test-only; the HIG runner sets `2025-08-13` so the weekly card has rows. Jenkins and `just deploy` never set it. |
| `CONTENT_DIR_OVERRIDE` | unset | test-only (U2 repair `0ef1e89`, AC4.1.3): `site/src/lib/data.ts` reads content from this folder instead of `../content`. Only `writing-empty-build.test.ts` sets it, in the child build's environment. Since U2 loop-back 2 (`7b8aab7`) it is honoured only when `VITEST` is set. Anywhere else the build stops with `WR002 CONTENT_DIR_OVERRIDE: set outside a Vitest run`, which run 3 re-checked: exit 1. It does not move the assets folder. |
| `PBT_RUNS`, `PBT_SEED` | set by `npm run test:pbt` | required when a property file is run on its own (`PBT_RUNS=100 PBT_SEED=42`) |
| `ASTRO_PREVIEW_BACKGROUND` | unset | see Troubleshooting: Astro 7.4 backgrounds `astro preview` when it detects an AI agent |

No secret, credential or service account is needed. `just deploy`, the web root `~/Sites/obsidian-blog` and the launchd services are out of scope for this stage and were not touched.

## 4. Build commands

Run from the repository root.

```sh
just preprocess                 # 1. fixture content: content/ + site/public/*.json + site/public/assets
cd site && npx astro build      # 2. static site into site/dist, plus dist/_redirects.json (U3)
```

`just preprocess` runs `cargo run --release` on the fixture pair, copies the four JSON indexes into `site/public/`, and mirrors `content/assets` with `site/scripts/sync-public-assets.mjs` (U1).

## 5. Build verification

| Check | Expected | Observed (at `b9915d8`; the same values again at `bd3b57b` in run 3) |
|---|---|---|
| `just preprocess` exit code and last stdout line | 0; `published <N> posts, <M> site pages, <K> assets` (U1 NFR4.4) | 0; `published 17 posts, 1 site pages, 3 assets` |
| Preprocessor warnings | only the fixture's deliberate ones | `attachment not found: nonexistent-image.png`, `heading 'Nonexistent Heading' not found in 'Simple Post'` |
| `npx astro build` exit code | 0 | 0; 4.3 s; `[rvnnt-profile-build] verified private profile approval boundary`; `[rvnnt-legacy-redirects] wrote _redirects.json (12 rules)` |
| `site/dist/_redirects.json` | version 1; one rule per built tag page plus 2; sorted; unique; every target's `index.html` present (U3 NFR4.9, NFR5.25) | version 1, 12 rules |
| `site/dist/_astro/` | no hashed asset added, renamed or changed by U3 (NFR6.14) | 176 files; no `_astro/*.css` carries the grouped selectors |
| `content/homepage/` | absent (U1 NFR5.14) | absent |
| Stylesheet sizes (unminified) | `writing.css` ≤ 3,072 B (U2 design); `chrome.css` ≤ 10,000 B (U4 design) | `writing.css` 1,100 B; `writing-all.css` 2,598 B; `home.css` 2,218 B; `grouped.css` 6,632 B (3,910 B as the inline block on `/writing/tags`); `chrome.css` 9,717 B |

## 6. Restoring the working tree after browser runs

The HIG runner (`site/scripts/hig/build-and-serve.mjs`) rewrites `content/` and `site/public/*.json` with fixture output plus the e2e fixture post, and rebuilds `site/dist` with the fixed build date. After browser runs, restore the plain fixture state with `just preprocess` and `cd site && npx astro build`. Real content is produced only by Jenkins or `just deploy`, never by this stage.

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `just crossunit`: `Error: Process from config.webServer exited early.` | Astro 7.4.1's `astro preview` auto-backgrounds itself when it detects an AI agent (`site/node_modules/astro/dist/cli/preview/index.js`), so Playwright sees the command exit | fixed in this stage: `site/playwright.crossunit.config.ts` passes `--ignore-lock`, which forces a foreground one-off server (commit `40fa3e7`). If a stray background server is left behind, `cd site && npx astro preview status`, then `npx astro preview stop`. |
| `FONT_SOURCE_SYMLINK: installed Pretendard package contains a symlink` | the profile build integration refuses a symlinked `node_modules` (seen when building a scratch worktree) | use a real or cloned (`cp -cR`) `node_modules`, never a symlink |
| Site unit suite fails on missing content | `content/` or the copied JSON files are absent; the unit suite builds the site | run `just preprocess` first |
| `WR001 … content manifest missing` / `meta files differ from manifest` | stale or hand-edited `content/` (U2 fail-closed check) | rerun `just preprocess` |
| A preprocessor run exits 2 | NOTES, PAGES and OUTPUT overlap, or `--pages` is a file (U1 NFR5.4) | fix the paths; nothing was read or written |
| Jenkins on port 8081 was started with `brew services start jenkins` | it rewrites the LaunchAgent to port 8080 and takes it from the blog (project rule) | never start Jenkins that way |
