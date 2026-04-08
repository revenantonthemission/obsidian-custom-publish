use obsidian_press::scanner::scan_vault;
use obsidian_press::transform::transform_content;
use std::path::Path;

fn fixture_setup() -> obsidian_press::types::VaultIndex {
    scan_vault(Path::new("../fixtures/vault")).unwrap()
}

#[test]
fn test_wikilinks_converted_to_html_links() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-links"];
    let result = transform_content(&index, post_idx);
    assert!(result.contains(r#"<a href="/posts/simple-post">"#));
}

#[test]
fn test_alias_links_use_alias_text() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-links"];
    let result = transform_content(&index, post_idx);
    assert!(result.contains(r#"<a href="/posts/simple-post">alias link</a>"#));
}

#[test]
fn test_callouts_converted_to_divs() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-callouts"];
    let result = transform_content(&index, post_idx);
    assert!(result.contains(r#"<div class="callout callout-note">"#));
    assert!(result.contains(r#"<div class="callout callout-warning">"#));
}

#[test]
fn test_transclusions_inlined() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-transclusion"];
    let result = transform_content(&index, post_idx);
    // Should contain content from Simple Post, not the ![[]] syntax
    assert!(!result.contains("![[Simple Post]]"));
    assert!(result.contains("simple post with no special syntax"));
}

#[test]
fn test_latex_passed_through_unchanged() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-math"];
    let result = transform_content(&index, post_idx);
    assert!(result.contains("$f(x) = x^2 + 1$"));
    assert!(result.contains(r"\int_0^1"));
}

#[test]
fn test_footnotes_preserved() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-footnotes"];
    let result = transform_content(&index, post_idx);
    assert!(result.contains("[^context-switch]"));
    assert!(result.contains("[^tlb-flush]"));
}

#[test]
fn test_unresolved_wikilinks_become_plain_text() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-links"];
    let result = transform_content(&index, post_idx);
    // Should not contain [[Nonexistent Page]] as a wikilink
    assert!(!result.contains("[[Nonexistent Page]]"));
    // Should contain the text without brackets
    assert!(result.contains("Nonexistent Page"));
}

#[test]
fn test_inline_comments_stripped() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-formatting"];
    let result = transform_content(&index, post_idx);
    assert!(!result.contains("%%inline comment%%"));
    assert!(!result.contains("inline comment"));
    assert!(result.contains("Visible text"));
    assert!(result.contains("more visible text"));
}

#[test]
fn test_block_comments_stripped() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-formatting"];
    let result = transform_content(&index, post_idx);
    assert!(!result.contains("This is a block comment"));
    assert!(!result.contains("spans multiple lines"));
    assert!(result.contains("Text after block comment"));
}

#[test]
fn test_highlights_converted_to_mark_tags() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-formatting"];
    let result = transform_content(&index, post_idx);
    assert!(result.contains("<mark>highlighted text</mark>"));
    assert!(!result.contains("==highlighted text=="));
}

#[test]
fn test_multiple_highlights_on_one_line() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-formatting"];
    let result = transform_content(&index, post_idx);
    assert!(result.contains("<mark>highlights</mark>"));
    assert!(result.contains("<mark>one line</mark>"));
}

#[test]
fn test_heading_transclusion() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-transclusion"];
    let result = transform_content(&index, post_idx);
    // The heading transclusion syntax should be resolved
    assert!(!result.contains("![[Simple Post#Introduction]]"), "Heading transclusion syntax should be removed");
    // Should contain the Introduction section content
    assert!(result.contains("Some intro text here"));
    assert!(result.contains("More introduction content"));
    assert!(result.contains("End of heading transclusion"));
}

#[test]
fn test_heading_transclusion_boundary() {
    // Unit-test the heading section extraction directly
    let content = "## First\n\nContent A.\n\n## Second\n\nContent B.\n\n## Third\n\nContent C.\n";
    let section = obsidian_press::transform::extract_heading_section(content, "Second");
    let section = section.expect("Section should be found");
    assert!(section.contains("Content B"), "Should include section content");
    assert!(!section.contains("Content A"), "Should not include prior section");
    assert!(!section.contains("Content C"), "Should stop at next same-level heading");
}
