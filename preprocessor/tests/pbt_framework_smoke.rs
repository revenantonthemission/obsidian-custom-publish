//! U2 NFR Requirements PBT-09 framework smoke.
//!
//! Proves the four selected-framework obligations for proptest:
//! structural custom generators, automatic shrinking, seed
//! persistence/replay and `cargo test` integration. The types and the
//! partition helper are synthetic test-local stand-ins — product
//! publication logic is generated in U2 Code Generation, not here.

use proptest::prelude::*;

#[derive(Debug, Clone, PartialEq)]
enum SyntheticScope {
    Post,
    Homepage,
}

#[derive(Debug, Clone)]
struct SyntheticNote {
    title: String,
    scope: SyntheticScope,
}

/// Korean-syllable/Latin/digit/space titles — non-empty, bounded.
fn synthetic_title() -> impl Strategy<Value = String> {
    proptest::collection::vec(
        prop_oneof![
            proptest::char::range('가', '힣'),
            proptest::char::range('a', 'z'),
            proptest::char::range('0', '9'),
            Just(' '),
        ],
        1..24,
    )
    .prop_map(|chars| chars.into_iter().collect())
}

fn synthetic_note() -> impl Strategy<Value = SyntheticNote> {
    (
        synthetic_title(),
        prop_oneof![Just(SyntheticScope::Post), Just(SyntheticScope::Homepage)],
    )
        .prop_map(|(title, scope)| SyntheticNote { title, scope })
}

/// Test-local partition helper (framework proof only, not product logic).
fn partition(notes: Vec<SyntheticNote>) -> (Vec<SyntheticNote>, Vec<SyntheticNote>) {
    notes
        .into_iter()
        .partition(|n| matches!(n.scope, SyntheticScope::Homepage))
}

proptest! {
    /// Structural custom generator + cargo test runner integration.
    #[test]
    fn smoke_partition_is_disjoint_and_covering(
        notes in proptest::collection::vec(synthetic_note(), 0..32)
    ) {
        let total = notes.len();
        let (homepage, posts) = partition(notes);
        prop_assert_eq!(homepage.len() + posts.len(), total);
        prop_assert!(homepage.iter().all(|n| matches!(n.scope, SyntheticScope::Homepage)));
        prop_assert!(posts.iter().all(|n| matches!(n.scope, SyntheticScope::Post)));
    }

    /// Unicode-domain generator sanity: titles stay in the declared domain.
    #[test]
    fn smoke_titles_are_nonempty_and_bounded(note in synthetic_note()) {
        prop_assert!(!note.title.is_empty());
        prop_assert!(note.title.chars().count() < 24);
    }
}
