//! U1 publication catalog: classification and boundary checks
//! (BR2.1–BR2.8; FR1.2, FR1.6, FR2.1–FR2.3; NFR5.7, NFR5.8, NFR4.5;
//! AC1.3.3, AC2.1.1, AC2.2.1, AC2.2.2). Rewritten from the U2 suite: PUB002 is
//! retired, the homepage note is optional, and site pages are new.

mod common;

use std::path::{Path, PathBuf};

use common::{hash_tree, make_index, make_post, put, run_press, stderr_of};
use obsidian_press::catalog::{
    DiagnosticCode, EntryKind, PublicationCatalog, PublicationDiagnostic, PublicationScope,
    format_diagnostic, parse_scope,
};
use obsidian_press::scanner::{scan_sources, scan_vault};
use obsidian_press::types::{NoteSource, PostMeta, RawVisibility};
use proptest::prelude::*;

fn scalar(v: &str) -> Option<RawVisibility> {
    Some(RawVisibility::Scalar(v.to_string()))
}

/// A post in the posts folder: path `vault/<slug>.md`, title `T <slug>`.
fn post(slug: &str, body: &str) -> PostMeta {
    make_post(slug, &format!("T {slug}"), None, body)
}

/// A note in the site-pages folder: path `pages/<slug>.md`.
fn page(slug: &str, body: &str) -> PostMeta {
    let mut note = make_post(slug, &format!("T {slug}"), None, body);
    note.source = NoteSource::Pages;
    note.file_path = PathBuf::from(format!("pages/{slug}.md"));
    note
}

fn retired(slug: &str, body: &str) -> PostMeta {
    make_post(slug, &format!("T {slug}"), scalar("homepage"), body)
}

/// (code, path, other path) of each diagnostic, in reported order.
fn summary(diags: &[PublicationDiagnostic]) -> Vec<(DiagnosticCode, String, Option<String>)> {
    diags
        .iter()
        .map(|d| (d.code, d.path.clone(), d.other_path.clone()))
        .collect()
}

fn build_err(notes: Vec<PostMeta>) -> Vec<PublicationDiagnostic> {
    PublicationCatalog::build(make_index(notes)).unwrap_err()
}

fn some(path: &str) -> Option<String> {
    Some(path.to_string())
}

// ------------------------------------------------------------- examples

#[test]
fn scope_parsing_recognizes_exact_lowercase_scalars_only() {
    assert_eq!(parse_scope(&None).unwrap(), PublicationScope::Post);
    assert_eq!(
        parse_scope(&scalar("post")).unwrap(),
        PublicationScope::Post
    );
    assert_eq!(
        parse_scope(&scalar("homepage")).unwrap(),
        PublicationScope::Homepage
    );
    for bad in ["Homepage", "HOMEPAGE", " homepage", "homepage ", "home"] {
        let err = parse_scope(&scalar(bad)).unwrap_err();
        assert!(
            err.contains(bad),
            "detail must carry the found value: {err}"
        );
    }
}

/// BR2.1: the folder decides first. A `visibility: homepage` note, or one with
/// an unknown value, in the pages folder is a site page and raises nothing.
#[test]
fn folder_first_a_pages_note_is_a_site_page_whatever_its_visibility() {
    let mut marked = page("about", "소개.\n");
    marked.visibility = scalar("homepage");
    let mut odd = page("now", "지금.\n");
    odd.visibility = scalar("mystery");

    let catalog =
        PublicationCatalog::build(make_index(vec![marked, odd, post("p1", "글.\n")])).unwrap();

    assert!(catalog.retired().is_none());
    let pages: Vec<&str> = catalog.site_pages().map(|p| p.slug.as_str()).collect();
    assert_eq!(pages, vec!["about", "now"]);
    let posts: Vec<&str> = catalog
        .posts_only()
        .posts
        .iter()
        .map(|p| p.slug.as_str())
        .collect();
    assert_eq!(posts, vec!["p1"]);
}

/// BR2.3: zero homepage notes is fine (PUB002 is retired).
#[test]
fn zero_retired_notes_builds_a_catalog() {
    let catalog =
        PublicationCatalog::build(make_index(vec![post("p1", "a\n"), post("p2", "b\n")])).unwrap();
    assert!(catalog.retired().is_none());
    assert_eq!(catalog.posts_only().posts.len(), 2);
}

