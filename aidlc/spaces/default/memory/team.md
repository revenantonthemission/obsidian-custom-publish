# Team-Level Rules

> This team's affirmed practices and corrections. Loaded after `org.md` as
> strict-additive guidance; contradictions with broader policy are rejected.
> Populated by the practices-discovery affirmation gate. Edit at the gate,
> not directly.

## Way of Working

- `develop` is our trunk. Every piece of work merges into it, and it is the branch that ships: the nightly Jenkins job builds and deploys `origin/develop`.
- Each piece of work, one phase at a time, gets its own short-lived branch off `develop`. It merges back with a merge commit (`git merge --no-ff`, with git's default `Merge branch '<name>' into develop` message), even when the branch holds a single commit. We do not squash.
- `main` is a milestone marker, not a working branch. At milestones the maintainer merges `develop` into `main` by hand. Nobody commits to `main` directly, and nothing builds or deploys from it.
- Direct commits to `develop` are allowed only for CI changes, documentation and urgent small fixes; everything else goes through a branch. Hotfixes count as urgent small fixes on `develop`, and we never branch from `main`.
- Branch names follow `<type>/<topic>`, with `feature`, `fix` or `chore` as the type. An optional prefix may name the tool that drove the work, such as `codex/` (`codex/feature/infra-engineer-portfolio`). AI-DLC Construction branches keep the tool's own `bolt-<id8>_<slug>` names.
- AI-DLC Construction worktrees start from `develop` and merge back into `develop` with a merge commit: base `develop`, target `develop`, strategy `merge`. Hotfix work uses the same mapping, because nothing branches from `main`.
- As soon as a branch has merged, we delete it and remove its worktree, if it has one. Session worktrees live under `.claude/worktrees/` and AI-DLC Bolt worktrees live under `.aidlc/worktrees/`. Neither is ever committed.
- Feature branches stay local. Only `develop` and `main` live on `origin`, and we do not use pull requests.
- Commit messages use `<type>: <description>` with the types `feat`, `fix`, `docs`, `chore`, `ci`, `refactor` and `test`. The description is written in Korean, in declarative `…합니다` form.
- One maintainer owns the repository. They write the content, approve the profile facts and carry out every human review gate.

## Walking Skeleton

- Our walking-skeleton stance is scope-dependent: we follow the active scope's skeleton setting instead of one fixed answer.
- We skip the walking skeleton for single-surface work: bug fixes, refactors and UI redesigns. The `bugfix`, `refactor` and `ui-redesign` scopes declare `skeleton: off`.
- We use it when work is split into several separately built units, as in scopes that declare `skeleton: on` such as `feature`. The first unit is then the smallest working slice through preprocess, site build and the existing test suites. It is verified with the command the maintainer has authorized, and the maintainer approves it before any other unit starts.

## Testing Posture

- **Methodology**: tdd
- **Methodology evidence**: The maintainer chose test-first development in the practices interview (Question 4, answer B). It matches the failing-test-first plans of March–April 2026 and the maintainer's global agent rules, and it replaces the build-first order of the July 2026 work.
- **Ordering**: For each behaviour, write a failing test first, implement until it passes, refactor, and run the full existing suite before committing; for UI work, the failing tests are the Playwright browser and accessibility acceptance checks for the pages being changed.
- The existing suites stay green on every change, and Jenkins runs them before every nightly deploy. They are `cargo test --release` (preprocessor unit, integration and proptest suites), `npm run test:unit` (Vitest examples and the obligation map) and `npm run test:pbt` (seeded fast-check properties).
- Rust tests run against the real fixture vault in `fixtures/vault/`, never against mocks. The site's unit suite builds the site, so `content/` and the copied JSON files must exist first. `just preprocess` creates them, as do the fixture steps of the Jenkins Verify stage.
- A bug fix starts with a failing test that reproduces the defect, and that test stays as the regression test.
- When a property test finds a shrunk counterexample, we fix the defect and keep the counterexample as a permanent example regression next to the unchanged property.
- Each UI change adds Playwright checks for the pages it touches. These are axe accessibility scans (WCAG 2.2 AA tags) at 320, 768, 1024 and 1440 px wide, in light and dark themes, plus a reduced-motion check. We do not keep screenshot comparison baselines.
- Jenkins does not run every check, so before merging UI work we run the rest locally:
  - `npx astro check`
  - `just crossunit`, the JavaScript-off smoke test and link sweep over a built site
  - the Playwright browser checks, including `npm run test:e2e` when the profile routes change
- Some files are subjects of the human 16-state accessibility review: `site/src/styles/global.css`, `BaseLayout.astro`, `Header.astro`, `MobileNav.tsx`, `navigation.ts`, `site/package.json` and everything under `site/src/styles/profile/`, among others. Changing them invalidates the review record. For a large change such as a redesign, the maintainer redoes the review once, after the change settles, not after every merge.
- We report test coverage but enforce no minimum percentage.

## Guard Policy

<!-- Affirmed by the team. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless project.md or the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

- We deploy `develop` to production every night, with no staging environment and no approval step, so pushing `develop` is the release. The Jenkins job `obsidian-blog-develop` (cron `H 0 * * *`, Jenkins on 127.0.0.1:8081) checks out `origin/develop`. It runs Install, Verify, Preprocess, Build Site and Deploy.
- The Verify stage is the production gate. A failing Rust, unit or property suite stops the run before anything is deployed.
- The nightly run is also the daily content publish. It preprocesses the real vault folder `Areas/Notes` with `--stamp-published`, which writes missing `published` dates back into the notes. Then it rebuilds the whole site.
- Deploy copies `site/dist/` into the web root `~/Sites/obsidian-blog` with `rsync -a --delete`. The launchd service `dev.rvnnt.blog` serves the new files at once; it runs the Node static server `site/scripts/local-server.mjs` on port 8080. The Cloudflare Tunnel `obsidian-blog` (launchd `dev.rvnnt.tunnel`) publishes them at https://rvnnt.dev. Running the job with `RUN_DEPLOY` unchecked gives a validation-only run.
- Every deploy is followed by an HTTP 200 check on `/` and on one post.
- Rollback is a revert on `develop` followed by a rebuild, through a manual Jenkins run or `just deploy`. Releases are not tagged, and no previous build is kept.
- `just deploy` runs the same preprocess (including the vault date stamping), build and rsync from whatever is checked out locally. So it is run by hand only from `develop`, and only with the maintainer's go-ahead.
- The PDF résumé ships separately, through the human-reviewed `npm run resume:pdf -- --prepare` and `--promote` transaction. CI never runs it.

## Code Style

- Rust changes must pass `cargo fmt --check`: default `rustfmt` style, edition 2024.
- The site has no formatter or linter yet. Prettier comes after the redesign, and ESLint and Stylelint may follow later. Until then we match the style of the file being edited: two-space indentation and semicolons everywhere, single quotes in `site/src/lib` and the config files, and double quotes in the islands.
- TypeScript runs in strict mode (`astro/tsconfigs/strict`, Preact JSX), and `npx astro check` is the type check.
- The site uses npm and npx, which the Justfile and the Jenkinsfile depend on.
- Naming:
  - Rust modules and functions use `snake_case`.
  - TypeScript functions and variables use `camelCase`.
  - Types and components use `PascalCase` (`Header.astro`, `ThemeToggle.tsx`).
  - Constants use `UPPER_SNAKE_CASE`.
  - `.mjs` scripts, stylesheets and CSS classes use kebab-case.
  - Color tokens use the `--c-` prefix (`--c-text-muted`, `--c-accent`).
- Test files are named by kind: `*_test.rs` or topic-named files in `preprocessor/tests/`, `*.test.ts` for unit tests, `*.pbt.test.ts` for properties and `*.spec.ts` for Playwright.
- Errors fail closed with coded diagnostics (`PUB001`–`PUB007`, `HP001`–`HP004` and coded tooling errors). Data is immutable (`readonly`, `Object.freeze`), and generated output is deterministic (sorted maps).
- Comments explain why, and they cite rule or requirement IDs.
- New and changed frontend code follows the maintainer's web rules: design tokens as CSS custom properties, motion only on `transform` and `opacity`, semantic HTML first, and files under 800 lines.
- The repository `CLAUDE.md` records further pitfalls, which we follow when editing the affected files:
  - ES5-only `<script is:inline>` blocks in `BaseLayout.astro`
  - `is:global` styles for `set:html` content
  - `alt=""` for decorative images
  - shared `LazyLock` regexes in `syntax.rs`
  - fence-aware transforms
## Forbidden

<!-- Team-specific forbidden patterns -->

## Mandated

<!-- Team-specific mandates -->

## Corrections

<!-- Self-learning loop appends here. -->
