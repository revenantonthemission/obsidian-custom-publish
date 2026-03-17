use anyhow::{Context, Result, bail};
use std::io::Write;
use tempfile::NamedTempFile;

/// Render Typst source to SVG via the `typst` CLI.
///
/// Writes source to a temp file, compiles to SVG, reads result.
pub fn render_typst(source: &str) -> Result<String> {
    // Write source to a temp .typ file
    let mut input = NamedTempFile::with_suffix(".typ")
        .context("failed to create temp input file")?;
    input
        .write_all(source.as_bytes())
        .context("failed to write typst source")?;

    // Create temp output path for SVG
    let output_file = NamedTempFile::with_suffix(".svg")
        .context("failed to create temp output file")?;
    let output_path = output_file.path().to_path_buf();

    let result = std::process::Command::new("typst")
        .arg("compile")
        .arg(input.path())
        .arg(&output_path)
        .output()
        .context("failed to spawn typst — is it installed?")?;

    if !result.status.success() {
        let stderr = String::from_utf8_lossy(&result.stderr);
        bail!("typst failed (exit {}): {}", result.status, stderr);
    }

    std::fs::read_to_string(&output_path).context("failed to read typst SVG output")
}