/// BR2.3: more than one homepage note is PUB003 with the first path.
#[test]
fn two_retired_notes_report_pub003() {
    let diags = build_err(vec![
        retired("h1", "a\n"),
        post("p1", "b\n"),
        retired("h2", "c\n"),
    ]);
    assert_eq!(
        summary(&diags),
        vec![(DiagnosticCode::Pub003, "vault/h1.md".into(), None)]
    );
    assert!(diags[0].detail.contains("vault/h1.md") && diags[0].detail.contains("vault/h2.md"));
}

/// BR2.2: unknown visibility is PUB001 in the posts folder only.
#[test]
fn pub001_only_for_the_posts_folder() {
    let mut bad_post = post("p1", "a\n");
    bad_post.visibility = scalar("weird");
    let mut bad_page = page("about", "b\n");
    bad_page.visibility = scalar("weird");

    let diags = build_err(vec![bad_post, bad_page]);

    assert_eq!(
        summary(&diags),
        vec![(DiagnosticCode::Pub001, "vault/p1.md".into(), None)]
    );
    assert!(diags[0].detail.contains("weird"));
}

/// BR2.4: a site page that shares its slug with a post is PUB008 naming both.
#[test]
fn pub008_page_and_post_name_both_files() {
    let diags = build_err(vec![post("about", "a\n"), page("about", "b\n")]);
    assert_eq!(
        summary(&diags),
        vec![(
            DiagnosticCode::Pub008,
            "pages/about.md".into(),
            some("vault/about.md")
        )]
    );
    assert_eq!(
        format_diagnostic(&diags[0]),
        "PUB008 pages/about.md: site page slug \"about\" clashes with post vault/about.md"
    );
}

/// BR2.4: two site pages with one slug: the earlier path is `path`.
#[test]
fn pub008_page_and_page_name_both_files() {
    let mut second = page("about", "b\n");
    second.file_path = PathBuf::from("pages/z/about.md");
    let diags = build_err(vec![second, page("about", "a\n")]);
    assert_eq!(
        summary(&diags),
        vec![(
            DiagnosticCode::Pub008,
            "pages/about.md".into(),
            some("pages/z/about.md")
        )]
    );
    assert_eq!(
        format_diagnostic(&diags[0]),
        "PUB008 pages/about.md: site page slug \"about\" clashes with site page pages/z/about.md"
    );
}

/// BR2.4: a site page may not take the retired homepage note's slug either.
#[test]
fn pub008_page_and_retired_note_name_both_files() {
    let diags = build_err(vec![retired("home", "a\n"), page("home", "b\n")]);
    assert_eq!(
        format_diagnostic(&diags[0]),
        "PUB008 pages/home.md: site page slug \"home\" clashes with retired homepage note vault/home.md"
    );
    assert_eq!(diags.len(), 1);
}

/// BR2.4: post/post slug sharing keeps today's warning and is not a PUB code.
#[test]
fn two_posts_sharing_a_slug_are_not_a_diagnostic() {
    let mut twin = post("same", "b\n");
    twin.file_path = PathBuf::from("vault/z/same.md");
    assert!(PublicationCatalog::build(make_index(vec![post("same", "a\n"), twin])).is_ok());
}

/// BR2.6: embedding a site page whole from a post is PUB009.
#[test]
fn pub009_whole_embed_from_a_post() {
    let diags = build_err(vec![
        page("about", "소개.\n"),
        post("p1", "앞\n![[T about]]\n뒤\n"),
    ]);
    assert_eq!(
        summary(&diags),
        vec![(DiagnosticCode::Pub009, "vault/p1.md".into(), None)]
    );
    assert_eq!(
        format_diagnostic(&diags[0]),
        "PUB009 vault/p1.md: whole transclusion of site page: ![[T about]]"
    );
}

/// BR2.6: heading and block embeds of a site page from another page are PUB009.
#[test]
fn pub009_heading_and_block_embeds_from_a_page() {
    let diags = build_err(vec![
        page("about", "## 소개\n문단 ^b1\n"),
        page("now", "![[T about#소개]]\n![[T about#^b1]]\n"),
    ]);
    // Same (path, code, other path): document order is kept.
    let details: Vec<String> = diags.iter().map(format_diagnostic).collect();
    assert_eq!(
        details,
        vec![
            "PUB009 pages/now.md: heading transclusion of site page: ![[T about#소개]]",
            "PUB009 pages/now.md: block transclusion of site page: ![[T about#^b1]]",
        ]
    );
}

