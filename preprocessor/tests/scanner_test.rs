use obsidian_press::scanner::scan_vault;
use std::path::Path;

#[test]
fn test_scan_vault_finds_all_markdown_files() {
    let vault = Path::new("../fixtures/vault");
    let index = scan_vault(vault).unwrap();
    // Should find all 8 .md files in fixtures
    assert!(index.posts.len() >= 7);
}

#[test]
fn test_scan_vault_parses_frontmatter() {
    let vault = Path::new("../fixtures/vault");
    let index = scan_vault(vault).unwrap();
    let simple = index.posts.iter().find(|p| p.slug == "simple-post").unwrap();
    assert_eq!(simple.title, "Simple Post");
    assert!(simple.tags.contains(&"test".to_string()));
    assert_eq!(simple.created, Some("2025-01-01".to_string()));
}

#[test]
fn test_scan_vault_generates_slugs_from_filename() {
    let vault = Path::new("../fixtures/vault");
    let index = scan_vault(vault).unwrap();
    let post = index.posts.iter().find(|p| p.slug == "post-with-links").unwrap();
    assert_eq!(post.title, "Post With Links");
}

#[test]
fn test_scan_vault_detects_hub_pages() {
    let vault = Path::new("../fixtures/vault");
    let index = scan_vault(vault).unwrap();
    let hub = index.posts.iter().find(|p| p.slug == "hub-page").unwrap();
    assert!(hub.is_hub);
}

#[test]
fn test_scan_vault_indexes_attachments() {
    let vault = Path::new("../fixtures/vault");
    let index = scan_vault(vault).unwrap();
    assert!(index.attachment_map.contains_key("test-image.png"));
    let path = &index.attachment_map["test-image.png"];
    assert!(path.exists());
}
