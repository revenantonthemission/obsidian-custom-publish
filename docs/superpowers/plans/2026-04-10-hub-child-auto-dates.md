# Hub Child Auto-Dates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-render each child post's publish date next to its wikilink on hub pages, stripping manual `@YYYY-MM-DD` annotations in the process.

**Architecture:** A new Rust module (`hub_dates.rs`) runs after wikilink conversion in the transform pipeline. It detects list-item wikilinks in hub files, looks up the target post's `published` field in the `VaultIndex`, strips any manual `@YYYY-MM-DD` annotation, and appends a semantic `<time class="hub-child-date">` element.

**Tech Stack:** Rust preprocessor (regex + existing `VaultIndex`), CSS (one new rule in `post.css`)

---

## File Structure

| File | Responsibility |
|---|---|
| `preprocessor/src/hub_dates.rs` | **New** — `augment_hub_child_links()` + `format_date_ko()` + unit tests |
| `preprocessor/src/lib.rs` | Register the new module (`pub mod hub_dates;`) |
| `preprocessor/src/transform.rs` | Invoke `augment_hub_child_links()` for hub posts |
| `site/src/styles/post.css` | Add `.hub-child-date` CSS rule |
| `preprocessor/tests/transform_test.rs` | Integration test asserting hub dates appear + non-hub files untouched |
| `fixtures/vault/Hub Page.md` | Add one list item with a manual `@YYYY-MM-DD` annotation to test stripping |

---

### Task 1: Korean Date Formatter

**Files:**
- Create: `preprocessor/src/hub_dates.rs`

- [ ] **Step 1: Create the file with module docstring and the failing test**

Create `preprocessor/src/hub_dates.rs`:

```rust
//! Augment list-item wikilinks in hub pages with child post publish dates.
//!
//! Runs after `convert_wikilinks()` in the transform pipeline. For each
//! list-item line containing a resolved wikilink to a post with a `published`
//! field, strips any existing ` @YYYY-MM-DD` annotation and appends a
//! `<time class="hub-child-date">` element with the Korean-formatted date.

/// Parse an ISO date string (`YYYY-MM-DD`) and return `YYYY년 M월 D일`.
///
/// Returns `None` if the input does not match the ISO format or contains
/// non-numeric parts. Month and day are NOT zero-padded in the output.
fn format_date_ko(iso: &str) -> Option<String> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_date_ko_basic() {
        assert_eq!(
            format_date_ko("2026-03-16"),
            Some("2026년 3월 16일".to_string())
        );
    }

    #[test]
    fn test_format_date_ko_strips_zero_padding() {
        assert_eq!(
            format_date_ko("2026-03-05"),
            Some("2026년 3월 5일".to_string())
        );
        assert_eq!(
            format_date_ko("2026-01-01"),
            Some("2026년 1월 1일".to_string())
        );
    }

    #[test]
    fn test_format_date_ko_invalid_input() {
        assert_eq!(format_date_ko(""), None);
        assert_eq!(format_date_ko("invalid"), None);
        assert_eq!(format_date_ko("2026-13-01"), None); // invalid month
        assert_eq!(format_date_ko("2026-03"), None); // missing day
        assert_eq!(format_date_ko("2026-03-32"), None); // invalid day
        assert_eq!(format_date_ko("abcd-ef-gh"), None);
    }
}
```

- [ ] **Step 2: Register the module in lib.rs**

Edit `preprocessor/src/lib.rs` and add the module declaration. Current content:

```rust
pub mod d2;
pub mod linker;
pub mod mermaid;
pub mod nav_tree;
pub mod output;
pub mod preview;
pub mod related;
pub mod scanner;
pub mod search;
pub mod syntax;
pub mod transform;
pub mod typst_render;
pub mod types;
```

Add `pub mod hub_dates;` in alphabetical order (between `d2` and `linker`):

