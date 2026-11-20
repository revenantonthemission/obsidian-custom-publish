# Security Requirements — U4 `u4-navigation`

Upstream: `inception/requirements-analysis/requirements.md` (NFR1, NFR2, NFR3, NFR5, NFR6); `construction/u4-navigation/functional-design/functional-spec.md`, `rules.md`; `inception/contract-design/contract-summary.md` (C3, C5); codekb `technology-stack.md`.

## Context

U4 renders a build-time navigation model into existing chrome. It takes no input from visitors, has no forms, authentication, secrets or runtime code, and writes nothing. The risks are a guessed or misleading current state, an inaccessible indicator, a third-party request, a navigation that needs JavaScript, and a change that breaks the existing suites.

| Threat | Control | Requirement |
|---|---|---|
| A page ships with a guessed or wrong marker because the model or path is invalid | the existing navigation validation fails the build; the marker is never guessed | NFR5.21 |
| The current state is announced more than once on one surface, wrongly, or by colour alone | one marked primary item per surface; only `aria-current="page"`/`"true"`; weight, underline or check icon in addition to colour | NFR1.11 |
| A target too small or a sheet that leaves the page focusable behind it | 44 × 44 px minimum targets, 52 px sheet row, page hidden from view and focus while open | NFR1.12 |
| A new asset or CDN request from the changed chrome | same-origin `/writing` only; no new font, script, image or stylesheet | NFR2.3 |
| Navigation that only works with JavaScript | native anchors and a native `<details>` sheet | NFR3.3 |
| A merge that breaks the four-item expectations or the profile navigation | re-run the full verification command; update the old expectations, do not delete them | NFR6.10 |

## Requirements

| ID | Requirement | Verification | Source |
|---|---|---|---|
| NFR5.21 | An invalid primary model (not exactly one item, Writing → `/writing`) or an unnormalisable pathname (control or whitespace characters, a bad percent escape, an encoded slash, a backslash, a double slash) stops the site build through the existing navigation validation. No page ships with a guessed marker and no new write path is added. | Vitest fail-closed cases in `tests/unit/profile-metadata-navigation.test.ts`; the build fails on a hostile model fixture | NFR5, BR1.2, BR1.4 |
| NFR1.11 | Every HIG route (`/`, `/writing`, `/writing/all`, `/writing/tags`, `/writing/tags/<tag>`, `/writing/graph`) passes axe WCAG 2.2 AA at 320, 768, 1024 and 1440 px in light and dark plus the reduced-motion check. Only `aria-current="page"` and `aria-current="true"` are emitted, at most once per surface — the desktop bar and the phone sheet each carry one, so the two surfaces together carry two — and the indicator is not colour alone. Reworded by the maintainer on 2026-11-20, a human-made requirement change: the requirement holds per surface, not per page. | The existing `HIG_ROUTES` axe matrix; Playwright attribute assertions on the bar and the sheet | NFR1, BR1.3, BR2.3, AC7.1.1, AC7.1.2 |
| NFR1.12 | The Writing link and the sheet row have targets of at least 44 × 44 px (the sheet row is 52 px), the Writing control is reachable by keyboard and labelled, and an open sheet hides the page behind it from view and focus. | Playwright bounding-box, tab-order and focus checks; axe | NFR1, BR2.1, BR2.2 |
| NFR2.3 | No changed page requests any origin other than the site's own; U4 adds no font, script, image, stylesheet or CDN reference. | HIG request log: every request origin equals the site origin | NFR2, BR2.3, AC7.1.2 |
| NFR3.3 | With JavaScript off every page still renders the bar and the Writing link, and the phone sheet opens and navigates. `just crossunit` passes with only the fixture's deliberate broken image. | `just crossunit` (link sweep plus JavaScript-off specs extended to `/writing`) | NFR3, BR2.2, BR2.4, AC7.1.3 |
| NFR6.10 | The existing suites stay green on the U4 merge: `cargo test --release`, `npm run test:unit`, `npm run test:pbt`, `npm run format:check`, `npx astro check` and the HIG Playwright suites. The four-item expectations are updated (unit, U1-P10 property, `hig-chrome.spec.ts`, `profile-presentation.test.ts`, `crossunit.spec.ts`), not deleted, and the profile local navigation tests are unchanged. | The recorded Construction Verification Command | NFR6, BR2.5, AC7.1.4 |
