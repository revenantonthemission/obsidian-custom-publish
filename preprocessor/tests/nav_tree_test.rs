use obsidian_press::linker::resolve_links;
use obsidian_press::output::write_output;
use obsidian_press::scanner::scan_vault;
use std::path::Path;
use tempfile::TempDir;

#[test]
fn test_nav_tree_json_generated() {
    let index = scan_vault(Path::new("../fixtures/vault")).unwrap();
    let graph = resolve_links(&index);
    let tmp = TempDir::new().unwrap();
    write_output(&index, &graph, tmp.path()).unwrap();

    let tree_path = tmp.path().join("nav-tree.json");
    assert!(tree_path.exists(), "nav-tree.json should be generated");

    let content = std::fs::read_to_string(&tree_path).unwrap();
    let tree: serde_json::Value = serde_json::from_str(&content).unwrap();
    assert!(tree["roots"].is_array(), "Should have roots array");
    let roots = tree["roots"].as_array().unwrap();
    assert!(
        roots.iter().any(|r| r["slug"].as_str() == Some("hub-page")),
        "Hub Page should be in roots"
    );
}

#[test]
fn test_nav_tree_hub_children() {
    let index = scan_vault(Path::new("../fixtures/vault")).unwrap();
    let graph = resolve_links(&index);
    let tmp = TempDir::new().unwrap();
    write_output(&index, &graph, tmp.path()).unwrap();

    let content = std::fs::read_to_string(tmp.path().join("nav-tree.json")).unwrap();
    let tree: serde_json::Value = serde_json::from_str(&content).unwrap();
    let roots = tree["roots"].as_array().unwrap();
    let hub = roots
        .iter()
        .find(|r| r["slug"].as_str() == Some("hub-page"))
        .unwrap();
    let children = hub["children"].as_array().unwrap();
    assert!(
        children
            .iter()
            .any(|c| c["slug"].as_str() == Some("simple-post")),
        "Simple Post should be a child of Hub Page"
    );
}
