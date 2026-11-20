# Frontend Components — U2 `u2-writing-section`

Upstream: `inception/refined-mockups/interaction-spec.md` (WeeklyPostList, TopicRow, CompactPostRow and YearHeader), `design-system-mapping.md`, `accessibility-checklist.md`; `functional-spec.md`, `rules.md`.

All components are server-rendered Astro components. There are no islands and no client JavaScript.

## Hierarchy

```
index.astro (/)
└─ HomeOpening (U1, unchanged)
└─ WeeklyPostList            posts=weekPosts(meta, D)
   ├─ PostCard × n           (existing full row)
   ├─ EmptyRow               "이번 주에 발행한 글이 없습니다." (when n = 0)
   └─ AllPostsRow            href=/writing/all

writing/index.astro (/writing)
├─ h1 "Writing"
├─ nav.capsules              Tags → /tags, Graph → /graph   (U3 repoints)
├─ RecentPosts               posts=recentPosts(meta, 5)
│  ├─ PostCard × ≤5 | EmptyRow "아직 발행한 글이 없습니다."
│  └─ AllPostsRow            (only when there are posts)
└─ TopicList                 topics=topics(meta)  (absent when empty)
   └─ TopicRow × n

writing/all.astro (/writing/all)
├─ BackLink "‹ Writing"      href=/writing
├─ h1 "모든 글" + count "글 N개"
└─ YearGroup × g             groups=postsByYear(meta)
   ├─ h2.year-header (sticky)
   └─ CompactPostRow × m
```

Text fallback: the homepage keeps U1's opening and adds the weekly card. `/writing` has a heading, two capsules, recent posts and topics. `/writing/all` has a back link, a heading with the count, and year groups of compact rows under sticky headers.

## Components

| Component | File | Props | Markup and states | data-testid |
|---|---|---|---|---|
| WeeklyPostList | `site/src/components/writing/WeeklyPostList.astro` | `posts: readonly PostMeta[]`, `allHref: string` | `<section aria-labelledby="week-heading">`, `<h2>이번 주 글</h2>`, `<ul class="grouped-list">`; states: default, empty | `week-list` |
| RecentPosts | `site/src/components/writing/RecentPosts.astro` | `posts`, `allHref` | `<section>`, `<h2>최근 글</h2>`; states: default, empty (no AllPostsRow) | `recent-list` |
| TopicList / TopicRow | `site/src/components/writing/TopicList.astro` | `topics: readonly Topic[]` | `<section>`, `<h2>주제</h2>`, `<li><a href="/hubs/<slug>">title <span class="grouped-row-count">글 N개</span></a>`; omitted when empty | `topic-row` |
| YearGroup / CompactPostRow | `site/src/components/writing/YearGroup.astro` | `group: { label: string; posts }` | `<section aria-labelledby>`, `<h2 class="year-header">`, `<li><a>` title + `<time datetime="YYYY-MM-DD">M월 D일</time>`; undated rows have no `<time>` | `year-group`, `compact-row` |
| AllPostsRow | inline in the lists | `href` | `.grouped-row` link "모든 글 보기" with chevron | `all-posts-link` |
| EmptyRow | existing `.grouped-empty` | text | plain `<li>` (not a link) | `empty-row` |
| BackLink | inline in `all.astro` | `href` | text link with decorative `ChevronLeft`, ≥ 44 px target | `back-link` |

## State and data flow

- **Data:** each page's frontmatter reads the metadata once, computes `D` once with `resolveKoreanBuildDate(env)`, and calls the WritingLists functions in `site/src/lib/writing-lists.ts`. Components receive frozen arrays; there is no client state.
- **Types:** `Topic = { slug: string; title: string; count: number }` and `YearGroup = { label: string; posts: readonly PostMeta[] }`, both `readonly`.

## Styles (`site/src/styles/writing.css`)

- **`.year-header`:**
  - sticky at `calc(var(--bar-inset) * 2 + var(--bar-height))`;
  - background `--c-glass-thick` with `--glass-blur`;
  - the `@supports not (backdrop-filter: …)` and `@media (prefers-reduced-transparency: reduce)` fallbacks use `--c-bg-grouped`.
- **`.compact-row`:** min block size `var(--target)`; `scroll-margin-block-start` = bar + header height.
- **`.grouped-row-count`:** colour `--c-text-secondary`.
- **Titles:** `word-break: keep-all`; `overflow-wrap: anywhere`.
- **Scope:** only `--c-` tokens, no new colours, motion only on `transform` and `opacity`. `global.css` and the review-subject files are not changed.

## Interaction and validation

There are no forms. The only interactions are links (Tab, Enter) and the hover fill `--c-fill`. The focus ring is the existing inset ring. The year headers are not focusable.

## Integration points

| Point | Owner | U2 use |
|---|---|---|
| `getOrdinaryPosts()`, `getHubs()`, `getAllPostMeta()` | U1 data layer | read |
| `PostCard.astro` | existing | full rows |
| `HIG_ROUTES` in `tests/e2e/support/hig` | existing HIG suite | add `/writing` and `/writing/all` so the axe matrix covers them |
| Capsule hrefs `/tags`, `/graph` | U2 now, U3 later | U3 repoints them |
