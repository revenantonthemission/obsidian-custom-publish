use anyhow::{Context, Result, bail};
use std::io::Write;
use std::process::{Command, Stdio};

/// Render D2 source to SVG via the `d2` CLI.
///
/// Pipes source through stdin and reads SVG from stdout (`d2 - -`).
/// Optionally accepts a font path for Korean text rendering.
pub fn render_d2(source: &str, font_path: Option<&str>) -> Result<String> {
    let mut cmd = Command::new("d2");
    cmd.arg("-").arg("-"); // stdin -> stdout
    cmd.arg("--theme").arg("200"); // terminal theme, clean
    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(font) = font_path {
        cmd.arg("--font-regular").arg(font);
    }

    let mut child = cmd.spawn().context("failed to spawn d2 — is it installed?")?;

    // Write source to stdin
    child
        .stdin
        .take()
        .unwrap()
        .write_all(source.as_bytes())
        .context("failed to write to d2 stdin")?;

    let output = child
        .wait_with_output()
        .context("failed to read d2 output")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        bail!("d2 failed (exit {}): {}", output.status, stderr);
    }

    String::from_utf8(output.stdout).context("d2 output was not valid UTF-8")
}
