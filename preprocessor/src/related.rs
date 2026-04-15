use std::collections::{HashMap, HashSet};

use crate::types::{LinkGraph, VaultIndex};

const SCORE_SHARED_TAG: i32 = 2;
const SCORE_LINK: i32 = 3;
const SCORE_SAME_HUB: i32 = 1;

/// Compute the top-N related post slugs for every post using hybrid scoring:
///
/// - +2 per shared tag
/// - +3 if this post has a forward link to the candidate
/// - +3 if this post has a backlink from the candidate (i.e. candidate → this)
/// - +1 if both share the same hub_parent
///
/// Uses an inverted tag index to avoid O(n^2) full comparison — only posts
/// sharing at least one tag, link, or hub_parent are scored.
///
/// Returns a `Vec<Vec<String>>` indexed the same as `VaultIndex.posts`.
/// Each inner vec contains slugs of the top related posts (up to `limit`).
pub fn compute_related(index: &VaultIndex, graph: &LinkGraph, limit: usize) -> Vec<Vec<String>> {
    let n = index.posts.len();

    // Inverted tag index: tag → set of post indices
    let mut tag_to_posts: HashMap<&str, Vec<usize>> = HashMap::new();
    for (i, post) in index.posts.iter().enumerate() {
        for tag in &post.tags {
            tag_to_posts.entry(tag.as_str()).or_default().push(i);
        }
    }

    // Hub parent index: hub_parent → set of post indices
    let mut hub_to_posts: HashMap<&str, Vec<usize>> = HashMap::new();
    for (i, post) in index.posts.iter().enumerate() {
        if let Some(ref hp) = post.hub_parent {
            hub_to_posts.entry(hp.as_str()).or_default().push(i);
        }
    }

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

    // Slug → post index for link lookups
    let slug_idx: HashMap<&str, usize> = index
        .posts
        .iter()
        .enumerate()
        .map(|(i, p)| (p.slug.as_str(), i))
        .collect();

    let mut results = Vec::with_capacity(n);

    for i in 0..n {
        let mut scores: HashMap<usize, i32> = HashMap::new();

        // Score candidates sharing tags (via inverted index)
        for tag in &index.posts[i].tags {
            if let Some(peers) = tag_to_posts.get(tag.as_str()) {
                for &j in peers {
                    if j != i {
                        *scores.entry(j).or_default() += SCORE_SHARED_TAG;
                    }
                }
            }
        }

        // Score candidates with forward/back links
        for slug in &forward_sets[i] {
            if let Some(&j) = slug_idx.get(slug) {
                *scores.entry(j).or_default() += SCORE_LINK;
            }
        }
        for slug in &backlink_sets[i] {
            if let Some(&j) = slug_idx.get(slug) {
                *scores.entry(j).or_default() += SCORE_LINK;
            }
        }

        // Score candidates sharing hub_parent
        if let Some(ref hp) = index.posts[i].hub_parent {
            if let Some(peers) = hub_to_posts.get(hp.as_str()) {
                for &j in peers {
                    if j != i {
                        *scores.entry(j).or_default() += SCORE_SAME_HUB;
                    }
                }
            }
        }

        let mut sorted: Vec<(usize, i32)> = scores.into_iter().collect();
        sorted.sort_by(|a, b| b.1.cmp(&a.1));
        sorted.truncate(limit);

        results.push(
            sorted
                .into_iter()
                .map(|(j, _)| index.posts[j].slug.clone())
                .collect(),
        );
    }

    results
}
