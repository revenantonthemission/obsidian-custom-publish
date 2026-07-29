use clap::Parser;
use std::path::PathBuf;

use obsidian_press::catalog::{PublicationCatalog, report_diagnostics};
use obsidian_press::output::write_output;
use obsidian_press::scanner::{scan_vault, stamp_published_dates};

#[derive(Parser)]
#[command(name = "obsidian-press")]
#[command(about = "Obsidian vault to static site preprocessor")]
struct Cli {
    /// Path to the Obsidian vault
    vault: PathBuf,
    /// Output directory
    output: PathBuf,
    /// Stamp today's date as `published` in vault files that lack it
    #[arg(long)]
    stamp_published: bool,
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    if cli.stamp_published {
        println!("Stamping published dates...");
        let count = stamp_published_dates(&cli.vault)?;
        println!("Stamped {count} posts with published date");
    }

    println!("Scanning vault: {:?}", cli.vault);
    let index = scan_vault(&cli.vault)?;
    println!("Found {} sources", index.posts.len());

    // Stage 1: scope + cardinality. Stage 2: homepage-target references.
    // Each stage reports its full batch and fails before any output write
    // (BR-U2-023/024); a failed run leaves the previous output untouched.
    let catalog = match PublicationCatalog::build(index) {
        Ok(catalog) => catalog,
        Err(diags) => {
            report_diagnostics(&diags);
            std::process::exit(1);
        }
    };
    let reference_diags = catalog.validate_references();
    if !reference_diags.is_empty() {
        report_diagnostics(&reference_diags);
        std::process::exit(1);
    }
    println!("Homepage source: {}", catalog.homepage().title);

    println!("Writing output to {:?}", cli.output);
    if let Err(e) = write_output(&catalog, &cli.output) {
        eprintln!("{e:#}");
        std::process::exit(1);
    }

    // Output is written first on purpose: the operator should be able to
    // inspect exactly what was produced. But a run that dropped diagrams must
    // not report success — 65 missing diagrams reached production behind a
    // green build precisely because these were warnings and nothing read them.
    let failures = obsidian_press::transform::diagram_failure_count();
    if failures > 0 {
        anyhow::bail!(
            "{failures} diagram render(s) failed; output is incomplete and must not be published. \
             mmdc needs a browser: set PUPPETEER_EXECUTABLE_PATH, or run \
             `npx puppeteer browsers install chrome-headless-shell`."
        );
    }

    println!("Done.");
    Ok(())
}
