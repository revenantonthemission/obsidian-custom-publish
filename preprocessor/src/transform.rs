use regex::Regex;

use crate::types::{LinkGraph, VaultIndex};

/// Transform a post's raw content into clean markdown ready for Astro.
///
/// Handles: frontmatter stripping, transclusion inlining, wikilink conversion,
/// and callout conversion. Leaves LaTeX, footnotes, and Mermaid untouched.
pub fn transform_content(index: &VaultIndex, _graph: &LinkGraph, post_idx: usize) -> String {
    let raw = &index.posts[post_idx].raw_content;
    let content = strip_frontmatter(raw);
    let content = resolve_transclusions(&content, index);
    let content = convert_wikilinks(&content, index);
    let content = convert_callouts(&content);
    content
}

/// Remove YAML frontmatter delimited by `---`.
fn strip_frontmatter(content: &str) -> String {
    if !content.starts_with("---") {
        return content.to_string();
    }
    if let Some(end) = content[3..].find("\n---") {
        content[3 + end + 4..].to_string()
    } else {
        content.to_string()
    }
}

/// Replace `![[Note Name]]` with the body content of the referenced note.
fn resolve_transclusions(content: &str, index: &VaultIndex) -> String {
    let re = Regex::new(r"!\[\[(.+?)\]\]").unwrap();
    re.replace_all(content, |caps: &regex::Captures| {
        let name = caps[1].trim();
        if let Some(&target_idx) = index.name_map.get(name) {
            let target_content = &index.posts[target_idx].raw_content;
            strip_frontmatter(target_content)
        } else {
            // Leave as plain text if target not found
            format!("{name}")
        }
    })
    .to_string()
}

/// Convert `[[wikilinks]]` to HTML anchor tags or plain text for unresolved links.
fn convert_wikilinks(content: &str, index: &VaultIndex) -> String {
    let re = Regex::new(r"\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]").unwrap();
    re.replace_all(content, |caps: &regex::Captures| {
        let target_name = caps[1].trim();
        let alias = caps.get(2).map(|m| m.as_str().trim());

        if let Some(&target_idx) = index.name_map.get(target_name) {
            let slug = &index.posts[target_idx].slug;
            let display = alias.unwrap_or(target_name);
            format!(r#"<a href="/posts/{slug}">{display}</a>"#)
        } else {
            // Unresolved link — render as plain text
            alias.unwrap_or(target_name).to_string()
        }
    })
    .to_string()
}

/// Convert Obsidian callout syntax to HTML divs.
///
/// Input:
/// ```text
/// > [!note] Optional Title
/// > Content line
/// ```
///
/// Output:
/// ```html
/// <div class="callout callout-note">
/// <div class="callout-title">Optional Title</div>
/// <p>Content line</p>
/// </div>
/// ```
fn convert_callouts(content: &str) -> String {
    let callout_start = Regex::new(r"^>\s*\[!(\w+)\]\s*(.*)$").unwrap();
    let mut result = Vec::new();
    let mut lines = content.lines().peekable();

    while let Some(line) = lines.next() {
        if let Some(caps) = callout_start.captures(line) {
            let callout_type = caps[1].to_lowercase();
            let title = caps[2].trim().to_string();

            // Collect callout body lines (lines starting with `> `)
            let mut body_lines = Vec::new();
            while let Some(next) = lines.peek() {
                if let Some(stripped) = next.strip_prefix("> ") {
                    body_lines.push(stripped.to_string());
                    lines.next();
                } else if next.starts_with('>') {
                    // Empty callout continuation line
                    body_lines.push(String::new());
                    lines.next();
                } else {
                    break;
                }
            }

            result.push(format!(r#"<div class="callout callout-{callout_type}">"#));
            if !title.is_empty() {
                result.push(format!(r#"<div class="callout-title">{title}</div>"#));
            }
            for body_line in &body_lines {
                result.push(format!("<p>{body_line}</p>"));
            }
            result.push("</div>".to_string());
        } else {
            result.push(line.to_string());
        }
    }

    result.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strip_frontmatter_removes_yaml() {
        let input = "---\ntitle: Test\n---\n\nBody content";
        assert_eq!(strip_frontmatter(input), "\n\nBody content");
    }

    #[test]
    fn test_strip_frontmatter_no_frontmatter() {
        let input = "Just content";
        assert_eq!(strip_frontmatter(input), "Just content");
    }
}
