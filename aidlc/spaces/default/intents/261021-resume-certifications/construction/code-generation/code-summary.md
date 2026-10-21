# Code Summary: Résumé Certifications

This file records each Red before its Green, as the Testing Contract requires (TDD). Commands run from `site/` unless noted.

## Step 1 — Runner readiness and baseline

Fixture content was built as the Jenkins Verify stage builds it:
- `cargo build --release --manifest-path preprocessor/Cargo.toml`
- `./preprocessor/target/release/obsidian-press ./fixtures/vault ./content` (14 posts, 1 homepage artifact; the two known fixture warnings)
- `cp content/search-index.json content/graph.json content/previews.json content/nav-tree.json site/public/`
- `node scripts/crossunit/ensure-fixture-content.mjs`

Baseline on `feature/resume-day-dates` (identical to `develop` at `96a6066`):

| Suite | Result |
|---|---|
| `cargo test --release` (from `preprocessor/`) | 113 passed (36 unit + 77 integration) |
| `npm run test:unit` | 30 files, 360 passed |
| `npm run test:pbt` | 6 files, 37 passed |
| `npx astro check` | 189 files, 0 errors, 0 warnings, 7 hints |
| HIG suite, three engines | 1002 tests: 933 passed, 65 skipped, 4 failed |

The 4 HIG failures are WebKit `page.goto` 60 s timeouts in `hig-chrome.spec.ts` › reduced motion (`/posts/post-with-callouts`, `/posts/post-with-diagrams`, `/tags`, `/tags/test`). Rerun alone (`HIG_SKIP_BUILD=1 npx playwright test --config playwright.hig.config.ts --project=webkit tests/e2e/hig-chrome.spec.ts -g "reduced motion"`), all 15 pass in 5.1 s. They are load flakes that predate this work.

**Test file paths.** The unit-test instructions name four files that did not exist: `tests/unit/profile-validation.test.ts`, `tests/unit/fact-approval.test.ts`, `tests/unit/resume-manifest.test.ts` and `tests/unit/resume-release-store.test.ts`. They are created under exactly those names, so the scoped commands run as written.

## Step 2 — Red: the date model (BR1.1–BR1.3, BR2.1)

New tests:
- `tests/unit/profile-validation.test.ts` (13): a real day on both ends, 29 February 2028, a date start with an open end; `2026-02-29`, `2025-09-31`, `2025-13-01`, `2025-9-6`, `2025-09-00`, `0000-01-01` rejected as `period.value`; date/year-month mixed rejected as `period.precision`; a reversed date range rejected as `period.range`; a future end (`2026-07-17` → `2029-07-17`) and a same-day range accepted.
- `tests/unit/fact-approval.test.ts` (6): a date period materializes as its ISO value; an inventory holding it is approved; `2025-9-6`, `2025-09-31`, `2026-02-29` and `2025.09.06` in the record are refused as `approval.status@profile.facts[i].normalizedValue`.

Command and failing output:

```
$ npx vitest run tests/unit/profile-validation.test.ts tests/unit/fact-approval.test.ts
 Test Files  2 failed (2)
      Tests  19 failed (19)
+   "period.precision@profile.experiences[0].period.value.start",
+   "period.precision@profile.experiences[0].period.value.end",
Error: period.precision@profile.experiences[0].period.value.end, period.precision@profile.experiences[0].period.value.start
```

Every date point is refused as an unknown precision, so no case reaches its own rule yet.

## Step 3 — Red: the dotted display and its parsers (BR3.1, BR3.2; review R-02)

New and changed tests:
- `tests/unit/profile-presentation.test.ts` (5): `periodView().text` is `2025.09.06 – 2027.09.06`, `2023.07 – 2023.08`, `2019 – 2026`, `2024.03 – 현재` and `2026.07.17 – 현재`, and the stored value stays ISO.
- `tests/unit/resume-document.test.ts` (`parsePeriodDisplayText`, 7): the dotted forms of all three precisions map to the manifest tokens; the hyphen forms, `2026.02.29`, `2025.9.6` and `2025.09.31` are refused. The three existing cases moved from hyphens to dots.
- `tests/unit/resume-pdf.test.ts` (2): the inspector's `inferValueKind` reads dotted periods of every precision and `현재`, and reads the hyphen forms, a 13th month and an unpadded date as text. The synthetic PDF text helper `periodDisplay` now renders dots, as the page will.
- `tests/unit/resume-manifest.test.ts` (8): a date range serializes as `start:date:2025-09-06|end:date:2027-09-06`, a date start with an open end as `start:date:2026-07-17|end:present`, year and year-month unchanged; `2025-9-6`, `2025-09-31`, `2025.09.06`, a full date under `year-month` and a reversed date range are refused.
- `tests/pbt/u1/profile-presentation.pbt.test.ts`: the oracle's `datePointText` now applies BR3.1.
- `tests/pbt/u1/arbitraries/profile.ts`: a `date` period mode, with a generated month and day clamped to a real day of that year.

