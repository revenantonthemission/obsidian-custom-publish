# API Documentation: obsidian-blog

> **Freshness (2026-10-21).** The profile sections below were refreshed by the focused `resume-certifications` scan at commit `96a6066`. Everything outside the profile subsystem comes from the 2026-10-19 full scan at `265b38a`, before the HIG redesign merged. It is stale in places: the theme system, tokens, fonts, chrome and the blog e2e coverage have changed since (see CLAUDE.md). The scope block in reverse-engineering-timestamp.md records which paths were verified.

This artifact owns these inventories: routes, static data endpoints, the preprocessor CLI and output contract, build-time module APIs, the command surface, environment variables, error codes, client storage keys and external calls. The HTML class vocabulary shared by the preprocessor, render.ts and CSS is in code-structure.md (Emitted HTML Contract).

## Public HTTP Surface

The site is fully static. Every route is a prerendered file under `site/dist/`, served by site/scripts/local-server.mjs. No route accepts input, sets cookies or requires authentication.

### Page Routes

| Route | Source | Layout | Build-time data | Client islands and scripts | Head resource policy |
|---|---|---|---|---|---|
| `/` | site/src/pages/index.astro | BaseLayout | `getHomepage`, `renderMarkdown`, homepage chunks, homepage projection of the approved profile, `getAllPostMeta` filtered to the build date | Header ThemeToggle x2 (`client:load`), Search (`client:idle`) | legacy: Pretendard and KaTeX CDN CSS |
| `/404` (served for unknown paths as 404.html) | site/src/pages/404.astro | BaseLayout | 5 most recent posts | shared chrome plus a search button | legacy |
| `/graph` | site/src/pages/graph.astro | BaseLayout | `getGraph()` (content/graph.json) | GraphView (`client:load`) | legacy |
| `/posts/<slug>` | site/src/pages/posts/[slug].astro | PostLayout | `getPostContent`, `renderMarkdown`, `getPostMeta`, `getAllPostMeta`, `getLocalGraph`, `sanitizeTag`, `formatDateKo` | NavTree, LocalGraph and MobileSidebar (`client:visible`); hoisted copy-button, link-preview, toc-highlight, diagram-wrap and heading-fold scripts | legacy |
| `/hubs/<slug>` | site/src/pages/hubs/[slug].astro | HubLayout | `getHubs`, child post metadata | shared chrome | legacy |
| `/tags` | site/src/pages/tags/index.astro | BaseLayout | `getTagIndex` | shared chrome | legacy |
| `/tags/<tag>` | site/src/pages/tags/[tag].astro | BaseLayout | `getTagIndex`, `sanitizeTag` (`/` in tags becomes `-`) | shared chrome | legacy |
| `/resume` | site/src/pages/resume.astro | BaseLayout with ProfileShell | `getProductionProfileAssembly`, `buildResumePresentation`, `buildApprovedResumeMetadata`, `getCurrentResumeDocumentLink` | shared chrome only; profile code ships no client JavaScript | profile: no head resources, local font through Vite |
| `/portfolio` | site/src/pages/portfolio.astro | BaseLayout with ProfileShell | default "Data Engineer / AI" edition through `buildPortfolioPresentation`, `buildApprovedPortfolioMetadata` | shared chrome only | profile |
| `/portfolio/product-engineer`, `/portfolio/infra-engineer` | site/src/pages/portfolio/[role].astro | BaseLayout with ProfileShell | `getStaticPaths` from `PORTFOLIO_ROLES` (excluding `/portfolio`) | shared chrome only | profile. `infra-engineer` exists only in uncommitted work |
| `/rss.xml` | site/src/pages/rss.xml.ts | none | `@astrojs/rss` over post metadata | none | n/a |
| `/sitemap-index.xml` and its parts | `@astrojs/sitemap` integration | none | all routes | none | n/a |

