//! U2 output lifecycle: examples + properties (FD-P-C09-01~04, DE-P-U2-03,
//! EDGE-007, PUB007, NFR-U2-004 determinism harness).

mod common;

use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use obsidian_press::catalog::PublicationCatalog;
use obsidian_press::output::write_output;
use obsidian_press::scanner::scan_vault;
use proptest::prelude::*;
use tempfile::TempDir;

/// Diagram-free temp vault: byte-level double-run comparison must not depend on
/// external renderer determinism.
fn temp_vault() -> (TempDir, std::path::PathBuf) {
    let tmp = tempfile::tempdir().unwrap();
    let dir = tmp.path().join("vault");
    fs::create_dir_all(&dir).unwrap();
    fs::write(
        dir.join("HP Home.md"),
        "---\npublished: 2024-01-01\nvisibility: homepage\n---\n환영합니다.\n\n<!-- profile:slot -->\n\n## 소개\n\n[[Alpha]] 링크.\n",
    )
    .unwrap();
    fs::write(
        dir.join("Alpha.md"),
        "---\npublished: 2024-02-01\n---\n알파 글. [[HP Home]] 참조와 [[Beta]] 링크.\n",
    )
    .unwrap();
    fs::write(
        dir.join("Beta.md"),
        "---\npublished: 2024-03-01\n---\n베타 글.\n",
    )
    .unwrap();
    (tmp, dir)
}

fn build_catalog(vault: &Path) -> PublicationCatalog {
    PublicationCatalog::build(scan_vault(vault).unwrap()).unwrap()
}

/// Full relative-path → bytes snapshot of an output tree.
fn snapshot(dir: &Path) -> BTreeMap<String, Vec<u8>> {
    let mut map = BTreeMap::new();
    for entry in walkdir_files(dir) {
        let rel = entry
            .strip_prefix(dir)
            .unwrap()
            .to_string_lossy()
            .to_string();
        map.insert(rel, fs::read(&entry).unwrap());
    }
    map
}

fn walkdir_files(dir: &Path) -> Vec<std::path::PathBuf> {
    let mut files = Vec::new();
    let mut stack = vec![dir.to_path_buf()];
    while let Some(d) = stack.pop() {
        for entry in fs::read_dir(&d).unwrap() {
            let path = entry.unwrap().path();
            if path.is_dir() {
                stack.push(path);
            } else {
                files.push(path);
            }
        }
    }
    files.sort();
    files
}

// ---------------------------------------------------------------- examples

/// FD-P-C09-02 + EDGE-007: the homepage is absent from every discovery surface.
#[test]
fn homepage_is_absent_from_every_discovery_surface() {
    let index = scan_vault(Path::new("../fixtures/vault")).unwrap();
    let catalog = PublicationCatalog::build(index).unwrap();
    let tmp = TempDir::new().unwrap();
    write_output(&catalog, tmp.path()).unwrap();

    assert!(!tmp.path().join("posts/fixture-homepage.md").exists());
    assert!(!tmp.path().join("meta/fixture-homepage.json").exists());

    // Structural absence per surface: no entry/node/key may identify the
    // homepage. (Another post's summary text may legitimately contain the
    // title words — that is content, not discovery.)
    let search: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(tmp.path().join("search-index.json")).unwrap())
            .unwrap();
    assert!(
        !search["documents"]
            .as_array()
            .unwrap()
            .iter()
            .any(|d| d["slug"].as_str() == Some("fixture-homepage")),
        "search documents must not include the homepage"
    );

    let graph: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(tmp.path().join("graph.json")).unwrap()).unwrap();
    assert!(
        !graph["nodes"]
            .as_array()
            .unwrap()
            .iter()
            .any(|n| n["slug"].as_str() == Some("fixture-homepage")),
        "graph must have no homepage node"
    );
    assert!(
        !graph["edges"].as_array().unwrap().iter().any(|e| {
            e["source"].as_str() == Some("fixture-homepage")
                || e["target"].as_str() == Some("fixture-homepage")
        }),
        "graph must have no homepage-incident edge"
    );

    let previews: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(tmp.path().join("previews.json")).unwrap())
            .unwrap();
    assert!(
        previews.get("fixture-homepage").is_none(),
        "previews must have no homepage key"
    );

    let nav = fs::read_to_string(tmp.path().join("nav-tree.json")).unwrap();
    assert!(
        !nav.contains("\"fixture-homepage\""),
        "nav tree must not reference the homepage slug"
    );

    // Per-post discovery metadata: no backlink/forward/related entry may name it.
    for meta_path in fs::read_dir(tmp.path().join("meta")).unwrap() {
        let text = fs::read_to_string(meta_path.unwrap().path()).unwrap();
        let v: serde_json::Value = serde_json::from_str(&text).unwrap();
        for key in ["backlinks", "forward_links", "related_posts"] {
            let arr = v[key].as_array().unwrap();
            assert!(
                !arr.iter().any(|s| s.as_str() == Some("fixture-homepage")),
                "{key} leaked the homepage in {v:?}"
            );
        }
    }

    // Unrelated posts stay discoverable (BR-U2-010).
    assert!(tmp.path().join("posts/simple-post.md").exists());
    assert!(tmp.path().join("posts/post-linking-homepage.md").exists());
}

