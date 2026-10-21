# Code Quality Assessment: obsidian-blog

> **Freshness (2026-10-21).** The profile sections below were refreshed by the focused `resume-certifications` scan at commit `96a6066`. Everything outside the profile subsystem comes from the 2026-10-19 full scan at `265b38a`, before the HIG redesign merged. It is stale in places: the theme system, tokens, fonts, chrome and the blog e2e coverage have changed since (see CLAUDE.md). The scope block in reverse-engineering-timestamp.md records which paths were verified.

This artifact owns these inventories: tests and coverage, verification gates, accessibility gaps, security posture, documentation drift, the technical debt register, and the branch and worktree inventory. No tests, builds or servers were executed during this scan. Results quoted below come from the repository's own records and are attributed to them, and statements about current gate outcomes are inferred from code.

## Summary Ratings

Ratings use the three-point scale (good, fair, poor) from the analysis guide.

| Dimension | Preprocessor (Rust) | Blog presentation (site/src outside profile) | Profile domain and presentation | Profile tooling (site/scripts/profile) |
|---|---|---|---|---|
| Naming clarity | good | good | good | good |
| Function and file size | fair (transform.rs 826 lines) | good | fair (2026-10-21: validation.ts 1,881; resume-evidence.ts 1,754; fact-approval.ts 1,541) | poor (verification-provider.mjs 3,847; asset-budget.mjs 1,730; font-materializer.mjs 1,494) |
| Error handling | good (diagnostics, run fails closed) | fair (islands and scripts swallow fetch and clipboard errors) | good (typed results, fail closed) | good (coded errors with stage and rule) |
| Test presence | good (110 tests plus property suites) | poor (helpers and rendering only; no browser tests for blog routes) | good (unit, property, e2e, human gates) | good (unit tests for supervision, retry, release) |
| Duplication | good (shared regexes in syntax.rs) | fair (theme logic in two languages, duplicated tag styles, two ThemeToggle instances) | good | fair |
| Dead code | good (no TODO, FIXME or HACK markers) | fair (unused dark callout tokens, unloaded JetBrains Mono, unfetched public `graph.json`) | good | good |

Overall: the profile subsystem and the preprocessor are rigorously engineered. The blog presentation layer, the target of the HIG redesign, has the weakest automated safety net.

## Test Inventory

### Rust (preprocessor/)

| Suite | Count | Notes |
|---|---|---|
| Inline unit tests in src/ | 33 `#[test]` functions | 25 of them in hub_dates.rs |
| Integration tests in tests/ | 77 `#[test]` functions across 16 files | block refs, D2, heading refs, image embeds, linker, nav tree, output, preview, publication catalog, transform and output, scanner, search, transform, Typst |
| Property tests | proptest suites in publication_catalog.rs, publication_transform.rs, publication_output.rs, pbt_framework_smoke.rs | output determinism over a toy vault (32 cases); a tracked `publication_output.proptest-regressions` file |
| Fixtures | fixtures/vault/ (13 notes plus test-image.png) | tests use the relative path `../fixtures/vault`, so they must run from preprocessor/ |

`d2_test.rs` has no skip guard and needs the `d2` CLI. Typst tests skip when `typst` is missing. Mermaid rendering is tested through injected closures, not the real CLI.

### Site (site/tests/)

| Suite | Files | Count | Runner |
|---|---|---|---|
| Unit | 22 files in tests/unit | 300 tests passing on 2026-09-28, including the uncommitted role work (docs/portfolio/infra-engineer/README.md); 289 before it | `npm run test:unit` (Vitest, node environment, also includes tests/obligations) |
| Property | 6 files in tests/pbt/u1 and u2 plus framework-selection | 37 properties, 100 runs each by default, seedable and replayable | `npm run test:pbt` (pbt-runner.mjs) |
| E2E | 10 spec files in tests/e2e plus support/ | matrix-generated; the verification provider requires 48 browser keys over 6 required spec files | `npm run test:e2e` only; needs a loopback `PROFILE_BASE_URL` |
| Cross-unit | tests/e2e/crossunit.spec.ts plus scripts/crossunit/link-sweep.mjs | JavaScript-disabled checks and a link sweep over a built site | `just crossunit` |
| Obligation map | tests/obligations/u1-profile.json | 135 obligation IDs mapped to 22 canonical tests, including 3 human gates; 9 documented not-applicable property classes | enforced by tests/unit/obligation-map.test.ts |

