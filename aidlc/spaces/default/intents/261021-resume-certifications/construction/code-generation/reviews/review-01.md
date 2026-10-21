## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | site/tests/unit/profile-validation.test.ts > date period cases; site/tests/pbt/u1/arbitraries/profile.ts > realDate | The calendar tests pin only `2028-02-29` (accepted) and `2026-02-29` (refused). The century rule in `daysInMonth` (1900 and 2100 are not leap years, 2000 is) has no pinned example. The property generator checks it only through a `Date.UTC` oracle on random years, so a plain `year % 4` rule would very likely survive both. The same century rule is restated in `resume-evidence.ts` (`isDisplayedDay`) and is equally unpinned. | Add example cases for `1900-02-29` and `2100-02-29` (refused) and `2000-02-29` (accepted), in the stored-value validator and in the displayed-text parser. | New |
| R-02 | Minor | site/tests/e2e/hig-profile.spec.ts > "résumé certifications" group | The team testing posture asks every UI change for axe scans at four widths and two themes plus a reduced-motion check. The group has the axe matrix and a keyboard check but no reduced-motion check. The change adds no motion, so the risk is low. | Add a reduced-motion pass over `/resume`, or record in the code summary that no motion was added and none is needed. | New |
| R-03 | Minor | site/verification/resume/current-release.json (r8, schema 1); aidlc/spaces/default/intents/261021-resume-certifications/construction/code-generation/code-summary.md > Step 12 | `develop` is merged with the r9 facts, but the tracked PDF release is the r8 record, so `resume:pdf:verify` reports `RELEASE_STALE`. Nothing in Jenkins runs that check. The nightly deploy will publish the new 자격증 section, and the résumé page will drop its PDF link until a new release is promoted. The builder disclosed this. It is a deliberate consequence of keeping `--promote` human-gated, not a defect in the code. | Tell the maintainer in the approval summary that the PDF link stays hidden until they review the candidate `04d50301…` and run `--promote`. Do not run `--promote` on their behalf. | New |
| R-04 | Minor | CLAUDE.md > Testing, HIG browser checks line | The count "1,032 tests: 967 pass" counts four WebKit `page.goto` timeouts as passes. The run recorded 963 passed and 4 failed. The timeouts pass alone and are also in the baseline, which counted 933 passed, 4 failed and 937 in the old text, so the convention is unchanged. The line is still slightly optimistic. | Add "(plus 4 known WebKit load timeouts that pass alone)" to the line. Optional. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261021-resume-certifications/construction/code-generation/code-summary.md > Step 12 observation | In print and in the PDF, `인증 확인 링크` has no underline and no visible URL. A paper reader has no cue that it is a link or where it leads. The builder flagged this and left it, since PDF layout is outside the fact confirmation. The link annotation is present and mapped. | Leave it for the maintainer's own PDF review before `--promote`. Raise it there if wanted. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npm run test:unit` (re-run by reviewer, read-only) | PASS: 34 files, 435 tests | Matches the builder's number. |
| `npm run test:pbt` (re-run by reviewer, read-only) | PASS: 6 files, 37 tests | Property suite is green with the new date and credentials generators. |
| `git diff 96a6066 b7836e8` read in full for the `src/lib/profile`, `scripts/profile` and `ResumeContent.astro` files | no structural defect | `buildReviewRecords` is unchanged: the diff only exports it on the test seam. `fact-approval.ts` changes only the date check and the collection order. |
| Playwright and `astro check` | not re-run | I relied on the builder's recorded results: 93 `hig-profile` tests passed and `astro check` reported 0 errors. |

### Summary

Nothing blocks approval. The day-precision rule is real-calendar-based and shared by approval and the manifest. Dotted display has a single formatter that the web, print and PDF readers all invert. The schema-2 manifest keeps the schema-1 order readable. `credentials` is collected, selected, hashed and rendered once, through the new branch with an `assertNever` backstop. The approval chain is intact: r9 inventory, E16 and E17 membership, pinned digests and receipt, with `buildReviewRecords` untouched. The option A pairing is narrow: `isPairedLinkDestination` requires a `.destination` entry directly after a `text` `.label` of the same `evidence-link`, and the inspector independently requires exactly those two facts on one element. It also tightens the old rules, because every other link fact must now claim text. The disclosed process deviations (a temporary `sed -i`, an empty heredoc file, the WebKit timeouts) left no trace in the diff and do not change any verdict. The remaining points are small test and documentation gaps, plus the stale-PDF operational note.
