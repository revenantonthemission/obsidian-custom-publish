use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use crate::syntax::{BLOCK_ID_RE, IMAGE_EMBED_RE, TRANSCLUSION_RE, WIKILINK_RE};
use crate::types::VaultIndex;

/// Matches Obsidian comments: `%%inline%%` or block `%%\n...\n%%`.
static INLINE_COMMENT_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"%%(.+?)%%").unwrap());

/// Matches `==highlighted text==` for conversion to `<mark>` tags.
static HIGHLIGHT_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"==([^=\n]+?)==").unwrap());

/// Escape HTML special characters to prevent XSS.
fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

static CALLOUT_START_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^>\s*\[!(\w+)\]([+-])?\s*(.*)$").unwrap());

static FENCE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?ms)^```(d2|typst|mermaid)(?:\s+(\w+))?\n(.*?)^```").unwrap());

/// Transform a post's raw content into clean markdown ready for Astro.
///
/// Handles: frontmatter stripping, image embed conversion, transclusion inlining,
/// wikilink conversion, callout conversion, and diagram rendering (D2/Typst).
/// Leaves LaTeX, footnotes, and Mermaid untouched.
pub fn transform_content(index: &VaultIndex, post_idx: usize) -> String {
    transform_content_with_assets(index, post_idx, None).0
}

/// Transform with an optional asset output directory for rendered diagrams.
///
/// Returns `(transformed_content, referenced_image_filenames)`.
pub fn transform_content_with_assets(
    index: &VaultIndex,
    post_idx: usize,
    asset_dir: Option<&Path>,
) -> (String, Vec<String>) {
    let raw = &index.posts[post_idx].raw_content;
    let slug = &index.posts[post_idx].slug;
    let content = strip_frontmatter(raw);
    let content = strip_comments(&content);
    let (content, images) = convert_image_embeds(&content);
    let content = resolve_transclusions(&content, index);
    let content = convert_wikilinks(&content, index);
    let content = inject_block_anchors(&content);
    let content = convert_highlights(&content);
    let content = convert_callouts(&content);
    let content = render_diagram_blocks(&content, slug, asset_dir);
    (content, images)
}

/// Remove YAML frontmatter delimited by `---`.
pub fn strip_frontmatter(content: &str) -> String {
    if !content.starts_with("---") {
        return content.to_string();
    }
    if let Some(end) = content[3..].find("\n---") {
        content[3 + end + 4..].to_string()
    } else {
        content.to_string()
    }
}

/// Strip Obsidian comments (`%%...%%`) from content.
///
/// Handles both inline comments (`some %%hidden%% text`) and block comments
/// (a `%%` line starts a multi-line comment that ends at the next `%%` line).
fn strip_comments(content: &str) -> String {
    // First: strip block comments (%%\n...\n%%)
    let mut result = String::with_capacity(content.len());
    let mut in_block_comment = false;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed == "%%" {
            in_block_comment = !in_block_comment;
            continue;
        }
        if in_block_comment {
            continue;
        }
        result.push_str(line);
        result.push('\n');
    }

    // Preserve original trailing-newline behavior
    if !content.ends_with('\n') && result.ends_with('\n') {
        result.pop();
    }

    // Then: strip inline comments (%%hidden%%)
    INLINE_COMMENT_RE.replace_all(&result, "").to_string()
}

/// Convert `==highlighted text==` to `<mark>` tags.
fn convert_highlights(content: &str) -> String {
    transform_outside_fences(content, |line| {
        HIGHLIGHT_RE
            .replace_all(line, |caps: &regex::Captures| {
                format!("<mark>{}</mark>", &caps[1])
            })
            .to_string()
    })
}

