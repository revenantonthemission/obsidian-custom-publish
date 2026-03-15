use clap::Parser;
use std::path::PathBuf;

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
    let index = scan_vault(&cli.vault)?;
    println!("Scanned {} posts", index.posts.len());
    for post in &index.posts {
        println!("  {} ({}){}", post.slug, post.tags.join(", "),
            if post.is_hub { " [hub]" } else { "" });
    }
    Ok(())
}
