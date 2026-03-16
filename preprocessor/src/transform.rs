use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use crate::types::{LinkGraph, VaultIndex, IMAGE_EXTENSIONS};

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
    LazyLock::new(|| Regex::new(r"(?ms)^```(d2|typst|mermaid)\n(.*?)^```").unwrap());

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

/// Split content into code-fenced and non-fenced segments, applying `f` only to non-fenced parts.
fn transform_outside_fences(content: &str, f: impl Fn(&str) -> String) -> String {
    let mut result = String::with_capacity(content.len());
    let mut in_fence = false;

    for line in content.lines() {
        if line.starts_with("```") {
            in_fence = !in_fence;
            result.push_str(line);
            result.push('\n');
        } else if in_fence {
            result.push_str(line);
            result.push('\n');
        } else {
            result.push_str(&f(line));
            result.push('\n');
        }
    }

    // Remove trailing newline added by iteration
    if content.ends_with('\n') || result.ends_with('\n') {
        result.truncate(result.trim_end_matches('\n').len());
        if content.ends_with('\n') {
            result.push('\n');
        }
    }

    result
}

fn is_image_reference(name: &str) -> bool {
    if let Some(dot_pos) = name.rfind('.') {
        let ext = &name[dot_pos + 1..];
        IMAGE_EXTENSIONS.contains(&ext.to_lowercase().as_str())
    } else {
        false
    }
}

