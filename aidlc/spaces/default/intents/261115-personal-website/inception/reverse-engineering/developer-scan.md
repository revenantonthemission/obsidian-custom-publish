# Developer Code Scan — obsidian-blog (personal-website)

Run: 2026-11-15, commit `db7ecae13f9d90368ff32d1956c71f957753cfcd`, branch `develop`. Full rescan at Standard depth, static reading only (no tests, builds or programs were run).

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `CLAUDE.md`
  - `.gitignore`
  - `.mcp.json`
  - `Justfile`
  - `Jenkinsfile`
  - `preprocessor/Cargo.toml`
  - `preprocessor/src/` (all 15 modules; `transform.rs`, `d2.rs`, `mermaid.rs`, `hub_dates.rs` read by function, with the pipeline entry points, wikilink conversion and diagram failure handling read line by line)
  - `preprocessor/tests/common/`
  - `site/package.json`, `site/astro.config.mjs`, `site/tsconfig.json`, `site/tsconfig.profile-tools.json`, `site/vitest.config.ts`, `site/vitest.pbt.config.ts`, `site/playwright.config.ts`, `site/playwright.crossunit.config.ts`, `site/playwright.hig.config.ts`, `site/.prettierrc`, `site/.prettierignore`, `site/.gitignore`
  - `site/src/pages/` (every route)
  - `site/src/layouts/` (BaseLayout, PostLayout, HubLayout)
  - `site/src/islands/` (props, data sources and fetch paths of all seven islands; MobileNav in full)
  - `site/src/components/` non-profile files: `Header.astro`, `PostCard.astro`, `HubProgress.astro`, `HubNav.astro`, `OutlineTabs.astro`, `BacklinkList.astro`, `RelatedPosts.astro`, `GraphList.astro`, `TableOfContents.astro`
  - `site/src/lib/data.ts`, `homepage.ts`, `home-sections.ts`, `navigation.ts`, `render.ts`, `search.ts`, `site.ts`, `types.ts`
  - `site/scripts/local-server.mjs`, `site/scripts/crossunit/`, `site/scripts/hig/`, `site/scripts/profile/homepage-fixture-content.mjs`, `site/scripts/profile/accessibility-review-contract.mjs`
- **Skimmed only**:
  - `preprocessor/tests/` (test names, counts and proptest configuration; `common/` read in full)
  - `preprocessor/Cargo.lock`, `site/package-lock.json` (resolved versions only)
  - `preprocessor/.astro/` (two stray generated Astro type files that are committed)
  - `fixtures/vault/` (4 of 15 notes opened: the homepage fixture, a hub, a simple post and the homepage-linking post; the images are binary)
  - `site/src/lib/profile/` (exports, the production entry point, the receipt shape and the fact source header)
  - `site/src/lib/layout/` (`profile-resources.ts` route policy read; `json-ld.ts` exports only)
  - `site/src/components/profile/`
  - `site/src/lib/appearance.ts`, `graphSim.ts`, `graphUtils.ts`, `icons.ts`, `image-size.ts`, `modal.ts`, `search-keys.ts`, `toc.ts`, `shiki-themes/`
  - `site/src/scripts/` (header comments of all eight scripts)
  - `site/src/styles/` (file list and sizes; the CLAUDE.md token rules)
  - `site/scripts/profile/` other than the two files above (the CLI, the Astro integration hooks, the coordinator and path guard headers; the rest by size and name)
  - `site/tests/` (file list, route tables in `tests/e2e/support/hig.ts`, references to `/tags` and `/graph`, the obligation map header, the homepage composition test header, the isolated-build helper)
  - `site/verification/` (the three tracked approval/release records, header only)
  - `site/public/` tracked files (icons, `manifest.webmanifest`, `robots.txt`, `resume.pdf`)
  - `site/README.md`, `site/.vscode/`
  - `docs/` (titles of `plans/`, `superpowers/`, `portfolio/`, `resume/`; the header of `project/codebase_audit.md`)
