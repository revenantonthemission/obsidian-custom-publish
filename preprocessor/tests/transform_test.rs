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
fn test_wikilinks_converted_to_html_links() {
    let (index, graph) = fixture_setup();
    let post_idx = index.slug_map["post-with-links"];
    let result = transform_content(&index, &graph, post_idx);
    assert!(result.contains(r#"<a href="/posts/simple-post">"#));
}

#[test]
fn test_alias_links_use_alias_text() {
    let (index, graph) = fixture_setup();
    let post_idx = index.slug_map["post-with-links"];
    let result = transform_content(&index, &graph, post_idx);
    assert!(result.contains(r#"<a href="/posts/simple-post">alias link</a>"#));
}

#[test]
fn test_callouts_converted_to_divs() {
    let (index, graph) = fixture_setup();
    let post_idx = index.slug_map["post-with-callouts"];
    let result = transform_content(&index, &graph, post_idx);
    assert!(result.contains(r#"<div class="callout callout-note">"#));
    assert!(result.contains(r#"<div class="callout callout-warning">"#));
}

#[test]
fn test_transclusions_inlined() {
    let (index, graph) = fixture_setup();
    let post_idx = index.slug_map["post-with-transclusion"];
    let result = transform_content(&index, &graph, post_idx);
    // Should contain content from Simple Post, not the ![[]] syntax
    assert!(!result.contains("![[Simple Post]]"));
    assert!(result.contains("simple post with no special syntax"));
}

#[test]
fn test_latex_passed_through_unchanged() {
    let (index, graph) = fixture_setup();
    let post_idx = index.slug_map["post-with-math"];
    let result = transform_content(&index, &graph, post_idx);
    assert!(result.contains("$f(x) = x^2 + 1$"));
    assert!(result.contains(r"\int_0^1"));
}

#[test]
fn test_footnotes_preserved() {
    let (index, graph) = fixture_setup();
    let post_idx = index.slug_map["post-with-footnotes"];
    let result = transform_content(&index, &graph, post_idx);
    assert!(result.contains("[^context-switch]"));
    assert!(result.contains("[^tlb-flush]"));
}

#[test]
fn test_unresolved_wikilinks_become_plain_text() {
    let (index, graph) = fixture_setup();
    let post_idx = index.slug_map["post-with-links"];
    let result = transform_content(&index, &graph, post_idx);
    // Should not contain [[Nonexistent Page]] as a wikilink
    assert!(!result.contains("[[Nonexistent Page]]"));
    // Should contain the text without brackets
    assert!(result.contains("Nonexistent Page"));
}