Shared document head (site/src/layouts/BaseLayout.astro):
- `<html lang="ko" data-theme="">`, title and description, Open Graph and Twitter tags, canonical URL on `https://rvnnt.dev`.
- RSS alternate `/rss.xml`, icon `/favicon.svg`.
- The route's managed head resources (BaseLayout.astro:98-104), JSON-LD scripts when supplied (BaseLayout.astro:105-111), then the theme bootstrap.

The route resource policy (site/src/lib/layout/profile-resources.ts) classifies `/resume`, every `PORTFOLIO_ROLES` pathname and their trailing-slash variants as profile routes. Every other route is legacy. The policy is validated exactly; a mixed or injected policy throws.

Profile routes add a metadata contract (site/src/lib/profile/metadata.ts, asserted in site/tests/unit/profile-presentation.test.ts):
- exactly one each of title, description, `og:title`, `og:description`, `og:type`, `og:url`, `twitter:card`, `twitter:title`, `twitter:description` and canonical
- the description equals the visible `.resume-summary` or `.portfolio-summary` paragraph
- JSON-LD is `ProfilePage` + `Person` on `/resume`, and `CollectionPage` + `ItemList` on the portfolio routes, with item URLs `#project-<id>`
- titles are `<name> — Résumé` or `<name> — <role title>`

### Static Files and Data Endpoints

| Path | Producer | Consumer | Shape |
|---|---|---|---|
| `/search-index.json` | preprocessor search.rs, copied by `just preprocess` and Jenkins | Search island on first open (site/src/islands/Search.tsx:52) | `{ documents: [{ slug, title, snippet }], inverted_index: { token: [{ doc_idx, count }] } }`, compact JSON. Tokens are Lindera KoDic surfaces of 2+ characters; title hits weigh 2 |
| `/nav-tree.json` | nav_tree.rs | NavTree (NavTree.tsx:13) and MobileSidebar (MobileSidebar.tsx:20) | `{ roots: NavTreeNode[], orphans: NavTreeNode[] }` with `{ slug, title, is_hub, children }` |
| `/previews.json` | preview.rs | link-preview.ts:28 (client); `getPreviewSummary` reads `public/previews.json` at build time relative to the working directory | map of slug to `{ title, tags, summary }`; summary is the first sentence or 150 characters |
| `/graph.json` | linker.rs | not fetched by client code; the graph page reads `content/graph.json` at build time | `{ nodes: [{ slug, title, tags, is_hub, backlink_count }], edges: [{ source, target }] }` |
| `/assets/<file>` | preprocessor output (attachments and diagram SVGs) | post HTML | images and diagram files named `<slug>-<lang>-<n>-light.svg` and `-dark.svg` |
| `/resume.pdf` | release-store.mjs promotion | résumé download link, shown only while the release matches the current profile | A4 tagged PDF. The tracked copy was released 2026-08-27 |
| `/robots.txt` | static | crawlers | `Allow: /`, sitemap `https://rvnnt.dev/sitemap-index.xml` |
| `/favicon.svg`, `/favicon.ico` | static | browsers | Lucide "split" glyph using `currentColor` |
| `/_astro/*` | Astro and Vite | pages | hashed CSS, JS and font assets |

### Local Static Server Contract

site/scripts/local-server.mjs is dependency-free, 150 lines, and runs under launchd `dev.rvnnt.blog` (outside the repository).

- Arguments: web root path as the first argument (`just serve` passes `~/Sites/obsidian-blog`). Environment: `PORT` (default 8080) and `HOST` (default `127.0.0.1`; CLAUDE.md says launchd sets `0.0.0.0`).
- Resolution: clean URLs map to `.html` or `index.html` files. Unknown paths return `404.html` with status 404, or a plain-text 404 if that file is missing.
- Headers: `X-Content-Type-Options: nosniff` on every response. `Cache-Control` is immutable for files under `_astro/` and `no-cache` otherwise (line 81). Responses are gzip-compressed above about 1 KB when the client accepts gzip.
- Absent: Content-Security-Policy, Strict-Transport-Security, Referrer-Policy, X-Frame-Options and Permissions-Policy (see code-quality-assessment.md).

## Preprocessor CLI

```text
obsidian-press [--stamp-published] <vault> <output>
```

