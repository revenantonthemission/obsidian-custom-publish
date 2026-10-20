# Step 21 PDF Pipeline Contract

Step 21 reads much larger in the plan than it is. The pure side — the C11 mapper, the surface
comparison and the draft receipt — was already generated in Steps 15–18 and is enforced by machine
comparison today. Step 21 does not design any of it. It builds the three tools that *feed* those
functions and wires them together.

This document is a read-only extraction of what the existing pure modules already require, recorded
so Step 21 can be executed without re-deriving it. `resume-evidence.ts` and `resume-receipts.ts`
remain the normative sources; if this file ever disagrees with them, they win and this file is stale.

- Implementation worktree: `obsidian-blog-u1-nfr`, branch `codex/feature/resume-profile-experience`
- Extracted at: Step 20 close, 2026-07-25

## 1. What already exists

`src/lib/profile/resume-evidence.ts`

| Export | Role |
|---|---|
| `compareRenderedManifest()` | web/print surface observation vs expected manifest |
| `mapPdfEvidence()` | **the C11 mapper** — snapshot → `MappedResumeEvidence` |
| `compareResumeSurfaces()` | expected = web = print = PDF full ordered equality |
| `validateMappedResumeEvidence()` | re-validation of a mapping |
| `RESUME_TOOL_VERSIONS` | pinned `playwright 1.61.1`, `pdfjs 5.4.624`, `pretendard 1.3.9` |

`src/lib/profile/resume-receipts.ts`

| Export | Role |
|---|---|
| `assembleDraftResumeInspectionReceipt()` | **the draft receipt** |
| `validateResumeInspectionReceipt()` | re-validation |
| `RESUME_MANUAL_REVIEW_ITEMS` | the 11 Step 23 human checklist keys |

`assembleResumeReleaseReceipt`, `validateResumeHumanReview` and `ResumeReleaseReceipt` exist but are
Step 22/23 scope. Step 21 must not call them and must not produce anything that claims approval.

## 2. What Step 21 must build

Three tools under `site/scripts/profile/`, plus the command that chains them:

1. `pdf-renderer.mjs` — pinned Chromium, loopback-only, font readiness, fixed print options → a
   **private** A4 candidate.
2. `pdf-inspector.mjs` — exact PDF.js → one `PdfInspectionSnapshot`.
3. `pdf-viewer.mjs` — a local review surface built from the actual candidate bytes.

The chain is: render → inspect → `mapPdfEvidence` → `compareResumeSurfaces` →
`assembleDraftResumeInspectionReceipt`.

## 3. `PdfInspectionSnapshot` — what the inspector must produce

```jsonc
{
  "schemaVersion": 1,
  "candidate": { "candidateId": "…", "pdfSha256": "…" },
  "sourceIdentity": "<ProfileSourceIdentity digest>",
  "manifestFingerprint": "<ResumeManifestFingerprint digest>",
  "pageCount": 2,
  "occurrences": [ /* PdfObservedOccurrence, see below */ ],
  "structure":    { "tagged": true, "readingOrder": [], "sectionOrder": [], "entityOrder": [], "nodes": [] },
  "outline":      { "entries": [ { "outlineOrder": 0, "sectionOrdinal": 0, "pageNumber": 1 } ] },
  "renderedPages": [ { "pageNumber": 1, "evidenceId": "…" } ],
  "tools": { "node": "…", "playwright": "1.61.1", "chromium": "…", "pdfjs": "5.4.624", "pretendard": "1.3.9" }
}
```

**The single most important rule.** `PdfObservedOccurrence` carries
`occurrenceOrder`, `sectionOrdinal`, `entityOrdinal`, `valueKind`, `fragments`, `urlAnnotations` and
`structurePath` — and *deliberately no fact ID, semantic path, section key or entity ID*. The same
holds for `PdfStructureNode`. The inspector observes structural ordinals only; identity is assigned
by `mapPdfEvidence()` and only after a unique full ordered mapping succeeds. An inspector that read
fact IDs out of the PDF would make the mapping a circular argument, and the parity check would prove
nothing.

