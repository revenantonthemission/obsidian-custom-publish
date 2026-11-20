# Functional Specification — U4 `u4-navigation`

Upstream: `inception/units-generation/unit-of-work.md` (U4), `unit-of-work-story-map.md`; `inception/user-stories/stories.md` — this unit implements **US6.1, US6.2** and its share of **US7.1**; `inception/requirements-analysis/requirements.md`; `inception/refined-mockups/` (M0, interaction spec, accessibility checklist); `inception/domain-design/components.md` (SiteChrome); `inception/contract-design/contract-summary.md` (C3 markers).

Rules are in `rules.md`. U4 owns no persisted data and no route; its only input is the page pathname and the two navigation models it renders. Components are in `frontend-components.md`.

## 1. Scope

| In | Out |
|---|---|
| the primary navigation model with one item | the `/writing` routes themselves (U2) |
| the marker rule (page / section / none) | moving Tags and Graph and the redirects (U3) |
| the top bar and navigation sheet rendering | the manual 16-state accessibility review rerun (owner, release end) |
| the profile local navigation preserved | search, appearance and every other bar control |

## 2. Inputs

| Input | Source | Notes |
|---|---|---|
| Page pathname | Base layout → `Header` | Astro `url.pathname`; normalised by the marker rule (BR1.2) |
| Primary navigation model | `site/src/lib/navigation.ts` | one frozen item, Writing → `/writing` (BR1.1) |
| Profile local navigation model | `site/src/lib/navigation.ts` | 홈, Résumé, Portfolio; unchanged (BR1.5) |
| Chrome markup and styles | `Header.astro`, `MobileNav.tsx`, `chrome.css` | existing bar, sheet and indicator |

## 3. Workflows

### W1 — Build the primary navigation model

1. At build time, create the one-item model `[{ href: '/writing', label: 'Writing' }]`.
2. Freeze the array and each item.
3. Keep the profile local model separate and unchanged.

### W2 — Resolve the Writing marker (BR1.2, BR1.3)

1. Take the pathname and drop a query string and fragment if present.
2. Drop one trailing slash unless the path is `/`.
3. Classify the result:
   - exactly `/writing` → marker `page`;
   - starts with `/writing/` → marker `section`;
   - otherwise → no marker.
4. Map the marker to the rendered attribute: `page` → `"page"`, `section` → `"true"`, none → absent.
5. Return one frozen state per model item; at most one primary item is marked.

### W3 — Render the top bar at 768 px and wider (BR2.1)

1. Render the bar's existing `<nav aria-label="주요 탐색">`.
2. Render the one Writing link with the marker from W2.
3. Show the same indicator for `page` and `section`: the current-text weight and the 2 px underline already used for the current item, extended to `aria-current="true"`.
4. Keep the link's target at least 44 × 44 px and leave search, appearance and the sheet trigger unchanged.
5. If the model or the pathname fails validation, stop the build (existing fail-closed behaviour), never render a guessed marker.

### W4 — Render the phone sheet under 768 px (BR2.2)

1. The bar renders the existing menu trigger.
2. The sheet is a native `<details>` disclosure with static HTML: a `<summary>` labelled "주요 탐색 메뉴" and a `<nav aria-label="주요 탐색">`.
3. The sheet lists the same one item, Writing → `/writing`, on a 52 px row.
4. When the marker is `page` or `section`, the row shows the same indicator (the existing check icon) and carries `aria-current`; otherwise it shows the chevron and no attribute.
5. While the sheet is open, the page behind it is hidden from view and focus, as today.
6. The sheet opens and the Writing link navigates with JavaScript disabled.

### W5 — Profile pages keep their local navigation (BR1.5)

1. `/resume` and `/portfolio` still render the profile shell.
2. The local navigation still lists 홈, Résumé and Portfolio and marks exactly the current route with `aria-current="page"`.
3. The primary bar on those pages shows Writing with no marker.

## 4. Screen states

| Path | Writing marker | Top bar | Phone sheet |
|---|---|---|---|
| `/` | none | plain link, no `aria-current` | plain row, chevron |
| `/writing` | `page` | indicator + `aria-current="page"` | indicator + `aria-current="page"` |
| `/writing/` | `page` | same as `/writing` | same as `/writing` |
| `/writing/all`, `/writing/all/` | `section` | same indicator + `aria-current="true"` | same indicator + `aria-current="true"` |
| `/writing/tags`, `/writing/tags/<tag>`, `/writing/graph` | `section` | same indicator + `aria-current="true"` | same indicator + `aria-current="true"` |
| `/resume`, `/portfolio` | none | plain link; the local nav marks the route | plain row |
| `/posts/<slug>`, `/hubs/<slug>`, `/404` | none | plain link | plain row |

