# Design Pattern Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate 7 design pattern issues identified in the codebase review: regex duplication, god module, dead parameters, inconsistent keys, unused data, type duplication, and shared logic.

**Architecture:** Pure refactoring — no behavior changes. Each task is a self-contained commit that leaves all existing tests passing. Rust changes first (Tasks 1-4), then TypeScript changes (Tasks 5-7).

**Tech Stack:** Rust (regex, LazyLock, serde), Astro 6, Preact, TypeScript, d3-force

---

## Task 1: Deduplicate Regexes → New `syntax.rs`

**Files:**
- Create: `preprocessor/src/syntax.rs`
- Modify: `preprocessor/src/lib.rs:1-9`
- Modify: `preprocessor/src/linker.rs:1-8`
- Modify: `preprocessor/src/transform.rs:16-27`
- Modify: `preprocessor/src/scanner.rs:14-15`

**Step 1: Create `syntax.rs` with shared patterns**

```rust
//! Shared Obsidian syntax patterns — single source of truth for regexes
//! used across multiple modules (linker, transform, scanner).

use std::sync::LazyLock;
use regex::Regex;

/// Matches `[[target]]`, `[[target#heading]]`, `[[target#heading|alias]]`, `[[target|alias]]`.
/// Groups: 1=target, 2=heading/block fragment (optional), 3=alias (optional).
pub static WIKILINK_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\[\[([^\]#|]+?)(?:#([^\]|]+?))?(?:\|([^\]]+?))?\]\]").unwrap()
});

/// Matches `^block-id` annotations at end of lines.
/// Group 1: the block ID (alphanumeric + hyphens).
pub static BLOCK_ID_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\s\^([a-zA-Z0-9-]+)\s*$").unwrap());

/// Matches image embeds: `![[file.png]]`, `![[file.jpg|300]]`, `![[file.png|300x200]]`.
/// Groups: 1=filename, 2=extension, 3=size (optional).
pub static IMAGE_EMBED_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"!\[\[([^\]|]+?\.(png|jpg|jpeg|gif|svg|webp))(?:\|(\d+(?:x\d+)?))?\]\]").unwrap()
});

/// Matches transclusions: `![[Note Name]]` or `![[Note Name#^block-id]]`.
/// Groups: 1=note name, 2=block ID (optional).
pub static TRANSCLUSION_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"!\[\[([^\]#]+?)(?:#\^([a-zA-Z0-9-]+))?\]\]").unwrap());
```

**Step 2: Register module in `lib.rs`**

Add `pub mod syntax;` to `preprocessor/src/lib.rs` (after line 5, before `pub mod search`).

**Step 3: Update `linker.rs` — remove local WIKILINK_RE, import from syntax**

Replace lines 1-8:

```rust
use crate::syntax::WIKILINK_RE;
use crate::types::{GraphEdge, GraphJson, GraphNode, Link, LinkGraph, VaultIndex};
```

Remove the `use std::sync::LazyLock;`, `use regex::Regex;`, and the `static WIKILINK_RE` declaration.

**Step 4: Update `transform.rs` — remove local regexes, import from syntax**

Remove these declarations (lines 16-27):
- `static IMAGE_EMBED_RE`
- `static TRANSCLUSION_RE`
- `static BLOCK_ID_LINE_RE`
- `static WIKILINK_RE`

Add import at top:

```rust
use crate::syntax::{BLOCK_ID_RE, IMAGE_EMBED_RE, TRANSCLUSION_RE, WIKILINK_RE};
```

Keep `CALLOUT_START_RE` and `FENCE_RE` — they're only used in transform.rs.

Note: `BLOCK_ID_LINE_RE` in transform.rs is the same pattern as `BLOCK_ID_RE` in scanner.rs. Use `BLOCK_ID_RE` from syntax.rs for both.

**Step 5: Update `scanner.rs` — remove local BLOCK_ID_RE, import from syntax**

Remove the `static BLOCK_ID_RE` declaration (lines 14-15).

Add import:

```rust
use crate::syntax::BLOCK_ID_RE;
```

Keep `HEADING_RE` — it's only used in scanner.rs.

**Step 6: Run all tests**

Run: `cd preprocessor && cargo test`
Expected: All 45 tests PASS (no behavior change).

**Step 7: Commit**

```bash
git add preprocessor/src/syntax.rs preprocessor/src/lib.rs preprocessor/src/linker.rs preprocessor/src/transform.rs preprocessor/src/scanner.rs
git commit -m "refactor: deduplicate shared regexes into syntax.rs module"
```

---

## Task 2: Split `output.rs` → `preview.rs`, `nav_tree.rs`

**Files:**
- Create: `preprocessor/src/preview.rs`
- Create: `preprocessor/src/nav_tree.rs`
- Modify: `preprocessor/src/output.rs:1-384`
- Modify: `preprocessor/src/lib.rs`

**Step 1: Create `preview.rs`**

Move from `output.rs` into a new `preprocessor/src/preview.rs`:

```rust
use std::sync::LazyLock;
use regex::Regex;
use crate::transform::strip_frontmatter;
use crate::types::VaultIndex;

