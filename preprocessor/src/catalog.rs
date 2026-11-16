//! Publication catalog (U1 BR2.1–BR2.8): classifies every scanned note as a
//! post, a site page or the retired homepage note, checks the publishing
//! boundary, and hands later passes two read-only views.
//!
//! Classification is folder-first (BR2.1): every note from the pages folder is
//! a site page and its `visibility` is never read. Posts-folder notes are
//! classified by `visibility` (BR2.2). Every finding of BR2.2–BR2.6 is
//! collected in one batch, sorted by (path, code, other path) and reported
//! before anything is stamped or written (BR2.7).

use std::collections::HashMap;

use crate::syntax::TRANSCLUSION_RE;
use crate::transform::{strip_frontmatter, transform_outside_fences};
use crate::types::{NoteSource, PostMeta, RawVisibility, VaultIndex};

/// Publication scope of a posts-folder note's `visibility` value.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PublicationScope {
    Post,
    Homepage,
}

/// The publication decision for one scanned note (entities.md CatalogEntry).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EntryKind {
    /// A posts-folder note: listed, indexed and written under `posts/`.
    Post,
    /// A pages-folder note: written under `pages/`, never listed.
    SitePage,
    /// The retired `visibility: homepage` note: never written; links to it
    /// render as `/`.
    RetiredHomepage,
}

impl EntryKind {
    /// The word PUB008 uses for the clashing note.
    fn noun(self) -> &'static str {
        match self {
            EntryKind::Post => "post",
            EntryKind::SitePage => "site page",
            EntryKind::RetiredHomepage => "retired homepage note",
        }
    }
}

/// Stable diagnostic vocabulary. PUB002 is retired (BR2.3); codes outside
/// this enum cannot be emitted. The order is the sort order within one path.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum DiagnosticCode {
    /// Unknown `visibility` value or type in the posts folder.
    Pub001,
    /// More than one homepage note.
    Pub003,
    /// Whole transclusion of the retired homepage note.
    Pub004,
    /// Heading transclusion of the retired homepage note.
    Pub005,
    /// Block transclusion of the retired homepage note.
    Pub006,
    /// Output write failure (raised by the writer, not the catalog).
    Pub007,
    /// A site page shares its slug with another note.
    Pub008,
    /// Transclusion of a site page.
    Pub009,
}

impl DiagnosticCode {
    pub fn as_str(self) -> &'static str {
        match self {
            DiagnosticCode::Pub001 => "PUB001",
            DiagnosticCode::Pub003 => "PUB003",
            DiagnosticCode::Pub004 => "PUB004",
            DiagnosticCode::Pub005 => "PUB005",
            DiagnosticCode::Pub006 => "PUB006",
            DiagnosticCode::Pub007 => "PUB007",
            DiagnosticCode::Pub008 => "PUB008",
            DiagnosticCode::Pub009 => "PUB009",
        }
    }
}

/// One publication-boundary finding. `path` is the offending note (for
/// PUB008 the site page); `other_path` is the clashing note (PUB008 only).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PublicationDiagnostic {
    pub code: DiagnosticCode,
    pub path: String,
    pub other_path: Option<String>,
    pub detail: String,
}

/// Sort a batch into the reporting order (path, code, other path) (BR2.7).
/// The sort is stable, so findings with equal keys keep document order.
pub fn sort_diagnostics(diags: &mut [PublicationDiagnostic]) {
    diags.sort_by(|a, b| {
        (a.path.as_str(), a.code, &a.other_path).cmp(&(b.path.as_str(), b.code, &b.other_path))
    });
}

/// Exact stderr line for one diagnostic: `CODE path: detail`.
pub fn format_diagnostic(d: &PublicationDiagnostic) -> String {
    format!("{} {}: {}", d.code.as_str(), d.path, d.detail)
}

/// Print one line per diagnostic to stderr in batch order.
pub fn report_diagnostics(diags: &[PublicationDiagnostic]) {
    for d in diags {
        eprintln!("{}", format_diagnostic(d));
    }
}

/// Parse an authored `visibility` value into a scope (BR2.2). Anything but the
/// exact lowercase scalars `post`/`homepage` is an error carrying the value.
pub fn parse_scope(visibility: &Option<RawVisibility>) -> Result<PublicationScope, String> {
    match visibility {
        None => Ok(PublicationScope::Post),
        Some(RawVisibility::Scalar(s)) if s == "post" => Ok(PublicationScope::Post),
        Some(RawVisibility::Scalar(s)) if s == "homepage" => Ok(PublicationScope::Homepage),
        Some(RawVisibility::Scalar(s)) => Err(format!("unknown visibility value {s:?}")),
        Some(RawVisibility::NonScalar(repr)) => Err(format!("non-scalar visibility value {repr}")),
    }
}

