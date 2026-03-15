use obsidian_press::linker::resolve_links;
use obsidian_press::scanner::scan_vault;
use std::path::Path;

fn fixture_index() -> obsidian_press::types::VaultIndex {
    scan_vault(Path::new("../fixtures/vault")).unwrap()
}

#[test]
fn test_forward_links_detected() {
    let index = fixture_index();
    let graph = resolve_links(&index);
    let post_idx = index.slug_map["post-with-links"];
    let forward = &graph.forward_links[post_idx];
    assert!(forward.iter().any(|l| l.target_slug == "simple-post"));
}

#[test]
fn test_backlinks_built() {
    let index = fixture_index();
    let graph = resolve_links(&index);
    let simple_idx = index.slug_map["simple-post"];
    let backlinks = &graph.backlinks[simple_idx];
    assert!(backlinks.contains(&"post-with-links".to_string()));
    assert!(backlinks.contains(&"hub-page".to_string()));
}

#[test]
fn test_alias_links_resolved() {
    let index = fixture_index();
    let graph = resolve_links(&index);
    let post_idx = index.slug_map["post-with-links"];
    let forward = &graph.forward_links[post_idx];
    let alias_link = forward
        .iter()
        .find(|l| l.alias == Some("alias link".to_string()));
    assert!(alias_link.is_some());
}

#[test]
fn test_graph_json_structure() {
    let index = fixture_index();
    let graph = resolve_links(&index);
    let json = graph.to_graph_json(&index);
    assert!(!json.nodes.is_empty());
    assert!(!json.edges.is_empty());
}
