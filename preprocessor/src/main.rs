use clap::Parser;
use std::path::PathBuf;

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
    println!("Vault: {:?}", cli.vault);
    println!("Output: {:?}", cli.output);
    Ok(())
}
