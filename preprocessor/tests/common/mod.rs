//! Shared helpers for the publication test suites: synthetic indexes (U2) and
//! real-binary runs over temporary on-disk vaults (U1 boundary). Each test
//! crate uses a subset, hence the dead-code allowance.
#![allow(dead_code)]

use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};

use obsidian_press::types::{NoteSource, PostMeta, RawVisibility, VaultIndex};

/// Write `body` to `root/rel`, creating parent folders.
pub fn put(root: &Path, rel: &str, body: &str) -> PathBuf {
    let path = root.join(rel);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path, body).unwrap();
    path
}

/// Relative path → bytes of every regular file under `root` (links are
/// recorded by their own target text, never followed). Missing root → empty.
pub fn hash_tree(root: &Path) -> BTreeMap<String, Vec<u8>> {
    let mut map = BTreeMap::new();
    if !root.exists() {
        return map;
    }
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for entry in fs::read_dir(&dir).unwrap() {
            let path = entry.unwrap().path();
            let rel = path
                .strip_prefix(root)
                .unwrap()
                .to_string_lossy()
                .to_string();
            let meta = fs::symlink_metadata(&path).unwrap();
            if meta.file_type().is_symlink() {
                let target = fs::read_link(&path).unwrap();
                map.insert(rel, target.to_string_lossy().as_bytes().to_vec());
            } else if meta.is_dir() {
                stack.push(path);
            } else {
                map.insert(rel, fs::read(&path).unwrap());
            }
        }
    }
    map
}

/// Run the release binary with the given arguments.
pub fn run_press(args: &[&std::ffi::OsStr]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_obsidian-press"))
        .args(args)
        .output()
        .unwrap()
}

pub fn stdout_of(output: &Output) -> String {
    String::from_utf8_lossy(&output.stdout).to_string()
}

pub fn stderr_of(output: &Output) -> String {
    String::from_utf8_lossy(&output.stderr).to_string()
}

/// The path the binary prints for `path`: canonical when it exists, else the
/// canonical nearest existing ancestor joined with the missing tail.
pub fn shown(path: &Path) -> String {
    if let Ok(canonical) = fs::canonicalize(path) {
        return canonical.display().to_string();
    }
    let mut tail = Vec::new();
    let mut current = path.to_path_buf();
    while fs::canonicalize(&current).is_err() {
        tail.push(current.file_name().unwrap().to_os_string());
        current = current.parent().unwrap().to_path_buf();
    }
    let mut resolved = fs::canonicalize(&current).unwrap();
    for part in tail.iter().rev() {
        resolved.push(part);
    }
    resolved.display().to_string()
}

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
        source: NoteSource::Notes,
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
