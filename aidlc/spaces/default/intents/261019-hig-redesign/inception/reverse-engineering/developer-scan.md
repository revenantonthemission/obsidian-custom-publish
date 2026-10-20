# Developer Code Scan: obsidian-blog

- Intent: `hig-redesign` (record `261019-hig-redesign`)
- Breadth: full scan of the unrecorded project-root repository (snapshot paths `./`), depth Standard
- Source state: HEAD `265b38a9877c9640cbe8af3216481962238ffe48` on `codex/feature/infra-engineer-portfolio` (the same commit as `develop`), plus uncommitted infra-engineer portfolio work (see Technical Debt Signals)
- Method: files were read with file tools and plain read-only commands. No build, test, preview or server was executed. Runtime outcomes stated below are inferred from code or quoted from the repository's own verification records, and are marked as such.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - CLAUDE.md
  - Justfile
  - Jenkinsfile
  - .gitignore (project entries above the AI-DLC block)
  - preprocessor/Cargo.toml
  - preprocessor/src/
  - preprocessor/tests/
  - fixtures/vault/ (the 13 markdown fixtures)
  - site/package.json
  - site/astro.config.mjs
  - site/tsconfig.json
  - site/tsconfig.profile-tools.json
  - site/vitest.config.ts
  - site/vitest.pbt.config.ts
  - site/playwright.config.ts
  - site/playwright.crossunit.config.ts
  - site/.gitignore
  - site/.vscode/
  - site/README.md
  - site/src/ (pages, layouts, components, islands, scripts, lib, styles)
  - site/scripts/local-server.mjs
  - site/scripts/crossunit/
  - site/scripts/profile/ (verification-provider, asset-budget, request-ledger, accessibility-review-contract, astro-profile-integration, font-materializer with font-allowlist.json, clean-profile-build, preview-supervisor, pdf-renderer, pdf-viewer, browser-launch-preflight, profile-paths, cli, homepage-fixture-content)
  - site/tests/e2e/ (specs and support)
  - site/tests/obligations/
  - site/verification/profile/
  - site/public/robots.txt
  - site/public/favicon.svg
  - docs/project/codebase_audit.md
  - docs/superpowers/
  - docs/portfolio/infra-engineer/README.md
  - docs/resume/product-engineer/publication-record.md
  - tmp/pdfs/export-portfolio.mjs
- **Skimmed only**:
  - site/scripts/profile/ process and release internals: owned-process-registry.mjs, owned-node-bootstrap.mjs, startup-retry.mjs, release-store.mjs, resume-coordinator.mjs, pdf-inspector.mjs, compile-profile-tools.mjs, pbt-runner.mjs and the `.d.mts` declarations (exports, constants, state machines, error codes, headers)
  - site/tests/unit/ (every test declaration inventoried; bodies read in full for profile-presentation, render-extended-syntax and graph-view, and in part for profile-tooling)
  - site/tests/pbt/ (property declarations and setup.ts; arbitraries/ and mutations.ts not read)
  - site/tests/fixtures/ (header of the synthetic profile fixture)
  - site/verification/resume/current-release.json (top-level identity fields only)
  - site/package-lock.json and preprocessor/Cargo.lock (not parsed; exact pins cross-checked from manifests and tooling)
  - preprocessor/.astro/ (stray generated Astro type stubs)
  - docs/plans/ (headings; the responsive design read in part)
  - docs/portfolio/ and docs/resume/ (headings and publication records; evidence markdown and inventory JSON not read)
  - tmp/pdfs/ (text extracts, export-checks.json and PNG renders inventoried)
  - output/pdf/ (two binary PDFs inventoried)
  - site/public/resume.pdf, site/public/favicon.ico, fixtures/vault/attachment/test-image.png (binary)
- **Left out**:
  - node_modules/ (root, no root manifest)
  - site/node_modules/
  - site/dist/
  - site/.astro/
  - site/.generated/
  - site/.artifacts/
  - preprocessor/target/
  - content/
  - site/public/assets/
  - site/public/search-index.json
  - site/public/graph.json
  - site/public/previews.json
  - site/public/nav-tree.json
  - .playwright-mcp/
  - .puppeteer-config.json
  - .DS_Store
  - .claude/ (AI-DLC install, including the nested worktree checkouts under .claude/worktrees/)
  - .aidlc/
  - aidlc/
  - aidlc-docs/ (old workflow record, staged for deletion and absent on disk)
  - .mcp.json (holds only the MCP servers AI-DLC adds)
  - the AI-DLC block of .gitignore