| Element | Contract |
|---|---|
| `<vault>` | Directory to scan recursively; dotfiles and `Drafts` are skipped. Production uses the iCloud `Areas/Notes` path; development uses `fixtures/vault` |
| `<output>` | Content directory to (re)write, normally `./content`. Managed namespaces are cleaned before writing |
| `--stamp-published` | Writes a `published` date into vault notes that lack one. Used only by `just deploy` and the Jenkins Preprocess stage |
| Frontmatter read | `tags`, `created`, `published`, `is_hub`, `hub_parent`, `description`, `visibility` (`post` by default, or exactly `homepage`) |
| Diagnostics | stderr lines `CODE path: detail`, sorted by path then code, all reported before exit |
| Exit status | non-zero on any diagnostic, and non-zero if any themed diagram failed to render |
| External programs | `mmdc` (found with `which`, then fixed Homebrew and npm candidates including a Node 25.9.0-specific path, mermaid.rs:10-35) needing Chrome through `PUPPETEER_EXECUTABLE_PATH`; `d2`; `typst`; `git` |

| Code | Stage | Meaning |
|---|---|---|
| `PUB001` | catalog build | unknown or non-scalar `visibility` value |
| `PUB002` | catalog build | no homepage source (empty path, sorts first) |
| `PUB003` | catalog build | more than one homepage source |
| `PUB004` | reference validation | full transclusion of the homepage |
| `PUB005` | reference validation | heading transclusion of the homepage |
| `PUB006` | reference validation | block transclusion of the homepage |
| `PUB007` | output | output write failure |

### Output contract (content/)

| Path | Content |
|---|---|
| `posts/<slug>.md` | Transformed markdown with embedded HTML fragments (see code-structure.md) |
| `meta/<slug>.json` | `slug`, `title`, `tags`, `created`, `published`, `updated`, `backlinks`, `forward_links` (sorted), `is_hub`, `hub_parent`, `description`, `reading_time_min` (word count / 200, minimum 1), `word_count`, `related_posts`. site/src/lib/types.ts mirrors all except `created` |
| `homepage/index.md`, `homepage/meta.json` | The homepage body and `{ title }`. The homepage is excluded from posts, search, graph and navigation |
| `assets/` | Referenced attachments (only images that posts embed) and rendered diagrams |
| `graph.json`, `search-index.json`, `previews.json`, `nav-tree.json` | See Static Files and Data Endpoints |
| `manifest.json` | Output manifest written by output.rs; not consumed by the site |

Slugs come from the file name: lowercased, spaces turned into hyphens, and only alphanumerics, Hangul and hyphens kept. Titles are the file name.

## Build-Time Module APIs (site/src/lib)

