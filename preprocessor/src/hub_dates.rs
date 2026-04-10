//! Augment list-item wikilinks in hub pages with child post publish dates.
//!
//! Runs after `convert_wikilinks()` in the transform pipeline. For each
//! list-item line containing a resolved wikilink to a post with a `published`
//! field, strips any existing ` @YYYY-MM-DD` annotation and appends a
//! `<time class="hub-child-date">` element with the Korean-formatted date.

use regex::Regex;
use std::sync::LazyLock;
use crate::types::VaultIndex;

/// Matches a list-item prefix followed by a post wikilink anchor.
///
/// Captures:
///   1 = list-item prefix (e.g., "  + ", "- ", "1. ")
///   2 = the full `<a href="/posts/SLUG">DISPLAY</a>` tag
///   3 = slug (from the href)
///   4 = optional trailing ` @YYYY-MM-DD` annotation (with leading space)
static LIST_ITEM_POST_LINK_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r##"(?m)^(\s*(?:[+\-*]|\d+\.)\s+)(<a href="/posts/([^"#]+?)">[^<]*</a>)(\s@\d{4}-\d{2}-\d{2})?"##,
    )
    .unwrap()
});

/// Parse an ISO date string (`YYYY-MM-DD`) and return `YYYY년 M월 D일`.
///
/// Returns `None` if the input does not match the ISO format or contains
/// non-numeric parts. Month and day are NOT zero-padded in the output.
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
        assert_eq!(format_date_ko("2026-13-01"), None);
        assert_eq!(format_date_ko("2026-03"), None);
        assert_eq!(format_date_ko("2026-03-32"), None);
        assert_eq!(format_date_ko("abcd-ef-gh"), None);
    }

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
        let line = r#"See <a href="/posts/foo">Foo</a> for details."#;
        assert!(LIST_ITEM_POST_LINK_RE.captures(line).is_none());
    }

    #[test]
    fn test_list_item_regex_does_not_match_non_posts_href() {
        let line = r#"+ <a href="/tags/foo">Foo</a>"#;
        assert!(LIST_ITEM_POST_LINK_RE.captures(line).is_none());
    }

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
        assert!(!result.contains("@2025-12-01"), "manual annotation should be stripped: {result}");
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
}
