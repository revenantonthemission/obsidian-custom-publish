# Refined Mockups — Passion Project personal website, first release

Upstream: `ideation/rough-mockups/wireframes.md`, `user-flow.md`; `inception/user-stories/stories.md`; `inception/requirements-analysis/requirements.md`; answers in `refined-mockups-questions.md` (Q1–Q5).

Mid-to-high fidelity. Every surface uses the site's existing Apple HIG design system (see `design-system-mapping.md`); nothing here introduces a new colour, font or material. Content is Korean, section labels English. Widths: phone 320 px, tablet 768 px, desktop 1024 and 1440 px.

## Information Architecture (first release)

| Address | Page | Stories |
|---------|------|---------|
| `/` | Homepage (M1) | US3.1–US3.4 |
| `/writing` | Writing (M2) | US4.1 |
| `/writing/all` | All posts by date (M3) | US4.2 |
| `/writing/tags`, `/writing/tags/<tag>` | Tags (M4), unchanged content | US5.1 |
| `/writing/graph` | Graph (M4), unchanged content | US5.1 |
| `/tags`, `/tags/<tag>`, `/graph` | 301 to the `/writing/...` address | US5.2 |
| `/posts/<slug>`, `/hubs/<slug>`, `/resume`, `/portfolio` | Unchanged except the top bar (M0) | US6.1, US6.2 |

Reach: résumé and portfolio 1 tap from `/` (US3.2); every ordinary post 2 taps from `/writing` via `/writing/all` (US4.2).

## M0 — Top bar (every page)

Desktop and tablet (≥ 768 px):

```
╭──────────────────────────────────────────────────────────────────────────╮
│ [⑂] Passion Project            Writing                   [⌕ ⌘K]  [◐]    │  floating glass bar
╰──────────────────────────────────────────────────────────────────────────╯
```

Phone (< 768 px):

```
╭────────────────────────────────────╮
│ [⑂] Passion Project   [⌕] [◐] [≡] │
╰────────────────────────────────────╯
  [≡] sheet:  │ Writing │   (52 px row)
```

- One section, **Writing** (US6.1). Tags, Graph, Résumé and Portfolio leave the bar and the sheet.
- Writing marker: on `/writing` the item is current (`aria-current="page"`, filled indicator); on `/writing/*` sub-pages it is the current section (`aria-current="true"`, same indicator); elsewhere no indicator (US6.1 AC6.1.2–AC6.1.4).
- Search, appearance and the sheet button are unchanged.

## M1 — Homepage `/`

Desktop (1024 px):

```
╭─ top bar ────────────────────────────────────────────────────────────────╮
╰──────────────────────────────────────────────────────────────────────────╯

  Passion Project                                       Large Title (h1)
  조준희                                                 Title 3 weight 600
  <short introduction from the approved profile facts>   Body, --c-text-secondary

  ( Résumé )   ( Portfolio )                             plain capsules, equal weight

  ┌────────────────────────────────────────────────────────────────────┐
  │ 이번 주 글                                                    (h2) │   grouped card
  ├────────────────────────────────────────────────────────────────────┤
  │ Post title                                                      ›  │   full post row
  │ Two-line summary of the post, clamped …                            │
  │ 2026년 11월 18일 · 6분 읽기                                         │
  ├────────────────────────────────────────────────────────────────────┤
  │ Post title                                                      ›  │
  │ …                                                                  │
  ├────────────────────────────────────────────────────────────────────┤
  │ 모든 글 보기                                                     ›  │   plain row link
  └────────────────────────────────────────────────────────────────────┘
```

Phone (320 px): same order in one column; the two capsules sit side by side (each at least 44 px tall) and wrap onto two lines only if the text does not fit.

| Element | Content and rule | Story |
|---------|------------------|-------|
| h1 | "Passion Project" (document title "Passion Project") | US3.1 |
| Name | Owner's name from the approved profile facts | US3.1 |
| Introduction | Short introduction from the approved profile facts; no headline | US3.1 |
| Capsules | "Résumé" → `/resume`, "Portfolio" → `/portfolio`; both plain, equal weight (Q3) | US3.2 |
| "이번 주 글" | Ordinary posts (no hubs, Q2) published Monday–Sunday of the build's week in Korean time, newest first, ties by title | US3.3 |
| Last row | "모든 글 보기" → `/writing/all` | US3.3 |

