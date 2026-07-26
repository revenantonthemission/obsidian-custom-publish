# Technology Stack

## Programming Languages

- **Rust 1.97.1 observed locally, edition 2024** - Vault scanning, transformation, indexing, diagram dispatch, and generated output.
- **TypeScript 5.9.3** - Site data/rendering libraries, browser scripts, and Preact islands.
- **Astro component syntax** - Static routes, layouts, and components.
- **CSS** - Custom responsive design system using `--c-` variables.
- **JavaScript ES5 subset** - Required for inline bootstrap scripts in `BaseLayout.astro`.
- **HCL** - Terraform infrastructure.
- **Groovy/Jenkins Pipeline** - Scheduled CI/CD.
- **Just recipe syntax** - Local workflow orchestration.
- **Markdown/YAML** - Canonical Vault content and metadata.

## Frameworks and Libraries

### Site

- **Astro 6.1.5 locked** - Static site generation.
- **Preact 10.29.1** - Hydrated interaction islands.
- **Astro Preact 5.1.1** - Astro/Preact integration.
- **Unified 11.0.5** - Custom Markdown processing.
- **Remark** - Parse, GFM, and math input.
- **Rehype** - Raw HTML, slugs, KaTeX, and string output.
- **Shiki 4.0.2** - Syntax highlighting and transformers.
- **D3 3.0.0 packages** - Force graphs, selection, and zoom.
- **Lucide 1.8.0** - Build-time and island icons.
- **Astro RSS 4.0.18** - RSS generation.
- **Astro Sitemap 3.7.2** - Sitemap generation.

### Rust

- **Clap 4.6.0** - CLI parsing.
- **Serde 1.0.228 family** - YAML/JSON data contracts.
- **Regex 1.12.3** - Shared Obsidian syntax transforms.
- **Walkdir 2.5.0** - Vault traversal.
- **Chrono 0.4.44** - Publication and update dates.
- **Lindera 2.3.2 with embedded Korean dictionary feature** - Korean search tokenization.
- **Anyhow 1.0.102** - Error propagation.
- **Tempfile 3.27.0** - Renderer/test temporary files.

## Diagram Tools

- **D2 0.7.1 observed locally** - SVG rendering for D2 fences.
- **Mermaid CLI 11.12.0 observed locally** - Light/dark Mermaid SVG rendering through Chrome.
- **Typst** - Optional renderer; not installed in the observed local environment.
- **Chrome/Puppeteer** - Mermaid CLI browser runtime, configured by a machine-specific ignored JSON file.

## Infrastructure

- **AWS S3** - Static site and access-log storage.
- **AWS CloudFront** - CDN, HTTPS, clean-route rewriting, errors, headers, and logging.
- **AWS ACM** - Custom-domain certificate supplied as an input.
- **Cloudflare** - DNS managed outside this Terraform package.
- **Terraform AWS Provider 5.100.0 locked** - Infrastructure provisioning.
- **S3 remote Terraform state** - Encrypted state and native lockfile configuration.

## Build Tools

- **Cargo** - Rust build and test.
- **npm 11.9.0 observed locally** - Dependency installation and scripts.
- **Node 24.14.0 observed locally** - Satisfies the declared `>=22.12.0`.
- **Astro CLI** - Static build and development server.
- **Just** - Reproducible local task entry points.
- **Jenkins** - Scheduled integration and deployment.
- **AWS CLI** - S3 synchronization and CloudFront invalidation.

## Testing and Quality Tools

- **Rust built-in test harness** - 82 current tests.
- **Real fixture Vault** - 10 Markdown files plus an image.
- **Astro build** - Current source of truth for site compilation.
- **Astro Check 0.9.8** - Installed but not scripted or enforced in CI.
- **Cargo fmt** - Available; current repository formatting check fails.
- **Cargo Clippy** - Available; clean verification was blocked by a Lindera dictionary network fetch in one observed run.
- **Terraform fmt/validate** - Available; current formatting and local-provider validation are not clean.
- **Missing**: Site unit/component/E2E/visual/accessibility/link test framework, coverage tooling, and lint/format enforcement.

## Runtime Services

- **jsDelivr** - Pretendard 1.3.9 and KaTeX 0.16.22 CSS.
- **Sunrise-Sunset API** - Optional browser-side solar theme data.
- **Notion** - Current temporary résumé and portfolio pages.
- **GitHub** - External author profile.

## Stack Constraints for the Requested Change

- A native static professional profile can use the existing Astro, CSS, and Lucide stack without a new dependency.
- New third-party images, APIs, or embeds require CSP changes and corresponding infrastructure validation.
- If structured professional data is introduced, Rust and TypeScript are not automatically required to share it; Requirements Analysis must choose the canonical source first.
- If the Vault remains canonical for homepage links, editing it is an external write outside this repository and needs explicit authority.

## Obsidian Press Extension Compliance

- **OBSIDIAN-01**: Compliant. Current tool and package versions reflect manifests, locks, and observed commands.
- **OBSIDIAN-02**: Compliant. Build outputs are not represented as technologies or source packages.
- **OBSIDIAN-03**: Compliant. Existing quality tools and missing gates are identified.
- **OBSIDIAN-04**: N/A for technology documentation.
- **OBSIDIAN-05**: Compliant. Artifact is part of the sole active run.