Unit suites by area:
- **Profile domain**: profile-domain, profile-projections, production-profile, resume-selection, portfolio-roles, portfolio-role-metadata, profile-metadata-navigation, profile-presentation, current-resume-document.
- **Résumé documents**: resume-document, resume-pdf, resume-release.
- **Tooling**: profile-tooling, profile-tooling-hardening, owned-process-registry, owned-bootstrap-custody, startup-retry-hardening, verification-provider-schema, obligation-map.
- **Blog**: graph-view (helpers only), render-extended-syntax, homepage-composition.

site/tests/unit/profile-presentation.test.ts runs a full `astro build` into a temporary directory. It therefore depends on `content/` and the copied public JSON, and it pins blog chrome markup as well as profile markup (see Verification Gates That Constrain the Redesign).

## Visual and Accessibility Test Coverage

| Route | Markup and unit checks | Browser checks | axe (WCAG 2.2 AA tags) | Human review | Visual baselines |
|---|---|---|---|---|---|
| `/` | homepage-composition unit and property tests | homepage.spec.ts (chromium, firefox, webkit projects; 320x800 and 1440x900); crossunit.spec.ts without JavaScript | yes (chromium, reduced motion, animations neutralized) | no | none |
| `/resume` | profile-presentation, metadata, domain suites | profile-routes, profile-responsive (7 viewports, no overflow, clipping, ellipsis or line clamp), profile-accessibility (keyboard, skip link, focus indicator on 15 tab stops, reduced motion), profile-cross-browser (firefox and webkit, JavaScript on and off), profile-print (A4 and Letter), profile-resources (loopback only) | yes (16 cells) | yes, 16-state matrix (tracked record stale) | none |
| `/portfolio` | same | same, plus portfolio-data-platform.spec.ts | yes | yes (tracked record stale) | none |
| `/portfolio/product-engineer`, `/portfolio/infra-engineer` | profile-presentation, portfolio-roles, portfolio-role-metadata | portfolio-roles.spec.ts (uncommitted): 375 and 1280 px, light and dark, disclosures closed and open, keyboard, JavaScript off | yes (in that spec) | not in the review matrix | none |
| `/posts/<slug>`, `/hubs/<slug>`, `/tags`, `/tags/<tag>`, `/graph`, `/404` | render-extended-syntax; graph-view helpers | link sweep only | no | no | none |

- Screenshots are written as test artifacts in portfolio-data-platform.spec.ts and portfolio-roles.spec.ts. No test compares screenshots: there is no `toHaveScreenshot` or snapshot assertion anywhere.
- The breakpoints, both themes, reduced motion, print and JavaScript-off behavior are verified for profile routes only.
- The user's web testing rules ask for visual regression at 320, 768, 1024 and 1440 in both themes, plus automated accessibility checks. Neither exists for the blog routes the redesign will change most.

## Coverage Measurement

No coverage tooling is configured: no coverage provider in site/vitest.config.ts or site/vitest.pbt.config.ts, and no cargo-llvm-cov. The project's records state that coverage was not measured (docs/portfolio/infra-engineer/README.md). The org rule's 80% line-coverage floor for feature work therefore cannot be verified today.

## Linting, Formatting and Static Checks

- No ESLint, Prettier, Stylelint, rustfmt or clippy configuration files exist, and no lint step runs in CI.
- TypeScript runs in strict mode (`astro/tsconfigs/strict`). `astro check` reported 159 files with 0 errors and 6 hints on 2026-09-28 (project record), but no script or CI stage runs it.
- docs/project/codebase_audit.md (2026-04-14) recorded zero clippy lints and zero TypeScript errors at that time.
- Source contains zero TODO, FIXME or HACK markers and zero lint suppressions (`@ts-ignore`, `eslint-disable`, `#[allow]`).

## CI/CD

Jenkinsfile, job `obsidian-blog-develop`, cron `H 0 * * *` on `develop`:

| Stage | Runs |
|---|---|
| Install | `npm ci` and `cargo build --release` in parallel |
| Verify | `cargo test --release`; fixture preprocess; copy JSON; `ensure-fixture-content.mjs`; `npm run test:unit`; `npm run test:pbt`; archives proptest regressions on failure |
| Preprocess | real vault with `--stamp-published`, preferring chrome-headless-shell for Mermaid; copy JSON and assets |
| Build Site | `npx astro build` |
| Deploy | `rsync -a --delete` to `WEB_ROOT` when `RUN_DEPLOY` is true |

