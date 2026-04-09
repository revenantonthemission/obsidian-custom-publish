# Codebase Audit Report

**Project:** obsidian-blog (obsidian-press)
**Date:** 2026-04-09
**Auditor:** Claude Opus 4.6 (1M context) — 7 parallel workers
**Project Type:** CLI Tool + Static Site Generator

---

## Executive Summary

**Overall Score: 7.2 / 10**

The obsidian-blog codebase is well-structured with clear architectural boundaries between the Rust preprocessor, Astro site, and Terraform infrastructure. The code is notably clean — zero compiler warnings, zero dead code warnings, all 54 tests passing, and no hardcoded secrets. The main areas for improvement are: (1) a critical regex bug in mermaid.rs, (2) npm dependency vulnerabilities, (3) DRY violations in the site's navigation and PostLayout, and (4) deprecated serde_yaml dependency.

| Category | Score | Findings | C | H | M | L |
|----------|-------|----------|---|---|---|---|
| Security | 7.5/10 | 10 | 0 | 3 | 4 | 3 |
| Build Health | 6.5/10 | 11 | 1 | 3 | 4 | 3 |
| Code Principles | 6.5/10 | 28 | 0 | 3 | 14 | 11 |
| Code Quality | 7.5/10 | 22 | 0 | 1 | 6 | 13 |
| Dependencies | 7.0/10 | 12 | 0 | 5 | 3 | 4 |
| Dead Code | 9.5/10 | 4 | 0 | 0 | 2 | 2 |
| Concurrency | 9.5/10 | 5 | 0 | 0 | 0 | 5 |
| Observability | N/A | — | — | — | — | — |
| Lifecycle | N/A | — | — | — | — | — |

**Skipped workers:** Observability and Lifecycle — not applicable for CLI + static site project type.

---

## Strengths

- **Zero compiler warnings** — `cargo check` is clean, no `#[allow(dead_code)]` annotations
- **All 54 tests pass** (6 unit + 48 integration) with real fixture data
- **No hardcoded secrets** — no API keys, tokens, or credentials in code or git history
- **No `unsafe` Rust** anywhere in the preprocessor
- **Clean dead code profile** — only 4 minor findings across entire codebase
- **Correct LazyLock usage** — all 14 `LazyLock<Regex>` statics properly implemented
- **Well-separated architecture** — preprocessor pipeline stages, Astro pages/layouts, Preact islands
- **S3 fully locked down** with OAC, TLS 1.2 minimum on CloudFront
- **Reproducible builds** — both Cargo.lock and package-lock.json present
- **Astro build succeeds** — 183 pages generated cleanly

---

## CRITICAL Findings (1)

### BUILD-1: Invalid regex backreference in mermaid.rs
- **File:** `preprocessor/src/mermaid.rs:70`
- **Description:** `Regex::new(r#"(['"])theme\1..."#)` uses backreferences (`\1`, `\2`) which are **not supported** by Rust's `regex` crate. This will panic at runtime when the code path is hit.
- **Impact:** Any Mermaid diagram with a `theme` property will crash the preprocessor.
- **Fix:** Rewrite without backreferences — use two separate patterns for single/double quotes, or use alternation: `(?:'theme'|"theme")`.

---

## HIGH Findings (12)

### SECURITY-1: Vulnerable npm dependencies
- **File:** `site/package.json`
- **Description:** 7 npm advisories (5 high, 2 moderate): vite path traversal (3 CVEs), defu prototype pollution, fast-xml-parser entity expansion bypass, picomatch ReDoS + method injection.
- **Fix:** `cd site && npm audit fix` (5 min)

### SECURITY-2: External command execution from vault content
- **Files:** `preprocessor/src/d2.rs:182`, `mermaid.rs:100`, `typst_render.rs:21`
- **Description:** Diagram source from vault markdown is piped to external CLIs (d2, mermaid-cli, typst). Uses `.arg()` (safe from shell injection), but untrusted diagram source could exploit parser bugs.
- **Risk:** LOW for single-author vault. Flag for review if vault ever accepts third-party content.

### SECURITY-3: Infrastructure identifiers exposed
- **Files:** `Jenkinsfile:11-12`, `Justfile:6-7`, `CLAUDE.md:28`
- **Description:** S3 bucket name and CloudFront distribution ID hardcoded. Not credentials, but reveals deployment topology.

### BUILD-2: npm vulnerabilities (same as SECURITY-1)
- Cross-reference: Same 7 vulnerabilities. Fix with `npm audit fix`.

### BUILD-3: Missing --stamp-published in Jenkinsfile
- **File:** `Jenkinsfile:31`
- **Description:** Jenkins deploy stage doesn't use `--stamp-published` flag that the Justfile's `deploy-preprocess` target uses. Production deploys via Jenkins won't stamp published dates.

### BUILD-4: Missing @astrojs/check
- **File:** `site/package.json`
- **Description:** No TypeScript type-checking in the build pipeline. Type errors can slip through.
- **Fix:** `npm install @astrojs/check` and add to CI.