/// Compiled regexes for stripping markdown syntax.
static RE_INLINE_MARKDOWN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(\*{1,2}|_{1,2}|`|~~)").unwrap());
static RE_WIKILINK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]").unwrap());
static RE_MARKDOWN_LINK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\[([^\]]*)\]\([^)]*\)").unwrap());
static RE_HTML_TAG: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<[^>]+>").unwrap());
static RE_BLOCK_REF: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s*\^[\w-]+\s*$").unwrap());
static RE_MULTI_SPACE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").unwrap());

/// Build preview data for all posts: slug → {title, tags, summary}.
pub fn build_previews(index: &VaultIndex) -> serde_json::Value {
    let mut previews = serde_json::Map::new();
    for post in &index.posts {
        let stripped = strip_markdown_for_preview(&post.raw_content);
        let summary = extract_first_sentence(&stripped);
        let entry = serde_json::json!({
            "title": post.title,
            "tags": post.tags,
            "summary": summary,
        });
        previews.insert(post.slug.clone(), entry);
    }
    serde_json::Value::Object(previews)
}

/// Strip markdown/HTML from raw content to produce plain text for previews.
fn strip_markdown_for_preview(content: &str) -> String {
    // ... (move existing function body from output.rs verbatim)
}

/// Extract the first sentence from plain text.
/// Finds the first `.` or `。` after at least 10 chars, or truncates at ~150 characters.
pub fn extract_first_sentence(text: &str) -> String {
    // ... (move existing function body from output.rs verbatim)
}
```

Move the complete function bodies of `strip_markdown_for_preview` and `extract_first_sentence` from `output.rs` into `preview.rs` exactly as-is.

**Step 2: Create `nav_tree.rs`**

Move from `output.rs` into a new `preprocessor/src/nav_tree.rs`:

```rust
use std::collections::HashSet;
use serde::Serialize;
use crate::types::{LinkGraph, VaultIndex};

#[derive(Debug, Serialize)]
pub struct NavTreeNode {
    pub slug: String,
    pub title: String,
    pub is_hub: bool,
    pub children: Vec<NavTreeNode>,
}

#[derive(Debug, Serialize)]
pub struct NavTree {
    pub roots: Vec<NavTreeNode>,
    pub orphans: Vec<NavTreeNode>,
}

/// Build a navigation tree from hub/hub_parent relationships.
pub fn build_nav_tree(index: &VaultIndex, graph: &LinkGraph) -> NavTree {
    // ... (move entire existing build_nav_tree function body + inner build_node fn from output.rs)
}
```

Move `NavTreeNode`, `NavTree`, and the entire `build_nav_tree` function (including the inner `build_node` function) from `output.rs`.

**Step 3: Update `output.rs`**

Remove all moved code. Replace with imports:

```rust
use crate::nav_tree::build_nav_tree;
use crate::preview::build_previews;
```

The preview/nav-tree writing section becomes:

```rust
    // Write previews.json
    let previews = build_previews(index);
    let previews_path = output_dir.join("previews.json");
    fs::write(
        &previews_path,
        serde_json::to_string_pretty(&previews)
            .context("failed to serialize previews")?,
    )
    .context("failed to write previews.json")?;

    // Write nav-tree.json
    let nav_tree = build_nav_tree(index, graph);
    let nav_tree_path = output_dir.join("nav-tree.json");
    fs::write(
        &nav_tree_path,
        serde_json::to_string_pretty(&nav_tree)
            .context("failed to serialize nav tree")?,
    )
    .context("failed to write nav-tree.json")?;
```

Also remove from `output.rs`:
- `use regex::Regex;`
- `use std::sync::LazyLock;`
- `use std::collections::HashSet;`
- All 6 `static RE_*` regex declarations
- `strip_markdown_for_preview` function
- `extract_first_sentence` function
- `NavTreeNode` struct
- `NavTree` struct
- `build_nav_tree` function (including inner `build_node`)

**Step 4: Register modules in `lib.rs`**

Add to `preprocessor/src/lib.rs`:

```rust
pub mod nav_tree;
pub mod preview;
```

**Step 5: Run all tests**

Run: `cd preprocessor && cargo test`
Expected: All 45 tests PASS.

**Step 6: Commit**

```bash
git add preprocessor/src/preview.rs preprocessor/src/nav_tree.rs preprocessor/src/output.rs preprocessor/src/lib.rs
git commit -m "refactor: extract preview.rs and nav_tree.rs from output.rs"
```

---

## Task 3: Remove Dead `_graph` Parameter

**Files:**
- Modify: `preprocessor/src/transform.rs:37-49` (function signatures)
- Modify: `preprocessor/src/output.rs` (caller)
- Modify: `preprocessor/tests/transform_test.rs`
- Modify: `preprocessor/tests/heading_ref_test.rs`
- Modify: `preprocessor/tests/block_ref_test.rs`
- Modify: `preprocessor/tests/image_embed_test.rs`

**Step 1: Update function signatures in `transform.rs`**

Change `transform_content`:

```rust
pub fn transform_content(index: &VaultIndex, post_idx: usize) -> String {
    transform_content_with_assets(index, post_idx, None).0
}
```

Change `transform_content_with_assets`:

```rust
pub fn transform_content_with_assets(
    index: &VaultIndex,
    post_idx: usize,
    asset_dir: Option<&Path>,
) -> (String, Vec<String>) {
```

Remove `use crate::types::{LinkGraph, VaultIndex};` → `use crate::types::VaultIndex;`

**Step 2: Update caller in `output.rs`**

Change the call site (around line 45):

```rust
let (content, images) = transform_content_with_assets(index, i, Some(&assets_dir));
```

Remove `LinkGraph` from the `use crate::types::{LinkGraph, VaultIndex};` import if it's only used for the transform call. Check — `LinkGraph` is still needed for `graph.forward_links`, `graph.backlinks`, and `graph.to_graph_json`. Keep it.

**Step 3: Update all test files**

In each test file, update `transform_content(&index, &graph, post_idx)` → `transform_content(&index, post_idx)`:

- `preprocessor/tests/transform_test.rs` — 7 call sites
- `preprocessor/tests/heading_ref_test.rs` — 4 call sites
- `preprocessor/tests/block_ref_test.rs` — 4 call sites
- `preprocessor/tests/image_embed_test.rs` — 4 call sites for `transform_content`, 1 for `transform_content_with_assets`

For `transform_content_with_assets` calls:

```rust
let (_content, images) = transform_content_with_assets(&index, post_idx, Some(&tmp_dir));
```

Test files that only call `transform_content` no longer need `resolve_links` or `LinkGraph`. Remove unused imports and simplify `fixture_setup()` where `graph` is no longer needed.

But note: some test files (like `image_embed_test.rs`) also call `write_output` which still needs `graph`. Keep `fixture_setup` returning both `(index, graph)` in those files, but only destructure `index` where `graph` isn't used.

**Step 4: Run all tests**

Run: `cd preprocessor && cargo test`
Expected: All 45 tests PASS.

**Step 5: Commit**

```bash
git add preprocessor/src/transform.rs preprocessor/src/output.rs preprocessor/tests/
git commit -m "refactor: remove unused _graph parameter from transform functions"
```

---

## Task 4: Fix `VaultIndex` Key Inconsistency

**Files:**
- Modify: `preprocessor/src/scanner.rs:100-106`
- Modify: `preprocessor/src/transform.rs:193-195`

**Step 1: Change `heading_map` key from slug to title in scanner**

In `preprocessor/src/scanner.rs`, change the heading_map construction (lines 100-106):

```rust
    let heading_map: HashMap<String, Vec<String>> = posts
        .iter()
        .map(|p| {
            let (_fm, body) = parse_frontmatter(&p.raw_content);
            (p.title.clone(), extract_headings(body))  // Changed from p.slug to p.title
        })
        .collect();
```

**Step 2: Update heading_map lookup in transform.rs**

In `convert_wikilinks` (around line 193), change the lookup from slug to target_name:

```rust
                        let valid = index.heading_map
                            .get(target_name)  // Changed from slug.as_str() to target_name
                            .is_some_and(|headings| headings.contains(&h_slug));
```

**Step 3: Run all tests**

Run: `cd preprocessor && cargo test`
Expected: All 45 tests PASS. The heading_ref tests validate the end-to-end behavior (wikilink → HTML with fragment), so if the key change broke anything, those tests would fail.

**Step 4: Commit**

```bash
git add preprocessor/src/scanner.rs preprocessor/src/transform.rs
git commit -m "refactor: make heading_map title-keyed, consistent with block_map and name_map"
```

---

## Task 5: Fix PostLayout Hub Detection → Use `hub_parent`

**Files:**
- Modify: `site/src/layouts/PostLayout.astro:8,20-31`

**Step 1: Update imports**

In line 8, add `getAllPostMeta` to the import:

```astro
import { sanitizeTag, getLocalGraph, getPostMeta, getHubs, getAllPostMeta } from "../lib/data";
```

**Step 2: Replace hub detection loop**

Replace the existing hub detection (lines 20-31):

```astro
// Use hub_parent field directly instead of scanning all hubs' forward_links
let parentHub: PostMeta | undefined;
let hubChildren: PostMeta[] = [];
if (meta.hub_parent) {
  const allMeta = getAllPostMeta();
  parentHub = allMeta.find((p) => p.title === meta.hub_parent);
  if (parentHub) {
    hubChildren = (parentHub.forward_links || [])
      .map((s) => getPostMeta(s))
      .filter((m): m is PostMeta => m !== null);
  }
}
```

Remove `getHubs` from the import since it's no longer used (check if any other code in the file uses it — it shouldn't).

