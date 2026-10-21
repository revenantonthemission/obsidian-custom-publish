# Performance Test Instructions: Résumé Certifications

## Targets

This change adds content and a section to the résumé, so its only performance requirement is the CSS budget.

| ID | Target | Source | Measured by |
|---|---|---|---|
| PT-1 | profile-only CSS at most 24,576 B gzip | NFR6 | the "profile CSS budget" test in `hig-profile.spec.ts`, run by IT-4 |
| PT-2 | blog CSS per route at most 30,720 B gzip (regression) | HIG redesign NFR2 | the "blog CSS budget" test in `hig-performance.spec.ts`, run by IT-4 |
| PT-3 | mobile Core Web Vitals on `/resume` (regression) | HIG redesign NFR2 | the mobile-network test in `hig-performance.spec.ts`, run by IT-4 |

No new load test applies. The site is static, and the change adds a few lines of text and one link.
