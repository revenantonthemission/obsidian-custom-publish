# Interaction Specification

This document defines component behavior for the redesign. It uses the component template from the design knowledge base (states, inputs, responsive behavior, accessibility). The screens are in `mockups.md`, the tokens in `design-system-mapping.md`, the requirements in `requirements.md` (requirements-analysis stage), and the practices in `team-practices.md` (practices-discovery stage). Visible text is Korean, matching `lang="ko"` (FR5.5).

## Appearance Model (FR3; closes review finding R-02)

| Item | Rule |
|---|---|
| Stored choice | One `localStorage` key, `appearance`, with the values `auto`, `light` or `dark` |
| Missing, unrecognized or unreadable value | Treated as `auto`. Blocked storage is caught; the choice then lasts only for the current page |
| Legacy state | On its first run, the bootstrap removes every key the old theme system wrote: `theme`, `theme-manual`, `solar` and the geolocation cache keys. The code plan lists their exact names from `BaseLayout.astro` and `solar.ts`. No legacy value carries over, so every returning reader starts at `auto` |
| CSS without JavaScript | The light tokens are the default. `@media (prefers-color-scheme: dark)` applies the dark tokens to `:root:not([data-theme="light"])`, and `:root[data-theme="dark"]` applies them unconditionally |
| Bootstrap | An ES5 inline script in `<head>` reads `appearance` and sets `data-theme` on `<html>` only for `light` or `dark`. It runs before first paint. Its new SHA-256 baseline is recorded in the asset budget (FR6.3) |
| Live system change | In `auto` mode, a `matchMedia('(prefers-color-scheme: dark)')` change listener re-renders the canvas and SVG graphs. CSS-driven parts switch on their own |
| Removed | The geolocation request, the call to `api.sunrise-sunset.org`, `solar.ts`, the boundary timer, the second ThemeToggle instance and `.theme-transitioning` |

The state machine of the appearance button:

| Current | Press | Next | Announced (polite live region) |
|---|---|---|---|
| auto | press | light | "화면 모드: 라이트" |
| light | press | dark | "화면 모드: 다크" |
| dark | press | auto | "화면 모드: 자동 (시스템 설정을 따름)" |

## Components

### Header Bar

| Field | Value |
|---|---|
| Component | Header Bar (`Header.astro`) |
| Description | The floating glass bar holding the site mark, primary navigation, search and appearance controls |
| Category | navigation |

| State | Description | Trigger |
|---|---|---|
| default | regular glass over the page; content scrolls underneath | page load |
| current section | the matching nav link is a filled tint capsule with `aria-current="page"` | route matches |
| hover | `--c-fill` capsule behind the link | pointer over a link |
| focus | 2 px `--c-tint` ring with a 2 px offset | keyboard focus |
| fallback | an opaque `--c-surface` bar with a `--c-control-border` hairline | no `backdrop-filter`, reduced transparency, or increased contrast |

| Breakpoint | Behavior |
|---|---|
| under 768 px | compact bar: mark, title, then the search, appearance and menu buttons; the navigation links move into the Navigation Sheet |
| 768 px and up | full bar: mark, title, four links (Tags, Graph, Résumé, Portfolio), then search and appearance |

| Requirement | Implementation |
|---|---|
| ARIA role | `<header>`; `<nav aria-label="주요 탐색">` |
| Keyboard interaction | Tab through the links and buttons in visual order |
| Label | the links keep their approved visible labels; the icon buttons have Korean accessible names |
| Contrast ratio | primary text only on the regular material (worst case 8.48:1 light, 6.13:1 dark) |
| Screen reader | the current link is announced as the current page |
| Focus management | not applicable |

### Navigation Sheet

| Field | Value |
|---|---|
| Component | Navigation Sheet (`MobileNav.tsx`, static, no client directive) |
| Description | Full-height thick-glass sheet listing the primary sections on phones |
| Category | navigation |

| State | Description | Trigger |
|---|---|---|
| closed | only the summary button shows (`Menu` icon) | default |
| open | the sheet covers the viewport below the bar; `main` and the footer get `visibility: hidden` through `body:has(.mobile-nav-disclosure[open])` | summary activated |
| current | the row for the current page carries a check icon and `aria-current="page"` | route matches |

- **Responsive behavior:** the sheet exists only under 768 px; from 768 px the Header Bar shows the links directly.
- **Accessibility:**
  - It is a native `details` and `summary`; the browser exposes the expanded state.
  - The summary has the accessible name "주요 탐색 메뉴".
  - Rows are links at least 52 px tall.
  - No focus trap is needed, because the content behind the sheet is hidden from focus by CSS.
  - The sheet closes by activating the summary again. Without JavaScript, Escape does not close it. That is accepted, because the component is a disclosure, not a modal dialog.

