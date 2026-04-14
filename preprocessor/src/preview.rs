use crate::syntax::{
    BLOCK_REF_STRIP_RE, EMBED_OR_WIKILINK_RE, HTML_TAG_RE,
    INLINE_MARKDOWN_RE, MARKDOWN_LINK_RE, MULTI_SPACE_RE,
};
use crate::transform::strip_frontmatter;
use crate::types::VaultIndex;

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
    let text = MARKDOWN_LINK_RE.replace_all(&text, "$1");
    // Strip HTML tags
    let text = HTML_TAG_RE.replace_all(&text, "");
    // Strip inline markdown: **, *, `, ~~, ==
    let text = INLINE_MARKDOWN_RE.replace_all(&text, "");
    // Strip block references
    let text = BLOCK_REF_STRIP_RE.replace_all(&text, "");
    // Normalize whitespace
    let text = MULTI_SPACE_RE.replace_all(&text, " ");
    text.trim().to_string()
}

/// Minimum characters before accepting a sentence-ending punctuation.
const MIN_SENTENCE_CHARS: usize = 10;
/// Maximum characters for preview summary truncation.
const MAX_SUMMARY_CHARS: usize = 150;

/// Extract the first sentence from plain text.
/// Finds the first `.` or `。` after at least MIN_SENTENCE_CHARS, or truncates at MAX_SUMMARY_CHARS.
fn extract_first_sentence(text: &str) -> String {
    if text.is_empty() {
        return String::new();
    }
    for (i, ch) in text.char_indices() {
        if i >= MIN_SENTENCE_CHARS && (ch == '.' || ch == '。') {
            let end = i + ch.len_utf8();
            return text[..end].to_string();
        }
    }
    let char_count = text.chars().count();
    if char_count <= MAX_SUMMARY_CHARS {
        return text.to_string();
    }
    let byte_idx = text.char_indices().nth(MAX_SUMMARY_CHARS).map(|(i, _)| i).unwrap_or(text.len());
    let truncated = &text[..byte_idx];
    if let Some(last_space) = truncated.rfind(' ') {
        format!("{}...", &text[..last_space])
    } else {
        format!("{}...", truncated)
    }
}
