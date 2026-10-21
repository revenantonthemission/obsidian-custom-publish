# Entities: Résumé Certifications

This change extends the existing profile model; it adds no new aggregate. Brownfield source of truth for the current shapes: `aidlc/spaces/default/codekb/obsidian-blog/` (Profile Domain) and `inception/reverse-engineering/developer-scan.md`. Units Generation and Domain Design are skipped by this plan, so the existing code structure is the domain design.

```yaml
entities:
  - name: DatePoint
    description: One end of a period. Gains a third precision, a full calendar date.
    variants:
      - tag: year
        value: { logical_type: string, format: "YYYY", required: true }
      - tag: year-month
        value: { logical_type: string, format: "YYYY-MM", constraints: ["month 01-12"] }
      - tag: date
        value: { logical_type: string, format: "YYYY-MM-DD", constraints: ["month 01-12", "a real calendar day for that month and year"] }
    constraints:
      - "The stored value stays ISO-style with hyphens; dots are display only (BR2.1, BR3.1)."

  - name: Period
    description: Unchanged shape; the start and end share one precision.
    attributes:
      - { name: start, logical_type: DatePoint, required: true }
      - { name: end, logical_type: "DatePoint | present", required: true }
    constraints:
      - "start and end have the same tag, unless end is present (BR1.2)."
      - "start is not after end (BR1.3). An end after today is valid."

  - name: Certification
    description: Unchanged shape, used by two collections. The issuer and evidence fields already exist.
    attributes:
      - { name: id, logical_type: "entity id", required: true, unique: true }
      - { name: order, logical_type: "display order", required: true }
      - { name: title, logical_type: "public fact, single-line text", required: true }
      - { name: issuer, logical_type: "public fact, single-line text", required: false }
      - { name: period, logical_type: "public fact, Period", required: false }
      - { name: details, logical_type: "content blocks", required: true, default: [] }
      - { name: evidence, logical_type: "list of EvidenceLink", required: true, default: [] }

  - name: ProfileData
    description: Gains one collection.
    attributes:
      - { name: credentials, logical_type: "list of Certification", required: true, description: "Professional certificates; rendered in the 자격증 section. New." }
      - { name: certifications, logical_type: "list of Certification", required: true, description: "Language certificates; rendered in the 어학 자격 section. Unchanged meaning." }
    constraints:
      - "A certification id is unique across both collections, so no certification sits in two sections (BR4.1)."

  - name: EvidenceLink
    description: Unchanged; used for the AWS verification link.
    attributes:
      - { name: label, logical_type: "public fact, single-line text" }
      - { name: destination, logical_type: "public fact, external or internal destination" }

  - name: FactEvidenceSource
    description: A review evidence entry in the approval chain. One is added.
    attributes:
      - { name: id, logical_type: string, allowed_values: ["E01".."E16"] }
      - { name: kind, logical_type: string, description: "E16 is a user confirmation" }
      - { name: recordedAt, logical_type: timestamp }

relationships:
  - "ProfileData 1 -> 0..* Certification as credentials"
  - "ProfileData 1 -> 0..* Certification as certifications"
  - "Certification 1 -> 0..1 Period"
  - "Certification 1 -> 0..* EvidenceLink"
  - "public fact *..1 FactEvidenceSource (through the evidence membership map)"
```

## Content after this change

| Collection | Section | id | title | issuer | period | evidence |
|---|---|---|---|---|---|---|
| credentials | 자격증 | `aws-solutions-architect-associate` | `AWS Certified Solutions Architect – Associate` | `Amazon Web Services` | date 2026-07-17 – date 2029-07-17 | `인증 확인 링크` → `https://cp.certmetrics.com/amazon/en/public/verify/credential/eede0b68fb004a24bdcce600d3dd92cf` |
| certifications | 어학 자격 | `opic-ih` | `OPIc IH` | `ACTFL` | date 2025-09-06 – date 2027-09-06 | none |

`hsk-6` and both of its facts are removed.

## Summary

- **One new date precision, `date`, for full dates.** It is stored as `YYYY-MM-DD` and shown with dots.
- **One new collection, `credentials`, for professional certificates.** It reuses the Certification shape, so the issuer and link fields need no model change.
- **Why a second collection rather than a category field.** A section-membership field would be an approved fact that never renders, and the PDF renderer allows each approved fact to render exactly once. A collection carries membership in the structure digest instead.
- **One new review evidence entry, E16.** It records the maintainer's confirmation.
