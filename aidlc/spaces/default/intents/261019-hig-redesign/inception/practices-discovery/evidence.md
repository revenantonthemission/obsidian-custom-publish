# Practices Discovery Evidence

This file records what the release-engineering lead inspected, what it inferred and what the maintainer decided in the practices-discovery stage of intent `261019-hig-redesign`. The run was lead-only, with no support reviewers and no contribution files. The repository was inspected read-only at commit `265b38a9877c9640cbe8af3216481962238ffe48` on 2026-10-19. The maintainer then answered the interview in `aidlc/spaces/default/intents/261019-hig-redesign/inception/practices-discovery/practices-discovery-questions.md`, and the lead integrated the answers on 2026-10-20 (engine time `2026-10-20T00:14:35Z`, same commit).

## Upstream Reverse-Engineering Artifacts

| Artifact | What this stage took from it |
|---|---|
| `aidlc/spaces/default/codekb/obsidian-blog/code-structure.md` | Repository layout, file classification, design tokens and the `--c-` prefix, and code patterns: fail closed, branded types, immutability, determinism, shared syntax and Astro conventions. Also the generated files. |
| `aidlc/spaces/default/codekb/obsidian-blog/technology-stack.md` | Languages and toolchains (Rust edition 2024, TypeScript strict), testing tools and their exact pins, the build, delivery and hosting table, and the note that version bumps move review digests. |
| `aidlc/spaces/default/codekb/obsidian-blog/dependencies.md` | External CLIs (`mmdc`, `d2`, `typst`, `git`, `just`, `rsync`, `cloudflared`), external services, the site's dependency on the preprocessor's `content/` output, and dependency risks. |
| `aidlc/spaces/default/codekb/obsidian-blog/code-quality-assessment.md` | Test inventory and counts, the absence of coverage tooling, linters and formatters, the Jenkins stages, the verification gates, technical debt TD-01, TD-02, TD-03 and TD-20, and the branch and worktree inventory. |
| `aidlc/spaces/default/codekb/obsidian-blog/architecture.md` | KD-7 (self-hosting on one Mac behind Cloudflare Tunnel), KD-8 (evidence-bound verification with human gates) and the daily-publish sequence. |
| `aidlc/spaces/default/codekb/obsidian-blog/business-overview.md` | Single-maintainer operating model, daily auto-publish, embedded business rules (publication boundary, truthful profile, accessibility as a release gate), and the recorded conflict between git flow and trunk-based development. |

The same folder also holds `component-inventory.md` and `api-documentation.md`. This stage did not read them, because they cover components and routes rather than ways of working.

## Interview Decisions

Source: `aidlc/spaces/default/intents/261019-hig-redesign/inception/practices-discovery/practices-discovery-questions.md`.

| Question | Answer | Effect on the artifacts |
|---|---|---|
| Q1 Trunk branch and merging | A | `develop` is the trunk. Branches merge back with merge commits (`--no-ff`). `main` stays a milestone marker, merged from `develop` by hand. Construction worktrees use base `develop`, target `develop` and strategy `merge`. |
| Q2 Branch and worktree after merge | A | A branch is deleted, and its worktree removed, as soon as it merges. |
| Q3 Walking skeleton | A | Scope-dependent stance: skip it for single-surface work (bug fixes, refactors, UI redesigns), and use it when work is split into several separately built units. |
| Q4 When tests are written | B | `Methodology: tdd`, with a test-first `Ordering`. This replaces the draft's `test-after`. |
| Q5 Checks for blog pages | A | Each UI change adds Playwright checks for the pages it touches. They are axe scans at 320, 768, 1024 and 1440 px, in light and dark themes, plus a reduced-motion check, with no screenshot baselines. |
| Q6 How releases reach the live site | A | Nightly deploy of `develop` with no staging and no approval step; pushing `develop` is the release. |
| Q7 Formatters and linters | A | `cargo fmt --check` is enforced now. Prettier for the site comes after the redesign, and ESLint and Stylelint may follow later. |
| Q8 Hard rules | C (picked one by one) | 7 rules kept (2 mandated, 5 forbidden) and 8 dropped (see the next section). |
| Q9 Smaller points | A (accept all) | The draft's suggestions all became practice:<br>- direct commits only for CI, docs and urgent small fixes<br>- `<type>/<topic>` branch names with an optional tool prefix<br>- `<type>: <description>` commit messages in Korean<br>- coverage reported, no minimum<br>- `astro check`, `just crossunit` and browser checks run locally before merging UI work<br>- the 16-state review redone once, after the redesign settles<br>- rollback by revert and rebuild, with an HTTP 200 check on `/` and one post after each deploy<br>- `just deploy` only from `develop`, with the maintainer's go-ahead<br>- the maintainer's global web rules for all new and changed frontend code |
| Q10 Framework defaults file | B | `org.md` stays as it is. The practices recorded here apply to this repository (see "Deliberate Divergence From Framework Defaults"). |

