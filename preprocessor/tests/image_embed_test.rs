use obsidian_press::linker::resolve_links;
use obsidian_press::output::write_output;
use obsidian_press::scanner::scan_vault;
use obsidian_press::transform::{transform_content, transform_content_with_assets};
use std::path::Path;
use tempfile::TempDir;

fn fixture_setup() -> (obsidian_press::types::VaultIndex, obsidian_press::types::LinkGraph) {
    let index = scan_vault(Path::new("../fixtures/vault")).unwrap();
    let graph = resolve_links(&index);
    (index, graph)
}

#[test]
fn test_image_embed_basic() {
    let (index, graph) = fixture_setup();
    let post_idx = index.slug_map["post-with-transclusion"];
    let result = transform_content(&index, &graph, post_idx);
    assert!(
        result.contains(r#"<img src="/assets/test-image.png" alt="" />"#),
        "Expected basic image embed tag, got:\n{result}"
    );
}

#[test]
fn test_image_embed_with_width() {
    let (index, graph) = fixture_setup();
    let post_idx = index.slug_map["post-with-transclusion"];
    let result = transform_content(&index, &graph, post_idx);
    assert!(
        result.contains(r#"width="300""#),
        "Expected width attribute, got:\n{result}"
    );
}

#[test]
fn test_image_embed_with_dimensions() {
    let (index, graph) = fixture_setup();
    let post_idx = index.slug_map["post-with-transclusion"];
    let result = transform_content(&index, &graph, post_idx);
    assert!(
        result.contains(r#"width="300" height="200""#),
        "Expected width and height attributes, got:\n{result}"
    );
}

#[test]
fn test_image_embed_not_treated_as_transclusion() {
    let (index, graph) = fixture_setup();
    let post_idx = index.slug_map["post-with-transclusion"];
    let result = transform_content(&index, &graph, post_idx);
    // Image filenames should NOT appear as plain text (which is what transclusion does for unresolved names)
    assert!(
        !result.contains("test-image.png\n"),
        "Image filename should not appear as plain text from transclusion fallback, got:\n{result}"
    );
}

#[test]
fn test_image_files_returned_by_transform() {
    let (index, graph) = fixture_setup();
    let post_idx = index.slug_map["post-with-transclusion"];

    let tmp_dir = std::env::temp_dir().join("obsidian-press-test-assets");
    let _ = std::fs::remove_dir_all(&tmp_dir);
    std::fs::create_dir_all(&tmp_dir).unwrap();

    let (_content, images) = transform_content_with_assets(&index, &graph, post_idx, Some(&tmp_dir));

    // Should report the referenced image filename
    assert!(
        images.contains(&"test-image.png".to_string()),
        "Expected test-image.png in referenced images list, got: {images:?}"
    );

    // Clean up
    let _ = std::fs::remove_dir_all(&tmp_dir);
}

#[test]
fn test_image_files_copied_to_assets_by_write_output() {
    let (index, graph) = fixture_setup();
    let tmp = TempDir::new().unwrap();
    write_output(&index, &graph, tmp.path()).unwrap();

    let asset_path = tmp.path().join("assets/test-image.png");
    assert!(
        asset_path.exists(),
        "Image file should be physically copied to assets/ directory by write_output"
    );
}