/// FD-P-C09-01 (round-trip half): the dedicated artifact carries the transformed
/// body and the deterministic minimal metadata.
#[test]
fn homepage_artifact_roundtrip() {
    let (_tmp, vault_dir) = temp_vault();
    let catalog = build_catalog(&vault_dir);
    let tmp = TempDir::new().unwrap();
    write_output(&catalog, tmp.path()).unwrap();

    let body = fs::read_to_string(tmp.path().join("homepage/index.md")).unwrap();
    assert!(
        body.contains(r##"<a href="/posts/alpha">Alpha</a>"##),
        "outbound link renders"
    );
    assert!(
        body.contains("<!-- profile:slot -->"),
        "slot token survives transform"
    );

    let meta: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(tmp.path().join("homepage/meta.json")).unwrap())
            .unwrap();
    assert_eq!(meta, serde_json::json!({ "title": "HP Home" }));

    // The post linking to the homepage renders `/`, but records no discovery edge.
    let alpha_meta: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(tmp.path().join("meta/alpha.json")).unwrap())
            .unwrap();
    let forward: Vec<&str> = alpha_meta["forward_links"]
        .as_array()
        .unwrap()
        .iter()
        .map(|s| s.as_str().unwrap())
        .collect();
    assert_eq!(
        forward,
        vec!["beta"],
        "homepage edge must not exist (BR-U2-012)"
    );
    let alpha_body = fs::read_to_string(tmp.path().join("posts/alpha.md")).unwrap();
    assert!(alpha_body.contains(r##"<a href="/">HP Home</a>"##));
}

/// FD-P-C09-03: the manifest equals the actual written file set (itself excluded)
/// and is sorted.
#[test]
fn manifest_matches_written_files_exactly() {
    let (_tmp, vault_dir) = temp_vault();
    let catalog = build_catalog(&vault_dir);
    let tmp = TempDir::new().unwrap();
    write_output(&catalog, tmp.path()).unwrap();

    let manifest: Vec<String> =
        serde_json::from_str(&fs::read_to_string(tmp.path().join("manifest.json")).unwrap())
            .unwrap();
    assert!(
        manifest.windows(2).all(|w| w[0] <= w[1]),
        "manifest is sorted"
    );

    let mut on_disk: Vec<String> = snapshot(tmp.path()).into_keys().collect();
    on_disk.retain(|p| p != "manifest.json");
    assert_eq!(manifest, on_disk);
}

/// PUB007: a write-phase failure reports the diagnostic-shaped error.
#[test]
fn write_failure_is_reported_as_pub007() {
    let (_tmp, vault_dir) = temp_vault();
    let catalog = build_catalog(&vault_dir);
    let tmp = TempDir::new().unwrap();
    let blocked = tmp.path().join("blocked");
    fs::write(&blocked, b"file, not a directory").unwrap();

    let err = write_output(&catalog, &blocked.join("out")).unwrap_err();
    assert!(
        err.to_string().starts_with("PUB007 "),
        "expected PUB007-shaped error, got: {err}"
    );
}

/// FD-P-C09-04 + DE-P-U2-03 + NFR-U2-004: stale artifacts cannot survive, an
/// unmanaged file does, and a re-run over existing output is byte-identical.
#[test]
fn stale_artifacts_removed_and_rerun_is_byte_identical() {
    let (_tmp, vault_dir) = temp_vault();
    let catalog = build_catalog(&vault_dir);
    let tmp = TempDir::new().unwrap();

    // Stale state a publication change could leave behind.
    fs::create_dir_all(tmp.path().join("posts")).unwrap();
    fs::create_dir_all(tmp.path().join("homepage")).unwrap();
    fs::write(
        tmp.path().join("posts/hp-home.md"),
        "stale homepage-as-post",
    )
    .unwrap();
    fs::write(tmp.path().join("homepage/old.md"), "stale artifact").unwrap();
    fs::write(tmp.path().join("graph.json"), "garbage").unwrap();
    fs::write(tmp.path().join("keepme.txt"), "unmanaged").unwrap();

    write_output(&catalog, tmp.path()).unwrap();
    assert!(
        !tmp.path().join("posts/hp-home.md").exists(),
        "stale post removed (EDGE-007)"
    );
    assert!(!tmp.path().join("homepage/old.md").exists());
    assert_eq!(
        fs::read_to_string(tmp.path().join("keepme.txt")).unwrap(),
        "unmanaged"
    );

    let first = snapshot(tmp.path());
    write_output(&catalog, tmp.path()).unwrap();
    let second = snapshot(tmp.path());
    assert_eq!(first, second, "double run must be byte-identical");
}

// -------------------------------------------------------------- properties

/// Clean-run reference computed once: every write_output run pays a lindera
/// dictionary load, so per-case references would breach the NFR-U2-003 budget.
fn reference_snapshot() -> &'static BTreeMap<String, Vec<u8>> {
    static REFERENCE: std::sync::OnceLock<BTreeMap<String, Vec<u8>>> = std::sync::OnceLock::new();
    REFERENCE.get_or_init(|| {
        let (_tmp, vault_dir) = temp_vault();
        let catalog = build_catalog(&vault_dir);
        let reference = TempDir::new().unwrap();
        write_output(&catalog, reference.path()).unwrap();
        snapshot(reference.path())
    })
}