/// Validated publication catalog: the only supplier of notes downstream.
///
/// `link_targets()` holds every entry and is used only to decide how a link
/// renders (BR3.1–BR3.3). `posts_only()` holds posts only and feeds meta,
/// posts, graph, search, previews, nav tree, backlinks and related posts
/// (BR2.8); site pages and the retired note are absent from its notes and
/// lookup maps, so a discovery builder cannot see them even by name.
#[derive(Debug)]
pub struct PublicationCatalog {
    link_targets: VaultIndex,
    kinds: Vec<EntryKind>,
    posts_only: VaultIndex,
}

impl PublicationCatalog {
    /// Classify and check every note, or fail with the whole sorted batch.
    pub fn build(index: VaultIndex) -> Result<PublicationCatalog, Vec<PublicationDiagnostic>> {
        let mut diags = Vec::new();
        let kinds = classify(&index, &mut diags);
        check_homepage_cardinality(&index, &kinds, &mut diags);
        check_site_page_slugs(&index, &kinds, &mut diags);
        check_embeds(&index, &kinds, &mut diags);

        if !diags.is_empty() {
            sort_diagnostics(&mut diags);
            return Err(diags);
        }

        let kinds: Vec<EntryKind> = kinds.into_iter().map(Option::unwrap).collect();
        let posts_only = filtered_index(&index, &kinds, EntryKind::Post);
        Ok(PublicationCatalog {
            link_targets: index,
            kinds,
            posts_only,
        })
    }

    /// Link-rendering view: every entry.
    pub fn link_targets(&self) -> &VaultIndex {
        &self.link_targets
    }

    /// Discovery view: posts only.
    pub fn posts_only(&self) -> &VaultIndex {
        &self.posts_only
    }

    /// Kind of every entry, parallel to `link_targets().posts`. The transform
    /// uses it to decide how a wikilink renders (BR3.1–BR3.3).
    pub fn kinds(&self) -> &[EntryKind] {
        &self.kinds
    }

    /// Kind of the entry at `idx` within `link_targets().posts`.
    pub fn kind_of(&self, idx: usize) -> EntryKind {
        self.kinds[idx]
    }

    /// Index of the retired homepage note within `link_targets().posts`.
    pub fn retired_idx(&self) -> Option<usize> {
        self.kinds
            .iter()
            .position(|k| *k == EntryKind::RetiredHomepage)
    }

    /// The retired homepage note, when the posts folder still holds one.
    pub fn retired(&self) -> Option<&PostMeta> {
        self.retired_idx().map(|i| &self.link_targets.posts[i])
    }

    /// Indices of the site pages within `link_targets().posts`, in scan order.
    pub fn site_page_indices(&self) -> impl Iterator<Item = usize> + '_ {
        self.kinds
            .iter()
            .enumerate()
            .filter(|(_, k)| **k == EntryKind::SitePage)
            .map(|(i, _)| i)
    }

    /// The site pages, in scan order (slug, source, path).
    pub fn site_pages(&self) -> impl Iterator<Item = &PostMeta> + '_ {
        self.site_page_indices()
            .map(|i| &self.link_targets.posts[i])
    }
}

fn path_of(note: &PostMeta) -> String {
    note.file_path.display().to_string()
}

/// BR2.1–BR2.2: folder first, then `visibility` for posts-folder notes. An
/// unclassifiable note gets PUB001 and no kind.
fn classify(index: &VaultIndex, diags: &mut Vec<PublicationDiagnostic>) -> Vec<Option<EntryKind>> {
    index
        .posts
        .iter()
        .map(|note| {
            if note.source == NoteSource::Pages {
                return Some(EntryKind::SitePage);
            }
            match parse_scope(&note.visibility) {
                Ok(PublicationScope::Post) => Some(EntryKind::Post),
                Ok(PublicationScope::Homepage) => Some(EntryKind::RetiredHomepage),
                Err(detail) => {
                    diags.push(PublicationDiagnostic {
                        code: DiagnosticCode::Pub001,
                        path: path_of(note),
                        other_path: None,
                        detail,
                    });
                    None
                }
            }
        })
        .collect()
}

/// BR2.3: zero homepage notes is fine; more than one is PUB003.
fn check_homepage_cardinality(
    index: &VaultIndex,
    kinds: &[Option<EntryKind>],
    diags: &mut Vec<PublicationDiagnostic>,
) {
    let mut paths: Vec<String> = index
        .posts
        .iter()
        .zip(kinds)
        .filter(|(_, k)| **k == Some(EntryKind::RetiredHomepage))
        .map(|(note, _)| path_of(note))
        .collect();
    if paths.len() < 2 {
        return;
    }
    paths.sort();
    diags.push(PublicationDiagnostic {
        code: DiagnosticCode::Pub003,
        path: paths[0].clone(),
        other_path: None,
        detail: format!(
            "{} homepage sources declared: {}",
            paths.len(),
            paths.join(", ")
        ),
    });
}

