# Security Requirements — U2 `u2-writing-section`

Upstream: `inception/requirements-analysis/requirements.md` (NFR1, NFR2, NFR3, NFR8; FR4.6); `construction/u2-writing-section/functional-design/functional-spec.md`, `rules.md`; `inception/contract-design/contract-summary.md` (C2 input).

## Context

U2 renders public data that U1 has already published (`content/meta/*.json`). It has no input from visitors, no forms, no authentication, no secrets and no runtime code. The risks are leaking content that should not be listed, and adding a third-party request.

| Threat | Control | Requirement |
|---|---|---|
| A site page, the retired note or a hub shown as a post | lists take only ordinary posts from the post metadata; site pages are never in it (U1) | NFR5.19 |
| Post titles or summaries interpreted as HTML | render through Astro text expressions only, never `set:html` for titles, summaries or dates | NFR5.20 |
| Another origin requested by the new pages | no new font, script, image or CDN; same-origin links only | NFR2.2 |
| A link that works only with JavaScript | plain anchors; no island | NFR3.2 |

## Requirements

| ID | Requirement | Verification | Source |
|---|---|---|---|
| NFR5.19 | Lists on `/`, `/writing` and `/writing/all` contain only entries with `is_hub: false` from `content/meta`. The set of `/posts/<slug>` links on `/writing/all` equals the ordinary-post set, so no page, retired note or hub appears. | Vitest on the list functions; Playwright NFR8 equality test against `content/meta` | FR4.6, NFR8, BR1.1, BR2.6 |
| NFR5.20 | Titles, summaries, counts and dates are rendered as escaped text. A fixture title containing `<b>` and `&` renders literally. | Vitest render test on a list component with a hostile title | team Code Style |
| NFR2.2 | `/writing` and `/writing/all` request nothing from another origin | Playwright request log (all origins = site origin) | NFR2, AC7.1.2 |
| NFR3.2 | All content and links of `/`, `/writing` and `/writing/all` work with JavaScript off | `just crossunit` (JS-off specs extended to `/writing` and `/writing/all`) | NFR3, AC7.1.3 |
| NFR1.9 | `/writing` and `/writing/all` pass axe WCAG 2.2 AA at 320, 768, 1024 and 1440 px in light and dark plus reduced motion. Focus is never hidden under the sticky header (WCAG 2.2 2.4.11). | `HIG_ROUTES` extended; a Playwright focus-visibility test that tabs to a row under a stuck header | NFR1, AC7.1.1 |
| NFR1.10 | One h1 and an h2 per section on each page; targets of at least 44 × 44 px for rows, capsules and the back link | Playwright DOM and bounding-box checks | NFR1 |
| NFR6.9 | Existing suites stay green on the U2 merge, including the HIG and homepage tests that asserted U1's interim "오늘 발행된 글" | recorded verification command | NFR6, AC7.1.4 |
