use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostMeta {
    pub slug: String,
    pub title: String,
    pub file_path: PathBuf,
    pub tags: Vec<String>,
    pub created: Option<String>,
    pub published: Option<String>,
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
}
