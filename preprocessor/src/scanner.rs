use anyhow::{Context, Result};
use serde::Deserialize;
use std::collections::HashMap;
use std::path::Path;
use walkdir::WalkDir;

use crate::types::{PostMeta, VaultIndex};

/// Raw frontmatter as it appears in the YAML block.
/// Dates are kept as strings to avoid YAML date auto-parsing.
#[derive(Debug, Deserialize, Default)]
struct RawFrontmatter {
    #[serde(default)]
    tags: Vec<String>,
    #[serde(default, deserialize_with = "deserialize_date_as_string")]
    created: Option<String>,
    #[serde(default, deserialize_with = "deserialize_date_as_string")]
    published: Option<String>,
    #[serde(default)]
    is_hub: bool,
    #[serde(default)]
    hub_parent: Option<String>,
}

/// Deserializes a YAML value that may be a date, integer, or string into `Option<String>`.
fn deserialize_date_as_string<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde_yaml::Value;
    let v = Option::<Value>::deserialize(deserializer)?;
    Ok(v.map(|val| match val {
        Value::String(s) => s,
        other => {
            // serde_yaml parses bare dates like 2025-01-01 as strings,
            // but just in case, stringify whatever we get.
            format!("{other:?}")
        }
    }))
}

/// Scan an Obsidian vault directory and build an index of all posts.
pub fn scan_vault(vault_path: &Path) -> Result<VaultIndex> {
    let mut posts = Vec::new();

    for entry in WalkDir::new(vault_path)
        .into_iter()
        .filter_entry(|e| !is_hidden(e))
    {
        let entry = entry.context("failed to read directory entry")?;
        let path = entry.path();

        if !path.is_file() || path.extension().is_none_or(|ext| ext != "md") {
            continue;
        }

        let content = std::fs::read_to_string(path)
            .with_context(|| format!("failed to read {}", path.display()))?;

        let filename = path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        let slug = slugify(&filename);
        let (frontmatter, _body) = parse_frontmatter(&content);

        let title = filename.clone();

        posts.push(PostMeta {
            slug,
            title,
            file_path: path.to_path_buf(),
            tags: frontmatter.tags,
            created: frontmatter.created,
            published: frontmatter.published,
            is_hub: frontmatter.is_hub,
            hub_parent: frontmatter.hub_parent,
            raw_content: content,
        });
    }

    let mut slug_map: HashMap<String, usize> = HashMap::new();
    for (i, p) in posts.iter().enumerate() {
        if let Some(prev) = slug_map.insert(p.slug.clone(), i) {
            eprintln!(
                "warning: slug collision '{}' — '{}' overwrites '{}'",
                p.slug, p.title, posts[prev].title
            );
        }
    }

    let name_map: HashMap<String, usize> = posts
        .iter()
        .enumerate()
        .map(|(i, p)| (p.title.clone(), i))
        .collect();

    Ok(VaultIndex {
        posts,
        slug_map,
        name_map,
    })
}

/// Convert a filename into a URL-safe slug.
/// Keeps alphanumeric, Korean characters, and hyphens. Strips everything else.
fn slugify(name: &str) -> String {
    name.to_lowercase()
        .replace(' ', "-")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || is_korean(*c))
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

fn is_korean(c: char) -> bool {
    matches!(c, '\u{AC00}'..='\u{D7AF}' | '\u{1100}'..='\u{11FF}' | '\u{3130}'..='\u{318F}')
}

/// Split content into frontmatter and body.
fn parse_frontmatter(content: &str) -> (RawFrontmatter, &str) {
    // Frontmatter is enclosed between two `---` lines at the start
    if !content.starts_with("---") {
        return (RawFrontmatter::default(), content);
    }

    // Find the closing `---`
    if let Some(end) = content[3..].find("\n---") {
        let yaml_str = &content[3..3 + end].trim();
        let body = &content[3 + end + 4..]; // skip past closing ---

        let fm: RawFrontmatter = serde_yaml::from_str(yaml_str).unwrap_or_default();
        (fm, body)
    } else {
        (RawFrontmatter::default(), content)
    }
}

/// Check if a walkdir entry is hidden (starts with `.`).
fn is_hidden(entry: &walkdir::DirEntry) -> bool {
    entry
        .file_name()
        .to_str()
        .is_some_and(|s| s.starts_with('.'))
}
