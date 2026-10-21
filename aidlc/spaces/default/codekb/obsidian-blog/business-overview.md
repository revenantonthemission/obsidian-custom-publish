# Business Overview: obsidian-blog (obsidian-press)

> **Freshness (2026-10-21).** The profile sections below were refreshed by the focused `resume-certifications` scan at commit `96a6066`. Everything outside the profile subsystem comes from the 2026-10-19 full scan at `265b38a`, before the HIG redesign merged. It is stale in places: the theme system, tokens, fonts, chrome and the blog e2e coverage have changed since (see CLAUDE.md). The scope block in reverse-engineering-timestamp.md records which paths were verified.

## Business Context

obsidian-blog, also called obsidian-press, is a self-hosted replacement for Obsidian Publish built by one person. It publishes the `Areas/Notes` folder of a personal Obsidian vault in iCloud to https://rvnnt.dev as a static, Korean-language knowledge site, and it also hosts that person's professional profile: a web résumé, a portfolio with role-specific editions, and a downloadable PDF résumé.

The system has two halves:

- **Knowledge publishing.** Technical study notes on operating systems, the web, databases and networking are organized into hub pages with tags, backlinks, a link graph, full-text Korean search and an RSS feed. Obsidian-specific syntax is preserved: wikilinks, transclusions, block references, callouts, highlights, comments, image embeds, math, and D2, Mermaid and Typst diagrams.
- **Professional profile.** `/resume`, `/portfolio`, `/portfolio/product-engineer` and `/portfolio/infra-engineer` render only facts that passed an explicit human fact-approval receipt. The PDF résumé is released through a transaction with a human review gate tied to the exact SHA-256 of the file.

Publishing is automatic and daily. A Jenkins job builds the `develop` branch every night, stamps `published` dates into new vault notes, rebuilds the site and syncs it to a local web root. A launchd service on the author's Mac serves that web root, and a Cloudflare Tunnel exposes it. All AWS hosting was decommissioned on 2026-08-17.

## Audiences and Value

| Audience | What they get | Primary surfaces |
|---|---|---|
| Readers of Korean technical notes | Readable long-form notes with navigation (hubs, tags, graph, search, related posts, backlinks), diagrams, math and code | `/`, `/posts/<slug>`, `/hubs/<slug>`, `/tags`, `/graph`, `/rss.xml` |
| Recruiters and hiring managers | A verified résumé and role-targeted case studies that read the same on screen, in print and as PDF | `/resume`, `/portfolio`, `/portfolio/<role>`, `/resume.pdf` |
| The author and maintainer | Write in Obsidian and have it published by the next morning. Truthfulness and accessibility of the profile are guaranteed by tooling rather than by memory | Vault, `just` recipes, Jenkins job, profile CLI |

## Key Capabilities

