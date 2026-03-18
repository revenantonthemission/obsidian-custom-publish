use anyhow::{Context, Result, bail};
use std::io::Write;
use tempfile::NamedTempFile;

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

/// Render Mermaid source to SVG via the `mmdc` CLI.
///
/// Writes source to a temp file, runs mmdc to produce SVG output.
/// `theme` is a Mermaid theme name (e.g. "default" for light, "dark" for dark).
pub fn render_mermaid(source: &str, theme: &str) -> Result<String> {
    let source = ensure_mermaid_header(source);
    let mut input = NamedTempFile::with_suffix(".mmd")
        .context("failed to create temp input file")?;
    input
        .write_all(source.as_bytes())
        .context("failed to write mermaid source")?;

    let output_file = NamedTempFile::with_suffix(".svg")
        .context("failed to create temp output file")?;
    let output_path = output_file.path().to_path_buf();

    let result = std::process::Command::new("mmdc")
        .arg("-i")
        .arg(input.path())
        .arg("-o")
        .arg(&output_path)
        .arg("-b")
        .arg("transparent")
        .arg("-t")
        .arg(theme)
        .output()
        .context("failed to spawn mmdc — is @mermaid-js/mermaid-cli installed?")?;

    if !result.status.success() {
        let stderr = String::from_utf8_lossy(&result.stderr);
        bail!("mmdc failed (exit {}): {}", result.status, stderr);
    }

    std::fs::read_to_string(&output_path).context("failed to read mermaid SVG output")
}
