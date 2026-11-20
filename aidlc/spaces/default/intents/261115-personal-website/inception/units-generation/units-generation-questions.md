# Units Generation Questions — first release

Settled, not asked: everything ships the same way (each unit merges to `develop` on its own branch and the nightly job deploys it); the `feature` plan builds a thin end-to-end slice first, so the first unit must run through preprocess, site build and the existing tests on its own (team Walking Skeleton).

Proposed split (components from Domain Design):

| Unit | Contents | Stories | Kind |
|------|----------|---------|------|
| U1 `u1-publish-boundary` | Both-folder scan, note classification, retired homepage note, site-pages output, posts-only stamping, CLI pages input, Jenkins/Justfile/fixture wiring; the homepage switches to the site-built opening (title, name, introduction, Résumé/Portfolio) because the homepage artifact disappears | US1.1–1.3, US2.1–2.2, US3.1–3.2 | service |
| U2 `u2-writing-section` | List module (week, recent, by year, topics), `/writing`, `/writing/all`, the homepage's "이번 주 글" | US3.3–3.4, US4.1–4.2 | ui |
| U3 `u3-writing-moves` | Tags and Graph under `/writing/`, every tag link in layouts, redirect table, static-server redirects | US5.1–5.2 | ui |
| U4 `u4-navigation` | Writing-only top bar and sheet with the current markers | US6.1–6.2 | ui |

## Q1. [Architect] Does this split work for you?

A. Yes: four units as proposed; U1 is the thin end-to-end slice
B. Fewer, coarser units: U1 as proposed, then one unit for everything else (U2–U4 together)
C. Move the homepage opening (US3.1–3.2) out of U1 into U2, and keep the old vault homepage working until U2 lands
X. Other (please specify)

[Answer]: A

## Q2. [Architect] May units with no dependency between them be built at the same time?

With the split above, U3 and U4 both build on U2 but not on each other.

A. Yes: independent units may be built in parallel, each on its own branch
B. No: build strictly one unit at a time
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Four units as proposed: U1 `u1-publish-boundary` (service), U2 `u2-writing-section` (ui), U3 `u3-writing-moves` (ui), U4 `u4-navigation` (ui); U1 is the thin end-to-end slice (Q1)
- Units with no dependency between them may be built in parallel, each on its own branch (Q2)
- Every unit merges to `develop` on its own branch and ships with the nightly deploy (settled)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
