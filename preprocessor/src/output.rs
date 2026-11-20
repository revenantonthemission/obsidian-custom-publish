use anyhow::{Context, Result, anyhow};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

use crate::catalog::PublicationCatalog;
use crate::linker::resolve_links;
use crate::nav_tree::build_nav_tree;
use crate::preview::build_previews;
use crate::related::compute_related;
use crate::search::build_search_index;
use crate::transform::{AssetTarget, PAGE_ASSET_URL, POST_ASSET_URL, transform_note};
use crate::types::{LinkGraph, PostMeta, VaultIndex};

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

/// Site-page metadata written to `pages/{slug}.json` (BR5.2): exactly
/// {slug, title}, fields in sorted key order, nothing time- or
/// environment-dependent.
#[derive(Debug, Serialize)]
struct SitePageMeta {
    slug: String,
    title: String,
}

/// What one write pass produced (NFR4.4). Counted from the writer's own
/// record of written files, so it matches the manifest.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct WriteSummary {
    /// `posts/*.md` written.
    pub posts: usize,
    /// `pages/*.md` written.
    pub site_pages: usize,
    /// Images copied to `assets/` and `assets/pages/`.
    pub assets: usize,
}

impl WriteSummary {
    /// The run's last stdout line (observability-design §2 row 8).
    pub fn line(&self) -> String {
        format!(
            "published {} posts, {} site pages, {} assets",
            self.posts, self.site_pages, self.assets
        )
    }
}

/// Managed folders under OUTPUT. `homepage/` is legacy: no longer written,
/// still cleaned so a tree from an older run converges (BR5.1; NFR5.14).
const MANAGED_DIRS: [&str; 5] = ["posts", "meta", "assets", "pages", "homepage"];
const MANAGED_FILES: [&str; 5] = [
    "graph.json",
    "search-index.json",
    "previews.json",
    "nav-tree.json",
    "manifest.json",
];

/// Write failure as a PUB007 diagnostic-shaped error (NFR-U2-005). The caller
/// prints the message verbatim to stderr and exits 1.
fn pub007(path: &Path, detail: impl std::fmt::Display) -> anyhow::Error {
    anyhow!("PUB007 {}: {}", path.display(), detail)
}

/// Write all preprocessor output for a validated catalog.
///
/// Order is validate → clean → write: this function runs only after every
/// catalog check passed, cleans every managed namespace, then regenerates so
/// the result is a function of the current catalog alone (BR5.1, BR5.6).
///
/// Creates:
/// - `posts/{slug}.md` + `meta/{slug}.json` — posts only
/// - `pages/{slug}.md` + `pages/{slug}.json` — site pages (BR5.2)
/// - `assets/` — rendered post diagrams and post images; `assets/pages/` —
///   site-page diagrams and images (NFR4.6)
/// - `graph.json`, `search-index.json`, `previews.json`, `nav-tree.json` — posts only
/// - `manifest.json` — sorted inventory of every file written (itself excluded)
pub fn write_output(catalog: &PublicationCatalog, output_dir: &Path) -> Result<WriteSummary> {
    // Discovery derives from the posts-only view exclusively (BR2.8, BR5.4):
    // site pages and the retired note are absent from its name_map.
    let posts = catalog.posts_only();
    let graph = resolve_links(posts);

    clean_managed_namespaces(output_dir)?;

    let posts_dir = output_dir.join("posts");
    let meta_dir = output_dir.join("meta");
    let assets_dir = output_dir.join("assets");
    for dir in [&posts_dir, &meta_dir, &assets_dir] {
        fs::create_dir_all(dir).map_err(|e| pub007(dir, e))?;
    }

    let mut manifest: Vec<String> = Vec::new();
    let all_related = compute_related(posts, &graph, 5);

    write_posts(
        catalog,
        &graph,
        &PostDirs {
            posts: &posts_dir,
            meta: &meta_dir,
            assets: &assets_dir,
        },
        &all_related,
        &mut manifest,
    )?;
    write_site_pages(catalog, output_dir, &mut manifest)?;
    write_global_artifacts(posts, &graph, output_dir, &mut manifest)?;
    let manifest = write_manifest(output_dir, manifest)?;

    let count = |prefix: &str| manifest.iter().filter(|p| p.starts_with(prefix)).count();
    Ok(WriteSummary {
        posts: count("posts/"),
        site_pages: manifest
            .iter()
            .filter(|p| p.starts_with("pages/") && p.ends_with(".md"))
            .count(),
        assets: count("assets/"),
    })
}

