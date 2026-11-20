//! U1 check-then-stamp ordering (BR4.1, BR4.2; NFR5.5, NFR5.6; AC1.2.1):
//! every check runs before the vault is stamped, only the posts folder is
//! stamped, nothing is written through a link, and the rescan after stamping
//! happens only when a file changed. Real binary, temporary vaults.

mod common;

use std::ffi::OsStr;
use std::os::unix::fs::symlink;
use std::path::PathBuf;
use std::process::Output;

use common::{hash_tree, put, run_press, stderr_of, stdout_of};
use tempfile::TempDir;

/// A stamping-ready vault: `Vault/Notes` and `Vault/Pages` plus an OUTPUT.
struct Vault {
    _tmp: TempDir,
    root: PathBuf,
    notes: PathBuf,
    pages: PathBuf,
    output: PathBuf,
}

fn vault() -> Vault {
    let tmp = TempDir::new().unwrap();
    let root = tmp.path().to_path_buf();
    Vault {
        notes: root.join("Vault/Notes"),
        pages: root.join("Vault/Pages"),
        output: root.join("out"),
        root,
        _tmp: tmp,
    }
}

fn stamp(v: &Vault) -> Output {
    run_press(&[
        OsStr::new("--stamp-published"),
        v.notes.as_os_str(),
        v.output.as_os_str(),
        OsStr::new("--pages"),
        v.pages.as_os_str(),
    ])
}

fn count_lines(text: &str, prefix: &str) -> usize {
    text.lines().filter(|l| l.starts_with(prefix)).count()
}

#[test]
fn a_pub008_vault_is_byte_identical_after_a_stamping_run() {
    let v = vault();
    // Both notes lack `published`, so a stamp before the check would change them.
    put(&v.notes, "About.md", "---\ntags: [a]\n---\n글.\n");
    put(&v.notes, "Plain.md", "머리말 없는 글.\n");
    put(&v.pages, "About.md", "소개.\n");
    let before = hash_tree(&v.root);

    let run = stamp(&v);

    assert_eq!(run.status.code(), Some(1), "stderr: {}", stderr_of(&run));
    assert_eq!(count_lines(&stderr_of(&run), "PUB008 "), 1);
    assert_eq!(hash_tree(&v.root), before, "nothing stamped or written");
    assert_eq!(count_lines(&stdout_of(&run), "Stamping"), 0);
}

#[test]
fn a_page_is_never_stamped_while_a_post_gains_the_date() {
    let v = vault();
    let post = put(&v.notes, "Post.md", "---\ntags: [a]\n---\n글.\n");
    let page = put(&v.pages, "About.md", "---\ntags: [a]\n---\n소개.\n");
    let page_before = std::fs::read(&page).unwrap();

    let run = stamp(&v);

    assert_eq!(run.status.code(), Some(0), "stderr: {}", stderr_of(&run));
    let stamped = std::fs::read_to_string(&post).unwrap();
    assert!(
        stamped.contains("\npublished: "),
        "post gains a date: {stamped}"
    );
    assert_eq!(std::fs::read(&page).unwrap(), page_before, "page untouched");
}

#[test]
fn a_linked_markdown_target_outside_the_vault_is_untouched() {
    let v = vault();
    put(
        &v.notes,
        "Post.md",
        "---\npublished: 2999-01-01\n---\n글.\n",
    );
    put(&v.pages, "About.md", "소개.\n");
    let outside = put(&v.root, "Outside/Secret.md", "머리말 없는 비공개 글.\n");
    symlink(&outside, v.notes.join("Secret.md")).unwrap();
    let before = std::fs::read(&outside).unwrap();

    let run = stamp(&v);

    assert_eq!(run.status.code(), Some(0), "stderr: {}", stderr_of(&run));
    assert_eq!(std::fs::read(&outside).unwrap(), before);
    assert!(!v.output.join("posts/secret.md").exists());
}

#[test]
fn each_skipped_link_warning_appears_exactly_once_on_a_stamping_run() {
    let v = vault();
    // One note to stamp, so the run rescans after stamping.
    put(&v.notes, "Fresh.md", "---\ntags: [a]\n---\n새 글.\n");
    let target = put(
        &v.notes,
        "Real.md",
        "---\npublished: 2999-01-01\n---\n글.\n",
    );
    symlink(&target, v.notes.join("Linked.md")).unwrap();
    put(&v.pages, "About.md", "소개.\n");

    let run = stamp(&v);

    assert_eq!(run.status.code(), Some(0), "stderr: {}", stderr_of(&run));
    let link = std::fs::canonicalize(&v.notes).unwrap().join("Linked.md");
    let warning = format!("warning: skipped symbolic link {}", link.display());
    let stderr = stderr_of(&run);
    assert_eq!(
        stderr.lines().filter(|l| *l == warning).count(),
        1,
        "{stderr}"
    );
    assert_eq!(
        count_lines(&stdout_of(&run), "Scanning"),
        2,
        "a stamped file triggers one rescan"
    );
}

#[test]
fn no_rescan_when_nothing_was_stamped() {
    let v = vault();
    put(
        &v.notes,
        "Post.md",
        "---\npublished: 2999-01-01\n---\n글.\n",
    );
    put(&v.pages, "About.md", "소개.\n");

    let run = stamp(&v);

    assert_eq!(run.status.code(), Some(0), "stderr: {}", stderr_of(&run));
    let stdout = stdout_of(&run);
    assert!(stdout.contains("Stamped 0 posts"), "{stdout}");
    assert_eq!(count_lines(&stdout, "Scanning"), 1, "{stdout}");
}
