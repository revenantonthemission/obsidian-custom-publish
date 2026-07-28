//! Publication catalog: partitions scanned sources into exactly one homepage
//! source and discoverable posts, with staged fail-closed diagnostics.
//!
//! Stage 1 (build): scope parsing + cardinality — PUB001~PUB003.
//! Stage 2 (validate_references): homepage-target transclusions — PUB004~PUB006.
//! Each stage collects every issue it can see before failing (BR-U2-023); a
//! stage-1 failure means stage 2 never runs.

use std::collections::HashMap;

use crate::syntax::TRANSCLUSION_RE;
use crate::transform::{strip_frontmatter, transform_outside_fences};
use crate::types::{PostMeta, RawVisibility, VaultIndex};

/// Publication scope of a scanned source (DE §1.1).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PublicationScope {
    Post,
    Homepage,
}

/// Stable diagnostic vocabulary (business-rules §5). Codes outside this enum
/// cannot be emitted.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum DiagnosticCode {
    /// Unknown `visibility` value or type.
    Pub001,
    /// No homepage source (transition-incomplete signal included).
    Pub002,
    /// More than one homepage source.
    Pub003,
    /// Full transclusion targeting the homepage.
    Pub004,
    /// Heading transclusion targeting the homepage.
    Pub005,
    /// Block transclusion targeting the homepage.
    Pub006,
    /// Output write failure.
    Pub007,
}

impl DiagnosticCode {
    pub fn as_str(self) -> &'static str {
        match self {
            DiagnosticCode::Pub001 => "PUB001",
            DiagnosticCode::Pub002 => "PUB002",
            DiagnosticCode::Pub003 => "PUB003",
            DiagnosticCode::Pub004 => "PUB004",
            DiagnosticCode::Pub005 => "PUB005",
            DiagnosticCode::Pub006 => "PUB006",
            DiagnosticCode::Pub007 => "PUB007",
        }
    }
}

/// One publication-boundary issue. `path` is the source path as scanned;
/// PUB002 carries an empty path so it sorts first (business-rules §5).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PublicationDiagnostic {
    pub code: DiagnosticCode,
    pub path: String,
    pub detail: String,
}

/// Sort a batch into the reporting order: path ascending, then code (BR-U2-023).
pub fn sort_diagnostics(diags: &mut Vec<PublicationDiagnostic>) {
    diags.sort_by(|a, b| (a.path.as_str(), a.code).cmp(&(b.path.as_str(), b.code)));
}

/// Exact stderr line for one diagnostic: `CODE path: detail` (NFR-U2-005).
pub fn format_diagnostic(d: &PublicationDiagnostic) -> String {
    format!("{} {}: {}", d.code.as_str(), d.path, d.detail)
}

/// Print one line per diagnostic to stderr in batch order (NFR-U2-005).
pub fn report_diagnostics(diags: &[PublicationDiagnostic]) {
    for d in diags {
        eprintln!("{}", format_diagnostic(d));
    }
}

/// Parse an authored `visibility` value into a scope (BR-U2-001~003).
/// Recognition never mutates the source value; anything but the exact lowercase
/// scalars `post`/`homepage` is an error carrying the found value.
pub fn parse_scope(visibility: &Option<RawVisibility>) -> Result<PublicationScope, String> {
    match visibility {
        None => Ok(PublicationScope::Post),
        Some(RawVisibility::Scalar(s)) if s == "post" => Ok(PublicationScope::Post),
        Some(RawVisibility::Scalar(s)) if s == "homepage" => Ok(PublicationScope::Homepage),
        Some(RawVisibility::Scalar(s)) => Err(format!("unknown visibility value {s:?}")),
        Some(RawVisibility::NonScalar(repr)) => Err(format!("non-scalar visibility value {repr}")),
    }
}

/// Validated publication catalog: the only supplier of sources downstream.
///
/// `full()` is the reference-resolution view (homepage included — normal posts
/// may link to it). `posts_only()` is the sole input for every discovery
/// derivation; the homepage is absent from its posts and lookup maps, so a
/// discovery builder cannot see it even by name.
#[derive(Debug)]
pub struct PublicationCatalog {
    full: VaultIndex,
    posts_only: VaultIndex,
    homepage_idx: usize,
}

