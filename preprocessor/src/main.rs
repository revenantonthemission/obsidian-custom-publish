use clap::Parser;
use std::path::{Path, PathBuf};

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
    /// Stamp today's date as `published` in posts-folder notes that lack it
    #[arg(long)]
    stamp_published: bool,
}

/// RunCoordinator (U1 security-design §6, L5): guard → notice → scan →
/// catalog → stamp → rescan if anything was stamped → catalog → write.
/// No vault write or output deletion happens before the guard and the first
/// full catalog pass succeed (BR4.1; NFR5.5).
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

    let mut catalog = scan_and_check(&cli.vault, &folders.notes, pages_root, true)?;

    if cli.stamp_published {
        // Stamping walks NOTES only and writes only files the walker yielded
        // (BR4.2; NFR5.6). It reports how many files it rewrote, so the second
        // scan runs only when something changed (performance-design §1).
        println!("Stamping published dates...");
        let count = stamp_published_dates(&folders.notes)?;
        println!("Stamped {count} posts with published date");
        if count > 0 {
            // Silent rescan: skipped links were reported by the first scan.
            catalog = scan_and_check(&cli.vault, &folders.notes, pages_root, false)?;
        }
    }

    println!("Writing output to {:?}", cli.output);
    if let Err(e) = write_output(&catalog, &folders.output) {
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

/// Scan both folders and build the catalog. Every catalog finding is reported
/// in one sorted batch and exits 1 before anything is stamped or written
/// (BR2.7). `first` marks the first scan: only it reports skipped links and
/// the empty-pages notice, so a stamping run never repeats them.
fn scan_and_check(
    shown_vault: &Path,
    notes: &Path,
    pages_root: Option<&Path>,
    first: bool,
) -> anyhow::Result<PublicationCatalog> {
    println!("Scanning vault: {shown_vault:?}");
    let scan = scan_sources(notes, pages_root, first)?;
    println!(
        "Found {} sources ({} site pages)",
        scan.index.posts.len(),
        scan.page_count
    );
    // "Empty" is decided after the PAGES walk, so it uses exactly the walker's
    // skip rules (reliability-design §2).
    if first
        && let Some(path) = pages_root
        && scan.page_count == 0
    {
        eprintln!("{}", pages_empty_notice(path));
    }

    match PublicationCatalog::build(scan.index) {
        Ok(catalog) => Ok(catalog),
        Err(diags) => {
            report_diagnostics(&diags);
            std::process::exit(1);
        }
    }
}
