# Refined Mockups: HIG Redesign of obsidian-press

Screen-level mockups for every reader-facing page of https://rvnnt.dev. They apply the requirements in `requirements.md` (requirements-analysis stage) under the practices in `team-practices.md` (practices-discovery stage), and the design answers in `refined-mockups-questions.md` (same folder). Tokens, materials and type styles named here are defined in `design-system-mapping.md`. Component behavior is in `interaction-spec.md`, and the checks that prove accessibility are in `accessibility-checklist.md`.

There are no rough wireframes or user flows to build on: this plan skipped the rough-mockups stage, and the site already exists. The mockups therefore start from the current pages, as inventoried in `aidlc/spaces/default/codekb/obsidian-blog/component-inventory.md`.

## Design Decisions

| Decision | Choice | Source |
|---|---|---|
| Visual direction | Liquid Glass: translucent bars and panels float over solid content | [Q1 of requirements] FR2.4 |
| Accent | The current teal, kept as the brand color; `#0F766E` for text in light mode, `#2DD4BF` in dark mode | [Q1] |
| Navigation on phones | A compact floating top bar, with a menu button that opens a full-height translucent sheet | [Q2] |
| Post layout, wide screens | A reading column with a floating outline panel (목차 / 탐색 tabs). Backlinks, related posts and the local graph sit below the article | [Q3] |
| Appearance control | One icon button that cycles 자동, 라이트 and 다크 and announces the result | [Q4] |
| Homepage | Note-driven, restyled: large title, the note's sections as grouped cards, "오늘 발행된 글" as a grouped list | [Q5] |
| Post lists | Inset grouped lists | [Q6] |
| Code blocks | Xcode-style syntax colors on a softly tinted rounded panel | [Q7] |

Constraints carried into every screen (all from `requirements.md`):
- The four primary navigation links stay exactly `/tags`, `/graph`, `/resume`, `/portfolio`, in that order, with their approved visible labels (Tags, Graph, Résumé, Portfolio).
- The mobile navigation stays a native `details` disclosure that works without JavaScript.
- The profile DOM contract and the approved fact text do not change.
- The preprocessor's HTML classes are styled as they are; none are renamed.

## How to Read the Wireframes

The wireframes use plain ASCII and English placeholders, so the columns stay aligned. The visible Korean labels are:

| Placeholder | Visible label or accessible name |
|---|---|
| [mark] obsidian-press | site mark and title (link to `/`) |
| Tags, Graph, Resume, Portfolio | the approved primary navigation labels (unchanged) |
| [Search] | search button, accessible name "검색 열기"; the shortcut hint shows ⌘K on Apple platforms and Ctrl K elsewhere |
| [Mode] | appearance button, accessible name "화면 모드: 자동" (or 라이트, 다크) |
| [Menu] / [Close] | the sheet's summary, accessible name "주요 탐색 메뉴"; its expanded state is exposed natively |
| [Contents\|Explore] | segmented tabs 목차 and 탐색 |
| [Outline] | floating button "목차 열기" |
| [Copy] | "코드 복사", then "복사됨" for 2 s |
| Published today | 오늘 발행된 글 |
| Backlinks / Related / Local graph | 이 페이지를 참조하는 글 / 관련 글 / 로컬 그래프 |
| [Graph\|List] | segmented control 그래프 \| 목록 |
| [Retry] | 다시 시도 |

## Screens

### W1. Floating header bar, wide screens (768 px and up)
```
+------------------------------------------------------------------------------+
| content scrolls underneath; the bar floats 12 px below the top edge          |
|                                                                              |
| +----------------------------------------------------------------------+     |
| | [mark] obsidian-press  Tags Graph Resume Portfolio  [Search] [Mode]  |     |
| +----------------------------------------------------------------------+     |
|                                                                              |
| # Large Title of the page                                                    |
| body text ...                                                                |
+------------------------------------------------------------------------------+
```
- **Material.** The bar uses the regular glass material in a capsule, 52 px tall, with a 12 px inset from the viewport edges, capped at the page's max width. It carries primary-label text only. The current section is a filled tint capsule with white text (an opaque pill), so it never relies on tinted text over glass.
- **Reading progress.** On post pages, a 2 px tint line runs along the bar's bottom inner edge and grows with `transform: scaleX()`.
- **Traces to:** FR2.4, FR4.1, FR5.1, FR5.8, FR5.10.

