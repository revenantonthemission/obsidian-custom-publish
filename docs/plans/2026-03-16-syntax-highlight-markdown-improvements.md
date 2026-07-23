# Syntax Highlighting & Markdown Rendering Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Shiki dual-theme syntax highlighting, code filename headers, image lazy-loading with captions, responsive tables, and footnote styling to the blog's markdown rendering pipeline.

**Architecture:** All changes are in the Astro rendering layer (`render.ts` + CSS). Custom rehype plugins handle images, tables, and code filenames. Shiki handles syntax highlighting with CSS-variable-based dual theming. No Rust preprocessor changes.

**Tech Stack:** `@shikijs/rehype`, unified/rehype plugins (custom), CSS

**Design Doc:** `docs/plans/2026-03-16-syntax-highlight-markdown-improvements-design.md`

---

## Task 1: Install Shiki and add dual-theme syntax highlighting

**Files:**
- Modify: `site/src/lib/render.ts`
- Modify: `site/src/styles/global.css`
- Modify: `site/package.json`

**Step 1: Install @shikijs/rehype**

```bash
cd site && npm install @shikijs/rehype
```

**Step 2: Add rehypeShiki to the unified pipeline**

In `site/src/lib/render.ts`, add `rehypeShiki` after `rehypeRaw` and before `rehypeKatex`:

```typescript
import rehypeShiki from "@shikijs/rehype";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeShiki, {
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
    defaultColor: false,
  })
  .use(rehypeKatex, { strict: false })
  .use(rehypeStringify);
```

`defaultColor: false` outputs CSS variables (`--shiki-light`, `--shiki-dark`) instead of hardcoded colors.

**Step 3: Add Shiki CSS variable mapping to global.css**

Add to `global.css` after the existing theme tokens:

```css
/* ── Shiki dual-theme ── */
:root {
  --shiki-color-text: var(--c-text);
}

pre.shiki,
pre.shiki span {
  color: var(--shiki-light);
  background-color: var(--shiki-light-bg);
}

[data-theme="dark"] pre.shiki,
[data-theme="dark"] pre.shiki span {
  color: var(--shiki-dark);
  background-color: var(--shiki-dark-bg);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) pre.shiki,
  :root:not([data-theme="light"]) pre.shiki span {
    color: var(--shiki-dark);
    background-color: var(--shiki-dark-bg);
  }
}
```

**Step 4: Remove the old `pre` background styles from global.css**

The existing `pre { background: var(--c-code-bg); ... }` rule will conflict with Shiki's backgrounds. Update it to only apply to non-Shiki pre blocks:

```css
pre:not(.shiki) {
  background: var(--c-code-bg);
  /* ... existing styles ... */
}
```

**Step 5: Build and verify**

Run: `cd site && npx astro build`

Expected: 454 pages built. Check a post with code blocks — should have `<pre class="shiki">` with inline `--shiki-light` / `--shiki-dark` variables.

**Step 6: Commit**

```bash
git add site/package.json site/package-lock.json site/src/lib/render.ts site/src/styles/global.css
git commit -m "feat: add Shiki dual-theme syntax highlighting"
```

---

## Task 2: Add code block filename headers

**Files:**
- Modify: `site/src/lib/render.ts` (add custom rehype plugin)
- Modify: `site/src/styles/post.css`

**Step 1: Write the rehype plugin in render.ts**

Add before the `processor` definition:

```typescript
import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";

/** Rehype plugin: parse title:"filename" from code blocks, wrap in container with header. */
function rehypeCodeFilename() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (!parent || index === undefined) return;
      // Match <pre> containing <code> with a class like language-xxx
      if (node.tagName !== "pre") return;
      const code = node.children.find(
        (c): c is Element => c.type === "element" && c.tagName === "code"
      );
      if (!code) return;

      // Extract title from meta or data attributes
      const meta = (code.data?.meta as string) || "";
      const match = meta.match(/title[=:]"([^"]+)"/);
      if (!match) return;

      const filename = match[1];

      // Wrap <pre> in a container div with a filename header
      const wrapper: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["code-block"] },
        children: [
          {
            type: "element",
            tagName: "div",
            properties: { className: ["code-filename"] },
            children: [{ type: "text", value: filename }],
          },
          node,
        ],
      };
      parent.children[index] = wrapper;
    });
  };
}
```

Add `.use(rehypeCodeFilename)` after `rehypeShiki` in the pipeline.

**Step 2: Install unist-util-visit**

```bash
npm install unist-util-visit @types/hast
```

**Step 3: Add CSS to post.css**

```css
/* ── Code block with filename ── */
.code-block {
  margin-bottom: 1.5rem;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  overflow: hidden;
}

.code-block pre {
  margin: 0;
  border: none;
  border-radius: 0;
}

.code-filename {
  padding: 0.4rem 1rem;
  font-family: var(--font-code);
  font-size: 0.8rem;
  color: var(--c-text-muted);
  background: var(--c-code-bg);
  border-bottom: 1px solid var(--c-border);
}
```