**Step 3: Run Astro build to verify**

Run: `cd site && npx astro build`
Expected: All pages build successfully.

**Step 4: Commit**

```bash
git add site/src/layouts/PostLayout.astro
git commit -m "refactor: use hub_parent field directly instead of scanning all hubs"
```

---

## Task 6: Deduplicate `Search.tsx` Types

**Files:**
- Modify: `site/src/islands/Search.tsx:1-26`

**Step 1: Replace local type declarations with imports**

Replace lines 1-26:

```tsx
import { useState, useEffect, useRef } from "preact/hooks";
import type { SearchIndex, SearchDocument, SearchHit } from "../lib/types";

/** Extended SearchIndex with mutable cache for sorted keys (binary search optimization). */
type IndexWithCache = SearchIndex & { _sortedKeys?: string[] };

interface Result {
  slug: string;
  title: string;
  snippet: string;
  score: number;
}
```

**Step 2: Update state type**

Find `useState<SearchIndex | null>(null)` and change to `useState<IndexWithCache | null>(null)`.

**Step 3: Update fetch handler type**

Find `.then((data: SearchIndex) => setIndex(data))` and change to `.then((data: IndexWithCache) => setIndex(data))`.

**Step 4: Run Astro build to verify**

Run: `cd site && npx astro build`
Expected: All pages build successfully.

