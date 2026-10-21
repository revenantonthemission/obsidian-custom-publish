# Build Instructions: Résumé Certifications

These instructions build what Code Generation produced (`construction/code-generation/code-summary.md`). They follow the `Justfile`, the `Jenkinsfile` and `site/package.json`. The environment is unchanged from the HIG redesign:
- Node v24.14.0 and npm 11.9.0;
- Rust 1.99.1;
- `just` 1.59.0, `d2` and `mmdc`;
- Playwright's Chromium, Firefox and WebKit.

## Fixture build

Use this for every test. It never touches the vault. Run it from the repository root:

1. `cargo build --release --manifest-path preprocessor/Cargo.toml`
2. `./preprocessor/target/release/obsidian-press ./fixtures/vault ./content`
3. `cp content/search-index.json content/graph.json content/previews.json content/nav-tree.json site/public/`
4. `cd site && node scripts/crossunit/ensure-fixture-content.mjs && npx astro build`

The build only succeeds when the r9 approval receipt in `site/verification/profile/fact-approval.json` matches the facts in `site/src/lib/profile/profile-data.ts` (fail-closed, NFR3).

## PDF candidate

Run `cd site && npm run resume:pdf -- --prepare`. It prepares a candidate and its viewer under `site/.artifacts/profile/pdf/`.

Promotion (`--promote`) is the maintainer's step. Until then, `npm run resume:pdf:verify` reports `RELEASE_STALE`, and the résumé page hides its PDF link.

## Build Verification

| Check | Command | Pass criterion |
|---|---|---|
| Site build | `npx astro build` (from `site/`) | exit 0; 34 pages; "verified private profile approval boundary" |
| Types | `npx astro check` | 0 errors |
| Formatting | `npm run format:check`; `cargo fmt --check --manifest-path preprocessor/Cargo.toml` | clean |
