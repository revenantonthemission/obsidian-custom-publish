//! Shared Obsidian syntax patterns — single source of truth for regexes
//! used across multiple modules (linker, transform, scanner).

use std::sync::LazyLock;

use regex::Regex;

/// Matches `[[target]]`, `[[target#heading]]`, `[[target#heading|alias]]`.
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
pub static HTML_TAG_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"<[^>]+>").unwrap());

/// Matches wikilinks and embeds: `[[target]]`, `[[target|alias]]`, `![[target]]`, `![[target|alias]]`.
/// Groups: 1=target, 2=alias (optional). Used for stripping in preview/search.
pub static EMBED_OR_WIKILINK_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]").unwrap());

/// Matches `^block-id` annotations at end of lines (for stripping, no capture).
pub static BLOCK_REF_STRIP_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\s*\^[\w-]+\s*$").unwrap());
