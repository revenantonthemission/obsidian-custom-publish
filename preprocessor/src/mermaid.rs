use anyhow::{Context, Result, bail};
use regex::Regex;
use std::io::Write;
use std::path::PathBuf;
use std::sync::LazyLock;
use tempfile::NamedTempFile;

/// Resolve the absolute path to `mmdc` once at startup.
/// Checks common install locations if `which` fails (e.g. non-login shells).
static MMDC_PATH: LazyLock<Option<PathBuf>> = LazyLock::new(|| {
    // Try `which` first (works in interactive shells)
    if let Ok(output) = std::process::Command::new("which").arg("mmdc").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Some(PathBuf::from(path));
            }
        }
    }

    // Fallback: check common Homebrew/npm global install locations
    let candidates = [
        "/opt/homebrew/bin/mmdc",
        "/usr/local/bin/mmdc",
        "/opt/homebrew/Cellar/node/25.9.0_2/bin/mmdc",
    ];
    for candidate in candidates {
        let path = PathBuf::from(candidate);
        if path.exists() {
            return Some(path);
        }
    }

    None
});

static INIT_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"%%\{[\s\S]*?\}%%").unwrap());

static THEME_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?:'theme'\s*:\s*'[^']*'|"theme"\s*:\s*"[^"]*")"#).unwrap()
});

/// Infer and prepend a Mermaid diagram-type header when one is missing.
///
/// Older vault notes may omit the type keyword (e.g. `sequenceDiagram`)
/// that modern mmdc requires. We detect the diagram type from content cues.
fn ensure_mermaid_header(source: &str) -> String {
    let first_line = source.lines().next().unwrap_or("").trim();

    // Already has a valid type declaration — pass through unchanged
    let known_types = [
        "graph", "flowchart", "sequenceDiagram", "classDiagram", "stateDiagram",
        "erDiagram", "journey", "gantt", "pie", "gitGraph", "mindmap",
        "timeline", "xychart-beta", "block-beta", "packet-beta",
        "architecture-beta", "quadrantChart", "requirementDiagram",
        "%%{", "---",
    ];
    if known_types.iter().any(|t| first_line.starts_with(t)) {
        return source.to_string();
    }

    // Detect sequence diagram: starts with participant/actor/Note keywords
    let is_sequence = source.lines().any(|l| {
        let t = l.trim();
        t.starts_with("participant ")
            || t.starts_with("actor ")
            || t.starts_with("Note ")
            || t.starts_with("loop ")
            || t.starts_with("alt ")
            || t.starts_with("activate ")
            || t.contains("->>")
            || t.contains("-->>")
            || t.contains("-x")
            || t.contains("->")
    });
    if is_sequence {
        return format!("sequenceDiagram\n{source}");
    }

    // Detect mindmap: starts with `root(`
    if source.trim_start().starts_with("root(") || source.trim_start().starts_with("root ") {
        return format!("mindmap\n{source}");
    }

    // Unknown — pass through and let mmdc produce its own error message
    source.to_string()
}

/// Inject the desired theme into the source's `%%{init}%%` directive,
/// or strip it and let the `-t` CLI flag handle theming.
///
/// When a `%%{init}%%` directive sets its own theme, the `-t` CLI flag
/// conflicts and can break diagram type detection. We resolve this by
/// replacing the theme inside the directive so `-t` is not needed.
fn apply_theme_to_source(source: &str, theme: &str) -> (String, bool) {
    if !source.contains("%%{") {
        return (source.to_string(), false);
    }

    let result = INIT_RE.replace(source, |caps: &regex::Captures| {
        let init_block = &caps[0];
        // Replace 'theme': '...' or "theme": "..." with the desired theme
        if THEME_RE.is_match(init_block) {
            THEME_RE.replace(init_block, format!("'theme': '{theme}'")).to_string()
        } else {
            // No theme key — inject one after the opening %%{init: {
            init_block.replacen("{", &format!("{{ 'theme': '{theme}',"), 2)
        }
    });

    (result.to_string(), true)
}

/// Render Mermaid source to SVG via the `mmdc` CLI.
///
/// Writes source to a temp file, runs mmdc to produce SVG output.
/// `theme` is a Mermaid theme name (e.g. "default" for light, "dark" for dark).
pub fn render_mermaid(source: &str, theme: &str) -> Result<String> {
    let source = ensure_mermaid_header(source);
    let (source, has_init) = apply_theme_to_source(&source, theme);

    let mut input = NamedTempFile::with_suffix(".mmd")
        .context("failed to create temp input file")?;
    input
        .write_all(source.as_bytes())
        .context("failed to write mermaid source")?;

    let output_file = NamedTempFile::with_suffix(".svg")
        .context("failed to create temp output file")?;
    let output_path = output_file.path().to_path_buf();

    let mmdc = MMDC_PATH.as_ref()
        .context("mmdc not found — install with: npm install -g @mermaid-js/mermaid-cli")?;

    let mut cmd = std::process::Command::new(mmdc);
    cmd.arg("-i")
        .arg(input.path())
        .arg("-o")
        .arg(&output_path)
        .arg("-b")
        .arg("transparent");

    // Only pass -t when there's no %%{init}%% directive (avoid conflicts)
    if !has_init {
        cmd.arg("-t").arg(theme);
    }

    let result = cmd
        .output()
        .with_context(|| format!("failed to spawn mmdc at {}", mmdc.display()))?;

    if !result.status.success() {
        let stderr = String::from_utf8_lossy(&result.stderr);
        bail!("mmdc failed (exit {}): {}", result.status, stderr);
    }

    std::fs::read_to_string(&output_path).context("failed to read mermaid SVG output")
}