**Step 4: Build and verify**

Expected: Code blocks with `title:"filename"` in the vault render with a filename header above the code.

**Step 5: Commit**

```bash
git add site/package.json site/package-lock.json site/src/lib/render.ts site/src/styles/post.css
git commit -m "feat: add code block filename headers from title:\"name\" syntax"
```

---

## Task 3: Image lazy loading and captions

**Files:**
- Modify: `site/src/lib/render.ts` (add custom rehype plugin)
- Modify: `site/src/styles/post.css`

**Step 1: Write the rehype plugin**

```typescript
/** Rehype plugin: lazy-load images and wrap in <figure> with caption from alt text. */
function rehypeImageCaption() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.tagName !== "img") return;

      // Add lazy loading
      node.properties.loading = "lazy";
      node.properties.decoding = "async";

      // Wrap in <figure> if alt text exists and is meaningful
      const alt = node.properties.alt as string;
      if (!alt || alt === "image") return;

      const figure: Element = {
        type: "element",
        tagName: "figure",
        properties: { className: ["image-figure"] },
        children: [
          node,
          {
            type: "element",
            tagName: "figcaption",
            properties: {},
            children: [{ type: "text", value: alt }],
          },
        ],
      };
      parent.children[index] = figure;
    });
  };
}
```

Add `.use(rehypeImageCaption)` after `rehypeCodeFilename` in the pipeline.

**Step 2: Add CSS to post.css**

```css
/* ── Image figures ── */
.image-figure {
  margin: 1.5rem 0;
  text-align: center;
}

.image-figure img {
  display: block;
  margin: 0 auto;
}

.image-figure figcaption {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--c-text-muted);
  font-style: italic;
}
```

**Step 3: Build, verify, commit**

```bash
git add site/src/lib/render.ts site/src/styles/post.css
git commit -m "feat: add image lazy loading and alt-text captions"
```

---

## Task 4: Responsive tables

**Files:**
- Modify: `site/src/lib/render.ts` (add custom rehype plugin)
- Modify: `site/src/styles/post.css`

**Step 1: Write the rehype plugin**

```typescript
/** Rehype plugin: wrap <table> in scrollable container. */
function rehypeTableWrapper() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.tagName !== "table") return;

      const wrapper: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["table-wrapper"] },
        children: [node],
      };
      parent.children[index] = wrapper;
    });
  };
}
```

Add `.use(rehypeTableWrapper)` to the pipeline.

**Step 2: Add CSS to post.css**

```css
/* ── Responsive tables ── */
.table-wrapper {
  overflow-x: auto;
  margin-bottom: 1.5rem;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
}

.table-wrapper table {
  width: 100%;
  border-collapse: collapse;
  margin: 0;
}

.table-wrapper th,
.table-wrapper td {
  padding: 0.6rem 0.9rem;
  text-align: left;
  border-bottom: 1px solid var(--c-border);
  white-space: nowrap;
}

.table-wrapper th {
  background: var(--c-code-bg);
  font-weight: 600;
  font-size: 0.9rem;
}

.table-wrapper tr:last-child td {
  border-bottom: none;
}
```

**Step 3: Build, verify, commit**

```bash
git add site/src/lib/render.ts site/src/styles/post.css
git commit -m "feat: add responsive table wrapper with scroll"
```

---

## Task 5: Footnote styling

**Files:**
- Modify: `site/src/styles/post.css`

**Step 1: Verify remark-gfm renders footnotes**

Check a built post that has footnotes. `remark-gfm` should already render `[^ref]` into a footnotes section with `<section class="footnotes">` and back-references. If not, the preprocessor's transform pass may be stripping the markers — check and adjust if needed.

**Step 2: Add CSS to post.css**

```css
/* ── Footnotes ── */
.footnotes {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--c-border);
  font-size: 0.875rem;
  color: var(--c-text-muted);
}

.footnotes ol {
  padding-left: 1.5rem;
}

.footnotes li {
  margin-bottom: 0.5rem;
}

.footnotes li p {
  margin: 0;
  display: inline;
}

sup a[data-footnote-ref] {
  color: var(--c-accent);
  text-decoration: none;
  font-weight: 600;
}

a[data-footnote-backref] {
  color: var(--c-accent);
  text-decoration: none;
  margin-left: 0.25rem;
}
```

**Step 3: Build, verify, commit**

```bash
git add site/src/styles/post.css
git commit -m "feat: add footnote section styling"
```

---

## Task Dependency Graph

```
Task 1 (Shiki) → Task 2 (filenames, depends on Shiki output)
                → Task 3 (images, independent)
                → Task 4 (tables, independent)
                → Task 5 (footnotes, independent, CSS-only)
```

Tasks 3, 4, 5 are independent of each other and of Task 2.