| Module | Exports | Notes |
|---|---|---|
| data.ts | `getAllPostMeta`, `getPostMeta`, `getHomepage`, `getPostContent`, `getGraph`, `getLocalGraph` (2-hop), `getHubs`, `sanitizeTag`, `getTagIndex`, `formatDateKo` (`YYYY년 M월 D일`), `getPreviewSummary`, type `HomepageData` | `CONTENT_DIR = path.resolve("../content")`, so the build must run from site/ |
| render.ts | `renderMarkdown(md): Promise<string>` | The only markdown-to-HTML path (see architecture.md KD-2) |
| homepage.ts | `PROFILE_SLOT_TOKEN`, `countSlotTokens`, `assertExactlyOneSlot`, `splitRenderedAtSlot`, `splitAtRecentHeading`, `filterTodayPosts`, `resolveBuildDate`, `buildHomepageChunks`, chunk types | Recent-posts heading regex `이번주에 작성된 포스트` (homepage.ts:55) |
| navigation.ts | `getPrimaryNavigation`, `getProfileLocalNavigation`, `getPrimaryNavigationState`, `getProfileLocalNavigationState`, `getNavigationState` | Approved models: primary `/tags` Tags, `/graph` Graph, `/resume` Résumé, `/portfolio` Portfolio; profile-local `/` 홈, `/resume` Résumé, `/portfolio` Portfolio. Any other model is rejected |
| solar.ts | `getCachedGeo`, `requestGeoAndCache`, `fetchAndCacheSolar`, `getCachedSolar`, `getSolarTheme`, `msUntilNextBoundary`, `isManualOverrideActive`, `setManualOverride`, `clearManualOverride` | Client-side; see Client Storage Contract |
| layout/profile-resources.ts | `LEGACY_BASE_LAYOUT_RESOURCES`, `LEGACY_ROUTE_RESOURCE_POLICY`, `PROFILE_ROUTE_RESOURCE_POLICY`, `resolveRouteResourcePolicy`, `validateRouteResourcePolicy` | Route-to-head-resource policy |
| layout/json-ld.ts | `serializeJsonLdDocuments`, `extractJsonLdDocuments`, `verifyJsonLdRoundTrip` | Escapes `<`, `>`, `&`, U+2028 and U+2029 and verifies the round trip |
| profile/index.ts | `assembleFactApprovedProfile`, validation exports, `buildApprovedResumeManifest`, domain types | Pages also import `getProductionProfileAssembly` (production-profile.ts), `buildApprovedResumeMetadata` and `buildApprovedPortfolioMetadata` (metadata.ts), `getCurrentResumeDocumentLink`, `PORTFOLIO_ROLES` |
| components/profile/presentation.ts | `buildResumePresentation(profile, documentLink?)`, `buildPortfolioPresentation(profile, roleId = 'data-engineer-ai')` | Renderer-neutral, frozen view models: section headings, dimensions, period text `<start value> – <end value>` with U+2013 and `현재` for an open end (presentation.ts:603-617). It does not validate, sort or repair facts |

### Profile Data Contracts (2026-10-21)

These internal contracts bind profile source, approval, rendering and PDF parity. Changing any of them changes digests, receipts or tests.

**Period value** (site/src/lib/profile/types.ts:86-107)

```ts
type DatePoint = { tag: 'year'; value: string } | { tag: 'year-month'; value: string };
type PeriodEnd = DatePoint | { tag: 'present' };
interface Period { start: DatePoint; end: PeriodEnd }
// carried as PublicFact<Period> = { factId, value }
```

Optional on achievements, projects, education and certifications. Required on experiences.

**Certification entity** (types.ts:231-239): `{ id, order, title: PublicFact<SingleLineText>, issuer?: PublicFact<SingleLineText>, period?: PublicFact<Period>, details: ContentBlock[], evidence: EvidenceLink[] }`. It has no category field and no separate issue or expiry date. The production data has two certifications and no issuers (`opic-ih` order 10, `hsk-6` order 20, profile-data.ts:565-588).

**Period issue codes** (issues.ts:15-17, 56-58)

| Code | Raised when |
|---|---|
| `period.precision` | a point tag is not `year` or `year-month`, or start and end use different precisions |
| `period.value` | a value does not match its tag's pattern, or the start is `present` |
| `period.range` | the end comes before the start |

**Résumé manifest period token** (resume-manifest.ts:783-812): `start:year:2019|end:year:2026`, `start:year-month:2023-07|end:year-month:2023-08` or `start:year-month:2023-07|end:present`. The PDF evidence reader produces the same token from the printed text (resume-evidence.ts `parsePeriodDisplayText`). The resume-pdf unit test rebuilds the printed text from the token by taking the last `:` segment of each half.

**Résumé section order** (resume-manifest.ts:36-43): `intro-contact` 1, `skills` 2, `highlights` 3, `project-summaries` 4, `education` 5, `certifications` 6. Section headings and DOM markers are in code-structure.md (Résumé Section Structure).

**Fact approval receipt** (site/verification/profile/fact-approval.json, mirrored by `EXPECTED_RECEIPT` in production-profile.ts:40-52; the build requires the exact key set and equal values):

