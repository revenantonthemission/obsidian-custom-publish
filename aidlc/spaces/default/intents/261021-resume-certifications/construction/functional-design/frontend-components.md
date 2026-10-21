# Frontend Components: Résumé Certifications

## Component Hierarchy

```
resume.astro
└─ ResumeContent.astro         one branch per section kind
   ├─ … intro, skills, highlights, projects, education (unchanged)
   ├─ section kind "credentials"     → <section data-profile-section="credentials"> 자격증   (new branch)
   └─ section kind "certifications"  → <section data-profile-section="certifications"> 어학 자격 (now explicit, no longer the final else)
      └─ article.resume-certification-entry (shared by both)
         ├─ h3 title
         ├─ p issuer            (shown when present: now always)
         ├─ p.profile-period    dotted text (BR3.1)
         └─ ContactActions      evidence links, variant evidence-actions (AWS: 인증 확인 링크, external)
```

## Props and Data

- `presentation.ts` gains a view kind `credentials` with heading `자격증` and entries `CertificationView[]`. The view kind `certifications` keeps heading `어학 자격`.
- `CertificationView` is unchanged: `title`, `issuer?`, `period?`, `details`, `evidence`.
- `periodView().text` is built by the dotted formatter in BR3.1. It is the single formatter for every profile period.
- **No else fallback.** `ResumeContent.astro` matches every section kind explicitly. An unknown kind fails the type check rather than rendering as certifications.

## Interaction and Accessibility

- **Headings.** Each section has an `h2`, and each entry an `h3`. The heading order stays logical: 학력 (h2), then 자격증 (h2), then 어학 자격 (h2).
- **The link.** `인증 확인 링크` is a normal link rendered through ContactActions. It is keyboard-reachable, shows the global focus ring and carries the existing external-link treatment. Its accessible name includes the certificate, as the existing `${title} 근거` group label does.
- **Print.** The new section follows the existing certification print rules: body text at least 10 pt, and no orphaned heading. It can move the résumé onto one more page.
- **Styling.** `resume.css` and `print.css` rules for `.resume-certifications` extend to the new section, either through a shared class or by adding `.resume-credentials`. No new colours, only `--c-` tokens, and no motion.

## Accessibility Review

`presentation.ts`, `ResumeContent.astro`, `resume.css` and `print.css` are review subjects, so the maintainer redoes the 16-state manual review afterwards (NFR1).
