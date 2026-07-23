# Syntax Highlighting & Markdown Rendering Improvements — Design

**Date:** 2026-03-16
**Status:** Approved

## Changes

### 1. Syntax Highlighting (Shiki dual-theme)
Add `@shikijs/rehype` to the unified pipeline in `render.ts`. Dual themes: `github-light` (light mode) and `github-dark` (dark mode) via Shiki's CSS variables approach. Themes switch based on `[data-theme]` attribute — integrates with existing theme toggle, zero JS.

### 2. Code Block Filenames
Custom rehype plugin that parses Obsidian-style `title:"filename.rs"` from code fence info strings. Wraps code block in a container with a filename header div. Runs after Shiki so it wraps the already-highlighted output.

### 3. Image Handling
Custom rehype plugin:
- Adds `loading="lazy"` and `decoding="async"` to all `<img>` tags
- Wraps images with alt text in `<figure>` + `<figcaption>`

### 4. Responsive Tables
Custom rehype plugin wraps `<table>` elements in `<div class="table-wrapper">` with `overflow-x: auto`. Clean table styles in `post.css`.

### 5. Footnotes
`remark-gfm` already supports `[^ref]` syntax. The preprocessor preserves footnotes as-is. Just needs CSS styling for the rendered footnote section and back-references.

## Files Changed

| File | Change |
|---|---|
| `render.ts` | Add `@shikijs/rehype`, custom rehype plugins for images/tables/filenames |
| `post.css` | Table wrapper, figure/caption, code filename header, footnote styles |
| `global.css` | Shiki CSS variable theme mapping under `[data-theme]` |
| `package.json` | Add `shiki`, `@shikijs/rehype` |

No Rust preprocessor changes.
