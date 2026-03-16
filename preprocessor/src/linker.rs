use regex::Regex;

use crate::types::{GraphEdge, GraphJson, GraphNode, Link, LinkGraph, VaultIndex};

/// Parse all wikilinks in the vault and build forward/back link maps.
pub fn resolve_links(index: &VaultIndex) -> LinkGraph {
    let wikilink_re = Regex::new(r"\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]").unwrap();
    let n = index.posts.len();

    let mut forward_links: Vec<Vec<Link>> = vec![Vec::new(); n];
    let mut backlinks: Vec<Vec<String>> = vec![Vec::new(); n];

    for (i, post) in index.posts.iter().enumerate() {
        for cap in wikilink_re.captures_iter(&post.raw_content) {
            let target_name = cap[1].trim();
            let alias = cap.get(2).map(|m| m.as_str().trim().to_string());

            // Resolve target name to a post via name_map
            if let Some(&target_idx) = index.name_map.get(target_name) {
                let target_slug = index.posts[target_idx].slug.clone();
                let source_slug = post.slug.clone();

                forward_links[i].push(Link {
                    target_slug: target_slug.clone(),
                    alias,
                });

                // Add backlink if not already present
                if !backlinks[target_idx].contains(&source_slug) {
                    backlinks[target_idx].push(source_slug);
                }
            }
        }
    }

    LinkGraph {
        forward_links,
        backlinks,
    }
}

impl LinkGraph {
    /// Project the link graph into a JSON-serializable node/edge format.
    pub fn to_graph_json(&self, index: &VaultIndex) -> GraphJson {
        let nodes: Vec<GraphNode> = index
            .posts
            .iter()
            .enumerate()
            .map(|(i, post)| GraphNode {
                slug: post.slug.clone(),
                title: post.title.clone(),
                tags: post.tags.clone(),
                is_hub: post.is_hub,
                backlink_count: self.backlinks[i].len(),
            })
            .collect();

        let mut edges = Vec::new();
        for (i, links) in self.forward_links.iter().enumerate() {
            let source = &index.posts[i].slug;
            for link in links {
                edges.push(GraphEdge {
                    source: source.clone(),
                    target: link.target_slug.clone(),
                });
            }
        }

        // Normalize edges so source < target, then sort and dedup
        for edge in &mut edges {
            if edge.source > edge.target {
                std::mem::swap(&mut edge.source, &mut edge.target);
            }
        }
        edges.sort_by(|a, b| (&a.source, &a.target).cmp(&(&b.source, &b.target)));
        edges.dedup_by(|a, b| a.source == b.source && a.target == b.target);

        GraphJson { nodes, edges }
    }
}
