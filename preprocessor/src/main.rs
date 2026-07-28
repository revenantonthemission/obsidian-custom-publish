use clap::Parser;
use std::path::PathBuf;

use obsidian_press::linker::resolve_links;
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
    println!("Found {} posts", index.posts.len());

    println!("Resolving links...");
    let graph = resolve_links(&index);

    println!("Writing output to {:?}", cli.output);
    write_output(&index, &graph, &cli.output)?;

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