## Hard Constraints: Kept and Dropped

| Candidate | Source | Outcome |
|---|---|---|
| Fix a shrunk property-test counterexample, then keep it as a permanent example regression | `site/README.md` (PBT rules) | Kept (Mandated) |
| Refer to color tokens by their `--c-` names | `CLAUDE.md` ("Never use unprefixed names") | Kept (Mandated) |
| Never start Jenkins with `brew services start jenkins` | `CLAUDE.md` (Ports, 2026-08-29 incident) | Kept (Forbidden) |
| Never pile several phases onto one feature branch | `CLAUDE.md` (Git Flow) | Kept (Forbidden) |
| Never commit nested worktree checkouts such as `.claude/worktrees/` | `.gitignore:25-26` ("never commit them") | Kept (Forbidden) |
| Never run the preprocessor against the whole vault (only `Areas/Notes`) | `CLAUDE.md` (Vault Path) | Kept (Forbidden) |
| Never slice Korean text by bytes in Rust (use `char_indices()`) | `CLAUDE.md` (Rust pitfalls) | Kept (Forbidden) |
| Keep Jenkins on 127.0.0.1:8081 (check the plist; set the port again after `brew upgrade jenkins`) | `CLAUDE.md` (Ports) | Dropped. The Deployment practice still names Jenkins on 127.0.0.1:8081. |
| Update the Node path in the `dev.rvnnt.blog` LaunchAgent plist | `CLAUDE.md` (Local Serving) | Dropped. It stays documented in `CLAUDE.md` only. |
| ES5-only `<script is:inline>` blocks in `BaseLayout.astro` | `CLAUDE.md` (Astro pitfalls) | Dropped. The Code Style practice still follows it as a recorded pitfall. |
| `LazyLock` regexes in `syntax.rs` and fence-aware transforms | `CLAUDE.md` (Rust pitfalls) | Dropped. The Code Style practice still follows it as a recorded pitfall. |
| Permission before push, merge, PR, deploy or vault writes | `site/README.md` (deployment boundary) | Dropped. The narrower accepted practice remains: `just deploy` runs only with the maintainer's go-ahead (Q9). |
| No agent-written human-gate records and no replacing `resume.pdf` | `site/README.md`; counter-signal commit `f8e2ca2` | Dropped. The Deployment practice still says the PDF ships only through the human-reviewed `resume:pdf` transaction. |
| Never use bun | `CLAUDE.md` (Astro pitfalls) | Dropped. The Code Style practice records that the site uses npm and npx. |
| No retries, `endOnFailure` or `fc.gen()` in property tests | `site/README.md` (PBT rules) | Dropped. It stays documented in `site/README.md` only. |

## Deliberate Divergence From Framework Defaults

The maintainer chose to leave `aidlc/spaces/default/memory/org.md` unchanged (Q10, answer B). The team practices below therefore diverge from it on purpose, and they apply to this repository:

| Area | Framework default in `org.md` | Affirmed team practice |
|---|---|---|
| Way of Working | Trunk-based on `main`; Construction worktrees use base `main` and target `main`; Bolt branches are squash-merged into `main`. | `develop` is the trunk. Branches merge with `--no-ff` merge commits, and `main` is a milestone marker merged from `develop` by hand. Construction worktrees use base `develop`, target `develop` and strategy `merge`. |
| Deployment | Deploy on merge to staging; production deploys need a separate manual approval. | Nightly deploy of `develop` straight to production, with no staging and no approval step; pushing `develop` is the release. |
| Testing Posture | `test-after` when nothing is affirmed; feature-type scopes add an 80% line-coverage floor. | `tdd`, with coverage reported and no minimum enforced. |
| Code Style | A linter runs in CI before merge. | Staged tooling: `cargo fmt --check` now, Prettier after the redesign, and ESLint and Stylelint later. No linter runs in CI yet. |

