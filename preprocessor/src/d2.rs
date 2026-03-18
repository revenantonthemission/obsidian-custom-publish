use anyhow::{Context, Result, bail};
use std::io::Write;
use std::process::{Command, Stdio};

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
    pub fn from_str(s: &str) -> Self {
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

    Ok(output.stdout)
}

/// Render D2 source to an SVG string (convenience wrapper over `render_d2_bytes`).
///
/// `theme` is a D2 theme ID (e.g. `"0"` for default light, `"200"` for Terminal dark).
pub fn render_d2(source: &str, theme: &str, font_path: Option<&str>) -> Result<String> {
    let bytes = render_d2_bytes(source, D2Format::Svg, Some(theme), font_path)?;
    String::from_utf8(bytes).context("d2 SVG output was not valid UTF-8")
}
