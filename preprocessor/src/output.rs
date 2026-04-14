use anyhow::{Context, Result};
use serde::Serialize;
use std::fs;
use std::path::Path;

use crate::nav_tree::build_nav_tree;
use crate::preview::build_previews;
use crate::related::compute_related;
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
    updated: Option<String>,
    backlinks: Vec<String>,
    forward_links: Vec<String>,
    is_hub: bool,
    hub_parent: Option<String>,
    description: Option<String>,
    reading_time_min: usize,
    word_count: usize,
    related_posts: Vec<String>,
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
    let posts_dir = output_dir.join("posts");
    let meta_dir = output_dir.join("meta");
    let assets_dir = output_dir.join("assets");
    fs::create_dir_all(&posts_dir).context("failed to create posts dir")?;
    fs::create_dir_all(&meta_dir).context("failed to create meta dir")?;
    fs::create_dir_all(&assets_dir).context("failed to create assets dir")?;

    let all_related = compute_related(index, graph, 5);

    write_posts(index, graph, &posts_dir, &meta_dir, &assets_dir, &all_related)?;
    write_global_artifacts(index, graph, output_dir)?;

    println!(
        "Output written: {} posts, {} meta files",
        index.posts.len(),
        index.posts.len()
    );

    Ok(())
}

/// Transform each post, write markdown + metadata JSON, and copy referenced images.
fn write_posts(
    index: &VaultIndex,
    graph: &LinkGraph,
    posts_dir: &Path,
    meta_dir: &Path,
    assets_dir: &Path,
    all_related: &[Vec<String>],
) -> Result<()> {
    for (i, post) in index.posts.iter().enumerate() {
        let (content, images) = transform_content_with_assets(index, i, Some(assets_dir));

        // Write transformed markdown
        let md_path = posts_dir.join(format!("{}.md", post.slug));
        fs::write(&md_path, &content)
            .with_context(|| format!("failed to write {}", md_path.display()))?;

        // Copy referenced images from vault attachment/ directory
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

        // Calculate stats and write metadata
        const WORDS_PER_MINUTE: usize = 200;
        let word_count = count_words(&content);
        let reading_time_min = (word_count / WORDS_PER_MINUTE).max(1);

        let mut forward: Vec<String> = graph.forward_links[i]
            .iter()
            .map(|l| l.target_slug.clone())
            .collect();
        forward.sort();
        forward.dedup();

        let meta = OutputMeta {
            slug: post.slug.clone(),
            title: post.title.clone(),
            tags: post.tags.clone(),
            created: post.created.clone(),
            published: post.published.clone(),
            updated: post.updated.clone(),
            backlinks: graph.backlinks[i].clone(),
            forward_links: forward,
            is_hub: post.is_hub,
            hub_parent: post.hub_parent.clone(),
            description: post.description.clone(),
            reading_time_min,
            word_count,
            related_posts: all_related[i].clone(),
        };

        let meta_path = meta_dir.join(format!("{}.json", post.slug));
        let json = serde_json::to_string_pretty(&meta)
            .context("failed to serialize post metadata")?;
        fs::write(&meta_path, json)
            .with_context(|| format!("failed to write {}", meta_path.display()))?;
    }
    Ok(())
}

/// Write global artifact files: graph, search index, previews, nav tree.
fn write_global_artifacts(index: &VaultIndex, graph: &LinkGraph, output_dir: &Path) -> Result<()> {
    let graph_json = graph.to_graph_json(index);
    fs::write(
        output_dir.join("graph.json"),
        serde_json::to_string_pretty(&graph_json).context("failed to serialize graph")?,
    )
    .context("failed to write graph.json")?;

    let search = build_search_index(index);
    fs::write(
        output_dir.join("search-index.json"),
        serde_json::to_string(&search).context("failed to serialize search index")?,
    )
    .context("failed to write search-index.json")?;

    let previews = build_previews(index);
    fs::write(
        output_dir.join("previews.json"),
        serde_json::to_string_pretty(&previews).context("failed to serialize previews")?,
    )
    .context("failed to write previews.json")?;

    let nav_tree = build_nav_tree(index, graph);
    fs::write(
        output_dir.join("nav-tree.json"),
        serde_json::to_string_pretty(&nav_tree).context("failed to serialize nav tree")?,
    )
    .context("failed to write nav-tree.json")?;

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
/// Bounded to 10 levels to prevent traversing to filesystem root.
fn find_attachment(post_path: &Path, filename: &str) -> Option<std::path::PathBuf> {
    let mut dir = post_path.parent()?;
    for _ in 0..10 {
        let candidate = dir.join("attachment").join(filename);
        if candidate.exists() {
            return Some(candidate);
        }
        dir = dir.parent()?;
    }
    None
}