The `org.md` text still reaches every later stage's rule bundle. Where one practice must be chosen, the narrower layer wins:

- The worktree dispatch reads `project.md`, then `team.md`, then `org.md`, and stops at the first non-empty section (`.claude/knowledge/aidlc-shared/rules-reading.md` §3).
- The Testing Posture resolver selects the project layer, else the team layer, else the org layer. It checks only project against team, so a team `tdd` is not a conflict with the org `test-after` default.

## Repository Files and Commands Inspected

- `CLAUDE.md`: Git Flow, build commands, local serving, the Jenkins port incident of 2026-08-29, the Rust and Astro pitfalls, and the testing notes.
- `Jenkinsfile`, `Justfile`, `site/package.json`, `preprocessor/Cargo.toml`.
- `site/vitest.config.ts`, `site/vitest.pbt.config.ts`, `site/playwright.config.ts`, `site/playwright.crossunit.config.ts`, `site/tsconfig.json`.
- `.gitignore` and `site/README.md`. The README covers the stable commands, PBT replay rules, the three human gates, the generated-file boundary and the deployment boundary.
- The opening lines of `site/src/lib/navigation.ts`, `site/src/islands/ThemeToggle.tsx` and `site/src/styles/global.css`, read as samples of formatting style.
- `docs/plans/` and `docs/superpowers/plans/`, searched only for test-first steps.
- Directory listings of the repository root, `site/`, `preprocessor/`, `site/tests/`, `site/tests/e2e/`, `preprocessor/tests/` and `docs/`.
- Confirmed absent: `.github/`, and every Prettier, ESLint, Stylelint, rustfmt, clippy or EditorConfig configuration file, at the root, in `site/` and in `preprocessor/`.
- Command `cargo fmt --manifest-path preprocessor/Cargo.toml --check`: no output and exit 0, so the Rust sources already match default `rustfmt` style.
- Read-only git commands: `branch -a -vv`, `worktree list`, `remote -v`, `tag --list`, `log` (first-parent and range queries), `rev-list --count`, `merge-base`, `rev-parse <commit>^{tree}`, `show -s`, `show --stat`, `status --short` and `check-ignore -v`.
- The interview file `practices-discovery-questions.md`.

## Git History and Branch Facts