| Field | Current value |
|---|---|
| `schemaVersion` | 1 |
| `receiptId` | `profile-fact-approval-2026-09-27-r2` |
| `inventoryRevision` / `inventoryDigest` | `profile-facts-r8` / `5bcfa474…200c1` (canonical digest of docs/resume/product-engineer/inventory-r8.json; reproduced 2026-10-21 by hashing the sorted-key compact JSON with SHA-256) |
| `productionDiffRevision` / `productionDiffDigest` | `profile-production-diff-r8` / `e6aa8ea7…5f3e4b` |
| `approvedRecordsDigest` | `2161243c…c5313` (computed at build time over the review records) |
| `materializedProfileDigest` | `2511983e…6b65c` (computed at build time over the facts and structural decisions; also pinned in site/tests/unit/production-profile.test.ts:17) |
| `decision`, `decisionAuditId`, `decisionRecordedAt` | `Approved`, `PROFILE-RESUME-TRUTHFUL-20260927T140225005Z`, `2026-09-27T14:02:25.005Z` |

**Inventory JSON** (docs/resume/product-engineer/inventory-r<N>.json): top-level keys are `domain` (`obsidian-press:profile-fact-inventory`), `schemaVersion`, `revision`, `evidenceSources`, `publicationAuthorization`, `publicSourceChecks`, `records` (120 in r8) and `structuralDecisions`. Each record holds `factId`, `canonicalPath` (for example `profile.certifications[id=opic-ih].period`), `normalizedValue`, `evidence`, `targetSurfaces` (`["resume","pdf"]` for certifications), `requirement` (`optional` for certifications), `status` and `decisionRecord`. `structuralDecisions.certifications` lists `{ id, order, issuer: "absent"|"present", details, evidence }` per certification.

**Production errors** (production-profile.ts `ProfileProductionErrorCode`): `PROFILE_APPROVAL_RECEIPT_INVALID`, `PROFILE_APPROVAL_SOURCE_INVALID`, `PROFILE_APPROVAL_EVIDENCE_INVALID`, `PROFILE_APPROVAL_DIGEST_MISMATCH`, `PROFILE_APPROVAL_REVIEW_INVALID`, `PROFILE_APPROVAL_OUTPUT_LEAK`.

Homepage gateway errors:

| Code | Raised by | Meaning |
|---|---|---|
| `HP001` | data.ts:55,58 | `content/homepage/meta.json` or `index.md` missing |
| `HP002` | data.ts:65,69,74 | metadata not valid JSON, empty title, or empty body |
| `HP003` | homepage.ts:24,44 | profile slot token absent in source or lost in rendered output |
| `HP004` | homepage.ts:27,48 | more than one slot token |

## Command Surface

| Command | Defined in | Effect |
|---|---|---|
| `just preprocess` | Justfile:12-19 | preprocess `VAULT_PATH` (default `./fixtures/vault`) into `./content`, copy the four JSON artifacts and assets into site/public |
| `just build` / `just dev` / `just site-build` | Justfile:10, 21, 24 | preprocess plus `astro build` / `astro dev` / build only |
| `just deploy` | Justfile:27-29, 35-42 | preprocess the real vault with `--stamp-published`, build, `rsync -a --delete` into `WEB_ROOT` |
| `just serve` | Justfile:32-33 | run local-server.mjs in the foreground |
| `just test` | Justfile:44-45 | `cargo test` in preprocessor/ |
| `just crossunit` | Justfile:50-51 | link sweep plus Playwright with JavaScript disabled against `astro preview` on port 4326 |
| `just d2-watch <file>`, `just typst-render <file> <out>` | Justfile:53-57 | diagram authoring helpers |
| `npm run dev` / `build` / `preview` / `astro` | site/package.json | Astro commands |
| `npm run test:unit` | cli.mjs | Vitest over tests/unit and tests/obligations (vitest.config.ts) |
| `npm run test:pbt` | cli.mjs, pbt-runner.mjs | Vitest property suites with `PBT_RUNS`, `PBT_SEED`, optional `PBT_PATH`, `PBT_FILE`, `PBT_FOCUS` |
| `npm run test:e2e` | cli.mjs, verification-provider.mjs | full evidence-bound profile verification (see architecture.md) |
| `npm run resume:pdf -- --prepare` | cli.mjs, resume-coordinator.mjs | build, render and inspect a private PDF candidate |
| `npm run resume:pdf -- --promote <candidateId> --review <path>` | cli.mjs, release-store.mjs | journaled promotion of a reviewed candidate |
| `npm run resume:pdf:verify` | cli.mjs | verify the current release receipt against the public PDF and profile |
| `npm run test:pbt:framework` | site/package.json | framework-selection property smoke test |