/// BR2.5: a site page may not embed the retired homepage note either.
#[test]
fn pub004_to_pub006_from_a_site_page() {
    let diags = build_err(vec![
        retired("home", "## 소개\n문단 ^b1\n"),
        page("about", "![[T home]]\n![[T home#소개]]\n![[T home#^b1]]\n"),
    ]);
    assert_eq!(
        summary(&diags),
        vec![
            (DiagnosticCode::Pub004, "pages/about.md".into(), None),
            (DiagnosticCode::Pub005, "pages/about.md".into(), None),
            (DiagnosticCode::Pub006, "pages/about.md".into(), None),
        ]
    );
}

/// BR2.5: the retired note is not published, so its own embeds are not checked.
#[test]
fn the_retired_notes_own_embeds_are_not_checked() {
    let catalog = PublicationCatalog::build(make_index(vec![
        retired("home", "![[T about]]\n![[T home]]\n"),
        page("about", "소개.\n"),
    ]))
    .unwrap();
    assert_eq!(catalog.retired().unwrap().slug, "home");
}

/// BR2.7: every finding is reported in one batch, sorted by (path, code,
/// other path), and fenced embeds are never inspected.
#[test]
fn diagnostics_are_batched_and_sorted() {
    let mut bad = post("b-post", "![[T about]]\n");
    bad.visibility = scalar("nope");
    let diags = build_err(vec![
        post("z-post", "```\n![[T about]]\n```\n![[T about]]\n"),
        bad,
        page("about", "a\n"),
        post("about", "clash\n"),
        retired("h1", "x\n"),
        retired("h2", "y\n"),
    ]);
    assert_eq!(
        summary(&diags),
        vec![
            (
                DiagnosticCode::Pub008,
                "pages/about.md".into(),
                some("vault/about.md")
            ),
            (DiagnosticCode::Pub001, "vault/b-post.md".into(), None),
            (DiagnosticCode::Pub009, "vault/b-post.md".into(), None),
            (DiagnosticCode::Pub003, "vault/h1.md".into(), None),
            (DiagnosticCode::Pub009, "vault/z-post.md".into(), None),
        ]
    );
}

/// The fixture pair: About is a site page, Fixture Homepage the retired note,
/// and the posts-only view holds neither.
#[test]
fn fixture_pair_builds_a_catalog_with_views() {
    let scan = scan_sources(
        Path::new("../fixtures/vault/Notes"),
        Some(Path::new("../fixtures/vault/Pages")),
        false,
    )
    .unwrap();
    let catalog = PublicationCatalog::build(scan.index).unwrap();

    assert_eq!(catalog.retired().unwrap().title, "Fixture Homepage");
    let pages: Vec<&str> = catalog.site_pages().map(|p| p.slug.as_str()).collect();
    assert_eq!(pages, vec!["about"]);
    for hidden in ["fixture-homepage", "about"] {
        assert!(
            !catalog.posts_only().slug_map.contains_key(hidden),
            "{hidden}"
        );
    }
    assert!(!catalog.posts_only().name_map.contains_key("About"));
    assert!(catalog.posts_only().slug_map.contains_key("simple-post"));
    let targets = catalog.link_targets();
    assert_eq!(
        catalog.kind_of(targets.slug_map["about"]),
        EntryKind::SitePage
    );
    assert_eq!(
        catalog.kind_of(targets.slug_map["fixture-homepage"]),
        EntryKind::RetiredHomepage
    );
    assert_eq!(
        catalog.kind_of(targets.slug_map["simple-post"]),
        EntryKind::Post
    );
}

/// BR2.7 through the binary: exit 1, sorted coded lines, nothing written.
#[test]
fn cli_reports_sorted_diagnostics_and_writes_nothing() {
    let tmp = tempfile::tempdir().unwrap();
    let notes = tmp.path().join("Notes");
    let pages = tmp.path().join("Pages");
    let out = tmp.path().join("out");
    put(&notes, "a.md", "---\nvisibility: mystery\n---\n본문\n");
    put(&notes, "About.md", "글\n");
    put(&pages, "About.md", "소개\n");

    let run = run_press(&[
        notes.as_os_str(),
        out.as_os_str(),
        "--pages".as_ref(),
        pages.as_os_str(),
    ]);

    assert_eq!(run.status.code(), Some(1));
    let stderr = stderr_of(&run);
    let lines: Vec<&str> = stderr.lines().filter(|l| l.starts_with("PUB")).collect();
    let canonical = |p: &Path| std::fs::canonicalize(p).unwrap().display().to_string();
    assert_eq!(
        lines,
        vec![
            format!(
                "PUB001 {}: unknown visibility value \"mystery\"",
                canonical(&notes.join("a.md"))
            ),
            format!(
                "PUB008 {}: site page slug \"about\" clashes with post {}",
                canonical(&pages.join("About.md")),
                canonical(&notes.join("About.md"))
            ),
        ]
    );
    assert!(hash_tree(&out).is_empty(), "nothing may be written");
    // A page/post clash is PUB008 only; the post/post warning stays for posts.
    assert!(!stderr.contains("slug collision"), "stderr: {stderr}");
}