### W2. Compact top bar and navigation sheet, phones (under 768 px)
```
+------------------------------------------------------------------------------+
| closed:                                                                      |
| +------------------------------------------------------+                     |
| | [mark] obsidian-press      [Search] [Mode] [Menu]    |                     |
| +------------------------------------------------------+                     |
|                                                                              |
| open (details element open):                                                 |
| +------------------------------------------------------+                     |
| | [mark] obsidian-press      [Search] [Mode] [Close]   |                     |
| |                                                      |                     |
| | Tags                                          >      |                     |
| | ----------------------------------------------       |                     |
| | Graph                                         >      |                     |
| | ----------------------------------------------       |                     |
| | Resume                                        >      |                     |
| | ----------------------------------------------       |                     |
| | Portfolio                                     >      |                     |
| |                                                      |                     |
| | (thick glass sheet, full height; page content        |                     |
| |  behind it is hidden from view and from focus)       |                     |
| +------------------------------------------------------+                     |
+------------------------------------------------------------------------------+
```
- **Sheet.** The sheet is the existing `details.mobile-nav-disclosure`, restyled. When it is open, CSS (`body:has(.mobile-nav-disclosure[open])`) hides `main` and the footer with `visibility: hidden`, so focus cannot reach content hidden behind the sheet. The page is never scrolled away underneath. No JavaScript is added.
- **Rows.** Rows are 52 px tall with the Title 3 style; the current page's row carries a check mark and `aria-current="page"`.
- **Traces to:** FR4.1, FR5.8, and the no-JavaScript constraint.

### W3. Post page, wide screens (1100 px and up)
```
+------------------------------------------------------------------------------+
| +----------------------------------------------+  +----------------------+   |
| | < Hub: Operating Systems      Prev | Next >  |  | [Contents|Explore]   |   |
| |                                              |  |                      |   |
| | # Post Title (Large Title)                   |  | Contents             |   |
| | 2026-10-19 . 5 min read . #os #memory        |  |   Overview           |   |
| |                                              |  |   > Paging (here)    |   |
| | Body text, 17 px, line height 1.75, a        |  |     TLB              |   |
| | measure of about 40 Korean characters ...    |  |   Summary            |   |
| |                                              |  +----------------------+   |
| | ## Heading (Title 2)                         |                             |
| | Paragraph with a [link] and `code` ...       |                             |
| |                                              |                             |
| | +-------------------------------------+      |                             |
| | | code panel, Xcode-style      [Copy] |      |                             |
| | +-------------------------------------+      |                             |
| |                                              |                             |
| | ! Note callout (tinted fill, icon)           |                             |
| +----------------------------------------------+                             |
|                                                                              |
| below the article, at full reading width:                                    |
|   Backlinks     grouped list of posts that link here                         |
|   Related       grouped list, up to 5                                        |
|   Local graph   240 px canvas plus a "list view" toggle                      |
+------------------------------------------------------------------------------+
```
- **Reading column.** The column is up to 720 px wide (about 40 Korean characters per line at the Body style), on a solid page background.
- **Outline panel.** The panel uses the thick glass material and sticks 76 px from the top (under the header bar). It is 260 px wide and holds two tabs: 목차 (the table of contents, with the current section marked) and 탐색 (the hub navigation tree).
- **Sections below the article.** Backlinks, related posts and the local graph each sit in a grouped section below the article. The local graph's "목록" toggle switches it to a list of the same neighbors.
- **States.**
  - A post with no headings hides the 목차 tab and opens on 탐색.
  - A post outside any hub hides the hub breadcrumb row.
  - When the navigation tree fails to load, the 탐색 tab says "탐색 목록을 불러오지 못했습니다" and offers [다시 시도].
- **Traces to:** FR4.2, FR5.4, FR5.6, FR5.7, FR2.4, FR2.5.

### W4. Post page, phones and tablets (under 1100 px)
```
+------------------------------------------------------------------------------+
| # Post Title                                                                 |
| meta . tags                                                                  |
|                                                                              |
| body text ...                                                                |
|                                                                              |
|                                                 +-----------+                |
|                                                 | [Outline] |                |
|                                                 +-----------+                |
| floating button, bottom right, at least 44 x 44 px; it opens the             |
| outline sheet with [Contents|Explore] tabs (thick glass); focus              |
| moves into the sheet and returns to the button on close                      |
+------------------------------------------------------------------------------+
```
- **Outline sheet.** It is the same outline component as W3, presented as a modal sheet from the bottom, with a grab handle and a close button. While the sheet is open, the floating button hides.
- **Back-to-top.** It sits above the outline button in the same corner, never overlapping it.
- **Traces to:** FR4.2, FR5.3.