- **Left out**:
  - `node_modules/` (dependencies)
  - `site/dist/` (build output)
  - `preprocessor/target/` (build output)
  - `content/` (generated, gitignored)
  - `site/.astro/`, `site/.generated/`, `site/.artifacts/` (generated, gitignored)
  - `site/public/*.json`, `site/public/assets/` (copied preprocessor output, gitignored)
  - `.playwright-mcp/` (tool session artifacts, gitignored)
  - `output/`, `tmp/` (tracked binary PDF outputs; not source)
  - `.claude/`, `.kiro/`, `.codex/`, `.cursor/`, `.opencode/`, `.aidlc/`, `aidlc/` (AI-DLC install and workspace)

### Packages Found
- `obsidian-press` (`preprocessor/`) — Rust binary + library crate (edition 2024) — Rust — turns an Obsidian vault folder into `content/`: transformed Markdown per post, a dedicated homepage artifact, per-post metadata JSON, global JSON indexes, rendered diagrams and copied images.
- `site` (`site/`) — Astro static site (`output: 'static'`) with Preact islands — TypeScript/Astro — renders `content/` into https://rvnnt.dev; also holds the profile domain (`/resume`, `/portfolio`, `/portfolio/<role>`, `/resume.pdf`) and its verification tooling.
- Repository root — orchestration only: `Justfile`, `Jenkinsfile`, `fixtures/vault/` (test vault), `docs/` (design history and résumé/portfolio research).

### Build System
- **Type**: Cargo (preprocessor), npm/npx with Astro 7 + Vite 8 (site), `just` recipes and a declarative Jenkins pipeline on top.
- **Config Files**: `preprocessor/Cargo.toml` (release profile `lto = true`, `codegen-units = 1`), `site/package.json` (engines `node ^22.22.0 || >=24.0.0`; `overrides.sharp ^0.35.5`), `site/astro.config.mjs` (`site: https://rvnnt.dev`, integrations `preact()`, `sitemap()`, `profileBuildIntegration()`), `site/tsconfig.json` (`astro/tsconfigs/strict`, `jsxImportSource: preact`), `site/tsconfig.profile-tools.json` (compiles profile libs to `.artifacts/profile/tools`), `Justfile`, `Jenkinsfile`.
- **Build Dependencies**:
  - `site` → `content/` (file contract, read from `path.resolve('../content')` at build time) → `obsidian-press` output.
  - `site/public/{search-index,graph,previews,nav-tree}.json` and `site/public/assets/` → copied from `content/` by `just preprocess`, `just deploy-preprocess`, Jenkins Preprocess/Verify and `scripts/hig/build-and-serve.mjs`.
  - `obsidian-press` → external CLIs at run time: `git` (updated dates), `d2`, `mmdc` (Mermaid via puppeteer + Chrome), `typst`.
  - `site` test harness → `preprocessor/target/release/obsidian-press` (HIG runner) and `fixtures/vault/`.

### APIs Discovered
- CLI — `preprocessor/src/main.rs` — 1 command: `obsidian-press <vault> <output> [--stamp-published]`; exit 1 on PUB001–PUB007 or on any diagram render failure.
- File contract (generated JSON/Markdown) — `preprocessor/src/output.rs` — 9 artifact kinds: `posts/<slug>.md`, `meta/<slug>.json`, `homepage/index.md`, `homepage/meta.json`, `assets/*`, `graph.json`, `search-index.json`, `previews.json`, `nav-tree.json`, plus `manifest.json`.
- Vault frontmatter contract — `preprocessor/src/scanner.rs` — keys `tags`, `created`, `published`, `is_hub`, `hub_parent`, `description`, `visibility` (`post` | `homepage`).
- Static HTTP routes — `site/src/pages/` — 11 route files: `/`, `/posts/[slug]`, `/hubs/[slug]`, `/tags`, `/tags/[tag]`, `/graph`, `/resume`, `/portfolio`, `/portfolio/[role]` (2 roles), `/rss.xml`, `/404`; plus `@astrojs/sitemap` output and static `public/` files (`/resume.pdf`, icons, manifest, robots).
- Runtime fetches by islands/scripts — `/search-index.json` (Search), `/graph.json` (GraphView), `/nav-tree.json` (NavTree), `/previews.json` (link-preview script).
- Local HTTP server — `site/scripts/local-server.mjs` — GET/HEAD only; clean-URL rewrite to `index.html`; `404.html` with status 404; gzip; `PORT`/`HOST` env.
- npm scripts — `site/package.json` — 13 scripts; the profile CLI (`scripts/profile/cli.mjs`) declares a closed set of five stable commands.
- Build-time error vocabulary — PUB001–PUB007 (preprocessor), HP001–HP004 (site homepage), `PROFILE_APPROVAL_*` (profile), `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` (e2e).

