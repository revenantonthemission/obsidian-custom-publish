use anyhow::{Context, Result};
use serde::Serialize;
use std::fs;
use std::path::Path;

use crate::nav_tree::build_nav_tree;
use crate::preview::build_previews;
use crate::search::build_search_index;
use crate::transform::transform_content_with_assets;
use crate::types::{LinkGraph, VaultIndex};

/// Per-post metadata written to `meta/{slug}.json`.
#[derive(Debug, Serialize)]
struct OutputMeta {
    slug: String,
    title: String,
    tags: Vec<String>,
    created: Option<String>,
    published: Option<String>,
    backlinks: Vec<String>,
    forward_links: Vec<String>,
    is_hub: bool,
    hub_parent: Option<String>,
    reading_time_min: usize,
    word_count: usize,
}

/// Write all preprocessor output to the given directory.
///
/// Creates:
/// - `posts/{slug}.md` — transformed markdown
/// - `meta/{slug}.json` — post metadata
/// - `assets/` — rendered diagram SVGs
/// - `graph.json` — node/edge graph for visualization
/// - `search-index.json` — inverted index for Korean FTS
pub fn write_output(index: &VaultIndex, graph: &LinkGraph, output_dir: &Path) -> Result<()> {
    // Create directory structure
    let posts_dir = output_dir.join("posts");
    let meta_dir = output_dir.join("meta");
    let assets_dir = output_dir.join("assets");
    fs::create_dir_all(&posts_dir).context("failed to create posts dir")?;
    fs::create_dir_all(&meta_dir).context("failed to create meta dir")?;
    fs::create_dir_all(&assets_dir).context("failed to create assets dir")?;

    // Write each post
    for (i, post) in index.posts.iter().enumerate() {
        let (content, images) = transform_content_with_assets(index, i, Some(&assets_dir));

        // Write transformed markdown
        let md_path = posts_dir.join(format!("{}.md", post.slug));
        fs::write(&md_path, &content)
            .with_context(|| format!("failed to write {}", md_path.display()))?;

        // Copy referenced images from vault attachment/ directory to assets/
        for image_filename in &images {
            let dest = assets_dir.join(image_filename);
            if !dest.exists() {
                if let Some(src) = find_attachment(&post.file_path, image_filename) {
                    if let Err(e) = fs::copy(&src, &dest) {
                        eprintln!(
                            "warning: failed to copy image {} -> {}: {e}",
                            src.display(),
                            dest.display()
                        );
                    }
                } else {
                    eprintln!("warning: attachment not found: {image_filename}");
                }
            }
        }

        // Calculate stats
        let word_count = count_words(&content);
        let reading_time_min = (word_count / 200).max(1);

        // Collect link info (deduplicated)
        let mut forward: Vec<String> = graph.forward_links[i]
            .iter()
            .map(|l| l.target_slug.clone())
            .collect();
        forward.sort();
        forward.dedup();
        let backlinks = graph.backlinks[i].clone();

        // Write metadata JSON
        let meta = OutputMeta {
            slug: post.slug.clone(),
            title: post.title.clone(),
            tags: post.tags.clone(),
            created: post.created.clone(),
            published: post.published.clone(),
            backlinks,
            forward_links: forward,
            is_hub: post.is_hub,
            hub_parent: post.hub_parent.clone(),
            reading_time_min,
            word_count,
        };

        let meta_path = meta_dir.join(format!("{}.json", post.slug));
        let json = serde_json::to_string_pretty(&meta)
            .context("failed to serialize post metadata")?;
        fs::write(&meta_path, json)
            .with_context(|| format!("failed to write {}", meta_path.display()))?;
    }

    // Write graph.json
    let graph_json = graph.to_graph_json(index);
    let graph_path = output_dir.join("graph.json");
    fs::write(
        &graph_path,
        serde_json::to_string_pretty(&graph_json).context("failed to serialize graph")?,
    )
    .context("failed to write graph.json")?;

    // Write search-index.json
    let search = build_search_index(index);
    let search_path = output_dir.join("search-index.json");
    fs::write(
        &search_path,
        serde_json::to_string(&search).context("failed to serialize search index")?,
    )
    .context("failed to write search-index.json")?;

    // Write previews.json
    let previews = build_previews(index);
    let previews_path = output_dir.join("previews.json");
    fs::write(
        &previews_path,
        serde_json::to_string_pretty(&previews)
            .context("failed to serialize previews")?,
    )
    .context("failed to write previews.json")?;

    // Write nav-tree.json
    let nav_tree = build_nav_tree(index, graph);
    let nav_tree_path = output_dir.join("nav-tree.json");
    fs::write(
        &nav_tree_path,
        serde_json::to_string_pretty(&nav_tree).context("failed to serialize nav tree")?,
    )
    .context("failed to write nav-tree.json")?;

    println!(
        "Output written: {} posts, {} meta files",
        index.posts.len(),
        index.posts.len()
    );

    Ok(())
}

/// Count words in content (handles both Korean and English).
/// Korean (Hangul) is alphabetic, not logographic — space-separated tokens are words.
fn count_words(text: &str) -> usize {
    text.split_whitespace()
        .filter(|w| !w.is_empty())
        .count()
}

/// Walk up from the post's directory looking for `attachment/{filename}`.
fn find_attachment(post_path: &Path, filename: &str) -> Option<std::path::PathBuf> {
    let mut dir = post_path.parent()?;
    loop {
        let candidate = dir.join("attachment").join(filename);
        if candidate.exists() {
            return Some(candidate);
        }
        dir = dir.parent()?;
    }
}