The profile CLI accepts exactly five stable commands (`test:unit`, `test:pbt`, `test:e2e`, `resume:pdf`, `resume:pdf:verify`) and refuses unknown commands or an ambiguous `resume:pdf`. Its unit tests describe a CI aggregate of the four read-only commands. The Jenkinsfile calls only `test:unit` and `test:pbt`.

### Environment Variables

| Variable | Read by | Purpose |
|---|---|---|
| `VAULT_PATH`, `WEB_ROOT` | Justfile, Jenkinsfile | vault and web root locations |
| `OBSIDIAN_VAULT_PATH`, `BLOG_WEB_ROOT`, `RUN_DEPLOY` (parameter) | Jenkinsfile | Jenkins overrides and deploy gate (defaults are hardcoded user paths) |
| `PUPPETEER_EXECUTABLE_PATH` | Justfile, Jenkinsfile, `mmdc` | Chrome or chrome-headless-shell for Mermaid rendering |
| `PORT`, `HOST` | local-server.mjs | listen address |
| `HOMEPAGE_TODAY_OVERRIDE` | homepage.ts:96 | fixed build date for "오늘 발행된 글"; malformed values fall back to the real date |
| `PROFILE_BASE_URL` | playwright.config.ts | loopback base URL, required |
| `PROFILE_VERIFICATION_BUILD` | astro-profile-integration.mjs, clean-profile-build.mjs | enables page-graph and provenance capture for verification builds |
| `PROFILE_BUILD_ID`, `PROFILE_STARTUP_ATTEMPT` | browser-launch-preflight.mjs | build identity and attempt number (1 or 2) |
| `PROFILE_OWNED_BOOTSTRAP_TOKEN` and reaper variables | owned-node-bootstrap.mjs | process ownership |
| `PBT_RUNS`, `PBT_SEED`, `PBT_PATH`, `PBT_FILE`, `PBT_FOCUS` | pbt-runner.mjs, tests/pbt/u1/setup.ts | property-test configuration and replay |

## Verification and Release Error Codes

