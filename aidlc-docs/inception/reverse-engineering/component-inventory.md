# Component Inventory

## Application Packages

### `preprocessor/`

- **Type**: Rust CLI and library.
- **Purpose**: Compile an Obsidian Vault into the generated content contract.
- **Implementation Modules**: 15 exported modules plus the CLI entry point.
- **Test Surface**: 32 unit tests and 50 integration tests.

### `site/`

- **Type**: Astro static application with Preact islands.
- **Purpose**: Render the public knowledge site and interactive browser experiences.
- **Source Surface**: 47 files under `site/src/`.
- **Current Professional-Profile Surface**: No native résumé or portfolio route/component; only generated external links.

## Infrastructure Packages

### `infra/`

- **Type**: Terraform.
- **Purpose**: Provision static delivery through private S3 and CloudFront.
- **Current Change Relevance**: Native `/resume` and `/portfolio` static routes need no infrastructure change under the existing rewrite function.

## Shared Packages

### Root Automation

- **Type**: Just and Jenkins orchestration.
- **Purpose**: Join the external Vault, Rust preprocessor, Astro build, and optional AWS deployment.
- **Known Issue**: Jenkins' Rust manifest and binary paths do not match the current repository layout.

## Test Packages

### `fixtures/vault/` and `preprocessor/tests/`

- **Type**: Real-data integration fixtures and Rust test suites.
- **Purpose**: Verify Obsidian syntax, rendering-tool integration, output contracts, and indexing.
- **Fixture Count**: 10 Markdown notes and one image.
- **Integration Test File Count**: 12.

## External Authored Source

### Obsidian Vault

- **Type**: Separate iCloud directory and Git repository.
- **Purpose**: Canonical knowledge and homepage content.
- **Relevant File**: `Areas/Notes/Passion Project.md`.
- **Working-State Finding**: The wider Vault is dirty, while the relevant `Passion Project.md` was observed clean.

## Site Component Inventory

### Astro Components

- `BacklinkList`
- `Footer`
- `Header`
- `HubNav`
- `HubProgress`
- `PostCard`
- `RelatedPosts`
- `TableOfContents`

### Preact Islands

- `GraphView`
- `LocalGraph`
- `MobileNav`
- `MobileSidebar`
- `NavTree`
- `Search`
- `ThemeToggle`
- `TreeNodeItem`

### Layouts

- `BaseLayout`
- `HubLayout`
- `PostLayout`

### Routes

- Homepage
- Post detail
- Hub detail
- Tag index and detail
- Full graph
- RSS
- 404

### Shared Site Libraries

- Build-time data access
- Unified rendering
- Graph simulation and styling
- Solar theme logic
- TOC extraction
- Generated-contract types

### Browser Enhancement Scripts

- Code copying
- Diagram wrapping
- Heading folding
- Link previews
- TOC highlighting

## Rust Module Inventory

- CLI orchestration
- Shared types
- Shared syntax
- Vault scanner
- Linker and graph
- Content transformer
- Hub dates
- D2 rendering
- Mermaid rendering
- Typst rendering
- Search index
- Previews
- Related posts
- Navigation tree
- Output materialization

## Generated Contract Inventory

- Per-post Markdown
- Per-post metadata JSON
- Image and diagram assets
- Graph JSON
- Search JSON
- Preview JSON
- Navigation-tree JSON
- Astro static distribution

These items are generated artifacts and are not counted as authored packages.

## Total Count

- **Total Logical Packages**: 5
- **Application**: 2
- **Infrastructure**: 1
- **Shared Automation**: 1
- **Test**: 1
- **External Authored Sources**: 1
- **Native Résumé Components**: 0
- **Native Portfolio Components**: 0

## Obsidian Press Extension Compliance

- **OBSIDIAN-01**: Compliant. Inventory follows actual package boundaries and root guidance.
- **OBSIDIAN-02**: Compliant. Generated contracts are excluded from authored package totals.
- **OBSIDIAN-03**: N/A for inventory documentation.
- **OBSIDIAN-04**: Compliant. Inventory does not create or assume a feature branch.
- **OBSIDIAN-05**: Compliant. Artifact is stored in the active run.
