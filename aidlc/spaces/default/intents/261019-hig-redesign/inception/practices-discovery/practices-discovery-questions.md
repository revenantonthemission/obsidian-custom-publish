# Practices Discovery Questions

These questions settle how this repository is actually worked on, so the practices recorded for it match reality. Each one covers something the evidence in `team-practices.md`, `discovered-rules.md` and `evidence.md` (same folder) could not settle on its own. Fill in each `[Answer]:` with a letter, or with your own words after `X`.

## Question 1: Trunk branch and how work merges back

Jenkins builds and deploys `origin/develop` every night, and recent feature branches merge into `develop` with merge commits (`git merge --no-ff`). `main` only receives occasional milestone merges from `develop`, and nothing builds from it. The workflow's built-in default assumes the opposite (`main` as the trunk, squash merges). Your answer also decides what counts as "already merged" when stale branches are cleaned up.

Which branch is the trunk, and how does work merge back into it?

A. `develop` is the trunk; branches merge back with merge commits (`--no-ff`); `main` stays a milestone marker that you merge from `develop` by hand
B. Same as A, but each branch is squashed into one commit on `develop`
C. `develop` is the trunk with merge commits; retire `main` (make `develop` the GitHub default branch)
D. Switch to `main` as the trunk as part of this cleanup (retarget the Jenkins job, retire `develop`)
X. Other (please specify)

[Answer]: A

## Question 2: What happens to a branch and its worktree after it merges

28 local branches and 3 linked worktrees (separate checkouts of this repo in other folders) are already merged into `develop` but still exist.

What should happen to a branch, and its worktree if it has one, once it has merged?

A. Delete the branch and remove its worktree as soon as it merges
B. Leave them, and prune them in periodic cleanups like this one
C. Remove the worktree right away, but keep the branch
X. Other (please specify)

[Answer]: A

## Question 3: Build a thin end-to-end slice first?

Build a thin end-to-end slice first? A walking skeleton is a minimal version that runs the whole way through, built first to prove the pieces connect before the real features go in. Past work here was built layer by layer, and this redesign has no split into separately built units.

When should work start with a walking skeleton?

A. Not for single-surface work (bug fixes, refactors, UI redesigns); yes when work is split into several separately built units
B. Never
C. Always
X. Other (please specify)

[Answer]: A

## Question 4: When are tests written?

The most recent work (July 2026) built each feature first and wrote its tests afterwards. The March–April 2026 plans wrote failing tests first. Your global agent rules ask for test-first development with an 80% coverage floor.

When should tests be written in this repository?

A. After: build each change, then write and run its tests (test-after)
B. First: write a failing test, then make it pass (test-driven development)
C. Mixed: for UI work, write the acceptance checks (contrast, touch-target size, following the system light/dark setting, keyboard use) as failing browser tests first, then restyle, and write unit tests after
X. Other (please specify)

[Answer]: B

## Question 5: Browser and accessibility checks for blog pages

Posts, hub pages, tags, the graph and the 404 page have no browser, visual or accessibility tests today; only the home and profile pages do.

What checks should UI changes to blog pages carry?

A. Each UI change adds Playwright checks for the pages it touches: axe accessibility scans at 320, 768, 1024 and 1440 px wide, in light and dark, plus a reduced-motion check; no screenshot comparisons
B. Everything in A, plus screenshot comparison baselines
C. Manual review only
X. Other (please specify)

[Answer]: A

## Question 6: How releases reach the live site

Jenkins deploys `develop` to rvnnt.dev every night, with no staging site and no approval step, so pushing `develop` is the release. The workflow's built-in default is a staging site plus a manual approval before production.

How should changes reach the live site?

A. Keep it as is: pushing `develop` is the release
B. Add a manual approval step to the nightly deploy
C. Review a local preview build before every push to `develop`
X. Other (please specify)

[Answer]: A

## Question 7: Formatters and linters

No formatter or linter is configured today. The Rust code already passes `cargo fmt --check`, the TypeScript quote style is mixed, and reformatting now would touch files covered by the 16-state accessibility review.

Should formatting and linting tools be adopted?

A. Enforce `cargo fmt --check` now; add Prettier for the site after the redesign; consider ESLint and Stylelint later
B. Add all of them now and run them in CI
C. No tooling; keep matching the style of the file being edited
X. Other (please specify)

[Answer]: A

## Question 8: Which repository rules become hard rules

The draft lists 15 candidate rules (6 "always", 9 "never") taken from `CLAUDE.md`, `site/README.md` and `.gitignore`. For example: never start Jenkins with `brew services start jenkins`; never push, merge into `develop` or `main`, run a deploy, or write to the Obsidian vault without your permission; never re-stamp the accessibility review records or replace `resume.pdf` on your behalf. Only the rules you confirm are saved as hard rules in `project.md`. The full list is in `discovered-rules.md`.

Which candidates should become hard rules?

A. All 15
B. Only the operations and workflow rules (Jenkins port, Node path, your permission before push/merge/deploy/vault writes, no re-stamping review records, one phase per branch, never commit worktrees, npm not bun, preprocessor only on `Areas/Notes`); leave the code pitfalls in `CLAUDE.md`
C. I'll pick them one by one
X. Other (please specify)

[Answer]: C — picked one by one. Keep as hard rules: ALWAYS keep shrunk property-test counterexamples as permanent example regressions; ALWAYS use the `--c-` color token names; NEVER start Jenkins with `brew services start jenkins`; NEVER pile several phases onto one feature branch; NEVER commit nested worktree checkouts; NEVER run the preprocessor against the whole vault (only `Areas/Notes`); NEVER slice Korean text by bytes in Rust (use `char_indices()`). Not kept: Jenkins port 8081 check, Node path in the launchd plist, ES5 inline scripts, LazyLock/fence-aware regex transforms, permission before push/merge/PR/deploy/vault writes, no re-stamping review records or replacing `resume.pdf`, never use bun, no retries/`endOnFailure`/`fc.gen()` in property tests.

## Question 9: Smaller points: accept the draft's suggestions?

The draft suggests these for the remaining smaller points:

- Direct commits to `develop` only for CI, docs and urgent small fixes
- Branch names `<type>/<topic>` (`feature`, `fix`, `chore`), with an optional tool prefix such as `codex/`
- Commit messages `<type>: <description>`, with the description in Korean
- Test coverage reported, but no minimum enforced
- Checks Jenkins doesn't run (`astro check`, the JavaScript-off smoke test, browser checks) are run locally before merging UI work
- The 16-state accessibility review is redone once, after the redesign settles
- Rollback is a revert on `develop` plus a rebuild, and a deploy is followed by an HTTP 200 check on `/` and one post
- `just deploy` is run by hand only from `develop`, and only with your go-ahead
- Your global web rules (design tokens as CSS variables, motion only on `transform` and `opacity`, semantic HTML first, files under 800 lines) apply to all new and changed frontend code

Accept these suggestions?

A. Accept all of them
B. Accept, with changes I'll describe
C. Go through them one by one
X. Other (please specify)

[Answer]: A

## Question 10: The workflow's built-in defaults file

`aidlc/spaces/default/memory/org.md` holds the workflow's built-in defaults: `main` as the trunk with squash merges, and a staging site with manual approval before production. The practices recorded here will say otherwise for this repository, but the defaults file's text still appears in every later stage's rules.

What should happen to those built-in defaults?

A. Update `org.md` to match the practices recorded here
B. Leave `org.md` as is; the practices recorded here apply to this repository
X. Other (please specify)

[Answer]: B
