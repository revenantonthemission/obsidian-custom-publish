//! U1 publishing boundary through the real binary: the folder guard
//! (BR1.2, BR1.3; NFR5.4, NFR5.17; AC1.1.4) and the site-pages notices
//! (BR1.3, BR1.7; FR1.5; NFR5.10, NFR5.15; AC1.1.2, AC1.3.1, AC1.3.2).
//! Every case runs `obsidian-press` on temporary on-disk vaults, never mocks.

mod common;

use std::ffi::OsStr;
use std::path::{Path, PathBuf};

use common::{hash_tree, put, run_press, shown, stderr_of, stdout_of};
use tempfile::TempDir;

/// A vault root holding `Notes/Alpha.md` and `Pages/About.md`, plus an OUTPUT
/// that already holds a managed file, so a deletion would be visible.
struct Fixture {
    _tmp: TempDir,
    vault: PathBuf,
    notes: PathBuf,
    pages: PathBuf,
    output: PathBuf,
}

fn fixture() -> Fixture {
    let tmp = TempDir::new().unwrap();
    let vault = tmp.path().join("Vault");
    let notes = vault.join("Notes");
    let pages = vault.join("Pages");
    let output = tmp.path().join("out");
    put(
        &notes,
        "Alpha.md",
        "---\npublished: 2024-02-01\n---\n알파 글.\n",
    );
    put(&pages, "About.md", "소개 페이지.\n");
    put(&output, "posts/old.md", "earlier run");
    Fixture {
        _tmp: tmp,
        vault,
        notes,
        pages,
        output,
    }
}

/// Run with a usage error expected: exit 2, exactly `expected` on stderr,
/// nothing on stdout (no scan started), vault and OUTPUT untouched.
fn assert_usage_error(f: &Fixture, args: &[&OsStr], expected: &str) {
    let vault_before = hash_tree(&f.vault);
    let output_before = hash_tree(&f.output);

    let run = run_press(args);

    assert_eq!(run.status.code(), Some(2), "stderr: {}", stderr_of(&run));
    assert_eq!(stderr_of(&run), format!("{expected}\n"));
    assert_eq!(stdout_of(&run), "", "nothing may be scanned");
    assert_eq!(hash_tree(&f.vault), vault_before, "vault must be untouched");
    assert_eq!(
        hash_tree(&f.output),
        output_before,
        "OUTPUT must be untouched"
    );
}

fn os(path: &Path) -> &OsStr {
    path.as_os_str()
}

// ------------------------------------------------------------ folder guard

#[test]
fn pages_equal_to_notes_is_a_usage_error() {
    let f = fixture();
    let expected = format!(
        "error: --pages {} overlaps posts folder {}",
        shown(&f.notes),
        shown(&f.notes)
    );
    assert_usage_error(
        &f,
        &[
            os(&f.notes),
            os(&f.output),
            OsStr::new("--pages"),
            os(&f.notes),
        ],
        &expected,
    );
}

#[test]
fn pages_inside_notes_is_a_usage_error() {
    let f = fixture();
    let inner = f.notes.join("Sub");
    put(&inner, "Inner.md", "안쪽.\n");
    let expected = format!(
        "error: --pages {} overlaps posts folder {}",
        shown(&inner),
        shown(&f.notes)
    );
    assert_usage_error(
        &f,
        &[
            os(&f.notes),
            os(&f.output),
            OsStr::new("--pages"),
            os(&inner),
        ],
        &expected,
    );
}

#[test]
fn pages_containing_notes_is_a_usage_error() {
    let f = fixture();
    let expected = format!(
        "error: --pages {} overlaps posts folder {}",
        shown(&f.vault),
        shown(&f.notes)
    );
    assert_usage_error(
        &f,
        &[
            os(&f.notes),
            os(&f.output),
            OsStr::new("--pages"),
            os(&f.vault),
        ],
        &expected,
    );
}

#[test]
fn output_inside_notes_is_a_usage_error() {
    let f = fixture();
    let output = f.notes.join("out");
    let expected = format!(
        "error: output folder {} overlaps posts folder {}",
        shown(&output),
        shown(&f.notes)
    );
    assert_usage_error(
        &f,
        &[
            os(&f.notes),
            os(&output),
            OsStr::new("--pages"),
            os(&f.pages),
        ],
        &expected,
    );
    assert!(!output.exists(), "the guard creates nothing");
}

#[test]
fn output_equal_to_pages_in_another_letter_case_is_a_usage_error() {
    let f = fixture();
    // APFS is case-insensitive: `PAGES` is the `Pages` folder, so a clean of
    // this OUTPUT would delete the site pages.
    let output = f.vault.join("PAGES");
    let expected = format!(
        "error: output folder {} overlaps site pages folder {}",
        shown(&output),
        shown(&f.pages)
    );
    assert_usage_error(
        &f,
        &[
            os(&f.notes),
            os(&output),
            OsStr::new("--pages"),
            os(&f.pages),
        ],
        &expected,
    );
}

#[test]
fn pages_that_is_a_file_is_a_usage_error() {
    let f = fixture();
    let file = f.pages.join("About.md");
    let expected = format!("error: site pages folder {} is not a folder", shown(&file));
    assert_usage_error(
        &f,
        &[
            os(&f.notes),
            os(&f.output),
            OsStr::new("--pages"),
            os(&file),
        ],
        &expected,
    );
}

#[test]
fn notes_that_is_a_file_is_a_usage_error() {
    let f = fixture();
    let file = f.notes.join("Alpha.md");
    let expected = format!("error: posts folder {} is not a folder", shown(&file));
    assert_usage_error(
        &f,
        &[
            os(&file),
            os(&f.output),
            OsStr::new("--pages"),
            os(&f.pages),
        ],
        &expected,
    );
}

#[test]
fn dot_dot_after_a_missing_folder_is_a_usage_error() {
    let f = fixture();
    // `missing/..` cannot be resolved without guessing, and a guess could
    // hide an overlap with NOTES.
    let pages = f
        .vault
        .join("missing")
        .join("..")
        .join("Notes")
        .join("Pages");
    let expected = format!(
        "error: cannot resolve {}: '..' after a missing folder",
        pages.display()
    );
    assert_usage_error(
        &f,
        &[
            os(&f.notes),
            os(&f.output),
            OsStr::new("--pages"),
            os(&pages),
        ],
        &expected,
    );
}