Command and failing output:

```
$ npx vitest run tests/unit/profile-presentation.test.ts tests/unit/resume-document.test.ts \
    tests/unit/resume-pdf.test.ts tests/unit/resume-manifest.test.ts \
    -t "period|dotted|date|full-date|maps every|refuses|value kind"
     × serializes a full-date range as date tokens
     × serializes a full-date start with an open end
     × inverts the rendered period into the approved manifest token
     × inverts a full-date range into date tokens
     × reads an open-ended period as the present point
     × refuses the hyphenated stored form, which the page no longer displays
     × displays the period … as 2025.09.06 – 2027.09.06
     × displays the period … as 2023.07 – 2023.08
     × displays the period … as 2024.03 – 현재
     × displays the period … as 2026.07.17 – 현재
     × reads a value kind from the observation alone
     × reads dotted periods of every precision and nothing else as a period
     × maps every approved entry exactly once
 Test Files  4 failed (4)
      Tests  13 failed | 15 passed | 27 skipped (55)
```

The 15 that pass are the refusal edge cases (already refused, because `date` is unknown and dots are unread) and the unchanged `year` forms; they guard the Green against over-acceptance.

## Step 4 — Green

- `types.ts`: `FullDatePoint` (`tag: 'date'`), added to `DatePoint`.
- `validation.ts`: `FULL_DATE_PATTERN`; `datePointOrdinal` returns a monotonic ordinal per precision, or nothing for an unreal point. A full date must exist in its month and year, by an explicit Gregorian rule (`Date.UTC` maps years 0–99 onto 1900–1999, so it is not used). The precision union is `DatePoint['tag']`. New export `isValidDatePoint(tag, value)`.
- `fact-approval.ts` and `resume-manifest.ts`: their own year and year-month patterns are replaced by `isValidDatePoint`, which both already reach through their existing `validation.js` import. The manifest token is `${tag}:${value}`.
- `issues.ts`: the `period.precision` message names `date`.
- `resume-evidence.ts`: local dotted patterns for the three precisions and a local day check; each displayed point maps to exactly one manifest token.
- `pdf-inspector.mjs`: `PERIOD_POINT` reads `YYYY`, `YYYY.MM`, `YYYY.MM.DD` and `현재`.
- `presentation.ts`: `datePointText` is the single dotted formatter for every profile period.

The first Green run left one failure, `approves an inventory whose period record holds full dates`. The cause was the test's own synthetic review: URL facts need `public-source` evidence. The test builder was corrected to match `tests/pbt/u1/arbitraries/approval.ts`; no production code changed for it. The test's Red was still for the right reason, since `datedProfile()` threw on the refused date before the review was built.

```
$ npx vitest run tests/unit/profile-validation.test.ts tests/unit/fact-approval.test.ts \
    tests/unit/resume-document.test.ts tests/unit/resume-pdf.test.ts tests/unit/resume-manifest.test.ts
 Test Files  5 passed (5)
      Tests  58 passed (58)
$ npx vitest run tests/unit/profile-presentation.test.ts -t "displays the period"
      Tests  5 passed | 11 skipped (16)
$ npm run test:pbt
 Test Files  6 passed (6)
      Tests  37 passed (37)
```

## Step 5 — Refactor and merge of `feature/resume-day-dates`

- **Shared within the layer.** The stored-value calendar rule lives once, in `validation.ts`, and fact approval and the manifest call it. The PDF evidence reader keeps its own patterns on purpose: it reads displayed, dotted text, and importing the stored-value rule would let the observation path accept the stored surface. That reason is now in its header comment. The inspector has one pattern.
- **Suites:**

| Suite | Result |
|---|---|
| `npm run test:unit` | 33 files, 396 passed |
| `npm run test:pbt` | 6 files, 37 passed |
| `npx astro check` | 0 errors, 0 warnings, 7 hints |
| `npm run format:check` | clean (Prettier wrote five new or changed test files first) |
| `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-profile.spec.ts` | 63 passed (three engines) |
| `npm run test:e2e` | stops at `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`, review-subject digest `718fb571f55cdd08cdeaa4c4556ddc010eb5e759f40ef0e08156c0009a2f4da4`, as expected |

- **Commit:** `909248c feat: 프로필 기간에 일 단위 날짜를 더하고 모든 기간을 점 표기로 표시합니다`; merged as `d730b16` with `--no-ff`, branch deleted.
- **The r8 receipt** still holds on this merge: no fact changed, and the manifest tokens of the existing year and year-month periods are unchanged.

