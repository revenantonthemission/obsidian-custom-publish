# Unit Test Instructions — U1 `u1-publish-boundary`

## Framework setup

No new test framework or configuration. Existing runners:

- **Rust:** `cargo test` with the existing dev-dependencies (`tempfile`, `proptest`). CLI tests run the built binary through `env!("CARGO_BIN_EXE_obsidian-press")`. Real files only: the fixture vault `fixtures/vault/{Notes,Pages}` and temporary on-disk vaults, never mocks.
- **Vitest:** `site/vitest.config.ts`, plus the seeded fast-check setup for properties.
- **Playwright:** `site/playwright.hig.config.ts`. Its web server builds the fixture site via `scripts/hig/build-and-serve.mjs`.

## How to run this unit's tests

Run from the repository root. Every command is scoped to U1's test files.

1. Rust (after Step 3 the fixture paths are `fixtures/vault/Notes` and `fixtures/vault/Pages`):

   ```
   cd preprocessor && cargo test --release --test cli_boundary_test --test walker_test --test stamping_order_test --test publication_catalog --test publication_transform --test publication_output --test scanner_test
   ```

2. Fixture content for the site tests (needed before Vitest and Playwright; same inputs as Jenkins Verify):

   ```
   just preprocess
   ```

3. Vitest (unit):

   ```
   cd site && npx vitest run --config vitest.config.ts tests/unit/sync-public-assets.test.ts tests/unit/content-data.test.ts
   ```

4. Vitest (property): none remain for this unit. U1's homepage-composition module (`site/src/lib/homepage.ts`) and both of its tests (`tests/unit/homepage-composition.test.ts`, `tests/pbt/u2/homepage-composition.pbt.test.ts`) were deleted by U2 (commit `806c6ac`), when the homepage opening became U2's weekly card. The behaviour is now covered by U2's `tests/unit/writing-lists.test.ts` and `tests/pbt/u2/writing-lists.pbt.test.ts` (Build and Test loop-back 1).

5. Playwright (homepage W5 block, NFR1-b highlight, homepage and crossunit specs):

   ```
   cd site && npx playwright test --config playwright.hig.config.ts tests/e2e/hig-pages.spec.ts
   ```

The full gate (Step 16) is the recorded verification command. It is not a unit-scoped command and runs once, in Step 16 and in Build and Test.

## Expected coverage targets

- **Strategy (standard):** 5–8 tests per changed component.

  | Component | Tests |
  |---|---|
  | Folder guard | 8 |
  | Walker | 7 |
  | Pages scan and notices | 5 |
  | Catalog | 14 examples + 1 property |
  | Stamping order | 5 |
  | Link rendering | 7 |
  | Output | 12 examples + 1 property |
  | Asset sync | 5 |
  | Data layer | 6 |
  | Homepage | 5 Playwright, plus the axe matrix and the moved NFR1-b test |

- **Coverage:** the whole project's coverage is reported by Build and Test on the full suite (`npm run test:coverage` for the site; Rust coverage is reported with `cargo llvm-cov`). The team posture reports coverage without enforcing a percentage, so no threshold is set, lowered or disabled here. The maintainer confirmed on 2026-11-20, as a human-made requirement change, that this posture governs the scope's coverage floor.

## Mocking / stubbing guidance

- No mocks of the file system or the vault (team Testing Posture).
- CLI and catalog failure cases build temporary vaults with `tempfile::TempDir`. Symbolic-link cases create real links there (macOS), always pointing at targets inside the temporary tree.
- Vault-unchanged assertions hash every file before and after the run.
- The build date for the interim list is fixed with the existing `HOMEPAGE_TODAY_OVERRIDE`.

## Test data management

- **Fixture vault:**
  - `fixtures/vault/Notes/`: the existing 15 notes, including the retired `Fixture Homepage.md`, with `attachment/`.
  - `fixtures/vault/Pages/`: `About.md`, `attachment/portrait.png`, `Drafts/Now.md` and `.hidden.md`.
  - `Notes/Post With Formatting.md` holds the NFR1-b highlighted link.
- **Fixture images:** only the named fixture images are tracked. `.gitignore` keeps generated images under `fixtures/vault/Notes/attachment/` and `fixtures/vault/Pages/attachment/` untracked.
- **Temporary data:** temporary vaults and outputs are created per test and dropped automatically.
- **Performance baselines:** the Step 1 and Step 16 real-vault timings run on a temporary copy of `Areas/Notes`, so the vault is never stamped by a measurement.
- **Restoring content:** the HIG run rebuilds `content/` from fixtures. Afterwards `just preprocess` restores the same fixture content; real content is produced only by Jenkins or `just deploy`.
