use clap::Parser;
use std::path::PathBuf;

use obsidian_press::linker::resolve_links;
use obsidian_press::output::write_output;
use obsidian_press::scanner::scan_vault;

#[derive(Parser)]
#[command(name = "obsidian-press")]
#[command(about = "Obsidian vault to static site preprocessor")]
struct Cli {
    /// Path to the Obsidian vault
    vault: PathBuf,
    /// Output directory
    output: PathBuf,
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

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