| # | Fact | Evidence |
|---|---|---|
| G1 | `develop` is the integration trunk. All feature merges land on it, and Jenkins builds and deploys `origin/develop`. | `git log --first-parent develop`; `CLAUDE.md` ("job `obsidian-blog-develop` … builds origin/develop") |
| G2 | Feature branches merge with `--no-ff`, even when a fast-forward was possible. All six recent single-commit branches sat directly on the `develop` tip they merged into, so each could have fast-forwarded. | Merge commit, then branch commit and its parent: `74f2079`/`2153bc9` (parent `d1cb444`), `35b4c6d`/`85a5431` (`d678633`), `54a9081`/`eace6fd` (`48ddc54`), `15321f6`/`ee8e8d7` (`aafcc3a`), `a3403f8`/`6dbc290` (`712bbe3`), `265b38a`/`d2884f8` (`5df7e25`). Each parent equals the merge commit's first parent (`git show -s --format=%p`). `CLAUDE.md`: "Feature branches per phase off `develop`, `--no-ff` merges back" |
| G3 | Merge messages are git's default `Merge branch '<name>' into develop`. In March 2026 they were custom `merge: …` subjects. | `git log --first-parent develop` |
| G4 | Direct commits on `develop` are common. Since 2026-07-01 its first-parent line has 19 merges and 14 direct commits, for example `e72a0bd hotfix: …`, `aafcc3a ci: …`, `1f62651 ci: …` and `5df7e25 feat: …`. | `git rev-list --count --first-parent --merges/--no-merges --since=2026-07-01 develop` |
| G5 | Branches are short-lived (table below). | `git log --reverse <first-parent>..<branch tip>` per merge |
| G6 | `main` is a promotion marker. Apart from its first two commits (2026-03-15), every first-parent commit on `main` is a merge of `develop`: 8 merges from 2026-03-17 to 2026-09-27. | `git log --first-parent main` |
| G7 | `main` has 4 commits that `develop` lacks: `323baa1`, `67c516e`, `f52343a` and `23e08e6`. All 8 merges on `main` have exactly the tree of the `develop` commit they merged, so `main` never diverges in content. `develop` has 2 commits that `main` lacks (`d2884f8`, `265b38a`). The merge base is `5df7e25`. | `git rev-list --left-right --count main...develop` returns `4 2`. `git rev-parse <commit>^{tree}` matches each merge with its `develop` source: `ee657f2`/`9f38c57`, `2373faf`/`8e70106`, `367bbc5`/`ba061e6`, `24ae762`/`acafecd`, `323baa1`/`9022826`, `67c516e`/`700766c`, `f52343a`/`d1cb444`, `23e08e6`/`5df7e25`. `git merge-base main develop` |
| G8 | `develop` last absorbed `main` in `67f70a4` ("chore: reconcile develop with main", 2026-07-23). | `git log --first-parent develop` |
| G9 | Only `develop` and `main` exist on the remote, and `origin/HEAD` points to `origin/main`. Local `develop` is 2 commits ahead of `origin/develop` (`d2884f8` and `265b38a` are unpushed, so they are not live). The remote is `git@github.com:revenantonthemission/obsidian-custom-publish.git`. | `git branch -a -vv`; `git remote -v` |
| G10 | No tags exist, so releases are not versioned. | `git tag --list` (empty) |
| G11 | No pull-request workflow is visible. Feature branches are never pushed, and the merge commits carry git's local default messages rather than GitHub's `Merge pull request #N`. | G3, G9 |
| G12 | Branch naming: `feature/<topic>` from March to August 2026 (`feature/phase1-scaffolding`, `feature/local-serving`). `codex/<type>/<topic>` from July to September 2026 (`codex/feature/…`, `codex/fix/…`, `codex/chore/…`). One outlier: `codex/resume-product-engineer`. | `git branch -a -vv` |
| G13 | There are 31 local branches. 28 are merged into `develop` and still present. Two are unmerged: `codex/chore/aidlc-scaffolding` (10 commits, branched from `main` at `24ae762`, including the mermaid puppeteer fix `9e1c203`) and `main` (G7). Some merged branches were deleted after merging, for example `feature/graph-ux`, `feature/wider-layout`, `feature/extended-markdown`, `feature/markdown-abbr-cjk` and `feature/hub-child-auto-dates`. | `git branch -a -vv`; first-parent merge subjects; `git show -s 9e1c203` |
| G14 | There are 4 worktrees. The main checkout is on `codex/feature/infra-engineer-portfolio` at `265b38a`. Three secondary worktrees hold merged branches: `../obsidian-blog-u1-nfr` (`codex/fix/diagram-render-gate`, 73 commits behind `origin/develop`), `.claude/worktrees/u2-home-boundary` and `.claude/worktrees/u3-quality-gates`. Their contents were not opened. | `git worktree list` |
| G15 | `.claude/worktrees/` is ignored (`.gitignore:26`, with the comment "never commit them"). `.aidlc/worktrees/`, where AI-DLC Bolt worktrees go, is not ignored. | `git check-ignore -v` |
| G16 | Commit messages use conventional types: `feat`, `fix`, `docs`, `chore`, `ci`, `refactor` and `test`, plus one `hotfix:` (`e72a0bd`) and the early `merge:`. Descriptions have been in Korean since July 2026 and were in English before. | `git log --all --since=2026-07-01 --format=%s` |
| G17 | The working tree at discovery has uncommitted infra-engineer portfolio work: 7 site files modified or deleted, plus the untracked `docs/portfolio/infra-engineer/` and `site/tests/e2e/portfolio-roles.spec.ts`. The deletion of the earlier `aidlc-docs/` record is staged, and the AI-DLC install is untracked. | `git status --short` |

Branch lifetimes (times are +09:00). Commit times show only when work was committed; time spent before the first commit is not visible.

