# Requirements: Résumé Certifications

## Intent Analysis

The maintainer wants the résumé's certifications to be current and exact [desc]:
- OPIc IH stays, with its real issue and expiry dates.
- The expired 新HSK 6급 comes off.
- The new AWS Certified Solutions Architect – Associate is added, in its own 자격증 section, with a link that lets a reader verify it.

The dates are shown to the day, as an issue-to-expiry range, so a reader can see that each certificate is valid. Every period on the résumé moves to one dotted date style [Q1].

The facts are public career claims. They go through the existing fact approval chain, backed by the maintainer's confirmation [Q6], and reach the PDF résumé through a new candidate.

- **Type:** content update plus a model extension (day-precision dates, a second certification section).
- **Scope:** the profile subsystem: the data model, the fact approval chain, the résumé presentation and the PDF résumé.
- **Complexity:** standard. The facts are simple, but the date precision is restated in about eight modules [codekb].

## Functional Requirements

### FR1 Certification facts

- **FR1.1** OPIc IH is shown with the period 2025-09-06 to 2027-09-06 [desc].
- **FR1.2** 新HSK 6급 no longer appears on the résumé web page, in its print view or in the PDF, and no longer exists in the approved fact source [desc].
- **FR1.3** A certification titled exactly `AWS Certified Solutions Architect – Associate` (en dash, U+2013) is shown with the period 2026-07-17 to 2029-07-17 [desc][Q3].
- **FR1.4** Each certification shows its issuer: `Amazon Web Services` for the AWS certificate and `ACTFL` for OPIc IH [Q4].
- **FR1.5** The AWS certificate links to `https://cp.certmetrics.com/amazon/en/public/verify/credential/eede0b68fb004a24bdcce600d3dd92cf` as an external verification link. Its link text is a Korean label that names the certificate [Q5].

### FR2 Day-precision periods

- **FR2.1** A period point can be a full date (year, month and day) as well as a year or a year and month. A full date is valid only when it is a real calendar date. For example, `2026-02-30` is rejected.
- **FR2.2** Both points of a period share one precision, as they do today. An end date after today is valid: a validity window that runs into the future is not a reversed range.
- **FR2.3** Every layer that checks or carries a period accepts the full-date precision and rejects malformed values with its existing coded error:
  - validation;
  - the fact approval inventory and digests;
  - the résumé manifest;
  - the PDF evidence reader and the PDF inspector.

### FR3 Sections

- **FR3.1** The résumé has a new section headed `자격증`, holding the AWS certificate [desc].
- **FR3.2** The `어학 자격` section stays, holding OPIc IH [desc].
- **FR3.3** The section order is 학력, then `자격증`, then `어학 자격` [Q2].
- **FR3.4** Each certification appears in exactly one section. A section with no entries is not rendered.
- **FR3.5** The new section has the same structure and semantics as the existing certification section:
  - a level-2 heading;
  - the same entry layout for title, issuer, period and link;
  - its own `data-profile-section` marker, which the PDF renderer maps to a manifest ordinal.

### FR4 Date display

- **FR4.1** Every period on the résumé is written with dots [Q1]:
  - a full date as `YYYY.MM.DD`;
  - a year and month as `YYYY.MM`;
  - a year as `YYYY`.

  The range separator stays ` – ` (en dash), and an open end stays `현재`. Examples: `2025.09.06 – 2027.09.06` and `2023.07 – 2023.08`.
- **FR4.2** The web page, the print view and the PDF show the same text for each period, and the PDF fact-parity checks compare that dotted text.

### FR5 Fact approval and evidence

- **FR5.1** A new fact inventory revision (r9) lists the changed facts:
  - removed: the HSK facts;
  - revised: the OPIc period;
  - added: the AWS title, issuer, period and link, the OPIc issuer, and the new section's membership.

  Its canonical digest is pinned like r8's.
- **FR5.2** A new evidence entry records the maintainer's confirmation in this conversation (2026-10-21) of the OPIc dates, the AWS certificate and its dates, the issuers, the link and the HSK removal [Q6]. The changed facts cite that entry instead of E01.
- **FR5.3** A new approval receipt (`fact-approval.json` and the pinned values in `production-profile.ts`) replaces the r8 receipt. The build runs only with a receipt that matches the new inventory, as today. A revision note in `docs/resume/product-engineer/` records the request, the confirmation and the digests, as `revision-r7.md` does.