The `/writing/tags*` and `/writing/graph` rows describe the marker only; U3 creates those routes. The marker rule does not wait for them (BR1.4).

## 5. Edge cases

| Case | Behaviour | Rule |
|---|---|---|
| `/writing?ref=nav#top` | query and fragment dropped → `page` | BR1.2 |
| `/writing/all?from=writing` | → `section` | BR1.2 |
| `/writing/` | one trailing slash dropped → `page` | BR1.2 |
| `/writing/all/` | one trailing slash dropped → `section` | BR1.2 |
| Korean tag segment, percent-encoded (`/writing/tags/%EC%9A%B4%EC%98%81%EC%B2%B4%EC%A0%9C`) | prefix classification only; → `section` | BR1.2 |
| `/writing-old`, `/writingold` | no prefix match → none | BR1.2 |
| `/Writing`, `/WRITING/all` | routes are case-sensitive → none | BR1.2 |
| `/writing//all`, backslash, control or whitespace, invalid percent escape, encoded slash (`%2f`) | rejected by the existing path validation; the build fails closed | BR1.2 |
| JavaScript disabled | the sheet still opens and the Writing link still navigates | BR2.2 |
| Empty or altered primary model | build fails closed; no page ships with a guessed navigation | BR1.4, BR2.1 |

## 6. Contracts and integration

| Point | Owner | U4 use |
|---|---|---|
| C3 `/writing` route | U2 | the primary item's href |
| C3 marker table | U4 | `page` on `/writing`; `section` on `/writing/<anything>`; none elsewhere |
| C3 `/writing/all` | U2 | gets the section marker as soon as U4 lands |
| U3 moved routes | U3 | inherit the section marker from BR1.2 without another U4 change |
| Profile local navigation | existing | unchanged (FR6.3) |

Changing `navigation.ts`, `Header.astro`, `MobileNav.tsx` and `BaseLayout.astro` (and the indicator rules in `chrome.css`) invalidates the manual 16-state accessibility review; the owner redoes it once at release end. U3's link check depends on U4 having removed Tags and Graph from the bar and the sheet.

## 7. Test anchors (test-first)

| Behaviour | Test |
|---|---|
| BR1.1–BR1.4 | Vitest `tests/unit/profile-metadata-navigation.test.ts`: the one-item primary model, the marker table (page/section/none, trailing slash, query, case, segment-aware negatives), frozen models, fail-closed paths |
| BR1.4 | `tests/pbt/u1/profile-metadata-navigation.pbt.test.ts` (U1-P10): updated to the one-item model and the marker vocabulary; arbitraries generate `/writing` and `/writing/<segment>` cases |
| BR1.5 | `tests/unit/profile-metadata-navigation.test.ts` and `tests/e2e/hig-profile.spec.ts`: the profile local navigation is unchanged |
| BR2.1, BR1.3 | `tests/e2e/hig-chrome.spec.ts`: the bar carries one Writing link; `aria-current="page"` on `/writing`, `aria-current="true"` on `/writing/all`, none on `/` and `/resume`; the indicator is visible for both values |
| BR2.2 | `tests/e2e/hig-chrome.spec.ts`: the sheet lists one 52 px row at 320 px, opens and navigates to `/writing` with JavaScript off, and hides the page behind it while open |
| BR2.3 | the axe matrix in the HIG suite via `HIG_ROUTES`, light/dark, four widths, reduced motion; the origin check |
| BR2.4 | `just crossunit` |
| BR2.5 | `aidlc`-recorded Construction Verification Command at build-and-test |

The existing four-item expectations in `hig-chrome.spec.ts` (sheet row count, `mobile-navigation-link-tags`) and in the U1-P10 property are updated by this unit, not deleted.

## 8. Rules summary (derived from `rules.md`)

- **Model:** one primary item, Writing → `/writing`; Tags, Graph, Résumé and Portfolio leave the bar and the sheet; the profile local navigation is untouched.
- **Marker:** pure path rule — `/writing` → `page`, `/writing/...` → `section`, else none — rendered as `aria-current="page"`, `"true"` or no attribute, with one visible indicator.
- **Chrome:** one bar link at ≥ 768 px, one 52 px sheet row under 768 px, working without JavaScript; the accessibility, origin and existing-suite bars hold.
