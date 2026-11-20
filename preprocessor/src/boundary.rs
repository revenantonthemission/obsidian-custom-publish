//! BoundaryGuard (U1 security-design §2, L1): resolve NOTES, PAGES and OUTPUT
//! and reject any overlap before anything is read, stamped or deleted
//! (BR1.2, BR1.3; NFR5.4, NFR5.17).
//!
//! PAGES and OUTPUT may not exist yet, so each path is resolved as its nearest
//! existing ancestor (canonicalised, links resolved) plus the missing tail. A
//! `..` in that tail cannot be resolved without guessing, so it is a usage
//! error. Two paths overlap when they are equal or one is a component-wise
//! prefix of the other, compared after Unicode lowercasing because APFS is
//! case-insensitive. Existing components are compared by the canonical
//! on-disk names APFS returns; NFC normalisation is not applied, because the
//! tech-stack decision adds no dependency (code-generation plan, deviation
//! from security-design §2).

use std::ffi::OsString;
use std::fmt;
use std::path::{Component, Path, PathBuf};

/// The state of the optional site-pages folder after resolution.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PagesFolder {
    /// `--pages` was not given.
    NotGiven,
    /// `--pages` was given but nothing exists at the resolved path.
    Missing(PathBuf),
    /// `--pages` names an existing folder (canonical path).
    Present(PathBuf),
}

impl PagesFolder {
    /// The resolved path, when `--pages` was given.
    pub fn path(&self) -> Option<&Path> {
        match self {
            PagesFolder::NotGiven => None,
            PagesFolder::Missing(path) | PagesFolder::Present(path) => Some(path),
        }
    }
}

/// The three resolved run folders. `notes` and a present `pages` are
/// canonical, so walkers rooted at them never start on a link.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RunFolders {
    pub notes: PathBuf,
    pub pages: PagesFolder,
    pub output: PathBuf,
}

/// Why the folders were rejected. `Usage` exits 2 with fixed text; `Io` keeps
/// today's uncoded exit 1 for a NOTES folder that cannot be read.
#[derive(Debug)]
pub enum BoundaryError {
    Usage(String),
    Io(String),
}

impl BoundaryError {
    pub fn exit_code(&self) -> i32 {
        match self {
            BoundaryError::Usage(_) => 2,
            BoundaryError::Io(_) => 1,
        }
    }
}

impl fmt::Display for BoundaryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            BoundaryError::Usage(message) | BoundaryError::Io(message) => f.write_str(message),
        }
    }
}

/// Resolve and check the run folders (security-design §2). Checks run in the
/// documented order and the first failure is returned.
pub fn resolve_run_folders(
    notes: &Path,
    pages: Option<&Path>,
    output: &Path,
) -> Result<RunFolders, BoundaryError> {
    let notes = resolve_notes(notes)?;
    let pages = match pages {
        None => PagesFolder::NotGiven,
        Some(path) => resolve_pages(path)?,
    };
    let output = resolve_lenient(output)?;

    if let Some(p) = pages.path()
        && overlaps(p, &notes)
    {
        return Err(BoundaryError::Usage(format!(
            "error: --pages {} overlaps posts folder {}",
            p.display(),
            notes.display()
        )));
    }
    if overlaps(&output, &notes) {
        return Err(BoundaryError::Usage(format!(
            "error: output folder {} overlaps posts folder {}",
            output.display(),
            notes.display()
        )));
    }
    if let Some(p) = pages.path()
        && overlaps(&output, p)
    {
        return Err(BoundaryError::Usage(format!(
            "error: output folder {} overlaps site pages folder {}",
            output.display(),
            p.display()
        )));
    }

    Ok(RunFolders {
        notes,
        pages,
        output,
    })
}

/// NOTES must exist and be a folder. A missing NOTES keeps today's I/O
/// failure (exit 1); a NOTES that is a file is a usage error (exit 2).
fn resolve_notes(path: &Path) -> Result<PathBuf, BoundaryError> {
    let canonical = std::fs::canonicalize(path).map_err(|e| {
        BoundaryError::Io(format!(
            "Error: cannot read posts folder {}: {e}",
            path.display()
        ))
    })?;
    if !canonical.is_dir() {
        return Err(BoundaryError::Usage(format!(
            "error: posts folder {} is not a folder",
            canonical.display()
        )));
    }
    Ok(canonical)
}

/// PAGES may be missing (a notice, not an error) but never a non-folder.
fn resolve_pages(path: &Path) -> Result<PagesFolder, BoundaryError> {
    let resolved = resolve_lenient(path)?;
    if !resolved.exists() {
        return Ok(PagesFolder::Missing(resolved));
    }
    if !resolved.is_dir() {
        return Err(BoundaryError::Usage(format!(
            "error: site pages folder {} is not a folder",
            resolved.display()
        )));
    }
    Ok(PagesFolder::Present(resolved))
}

/// Canonicalise the nearest existing ancestor and append the missing tail.
fn resolve_lenient(path: &Path) -> Result<PathBuf, BoundaryError> {
    let absolute = std::path::absolute(path)
        .map_err(|e| BoundaryError::Io(format!("Error: cannot resolve {}: {e}", path.display())))?;
    let components: Vec<Component<'_>> = absolute.components().collect();

    for split in (1..=components.len()).rev() {
        let prefix: PathBuf = components[..split].iter().collect();
        let Ok(canonical) = std::fs::canonicalize(&prefix) else {
            continue;
        };
        let mut resolved = canonical;
        for component in &components[split..] {
            match component {
                Component::Normal(name) => resolved.push(name),
                _ => {
                    return Err(BoundaryError::Usage(format!(
                        "error: cannot resolve {}: '..' after a missing folder",
                        absolute.display()
                    )));
                }
            }
        }
        return Ok(resolved);
    }
    // Unreachable on Unix: the root always canonicalises.
    Err(BoundaryError::Io(format!(
        "Error: cannot resolve {}",
        absolute.display()
    )))
}

/// RunNotice texts (reliability-design §2; contract C1). Each is one stderr
/// line; a run prints at most one of them.
pub fn pages_not_given_notice() -> String {
    "notice: no site pages folder given; publishing no site pages".to_string()
}

pub fn pages_missing_notice(path: &Path) -> String {
    format!(
        "notice: site pages folder {} not found; publishing no site pages",
        path.display()
    )
}

pub fn pages_empty_notice(path: &Path) -> String {
    format!(
        "notice: site pages folder {} is empty; publishing no site pages",
        path.display()
    )
}

/// Equal, or one a component-wise prefix of the other, after lowercasing.
/// `Areas/Notes` never matches `Areas/NotesArchive`.
pub fn overlaps(a: &Path, b: &Path) -> bool {
    let fa = folded(a);
    let fb = folded(b);
    fa.starts_with(&fb[..]) || fb.starts_with(&fa[..])
}

fn folded(path: &Path) -> Vec<OsString> {
    path.components()
        .map(|c| OsString::from(c.as_os_str().to_string_lossy().to_lowercase()))
        .collect()
}