### W5. Homepage
```
+------------------------------------------------------------------------------+
| # obsidian-press (Large Title)                                               |
| intro paragraph from the homepage note                                       |
|                                                                              |
| +----------------------------------------------------------+                 |
| | ## Section from the homepage note                        |                 |
| | grouped card: note content, links                        |                 |
| |                                                          |                 |
| | ## Profile (profile slot)                                |                 |
| | name . role . [Resume] [Portfolio]                       |                 |
| |                                                          |                 |
| | ## Published today                                       |                 |
| | +--------------------------------------+                 |                 |
| | | Post title                         > |                 |                 |
| | | summary, 2 lines                     |                 |                 |
| | |--------------------------------------|                 |                 |
| | | Post title                         > |                 |                 |
| | +--------------------------------------+                 |                 |
| | empty: "No posts were published today"                   |                 |
| +----------------------------------------------------------+                 |
+------------------------------------------------------------------------------+
```
- **Note sections.** Each H2 section of the homepage note becomes a grouped card on the grouped background. This is done in CSS over the rendered note, and the vault note does not change.
- **Profile slot.** The profile slot keeps its markup and gets the same card. The 이력서 and 포트폴리오 actions are 44 px capsule buttons.
- **Empty state.** "오늘 발행된 글이 없습니다." in secondary text inside the group, never an empty group.
- **Overrides.** The `is:global` overrides in `index.astro` are removed in favor of tokens (FR4.3).
- **Traces to:** FR4.3, FR4.5.

### W6. Hub page and tag page: inset grouped list
```
+------------------------------------------------------------------------------+
| < Breadcrumb                                                                 |
| # Hub title (Large Title)                                                    |
| 12 posts . #tag #tag                                                         |
|                                                                              |
| +------------------------------------------------------+                     |
| | Post title                                  >        |                     |
| | summary, 2 lines . 2026-10-19                        |                     |
| | ----------------------------------------------       |                     |
| | Post title                                  >        |                     |
| | summary, 2 lines . 2026-10-12                        |                     |
| | ----------------------------------------------       |                     |
| | Post title                                  >        |                     |
| +------------------------------------------------------+                     |
|                                                                              |
| empty hub: "No posts are linked to this hub yet"                             |
| empty tag: "No posts carry this tag"                                         |
+------------------------------------------------------------------------------+
```
- **Rows.** Each row is one link covering the whole row (at least 60 px tall), with the title in Headline, the summary clamped to two lines in Subheadline, and the date in Footnote. The separator is inset by the row's leading padding.
- **Empty states.** "이 허브에 연결된 글이 아직 없습니다." and "이 태그가 달린 글이 없습니다."
- **Traces to:** FR4.3, FR4.5, FR5.8.

### W7. Tag index: chips
```
+------------------------------------------------------------------------------+
| # Tags (Large Title)                                                         |
|                                                                              |
| [ #os 12 ] [ #web 8 ] [ #database 5 ] [ #network 4 ]                         |
| [ #memory 3 ] [ #tcp 2 ] ...                                                 |
|                                                                              |
| chips: capsule shape, at least 44 px tall, count in secondary text           |
+------------------------------------------------------------------------------+
```
- **Chips.** Chips use the fill token and primary text, with the count in secondary text. They wrap with an 8 px gap. Long tag names wrap inside the chip rather than overflowing.
- **Traces to:** FR4.3, FR5.8.

### W8. Graph page
```
+------------------------------------------------------------------------------+
| # Graph (Large Title)                                                        |
| +--------------------------------------------------------------+             |
| | [Search notes ......]   [Graph|List]                         |             |
| | legend: (o) OS  [] Web  <> DB  ^ Network  * Hub              |             |
| +--------------------------------------------------------------+             |
|                                                                              |
| force-directed graph; every node reachable by keyboard;                      |
| each category has its own shape and color                                    |
|                                                                              |
| List view: grouped list of every note with its links                         |
+------------------------------------------------------------------------------+
```
- **Controls.** The controls float over the graph on the regular glass material, with primary text only.
- **Categories.** Each category has a shape (circle, square, diamond, triangle, star) and a system color (`design-system-mapping.md`, "Data Visualization").
- **List view.** The list view is the keyboard-first alternative: a grouped list of every note, each row showing its outgoing links as a sub-list.
- **States.**
  - While loading, the page shows "그래프를 불러오는 중" with a progress indicator.
  - If loading fails, it shows "그래프를 불러오지 못했습니다" and offers [다시 시도].
  - With an empty graph, it shows "표시할 노트가 없습니다".