States of "이번 주 글":

| State | What shows |
|-------|-----------|
| Several posts | Full rows, newest first |
| One post | One full row, then "모든 글 보기" |
| Empty week | A centred empty row "이번 주에 발행한 글이 없습니다." in `--c-text-secondary`, then "모든 글 보기" (US3.4) |
| Very long Korean title | Wraps by word (`keep-all`); never cut mid-syllable |

The old vault-note cards (topic link lists, welcome callout) are gone (requirements FR2.4).

## M2 — Writing `/writing`

```
  Writing                                               Large Title (h1)
  ( Tags )  ( Graph )                                   plain capsules

  최근 글                                                section header (h2)
  ┌────────────────────────────────────────────────────────────────────┐
  │ Post title                                                      ›  │  full rows ×5 (Q1)
  │ Two-line summary …                                                 │
  │ 2026년 11월 18일 · 6분 읽기                                         │
  ├────────────────────────────────────────────────────────────────────┤
  │ …                                                                  │
  ├────────────────────────────────────────────────────────────────────┤
  │ 모든 글 보기                                                     ›  │
  └────────────────────────────────────────────────────────────────────┘

  주제                                                   section header (h2)
  ┌────────────────────────────────────────────────────────────────────┐
  │ Computer Engineering                                  글 12개    ›  │  topic rows
  ├────────────────────────────────────────────────────────────────────┤
  │ Computer Science                                      글 34개    ›  │
  └────────────────────────────────────────────────────────────────────┘
```

- Document title "Writing — Passion Project".
- "최근 글": the 5 newest ordinary posts (no hubs, Q2) in full rows (Q1).
- "주제": one row per hub — title, "글 N개" (its listed posts), chevron; links to `/hubs/<slug>`. Rows sorted by title.

States:

| State | What shows |
|-------|-----------|
| Fewer than 5 posts | All of them |
| No posts | "최근 글" shows the empty row "아직 발행한 글이 없습니다." and no "모든 글 보기" row |
| No hubs | The "주제" section is left out |
| A hub listing zero posts | Still listed, "글 0개" |

## M3 — All posts `/writing/all`

```
  ‹ Writing                                             back link (plain)
  모든 글                                               Large Title (h1)
  글 87개                                               count, --c-text-secondary

  2026 ─────────────────────────────────────────── sticky year header (h2)
  ┌────────────────────────────────────────────────────────────────────┐
  │ Post title                                  11월 18일            ›  │  compact rows (Q1)
  ├────────────────────────────────────────────────────────────────────┤
  │ Post title                                  11월 16일            ›  │
  └────────────────────────────────────────────────────────────────────┘
  2025 ───────────────────────────────────────────
  ┌────────────────────────────────────────────────────────────────────┐
  │ …                                                                  │
  └────────────────────────────────────────────────────────────────────┘
  날짜 없음 ──────────────────────────────────────
  ┌────────────────────────────────────────────────────────────────────┐
  │ Post title                                                      ›  │
  └────────────────────────────────────────────────────────────────────┘
```

- Document title "모든 글 — Passion Project"; h1 "모든 글".
- Every ordinary post (no hubs, Q2) exactly once; newest year first; newest first within a year; ties by title; undated posts last under "날짜 없음" ordered by title.
- Compact row: title (Headline weight 600) and the month-day date (Subheadline, `--c-text-secondary`), chevron; at least 44 px tall.
- Year headers stick just under the floating bar while their year is on screen (Q5) on a thick glass strip, so rows scroll beneath legibly; with reduced transparency or no `backdrop-filter` support they use the solid grouped background.
- Empty site: "아직 발행한 글이 없습니다." under the h1, no year headers.

## M4 — Tags and Graph under Writing

Same content and layout as today's `/tags`, `/tags/<tag>` and `/graph`, at the new addresses, with a "‹ Writing" back link above the Large Title. Tag chips and hub/post links on post pages point to `/writing/tags/<tag>`.

## Responsive Summary

| Width | M1 | M2 | M3 |
|-------|----|----|----|
| 320 | One column; capsules may wrap | One column | One column; date stays on the row's trailing edge, wraps under the title if needed |
| 768 | Page widens with the viewport up to the 1100 px bar | Same | Same |
| 1024 / 1440 | Content measure capped like today's listing pages | Same | Same |