Not run: `npm run test:e2e`, `just crossunit`, `npm run resume:pdf:verify`, `astro check`, clippy or any linter. Defaults hardcode the maintainer's home paths (Jenkinsfile:17-24), overridable through `BLOG_WEB_ROOT` and `OBSIDIAN_VAULT_PATH`.

## Verification Gates That Constrain the Redesign

| Gate | Source | What trips it | Current state |
|---|---|---|---|
| Manual web accessibility record | accessibility-review-contract.mjs:47-62 and 82-99; verification-provider.mjs:1711-1745, 3180-3218 | Any byte change in a review subject (global.css, BaseLayout.astro, Header.astro, MobileNav.tsx, navigation.ts, resume.astro, portfolio.astro, package.json, package-lock.json, astro.config.mjs, several tooling scripts, and everything under src/components/profile, src/lib/layout and src/styles/profile) or in the node, astro, vite, playwright or axe versions | Failing (inferred). site/verification/profile/manual-web-accessibility.json (2026-07-28, reviewer recorded) holds 12 states with portfolio details `not-applicable`. The contract requires 16 states, and the digest predates commits `eace6fd`, `f156edf`, `f154b9d`, `64db1bb`, `ee8e8d7`, `d2e9cb7`, `5df7e25`, `d2884f8` and the current uncommitted work. site/README.md still describes 12 states |
| Asset budget | asset-budget.mjs | profile CSS above 24 KiB gzip (line 8); profile CSS outside the 5 approved roots; component-local CSS in profile components; any new client JavaScript reachable from profile sources, Header, MobileNav, BaseLayout or the layout and navigation modules; inline scripts or styles not matching the SHA-256 baselines; external resources on profile routes | Analyzes `/resume` and `/portfolio` only |
| Request ledger | request-ledger.mjs, verification-provider.mjs:3037-3047 | any non-loopback request on profile routes; no observed `.css` or `.woff2` request | Requires a downloadable web font on profile routes |
| Browser matrix | verification-provider.mjs:2371-2407 | missing specs, skipped tests, failed axe, overflow or clipping, print contract violations | Requires the 6 profile spec files |
| PDF parity | resume-evidence.ts:923-934, pdf-inspector.mjs:8-9, pdf-renderer.mjs:20-27 | changed period format (`YYYY-MM – 현재`), renamed screen-only selectors, print layout that drops or reorders facts | The public PDF is from 2026-08-27, and the link is withheld until a new human-reviewed release |
| Markup assertions | site/tests/unit/profile-presentation.test.ts:190-497 and its helpers | renamed classes (`desktop-nav`, `mobile-nav-dropdown`, `mobile-nav-disclosure`, `profile-local-navigation`, `portfolio-role-navigation`, `portfolio-project-navigation`, `case-study-details`, `resume-entry-heading`, `profile-content-subtitle`, `portfolio-eyebrow`, `portfolio-summary`, `resume-summary`), changed Korean heading texts or `aria-label` values, a hydrated MobileNav, open-by-default disclosures, `<form>` elements, em dashes in case studies | Runs in CI through `test:unit` |
| Fact approval | site/verification/profile/fact-approval.json, production-profile.ts, site/tests/unit/production-profile.test.ts | any change to approved profile text, structure, fact membership or evidence | Current receipt r2 of 2026-09-27 (inventory r8, 120 facts). The test pins `EXPECTED_MATERIALIZED_DIGEST`, the 120-fact count, the top-level source keys and the absence of certification issuers |
| Period grammar | validation.ts, fact-approval.ts, resume-manifest.ts, resume-evidence.ts, pdf-inspector.mjs | any period point other than `year`, `year-month` or `present` | Day precision is unsupported at every layer (2026-10-21) |

A redesign of the shared chrome or profile pages therefore implies:
- refreshing the inline script baselines when BaseLayout scripts change
- staying within the profile CSS budget
- keeping a local `.woff2` on profile routes
- updating the unit-test class and label expectations together with the markup
- a new 16-state human accessibility review
- if print styling changes, a new PDF release with human review

### Tests that pin the profile period and certification model (2026-10-21)

