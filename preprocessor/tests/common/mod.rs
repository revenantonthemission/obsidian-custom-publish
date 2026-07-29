//! Shared synthetic-index helpers for the U2 publication test suites.

use std::collections::HashMap;
use std::path::PathBuf;

use obsidian_press::types::{PostMeta, RawVisibility, VaultIndex};

/// Build a synthetic post. `slug` doubles as the file name so diagnostics carry
/// a recognizable path.
pub fn make_post(
    slug: &str,
    title: &str,
    visibility: Option<RawVisibility>,
    raw_content: &str,
) -> PostMeta {
    PostMeta {
        slug: slug.to_string(),
        title: title.to_string(),
        file_path: PathBuf::from(format!("vault/{slug}.md")),
        tags: vec![],
        created: None,
        published: None,
        updated: None,
        is_hub: false,
        hub_parent: None,
        description: None,
        visibility,
        raw_content: raw_content.to_string(),
    }
}

/// Build a `VaultIndex` the way the scanner does: slug-sorted posts plus lookup
/// maps. Heading/block maps start empty per title; tests that need fragments
/// insert entries explicitly.
pub fn make_index(mut posts: Vec<PostMeta>) -> VaultIndex {
    posts.sort_by(|a, b| a.slug.cmp(&b.slug));

    let slug_map: HashMap<String, usize> = posts
        .iter()
        .enumerate()
        .map(|(i, p)| (p.slug.clone(), i))
        .collect();
    let name_map: HashMap<String, usize> = posts
        .iter()
        .enumerate()
        .map(|(i, p)| (p.title.clone(), i))
        .collect();
    let heading_map: HashMap<String, Vec<String>> = posts
        .iter()
        .map(|p| (p.title.clone(), Vec::new()))
        .collect();
    let block_map: HashMap<String, HashMap<String, String>> = posts
        .iter()
        .map(|p| (p.title.clone(), HashMap::new()))
        .collect();

    VaultIndex {
        posts,
        slug_map,
        name_map,
        heading_map,
        block_map,
    }
}