### Appearance Button

| Field | Value |
|---|---|
| Component | Appearance Button (`ThemeToggle.tsx`, rewritten; one instance, rendered once in the bar) |
| Description | Cycles 자동, 라이트 and 다크, and shows the current mode's icon |
| Category | input |

| State | Description | Trigger |
|---|---|---|
| auto | `SunMoon` icon; accessible name "화면 모드: 자동" | stored `auto`, or nothing stored |
| light | `Sun` icon; accessible name "화면 모드: 라이트" | stored `light` |
| dark | `Moon` icon; accessible name "화면 모드: 다크" | stored `dark` |
| pressed | scale 0.94 for 150 ms (transform only) | activation |

- **Responsive behavior:** the same 44 × 44 px button at every width.
- **Accessibility:**
  - It is a `<button>` that activates with Enter or Space.
  - The live region announces the new mode (state machine above).
  - The icons are `aria-hidden="true"`.
- **Before hydration:** the server-rendered button shows the auto icon. After hydration it reflects the stored choice. The inherited-island list of the asset budget already includes ThemeToggle, so the redesign adds no new island.

### Search Dialog

| Field | Value |
|---|---|
| Component | Search Dialog (`Search.tsx`) |
| Description | Full-text search over the Korean index, in a modal dialog |
| Category | input |

| State | Description | Trigger |
|---|---|---|
| idle | hint text "제목이나 본문의 단어로 찾아보세요" | dialog opened with an empty query |
| loading | "검색 색인을 불러오는 중" with a progress indicator | first open, while the index loads |
| results | up to 10 options, the first one selected | the query matches |
| empty | "‘<검색어>’에 대한 결과가 없습니다" | nothing matches |
| error | "검색을 사용할 수 없습니다" and a [다시 시도] button | the index failed to load (no longer swallowed) |

| Breakpoint | Behavior |
|---|---|
| under 768 px | full width, anchored to the top, results fill the remaining height |
| 768 px and up | 560 px wide, centered 15 vh from the top |

| Requirement | Implementation |
|---|---|
| ARIA role | `role="dialog"` with `aria-modal="true"`, labelled by a visually hidden heading "검색". The input is `role="combobox"` with `aria-controls` and `aria-activedescendant`. Results are `role="listbox"` containing `role="option"` with `aria-selected` |
| Keyboard interaction | ⌘K or Ctrl K opens it. Up and Down move the selection, Enter opens it, Escape closes. Tab cycles between the input, [다시 시도] when present, and the close button |
| Label | visible placeholder "노트 검색" plus the accessible name "검색어" |
| Contrast ratio | thick material; every text token allowed (worst case 4.80:1 or better) |
| Screen reader | the result count is announced politely: "결과 N개" |
| Focus management | focus moves to the input on open and returns to the triggering control on close; the page behind is `inert` while it is open |

### Outline Panel and Outline Sheet

| Field | Value |
|---|---|
| Component | Outline (replaces `aside.post-sidebar` and `MobileSidebar.tsx`) |
| Description | The table of contents (목차) and hub navigation tree (탐색) of a post, in two tabs |
| Category | navigation |

| State | Description | Trigger |
|---|---|---|
| panel | sticky thick-glass panel beside the reading column | width of 1100 px or more |
| sheet closed | the floating "목차 열기" button (44 × 44 or larger) | width under 1100 px |
| sheet open | modal bottom sheet with the same two tabs | button activated |
| no headings | the 목차 tab is hidden and 탐색 is selected | post without h2 to h4 |
| tree error | "탐색 목록을 불러오지 못했습니다" and [다시 시도] | `/nav-tree.json` failed |
| current | the active heading is marked by toc-highlight with `aria-current="location"` | scroll position |

| Requirement | Implementation |
|---|---|
| ARIA role | tabs follow the WAI-ARIA tabs pattern (`tablist`, `tab`, `tabpanel`). The sheet is `role="dialog"` with `aria-modal="true"` and the label "목차와 탐색" |
| Keyboard interaction | Left and Right move between tabs and activate them, and Home and End jump to the first or last tab. In the sheet, Escape closes it and Tab is trapped inside. Tree nodes toggle with Enter and expose `aria-expanded` |
| Label | the tree toggles are named "‘<제목>’ 펼치기" or "‘<제목>’ 접기" |
| Contrast ratio | thick material; all text tokens allowed |
| Screen reader | the tab names are announced as tabs; the current heading is announced as the current location |
| Focus management | when the sheet opens, focus moves to the selected tab; when it closes, focus returns to the "목차 열기" button |

