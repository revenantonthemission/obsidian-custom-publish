//! U1 output: site-page artifacts, bounded attachments, managed namespaces
//! and the summary line (BR1.6, BR5.1–BR5.7; FR1.3, FR2.4; NFR4.4, NFR4.6,
//! NFR5.2, NFR5.3, NFR5.14; AC1.1.1, AC1.1.3, AC1.1.4, AC2.1.2). Rewritten
//! from the U2 suite: no homepage artifact is written any more.

mod common;

use std::collections::{BTreeMap, HashMap};
use std::ffi::OsStr;
use std::fs;
use std::os::unix::fs::symlink;
use std::path::{Path, PathBuf};

use common::{hash_tree, put, run_press, stderr_of, stdout_of};
use obsidian_press::catalog::PublicationCatalog;
use obsidian_press::output::write_output;
use obsidian_press::scanner::scan_sources;
use obsidian_press::types::{PostMeta, VaultIndex};
use proptest::prelude::*;
use tempfile::TempDir;

/// Diagram-free temporary vault pair: byte-level double-run comparison must
/// not depend on external renderer determinism.
struct Pair {
    _tmp: TempDir,
    root: PathBuf,
    notes: PathBuf,
    pages: PathBuf,
}

fn temp_pair() -> Pair {
    let tmp = TempDir::new().unwrap();
    let root = tmp.path().to_path_buf();
    let notes = root.join("Vault/Notes");
    let pages = root.join("Vault/Pages");
    put(
        &notes,
        "HP Home.md",
        "---\npublished: 2024-01-01\nvisibility: homepage\n---\n은퇴한 홈 노트 표식 RETIRED-MARKER.\n",
    );
    put(
        &notes,
        "Alpha.md",
        "---\npublished: 2024-02-01\n---\n알파 글. [[HP Home]] 참조와 [[Beta]] 링크.\n![[photo.png]]\n",
    );
    put(
        &notes,
        "Beta.md",
        "---\npublished: 2024-03-01\n---\n베타 글.\n",
    );
    put(&notes, "attachment/photo.png", "post photo");
    put(
        &pages,
        "About.md",
        "## 소개\n\n[[Alpha]]와 [[HP Home|첫 화면]].\n\n![[photo.png]]\n![사진](portrait.png)\n",
    );
    put(&pages, "Now.md", "지금 하는 일. PAGE-MARKER.\n");
    put(&pages, "attachment/photo.png", "page photo");
    put(&pages, "attachment/portrait.png", "page portrait");
    Pair {
        _tmp: tmp,
        root,
        notes,
        pages,
    }
}

fn catalog_of(notes: &Path, pages: Option<&Path>) -> PublicationCatalog {
    PublicationCatalog::build(scan_sources(notes, pages, false).unwrap().index).unwrap()
}

fn fixture_catalog() -> PublicationCatalog {
    catalog_of(
        Path::new("../fixtures/vault/Notes"),
        Some(Path::new("../fixtures/vault/Pages")),
    )
}

fn read(dir: &Path, rel: &str) -> String {
    fs::read_to_string(dir.join(rel)).unwrap_or_else(|e| panic!("{rel}: {e}"))
}

fn json(dir: &Path, rel: &str) -> serde_json::Value {
    serde_json::from_str(&read(dir, rel)).unwrap()
}

fn manifest(dir: &Path) -> Vec<String> {
    serde_json::from_str(&read(dir, "manifest.json")).unwrap()
}

/// Relative path → bytes of every file under `dir`.
fn snapshot(dir: &Path) -> BTreeMap<String, Vec<u8>> {
    hash_tree(dir)
}

// ------------------------------------------------------------- examples

