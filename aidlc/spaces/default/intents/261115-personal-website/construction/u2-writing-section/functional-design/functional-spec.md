# Functional Specification — U2 `u2-writing-section`

Upstream: `inception/units-generation/unit-of-work.md` (U2), `unit-of-work-story-map.md`; `inception/user-stories/stories.md` — this unit implements **US3.3, US3.4, US4.1 (except AC4.1.5's final addresses, which U3 delivers), US4.2** and its share of **US7.1**; `inception/requirements-analysis/requirements.md`; `inception/refined-mockups/` (M1–M3, interaction spec, design-system mapping, accessibility checklist); `inception/domain-design/components.md`; `inception/contract-design/contract-summary.md` (C2 input, C3 provider).

Rules are in `rules.md`. U2 owns no persisted data: its only input is U1's post metadata (`content/meta/*.json`, C2) plus the build date. Components are in `frontend-components.md`.

## 1. Scope

| In | Out |
|---|---|
| the WritingLists pure functions | moving Tags and Graph under `/writing` and the redirects (U3) |
| `/writing` and `/writing/all` | navigation (U4) |
| the homepage "이번 주 글" section, replacing U1's interim list | |
| `writing.css` | |

## 2. Inputs

| Input | Source | Notes |
|---|---|---|
| Post metadata | `getAllPostMeta()` / U1's `getOrdinaryPosts()` and `getHubs()` (`site/src/lib/data.ts`) | `published` is `YYYY-MM-DD` or null; `is_hub` flags hubs; `forward_links` lists hub children |
| Summaries | `getPreviewSummary(slug)` | used by full rows (existing `PostCard`) |
| Build date | `HOMEPAGE_TODAY_OVERRIDE` or the clock | read once in the page frontmatter and passed into the list functions (BR1.7) |

## 3. Workflows

### W1 — Week window (BR1.2)

1. Read the override: if it matches `^\d{4}-\d{2}-\d{2}$` and is a real calendar date, it is the Korean date `D`.
2. Otherwise `D` = the UTC date of (now + 9 h).
3. `monday` = `D` minus ((weekday(D) + 6) mod 7) days, where weekday uses Sunday = 0. `sunday` = `monday` + 6 days.
4. All arithmetic is on calendar dates (UTC-noon anchoring), never local time.

Examples (AC3.3.1, AC3.3.3):

| D | Week |
|---|---|
| Wed 2026-11-18 | 2026-11-16 … 2026-11-22 |
| Sun 2026-11-22 | 2026-11-16 … 2026-11-22 |
| instant 2026-11-15T15:30Z → D = Mon 2026-11-16 | 2026-11-16 … 2026-11-22 |

### W2 — Lists (BR1.3–BR1.6)

The shared comparator orders by published descending, then title ascending. Each list is built as follows:

| List | Built by |
|---|---|
| `weekPosts(meta, D)` | filter ordinary, dated, inside the week → sort |
| `recentPosts(meta, 5)` | filter ordinary, dated → sort → first 5 |
| `postsByYear(meta)` | ordinary dated → sort → group by `published.slice(0,4)` in encounter order; then ordinary undated → sort by title → group "날짜 없음" if any |
| `topics(meta)` | hubs → sort by title → `{slug, title, count}`, where count = forward links that resolve to a metadata entry |

### W3 — Page renders

- `/` (BR2.1): the U1 opening stays; the "이번 주 글" card replaces "오늘 발행된 글".
- `/writing` (BR2.2), in order:
  1. h1 "Writing";
  2. the capsule nav;
  3. "최근 글" with full rows and the "모든 글 보기" row;
  4. "주제", or nothing when there are no hubs.
- `/writing/all` (BR2.3), in order:
  1. the back link;
  2. h1 "모든 글";
  3. the count;
  4. one year section after another (`<section aria-labelledby>`, `<h2 class="year-header">`, `<ul>` of compact rows).

## 4. Screen states

| Page | State | Shows |
|---|---|---|
| `/` | week has posts | full rows newest first, then "모든 글 보기" |
| `/` | empty week | "이번 주에 발행한 글이 없습니다." (plain text), then "모든 글 보기" |
| `/writing` | ≥ 5 posts | 5 rows, then "모든 글 보기" |
| `/writing` | 1–4 posts | all of them, then "모든 글 보기" |
| `/writing` | 0 posts | "아직 발행한 글이 없습니다.", no "모든 글 보기" row |
| `/writing` | no hubs | the "주제" section is absent |
| `/writing` | hub with 0 resolvable links | row "글 0개" |
| `/writing/all` | posts in several years | year sections newest first; "날짜 없음" last when undated posts exist |
| `/writing/all` | 0 posts | "아직 발행한 글이 없습니다.", no headers; count "글 0개" |
| `/writing/all` | scrolling | the year header sticks on glass; solid under reduced transparency |

## 5. Edge cases

| Case | Behaviour | Rule |
|---|---|---|
| A post published on a future date in the week | included (it has a date inside the window) | BR1.3 |
| A post published in the future, outside the week | not in the week list; in recent and all lists as dated | BR1.4, BR1.5 |
| Same date, Korean and Latin titles | code-point order; deterministic | BR1.3 |
| A hub links to another hub | counted (resolves to an entry), as the hub page shows it today | BR1.6 |
| A hub's forward link that resolves to nothing | not counted | BR1.6 |
| Malformed override (`2026-13-45`) | ignored; the real Korean date is used | BR1.2 |
| Very long Korean title | wraps with `word-break: keep-all`; a long Latin token uses `overflow-wrap: anywhere` | BR2.5 |

## 6. Contract C3 (provided)

| Route | Contents | Who consumes it |
|---|---|---|
| `/writing` | the Tags and Graph capsules, with hrefs `/tags` and `/graph` until U3 | U3 changes the capsule hrefs to `/writing/tags` and `/writing/graph` |
| `/writing/all` | the full list | U4 marks Writing as current on both routes |

AC4.1.5 is delivered by U3. U2 renders the capsules with the current addresses, and a test asserts that they open.

## 7. Test anchors (test-first)

| Behaviour | Test |
|---|---|
| BR1.1–BR1.7 | Vitest `tests/unit/writing-lists.test.ts` (examples AC3.3.1–3, AC4.1.1–3, AC4.2.1–3) and `tests/pbt/u2/writing-lists.pbt.test.ts` (properties: exactly-once, ordering, week bounds, frozen output) |
| BR2.1–BR2.6 | Playwright `tests/e2e/hig-writing.spec.ts`: `/`, `/writing`, `/writing/all` structure and states, the axe matrix via `HIG_ROUTES`, sticky header and focus, JS-off; and an NFR8 equality test against `content/meta` |
| Fixture coverage | the fixture vault has dated posts in two years, one undated post, hubs; the week window is set by `HOMEPAGE_TODAY_OVERRIDE` in the HIG runner |

## 8. Rules summary (derived from `rules.md`)

- **Lists:**
  - only ordinary posts, Korean-time week, newest first with a title tiebreak;
  - recent 5, by year with "날짜 없음" last, topics with resolvable counts;
  - pure and frozen.
- **Pages:** the homepage weekly card, the `/writing` landing, `/writing/all` with sticky glass year headers, the accessibility/origin/no-JS bar, and NFR8 reach.
