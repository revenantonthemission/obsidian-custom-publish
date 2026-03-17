use std::collections::HashSet;

use serde::Serialize;

use crate::types::{LinkGraph, VaultIndex};

#[derive(Debug, Serialize)]
pub struct NavTreeNode {
    pub slug: String,
    pub title: String,
    pub is_hub: bool,
    pub children: Vec<NavTreeNode>,
}

#[derive(Debug, Serialize)]
pub struct NavTree {
    pub roots: Vec<NavTreeNode>,
    pub orphans: Vec<NavTreeNode>,
}

/// Build a navigation tree from hub/hub_parent relationships.
pub fn build_nav_tree(index: &VaultIndex, graph: &LinkGraph) -> NavTree {
    let mut claimed: HashSet<usize> = HashSet::new();

    // Find all hub indices
    let hub_indices: Vec<usize> = index
        .posts
        .iter()
        .enumerate()
        .filter(|(_, p)| p.is_hub)
        .map(|(i, _)| i)
        .collect();

    // Identify top-level hubs (no hub_parent or hub_parent not found)
    let top_level_hubs: Vec<usize> = hub_indices
        .iter()
        .filter(|&&i| {
            match &index.posts[i].hub_parent {
                Some(parent) => !index.name_map.contains_key(parent.as_str()),
                None => true,
            }
        })
        .copied()
        .collect();

    // Recursively build tree for a hub node
    fn build_node(
        hub_idx: usize,
        index: &VaultIndex,
        graph: &LinkGraph,
        claimed: &mut HashSet<usize>,
    ) -> NavTreeNode {
        claimed.insert(hub_idx);
        let post = &index.posts[hub_idx];

        // Children = forward_links from the hub + posts with hub_parent == hub title
        let mut child_indices: Vec<usize> = Vec::new();

        // Forward links from this hub
        for link in &graph.forward_links[hub_idx] {
            if let Some(&target_idx) = index.slug_map.get(&link.target_slug) {
                if !claimed.contains(&target_idx) {
                    child_indices.push(target_idx);
                }
            }
        }

        // Posts whose hub_parent matches this hub's title
        for (i, p) in index.posts.iter().enumerate() {
            if let Some(ref parent) = p.hub_parent {
                if parent == &post.title && !claimed.contains(&i) {
                    child_indices.push(i);
                }
            }
        }

        // Deduplicate
        child_indices.sort();
        child_indices.dedup();

        // Build children: recurse for sub-hubs, leaf node for regular posts
        // Collect unclaimed indices first to avoid borrow conflict
        let unclaimed: Vec<usize> = child_indices
            .into_iter()
            .filter(|i| !claimed.contains(i))
            .collect();
        let children: Vec<NavTreeNode> = unclaimed
            .into_iter()
            .map(|i| {
                if index.posts[i].is_hub {
                    build_node(i, index, graph, claimed)
                } else {
                    claimed.insert(i);
                    NavTreeNode {
                        slug: index.posts[i].slug.clone(),
                        title: index.posts[i].title.clone(),
                        is_hub: false,
                        children: Vec::new(),
                    }
                }
            })
            .collect();

        NavTreeNode {
            slug: post.slug.clone(),
            title: post.title.clone(),
            is_hub: true,
            children,
        }
    }

    let mut roots: Vec<NavTreeNode> = top_level_hubs
        .iter()
        .map(|&i| build_node(i, index, graph, &mut claimed))
        .collect();
    roots.sort_by(|a, b| a.title.cmp(&b.title));

    // Orphans = unclaimed posts
    let mut orphans: Vec<NavTreeNode> = (0..index.posts.len())
        .filter(|i| !claimed.contains(i))
        .map(|i| NavTreeNode {
            slug: index.posts[i].slug.clone(),
            title: index.posts[i].title.clone(),
            is_hub: index.posts[i].is_hub,
            children: Vec::new(),
        })
        .collect();
    orphans.sort_by(|a, b| a.title.cmp(&b.title));

    NavTree { roots, orphans }
}