### Frameworks & Libraries
- Rust: anyhow 1.0.102, clap 4.6.0 (derive), serde 1 / serde_json 1.0.149, serde_yml 0.0.12, walkdir 2.5.0, regex 1.12.3, chrono 0.4.44, tempfile 3.27.0, lindera 2.3.2 (`embed-ko-dic`, Korean morphological tokenizer); dev: proptest 1.11.0.
- Site runtime: astro 7.4.1, @astrojs/preact 6.1.0, preact 10.29.1, @astrojs/sitemap 3.7.4, @astrojs/rss 4.0.19, unified 11.0.5 + remark-parse/gfm 4.0.1/math/cjk-friendly/definition-list/abbr + remark-rehype + rehype-raw/slug/katex 7.0.1/parse/stringify, @shikijs/rehype 4.0.2 + transformers, katex 0.16.47, d3-force 3.0.0 / d3-zoom / d3-drag / d3-selection, lucide-static 1.8.0, lucide-preact, pretendard 1.3.9 (pinned).
- Site dev/test: typescript 5.9.3, vite 8.3.5, vitest 4.1.10 + @vitest/coverage-v8, fast-check 4.9.0 + @fast-check/vitest, @playwright/test 1.61.1 (pinned), @axe-core/playwright 4.12.1 (pinned), pdfjs-dist 5.4.624 (pinned), prettier 3.9.9 + prettier-plugin-astro 1.1.0, @astrojs/check.
- External tools: d2, mmdc (@mermaid-js/mermaid-cli, global), typst, puppeteer Chrome / chrome-headless-shell, git, rsync, Jenkins, launchd, cloudflared.

### Test Coverage
- **Test Directories**: `preprocessor/tests/` (16 integration files + `common/`), in-crate `#[cfg(test)]` modules in `hub_dates.rs`, `mermaid.rs`, `syntax.rs`, `transform.rs`; `site/tests/unit/` (36 files + `support/`), `site/tests/pbt/` (`u1/` 5 property files, `u2/` 1, plus a framework-selection file), `site/tests/e2e/` (18 specs + `support/`), `site/tests/obligations/u1-profile.json`, `site/tests/fixtures/`; `fixtures/vault/` (15 notes, 2 images).
- **Test Frameworks**: Rust built-in test + proptest (one checked-in regression seed in `publication_output.proptest-regressions`; output property limited to 32 cases); Vitest (node environment, 30 s timeout, `maxWorkers: 50%`); fast-check via a custom runner (`scripts/profile/pbt-runner.mjs`, seed always printed, `PBT_SEED`/`PBT_RUNS`/`PBT_FILE`/`PBT_FOCUS`/`PBT_PATH`); Playwright with axe in three configs (profile e2e, crossunit with JavaScript off, HIG in Chromium/Firefox/WebKit).
- **Coverage Config**: present — `site/vitest.config.ts` v8 provider over `src/**` and `scripts/**`, reports to `.artifacts/coverage`, no thresholds by design. No Rust coverage configuration.
- Counts (static count of `#[test]`): 125 Rust tests (45 in-crate, 80 integration), matching CLAUDE.md; CLAUDE.md records 446 Vitest unit and 37 property tests (not re-counted).

