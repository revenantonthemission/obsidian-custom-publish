use obsidian_press::catalog::PublicationCatalog;
use obsidian_press::output::write_output;
use obsidian_press::scanner::scan_vault;
use std::path::Path;
use tempfile::TempDir;

#[test]
fn test_previews_json_generated() {
    let index = scan_vault(Path::new("../fixtures/vault")).unwrap();
    let tmp = TempDir::new().unwrap();
    let catalog = PublicationCatalog::build(index).unwrap();
    write_output(&catalog, tmp.path()).unwrap();

    let previews_path = tmp.path().join("previews.json");
    assert!(previews_path.exists(), "previews.json should be generated");

    let content = std::fs::read_to_string(&previews_path).unwrap();
    let previews: serde_json::Value = serde_json::from_str(&content).unwrap();

    assert!(
        previews.get("simple-post").is_some(),
        "Should have simple-post preview"
    );
    let preview = &previews["simple-post"];
    assert_eq!(preview["title"].as_str().unwrap(), "Simple Post");
    assert!(
        preview["summary"].as_str().unwrap().len() > 0,
        "Summary should not be empty"
    );
}