/// Split content into code-fenced and non-fenced segments, applying `f` only to non-fenced parts.
fn transform_outside_fences(content: &str, mut f: impl FnMut(&str) -> String) -> String {
    let mut result = String::with_capacity(content.len());
    let mut in_fence = false;

    for line in content.lines() {
        if line.starts_with("```") {
            in_fence = !in_fence;
            if !in_fence {
                // Closing fence — pass through as-is
                result.push_str(line);
            } else {
                // Opening fence — lowercase the language identifier for Shiki
                let lang_part = line.trim_start_matches('`');
                if lang_part.is_empty() {
                    result.push_str(line);
                } else {
                    let backticks = &line[..line.len() - lang_part.len()];
                    result.push_str(backticks);
                    result.push_str(&lang_part.to_lowercase());
                }
            }
            result.push('\n');
        } else if in_fence {
            result.push_str(line);
            result.push('\n');
        } else {
            result.push_str(&f(line));
            result.push('\n');
        }
    }

    if in_fence {
        eprintln!("warning: unclosed code fence detected — transforms skipped after opening fence");
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

/// Replace `^block-id` annotations at the end of lines with invisible anchor spans.
fn inject_block_anchors(content: &str) -> String {
    transform_outside_fences(content, |line| {
        BLOCK_ID_RE
            .replace(line, |caps: &regex::Captures| {
                let block_id = &caps[1];
                format!(r#" <span id="^{block_id}"></span>"#)
            })
            .to_string()
    })
}

/// Convert `![[image.png|size]]` embeds to HTML `<img>` tags.
///
/// Returns `(transformed_content, list_of_referenced_image_filenames)`.
fn convert_image_embeds(content: &str) -> (String, Vec<String>) {
    let mut images = Vec::new();
    let result = transform_outside_fences(content, |line| {
        IMAGE_EMBED_RE
            .replace_all(line, |caps: &regex::Captures| {
                let filename = &caps[1];
                images.push(filename.to_string());
                let size = caps.get(3).map(|m| m.as_str());
                match size {
                    Some(s) if s.contains('x') => {
                        if let Some((w, h)) = s.split_once('x') {
                            format!(
                                r#"<img src="/assets/{filename}" alt="" width="{w}" height="{h}" />"#,
                            )
                        } else {
                            format!(r#"<img src="/assets/{filename}" alt="" />"#)
                        }
                    }
                    Some(w) => {
                        format!(r#"<img src="/assets/{filename}" alt="" width="{w}" />"#)
                    }
                    None => {
                        format!(r#"<img src="/assets/{filename}" alt="" />"#)
                    }
                }
            })
            .to_string()
    });
    images.sort();
    images.dedup();
    (result, images)
}

/// Replace `![[Note Name]]`, `![[Note Name#^block-id]]`, or `![[Note Name#Heading]]`
/// with the referenced content.
///
/// - Full-note transclusions inline the entire body.
/// - Block transclusions inline just the paragraph carrying the `^block-id` annotation.
/// - Heading transclusions inline everything from the heading to the next heading
///   of the same or higher level.
///
/// Note: `convert_image_embeds` must run BEFORE this function in the pipeline,
/// so image embeds (`![[file.png]]`) are already converted to `<img>` tags
/// and won't match TRANSCLUSION_RE.
fn resolve_transclusions(content: &str, index: &VaultIndex) -> String {
    transform_outside_fences(content, |line| {
        TRANSCLUSION_RE.replace_all(line, |caps: &regex::Captures| {
            let name = caps[1].trim();
            let block_id = caps.get(2).map(|m| m.as_str());
            let heading = caps.get(3).map(|m| m.as_str().trim());

            if let Some(block_id) = block_id {
                // Block transclusion: inline the specific paragraph
                if let Some(blocks) = index.block_map.get(name) {
                    if let Some(text) = blocks.get(block_id) {
                        return text.clone();
                    }
                }
                format!("{name}#^{block_id}")
            } else if let Some(heading) = heading {
                // Heading transclusion: inline content under a specific heading
                if let Some(&target_idx) = index.name_map.get(name) {
                    let target_content = &index.posts[target_idx].raw_content;
                    let body = strip_frontmatter(target_content);
                    extract_heading_section(&body, heading)
                        .unwrap_or_else(|| {
                            eprintln!("warning: heading '{heading}' not found in '{name}'");
                            format!("{name}#{heading}")
                        })
                } else {
                    format!("{name}#{heading}")
                }
            } else if let Some(&target_idx) = index.name_map.get(name) {
                // Full-note transclusion
                let target_content = &index.posts[target_idx].raw_content;
                strip_frontmatter(target_content)
            } else {
                format!("{name}")
            }
        })
        .to_string()
    })
}

/// Extract the section under a heading: everything from the heading line (inclusive)
/// to the next heading of the same or higher level (exclusive).
pub fn extract_heading_section(content: &str, heading: &str) -> Option<String> {
    static HEADING_LEVEL_RE: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"^(#{1,6})\s+(.+)$").unwrap());

    let mut found = false;
    let mut level = 0;
    let mut section_lines = Vec::new();

    for line in content.lines() {
        if let Some(caps) = HEADING_LEVEL_RE.captures(line) {
            let hashes = caps[1].len();
            let text = caps[2].trim();

            if !found {
                // Look for the matching heading (case-insensitive)
                if text.eq_ignore_ascii_case(heading) {
                    found = true;
                    level = hashes;
                    section_lines.push(line.to_string());
                }
            } else if hashes <= level {
                // Hit a same-or-higher-level heading — stop
                break;
            } else {
                section_lines.push(line.to_string());
            }
        } else if found {
            section_lines.push(line.to_string());
        }
    }

    if found {
        Some(section_lines.join("\n"))
    } else {
        None
    }
}

/// Convert `[[wikilinks]]` to HTML anchor tags or plain text for unresolved links.
/// Supports heading fragments: `[[Note#Heading]]` and `[[Note#Heading|alias]]`.
fn convert_wikilinks(content: &str, index: &VaultIndex) -> String {
    transform_outside_fences(content, |line| {
        WIKILINK_RE.replace_all(line, |caps: &regex::Captures| {
            let target_name = caps[1].trim();
            let heading_raw = caps.get(2).map(|m| m.as_str().trim());
            let alias = caps.get(3).map(|m| m.as_str().trim());

            if let Some(&target_idx) = index.name_map.get(target_name) {
                let slug = &index.posts[target_idx].slug;

                // Determine fragment: block reference (^id) or heading reference
                let (fragment, is_block_ref) = match heading_raw {
                    Some(h) if h.starts_with('^') => {
                        // Block reference — use as-is, no slugification needed
                        (Some(format!("#{h}")), true)
                    }
                    Some(h) => {
                        // Heading reference — slugify and validate
                        let h_slug = crate::scanner::slugify_heading(h);
                        let valid = index.heading_map
                            .get(target_name)
                            .is_some_and(|headings| headings.contains(&h_slug));
                        if !valid {
                            eprintln!("warning: heading '{h}' not found in '{target_name}'");
                        }
                        (valid.then(|| format!("#{h_slug}")), false)
                    }
                    None => (None, false),
                };

                let href = match &fragment {
                    Some(frag) => format!("/posts/{slug}{frag}"),
                    None => format!("/posts/{slug}"),
                };
                let display = match (alias, heading_raw, is_block_ref) {
                    (Some(a), _, _) => html_escape(a),
                    (None, Some(h), false) if fragment.is_some() => {
                        format!("{} &gt; {}", html_escape(target_name), html_escape(h))
                    }
                    (None, Some(_), _) => html_escape(target_name), // block ref or invalid heading: show note name only
                    (None, None, _) => html_escape(target_name),
                };
                format!(r#"<a href="{href}">{display}</a>"#)
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

/// Render D2, Typst, and Mermaid fenced code blocks to HTML.
///
/// D2 supports an optional format specifier in the info string (e.g. `` ```d2 png ``):
/// - `svg` (default) — dual-rendered light + dark, inline or asset file
/// - `png` / `gif`  — single render, always written to asset file, `<img>` tag
/// - `pdf` / `pptx` — single render, written to asset file, `<a download>` link
/// - `txt` / `ascii` — single render, wrapped in `<pre>` block
///
/// Mermaid and Typst ignore the format specifier.
fn render_diagram_blocks(content: &str, slug: &str, asset_dir: Option<&Path>) -> String {
    use crate::d2::D2Format;
    let mut counter = 0;

    FENCE_RE
        .replace_all(content, |caps: &regex::Captures| {
            let lang = &caps[1];
            // caps[2] = optional format word; caps[3] = diagram source
            let fmt_str = caps.get(2).map(|m| m.as_str()).unwrap_or("svg");
            let source = &caps[3];
            counter += 1;

            match lang {
                "d2" => {
                    let format = D2Format::from_str(fmt_str);
                    match format {
                        D2Format::Svg => {
                            render_themed_diagram(lang, source, slug, counter, asset_dir, &D2_THEMES, |src, theme| {
                                crate::d2::render_d2(src, theme, None)
                            })
                        }
                        _ if format.is_text_art() => {
                            render_d2_text(source, slug, counter, format)
                        }
                        _ => {
                            // Binary or download formats (png, gif, pdf, pptx)
                            render_d2_binary(source, slug, counter, asset_dir, format)
                        }
                    }
                }
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

/// Render a D2 diagram to a binary format (png, gif, pdf, pptx).
/// Always writes to an asset file. PNG/GIF become `<img>` tags; PDF/PPTX become download links.
fn render_d2_binary(
    source: &str,
    slug: &str,
    counter: usize,
    asset_dir: Option<&Path>,
    format: crate::d2::D2Format,
) -> String {
    match crate::d2::render_d2_bytes(source, format, None, None) {
        Ok(bytes) => {
            let ext = format.extension();
            let filename = format!("{slug}-d2-{counter}.{ext}");

            if let Some(dir) = asset_dir {
                let path = dir.join(&filename);
                if let Err(e) = std::fs::write(&path, &bytes) {
                    eprintln!("warning: failed to write {}: {e}", path.display());
                    return format!("<!-- d2 {ext} render failed: {e} -->");
                }
            }

            match format {
                crate::d2::D2Format::Pdf | crate::d2::D2Format::Pptx => {
                    let label = ext.to_uppercase();
                    format!(r#"<a href="/assets/{filename}" download class="diagram-download">{label} 다운로드</a>"#)
                }
                _ => {
                    format!(r#"<img src="/assets/{filename}" class="diagram diagram-d2" alt="" />"#)
                }
            }
        }
        Err(e) => {
            eprintln!("warning: d2 {format:?} rendering failed for {slug}: {e}");
            format!("```d2\n{source}```")
        }
    }
}

/// Render a D2 diagram to ASCII/text art and wrap in a `<pre>` block.
fn render_d2_text(
    source: &str,
    slug: &str,
    counter: usize,
    format: crate::d2::D2Format,
) -> String {
    match crate::d2::render_d2_bytes(source, format, None, None) {
        Ok(bytes) => match String::from_utf8(bytes) {
            Ok(text) => format!(r#"<pre class="diagram diagram-d2-ascii">{}</pre>"#, html_escape(&text)),
            Err(e) => {
                eprintln!("warning: d2 ascii output was not UTF-8 for {slug}: {e}");
                format!("<!-- d2 ascii render failed: not UTF-8 -->")
            }
        },
        Err(e) => {
            eprintln!("warning: d2 text rendering failed for {slug}-{counter}: {e}");
            format!("```d2\n{source}```")
        }
    }
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

    #[test]
    fn test_fence_language_lowercased() {
        let input = "```C\nint x = 1;\n```\n";
        let result = transform_outside_fences(input, |line| line.to_string());
        assert!(result.starts_with("```c\n"), "Expected lowercase lang, got: {result}");
    }

    #[test]
    fn test_fence_language_already_lowercase() {
        let input = "```rust\nlet x = 1;\n```\n";
        let result = transform_outside_fences(input, |line| line.to_string());
        assert!(result.starts_with("```rust\n"));
    }

    #[test]
    fn test_fence_no_language() {
        let input = "```\nplain code\n```\n";
        let result = transform_outside_fences(input, |line| line.to_string());
        assert!(result.starts_with("```\n"));
    }
}
