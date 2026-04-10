//! Augment list-item wikilinks in hub pages with child post publish dates.
//!
//! Runs after `convert_wikilinks()` in the transform pipeline. For each
//! list-item line containing a resolved wikilink to a post with a `published`
//! field, strips any existing ` @YYYY-MM-DD` annotation and appends a
//! `<time class="hub-child-date">` element with the Korean-formatted date.

use regex::Regex;
use std::sync::LazyLock;
use crate::transform::transform_outside_fences;
use crate::types::VaultIndex;

/// Matches a list-item prefix followed by a post wikilink anchor.
///
/// Captures:
///   1 = list-item prefix (e.g., "  + ", "- ", "1. ")
///   2 = the full `<a href="/posts/SLUG">DISPLAY</a>` tag
///   3 = slug (from the href)
///   4 = optional trailing ` @YYYY-MM-DD` annotation (with leading space)
///
/// Relies on `convert_wikilinks()` emitting `<a href="/posts/{slug}">display</a>`
/// with no class attribute and plain-text display (no nested tags). If that
/// output format changes, this regex must be updated.
static LIST_ITEM_POST_LINK_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r##"^(\s*(?:[+\-*]|\d+\.)\s+)(<a href="/posts/([^"#]+?)">[^<]*</a>)(\s@\d{4}-\d{2}-\d{2})?"##,
    )
    .unwrap()
});

/// Parsed ISO date components with the Korean-formatted display string.
struct ParsedDate {
    /// Canonical `YYYY-MM-DD` form — always zero-padded, suitable for HTML `datetime`.
    iso: String,
    /// `YYYY년 M월 D일` form — no zero-padding, for display.
    korean: String,
}

/// Parse an ISO-ish date string (`YYYY-MM-DD` or `YYYY-M-D`) into normalized
/// ISO + Korean-formatted display forms.
///
/// Returns `None` if the input does not have three dash-separated numeric
/// parts or if month/day are outside the basic 1-12 / 1-31 ranges. Does not
/// check per-month day limits (e.g., Feb 30 passes); inputs come from
/// author-written YAML frontmatter and are trusted.
fn parse_date(s: &str) -> Option<ParsedDate> {
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() != 3 {
        return None;
    }
    let year: u32 = parts[0].parse().ok()?;
    let month: u32 = parts[1].parse().ok()?;
    let day: u32 = parts[2].parse().ok()?;

    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return None;
    }

    Some(ParsedDate {
        iso: format!("{year:04}-{month:02}-{day:02}"),
        korean: format!("{year}년 {month}월 {day}일"),
    })
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
/// Code fences are skipped via `transform_outside_fences`.
pub fn augment_hub_child_links(content: &str, index: &VaultIndex) -> String {
    transform_outside_fences(content, |line| augment_line(line, index))
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

    let Some(parsed) = parse_date(published) else {
        return line.to_string();
    };

    let prefix = &caps[1];
    let anchor = &caps[2];
    let match_end = caps.get(0).unwrap().end();
    let tail = &line[match_end..];

    // Use normalized ISO from `parsed` (not the raw `published` field) so the
    // datetime attribute is always canonical YYYY-MM-DD and safe against
    // drift in frontmatter formatting.
    format!(
        r#"{prefix}{anchor} <time class="hub-child-date" datetime="{iso}">{korean}</time>{tail}"#,
        iso = parsed.iso,
        korean = parsed.korean,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parsed_pair(iso: &str, korean: &str) -> (String, String) {
        let p = parse_date(iso).unwrap();
        assert_eq!(p.iso, iso);
        assert_eq!(p.korean, korean);
        (p.iso, p.korean)
    }

    #[test]
    fn test_parse_date_basic() {
        parsed_pair("2026-03-16", "2026년 3월 16일");
    }

    #[test]
    fn test_parse_date_korean_strips_zero_padding() {
        let p = parse_date("2026-03-05").unwrap();
        assert_eq!(p.korean, "2026년 3월 5일");
        assert_eq!(p.iso, "2026-03-05");

        let p = parse_date("2026-01-01").unwrap();
        assert_eq!(p.korean, "2026년 1월 1일");
        assert_eq!(p.iso, "2026-01-01");
    }

    #[test]
    fn test_parse_date_iso_normalizes_shorthand() {
        // Shorthand YYYY-M-D input should canonicalize to zero-padded ISO
        let p = parse_date("2026-1-1").unwrap();
        assert_eq!(p.iso, "2026-01-01");
        assert_eq!(p.korean, "2026년 1월 1일");
    }

    #[test]
    fn test_parse_date_invalid_input() {
        assert!(parse_date("").is_none());
        assert!(parse_date("invalid").is_none());
        assert!(parse_date("2026-13-01").is_none());
        assert!(parse_date("2026-03").is_none());
        assert!(parse_date("2026-03-32").is_none());
        assert!(parse_date("abcd-ef-gh").is_none());
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

    #[test]
    fn test_augment_preserves_tail_after_stripped_annotation() {
        let index = make_test_index(vec![make_post("oop", "OOP", Some("2026-03-16"))]);
        let input = r#"- <a href="/posts/oop">OOP</a> @2025-01-01 — a description"#;
        let result = augment_hub_child_links(input, &index);
        assert!(result.contains("— a description"), "tail text should be preserved: {result}");
        assert!(!result.contains("@2025-01-01"), "manual annotation should be stripped: {result}");
        assert!(result.contains(r#"datetime="2026-03-16""#));
    }

    #[test]
    fn test_augment_multiple_consecutive_items() {
        let index = make_test_index(vec![
            make_post("a", "A", Some("2026-01-01")),
            make_post("b", "B", Some("2026-02-02")),
        ]);
        let input = "- <a href=\"/posts/a\">A</a>\n- <a href=\"/posts/b\">B</a>";
        let result = augment_hub_child_links(input, &index);
        assert!(result.contains("2026년 1월 1일"), "first item date missing: {result}");
        assert!(result.contains("2026년 2월 2일"), "second item date missing: {result}");
    }

    #[test]
    fn test_augment_skips_fenced_code_blocks() {
        let index = make_test_index(vec![make_post("foo", "Foo", Some("2026-01-15"))]);
        let input = "```html\n- <a href=\"/posts/foo\">Foo</a>\n```";
        let result = augment_hub_child_links(input, &index);
        assert!(
            !result.contains("hub-child-date"),
            "content inside code fence must not be augmented: {result}"
        );
    }

    #[test]
    fn test_augment_ignores_continuation_line_wikilinks() {
        // A CommonMark list item continuation line (indented but no bullet)
        // should NOT match — only the bulleted line is eligible.
        let index = make_test_index(vec![make_post("foo", "Foo", Some("2026-01-15"))]);
        let input = "- some intro\n  <a href=\"/posts/foo\">Foo</a>";
        let result = augment_hub_child_links(input, &index);
        assert_eq!(result, input, "continuation line without bullet should be untouched");
    }

    #[test]
    fn test_augment_iso_output_is_normalized() {
        // Shorthand YYYY-M-D in frontmatter should be canonicalized in datetime attribute
        let index = make_test_index(vec![make_post("foo", "Foo", Some("2026-1-5"))]);
        let input = r#"- <a href="/posts/foo">Foo</a>"#;
        let result = augment_hub_child_links(input, &index);
        assert!(
            result.contains(r#"datetime="2026-01-05""#),
            "datetime attribute should be canonical YYYY-MM-DD, got: {result}"
        );
        assert!(result.contains("2026년 1월 5일"));
    }
}