## Step 6 — Red: the manifest and the r8 record (BR6.2; review R-01)

Branch `feature/resume-credentials-r9`, off `develop` at `d730b16`.

New and changed tests:
- `tests/unit/resume-manifest.test.ts` (5 more): a schema-2 manifest records seven sections, `credentials` at 6 and `certifications` at 7; a credential is filed under `credentials` with the canonical path `profile.credentials[id=…]` and entity kind `certification`; an absent collection takes no slot and the other ranks stay fixed; an empty `credentials` collection is left out of the selected résumé; an explicitly empty `credentials` section is refused.
- `tests/unit/resume-release-store.test.ts` (new, 5): the stored r8 record (`verification/resume/current-release.json`) is the six-section record; it validates as a schema-1 manifest; it does not validate when read against the schema-2 order; `resumeSectionOrderForSchema(1)` and `(2)` give the two orders; an unknown schema version is refused.
- `tests/pbt/u1/arbitraries/manifest.ts`: the oracle's certification traversal is one function used for `credentials` (rank 6) and `certifications` (rank 7).

Command and failing output:

```
$ npx vitest run tests/unit/resume-manifest.test.ts tests/unit/resume-release-store.test.ts
     × keeps the two section orders apart by schema version
     × refuses an unknown schema version
     × records seven sections with 자격증 between 학력 and 어학 자격
     × files a credential under its own section and canonical path
     × gives an absent collection no slot and keeps the other ranks
Error: document.source.invalid@profile.document.source
AssertionError: expected { key: 'certifications', order: 6 } to deeply equal { key: 'certifications', order: 7 }
AssertionError: expected 1 to be 2 // Object.is equality
TypeError: resumeSectionOrderForSchema is not a function
 Test Files  2 failed (2)
      Tests  5 failed | 13 passed (18)

$ npm run test:pbt
   × U1-P12 builds a complete ordered fact/path/kind/value manifest (with seed=352766218)
 Test Files  1 failed | 5 passed (6)
      Tests  1 failed | 36 passed (37)
```

The r8 schema-1 test already passes. It is a regression pin that must stay green once the order is versioned, so it has no Red of its own.

## Stopped before Step 7: the AWS link's evidence needs a decision outside the approved design

**What the design says.** BR6.1, Step 7 and the brief have every changed fact cite E16, the maintainer's 2026-10-21 confirmation, a `user-provided` evidence entry. That includes the AWS evidence destination `https://cp.certmetrics.com/amazon/en/public/verify/credential/eede0b68fb004a24bdcce600d3dd92cf`.

**What the code requires.** `buildReviewRecords` in `site/src/lib/profile/production-profile.ts` refuses any `external-url` fact whose evidence is not `kind: 'public-source'` with `expectedDestination` equal to the URL (`PROFILE_APPROVAL_EVIDENCE_INVALID`). `getApprovedExternalDestinations()` publishes those public-source entries, and `tests/e2e/profile-routes.spec.ts` writes them as the `external-url-human-evidence` record of the evidence-sealed suite. Every existing evidence link follows this: label and destination both cite one public-source entry (E03–E07, E09–E12).

**Why this stops here.** Citing E16 for the destination would need that invariant relaxed, which the rules forbid. Meeting it needs a new public-source evidence entry, with a verifier and a check time, which the approved design does not name. Recording who checked the link, and how, is a truthfulness decision (NFR2) for the maintainer.

**Options for the maintainer:**
- **A.** Add `E17`, a `public-source` entry for the AWS URL, recorded as an automated HTTP reachability check, as E09–E12 were ("… HTTP reachability collector (HTTP 200 only)"). The link label and destination cite E17; the title, issuer, period and the OPIc facts cite E16. A check on 2026-10-21 returned HTTP 200 (`text/html`) with no redirect; it would be repeated and timestamped when the entry is written.
- **B.** As A, but the maintainer opens the link and confirms it shows this credential, and E17 records that human check.
- **C.** Drop the link from this revision and ship the AWS entry without evidence links; FR1.5 would then be unmet.

**State left behind.** `develop` holds the merged first branch (`d730b16`). `feature/resume-credentials-r9` exists with the Step 6 tests uncommitted (`tests/unit/resume-manifest.test.ts`, `tests/unit/resume-release-store.test.ts`, `tests/pbt/u1/arbitraries/manifest.ts`); they fail by design until Step 8. Nothing on this branch is committed, so the full suite was not run against it.

### Decision: option B (relayed by the coordinator)

