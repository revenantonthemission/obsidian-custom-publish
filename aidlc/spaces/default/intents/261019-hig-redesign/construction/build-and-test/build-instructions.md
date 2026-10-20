# Build Instructions: Repository Cleanup and HIG Redesign

These instructions build what Code Generation produced, as recorded in `code-generation-plan.md`, `unit-test-instructions.md` and `code-summary.md` (all in `construction/code-generation/`). The commands follow the `Jenkinsfile`, the `Justfile` and `site/package.json`.

## Environment

| Tool | Version on the build host | Used for |
|---|---|---|
| macOS | 27.0.1 | the machine that serves rvnnt.dev and runs Jenkins |
| Node.js | v24.14.0 (nvm) | Astro build, Vitest, Playwright, profile tooling |
| npm / npx | 11.9.0 | the site's package manager (the Justfile and Jenkinsfile depend on it; never bun) |
| Rust (`cargo`, `rustc`) | 1.99.1 (Homebrew), edition 2024 | the preprocessor |
| `just` | 1.59.0 | `crossunit`, `preprocess`, `deploy` recipes |
| `d2` | v0.9.0 | diagram rendering during preprocessing |
| Mermaid CLI (`mmdc`) | 11.12.0 | diagram rendering during preprocessing; launches Chrome through puppeteer |
| Playwright browsers | Chromium, Firefox, WebKit for Playwright 1.61.1 | browser checks |

Environment variables:

- `VAULT_PATH`: leave it unset for builds and tests. The `just` recipes then use `./fixtures/vault`. Set it to `<vault>/Areas/Notes` only to build real content on purpose, and never to the whole vault.
- `PUPPETEER_EXECUTABLE_PATH`: the Chrome that `mmdc` launches. Jenkins sets it. A local checkout can use the gitignored `.puppeteer-config.json` instead.
- `PROFILE_VERIFICATION_BUILD=1`: only for the profile asset-budget analysis, which needs the private build manifest.

## Install

1. `cd site && npm ci`: an exact install from `site/package-lock.json`, as the Jenkins Install stage does.
2. `cargo build --release --manifest-path preprocessor/Cargo.toml`
3. `cd site && npx playwright install chromium firefox webkit`, once per machine.

## Build

**Fixture build.** Used for every test and for local verification. It never stamps dates and never writes to the vault.

1. `./preprocessor/target/release/obsidian-press ./fixtures/vault ./content`
2. `cp content/search-index.json content/graph.json content/previews.json content/nav-tree.json site/public/`
3. `cd site && node scripts/crossunit/ensure-fixture-content.mjs`. This adds the homepage note with its profile slot when it is missing.
4. `cd site && npx astro build`. The output goes to `site/dist/`.

**Production build.** The nightly Jenkins job runs it from `origin/develop`:

- Its Preprocess stage runs `obsidian-press --stamp-published "$VAULT_PATH" ./content`, which writes missing `published` dates back into the vault.
- It then copies the four JSON files and `content/assets/` into `site/public/`, runs `npx astro build`, and rsyncs `site/dist/` to the web root.
- `just deploy` does the same from the local checkout. Run either only with the maintainer's go-ahead: pushing `develop` is the release.

## Build Verification

| Check | Command (from `site/` unless noted) | Pass criterion |
|---|---|---|
| Site build | `npx astro build` | exit 0, every page written |
| Self-hosted assets | `npx vitest run tests/unit/hig-built-assets.test.ts` | every built `url()` names an emitted file; 92 Pretendard faces; both preloads are used by those faces |
| Types | `npx astro check` | 0 errors |
| Site formatting | `npm run format:check` | all files match Prettier |
| Rust formatting | `cargo fmt --check --manifest-path preprocessor/Cargo.toml` (repository root) | no diff |

## Troubleshooting

- **`HP001` during `npm run test:unit`.** There is no homepage artifact yet. Run fixture build steps 1–3 first.
- **The fonts return 404, or `resume:pdf` stops with `PDF_RENDER_FONT_NOT_READY`.** `fonts.css` must be imported from BaseLayout's frontmatter. Through `global.css`'s `@import` chain, Vite emits no font files (fixed in `fada273` and guarded by `hig-built-assets.test.ts`).
- **Mermaid diagrams are missing from a build.** `mmdc` could not launch Chrome. Set `PUPPETEER_EXECUTABLE_PATH`, or install chrome-headless-shell with `npx puppeteer browsers install chrome-headless-shell`.
- **Two Astro builds delete each other's chunks in `site/.astro`.** Never run two builds in the same checkout at once. The unit tests take turns through `tests/unit/support/astro-build.ts`.
- **Fixture files accumulate in `site/public/assets/`.** No recipe empties it. Empty it before building real content if the tree must be clean.
- **Post images render without `width` and `height`.** Since the loop-back 1 repair, the build reads each image's size from `content/assets/` (`site/src/lib/image-size.ts`). A missing or unreadable file leaves the image unsized without failing the build, so preprocess before you build.
