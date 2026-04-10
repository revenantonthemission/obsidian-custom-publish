# Hub Child Auto-Dates

**Date:** 2026-04-10
**Status:** Approved

## Overview

Automatically render each child post's publish date next to its wikilink on hub pages, so the author no longer needs to type `@YYYY-MM-DD` annotations by hand. Existing manual annotations are stripped and replaced during preprocessing.

## Current State

Hub markdown files look like this:

```markdown
---
is_hub: true
---

+ [[Object-Oriented Programming|객체지향 프로그래밍]] @2026-03-16
+ [[Procedural Programming|절차적 프로그래밍 (예정)]]
```

The `@2026-03-16` is typed manually and duplicates the target post's own `published` frontmatter field. Authors must keep these in sync by hand.

## Design Decisions

- **Scope:** Only wikilinks inside list items (`+`, `-`, `*`, or `1.` prefix)
- **Only in hub files** — files with `is_hub: true` in frontmatter
- **Silent fallback** when target post has no `published` field (matches existing "(예정)" convention in display text)
- **Preprocessor-side transformation** (Rust) — integrates with existing wikilink resolution
- **Korean-formatted date** displayed, ISO date in `datetime` attribute
- **Existing manual annotations stripped** — clean migration with no vault edits

## 1. Detection Rules

Augmentation applies when ALL of the following are true:
1. Containing file has `is_hub: true` frontmatter
2. Line matches a list-item prefix: `^\s*([+\-*]|\d+\.)\s+`
3. Line contains a wikilink that resolved to an indexed post (already transformed to `<a class="wikilink" href="/posts/{slug}">...</a>` by `transform.rs`)
4. The target post has a non-empty `published` field

If any condition fails, the line is left untouched.

## 2. Output Format

**Input (markdown):**
```markdown
+ [[Object-Oriented Programming|객체지향 프로그래밍]] @2026-03-16
```

**Output (HTML, after preprocessor):**
```html
<li><a href="/posts/object-oriented-programming" class="wikilink">객체지향 프로그래밍</a> <time class="hub-child-date" datetime="2026-03-16">2026년 3월 16일</time></li>
```

**Markup rationale:**
- Semantic `<time>` element with ISO `datetime` attribute (screen-reader friendly)
- Class `hub-child-date` for targeted CSS
- Korean-formatted visible text matches site-wide `formatDateKo()` convention
- Space between `</a>` and `<time>` — CSS controls visual spacing

**CSS (`site/src/styles/post.css`):**
```css
.hub-child-date {
  color: var(--c-text-muted);
  font-size: 0.85em;
  margin-left: 0.5rem;
  font-variant-numeric: tabular-nums;
}
```

`tabular-nums` keeps dates aligned in vertical lists. The muted color adapts to light/dark via existing CSS variables.

## 3. Rust Implementation

### New Module: `preprocessor/src/hub_dates.rs`

**Public function:**
```rust
pub fn augment_hub_child_links(content: &str, index: &PostIndex) -> String
```

Operates on the already-wikilink-transformed HTML content (post-transform.rs, pre-output). Returns augmented content.

**Algorithm:**
1. Wrap the body in `transform_outside_fences()` (existing helper) to skip fenced code blocks
2. For each line matching `^\s*([+\-*]|\d+\.)\s+`:
   a. Search for the FIRST `<a class="wikilink" href="/posts/{slug}">...</a>` on the line
   b. Extract `slug` from the `href` attribute
   c. Look up the post in `index.posts` via `slug`
   d. If found AND has non-empty `published`:
      - Strip any space-prefixed `@YYYY-MM-DD` pattern that appears after the `</a>` on the same line. Use the regex `\s@\d{4}-\d{2}-\d{2}`.
      - Insert ` <time class="hub-child-date" datetime="{iso}">{korean}</time>` immediately after the `</a>`
   e. Otherwise leave the line unchanged

**Helper function:**
```rust
fn format_date_ko(iso: &str) -> Option<String>
```

Parses `YYYY-MM-DD`, returns `Some("YYYY년 M월 D일")` (no zero-padding on month/day). Returns `None` on parse failure.

Example: `"2026-03-16"` → `Some("2026년 3월 16일")`; `"2026-3-5"` → `Some("2026년 3월 5일")`; `"invalid"` → `None`.

### Integration in `transform.rs`

After wikilink resolution and before returning the final content, add a conditional call:

```rust
if post.is_hub {
    content = hub_dates::augment_hub_child_links(&content, index);
}
```

### Module registration in `lib.rs`

Add `pub mod hub_dates;` to expose the module to integration tests.

## 4. Edge Cases

| Case | Behavior |
|---|---|
| Non-hub file | Function never called (guarded at caller) |
| Unresolved wikilink | Left as-is (no `<a class="wikilink">` to match) |
| Target post has no `published` | Silent fallback — link untouched |
| Multiple wikilinks on one line | Only the first wikilink gets a date; subsequent treated as inline prose |
| Nested list (indented) | Matches via leading `\s*` in the regex |
| Ordered list (`1.`) | Matches via alternation in the regex |
| Code fence with `[[links]]` | Skipped by `transform_outside_fences()` |
| Existing `@YYYY-MM-DD` annotation | Stripped before appending new `<time>` |
| Malformed published date (e.g. `"draft"`) | `format_date_ko` returns `None`, link untouched |

## 5. Testing

Unit tests in `preprocessor/src/hub_dates.rs`:

1. **test_hub_child_link_gets_date_appended** — basic list item, wikilink gets `<time>`
2. **test_non_list_wikilink_untouched** — inline prose wikilink unaffected
3. **test_manual_annotation_stripped_and_replaced** — `@2026-03-16` removed, replaced with auto-date
4. **test_unpublished_target_no_date** — target with no `published` leaves link alone
5. **test_nested_list_handled** — `  + [[Foo]]` (indented) still matches
6. **test_ordered_list_handled** — `1. [[Foo]]` matches
7. **test_korean_date_formatter_basic** — `format_date_ko("2026-03-16")` returns `"2026년 3월 16일"`
8. **test_korean_date_formatter_no_zero_padding** — `format_date_ko("2026-03-05")` returns `"2026년 3월 5일"`
9. **test_korean_date_formatter_invalid** — `format_date_ko("invalid")` returns `None`
10. **test_code_fence_wikilinks_ignored** — wikilinks inside ``` blocks untouched

Integration test in `preprocessor/tests/transform_test.rs`:

11. **test_non_hub_file_untouched** — regular post with list-item wikilinks doesn't get augmented

## 6. Files Changed

| File | Change |
|---|---|
| `preprocessor/src/hub_dates.rs` | **New** — `augment_hub_child_links()` + `format_date_ko()` + unit tests |
| `preprocessor/src/lib.rs` | Add `pub mod hub_dates;` |
| `preprocessor/src/transform.rs` | Conditional call to `augment_hub_child_links()` when `post.is_hub` |
| `site/src/styles/post.css` | New `.hub-child-date` rule |
| `preprocessor/tests/transform_test.rs` | New integration test for non-hub isolation |

## 7. Non-Changes

- **`HubLayout.astro`** — no changes; transformation happens upstream, HTML rendered via `set:html`
- **`PostCard.astro`** — unaffected
- **Vault markdown files** — no migration needed; manual annotations get cleaned up on next preprocess run
- **TypeScript code** — zero changes

## 8. Out of Scope

- Sorting list items by date (author controls order)
- Grouping by year/month (visual restructure)
- Showing target post's tags/reading time inline (would duplicate the PostCard children section)
- Updating the hub's own `published` frontmatter field (separate concern)