```rust
pub mod d2;
pub mod hub_dates;
pub mod linker;
pub mod mermaid;
pub mod nav_tree;
pub mod output;
pub mod preview;
pub mod related;
pub mod scanner;
pub mod search;
pub mod syntax;
pub mod transform;
pub mod typst_render;
pub mod types;
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd preprocessor && cargo test --lib hub_dates::tests`

Expected: 3 test failures — all with `assertion failed: ... Some(...)` vs `None`.

- [ ] **Step 4: Implement `format_date_ko`**

Replace the stub body with:

```rust
fn format_date_ko(iso: &str) -> Option<String> {
    let parts: Vec<&str> = iso.split('-').collect();
    if parts.len() != 3 {
        return None;
    }
    let year: u32 = parts[0].parse().ok()?;
    let month: u32 = parts[1].parse().ok()?;
    let day: u32 = parts[2].parse().ok()?;

    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return None;
    }

    Some(format!("{year}년 {month}월 {day}일"))
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd preprocessor && cargo test --lib hub_dates::tests`

Expected: All 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add preprocessor/src/hub_dates.rs preprocessor/src/lib.rs
git commit -m "feat: add Korean date formatter for hub child dates"
```

---

### Task 2: List-Item Wikilink Detection Regex

**Files:**
- Modify: `preprocessor/src/hub_dates.rs`

- [ ] **Step 1: Add the failing tests for the detection regex**

Add these imports and tests to `preprocessor/src/hub_dates.rs`. Add the imports at the top of the file (after the module docstring):

```rust
use regex::Regex;
use std::sync::LazyLock;
```

Add a new regex constant and detector function (non-public) right after the imports:

```rust
/// Matches a list-item prefix followed by a post wikilink anchor.
///
/// Captures:
///   1 = list-item prefix (e.g., "  + ", "- ", "1. ")
///   2 = the full `<a href="/posts/SLUG">DISPLAY</a>` tag
///   3 = slug (from the href)
///   4 = optional trailing ` @YYYY-MM-DD` annotation (with leading space)
static LIST_ITEM_POST_LINK_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r#"(?m)^(\s*(?:[+\-*]|\d+\.)\s+)(<a href="/posts/([^"#]+?)">[^<]*</a>)(\s@\d{4}-\d{2}-\d{2})?"#,
    )
    .unwrap()
});
```

Add the following tests to the `mod tests` block:

```rust
    #[test]
    fn test_list_item_regex_matches_bullet_with_dash() {
        let line = r#"- <a href="/posts/foo">Foo</a>"#;
        let caps = LIST_ITEM_POST_LINK_RE.captures(line).unwrap();
        assert_eq!(&caps[1], "- ");
        assert_eq!(&caps[3], "foo");
        assert!(caps.get(4).is_none());
    }

    #[test]
    fn test_list_item_regex_matches_bullet_with_plus() {
        let line = r#"+ <a href="/posts/bar">Bar</a>"#;
        let caps = LIST_ITEM_POST_LINK_RE.captures(line).unwrap();
        assert_eq!(&caps[3], "bar");
    }

    #[test]
    fn test_list_item_regex_matches_ordered_list() {
        let line = r#"1. <a href="/posts/baz">Baz</a>"#;
        let caps = LIST_ITEM_POST_LINK_RE.captures(line).unwrap();
        assert_eq!(&caps[3], "baz");
    }

    #[test]
    fn test_list_item_regex_matches_nested_indent() {
        let line = r#"  + <a href="/posts/nested">Nested</a>"#;
        let caps = LIST_ITEM_POST_LINK_RE.captures(line).unwrap();
        assert_eq!(&caps[1], "  + ");
        assert_eq!(&caps[3], "nested");
    }

    #[test]
    fn test_list_item_regex_captures_manual_annotation() {
        let line = r#"+ <a href="/posts/oop">OOP</a> @2026-03-16"#;
        let caps = LIST_ITEM_POST_LINK_RE.captures(line).unwrap();
        assert_eq!(&caps[3], "oop");
        assert_eq!(caps.get(4).unwrap().as_str(), " @2026-03-16");
    }

    #[test]
    fn test_list_item_regex_does_not_match_inline_prose() {
        // Wikilink in prose, not a list item
        let line = r#"See <a href="/posts/foo">Foo</a> for details."#;
        assert!(LIST_ITEM_POST_LINK_RE.captures(line).is_none());
    }

    #[test]
    fn test_list_item_regex_does_not_match_non_posts_href() {
        // Anchor pointing to something other than /posts/
        let line = r#"+ <a href="/tags/foo">Foo</a>"#;
        assert!(LIST_ITEM_POST_LINK_RE.captures(line).is_none());
    }
