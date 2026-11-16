use clap::Parser;
use std::path::PathBuf;

use obsidian_press::boundary::{
    PagesFolder, pages_empty_notice, pages_missing_notice, pages_not_given_notice,
    resolve_run_folders,
};
use obsidian_press::catalog::{PublicationCatalog, report_diagnostics};
use obsidian_press::output::write_output;
use obsidian_press::scanner::{scan_sources, stamp_published_dates};

#[derive(Parser)]
#[command(name = "obsidian-press")]
#[command(about = "Obsidian vault to static site preprocessor")]
struct Cli {
    /// Posts folder of the Obsidian vault (Areas/Notes)
    #[arg(value_name = "NOTES")]
    vault: PathBuf,
    /// Output directory
    output: PathBuf,
    /// Site pages folder (Areas/Pages); optional, never stamped
    #[arg(long, value_name = "PAGES")]
    pages: Option<PathBuf>,
    /// Stamp today's date as `published` in vault files that lack it
    #[arg(long)]
    stamp_published: bool,
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    // BoundaryGuard first: nothing is read, stamped or deleted until the three
    // folders are known not to overlap (BR1.2, BR1.3; NFR5.4).
    let folders = match resolve_run_folders(&cli.vault, cli.pages.as_deref(), &cli.output) {
        Ok(folders) => folders,
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(error.exit_code());
        }
    };

    // At most one pages notice before the scan (BR1.3; NFR5.10, NFR5.15).
    let pages_root = match &folders.pages {
        PagesFolder::NotGiven => {
            eprintln!("{}", pages_not_given_notice());
            None
        }
        PagesFolder::Missing(path) => {
            eprintln!("{}", pages_missing_notice(path));
            None
        }
        PagesFolder::Present(path) => Some(path.as_path()),
    };

    if cli.stamp_published {
        println!("Stamping published dates...");
        let count = stamp_published_dates(&folders.notes)?;
        println!("Stamped {count} posts with published date");
    }

    println!("Scanning vault: {:?}", cli.vault);
    let scan = scan_sources(&folders.notes, pages_root, true)?;
    println!(
        "Found {} sources ({} site pages)",
        scan.index.posts.len(),
        scan.page_count
    );
    // "Empty" is decided after the PAGES walk, so it uses exactly the walker's
    // skip rules (reliability-design §2).
    if let Some(path) = pages_root
        && scan.page_count == 0
    {
        eprintln!("{}", pages_empty_notice(path));
    }
    let index = scan.index;

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
    let failures = obsidian_press::transform::diagram_failures();
    if !failures.is_empty() {
        anyhow::bail!(obsidian_press::transform::diagram_failure_message(
            &failures
        ));
    }

    println!("Done.");
    Ok(())
}
