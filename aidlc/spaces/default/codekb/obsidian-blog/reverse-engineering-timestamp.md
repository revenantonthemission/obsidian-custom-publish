# Reverse Engineering Timestamp

## Run Record

- Date: 2026-10-21
- Commit: 96a60668a3e5f1d0e0a13f63ec723926a3c39f0b
- Branch: `chore/manual-a11y-review` (HEAD is the merge `96a6066` on `develop`)
- Working tree: uncommitted changes, none to analyzed source. site/verification/profile/manual-web-accessibility.json carries a new 16-state record, which this scan read only for its top-level fields. The other uncommitted files are AI-DLC workflow files. The fingerprint below covers the analyzed files as they were on disk.
- Intent: `resume-certifications`. A focused scan at Standard depth, run by the developer agent alone (collaborators off). The scan covered the profile period model, the certification section, the fact-approval receipt chain, and the tests and accessibility review subjects they touch.
- Method: static reading only. No build, test, preview or PDF command was executed. The two tracked inventory digests (r7 and r8) were reproduced by hashing their sorted-key compact JSON with SHA-256, and both matched the pinned values.
- Large modules (validation.ts, fact-approval.ts, production-profile.ts, resume-manifest.ts, resume-evidence.ts, and the test files listed below) were read along their period, certification, section and approval paths, not line by line.
- Merge: the previous store (a full scan of 2026-10-19 at `265b38a`, intent `hig-redesign`) is STALE. Its prose was kept. The profile sections of all nine artifacts were updated or extended, and each artifact carries a freshness note. The previous analyzed path `./` is now recorded under `shallow.paths`.
- Scope of this run: the developer scan handoff at aidlc/spaces/default/intents/261021-resume-certifications/inception/reverse-engineering/developer-scan.md lists what was analyzed, skimmed and left out.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: resume-certifications
fingerprint: ec53d3eea19fa5fdd3b0bed6ce9efe119f2e05e4
analyzed:
  paths:
    - site/src/lib/profile/types.ts
    - site/src/lib/profile/validation.ts
    - site/src/lib/profile/normalization.ts
    - site/src/lib/profile/issues.ts
    - site/src/lib/profile/canonical-digest.ts
    - site/src/lib/profile/fact-approval.ts
    - site/src/lib/profile/production-profile.ts
    - site/src/lib/profile/profile-data.ts
    - site/src/lib/profile/resume-manifest.ts
    - site/src/lib/profile/resume-evidence.ts
    - site/src/components/profile/presentation.ts
    - site/src/components/profile/ResumeContent.astro
    - site/src/components/profile/ResumeEntry.astro
    - site/src/pages/resume.astro
    - site/src/pages/portfolio/
    - site/src/styles/profile/print.css
    - site/scripts/profile/accessibility-review-contract.mjs
    - site/tests/pbt/u1/arbitraries/profile.ts
    - site/tests/pbt/u1/arbitraries/manifest.ts
    - site/tests/pbt/u1/profile-presentation.pbt.test.ts
    - site/tests/unit/production-profile.test.ts
    - site/tests/unit/profile-presentation.test.ts
    - site/tests/unit/resume-document.test.ts
    - site/tests/unit/resume-pdf.test.ts
    - site/verification/profile/fact-approval.json
    - docs/resume/product-engineer/inventory-r8.json
    - docs/resume/product-engineer/revision-r7.md
  components:
    - Profile Domain
    - Profile Fact Approval Chain
    - Profile Presentation
    - Profile Pages
shallow:
  paths:
    - ./
    - site/src/lib/profile/selectors.ts
    - site/src/lib/profile/assembly.ts
    - site/src/lib/profile/metadata.ts
    - site/src/lib/profile/document-boundary.ts
    - site/src/lib/profile/current-resume-document.ts
    - site/src/lib/profile/resume-receipts.ts
    - site/src/lib/profile/portfolio-roles.ts
    - site/src/lib/profile/index.ts
    - site/src/components/profile/
    - site/src/styles/profile/
    - site/scripts/profile/
    - site/scripts/profile/pdf-inspector.mjs
    - site/scripts/profile/pdf-renderer.mjs
    - site/scripts/profile/owned-process-registry.mjs
    - site/scripts/profile/owned-node-bootstrap.mjs
    - site/scripts/profile/startup-retry.mjs
    - site/scripts/profile/release-store.mjs
    - site/scripts/profile/resume-coordinator.mjs
    - site/scripts/profile/compile-profile-tools.mjs
    - site/scripts/profile/pbt-runner.mjs
    - site/tests/unit/
    - site/tests/pbt/
    - site/tests/e2e/
    - site/tests/fixtures/
    - site/verification/profile/manual-web-accessibility.json
    - site/verification/resume/current-release.json
    - site/package-lock.json
    - preprocessor/Cargo.lock
    - preprocessor/.astro/
    - docs/plans/
    - docs/portfolio/
    - docs/resume/
    - docs/resume/product-engineer/publication-record.md
    - docs/resume/product-engineer/inventory-r7.json
    - tmp/pdfs/
    - output/pdf/
    - site/public/resume.pdf
    - site/public/favicon.ico
    - fixtures/vault/attachment/
```