### FR6 PDF résumé

- **FR6.1** A new PDF candidate is prepared with `npm run resume:pdf -- --prepare`. It shows every change in FR1–FR4 and passes the web, print and PDF fact parity.
- **FR6.2** The PDF may grow by one page if the new section needs it [Q7]. Body text stays at least 10 pt, and no section heading is left alone at the bottom of a page.
- **FR6.3** Promotion (`--promote`) remains the maintainer's step and is not run by this work.

## Non-Functional Requirements

- **NFR1 Accessibility.** The résumé page keeps zero axe violations under the WCAG 2.0, 2.1 and 2.2 A and AA tags, in light and dark, at 320, 768, 1024 and 1440 px. In addition:
  - the new section's heading level and order are logical;
  - the verification link is keyboard-reachable, has a visible focus ring and an accessible name, and is marked as external like the other external links;
  - the maintainer redoes the 16-state manual review after the change, because review-subject files change.
- **NFR2 Truthfulness.** The résumé states only facts the maintainer confirmed. No date, issuer or credential is inferred.
- **NFR3 Fail-closed approval.** If any fact changes without a matching receipt, the build stops with the existing coded error, as today.
- **NFR4 Determinism.** The inventory and digests are reproducible from the committed files, as r7 and r8 are.
- **NFR5 Test-first.** Each behaviour change starts with a failing test, per the team's TDD practice:
  - the date precision;
  - the dotted display;
  - the new section;
  - the removal and the additions.

  The existing suites stay green: Rust, unit, property tests, `astro check`, Prettier and the HIG browser suite. The property-test generators produce full-date periods too.
- **NFR6 Budget.** The profile-only CSS stays within its 24 KiB gzip budget.

## Constraints

- `site/src/lib/profile/profile-data.ts` is the only production fact source, and it is gated by the approval receipt [codekb].
- Several of the files this change must touch are accessibility review subjects, so their change voids the 2026-10-21 review record: `presentation.ts`, `ResumeContent.astro`, `resume.css`, `print.css` and `resume.astro`. The maintainer redoes the review once, after the change settles (team practice).
- Team practice: branches off `develop`, `--no-ff` merges, Korean `…합니다` commit messages, nothing pushed by this work.
- The PDF release stays the human-reviewed prepare and promote transaction. CI never runs it.

## Assumptions

- **The shared formatter covers the portfolio too.** The portfolio pages share the same period formatter, so their periods also become dotted. One style across the profile is the intent of "dots everywhere" [Q1].
- **OPIc's issuer is ACTFL.** The maintainer chose the option naming it [Q4].
- **The AWS link is public.** The verification URL is safe to publish on the résumé and in the PDF, because the maintainer supplied it for that purpose [Q5].
- **Expiry dates stay as given.** They are shown as the maintainer gave them, with no warning when a certificate nears expiry.

## Out of Scope

- Promoting the PDF, and pushing `develop`. Both are maintainer steps.
- Redoing the 16-state accessibility review. That is a maintainer step after this work.
- Automatic expiry handling, such as hiding a certificate after its expiry date.
- Changes to the blog's own date formats outside the profile pages.

## Open Questions

- **Where the issuer appears:** Functional Design decides where it sits in the entry layout, for example after the title, so that it adds no ambiguity to the PDF fact parity.

## Sources

- **[desc]** Initial description: "Update the résumé certifications. Keep OPIc IH with issue date 2025-09-06 and expiry 2027-09-06. Remove the expired 新HSK 6급. Add AWS Certified Solutions Architect - Associate, issued 2026-07-17, expiring 2029-07-17, in a new separate 자격증 section, keeping 어학 자격 for language certificates. Show exact day-precision dates (issue to expiry), which the profile date types do not support yet. Facts need a new fact inventory revision and approval receipt, and a new PDF candidate."
- **[Q1]–[Q7]** `requirements-analysis-questions.md`, the maintainer's answers of 2026-10-21.
- **[codekb]** `aidlc/spaces/default/codekb/obsidian-blog/` and `inception/reverse-engineering/developer-scan.md`.
