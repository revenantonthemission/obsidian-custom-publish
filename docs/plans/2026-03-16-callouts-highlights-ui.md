# Callout Coverage, Code Highlights, UI — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add full Obsidian callout coverage with collapsible support, code line highlighting, reading progress bar, and back-to-top button.

**Architecture:** Preprocessor change for collapsible callouts, Shiki transformer for line highlights, CSS for callout types, inline JS for UI elements.

**Design Doc:** `docs/plans/2026-03-16-callouts-highlights-ui-design.md`

---

## Task 1: Code line highlighting

**Files:**
- Modify: `site/src/lib/render.ts`
- Modify: `site/src/styles/post.css`
- Modify: `site/package.json`

Install `@shikijs/transformers`, add `transformerMetaHighlight()` to rehypeShiki config, add CSS.

## Task 2: Full callout type CSS

**Files:**
- Modify: `site/src/styles/callouts.css`

Add CSS for all 13 Obsidian callout types grouped by color family.

## Task 3: Collapsible callouts

**Files:**
- Modify: `preprocessor/src/transform.rs`
- Modify: `site/src/styles/callouts.css`

Detect `-`/`+` suffix in callout syntax, output `<details>`/`<summary>`. Add CSS.

## Task 4: Reading progress bar + back-to-top

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro`
- Modify: `site/src/styles/global.css`

Inline script + CSS for both UI elements.