### Packages Found
- `obsidian-press` 0.1.0 (preprocessor/) — Cargo binary crate with a `lib.rs` facade, edition 2024 — Rust — five-pass vault-to-content preprocessor CLI (scan, link, transform, search, output)
- `site` 0.0.1 (site/) — private ESM npm package — TypeScript, Astro, Preact, CSS — static site, profile domain, and the profile verification and PDF release tooling under site/scripts/profile/
- Repository root — no package manifest — Justfile and Jenkinsfile orchestrate both packages

### Build System
- **Type**: Cargo (release profile `lto = true`, `codegen-units = 1`) + npm with Astro 6 on Vite (`vite` pinned 7.3.2) + `just` + Jenkins declarative pipeline
- **Config Files**: preprocessor/Cargo.toml, site/package.json, site/astro.config.mjs, site/tsconfig.json, site/tsconfig.profile-tools.json, site/vitest.config.ts, site/vitest.pbt.config.ts, site/playwright.config.ts, site/playwright.crossunit.config.ts, Justfile, Jenkinsfile, site/scripts/profile/font-allowlist.json
- **Build Dependencies**:
  - preprocessor → `content/` (posts, meta, assets, homepage, JSON artifacts) → `just preprocess` copies the four JSON artifacts and assets into site/public/
  - site/src/lib/data.ts reads `../content` (cwd-relative) at build time → `astro build` → site/dist/
  - `profileBuildIntegration()` in astro.config.mjs → validates the approved profile and materializes the local font into site/.generated/profile-font/ on every build and dev start
  - `just deploy` → `rsync -a --delete site/dist/ ~/Sites/obsidian-blog/` → served by site/scripts/local-server.mjs (launchd `dev.rvnnt.blog`, outside the repo) → Cloudflare Tunnel (outside the repo)

### APIs Discovered
- Static HTTP routes — site/src/pages/ — 11 page sources (`/`, `/404`, `/graph`, `/resume`, `/portfolio`, `/portfolio/[role]`, `/posts/[slug]`, `/hubs/[slug]`, `/tags`, `/tags/[tag]`, `/rss.xml`) plus the sitemap integration; the project's own record counts 253 built pages on 2026-09-28
- Static data endpoints — site/public/ — 4 generated JSON files (`search-index.json`, `graph.json`, `previews.json`, `nav-tree.json`) plus `/resume.pdf`, `/robots.txt`, `/favicon.svg`, `/favicon.ico`, `/assets/*`
- Preprocessor CLI — preprocessor/src/main.rs — 1 command: `<vault> <output> [--stamp-published]`, diagnostics `PUB001`–`PUB007`
- Command surface — 10 npm scripts, 11 just recipes, 5 stable profile CLI commands (site/scripts/profile/cli.mjs)
- Internal build-time module APIs — site/src/lib/ (data.ts, homepage.ts, render.ts, navigation.ts, layout/, profile/) — homepage codes `HP001`–`HP004`
- Outbound client calls — site/src/lib/solar.ts (`api.sunrise-sunset.org`, browser geolocation) and CDN stylesheets from `cdn.jsdelivr.net`
- Local static server — site/scripts/local-server.mjs — GET/HEAD file serving with clean URLs

### Frameworks & Libraries
- Astro — ^6.0.4 — static site generator (`output: 'static'`), integrations preact, sitemap, profile build integration
- Preact — ^10.29.0 with @astrojs/preact ^5.0.0 — islands
- unified ^11.0.5 with remark-parse ^11, remark-gfm ^4.0.1, remark-math ^6, remark-cjk-friendly ^2.3.1, remark-definition-list ^2, @richardtowers/remark-abbr ^1.1.5, remark-rehype ^11.1.2, rehype-raw ^7, rehype-slug ^6, rehype-katex ^7.0.1, rehype-stringify ^10 — custom markdown pipeline
- Shiki via @shikijs/rehype and @shikijs/transformers — ^4.0.2 — dual-theme code highlighting
- d3-force, d3-selection, d3-zoom, d3-drag — ^3 — graph islands
- lucide-static and lucide-preact — ^1.8.0 — icons
- pretendard — 1.3.9 (exact) — local profile font source
- clap 4, serde 1, serde_json 1, serde_yml 0.0.12, regex 1, walkdir 2, chrono 0.4, anyhow 1, tempfile 3, lindera 2 (`embed-ko-dic`) — preprocessor
- Vitest ^4.1.10, fast-check ^4.9.0 with @fast-check/vitest ^0.4.1, Playwright 1.61.1, @axe-core/playwright 4.12.1, pdfjs-dist 5.4.624, proptest 1.11.0 — testing and verification

