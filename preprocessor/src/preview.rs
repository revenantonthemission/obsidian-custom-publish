use std::sync::LazyLock;

use regex::Regex;

use crate::syntax::{BLOCK_REF_STRIP_RE, EMBED_OR_WIKILINK_RE, HTML_TAG_RE};
use crate::transform::strip_frontmatter;
use crate::types::VaultIndex;

/// Compiled regexes for stripping markdown syntax.
static RE_INLINE_MARKDOWN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(\*{1,2}|_{1,2}|`|~~)").unwrap());
static RE_MARKDOWN_LINK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\[([^\]]*)\]\([^)]*\)").unwrap());
static RE_MULTI_SPACE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").unwrap());

/// Build a slug→preview map for all posts.
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
    let body = strip_frontmatter(content);
    let lines: Vec<&str> = body
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            // Skip headings, code fences, blockquotes, horizontal rules, empty lines
            !trimmed.starts_with('#')
                && !trimmed.starts_with("```")
                && !trimmed.starts_with('>')
                && !trimmed.starts_with("---")
                && !trimmed.is_empty()
        })
        .collect();
    let joined = lines.join(" ");

    // Strip wikilinks: [[target|display]] -> display, [[target]] -> target
    let text = EMBED_OR_WIKILINK_RE.replace_all(&joined, |caps: &regex::Captures| {
        caps.get(2)
            .or_else(|| caps.get(1))
            .map(|m| m.as_str().to_string())
            .unwrap_or_default()
    });
    // Strip markdown links: [text](url) -> text
    let text = RE_MARKDOWN_LINK.replace_all(&text, "$1");
    // Strip HTML tags
    let text = HTML_TAG_RE.replace_all(&text, "");
    // Strip inline markdown: **, *, `, ~~
    let text = RE_INLINE_MARKDOWN.replace_all(&text, "");
    // Strip block references
    let text = BLOCK_REF_STRIP_RE.replace_all(&text, "");
    // Normalize whitespace
    let text = RE_MULTI_SPACE.replace_all(&text, " ");
    text.trim().to_string()
}

/// Extract the first sentence from plain text.
/// Finds the first `.` or `。` after at least 10 chars, or truncates at 150 chars.
fn extract_first_sentence(text: &str) -> String {
    if text.is_empty() {
        return String::new();
    }
    // Look for sentence-ending punctuation after at least 10 chars
    for (i, ch) in text.char_indices() {
        if i >= 10 && (ch == '.' || ch == '。') {
            let end = i + ch.len_utf8();
            return text[..end].to_string();
        }
    }
    // No sentence end found; truncate at ~150 characters (not bytes)
    let char_count = text.chars().count();
    if char_count <= 150 {
        return text.to_string();
    }
    // Find byte index of the 150th character
    let byte_idx = text.char_indices().nth(150).map(|(i, _)| i).unwrap_or(text.len());
    let truncated = &text[..byte_idx];
    if let Some(last_space) = truncated.rfind(' ') {
        format!("{}...", &text[..last_space])
    } else {
        format!("{}...", truncated)
    }
}
