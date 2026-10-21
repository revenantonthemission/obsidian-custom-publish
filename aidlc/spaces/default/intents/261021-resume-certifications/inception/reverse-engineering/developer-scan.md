# Developer Code Scan: résumé certifications and day-precision periods

Focused scan for intent `resume-certifications` at commit `96a60668a3e5f1d0e0a13f63ec723926a3c39f0b` on branch `chore/manual-a11y-review`, 2026-10-21. The scan was static: no build, test, preview or PDF command ran. One computation was run outside the code: the two tracked inventory digests were reproduced with a canonical JSON hash (sorted keys, compact separators, SHA-256), and both matched their pinned values.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - site/src/lib/profile/types.ts
  - site/src/lib/profile/validation.ts (shape inspection, period, date-point and certification paths)
  - site/src/lib/profile/normalization.ts (period cloning)
  - site/src/lib/profile/issues.ts (period issue codes and messages)
  - site/src/lib/profile/canonical-digest.ts (résumé source digest and period node)
  - site/src/lib/profile/fact-approval.ts (fact collection, canonical period check, value equality)
  - site/src/lib/profile/production-profile.ts (pinned receipt, evidence sources and membership, source-shape check, structural decisions, digest chain)
  - site/src/lib/profile/profile-data.ts (every period and certification fact)
  - site/src/lib/profile/resume-manifest.ts (section order, period serialization, section identity check)
  - site/src/lib/profile/resume-evidence.ts (PDF period parsing)
  - site/src/components/profile/presentation.ts
  - site/src/components/profile/ResumeContent.astro
  - site/src/components/profile/ResumeEntry.astro
  - site/src/pages/resume.astro
  - site/src/pages/portfolio/
  - site/src/styles/profile/print.css
  - site/scripts/profile/accessibility-review-contract.mjs
  - site/tests/pbt/u1/arbitraries/profile.ts (period modes, certification blueprint, period mutations)
  - site/tests/pbt/u1/arbitraries/manifest.ts (manifest oracle for certifications and periods)
  - site/tests/pbt/u1/profile-presentation.pbt.test.ts (section kinds, period assertions)
  - site/tests/unit/production-profile.test.ts (digest, fact count and source-shape pins)
  - site/tests/unit/profile-presentation.test.ts (résumé heading pins)
  - site/tests/unit/resume-document.test.ts (PDF period parsing cases)
  - site/tests/unit/resume-pdf.test.ts (period display helper and value-kind inference)
  - site/verification/profile/fact-approval.json
  - docs/resume/product-engineer/inventory-r8.json
  - docs/resume/product-engineer/revision-r7.md
- **Skimmed only**:
  - site/src/lib/profile/ other modules: selectors.ts, assembly.ts, metadata.ts, document-boundary.ts, current-resume-document.ts, resume-receipts.ts, portfolio-roles.ts, index.ts (grepped for certification and period use; none in metadata.ts)
  - site/src/components/profile/ other components (CaseStudy, ContactActions, ContentBlocks, ContentText, PortfolioContent, PortfolioRoleNavigation, ProfileLocalNavigation, ProfileShell)
  - site/src/styles/profile/ other stylesheets (resume.css certification rules and foundation.css `.profile-period` read; font.css and portfolio.css not read)
  - site/scripts/profile/pdf-inspector.mjs and pdf-renderer.mjs (period inference, rendered-fact observation and section skeleton read; the rest not read)
  - site/scripts/profile/compile-profile-tools.mjs and asset-budget.mjs (module list and CSS limit only)
  - site/scripts/profile/ remaining files (line counts only)
  - site/tests/unit/ remaining files, including profile-domain.test.ts and profile-projections.test.ts (grep hits read)
  - site/tests/pbt/ remaining files, including profile-domain.pbt.test.ts and mutations.ts (grep hits read)
  - site/tests/e2e/ (test titles; profile-routes.spec.ts manifest parity block read)
  - site/verification/profile/manual-web-accessibility.json (top-level fields only)
  - site/verification/resume/current-release.json (identity fields only)
  - docs/resume/product-engineer/publication-record.md (first 30 lines and grep)
  - docs/resume/product-engineer/inventory-r7.json (digest reproduced only)
- **Left out**:
  - site/node_modules/
  - site/dist/
  - site/.astro/
  - site/.generated/
  - site/.artifacts/
  - content/

