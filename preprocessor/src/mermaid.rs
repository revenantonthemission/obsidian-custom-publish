use anyhow::{Context, Result, bail};
use std::io::Write;
use tempfile::NamedTempFile;

/// Render Mermaid source to SVG via the `mmdc` CLI.
///
/// Writes source to a temp file, runs mmdc to produce SVG output.
/// `theme` is a Mermaid theme name (e.g. "default" for light, "dark" for dark).
pub fn render_mermaid(source: &str, theme: &str) -> Result<String> {
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
