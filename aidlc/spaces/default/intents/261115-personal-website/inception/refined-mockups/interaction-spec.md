# Interaction Specification — first release

Upstream: `mockups.md`; `inception/user-stories/stories.md`; `inception/requirements-analysis/requirements.md`. Format: `.claude/knowledge/aidlc-design-agent/component-spec-template.md`. All pages are static; there are no loading or error states except where noted.

---

## Homepage Opening

| Field | Value |
|---|---|
| Component | HomeOpening |
| Description | Large Title "Passion Project", owner name, short introduction and two capsule links |
| Category | display / navigation |

### States

| State | Description | Trigger |
|---|---|---|
| default | Title, name, introduction, two capsules | page load |
| hover | Capsule fill lightens (`--c-fill`) | pointer over a capsule |
| focus | Focus ring on the capsule | Tab |
| pressed | Capsule scales to 0.97 (transform only), none under reduced motion | press |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| name | string | yes | — | Owner's name from the approved profile facts |
| shortIntro | string | yes | — | Short introduction from the approved profile facts |
| resumeHref | string | yes | `/resume` | Résumé link |
| portfolioHref | string | yes | `/portfolio` | Portfolio link |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | One column; capsules side by side, wrap only if needed |
| tablet (768–1024px) | Same, wider measure |
| desktop (>1024px) | Same, measure capped like listing pages |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<h1>`, `<p>`, `<nav aria-label="프로필 바로가기">` with two links |
| Keyboard interaction | Tab to each capsule, Enter to follow |
| Label / aria-label | Visible text "Résumé", "Portfolio" |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 capsule border) |
| Screen reader | Heading, then name and introduction, then the navigation landmark |
| Focus management | Natural order; no focus moves |

### Usage Example

```
<HomeOpening name={profile.name} shortIntro={profile.shortIntro} />
```

---

## Weekly Post List

| Field | Value |
|---|---|
| Component | WeeklyPostList |
| Description | Grouped card "이번 주 글" of full post rows for the build's Monday–Sunday week (KST), then "모든 글 보기" |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| default | One or more full post rows | posts in the week |
| empty | Empty row "이번 주에 발행한 글이 없습니다." | no ordinary post in the week |
| hover | Row fill `--c-fill` | pointer over a row |
| focus | Inset focus ring on the row | Tab |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| posts | PostMeta[] | yes | — | Ordinary posts (not hubs) of the week, newest first, ties by title |
| allHref | string | yes | `/writing/all` | Target of "모든 글 보기" |

Week rule: the build date is converted to Korean time (UTC+9) first; the week runs from that date's Monday to its Sunday inclusive. A build at 2026-11-15T15:30Z is Monday 2026-11-16 KST, so the week is 2026-11-16 to 2026-11-22.

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Full width card, rows ≥ 60 px |
| tablet (768–1024px) | Same |
| desktop (>1024px) | Same, capped measure |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<section aria-labelledby>` with `<h2>`, `<ul>` of row links |
| Keyboard interaction | Tab through row links, Enter to open |
| Label / aria-label | Row link text is title, summary, date, reading time |
| Contrast ratio | WCAG AA |
| Screen reader | "이번 주 글, 목록 N개" then rows; empty row is plain text |
| Focus management | Natural order |

### Usage Example

```
<WeeklyPostList posts={weekPosts} allHref="/writing/all" />
```

---

## Topic Row

| Field | Value |
|---|---|
| Component | TopicRow |
| Description | One hub in the "주제" grouped list: title, "글 N개", chevron, link to `/hubs/<slug>` |
| Category | navigation |

### States

