# Tech Stack Decisions — U2 `u2-writing-section`

Upstream: codekb `technology-stack.md`; `construction/u2-writing-section/functional-design/frontend-components.md`; team Code Style.

U2 adds no dependency.

| Area | Decision | Rationale | Alternatives rejected |
|---|---|---|---|
| Pages | Astro pages `site/src/pages/writing/index.astro` and `site/src/pages/writing/all.astro`, server-rendered, no island | NFR3 (works without JavaScript); same pattern as the existing listing pages | A Preact island for the list (adds client JavaScript) |
| List logic | Pure TypeScript module `site/src/lib/writing-lists.ts`; arguments in, frozen arrays out; ordering with an explicit code-point comparator plus a final slug tiebreak | testable in Vitest without a build (BR1.7); deterministic (NFR4) | `localeCompare` (locale-dependent order) |
| Korean date | `resolveKoreanBuildDate(env, now)` with an injectable clock; the override is validated as a real calendar date | FR3.4 needs Korean time; unit-testable instants (U2 design review) | Changing U1's `resolveBuildDate` in place (keeps U1's semantics unclear) |
| Styles | New `site/src/styles/writing.css`, imported by the Writing pages and the homepage; the existing `data-material` glass material for the sticky header; only `--c-` tokens | design-system mapping; keeps `global.css` and the review-subject set untouched | Adding rules to `global.css` |
| Tests | Vitest (`tests/unit/writing-lists.test.ts`), fast-check (`tests/pbt/u2/writing-lists.pbt.test.ts`), Playwright (`tests/e2e/hig-writing.spec.ts` and `HIG_ROUTES`) | team Testing Posture | — |
| Fixtures | Add one undated ordinary post and a second-year post to `fixtures/vault/Notes/`; the HIG runner sets `HOMEPAGE_TODAY_OVERRIDE` to a date inside a fixture week | makes every screen state renderable (U2 design review) | Mocked metadata in e2e |
