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

    println!("Done.");
    Ok(())
}
