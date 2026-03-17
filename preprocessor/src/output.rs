use anyhow::{Context, Result};
use regex::Regex;
use serde::Serialize;
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use crate::search::build_search_index;
use crate::transform::{strip_frontmatter, transform_content_with_assets};
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
        let (content, images) = transform_content_with_assets(index, graph, i, Some(&assets_dir));

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
    let mut previews = serde_json::Map::new();
    for post in &index.posts {
        let stripped = strip_markdown_for_preview(&post.raw_content);
        let summary = extract_first_sentence(&stripped);
        let entry = serde_json::json!({
            "title": post.title,
            "tags": post.tags,
            "summary": summary,
        });
        previews.insert(post.slug.clone(), entry);
    }
    let previews_path = output_dir.join("previews.json");
    fs::write(
        &previews_path,
        serde_json::to_string_pretty(&serde_json::Value::Object(previews))
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

// --- Navigation tree types and builder ---

#[derive(Debug, Serialize)]
struct NavTreeNode {
    slug: String,
    title: String,
    is_hub: bool,
    children: Vec<NavTreeNode>,
}

#[derive(Debug, Serialize)]
struct NavTree {
    roots: Vec<NavTreeNode>,
    orphans: Vec<NavTreeNode>,
}

/// Build a navigation tree from hub/hub_parent relationships.
fn build_nav_tree(index: &VaultIndex, graph: &LinkGraph) -> NavTree {
    let mut claimed: HashSet<usize> = HashSet::new();

    // Find all hub indices
    let hub_indices: Vec<usize> = index
        .posts
        .iter()
        .enumerate()
        .filter(|(_, p)| p.is_hub)
        .map(|(i, _)| i)
        .collect();

    // Identify top-level hubs (no hub_parent or hub_parent not found)
    let top_level_hubs: Vec<usize> = hub_indices
        .iter()
        .filter(|&&i| {
            match &index.posts[i].hub_parent {
                Some(parent) => !index.name_map.contains_key(parent.as_str()),
                None => true,
            }
        })
        .copied()
        .collect();

    // Recursively build tree for a hub node
    fn build_node(
        hub_idx: usize,
        index: &VaultIndex,
        graph: &LinkGraph,
        claimed: &mut HashSet<usize>,
    ) -> NavTreeNode {
        claimed.insert(hub_idx);
        let post = &index.posts[hub_idx];

        // Children = forward_links from the hub + posts with hub_parent == hub title
        let mut child_indices: Vec<usize> = Vec::new();

        // Forward links from this hub
        for link in &graph.forward_links[hub_idx] {
            if let Some(&target_idx) = index.slug_map.get(&link.target_slug) {
                if !claimed.contains(&target_idx) {
                    child_indices.push(target_idx);
                }
            }
        }

        // Posts whose hub_parent matches this hub's title
        for (i, p) in index.posts.iter().enumerate() {
            if let Some(ref parent) = p.hub_parent {
                if parent == &post.title && !claimed.contains(&i) {
                    child_indices.push(i);
                }
            }
        }

        // Deduplicate
        child_indices.sort();
        child_indices.dedup();

        // Build children: recurse for sub-hubs, leaf node for regular posts
        // Collect unclaimed indices first to avoid borrow conflict
        let unclaimed: Vec<usize> = child_indices
            .into_iter()
            .filter(|i| !claimed.contains(i))
            .collect();
        let children: Vec<NavTreeNode> = unclaimed
            .into_iter()
            .map(|i| {
                if index.posts[i].is_hub {
                    build_node(i, index, graph, claimed)
                } else {
                    claimed.insert(i);
                    NavTreeNode {
                        slug: index.posts[i].slug.clone(),
                        title: index.posts[i].title.clone(),
                        is_hub: false,
                        children: Vec::new(),
                    }
                }
            })
            .collect();

        NavTreeNode {
            slug: post.slug.clone(),
            title: post.title.clone(),
            is_hub: true,
            children,
        }
    }

    let mut roots: Vec<NavTreeNode> = top_level_hubs
        .iter()
        .map(|&i| build_node(i, index, graph, &mut claimed))
        .collect();
    roots.sort_by(|a, b| a.title.cmp(&b.title));

    // Orphans = unclaimed posts
    let mut orphans: Vec<NavTreeNode> = (0..index.posts.len())
        .filter(|i| !claimed.contains(i))
        .map(|i| NavTreeNode {
            slug: index.posts[i].slug.clone(),
            title: index.posts[i].title.clone(),
            is_hub: index.posts[i].is_hub,
            children: Vec::new(),
        })
        .collect();
    orphans.sort_by(|a, b| a.title.cmp(&b.title));

    NavTree { roots, orphans }
}

/// Count words in content (handles both Korean and English).
/// Korean (Hangul) is alphabetic, not logographic — space-separated tokens are words.
fn count_words(text: &str) -> usize {
    text.split_whitespace()
        .filter(|w| !w.is_empty())
        .count()
}

/// Compiled regexes for stripping markdown syntax.
static RE_INLINE_MARKDOWN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(\*{1,2}|_{1,2}|`|~~)").unwrap());
static RE_WIKILINK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]").unwrap());
static RE_MARKDOWN_LINK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\[([^\]]*)\]\([^)]*\)").unwrap());
static RE_HTML_TAG: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<[^>]+>").unwrap());
static RE_BLOCK_REF: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s*\^[\w-]+\s*$").unwrap());
static RE_MULTI_SPACE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").unwrap());

/// Strip markdown/HTML from raw content to produce plain text for previews.
fn strip_markdown_for_preview(content: &str) -> String {
    let body = strip_frontmatter(content);
    let lines: Vec<&str> = body
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            // Skip headings, code fences, blockquotes, horizontal rules, empty lines
            !trimmed.starts_with('#')
                && !trimmed.starts_with("```")
                && !trimmed.starts_with('>')
                && !trimmed.starts_with("---")
                && !trimmed.is_empty()
        })
        .collect();
    let joined = lines.join(" ");

    // Strip wikilinks: [[target|display]] -> display, [[target]] -> target
    let text = RE_WIKILINK.replace_all(&joined, |caps: &regex::Captures| {
        caps.get(2)
            .or_else(|| caps.get(1))
            .map(|m| m.as_str().to_string())
            .unwrap_or_default()
    });
    // Strip markdown links: [text](url) -> text
    let text = RE_MARKDOWN_LINK.replace_all(&text, "$1");
    // Strip HTML tags
    let text = RE_HTML_TAG.replace_all(&text, "");
    // Strip inline markdown: **, *, `, ~~
    let text = RE_INLINE_MARKDOWN.replace_all(&text, "");
    // Strip block references
    let text = RE_BLOCK_REF.replace_all(&text, "");
    // Normalize whitespace
    let text = RE_MULTI_SPACE.replace_all(&text, " ");
    text.trim().to_string()
}

/// Extract the first sentence from plain text.
/// Finds the first `.` or `。` after at least 10 chars, or truncates at 150 chars.
fn extract_first_sentence(text: &str) -> String {
    if text.is_empty() {
        return String::new();
    }
    // Look for sentence-ending punctuation after at least 10 chars
    for (i, ch) in text.char_indices() {
        if i >= 10 && (ch == '.' || ch == '。') {
            let end = i + ch.len_utf8();
            return text[..end].to_string();
        }
    }
    // No sentence end found; truncate at ~150 characters (not bytes)
    let char_count = text.chars().count();
    if char_count <= 150 {
        return text.to_string();
    }
    // Find byte index of the 150th character
    let byte_idx = text.char_indices().nth(150).map(|(i, _)| i).unwrap_or(text.len());
    let truncated = &text[..byte_idx];
    if let Some(last_space) = truncated.rfind(' ') {
        format!("{}...", &text[..last_space])
    } else {
        format!("{}...", truncated)
    }
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

