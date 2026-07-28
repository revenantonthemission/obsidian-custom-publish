//! U2 reference/transclusion semantics: examples + properties
//! (FD-P-C08-01~04, DE-P-U2-04 Rust half, PUB004~006, BR-U2-013~022).

mod common;

use std::path::Path;

use common::{make_index, make_post};
use obsidian_press::catalog::{DiagnosticCode, PublicationCatalog};
use obsidian_press::scanner::scan_vault;
use obsidian_press::transform::transform_content_publication;
use obsidian_press::types::RawVisibility;
use proptest::prelude::*;

fn hp_scalar() -> Option<RawVisibility> {
    Some(RawVisibility::Scalar("homepage".to_string()))
}

// ---------------------------------------------------------------- examples

/// BR-U2-013~017: the fixture truth table, end to end through the transform.
#[test]
fn fixture_truth_table_resolves_homepage_links_to_root() {
    let index = scan_vault(Path::new("../fixtures/vault")).unwrap();
    let catalog = PublicationCatalog::build(index).unwrap();
    let full = catalog.full();
    let idx = full.slug_map["post-linking-homepage"];

    let (content, _) = transform_content_publication(full, idx, Some(catalog.homepage_idx()), None);

    assert!(
        content.contains(r##"<a href="/">Fixture Homepage</a>"##),
        "bare link (BR-U2-013): {content}"
    );
    assert!(
        content.contains(r##"<a href="/">홈으로</a>"##),
        "alias preserved (BR-U2-014): {content}"
    );
    assert!(
        content.contains(r##"<a href="/#소개">Fixture Homepage &gt; 소개</a>"##),
        "heading fragment via existing anchor rule (BR-U2-015): {content}"
    );
    assert!(
        content.contains(r##"<a href="/#^intro-block">Fixture Homepage</a>"##),
        "block fragment via existing rule (BR-U2-016): {content}"
    );
    // BR-U2-022: fenced references stay untouched.
    assert!(
        content.contains("[[Fixture Homepage]]\n<!-- profile:slot -->"),
        "fence content must be byte-preserved: {content}"
    );
}

/// BR-U2-017: an unresolvable heading fragment degrades exactly like a post link
/// (no fragment, note-name display), just with the `/` base.
#[test]
fn unresolved_homepage_fragment_matches_legacy_degradation() {
    let posts = vec![
        make_post("hp", "HP", hp_scalar(), "홈 본문.\n"),
        make_post("p1", "P1", None, "x [[HP#missing-heading]] y\n"),
    ];
    let index = make_index(posts);
    let catalog = PublicationCatalog::build(index).unwrap();
    let full = catalog.full();
    let idx = full.slug_map["p1"];

    let (content, _) = transform_content_publication(full, idx, Some(catalog.homepage_idx()), None);
    assert!(
        content.contains(r##"<a href="/">HP</a>"##),
        "invalid heading drops the fragment, keeps the root href: {content}"
    );
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
        let catalog = PublicationCatalog::build(make_index(posts)).unwrap();

        let diags = catalog.validate_references();
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
        let catalog = PublicationCatalog::build(make_index(posts)).unwrap();

        prop_assert!(catalog.validate_references().is_empty());

        let full = catalog.full();
        let idx = full.slug_map["p1"];
        let (out, _) =
            transform_content_publication(full, idx, Some(catalog.homepage_idx()), None);
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
        let full = catalog.full();
        let idx = full.slug_map["p1"];

        let (with_pub, _) =
            transform_content_publication(full, idx, Some(catalog.homepage_idx()), None);
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
        let full = catalog.full();
        let idx = full.slug_map["p1"];

        let (out, _) =
            transform_content_publication(full, idx, Some(catalog.homepage_idx()), None);
        prop_assert!(out.contains(r##"<a href="/">HP</a>"##), "bare: {out}");
        prop_assert!(
            out.contains(&format!(r##"<a href="/">{alias}</a>"##)),
            "alias: {out}"
        );
    }
}