```

- [ ] **Step 2: Run the tests to verify they pass**

Run: `cd preprocessor && cargo test --lib hub_dates::tests`

Expected: All existing tests + the 7 new regex tests pass. The regex was designed to match the test cases, so it should work on the first try.

- [ ] **Step 3: Commit**

```bash
git add preprocessor/src/hub_dates.rs
git commit -m "feat: add regex to detect list-item wikilinks in hub files"
```

---

### Task 3: `augment_hub_child_links` Implementation

**Files:**
- Modify: `preprocessor/src/hub_dates.rs`

- [ ] **Step 1: Add the failing tests for the main function**

Add these imports to the top of `hub_dates.rs` (after the existing imports):

```rust
use crate::types::VaultIndex;
```

Add the public function stub (non-working) right before the `#[cfg(test)]` block:

```rust
/// Augment list-item wikilinks in hub-file content with publish dates.
///
/// For each list item containing a resolved wikilink to `/posts/{slug}`,
/// looks up the target in `index`, strips any existing manual `@YYYY-MM-DD`
/// annotation, and appends a `<time class="hub-child-date">` element with
/// the Korean-formatted publish date.
///
/// If the target post has no `published` field (or parsing fails), the line
/// is left unchanged. Wikilinks outside list items are not touched.
/// Code fences are skipped.
pub fn augment_hub_child_links(content: &str, index: &VaultIndex) -> String {
    // Stub — replace in next step
    content.to_string()
}
```

Add these tests to the `mod tests` block. Each test constructs a minimal `VaultIndex` manually for isolation:

