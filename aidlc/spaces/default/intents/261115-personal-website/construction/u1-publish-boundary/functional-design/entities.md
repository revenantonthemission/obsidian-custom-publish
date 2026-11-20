# Entities — U1 `u1-publish-boundary`

Upstream: `inception/units-generation/unit-of-work.md` (U1); `inception/domain-design/components.md` (ScannedNote, CatalogEntry, SitePageArtifact); `inception/contract-design/contract-summary.md` (C1, C2); `inception/requirements-analysis/requirements.md` (FR1–FR3); answers in `functional-design-questions.md` (Q1–Q9).

The YAML block below is the source of truth. Logical types are technology-neutral: `text`, `path`, `date`, `bool`, `int`, `enum`, `list<…>`, `map<…>`.

```yaml
entities:
  - name: SourceFolder
    description: One of the two vault folders the publishing step may read. Value object, built once per run from the command line.
    attributes:
      - { name: role, type: enum, required: true, unique: true, allowed: [notes, pages] }
      - { name: root, type: path, required: false, constraints: "canonical absolute path; absent when role=pages and --pages was not given" }
      - { name: present, type: bool, required: true, constraints: "true only when root exists and is a directory" }
    constraints:
      - "Exactly one notes folder and at most one pages folder per run"
      - "The two roots are never equal and neither contains the other (BR1.2)"
      - "role=notes must be present; a missing notes folder is an I/O failure as today"
    relationships:
      - { to: ScannedNote, cardinality: "1..* : 0..*", direction: "SourceFolder contains ScannedNote" }

  - name: ScannedNote
    description: One Markdown note read from a SourceFolder. Owned by VaultScanner.
    attributes:
      - { name: slug, type: text, required: true, unique: false, constraints: "derived from the file name stem by the existing slug rule; uniqueness is enforced by the catalog, not here" }
      - { name: title, type: text, required: true, constraints: "file name stem" }
      - { name: path, type: path, required: true, unique: true, constraints: "file path; always inside source.root" }
      - { name: source, type: enum, required: true, allowed: [notes, pages], references: SourceFolder.role }
      - { name: frontmatter, type: "map<text, any>", required: true, default: "{}", constraints: "malformed YAML yields {} with a warning, as today" }
      - { name: visibility, type: "text|null", required: false, constraints: "raw frontmatter value; only interpreted when source=notes" }
      - { name: published, type: "date|null", required: false }
      - { name: body, type: text, required: true }
      - { name: headings, type: "list<text>", required: true, default: "[]" }
      - { name: blockIds, type: "list<text>", required: true, default: "[]" }
    constraints:
      - "Notes under any dot-entry or a folder named Drafts are never scanned (BR1.4)"
      - "Sorted by (slug, source, path) so equal slugs have a fixed order (BR1.7)"
    relationships:
      - { to: SourceFolder, cardinality: "0..* : 1", direction: "ScannedNote belongs to SourceFolder" }
      - { to: CatalogEntry, cardinality: "1 : 1", direction: "ScannedNote is classified by CatalogEntry" }

  - name: CatalogEntry
    description: The publication decision for one ScannedNote. Owned by PublicationCatalog.
    attributes:
      - { name: slug, type: text, required: true, unique: false, references: ScannedNote.slug }
      - { name: kind, type: enum, required: true, allowed: [post, site_page, retired_homepage] }
      - { name: note, type: ref, required: true, unique: true, references: ScannedNote.path }
    constraints:
      - "kind=site_page iff note.source=pages (BR2.1)"
      - "At most one entry has kind=retired_homepage (BR2.3)"
      - "A slug held by a site_page entry is held by no other entry (BR2.4)"
    relationships:
      - { to: ScannedNote, cardinality: "1 : 1", direction: "CatalogEntry classifies ScannedNote" }
      - { to: SitePageArtifact, cardinality: "1 : 0..1", direction: "a site_page entry produces one SitePageArtifact" }

  - name: CatalogViews
    description: The two read-only views the catalog hands to later passes.
    attributes:
      - { name: postsOnly, type: "list<CatalogEntry>", required: true, constraints: "kind=post only; feeds meta, posts, graph, search, previews, nav tree, backlinks, related posts" }
      - { name: linkTargets, type: "list<CatalogEntry>", required: true, constraints: "every entry; used only to decide how a wikilink renders (BR3.1–BR3.3)" }
    relationships:
      - { to: CatalogEntry, cardinality: "1 : 0..*", direction: "views select CatalogEntry" }

  - name: PublicationDiagnostic
    description: A coded, fail-closed finding. Every diagnostic stops the run before stamping or writing.
    attributes:
      - { name: code, type: enum, required: true, allowed: [PUB001, PUB003, PUB004, PUB005, PUB006, PUB008, PUB009] }
      - { name: path, type: path, required: true, constraints: "the offending note; for PUB008 the site page" }
      - { name: otherPath, type: "path|null", required: false, constraints: "PUB008 only: the clashing note" }
      - { name: detail, type: text, required: true }
    constraints:
      - "Reported sorted by (path, code, otherPath); printed one per line as `CODE path: detail`"
      - "PUB002 is never produced (retired); PUB007 is a write failure raised by the writer, not the catalog"

  - name: RunNotice
    description: A non-fatal, one-line message on stderr.
    attributes:
      - { name: kind, type: enum, required: true, allowed: [pages_not_given, pages_missing] }
      - { name: text, type: text, required: true, constraints: "pages_not_given: `notice: no site pages folder given; publishing no site pages`; pages_missing: `notice: site pages folder <path> not found; publishing no site pages`" }
    constraints:
      - "At most one RunNotice per run"

  - name: SitePageArtifact
    description: The generated output of one site page. Owned by OutputWriter.
    attributes:
      - { name: slug, type: text, required: true, unique: true }
      - { name: title, type: text, required: true }
      - { name: body, type: text, required: true, constraints: "body after the post transform pipeline; written to pages/<slug>.md" }
      - { name: metaFile, type: path, required: true, constraints: "pages/<slug>.json holding exactly {slug, title}" }
      - { name: assets, type: "list<path>", required: true, default: "[]", constraints: "images copied to assets/ under the same naming as post images" }
    relationships:
      - { to: CatalogEntry, cardinality: "0..1 : 1", direction: "written from one site_page CatalogEntry" }

  - name: ContentManifest
    description: Sorted list of every file the run wrote under OUTPUT.
    attributes:
      - { name: files, type: "list<path>", required: true, constraints: "sorted, unique, relative to OUTPUT; includes pages/*; never homepage/*; excludes manifest.json itself" }

  - name: HomepageOpening
    description: The site-built top of `/`. Built at site build time; no generated-content input.
    attributes:
      - { name: heading, type: text, required: true, constraints: "the only h1 on the page; equals SITE_NAME \"Passion Project\"" }
      - { name: ownerName, type: text, required: true, references: "Profile Domain homepage selection: name" }
      - { name: shortIntro, type: text, required: true, references: "Profile Domain homepage selection: shortIntro" }
      - { name: actions, type: "list<HomepageAction>", required: true, constraints: "exactly two, in order Résumé, Portfolio" }
    constraints:
      - "The profile headline is never rendered on the homepage (FR3.2)"

  - name: HomepageAction
    description: A plain capsule link in the homepage opening.
    attributes:
      - { name: label, type: enum, required: true, allowed: ["Résumé", "Portfolio"] }
      - { name: href, type: enum, required: true, allowed: ["/resume", "/portfolio"] }
    constraints:
      - "label Résumé ↔ href /resume; label Portfolio ↔ href /portfolio"
      - "Equal visual weight; target at least 44 × 44 px; works without JavaScript"
```

## Summary

| Entity | Owner | What it is |
|---|---|---|
| SourceFolder | PreprocessorCli | The posts folder (required) and the site-pages folder (optional); never overlapping |
| ScannedNote | VaultScanner | One note, tagged with the folder it came from |
| CatalogEntry | PublicationCatalog | Post, site page or retired homepage note; folder decides first |
| CatalogViews | PublicationCatalog | Posts-only view for every list and index; all-entries view only for link rendering |
| PublicationDiagnostic | PublicationCatalog | Coded stop: PUB001, PUB003–PUB006, new PUB008 (clash) and PUB009 (site-page embed) |
| RunNotice | PreprocessorCli | The single "no site pages" notice |
| SitePageArtifact | OutputWriter | `pages/<slug>.md` + `pages/<slug>.json`, plus copied images |
| ContentManifest | OutputWriter | Sorted list of written files; `pages/*`, no `homepage/*` |
| HomepageOpening, HomepageAction | HomePage (site) | "Passion Project" h1, owner name and short introduction, Résumé and Portfolio capsules |
