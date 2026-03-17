# Callout Coverage, Code Highlights, and UI Enhancements — Design

**Date:** 2026-03-16
**Status:** Approved

## Changes

### 1. Code Line Highlighting
Add `transformerMetaHighlight()` from `@shikijs/transformers` to the existing Shiki config in `render.ts`. Parses `{3-5}` from code fence meta. CSS for highlighted line background.

### 2. Full Callout Type Coverage
CSS for all 13 Obsidian callout types, grouped by color:
- Blue: note, info, abstract, todo
- Yellow: warning, attention, caution
- Green: tip, success, done, check
- Red: danger, failure, bug, important
- Purple: question, help, faq
- Grey: quote, cite, example

### 3. Collapsible Callouts
Preprocessor detects `> [!type]-` (minus suffix) and outputs `<details><summary>` instead of `<div>`. CSS styles details/summary to match callout appearance.

### 4. Reading Progress Bar
Thin fixed bar at top. Inline script in BaseLayout updates CSS variable on scroll. No island needed.

### 5. Back-to-Top Button
Fixed bottom-right, appears after scrolling past first viewport. Inline JS + CSS.

## Files Changed

| File | Change |
|---|---|
| `preprocessor/src/transform.rs` | Collapsible callout detection → `<details>`/`<summary>` |
| `site/src/lib/render.ts` | Add `transformerMetaHighlight` to Shiki |
| `site/src/styles/callouts.css` | Full 13-type palette + collapsible |
| `site/src/styles/post.css` | Code line highlight CSS |
| `site/src/layouts/BaseLayout.astro` | Progress bar + back-to-top (inline) |
| `site/src/styles/global.css` | Progress bar + back-to-top CSS |