### Packages Found
- site — npm package — TypeScript, Astro, Preact — the static site; the profile subsystem lives in it
- site/src/lib/profile — internal module group (18 modules, about 13,350 lines) — TypeScript — profile domain, approval chain and résumé manifest
- site/src/components/profile — internal module group (presentation.ts plus 10 Astro components) — TypeScript and Astro — résumé and portfolio rendering
- site/scripts/profile — internal tooling (22 `.mjs` modules, about 13,270 lines, plus `.d.mts` declarations and two JSON files) — Node ESM — verification, PDF release, font materialization

### Build System
- **Type**: npm with Astro 6 and Vite; `tsc` through site/tsconfig.profile-tools.json for the Node-side release tools
- **Config Files**: site/package.json, site/astro.config.mjs, site/tsconfig.json, site/tsconfig.profile-tools.json, site/vitest.config.ts, site/vitest.pbt.config.ts, site/playwright.config.ts
- **Build Dependencies**:
  - resume.astro → presentation.ts → lib/profile types; resume.astro → production-profile.ts → fact-approval.json
  - The Astro build integration validates the production profile at `astro:config:setup`, so a bad receipt or digest fails every build, blog-only builds included.
  - compile-profile-tools.mjs compiles six pure modules for the PDF release flow: canonical-digest, document-boundary, production-profile, resume-evidence, resume-manifest and resume-receipts (compile-profile-tools.mjs:20-27).

### APIs Discovered
- Build-time route — `/resume` (site/src/pages/resume.astro) — one route that renders six résumé sections.
- Build-time routes — `/portfolio/<role>` (site/src/pages/portfolio/[role].astro) — one file with `getStaticPaths` over `PORTFOLIO_ROLES`. It shows no certifications or education.
- Internal module API — presentation.ts — `buildResumePresentation`, `buildPortfolioPresentation`.
- Internal module API — resume-manifest.ts — `RESUME_SECTION_ORDER`, `buildApprovedResumeManifest`, `buildResumeManifestForTest`, `compareResumeFactManifests`.
- Internal data contract — the manifest period token `start:<tag>:<value>|end:<tag>:<value>` or `…|end:present` (resume-manifest.ts:783-812).

### Frameworks & Libraries
- Astro — ^6.0.4 — rendering
- TypeScript — ^5.9.3 — strict mode; tool compilation
- Vitest — ^4.1.10 — unit suite
- fast-check with @fast-check/vitest — ^4.9.0, ^0.4.1 — property suites
- Playwright — 1.61.1 — e2e and PDF rendering
- pdfjs-dist — 5.4.624 — PDF inspection
- No date library is used. Dates are plain strings checked by regular expressions.

### Test Coverage
- **Test Directories**: site/tests/unit (31 files), site/tests/pbt (u1, u2, framework-selection), site/tests/e2e (18 specs plus support/)
- **Test Frameworks**: Vitest, fast-check, Playwright with @axe-core/playwright
- **Coverage Config**: absent

### Code Quality Indicators
- **Linting**: no linter configuration. Prettier formats site/ (CLAUDE.md), and `npx astro check` is the type check.
- **CI/CD**: Jenkinsfile Verify stage runs `npm run test:unit` and `npm run test:pbt`. `npm run test:e2e` and `resume:pdf` are not part of CI.
- **Documentation**: the profile modules carry dense, rule-referenced comments. docs/resume/product-engineer/ records each fact revision and how its digest was computed.

### Technical Debt Signals
- **The period vocabulary is restated in eight places.** The two precisions (`year`, `year-month`) and their patterns are hard-coded independently:
  - types.ts:86-96
  - validation.ts:48-49 and 1553-1608
  - issues.ts:56 (the message names both precisions)
  - fact-approval.ts:1325-1340
  - resume-manifest.ts:152-153 and 801-812
  - resume-evidence.ts:31-33 and 828-840
  - pdf-inspector.mjs:8-9
  - the test generators: tests/pbt/u1/arbitraries/profile.ts:19 and 811-836

  The comment at resume-evidence.ts:26-30 says this duplication is deliberate: the PDF observation path must not import the manifest builder. Yet resume-evidence.ts:2 already imports `compareResumeFactManifests` from resume-manifest.ts, so the isolation is a convention rather than a module boundary. A new precision therefore has to be added in every one of these places together.
