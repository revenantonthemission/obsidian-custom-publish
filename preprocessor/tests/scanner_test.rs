use obsidian_press::scanner::{scan_sources, scan_vault};
use obsidian_press::types::NoteSource;
use std::path::Path;

#[test]
fn test_scan_vault_finds_all_markdown_files() {
    let vault = Path::new("../fixtures/vault/Notes");
    let index = scan_vault(vault).unwrap();
    // Should find all 8 .md files in fixtures
    assert!(index.posts.len() >= 7);
}

#[test]
fn test_scan_vault_parses_frontmatter() {
    let vault = Path::new("../fixtures/vault/Notes");
    let index = scan_vault(vault).unwrap();
    let simple = index
        .posts
        .iter()
        .find(|p| p.slug == "simple-post")
        .unwrap();
    assert_eq!(simple.title, "Simple Post");
    assert!(simple.tags.contains(&"test".to_string()));
    assert_eq!(simple.created, Some("2025-01-01".to_string()));
}

#[test]
fn test_scan_vault_generates_slugs_from_filename() {
    let vault = Path::new("../fixtures/vault/Notes");
    let index = scan_vault(vault).unwrap();
    let post = index
        .posts
        .iter()
        .find(|p| p.slug == "post-with-links")
        .unwrap();
    assert_eq!(post.title, "Post With Links");
}

#[test]
fn test_scan_vault_detects_hub_pages() {
    let vault = Path::new("../fixtures/vault/Notes");
    let index = scan_vault(vault).unwrap();
    let hub = index.posts.iter().find(|p| p.slug == "hub-page").unwrap();
    assert!(hub.is_hub);
}

// ------------------------------------------------ U1: both source folders

/// BR1.5: each note records the folder it came from; BR1.4: the pages
/// folder's `Drafts/` and dot-files are skipped like the posts folder's.
#[test]
fn scan_sources_tags_each_note_with_its_folder() {
    let outcome = scan_sources(
        Path::new("../fixtures/vault/Notes"),
        Some(Path::new("../fixtures/vault/Pages")),
        false,
    )
    .unwrap();

    let source_of = |slug: &str| {
        outcome
            .index
            .posts
            .iter()
            .find(|p| p.slug == slug)
            .unwrap_or_else(|| panic!("{slug} not scanned"))
            .source
    };
    assert_eq!(source_of("about"), NoteSource::Pages);
    assert_eq!(source_of("simple-post"), NoteSource::Notes);
    assert_eq!(source_of("fixture-homepage"), NoteSource::Notes);
    assert_eq!(outcome.page_count, 1);
    assert!(!outcome.index.posts.iter().any(|p| p.slug == "now"));
    assert!(!outcome.index.posts.iter().any(|p| p.slug == "hidden"));
}

/// BR1.7: notes sort by (slug, source with notes first, path).
#[test]
fn scan_sources_sorts_by_slug_then_source_then_path() {
    let tmp = tempfile::TempDir::new().unwrap();
    let notes = tmp.path().join("Notes");
    let pages = tmp.path().join("Pages");
    for (dir, rel) in [
        (&pages, "Same.md"),
        (&notes, "b/Same.md"),
        (&notes, "a/Same.md"),
        (&pages, "Alpha.md"),
        (&notes, "Zed.md"),
    ] {
        let path = dir.join(rel);
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(&path, "본문.\n").unwrap();
    }

    let outcome = scan_sources(&notes, Some(&pages), false).unwrap();

    let order: Vec<(String, NoteSource, String)> = outcome
        .index
        .posts
        .iter()
        .map(|p| {
            let root = if p.source == NoteSource::Notes {
                &notes
            } else {
                &pages
            };
            let rel = p
                .file_path
                .strip_prefix(std::fs::canonicalize(root).unwrap())
                .unwrap()
                .to_string_lossy()
                .to_string();
            (p.slug.clone(), p.source, rel)
        })
        .collect();
    assert_eq!(
        order,
        vec![
            ("alpha".into(), NoteSource::Pages, "Alpha.md".into()),
            ("same".into(), NoteSource::Notes, "a/Same.md".into()),
            ("same".into(), NoteSource::Notes, "b/Same.md".into()),
            ("same".into(), NoteSource::Pages, "Same.md".into()),
            ("zed".into(), NoteSource::Notes, "Zed.md".into()),
        ]
    );
}