| State | Description | Trigger |
|---|---|---|
| default | Title and count | page load |
| hover | Row fill `--c-fill` | pointer |
| focus | Inset focus ring | Tab |
| empty | Section omitted when there are no hubs | no hubs |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| slug | string | yes | — | Hub slug |
| title | string | yes | — | Hub title |
| count | number | yes | — | Posts the hub lists (0 allowed) |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Count stays on the trailing edge; title wraps |
| tablet (768–1024px) | Same |
| desktop (>1024px) | Same |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<li><a>` |
| Keyboard interaction | Tab, Enter |
| Label / aria-label | "Computer Science, 글 34개" |
| Contrast ratio | Count in `--c-text-secondary`, AA |
| Screen reader | Title then count |
| Focus management | Natural order |

### Usage Example

```
<TopicRow slug={hub.slug} title={hub.title} count={hub.children.length} />
```

---

## Compact Post Row and Sticky Year Header

| Field | Value |
|---|---|
| Component | CompactPostRow, YearHeader |
| Description | `/writing/all` rows (title + month-day date) grouped under sticky year headers |
| Category | display / layout |

### States

| State | Description | Trigger |
|---|---|---|
| default | Row title and date; header in flow | page load |
| stuck | Year header pinned under the floating bar on thick glass | its year's rows are on screen |
| hover | Row fill `--c-fill` | pointer |
| focus | Inset focus ring; a focused row scrolled under a stuck header is scrolled clear by `scroll-margin` | Tab |
| empty | "아직 발행한 글이 없습니다." | no posts |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| groups | { year: string; posts: PostMeta[] }[] | yes | — | Years newest first, then "날짜 없음" |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Date wraps under the title if needed; header full width |
| tablet (768–1024px) | Date on trailing edge |
| desktop (>1024px) | Same |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<section aria-labelledby>` per year with `<h2>`, `<ul>` of links |
| Keyboard interaction | Tab through rows; the header is not focusable |
| Label / aria-label | Row: "제목, 2026년 11월 18일" via `<time>` |
| Contrast ratio | Header text on glass meets 4.5:1 over any row beneath (solid fallback when transparency is reduced) |
| Screen reader | Heading navigation lists the years |
| Focus management | `scroll-margin-block-start` on rows = bar + header height so focus is never hidden (WCAG 2.2 2.4.11) |

### Usage Example

```
<YearGroup year="2026" posts={posts2026} />
```

---

## Writing Navigation Item

| Field | Value |
|---|---|
| Component | PrimaryNavItem (Writing) |
| Description | The only top-bar section in this release |
| Category | navigation |

### States

| State | Description | Trigger |
|---|---|---|
| default | Text only | not in the Writing section |
| current page | Indicator + `aria-current="page"` | on `/writing` |
| current section | Indicator + `aria-current="true"` | on `/writing/all`, `/writing/tags*`, `/writing/graph` |
| focus | Bar focus ring | Tab |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| pathname | string | yes | — | Current path, normalised without trailing slash |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Row in the navigation sheet (52 px); works with JS off |
| tablet (768–1024px) | In the bar |
| desktop (>1024px) | In the bar |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<nav aria-label="주요 탐색">` link |
| Keyboard interaction | Tab, Enter |
| Label / aria-label | "Writing" |
| Contrast ratio | Indicator 3:1 against the bar; not colour alone (shape) |
| Screen reader | "Writing, 현재 페이지" or "현재 항목" |
| Focus management | Natural order |

### Usage Example

```
<PrimaryNav pathname={Astro.url.pathname} />
```

---

## Old-Address Redirect (server)

| Field | Value |
|---|---|
| Component | LegacyRedirect |
| Description | The static server answers old Writing addresses with 301 before looking for files |
| Category | navigation |

### States

| State | Description | Trigger |
|---|---|---|
| default | 301 with `Location` | request to `/tags`, `/tags/`, `/tags/<tag>[/]`, `/graph`, `/graph/` |
| pass-through | Normal file serving | any other path, including `/graph.json` |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| path | string | yes | — | Request path |
| query | string | no | — | Kept on the target |

`Location` re-encodes the tag with percent-encoding (Korean tags), e.g. `/tags/운영체제` → `/writing/tags/%EC%9A%B4%EC%98%81%EC%B2%B4%EC%A0%9C`.

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | n/a |
| tablet (768–1024px) | n/a |
| desktop (>1024px) | n/a |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | n/a (HTTP) |
| Keyboard interaction | n/a |
| Label / aria-label | n/a |
| Contrast ratio | n/a |
| Screen reader | The browser lands on the new page; its title is announced |
| Focus management | n/a |

### Usage Example

```
GET /tags/os  →  301  Location: /writing/tags/os
```

---

## Link to the Retired Homepage Note

A wikilink in a post to the note still marked `visibility: homepage` ("Passion Project.md") renders as a link to `/` (Q4). Embedding it still fails the run (requirements FR2.3).