/// Remove every managed output namespace so stale artifacts cannot survive a
/// publication change. Runs only after validation succeeded, so a failed
/// validation leaves the previous output untouched.
fn clean_managed_namespaces(output_dir: &Path) -> Result<()> {
    for dir in MANAGED_DIRS {
        let path = output_dir.join(dir);
        if path.exists() {
            fs::remove_dir_all(&path).map_err(|e| pub007(&path, e))?;
        }
    }
    for file in MANAGED_FILES {
        let path = output_dir.join(file);
        if path.exists() {
            fs::remove_file(&path).map_err(|e| pub007(&path, e))?;
        }
    }
    Ok(())
}

/// The three folders a post write uses.
struct PostDirs<'a> {
    posts: &'a Path,
    meta: &'a Path,
    assets: &'a Path,
}

/// Transform each post, write markdown + metadata JSON, and copy referenced
/// images. Content is transformed against the link-targets view so links to
/// the retired note go to `/` and links to site pages become text (BR3.x).
fn write_posts(
    catalog: &PublicationCatalog,
    graph: &LinkGraph,
    dirs: &PostDirs<'_>,
    all_related: &[Vec<String>],
    manifest: &mut Vec<String>,
) -> Result<()> {
    let posts = catalog.posts_only();
    let targets = catalog.link_targets();
    let assets = AssetTarget {
        dir: Some(dirs.assets),
        url: POST_ASSET_URL,
    };

    for (i, post) in posts.posts.iter().enumerate() {
        let full_idx = *targets.slug_map.get(&post.slug).with_context(|| {
            format!("catalog invariant broken: {} not in full index", post.slug)
        })?;
        let (content, images) = transform_note(targets, full_idx, Some(catalog.kinds()), &assets);

        let md_path = dirs.posts.join(format!("{}.md", post.slug));
        fs::write(&md_path, &content).map_err(|e| pub007(&md_path, e))?;
        manifest.push(format!("posts/{}.md", post.slug));

        copy_referenced_images(post, &images, dirs.assets, "assets", "", manifest);

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

        let meta_path = dirs.meta.join(format!("{}.json", post.slug));
        let json = serde_json::to_string_pretty(&meta).map_err(|e| pub007(&meta_path, e))?;
        fs::write(&meta_path, json).map_err(|e| pub007(&meta_path, e))?;
        manifest.push(format!("meta/{}.json", post.slug));
    }
    Ok(())
}

/// Write each site page in slug order (W4; BR5.2, BR5.3): the body through
/// the post pipeline with links by kind, images and diagrams in
/// `assets/pages/`, and `pages/<slug>.json` = {slug, title}.
fn write_site_pages(
    catalog: &PublicationCatalog,
    output_dir: &Path,
    manifest: &mut Vec<String>,
) -> Result<()> {
    let mut pages: Vec<usize> = catalog.site_page_indices().collect();
    if pages.is_empty() {
        return Ok(());
    }
    let targets = catalog.link_targets();
    pages.sort_by(|a, b| targets.posts[*a].slug.cmp(&targets.posts[*b].slug));

    let pages_dir = output_dir.join("pages");
    let page_assets_dir = output_dir.join("assets").join("pages");
    for dir in [&pages_dir, &page_assets_dir] {
        fs::create_dir_all(dir).map_err(|e| pub007(dir, e))?;
    }
    let assets = AssetTarget {
        dir: Some(&page_assets_dir),
        url: PAGE_ASSET_URL,
    };

    for idx in pages {
        let page = &targets.posts[idx];
        let (content, images) = transform_note(targets, idx, Some(catalog.kinds()), &assets);

        let md_path = pages_dir.join(format!("{}.md", page.slug));
        fs::write(&md_path, &content).map_err(|e| pub007(&md_path, e))?;
        manifest.push(format!("pages/{}.md", page.slug));

        // BR5.2 (review R-02): a post embedded in a page keeps its images
        // under NOTES, which this lookup never reads, so they are unsupported
        // on pages; the warning names the page so the broken image is found.
        let origin = format!(" (site page {})", page.file_path.display());
        copy_referenced_images(
            page,
            &images,
            &page_assets_dir,
            "assets/pages",
            &origin,
            manifest,
        );

        let meta = SitePageMeta {
            slug: page.slug.clone(),
            title: page.title.clone(),
        };
        let meta_path = pages_dir.join(format!("{}.json", page.slug));
        let json = serde_json::to_string_pretty(&meta).map_err(|e| pub007(&meta_path, e))?;
        fs::write(&meta_path, json).map_err(|e| pub007(&meta_path, e))?;
        manifest.push(format!("pages/{}.json", page.slug));
    }
    Ok(())
}