### Code Quality Indicators
- **Linting**: no ESLint, Stylelint or Clippy configuration in the repo. Formatting: Prettier configured for `site/` (`.prettierrc`: single quotes, width 100, `trailingComma: es5`, astro plugin; `format`/`format:check` scripts); Rust formatting by `cargo fmt` (team rule; no `rustfmt.toml`). Type checking: `npx astro check` (strict TS).
- **CI/CD**: `Jenkinsfile` (nightly cron `H 0 * * *`, stages Checkout → Install (parallel `npm ci` / `cargo build --release`) → Verify (`cargo test --release`, fixture preprocess, `ensure-fixture-content`, `npm run test:unit`, `npm run test:pbt`; archives proptest regressions on failure) → Preprocess (real vault with `--stamp-published`) → Build Site → Deploy (`rsync -a --delete` to the web root, skipped when `RUN_DEPLOY` is off)). No GitHub Actions or other CI.
- **Documentation**: `CLAUDE.md` is the accurate and current overview (one stale line: "Astro 6"). `site/README.md` documents the profile command surface and human gates in Korean but still describes S3/CloudFront/Terraform deploy boundaries that no longer exist. Doc comments are dense and cite requirement/rule IDs (BR-U2-*, FR*, NFR*, R-*). `docs/plans` and `docs/superpowers` hold the March–April 2026 design history.

### Technical Debt Signals
- `preprocessor/src/related.rs`: ties in related-post scores are ordered by `HashMap` iteration, and `linker.rs` builds backlinks from a `HashSet`; both reach `meta/<slug>.json` in non-deterministic order, against the "generated output is deterministic" rule.
- `preprocessor/src/scanner.rs` `git_last_modified_batch`: runs `git log` from the process cwd over the vault path; the production vault lives in iCloud outside this repository, so by static reading `updated` is likely always `null` in production.
- `preprocessor/src/scanner.rs` `stamp_published_dates`: rewrites vault files before the catalog validates, re-stamps whenever the file's mtime date is later than `published` (so `published` tracks the last edit), and replaces every occurrence of `published: <date>` in the whole file text, body included.
- `scanner.rs`: slugs come from file names only; a slug collision only warns and the later file wins; `name_map` is keyed by file name, so equal names in different folders shadow each other.
- `mermaid.rs`: hard-coded fallback path `/opt/homebrew/Cellar/node/25.9.0_2/bin/mmdc`.
- `site/src/lib/data.ts`: post getters are lenient (missing files give `[]`, `''` or `null`) while the homepage getter fails closed; `getPreviewSummary` reads `site/public/previews.json` (a copy) rather than `content/`; `CONTENT_DIR` depends on the cwd.
- Hubs render twice: `/posts/<hub-slug>` (every meta) and `/hubs/<hub-slug>`.
- `site/scripts/local-server.mjs` `rewriteUri`: any path containing `.` is treated as a file, so a tag whose sanitized name has a dot would be unreachable; the server has no redirect support.
- `site/src/lib/homepage.ts`: the legacy recent-posts rule matches an `h2` titled "이번주에 작성된 포스트", which the real vault writes as `h3`; the fallback always inserts the section after the profile slot.
- Large files against the "under 800 lines" web rule: `scripts/profile/verification-provider.mjs` 3,412; `lib/profile/validation.ts` 1,933; `resume-evidence.ts` 1,821; `asset-budget.mjs` 1,609; `fact-approval.ts` 1,551; `resume-manifest.ts` and `resume-receipts.ts` 1,466 each; `preview-supervisor.mjs` 1,348; `release-store.mjs` 1,189; `production-profile.ts` 1,163; `font-materializer.mjs` 1,126; `preprocessor/src/transform.rs` 1,027.
- Committed artefacts that are not source: `preprocessor/.astro/*.d.ts`, `tmp/pdfs/` (24 files) and `output/pdf/` (2 PDFs).
- Stale docs: `site/README.md` deploy boundary (S3/CloudFront/Terraform); CLAUDE.md "Astro 6" against `astro ^7.4.1`; `team.md` says the site has no formatter while Prettier is configured.
- Gaps between stated practice and the pipeline: `team.md` says every deploy is followed by an HTTP 200 check on `/` and one post, but the Jenkinsfile has no such step; Jenkins does not run `format:check`, `astro check`, `cargo fmt --check`, Playwright or the crossunit gate.
- TODO/FIXME/HACK markers: none in source; no lint suppressions.
- Security note (by design): `set:html` renders vault HTML unescaped (PostLayout, homepage); acceptable only while the vault is single-author.

