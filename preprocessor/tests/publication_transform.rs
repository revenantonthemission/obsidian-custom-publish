//! Link rendering and transclusion semantics: U1 rules (BR3.1–BR3.4; FR1.2,
//! FR2.2) on top of the U2 examples and properties (FD-P-C08-01~04,
//! DE-P-U2-04 Rust half, PUB004~006).

mod common;

use std::path::{Path, PathBuf};

use common::{make_index, make_post};
use obsidian_press::catalog::{DiagnosticCode, PublicationCatalog};
use obsidian_press::linker::resolve_links;
use obsidian_press::scanner::{scan_sources, scan_vault};
use obsidian_press::transform::transform_content_publication;
use obsidian_press::types::{NoteSource, PostMeta, RawVisibility};
use proptest::prelude::*;

fn hp_scalar() -> Option<RawVisibility> {
    Some(RawVisibility::Scalar("homepage".to_string()))
}

fn site_page(slug: &str, title: &str, body: &str) -> PostMeta {
    let mut note = make_post(slug, title, None, body);
    note.source = NoteSource::Pages;
    note.file_path = PathBuf::from(format!("pages/{slug}.md"));
    note
}

/// Transform one note of a catalog with link kinds applied.
fn render(catalog: &PublicationCatalog, slug: &str) -> String {
    let targets = catalog.link_targets();
    let idx = targets.slug_map[slug];
    transform_content_publication(targets, idx, Some(catalog.kinds()), None).0
}

fn fixture_pair_catalog() -> PublicationCatalog {
    let scan = scan_sources(
        Path::new("../fixtures/vault/Notes"),
        Some(Path::new("../fixtures/vault/Pages")),
        false,
    )
    .unwrap();
    PublicationCatalog::build(scan.index).unwrap()
}

// ---------------------------------------------------------------- examples

/// BR3.2: links to the retired note go to `/` with no fragment (its headings
/// no longer exist on `/`); an alias stays the link text.
#[test]
fn links_to_the_retired_note_go_to_root_without_a_fragment() {
    let content = render(&fixture_pair_catalog(), "post-linking-homepage");

    assert!(
        content.contains("기본 링크: <a href=\"/\">Fixture Homepage</a>"),
        "bare link: {content}"
    );
    assert!(
        content.contains("별칭 링크: <a href=\"/\">홈으로</a>"),
        "alias kept: {content}"
    );
    assert!(
        !content.contains("href=\"/#"),
        "no fragment on /: {content}"
    );
    // Fenced references stay untouched.
    assert!(
        content.contains("[[Fixture Homepage]]\n<!-- profile:slot -->"),
        "fence content must be byte-preserved: {content}"
    );
}

/// BR3.2: heading and block links to the retired note also lose the fragment.
#[test]
fn heading_and_block_links_to_the_retired_note_go_to_root() {
    let content = render(&fixture_pair_catalog(), "post-linking-homepage");

    assert!(
        content.contains("제목 조각: <a href=\"/\">Fixture Homepage</a>"),
        "heading link: {content}"
    );
    assert!(
        content.contains("블록 조각: <a href=\"/\">Fixture Homepage</a>"),
        "block link: {content}"
    );
}

/// BR3.3: a link to a site page renders as plain text, alias or name.
#[test]
fn links_to_a_site_page_render_as_plain_text() {
    let catalog = PublicationCatalog::build(make_index(vec![
        site_page("about", "About", "소개.\n"),
        make_post(
            "p1",
            "P1",
            None,
            "a [[About]] b [[About|소개]] c [[About#절]] d\n",
        ),
    ]))
    .unwrap();

    let content = render(&catalog, "p1");

    assert_eq!(content.trim_end(), "a About b 소개 c About d");
}

