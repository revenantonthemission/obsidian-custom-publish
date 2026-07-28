//! U2 publication catalog: examples + properties (FD-P-C07-01~05, DE-P-U2-01/02,
//! PUB001~003, EDGE-012).

mod common;

use std::path::Path;
use std::process::Command;

use common::{make_index, make_post};
use obsidian_press::catalog::{
    DiagnosticCode, PublicationCatalog, PublicationScope, format_diagnostic, parse_scope,
};
use obsidian_press::scanner::scan_vault;
use obsidian_press::types::{PostMeta, RawVisibility};
use proptest::prelude::*;

fn scalar(v: &str) -> Option<RawVisibility> {
    Some(RawVisibility::Scalar(v.to_string()))
}

fn plain(slug: &str) -> PostMeta {
    make_post(slug, &format!("T {slug}"), None, "본문입니다.\n")
}

fn homepage(slug: &str) -> PostMeta {
    make_post(slug, &format!("T {slug}"), scalar("homepage"), "홈 본문.\n")
}

// ---------------------------------------------------------------- examples

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
    let err = parse_scope(&Some(RawVisibility::NonScalar("Bool(true)".into()))).unwrap_err();
    assert!(err.contains("Bool(true)"));
}

#[test]
fn missing_homepage_reports_pub002_with_empty_path_sorted_first() {
    let index = make_index(vec![
        plain("p01"),
        make_post("p02", "T p02", scalar("weird"), "x\n"),
    ]);
    let diags = PublicationCatalog::build(index).unwrap_err();

    assert_eq!(diags.len(), 2);
    assert_eq!(diags[0].code, DiagnosticCode::Pub002);
    assert_eq!(diags[0].path, "");
    assert!(format_diagnostic(&diags[0]).starts_with("PUB002 :"));
    assert_eq!(diags[1].code, DiagnosticCode::Pub001);
    assert_eq!(diags[1].path, "vault/p02.md");
    assert!(diags[1].detail.contains("weird"));
}

#[test]
fn duplicate_homepage_reports_pub003_with_first_path_and_full_list() {
    let index = make_index(vec![homepage("p01"), plain("p02"), homepage("p03")]);
    let diags = PublicationCatalog::build(index).unwrap_err();

    assert_eq!(diags.len(), 1);
    assert_eq!(diags[0].code, DiagnosticCode::Pub003);
    assert_eq!(diags[0].path, "vault/p01.md");
    assert!(diags[0].detail.contains("vault/p01.md"));
    assert!(diags[0].detail.contains("vault/p03.md"));
}

#[test]
fn cli_reports_sorted_diagnostics_on_stderr_and_exits_1() {
    let tmp = tempfile::tempdir().unwrap();
    let vault_dir = tmp.path().join("vault");
    std::fs::create_dir_all(&vault_dir).unwrap();
    let out = tempfile::tempdir().unwrap();
    std::fs::write(
        vault_dir.join("a.md"),
        "---\nvisibility: mystery\n---\n본문\n",
    )
    .unwrap();
    std::fs::write(vault_dir.join("b.md"), "본문\n").unwrap();

    let output = Command::new(env!("CARGO_BIN_EXE_obsidian-press"))
        .arg(&vault_dir)
        .arg(out.path())
        .output()
        .unwrap();

    assert_eq!(output.status.code(), Some(1));
    let stderr = String::from_utf8_lossy(&output.stderr);
    let lines: Vec<&str> = stderr.lines().filter(|l| l.starts_with("PUB")).collect();
    assert_eq!(lines.len(), 2, "stderr was: {stderr}");
    assert!(lines[0].starts_with("PUB002 :"), "empty path sorts first");
    assert!(lines[1].starts_with("PUB001 "));
    assert!(lines[1].contains("a.md") && lines[1].contains("mystery"));
    // Validation failed before any write: no output namespace was created.
    assert!(!out.path().join("posts").exists());
    assert!(!out.path().join("manifest.json").exists());
}

/// EDGE-012: an unreadable vault is a blocker, not a fallback.
#[test]
fn unreadable_vault_is_a_blocker() {
    assert!(scan_vault(Path::new("/nonexistent-vault-u2-edge012")).is_err());
}

#[test]
fn fixture_vault_builds_a_catalog_with_the_fixture_homepage() {
    let index = scan_vault(Path::new("../fixtures/vault")).unwrap();
    let catalog = PublicationCatalog::build(index).unwrap();

    assert_eq!(catalog.homepage().title, "Fixture Homepage");
    assert!(
        !catalog
            .posts_only()
            .slug_map
            .contains_key("fixture-homepage")
    );
    assert!(
        !catalog
            .posts_only()
            .name_map
            .contains_key("Fixture Homepage")
    );
    assert!(catalog.posts_only().slug_map.contains_key("simple-post"));
    assert!(catalog.validate_references().is_empty());
}

// -------------------------------------------------------------- properties

/// (size, homepage position) with zero-padded slugs so slug order is stable.
fn arb_shape() -> impl Strategy<Value = (usize, usize)> {
    (1usize..12).prop_flat_map(|n| (Just(n), 0..n))
}