## Handoff Summary
- **Intent-relevant finding**:
  - B1 (site pages from a second vault folder): the preprocessor takes exactly one vault root (`main.rs` positional `vault`) and walks all of it (`scanner.rs` `scan_vault`, excluding only dot-entries and `Drafts`). Every scanned note is either the one homepage or a post (`catalog.rs` `PublicationScope { Post, Homepage }`); everything not the homepage flows into `posts_only()`, which feeds `posts/`, `meta/`, `graph.json`, `search-index.json`, `previews.json`, `nav-tree.json` and related posts (`output.rs` `write_output`). The site lists posts by reading every `content/meta/*.json` (`data.ts` `getAllPostMeta`), so a third scope and its own output namespace are needed to keep site pages out of post lists. `--stamp-published`, attachment lookup (`find_attachment` walks up to 10 parents for `attachment/`) and slug/name collision handling are all single-root today. Justfile `publish_vault` and Jenkins `VAULT_PATH` both point at `Areas/Notes`.
  - B3 (site-built homepage): the homepage is a vault note with `visibility: homepage`; the catalog fails with PUB002 if none exists and PUB003 if more than one (`catalog.rs` `build`); `output.rs` writes `homepage/index.md` + `homepage/meta.json`; `data.ts` `getHomepage` fails closed (HP001/HP002); `index.astro` requires exactly one `<!-- profile:slot -->` (HP003/HP004 in `homepage.ts`) and shows only posts published today. Removing the note therefore touches the catalog rules, the output namespace, the site gateway, `scripts/profile/homepage-fixture-content.mjs`, `scripts/crossunit/ensure-fixture-content.mjs`, the Jenkins Verify step and the U2 tests (`publication_catalog.rs`, `publication_output.rs`, `homepage-composition.test.ts`, `tests/pbt/u2/`, `homepage.spec.ts`).
  - B2/B4 (Writing section, moving Tags and Graph): routes are file-based in `site/src/pages/`. Navigation is a frozen, self-validating model in `navigation.ts` (`PRIMARY_NAVIGATION` = Tags, Graph, Résumé, Portfolio); `Header.astro` throws on an invalid state, and the PBT `profile-metadata-navigation.pbt.test.ts` hard-codes the Tags item. `navigation.ts`, `Header.astro`, `MobileNav.tsx`, `BaseLayout.astro`, `astro.config.mjs`, `package.json` and the base styles are review subjects (`accessibility-review-contract.mjs`), so changing them invalidates the manual 16-state accessibility record. The local server has no redirects; static output would need Astro `redirects` (meta-refresh pages) or server-level rules. `/tags` and `/graph` are hard-coded in `tests/e2e/support/hig.ts`, `crossunit.spec.ts`, `homepage.spec.ts`, `hig-pages.spec.ts`, `hig-chrome.spec.ts`, `hig-profile.spec.ts` and `tests/pbt/u1/arbitraries/metadata.ts`, and in `PostLayout`/`HubLayout` tag chip links.
  - Later rounds (profile facts into the vault): facts live in `site/src/lib/profile/profile-data.ts`, sealed by digests in `production-profile.ts` against `verification/profile/fact-approval.json`; `/resume.pdf` is released only through `npm run resume:pdf -- --prepare/--promote` with `verification/resume/current-release.json` binding the PDF to the profile source digest.
- **Risks / follow-up**:
  - Keep the fail-closed order: validate → clean managed namespaces → write (`output.rs`), and the PUB/HP diagnostic vocabulary; any new scope or namespace must be added to `clean_managed_namespaces` and `manifest.json`.
  - Vault stamping writes into the maintainer's real vault, so extending it to a second folder is a production side effect that needs an explicit decision.
  - Jenkins Verify materializes fixture content before the unit suite because the isolated build needs `content/homepage/`; any homepage contract change must keep that step working.
  - Changing review-subject files requires the maintainer to redo the manual accessibility review; agents must never write that record.
  - Redirect behaviour must work both through `local-server.mjs` (production) and the link sweep (`scripts/crossunit/link-sweep.mjs`), which only checks that emitted files exist.