- **Traces to:** FR4.3, FR5.6, FR4.5.

### W9. Search dialog (thick glass over a dimmed page)
```
+------------------------------------------------------------------------------+
| the page is dimmed behind the dialog                                         |
|                                                                              |
| +------------------------------------------------------+                     |
| | [Q] Search notes .................     [esc]         |                     |
| | ----------------------------------------------       |                     |
| | > Post title (selected)                              |                     |
| |   snippet with the matched term ...                  |                     |
| |   Post title                                         |                     |
| |   snippet ...                                        |                     |
| | ----------------------------------------------       |                     |
| | no results: "No results for <term>"                  |                     |
| | index failed: "Search is unavailable" [Retry]        |                     |
| +------------------------------------------------------+                     |
+------------------------------------------------------------------------------+
```
- **Placement.** The dialog is 560 px wide on wide screens and full width, anchored to the top, on phones.
- **States.**
  - Empty query: hint text "제목이나 본문의 단어로 찾아보세요".
  - Loading the index: "검색 색인을 불러오는 중".
  - Results.
  - No results: "‘<검색어>’에 대한 결과가 없습니다".
  - Index failed: "검색을 사용할 수 없습니다" with [다시 시도].
- **Traces to:** FR5.2, FR4.5, FR2.4.

### W10. Link preview card (pointer hover or keyboard focus)
```
+------------------------------------------------------------------------------+
| ... a sentence with a [link] in it ...                                       |
|           |                                                                  |
|           v                                                                  |
| +--------------------------------------------+                               |
| | Linked post title                          |                               |
| | first sentence of the post, up to 150      |                               |
| | characters ...                             |                               |
| | (text only, no controls)                   |                               |
| +--------------------------------------------+                               |
|                                                                              |
| touch: a tap navigates; the browser's own press-and-hold                     |
| preview applies                                                              |
+------------------------------------------------------------------------------+
```
- **Card.** The card uses the thick glass material, 280 px wide. It holds text only, because the link itself is the way in. It stays open while it is hovered and closes on Escape.
- **Touch devices.** No custom preview opens on touch; the tap navigates. The explicit preview gesture is the browser's native press-and-hold link preview (Safari and Chrome on mobile), which needs no extra UI and does not intercept the first tap. This is how FR5.7's "own affordance" is met. It is flagged for confirmation under Open Questions.
- **Traces to:** FR5.7, FR2.4.

### W11. Not found (404)
```
+------------------------------------------------------------------------------+
| # Page not found (Large Title)                                               |
| The page may have moved.                                                     |
| [Search the site]   [Go home]                                                |
|                                                                              |
| ## Recent posts                                                              |
| grouped list, 5 rows                                                         |
+------------------------------------------------------------------------------+
```
- **Copy.** "페이지를 찾을 수 없습니다" and "주소가 바뀌었을 수 있습니다."
- **Actions.** [사이트 검색] is a filled tint capsule and opens W9. [홈으로] is a plain capsule.
- **Traces to:** FR4.3.

### W12. Resume page (screen)
```
+------------------------------------------------------------------------------+
| [Home | Resume | Portfolio]  profile local navigation                        |
| +----------------------------------------------------------+                 |
| | Name (Large Title)                                       |                 |
| | Role . contact actions [Email] [GitHub] [PDF]            |                 |
| |                                                          |                 |
| | ## Profile                                               |                 |
| | ## Core skills (grid of grouped cards)                   |                 |
| | ## Experience                                            |                 |
| | +----------------------------------------+               |                 |
| | | > Company . Role       2024-03 - now   |               |                 |
| | +----------------------------------------+               |                 |
| | ## Projects                                              |                 |
| | ## Education                                             |                 |
| +----------------------------------------------------------+                 |
+------------------------------------------------------------------------------+
```
- **Local navigation.** The profile local navigation (홈, Résumé, Portfolio) becomes a segmented control, with `aria-current` on the current page.
- **Entries.** Résumé entries keep their `details` and summary markup and their `role="heading"`. They become grouped rows with a disclosure chevron.
- **Contact actions.** Contact actions are 44 px capsules. The PDF action appears only when the release is current, as today.
- **Unchanged.** Every `data-profile-*` attribute and every class pinned by `profile-presentation.test.ts` stays as it is, unless that test changes in the same commit (FR6.3).
- **Traces to:** FR4.4, FR6.3.