The maintainer chose **option B**. At **2026-10-21T04:24:30Z** they opened `https://cp.certmetrics.com/amazon/en/public/verify/credential/eede0b68fb004a24bdcce600d3dd92cf` themselves and confirmed, in their words, "Everything is correct": the page shows their AWS Certified Solutions Architect – Associate certificate, valid 2026-07-17 to 2029-07-17.

So **E17** is a `public-source` entry in the shape of E09–E12: `reference` and `expectedDestination` are that URL, `checkedAt` is `2026-10-21T04:24:30Z`, and `verifier` names the maintainer's own manual check. The public-source schema has exactly five fields (`kind`, `reference`, `expectedDestination`, `verifier`, `checkedAt`) and no note field. The automated HTTP 200 result therefore stays out of E17 and is recorded only in `revision-r9.md` and here. `buildReviewRecords` is unchanged. Only `certification-aws-solutions-architect-associate-evidence-label` and `-evidence-destination` cite E17; every other changed fact cites E16.

## Step 7 — Red: the section and the facts (BR4.1–BR4.3, BR5.1, BR5.2, BR6.1)

New and changed tests:
- `tests/unit/profile-presentation.test.ts` (3): 자격증 (`credentials`) comes after 학력 and before 어학 자격, with its issuer; each section is omitted when its collection is empty. The built-page heading pin gains `자격증`.
- `tests/unit/profile-validation.test.ts` (3, BR4.1): distinct certifications in the two sections pass; one id in both is `identifier.duplicate` at both paths; `credentials` is required.
- `tests/unit/production-profile.test.ts`: 124 facts (120 − 2 HSK + 1 OPIc issuer + 5 AWS); `credentials` in the source keys; the "no certification has an issuer" pin is replaced by the confirmed issuers. New `r9 certification facts` group (6): the r9 receipt identity; the AWS entry exactly as confirmed (U+2013 title, `Amazon Web Services`, `2026-07-17`–`2029-07-17`, `인증 확인 링크` to the URL); OPIc IH with `ACTFL` and `2025-09-06`–`2027-09-06`; no HSK in the source or the records; E16 on the five changed facts, with OPIc's unchanged title keeping E01; E17 on the link's label and destination, and the URL among the approved external destinations.
- `tests/e2e/hig-profile.spec.ts`, new group `résumé certifications` (10 per engine): the h2 order; the AWS and OPIc text with dotted dates; no HSK; the link inside the group named `AWS Certified Solutions Architect – Associate 근거`, reached by Tab (Alt+Tab in WebKit) and showing a focus ring; axe clean at 320, 768, 1024 and 1440 px, light and dark.
- Property tests: the generator draws an optional `credentials` entry (issuer, full-date window, one verification link); the presentation and domain properties check both sections.

Command and failing output:

```
$ npx vitest run tests/unit/production-profile.test.ts tests/unit/profile-validation.test.ts
     × rejects one certification id placed in both sections
     × requires the credentials collection
     × materializes all 124 publication-authorized facts with a zero-diff identity
     × keeps receipt and review metadata outside the public profile graph
     × is approved under the r9 receipt
     × lists the AWS certificate under 자격증 exactly as confirmed
     × keeps OPIc IH under 어학 자격 with its issuer and full dates
     × removes 新HSK 6급 from the source and the approved records
     × cites E16, the 2026-10-21 confirmation, for every changed fact
     × cites E17, the maintainer’s own check of the page, for the AWS link
 Test Files  2 failed (2)
      Tests  10 failed | 34 passed (44)
$ npx vitest run tests/unit/profile-presentation.test.ts -t "자격증|omits a section"
     × places 자격증 after 학력 and before 어학 자격
      Tests  1 failed | 2 passed | 16 skipped (19)
$ npx playwright test --config playwright.hig.config.ts tests/e2e/hig-profile.spec.ts -g "résumé certifications"
  30 failed      (10 checks × 3 engines; "element(s) not found" / "toBeVisible() failed")
$ npm run test:pbt
   × U1-P12 builds a complete ordered fact/path/kind/value manifest
   × PBT-U1-DOMAIN: complete generated aggregates validate without mutating input
   × PBT-U1-DOMAIN: materialized approval identity is deterministic under ordered source permutations
   × PBT-U1-DOMAIN: optional values are omitted exactly while required projections remain
      Tests  4 failed | 33 passed (37)
```

The two "omits a section" cases and "accepts distinct certifications" pass before the change, because validation does not yet read `credentials` at all. They guard the Green.

## Step 8 — Green

