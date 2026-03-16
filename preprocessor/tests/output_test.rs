use obsidian_press::linker::resolve_links;
use obsidian_press::output::write_output;
use obsidian_press::scanner::scan_vault;
use std::path::Path;
use tempfile::TempDir;

fn run_pipeline(output_dir: &Path) {
    let index = scan_vault(Path::new("../fixtures/vault")).unwrap();
    let graph = resolve_links(&index);
    write_output(&index, &graph, output_dir).unwrap();
}

#[test]
fn test_output_creates_directory_structure() {
    let tmp = TempDir::new().unwrap();
    run_pipeline(tmp.path());
    assert!(tmp.path().join("posts").is_dir());
    assert!(tmp.path().join("meta").is_dir());
    assert!(tmp.path().join("assets").is_dir());
    assert!(tmp.path().join("graph.json").is_file());
    assert!(tmp.path().join("search-index.json").is_file());
}

#[test]
fn test_output_writes_post_markdown() {
    let tmp = TempDir::new().unwrap();
    run_pipeline(tmp.path());
    let post_path = tmp.path().join("posts/simple-post.md");
    assert!(post_path.is_file());
    let content = std::fs::read_to_string(&post_path).unwrap();
    assert!(content.contains("simple post with no special syntax"));
}

#[test]
fn test_output_writes_metadata_json() {
    let tmp = TempDir::new().unwrap();
    run_pipeline(tmp.path());
    let meta_path = tmp.path().join("meta/simple-post.json");
    assert!(meta_path.is_file());
    let content = std::fs::read_to_string(&meta_path).unwrap();
    let meta: serde_json::Value = serde_json::from_str(&content).unwrap();
    assert_eq!(meta["slug"], "simple-post");
    assert_eq!(meta["title"], "Simple Post");
    assert!(meta["tags"].is_array());
    assert!(meta["backlinks"].is_array());
    assert!(meta["word_count"].is_number());
    assert!(meta["reading_time_min"].is_number());
}

#[test]
fn test_output_copies_referenced_images() {
    let tmp = TempDir::new().unwrap();
    run_pipeline(tmp.path());
    let image_path = tmp.path().join("assets/test-image.png");
    assert!(image_path.is_file(), "Referenced image should be copied to assets/");
}

#[test]
fn test_output_post_contains_img_tag() {
    let tmp = TempDir::new().unwrap();
    run_pipeline(tmp.path());
    let post_path = tmp.path().join("posts/post-with-image.md");
    let content = std::fs::read_to_string(&post_path).unwrap();
    assert!(
        content.contains(r#"<img src="/assets/test-image.png" alt="test-image" />"#),
        "Post output should contain <img> tag"
    );
}