| Test | What it pins | Lines |
|---|---|---|
| site/tests/unit/production-profile.test.ts | materialized digest, 120 facts, top-level source keys including `certifications`, no certification issuer | 17, 43-61, 119-142 |
| site/tests/unit/profile-presentation.test.ts | résumé h2 order ending `학력`, `어학 자격` (full Astro build) | 244-252 |
| site/tests/unit/resume-document.test.ts | manifest period token example; `parsePeriodDisplayText` accepted and refused forms | about 308-311, 405-433 |
| site/tests/unit/resume-pdf.test.ts | `periodDisplay` reconstruction from the token; `inferValueKind` period cases | 18-30, 206-207 |
| site/tests/unit/profile-domain.test.ts | mixed precision yields `period.precision` | 169-195 |
| site/tests/unit/profile-projections.test.ts | synthetic certification with issuer projected to the résumé | 64-73, 183-195 |
| site/tests/pbt/u1/arbitraries/profile.ts | `PeriodMode` (`year`, `year-month`, `present`), `validPeriod`, single certification blueprint, period mutations (`mixed-project-period-precision`, `reversed-project-period`) | 19, 132-160, 415-440, 586-587, 636-642, 811-836 |
| site/tests/pbt/u1/arbitraries/manifest.ts | oracle section 6 `certifications`, oracle period token | 268-310, 572-575 |
| site/tests/pbt/u1/profile-presentation.pbt.test.ts | section kind list, `assertPeriod` text, certification section presence | 53, 232-250, 384-400 |
| site/tests/pbt/u1/profile-domain.pbt.test.ts | certification projection keeps issuer and period presence | 145, 192-200 |
| site/tests/e2e/profile-routes.spec.ts | every manifest fact is rendered; period values are checked for presence only | 205-238 |

