# Résumé certifications — 2026-10-21 (r9)

This is an internal source and verification record, not public résumé copy. It separates what the maintainer confirmed from the automated checks and from what remains open.

## Request and confirmed facts

The maintainer asked, in their own words: “I would like to fix the 어학 자격 section. OPIc IH's issue date is 2025-09-06 and the expiration date is 2027-09-06 … add another certificate: AWS Certified Solutions Architect - Associate. The issue date is 2026-07-17 and the expiration date is 2029-07-17”. Their answers to the requirements questions (`aidlc/spaces/default/intents/261021-resume-certifications/inception/requirements-analysis/requirements-analysis-questions.md`) settled the rest.

These are the facts the maintainer confirmed, and the approval of this revision covers them:

- **OPIc IH**, issued by **ACTFL**, valid **2025-09-06 to 2027-09-06**. It stays under 어학 자격.
- **新HSK 6급** is removed from the résumé and from the approved fact source.
- **AWS Certified Solutions Architect – Associate** (title with an en dash, U+2013), issued by **Amazon Web Services**, valid **2026-07-17 to 2029-07-17**. It sits in a new 자격증 section, with one external verification link labelled **인증 확인 링크** to `https://cp.certmetrics.com/amazon/en/public/verify/credential/eede0b68fb004a24bdcce600d3dd92cf`.
- **Section order:** 학력, then 자격증, then 어학 자격.
- **Dates:** every profile period is displayed with dots, for example `2025.09.06 – 2027.09.06` and `2023.07 – 2023.08`. Stored values stay ISO with hyphens. The issue-to-expiry range carries no label; that is the maintainer's choice (requirements Q1, option B, extended to dots everywhere).

**What the approval does not cover.** It is not a review of any other fact, of the PDF layout, or of the 16-state manual web accessibility review. The PDF candidate still needs the maintainer's own review before `--promote`, and the manual review is redone separately after this work.

## Evidence

- **E16** (`user-provided`): the maintainer's confirmation in the 2026-10-21 conversation of the OPIc issuer and dates, the AWS certificate with its issuer, dates, section and link label, and the HSK removal. Cited by `certification-opic-ih-issuer`, `certification-opic-ih-period` and the AWS title, issuer and period facts.
- **E17** (`public-source`): the AWS verification link. The approval chain requires every external URL to cite a public source whose `expectedDestination` is that URL (`buildReviewRecords` in `site/src/lib/profile/production-profile.ts`, unchanged). At **2026-10-21T04:24:30Z** the maintainer opened the page themselves and confirmed, in their words, “Everything is correct”: it shows their AWS Certified Solutions Architect – Associate certificate, valid 2026-07-17 to 2029-07-17. E17 records that as `verifier: "Maintainer manual check (…)"` with that `checkedAt`. It is the maintainer's own check, not an automated collector. Cited only by the link's label and destination facts.
- **Automated note (not evidence):** an HTTP request made on 2026-10-21, before the maintainer's check, returned HTTP 200 (`text/html`) with no redirect. The public-source schema has no field for a note, so this result is recorded here only and is not part of E17.
- `certification-opic-ih-title` is unchanged and keeps E01.

## Fact delta from r8

The inventory changes from 120 facts to 124:

- **Removed (2):** `certification-hsk-6-title`, `certification-hsk-6-period`.
- **Revised (1):** `certification-opic-ih-period`, from `year-month 2025-09 – 2025-09` (E01) to `date 2025-09-06 – 2027-09-06` (E16).
- **Added (6):** `certification-opic-ih-issuer` (E16); `certification-aws-solutions-architect-associate-title`, `-issuer`, `-period` (E16); `-evidence-label`, `-evidence-destination` (E17). The AWS facts live under the new canonical path `profile.credentials[id=aws-solutions-architect-associate]`.
- **Structure:** the structural decisions gain `credentials` (the AWS entry with its issuer and one evidence link), and `certifications` now holds OPIc IH alone, with its issuer.
- Every other record keeps its value and evidence. Each record's decision record now names the r9 decision.

## Approval receipt and reproducibility

The exact canonical inventory digest input is [inventory-r9.json](inventory-r9.json). It holds one record per line; the layout does not affect the digest, which hashes the canonical form (keys sorted, no whitespace, UTF-8). The records, the evidence table and the structural decisions were produced by the production code itself: `productionProfileTesting.materialize`, `buildReviewRecords` and `evidenceSources` (the record builder and evidence table were exposed on that test seam for this purpose), with `productionProfileTesting.canonicalDigest` for every digest. The approved-records, materialized and production-diff digests use their existing domains. The values were calculated once and pinned in `production-profile.ts` (`EXPECTED_RECEIPT`) and `verification/profile/fact-approval.json`. No runtime approval path was added, and no check was loosened.

The inventory digest can be reproduced from the committed file with any canonical JSON hash; the same method reproduces r8's pinned digest `5bcfa4743718a00b5c802e6ee842da27e22671409909ea6adacaa0872c8200c1`:

```
python3 -c "import json,hashlib;d=json.load(open('docs/resume/product-engineer/inventory-r9.json'));print(hashlib.sha256(json.dumps(d,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest())"
```

The decision time is the maintainer's link check, 2026-10-21T04:24:30Z, which completed the confirmation.

```json
{
  "schemaVersion": 1,
  "receiptId": "profile-fact-approval-2026-10-21-r1",
  "inventoryRevision": "profile-facts-r9",
  "inventoryDigest": "fba4c029a07f904eb91dc5b5bb920f33ea0ba0b41de07bd695f58323a34bd89c",
  "productionDiffRevision": "profile-production-diff-r9",
  "productionDiffDigest": "2259e535c0fdece8a1a8f89021a8e639be3ecc18ef7911ed7410c8631a2f4c56",
  "approvedRecordsDigest": "db9270e308a8da9e666c63ecfc3357b9feeb799bde29e5c8ed71d2176cb25ddf",
  "materializedProfileDigest": "1299d4f2fbc8f0b8c53e7c6792c21faa4863fd5d32b0919d2139d75dbb6f88a0",
  "decision": "Approved",
  "decisionAuditId": "PROFILE-RESUME-CERTIFICATIONS-20261021T042430000Z",
  "decisionRecordedAt": "2026-10-21T04:24:30.000Z"
}
```

The previous r8 receipt (`profile-fact-approval-2026-09-27-r2`) remains in Git history.

## Related code changes

- Day-precision periods (`date`) and the dotted display, in every profile layer and in both PDF readers.
- A `credentials` collection rendered as 자격증. The résumé manifest moves to schema 2 (`credentials` at 6, `certifications` at 7); the schema-1 order stays readable, so the stored r8 release record still validates as a schema-1 manifest.

## Publication order

The nightly deploy publishes the web résumé from `develop`, while the PDF changes only on promotion. Promoting the r9 PDF before pushing `develop` keeps the web résumé and the PDF in step. The tracked release (`verification/resume/current-release.json`) still describes the r8 PDF, so the résumé page offers no PDF link until a new release is promoted. This work does not push, deploy or promote.
