# Tech Stack Decisions — U1 `u1-publish-boundary`

Upstream: codekb `technology-stack.md`; `inception/requirements-analysis/requirements.md` (Constraints); `construction/u1-publish-boundary/functional-design/functional-spec.md`; team Code Style practices.

U1 changes behaviour inside the existing stack and adds **no new runtime or build dependency**.

| Area | Decision | Rationale | Alternatives rejected |
|---|---|---|---|
| Publishing step | Keep the Rust preprocessor (edition 2024). CLI parsing stays on the existing argument parser, with `--pages` added as an optional path. | Contract C1; one binary; existing tests and Jenkins wiring | A separate pages tool (two scans, ADR-001 rejects it) |
| Folder walk | Keep the existing directory walker, with links not followed (default). Canonical paths come from the standard library. | Same skip rules for both folders (BR1.4). Canonicalisation gives the overlap check and the real-path image check (NFR5.3, NFR5.4). | Following links with a cycle guard (widens the boundary) |
| Overlap check for a missing `--pages` | Compare canonical NOTES with the canonicalised nearest existing parent of PAGES plus the remaining components | A missing folder cannot be canonicalised directly; this keeps exit 2 for `--pages <NOTES>/Pages` even before the folder exists | Skip the check when PAGES is missing (lets a mis-wiring through silently) |
| Exit codes | 0 / 1 / 2. Usage errors share exit 2 with argument-parser errors. | C1 plus the convention the parser already uses | A new code per error class |
| Tests (Rust) | Existing integration-test layout in `preprocessor/tests/`, the fixture vault, temporary on-disk vaults for failure cases, the existing property-test library | team Testing Posture: real fixtures, never mocks | Mocked file systems |
| Site | Astro (installed 7.4.1), TypeScript strict, Preact islands unchanged. The homepage opening is plain Astro markup with no island. | NFR3 (works without JavaScript); no new client code | A Preact component for the capsules |
| Site tests | Vitest (unit and property) and Playwright with axe (HIG suite) | team Testing Posture | — |
| Formatting | `cargo fmt --check`, Prettier (`npm run format:check`), `npx astro check` | team Code Style | — |
| Pipeline | Jenkinsfile and Justfile edited in place; new `PAGES_PATH` / `OBSIDIAN_PAGES_PATH` and Justfile `pages` / `publish_pages` | functional design Q8 | One vault-root variable (rejected in Q8) |

## Constraints carried forward

- Korean text is never sliced by bytes in Rust; truncation uses character boundaries (project rule).
- Shared regexes stay in the existing lazily initialised statics; any new embed check reuses the existing transclusion pattern and fence-aware helper.
- `CLAUDE.md` records removed artifacts and codes (`homepage/`, PUB002, HP001–HP004) and the new PUB008/PUB009, exit 2 and the summary line (contract ownership rule). Its stale "Astro 6" line is follow-up F5 and out of scope.
