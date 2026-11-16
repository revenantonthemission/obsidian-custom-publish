use anyhow::{Context, Result};
use chrono::{DateTime, Local};
use serde::Deserialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;

use crate::syntax::{BLOCK_ID_RE, HEADING_RE, frontmatter_range};
use crate::types::{NoteSource, PostMeta, RawVisibility, VaultIndex, is_korean};
use crate::walker::{skipped_link_warning, walk_markdown};

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
    #[serde(default)]
    visibility: Option<serde_yml::Value>,
}

/// Capture the raw `visibility` value without normalizing it — the publication
/// catalog owns validation and must see exactly what was authored (BR-U2-002~004).
fn raw_visibility(value: Option<serde_yml::Value>) -> Option<RawVisibility> {
    value.map(|v| match v {
        serde_yml::Value::String(s) => RawVisibility::Scalar(s),
        other => RawVisibility::NonScalar(format!("{other:?}")),
    })
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
///
/// Walks with the shared BoundaryWalker, so it never writes through a link
/// and never opens a dot entry or `Drafts` (BR1.4, BR4.2; NFR5.6). It prints
/// no link warnings: the run prints them once, from the first scan.
pub fn stamp_published_dates(vault_path: &Path) -> Result<usize> {
    let today = Local::now().format("%Y-%m-%d").to_string();
    let mut count = 0;
    let (files, _skipped_links) = walk_markdown(vault_path)?;

    for path in &files {
        let path = path.as_path();
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

/// Scan one posts folder and build an index of its notes, reporting skipped
/// links on stderr. The publishing run uses `scan_sources` directly.
pub fn scan_vault(vault_path: &Path) -> Result<VaultIndex> {
    Ok(scan_sources(vault_path, None, true)?.index)
}

/// The result of scanning both source folders.
#[derive(Debug)]
pub struct ScanOutcome {
    /// Every note from NOTES and PAGES in (slug, source, path) order.
    pub index: VaultIndex,
    /// Links the walker skipped in either folder, NOTES first, each sorted.
    pub skipped_links: Vec<PathBuf>,
    /// Notes found under PAGES after the skip rules (0 = the folder is empty).
    pub page_count: usize,
}

/// Scan NOTES and, when present, PAGES into one index (BR1.4, BR1.5, BR1.7).
///
/// Both folders are walked first. With `report_links`, each skipped link is
/// printed once, before any note is read (observability-design §2 row 3); the
/// stamping rescan passes `false` so a link is never reported twice.
pub fn scan_sources(notes: &Path, pages: Option<&Path>, report_links: bool) -> Result<ScanOutcome> {
    let mut roots = vec![(notes, NoteSource::Notes)];
    if let Some(pages) = pages {
        roots.push((pages, NoteSource::Pages));
    }

    let mut walked = Vec::new();
    let mut skipped_links = Vec::new();
    for (root, source) in roots {
        let (files, links) = walk_markdown(root)?;
        skipped_links.extend(links);
        walked.push((root, source, files));
    }
    if report_links {
        for link in &skipped_links {
            eprintln!("{}", skipped_link_warning(link));
        }
    }

    let mut notes_read = Vec::new();
    for (root, source, files) in walked {
        // Batch-query git for all file modification dates (one subprocess instead of N)
        let git_dates = git_last_modified_batch(root);
        let origin = NoteOrigin {
            source,
            // The walk succeeded, so the root canonicalises; the walker
            // yields paths under this same canonical root.
            root: std::fs::canonicalize(root)
                .with_context(|| format!("failed to read folder {}", root.display()))?,
        };
        for path in &files {
            notes_read.push(read_note(path, &origin, &git_dates)?);
        }
    }

    let page_count = notes_read
        .iter()
        .filter(|n| n.post.source == NoteSource::Pages)
        .count();
    Ok(ScanOutcome {
        index: build_index(notes_read),
        skipped_links,
        page_count,
    })
}

/// The folder a note is read from: its source tag and canonical root.
struct NoteOrigin {
    source: NoteSource,
    root: PathBuf,
}

/// Read and parse one note.
fn read_note(
    path: &Path,
    origin: &NoteOrigin,
    git_dates: &HashMap<PathBuf, String>,
) -> Result<ScannedNote> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("failed to read {}", path.display()))?;

    let filename = path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let slug = slugify(&filename);
    let (frontmatter, body) = parse_frontmatter(&content);

    // The walker yields canonical paths, so they match git's canonical keys.
    let updated = git_dates.get(path).cloned();
    let created = frontmatter.created.or_else(|| file_created_date(path));

    // Extract headings and blocks during the scan to avoid re-parsing.
    let headings = extract_headings(body);
    let blocks = extract_blocks(body);

    let post = PostMeta {
        slug,
        title: filename,
        file_path: path.to_path_buf(),
        tags: frontmatter.tags,
        created,
        published: frontmatter.published,
        updated,
        is_hub: frontmatter.is_hub,
        hub_parent: frontmatter.hub_parent,
        description: frontmatter.description,
        visibility: raw_visibility(frontmatter.visibility),
        source: origin.source,
        source_root: origin.root.clone(),
        raw_content: content,
    };
    Ok(ScannedNote {
        post,
        headings,
        blocks,
    })
}

/// One scanned note with the fragments extracted from its body.
struct ScannedNote {
    post: PostMeta,
    headings: Vec<String>,
    blocks: HashMap<String, String>,
}

/// Sort notes into the fixed scan order (slug, source, path) and build the
/// lookup maps (BR1.7).
fn build_index(mut notes: Vec<ScannedNote>) -> VaultIndex {
    notes.sort_by(|a, b| {
        let ka = (&a.post.slug, a.post.source, &a.post.file_path);
        let kb = (&b.post.slug, b.post.source, &b.post.file_path);
        ka.cmp(&kb)
    });

    let mut heading_map: HashMap<String, Vec<String>> = HashMap::new();
    let mut block_map: HashMap<String, HashMap<String, String>> = HashMap::new();
    let mut posts = Vec::with_capacity(notes.len());
    for note in notes {
        heading_map.insert(note.post.title.clone(), note.headings);
        block_map.insert(note.post.title.clone(), note.blocks);
        posts.push(note.post);
    }

    let mut slug_map: HashMap<String, usize> = HashMap::new();
    for (i, p) in posts.iter().enumerate() {
        // Two posts-folder notes sharing a slug keep this warning; a clash
        // with a site page, or between a post and the retired homepage note,
        // is PUB008, reported by the catalog (BR2.4).
        if let Some(prev) = slug_map.insert(p.slug.clone(), i)
            && p.source == NoteSource::Notes
            && posts[prev].source == NoteSource::Notes
        {
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

    VaultIndex {
        posts,
        slug_map,
        name_map,
        heading_map,
        block_map,
    }
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

    // Use a prefixed format to unambiguously distinguish date lines from filenames
    let output = Command::new("git")
        .args([
            "--no-pager",
            "log",
            "--format=DATE:%cs",
            "--name-only",
            "--diff-filter=ACMR",
            "--",
        ])
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

    // Parse output: DATE:YYYY-MM-DD lines followed by filename lines, separated by blanks
    let mut current_date = String::new();
    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if let Some(date) = trimmed.strip_prefix("DATE:") {
            current_date = date.to_string();
        } else if !current_date.is_empty() {
            // File path — only store the first (most recent) date per file
            let path = Path::new(trimmed);
            let canonical = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
            result
                .entry(canonical)
                .or_insert_with(|| current_date.clone());
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
