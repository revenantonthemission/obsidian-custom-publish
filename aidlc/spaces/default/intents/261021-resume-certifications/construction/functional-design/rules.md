# Business Rules: Résumé Certifications

```yaml
rules:
  - id: BR1.1
    statement: A full-date point is valid only when it names a real calendar day.
    category: validation
    applies_to: DatePoint (tag date)
    trigger: profile validation, fact approval, manifest serialization
    logic: IF the value does not match YYYY-MM-DD, or the month is not 01-12, or the day does not exist in that month and year THEN reject.
    violation: the layer's existing coded error for an invalid period point (validation, fact approval and the manifest each keep their own code)
    source: [FR2.1, FR2.3]
  - id: BR1.2
    statement: Both ends of a period share one precision.
    category: validation
    applies_to: Period
    trigger: profile validation
    logic: IF end is not present AND start.tag differs from end.tag THEN reject.
    violation: the existing mixed-precision period error
    source: [FR2.2]
  - id: BR1.3
    statement: A period never runs backwards, and a future end is allowed.
    category: validation
    applies_to: Period
    trigger: profile validation
    logic: IF start is after end at their shared precision THEN reject. Today's date is never consulted.
    violation: the existing reversed-period error
    source: [FR2.2]
  - id: BR2.1
    statement: Every layer that accepts a period accepts the full-date precision.
    category: constraint
    applies_to: validation, fact approval, résumé manifest, PDF evidence reader, PDF inspector, property-test generators
    trigger: each layer's period check
    logic: IF a point has tag date and passes BR1.1 THEN accept it exactly as year and year-month are accepted.
    violation: none; a layer that rejects a valid date point is a defect caught by tests
    source: [FR2.3, NFR5]
  - id: BR3.1
    statement: Periods display with dots.
    category: calculation
    applies_to: every rendered period on the profile pages
    trigger: presentation
    logic: year YYYY -> "YYYY"; year-month YYYY-MM -> "YYYY.MM"; date YYYY-MM-DD -> "YYYY.MM.DD"; present -> "현재"; the range joins start and end with " – " (space, en dash, space).
    violation: none
    source: [FR4.1]
  - id: BR3.2
    statement: The web page, the print view and the PDF show the same period text.
    category: constraint
    applies_to: PDF fact parity
    trigger: resume:pdf --prepare and the PDF evidence checks
    logic: IF the PDF text for a period fact differs from the BR3.1 text THEN the parity check fails.
    violation: the existing PDF parity error
    source: [FR4.2, FR6.1]
  - id: BR4.1
    statement: Each certification belongs to exactly one section.
    category: constraint
    applies_to: ProfileData.credentials and ProfileData.certifications
    trigger: profile validation
    logic: IF a certification id appears in both collections, or twice in one THEN reject.
    violation: the existing duplicate-id error
    source: [FR3.4]
  - id: BR4.2
    statement: The résumé sections run 학력, 자격증, 어학 자격, and an empty section is omitted.
    category: policy
    applies_to: résumé presentation and manifest
    trigger: résumé assembly
    logic: credentials renders as 자격증 directly after 학력; certifications renders as 어학 자격 after it. IF a collection is empty THEN its section is not rendered and takes no manifest slot.
    violation: none
    source: [FR3.1, FR3.2, FR3.3, FR3.4]
  - id: BR4.3
    statement: Both certification sections share one entry layout.
    category: policy
    applies_to: 자격증 and 어학 자격 entries
    trigger: rendering
    logic: each entry shows its title (level-3 heading), then its issuer when present, then its period, then its evidence links; each section has its own level-2 heading and data-profile-section marker.
    violation: none
    source: [FR3.5, FR1.4, NFR1]
  - id: BR5.1
    statement: The résumé shows exactly the confirmed certification facts.
    category: policy
    applies_to: profile-data.ts
    trigger: fact source edit
    logic: credentials holds the AWS certificate; certifications holds OPIc IH; 新HSK 6급 is absent everywhere; titles, issuers, dates and the link are exactly as confirmed.
    violation: tests fail; the approval chain refuses an unapproved fact
    source: [FR1.1, FR1.2, FR1.3, FR1.4, FR1.5, NFR2]
  - id: BR5.2
    statement: The verification link is external, labelled 인증 확인 링크, and points at the confirmed URL.
    category: validation
    applies_to: the AWS certificate's evidence link
    trigger: profile validation
    logic: destination tag external with the confirmed https URL; label "인증 확인 링크"; it passes the existing external-URL validation.
    violation: the existing evidence-link error
    source: [FR1.5, NFR1]
  - id: BR6.1
    statement: Every changed fact is approved under a new revision backed by new evidence.
    category: authorization
    applies_to: fact approval chain
    trigger: build
    logic: |
      Inventory r9 records:
      - removed: both HSK facts;
      - revised: the OPIc period;
      - added: the OPIc issuer, plus the AWS title, issuer, period, link label and link destination.
      Each changed fact cites E16 (the maintainer's 2026-10-21 confirmation). The receipt in fact-approval.json and the pinned values in production-profile.ts match r9's digests. IF any fact or digest differs THEN the build stops.
    violation: the existing fail-closed approval error
    source: [FR5.1, FR5.2, FR5.3, NFR3, NFR4]
  - id: BR6.2
    statement: Historical release records stay readable.
    category: constraint
    applies_to: résumé manifest section order, release store
    trigger: resume:pdf:verify and the release store
    logic: IF the manifest section order is used to read an existing release record (r8, order with certifications at 6) THEN that record still reads; the new seven-section order applies to new manifests. The design does not require a manifest schema bump unless a stored record is checked against the live order.
    violation: none; a code-generation test pins it
    source: [FR6.1, NFR4]
  - id: BR6.3
    statement: A new PDF candidate is prepared, and promotion stays manual.
    category: policy
    applies_to: PDF résumé
    trigger: end of this work
    logic: prepare once after the change; the PDF may grow one page; body text stays at least 10 pt and no section heading ends a page alone. Never promote automatically.
    violation: none
    source: [FR6.1, FR6.2, FR6.3]
```

## Summary

| ID | Category | In short |
|---|---|---|
| BR1.1 | validation | a full date must be a real day |
| BR1.2 | validation | one precision per period |
| BR1.3 | validation | no reversed periods; future ends allowed |
| BR2.1 | constraint | every period layer accepts full dates |
| BR3.1 | calculation | dotted display, ` – ` separator |
| BR3.2 | constraint | web, print and PDF agree on period text |
| BR4.1 | constraint | one section per certification |
| BR4.2 | policy | 학력 → 자격증 → 어학 자격; empty sections omitted |
| BR4.3 | policy | one entry layout for both sections |
| BR5.1 | policy | exactly the confirmed facts; HSK gone |
| BR5.2 | validation | external link 인증 확인 링크 to the confirmed URL |
| BR6.1 | authorization | r9 inventory, E16 evidence, new receipt |
| BR6.2 | constraint | the r8 release record stays readable |
| BR6.3 | policy | new PDF candidate; manual promotion |