### W13. Portfolio and role pages
```
+------------------------------------------------------------------------------+
| +--------------------------------------------------------------+             |
| | eyebrow: Portfolio . Infra Engineer                          |             |
| | # Portfolio title (Large Title)                              |             |
| | summary paragraph                                            |             |
| | [Data/AI] [Product] [Infra]   role navigation                |             |
| | projects: [docsuri] [mcp-local] ...                          |             |
| |                                                              |             |
| | case study card                                              |             |
| |   problem . role . key decisions . result                    |             |
| |   > Read more about key decisions                            |             |
| +--------------------------------------------------------------+             |
+------------------------------------------------------------------------------+
```
- **Role navigation.** It becomes a segmented control.
- **Project jump links.** They become 44 px chips.
- **Case studies.** Each case study is a grouped card. Its six dimensions are labelled rows, and the "… 자세히 보기" disclosures keep their closed-by-default state.
- **Traces to:** FR4.4.

### W14. Resume print and PDF (A4)
```
+------------------------------------------------------------------------------+
| +------------------------------------------------------+                     |
| | Name                          contact line           |                     |
| | Role                                                 |                     |
| | -------------------------------------------          |                     |
| | PROFILE                                              |                     |
| | text, 10 pt, line height 1.35                        |                     |
| | EXPERIENCE                                           |                     |
| | Company . Role                 2024-03 - now         |                     |
| |   - bullet                                           |                     |
| | PROJECTS ...                                         |                     |
| | (A4, 12 mm margins, no chrome, no color fills)       |                     |
| +------------------------------------------------------+                     |
+------------------------------------------------------------------------------+
```
- **Page format.** The print layout keeps A4, 12 mm margins, at least 10 pt type and a line height of at least 1.35, which are the machine checks of the PDF release.
- **Typography.** It adopts the new type hierarchy: name in Title 1 weight, section labels as small caps-style Footnote headings with letter spacing, and thin separators. All text is black on white, with no glass, no tint fills and no hidden facts.
- **Selectors.** The screen-only selectors stay in sync with `pdf-renderer.mjs`.
- **Traces to:** FR6.1, FR6.2.

## Coverage

| Requirement | Screens |
|---|---|
| FR2.4, FR2.5 materials and fallbacks | W1, W2, W3, W4, W8, W9, W10 |
| FR3 appearance | W1, W2 ([Mode]); behavior in interaction-spec.md |
| FR4.1 shared chrome | W1, W2 |
| FR4.2 post pages | W3, W4 |
| FR4.3 other blog pages | W5, W6, W7, W8, W11 |
| FR4.4 profile pages | W12, W13 |
| FR4.5 empty and error states | W3, W5, W6, W8, W9 |
| FR5 accessibility | every screen; checks in accessibility-checklist.md |
| FR6.1, FR6.2 print and PDF | W14 |

## Open Questions

- **Touch link previews (FR5.7).** The mockups meet the "own affordance" with the browser's native press-and-hold preview rather than a custom control. Confirm this at the approval gate, or ask for a visible preview button instead.
- **Diagram colors.** Mermaid and D2 diagrams keep their renderer themes (the preprocessor stays unchanged). Their palettes therefore do not match the new tokens exactly. Diagram backgrounds stay transparent, so they sit cleanly on both appearances.

## Sources

- `aidlc/spaces/default/intents/261019-hig-redesign/inception/requirements-analysis/requirements.md` (FR and NFR IDs)
- `aidlc/spaces/default/intents/261019-hig-redesign/inception/practices-discovery/team-practices.md` (testing posture, web rules, no screenshot baselines)
- `aidlc/spaces/default/codekb/obsidian-blog/component-inventory.md` and `code-structure.md` (current components, classes and contracts)
- `refined-mockups-questions.md` (Questions 1–7)
- Wireframes and user flow: not produced, because this plan skips the rough-mockups stage