### Test Coverage
- **Test Directories**: preprocessor/src/ (inline `#[cfg(test)]`), preprocessor/tests/, site/tests/unit/, site/tests/pbt/, site/tests/e2e/, site/tests/obligations/, fixtures/vault/
- **Test Frameworks**: cargo test with proptest; Vitest (node environment) with fast-check; Playwright with axe-core; a custom obligation map (site/tests/obligations/u1-profile.json)
- **Coverage Config**: absent (no coverage provider in either Vitest config, no cargo-llvm-cov); the project's records state coverage was not measured
- Static counts: 110 Rust `#[test]` functions (33 in src/, 77 in tests/), 22 unit test files (300 tests passing per docs/portfolio/infra-engineer/README.md, 2026-09-28, WIP state), 7 property files (37 properties in the 6 u1/u2 files plus a framework smoke file), 10 Playwright spec files (screenshots are captured as artifacts only; there are no snapshot assertions)

### Code Quality Indicators
- **Linting**: none configured (no ESLint, Prettier, Stylelint, rustfmt or clippy configuration); TypeScript `astro/tsconfigs/strict`; `astro check` appears only in project records, not in scripts or CI
- **CI/CD**: Jenkinsfile (nightly `H 0 * * *` on `develop`: npm ci and cargo build, cargo test, fixture preprocess, `npm run test:unit`, `npm run test:pbt`, real-vault preprocess with `--stamp-published`, `astro build`, rsync deploy gated by `RUN_DEPLOY`); `npm run test:e2e` and `just crossunit` are not run by CI
- **Documentation**: CLAUDE.md (operational runbook, drifted counts), site/README.md (Korean, AWS-era and 12-state references), docs/ (design plans, specs, audit, portfolio and resume publication records); dense rationale comments in code; zero TODO/FIXME/HACK markers and zero lint suppressions in source

### Technical Debt Signals
- Manual accessibility record incompatible with the current gate: site/verification/profile/manual-web-accessibility.json holds 12 states (portfolio `not-applicable`) while site/scripts/profile/accessibility-review-contract.mjs:47-62 and verification-provider.mjs:3180-3218 require 16; its digest predates later edits to review-subject files (inferred: `npm run test:e2e` fails closed with `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`)
- Theme logic duplicated between the ES5 bootstrap (site/src/layouts/BaseLayout.astro:112-169) and site/src/lib/solar.ts; two ThemeToggle instances (site/src/components/Header.astro:57,63) each run geolocation and timers
- Dead and missing tokens: dark-only `--c-callout-note*`/`--c-callout-warning*` (site/src/styles/global.css:28-31) are unused; `--font-code` names JetBrains Mono, which is never loaded
- Hardcoded machine paths:
  - a Node-version-specific `mmdc` fallback `/opt/homebrew/Cellar/node/25.9.0_2/bin/mmdc`, tried after `which mmdc` (preprocessor/src/mermaid.rs:10-35). The puppeteer-config fix `9e1c203` exists only on the unmerged `codex/chore/aidlc-scaffolding`
  - user-path defaults in Jenkinsfile:17-24
  - `/Users/...` in tmp/pdfs/export-portfolio.mjs:6
- Nondeterminism: backlinks collected through a HashSet (preprocessor/src/linker.rs) and related-post tie ordering (preprocessor/src/related.rs)
- Diagram failure accounting counts only themed renders; `.diagram-download` and `.diagram-d2-ascii` have no CSS
- Large modules beyond the 800-line guideline: verification-provider.mjs 3,847 lines, validation.ts 2,371, resume-evidence.ts 2,036, asset-budget.mjs 1,730, resume-manifest.ts 1,707, fact-approval.ts 1,704, resume-receipts.ts 1,613, font-materializer.mjs 1,494, preview-supervisor.mjs 1,395, release-store.mjs 1,282, production-profile.ts 1,263, metadata.ts 1,182, preprocessor transform.rs 826
- Documentation drift: CLAUDE.md says 85 Rust tests and 11 fixtures (actual 110 and 13); site/README.md cites S3/CloudFront and a 12-state record; docs/project/codebase_audit.md describes CloudFront security headers that no longer exist after the AWS decommission
- Security posture: no CSP, HSTS, Referrer-Policy or frame protection in site/scripts/local-server.mjs (only `nosniff`); CDN stylesheets without SRI (site/src/lib/layout/profile-resources.ts:49-69); geolocation coordinates sent to a third-party API (site/src/lib/solar.ts:90-110); vault HTML trusted through `set:html`
- Repository hygiene: tracked scratch output (tmp/pdfs/ 24 files including a third-party job-guide text extract, output/pdf/ 2 personal PDFs), stray preprocessor/.astro/, root node_modules/ without a manifest, four worktrees and 31 local branches (inventory in code-quality-assessment.md)
- Uncommitted work on the current branch: modified site/src/components/profile/presentation.ts, site/src/lib/profile/portfolio-roles.ts, site/src/styles/profile/portfolio.css and three unit tests; deleted site/tests/e2e/portfolio-product-engineer.spec.ts; untracked site/tests/e2e/portfolio-roles.spec.ts and docs/portfolio/infra-engineer/

