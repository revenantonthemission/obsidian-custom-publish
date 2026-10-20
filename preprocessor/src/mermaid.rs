use anyhow::{Context, Result, bail};
use regex::Regex;
use std::ffi::OsString;
use std::io::Write;
use std::path::{Path, PathBuf};
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

/// Optional puppeteer JSON config (e.g. `executablePath` for system Chrome).
/// Looked up once at startup, relative to the preprocessor's cwd.
static PUPPETEER_CONFIG_PATH: LazyLock<Option<PathBuf>> =
    LazyLock::new(|| puppeteer_config_in(Path::new(".")));

/// The `.puppeteer-config.json` in `dir`, as an absolute path, when it exists.
fn puppeteer_config_in(dir: &Path) -> Option<PathBuf> {
    let path = dir.join(".puppeteer-config.json");
    if path.exists() {
        path.canonicalize().ok()
    } else {
        None
    }
}

/// The arguments `mmdc` runs with. `-p` passes the puppeteer config when
/// there is one (a029615). `theme` is `None` when the source's own
/// `%%{init}%%` directive sets the theme, because `-t` would conflict with it.
fn mmdc_args(
    input: &Path,
    output: &Path,
    puppeteer_config: Option<&Path>,
    theme: Option<&str>,
) -> Vec<OsString> {
    let mut args: Vec<OsString> = vec![
        "-i".into(),
        input.into(),
        "-o".into(),
        output.into(),
        "-b".into(),
        "transparent".into(),
    ];
    if let Some(config) = puppeteer_config {
        args.extend(["-p".into(), config.into()]);
    }
    if let Some(theme) = theme {
        args.extend(["-t".into(), theme.into()]);
    }
    args
}

static INIT_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"%%\{[\s\S]*?\}%%").unwrap());

static THEME_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?:'theme'\s*:\s*'[^']*'|"theme"\s*:\s*"[^"]*")"#).unwrap());

/// Infer and prepend a Mermaid diagram-type header when one is missing.
///
/// Older vault notes may omit the type keyword (e.g. `sequenceDiagram`)
/// that modern mmdc requires. We detect the diagram type from content cues.
fn ensure_mermaid_header(source: &str) -> String {
    let first_line = source.lines().next().unwrap_or("").trim();

    // Already has a valid type declaration — pass through unchanged
    let known_types = [
        "graph",
        "flowchart",
        "sequenceDiagram",
        "classDiagram",
        "stateDiagram",
        "erDiagram",
        "journey",
        "gantt",
        "pie",
        "gitGraph",
        "mindmap",
        "timeline",
        "xychart-beta",
        "block-beta",
        "packet-beta",
        "architecture-beta",
        "quadrantChart",
        "requirementDiagram",
        "%%{",
        "---",
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
            THEME_RE
                .replace(init_block, format!("'theme': '{theme}'"))
                .to_string()
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

    let mut input =
        NamedTempFile::with_suffix(".mmd").context("failed to create temp input file")?;
    input
        .write_all(source.as_bytes())
        .context("failed to write mermaid source")?;

    let output_file =
        NamedTempFile::with_suffix(".svg").context("failed to create temp output file")?;
    let output_path = output_file.path().to_path_buf();

    let mmdc = MMDC_PATH
        .as_ref()
        .context("mmdc not found — install with: npm install -g @mermaid-js/mermaid-cli")?;

    // Only pass -t when there's no %%{init}%% directive (avoid conflicts)
    let args = mmdc_args(
        input.path(),
        &output_path,
        PUPPETEER_CONFIG_PATH.as_deref(),
        (!has_init).then_some(theme),
    );
    let result = std::process::Command::new(mmdc)
        .args(args)
        .output()
        .with_context(|| format!("failed to spawn mmdc at {}", mmdc.display()))?;

    if !result.status.success() {
        let stderr = String::from_utf8_lossy(&result.stderr);
        bail!("mmdc failed (exit {}): {}", result.status, stderr);
    }

    std::fs::read_to_string(&output_path).context("failed to read mermaid SVG output")
}

// Regression tests for a029615 (the puppeteer config passed to mmdc with -p),
// added by the code-generation loop-back 1 repair (plan Step 50).
#[cfg(test)]
mod tests {
    use super::{mmdc_args, puppeteer_config_in};
    use std::ffi::OsString;
    use std::path::Path;

    fn strings(args: &[OsString]) -> Vec<String> {
        args.iter()
            .map(|arg| arg.to_string_lossy().into_owned())
            .collect()
    }

    #[test]
    fn mmdc_gets_the_puppeteer_config_with_p_when_the_file_exists() {
        let dir = tempfile::tempdir().expect("temp dir");
        let file = dir.path().join(".puppeteer-config.json");
        std::fs::write(&file, r#"{"executablePath":"/usr/bin/chrome"}"#).expect("config file");
        let expected = file.canonicalize().expect("canonical config path");

        let config = puppeteer_config_in(dir.path());
        assert_eq!(config.as_deref(), Some(expected.as_path()));

        let args = mmdc_args(
            Path::new("in.mmd"),
            Path::new("out.svg"),
            config.as_deref(),
            Some("default"),
        );
        assert_eq!(
            strings(&args),
            [
                "-i",
                "in.mmd",
                "-o",
                "out.svg",
                "-b",
                "transparent",
                "-p",
                expected.to_str().expect("UTF-8 path"),
                "-t",
                "default",
            ]
        );
    }

    #[test]
    fn mmdc_gets_no_p_when_no_puppeteer_config_exists() {
        let dir = tempfile::tempdir().expect("temp dir");

        let config = puppeteer_config_in(dir.path());
        assert_eq!(config, None);

        let args = mmdc_args(
            Path::new("in.mmd"),
            Path::new("out.svg"),
            config.as_deref(),
            Some("dark"),
        );
        assert!(!args.iter().any(|arg| arg == "-p"), "no -p in {args:?}");
        assert_eq!(
            strings(&args),
            [
                "-i",
                "in.mmd",
                "-o",
                "out.svg",
                "-b",
                "transparent",
                "-t",
                "dark"
            ]
        );
    }

    #[test]
    fn mmdc_gets_no_t_when_the_source_sets_its_own_theme() {
        let args = mmdc_args(Path::new("in.mmd"), Path::new("out.svg"), None, None);
        assert_eq!(
            strings(&args),
            ["-i", "in.mmd", "-o", "out.svg", "-b", "transparent"]
        );
    }
}
