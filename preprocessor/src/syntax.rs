//! Shared Obsidian syntax patterns — single source of truth for regexes
//! used across multiple modules (linker, transform, scanner).

use std::sync::LazyLock;

use regex::Regex;

/// Matches `[[target]]`, `[[target#heading]]`, `[[target#heading|alias]]`.
/// Groups: 1=target, 2=heading/block fragment (optional), 3=alias (optional).
pub static WIKILINK_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\[\[([^\]#|]+?)(?:#([^\]|]+?))?(?:\|([^\]]+?))?\]\]").unwrap());

/// Matches `^block-id` annotations at end of lines.
/// Group 1: the block ID (alphanumeric + hyphens).
pub static BLOCK_ID_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\s\^([a-zA-Z0-9-]+)\s*$").unwrap());

/// Matches image embeds: `![[file.png]]`, `![[file.jpg|300]]`,
/// `![[file.png|300x200]]`, or `![[file.png|caption]]`.
/// Groups: 1=filename, 2=extension, 3=pipe value (optional).
pub static IMAGE_EMBED_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"!\[\[([^\]|]+?\.(?i:(png|jpg|jpeg|gif|svg|webp)))(?:\|([^\]\n]+))?\]\]").unwrap()
});

/// Matches an image embed's size suffix: `300` or `300x200`.
/// Groups: 1=width, 2=height (optional).
pub static IMAGE_SIZE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^(\d+)(?:x(\d+))?$").unwrap());

/// Matches Markdown images `![alt](src)` with an optional `"title"` or `'title'`.
/// Groups: 1=alt text, 2=source, 3=title with leading whitespace (optional).
pub static MARKDOWN_IMAGE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"!\[([^\]]*)\]\(([^)\s]+)(\s+(?:"[^"]*"|'[^']*'))?\)"#).unwrap());

/// Matches transclusions: `![[Note Name]]`, `![[Note Name#^block-id]]`, or `![[Note Name#Heading]]`.
/// Groups: 1=note name, 2=block ID (optional, with `^` prefix stripped), 3=heading (optional).
pub static TRANSCLUSION_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"!\[\[([^\]#]+?)(?:#(?:\^([a-zA-Z0-9-]+)|([^\]]+?)))?\]\]").unwrap()
});

/// Matches markdown headings with level and text capture.
/// Groups: 1=hash marks (level), 2=heading text.
pub static HEADING_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?m)^(#{1,6})\s+(.+)$").unwrap());

/// Matches HTML tags (opening, closing, and self-closing).
/// Used by preview and search modules for stripping HTML from plain text.
pub static HTML_TAG_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<[^>]+>").unwrap());

/// Matches wikilinks and embeds: `[[target]]`, `[[target|alias]]`, `![[target]]`, `![[target|alias]]`.
/// Groups: 1=target, 2=alias (optional). Used for stripping in preview/search.
pub static EMBED_OR_WIKILINK_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]").unwrap());

/// Matches `^block-id` annotations at end of lines (for stripping, no capture).
pub static BLOCK_REF_STRIP_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\s*\^[\w-]+\s*$").unwrap());

/// Matches inline markdown syntax for stripping: **, *, __, _, `, ~~, ==.
pub static INLINE_MARKDOWN_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(\*{1,2}|_{1,2}|`|~~|==)").unwrap());

/// Matches markdown links `[text](url)` for stripping — keeps the text.
pub static MARKDOWN_LINK_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\[([^\]]*)\]\([^)]*\)").unwrap());

/// Matches runs of whitespace for normalization.
pub static MULTI_SPACE_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").unwrap());

/// Find the YAML frontmatter byte range in content.
///
/// Returns the range of the YAML text between the opening `---` and closing `\n---`.
/// The body content starts at `range.end + 4` (skipping the `\n---` delimiter).
/// Returns `None` if there is no valid frontmatter.
pub fn frontmatter_range(content: &str) -> Option<std::ops::Range<usize>> {
    if !content.starts_with("---") {
        return None;
    }
    content[3..].find("\n---").map(|end| 3..3 + end)
}

#[cfg(test)]
mod tests {
    use super::{IMAGE_EMBED_RE, IMAGE_SIZE_RE, MARKDOWN_IMAGE_RE};

    #[test]
    fn image_embed_extensions_are_case_insensitive() {
        for input in [
            "![[image.png]]",
            "![[image.PNG]]",
            "![[image.JpEg|300]]",
            "![[image.SVG|300x200]]",
            "![[image.WebP]]",
        ] {
            assert!(
                IMAGE_EMBED_RE.is_match(input),
                "expected image embed: {input}"
            );
        }
    }

    #[test]
    fn image_embed_captures_a_non_size_pipe_value() {
        let caps = IMAGE_EMBED_RE
            .captures("![[figure.png|A caption with 300 numbers]]")
            .expect("expected image embed");
        assert_eq!(&caps[1], "figure.png");
        assert_eq!(
            caps.get(3).map(|m| m.as_str()),
            Some("A caption with 300 numbers")
        );
        assert!(IMAGE_SIZE_RE.captures(&caps[3]).is_none());
    }

    #[test]
    fn image_size_matches_number_and_dimensions() {
        let width = IMAGE_SIZE_RE.captures("300").expect("expected width");
        assert_eq!(&width[1], "300");
        assert!(width.get(2).is_none());

        let dimensions = IMAGE_SIZE_RE
            .captures("300x200")
            .expect("expected dimensions");
        assert_eq!(&dimensions[1], "300");
        assert_eq!(dimensions.get(2).map(|m| m.as_str()), Some("200"));

        assert!(IMAGE_SIZE_RE.captures("300px").is_none());
    }

    #[test]
    fn markdown_image_captures_alt_source_and_title() {
        let caps = MARKDOWN_IMAGE_RE
            .captures(r#"![A caption](figure.png "title")"#)
            .expect("expected Markdown image");
        assert_eq!(&caps[1], "A caption");
        assert_eq!(&caps[2], "figure.png");
        assert_eq!(caps.get(3).map(|m| m.as_str()), Some(r#" "title""#));
    }
}