**Step 5: Commit**

```bash
git add site/src/islands/Search.tsx
git commit -m "refactor: import Search types from types.ts instead of redeclaring"
```

---

## Task 7: Extract Shared `graphUtils.ts`

**Files:**
- Create: `site/src/lib/graphUtils.ts`
- Modify: `site/src/islands/GraphView.tsx:1-53`
- Modify: `site/src/islands/LocalGraph.tsx:1-27`

**Step 1: Create `graphUtils.ts`**

```typescript
import type { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";

/** A graph node enriched with d3 simulation position data. */
export interface GraphNode extends SimulationNodeDatum {
  slug: string;
  title: string;
  tags: string[];
  is_hub: boolean;
  backlink_count: number;
}

/** A graph link between two GraphNodes, typed for d3 simulation. */
export type GraphLink = SimulationLinkDatum<GraphNode>;

/** A link after d3 simulation has resolved source/target to node objects. */
export interface ResolvedLink {
  source: GraphNode;
  target: GraphNode;
}

/** Tag-based color palette for hub categories. */
export const HUB_COLORS: Record<string, string> = {
  os: "#3b82f6",
  web: "#10b981",
  db: "#f59e0b",
  network: "#8b5cf6",
};

/** Node fill color based on hub status and tags. */
export function getNodeColor(node: GraphNode): string {
  if (node.is_hub) return "#ef4444";
  for (const tag of node.tags) {
    if (HUB_COLORS[tag]) return HUB_COLORS[tag];
  }
  return "#6b7280";
}

/** Node radius scaled by backlink count (4-12px range). */
export function getNodeRadius(node: GraphNode): number {
  return Math.max(4, Math.min(12, 4 + node.backlink_count * 2));
}
```

