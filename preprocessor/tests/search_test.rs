use obsidian_press::scanner::scan_vault;
use obsidian_press::search::build_search_index;
use std::path::Path;

#[test]
fn test_search_index_contains_all_posts() {
    let index = scan_vault(Path::new("../fixtures/vault")).unwrap();
    let search = build_search_index(&index);
    assert_eq!(search.documents.len(), index.posts.len());
}

#[test]
fn test_search_index_tokenizes_content() {
    let index = scan_vault(Path::new("../fixtures/vault")).unwrap();
    let search = build_search_index(&index);
    assert!(!search.inverted_index.is_empty());
}

#[test]
fn test_search_index_serializes_to_json() {
    let index = scan_vault(Path::new("../fixtures/vault")).unwrap();
    let search = build_search_index(&index);
    let json = serde_json::to_string(&search).unwrap();
    assert!(json.contains("documents"));
    assert!(json.contains("inverted_index"));
}