impl PublicationCatalog {
    /// Build the catalog or fail with every stage-1 diagnostic (PUB001~003).
    pub fn build(index: VaultIndex) -> Result<PublicationCatalog, Vec<PublicationDiagnostic>> {
        let mut diags = Vec::new();
        let mut homepage_paths: Vec<(String, usize)> = Vec::new();

        for (i, post) in index.posts.iter().enumerate() {
            match parse_scope(&post.visibility) {
                Ok(PublicationScope::Homepage) => {
                    homepage_paths.push((post.file_path.display().to_string(), i));
                }
                Ok(PublicationScope::Post) => {}
                Err(detail) => diags.push(PublicationDiagnostic {
                    code: DiagnosticCode::Pub001,
                    path: post.file_path.display().to_string(),
                    detail,
                }),
            }
        }

        homepage_paths.sort();
        match homepage_paths.len() {
            1 => {}
            0 => diags.push(PublicationDiagnostic {
                code: DiagnosticCode::Pub002,
                path: String::new(),
                detail: format!(
                    "scanned {} sources, none declares visibility: homepage",
                    index.posts.len()
                ),
            }),
            _ => diags.push(PublicationDiagnostic {
                code: DiagnosticCode::Pub003,
                path: homepage_paths[0].0.clone(),
                detail: format!(
                    "{} homepage sources declared: {}",
                    homepage_paths.len(),
                    homepage_paths
                        .iter()
                        .map(|(p, _)| p.as_str())
                        .collect::<Vec<_>>()
                        .join(", ")
                ),
            }),
        }

        if !diags.is_empty() {
            sort_diagnostics(&mut diags);
            return Err(diags);
        }

        let homepage_idx = homepage_paths[0].1;
        let posts_only = filtered_index(&index, homepage_idx);

        Ok(PublicationCatalog {
            full: index,
            posts_only,
            homepage_idx,
        })
    }

    /// Reference-resolution view: every source, homepage included.
    pub fn full(&self) -> &VaultIndex {
        &self.full
    }

    /// Discovery view: the homepage is structurally absent.
    pub fn posts_only(&self) -> &VaultIndex {
        &self.posts_only
    }

    /// Index of the homepage source within `full().posts`.
    pub fn homepage_idx(&self) -> usize {
        self.homepage_idx
    }

    pub fn homepage(&self) -> &PostMeta {
        &self.full.posts[self.homepage_idx]
    }

    /// Stage-2 validation: reject every transclusion that targets the homepage
    /// (BR-U2-018~020). Image embeds also match TRANSCLUSION_RE but their
    /// "name" is a filename and never equals the homepage title. Fenced code is
    /// never inspected (BR-U2-022).
    pub fn validate_references(&self) -> Vec<PublicationDiagnostic> {
        let homepage_title = &self.homepage().title;
        let mut diags = Vec::new();

        for post in &self.full.posts {
            let body = strip_frontmatter(&post.raw_content);
            transform_outside_fences(&body, |line| {
                for caps in TRANSCLUSION_RE.captures_iter(line) {
                    let name = caps[1].trim();
                    if name != homepage_title {
                        continue;
                    }
                    let matched = caps[0].to_string();
                    let (code, kind) = if caps.get(2).is_some() {
                        (DiagnosticCode::Pub006, "block")
                    } else if caps.get(3).is_some() {
                        (DiagnosticCode::Pub005, "heading")
                    } else {
                        (DiagnosticCode::Pub004, "full")
                    };
                    diags.push(PublicationDiagnostic {
                        code,
                        path: post.file_path.display().to_string(),
                        detail: format!("{kind} transclusion of homepage source: {matched}"),
                    });
                }
                line.to_string()
            });
        }

        sort_diagnostics(&mut diags);
        diags
    }
}

/// Clone the index without the homepage source, rebuilding every lookup map so
/// the homepage cannot be resolved from the discovery view (FD-P-C07-01).
fn filtered_index(index: &VaultIndex, homepage_idx: usize) -> VaultIndex {
    let homepage_title = &index.posts[homepage_idx].title;

    let posts: Vec<PostMeta> = index
        .posts
        .iter()
        .enumerate()
        .filter(|(i, _)| *i != homepage_idx)
        .map(|(_, p)| p.clone())
        .collect();

    let slug_map: HashMap<String, usize> = posts
        .iter()
        .enumerate()
        .map(|(i, p)| (p.slug.clone(), i))
        .collect();
    let name_map: HashMap<String, usize> = posts
        .iter()
        .enumerate()
        .map(|(i, p)| (p.title.clone(), i))
        .collect();

    let heading_map = index
        .heading_map
        .iter()
        .filter(|(title, _)| *title != homepage_title)
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();
    let block_map = index
        .block_map
        .iter()
        .filter(|(title, _)| *title != homepage_title)
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();

    VaultIndex {
        posts,
        slug_map,
        name_map,
        heading_map,
        block_map,
    }
}