```rust
    use crate::types::{PostMeta, VaultIndex};
    use std::collections::HashMap;
    use std::path::PathBuf;

    fn make_test_index(posts: Vec<PostMeta>) -> VaultIndex {
        let mut slug_map = HashMap::new();
        let mut name_map = HashMap::new();
        for (i, p) in posts.iter().enumerate() {
            slug_map.insert(p.slug.clone(), i);
            name_map.insert(p.title.clone(), i);
        }
        VaultIndex {
            posts,
            slug_map,
            name_map,
            heading_map: HashMap::new(),
            block_map: HashMap::new(),
        }
    }

    fn make_post(slug: &str, title: &str, published: Option<&str>) -> PostMeta {
        PostMeta {
            slug: slug.to_string(),
            title: title.to_string(),
            file_path: PathBuf::from("test.md"),
            tags: vec![],
            created: None,
            published: published.map(String::from),
            updated: None,
            is_hub: false,
            hub_parent: None,
            description: None,
            raw_content: String::new(),
        }
    }

    #[test]
    fn test_augment_basic_list_item() {
        let index = make_test_index(vec![make_post("oop", "OOP", Some("2026-03-16"))]);
        let input = r#"- <a href="/posts/oop">OOP</a>"#;
        let result = augment_hub_child_links(input, &index);
        assert!(
            result.contains(r#"<time class="hub-child-date" datetime="2026-03-16">2026년 3월 16일</time>"#),
            "Expected time element, got: {result}"
        );
    }

    #[test]
    fn test_augment_strips_manual_annotation() {
        let index = make_test_index(vec![make_post("oop", "OOP", Some("2026-03-16"))]);
        let input = r#"+ <a href="/posts/oop">OOP</a> @2025-12-01"#;
        let result = augment_hub_child_links(input, &index);
        // Manual annotation should be gone
        assert!(!result.contains("@2025-12-01"), "manual annotation should be stripped: {result}");
        // New time element should be present with the real date
        assert!(
            result.contains(r#"datetime="2026-03-16""#),
            "Expected real published date, got: {result}"
        );
    }

    #[test]
    fn test_augment_unpublished_target_untouched() {
        let index = make_test_index(vec![make_post("draft", "Draft", None)]);
        let input = r#"- <a href="/posts/draft">Draft</a>"#;
        let result = augment_hub_child_links(input, &index);
        assert_eq!(result, input, "line with unpublished target should be unchanged");
    }

    #[test]
    fn test_augment_unknown_slug_untouched() {
        let index = make_test_index(vec![]);
        let input = r#"- <a href="/posts/unknown">Unknown</a>"#;
        let result = augment_hub_child_links(input, &index);
        assert_eq!(result, input, "line with unknown slug should be unchanged");
    }

    #[test]
    fn test_augment_inline_prose_untouched() {
        let index = make_test_index(vec![make_post("foo", "Foo", Some("2026-01-01"))]);
        let input = r#"See <a href="/posts/foo">Foo</a> for more."#;
        let result = augment_hub_child_links(input, &index);
        assert_eq!(result, input, "inline prose wikilink should be unchanged");
    }

    #[test]
    fn test_augment_ordered_list() {
        let index = make_test_index(vec![make_post("foo", "Foo", Some("2026-01-15"))]);
        let input = r#"1. <a href="/posts/foo">Foo</a>"#;
        let result = augment_hub_child_links(input, &index);
        assert!(result.contains(r#"<time class="hub-child-date" datetime="2026-01-15""#));
    }

    #[test]
    fn test_augment_nested_list() {
        let index = make_test_index(vec![make_post("foo", "Foo", Some("2026-01-15"))]);
        let input = r#"  + <a href="/posts/foo">Foo</a>"#;
        let result = augment_hub_child_links(input, &index);
        assert!(result.contains(r#"<time class="hub-child-date""#));
        // Indentation should be preserved
        assert!(result.starts_with("  + "));
    }

    #[test]
    fn test_augment_preserves_surrounding_lines() {
        let index = make_test_index(vec![make_post("foo", "Foo", Some("2026-01-15"))]);
        let input = "Heading\n\n- <a href=\"/posts/foo\">Foo</a>\n\nFooter";
        let result = augment_hub_child_links(input, &index);
        assert!(result.starts_with("Heading\n\n"));
        assert!(result.ends_with("\n\nFooter"));
    }

    #[test]
    fn test_augment_invalid_published_field_untouched() {
        let index = make_test_index(vec![make_post("foo", "Foo", Some("not-a-date"))]);
        let input = r#"- <a href="/posts/foo">Foo</a>"#;
        let result = augment_hub_child_links(input, &index);
        assert_eq!(result, input, "line with unparseable date should be unchanged");
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd preprocessor && cargo test --lib hub_dates::tests`

Expected: The 9 new `test_augment_*` tests fail (stub returns input unchanged), the 10 existing tests pass.

- [ ] **Step 3: Implement `augment_hub_child_links`**

Replace the stub body with a real implementation. Add a private helper for the line-level transform first. Replace the entire `augment_hub_child_links` function with:

```rust
pub fn augment_hub_child_links(content: &str, index: &VaultIndex) -> String {
    let mut result = String::with_capacity(content.len());
    let mut in_fence = false;
    let mut first = true;

    for line in content.lines() {
        if !first {
            result.push('\n');
        }
        first = false;

        if line.starts_with("```") {
            in_fence = !in_fence;
            result.push_str(line);
            continue;
        }

        if in_fence {
            result.push_str(line);
            continue;
        }

        result.push_str(&augment_line(line, index));
    }

    // Preserve trailing newline if the original had one
    if content.ends_with('\n') {
        result.push('\n');
    }

    result
}

