use anyhow::{Context, Result};
use chrono::{DateTime, Local};
use serde::Deserialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

use crate::syntax::{frontmatter_range, BLOCK_ID_RE, HEADING_RE};
use crate::types::{is_korean, PostMeta, VaultIndex};

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
    #[serde(default)]
    description: Option<String>,
}

/// Deserializes a YAML value that may be a date, integer, or string into `Option<String>`.
fn deserialize_date_as_string<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde_yml::Value;
    let v = Option::<Value>::deserialize(deserializer)?;
    Ok(v.map(|val| match val {
        Value::String(s) => s,
        other => {
            // serde_yml parses bare dates like 2025-01-01 as strings,
            // but just in case, stringify whatever we get.
            format!("{other:?}")
        }
    }))
}

/// Convert a heading into a URL-safe slug (matching rehype-slug behavior).
/// Keeps alphanumeric, Korean characters, and hyphens. Strips everything else.
pub fn slugify_heading(heading: &str) -> String {
    heading
        .to_lowercase()
        .replace(' ', "-")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || is_korean(*c))
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

/// Extract all headings from markdown content and return their slugs.
/// Handles duplicate headings by appending -1, -2, etc. (matching rehype-slug).
fn extract_headings(content: &str) -> Vec<String> {
    let mut slugs = Vec::new();
    let mut counts: HashMap<String, usize> = HashMap::new();

    for cap in HEADING_RE.captures_iter(content) {
        let raw = cap[2].trim();
        let base_slug = slugify_heading(raw);
        let count = counts.entry(base_slug.clone()).or_insert(0);
        let slug = if *count == 0 {
            base_slug.clone()
        } else {
            format!("{base_slug}-{count}")
        };
        *count += 1;
        slugs.push(slug);
    }

    slugs
}

/// Extract block ID annotations (`^block-id`) from markdown content.
/// Returns a map of block_id -> the line text (without the `^block-id` suffix).
fn extract_blocks(content: &str) -> HashMap<String, String> {
    let mut blocks = HashMap::new();
    for line in content.lines() {
        if let Some(cap) = BLOCK_ID_RE.captures(line) {
            let block_id = cap[1].to_string();
            let text = BLOCK_ID_RE.replace(line, "").trim().to_string();
            blocks.insert(block_id, text);
        }
    }
    blocks
}

/// Stamp `published: YYYY-MM-DD` (today, local timezone) into vault files that either
/// lack a `published` field or were modified after their existing `published` date.
/// Returns the number of files stamped.
pub fn stamp_published_dates(vault_path: &Path) -> Result<usize> {
    let today = Local::now().format("%Y-%m-%d").to_string();
    let mut count = 0;

    for entry in WalkDir::new(vault_path)
        .into_iter()
        .filter_entry(|e| !is_excluded(e))
    {
        let entry = entry.context("failed to read directory entry")?;
        let path = entry.path();

        if !path.is_file() || path.extension().is_none_or(|ext| ext != "md") {
            continue;
        }

        let content = std::fs::read_to_string(path)
            .with_context(|| format!("failed to read {}", path.display()))?;

        if !content.starts_with("---") {
            // No frontmatter — add one with published
            let stamped = format!("---\npublished: {today}\n---\n{content}");
            std::fs::write(path, stamped)
                .with_context(|| format!("failed to write {}", path.display()))?;
            count += 1;
            continue;
        }

        if let Some(range) = frontmatter_range(&content) {
            let yaml_block = &content[range.clone()];

            // Find existing published date
            let existing_published = yaml_block
                .lines()
                .find(|l| l.trim_start().starts_with("published:"))
                .and_then(|l| l.split_once(':'))
                .map(|(_, v)| v.trim().to_string());

            match existing_published {
                Some(pub_date) => {
                    // Check if file was modified after the published date
                    let mtime_date = file_modified_date(path);
                    if mtime_date.as_deref() <= Some(pub_date.as_str()) {
                        continue; // not modified since last publish
                    }

                    // Replace existing published date with today
                    let stamped = content.replace(
                        &format!("published: {pub_date}"),
                        &format!("published: {today}"),
                    );
                    std::fs::write(path, stamped)
                        .with_context(|| format!("failed to write {}", path.display()))?;
                    count += 1;
                }
                None => {
                    // No published field — insert before the closing `---`
                    let stamped = format!(
                        "{}\npublished: {today}{}",
                        &content[..range.end],
                        &content[range.end..]
                    );
                    std::fs::write(path, stamped)
                        .with_context(|| format!("failed to write {}", path.display()))?;
                    count += 1;
                }
            }
        }
    }

    Ok(count)
}