Supporting shapes:

- `PdfTextFragment` — `pageNumber`, `itemIndex`, `text`, `lineWrapBefore`. Only an
  extraction-confirmed visual line wrap may set the flag; it becomes one U+0020 before NFC comparison.
- `PdfUrlAnnotation` — `pageNumber`, `annotationIndex`, `destination`.
- `PdfStructureNode` — `nodeOrder`, `path`, `role` (`document`/`section`/`entity`/`fact`),
  `parentPath`, `children`, `sectionOrdinal`, `entityOrdinal`, `occurrenceOrder`. Paths are
  zero-based child-index paths rooted at `[0]`; `nodes` is strict depth-first preorder.

## 4. `ResumeMachineChecks` — what the renderer must evidence

Every literal below is a type-level constant, so the value is fixed and only the numbers vary.

| Group | Fixed | Measured |
|---|---|---|
| `pdf` | `readable: true`, `nonEmpty: true` | `pageCount`, `renderedPageCount` |
| `annotations` | — | `expectedCount`, `observedCount`, `mappedCount` |
| `structure` | `tagged: true` | `occurrenceCount`, `readingOrderCount` |
| `outline` | — | `sectionCount`, `destinationCount` |
| `font` | `responseOk: true`, `mime: 'font/woff2'`, `fontsReady: true`, `fontsCheck: true` | `family` |
| `network` | `loopbackOnly: true`, `successfulNonLoopbackRequests: 0` | — |
| `print` | `paper: 'A4'`, `marginMm: 12`, `preferCSSPageSize: true`, `tagged: true`, `outline: true`, `printBackground: false`, `detailsExpanded: true`, `screenOnlyOmitted: true`, `noClipping: true`, `entriesUnsplittable: true`, `longDetailsSplittable: true`, `headingFirstBlockKept: true` | `bodyTextMinimumPt`, `lineHeightMinimum` |

`printBackground: false` and `marginMm: 12` match the Step 17 print CSS (`A4`, 12mm, 10pt/1.4).
`tagged` and `outline` require the Chromium tagged-PDF and outline generation options.

## 5. Draft receipt

`assembleDraftResumeInspectionReceipt()` takes `ResumeDraftReceiptInput`:
`assembledAt`, `candidate`, `manifestDigest`, `comparison`, `pdfEvidence`, `machineChecks`, `tools`.

It returns a `ResumeInspectionReceipt` whose `kind`, `scope`, `machineResult`, `manualReview` and
`publicRelease` are all type-level literals: `'resume-inspection-draft'`, `'private-candidate'`,
`'pass'`, `'not-reviewed'`, `'not-authorized'`. The draft therefore cannot claim manual or public
approval — the type system already forbids it. Step 21 must not add a field that implies otherwise.

## 6. Negative cases that must fail by name

Per the plan: missing, unreadable, stale, missing/extra/changed/reordered, ambiguous, link,
structure and outline. "Stale" means the candidate's `sourceIdentity` or `manifestFingerprint` no
longer matches the current approved profile. "Ambiguous" means an occurrence that could map to more
than one expected entry — the mapper must refuse rather than pick.

## 7. Boundaries

- The candidate is **private**. Nothing may be written to `public/` or to
  `RESUME_DOCUMENT_REPOSITORY_PATH`; `/resume.pdf` stays a deferred internal link until Step 23
  promotes it under the exact-SHA human gate.
- Loopback only, through the owned preview and the owned-process ownership scope Step 19 built.
- No deployment, push or merge is implied by Step 21.

## 8. Starting state at Step 20 close

- `npm run test:e2e` exits 0, `result: pass` across browser / linkMetadata / resource /
  manualWebAccessibility
- `npx astro check` 0 errors, 6 inherited hints; 128 unit tests; 59 browser tests
- Manual web accessibility review recorded: reviewer 조준희, 12 states, review-subject digest
  `f9688988f1bcd93e23e088b4b1db26148e1eff370ef8001d945f173c7499e902`