- **Model.** `ProfileData.credentials` (required) and `ResumeProfile.credentials` (optional, non-empty).
- **Validation, normalization, selection, digests.** Validation inspects both collections with one shape check, and records both into the one `certification` id map, so an id in both sections is `identifier.duplicate` (BR4.1). The issue path ranks gain `credentials`. Normalization, the résumé selector (an empty collection takes no section), the canonical source digest and the fact collector (canonical path `profile.credentials[id=…]`) all handle `credentials`, ahead of `certifications`.
- **Manifest (BR6.2, review R-01).** `RESUME_MANIFEST_SCHEMA_VERSION` is 2. `RESUME_SECTION_ORDER` is the seven-section order, and the schema-1 order is kept. `resumeSectionOrderForSchema` gives the order for a version, and the snapshot validator reads a record against its own version's order. Ranks are fixed, so an absent section leaves its rank unused. Both certification sections share one builder.
- **Presentation and page.** View kind `credentials` with heading `자격증`, between `education` and `certifications`. `ResumeContent.astro` has an explicit branch for each kind, and the final branch is `assertNever`, so an unhandled kind fails `astro check` and the build. The section element is `section.profile-section.resume-credentials[data-profile-section="credentials"]`; entries reuse `resume-certification-entry`, so their screen and print rules apply unchanged. `print.css` adds `.resume-credentials` to the section rule. There are no new colours and no motion.
- **Facts.** In `profile-data.ts`: the AWS entry under `credentials`; OPIc IH gains `ACTFL` and full dates; `hsk-6` is removed.
- **Evidence.** E16 (the 2026-10-21 confirmation) and E17 (the maintainer's own check of the link, option B) are added. `EVIDENCE_MEMBERSHIP` maps the five changed facts to E16 and the link's label and destination to E17. OPIc's title keeps E01. The pinned membership count is 124, and `deriveStructuralDecisions` records `credentials`.
- **Shape check.** `assertExactProfileSourceShape` allows `credentials`. `buildReviewRecords` is unchanged; E17 passes it because it is a public source whose destination is the URL.

The first PBT run after the Green failed two properties: U1-P12 and the presentation removal property. Both were oracle pins: the property still pinned `schemaVersion` 1, and the expected-removal oracle did not drop `credentials`. The shrunk counterexamples showed no production defect, so there is no counterexample to keep. After the oracle updates, PBT passed on the failing seed (1995362876) and on a fresh one.

One Step 7 test was too broad: "no HSK in the approved records" matched E16's own evidence text, which names the removal on purpose. It now checks fact IDs, paths and values only, and also checks the count of 124.

## Step 9 — Fact revision r9

- **Inventory.** `docs/resume/product-engineer/inventory-r9.json`, built by the production code: `productionProfileTesting.materialize`, `buildReviewRecords` and `evidenceSources`, the last two newly exposed on that test seam. The build ran in a scratch vitest script that only printed. The file was written with the file tools, one record per line, and diffed against the printed output (identical).
- **Delta from r8.** −2 HSK facts; `certification-opic-ih-period` revised; +6 facts (the OPIc issuer and five AWS facts); structure gains `credentials`.
- **Digests.** All computed with `productionProfileTesting.canonicalDigest`. An independent Python canonical hash of the committed file gives the same inventory digest, and the same method reproduces r8's pinned `5bcfa474…`.
  - inventory `fba4c029a07f904eb91dc5b5bb920f33ea0ba0b41de07bd695f58323a34bd89c`
  - approved records `db9270e308a8da9e666c63ecfc3357b9feeb799bde29e5c8ed71d2176cb25ddf`
  - materialized `1299d4f2fbc8f0b8c53e7c6792c21faa4863fd5d32b0919d2139d75dbb6f88a0`
  - production diff `2259e535c0fdece8a1a8f89021a8e639be3ecc18ef7911ed7410c8631a2f4c56`
- **Receipt.** `profile-fact-approval-2026-10-21-r1`, decision `Approved`, audit id `PROFILE-RESUME-CERTIFICATIONS-20261021T042430000Z`, recorded at `2026-10-21T04:24:30.000Z`, the time of the maintainer's link check, which completed the confirmation. It is pinned in `EXPECTED_RECEIPT` and written to `site/verification/profile/fact-approval.json`. The test pin `EXPECTED_MATERIALIZED_DIGEST` is updated.
- **Record.** `revision-r9.md` records the request and confirmed facts; E16 and E17, including option B and the time; the automated HTTP 200 note, kept out of E17 because the schema has no note field; the delta; the digests; and that the PDF layout and the manual review are not part of the confirmation.

## Step 10 — Refactor and merge of `feature/resume-credentials-r9`

| Suite | Result |
|---|---|
| `npm run test:unit` | 34 files, 418 passed |
| `npm run test:pbt` | 37 passed (seed 1995362876 and a fresh seed) |
| `npx astro check` | 193 files, 0 errors, 0 warnings, 7 hints |
| `npm run format:check` | clean |
| `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-profile.spec.ts` | 93 passed (63 existing + 30 new, three engines) |
| `just crossunit` | link sweep stops only on the fixture's `nonexistent-image.png`; the no-JS checks, run on their own because `&&` skips them, pass 8/8 |
| `npm run test:e2e` | stops at `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`, review-subject digest `ed6e16f63be3aa196326d08dddff380725f7a030262ac2091402f003d3aa15c9`, as expected |

- **Commit:** `f91c6a5 feat: 이력서에 자격증 섹션을 더하고 자격 사실 r9 개정을 승인합니다`; merged as `05555ee` with `--no-ff`, branch deleted.

## Step 11 — Full verification on `develop` (`05555ee`)

| Suite | Result |
|---|---|
| `cargo test --release` | 113 passed |
| `cargo fmt --check` | clean |
| `npm run test:unit` | 34 files, 418 passed |
| `npm run test:pbt` | 37 passed (seed -418179318) |
| `npx astro check` | 193 files, 0 errors, 0 warnings, 7 hints |
| `npm run format:check` | clean |
| HIG suite, three engines | 1032 tests: 963 passed, 65 skipped, 4 failed |
| Profile CSS budget (`hig-profile.spec.ts` › profile CSS budget, 24 KiB gzip) | passed in all three engines |
| `just crossunit` | link sweep stops only on the fixture's `nonexistent-image.png`; no-JS checks 8/8 |
| `npm run test:e2e` | stops at `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`, as expected |

The 4 HIG failures are WebKit `page.goto` timeouts in `hig-chrome.spec.ts`: the shortcut-hint check and reduced motion on `/posts/post-with-diagrams`, `/tags` and `/tags/test`. None is on a profile route. They are the same class as the 4 in the baseline. Rerun alone (`-g "reduced motion|shortcut hint"`), all 16 pass.

**New review-subject digest:** `ed6e16f63be3aa196326d08dddff380725f7a030262ac2091402f003d3aa15c9`. The 2026-10-21 manual record no longer matches it, and the maintainer redoes the 16-state review.

## Step 12 — PDF candidate: blocked

`npm run resume:pdf -- --prepare` ran once and failed:

```
PDF_INSPECT_FACT_TEXT_MISSING: A rendered fact could not be found in the candidate text.
```

A diagnostic script called `prepareResumeRelease` directly and printed the error details: `{ factOrder: 43, text: "인증 확인 링크" }` at stage `pdf.inspect.occurrences`. It was a second prepare attempt and failed the same way; neither attempt left a draft receipt. The candidate's text is complete and in order. A dump of the page-2 reading-order stream shows 자격증, the AWS title, issuer, `2026.07.17 – 2029.07.17`, `인증 확인 링크`, 어학 자격, OPIc IH, ACTFL and `2025.09.06 – 2027.09.06`, with no unreached items. The dotted periods are found and parsed.

**Cause.** The AWS verification link is the first résumé element that carries two facts: `data-profile-label-fact-id` (the label, kind `text`) and `data-profile-destination-fact-id` (the URL, kind `external-url`). The PDF evidence chain assumes one fact per rendered element:
- `pdf-inspector.mjs` claims a separate forward text run per fact, so the second fact on the same `<a>` finds no text left.
- `inferValueKind` classifies a fact by its element's `href`, so the label would also be read as a link and claim the URL annotation.
- `resume-evidence.ts` refuses a text fragment shared by two facts (`fragmentKeys`).
- `resume-receipts.ts` requires every fragment and annotation reference to be unique across mappings, and a link mapping to have fragments plus exactly one annotation.

Contact links carry one fact each. Portfolio evidence links carry two, but the portfolio is not in the PDF, so this path was never exercised. The unit test `resume-pdf.test.ts` synthesizes the destination's text as the URL itself, so it passes without modelling a real two-fact link.

**Why this stops here.** Every fix changes the PDF evidence model or the approved facts, which the approved design does not decide. Options for the maintainer:
- **A. Pair the two facts in the evidence model.** The label claims the link's text run; the destination claims only the URL annotation (no fragments); the inspector classifies each fact by its own attribute, not the element's `href`. This changes `pdf-inspector.mjs`, `resume-evidence.ts` and the receipt validator in `resume-receipts.ts`, with tests first. The fragment- and annotation-uniqueness rules stay; a destination fact is allowed zero fragments only when it is paired with a label fact on the same element. That is a deliberate change to release-validation rules, so it needs the maintainer's approval.
- **B. Show the URL in the PDF.** Render the destination as its own visible text, for example the URL printed after the label in print, carried by its own element, as the contact GitHub link shows its URL. Each element then carries one fact. This changes the page and print layout (accessibility review subjects) and the look of the PDF.
- **C. Keep the link off the PDF.** Give the credential evidence-link facts the target surface `resume` only, not `pdf`, and leave the link out of print. This changes the approved facts' target surfaces, so r9's digests and receipt are recomputed. The PDF would then lack the verification link.

**`npm run resume:pdf:verify`** now fails with `RELEASE_STALE: The tracked release was approved against a different source or manifest.`, and will until a new release is promoted. No build or check compares the promoted PDF with the current facts beyond this; the résumé page offers no PDF link while the release is stale.

Steps 12 and 13 are not done. `--promote` was never run.

## Decision: option A (relayed by the coordinator, approved 2026-10-21)

The maintainer chose **option A**: pair the link's two facts in the PDF evidence model. The label fact claims the visible link text, and the destination fact claims only the link annotation's URI. The pairing is narrow: only the label + destination pair of an evidence link, rendered on one element. Every other element keeps the one-fact rule. Built test-first on `fix/resume-pdf-link-facts`, off `develop` at `05555ee`.

### Red: link-fact pairing

All new tests are in `tests/unit/resume-pdf.test.ts`. The synthetic baseline now models the real rendering: the skeleton's facts carry `binding` (`value`, `label` or `destination`) and `elementOrder`, the label's fact carries the destination's `href`, and the destination's occurrence claims no text.
- **Inspector** (`extractOccurrences`, 7): the pair yields a `text` label occurrence that holds the link text and no annotation, and an `external-url` destination occurrence that holds no fragments and only the URI. Wrong link text gives `PDF_INSPECT_FACT_TEXT_MISSING`. A wrong or missing URI gives `PDF_INSPECT_LINK_ANNOTATION_MISSING`. A third fact on the same element, or a destination on a different element, gives `PDF_INSPECT_FACT_TEXT_MISSING`. A single-fact link still claims its own text and URI.
- **Mapper** (`mapPdfEvidence`, 7, on the real r9 manifest): the pair maps the label to `인증 확인 링크` and the destination to the URL. Rejected: a destination that claims text; a destination that reuses the label's fragment; a wrong or missing URI; a label that claims the URI; a destination annotation on another page than its label; a single-fact link with no text.
- **Receipt validator** (`resumeReceiptsTesting.validateFullMapping`, 3): accepts the mapped pair; rejects a destination mapping that references text; rejects a single-fact link mapping without text.

The two new test seams (`resumePdfInspectorTesting.extractOccurrences`, `resumeReceiptsTesting.validateFullMapping`) were added first, without behaviour change, so the Red below fails for behavioural reasons:

```
$ npx vitest run tests/unit/resume-pdf.test.ts
     × the label claims the link text and the destination claims only the URI
     × rejects a destination that claims visible text
     × rejects a destination annotation on another page than its label
     × keeps every single-fact link claiming its own text
     × rejects a destination mapping that references text
     × rejects a single-fact link mapping without text
ResumePdfInspectorError: A rendered fact could not be found in the candidate text.
AssertionError: a destination claims only the URI: expected true to be false
AssertionError: the pair is one element on one page: expected true to be false
AssertionError: a single-fact link must claim its text: expected true to be false
 Test Files  1 failed (1)
      Tests  6 failed | 26 passed (32)
```

The 26 that pass include the refusals the existing rules already enforced: fragment uniqueness, a wrong URI, a label holding the URI, a third fact. They stay as guards. Two gaps were real but invisible before: the mapper and the receipt validator never required a link to claim text, so a single-fact link with no text, or a destination holding text, passed.

### Green: link-fact pairing

- **Shared rule.** `isPairedLinkDestination(entries, index)` in `resume-manifest.ts`. An entry is a paired destination only when its path ends in `.destination`, the entry before it is that link's `.label`, of kind `text`, and both belong to the same `evidence-link` entity.
- **Mapper** (`resume-evidence.ts`). A paired destination must claim no fragments, and its single annotation must be on the page where its label's text starts. Every other link fact must now claim text (previously unchecked). The same rule is applied in `validateMappedResumeEvidence`.
- **Receipt validator** (`resume-receipts.ts`, `validateFullMapping`). The same rule. Fragment and annotation uniqueness are unchanged.
- **Inspector** (`pdf-inspector.mjs`). A destination is paired only when one element carries exactly a `label` then a `destination` fact, with one `href` and one text. The label is read as text and claims the run; the destination claims only the annotation. Anything else takes the one-fact path and fails there with the existing codes.
- **Renderer** (`pdf-renderer.mjs`). Each skeleton fact records `binding` and `elementOrder`; the typings are updated.
- **Duplication.** The paired-page rule is written in both the mapper and the receipt validator. Those two modules already restate the mapping rules independently, and that independence is kept.

```
$ npx vitest run tests/unit/resume-pdf.test.ts tests/unit/resume-document.test.ts tests/unit/resume-release.test.ts
 Test Files  3 passed (3)
      Tests  80 passed (80)
$ npm run test:unit        → 34 files, 435 passed
$ npm run test:pbt         → 37 passed (seed 804657817)
$ npx astro check          → 0 errors, 0 warnings, 7 hints
$ npm run format:check     → clean
```

- **Commit:** `611b2ba fix: PDF 근거에서 근거 링크의 레이블과 목적지 사실을 한 요소로 짝지어 확인합니다`; merged as `9867371` with `--no-ff`, branch `fix/resume-pdf-link-facts` deleted.

## Step 12 — PDF candidate (after option A)

`npm run resume:pdf -- --prepare`, once, on `develop` at `9867371`:

| Field | Value |
|---|---|
| candidateId | `04d50301aae81bca6199f0c50bec23761b0f6cc45127e1cbbc97203ef2262ee8` |
| pdfSha256 | `d683865ae9cc6121f77cf1f1e1496e63ff4611a4da76c7b9440f3cfc13beea73` |
| sourceIdentity | `29fc63b9ff43277d1234a8a5df7eddd59ee598a8ead7d90b4a378139c3509186` |
| manifestFingerprint | `6de3a28b864d3dccc5d2712b6db927913350532120cedad684dcf80afa61028a` |
| pageCount | 2 |
| mappedFacts | 46 |
| surfaceParity | `pass` (web, print and PDF, with the dotted period text) |
| draft | `site/.artifacts/profile/pdf/candidates/04d50301….draft.json`, sha256 `7a3e43ba…b4` |

- **Machine checks in the draft:** no clipping; body text at least 10 pt; line height at least 1.35; first block kept with each heading; entries unsplittable; 3 of 3 link annotations mapped (email, GitHub, the AWS link); 7 outline sections; tagged; fonts embedded (Pretendard subsets); loopback only.
- **Page inspection** (the assistant, at 80 and 200 dpi):
  - Page 1: profile, skills, experience, the DocSuri summary and 학력 with `2019 – 2026`. The experience reads `2023.07 – 2023.08`.
  - Page 2: 자격증 (the AWS title, `Amazon Web Services`, `2026.07.17 – 2029.07.17`, `인증 확인 링크`), then 어학 자격 (OPIc IH, `ACTFL`, `2025.09.06 – 2027.09.06`).
  - Nothing is clipped, and no heading ends a page alone. 新HSK is absent. The PDF grew to a second page, which the maintainer allowed (requirements Q7).
- **Observation for the maintainer's review** (not changed: PDF layout is outside the fact confirmation). In print, `인증 확인 링크` shows as plain text with no underline, below a wider gap than the other lines. The link annotation is present and clickable.
- This is assistant visual QA, not a human review receipt. `--promote` was not run.
- **Earlier attempts:** two candidates (`e00e8791…`, `540ef869…`) were prepared before option A and failed in inspection; they left no draft receipt.

**`npm run resume:pdf:verify`:** `RELEASE_STALE: The tracked release was approved against a different source or manifest.` This is expected until the maintainer promotes a new release. No other build or check compares the promoted PDF with the current facts, and the résumé page offers no PDF link while the release is stale.

## Step 13 — Records

- **Unlabelled range (review R-05).** Certification periods show an issue-to-expiry range with no label, for example `2025.09.06 – 2027.09.06`. That is the maintainer's choice: requirements Q1, option B, with dots everywhere. It closes the review's minor point.
- **`unit-test-instructions.md`** records the commands actually run.
- **`CLAUDE.md` counts.** Unit 360 → 435; HIG 1,002 tests / 937 pass → 1,032 tests / 967 pass, 65 skip; property tests unchanged at 37; Rust unchanged at 113. Commit `c4904d0 docs: 자격증 작업 뒤의 단위·HIG 테스트 수를 CLAUDE.md 에 맞춥니다` on `chore/claude-md-resume-certifications-counts`, merged as `b7836e8`, branch deleted. The HIG pass count counts the 4 WebKit timeouts as passes, because they pass when run alone.
- **`traceability.json`** is written by the conductor.

## Branch and commit summary

| Branch | Commit | Merge |
|---|---|---|
| `feature/resume-day-dates` | `909248c` | `d730b16` |
| `feature/resume-credentials-r9` | `f91c6a5` | `05555ee` |
| `fix/resume-pdf-link-facts` | `611b2ba` | `9867371` |
| `chore/claude-md-resume-certifications-counts` | `c4904d0` | `b7836e8` |

All four branches are deleted. Nothing was pushed, deployed or promoted. `site/verification/profile/manual-web-accessibility.json` remains the maintainer's uncommitted file, unchanged since 11:16.
