# Responsive Web Design Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the site fully usable on tablet (768px) and phone (375px) with hamburger menu, floating TOC button, and responsive spacing.

**Architecture:** CSS-only changes for spacing/typography/component fixes, two new Preact islands for mobile interactions (MobileNav, MobileSidebar). No preprocessor changes.

**Tech Stack:** Astro 6, Preact, CSS media queries, inline SVG icons

---

## Task 1: Responsive Spacing and Typography

**Files:**
- Modify: `site/src/styles/global.css`
- Modify: `site/src/styles/post.css`

**Step 1: Add responsive media queries to `global.css`**

Append at the end of `global.css`:

```css
/* ── Responsive: Phone ── */
@media (max-width: 479px) {
  .site-main {
    padding: 1.5rem 1rem;
  }
  h1 { font-size: 1.4rem; }
  h2 { font-size: 1.2rem; }
  h3 { font-size: 1.05rem; }
  .back-to-top {
    bottom: 1rem;
    right: 1rem;
  }
  .site-footer {
    padding: 1rem;
    font-size: 0.8rem;
  }
}

/* ── Responsive: Small tablet ── */
@media (min-width: 480px) and (max-width: 767px) {
  .site-main {
    padding: 2rem 1.25rem;
  }
  h1 { font-size: 1.6rem; }
  h2 { font-size: 1.3rem; }
  .back-to-top {
    bottom: 1.5rem;
    right: 1.5rem;
  }
}

/* ── Responsive: Touch targets ── */
@media (max-width: 767px) {
  .site-nav-link {
    padding: 0.5rem 0.75rem;
  }
}
```

**Step 2: Add responsive post styles to `post.css`**

Append at end of `post.css`:

```css
/* ── Responsive: Post ── */
@media (max-width: 479px) {
  .post-title { font-size: 1.5rem; }
  .post-meta { font-size: 0.8rem; }
  pre.shiki, .code-block pre { padding: 0.75rem; }
  .code-block pre.shiki[data-language]::before,
  .code-block-wrapper > pre.shiki[data-language]::before { display: none; }
  .copy-btn { padding: 0.5rem; }
}

@media (min-width: 480px) and (max-width: 767px) {
  .post-title { font-size: 1.75rem; }
}
```

**Step 3: Verify**

Run: `cd site && npx astro build`
Expected: All pages build, no errors.

**Step 4: Commit**

Commit message: `feat: add responsive spacing and typography scaling`

---

## Task 2: Hamburger Menu

**Files:**
- Create: `site/src/islands/MobileNav.tsx`
- Modify: `site/src/components/Header.astro`
- Modify: `site/src/styles/global.css`

**Step 1: Create `site/src/islands/MobileNav.tsx`**

Preact island with open/close state. Renders a hamburger button (3 lines) that toggles to X when open. When open, shows a dropdown panel below the header with nav links stacked vertically.

Uses inline SVG (Menu icon: 3 horizontal lines, X icon: two crossing lines). Links are `{ href, label }[]` passed as props.

**Step 2: Update `site/src/components/Header.astro`**

Add `.desktop-nav` class to existing `<nav>`. Add a `.mobile-nav` div with ThemeToggle + MobileNav island. The mobile nav uses `client:load`.

Structure:
```html
<header class="site-header">
  <a href="/" class="site-title">...</a>
  <nav class="desktop-nav">...existing links + ThemeToggle...</nav>
  <div class="mobile-nav">
    <ThemeToggle client:load />
    <MobileNav client:load links={[...]} />
  </div>
</header>
```

**Step 3: Add CSS to `global.css`**

- `.mobile-nav { display: none }` by default
- At `max-width: 767px`: `.desktop-nav { display: none }` and `.mobile-nav { display: flex }`
- `.mobile-nav-toggle`: button styling (border, radius, padding for 44px+ target)
- `.mobile-nav-dropdown`: absolute position below header, full-width, surface background, shadow, stacked links with 48px touch targets

**Step 4: Verify**

Run: `cd site && npx astro build`
Expected: Build succeeds. Resize to <768px to see hamburger.

**Step 5: Commit**

Commit message: `feat: add hamburger menu for mobile navigation`

---

## Task 3: Mobile Sidebar (Floating TOC Button and Overlay)

**Files:**
- Create: `site/src/islands/MobileSidebar.tsx`
- Create: `site/src/styles/mobile-sidebar.css`
- Modify: `site/src/layouts/PostLayout.astro`

**Step 1: Create `site/src/styles/mobile-sidebar.css`**

