use anyhow::{Context, Result, anyhow};
use serde::Serialize;
use std::fs;
use std::path::Path;

use crate::catalog::PublicationCatalog;
use crate::linker::resolve_links;
use crate::nav_tree::build_nav_tree;
use crate::preview::build_previews;
use crate::related::compute_related;
use crate::search::build_search_index;
use crate::transform::transform_content_publication;
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

/// Dedicated homepage artifact metadata (BR-U2-032): deterministic minimum only —
/// no timestamps, no environment values.
#[derive(Debug, Serialize)]
struct HomepageMeta {
    title: String,
}

/// Write failure as a PUB007 diagnostic-shaped error (NFR-U2-005). The caller
/// prints the message verbatim to stderr and exits 1.
fn pub007(path: &Path, detail: impl std::fmt::Display) -> anyhow::Error {
    anyhow!("PUB007 {}: {}", path.display(), detail)
}

/// Write all preprocessor output for a validated catalog.
///
/// Order is validate → clean → write (PD-U2-03): this function runs only after
/// both diagnostic stages passed, cleans every managed namespace it owns, then
/// regenerates so the result is a function of the current catalog alone.
///
/// Creates:
/// - `posts/{slug}.md` + `meta/{slug}.json` — discoverable posts only
/// - `homepage/index.md` + `homepage/meta.json` — the dedicated homepage artifact
/// - `assets/` — rendered diagrams and referenced images
/// - `graph.json`, `search-index.json`, `previews.json`, `nav-tree.json` — post-only
/// - `manifest.json` — sorted inventory of every file written (itself excluded)
pub fn write_output(catalog: &PublicationCatalog, output_dir: &Path) -> Result<()> {
    // Discovery derives from the posts-only view exclusively; a homepage edge
    // cannot exist because the homepage is absent from its name_map.
    let posts = catalog.posts_only();
    let graph = resolve_links(posts);

    clean_managed_namespaces(output_dir)?;

    let posts_dir = output_dir.join("posts");
    let meta_dir = output_dir.join("meta");
    let assets_dir = output_dir.join("assets");
    let homepage_dir = output_dir.join("homepage");
    for dir in [&posts_dir, &meta_dir, &assets_dir, &homepage_dir] {
        fs::create_dir_all(dir).map_err(|e| pub007(dir, e))?;
    }

    let mut manifest: Vec<String> = Vec::new();
    let all_related = compute_related(posts, &graph, 5);

    write_posts(
        catalog,
        &graph,
        &posts_dir,
        &meta_dir,
        &assets_dir,
        &all_related,
        &mut manifest,
    )?;
    write_homepage(catalog, &homepage_dir, &assets_dir, &mut manifest)?;
    write_global_artifacts(posts, &graph, output_dir, &mut manifest)?;
    write_manifest(output_dir, manifest)?;

    println!(
        "Output written: {} posts, 1 homepage artifact",
        posts.posts.len()
    );

    Ok(())
}

/// Remove every managed output namespace so stale artifacts cannot survive a
/// publication change (BR-U2-026). Runs only after validation succeeded, so a
/// failed validation leaves the previous output untouched (BR-U2-024).
fn clean_managed_namespaces(output_dir: &Path) -> Result<()> {
    for dir in ["posts", "meta", "assets", "homepage"] {
        let path = output_dir.join(dir);
        if path.exists() {
            fs::remove_dir_all(&path).map_err(|e| pub007(&path, e))?;
        }
    }
    for file in [
        "graph.json",
        "search-index.json",
        "previews.json",
        "nav-tree.json",
        "manifest.json",
    ] {
        let path = output_dir.join(file);
        if path.exists() {
            fs::remove_file(&path).map_err(|e| pub007(&path, e))?;
        }
    }
    Ok(())
}

/// Transform each discoverable post, write markdown + metadata JSON, and copy
/// referenced images. Content is transformed against the full index so links to
/// the homepage resolve to `/` (BR-U2-013~017).
fn write_posts(
    catalog: &PublicationCatalog,
    graph: &LinkGraph,
    posts_dir: &Path,
    meta_dir: &Path,
    assets_dir: &Path,
    all_related: &[Vec<String>],
    manifest: &mut Vec<String>,
) -> Result<()> {
    let posts = catalog.posts_only();
    let full = catalog.full();

    for (i, post) in posts.posts.iter().enumerate() {
        let full_idx = *full.slug_map.get(&post.slug).with_context(|| {
            format!("catalog invariant broken: {} not in full index", post.slug)
        })?;
        let (content, images) = transform_content_publication(
            full,
            full_idx,
            Some(catalog.homepage_idx()),
            Some(assets_dir),
        );

        let md_path = posts_dir.join(format!("{}.md", post.slug));
        fs::write(&md_path, &content).map_err(|e| pub007(&md_path, e))?;
        manifest.push(format!("posts/{}.md", post.slug));

        copy_referenced_images(post, &images, assets_dir, manifest);

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
        let json = serde_json::to_string_pretty(&meta).map_err(|e| pub007(&meta_path, e))?;
        fs::write(&meta_path, json).map_err(|e| pub007(&meta_path, e))?;
        manifest.push(format!("meta/{}.json", post.slug));
    }
    Ok(())
}