/// BR3.1: post links are unchanged, from a post or from a site page.
#[test]
fn post_links_are_unchanged() {
    let catalog = fixture_pair_catalog();
    let post = render(&catalog, "post-with-links");
    let page = render(&catalog, "about");

    assert!(
        post.contains(r#"<a href="/posts/simple-post">Simple Post</a>"#),
        "{post}"
    );
    assert!(
        page.contains(r#"<a href="/posts/simple-post">Simple Post</a>"#),
        "{page}"
    );
    assert!(page.contains(r#"<a href="/">첫 화면</a>"#), "{page}");
}

/// BR3.4: a link from a site page adds no backlink to the post it targets.
#[test]
fn a_link_from_a_site_page_adds_no_backlink() {
    let catalog = fixture_pair_catalog();
    let posts = catalog.posts_only();
    let graph = resolve_links(posts);

    let simple = posts.slug_map["simple-post"];
    assert!(
        !graph.backlinks[simple].iter().any(|s| s == "about"),
        "{:?}",
        graph.backlinks[simple]
    );
    assert!(!graph.backlinks[simple].is_empty(), "post backlinks stay");
}

/// BR3.4: the graph holds posts only: no site-page or retired-note node.
#[test]
fn the_graph_has_no_site_page_or_retired_node() {
    let catalog = fixture_pair_catalog();
    let posts = catalog.posts_only();
    let json = resolve_links(posts).to_graph_json(posts);

    for hidden in ["about", "fixture-homepage"] {
        assert!(
            !json.nodes.iter().any(|n| n.slug == hidden),
            "{hidden} node"
        );
        assert!(
            !json
                .edges
                .iter()
                .any(|e| e.source == hidden || e.target == hidden),
            "{hidden} edge"
        );
    }
    assert!(json.nodes.iter().any(|n| n.slug == "simple-post"));
}

/// NFR1-b fixture (infra R-01): the highlighted Markdown link survives the
/// highlight pass as `<mark>[…](…)</mark>`, which the site renders as
/// `<mark><a …>`.
#[test]
fn a_highlighted_markdown_link_is_wrapped_in_mark() {
    let content = render(&fixture_pair_catalog(), "post-with-formatting");
    assert!(
        content.contains("<mark>[Simple Post](/posts/simple-post/)</mark>"),
        "{content}"
    );
}

/// An unresolvable heading fragment to the retired note degrades to `/` with
/// the note name, as before.
#[test]
fn unresolved_homepage_fragment_still_goes_to_root() {
    let catalog = PublicationCatalog::build(make_index(vec![
        make_post("hp", "HP", hp_scalar(), "홈 본문.\n"),
        make_post("p1", "P1", None, "x [[HP#missing-heading]] y\n"),
    ]))
    .unwrap();
    let content = render(&catalog, "p1");
    assert!(
        content.contains(r##"<a href="/">HP</a>"##),
        "invalid heading drops the fragment, keeps the root href: {content}"
    );
}

/// The legacy fixture still renders: posts-folder scan only.
#[test]
fn the_posts_folder_alone_still_builds() {
    let index = scan_vault(Path::new("../fixtures/vault/Notes")).unwrap();
    let catalog = PublicationCatalog::build(index).unwrap();
    assert!(render(&catalog, "simple-post").contains("simple post"));
}

// -------------------------------------------------------------- properties

/// Content charset that cannot form wikilinks, fences, comments, or the
/// homepage title (lowercase/Korean only — the synthetic title is uppercase).
fn arb_safe_line() -> impl Strategy<Value = String> {
    "[a-z가-힣 .,]{0,40}"
}

proptest! {
    /// FD-P-C08-02: every homepage-target transclusion variant is rejected with
    /// its variant-specific code, path and matched source text.
    #[test]
    fn homepage_transclusions_are_rejected_by_variant(
        kind in 0usize..3,
        frag in "[a-z0-9-]{1,8}",
        pad in arb_safe_line(),
    ) {
        let reference = match kind {
            0 => "![[HP]]".to_string(),
            1 => format!("![[HP#Sec {frag}]]"),
            _ => format!("![[HP#^{frag}]]"),
        };
        let content = format!("{pad}\n{reference}\n{pad}\n");
        let posts = vec![
            make_post("hp", "HP", hp_scalar(), "홈 본문.\n"),
            make_post("p1", "P1", None, &content),
        ];
        let diags = PublicationCatalog::build(make_index(posts)).unwrap_err();
        prop_assert_eq!(diags.len(), 1, "one variant, one diagnostic");
        let expected = match kind {
            0 => DiagnosticCode::Pub004,
            1 => DiagnosticCode::Pub005,
            _ => DiagnosticCode::Pub006,
        };
        prop_assert_eq!(diags[0].code, expected);
        prop_assert_eq!(diags[0].path.as_str(), "vault/p1.md");
        prop_assert!(diags[0].detail.contains(&reference));
    }

    /// FD-P-C08-04 + DE-P-U2-04 (Rust half): fenced references are never
    /// inspected — no diagnostics, and the fence body is byte-preserved.
    #[test]
    fn fenced_references_are_ignored(kind in 0usize..3, frag in "[a-z0-9-]{1,8}") {
        let reference = match kind {
            0 => "![[HP]]".to_string(),
            1 => format!("![[HP#Sec {frag}]]"),
            _ => format!("![[HP#^{frag}]]"),
        };
        let content = format!("```\n{reference}\n[[HP]]\n<!-- profile:slot -->\n```\n");
        let posts = vec![
            make_post("hp", "HP", hp_scalar(), "홈 본문.\n"),
            make_post("p1", "P1", None, &content),
        ];
        // A clean build means no diagnostics: the fenced embed was not inspected.
        let catalog = PublicationCatalog::build(make_index(posts)).unwrap();

        let full = catalog.link_targets();
        let idx = full.slug_map["p1"];
        let (out, _) =
            transform_content_publication(full, idx, Some(catalog.kinds()), None);
        prop_assert!(out.contains(&reference));
        prop_assert!(out.contains("[[HP]]"));
        prop_assert!(out.contains("<!-- profile:slot -->"));
    }

    /// FD-P-C08-03 (oracle): documents that never reference the homepage
    /// transform identically with and without publication awareness.
    #[test]
    fn non_homepage_documents_are_untouched_by_publication(
        lines in proptest::collection::vec(arb_safe_line(), 0..8),
        link_other in proptest::bool::ANY,
    ) {
        let mut body = lines.join("\n");
        if link_other {
            body.push_str("\n[[P2]] 참조\n");
        }
        let posts = vec![
            make_post("hp", "HP", hp_scalar(), "홈 본문.\n"),
            make_post("p1", "P1", None, &body),
            make_post("p2", "P2", None, "다른 글.\n"),
        ];
        let catalog = PublicationCatalog::build(make_index(posts)).unwrap();
        let full = catalog.link_targets();
        let idx = full.slug_map["p1"];

        let (with_pub, _) =
            transform_content_publication(full, idx, Some(catalog.kinds()), None);
        let (without_pub, _) = transform_content_publication(full, idx, None, None);
        prop_assert_eq!(with_pub, without_pub);
    }

    /// FD-P-C08-01 (slice): bare and alias links to the homepage always resolve
    /// to the root anchor with the display rules of the truth table.
    #[test]
    fn bare_and_alias_homepage_links_resolve_to_root(
        alias in "[a-z가-힣]{1,10}",
    ) {
        let body = format!("a [[HP]] b [[HP|{alias}]] c\n");
        let posts = vec![
            make_post("hp", "HP", hp_scalar(), "홈 본문.\n"),
            make_post("p1", "P1", None, &body),
        ];
        let catalog = PublicationCatalog::build(make_index(posts)).unwrap();
        let full = catalog.link_targets();
        let idx = full.slug_map["p1"];

        let (out, _) =
            transform_content_publication(full, idx, Some(catalog.kinds()), None);
        prop_assert!(out.contains(r##"<a href="/">HP</a>"##), "bare: {out}");
        prop_assert!(
            out.contains(&format!(r##"<a href="/">{alias}</a>"##)),
            "alias: {out}"
        );
    }
}