- Hide `.mobile-sidebar-btn` and overlay at `min-width: 960px` (desktop has real sidebar)
- `.mobile-sidebar-btn`: fixed position at bottom-right (staggered above back-to-top), 2.5rem circle, surface bg, border, shadow
- Responsive bottom positioning: 4.5rem (phone), 5rem (480px+), 5.5rem (768px+)
- Shift `.back-to-top` up at `max-width: 959px` to avoid overlap
- `.mobile-sidebar-overlay`: fixed full-screen backdrop
- `.mobile-sidebar-card`: centered white card, max 400px wide, 80vh max height, overflow scroll
- Tab buttons (목차/탐색) with active underline accent
- TOC list styling matching desktop TOC with depth indentation

**Step 2: Create `site/src/islands/MobileSidebar.tsx`**

Props: `content: string` (rendered HTML), `currentSlug: string`

Features:
- `extractToc(html)`: regex to pull h2-h4 with ids from rendered HTML (same pattern as TableOfContents.astro)
- Floating button with List icon (inline SVG)
- Tap opens overlay with two tabs
- "목차" tab: rendered TOC from extracted headings. Tap heading closes overlay and smooth-scrolls.
- "탐색" tab: lazy-loads `/nav-tree.json` on first switch, renders collapsible tree (reuse NavTree logic with inline styles for simplicity)
- Close via X button or backdrop tap
- `client:visible` hydration

**Step 3: Add to `PostLayout.astro`**

Import MobileSidebar island and CSS. Place the island just before closing `</BaseLayout>`:
```astro
<MobileSidebar client:visible content={content} currentSlug={meta.slug} />
```

**Step 4: Verify**

Run: `cd site && npx astro build`
Expected: Build succeeds. On mobile viewport, floating button appears on post pages.

**Step 5: Commit**

Commit message: `feat: add mobile sidebar with floating TOC button and overlay`

---

## Task 4: Component-Specific Mobile Fixes

**Files:**
- Modify: `site/src/styles/search.css`
- Modify: `site/src/styles/link-preview.css`
- Modify: `site/src/components/HubNav.astro`
- Modify: `site/src/pages/graph.astro`

**Step 1: Search modal wider on phones**

Append to `search.css`:
```css
@media (max-width: 479px) {
  .search-modal { width: 95%; }
  .search-overlay { padding-top: 10vh; }
}
```

**Step 2: Disable link preview on touch**

Append to `link-preview.css`:
```css
@media (max-width: 767px) {
  .link-preview-tooltip { display: none !important; }
}
```

**Step 3: Hub prev/next stacks on phones**

Add inside `<style>` in `HubNav.astro`:
```css
@media (max-width: 479px) {
  .hub-prevnext { flex-direction: column; gap: 0.5rem; }
  .hub-next { margin-left: 0; text-align: left; }
}
```

**Step 4: Graph page portrait + hint**

Update `graph.astro`:
- Add `<p class="graph-hint">핀치하여 확대</p>` below `<h1>`
- Add CSS: `.graph-hint { display: none; color: var(--c-text-muted); font-size: 0.8rem; margin-top: 0.5rem; }`
- At `max-width: 767px`: `.graph-container { aspect-ratio: 3 / 4; }` and `.graph-hint { display: block; }`

**Step 5: Verify**

Run: `cd site && npx astro build`
Expected: All pages build.

**Step 6: Commit**

Commit message: `feat: mobile fixes for search, tooltips, hub nav, and graph page`

---

## Task 5: Final Integration Verification

**Step 1: Full build**

Run: `cd site && npx astro build`
Expected: All pages, no errors.

**Step 2: Visual verification with dev server**

Run: `cd site && npx astro dev`

Test at 375px (phone):
- Hamburger menu works (open/close, links navigate)
- Floating TOC button appears on posts
- TOC overlay opens, headings scroll correctly
- Nav tree tab loads and renders
- Spacing is comfortable, no horizontal overflow

Test at 768px (tablet):
- Hamburger gone, desktop nav visible
- No link preview tooltips
- Graph in portrait orientation

Test at 960px+ (desktop):
- Full sidebar, no floating button
- Everything unchanged

**Step 3: Commit any fixes**

Commit message: `fix: responsive integration adjustments`

---

## Summary

| Task | Description | New Files |
|------|-------------|-----------|
| 1 | Spacing and typography | — |
| 2 | Hamburger menu | `MobileNav.tsx` |
| 3 | Mobile sidebar | `MobileSidebar.tsx`, `mobile-sidebar.css` |
| 4 | Component fixes | — |
| 5 | Integration verification | — |

**Total: 5 tasks, 3 new files, ~5 commits**
