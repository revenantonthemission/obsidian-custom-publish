# Practices Discovery Evidence

Re-run on a brownfield project. The affirmed baseline is `aidlc/spaces/default/memory/team.md` (five sections, affirmed 2026-10-20) and the `## Mandated`, `## Forbidden` and `## Corrections` sections of `aidlc/spaces/default/memory/project.md`. `aidlc/spaces/default/memory/org.md` holds the framework defaults (trunk `main`, squash merge, staging deploy on merge, test-after); the team has affirmed narrower practices for every topic, so no section falls back to them. Collaborators are off: the lead worked alone and no support contributions exist.

Lead: `aidlc-pipeline-deploy-agent`. Draft written 2026-11-15T15:42:35Z at commit `db7ecae`; integrated with the interview answers 2026-11-16T00:50:13Z at the same commit (HEAD `db7ecae13f9d90368ff32d1956c71f957753cfcd`, no new commits since the scan).

Participants: the lead only. It inspected every source below directly; nothing was inferred from a collaborator.

## Sources Inspected

### Reverse-engineering artifacts (2026-11-15, commit `db7ecae`)

| Artifact | Path | Used for |
|---|---|---|
| code-structure | `aidlc/spaces/default/codekb/obsidian-blog/code-structure.md` | Repository layout, naming patterns, test-file naming, fail-closed and immutability patterns (Code Style, Testing Posture). |
| technology-stack | `aidlc/spaces/default/codekb/obsidian-blog/technology-stack.md` | Astro 7.4.1 installed, Prettier 3.9.9 + `prettier-plugin-astro` 1.1.0, Vitest/fast-check/Playwright/axe versions, no ESLint/Stylelint, Jenkins on port 8081. |
| dependencies | `aidlc/spaces/default/codekb/obsidian-blog/dependencies.md` | Package coupling through `content/`, `package.json` as a review subject, Jenkins `VAULT_PATH` among the B1 touch points, `brew services` warning for Jenkins. |
| code-quality-assessment | `aidlc/spaces/default/codekb/obsidian-blog/code-quality-assessment.md` | CI gaps, missing post-deploy check, stale docs, technical debt #1 (non-deterministic ordering), #4 (single vault root), #13 (stale team memory on Prettier). |
| architecture | `aidlc/spaces/default/codekb/obsidian-blog/architecture.md` | Nightly publish sequence (Verify → Preprocess → Build → Deploy), self-hosting chain, improvement items (deterministic ordering, post-deploy HTTP check). |
| business-overview | `aidlc/spaces/default/codekb/obsidian-blog/business-overview.md` | Single maintainer, only `Areas/Notes` published today, direction of the active intent (site pages outside `Areas/Notes`). |

### Workspace

| Source | What it showed |
|---|---|
| `git log --oneline -40` (HEAD `db7ecae` on `develop`) | Every feature, fix and chore lands as `Merge branch '<type>/<topic>' into develop` over a single Korean `…합니다` commit; `68a1af9 ci:` is a direct commit to `develop` (allowed); `652d8e0 hotfix: Manual Accessibility Review` is a direct commit with a type outside the list and an English description. |
| `git branch -a`, `git branch --merged develop` | Remote holds only `origin/develop` and `origin/main`. Locally, `chore/manual-a11y-review`, `chore/remove-footer`, `feature/passion-project-rebrand` and `fix/image-captions` are fully merged into `develop` but still exist. |
| `git log --grep=prettier` | `667a2c2` adds Prettier config and scripts, `54e48ea` formats `site/` in one pass, `7da31af` re-baselines the inline scripts, merged by `f16f02a` (`chore/prettier-site`). |
| `Jenkinsfile` | cron `H 0 * * *`; stages Checkout, Install (parallel `npm ci` / `cargo build --release`), Verify (`cargo test --release`, fixture preprocess, `test:unit`, `test:pbt`, proptest regressions archived on failure), Preprocess (`--stamp-published` on `VAULT_PATH` = `…/Obsidian Vault/Areas/Notes`), Build Site, Deploy (`rsync -a --delete`, skipped when `RUN_DEPLOY` is off). No HTTP check after Deploy; `post` only echoes. No `format:check`, `astro check` or Playwright. |
| `Justfile` | `deploy` = `deploy-preprocess` (stamping, real vault `Areas/Notes`) + `site-build` + rsync; `crossunit` recipe; `test` runs `cargo test` (not `--release`). No HTTP check after `deploy`. |
| `site/package.json` | `format` and `format:check` scripts; `test:unit`, `test:pbt`, `test:e2e`, `test:coverage`, `resume:pdf`; Prettier pinned at 3.9.9; `astro ^7.4.1`. |
| `site/.prettierrc`, `site/.prettierignore` | Two spaces, semicolons, single quotes, width 100, `trailingComma: es5`, Astro plugin; ignores generated output, `verification/`, résumé fixtures, lockfile. |
| Repository `CLAUDE.md` | Line 8 says "Astro 6"; line 73 says `npm run format:check` must pass and explains the `prettier-ignore` need; line 58 ties inline-script edits to `INHERITED_INLINE_SCRIPT_BASELINES`; line 81 lists `format:check` among the site checks. |
| `site/README.md` | Still describes an S3 / CloudFront / Terraform / AWS deploy boundary (lines 7, 154–159). |
| `preprocessor/src/related.rs`, `preprocessor/src/linker.rs` | `related.rs` collects scores from a `HashMap` and sorts by score only (lines 101–102), so equal scores keep hash order; `linker.rs` builds backlinks from a `HashSet` and collects them unsorted (lines 12, 32–35). Graph edges are sorted (line 76). |
| `~/Library/LaunchAgents` | `dev.rvnnt.blog.plist`, `dev.rvnnt.tunnel.plist`, `homebrew.mxcl.jenkins.plist` present, consistent with the Deployment section. |
| `aidlc-state.md` of this intent | Scope `feature` (`skeleton: on`), brownfield. |
| `ideation/approval-handoff/initiative-brief.md`, `decision-log.md` | "Work merges to `develop` one phase at a time; test-first; the manual accessibility review is redone once at the end." D16: site-pages folder outside `Areas/Notes`, published with it, never the whole vault; the owner rewords the project rule. The folder name is still open. |