proptest! {
    /// FD-P-C07-01 + DE-P-U2-01: partition is disjoint and covering, order preserved.
    #[test]
    fn partition_is_disjoint_covering_and_order_preserving((n, h) in arb_shape()) {
        let posts: Vec<PostMeta> = (0..n)
            .map(|i| {
                let slug = format!("p{i:02}");
                if i == h { homepage(&slug) } else { plain(&slug) }
            })
            .collect();
        let input_slugs: Vec<String> = posts.iter().map(|p| p.slug.clone()).collect();

        let catalog = PublicationCatalog::build(make_index(posts)).unwrap();

        let expected_hp = format!("p{h:02}");
        prop_assert_eq!(catalog.homepage().slug.as_str(), expected_hp.as_str());
        prop_assert_eq!(catalog.posts_only().posts.len(), n - 1);

        let mut union: Vec<String> = catalog
            .posts_only()
            .posts
            .iter()
            .map(|p| p.slug.clone())
            .collect();
        prop_assert!(!union.contains(&catalog.homepage().slug));
        union.push(catalog.homepage().slug.clone());
        union.sort();
        prop_assert_eq!(union, input_slugs);

        // Order preserved: posts_only equals the input sequence minus the homepage.
        let expected: Vec<String> = (0..n)
            .filter(|i| *i != h)
            .map(|i| format!("p{i:02}"))
            .collect();
        let actual: Vec<String> = catalog
            .posts_only()
            .posts
            .iter()
            .map(|p| p.slug.clone())
            .collect();
        prop_assert_eq!(actual, expected);
    }

    /// FD-P-C07-02: zero or 2+ homepages never yield a catalog.
    #[test]
    fn wrong_cardinality_never_builds(
        n in 2usize..10,
        k in prop_oneof![Just(0usize), 2usize..6],
    ) {
        let k = k.min(n);
        let posts: Vec<PostMeta> = (0..n)
            .map(|i| {
                let slug = format!("p{i:02}");
                if i < k { homepage(&slug) } else { plain(&slug) }
            })
            .collect();

        let diags = PublicationCatalog::build(make_index(posts)).unwrap_err();
        prop_assert_eq!(diags.len(), 1);
        if k == 0 {
            prop_assert_eq!(diags[0].code, DiagnosticCode::Pub002);
            prop_assert_eq!(diags[0].path.as_str(), "");
        } else {
            prop_assert_eq!(diags[0].code, DiagnosticCode::Pub003);
            prop_assert_eq!(diags[0].path.as_str(), "vault/p00.md");
            for i in 0..k {
                let expected_path = format!("vault/p{i:02}.md");
                prop_assert!(diags[0].detail.contains(&expected_path));
            }
        }
    }

    /// FD-P-C07-03: any non-canonical visibility value is rejected with its value.
    #[test]
    fn unknown_visibility_is_rejected_with_found_value(
        bad in "[A-Za-z가-힣 ]{1,12}".prop_filter("canonical values are valid", |s| {
            s != "post" && s != "homepage"
        }),
        non_scalar in proptest::bool::ANY,
    ) {
        let vis = if non_scalar {
            Some(RawVisibility::NonScalar(format!("Seq({bad:?})")))
        } else {
            Some(RawVisibility::Scalar(bad.clone()))
        };
        let posts = vec![
            homepage("p00"),
            make_post("p01", "T p01", vis, "x\n"),
        ];

        let diags = PublicationCatalog::build(make_index(posts)).unwrap_err();
        prop_assert_eq!(diags.len(), 1);
        prop_assert_eq!(diags[0].code, DiagnosticCode::Pub001);
        prop_assert_eq!(diags[0].path.as_str(), "vault/p01.md");
        prop_assert!(diags[0].detail.contains(&bad));
    }

    /// FD-P-C07-04 (oracle): every discoverable post keeps its scanned fields.
    #[test]
    fn posts_projection_preserves_fields((n, h) in arb_shape()) {
        let posts: Vec<PostMeta> = (0..n)
            .map(|i| {
                let slug = format!("p{i:02}");
                if i == h { homepage(&slug) } else { plain(&slug) }
            })
            .collect();
        let originals = posts.clone();

        let catalog = PublicationCatalog::build(make_index(posts)).unwrap();
        for p in &catalog.posts_only().posts {
            let orig = originals.iter().find(|o| o.slug == p.slug).unwrap();
            prop_assert_eq!(&p.title, &orig.title);
            prop_assert_eq!(&p.raw_content, &orig.raw_content);
            prop_assert_eq!(&p.tags, &orig.tags);
        }
    }

    /// FD-P-C07-05 + DE-P-U2-02: input permutation changes neither the catalog
    /// nor the diagnostic batch.
    #[test]
    fn build_is_permutation_invariant(
        (n, h) in arb_shape(),
        make_invalid in proptest::bool::ANY,
    ) {
        let mut posts: Vec<PostMeta> = (0..n)
            .map(|i| {
                let slug = format!("p{i:02}");
                if i == h { homepage(&slug) } else { plain(&slug) }
            })
            .collect();
        if make_invalid {
            posts.push(make_post("q99", "T q99", scalar("nope"), "x\n"));
        }
        let mut reversed = posts.clone();
        reversed.reverse();

        let a = PublicationCatalog::build(make_index(posts));
        let b = PublicationCatalog::build(make_index(reversed));

        match (a, b) {
            (Ok(ca), Ok(cb)) => {
                let sa: Vec<&str> = ca.posts_only().posts.iter().map(|p| p.slug.as_str()).collect();
                let sb: Vec<&str> = cb.posts_only().posts.iter().map(|p| p.slug.as_str()).collect();
                prop_assert_eq!(sa, sb);
                prop_assert_eq!(&ca.homepage().slug, &cb.homepage().slug);
            }
            (Err(da), Err(db)) => prop_assert_eq!(da, db),
            (a, b) => prop_assert!(false, "verdicts diverged: {a:?} vs {b:?}"),
        }
    }
}