| Branch | Commits | First commit | Merged into `develop` | Span |
|---|---|---|---|---|
| `codex/feature/resume-profile-experience` | 37 | 2026-07-25 16:10 (`a885470`) | 2026-07-26 22:54 (`f3b7cf1`) and 2026-07-28 01:30 (`b656bb0`) | about 2.4 days |
| `codex/feature/resume-home-boundary` | 20 | 2026-07-28 13:10 | 2026-07-29 01:24 (`50937d9`) | about 12 hours |
| `codex/feature/resume-quality-gates` | 18 | 2026-07-29 14:27 | three merges, the last at 2026-07-30 17:08 (`d1cb444`) | about 27 hours |
| `feature/local-serving` | 1 | 2026-08-17 19:59:58 | 20:00:03 (`74f2079`) | 5 seconds |
| `feature/portfolio-docsuri` | 1 | 2026-08-26 16:09:18 | 16:11:22 (`35b4c6d`) | about 2 minutes |
| `feature/graph-ux` | 1 | 2026-08-29 16:14:00 | 16:14:02 (`54a9081`) | 2 seconds |
| `codex/feature/kakaopay-data-platform-portfolio` | 1 | 2026-09-20 19:04:20 | 19:04:20 (`15321f6`) | same second |
| `codex/feature/portfolio-data-ai-rescope` | 1 | 2026-09-23 12:29:53 | 12:29:57 (`a3403f8`) | 4 seconds |
| `codex/resume-product-engineer` | 1 | 2026-09-28 11:45:09 | 11:45:31 (`265b38a`) | 22 seconds |

## CI, Deployment and Hosting Facts

- The `Jenkinsfile` is a declarative pipeline with the trigger `cron('H 0 * * *')` and the boolean parameter `RUN_DEPLOY` (default `true`, "Uncheck for a validation-only run"). Its stages:
  - Checkout
  - Install: `npm ci` and `cargo build --release`, in parallel
  - Verify: `cargo test --release`, a fixture-vault preprocess, copying the JSON files, `ensure-fixture-content.mjs`, `npm run test:unit` and `npm run test:pbt`. Proptest regressions are archived on failure.
  - Preprocess: the real vault with `--stamp-published`, preferring chrome-headless-shell for Mermaid
  - Build Site: `npx astro build`
  - Deploy: `rsync -a --delete site/dist/ "${WEB_ROOT}/"`, only when `RUN_DEPLOY` is true
- The `post` block only echoes a message. There is no staging environment, no manual approval step and no post-deploy check in the Jenkinsfile.
- `Jenkinsfile:17-24` hardcodes defaults for `WEB_ROOT`, `VAULT_PATH` and `PUPPETEER_EXECUTABLE_PATH`, which `BLOG_WEB_ROOT`, `OBSIDIAN_VAULT_PATH` and the environment can override.
- The Jenkins job's name, its schedule against `origin/develop` and its location on 127.0.0.1:8081 come from `CLAUDE.md`. The job configuration itself lives outside the repository and was not inspected.
- `Justfile` recipes:
  - `build`, `preprocess` (fixture vault by default), `dev` and `site-build`
  - `deploy`: `deploy-preprocess`, which runs `--stamp-published` against the real vault, then `site-build`, then rsync into `web_root`
  - `serve`, `test` (`cd preprocessor && cargo test`) and `crossunit`
  - `d2-watch` and `typst-render`
- `just deploy` deploys whatever is checked out.
- Hosting, all outside the repository and described by `CLAUDE.md`:
  - The launchd service `dev.rvnnt.blog` serves `~/Sites/obsidian-blog` on port 8080 with `HOST=0.0.0.0`.
  - The Cloudflare Tunnel `obsidian-blog` runs under launchd `dev.rvnnt.tunnel`.
  - Logs go to `~/Library/Logs/`.
  - AWS was decommissioned on 2026-08-17.
- `site/README.md` sets a deployment boundary: no command in `site/` deploys. Its opening note says these actions need separate, explicit permission ("별도의 명시적 권한을 요구한다"), and its "배포 경계" section lists them: S3 or CloudFront work, Terraform, AWS or DNS changes, the Jenkins Deploy job, Obsidian vault writes, and `git push`, merges and pull requests.
- The PDF résumé is released only through `npm run resume:pdf -- --prepare` and `--promote` with a human review record. The README says CI never calls it.
- There are no GitHub workflows.

