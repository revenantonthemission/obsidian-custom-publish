# Practices Discovery Questions — re-run, 2026-11-15

The affirmed practices from 2026-10-20 mostly still match the code. These questions cover only where the fresh scan found drift or where your newer decisions touch a rule. Draft: `team-practices.md`, `discovered-rules.md`, `evidence.md` in this folder.

## Q1. [Developer] The site has used Prettier since the redesign, but the practices still say "no formatter yet". How should formatting be enforced?

A. `npm run format:check` must pass; run it locally before merging, alongside `npx astro check` (no Jenkins change)
B. `npm run format:check` must pass, and the nightly Jenkins Verify stage runs it too
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. [Release engineer] The practices say every deploy is followed by an HTTP 200 check on `/` and one post, but neither Jenkins nor `just deploy` runs one. What should change?

A. Keep the practice and add the check to the Jenkins Deploy stage (a `ci:` commit)
B. Reword the practice: you check by hand after a deploy
C. Drop the practice
X. Other (please specify)

[Answer]: A

## Q3. [Developer] Related posts with equal scores, and backlinks, come out in a different order on each run, which breaks the rule that generated output is deterministic. Does the rule stand?

A. Yes: keep the rule and fix both orderings test-first, as defects
B. Yes, but fix them later, outside this work
C. No: relax the rule for these two lists
X. Other (please specify)

[Answer]: A

## Q4. [Release engineer] Your project rule says the preprocessor reads only `Areas/Notes`. You decided to also publish one site-pages folder outside it. When should the rule be reworded?

A. Keep it as it is now; reword it once the site-pages folder is named (in Requirements Analysis)
B. Reword it now to "`Areas/Notes` plus one named site-pages folder, never the whole vault", and fill in the folder name later
X. Other (please specify)

[Answer]: A

## Q5. [Release engineer] Four merged branches were never deleted (`chore/manual-a11y-review`, `chore/remove-footer`, `feature/passion-project-rebrand`, `fix/image-captions`), and one commit used a `hotfix:` type with an English message. Do the branch-deletion rule and the commit types stand as written?

A. Both stand; delete the four branches now, and hotfixes use `fix:`
B. Both stand, but leave the old branches alone
C. Add `hotfix` as an allowed type
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Formatting: `npm run format:check` must pass; run locally before merging, alongside `npx astro check`; no Jenkins change (Q1)
- Deploy check: keep the practice and add an HTTP 200 check on `/` and one post to the Jenkins Deploy stage, as a `ci:` commit (Q2)
- Deterministic output: the rule stands; fix the related-post and backlink orderings test-first, as defects (Q3)
- `Areas/Notes` rule: keep it unchanged for now; reword it once the site-pages folder is named in Requirements Analysis (Q4)
- Branches and commit types: both rules stand; delete the four merged branches now; hotfixes use `fix:` (Q5)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
