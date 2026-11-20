# Business Rules — U2 `u2-writing-section`

Upstream: `inception/units-generation/unit-of-work.md` (U2); `inception/requirements-analysis/requirements.md` (FR3.4–FR3.7, FR4.1–FR4.6, NFR1–NFR4, NFR8); `inception/user-stories/stories.md` (US3.3, US3.4, US4.1, US4.2, US7.1); `inception/refined-mockups/mockups.md` (M1–M3), `interaction-spec.md`; `inception/domain-design/components.md` (WritingLists, WritingPages, HomePage); `inception/contract-design/contract-summary.md` (C2, C3).

U2 is a UI unit. It writes these rules because the WritingLists logic is pure and is tested on its own. The YAML block is the source of truth.

```yaml
rules:
  - id: BR1.1
    statement: Lists show ordinary posts only.
    category: constraint
    applies_to: [WritingLists]
    trigger: building any list on /, /writing or /writing/all
    logic: IF a metadata entry has is_hub = true THEN it never appears as a list row; it can appear only as a topic row (BR1.6). Site pages are never in post metadata (U1, C2).
    violation: n/a
    source: FR4.6, ADR-003
  - id: BR1.2
    statement: Week window in Korean time.
    category: calculation
    applies_to: [WritingLists]
    trigger: building the homepage
    logic: |
      The build date comes from:
      - HOMEPAGE_TODAY_OVERRIDE when it is a valid YYYY-MM-DD, taken as the Korean date;
      - otherwise the build instant + 9 h, giving the UTC+9 calendar date.
      The week runs from that date's Monday through its Sunday, inclusive.
    violation: an override that is not a valid YYYY-MM-DD is ignored (the real date is used), as today
    source: FR3.4, AC3.3.1, AC3.3.3
  - id: BR1.3
    statement: This week's posts.
    category: calculation
    applies_to: [WritingLists]
    trigger: building the homepage
    logic: Ordinary posts with a published date d where monday ≤ d ≤ sunday, ordered by published descending, then title ascending (locale-independent code-point order). Undated posts are excluded. No cap.
    violation: n/a
    source: FR3.4, FR3.5, AC3.3.1, AC3.3.2
  - id: BR1.4
    statement: Recent posts.
    category: calculation
    applies_to: [WritingLists]
    trigger: building /writing
    logic: The first 5 dated ordinary posts in the order published descending, then title ascending. Undated posts are excluded. Fewer than 5 → all of them.
    violation: n/a
    source: FR4.1, FR4.2, AC4.1.1, AC4.1.2
  - id: BR1.5
    statement: All posts by year.
    category: calculation
    applies_to: [WritingLists]
    trigger: building /writing/all
    logic: Every ordinary post appears exactly once. Dated posts are grouped by the year of published, newest year first, and inside a year by published descending, then title ascending. Undated posts form one final group "날짜 없음", ordered by title ascending. Empty groups are never emitted.
    violation: n/a
    source: FR4.4, FR4.5, AC4.2.1, AC4.2.2, AC4.2.3
  - id: BR1.6
    statement: Topics.
    category: calculation
    applies_to: [WritingLists]
    trigger: building /writing
    logic: One topic per hub, ordered by title ascending. Its count is the number of the hub's forward_links that resolve to an existing metadata entry (the same set the hub page lists). A count of 0 is allowed.
    violation: n/a
    source: FR4.3, AC4.1.4
  - id: BR1.7
    statement: Pure and frozen.
    category: constraint
    applies_to: [WritingLists]
    trigger: every list function
    logic: List functions take metadata and the date as arguments, never read files or the clock themselves, never mutate their input, and return frozen arrays.
    violation: n/a
    source: NFR4; team Code Style
  - id: BR2.1
    statement: Homepage weekly section.
    category: policy
    applies_to: [HomePage]
    trigger: rendering /
    logic: The section is headed "이번 주 글" (h2) and holds full post rows from BR1.3, or, when there are none, the plain-text row "이번 주에 발행한 글이 없습니다.". It always ends with the row link "모든 글 보기" → /writing/all. It replaces U1's interim "오늘 발행된 글".
    violation: n/a
    source: FR3.6, FR3.7, AC3.3.4, AC3.4.1
  - id: BR2.2
    statement: Writing landing.
    category: policy
    applies_to: [WritingPages]
    trigger: rendering /writing
    logic: |
      In order:
      - the h1 "Writing" and the document title "Writing — Passion Project";
      - plain capsules "Tags" → /tags and "Graph" → /graph (U3 repoints them to /writing/...);
      - "최근 글" (h2) with BR1.4 rows, then the "모든 글 보기" row; with no posts, only the empty row "아직 발행한 글이 없습니다.";
      - "주제" (h2) with BR1.6 rows, each linking to /hubs/<slug> and showing "글 N개"; this section is left out when there are no hubs.
    violation: n/a
    source: FR4.1–FR4.3, AC4.1.1–AC4.1.5
  - id: BR2.3
    statement: All-posts page.
    category: policy
    applies_to: [WritingPages]
    trigger: rendering /writing/all
    logic: |
      In order:
      - a back link "‹ Writing" → /writing;
      - the h1 "모든 글" and the document title "모든 글 — Passion Project";
      - the count "글 N개" (N = ordinary posts);
      - one section per BR1.5 group with an h2 year header ("2026", …, "날짜 없음") and compact rows (title + month-day date in <time datetime>).
      With no posts: the empty row "아직 발행한 글이 없습니다." and no headers.
    violation: n/a
    source: FR4.4, FR4.5, AC4.2.1–AC4.2.3
  - id: BR2.4
    statement: Sticky year headers.
    category: constraint
    applies_to: [WritingPages]
    trigger: scrolling /writing/all
    logic: Year headers stick just under the floating bar on thick glass. Under prefers-reduced-transparency, or without backdrop-filter support, they use the solid grouped background. Rows carry scroll-margin-block-start = bar + header height, so a focused row is never hidden.
    violation: n/a
    source: mockups M3 Q5; WCAG 2.2 2.4.11
  - id: BR2.5
    statement: Accessibility and privacy bar for the three pages.
    category: constraint
    applies_to: [HomePage, WritingPages]
    trigger: every change
    logic: |
      Each page has:
      - axe WCAG 2.2 AA clean at 320, 768, 1024 and 1440 px, light and dark, plus the reduced-motion check;
      - one h1, and an h2 per section;
      - targets of at least 44 × 44 px;
      - no request to another origin;
      - full content and links with JavaScript off;
      - no new island.
    violation: test failure
    source: NFR1–NFR3, AC7.1.1–AC7.1.3
  - id: BR2.6
    statement: Writing reach.
    category: constraint
    applies_to: [WritingPages]
    trigger: build
    logic: The set of row links on /writing/all equals the set of /posts/<slug> for every ordinary post in the metadata (NFR8). Every post is reachable from /writing in 2 clicks via "모든 글 보기".
    violation: test failure
    source: NFR8, AC4.2.1
```

## Summary

| ID | Rule |
|---|---|
| BR1.1 | Only ordinary posts in lists; hubs only as topics |
| BR1.2 | Week = Monday–Sunday of the build's Korean date; the override is a Korean date |
| BR1.3 | This week: newest first, title tiebreak, undated excluded, no cap |
| BR1.4 | Recent: 5 newest dated posts |
| BR1.5 | All: year groups newest first, "날짜 없음" last by title |
| BR1.6 | Topics: hubs by title; count = resolvable forward links |
| BR1.7 | Pure, input-immutable, frozen output |
| BR2.1 | Homepage "이번 주 글" with empty row and "모든 글 보기" |
| BR2.2 | `/writing` layout, empty states, Tags/Graph capsules to the current addresses |
| BR2.3 | `/writing/all` layout and empty state |
| BR2.4 | Sticky glass year headers, solid fallback, scroll margin |
| BR2.5 | Accessibility, origin and no-JS bar |
| BR2.6 | `/writing/all` links equal the ordinary-post set |