| Family | Codes |
|---|---|
| Asset budget (asset-budget.mjs) | `PROFILE_CSS_BUDGET_EXCEEDED`, `PROFILE_CSS_SOURCE_UNAPPROVED`, `PROFILE_CSS_INLINE_UNCLASSIFIED`, `PROFILE_CSS_INLINE_TRANSFORM_UNAPPROVED`, `PROFILE_INLINE_SCRIPT_UNAPPROVED`, `PROFILE_CLIENT_JAVASCRIPT_ADDED`, `PROFILE_ROUTE_EXTERNAL_RESOURCE` |
| Request ledger (request-ledger.mjs) | `NON_LOOPBACK_REQUEST_ATTEMPTED`, `NON_LOOPBACK_RESPONSE_OBSERVED`, `EMITTED_ASSET_IDENTITY_MISSING`, `PROFILE_ROUTE_REQUEST_EVIDENCE_MISSING`, `REQUEST_INTERCEPTION_BYPASSED` |
| Evidence aggregation (verification-provider.mjs) | `BROWSER_EVIDENCE_INCOMPLETE`, `LINK_METADATA_EVIDENCE_INCOMPLETE`, `ASSET_BUDGET_EVIDENCE_INCOMPLETE`, `REQUEST_LEDGER_EVIDENCE_INCOMPLETE`, `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`, and `RELEASE_*` codes from `verifyCurrentRelease` |
| Preview and startup (preview-supervisor.mjs, browser-launch-preflight.mjs, owned-node-bootstrap.mjs) | `PREVIEW_CHILD_EXITED`, `PREVIEW_CHILD_EXITED_DURING_LAUNCH`, `PREVIEW_CHILD_START_TIMEOUT`, `PREVIEW_CHILD_LAUNCH_FAILED`, `PREVIEW_CHILD_IDENTITY_INVALID`, `PREVIEW_CHILD_SPAWN_FAILED`, `PREVIEW_CHILD_IPC_DISCONNECTED`, `PREVIEW_READINESS_TIMEOUT`, `PREVIEW_STATIC_STATUS_INVALID`, `PREVIEW_STATIC_MIME_INVALID`, `PREVIEW_STATIC_BODY_EMPTY`, `PREVIEW_START_FAILED`, `PREVIEW_CLEANUP_FAILED`, `BROWSER_ENGINE_LAUNCH_FAILED`, `BROWSER_PREFLIGHT_CLEANUP_FAILED`, `OWNED_BOOTSTRAP_REAPER_FAILED` |
| PDF and release (pdf-renderer.mjs, pdf-viewer.mjs, resume-coordinator.mjs, release-store.mjs) | `PDF_RENDER_SHELL_MISSING`, `PDF_RENDER_SURFACE_FACT_AMBIGUOUS` (one approved fact rendered by more than one element), `PDF_RENDER_SURFACE_FACT_UNKNOWN` (a rendered fact the manifest does not approve), `PDF_VIEWER_CANDIDATE_MISSING`, `RESUME_PREPARE_RELEASE_ACTIVE`; release journal states `PREPARED`, `PROMOTION_VALIDATED`, `RECOVERY_SNAPSHOTTED`, `RECEIPT_PROMOTED`, `PDF_COMMITTED`, `FINAL_VERIFIED`, `ROLLBACK_REQUIRED`, `ROLLBACK_PDF_RESTORED`, `ROLLBACK_RECEIPT_RESTORED`, `ROLLED_BACK` |
| Font (font-materializer.mjs) | `FONT_*` family (lock mismatch, hash mismatch, missing or non-regular source, traversal, CSS URL order) |

Only the stages `startup.preview.launch`, `startup.preview.readiness` and `startup.browser.launch` are retry-eligible, with at most two attempts and only after cleanup is proven (startup-retry.mjs:1-8).

## Client Storage Contract

Theme state shared by the inline bootstrap (BaseLayout.astro:112-169), ThemeToggle.tsx and solar.ts:

| Key | Value | Written by | Read by |
|---|---|---|---|
| `theme` | `"light"` or `"dark"` | ThemeToggle on every state change | bootstrap fallback, ThemeToggle initial state |
| `theme-manual` | ISO timestamp of the last manual toggle | `setManualOverride` | bootstrap and `isManualOverrideActive` (expires at the next sunrise or sunset boundary, or after 24 hours) |
| `solar` | `{ date, sunrise, sunset }` for one day | `fetchAndCacheSolar` | bootstrap and ThemeToggle |
| `geo` | cached coordinates (30-day lifetime) | `requestGeoAndCache` | ThemeToggle |
| `geo-denied` | remembered permission denial | `requestGeoAndCache` | ThemeToggle |

## External Calls

| Call | From | Data sent | Notes |
|---|---|---|---|
| `GET https://api.sunrise-sunset.org/json?lat=<lat>&lng=<lng>&formatted=0&date=<YYYY-MM-DD>` | solar.ts:90-110 (browser) | the reader's coordinates | at most once per day per browser; falls back to 06:30 and 18:30 |
| Browser Geolocation API | solar.ts (`requestGeoAndCache`) | none (permission prompt) | requested when the island mounts, without a user gesture |
| `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css` | profile-resources.ts:49-69 (legacy routes) | standard request headers | `preconnect`, no SRI |
| `https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css` | same | same | `crossorigin="anonymous"`, no SRI |
| Clipboard API | copy-button.ts | code block text | errors are swallowed |
| Outbound links | profile contact actions, case-study evidence | none | `mailto:`, GitHub, project URLs |