/// Write the dedicated homepage artifact (BR-U2-030~032): transform-complete
/// markdown body plus the deterministic minimal metadata. The homepage is never
/// written under `posts/` or `meta/`.
fn write_homepage(
    catalog: &PublicationCatalog,
    homepage_dir: &Path,
    assets_dir: &Path,
    manifest: &mut Vec<String>,
) -> Result<()> {
    let (content, images) = transform_content_publication(
        catalog.full(),
        catalog.homepage_idx(),
        Some(catalog.homepage_idx()),
        Some(assets_dir),
    );

    let body_path = homepage_dir.join("index.md");
    fs::write(&body_path, &content).map_err(|e| pub007(&body_path, e))?;
    manifest.push("homepage/index.md".to_string());

    copy_referenced_images(catalog.homepage(), &images, assets_dir, manifest);

    let meta = HomepageMeta {
        title: catalog.homepage().title.clone(),
    };
    let meta_path = homepage_dir.join("meta.json");
    let json = serde_json::to_string_pretty(&meta).map_err(|e| pub007(&meta_path, e))?;
    fs::write(&meta_path, json).map_err(|e| pub007(&meta_path, e))?;
    manifest.push("homepage/meta.json".to_string());

    Ok(())
}

/// Copy referenced images from the vault `attachment/` directory into `assets/`.
fn copy_referenced_images(
    post: &crate::types::PostMeta,
    images: &[String],
    assets_dir: &Path,
    manifest: &mut Vec<String>,
) {
    for image_filename in images {
        let dest = assets_dir.join(image_filename);
        if !dest.exists() {
            if let Some(src) = find_attachment(&post.file_path, image_filename) {
                match fs::copy(&src, &dest) {
                    Ok(_) => manifest.push(format!("assets/{image_filename}")),
                    Err(e) => eprintln!(
                        "warning: failed to copy image {} -> {}: {e}",
                        src.display(),
                        dest.display()
                    ),
                }
            } else {
                eprintln!("warning: attachment not found: {image_filename}");
            }
        }
    }
}

/// Write global artifact files from the post-only view: graph, search index,
/// previews, nav tree (BR-U2-009 §2.1 matrix).
fn write_global_artifacts(
    index: &VaultIndex,
    graph: &LinkGraph,
    output_dir: &Path,
    manifest: &mut Vec<String>,
) -> Result<()> {
    let graph_path = output_dir.join("graph.json");
    let graph_json = graph.to_graph_json(index);
    fs::write(
        &graph_path,
        serde_json::to_string_pretty(&graph_json).map_err(|e| pub007(&graph_path, e))?,
    )
    .map_err(|e| pub007(&graph_path, e))?;
    manifest.push("graph.json".to_string());

    let search_path = output_dir.join("search-index.json");
    let search = build_search_index(index);
    fs::write(
        &search_path,
        serde_json::to_string(&search).map_err(|e| pub007(&search_path, e))?,
    )
    .map_err(|e| pub007(&search_path, e))?;
    manifest.push("search-index.json".to_string());

    let previews_path = output_dir.join("previews.json");
    let previews = build_previews(index);
    fs::write(
        &previews_path,
        serde_json::to_string_pretty(&previews).map_err(|e| pub007(&previews_path, e))?,
    )
    .map_err(|e| pub007(&previews_path, e))?;
    manifest.push("previews.json".to_string());

    let nav_path = output_dir.join("nav-tree.json");
    let nav_tree = build_nav_tree(index, graph);
    fs::write(
        &nav_path,
        serde_json::to_string_pretty(&nav_tree).map_err(|e| pub007(&nav_path, e))?,
    )
    .map_err(|e| pub007(&nav_path, e))?;
    manifest.push("nav-tree.json".to_string());

    Ok(())
}

/// Write the sorted inventory of every file this run produced (BR-U2-027).
/// The manifest excludes itself.
fn write_manifest(output_dir: &Path, mut manifest: Vec<String>) -> Result<()> {
    manifest.sort();
    manifest.dedup();
    let path = output_dir.join("manifest.json");
    let json = serde_json::to_string_pretty(&manifest).map_err(|e| pub007(&path, e))?;
    fs::write(&path, json).map_err(|e| pub007(&path, e))?;
    Ok(())
}

/// Count words in content (handles both Korean and English).
/// Korean (Hangul) is alphabetic, not logographic — space-separated tokens are words.
fn count_words(text: &str) -> usize {
    text.split_whitespace().filter(|w| !w.is_empty()).count()
}

/// Walk up from the post's directory looking for `attachment/{filename}`.
/// Bounded to 10 levels to prevent traversing to filesystem root.
/// Strips path separators and `..` from filename to prevent directory traversal.
fn find_attachment(post_path: &Path, filename: &str) -> Option<std::path::PathBuf> {
    // Sanitize filename: use only the final component, stripping any path traversal
    let safe_name = Path::new(filename).file_name()?.to_str()?;

    let mut dir = post_path.parent()?;
    for _ in 0..10 {
        let candidate = dir.join("attachment").join(safe_name);
        if candidate.exists() {
            return Some(candidate);
        }
        dir = dir.parent()?;
    }
    None
}
