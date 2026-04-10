//! Augment list-item wikilinks in hub pages with child post publish dates.
//!
//! Runs after `convert_wikilinks()` in the transform pipeline. For each
//! list-item line containing a resolved wikilink to a post with a `published`
//! field, strips any existing ` @YYYY-MM-DD` annotation and appends a
//! `<time class="hub-child-date">` element with the Korean-formatted date.

use regex::Regex;
use std::sync::LazyLock;

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
}
