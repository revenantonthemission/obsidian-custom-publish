# Design Pattern Refactoring — Design Document

Date: 2026-03-17
Goal: Address the 7 highest-priority design pattern issues identified in the codebase review. All changes are pure refactoring — no behavior changes, all existing tests must pass.

## Overview

7 refactorings, dependency-ordered, one commit each.

## 1. Deduplicate Regexes → New `syntax.rs`

`WIKILINK_RE` is identical in `linker.rs` and `transform.rs`. `BLOCK_ID_RE` is identical in `scanner.rs` and `transform.rs`. One change currently requires two edits with no mechanism to detect inconsistency.

**Design:** Create `preprocessor/src/syntax.rs` as the single source of truth for shared Obsidian syntax patterns. Export `WIKILINK_RE`, `BLOCK_ID_RE`, `IMAGE_EMBED_RE`, `TRANSCLUSION_RE`. Module-specific regexes (`CALLOUT_START_RE`, `FENCE_RE`) stay in their current modules. `linker.rs`, `transform.rs`, and `scanner.rs` import from `syntax.rs`.

## 2. Split `output.rs` → `preview.rs`, `nav_tree.rs`

`output.rs` owns 5 separate responsibilities at 380+ lines. `NavTree`/`NavTreeNode` types are private, forcing tests through filesystem I/O.

**Design:** Extract two new modules:

- `preview.rs`: `strip_markdown_for_preview()`, helper regexes, `extract_first_sentence()`, and a public `build_previews(index) -> serde_json::Value`.
- `nav_tree.rs`: `NavTreeNode`/`NavTree` structs (now `pub`), `build_nav_tree(index, graph) -> NavTree`.
- `output.rs` retains: `write_output()`, `OutputMeta`, `count_words()`, `find_attachment()`. Calls preview and nav_tree modules, serializes, writes.

## 3. Remove Dead `_graph` Parameter

`transform_content` and `transform_content_with_assets` accept `&LinkGraph` but never use it.

**Design:** Remove `_graph` from both function signatures. Update all callers in `output.rs` and test files. The graph is still available to `output.rs` for graph JSON, forward_links, and backlinks — those use it directly.

## 4. Fix `VaultIndex` Key Inconsistency

`heading_map` is keyed by slug, `block_map` by title. Both are looked up during wikilink processing where the available key is `target_name` (title).

**Design:** Change `heading_map` key from slug to title in `scanner.rs`. Update `convert_wikilinks` in `transform.rs` to look up by `target_name` instead of `slug`. Both maps are now title-keyed, consistent with `name_map`.

## 5. Fix PostLayout Hub Detection → Use `hub_parent`

`PostLayout.astro` scans all hubs' `forward_links` in an O(hubs × links) loop to find a post's parent hub. `PostMeta.hub_parent` already has this data.

**Design:** Replace the loop with a direct lookup: `if (meta.hub_parent)` → `find` the hub by title in `getAllPostMeta()`. Build `hubChildren` from the found hub's `forward_links` (same behavior, simpler code).

## 6. Deduplicate `Search.tsx` Types

`Search.tsx` redeclares `SearchDocument`, `SearchHit`, `SearchIndex` interfaces already exported from `types.ts`.

**Design:** Remove local declarations, import from `types.ts`. Extend `SearchIndex` locally with `type IndexWithCache = SearchIndex & { _sortedKeys?: string[] }` for the mutable cache field.

## 7. Extract Shared `graphUtils.ts`

`GraphView.tsx` and `LocalGraph.tsx` share identical `GraphNode`/`GraphLink`/`ResolvedLink` interfaces and color logic.

**Design:** Create `site/src/lib/graphUtils.ts` with shared types, `getNodeColor()`, `getNodeRadius()`, and `HUB_COLORS`. Both islands import from it. Force simulation setup stays island-specific (different parameters).

## Ordering Rationale

1 before 2: `syntax.rs` is a new module — split `output.rs` afterward when imports are settled.
2 before 3: Split first so removing `_graph` touches the already-clean modules.
3 before 4: Clean signatures before changing map keys.
4 standalone: Rust-side complete.
5-7: Astro/TS changes, independent of each other but grouped after Rust.