## Test and Quality Tooling Facts

- Rust:
  - 33 inline unit tests and 77 integration tests in 16 files.
  - Proptest suites cover the publication catalog, transform and output, with a tracked `publication_output.proptest-regressions` file.
  - The tests use `fixtures/vault/`.
  - `d2_test.rs` needs the `d2` CLI; the Typst tests skip when `typst` is absent.
  - Source: `aidlc/spaces/default/codekb/obsidian-blog/code-quality-assessment.md`
- Site:
  - Vitest unit tests: 22 files, about 300 tests per the 2026-09-28 project record.
  - Property tests: 6 files with 37 properties.
  - Obligation map: 135 IDs.
  - Playwright: 10 end-to-end spec files.
  - `just crossunit` runs with JavaScript disabled on port 4326.
  - Source: the same artifact and the site configuration files.
- Vitest runs in a `node` environment with `retry: 0`, `testTimeout: 30_000` and `maxWorkers: '50%'`, tuned for nightly CI load. The property config uses `fileParallelism: false`, `retry: 0` and `testTimeout: 60_000`.
- Playwright requires a loopback `PROFILE_BASE_URL` and uses `forbidOnly: true`, `retries: 0` and `workers: 1`. Its five projects are chromium, firefox-focused, webkit-focused, homepage-firefox and homepage-webkit. Traces and screenshots are kept only on failure.
- axe runs through `@axe-core/playwright` 4.12.1 with the WCAG 2.2 AA tags. No test compares screenshots, and blog routes have no browser or accessibility checks yet.
- No coverage tooling and no lint or format configuration exist. `npx astro check` is available but sits in no script and no CI stage; the 2026-09-28 record shows 0 errors.
- The three human gates are fact approval, the manual web accessibility review and the exact-SHA PDF review (`site/README.md`). The tracked accessibility record has the old 12-state shape, while the contract requires 16 states, so `npm run test:e2e` is red by construction (TD-01).
- `site/README.md` sets the PBT rules:
  - Seeds are always printed.
  - Focus works only through `PBT_FILE` and `PBT_FOCUS`.
  - Retries, `endOnFailure` in normal runs and `fc.gen()` are forbidden.
  - A shrunk defect becomes a permanent example regression, and the original property stays.
- Evidence on test order before the interview:
  - The March–April 2026 plans prescribe "Write the failing test(s)" first: `docs/plans/2026-03-15-obsidian-publish-replacement-plan.md:241`, `docs/plans/2026-03-17-publish-parity-plan.md:67`, `docs/superpowers/plans/2026-04-10-hub-child-auto-dates.md:31` and `docs/superpowers/plans/2026-04-10-theme-transition.md:143-198`.
  - The July 2026 intent committed its features first and its tests in later plan steps (`5b9ca2a` Steps 7–9, `d04b2a3` Step 12, `323ff00` Step 13).
  - The maintainer settled the order in Q4 (test-first).
- The maintainer's global agent rules, outside the repository, say two things:
  - `~/.claude/rules/ecc/common/testing.md` makes test-driven development mandatory, with an 80% coverage minimum.
  - `~/.claude/rules/ecc/web/testing.md` asks for visual regression at four widths in both themes, plus accessibility and reduced-motion checks.

  The team adopted the test-first order and the accessibility checks, but chose no coverage minimum and no screenshot baselines.

## Code Style Signals

