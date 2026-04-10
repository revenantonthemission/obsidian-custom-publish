use anyhow::{Context, Result, bail};
use std::io::Write;
use std::process::{Command, Stdio};
use std::sync::LazyLock;

use regex::Regex;

/// Regex matching a bare D2 style property at any indentation level.
/// These must be nested inside `style {}` in D2 v0.6+.
static BARE_STYLE_PROP_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"^([ \t]+)(fill|stroke(?:-(?:width|dash))?|border-radius|font-color|font-size|bold|italic|underline|opacity|shadow|multiple|double-border|3d|animated)\s*:",
    )
    .unwrap()
});

/// Migrate old D2 style syntax to D2 v0.6+ nested `style {}` syntax.
///
/// Bare properties like `fill: "#fff"` inside a shape block must now be
/// written as `style { fill: "#fff" }`. This function wraps consecutive
/// bare style properties in a `style {}` block, skipping any that are
/// already inside a `style {}` context.
pub fn migrate_d2_styles(source: &str) -> String {
    // Stack: true = current brace scope is a `style {}` block
    let mut style_stack: Vec<bool> = Vec::new();
    // Pending bare style property lines waiting to be flushed as `style {}`
    let mut pending: Vec<String> = Vec::new();
    let mut result: Vec<String> = Vec::new();

    for line in source.lines() {
        let trimmed = line.trim();

        // Closing brace: flush pending before exiting the block
        if trimmed == "}" {
            flush_style_group(&mut result, &mut pending);
            style_stack.pop();
            result.push(line.to_string());
            continue;
        }

        // Opening brace: flush pending, then push whether this is a style block
        if trimmed.ends_with('{') {
            flush_style_group(&mut result, &mut pending);
            let is_style = trimmed == "style {" || trimmed == "style: {";
            style_stack.push(is_style);
            result.push(line.to_string());
            continue;
        }

        // Check if we're currently inside a `style {}` scope
        let in_style_scope = style_stack.last().copied().unwrap_or(false);

        // Bare style property outside a style block → collect for grouping
        if !in_style_scope
            && let Some(caps) = BARE_STYLE_PROP_RE.captures(line) {
                let prop_indent = caps[1].len();
                // Flush if the indentation changes (different parent block)
                if !pending.is_empty() {
                    let prev_indent: usize = pending[0]
                        .chars()
                        .take_while(|c| c.is_whitespace())
                        .count();
                    if prev_indent != prop_indent {
                        flush_style_group(&mut result, &mut pending);
                    }
                }
                pending.push(line.to_string());
                continue;
            }

        // Non-style line: flush any accumulated style props first
        flush_style_group(&mut result, &mut pending);
        result.push(line.to_string());
    }

    // Flush anything remaining
    flush_style_group(&mut result, &mut pending);

    result.join("\n")
}

/// Emit the pending bare style properties wrapped in a `style {}` block.
fn flush_style_group(result: &mut Vec<String>, pending: &mut Vec<String>) {
    if pending.is_empty() {
        return;
    }
    // Derive indentation from the first pending line
    let indent: String = pending[0]
        .chars()
        .take_while(|c| c.is_whitespace())
        .collect();

    result.push(format!("{indent}style {{"));
    for prop in pending.drain(..) {
        // Re-emit at original indentation; the `style {` wrapper provides the extra level
        let content = prop.trim_start();
        result.push(format!("{indent}  {content}"));
    }
    result.push(format!("{indent}}}"));
}

/// All output formats supported by the `d2` CLI.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum D2Format {
    Svg,
    Png,
    Gif,
    Pdf,
    Pptx,
    Txt,
    Ascii,
}

impl D2Format {
    /// Parse from the info-string word after the language tag (e.g. `` ```d2 png ``).
    pub fn parse_format(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "png"  => Self::Png,
            "gif"  => Self::Gif,
            "pdf"  => Self::Pdf,
            "pptx" => Self::Pptx,
            "txt"  => Self::Txt,
            "ascii"=> Self::Ascii,
            _      => Self::Svg,
        }
    }

    /// The `--stdout-format` argument value recognised by the d2 CLI.
    pub fn as_cli_arg(self) -> &'static str {
        match self {
            Self::Svg   => "svg",
            Self::Png   => "png",
            Self::Gif   => "gif",
            Self::Pdf   => "pdf",
            Self::Pptx  => "pptx",
            Self::Txt   => "txt",
            Self::Ascii => "ascii",
        }
    }

    /// File extension to use when writing the output to disk.
    pub fn extension(self) -> &'static str {
        match self {
            Self::Ascii => "txt", // ascii mode produces a text file
            Self::Svg   => "svg",
            Self::Png   => "png",
            Self::Gif   => "gif",
            Self::Pdf   => "pdf",
            Self::Pptx  => "pptx",
            Self::Txt   => "txt",
        }
    }

    /// True for formats that produce binary output (not UTF-8 text).
    pub fn is_binary(self) -> bool {
        matches!(self, Self::Png | Self::Gif | Self::Pdf | Self::Pptx)
    }

    /// True for ASCII/text diagram formats.
    pub fn is_text_art(self) -> bool {
        matches!(self, Self::Txt | Self::Ascii)
    }
}

/// Render D2 source to raw bytes via the `d2` CLI.
///
/// Pipes source through stdin and reads the result from stdout.
/// `format` controls the output type; `theme` is the D2 theme ID and is
/// only meaningful for SVG output. `font_path` is an optional `.ttf` for
/// Korean text rendering.
pub fn render_d2_bytes(
    source: &str,
    format: D2Format,
    theme: Option<&str>,
    font_path: Option<&str>,
) -> Result<Vec<u8>> {
    // Auto-migrate old bare style properties to `style {}` blocks (D2 v0.6+ requirement)
    let migrated = migrate_d2_styles(source);
    let source = migrated.as_str();

    let mut cmd = Command::new("d2");
    cmd.arg("--stdout-format").arg(format.as_cli_arg());
    cmd.arg("-").arg("-"); // stdin -> stdout
    if let Some(t) = theme {
        cmd.arg("--theme").arg(t);
    }
    if let Some(font) = font_path {
        cmd.arg("--font-regular").arg(font);
    }
    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn().context("failed to spawn d2 — is it installed?")?;

    child
        .stdin
        .take()
        .context("d2 process stdin was not piped")?
        .write_all(source.as_bytes())
        .context("failed to write to d2 stdin")?;

    let output = child
        .wait_with_output()
        .context("failed to read d2 output")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        bail!("d2 failed (exit {}): {}", output.status, stderr);
    }

    Ok(output.stdout)
}

/// Render D2 source to an SVG string (convenience wrapper over `render_d2_bytes`).
///
/// `theme` is a D2 theme ID (e.g. `"0"` for default light, `"200"` for Terminal dark).
pub fn render_d2(source: &str, theme: &str, font_path: Option<&str>) -> Result<String> {
    let bytes = render_d2_bytes(source, D2Format::Svg, Some(theme), font_path)?;
    String::from_utf8(bytes).context("d2 SVG output was not valid UTF-8")
}
