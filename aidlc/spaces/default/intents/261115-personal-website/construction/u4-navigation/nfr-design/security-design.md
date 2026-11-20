# Security Design — U4 `u4-navigation`

Upstream: `nfr-requirements/security-requirements.md` (NFR5.21, NFR1.11, NFR1.12, NFR2.3, NFR3.3, NFR6.10); `nfr-requirements/tech-stack-decisions.md`; `functional-design/rules.md` (BR1.1–BR1.5, BR2.1–BR2.5); `functional-design/functional-spec.md`, `frontend-components.md`; `inception/contract-design/contract-summary.md` (C3, C5).

## 1. Approach

U4 has no runtime and takes no visitor input: no forms, no authentication, no secrets, no cookies. Its security work is the current-state contract, the fail-closed path, the origins, the JavaScript-free navigation and the accessibility bar.

| Layer | Control | Requirement |
|---|---|---|
| Fail closed | An invalid primary model (not exactly one item, Writing → `/writing`) or an unnormalisable pathname (control or whitespace characters, a bad percent escape, an encoded slash, a backslash, a double slash) produces the existing coded validation issue `navigation.model.invalid` or `navigation.current.invalid` from `site/src/lib/profile/issues.ts`; `Header.astro` then throws `TypeError('Invalid primary navigation state.')` and the site build stops. U4 adds no new error surface and no new diagnostic code: the existing navigation validation codes are the coded diagnostics. The preprocessor half of NFR5 does not apply to a site-build unit; the fail-closed rule applies and is met by these codes. | NFR5.21 |
| Current state | At most one marked primary item per surface. The desktop bar and the phone sheet are two surfaces, so `/writing` shows the page marker in the bar and in the sheet — one marked link in each, never two in one surface. Only `aria-current="page"` (exact `/writing`) and `aria-current="true"` (`/writing/...`) are emitted; every other path has no attribute. The indicator is not colour alone: weight 600 plus a 2 px `--c-bar-indicator` underline in the bar, the check icon in the sheet. The requirement text was reworded to "once per surface" by the maintainer on 2026-11-20, a human-made requirement change; this design already built it that way. | NFR1.11 |
| Route scope | The axe matrix is the existing `HIG_ROUTES` list at the U4 merge — `/`, the post, hub, tag and graph routes, `/writing`, `/writing/all`, `/404`, `/resume`, `/portfolio` and the two portfolio sub-pages — at 320, 768, 1024 and 1440 px in light and dark, plus the reduced-motion check. `/resume` and `/portfolio` are in scope because U4 changes their bar. `/writing/tags`, `/writing/tags/<tag>` and `/writing/graph` join the matrix when U3 moves them; the marker rule is already unit-tested for those paths, because it never waits for a route to exist. | NFR1.11 |
| Accessibility | The bar link keeps `min-block-size: var(--target)` (44 px) and the sheet row keeps its 52 px minimum, both above the 44 × 44 px floor. The Writing control is reachable by keyboard and labelled. An open sheet hides `.site-main` and `.back-to-top` from view and from focus (`visibility: hidden` in `chrome.css`), so nothing behind it stays focusable and no focus trap is needed. No h1, h2 or landmark changes. | NFR1.12 |
| Origins | No external font, script, image or stylesheet; every link is a same-origin path (`/writing`). | NFR2.3 |
| No JavaScript | The sheet stays a native `<details>` disclosure rendered as static HTML with a native `<summary>`; the Writing item is an anchor. The sheet opens and navigates with JavaScript off. | NFR3.3 |

## 2. Tests (written first)

| Test | Asserts |
|---|---|
| `site/tests/unit/profile-metadata-navigation.test.ts` (extended) | the one-item primary model; the marker table (page, section, none, trailing slash, query and fragment, case sensitivity, segment-aware negatives); frozen model and states; the fail-closed codes `navigation.model.invalid` and `navigation.current.invalid`; the profile local model unchanged |
| `site/tests/pbt/u1/profile-metadata-navigation.pbt.test.ts` (U1-P10, updated) | the one-item model and the marker vocabulary over generated `/writing` and `/writing/<segment>` paths; at most one marked item per surface |
| `site/tests/unit/profile-presentation.test.ts` (updated) | the `PRIMARY_NAVIGATION` constant becomes `['/writing']`; the `assertNavigation` helper accepts `aria-current="true"` as the section marker as well as `"page"`, because the marker now has two values |
| `site/tests/e2e/hig-chrome.spec.ts` (updated) | the bar carries one Writing link; `aria-current="page"` on `/writing`; `aria-current="true"` on `/writing/all`; no attribute on `/` and `/resume`; the indicator is visible for both values; the sheet lists one 52 px row at 320 px, opens and navigates to `/writing` with JavaScript off, and hides the page behind it while open |
| `site/tests/e2e/crossunit.spec.ts` (updated) | `CORE_NAV_TARGETS` becomes `['/writing']`; the link sweep still reports only the fixture's deliberate broken image |
| `HIG_ROUTES` + the existing axe matrix | axe WCAG 2.2 AA at 4 widths × 2 themes plus reduced motion, including `/resume` and `/portfolio` |
| `site/tests/e2e/hig-profile.spec.ts` (unchanged) | the profile local navigation still lists 홈, Résumé and Portfolio and marks exactly the current route |

The JavaScript-off reach that the old `CORE_NAV_TARGETS` covered is preserved elsewhere: Résumé and Portfolio stay reachable from the profile local navigation on their own pages (the unchanged `hig-profile.spec.ts` and `profile-presentation.test.ts`), and `/tags` and `/graph` stay reachable through the Writing landing page, whose capsules U3 repoints at `/writing/tags` and `/writing/graph`.

## 3. Residual risk

A pathname that the browser reports but the router does not know — a mistyped deep link under `/writing` — still shows the section marker. That is the designed behaviour (BR1.2, BR1.3): the marker follows the path shape, not the route table, and U3's routes inherit it without another change.