- Rust matches default `rustfmt` (`cargo fmt --check` is clean). The 2026-04-14 audit recorded zero clippy lints.
- TypeScript uses two-space indentation and semicolons. Quotes differ by area: single quotes in `site/src/lib/navigation.ts` and the config files, double quotes in `site/src/islands/ThemeToggle.tsx`. That points to an unenforced convention, which Prettier is meant to settle after the redesign.
- CSS uses two-space indentation and section comments of the form `/* ── … ── */`. Color tokens carry the `--c-` prefix, but layout and typography tokens (`--radius`, `--max-width`, `--sidebar-width`, `--font-body`, `--font-code`) have none.
- Naming follows language idiom: Rust `snake_case`; TypeScript `camelCase` functions and `PascalCase` types and components; kebab-case `.mjs` scripts, stylesheets and CSS classes.
- Code patterns, from `aidlc/spaces/default/codekb/obsidian-blog/code-structure.md`: fail-closed coded diagnostics, branded types, `deepFreeze` and `readonly`, `BTreeMap` determinism, `LazyLock` regexes and comments that cite rule IDs.
- The maintainer's global style rules, outside the repository, now apply to all new and changed frontend code (Q9). `~/.claude/rules/ecc/common/coding-style.md` sets files of 800 lines at most. `~/.claude/rules/ecc/web/coding-style.md` asks for design tokens as CSS custom properties, compositor-friendly animation and semantic HTML first. Existing code departs from them in places: it animates `width` and `top`, and 13 modules exceed 800 lines (TD-07).

## Remaining Uncertainty

- **`.aidlc/worktrees/` is not ignored by git (G15).** The team says worktrees are never committed, but only `.claude/worktrees/` is ignored today. Bolt worktrees would show up as untracked nested repositories. This needs an ignore entry, or confirmation that the worktree tool excludes the folder, before Construction creates one.
- **`npm run test:e2e` stays red.** The stale 12-state accessibility record keeps it red until the maintainer redoes the 16-state review, which Q9 schedules once, after the redesign settles. Until then the local pre-merge browser checks cannot include a green `test:e2e`.
- **Prettier sequencing.** Prettier lands after the redesign. Reformatting review-subject files such as `global.css`, `BaseLayout.astro` and `site/package.json` invalidates the review record again. The open choice is to land Prettier before the one-time review, or to accept a second review.
- **The post-deploy HTTP 200 check has no runner.** The nightly deploy runs unattended at midnight, and the Jenkinsfile has no such step. The check needs a Deploy-stage step, which is a Jenkinsfile change outside this plan's skipped `ci-pipeline` stage, or a manual morning check.
- **`cargo fmt --check` is enforced only by convention.** No hook or Jenkins step runs it yet.
- **No coverage tool is configured yet.** "Coverage reported" needs a Vitest coverage provider and a Rust coverage tool before anything can be reported.
- **Coverage floor in future intents.** The framework default adds an 80% floor for feature-type scopes, while the team enforces no minimum. This intent is `bugfix`, which has no floor, so the question only arises for a future feature-scope intent.
- **Color-token naming in the redesign.** Any new color tokens must keep the `--c-` prefix (hard rule). The rule does not cover layout and typography tokens.
- **Cleanup preconditions for Q2.**
  - `develop` has 2 unpushed commits.
  - The main checkout holds uncommitted infra-engineer portfolio work, and the deletion of `aidlc-docs/` is staged.
  - The secondary worktrees were never opened.
  - `codex/chore/aidlc-scaffolding` is unmerged and carries the mermaid fix `9e1c203`, so the merged-only deletion rule does not decide its fate.
- **The pilot-route proposal was not asked.** Proving the new design on one route first is left to requirements analysis.

## Interpretations and Limits

- `main` is read as a promotion marker because its merges are tree-identical to `develop` (G7) and nothing builds or deploys from it. The maintainer confirmed this role in Q1.
- The 14 direct commits on `develop` are read as accepted practice, and Q9 now limits them to CI, docs and urgent small fixes.
- The maintainer's global agent rules were treated as stated preferences until the interview turned some of them into team practice (Q4, Q9).
- Not inspected:
  - the contents of the secondary worktrees
  - the Jenkins job configuration, the launchd plists and the cloudflared configuration (all outside the repository)
  - the lockfiles
  - the earlier `aidlc-docs/` record, now staged for deletion; only its commit subjects were used
  - `component-inventory.md` and `api-documentation.md`
- To keep the artifacts promotable, the lead also read:
  - the stage definition (`.claude/aidlc-common/stages/inception/practices-discovery.md`)
  - the `skeleton:` lines of the files in `.claude/scopes/`
  - the promotion and posture parsers in `.claude/tools/aidlc-state.ts`, `.claude/tools/aidlc-testing-posture.ts` and `.claude/tools/aidlc-lib.ts`
  - the stance values in `.claude/tools/aidlc-orchestrate.ts`

  None of these files was used as evidence of team practice.