## Drift Items

| # | Claimed drift | Verdict | Source | Effect on the final practices |
|---|---|---|---|---|
| 1 | team.md Code Style says the site has no formatter yet, but Prettier is configured and `format:check` must pass | **Confirmed** | `site/.prettierrc`, `site/package.json` scripts, commits `667a2c2`/`54e48ea`/`f16f02a`, CLAUDE.md lines 73 and 81, code-quality-assessment (Formatting) | Code Style bullet rewritten (Prettier, `npm run format:check` run locally alongside `npx astro check`, ESLint/Stylelint may follow); a Prettier-pitfall bullet added; `npm run format:check` added to the Testing Posture local checks before merging UI work (Q1). |
| 2 | team.md Deployment promises an HTTP 200 check on `/` and one post after every deploy; the Jenkinsfile has none | **Confirmed** (pipeline gap) | `Jenkinsfile` Deploy stage and `post` block; `Justfile` `deploy`; code-quality-assessment (CI/CD); architecture (Improvement Opportunities) | Bullet kept as written; the pipeline is brought up to it by follow-up F1 (Q2). |
| 3 | CLAUDE.md says Astro 6; Astro 7.4.1 is installed | **Confirmed**, documentation only | CLAUDE.md line 8; `site/package.json` `astro ^7.4.1`; technology-stack; commit `3b32e65` (Astro 7 upgrade) | No practice change: team.md names no Astro version. Follow-up F5. No interview question. |
| 4 | `site/README.md` still describes the old AWS deploy | **Confirmed**, documentation only | `site/README.md` lines 7, 154–159; AWS decommissioned 2026-08-17 (technology-stack, business-overview) | No practice change. Follow-up F6. No interview question. |
| 5 | Related-post ties and backlink order are nondeterministic, against "generated output is deterministic" | **Confirmed** (code defect against an affirmed rule) | `related.rs` lines 65, 101–102; `linker.rs` lines 12, 32–35; code-quality-assessment debt #1 | Rule kept unchanged; the code is fixed by follow-up F2 (Q3). |
| 6 | Merged branches are deleted at once | **Found by the lead**: four merged local branches remain | `git branch --merged develop` | Rule kept unchanged; the branches are deleted by follow-up F3 (Q5). |
| 7 | Commit types are limited to the seven listed, with Korean descriptions | **Found by the lead**: one outlier, `652d8e0 hotfix: Manual Accessibility Review` | `git log` | List kept; one clause added to the Way of Working bullet: a hotfix uses `fix:`, there is no `hotfix` type (Q5). `652d8e0` is a one-off and is not rewritten. |
| 8 | `VAULT_PATH` must point at `Areas/Notes` only | **Deferred**: conflicts with decision D16 | `project.md` Forbidden; `decision-log.md` D16; `initiative-brief.md`; Jenkinsfile `VAULT_PATH`; code-quality-assessment debt #4 (single vault root, collisions only warn) | Rule and Deployment bullet kept verbatim; reworded later by follow-up F4 (Q4). |

Checked and still holding: trunk `develop`, `--no-ff` merges with the default message, `<type>/<topic>` branch names, only `develop` and `main` on `origin`, Jenkins job shape and port 8081, Verify as the production gate, rsync deploy, launchd services, `RUN_DEPLOY` validation mode, rollback by revert, TDD posture, suites and test-file naming, real fixture vault without mocks, coverage reported without a threshold, naming conventions, coded diagnostics, `LazyLock` regexes. Every Mandated and Forbidden rule except the `Areas/Notes` one still matches the evidence.

## Interview Decisions

Interview file: `practices-discovery-questions.md`. Every question was answered `A`, matching the evidence-suggested default, and the consolidated summary was confirmed with "Looks correct".

