# Integration Test Instructions — `261115-personal-website`

Test Strategy: **Standard** — key boundary tests and cross-unit interaction. All commands run from the repository root unless a `cd` is shown. Prerequisite for every site test: `just preprocess` (the site's unit suite builds the site, so `content/` must exist).

## 1. Boundaries under test

| # | Boundary | Producer → consumer | Units | Contract |
|---|---|---|---|---|
| B1 | Preprocessor CLI and `content/` tree | `obsidian-press` → Astro data layer (`site/src/lib/data.ts`) | U1 → U2, U3, U4 | C1, C2 |
| B2 | Post metadata → Writing lists | `content/meta/*.json` + manifest → `writing-lists.ts`, `/`, `/writing`, `/writing/all` | U1 → U2 | C2, `WR001` |
| B3 | Navigation model → chrome on every route, including U2's and U3's routes | `navigation.ts` → `Header.astro`, `MobileNav.tsx` | U4 → U2, U3 routes | C3 |
| B4 | Tag/graph address module → pages, layouts and the table writer | `tag-urls.mjs` → `/writing/*`, `PostLayout`, `HubLayout`, the build hook | U3 → U2 (`/writing` capsules, `/writing/all` back link) | C5 |
| B5 | Build output → redirect table → static server | `astro:build:done` → `dist/_redirects.json` → `local-server.mjs` | U3 | C4 |
| B6 | Build output → web root (two-copy deploy) | `publish-dist.sh` (pages first, table second) | U3 → deploy | C4, NFR5.25 |
| B7 | Assembled site without JavaScript, and its internal links | `site/dist` → Chromium with JS off; link sweep over every built page | U1–U4 | NFR3, AC7.1.3 |

## 2. Framework setup

No new framework (all four `tech-stack-decisions.md`):

| Runner | Config | Where it runs |
|---|---|---|
| `cargo test` | `preprocessor/` (temporary on-disk vaults, the fixture vault; never mocks) | Node-free, real file system |
| Vitest | `site/vitest.config.ts` (`environment: 'node'`, 30 s timeout) | **Node** — integration evidence only, never browser evidence |
| Vitest properties | `site/vitest.pbt.config.ts` (`PBT_RUNS`, `PBT_SEED`) | Node |
| Playwright HIG | `site/playwright.hig.config.ts`: builds the fixture site and serves it through the production server `scripts/local-server.mjs` on 127.0.0.1:4329 | **real browser engines: Chromium, Firefox, WebKit** |
| Playwright crossunit | `site/playwright.crossunit.config.ts`: `astro preview --ignore-lock` on 127.0.0.1:4326 | **Chromium with JavaScript disabled** |
| Playwright provider (`npm run test:e2e`) | `site/playwright.config.ts`, evidence-sealed | closed while the manual 16-state accessibility record is stale |

## 3. How to run

| Boundary | Command | What it proves |
|---|---|---|
| B1 | `cd preprocessor && cargo test --release` | CLI exit codes 0/1/2, notices, PUB008/PUB009, check-then-stamp, `pages/` + `assets/pages/` output, deterministic manifest (U1 NFR5.x, NFR4.4–4.6) |
| B1, B2, B3 | `cd site && npm run test:unit` (49 files) | `content-data.test.ts` (`WR001`, `getOrdinaryPosts`, and since `7b8aab7` the test-only override failing closed with `WR002` outside Vitest), `sync-public-assets.test.ts`, `link-sweep.test.ts`, `writing-lists.test.ts`; `writing-empty-build.test.ts` (an isolated build over an empty content tree through the test-only `CONTENT_DIR_OVERRIDE`: the `/writing` empty row, AC4.1.3); `writing-css-size.test.ts` (`writing.css` ≤ 3,072 B and free of single-page rules); `header-navigation-failure.test.ts` (since `bd3b57b`: `Header.astro` rendered through the Astro container throws `TypeError` on a failed navigation state, U4 NFR5.21) |
| B1 (site page embedding a post) | `cd preprocessor && cargo test --release --test publication_output` | an embedded post's image on a site page is unsupported: exit 0, the warning names the site page, no `assets/pages/<image>` is written (U1 BR5.2, repair `22e1468`) |
| B2, B3 | `cd site && npm run test:pbt` | writing-list total order and exactly-once membership (U2), navigation marker U1-P10 (U4) |
| B4, B5 | `cd site && npx vitest run --config vitest.config.ts tests/unit/tag-urls.test.ts tests/unit/redirect-table.test.ts tests/unit/legacy-redirects.test.ts tests/unit/legacy-redirects-build.test.ts` | one address owner; C4 grammar G1–G8; writer refuses duplicates, loops and missing targets; isolated build carries 12 rules and the grouped.css inline guard |
| B5 | `cd site && npx vitest run --config vitest.config.ts tests/unit/local-server.test.ts tests/unit/redirect-table.test.ts` | the real server as a child process on a port-0 free port: 301 + `Cache-Control: no-cache`, kept query, 400 for an encoded control byte then recovery, dotted tag key through the directory-index branch; a table whose `to` holds a lone surrogate answers 400 with no `Location`, then the server still answers 301 and 200 (the last-resort `catch`); `isHeaderValueSafe` refuses CR, LF, NUL, DEL and accepts tab, space and 0x80–0xff (U3 NFR5.22, repair `b9915d8`) |
| B5 (HTTP, shipped server) | `cd site && npx playwright test --config playwright.hig.config.ts hig-pages.spec.ts` | `/tags`, `/tags/`, `/graph`, `/graph/`, `/tags/<tag>`, `/tags/<tag>/` → 301 with `Location`; `/graph.json` a file; unknown tag 404; hostile query 400 (NFR6.16) |
| B6 | `cd site && npx vitest run --config vitest.config.ts tests/unit/publish-dist.test.ts` | mirror + delete, table replaced with a fresh mtime, no leftover tmp file, usage error; the ordering test (repair `d0ccdfd`) puts a failing `cp` first on the child's `PATH`, so the script stops after the mirror: the old table stays byte-identical, new pages are present, old pages are gone, no `.redirects.json.tmp` arrives, exit is non-zero. Removing either `--exclude` now fails it (U3 NFR5.25) |
| B3, B4, all routes | `cd site && npx playwright test --config playwright.hig.config.ts` | the whole HIG matrix in three engines: axe WCAG 2.2 AA at 320/768/1024/1440 px, light and dark, reduced motion, over `HIG_ROUTES` (incl. `/writing`, `/writing/all`, `/writing/tags`, `/writing/tags/<tag>`, `/writing/graph`); marker values; the bar holds exactly one link, to `/writing`, and at most one `aria-current` per surface (repair `bea8e2f`); 44 px targets; same-origin requests; CWV (Chromium); the `/writing` and `/writing/all` script request sets equal `/writing/tags` (repair `0f312eb`), and so do their inline `<script>` blocks, compared by count and sorted SHA-256 of their bodies (repair `b7efd85`, U2 review-03 R-06 Fixed); both in Chromium only |
| B7 | `just crossunit` | link sweep (only the declared fixture broken image may fail) plus 16 no-JS checks at 320×800 and 1440×900 |
| Coverage | `cd site && npm run test:coverage` | v8 line coverage over `src/**` and `scripts/**`, report in `site/.artifacts/coverage/` |

## 4. Coverage expectations

- **Coverage on the whole project:** the team reports coverage without enforcing a percentage (`team.md`), `site/vitest.config.ts` has no threshold, and the maintainer confirmed on 2026-11-20, as a human-made requirement change, that this posture governs the scope's coverage floor. Build and Test reports both figures on the full suite; no threshold is set, lowered or disabled.
- **Rust:** measured with `cargo llvm-cov` 0.9.1, installed globally on the maintainer's machine on 2026-11-20. From `preprocessor/`: `LLVM_COV=/opt/homebrew/opt/llvm/bin/llvm-cov LLVM_PROFDATA=/opt/homebrew/opt/llvm/bin/llvm-profdata cargo-llvm-cov llvm-cov --release --summary-only --json --output-path target/llvm-cov/coverage-summary.json`. The report lands in `preprocessor/target/llvm-cov/` (gitignored); the instrumented build directory is deleted afterwards, and the uninstrumented release binary is rebuilt before the verification command.
- **Coverage command side effect:** the unit-scoped reference command with `--coverage` (U3) writes to the same `site/.artifacts/coverage/` folder as the full-suite run, so run the full suite last when the full report is the evidence.
- **Known blind spots of the site figure:** `.astro` pages and components are rendered only inside builds and report 0 %; `scripts/local-server.mjs` runs only as a child process, which v8 coverage does not follow, so it reports 0 % although `local-server.test.ts` and the HIG suite exercise it over HTTP.
- **Standard volume:** 5–8 tests per changed component (soft guideline, `testing-guide.md`); see each unit's `unit-test-instructions.md` for the per-component counts.

## 5. Test data and environment

- Fixture vault only: `fixtures/vault/Notes` (17 posts, retired homepage note, deliberate broken image) and `fixtures/vault/Pages` (`About.md`, `Drafts/Now.md`, `.hidden.md`).
- The HIG runner adds the e2e fixture post (`scripts/crossunit/ensure-fixture-content.mjs`) and builds with `HOMEPAGE_TODAY_OVERRIDE=2025-08-13`, so "이번 주 글" holds 2 post rows plus the "모든 글 보기" row.
- Servers bind 127.0.0.1 only: 4329 (HIG), 4326 (crossunit), port-0 free ports (server Vitest). Never 8080 (the live blog).
- Temporary vaults, web roots and outputs are created with `mkdtemp` and removed in teardown. `writing-empty-build.test.ts` builds a whole site into a `u2-writing-empty-*` folder under the OS temp dir; a killed run can leave that folder behind (U2 review-02 R-07).
- Real-content measurements (U2 NFR1.7) use a private copy of `Areas/Notes` under the gitignored `preprocessor/target/`, built in a scratch worktree, never the real vault and never `deploy-preprocess`.
