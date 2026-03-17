use obsidian_press::scanner::scan_vault;
use obsidian_press::transform::transform_content;
use std::path::Path;

fn fixture_setup() -> obsidian_press::types::VaultIndex {
    scan_vault(Path::new("../fixtures/vault")).unwrap()
}

#[test]
fn test_heading_ref_produces_anchor_with_fragment() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-links"];
    let result = transform_content(&index, post_idx);
    assert!(
        result.contains(r#"<a href="/posts/simple-post#introduction">"#),
        "Heading ref should produce link with #fragment. Got: {result}"
    );
}

#[test]
fn test_heading_ref_default_display_text() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-links"];
    let result = transform_content(&index, post_idx);
    assert!(
        result.contains("Simple Post &gt; Introduction</a>"),
        "Default display should be 'Note > Heading'. Got: {result}"
    );
}

#[test]
fn test_heading_ref_with_alias() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-links"];
    let result = transform_content(&index, post_idx);
    assert!(
        result.contains(r#"<a href="/posts/simple-post#한국어-제목">Korean section</a>"#),
        "Heading ref with alias should use alias text. Got: {result}"
    );
}

#[test]
fn test_heading_ref_korean_slug() {
    let index = fixture_setup();
    let post_idx = index.slug_map["post-with-links"];
    let result = transform_content(&index, post_idx);
    assert!(
        result.contains(r#"#한국어-제목"#),
        "Korean heading should be slugified preserving Hangul. Got: {result}"
    );
}
