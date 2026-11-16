//! BoundaryWalker (U1 security-design §3, L2): the one walk policy shared by
//! the scanner and the stamper, so the two cannot drift apart.
//!
//! - Rooted at the canonical NOTES or PAGES path; never ascends.
//! - Never follows links. Any entry whose own metadata says it is a symbolic
//!   link, file or folder, is skipped and reported (NFR5.3, NFR5.6). A linked
//!   `.md` would otherwise pass an `is_file` test, which follows the link, and
//!   be published or stamped through.
//! - Skips entries whose name starts with `.` or equals `Drafts`, with their
//!   whole subtree, silently (BR1.4).
//! - Yields only regular `.md` files, sorted by path (BR1.7).

use anyhow::{Context, Result};
use std::path::{Path, PathBuf};
use walkdir::{DirEntry, WalkDir};

/// Walk `root` and return `(markdown files, skipped links)`, both sorted.
/// The caller decides whether to print the skipped links (they are printed
/// once per run, from the first scan).
pub fn walk_markdown(root: &Path) -> Result<(Vec<PathBuf>, Vec<PathBuf>)> {
    let root = std::fs::canonicalize(root)
        .with_context(|| format!("failed to read folder {}", root.display()))?;
    let mut files = Vec::new();
    let mut skipped_links = Vec::new();

    let walk = WalkDir::new(&root)
        .follow_links(false)
        .sort_by_file_name()
        .into_iter()
        .filter_entry(|e| e.depth() == 0 || !is_excluded(e));

    for entry in walk {
        let entry = entry.context("failed to read directory entry")?;
        if entry.depth() == 0 {
            continue;
        }
        if entry.path_is_symlink() {
            skipped_links.push(entry.into_path());
            continue;
        }
        if entry.file_type().is_file() && entry.path().extension().is_some_and(|ext| ext == "md") {
            files.push(entry.into_path());
        }
    }

    files.sort();
    skipped_links.sort();
    Ok((files, skipped_links))
}

/// The exact warning line for one skipped link (observability-design §2).
pub fn skipped_link_warning(path: &Path) -> String {
    format!("warning: skipped symbolic link {}", path.display())
}

/// Hidden entries and `Drafts` folders are never published (BR1.4).
fn is_excluded(entry: &DirEntry) -> bool {
    entry
        .file_name()
        .to_str()
        .is_some_and(|s| s.starts_with('.') || s == "Drafts")
}