- **ResumeContent.astro renders the certifications section in its final `else` branch** (ResumeContent.astro:142-172). A new section kind added to `ResumeSectionView` without its own branch would silently render with certification markup and `data-profile-section="certifications"`.
- **Large modules**: validation.ts (1,881 lines), resume-evidence.ts (1,754), fact-approval.ts (1,541), resume-receipts.ts (1,437), resume-manifest.ts (1,387), production-profile.ts (1,114).
- **Evidence membership is a hand-written allowlist.** production-profile.ts:882-1000 maps each fact ID to an evidence source. A fact that is added or removed without updating it fails with `PROFILE_APPROVAL_EVIDENCE_INVALID`.

## Handoff Summary
- **Intent-relevant finding**: The profile date model supports only two precisions, `year` and `year-month`, and every layer restates them independently.
  - Validation rejects any other tag with `period.precision` (validation.ts:1579-1582). It also requires start and end to share one precision (validation.ts:1544-1547).
  - The fact-approval check accepts only those two tags (fact-approval.ts:1325-1340).
  - The manifest serializer throws `Invalid résumé period point.` for anything else (resume-manifest.ts:801-812).
  - The PDF readers refuse any other display form: resume-evidence.ts:828-840 and pdf-inspector.mjs:9.

  Day-precision issue-to-expiry ranges therefore need a coordinated change across types, validation, issues, fact approval, the manifest, PDF evidence, the PDF inspector and the property-test generators. The tag-agnostic layers need no change: normalization.ts:283-295, canonical-digest.ts:386-397, the production-profile.ts:447-458 shape check and presentation.ts:603-617.

  Certifications become one résumé section with the fixed heading `어학 자격`. Five places pin that:
  - presentation.ts:189-193 and 310-318
  - the manifest's six-section order: resume-manifest.ts:36-43, with the identity check at 570-582
  - the ResumeContent.astro else branch
  - the PDF section skeleton, which maps `[data-profile-section]` elements to manifest ordinals in DOM order (pdf-renderer.mjs:474-519)
  - the heading pin in profile-presentation.test.ts:244-252

  A separate `자격증` section is a new section key and order, a new view kind, a new Astro branch and new CSS. It is also either a new source collection or a category on `Certification`. One approved fact can render only once (pdf-renderer.mjs `PDF_RENDER_SURFACE_FACT_AMBIGUOUS`), so a certification cannot appear in both sections.

  Every content change goes through the pinned receipt chain:
  - profile-data.ts
  - `EVIDENCE_MEMBERSHIP`, whose E01 group lists both HSK facts and the OPIc facts (production-profile.ts:900-919)
  - `EVIDENCE_SOURCES` and the `EvidenceId` union
  - a new inventory JSON under docs/resume/product-engineer/, hashed by the canonical JSON digest
  - `EXPECTED_RECEIPT` (production-profile.ts:40-52) and site/verification/profile/fact-approval.json, which must match key for key
  - `EXPECTED_MATERIALIZED_DIGEST` and the 120-fact count in production-profile.test.ts:17 and 43-61
- **Risks / follow-up**:
  - **Accessibility review.** presentation.ts, ResumeContent.astro, resume.css, print.css and resume.astro are accessibility review subjects (accessibility-review-contract.mjs:81-111). The 16-state record dated 2026-10-21 is modified but uncommitted on the current branch, and any edit to those files invalidates it. The site/src/lib/profile modules, profile-data.ts included, are not review subjects.
  - **Evidence for exact dates.** Evidence E01 is a 2025 portfolio PDF and supported only month-precision certification dates. The exact OPIc dates (2025-09-06 to 2027-09-06) and the AWS certification facts need a new evidence entry, presumably a user confirmation.
  - **Existing issuer pin.** production-profile.test.ts:139-141 asserts that no certification has an issuer. Adding "Amazon Web Services" as an issuer requires changing that test.
  - **Meaning of the period changes.** Today a certification period is the issue month repeated (`2025-09 – 2025-09`). The intent turns it into an issue-to-expiry range, and a validity window that extends past today must not be read as a reversed range.
  - **PDF.** The public PDF (released 2026-08-27) is already withheld. A new candidate goes through `npm run resume:pdf -- --prepare`, a human review and `--promote`. CI never runs this. The extra section may push the one-page résumé to two pages.
  - **Section order.** Where `자격증` sits relative to `어학 자격` is not stated in the intent.