### Link Preview

| Field | Value |
|---|---|
| Component | Link Preview (`link-preview.ts`) |
| Description | A text-only card summarizing the linked post |
| Category | feedback |

| State | Description | Trigger |
|---|---|---|
| hidden | nothing shown | default |
| shown | thick-glass card below the link | 300 ms of pointer hover, or keyboard focus on a `/posts/` link |
| persistent | stays open while the pointer is over the link or the card | hover moves onto the card |
| dismissed | hidden again | Escape, blur, or the pointer leaving both the link and the card |

- **Touch:**
  - No custom preview opens on touch; a tap navigates immediately, in one tap.
  - The browser's native press-and-hold link preview remains available.
  - The old two-tap bottom sheet is removed.
- **Accessibility:**
  - The card is `role="tooltip"` and is referenced from the link by `aria-describedby` while shown.
  - It holds no interactive content.
  - This meets WCAG 1.4.13: dismissible, hoverable and persistent.

### Grouped List and Post Row

| Field | Value |
|---|---|
| Component | Grouped List (`PostCard.astro`, `RelatedPosts.astro`, `BacklinkList.astro`, the homepage today list) |
| Description | Inset grouped list of posts, each row a single link |
| Category | display |

| State | Description | Trigger |
|---|---|---|
| default | rows on `--c-surface` with inset separators | page load |
| hover | `--c-fill` row background | pointer over a row |
| pressed | `--c-fill` at double opacity | pointer down |
| focus | inset 2 px `--c-tint` ring inside the row | keyboard focus |
| empty | one row of secondary text giving the empty message (see mockups.md) | no posts |

- **Responsive behavior:** full width minus a 16 px inset under 480 px; at most the reading measure above it.
- **Accessibility:**
  - Each group is a `<ul>` under its heading.
  - Each row is one `<a>` holding the title, summary and date, with a minimum height of 60 px.
  - The chevron is `aria-hidden`.
  - Tags inside rows are not separate links; tag chips live on the post page instead. This avoids nested interactive targets.

### Tag Chip

| Field | Value |
|---|---|
| Component | Tag Chip (tags index, post header tags) |
| Description | A capsule link to a tag page, with a count where shown |
| Category | navigation |

- **States:**
  - default: `--c-surface-2` fill
  - hover: `--c-fill`
  - focus: ring
  - current tag page: tint capsule with `aria-current="page"`
- **Accessibility:**
  - Minimum height 44 px.
  - The count is part of the link text, read as "os, 글 12개".
  - Under increased contrast the chip gets a `--c-control-border` outline.

### Callout

| Field | Value |
|---|---|
| Component | Callout (preprocessor `div.callout` and `details.callout`, styled in `callouts.css`) |
| Description | Tinted note box with an icon and a title |
| Category | display |

- **States:**
  - static
  - foldable closed or open (`details`), with a chevron rotating 90 degrees through a transform
- **Accessibility:**
  - The title uses the hue's text color on its fill (at least 4.63:1).
  - The icon is a decorative CSS mask.
  - Foldable callouts keep their native `summary`, which exposes the expanded state.
  - The preprocessor markup does not change.

### Code Panel and Copy Button

| Field | Value |
|---|---|
| Component | Code Panel (`pre.shiki` with `copy-button.ts`) |
| Description | Rounded `--c-surface-2` panel with Xcode-style colors, a language badge and a copy button |
| Category | display |

| State | Description | Trigger |
|---|---|---|
| default | copy button visible, never hover-only (touch has no hover) | page load |
| copied | `Check` icon in green for 2 s; "코드를 복사했습니다" announced politely | clipboard write succeeded |
| failed | "복사하지 못했습니다" announced; icon unchanged | clipboard write rejected (no longer swallowed) |

- **Accessibility:**
  - The copy button is a 44 × 44 `<button>` named "코드 복사".
  - The panel scrolls horizontally. When it overflows, `tabindex="0"` with the label "코드, 가로로 스크롤 가능" makes it scrollable by keyboard.

### Heading Fold Toggle

