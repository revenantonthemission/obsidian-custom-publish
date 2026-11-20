# Dependencies

## Internal Cross-package Dependencies

```mermaid
flowchart LR
  Vault["Vault Areas/Notes"] --> Pre["preprocessor obsidian-press"]
  Fix["fixtures/vault"] --> Pre
  Pre --> Content["content/"]
  Content --> Site["site build"]
  Content -->|copy JSON and assets| Public["site/public"]
  Public --> Site
  Verif["site/verification records"] --> Site
  Site --> Dist["site/dist"]
  Dist --> Server["local-server.mjs"]
  Pre -.->|release binary| Hig["HIG harness"]
  Fix -.-> Hig
  Server -.-> Hig
  Just["Justfile"] --> Pre
  Just --> Site
  Jenk["Jenkinsfile"] --> Pre
  Jenk --> Site
```

Text fallback: the preprocessor reads the real vault (or `fixtures/vault`) and writes `content/`. The site build reads `content/` directly and also needs the four JSON files and assets copied into `site/public/`, plus the tracked approval records in `site/verification/`. The build output in `site/dist/` is served by `local-server.mjs`. The HIG harness depends on the release preprocessor binary, the fixture vault and the local server. The Justfile and the Jenkinsfile drive both packages.

### Contract details that couple the packages

| Coupling | Producer | Consumer | Breaks when |
|---|---|---|---|
| `content/` location | Justfile/Jenkins pass `./content` from the repo root | `data.ts` `path.resolve('../content')`, `render.ts` `../content/assets`, `homepage-fixture-content.mjs` | the site is built from a cwd other than `site/`, or the output path changes. |
| JSON shapes | `output.rs`, `types.rs`, `search.rs`, `nav_tree.rs`, `preview.rs` | `site/src/lib/types.ts` (hand-mirrored), `search.ts` validator, `graphUtils.parseGraphData` | a field is renamed or added on one side only. |
| URL scheme `/posts/<slug>`, `/` for the homepage | `transform.rs` `convert_wikilinks`, `hub_dates.rs` regex | pages, `link-preview.ts` selector `a[href^="/posts/"]`, LocalGraph/GraphView hrefs | posts move to another prefix. |
| Slug rules | `scanner.rs` `slugify_heading` (matches rehype-slug) | heading fragments, TOC, `rehype-slug` IDs | either side changes its slug algorithm. |
| Homepage artifact + profile slot | `output.rs` `write_homepage` | `getHomepage` (HP001/HP002), `homepage.ts` (HP003/HP004), fixture materializer, Jenkins Verify | the homepage note is removed or the slot token changes. |
| Copied JSON in `site/public/` | Justfile, Jenkinsfile, `hig/build-and-serve.mjs` | islands at run time; `getPreviewSummary` at build time | the copy step is skipped (build still succeeds with empty summaries). |
| Review-subject files | `accessibility-review-contract.mjs` | `test:e2e` (manual record digest) | any listed file changes. |

### Module-level dependencies inside the preprocessor

- `main` → `scanner`, `catalog`, `output`, `transform`
- `catalog` → `syntax`, `transform`, `types`
- `output` → `catalog`, `linker`, `nav_tree`, `preview`, `related`, `search`, `transform`, `types`
- `transform` → `syntax`, `types`, `scanner` (`slugify_heading`), `hub_dates`, `d2`, `mermaid`, `typst_render`
- `hub_dates` → `transform` (`transform_outside_fences`), `types` (mutual reference with `transform`, no cycle in data)
- `linker`, `nav_tree`, `related`, `preview`, `search` → `types` (+ `syntax`, `transform::strip_frontmatter`)
- `scanner` → `syntax`, `types`

### Module-level dependencies inside the site

- Pages → `lib/data.ts`, `lib/render.ts`, layouts, components; profile pages → `lib/profile/production-profile.ts`, `lib/profile/metadata.ts`, `components/profile/presentation.ts`.
- `layouts/BaseLayout.astro` → `components/Header.astro`, `islands/Search.tsx`, `lib/layout/*`, `lib/site.ts`, `.generated/profile-font/*` (materialized at config setup).
- `components/Header.astro` → `lib/navigation.ts` → `lib/profile/issues.ts`, `lib/profile/types.ts` (the navigation model shares the profile validation vocabulary).
- `lib/render.ts` → `lib/home-sections.ts`, `lib/image-size.ts`, Shiki theme JSON.
- `pages/index.astro` → `lib/homepage.ts`, `lib/profile/production-profile.ts`.
- `lib/layout/profile-resources.ts` → `lib/profile/portfolio-roles.ts`.
- `astro.config.mjs` → `scripts/profile/astro-profile-integration.mjs` → `lib/profile/production-profile.ts`, `scripts/profile/font-materializer.mjs`.
- No circular imports were observed in the files read.

## External Dependencies

### Rust crates (direct)

anyhow, clap, serde, serde_json, serde_yml, walkdir, regex, chrono, tempfile, lindera (embed-ko-dic); dev: proptest. Risk notes: `serde_yml` is pre-1.0 (0.0.12); lindera embeds the Korean dictionary, which makes release builds heavy but offline.

### npm packages

- Runtime (28 declared): Astro 7 and integrations, Preact, unified/remark/rehype stack, Shiki, KaTeX, d3 modules, lucide, pretendard.
- Dev (19 declared): TypeScript, Vite (pinned 8.3.5), Vitest, fast-check, Playwright (pinned), axe (pinned), pdfjs-dist (pinned), Prettier (pinned), type packages.
- Override: `sharp ^0.35.5`.
- `package.json` and `package-lock.json` are accessibility review subjects: any dependency change invalidates the manual review record.

### System tools and services

| Dependency | Needed for | Failure mode |
|---|---|---|
| `d2`, `mmdc` + Chrome, `typst` | diagram rendering | run exits 1 after writing output, naming each failed diagram. |
| `git` | `updated` dates | silently `null` (git errors are swallowed). |
| `rsync` | deploy | Jenkins stage fails. |
| Node (launchd plist path) | serving | site down until the plist is updated after a Node upgrade. |
| Cloudflare Tunnel | public access | rvnnt.dev unreachable; LAN access still works. |
| Jenkins on 127.0.0.1:8081 | nightly publish | no publish; never start it with `brew services` (it would take port 8080). |
| iCloud vault path | real content | Preprocess stage fails. |

## Dependencies Relevant to the Active Intent

- B1 site pages: Vault Scanner, Publication Catalog, Output Writer, Discovery Index Builders, `data.ts`, Justfile `publish_vault`, Jenkins `VAULT_PATH`, `stamp_published_dates`, `find_attachment`.
- B2 Writing section: `data.ts` (`getAllPostMeta`, `getTagIndex`, `getPreviewSummary`), `PostCard.astro`, new pages under `site/src/pages/writing/`.
- B3 site-built homepage: `catalog.rs` (PUB002 cardinality), `output.rs` `write_homepage`, `data.ts` `getHomepage`, `homepage.ts`, `index.astro`, fixture materializers, Jenkins Verify, U2 tests.
- B4 Tags/Graph move and redirects: `pages/tags/*`, `pages/graph.astro`, `navigation.ts` (review subject), PostLayout/HubLayout tag links, `local-server.mjs` (no redirects), link sweep, HIG/crossunit/homepage specs and the navigation PBT arbitraries.
- Later rounds: `lib/profile/*` and `scripts/profile/*` (facts source, approval receipt, résumé release).