**Step 2: Update `GraphView.tsx`**

Replace lines 1-53:

```tsx
import { useEffect, useRef } from "preact/hooks";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from "d3-force";
import { select } from "d3-selection";
import { zoom } from "d3-zoom";
import type { GraphData } from "../lib/types";
import type { GraphNode, GraphLink, ResolvedLink } from "../lib/graphUtils";
import { getNodeColor, getNodeRadius } from "../lib/graphUtils";

interface Props {
  data: GraphData;
  width?: number;
  height?: number;
}

export default function GraphView({ data, width, height }: Props) {
```

Remove the local `GraphNode`, `GraphLink`, `ResolvedLink` interfaces, `HUB_COLORS` constant, `getNodeColor` function, and `getNodeRadius` function. The rest of the component body stays the same.

**Step 3: Update `LocalGraph.tsx`**

Replace lines 1-27:

```tsx
import { useEffect, useRef } from "preact/hooks";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from "d3-force";
import type { GraphData } from "../lib/types";
import type { GraphNode, GraphLink, ResolvedLink } from "../lib/graphUtils";
import { getNodeColor } from "../lib/graphUtils";

interface Props {
  slug: string;
  data: GraphData;
}

export default function LocalGraph({ slug, data }: Props) {
```

Remove the local `GraphNode`, `GraphLink`, `ResolvedLink` interfaces.

Update the inline node color logic (around line 77-81) to use `getNodeColor`:

```typescript
      for (const node of nodes) {
        const isCurrent = node.slug === slug;
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, isCurrent ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isCurrent ? "#2563eb" : getNodeColor(node);
        ctx.fill();
      }
```

**Step 4: Run Astro build to verify**

Run: `cd site && npx astro build`
Expected: All pages build successfully.

**Step 5: Commit**

```bash
git add site/src/lib/graphUtils.ts site/src/islands/GraphView.tsx site/src/islands/LocalGraph.tsx
git commit -m "refactor: extract shared graph types and helpers into graphUtils.ts"
```

---

## Summary

| Task | Description | Files Changed |
|------|-------------|--------------|
| 1 | Deduplicate regexes → `syntax.rs` | 5 |
| 2 | Split `output.rs` → `preview.rs`, `nav_tree.rs` | 4 |
| 3 | Remove dead `_graph` parameter | 6 |
| 4 | Fix `VaultIndex` key inconsistency | 2 |
| 5 | Fix PostLayout hub detection | 1 |
| 6 | Deduplicate `Search.tsx` types | 1 |
| 7 | Extract `graphUtils.ts` | 3 |

**Total: 7 tasks, 7 commits, 0 new tests (all existing 45 tests must pass after every task)**
