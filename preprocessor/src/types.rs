use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// Returns true if the character is a Korean Hangul syllable, Jamo, or compatibility Jamo.
pub fn is_korean(c: char) -> bool {
    matches!(c, '\u{AC00}'..='\u{D7AF}' | '\u{1100}'..='\u{11FF}' | '\u{3130}'..='\u{318F}')
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostMeta {
    pub slug: String,
    pub title: String,
    pub file_path: PathBuf,
    pub tags: Vec<String>,
    pub created: Option<String>,
    pub published: Option<String>,
    pub updated: Option<String>,
    pub is_hub: bool,
    pub hub_parent: Option<String>,
    pub raw_content: String,
}

#[derive(Debug)]
pub struct VaultIndex {
    pub posts: Vec<PostMeta>,
    /// slug -> index into posts
    pub slug_map: HashMap<String, usize>,
    /// original filename (without .md) -> index into posts
    pub name_map: HashMap<String, usize>,
    /// title -> list of heading slugs (in document order, with -1/-2 suffixes for duplicates)
    pub heading_map: HashMap<String, Vec<String>>,
    /// title -> (block_id -> paragraph text without the ^block-id annotation)
    pub block_map: HashMap<String, HashMap<String, String>>,
}

// --- Link resolution types (Pass 2) ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Link {
    pub target_slug: String,
    pub alias: Option<String>,
    pub heading: Option<String>,
}

#[derive(Debug)]
pub struct LinkGraph {
    /// Per-post forward links (indexed same as VaultIndex.posts)
    pub forward_links: Vec<Vec<Link>>,
    /// Per-post backlink slugs (indexed same as VaultIndex.posts)
    pub backlinks: Vec<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct GraphJson {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Debug, Serialize)]
pub struct GraphNode {
    pub slug: String,
    pub title: String,
    pub tags: Vec<String>,
    pub is_hub: bool,
    pub backlink_count: usize,
}

#[derive(Debug, Serialize)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
}
