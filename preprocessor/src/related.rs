use std::collections::HashSet;

use crate::types::{LinkGraph, VaultIndex};

/// Compute the top-N related post slugs for every post using hybrid scoring:
///
/// - +2 per shared tag
/// - +3 if this post has a forward link to the candidate
/// - +3 if this post has a backlink from the candidate (i.e. candidate → this)
/// - +1 if both share the same hub_parent
///
/// Returns a `Vec<Vec<String>>` indexed the same as `VaultIndex.posts`.
/// Each inner vec contains slugs of the top related posts (up to `limit`).
pub fn compute_related(index: &VaultIndex, graph: &LinkGraph, limit: usize) -> Vec<Vec<String>> {
    let n = index.posts.len();

    // Pre-compute per-post forward-link slug sets for O(1) lookup
    let forward_sets: Vec<HashSet<&str>> = graph
        .forward_links
        .iter()
        .map(|links| links.iter().map(|l| l.target_slug.as_str()).collect())
        .collect();

    // Pre-compute per-post backlink slug sets
    let backlink_sets: Vec<HashSet<&str>> = graph
        .backlinks
        .iter()
        .map(|bl| bl.iter().map(|s| s.as_str()).collect())
        .collect();

    let mut results = Vec::with_capacity(n);

    for i in 0..n {
        let post = &index.posts[i];
        let post_tags: HashSet<&str> = post.tags.iter().map(|t| t.as_str()).collect();

        let mut scores: Vec<(usize, i32)> = (0..n)
            .filter(|&j| j != i)
            .map(|j| {
                let candidate = &index.posts[j];
                let mut score: i32 = 0;

                // Shared tags
                let candidate_tags: HashSet<&str> =
                    candidate.tags.iter().map(|t| t.as_str()).collect();
                score += (post_tags.intersection(&candidate_tags).count() as i32) * 2;

                // Forward link: this → candidate
                if forward_sets[i].contains(candidate.slug.as_str()) {
                    score += 3;
                }

                // Backlink: candidate → this
                if backlink_sets[i].contains(candidate.slug.as_str()) {
                    score += 3;
                }

                // Same hub parent
                if post.hub_parent.is_some()
                    && post.hub_parent == candidate.hub_parent
                {
                    score += 1;
                }

                (j, score)
            })
            .filter(|&(_, score)| score > 0)
            .collect();

        scores.sort_by(|a, b| b.1.cmp(&a.1));
        scores.truncate(limit);

        results.push(
            scores
                .into_iter()
                .map(|(j, _)| index.posts[j].slug.clone())
                .collect(),
        );
    }

    results
}
