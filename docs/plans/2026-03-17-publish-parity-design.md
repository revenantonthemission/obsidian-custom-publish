# Obsidian Publish Parity — Design Document

Date: 2026-03-17
Goal: Implement core Obsidian Publish features missing from obsidian-press

## Overview

Five features to reach parity with Obsidian Publish's core feature set. All follow the existing architecture: Obsidian-specific transforms in the Rust preprocessor, standard rendering in Astro.

## Priority Order

| # | Feature | Complexity | Rationale |
|---|---------|-----------|-----------|
| 1 | Image embeds | Medium | Known gap, most visible, likely blocking content |
| 2 | Heading references | Low-Medium | Common usage, natural extension of existing linker |
| 3 | Block references | Medium | Depends on similar infrastructure as heading refs |
| 4 | Hover previews | Low | Small feature, big UX improvement |
| 5 | Hub-based nav tree | Medium | New UI component, non-blocking |

---

## Feature 1: Image Embeds

### Problem
`![[image.png]]` embeds are treated as note transclusions, outputting plain text instead of `<img>` tags.

### Design

**Preprocessor (transform.rs):**
- New regex (LazyLock, used inside `transform_outside_fences()`):
  ```
  !\[\[([^\]|]+?\.(png|jpg|jpeg|gif|svg|webp))(?:\|(\d+(?:x\d+)?))?\]\]
  ```
- Captures: filename, extension (filter vs note transclusions), optional size (`300` or `300x200`)
- Resolution: look for image in vault's `attachment/` directory
- Copy to `content/assets/{filename}` (deduplicate via `HashSet` of copied files)
- Output: `<img src="/assets/{filename}" alt="" width="..." height="...">`
  - Empty `alt=""` prevents rehype from wrapping in `<figure>`
  - `width` only if `|300`, both `width`+`height` if `|300x200`
- If not found: warn and leave as plain text (graceful degradation)
- Must run **before** transclusion transform (both use `![[...]]` syntax)

**Astro:** No changes needed. `rehype-raw` passes through `<img>` tags.

---

## Feature 2: Heading References `[[Note#Heading]]`

### Design

**Pass 1 (scanner.rs) — Heading index:**
- Extract all markdown headings per post via regex
- Slugify using `rehype-slug` algorithm: lowercase, spaces→hyphens, strip non-alphanumeric (keep Korean + hyphens)
- Handle duplicate headings (append `-1`, `-2`, etc.)
- Store as `heading_map: HashMap<String, Vec<String>>` (filename → heading slugs)

**Pass 2 (linker.rs) — Extended wikilink regex:**
```
\[\[([^\]#|]+?)(?:#([^\]|]+?))?(?:\|([^\]]+?))?\]\]
```
- Group 1: note name
- Group 2: optional heading (raw text)
- Group 3: optional alias

**Pass 3 (transform.rs) — Resolve:**
- Slugify the heading fragment
- Validate against target note's heading index (warn if not found)
- Output: `<a href="/posts/{slug}#{heading-slug}">{alias or "Note > Heading"}</a>`

**Link struct extension:**
```rust
struct Link {
    target_slug: String,
    alias: Option<String>,
    heading: Option<String>,  // new
}
```

**Astro:** No changes. `rehype-slug` already generates matching IDs.

---

## Feature 3: Block References `[[Note#^block-id]]`

### Design

**Pass 1 (scanner.rs) — Block ID index:**
- Scan for `^block-id` annotations: regex `\s\^([a-zA-Z0-9-]+)\s*$` (end of line)
- Store as `block_map: HashMap<String, Vec<String>>` (filename → block IDs)

**Pass 3 (transform.rs) — Two operations:**

1. **Inject anchors:** `text ^my-block` → `text <span id="^my-block"></span>` (invisible anchor, `^` removed from visible output)
2. **Resolve block links:** `[[Note#^block-id]]` → `<a href="/posts/{slug}#^{block-id}">{alias or note title}</a>`

**Block-level transclusions:** `![[Note#^block-id]]` inlines only the paragraph containing that block ID (extends existing transclusion logic).

**Heading vs block distinction:** fragment starting with `^` = block ref, otherwise = heading ref.

**Link struct extension:**
```rust
struct Link {
    target_slug: String,
    alias: Option<String>,
    heading: Option<String>,
    block_id: Option<String>,  // new
}
```

**Astro:** No changes. `rehype-raw` passes through `<span>` anchors.

---

## Feature 4: Hover Previews

### Design

**Preprocessor (output.rs):**
- Add `preview` field to each post's metadata JSON:
  ```json
  { "title": "Post Title", "tags": ["tag1"], "summary": "First sentence." }
  ```
- Summary: strip markdown/HTML, take first sentence (first `.`/`。` or 150 chars)
- Generate bundled `previews.json` (slug → preview), written to `content/` and copied to `site/public/`

**Astro:**
- Small script/island attached to `PostLayout.astro` (and index/hub pages)
- Hover listeners on `a[href^="/posts/"]`
- Lazy-load `previews.json` on first hover (cached after)
- Tooltip card: title (bold) + tags (muted) + first sentence
- 300ms delay before showing, dismiss on mouse leave
- Respects dark/light theme

---

## Feature 5: Hub-Based Navigation Tree

### Design

**Preprocessor (linker.rs + output.rs):**
- Build tree from `hub_parent` relationships:
  ```json
  {
    "roots": [{ "slug": "...", "title": "...", "children": [...] }],
    "orphans": ["slug1", "slug2"]
  }
  ```
- `roots`: hubs with no `hub_parent` (top-level)
- `children`: posts whose `hub_parent` matches, recursively nested
- `orphans`: posts belonging to no hub
- Write `nav-tree.json` to `content/`, copy to `site/public/`

**Astro:**
- New Preact island: `islands/NavTree.tsx`
- Lazy-loads `nav-tree.json`
- Collapsible tree: expand/collapse hub nodes, highlight current page, auto-expand current branch
- Icons: folder (hubs) / document (posts) via `lucide-preact`
- Placed in `PostLayout.astro` sidebar alongside TOC and LocalGraph
- Respects dark/light theme

---

## Architectural Notes

- All 5 features follow the existing two-tier pattern: Obsidian-specific logic in Rust preprocessor, standard rendering in Astro
- Features 1-3 are preprocessor-only changes (no Astro modifications)
- Features 4-5 add new JSON data files and Preact islands, following existing patterns (`search-index.json`, `graph.json`)
- New JSON files (`previews.json`, `nav-tree.json`) are copied to `site/public/` via the same mechanism as `search-index.json` and `graph.json`
- All regexes compiled with `LazyLock`, all transforms use `transform_outside_fences()` to skip fenced code blocks
