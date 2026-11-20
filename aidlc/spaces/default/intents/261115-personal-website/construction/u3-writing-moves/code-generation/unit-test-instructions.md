# Unit Test Instructions — U3 `u3-writing-moves`

## Framework and configuration

- **Unit and integration tests:** Vitest, through the site's existing `site/vitest.config.ts` (Astro's `getViteConfig`, `environment: 'node'`, `tests/unit/**/*.test.ts`, `testTimeout` 30 s). No new runner or dependency is added. Loop-back 3 added one `globalSetup` entry, `tests/unit/support/shared-build-setup.ts`: it sets a fresh run token for the shared default site build and removes that build when the run ends, and it builds nothing itself. `npm run test:coverage` uses the same configuration and still works; `npm run test:pbt` (`vitest.pbt.config.ts`) is unaffected.
- **Browser checks:** Playwright with the existing configurations:
  - `site/playwright.hig.config.ts` builds `site/dist` and serves it through the production server on 127.0.0.1:4329;
  - `site/playwright.crossunit.config.ts` runs with JavaScript off.

## Prerequisite (once per checkout)

The site's unit suite builds the site, so the fixture content must exist first:

```sh
just preprocess
```

## How to run THIS unit's tests

Every command is scoped to U3's own test files. Run each from `site/`.

**Runner check (before the first Red step), on an existing file:**

```sh
cd site && npx vitest run --config vitest.config.ts tests/unit/writing-lists.test.ts
```

**U3's Vitest files** — one command, exact paths:

```sh
cd site && npx vitest run --config vitest.config.ts tests/unit/tag-urls.test.ts tests/unit/redirect-table.test.ts tests/unit/legacy-redirects.test.ts tests/unit/local-server.test.ts tests/unit/publish-dist.test.ts tests/unit/legacy-redirects-build.test.ts tests/unit/astro-build-shared.test.ts
```

**U3's browser checks (HIG project)** — the specs whose old-address expectations U3 moves, plus its new checks:

```sh
cd site && npx playwright test --config playwright.hig.config.ts hig-pages.spec.ts hig-writing.spec.ts hig-search.spec.ts hig-profile.spec.ts hig-performance.spec.ts
```

**U3's JavaScript-off checks (crossunit project):**

```sh
just crossunit
```

`just crossunit` runs the link sweep and `crossunit.spec.ts`, the only spec the crossunit project matches.

## Test volume (Standard strategy)

| File | Component | Tests |
|---|---|---|
| `tests/unit/tag-urls.test.ts` | Address module | 8 |
| `tests/unit/redirect-table.test.ts` | Table grammar, loader, lookup | 16 |
| `tests/unit/legacy-redirects.test.ts` | Table writer | 8 |
| `tests/unit/local-server.test.ts` | Static server over HTTP | 10 |
| `tests/unit/publish-dist.test.ts` | Two-copy deploy script | 6 |
| `tests/unit/legacy-redirects-build.test.ts` | Built output (the run's shared default build) | 4 |
| `tests/unit/astro-build-shared.test.ts` | Shared default build helper (loop-back 3, U1-NFR6.6) | 7 |
| HIG specs and `support/hig.ts` | Moved pages, back link, HTTP redirects, request sets, axe | updated old-address expectations, plus new back-link, redirect, request-set and axe cases |
| `crossunit.spec.ts` | JavaScript-off moved routes | 3 new cases |

## Expected coverage targets

- **Project coverage.** The whole project's coverage is reported by Build and Test on the full suite of the assembled project (`npm run test:coverage`, v8, `.artifacts/coverage/`; Rust coverage with `cargo llvm-cov`), not by this unit's run. The configuration carries no threshold, because the team reports coverage but enforces no minimum (team.md), and this work does not add one. The maintainer confirmed on 2026-11-20, as a human-made requirement change, that this posture governs the scope's coverage floor.
- **This unit's own target.** Every new module — `tag-urls.mjs`, `redirect-table.mjs`, `legacy-redirects-integration.mjs`, and the redirect branch of `local-server.mjs` — is exercised by the files above. A unit-scoped coverage report for reference:

  ```sh
  cd site && npx vitest run --config vitest.config.ts --coverage tests/unit/tag-urls.test.ts tests/unit/redirect-table.test.ts tests/unit/legacy-redirects.test.ts
  ```

## Mocking and stubbing guidance

- **No mocks of the server.**
  - `local-server.test.ts` starts the real `scripts/local-server.mjs` as a child process. It never imports it, because the script listens at module scope.
  - **Port:** listen on port 0 with `node:net` on `127.0.0.1`, read the assigned port, close that listener, then pass the port in `PORT` with `HOST=127.0.0.1`. Never use 8080 (the live blog) or 4329 (the HIG server).
  - **Wait:** wait for the start-up line on the child's stdout before the first request.
  - **Teardown:** in `afterAll`/`afterEach`, kill the child and remove the temporary root, also on failure.
- **Injectable seams, not module mocks.**
  - `loadRedirectTable(tablePath, { readFile, stat })` takes its I/O as arguments, so `redirect-table.test.ts` passes counting stubs to observe reads.
  - `writeRedirectTable(outDir)` takes the output directory, so `legacy-redirects.test.ts` uses a temporary directory tree.
- **The deploy script:** `publish-dist.test.ts` runs `bash scripts/publish-dist.sh` against scratch directories under the OS temp dir. It never touches `~/Sites/obsidian-blog` and never runs `just deploy`, which stamps the real vault.
- **Built output:** `legacy-redirects-build.test.ts` reads `sharedDefaultBuild()` (`tests/unit/support/astro-build.ts`), never `site/dist`. Since loop-back 3 the default fixture site is built once per `vitest run`: the first caller builds it under the existing build lock into a folder keyed to the run token, and `hig-built-assets`, `hig-built-html`, `profile-presentation` and `legacy-redirects-build` all read that folder. They only read it; a test that needs to write into built output must use its own `buildSiteInto(outDir)` build. `writing-empty-build.test.ts` keeps `buildSiteInto` with its own `CONTENT_DIR_OVERRIDE` content tree.
- **The shared-build helper's own test:** `astro-build-shared.test.ts` passes a counting stub as the `builder` argument of `sharedDefaultBuild` and `buildSiteInto`, so it never runs Astro.

## Test data management

- **Fixtures:** the site is built from the fixture vault (`fixtures/vault/Notes`, `fixtures/vault/Pages`) through `just preprocess`. No fixture note is added. No fixture tag contains a dot, so the dotted key `node.js` is a synthetic page and rule written into the server test's temporary web root.
- **Clean-up:** every temporary directory is created with `mkdtemp` under the OS temp dir and removed in teardown. The shared default build (`astro-shared-build-<checkout>-<run token>` under the OS temp dir) is removed by the `globalSetup` teardown at the end of the run; a killed run's folder is never read by the next run (new token) and is deleted by a later run's setup once it is over 6 hours old.
- **Determinism:** the writer's output is checked byte-for-byte across two runs over the same temporary tree. No test depends on wall-clock time, except the deploy-script test's "mtime is newer than before" assertion, which sets the old table's mtime into the past first.
