use obsidian_press::linker::resolve_links;
use obsidian_press::scanner::scan_vault;
use obsidian_press::transform::transform_content;
use std::path::Path;

fn fixture_setup() -> (obsidian_press::types::VaultIndex, obsidian_press::types::LinkGraph) {
    let index = scan_vault(Path::new("../fixtures/vault")).unwrap();
    let graph = resolve_links(&index);
    (index, graph)
}

#[test]
fn test_block_id_replaced_with_anchor() {
    let (index, graph) = fixture_setup();
    let post_idx = index.slug_map["simple-post"];
    let result = transform_content(&index, &graph, post_idx);
    assert!(
        result.contains(r#"<span id="^intro"></span>"#),
        "Block ID should be replaced with invisible anchor. Got: {result}"
    );
    assert!(
        !result.contains(" ^intro\n"),
        "Block ID annotation should not appear as visible text"
    );
}

#[test]
fn test_block_ref_link() {
    let (index, graph) = fixture_setup();
    let post_idx = index.slug_map["post-with-block-refs"];
    let result = transform_content(&index, &graph, post_idx);
    assert!(
        result.contains(r#"<a href="/posts/simple-post#^intro">"#),
        "Block ref should produce link with #^block-id fragment. Got: {result}"
    );
}

#[test]
fn test_block_ref_with_alias() {
    let (index, graph) = fixture_setup();
    let post_idx = index.slug_map["post-with-block-refs"];
    let result = transform_content(&index, &graph, post_idx);
    assert!(
        result.contains(r#"<a href="/posts/simple-post#^intro-text">intro text link</a>"#),
        "Block ref with alias should use alias text. Got: {result}"
    );
}

#[test]
fn test_block_transclusion() {
    let (index, graph) = fixture_setup();
    let post_idx = index.slug_map["post-with-block-refs"];
    let result = transform_content(&index, &graph, post_idx);
    assert!(
        !result.contains("![[Simple Post#^intro]]"),
        "Block transclusion syntax should be replaced"
    );
    assert!(
        result.contains("simple post with no special syntax"),
        "Block transclusion should inline the referenced paragraph. Got: {result}"
    );
}