- `pdfjs-dist` 5.4.624 is already a devDependency and was exercised by `profile-print.spec.ts`,
  which reported 2 pages on both A4 and Letter
- `PROFILE_PATHS` carries no PDF paths yet; Step 21 adds them

## 9. Renderer: done, and what it measured

`scripts/profile/pdf-renderer.mjs` is generated and was driven against a live loopback preview. It
produced a 317,938-byte tagged A4 candidate with `outline: true`, a request ledger of 22 attempted /
22 successful and zero external, and `Pretendard Variable` served as `font/woff2`. All six print
facts hold: screen-only chrome omitted, collapsed disclosures still printing their content, entries
unsplittable, long detail bodies splittable, headings kept with their first block, nothing clipped.

**One measured value deserves a decision.** `bodyTextMinimumPt` came out **9**, not 10.
`.profile-period` is `0.9rem`, and print sets the root to `10pt`, so period text lands at 9pt while
`RESUME_MANUAL_REVIEW_ITEMS` contains `body-text-minimum-10pt`. This was left as measured rather
than "fixed", because `ResumePrintMachineCheck` declares every other field as a fixed type-level
literal and declares this one as `number` — the design puts the judgement on the Step 23 reviewer,
not on the machine. Raising it is a one-line print rule, but `src/styles/profile` is a
review-subject directory, so the change would invalidate the recorded Step 20 manual accessibility
review and require a fresh one.

## 10. Inspector: observed PDF shape

Probed with PDF.js 5.4.624 against the real candidate.

- **`numPages`: 2.**
- **The outline is nested and matches the domain's section model.** Level 1 is the document title
  (`Résumé`); level 2 is the sections (`소개·연락·PDF`, `핵심 역량`, `경력·대표 성과`,
  `대표 프로젝트 요약`, `교육`, `자격`); level 3 is the entities (`프로그래밍 언어`,
  `소프트웨어 개발 인턴`, `obsidian-custom-publish`, …). `PdfOutlineEntry.sectionOrdinal` therefore
  comes from the level-2 index, and `pageNumber` from resolving the destination.
- **The struct tree wraps heavily in `NonStruct`.** Page 1 is
  `Root → Document → NonStruct → …` with `H1`/`H2`/`H3`/`P`/`Div`/`L`/`LI` carried inside those
  wrappers, and leaves appearing as `content id=p2R_mc7`. The four domain roles
  (`document`/`section`/`entity`/`fact`) must be *derived* from that nesting; Chromium does not
  emit them.
- **Marked content links the tree to the text.** `getTextContent({ includeMarkedContent: true })`
  returns 65 `beginMarkedContentProps`/`endMarkedContent` pairs interleaved with 267 text items on
  page 1, so a `content id=…` leaf resolves to a text-item range and thus to `PdfTextFragment`s.
- **Text is fragmented per glyph run** — `Résumé` arrives as `R`, `é`, `sum`, `é` — so fragments
  must be concatenated before NFC comparison. `hasEOL` is the signal for `lineWrapBefore`.
- **Link annotations carry their destination** (`mailto:…`, `https://github.com/…`), which is what
  lets `valueKind` be inferred from observation alone rather than from a fact ID.

## 11. Inspector: what `mapPdfEvidence()` will accept

Read from `resume-evidence.ts:414-550`. These are the conditions that make the inspector hard, and
they are worth knowing before writing it:

- `parsed.length !== expectedSnapshot.entries.length` fails. The inspector must emit **exactly one
  occurrence per approved manifest entry** — measured at **51** for the current résumé — and no more.
- `occurrence.occurrenceOrder !== entryIndex + 1` fails. `occurrenceOrder` is **1-based and must
  follow manifest order exactly**.
- `candidates.length !== 1` fails. For each expected entry, exactly one occurrence may match on
  `valueKind` + normalized value + `sectionOrdinal` + `entityOrdinal`. Two plausible matches is the
  "ambiguous" case the plan requires to fail by name.