/// Replace `![[Note Name]]` with the body content of the referenced note,
/// or emit `<img>` tags for image embeds.
fn resolve_transclusions(content: &str, index: &VaultIndex) -> String {
    transform_outside_fences(content, |line| {
        TRANSCLUSION_RE.replace_all(line, |caps: &regex::Captures| {
            let name = caps[1].trim();
            if is_image_reference(name) {
                if index.attachment_map.contains_key(name) {
                    let stem = &name[..name.rfind('.').unwrap()];
                    let escaped_stem = html_escape(stem);
                    format!(r#"<img src="/assets/{name}" alt="{escaped_stem}" />"#)
                } else {
                    format!("<!-- image not found: {name} -->")
                }
            } else if let Some(&target_idx) = index.name_map.get(name) {
                let target_content = &index.posts[target_idx].raw_content;
                strip_frontmatter(target_content)
            } else {
                // Leave as plain text if target not found
                format!("{name}")
            }
        })
        .to_string()
    })
}

/// Convert `[[wikilinks]]` to HTML anchor tags or plain text for unresolved links.
fn convert_wikilinks(content: &str, index: &VaultIndex) -> String {
    transform_outside_fences(content, |line| {
        WIKILINK_RE.replace_all(line, |caps: &regex::Captures| {
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
    })
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

            // Join body lines as raw markdown — don't wrap in <p>,
            // let the remark/rehype pipeline handle paragraph detection.
            // This preserves code fences, lists, and other block elements inside callouts.
            let body = body_lines.join("\n");

            match collapse_marker {
                Some("-") | Some("+") => {
                    let open_attr = if collapse_marker == Some("+") { " open" } else { "" };
                    result.push(format!(
                        r#"<details class="callout callout-{callout_type}"{open_attr}>"#
                    ));
                    let summary = if !title.is_empty() {
                        html_escape(&title)
                    } else {
                        callout_type.clone()
                    };
                    result.push(format!(
                        r#"<summary class="callout-title">{summary}</summary>"#
                    ));
                    result.push(String::new()); // blank line so markdown parser kicks in
                    result.push(body);
                    result.push(String::new());
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
                    result.push(String::new()); // blank line so markdown parser kicks in
                    result.push(body);
                    result.push(String::new());
                    result.push("</div>".to_string());
                }
            }
        } else {
            result.push(line.to_string());
        }
    }

    result.join("\n")
}

/// Theme pair for dual-rendering diagrams (light + dark variants).
struct ThemePair {
    light: &'static str,
    dark: &'static str,
}

const D2_THEMES: ThemePair = ThemePair { light: "0", dark: "200" };
const MERMAID_THEMES: ThemePair = ThemePair { light: "default", dark: "dark" };

/// Render D2, Typst, and Mermaid fenced code blocks to SVG.
/// D2 and Mermaid are dual-rendered (light + dark) and wrapped in theme-gated markup.
/// Typst diagrams are rendered once (no theme support).
fn render_diagram_blocks(content: &str, slug: &str, asset_dir: Option<&Path>) -> String {
    let mut counter = 0;

    FENCE_RE
        .replace_all(content, |caps: &regex::Captures| {
            let lang = &caps[1];
            let source = &caps[2];
            counter += 1;

            match lang {
                "d2" => render_themed_diagram(lang, source, slug, counter, asset_dir, &D2_THEMES, |src, theme| {
                    crate::d2::render_d2(src, theme, None)
                }),
                "mermaid" => render_themed_diagram(lang, source, slug, counter, asset_dir, &MERMAID_THEMES, |src, theme| {
                    crate::mermaid::render_mermaid(src, theme)
                }),
                "typst" => render_single_diagram(lang, source, slug, counter, asset_dir, |src| {
                    crate::typst_render::render_typst(src)
                }),
                _ => caps[0].to_string(),
            }
        })
        .to_string()
}

/// Render a diagram once (no theming). Used for Typst.
fn render_single_diagram(
    lang: &str,
    source: &str,
    slug: &str,
    counter: usize,
    asset_dir: Option<&Path>,
    render_fn: impl Fn(&str) -> anyhow::Result<String>,
) -> String {
    match render_fn(source) {
        Ok(svg) => {
            if let Some(dir) = asset_dir {
                let filename = format!("{slug}-{lang}-{counter}.svg");
                let path = dir.join(&filename);
                if let Err(e) = std::fs::write(&path, &svg) {
                    eprintln!("warning: failed to write {}: {e}", path.display());
                    return format!("<!-- {lang} render failed: {e} -->");
                }
                format!(r#"<img src="/assets/{filename}" class="diagram diagram-{lang}" alt="" />"#)
            } else {
                format!(r#"<div class="diagram diagram-{lang}">{svg}</div>"#)
            }
        }
        Err(e) => {
            eprintln!("warning: {lang} rendering failed for {slug}: {e}");
            format!("```{lang}\n{source}```")
        }
    }
}

/// Render a diagram twice (light + dark), wrap in theme-gated markup.
fn render_themed_diagram(
    lang: &str,
    source: &str,
    slug: &str,
    counter: usize,
    asset_dir: Option<&Path>,
    themes: &ThemePair,
    render_fn: impl Fn(&str, &str) -> anyhow::Result<String>,
) -> String {
    let light_result = render_fn(source, themes.light);
    let dark_result = render_fn(source, themes.dark);

    // If both fail, fall back to source code
    if light_result.is_err() && dark_result.is_err() {
        let e = light_result.unwrap_err();
        eprintln!("warning: {lang} rendering failed for {slug}: {e}");
        return format!("```{lang}\n{source}```");
    }

    let mut parts = Vec::new();

    for (variant, result) in [("light", light_result), ("dark", dark_result)] {
        match result {
            Ok(svg) => {
                if let Some(dir) = asset_dir {
                    let filename = format!("{slug}-{lang}-{counter}-{variant}.svg");
                    let path = dir.join(&filename);
                    if let Err(e) = std::fs::write(&path, &svg) {
                        eprintln!("warning: failed to write {}: {e}", path.display());
                        continue;
                    }
                    parts.push(format!(
                        r#"<img src="/assets/{filename}" class="diagram diagram-{lang} diagram-{variant}" alt="" />"#
                    ));
                } else {
                    parts.push(format!(
                        r#"<div class="diagram diagram-{lang} diagram-{variant}">{svg}</div>"#
                    ));
                }
            }
            Err(e) => {
                eprintln!("warning: {lang} {variant} theme rendering failed for {slug}: {e}");
            }
        }
    }

    parts.join("\n")
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

    #[test]
    fn test_transform_outside_fences_preserves_code_blocks() {
        let input = "before [[link]]\n```\n[[inside fence]]\n```\nafter [[link]]";
        let result = transform_outside_fences(input, |line| {
            line.replace("[[link]]", "REPLACED")
        });
        assert!(result.contains("before REPLACED"));
        assert!(result.contains("[[inside fence]]"));
        assert!(result.contains("after REPLACED"));
    }
}
