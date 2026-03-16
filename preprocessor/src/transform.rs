use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use crate::types::{LinkGraph, VaultIndex};

/// Escape HTML special characters to prevent XSS.
fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

static TRANSCLUSION_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"!\[\[(.+?)\]\]").unwrap());

static WIKILINK_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]").unwrap());

static CALLOUT_START_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^>\s*\[!(\w+)\]([+-])?\s*(.*)$").unwrap());

static FENCE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?ms)^```(d2|typst)\n(.*?)^```").unwrap());

/// Transform a post's raw content into clean markdown ready for Astro.
///
/// Handles: frontmatter stripping, transclusion inlining, wikilink conversion,
/// callout conversion, and diagram rendering (D2/Typst).
/// Leaves LaTeX, footnotes, and Mermaid untouched.
pub fn transform_content(index: &VaultIndex, _graph: &LinkGraph, post_idx: usize) -> String {
    transform_content_with_assets(index, _graph, post_idx, None)
}

/// Transform with an optional asset output directory for rendered diagrams.
pub fn transform_content_with_assets(
    index: &VaultIndex,
    _graph: &LinkGraph,
    post_idx: usize,
    asset_dir: Option<&Path>,
) -> String {
    let raw = &index.posts[post_idx].raw_content;
    let slug = &index.posts[post_idx].slug;
    let content = strip_frontmatter(raw);
    let content = resolve_transclusions(&content, index);
    let content = convert_wikilinks(&content, index);
    let content = convert_callouts(&content);
    let content = render_diagram_blocks(&content, slug, asset_dir);
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
    TRANSCLUSION_RE.replace_all(content, |caps: &regex::Captures| {
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
    WIKILINK_RE.replace_all(content, |caps: &regex::Captures| {
        let target_name = caps[1].trim();
        let alias = caps.get(2).map(|m| m.as_str().trim());

        if let Some(&target_idx) = index.name_map.get(target_name) {
            let slug = &index.posts[target_idx].slug;
            let display = html_escape(alias.unwrap_or(target_name));
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
    let callout_start = &*CALLOUT_START_RE;
    let mut result = Vec::new();
    let mut lines = content.lines().peekable();

    while let Some(line) = lines.next() {
        if let Some(caps) = callout_start.captures(line) {
            let callout_type = caps[1].to_lowercase();
            let collapse_marker = caps.get(2).map(|m| m.as_str());
            let title = caps[3].trim().to_string();

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

            match collapse_marker {
                Some("-") | Some("+") => {
                    let open_attr = if collapse_marker == Some("+") { " open" } else { "" };
                    result.push(format!(
                        r#"<details class="callout callout-{callout_type}"{open_attr}>"#
                    ));
                    if !title.is_empty() {
                        result.push(format!(
                            r#"<summary class="callout-title">{}</summary>"#,
                            html_escape(&title)
                        ));
                    } else {
                        result.push(format!(
                            r#"<summary class="callout-title">{}</summary>"#,
                            callout_type
                        ));
                    }
                    result.push(r#"<div class="callout-body">"#.to_string());
                    for body_line in &body_lines {
                        result.push(format!("<p>{body_line}</p>"));
                    }
                    result.push("</div>".to_string());
                    result.push("</details>".to_string());
                }
                _ => {
                    result.push(format!(r#"<div class="callout callout-{callout_type}">"#));
                    if !title.is_empty() {
                        result.push(format!(
                            r#"<div class="callout-title">{}</div>"#,
                            html_escape(&title)
                        ));
                    }
                    for body_line in &body_lines {
                        result.push(format!("<p>{body_line}</p>"));
                    }
                    result.push("</div>".to_string());
                }
            }
        } else {
            result.push(line.to_string());
        }
    }

    result.join("\n")
}

/// Render D2 and Typst fenced code blocks to SVG files, replacing them with `<img>` tags.
/// Mermaid blocks are left untouched for Astro's rehype-mermaid plugin.
fn render_diagram_blocks(content: &str, slug: &str, asset_dir: Option<&Path>) -> String {
    let mut counter = 0;

    FENCE_RE
        .replace_all(content, |caps: &regex::Captures| {
            let lang = &caps[1];
            let source = &caps[2];
            counter += 1;

            let render_result = match lang {
                "d2" => crate::d2::render_d2(source, None),
                "typst" => crate::typst_render::render_typst(source),
                _ => return caps[0].to_string(),
            };

            match render_result {
                Ok(svg) => {
                    if let Some(dir) = asset_dir {
                        let filename = format!("{slug}-{lang}-{counter}.svg");
                        let path = dir.join(&filename);
                        if let Err(e) = std::fs::write(&path, &svg) {
                            eprintln!("warning: failed to write {}: {e}", path.display());
                            return format!("<!-- {lang} render failed: {e} -->");
                        }
                        format!(r#"<img src="/assets/{filename}" class="diagram diagram-{lang}" alt="{lang} diagram" />"#)
                    } else {
                        // No asset dir — inline the SVG directly
                        format!(r#"<div class="diagram diagram-{lang}">{svg}</div>"#)
                    }
                }
                Err(e) => {
                    eprintln!("warning: {lang} rendering failed for {slug}: {e}");
                    // Fall back to a code block so the source is still visible
                    format!("```{lang}\n{source}```")
                }
            }
        })
        .to_string()
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