/// Get the file modification date as `YYYY-MM-DD` in local timezone, or `None` if unavailable.
fn file_modified_date(file_path: &Path) -> Option<String> {
    let metadata = std::fs::metadata(file_path).ok()?;
    let modified = metadata.modified().ok()?;
    let local: DateTime<Local> = modified.into();
    Some(local.format("%Y-%m-%d").to_string())
}

/// Scan an Obsidian vault directory and build an index of all posts.
pub fn scan_vault(vault_path: &Path) -> Result<VaultIndex> {
    let mut posts = Vec::new();
    let mut heading_map: HashMap<String, Vec<String>> = HashMap::new();
    let mut block_map: HashMap<String, HashMap<String, String>> = HashMap::new();

    // Batch-query git for all file modification dates (one subprocess instead of N)
    let git_dates = git_last_modified_batch(vault_path);

    for entry in WalkDir::new(vault_path)
        .into_iter()
        .filter_entry(|e| !is_excluded(e))
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
        let (frontmatter, body) = parse_frontmatter(&content);

        let title = filename.clone();

        let updated = path.canonicalize().ok()
            .and_then(|canonical| git_dates.get(&canonical).cloned());

        let created = frontmatter.created.or_else(|| file_created_date(path));

        // Extract headings and blocks during initial scan to avoid re-parsing
        let headings = extract_headings(body);
        let blocks = extract_blocks(body);

        posts.push(PostMeta {
            slug,
            title,
            file_path: path.to_path_buf(),
            tags: frontmatter.tags,
            created,
            published: frontmatter.published,
            updated,
            is_hub: frontmatter.is_hub,
            hub_parent: frontmatter.hub_parent,
            description: frontmatter.description,
            raw_content: content,
        });
        heading_map.insert(posts.last().unwrap().title.clone(), headings);
        block_map.insert(posts.last().unwrap().title.clone(), blocks);
    }

    // Sort by slug for deterministic output across runs
    posts.sort_by(|a, b| a.slug.cmp(&b.slug));

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
        heading_map,
        block_map,
    })
}

/// Convert a filename into a URL-safe slug.
/// Delegates to `slugify_heading` — identical logic for filenames and headings.
fn slugify(name: &str) -> String {
    slugify_heading(name)
}

/// Split content into frontmatter and body.
fn parse_frontmatter(content: &str) -> (RawFrontmatter, &str) {
    match frontmatter_range(content) {
        Some(range) => {
            let yaml_str = content[range.clone()].trim();
            let body = &content[range.end + 4..]; // skip past closing \n---

            let fm: RawFrontmatter = match serde_yml::from_str(yaml_str) {
                Ok(fm) => fm,
                Err(e) => {
                    eprintln!("warning: malformed YAML frontmatter, using defaults: {e}");
                    RawFrontmatter::default()
                }
            };
            (fm, body)
        }
        None => (RawFrontmatter::default(), content),
    }
}

/// Batch-query git for the last commit date of all files under a directory.
/// Returns a map of canonical file path → `YYYY-MM-DD` date string.
fn git_last_modified_batch(vault_path: &Path) -> HashMap<PathBuf, String> {
    let mut result = HashMap::new();

    // `git log` with --name-only to get per-file last commit dates in one call
    let output = Command::new("git")
        .args(["log", "--format=%cs", "--name-only", "--diff-filter=ACMR", "--"])
        .arg(vault_path)
        .output();

    let output = match output {
        Ok(o) if o.status.success() => o,
        _ => return result,
    };

    let stdout = match String::from_utf8(output.stdout) {
        Ok(s) => s,
        Err(_) => return result,
    };

    // Parse output: alternating date lines and filename lines, separated by blank lines
    let mut current_date = String::new();
    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        // Date lines match YYYY-MM-DD pattern
        if trimmed.len() == 10 && trimmed.as_bytes()[4] == b'-' && trimmed.as_bytes()[7] == b'-' {
            current_date = trimmed.to_string();
        } else if !current_date.is_empty() {
            // File path — only store the first (most recent) date per file
            let path = Path::new(trimmed);
            let canonical = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
            result.entry(canonical).or_insert_with(|| current_date.clone());
        }
    }

    result
}

/// Get the file creation date (birthtime) as `YYYY-MM-DD` in local timezone, or `None` if unavailable.
fn file_created_date(file_path: &Path) -> Option<String> {
    let metadata = std::fs::metadata(file_path).ok()?;
    let created = metadata.created().ok()?;
    let local: DateTime<Local> = created.into();
    Some(local.format("%Y-%m-%d").to_string())
}

/// Check if a walkdir entry should be skipped (hidden or drafts).
fn is_excluded(entry: &walkdir::DirEntry) -> bool {
    entry
        .file_name()
        .to_str()
        .is_some_and(|s| s.starts_with('.') || s == "Drafts")
}