- **Behavior:** a `<button>` placed before each h2 and h3 heading in posts. It hides the section's sibling content when collapsed.
- **Accessibility:**
  - `aria-expanded` reflects the state.
  - The accessible name is "‘<제목>’ 섹션 접기" or "‘<제목>’ 섹션 펼치기".
  - The chevron rotates by transform.
  - The hit area is 44 × 44, which overlaps the heading's leading margin without shifting the text (FR5.4, FR5.8).

### Reading Progress and Back to Top

- **Reading progress:**
  - A 2 px `--c-tint` line in the header bar, driven by `transform: scaleX(p)`.
  - It updates in a `requestAnimationFrame` callback, at most once per frame.
  - It is `aria-hidden`.
- **Back to top:**
  - A 44 × 44 glass capsule button "맨 위로" that appears after 400 px of scrolling, by opacity.
  - It scrolls with `behavior: "smooth"` only when reduced motion is not requested (FR5.10).

### Graph View and Local Graph

| State | Description | Trigger |
|---|---|---|
| loading | "그래프를 불러오는 중" | data loading |
| graph | force-directed SVG, nodes shaped and colored by category | loaded, Graph tab |
| list | grouped list of every note, each with its outgoing links | List tab |
| error | "그래프를 불러오지 못했습니다" and [다시 시도] | fetch failed |
| empty | "표시할 노트가 없습니다" | no nodes |

- **Accessibility (FR5.6):**
  - The 그래프 | 목록 segmented control is a tablist.
  - The list view is the complete keyboard path: every note and link is reachable with Tab and opens with Enter.
  - The SVG keeps `role="img"` with its Korean label, plus a description pointing to the list view.
  - The legend chips keep `aria-pressed` and show shape, color and label.
  - The local graph follows the same pattern, with a 목록 toggle under its canvas.

### Hub Navigation

- **Content:** a breadcrumb to the hub, then 이전 and 다음 links.
- **Accessibility:**
  - `<nav aria-label="허브 탐색">`.
  - The links are at least 44 px tall.
  - Under 480 px, the previous and next links stack.

### Segmented Control

- **Used by:**
  - the outline tabs (목차 | 탐색)
  - the graph view switch (그래프 | 목록)
  - the profile local navigation (홈 | Résumé | Portfolio)
  - the role navigation
- **Visual:** a `--c-fill` capsule track with a raised `--c-surface` selection that moves by transform.
- **Two kinds:** where it switches panels it is a tablist; where it switches pages it is a list of links with `aria-current`. Segments are at least 44 px tall.

### Skip Link

- **Content:** "본문으로 건너뛰기", the first focusable element.
- **Style:** `--c-on-tint` on `--c-tint-fill` (5.47:1 in both appearances).
- **Motion:** it slides in with `transform: translateY()` on focus, replacing the old `top` animation.

## Flows

These flows replace the absent user-flow artifact.

**F1. Find and read a post**
- **Steps:**
  1. Any page: press the search button or ⌘K / Ctrl K. The dialog opens with focus in the input.
  2. Type. Results update after 200 ms; the count is announced.
  3. Press Down or Up to select, then Enter. The post opens.
  4. On the post, the outline panel (wide screens) or the "목차 열기" sheet (narrow screens) jumps to a section.
- **Error paths:**
  - The index fails to load: the error state appears; [다시 시도] reloads the index.
  - No results: the empty state appears; the input keeps the query.

**F2. Change the appearance**
- **Steps:**
  1. Press the appearance button. The mode cycles and the new mode is announced.
  2. The choice persists in `appearance`. Every page renders in that mode before first paint.
  3. Choosing 자동 follows the system again, including live changes.
- **Error path:** storage is blocked. The mode applies to the current page only, and nothing fails visibly.

**F3. Navigate on a phone**
- **Steps:**
  1. Press 메뉴. The sheet opens and the content behind it is hidden.
  2. Choose a section. It navigates.
  3. Pressing 메뉴 again closes the sheet.
- **Without JavaScript:** the same, because the sheet is native.

## Sources

- `aidlc/spaces/default/intents/261019-hig-redesign/inception/requirements-analysis/requirements.md`: FR2.4–FR2.6, FR3.1–FR3.4, FR4.1–FR4.5, FR5.2–FR5.10.
- `aidlc/spaces/default/intents/261019-hig-redesign/inception/practices-discovery/team-practices.md`: ES5 inline scripts, motion rule, Testing Posture.
- `aidlc/spaces/default/codekb/obsidian-blog/component-inventory.md`: current components, the asset-budget island list, test constraints.
- `refined-mockups-questions.md`: Q2 (navigation sheet), Q3 (outline panel), Q4 (cycling appearance button).
