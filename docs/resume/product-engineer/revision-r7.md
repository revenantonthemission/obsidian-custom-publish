# Truthful product engineer résumé update — 2026-09-27

This is an internal source and verification record, not public résumé copy. It distinguishes the user's factual confirmations from editorial authorization and automated checks.

## Request and confirmed facts

The user requested: “Let's update my resume too. The resume should be truthful.” This follows the product engineer portfolio work and the instruction to feature DocSuri only.

The user explicitly confirmed graduation from Sogang University in February 2026, the Hansono internship in July–August 2023, and the separate eZono collaboration in Germany on October 29–November 6, 2023. These confirmations are evidence E15. The source keeps the education period at year precision (2019–2026) and records the graduation month in the subtitle; no unconfirmed enrollment month was introduced.

The recorded time 2026-09-27T13:45:10.423Z is the editorial record creation time, not the message's send time. The new Approved receipt connects the request and these confirmations to the existing publication boundary. It does not claim the user individually reviewed every technical fact, reviewed PDF layout, or completed manual web accessibility testing.

## Content changes and attribution

- The résumé now emphasizes DocSuri search incident recovery, data contracts and producer/consumer coordination, and reprocessing and failure handling. These summarize existing DocSuri evidence under docs/portfolio/kakaopay-data-platform/evidence/ (E14).
- The résumé names the actual role: data engineer in a four-person AWS AI School team. It explicitly credits teammates for the initial search/summary/agent implementation and the GROBID TEI structure parser. It does not imply sole ownership or a previous product engineer job title.
- The search example retains the July 2026 incident context and the worker reduction from three to one. No new user counts, revenue, availability guarantees, or benchmark claims were added.
- The skills list is narrowed from 29 to 11: Python, SQL, PostgreSQL, Redis, OpenSearch, Amazon Bedrock, Ollama, Docker, AWS, Flutter, and Git. Omitted skills are not assertions that the user lacks those skills.
- Hansono remains a software development internship, with the later Germany collaboration explicitly identified as separate.
- The existing four project case studies remain in the source and default portfolio. The optional resumeProjectIds selection limits the résumé and PDF to DocSuri. The product engineer portfolio already has that single project.
- Printed skill groups use compact horizontal lists to keep the complete skills section on the first page. Body text remains at least 10 pt.

The fact inventory changes from 133 to 118: 110 values unchanged, five values revised, three contribution facts added, and 18 skill facts removed. Existing evidence source definitions E01–E13 and public-source verifier/check times are preserved. Membership changes are explicit; removed facts no longer appear in the approval inventory.

The five revised fact IDs are narrative-detailed-intro-0-text, narrative-resume-summary, experience-hansono-summary, experience-hansono-details-1-text, and education-sogang-university-subtitle. New IDs are narrative-resume-search-recovery, narrative-resume-data-contracts, and narrative-resume-reprocessing.

## Approval receipt and reproducibility

The exact canonical inventory digest input is saved in [inventory-r7.json](inventory-r7.json). The existing productionProfileTesting.canonicalDigest algorithm hashes that JSON to the inventoryDigest below. Approved records, materialized source, and production diff use their existing digest domains. Values were calculated once outside the build and pinned in production-profile.ts and verification/profile/fact-approval.json. No runtime automatic approval path was introduced.

```json
{
  "schemaVersion": 1,
  "receiptId": "profile-fact-approval-2026-09-27-r1",
  "inventoryRevision": "profile-facts-r7",
  "inventoryDigest": "9003f2dfbbd2352873b616b52cb1dd0342fefe1ea4cc9a01f15a976409863d1d",
  "productionDiffRevision": "profile-production-diff-r7",
  "productionDiffDigest": "a708571579d789862772e5c38754171e154a5dc9f1acd4091dd23cc68bfb9fba",
  "approvedRecordsDigest": "45257227fd3ca0fd2a55961752a6b6883e900bef430bf40640d1de8f935bde8e",
  "materializedProfileDigest": "9d6eb360666a65504c0988d326b551dda928a2394a22c031969036f7b169f7b5",
  "decision": "Approved",
  "decisionAuditId": "PROFILE-RESUME-TRUTHFUL-20260927T134510423Z",
  "decisionRecordedAt": "2026-09-27T13:45:10.423Z"
}
```

The previous r6 receipt remains in Git history and docs/portfolio/data-engineer-ai-generalization/publication-record.md.

## Verification

- Full unit suite: 277 tests across 22 files passed across the initial run and the targeted rerun. The initial sandbox run had seven process-table EPERM failures; both affected files passed all 34 tests with the required process access.
- Domain and presentation property tests: 16 properties, 100 runs each, deterministic seed 20260927, passed.
- Focused selection/manifest and freshness/presentation regressions passed, including an actual Astro build.
- Astro check: 159 files, zero errors, zero warnings, six existing hints.
- PDF preparation completed a clean build and confirmed parity of all 40 displayed facts across the web, print view, and PDF.
- Both rendered PDF pages were inspected by the assistant for clipping, overlap, Korean readability, and page transitions. Skills stay on page one; experience, the DocSuri summary, education, and certifications are on page two. This is assistant visual QA, not a human review receipt.

## PDF candidate and public-download status

The prepared two-page PDF is saved at output/pdf/조준희_프로덕트엔지니어_이력서_2026-09-27.pdf. It is byte-identical to the pipeline candidate.

```json
{
  "candidateId": "117583b904e2cb48e41dc4887a43d2774089c7df592932b2aae3141b805532a0",
  "pdfSha256": "b7eb126d951ee97008a1668254fff8a3f8b66d7081a12eb0f3003ee63aaac0eb",
  "sourceIdentity": "7d1b211796176d5f7bc87966f4408ac3da183ed0a10a6b24e0d675bf3b2794da",
  "manifestFingerprint": "90bbe4dd068383eb4e51d8179be25bb3f6545e5f6c63c9e7b6f5d9206c4a9667",
  "pageCount": 2,
  "mappedFacts": 40,
  "surfaceParity": "pass"
}
```

The candidate, draft receipt, and viewer are retained under site/.artifacts/profile/pdf/. The repository's release validator requires a human review bound to the exact candidate before promotion. No human reviewer identity or checklist was fabricated. The old site/public/resume.pdf and verification/resume/current-release.json are unchanged.

The résumé page now offers a PDF link only when the saved release identities and actual PDF hash match the current approved source and résumé manifest. A stale public file is therefore no longer presented as the current résumé; it remains directly reachable at its existing URL until promotion. Private receipt data is kept out of page props and client assets.

This work has not been committed, pushed, or deployed. PDF promotion and a new human web-accessibility review remain separate from the completed content edit and automated checks.
