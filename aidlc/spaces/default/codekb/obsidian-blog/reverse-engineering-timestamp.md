# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-15
- Commit: db7ecae13f9d90368ff32d1956c71f957753cfcd
- Branch: develop
- Intent: personal-website
- Run: full rescan of the whole repository at Standard depth, performed by the developer agent alone (scan and synthesis), static reading only; no tests, builds or programs were run.
- Result: this knowledge base replaces the previous one wholesale. The scope is recorded as partial because the profile domain and tooling (about 30k lines), the styles, the post-page scripts and most test files were skimmed rather than read in depth; the preprocessor, the site's content, routing, layout, navigation, homepage and serving code, and the build and CI files were analyzed deeply.
- Shallow by nature (recorded under shallow paths): lockfiles, binary files (`site/public/resume.pdf`, icons, fixture images), content-only documents (`docs/`, `fixtures/vault/` notes, `site/README.md`) and tracked approval records.
- Left out without opening: `node_modules/`, `site/dist/`, `preprocessor/target/`, `content/`, `site/.astro/`, `site/.generated/`, `site/.artifacts/`, `site/public/*.json`, `site/public/assets/`, `.playwright-mcp/`, `output/`, `tmp/`, and the AI-DLC install and workspace (`.claude/`, `.kiro/`, `.codex/`, `.cursor/`, `.opencode/`, `.aidlc/`, `aidlc/`).

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: personal-website
fingerprint: 77265d927bb8600bb3f1897a07ad088eca1ec2e3
analyzed:
  paths:
    - CLAUDE.md
    - .gitignore
    - .mcp.json
    - Justfile
    - Jenkinsfile
    - preprocessor/Cargo.toml
    - preprocessor/src/
    - preprocessor/tests/common/
    - site/package.json
    - site/astro.config.mjs
    - site/tsconfig.json
    - site/tsconfig.profile-tools.json
    - site/vitest.config.ts
    - site/vitest.pbt.config.ts
    - site/playwright.config.ts
    - site/playwright.crossunit.config.ts
    - site/playwright.hig.config.ts
    - site/.prettierrc
    - site/.prettierignore
    - site/.gitignore
    - site/src/pages/
    - site/src/layouts/
    - site/src/islands/
    - site/src/components/Header.astro
    - site/src/components/PostCard.astro
    - site/src/components/HubProgress.astro
    - site/src/components/HubNav.astro
    - site/src/components/OutlineTabs.astro
    - site/src/components/BacklinkList.astro
    - site/src/components/RelatedPosts.astro
    - site/src/components/GraphList.astro
    - site/src/components/TableOfContents.astro
    - site/src/lib/data.ts
    - site/src/lib/homepage.ts
    - site/src/lib/home-sections.ts
    - site/src/lib/navigation.ts
    - site/src/lib/render.ts
    - site/src/lib/search.ts
    - site/src/lib/site.ts
    - site/src/lib/types.ts
    - site/scripts/local-server.mjs
    - site/scripts/crossunit/
    - site/scripts/hig/
    - site/scripts/profile/homepage-fixture-content.mjs
    - site/scripts/profile/accessibility-review-contract.mjs
  components:
    - Preprocessor CLI
    - Vault Scanner
    - Publication Catalog
    - Link Resolver
    - Transform Pipeline
    - Diagram Renderers
    - Discovery Index Builders
    - Output Writer
    - Shared Syntax
    - Core Types
    - Content Data Access
    - Markdown Renderer
    - Homepage Composition
    - Site Identity
    - Primary Navigation
    - BaseLayout
    - PostLayout
    - HubLayout
    - Header
    - Discovery Pages
    - Listing Components
    - Client Islands
    - Local Static Server
    - Cross-unit Gate
    - HIG Browser Harness
    - Build Orchestration
    - Nightly Pipeline
shallow:
  paths:
    - preprocessor/tests/
    - preprocessor/Cargo.lock
    - preprocessor/.astro/
    - fixtures/vault/
    - site/package-lock.json
    - site/src/lib/profile/
    - site/src/lib/layout/
    - site/src/components/profile/
    - site/src/lib/appearance.ts
    - site/src/lib/graphSim.ts
    - site/src/lib/graphUtils.ts
    - site/src/lib/icons.ts
    - site/src/lib/image-size.ts
    - site/src/lib/modal.ts
    - site/src/lib/search-keys.ts
    - site/src/lib/toc.ts
    - site/src/lib/shiki-themes/
    - site/src/scripts/
    - site/src/styles/
    - site/scripts/profile/
    - site/tests/
    - site/verification/
    - site/public/
    - site/README.md
    - site/.vscode/
    - docs/
```
