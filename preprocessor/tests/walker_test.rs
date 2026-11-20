//! U1 BoundaryWalker (security-design §3, L2): one walk policy for the scan
//! and the stamper (BR1.4, BR1.5; NFR5.1, NFR5.3, NFR5.6). Real folders and
//! real symbolic links in a temporary tree, never mocks.

mod common;

use std::os::unix::fs::symlink;
use std::path::{Path, PathBuf};

use common::put;
use obsidian_press::walker::walk_markdown;
use tempfile::TempDir;

fn canonical(path: &Path) -> PathBuf {
    std::fs::canonicalize(path).unwrap()
}

/// File names relative to the walked root, in walk order.
fn names(root: &Path, files: &[PathBuf]) -> Vec<String> {
    let root = canonical(root);
    files
        .iter()
        .map(|f| f.strip_prefix(&root).unwrap().to_string_lossy().to_string())
        .collect()
}

#[test]
fn dot_entries_and_drafts_are_skipped_in_both_roots() {
    let tmp = TempDir::new().unwrap();
    for root in ["Notes", "Pages"] {
        let dir = tmp.path().join(root);
        put(&dir, "Kept.md", "x");
        put(&dir, ".hidden.md", "x");
        put(&dir, ".obsidian/workspace.md", "x");
        put(&dir, "Drafts/Draft.md", "x");
        put(&dir, "Topic/Drafts/Nested.md", "x");
        put(&dir, "Topic/Kept Too.md", "x");

        let (files, skipped) = walk_markdown(&dir).unwrap();

        assert_eq!(
            names(&dir, &files),
            vec!["Kept.md", "Topic/Kept Too.md"],
            "{root}"
        );
        assert!(skipped.is_empty(), "{root}");
    }
}

#[test]
fn a_symlinked_markdown_file_is_skipped_and_reported() {
    let tmp = TempDir::new().unwrap();
    let notes = tmp.path().join("Notes");
    let target = put(&notes, "Real.md", "real");
    symlink(&target, notes.join("Linked.md")).unwrap();

    let (files, skipped) = walk_markdown(&notes).unwrap();

    assert_eq!(names(&notes, &files), vec!["Real.md"]);
    assert_eq!(skipped, vec![canonical(&notes).join("Linked.md")]);
}

#[test]
fn a_symlinked_folder_is_skipped_and_reported() {
    let tmp = TempDir::new().unwrap();
    let notes = tmp.path().join("Notes");
    put(&notes, "Topic/Inside.md", "x");
    symlink(notes.join("Topic"), notes.join("Mirror")).unwrap();

    let (files, skipped) = walk_markdown(&notes).unwrap();

    assert_eq!(names(&notes, &files), vec!["Topic/Inside.md"]);
    assert_eq!(skipped, vec![canonical(&notes).join("Mirror")]);
}

#[test]
fn a_link_to_outside_the_vault_is_never_yielded() {
    let tmp = TempDir::new().unwrap();
    let notes = tmp.path().join("Vault/Notes");
    put(&notes, "Post.md", "x");
    let outside = tmp.path().join("Outside");
    let secret = put(&outside, "Secret.md", "private");
    symlink(&secret, notes.join("Secret.md")).unwrap();
    symlink(&outside, notes.join("Elsewhere")).unwrap();

    let (files, skipped) = walk_markdown(&notes).unwrap();

    let root = canonical(&notes);
    for file in &files {
        assert!(canonical(file).starts_with(&root), "{file:?} left the root");
    }
    assert_eq!(names(&notes, &files), vec!["Post.md"]);
    assert_eq!(
        skipped,
        vec![root.join("Elsewhere"), root.join("Secret.md")]
    );
}

#[test]
fn walk_order_is_sorted_by_path() {
    let tmp = TempDir::new().unwrap();
    let notes = tmp.path().join("Notes");
    for name in ["b.md", "a/z.md", "a-b.md", "가.md", "A.md", "a/b/c.md"] {
        put(&notes, name, "x");
    }

    let (files, _) = walk_markdown(&notes).unwrap();

    let mut sorted = files.clone();
    sorted.sort();
    assert_eq!(files, sorted);
    assert_eq!(files.len(), 6);
}

#[test]
fn a_root_given_as_a_link_is_walked_from_its_canonical_path() {
    let tmp = TempDir::new().unwrap();
    let notes = tmp.path().join("Notes");
    put(&notes, "Post.md", "x");
    let alias = tmp.path().join("NotesAlias");
    symlink(&notes, &alias).unwrap();

    let (files, skipped) = walk_markdown(&alias).unwrap();

    assert_eq!(files, vec![canonical(&notes).join("Post.md")]);
    assert!(
        skipped.is_empty(),
        "the root itself is never a skipped link"
    );
}

#[test]
fn only_regular_markdown_files_are_yielded() {
    let tmp = TempDir::new().unwrap();
    let notes = tmp.path().join("Notes");
    put(&notes, "Post.md", "x");
    put(&notes, "notes.txt", "x");
    put(&notes, "attachment/image.png", "x");
    put(&notes, "Folder.md/Inside.md", "x");
    put(&notes, "README", "x");

    let (files, _) = walk_markdown(&notes).unwrap();

    assert_eq!(
        names(&notes, &files),
        vec!["Folder.md/Inside.md", "Post.md"]
    );
    for file in &files {
        assert!(
            std::fs::symlink_metadata(file)
                .unwrap()
                .file_type()
                .is_file()
        );
    }
}
