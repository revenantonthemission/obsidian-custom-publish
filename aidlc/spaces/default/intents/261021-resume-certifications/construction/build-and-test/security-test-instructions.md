# Security Test Instructions: Résumé Certifications

## Targets

- **The new external link** is HTTPS. It passes the existing external-URL validation, and it is backed by public-source evidence for that exact URL (E17).
- **Approval stays fail-closed.** `buildReviewRecords` and the approval gate are not loosened (NFR3). The single-fact rule for PDF elements stays strict, apart from the narrow pairing of an evidence link's label and destination.
- **No new dependency or third-party request.**

## Checks

| ID | What | Command | Pass criterion |
|---|---|---|---|
| ST-1 | no cross-origin request on any route, `/resume` included | "third parties (NFR4)" in `hig-performance.spec.ts`, run by IT-4 | 0 requests to another origin. The verification link is an `<a href>`, not a fetch |
| ST-2 | approval gate unchanged | `git diff 96a6066 develop -- site/src/lib/profile/production-profile.ts`: read the `buildReviewRecords` hunk | only the test-only export changes; the external-URL rule is intact |
| ST-3 | the external link is validated | IT-2 (`production-profile.test.ts`, `profile-validation.test.ts`) | passes |
| ST-4 | no new dependency | `git diff 96a6066 develop -- site/package.json site/package-lock.json` | empty |
| ST-5 | advisories | `cd site && npm audit --omit=dev` | unchanged from before this work: 27 advisories, 1 critical and 18 high, all pre-existing |