### DEPS-1: serde_yaml is deprecated
- **File:** `preprocessor/Cargo.toml:10`
- **Description:** `serde_yaml 0.9.34+deprecated` — unmaintained by dtolnay.
- **Fix:** Migrate to `serde_yml` (drop-in replacement) in Cargo.toml + scanner.rs (~30 min).

### PRINCIPLES-1: Frontmatter stripping duplicated across 3 modules
- **Files:** `transform.rs:63-71`, `search.rs:104-113`, `scanner.rs:287-303`
- **Description:** The frontmatter-stripping logic (`starts_with("---")`, find `\n---`, skip past) is implemented three separate times.
- **Fix:** Have `search.rs` call `transform::strip_frontmatter`. Extract shared `split_frontmatter` into `syntax.rs`.

### PRINCIPLES-2: TreeNode and isAncestor fully duplicated
- **Files:** `site/src/islands/NavTree.tsx:27-72`, `MobileSidebar.tsx:15-80`
- **Description:** Both the TreeNode component and isAncestor helper are copy-pasted between desktop and mobile navigation with near-identical markup and state logic.
- **Fix:** Extract into shared `NavTreeComponents.tsx`.

### PRINCIPLES-3: PostLayout.astro is a 428-line monolith
- **File:** `site/src/layouts/PostLayout.astro`
- **Description:** Contains 5 inline `<script>` blocks totaling ~280 lines of JS (copy buttons, link previews, TOC highlighting, diagram wrapping, heading fold). Link preview alone has duplicated DOM construction between desktop/mobile.
- **Fix:** Extract scripts into `site/src/scripts/` modules; deduplicate preview DOM construction.

### DEPS-2: lucide-preact/lucide-static major version behind
- **File:** `site/package.json`
- **Description:** At 0.577.0, latest is 1.8.0. `^` pin blocks auto-upgrade across major versions.

### QUALITY-1: PostLayout.astro inline scripts (same as PRINCIPLES-3)
- Cross-reference: 429 lines with 5 script blocks and duplicated logic.

---

## MEDIUM Findings (23)

### Security
- **SEC-M1:** `set:html` trusts vault content (`PostLayout.astro:66`, `index.astro:23,36`) — intentional, documented
- **SEC-M2:** `allowDangerousHtml: true` in render.ts — by design for preprocessor HTML
- **SEC-M3:** `find_attachment` unbounded traversal (`output.rs:172-181`) — walks to filesystem root
- **SEC-M4:** Image filenames not HTML-escaped in `<img src>` (`transform.rs:189-202`)

### Build
- **BLD-M1:** 10 Clippy warnings (unused variables, redundant clones)
- **BLD-M2:** Deprecated serde_yaml (see DEPS-1)
- **BLD-M3:** Outdated npm packages (8 minor/patch updates available)
- **BLD-M4:** No MSRV pinned for Rust edition 2024

### Code Principles
- **PRI-M1:** Wikilink regex duplicated in preview.rs (violates CLAUDE.md rule)
- **PRI-M2:** Block-ID regex duplicated in preview.rs
- **PRI-M3:** Regex compiled per-call in mermaid.rs (violates CLAUDE.md LazyLock guideline)
- **PRI-M4:** parse_frontmatter silently swallows YAML errors (`scanner.rs:298`)
- **PRI-M5:** Tokenizer panics on dictionary load failure (`search.rs:85`)
- **PRI-M6:** SVG icon duplication across islands (MobileSidebar, NavTree, MobileNav)
- **PRI-M7:** TOC heading extraction duplicated (`TableOfContents.astro` / `MobileSidebar.tsx`)
- **PRI-M8:** Desktop/mobile link preview DOM construction duplicated
- **PRI-M9:** Graph simulation setup duplicated (`GraphView.tsx` / `LocalGraph.tsx`)
- **PRI-M10:** Non-null assertion on published date in RSS (`rss.xml.ts:14`)
- **PRI-M11:** Double non-null assertion (`getPostMeta(slug!)!`) in page files

### Code Quality
- **QUA-M1:** O(n²) backlink containment check (`linker.rs:30`) — use HashSet
- **QUA-M2:** O(n²) related-posts computation (`related.rs:33-79`) — pre-compute tag sets
- **QUA-M3:** Regex compiled inside function (`mermaid.rs:70`) — move to LazyLock
- **QUA-M4:** Spawning git subprocess per file in scan_vault (`scanner.rs:306-316`) — batch
- **QUA-M5:** Duplicated TreeNode component (same as PRINCIPLES-2)
- **QUA-M6:** Deprecated `forwarded_values` in Terraform (`infra/main.tf:148-153`)

### Dependencies
- **DEP-M1:** h3, smol-toml moderate vulnerabilities (dev/build-time only)
- **DEP-M2:** Broad Rust version pins (`"1"` instead of `"1.x"`)

### Dead Code
- **DC-M1:** `transform_content` only called from tests, never production code (`transform.rs:36`)
- **DC-M2:** 12 unused `--c-callout-*` CSS variable declarations in `global.css` (callouts use own scoped vars)

---