/// BR5.2: each site page is written as `pages/<slug>.md` and
/// `pages/<slug>.json` holding exactly {slug, title}, keys sorted.
#[test]
fn site_pages_are_written_with_minimal_metadata() {
    let pair = temp_pair();
    let out = TempDir::new().unwrap();
    write_output(&catalog_of(&pair.notes, Some(&pair.pages)), out.path()).unwrap();

    let body = read(out.path(), "pages/about.md");
    assert!(
        body.contains(r#"<a href="/posts/alpha">Alpha</a>"#),
        "{body}"
    );
    assert!(body.contains(r#"<a href="/">첫 화면</a>"#), "{body}");
    assert_eq!(
        read(out.path(), "pages/about.json"),
        "{\n  \"slug\": \"about\",\n  \"title\": \"About\"\n}"
    );
    assert!(out.path().join("pages/now.md").is_file());
    assert_eq!(
        json(out.path(), "pages/now.json"),
        serde_json::json!({"slug": "now", "title": "Now"})
    );
}

/// BR5.3 + NFR4.6: page images go to `assets/pages/` and the body points
/// there, so a page image never shadows a post image of the same name.
#[test]
fn page_images_go_to_assets_pages_and_post_images_stay() {
    let pair = temp_pair();
    let out = TempDir::new().unwrap();
    write_output(&catalog_of(&pair.notes, Some(&pair.pages)), out.path()).unwrap();

    assert_eq!(read(out.path(), "assets/pages/photo.png"), "page photo");
    assert_eq!(
        read(out.path(), "assets/pages/portrait.png"),
        "page portrait"
    );
    assert_eq!(read(out.path(), "assets/photo.png"), "post photo");
    let page = read(out.path(), "pages/about.md");
    assert!(
        page.contains(r#"<img src="/assets/pages/photo.png" alt="" />"#),
        "{page}"
    );
    assert!(
        page.contains("![사진](/assets/pages/portrait.png)"),
        "{page}"
    );
    let post = read(out.path(), "posts/alpha.md");
    assert!(
        post.contains(r#"<img src="/assets/photo.png" alt="" />"#),
        "{post}"
    );
}

/// The fixture page image lands in `assets/pages/portrait.png`.
#[test]
fn fixture_page_image_is_copied_under_pages() {
    let out = TempDir::new().unwrap();
    write_output(&fixture_catalog(), out.path()).unwrap();

    assert!(out.path().join("assets/pages/portrait.png").is_file());
    assert!(read(out.path(), "pages/about.md").contains("/assets/pages/portrait.png"));
}

/// BR5.5: the manifest is sorted, lists `pages/*`, never `homepage/*`, and
/// equals the written file set (itself excluded).
#[test]
fn manifest_lists_pages_and_matches_written_files() {
    let pair = temp_pair();
    let out = TempDir::new().unwrap();
    write_output(&catalog_of(&pair.notes, Some(&pair.pages)), out.path()).unwrap();

    let listed = manifest(out.path());
    assert!(listed.windows(2).all(|w| w[0] < w[1]), "sorted and unique");
    for rel in [
        "pages/about.json",
        "pages/about.md",
        "assets/pages/photo.png",
    ] {
        assert!(listed.contains(&rel.to_string()), "{rel} missing");
    }
    assert!(!listed.iter().any(|p| p.starts_with("homepage/")));
    let mut on_disk: Vec<String> = snapshot(out.path()).into_keys().collect();
    on_disk.retain(|p| p != "manifest.json");
    assert_eq!(listed, on_disk);
}

/// BR5.1 + NFR5.14: a stale `homepage/` from an older run is removed, no new
/// one is written, and an unmanaged file survives.
#[test]
fn stale_homepage_namespace_is_removed() {
    let pair = temp_pair();
    let out = TempDir::new().unwrap();
    put(out.path(), "homepage/index.md", "stale artifact");
    put(out.path(), "homepage/meta.json", "{}");
    put(out.path(), "pages/withdrawn.md", "stale page");
    put(out.path(), "keepme.txt", "unmanaged");

    write_output(&catalog_of(&pair.notes, Some(&pair.pages)), out.path()).unwrap();

    assert!(!out.path().join("homepage").exists());
    assert!(!out.path().join("pages/withdrawn.md").exists());
    assert_eq!(read(out.path(), "keepme.txt"), "unmanaged");
}

/// BR5.4 + BR2.8: site pages and the retired note are absent from every post
/// index; the retired note's body is written nowhere.
#[test]
fn site_pages_and_the_retired_note_are_absent_from_post_indexes() {
    let pair = temp_pair();
    let out = TempDir::new().unwrap();
    write_output(&catalog_of(&pair.notes, Some(&pair.pages)), out.path()).unwrap();
    let hidden = ["about", "now", "hp-home"];

    for slug in hidden {
        assert!(
            !out.path().join(format!("posts/{slug}.md")).exists(),
            "{slug}"
        );
        assert!(
            !out.path().join(format!("meta/{slug}.json")).exists(),
            "{slug}"
        );
    }
    let search = json(out.path(), "search-index.json");
    let graph = json(out.path(), "graph.json");
    let previews = json(out.path(), "previews.json");
    let nav = read(out.path(), "nav-tree.json");
    for slug in hidden {
        let named = |v: &serde_json::Value| v.as_str() == Some(slug);
        assert!(
            !search["documents"]
                .as_array()
                .unwrap()
                .iter()
                .any(|d| named(&d["slug"]))
        );
        assert!(
            !graph["nodes"]
                .as_array()
                .unwrap()
                .iter()
                .any(|n| named(&n["slug"]))
        );
        assert!(
            !graph["edges"]
                .as_array()
                .unwrap()
                .iter()
                .any(|e| { named(&e["source"]) || named(&e["target"]) })
        );
        assert!(previews.get(slug).is_none(), "{slug} preview");
        assert!(!nav.contains(&format!("\"{slug}\"")), "{slug} nav");
    }
    for entry in fs::read_dir(out.path().join("meta")).unwrap() {
        let meta: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(entry.unwrap().path()).unwrap()).unwrap();
        for key in ["backlinks", "forward_links", "related_posts"] {
            for slug in hidden {
                assert!(
                    !meta[key]
                        .as_array()
                        .unwrap()
                        .iter()
                        .any(|s| s.as_str() == Some(slug))
                );
            }
        }
    }
    // Neither the retired note's nor an unlinked page's text leaks into posts.
    for (rel, bytes) in snapshot(out.path()) {
        let text = String::from_utf8_lossy(&bytes);
        assert!(
            !text.contains("RETIRED-MARKER"),
            "retired note leaked into {rel}"
        );
        if !rel.starts_with("pages/") {
            assert!(!text.contains("PAGE-MARKER"), "page leaked into {rel}");
        }
    }
}

/// FR2.2 + BR2.4 (review R-01): a post and the retired homepage note sharing a
/// slug stop the run with exit 1 before anything is written, so the retired
/// note's body can never be published under the post's metadata.
#[test]
fn a_post_sharing_the_retired_notes_slug_publishes_nothing() {
    let tmp = TempDir::new().unwrap();
    let notes = tmp.path().join("Vault/Notes");
    let out = tmp.path().join("out");
    put(
        &notes,
        "Passion Project!.md",
        "---\npublished: 2024-02-01\n---\n공개 글 POST-MARKER.\n",
    );
    put(
        &notes,
        "Passion Project.md",
        "---\npublished: 2024-01-01\nvisibility: homepage\n---\n비공개 홈 노트 RETIRED-MARKER.\n",
    );

    let run = run_press(&[notes.as_os_str(), out.as_os_str()]);

    assert_eq!(run.status.code(), Some(1), "stderr: {}", stderr_of(&run));
    let stderr = stderr_of(&run);
    assert!(
        stderr.lines().any(|l| l.starts_with("PUB008 ")
            && l.contains("Passion Project!.md")
            && l.contains("Passion Project.md")),
        "stderr: {stderr}"
    );
    let written = hash_tree(&out);
    assert!(written.is_empty(), "nothing may be written: {written:?}");
    for (rel, bytes) in &written {
        assert!(
            !String::from_utf8_lossy(bytes).contains("RETIRED-MARKER"),
            "retired note leaked into {rel}"
        );
    }
    assert!(!stdout_of(&run).contains("RETIRED-MARKER"));
}

/// BR1.6 + NFR5.2: the image lookup stops at the source root: an image found
/// only in `<parent of NOTES>/attachment/` is not copied, with a warning.
#[test]
fn image_lookup_never_leaves_the_source_root() {
    let pair = temp_pair();
    put(&pair.notes, "Gamma.md", "감마 글.\n![[beside.png]]\n");
    put(&pair.root, "Vault/attachment/beside.png", "outside NOTES");
    let out = pair.root.join("out");

    let run = run_press(&[
        pair.notes.as_os_str(),
        out.as_os_str(),
        OsStr::new("--pages"),
        pair.pages.as_os_str(),
    ]);

    assert_eq!(run.status.code(), Some(0), "stderr: {}", stderr_of(&run));
    assert!(!out.join("assets/beside.png").exists());
    assert!(!manifest(&out).contains(&"assets/beside.png".to_string()));
    assert!(
        stderr_of(&run)
            .lines()
            .any(|l| l == "warning: attachment not found: beside.png"),
        "{}",
        stderr_of(&run)
    );
}

/// NFR5.3: an attachment that is a symbolic link is treated as missing.
#[test]
fn a_symlinked_image_is_not_copied() {
    let pair = temp_pair();
    let real = put(&pair.root, "Elsewhere/real.png", "linked bytes");
    symlink(&real, pair.notes.join("attachment/linked.png")).unwrap();
    put(&pair.notes, "Gamma.md", "감마 글.\n![[linked.png]]\n");
    let out = TempDir::new().unwrap();

    write_output(&catalog_of(&pair.notes, Some(&pair.pages)), out.path()).unwrap();

    assert!(!out.path().join("assets/linked.png").exists());
    assert!(!manifest(out.path()).contains(&"assets/linked.png".to_string()));
}

/// NFR-design R-major: `![[../../x.png]]` copies to `assets/x.png` only and
/// the URL uses the file name; nothing is written outside OUTPUT.
#[test]
fn dot_dot_in_an_image_embed_never_escapes_output() {
    let pair = temp_pair();
    put(&pair.notes, "attachment/x.png", "x bytes");
    put(&pair.notes, "Gamma.md", "감마 글.\n![[../../x.png]]\n");
    let out = pair.root.join("work/out");
    fs::create_dir_all(&out).unwrap();
    let mut before = hash_tree(&pair.root);
    before.retain(|rel, _| !rel.starts_with("work/out"));

    write_output(&catalog_of(&pair.notes, Some(&pair.pages)), &out).unwrap();

    assert_eq!(read(&out, "assets/x.png"), "x bytes");
    let gamma = read(&out, "posts/gamma.md");
    assert!(
        gamma.contains(r#"<img src="/assets/x.png" alt="" />"#),
        "{gamma}"
    );
    assert!(!gamma.contains(".."), "{gamma}");
    let mut after = hash_tree(&pair.root);
    after.retain(|rel, _| !rel.starts_with("work/out"));
    assert_eq!(after, before, "nothing written outside OUTPUT");
    assert!(manifest(&out).iter().all(|p| !p.contains("..")));
}

/// NFR4.4: the summary is the last stdout line, counted from what was written.
#[test]
fn the_summary_line_is_the_last_stdout_line() {
    let pair = temp_pair();
    let out = pair.root.join("out");

    let run = run_press(&[
        pair.notes.as_os_str(),
        out.as_os_str(),
        OsStr::new("--pages"),
        pair.pages.as_os_str(),
    ]);

    assert_eq!(run.status.code(), Some(0), "stderr: {}", stderr_of(&run));
    let stdout = stdout_of(&run);
    // 2 posts (Alpha, Beta); 2 site pages; 3 images (one post, two page).
    assert_eq!(
        stdout.lines().last(),
        Some("published 2 posts, 2 site pages, 3 assets"),
        "{stdout}"
    );
    assert!(!stdout.contains("Homepage source"), "{stdout}");
    assert!(!stdout.contains("Done."), "{stdout}");
}

/// PUB007: a write-phase failure reports the diagnostic-shaped error.
#[test]
fn write_failure_is_reported_as_pub007() {
    let pair = temp_pair();
    let catalog = catalog_of(&pair.notes, Some(&pair.pages));
    let tmp = TempDir::new().unwrap();
    let blocked = tmp.path().join("blocked");
    fs::write(&blocked, b"file, not a directory").unwrap();

    let err = write_output(&catalog, &blocked.join("out")).unwrap_err();
    assert!(
        err.to_string().starts_with("PUB007 "),
        "expected PUB007-shaped error, got: {err}"
    );
}

/// BR5.1 + BR5.6: stale managed files go, an unmanaged file stays, and a
/// re-run over existing output is byte-identical.
#[test]
fn stale_artifacts_removed_and_rerun_is_byte_identical() {
    let pair = temp_pair();
    let catalog = catalog_of(&pair.notes, Some(&pair.pages));
    let out = TempDir::new().unwrap();
    put(out.path(), "posts/hp-home.md", "stale homepage-as-post");
    put(out.path(), "assets/pages/old.png", "withdrawn page image");
    put(out.path(), "graph.json", "garbage");
    put(out.path(), "keepme.txt", "unmanaged");

    write_output(&catalog, out.path()).unwrap();
    assert!(!out.path().join("posts/hp-home.md").exists());
    assert!(!out.path().join("assets/pages/old.png").exists());
    assert_eq!(read(out.path(), "keepme.txt"), "unmanaged");

    let first = snapshot(out.path());
    write_output(&catalog, out.path()).unwrap();
    assert_eq!(
        first,
        snapshot(out.path()),
        "double run must be byte-identical"
    );
}

// ----------------------------------------------------------- properties

/// Rebuild an index from notes in the given order, keeping that order.
fn reindex(posts: Vec<PostMeta>, like: &VaultIndex) -> VaultIndex {
    let slug_map: HashMap<String, usize> = posts
        .iter()
        .enumerate()
        .map(|(i, p)| (p.slug.clone(), i))
        .collect();
    let name_map: HashMap<String, usize> = posts
        .iter()
        .enumerate()
        .map(|(i, p)| (p.title.clone(), i))
        .collect();
    VaultIndex {
        posts,
        slug_map,
        name_map,
        heading_map: like.heading_map.clone(),
        block_map: like.block_map.clone(),
    }
}

/// The pages and manifest of one clean run, the comparison reference.
fn pages_and_manifest(dir: &Path) -> BTreeMap<String, Vec<u8>> {
    snapshot(dir)
        .into_iter()
        .filter(|(rel, _)| rel.starts_with("pages/") || rel == "manifest.json")
        .collect()
}

proptest! {
    // Each case is a full pipeline write including a lindera dictionary load,
    // so the case count stays small (the U2 suite's NFR-U2-003 budget).
    #![proptest_config(ProptestConfig { cases: 16, ..ProptestConfig::default() })]

    /// BR5.6 + NFR4: the same notes in any input order give byte-identical
    /// `pages/` files and manifest.
    #[test]
    fn pages_and_manifest_do_not_depend_on_input_order(seed in any::<u64>()) {
        let pair = temp_pair();
        let scanned = scan_sources(&pair.notes, Some(&pair.pages), false).unwrap().index;

        let reference_out = TempDir::new().unwrap();
        let ordered = reindex(scanned.posts.clone(), &scanned);
        write_output(&PublicationCatalog::build(ordered).unwrap(), reference_out.path()).unwrap();

        // A deterministic shuffle of the scanned order from the seed.
        let mut shuffled = scanned.posts.clone();
        let mut state = seed;
        for i in (1..shuffled.len()).rev() {
            state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
            shuffled.swap(i, (state >> 33) as usize % (i + 1));
        }
        let shuffled_out = TempDir::new().unwrap();
        let catalog = PublicationCatalog::build(reindex(shuffled, &scanned)).unwrap();
        write_output(&catalog, shuffled_out.path()).unwrap();

        prop_assert_eq!(
            pages_and_manifest(shuffled_out.path()),
            pages_and_manifest(reference_out.path())
        );
    }
}