/// BR2.4: a site page shares its slug with no other note. One PUB008 per
/// clashing pair; for two site pages the earlier path is `path`. Two posts
/// sharing a slug keep the scanner's warning and are not checked here.
fn check_site_page_slugs(
    index: &VaultIndex,
    kinds: &[Option<EntryKind>],
    diags: &mut Vec<PublicationDiagnostic>,
) {
    let mut by_slug: HashMap<&str, Vec<usize>> = HashMap::new();
    for (i, note) in index.posts.iter().enumerate() {
        by_slug.entry(note.slug.as_str()).or_default().push(i);
    }

    for (slug, members) in by_slug {
        for (n, &a) in members.iter().enumerate() {
            for &b in &members[n + 1..] {
                let (page, other) = match (kinds[a], kinds[b]) {
                    (Some(EntryKind::SitePage), Some(EntryKind::SitePage)) => {
                        if path_of(&index.posts[a]) <= path_of(&index.posts[b]) {
                            (a, b)
                        } else {
                            (b, a)
                        }
                    }
                    (Some(EntryKind::SitePage), _) => (a, b),
                    (_, Some(EntryKind::SitePage)) => (b, a),
                    _ => continue,
                };
                let other_kind = kinds[other].map_or("note", EntryKind::noun);
                let other_path = path_of(&index.posts[other]);
                diags.push(PublicationDiagnostic {
                    code: DiagnosticCode::Pub008,
                    path: path_of(&index.posts[page]),
                    detail: format!(
                        "site page slug \"{slug}\" clashes with {other_kind} {other_path}"
                    ),
                    other_path: Some(other_path),
                });
            }
        }
    }
}

/// BR2.5–BR2.6: no published body (posts, site pages, and notes that failed
/// classification) embeds the retired note or a site page. The retired note's
/// own body is not checked: it is never published. Fenced code is skipped.
fn check_embeds(
    index: &VaultIndex,
    kinds: &[Option<EntryKind>],
    diags: &mut Vec<PublicationDiagnostic>,
) {
    let mut protected: HashMap<&str, EntryKind> = HashMap::new();
    for (note, kind) in index.posts.iter().zip(kinds) {
        if let Some(kind @ (EntryKind::SitePage | EntryKind::RetiredHomepage)) = kind {
            protected.insert(note.title.as_str(), *kind);
        }
    }
    if protected.is_empty() {
        return;
    }

    for (note, kind) in index.posts.iter().zip(kinds) {
        if *kind == Some(EntryKind::RetiredHomepage) {
            continue;
        }
        let body = strip_frontmatter(&note.raw_content);
        transform_outside_fences(&body, |line| {
            for caps in TRANSCLUSION_RE.captures_iter(line) {
                let Some(target) = protected.get(caps[1].trim()) else {
                    continue;
                };
                diags.push(embed_diagnostic(note, *target, &caps));
            }
            line.to_string()
        });
    }
}

fn embed_diagnostic(
    note: &PostMeta,
    target: EntryKind,
    caps: &regex::Captures<'_>,
) -> PublicationDiagnostic {
    let matched = &caps[0];
    let form = if caps.get(2).is_some() {
        2
    } else if caps.get(3).is_some() {
        1
    } else {
        0
    };
    let (code, detail) = match target {
        EntryKind::SitePage => (
            DiagnosticCode::Pub009,
            format!(
                "{} transclusion of site page: {matched}",
                ["whole", "heading", "block"][form]
            ),
        ),
        _ => (
            [
                DiagnosticCode::Pub004,
                DiagnosticCode::Pub005,
                DiagnosticCode::Pub006,
            ][form],
            format!(
                "{} transclusion of homepage source: {matched}",
                ["full", "heading", "block"][form]
            ),
        ),
    };
    PublicationDiagnostic {
        code,
        path: path_of(note),
        other_path: None,
        detail,
    }
}

/// Clone the entries of one kind into a fresh index, rebuilding every lookup
/// map so other entries cannot be resolved from the view.
fn filtered_index(index: &VaultIndex, kinds: &[EntryKind], keep: EntryKind) -> VaultIndex {
    let posts: Vec<PostMeta> = index
        .posts
        .iter()
        .zip(kinds)
        .filter(|(_, k)| **k == keep)
        .map(|(p, _)| p.clone())
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
        .filter(|(title, _)| name_map.contains_key(*title))
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();
    let block_map = index
        .block_map
        .iter()
        .filter(|(title, _)| name_map.contains_key(*title))
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
