# Reverse Engineering Timestamp

## Run Record

- Date: 2026-10-19T23:09:33Z
- Commit: 265b38a9877c9640cbe8af3216481962238ffe48
- Branch: `codex/feature/infra-engineer-portfolio` (the same commit as `develop`)
- Working tree: includes uncommitted infra-engineer portfolio changes (site/src/components/profile/presentation.ts, site/src/lib/profile/portfolio-roles.ts, site/src/styles/profile/portfolio.css, three unit tests, site/tests/e2e/portfolio-roles.spec.ts replacing portfolio-product-engineer.spec.ts, docs/portfolio/infra-engineer/). The fingerprint below covers the files as they were on disk.
- Intent: `hig-redesign`; full scan at Standard depth; the developer agent scanned and synthesized (lead-only pipeline)
- Method: static reading only; no build, test, preview or server was executed

## Scope of Analysis

```yaml
scope_version: 1
kind: full
intent: hig-redesign
fingerprint: cf9f6df681f45c6487887448ce96854330c20ce2
analyzed:
  paths:
    - ./
  components:
    - Preprocessor CLI
    - Diagram Renderers
    - Markdown Render Pipeline
    - Site Data Layer
    - Homepage Composition
    - BaseLayout
    - Header
    - Footer
    - PostLayout
    - HubLayout
    - Blog Content Components
    - Blog Pages
    - ThemeToggle Island
    - Search Island
    - MobileNav
    - MobileSidebar Island
    - NavTree Island
    - GraphView Island
    - LocalGraph Island
    - Post Enhancement Scripts
    - Inline Layout Scripts
    - Theme System
    - Font Loading
    - Icon Sources
    - Accessibility Hooks
    - Profile Domain
    - Profile Presentation
    - Profile Pages
    - Profile Layout Policy
    - Profile Build Integration
    - Verification Provider
    - Resume PDF Release
    - Test Tooling
    - Local Static Server
    - Delivery Pipeline
shallow:
  paths:
    - site/scripts/profile/owned-process-registry.mjs
    - site/scripts/profile/owned-node-bootstrap.mjs
    - site/scripts/profile/startup-retry.mjs
    - site/scripts/profile/release-store.mjs
    - site/scripts/profile/resume-coordinator.mjs
    - site/scripts/profile/pdf-inspector.mjs
    - site/scripts/profile/compile-profile-tools.mjs
    - site/scripts/profile/pbt-runner.mjs
    - site/tests/unit/
    - site/tests/pbt/
    - site/tests/fixtures/
    - site/verification/resume/current-release.json
    - site/package-lock.json
    - preprocessor/Cargo.lock
    - preprocessor/.astro/
    - docs/plans/
    - docs/portfolio/
    - docs/resume/
    - tmp/pdfs/
    - output/pdf/
    - site/public/resume.pdf
    - site/public/favicon.ico
    - fixtures/vault/attachment/
```