## Handoff Summary
- **Intent-relevant finding**: the presentation surface runs two styling regimes behind a fail-closed verification chain, and that chain already cannot pass for a reason unrelated to the redesign.
  - Blog routes load global.css, callouts.css, diagrams.css and search.css through a single `<style is:global>` in site/src/layouts/BaseLayout.astro:207-212, plus CDN Pretendard and KaTeX CSS from site/src/lib/layout/profile-resources.ts:49-69.
  - Profile routes (`/resume`, `/portfolio`, `/portfolio/<role>`) instead import site/src/styles/profile/*.css and a locally materialized `RVNNT Profile` font.
  - Colors come from eight `--c-` tokens (site/src/styles/global.css:2-17) redefined only under `[data-theme="dark"]` (global.css:19-32). Nothing in CSS reads `prefers-color-scheme`.
  - The OS appearance is only a first-visit fallback (BaseLayout.astro:153-157, site/src/islands/ThemeToggle.tsx:16-23). After that, a geolocation prompt and api.sunrise-sunset.org drive switching (ThemeToggle.tsx:53-107, site/src/lib/solar.ts:90-110), which conflicts with the HIG expectation of following system appearance.
  - The review-subject list in site/scripts/profile/accessibility-review-contract.mjs:82-99 hashes global.css, BaseLayout.astro, Header.astro, MobileNav.tsx, navigation.ts, package.json, package-lock.json and every file under src/styles/profile, src/components/profile and src/lib/layout. So any HIG change to the shared chrome or profile styles requires a new human 16-state accessibility review. The tracked record is still the old 12-state shape.
  - site/scripts/profile/asset-budget.mjs pins BaseLayout's inline scripts by SHA-256, caps profile CSS at 24 KiB gzip (line 8), forbids component-local CSS and new client JavaScript on profile routes, and fails if any profile route requests an external resource.
- **Risks / follow-up**:
  - Keep the period display format (site/src/components/profile/presentation.ts:678-692), because PDF parity parses it back (site/src/lib/profile/resume-evidence.ts:923-934, site/scripts/profile/pdf-inspector.mjs:8-9).
  - site/tests/unit/profile-presentation.test.ts builds the site and asserts class names (`desktop-nav`, `mobile-nav-dropdown`, `mobile-nav-disclosure`, `profile-local-navigation`, `portfolio-role-navigation`, `portfolio-project-navigation`, `case-study-details`, `resume-entry-heading`, `profile-content-subtitle`), Korean heading text, `aria-label` values and `aria-current`. It also asserts that MobileNav stays a static native `<details>` outside any `astro-island`.
  - Profile routes must keep loading a local `.woff2`: the request ledger and PDF renderer require it. A system-font-only (SF Pro) direction conflicts with the verification chain.
  - The blog routes (posts, hubs, tags, graph, 404) have no browser or accessibility tests, and there are no visual-regression baselines. CI runs only unit tests and property tests.
  - Cleanup scope: every local branch except `codex/chore/aidlc-scaffolding` (10 commits ahead, includes a mermaid puppeteer fix `9e1c203`) and `main` is merged into `develop`. `main` holds 4 merge commits that `develop` lacks. The worktree at /Users/revenantonthemission/Projects/obsidian-blog-u1-nfr is 73 commits behind `origin/develop`. The current branch carries uncommitted WIP.
  - Light-theme link text on blog routes uses `--c-accent`. The code's own comment (site/src/styles/global.css:217-219) measures it at 3.59:1, below WCAG AA. Only the homepage (site/src/pages/index.astro:95-112) and the current desktop nav item use the darker `--c-accent-hover`. The skip link and the mobile preview button put white text on the accent, which computes to about 3.7:1 in light and 1.9:1 in dark.
  - The public `/resume.pdf` (receipt assembled 2026-08-26, committed in `48ddc54` on 2026-08-27) predates the 2026-09-28 profile source. By design, site/src/lib/profile/current-resume-document.ts withholds the download link while identities differ. This is inferred and matches docs/resume/product-engineer/publication-record.md.