/// Copy referenced images found by the bounded lookup into `dest_dir`,
/// listing each as `<manifest_prefix>/<name>`. `images` already holds final
/// file-name components only, so the destination never leaves `dest_dir`.
/// `origin` is appended to the not-found warning (empty for posts, the page
/// path for site pages).
fn copy_referenced_images(
    note: &PostMeta,
    images: &[String],
    dest_dir: &Path,
    manifest_prefix: &str,
    origin: &str,
    manifest: &mut Vec<String>,
) {
    for image_filename in images {
        let dest = dest_dir.join(image_filename);
        if dest.exists() {
            continue;
        }
        let Some(src) = find_attachment(note, image_filename) else {
            eprintln!("warning: attachment not found: {image_filename}{origin}");
            continue;
        };
        match fs::copy(&src, &dest) {
            Ok(_) => manifest.push(format!("{manifest_prefix}/{image_filename}")),
            Err(e) => eprintln!(
                "warning: failed to copy image {} -> {}: {e}",
                src.display(),
                dest.display()
            ),
        }
    }
}

/// Write global artifact files from the posts-only view: graph, search index,
/// previews, nav tree.
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

/// Write the sorted inventory of every file this run produced (BR5.5) and
/// return it. The manifest excludes itself.
fn write_manifest(output_dir: &Path, mut manifest: Vec<String>) -> Result<Vec<String>> {
    manifest.sort();
    manifest.dedup();
    let path = output_dir.join("manifest.json");
    let json = serde_json::to_string_pretty(&manifest).map_err(|e| pub007(&path, e))?;
    fs::write(&path, json).map_err(|e| pub007(&path, e))?;
    Ok(manifest)
}

/// Count words in content (handles both Korean and English).
/// Korean (Hangul) is alphabetic, not logographic — space-separated tokens are words.
fn count_words(text: &str) -> usize {
    text.split_whitespace().filter(|w| !w.is_empty()).count()
}

/// AttachmentResolver (security-design §4, L3): search `attachment/<name>`
/// from the note's folder upward, stopping after the note's source root
/// (BR1.6; NFR5.2). A candidate is accepted only when its own metadata says
/// it is a regular file, so a link counts as missing, and its canonical path
/// still lies inside the canonical root (NFR5.3). `name` is reduced to its
/// final component first, so `../` cannot escape.
fn find_attachment(note: &PostMeta, name: &str) -> Option<PathBuf> {
    let safe_name = Path::new(name).file_name()?;
    let root = fs::canonicalize(&note.source_root).ok()?;

    let mut dir = note.file_path.parent()?.to_path_buf();
    loop {
        if !dir.starts_with(&root) {
            return None;
        }
        let candidate = dir.join("attachment").join(safe_name);
        if is_regular_file_inside(&candidate, &root) {
            return Some(candidate);
        }
        if dir == root {
            return None;
        }
        dir = dir.parent()?.to_path_buf();
    }
}

fn is_regular_file_inside(candidate: &Path, root: &Path) -> bool {
    let Ok(meta) = fs::symlink_metadata(candidate) else {
        return false;
    };
    meta.file_type().is_file()
        && fs::canonicalize(candidate).is_ok_and(|real| real.starts_with(root))
}