/// An unreadable posts folder is a blocker, not a fallback.
#[test]
fn unreadable_vault_is_a_blocker() {
    assert!(scan_vault(Path::new("/nonexistent-vault-u1")).is_err());
}

// ----------------------------------------------------------- properties

/// Brute-force reference for PUB008 and PUB009 over a note list (BR2.4, BR2.6).
fn reference(notes: &[PostMeta]) -> Vec<(DiagnosticCode, String, Option<String>)> {
    let path = |n: &PostMeta| n.file_path.display().to_string();
    let is_page = |n: &PostMeta| n.source == NoteSource::Pages;
    let mut expected = Vec::new();

    for (i, a) in notes.iter().enumerate() {
        for b in notes.iter().skip(i + 1) {
            if a.slug != b.slug || !(is_page(a) || is_page(b)) {
                continue;
            }
            let (first, second) = match (is_page(a), is_page(b)) {
                (true, true) if path(a) <= path(b) => (a, b),
                (true, true) => (b, a),
                (true, false) => (a, b),
                _ => (b, a),
            };
            expected.push((DiagnosticCode::Pub008, path(first), Some(path(second))));
        }
    }

    let page_titles: Vec<&str> = notes
        .iter()
        .filter(|n| is_page(n))
        .map(|n| n.title.as_str())
        .collect();
    for note in notes {
        for line in note.raw_content.lines() {
            for word in line.split("![[").skip(1) {
                let Some(inner) = word.split_once("]]").map(|(t, _)| t) else {
                    continue;
                };
                let name = inner.split('#').next().unwrap().trim();
                if page_titles.contains(&name) {
                    expected.push((DiagnosticCode::Pub009, path(note), None));
                }
            }
        }
    }

    // The reporting order is (path, code, other path) (BR2.7).
    expected.sort_by(|a, b| (&a.1, a.0, &a.2).cmp(&(&b.1, b.0, &b.2)));
    expected
}

/// A note with a slug from a small alphabet (to force clashes), a random
/// folder, a unique path, and a body that may embed other notes.
fn arb_note(id: usize) -> impl Strategy<Value = PostMeta> {
    (
        0u8..20,
        proptest::bool::ANY,
        proptest::collection::vec((0u8..20, 0usize..3), 0..3),
    )
        .prop_map(move |(slug_n, in_pages, embeds)| {
            let slug = format!("s{slug_n:02}");
            let body: String = embeds
                .iter()
                .map(|(target, form)| match form {
                    0 => format!("![[T s{target:02}]]\n"),
                    1 => format!("![[T s{target:02}#절]]\n"),
                    _ => format!("![[T s{target:02}#^b{target}]]\n"),
                })
                .collect();
            let mut note = make_post(&slug, &format!("T {slug}"), None, &body);
            let folder = if in_pages { "pages" } else { "vault" };
            note.file_path = PathBuf::from(format!("{folder}/{id:03}/{slug}.md"));
            if in_pages {
                note.source = NoteSource::Pages;
            }
            note
        })
}

fn arb_notes() -> impl Strategy<Value = Vec<PostMeta>> {
    (0usize..=500).prop_flat_map(|n| (0..n).map(arb_note).collect::<Vec<_>>())
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 64, ..ProptestConfig::default() })]

    /// NFR4.5 / BR2.4 / BR2.6: on up to 500 notes the catalog reports exactly
    /// the PUB008 and PUB009 findings a brute-force pairwise check finds, in
    /// the sorted order.
    #[test]
    fn clash_and_embed_checks_match_a_brute_force_reference(notes in arb_notes()) {
        let expected = reference(&notes);
        match PublicationCatalog::build(make_index(notes)) {
            Ok(_) => prop_assert!(expected.is_empty(), "missed: {expected:?}"),
            Err(diags) => prop_assert_eq!(summary(&diags), expected),
        }
    }
}