- `normalizedObservedValue` is derived by the mapper from `fragments`; the inspector supplies
  fragments and must not pre-normalize into a value field.
- `sectionOrdinal` is the index into `manifest.sectionOrder`; `entityOrdinal` is the index into
  `manifest.entityOrder`, **global across the document rather than per section**, and `null` when
  the entry has no entity (`resume-evidence.ts:1619-1650`).

## 12. Measured manifest and the ordinal source

The current résumé manifest is **51 entries, 6 sections, 33 entities**. (The "77 approved values"
recorded at Step 15 counts approved facts across all surfaces, not résumé manifest entries.)

Deriving `entityOrdinal` from PDF structure alone turned out to be impossible. Three constructs are
identical in the tag tree and different in the model:

| Facts | PDF structure | `entityOrdinal` |
|---|---|---|
| contact links (entries 5–6) | `L > LI` | `null` |
| skills (entries 8–14) | `L > LI` | `1`–`7`, one entity each |
| experience detail (entries 37–38) | `L > LI` | `26`, all one entity |

Chromium does not carry `data-profile-entity-*` into the PDF, so no rule over `NonStruct`/`L`/`LI`
separates them.

**Decision: the renderer observes the ordinal skeleton from the print-media DOM and the inspector
aligns PDF extraction to it.** The alternative — letting the inspector read the boundaries off the
expected manifest — was rejected because it takes the ordinals from the answer key, so a PDF that
disagrees with the rendered document could still pass. Taking them from the rendered DOM means a
PDF/DOM divergence shows up as a count or order mismatch.

This is implementable: the built `/resume` exposes exactly **33 elements carrying
`data-profile-entity-kind`/`-id` in document order**, index-for-index with `manifest.entityOrder`,
and **51 fact elements** (49 `data-profile-fact-id` plus 2 `data-profile-destination-fact-id`).
Section and entity *names* differ between DOM and manifest (`intro`/`intro-contact`,
`career`/`experience`) but the *positions* agree, and positions are all the ordinals need.

## 13. The period defect, found and fixed

Periods are the one value kind whose approved form is a token and whose rendered form is a label:

| Source | Value |
|---|---|
| `ResumeManifestEntry.normalizedValue` | `start:year-month:2023-07\|end:year-month:2023-08` |
| rendered document and PDF text | `2023-07 – 2023-08` |

`normalizePdfOccurrence` concatenated fragments and NFC-normalized without inverting the
presentation, so `occurrenceMatches` compared a token against a label and failed. Four of the 51
entries are periods, so `mapPdfEvidence()` could never map more than 47 — **no inspector could have
passed**.

It stayed hidden because the web and print surfaces use
`RenderedManifestEntryObservation extends ResumeManifestEntry`, carrying the manifest value itself.
The PDF is the only independently extracted surface, so the mismatch surfaced the moment the PDF
pipeline was first wired.

Fixed in `resume-evidence.ts` by giving `normalizePdfOccurrence` a `period` branch that inverts
`presentation.ts`'s rendering (U+2013 separator, `현재` → `present`) back into the
`resume-manifest.ts` token. An unreadable period returns `null` and fails the occurrence rather
than passing as plain text. Four regressions were added through a new `resumeEvidenceTesting` seam;
13 unit files / 132 tests and `npx astro check` 0 errors / 6 hints pass.

The tempting shortcut — having the inspector emit period fragments whose concatenation *is* the
token — was rejected as evidence forgery. `PdfTextFragment` requires `pageNumber` and `itemIndex`
precisely so that every fragment points at a real extracted text item.

## 14. What remains

`pdf-inspector.mjs`, `pdf-viewer.mjs`, the chain that runs render → inspect → `mapPdfEvidence` →
`compareResumeSurfaces` → `assembleDraftResumeInspectionReceipt`, and the named negative tests.
The renderer still owes the skeleton observation described in §12.
