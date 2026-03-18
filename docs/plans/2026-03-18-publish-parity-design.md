# Obsidian Publish Parity — Feature Design

Date: 2026-03-18

## Overview

Eight features to bring obsidian-press closer to full Obsidian Publish feature parity,
plus analytics and related posts beyond what Publish offers.

## Features

### 1. Sitemap

Use Astro's `@astrojs/sitemap` integration.

- Install: `npm install @astrojs/sitemap`
- Add `site: "https://rvnnt.dev"` and `integrations: [sitemap()]` to `astro.config.mjs`
- Auto-generates `sitemap-index.xml` and `sitemap-0.xml` at build time
- No custom code needed

### 2. Open Graph / SEO Meta Tags

Add meta tags to `BaseLayout.astro` `<head>`.

**Props**: BaseLayout receives optional `title`, `description`, `url`, `type` from child layouts.
PostLayout passes post-specific data (title, summary from previews.json, slug).

**Tags generated**:
- `<meta name="description">` — post summary or site default
- `<meta property="og:title">` / `<meta property="og:description">`
- `<meta property="og:type">` — "article" for posts, "website" otherwise
- `<meta property="og:url">` — canonical URL
- `<meta name="twitter:card" content="summary">`
- `<link rel="canonical">`

**Fallbacks**: Non-post pages use site-level defaults ("obsidian-press — personal knowledge base").

### 3. 404 Page

Create `site/src/pages/404.astro`.

- Uses BaseLayout
- Shows "페이지를 찾을 수 없습니다" with a link back to home
- Minimal styling, consistent with site design
- Astro serves this automatically for unmatched routes in static mode

### 4. Outline Highlights (TOC Scroll Spy)

Highlight the active section in the Table of Contents as the user scrolls.

**Implementation**: Inline `<script>` in PostLayout (not a Preact island — avoids hydration overhead for a pure DOM observer).

**Mechanism**:
- `IntersectionObserver` on all `[id]` headings (`h2`, `h3`, `h4`) in `.post-content`
- `rootMargin: "-64px 0px -80% 0px"` (offset for sticky header, trigger in top 20% of viewport)
- When a heading enters: find the corresponding `<a href="#heading-id">` in `.toc-list`, add `.toc-active` class, remove from others

**CSS** (in `post.css`):
```css
.toc-item a.toc-active {
  color: var(--c-accent);
  font-weight: 600;
}
```

**Mobile**: Also applies to mobile sidebar TOC (same class names).

### 5. Heading Folding

Allow readers to collapse/expand content sections by clicking headings.

**Implementation**: Inline `<script>` in PostLayout.

**Mechanism**:
- On DOM ready, insert a clickable chevron `<button>` before each `h2` and `h3` in `.post-content`
- Button class: `.heading-fold-toggle`
- Click handler: toggle `display: none` on all sibling elements between the heading and the next heading of same or higher level
- Add `.collapsed` class to the heading for CSS rotation of chevron
- Expanded by default

**CSS** (in `post.css`):
```css
.heading-fold-toggle {
  /* inline button, chevron icon, rotates on collapse */
}
h2.collapsed + *, h3.collapsed + * {
  /* JS handles display toggle, not CSS siblings (too fragile) */
}
```

**Edge cases**:
- Nested headings: collapsing h2 also hides all h3/h4 within its section
- Code blocks, callouts, diagrams within a section: all hidden together
- TOC links still work (clicking scrolls + auto-expands collapsed section)

### 6. Last Updated Date

Show when content was last modified, sourced from git history.

**Preprocessor change** (`scanner.rs`):
- For each vault file, run `git log -1 --format=%Y-%m-%d -- <filepath>`
- Store result as `updated: Option<String>` on `PostMeta`
- Fallback: if git command fails (no repo, shallow clone), use `None`

**Types change** (`types.rs`):
- Add `pub updated: Option<String>` to `PostMeta`

**Output change** (`output.rs`):
- Include `updated` in `OutputMeta` JSON

**Astro change** (`types.ts`, `PostLayout.astro`):
- Add `updated?: string` to `PostMeta` type
- Display "최종 수정: {date}" in `.post-meta` when `updated` differs from `published`

### 7. Related Posts

Show up to 3 related posts at the end of each post, below backlinks.

**Preprocessor change** — new module `related.rs`:

**Scoring algorithm**:
| Signal | Weight |
|--------|--------|
| Shared tag | +2 per tag |
| Forward link (A links to B) | +3 |
| Backlink (B links to A) | +3 |
| Same hub_parent | +1 |

- For each post, score all other posts, take top 3 with score > 0
- Store as `related: Vec<RelatedPost>` where `RelatedPost = { slug, title, score }`

**Output change** (`output.rs`):
- Include `related` in `OutputMeta`

**Astro change**:
- New `RelatedPosts.astro` component
- Rendered in PostLayout below BacklinkList
- Shows title + tags for each related post
- "관련 글" heading

### 8. Analytics (CloudFront Access Logs)

Enable server-side analytics via CloudFront access logging.

**Terraform change** (`infra/`):
- Create S3 bucket `obsidian-blog-cf-logs` with lifecycle policy (90-day expiry)
- Enable `logging_config` on `aws_cloudfront_distribution`
- Optionally: create Athena database + table for ad-hoc queries

**No client-side changes.** Log analysis is done out-of-band via Athena or scripts.

## Implementation Order

1. **404 page** — standalone, no dependencies
2. **Sitemap** — standalone, Astro integration
3. **OG meta tags** — BaseLayout change, needs PostLayout props
4. **Outline highlights** — PostLayout script + CSS
5. **Heading folding** — PostLayout script + CSS (after outline, shares heading awareness)
6. **Last updated date** — preprocessor + Astro changes
7. **Related posts** — preprocessor + new component (depends on existing link/tag data)
8. **Analytics** — Terraform only, independent of site code

## Files Modified

| Feature | Preprocessor | Site | Infra |
|---------|-------------|------|-------|
| Sitemap | — | `astro.config.mjs` | — |
| OG meta | — | `BaseLayout.astro`, `PostLayout.astro`, `types.ts` | — |
| 404 | — | `pages/404.astro` | — |
| Outline highlights | — | `PostLayout.astro`, `post.css` | — |
| Heading folding | — | `PostLayout.astro`, `post.css` | — |
| Last updated | `scanner.rs`, `types.rs`, `output.rs` | `PostLayout.astro`, `types.ts` | — |
| Related posts | new `related.rs`, `lib.rs`, `output.rs`, `types.rs` | new `RelatedPosts.astro`, `PostLayout.astro`, `types.ts` | — |
| Analytics | — | — | `main.tf` |