## LOW Findings (38)

<details>
<summary>Click to expand LOW findings</summary>

### Code Principles (11)
- DRY-R3: Block-ID regex duplicated in preview.rs
- DRY-R4: `slugify` and `slugify_heading` are near-duplicates (`scanner.rs`)
- DRY-R5: Heading regex duplicated between scanner.rs and transform.rs
- KISS-R2: D2Format has overlapping Txt and Ascii variants
- YAGNI-R1: D2Format includes unused Pdf/Pptx variants
- ERR-R3: Regex compiled per-call in mermaid.rs (latent panic risk)
- ERR-R4: find_attachment walks unbounded
- DRY-S6: Search-open event listener duplicated (Header.astro / 404.astro)
- DRY-S7: Hub/post URL construction repeated in 4+ files
- YAGNI-S1: HubProgress component for single-use count
- DRY-T1: domain_name conditional repeated 4 times in Terraform

### Code Quality (13)
- Double frontmatter parsing in scan_vault
- Long function: convert_callouts (70 lines)
- Magic numbers in scoring weights (related.rs)
- Magic numbers in output.rs (200 WPM)
- D2Format::from_str shadows std trait
- Duplicated frontmatter stripping (also in principles)
- Duplicated regex in preview.rs
- Duplicated SVG icon markup
- GraphView click handler magic number hit radius
- Non-null assertions in page files
- Inline styles in LocalGraph/ThemeToggle
- Ternary-heavy viewer_certificate in Terraform

### Security (3)
- Vault filesystem path exposed in committed files
- No CSP or security headers on CloudFront
- Terraform state bucket versioning not verified

### Build (3)
- Missing npm lock file integrity check in CI
- No Rust build cache in Jenkinsfile
- No parallel build stages in Jenkins

### Dependencies (4)
- No cargo-audit/cargo-outdated installed for automated CVE scanning
- 8 npm packages with minor/patch updates available
- Broad version pinning strategy
- Lock files present (positive)

### Dead Code (2)
- `HUB_COLORS` exported but only used internally in graphUtils.ts
- `.DS_Store` in docs/ (already gitignored)

### Concurrency (5)
- TOCTOU gap in stamp_published_dates (sub-millisecond window)
- TOCTOU in exists() check before image copy
- Non-deterministic walkdir traversal order
- Theoretical double-fetch of search index on rapid open/close
- Direct mutation of state object (lazy _sortedKeys cache)

</details>

---

## Domain Health Summary

| Domain | Findings | Score | Top Issue |
|--------|----------|-------|-----------|
| **preprocessor/** (Rust) | ~35 | 7.0/10 | CRITICAL regex backreference in mermaid.rs |
| **site/** (Astro/Preact) | ~40 | 6.8/10 | PostLayout.astro 428-line monolith + DRY violations |
| **infra/** (Terraform) | ~5 | 9.0/10 | Deprecated forwarded_values (minor) |

---

## Recommended Action Plan

### Immediate (this week)
| # | Priority | Action | Effort |
|---|----------|--------|--------|
| 1 | CRITICAL | Fix invalid regex backreference in `mermaid.rs:70` | 15 min |
| 2 | HIGH | `cd site && npm audit fix` | 5 min |
| 3 | HIGH | Add `--stamp-published` to Jenkinsfile deploy stage | 5 min |
| 4 | HIGH | Replace `serde_yaml` with `serde_yml` | 30 min |

### Short-term (this sprint)
| # | Priority | Action | Effort |
|---|----------|--------|--------|
| 5 | HIGH | Extract PostLayout.astro inline scripts into modules | 2 hr |
| 6 | HIGH | Extract shared NavTree/MobileSidebar components | 1 hr |
| 7 | MEDIUM | Consolidate duplicated regexes into syntax.rs | 1 hr |
| 8 | MEDIUM | Batch git log calls in scan_vault | 1 hr |
| 9 | MEDIUM | Install @astrojs/check, add to CI | 30 min |

### Medium-term (next sprint)
| # | Priority | Action | Effort |
|---|----------|--------|--------|
| 10 | MEDIUM | Use HashSet for backlink dedup in linker.rs | 30 min |
| 11 | MEDIUM | Pre-compute tag sets in related.rs | 30 min |
| 12 | MEDIUM | Extract shared graph simulation hook | 1 hr |
| 13 | MEDIUM | Replace deprecated forwarded_values in Terraform | 30 min |
| 14 | LOW | Clean up unused CSS callout variables | 15 min |
| 15 | LOW | `cd site && npm update` for minor/patch bumps | 15 min |

---

## Audit Metadata

- **Workers executed:** 7 of 9 (Observability and Lifecycle skipped — N/A for CLI + static site)
- **Domains audited:** preprocessor/ (Rust), site/ (Astro/Preact), infra/ (Terraform)
- **Total findings:** 82 (1 Critical, 12 High, 23 Medium, 38 Low)
- **Deduplicated findings:** ~65 (some findings flagged by multiple workers)
- **Tests:** 54/54 passing | Astro build: 183 pages | cargo check: clean