/// Transform a single non-fenced line. Returns the original line if no
/// matching list-item wikilink is found, or if the target post has no
/// parseable published date.
fn augment_line(line: &str, index: &VaultIndex) -> String {
    let Some(caps) = LIST_ITEM_POST_LINK_RE.captures(line) else {
        return line.to_string();
    };

    let slug = &caps[3];
    let Some(&post_idx) = index.slug_map.get(slug) else {
        return line.to_string();
    };

    let Some(ref published) = index.posts[post_idx].published else {
        return line.to_string();
    };

    let Some(korean) = format_date_ko(published) else {
        return line.to_string();
    };

    let prefix = &caps[1];
    let anchor = &caps[2];
    let match_end = caps.get(0).unwrap().end();
    let tail = &line[match_end..];

    format!(
        r#"{prefix}{anchor} <time class="hub-child-date" datetime="{published}">{korean}</time>{tail}"#
    )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd preprocessor && cargo test --lib hub_dates::tests`

Expected: All 19 tests pass.

- [ ] **Step 5: Commit**

```bash
git add preprocessor/src/hub_dates.rs
git commit -m "feat: implement augment_hub_child_links for hub pages"
```

---

### Task 4: Integrate into Transform Pipeline

**Files:**
- Modify: `preprocessor/src/transform.rs` (around lines 43-60)

- [ ] **Step 1: Add the failing integration test**

First, extend the existing fixture to include a manual `@YYYY-MM-DD` annotation. Edit `fixtures/vault/Hub Page.md`:

```markdown
---
tags:
  - hub
  - os
is_hub: true
created: 2025-01-01
published: 2025-01-01
---

# Operating System Hub

This is a hub page linking to child posts:

- [[Simple Post]] @2020-01-01
- [[Post With Links]]
- [[Post With Callouts]]
```

Note the `@2020-01-01` on the first line — this is our manual annotation that should be stripped.

Then add two integration tests to `preprocessor/tests/transform_test.rs`. Add them at the bottom of the file (before any closing braces):

```rust
#[test]
fn test_hub_page_child_links_get_auto_dates() {
    let index = fixture_setup();
    let post_idx = index.slug_map["hub-page"];
    let result = transform_content(&index, post_idx);

    // Simple Post has published: 2025-01-15 in its frontmatter
    assert!(
        result.contains(r#"<time class="hub-child-date" datetime="2025-01-15">2025년 1월 15일</time>"#),
        "Expected auto-appended date for Simple Post, got:\n{result}"
    );
    // Manual annotation should be stripped
    assert!(
        !result.contains("@2020-01-01"),
        "Manual annotation should be stripped, got:\n{result}"
    );
}

#[test]
fn test_non_hub_file_wikilinks_not_augmented() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-links"];
    let result = transform_content(&index, post_idx);

    // Post With Links is NOT a hub, so even if it contains list-item wikilinks,
    // they should NOT be augmented with dates
    assert!(
        !result.contains("hub-child-date"),
        "Non-hub post should not have hub-child-date elements, got:\n{result}"
    );
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd preprocessor && cargo test --test transform_test test_hub_page_child_links_get_auto_dates test_non_hub_file_wikilinks_not_augmented`

Expected:
- `test_hub_page_child_links_get_auto_dates` fails (no `<time class="hub-child-date">` in output yet)
- `test_non_hub_file_wikilinks_not_augmented` passes (nothing adds hub-child-date yet)

- [ ] **Step 3: Wire into `transform_content_with_assets`**

Edit `preprocessor/src/transform.rs`. Find the `transform_content_with_assets` function (around lines 43-60). Current implementation:

```rust
pub fn transform_content_with_assets(
    index: &VaultIndex,
    post_idx: usize,
    asset_dir: Option<&Path>,
) -> (String, Vec<String>) {
    let raw = &index.posts[post_idx].raw_content;
    let slug = &index.posts[post_idx].slug;
    let content = strip_frontmatter(raw);
    let content = strip_comments(&content);
    let (content, images) = convert_image_embeds(&content);
    let content = resolve_transclusions(&content, index);
    let content = convert_wikilinks(&content, index);
    let content = inject_block_anchors(&content);
    let content = convert_highlights(&content);
    let content = convert_callouts(&content);
    let content = render_diagram_blocks(&content, slug, asset_dir);
    (content, images)
}
```

Add a conditional call to `augment_hub_child_links` immediately after `convert_wikilinks` (wikilinks must be resolved first — the regex looks for `<a href="/posts/...">`), and only if the post is a hub:

```rust
pub fn transform_content_with_assets(
    index: &VaultIndex,
    post_idx: usize,
    asset_dir: Option<&Path>,
) -> (String, Vec<String>) {
    let raw = &index.posts[post_idx].raw_content;
    let slug = &index.posts[post_idx].slug;
    let is_hub = index.posts[post_idx].is_hub;
    let content = strip_frontmatter(raw);
    let content = strip_comments(&content);
    let (content, images) = convert_image_embeds(&content);
    let content = resolve_transclusions(&content, index);
    let content = convert_wikilinks(&content, index);
    let content = if is_hub {
        crate::hub_dates::augment_hub_child_links(&content, index)
    } else {
        content
    };
    let content = inject_block_anchors(&content);
    let content = convert_highlights(&content);
    let content = convert_callouts(&content);
    let content = render_diagram_blocks(&content, slug, asset_dir);
    (content, images)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd preprocessor && cargo test --test transform_test`

Expected: All tests in `transform_test.rs` pass, including the two new ones.

- [ ] **Step 5: Run the full test suite for regression check**

Run: `cd preprocessor && cargo test`

Expected: All tests pass. The new fixture change (adding `@2020-01-01` to `Hub Page.md`) could theoretically affect other tests — if any do fail, investigate before moving on.

- [ ] **Step 6: Commit**

```bash
git add preprocessor/src/transform.rs fixtures/vault/Hub\ Page.md preprocessor/tests/transform_test.rs
git commit -m "feat: wire augment_hub_child_links into transform pipeline"
```

---

### Task 5: CSS Styling

**Files:**
- Modify: `site/src/styles/post.css`

- [ ] **Step 1: Add the `.hub-child-date` rule**

Open `site/src/styles/post.css` and append the following rule at the end of the file:

```css
/* Hub page child post dates — auto-appended by preprocessor */
.hub-child-date {
  color: var(--c-text-muted);
  font-size: 0.85em;
  margin-left: 0.5rem;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: Verify the site builds**

Run: `cd site && npx astro build`

Expected: Build succeeds, 192+ pages built.

- [ ] **Step 3: Commit**

```bash
git add site/src/styles/post.css
git commit -m "feat: style hub-child-date time elements"
```

---

### Task 6: End-to-End Verification

**Files:** None (verification only)

- [ ] **Step 1: Run the preprocessor against the real vault**

Run: `just preprocess`

Expected: Preprocessor completes without errors. Generated hub page HTML (in `content/posts/` or wherever processed hub content lands) should now contain `<time class="hub-child-date">` elements for any hub with list-item wikilinks to published posts.

- [ ] **Step 2: Check the generated content for a hub page**

Run: `grep -l "hub-child-date" content/posts/*.md 2>/dev/null | head -5`

Expected: At least one hub page file contains `hub-child-date`. If no output, investigate whether any of your hub pages actually use list-item wikilinks to posts with `published` fields.

- [ ] **Step 3: Build the site and visually spot-check one hub page**

Run: `cd site && npx astro build && npx astro preview`

Then open a hub page in the browser (e.g., `http://localhost:4321/hubs/programming-paradigm` if that's a hub). Verify:
1. Dates appear in muted text next to each child wikilink
2. Dates render in Korean format (e.g., `2026년 3월 16일`)
3. Any manual `@YYYY-MM-DD` annotations that were in your vault have been stripped
4. Both light and dark themes display the dates legibly

- [ ] **Step 4: If manual verification surfaces fixes, commit them**

```bash
git add -A
git commit -m "fix: adjustments from hub auto-date verification"
```

Only run this step if fixes are needed.
