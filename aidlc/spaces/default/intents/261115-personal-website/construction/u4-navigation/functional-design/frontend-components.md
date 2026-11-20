# Frontend Components — U4 `u4-navigation`

Upstream: `inception/refined-mockups/interaction-spec.md` ("Writing Navigation Item", "Navigation Sheet"), `mockups.md` (M0), `design-system-mapping.md`, `accessibility-checklist.md`; `functional-spec.md`, `rules.md`; `inception/domain-design/components.md` (SiteChrome); `inception/contract-design/contract-summary.md` (C3).

Every component is server-rendered. No island is added; the phone sheet is static HTML inside the existing `<details>` disclosure. The profile local navigation is out of scope and unchanged.

## Hierarchy

```
BaseLayout (every page)
└─ Header                       pathname = Astro.url.pathname
   ├─ site-title link           unchanged; aria-current="page" on "/" only
   ├─ nav.desktop-nav           aria-label="주요 탐색"
   │  └─ PrimaryNavLink × 1     Writing → /writing
   ├─ search trigger            unchanged
   ├─ ThemeToggle               unchanged (existing island)
   └─ MobileNav                 static <details>, no client directive
      └─ PrimaryNavLink × 1     Writing → /writing

ProfileShell (/resume, /portfolio)
└─ ProfileLocalNavigation      unchanged: 홈, Résumé, Portfolio
```

Text fallback: every page renders the floating bar with one Writing link, plus search and appearance; under 768 px the same one item sits in the existing navigation sheet. Profile pages keep their own local navigation.

## Components

| Component | File | Props | Markup and states | data-testid |
|---|---|---|---|---|
| Primary model | `site/src/lib/navigation.ts` | — | `getPrimaryNavigation(): readonly NavigationItem[]` returns one frozen item `{ href: '/writing', label: 'Writing' }` | — |
| Marker rule | `site/src/lib/navigation.ts` | — | pure `resolveNavigationMarker(pathname): 'page' \| 'section' \| null`; normalises and classifies per BR1.2; no I/O | — |
| Primary state | `site/src/lib/navigation.ts` | — | `getPrimaryNavigationState(pathname): ValidationResult<readonly NavigationState[]>` returns one frozen state: `{ href, label, current: boolean, ariaCurrent: 'page' \| 'true' \| null }` where `current = marker !== null`; existing fail-closed validation stays | — |
| Header (top bar) | `site/src/components/Header.astro` | `pathname?: string` (default `/`) | `<nav aria-label="주요 탐색">` with one `<a class="site-nav-link">`; `aria-current={item.ariaCurrent ?? undefined}`; indicator from CSS for both values | `primary-navigation-link-writing` |
| MobileNav (sheet) | `site/src/islands/MobileNav.tsx` | `items: readonly NavigationState[]` | `<details>` + `<summary aria-label="주요 탐색 메뉴">`; one `<a class="mobile-nav-link">`; check icon when `current`, chevron otherwise; `aria-current` from `ariaCurrent` | `mobile-navigation-toggle`, `mobile-navigation-link-writing` |
| ProfileLocalNavigation | `site/src/components/profile/ProfileLocalNavigation.astro` | unchanged | unchanged three-item list with `aria-current="page"` on the current route | `profile-local-navigation`, `profile-local-navigation-link-{home,resume,portfolio}` |

`NavigationState` stays backward-compatible: the `current` boolean keeps the sheet's icon logic and the profile local view unchanged, and `ariaCurrent` carries the attribute value the primary model needs. The profile model leaves `ariaCurrent` as `'page'` or `null`.

## State and data flow

- `BaseLayout` passes `Astro.url.pathname` to `Header`; no component reads the URL itself.
- `Header` calls `getPrimaryNavigationState(pathname)` once. A failed result throws a `TypeError`, as today (fail closed).
- The resulting frozen states go to the desktop link and to `MobileNav`; there is no client state, no effect and no event outside the existing search trigger.
- `getProfileLocalNavigationState(pathname)` keeps its own model and is untouched by the primary change.

## Styles (`site/src/styles/chrome.css`)

- The desktop current indicator extends the existing `.site-nav-link[aria-current='page']` rule to the section value: `.site-nav-link[aria-current='page'], .site-nav-link[aria-current='true']` share the weight and the 2 px `--c-bar-indicator` underline.
- The sheet's icon rule extends the same way: `.mobile-nav-link[aria-current='page'], .mobile-nav-link[aria-current='true']` show the current icon (the component already swaps icons from `current`).
- Colours stay `--c-` tokens; no new colour; no motion is introduced. The indicator is a weight plus underline plus icon, never colour alone.
- The Writing link keeps the existing `--target` minimum block size in the bar and the 52 px row in the sheet.

## Interaction flows

1. **Top bar:** Tab reaches Writing → existing bar focus ring → Enter opens `/writing`.
2. **Phone sheet:** the menu trigger opens the disclosure; the page behind is hidden from view and focus; Writing sits on a 52 px row; activating it opens `/writing`; the next page loads with the sheet closed because the disclosure is static HTML.
3. **Current marker:** `/writing` shows the page marker in both places; `/writing/all` and every later `/writing/...` route show the section marker in both places; all other pages show neither.
4. **JavaScript disabled:** flows 2 and 3 are identical; no script is required to open the sheet.
5. **Profile pages:** the bar shows Writing plain; the local navigation marks the current profile route as before.

## Validation

There are no forms and no user input. The only validation is the existing navigation-model and pathname validation, which fails closed at build time. The marker rule itself accepts only normalised absolute paths and has no error UI.

## Integration points

| Point | Owner | U4 use |
|---|---|---|
| `BaseLayout.astro` → `Header pathname` | existing | the pathname input |
| `/writing` href | U2 (C3) | the primary item's target |
| `/writing/all` marker | U2 route, U4 marker | section marker as soon as U4 lands |
| `/writing/tags*`, `/writing/graph` | U3 | inherit the section marker from the pure rule |
| `HIG_ROUTES` in `tests/e2e/support/hig` | existing HIG suite | the axe matrix already covers the pages the chrome renders on |
| Four-item expectations in `hig-chrome.spec.ts` and U1-P10 | existing tests | updated to the one-item model by this unit |
| Manual 16-state accessibility review | owner | invalidated by `navigation.ts`, `Header.astro`, `MobileNav.tsx`, `BaseLayout.astro` and `chrome.css`; redone once at release end |