proptest! {
    // NFR-U2-003 adjustment: 32 cases instead of the 256 default. Each case is
    // a full pipeline write including a lindera dictionary load (~0.6s); the
    // default would take >2.5 minutes for this one property and breach the
    // whole-suite 3-minute budget. The input space (junk placement) is small.
    #![proptest_config(ProptestConfig { cases: 32, ..ProptestConfig::default() })]

    /// FD-P-C09-04: arbitrary pre-existing junk in managed namespaces never
    /// survives, unmanaged root files always do, and the final tree equals the
    /// clean-run reference.
    #[test]
    fn output_is_a_function_of_the_catalog_alone(
        junk in proptest::collection::vec(
            (prop_oneof![
                Just("posts"), Just("meta"), Just("assets"), Just("homepage"), Just("")
            ], "[a-z]{1,8}"),
            0..6,
        ),
    ) {
        let (_tmp, vault_dir) = temp_vault();
        let catalog = build_catalog(&vault_dir);
        let expected = reference_snapshot().clone();

        let dirty = TempDir::new().unwrap();
        let mut root_junk = Vec::new();
        for (ns, name) in &junk {
            let file = format!("{name}.txt");
            if ns.is_empty() {
                fs::write(dirty.path().join(&file), b"junk").unwrap();
                root_junk.push(file);
            } else {
                fs::create_dir_all(dirty.path().join(ns)).unwrap();
                fs::write(dirty.path().join(ns).join(&file), b"junk").unwrap();
            }
        }

        write_output(&catalog, dirty.path()).unwrap();
        let mut actual = snapshot(dirty.path());

        // Unmanaged root files are preserved and sit outside the managed set.
        for file in &root_junk {
            let removed = actual.remove(file.as_str());
            prop_assert!(removed.is_some(), "unmanaged root file {file} must survive");
        }
        prop_assert_eq!(actual, expected);
    }
}