| Q | Topic | Answer | How it was integrated |
|---|---|---|---|
| Q1 | Code Style, Testing Posture | **A**: `npm run format:check` must pass; it is run locally before merging, alongside `npx astro check`; no Jenkins change. | Code Style: the "no formatter or linter yet" bullet is replaced by the Prettier bullet (local `format:check` alongside `npx astro check`; ESLint and Stylelint may still follow later), plus the `prettier-ignore` / inline-script baseline bullet. Testing Posture: `npm run format:check` heads the list of local checks before merging UI work. The draft's widening of "UI work" to "site work" was not kept; the Code Style bullet already requires `format:check` for every `site/` change. The Jenkinsfile is unchanged. |
| Q2 | Deployment | **A**: keep the practice; add the HTTP 200 check to the Jenkins Deploy stage as a `ci:` commit. | "Every deploy is followed by an HTTP 200 check on `/` and on one post." is kept verbatim. The Jenkins change is follow-up F1; it is not done yet. |
| Q3 | Code Style | **A**: the determinism rule stands; fix both orderings test-first, as defects. | "generated output is deterministic (sorted maps)" kept verbatim. Fix is follow-up F2. |
| Q4 | Forbidden rule, Deployment | **A**: keep the `Areas/Notes` rule unchanged for now; reword it once the site-pages folder is named in Requirements Analysis. | `discovered-rules.md` carries "NEVER run the preprocessor against the whole vault. `VAULT_PATH` must point at `Areas/Notes`, the only published folder." verbatim, and the Deployment bullet still names `Areas/Notes` only. Rewording is follow-up F4. |
| Q5 | Way of Working | **A**: the branch-deletion rule and the commit types stand as written; delete the four merged branches now; hotfixes use `fix:`. | Both bullets kept; one clause added to the commit-message bullet ("A hotfix uses `fix:`; there is no `hotfix` type."). Deletion is follow-up F3. |

Not asked, because evidence and the baseline settle them: Walking Skeleton (unchanged; this intent's `feature` scope declares `skeleton: on`), the TDD methodology and ordering, and the documentation fixes in drift items 3 and 4.

## Follow-up Work Items

None of these is done by this stage. Each lands on `develop` under the Way of Working above.

| # | Item | Origin | How it lands |
|---|---|---|---|
| F1 | Add an HTTP 200 check on `/` and on one post to the end of the Jenkins Deploy stage (skipped with the rest of Deploy when `RUN_DEPLOY` is off; a failed check fails the build). Until it lands, the affirmed practice is ahead of the pipeline. | Q2, drift 2 | A `ci:` commit, allowed directly on `develop`. |
| F2 | Make related-post order (`preprocessor/src/related.rs`: tie-break equal scores by a stable key) and backlink order (`preprocessor/src/linker.rs`: sort the collected backlinks) deterministic. Start each with a failing test that shows the unstable order; the tests stay as regressions. | Q3, drift 5 | A `fix:` branch off `develop` (or inside this intent's Construction), merged with `--no-ff`. |
| F3 | Delete the four merged local branches: `chore/manual-a11y-review`, `chore/remove-footer`, `feature/passion-project-rebrand`, `fix/image-captions` (`git branch -d`, after confirming none has a worktree). | Q5, drift 6 | Local housekeeping; nothing is pushed, because these branches never lived on `origin`. |
| F4 | Reword the `Areas/Notes` Forbidden rule (and the Deployment bullet naming `Areas/Notes`) once the site-pages folder is named in Requirements Analysis, keeping "never the whole vault". Promotion only appends: the reworded rule is added as a new line and the old line stays in `aidlc/spaces/default/memory/project.md`, where it would contradict the new one. **The maintainer must remove the old line from `project.md` by hand** when the reworded rule is promoted. The Jenkins `VAULT_PATH` and the preprocessor's single vault root change with it. | Q4, drift 8, D16 | Rule change through a later practices or learnings gate; code and Jenkins changes in Construction. |
| F5 | Correct the Astro version in the repository `CLAUDE.md` (line 8 says Astro 6; Astro 7.4.1 is installed). | Drift 3 | A `docs:` commit, allowed directly on `develop`. |
| F6 | Remove or rewrite the S3 / CloudFront / Terraform / AWS deploy description in `site/README.md` (lines 7, 154–159) to match the self-hosted Jenkins, launchd and Cloudflare Tunnel deploy. | Drift 4 | A `docs:` commit, allowed directly on `develop`. |

## Promotion Notes

- `team-practices.md` and `discovered-rules.md` carry no HTML-comment markers; `practices-promote` copies the five team sections into `team.md` as written.
- Every rule in `discovered-rules.md` matches the `project.md` text exactly (without the date stamp), so promotion recognises them and appends nothing.

## Unresolved Uncertainty

- Which post the F1 check should request (a fixed known slug, or the newest post from the built output) is not decided; the practice only says "one post".
- Whether the maintainer has been checking `/` and one post by hand after deploys until now cannot be seen in the repository.
- The site-pages folder name and path are still open (initiative brief); they block the final wording of F4.
- `cargo fmt --check`, `npm run format:check` and `npx astro check` were not run in this scan, so the current pass/fail state of the tree is unknown.