site/tests/fixtures/profile-fixtures.ts (outside this scan's snapshot) also builds a year-month period and an empty certification list.

## Accessibility Assessment

Strengths:
- skip link
- global `:focus-visible` ring
- reduced-motion override
- `lang="ko"`
- labelled navigation landmarks with `aria-current`
- native `details` disclosures that work without JavaScript
- logical heading order with `role="heading"` summaries on the résumé
- a contrast-aware accent override on profile pages
- an extensive automated and human regime for profile routes

Gaps on blog and shared surfaces. Contrast figures are computed from token values unless the code itself states them.

| ID | Gap | Location | Relevant guideline |
|---|---|---|---|
| A11Y-01 | Link text uses `--c-accent`, which the code's own comment measures at 3.59:1 on the light background. Affected: links in posts, TOC, related posts, post cards, hub navigation, tags and the current mobile nav item. Only the homepage and the current desktop nav item use the darker `--c-accent-hover` | global.css:118-121, 217-226; post.css:53, 331, 338; TableOfContents.astro:48-51; RelatedPosts.astro:57; HubNav.astro:73; PostCard.astro:41, 76 | WCAG 1.4.3 |
| A11Y-02 | White text on `--c-accent`: about 3.7:1 light and about 1.9:1 dark | skip link (global.css:58-79); mobile preview button (link-preview.css:107-116) | WCAG 1.4.3 |
| A11Y-03 | Search overlay: no dialog role, no `aria-modal`, unlabeled input with `outline: none`, no focus trap or return, results without listbox semantics | Search.tsx; search.css | WCAG 2.4.3, 2.4.7, 4.1.2 |
| A11Y-04 | Mobile sidebar: tabs without arrow-key support, overlay without dialog semantics or focus management | MobileSidebar.tsx | WAI-ARIA tabs and dialog patterns |
| A11Y-05 | Expand and collapse controls without `aria-expanded`, with English labels | TreeNodeItem.tsx:45; heading-fold.ts | WCAG 4.1.2 |
| A11Y-06 | English accessible names on a `lang="ko"` page | ThemeToggle.tsx:117, TableOfContents.astro:13, HubNav.astro:22, copy-button.ts, TreeNodeItem.tsx | WCAG 3.1.2 |
| A11Y-07 | Graph and local graph are pointer-only, and categories are distinguished by hue | GraphView.tsx, LocalGraph.tsx, graphUtils.ts | WCAG 2.1.1, 1.4.1 |
| A11Y-08 | Link previews appear on hover only (no focus trigger), and on mobile the first tap opens a sheet instead of navigating | link-preview.ts | WCAG 1.4.13, 2.5 |
| A11Y-09 | Touch targets below the 44 pt HIG minimum: the mobile nav toggle (`min-height: 2rem`), desktop nav links (`padding: 0.25rem 0.5rem`), back-to-top (2.5rem). They exceed the WCAG 2.2 minimum of 24 px | global.css:199-209, 280-299, 392-404 | HIG layout; WCAG 2.5.8 |
| A11Y-10 | Appearance does not follow the system setting after the first visit, and a location prompt appears without context on page load | BaseLayout.astro:112-169; ThemeToggle.tsx:16-107 | HIG Dark Mode guidance; privacy |
| A11Y-11 | Decorative SVGs without `aria-hidden` (site mark, search icon); `⌘K` hint shown on non-Apple platforms | Header.astro:34, 54-55 | WCAG 1.1.1 (minor) |
| A11Y-12 | Reading progress animates `width` on every scroll; scripted smooth scrolling ignores the reduced-motion preference | global.css:268-277; BaseLayout.astro:183-203 | WCAG 2.3.3 (advisory) |
| A11Y-13 | No automated or manual accessibility checks for posts, hubs, tags, graph and 404 | site/tests | process |

## Security Assessment

| Severity | Finding | Location | Note |
|---|---|---|---|
| Medium | No Content-Security-Policy, HSTS, Referrer-Policy, X-Frame-Options or Permissions-Policy headers. The CloudFront response-headers policy listed in docs/project/codebase_audit.md was removed with AWS on 2026-08-17 | site/scripts/local-server.mjs:78-81 | Cloudflare edge configuration is outside the repository. The asset budget's inline-script SHA-256 baselines could seed CSP hashes |
| Medium | CDN stylesheets without Subresource Integrity; Pretendard addressed by a GitHub tag path | site/src/lib/layout/profile-resources.ts:49-69 | the user's web security rules require SRI for CDN assets |
| Medium | Reader coordinates sent to api.sunrise-sunset.org; geolocation requested without explanation | site/src/lib/solar.ts:54-110 | privacy; no consent text |
| Low (by design) | Vault HTML rendered through `set:html` without sanitization | PostLayout.astro, index.astro, render.ts (`rehype-raw`) | acceptable while the vault is single-author |
| Low | CLAUDE.md states launchd sets `HOST=0.0.0.0`, exposing the server to the LAN; the code default is `127.0.0.1` | local-server.mjs:17 | configuration outside the repository |
| Low | Attachment lookup strips path traversal from the file name but climbs up to 10 parent directories looking for `attachment/`. It can resolve a referenced image from outside the published `Areas/Notes` subtree | preprocessor/src/output.rs:318-331 | publication-boundary edge case |
| Low | `--stamp-published` writes into the iCloud-synced vault from CI | scanner.rs `stamp_published_dates` | lost-write risk noted in the 2026-04-14 audit |
| Info | JSON-LD is escaped (`<`, `>`, `&`, U+2028, U+2029) and round-trip verified | site/src/lib/layout/json-ld.ts | good practice |
| Info | Tracked third-party content and personal documents in scratch folders | tmp/pdfs/hyundai-elevator-job-guide.txt, output/pdf/ | repository hygiene and redistribution concern |

No hardcoded secrets were found. Environment-dependent paths are machine paths, not credentials.

## Documentation Quality

| Document | Status |
|---|---|
| CLAUDE.md | Accurate operational runbook (hosting, ports, the Jenkins incident, gotchas). Drift: says 85 Rust tests (33 + 52) and 11 fixtures; actual 110 (33 + 77) and 13 |
| site/README.md (Korean) | Accurate command surface and gates. Drift: references S3, CloudFront and Terraform, a 12-state manual record, and a digest covering only three directories (the contract now also lists individual files) |
| docs/project/codebase_audit.md | Historical (2026-04-14): describes `infra/`, CloudFront headers and 82 tests that no longer reflect the system |
| docs/plans/, docs/superpowers/ | Historical design records (March and April 2026), useful as rationale, for example the responsive breakpoints and the theme transition |
| docs/portfolio/, docs/resume/ | Content evidence and publication records, including verification logs |
| Code comments | Dense, rationale-oriented and rule-referenced. Inaccuracies: crossunit.spec.ts says the mobile toggle is JavaScript-driven (it is a native `details`); local-server.mjs documents a `127.0.0.1` default that differs from the launchd setup in CLAUDE.md |

## Technical Debt Register

| ID | Signal | Location | Impact | Suggested direction |
|---|---|---|---|---|
| TD-01 | Manual accessibility record. On 2026-10-19 it was in the old 12-state shape with a stale digest. On 2026-10-21 a new 16-state record (result `pass`) is in the working tree, uncommitted, on `chore/manual-a11y-review` | site/verification/profile/manual-web-accessibility.json | any edit to a review subject, including the résumé components and stylesheets, invalidates it again | commit the new record; batch profile presentation changes before the next review |
| TD-02 | E2E, crossunit and `astro check` not in CI; no coverage measurement | Jenkinsfile, vitest configs | regressions in visual and accessibility behavior go unnoticed | add a pre-deploy verification stage and coverage reporting |
| TD-03 | No lint or format configuration | repository | style drift, no CSS linting | add Prettier, ESLint and Stylelint (rustfmt and clippy for Rust) |
| TD-04 | Theme logic duplicated (ES5 and TypeScript), two ThemeToggle instances, OS appearance ignored after the first visit | BaseLayout.astro:112-169, ThemeToggle.tsx, solar.ts | inconsistency and conflict with HIG | single appearance model that follows the system, with a manual override |
| TD-05 | Token debt: unused dark callout tokens, hardcoded callout and graph palettes, a blue fallback in nav-tree.css, JetBrains Mono declared but not loaded, profile accent override | global.css:28-31, callouts.css, graphUtils.ts, nav-tree.css, foundation.css:17-21 | redesign must touch many files | one semantic token layer |
| TD-06 | Light-theme link contrast below AA | see A11Y-01 | accessibility | promote the darker accent for text |
| TD-07 | Modules far beyond the 800-line guideline | verification-provider.mjs, validation.ts, resume-evidence.ts, asset-budget.mjs, resume-manifest.ts, fact-approval.ts, resume-receipts.ts, font-materializer.mjs, preview-supervisor.mjs, release-store.mjs, production-profile.ts, metadata.ts, transform.rs | maintainability | split by responsibility when next touched |
| TD-08 | Nondeterministic ordering | linker.rs (HashSet backlinks), related.rs (ties) | unstable diffs in generated output | sort before output |
| TD-09 | Diagram failure accounting counts only themed renders; no CSS for `.diagram-download` and `.diagram-d2-ascii` | transform.rs, d2.rs, diagrams.css | silent degradation, unstyled elements | count all render failures; style both classes |
| TD-10 | Machine-specific paths: version-specific `mmdc` fallback, Jenkins defaults, export script | mermaid.rs:22-26, Jenkinsfile:17-24, tmp/pdfs/export-portfolio.mjs:6 | portability | configuration through environment variables |
| TD-11 | Missing security headers and SRI | see Security Assessment | security | headers at the server or edge, self-hosted fonts |
| TD-12 | Stray tracked artifacts | preprocessor/.astro/, tmp/pdfs/ (24 files), output/pdf/ (2 PDFs); root node_modules/ without a manifest (ignored) | repository noise, third-party content | remove or ignore as part of cleanup |
| TD-13 | Documentation drift | CLAUDE.md, site/README.md, codebase_audit.md, crossunit.spec.ts comment | misleading guidance | update with the cleanup |
| TD-14 | Mixed responsive strategy (max-width and min-width) and duplicated `.post-tag` styles | global.css, post.css, PostCard.astro | inconsistent breakpoints | one mobile-first breakpoint scale |
| TD-15 | Workaround styles placed outside review subjects | index.astro:95-112 (`is:global` link and title colors) | hidden global overrides | fold back into the token layer during the redesign |
| TD-16 | Asset budget covers only `/resume` and `/portfolio`; role editions are unmeasured | asset-budget.mjs | budget gaps | include every profile route |
| TD-17 | Working-directory-dependent data paths | data.ts (`../content`, `public/previews.json`) | builds must run from site/ | resolve paths from the module location |
| TD-18 | Module cycle transform.rs and hub_dates.rs | preprocessor/src | coupling | extract `transform_outside_fences` into syntax.rs |
| TD-19 | Public `/resume.pdf` predates the current profile; the link is withheld | site/public/resume.pdf, current-release.json | stale public document still reachable by URL | run the release flow after the redesign |
| TD-21 | Period grammar duplicated across eight production sites; only `year` and `year-month` | see code-structure.md Profile Period Model | a new precision is a wide, coordinated change | one grammar per side (build and observation) with a cross-check test |
| TD-22 | ResumeContent.astro renders certifications in a catch-all `else` branch | site/src/components/profile/ResumeContent.astro:142-172 | a new section kind renders silently as certifications | exhaustive dispatch on `section.kind` |
| TD-23 | Certification has no category, and its period means "issue month" by convention (start equals end) | types.ts:231-239, profile-data.ts:565-588 | professional and language certificates cannot be told apart; expiry cannot be expressed distinctly from an issue range | model the category and the issue/expiry meaning explicitly |
| TD-20 | Branching policy conflict and divergent `main` | CLAUDE.md (git flow) versus aidlc org.md (trunk-based, squash into `main`) | ambiguous merge target for this intent | decide before Construction |

## Repository Hygiene: Branches and Worktrees

Read from `git worktree list` and `git branch -vv` on 2026-10-19. Worktree contents were not opened.

### Worktrees

| Path | Branch | HEAD | Status |
|---|---|---|---|
| /Users/revenantonthemission/Projects/obsidian-blog | `codex/feature/infra-engineer-portfolio` | 265b38a | main checkout; same commit as `develop`; carries uncommitted infra-engineer portfolio work |
| /Users/revenantonthemission/Projects/obsidian-blog-u1-nfr | `codex/fix/diagram-render-gate` | f82c9eb | merged into `develop`; 73 commits behind `origin/develop` |
| /Users/revenantonthemission/Projects/obsidian-blog/.claude/worktrees/u2-home-boundary | `codex/feature/resume-home-boundary` | bd238a1 | merged into `develop` |
| /Users/revenantonthemission/Projects/obsidian-blog/.claude/worktrees/u3-quality-gates | `codex/feature/resume-quality-gates` | 2de9c81 | merged into `develop` |

The three secondary worktrees might hold uncommitted changes. This scan did not open them, so check their status before removing them.

### Branches

31 local branches. The remote has only `origin/develop` and `origin/main` (`origin/HEAD` points to `main`).

| Group | Branches | Merge status |
|---|---|---|
| Not merged into `develop` | `codex/chore/aidlc-scaffolding` (10 commits: AI-DLC scaffolding and Step 19-21 documents from the previous workflow, plus `9e1c203`, which adds puppeteer configuration support to mermaid.rs) | unmerged; the mermaid fix is not on `develop` |
| Not merged into `develop` | `main` (4 merge-only commits: `323baa1`, `67c516e`, `f52343a`, `23e08e6`) | `develop` has never merged `main` back |
| Integration | `develop` (2 commits ahead of `origin/develop`: `d2884f8`, `265b38a`) | unpushed |
| Merged `codex/*` | `codex/chore/reconcile-develop-main` (117 behind `origin/develop`), `codex/feature/infra-engineer-portfolio` (current), `codex/feature/kakaopay-data-platform-portfolio`, `codex/feature/portfolio-data-ai-rescope`, `codex/feature/resume-home-boundary` (worktree), `codex/feature/resume-profile-experience`, `codex/feature/resume-quality-gates` (worktree), `codex/fix/diagram-render-gate` (worktree), `codex/fix/jenkins-cargo-path`, `codex/fix/portfolio-korean-copy`, `codex/resume-product-engineer` | merged |
| Merged `feature/*` | `feature/callouts-highlights-ui`, `feature/code-review-fixes`, `feature/code-review-fixes-2`, `feature/diagram-theme-sync`, `feature/image-embeds`, `feature/local-serving`, `feature/markdown-rendering-improvements`, `feature/phase1-scaffolding`, `feature/phase2-preprocessor`, `feature/phase3-site`, `feature/phase4-islands`, `feature/phase5-markdown-pipeline`, `feature/phase6-infrastructure`, `feature/phase7-deploy`, `feature/phase7-integration`, `feature/portfolio-docsuri`, `feature/remaining-review-fixes` | merged |

Other working-tree state outside this scan's scope:
- the AI-DLC install (`.claude/`, `.aidlc/`, `aidlc/`, `.mcp.json`, the `.gitignore` block)
- a staged deletion of the earlier `aidlc-docs/` workflow record
- ignored root folders `.playwright-mcp/` and `node_modules/`, and the ignored root file `.puppeteer-config.json`