| Capability | Where it lives | Notes |
|---|---|---|
| Vault scanning with a publication boundary | preprocessor/src/scanner.rs, catalog.rs | Dotfiles and `Drafts` are skipped. `visibility` is absent, `post` or `homepage`. Exactly one homepage is allowed |
| Obsidian syntax to HTML | preprocessor/src/transform.rs, hub_dates.rs, site/src/lib/render.ts | Two stages: the Rust preprocessor emits raw HTML fragments, and the Astro unified pipeline renders markdown, code, math and figures |
| Diagrams with light and dark variants | preprocessor/src/mermaid.rs, d2.rs, typst_render.rs | Rendered at build time by external CLIs. Themed SVG pairs crossfade when the theme changes |
| Link graph, backlinks, related posts | preprocessor/src/linker.rs, related.rs; site/src/islands/GraphView.tsx, LocalGraph.tsx | Global graph page plus a 2-hop local graph per post |
| Korean full-text search | preprocessor/src/search.rs; site/src/islands/Search.tsx | Lindera KoDic tokenization at build time; client-side inverted index |
| Hubs and navigation tree | preprocessor/src/nav_tree.rs; site/src/islands/NavTree.tsx | Hubs act as curated tables of contents. Hub child dates are injected automatically |
| Homepage composition | site/src/pages/index.astro, site/src/lib/homepage.ts | Vault homepage note plus a profile slot plus "오늘 발행된 글" (today's posts) |
| Automatic light and dark theme | site/src/layouts/BaseLayout.astro, site/src/islands/ThemeToggle.tsx, site/src/lib/solar.ts | Follows sunrise and sunset at the reader's location, with a temporary manual override |
| Approved profile, résumé and portfolio | site/src/lib/profile/, site/src/components/profile/ | 120 approved facts mapped to evidence E01–E15 (receipt `profile-fact-approval-2026-09-27-r2`, inventory `profile-facts-r8`). Role editions select facts by ID. The résumé has six fixed sections, the last being `어학 자격` (certifications) |
| PDF résumé release | site/scripts/profile/ (cli, coordinator, renderer, inspector, release store) | Two-phase prepare and promote with a human review record |
| Daily auto-publish | Jenkinsfile, Justfile | Nightly build of `develop`. Deploy gated by `RUN_DEPLOY` |

## Business Rules Embedded in Code

- **Publication boundary.** Only `Areas/Notes` is published. Notes in `Drafts` and dotfiles are never scanned. An unknown `visibility` value fails the build (`PUB001`). A missing or duplicate homepage fails the build (`PUB002`, `PUB003`). No note may transclude the homepage (`PUB004`–`PUB006`). See api-documentation.md for the diagnostic contract.
- **Homepage integrity.** The homepage artifact must exist (`HP001`/`HP002`) and must contain exactly one standalone `<!-- profile:slot -->` line (`HP003` none, `HP004` duplicates).
- **Daily publication dates.** The deploy preprocess runs with `--stamp-published`, which writes a `published` date into vault notes that lack one. This is the only place the system writes to the vault.
- **Truthful profile.** Profile facts are code-defined (site/src/lib/profile/profile-data.ts) and accepted only when their digests match the approval receipt (`profile-fact-approval-2026-09-27-r2` in site/verification/profile/fact-approval.json). Receipt metadata must never leak into public output (`assertNoProfileApprovalLeak`).
- **Every fact names its evidence.** Each fact ID belongs to exactly one evidence source (E01–E15) in a hand-written allowlist (production-profile.ts `createEvidenceMembership`). Adding or removing a fact without updating the allowlist fails the build with `PROFILE_APPROVAL_EVIDENCE_INVALID`. The inventory behind a receipt is saved as JSON under docs/resume/product-engineer/, and its digest can be reproduced outside the build.
- **Dates are coarse by design.** Every profile period is a start and an end at one shared precision: a year (`2019`), a year and month (`2023-07`), or an open end (`현재`). Day precision does not exist in the model (types.ts:86-107). Certification periods today repeat the issue month as both start and end (`2025-09 – 2025-09`).
- **PDF currency.** The résumé page shows the PDF download link only when the released PDF bytes, source identity and manifest match the current approved profile (site/src/lib/profile/current-resume-document.ts). The tracked release dates from 2026-08-27 and the source changed on 2026-09-28, so the link is currently withheld. This is by design and recorded in docs/resume/product-engineer/publication-record.md; it was inferred, not observed in a build.
- **Profile isolation.** Profile routes stay out of search and the navigation tree, load no third-party resources, and ship no new client JavaScript (asserted in tests and the asset budget).
- **Accessibility as a release gate.** Profile pages must pass axe WCAG 2.2 AA checks across a browser and viewport matrix plus a human 16-state review bound to a source digest. See code-quality-assessment.md.

## Operating Model

- One maintainer, who is the author, the approver of profile facts and the PDF reviewer.
- Production is a personal macOS machine. The launchd services are `dev.rvnnt.blog` (Node static server on port 8080) and `dev.rvnnt.tunnel` (Cloudflare Tunnel). Jenkins runs on the same machine on port 8081. These services and their configuration live outside the repository and are described in CLAUDE.md.
- Workflow conventions in CLAUDE.md: git flow, with one feature branch per phase off `develop` and `--no-ff` merges back. The AI-DLC org default instead specifies trunk-based development with squash merges to `main`. That conflict is unresolved (see code-quality-assessment.md).

## Relevance to the Active Intent

Active intent `resume-certifications` (2026-10-21, scope `refactor`): "Update the résumé certifications. Keep OPIc IH with issue date 2025-09-06 and expiry 2027-09-06. Remove the expired 新HSK 6급. Add AWS Certified Solutions Architect - Associate, issued 2026-07-17, expiring 2029-07-17, in a new separate 자격증 section, keeping 어학 자격 for language certificates. Show exact day-precision dates (issue to expiry), which the profile date types do not support yet. Facts need a new fact inventory revision and approval receipt, and a new PDF candidate."

What this touches, in business terms:
- **Content.** The résumé loses one certification (新HSK 6급), changes one (the OPIc dates become an issue-to-expiry range) and gains a professional certification in a new section. `어학 자격` keeps the language certificate.
- **The date model.** The profile can state years and months, not days. Showing exact dates means teaching every layer a third precision: validation, approval, the PDF manifest and the PDF reader (architecture.md KD-9).
- **Truthfulness gates.** Every changed fact needs evidence. The existing evidence for certifications (E01, a 2025 portfolio PDF) supported month precision only. The change also needs a new inventory revision, a new approval receipt pinned in two places, and a new materialized digest in the tests.
- **PDF and accessibility.** The public PDF is already withheld. A new candidate needs a human review before promotion. The résumé components and stylesheets are accessibility review subjects, so the 16-state review recorded on 2026-10-21 has to be redone after the change.

The previous intent (`hig-redesign`, 2026-10-19) concerned repository cleanup and the HIG visual redesign. Its relevance notes are superseded. The redesign has since merged into `develop`.

## Glossary

| Term | Meaning in this codebase |
|---|---|
| Vault | The Obsidian vault in iCloud. Only `Areas/Notes` is published |
| Hub | A note with `is_hub: true` that acts as a curated index of child notes |
| Homepage artifact | The single vault note with `visibility: homepage`, rendered at `/` |
| Profile slot | The `<!-- profile:slot -->` line in the homepage note, replaced by the profile summary |
| Fact | An atomic, approved profile statement with a stable `factId` |
| Receipt | A JSON record binding approved facts or a released PDF to digests and a human decision |
| Review subject | The set of source files whose digest a human accessibility review is bound to |
| U1, U2, U3 | Units of the previous AI-DLC intent: U1 profile domain and native experience, U2 homepage publication boundary, U3 cross-unit quality gates. The identifiers survive in code comments and test names |
| Role edition | A curated portfolio page per job role (`/portfolio/product-engineer`, `/portfolio/infra-engineer`) |
| Period | A profile fact holding a start and an end. Each point is a `year` or `year-month` value, and the end may be `present` (shown as `현재`) |
| Inventory revision | A numbered snapshot of every reviewed fact (`profile-facts-r8` today), saved as the exact JSON whose canonical digest the receipt pins |
| Evidence source | A numbered justification (E01–E15) that each fact is assigned to: a user-provided record or a checked public URL |
