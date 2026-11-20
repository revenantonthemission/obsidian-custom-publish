# Business Rules — U1 `u1-publish-boundary`

Upstream: `inception/requirements-analysis/requirements.md` (FR1–FR3, NFR1–NFR7); `inception/contract-design/contract-summary.md` (C1, C2); `inception/domain-design/components.md`; answers in `functional-design-questions.md` (Q1–Q9). Entity names refer to `entities.md`.

The YAML block is the source of truth; the table after it is a summary.

```yaml
rules:
  # Group 1 — Inputs and the read boundary (PreprocessorCli, VaultScanner)
  - id: BR1.1
    statement: The publishing step reads only the posts folder and, when given, the site-pages folder.
    category: constraint
    applies_to: [PreprocessorCli, VaultScanner, OutputWriter]
    trigger: every run
    logic: IF a file is read for notes or images THEN its path lies inside NOTES or PAGES (after canonicalisation); nothing above or beside them is opened.
    violation: not reachable by design; a test that runs with a sentinel file beside NOTES proves it is never read
    source: FR1.1
  - id: BR1.2
    statement: The two folders never overlap.
    category: validation
    applies_to: [SourceFolder]
    trigger: after argument parsing, before any read or stamp
    logic: IF PAGES is given AND (canonical PAGES equals canonical NOTES OR either contains the other) THEN stop with a usage error naming both paths.
    violation: "exit 2; message `error: --pages <PAGES> overlaps posts folder <NOTES>`; nothing read, stamped or written"
    source: FR1.1
  - id: BR1.3
    statement: A missing or omitted site-pages folder yields zero site pages and one notice.
    category: policy
    applies_to: [SourceFolder, RunNotice]
    trigger: after BR1.2
    logic: IF --pages is not given THEN notice pages_not_given; ELSE IF PAGES does not exist THEN notice pages_missing; ELSE IF PAGES exists but is not a directory THEN usage error (exit 2) naming it; ELSE IF PAGES is empty THEN zero site pages and no notice.
    violation: none for missing or empty (run continues); exit 2 for a non-directory path
    source: FR1.5
  - id: BR1.4
    statement: The skip rules apply to both folders.
    category: constraint
    applies_to: [VaultScanner, DateStamper]
    trigger: scanning and stamping
    logic: IF an entry name starts with "." OR equals "Drafts" THEN it and everything under it is skipped, in either folder.
    violation: n/a
    source: FR1.7
  - id: BR1.5
    statement: Every scanned note records the folder it came from.
    category: constraint
    applies_to: [ScannedNote]
    trigger: scanning
    logic: IF a note was found under NOTES THEN source=notes; IF under PAGES THEN source=pages.
    violation: n/a
    source: FR1.2
  - id: BR1.6
    statement: The image lookup never leaves the root of the note's own source folder.
    category: constraint
    applies_to: [OutputWriter]
    trigger: an image embed in a post or site page
    logic: Search `attachment/<name>` from the note's folder upward, stopping after the source root itself; IF not found THEN keep today's warning and leave the image out of the manifest.
    violation: warning only (unchanged)
    source: FR1.1
  - id: BR1.7
    statement: Scan order is fixed.
    category: constraint
    applies_to: [ScannedNote]
    trigger: scanning
    logic: Sort notes by (slug, source with notes before pages, path).
    violation: n/a
    source: NFR4

  # Group 2 — Classification and boundary checks (PublicationCatalog)
  - id: BR2.1
    statement: Folder decides first; every pages-folder note is a site page.
    category: policy
    applies_to: [CatalogEntry]
    trigger: classification
    logic: IF source=pages THEN kind=site_page, and its visibility value is not checked.
    violation: n/a
    source: FR1.2
  - id: BR2.2
    statement: Posts-folder notes are classified by visibility.
    category: validation
    applies_to: [CatalogEntry]
    trigger: classification of a source=notes note
    logic: IF visibility is absent or "post" THEN kind=post; IF "homepage" THEN kind=retired_homepage; ELSE PUB001.
    violation: PUB001, run stops (exit 1)
    source: FR2.2
  - id: BR2.3
    statement: A homepage note is optional; more than one is an error.
    category: validation
    applies_to: [CatalogEntry]
    trigger: after classification
    logic: IF zero retired_homepage entries THEN continue (PUB002 is retired); IF more than one THEN PUB003.
    violation: PUB003, run stops (exit 1)
    source: FR2.1
  - id: BR2.4
    statement: No site page shares a slug with any other note.
    category: validation
    applies_to: [CatalogEntry]
    trigger: after classification
    logic: IF a site_page entry and any other entry (post, site_page or retired_homepage) have the same slug THEN PUB008 naming both files; IF two post entries share a slug THEN keep today's warning.
    violation: "PUB008, run stops (exit 1); `PUB008 <page path>: site page slug \"<slug>\" clashes with <kind> <other path>`"
    source: FR1.6
  - id: BR2.5
    statement: Published notes may not embed the retired homepage note.
    category: validation
    applies_to: [CatalogEntry]
    trigger: after classification
    logic: IF a post or site page body (outside code fences, frontmatter stripped) embeds the retired note whole, by heading or by block THEN PUB004, PUB005 or PUB006 respectively. The retired note's own body is not checked.
    violation: PUB004–PUB006, run stops (exit 1)
    source: FR2.3
  - id: BR2.6
    statement: No note may embed a site page.
    category: validation
    applies_to: [CatalogEntry]
    trigger: after classification
    logic: IF a post or site page body (outside code fences, frontmatter stripped) embeds a site page whole, by heading or by block THEN PUB009.
    violation: "PUB009, run stops (exit 1); `PUB009 <path>: <whole|heading|block> transclusion of site page: <target>`"
    source: FR1.2
  - id: BR2.7
    statement: Checks are batched and fail closed before anything changes.
    category: policy
    applies_to: [PublicationDiagnostic]
    trigger: end of classification
    logic: Collect every finding of BR2.2–BR2.6, sort by (path, code, otherPath), print each, and IF any exist THEN exit 1 without stamping or writing.
    violation: exit 1
    source: NFR5
  - id: BR2.8
    statement: Two views, used for different things.
    category: constraint
    applies_to: [CatalogViews]
    trigger: after a clean catalog
    logic: The posts-only view (kind=post) feeds meta, posts, graph, search, previews, nav tree, backlinks and related posts; the all-entries view is used only to decide how a link renders.
    violation: n/a
    source: FR1.2

  # Group 3 — Links (LinkResolver, transform)
  - id: BR3.1
    statement: Links to posts are unchanged.
    category: calculation
    applies_to: [LinkResolver]
    trigger: rendering a wikilink in a post or site page body
    logic: IF the target is a post THEN `/posts/<slug>` with the heading or block fragment and alias as today.
    violation: n/a
    source: FR1.3
  - id: BR3.2
    statement: Links to the retired homepage note go to the site homepage.
    category: calculation
    applies_to: [LinkResolver]
    trigger: rendering a wikilink
    logic: IF the target is the retired note THEN an anchor to `/` with no fragment (its headings no longer exist on `/`); the alias, if any, is the link text.
    violation: n/a
    source: FR2.2
  - id: BR3.3
    statement: Links to site pages render as plain text.
    category: calculation
    applies_to: [LinkResolver]
    trigger: rendering a wikilink
    logic: IF the target is a site page THEN render the alias, or else the target name, as text with no anchor.
    violation: n/a
    source: FR1.2
  - id: BR3.4
    statement: Only post-to-post links count.
    category: constraint
    applies_to: [LinkResolver]
    trigger: building backlinks and graph
    logic: Backlinks and graph edges are computed from post bodies to post targets only; links from or to a site page or the retired note add nothing.
    violation: n/a
    source: FR1.2

  # Group 4 — Date stamping (DateStamper)
  - id: BR4.1
    statement: Check, then stamp.
    category: policy
    applies_to: [PreprocessorCli, DateStamper]
    trigger: a run with --stamp-published
    logic: Run BR1.2–BR1.3, scan and the full catalog (BR2.x) first; IF clean THEN stamp the posts folder, rescan both folders, rebuild the catalog and continue; IF the second catalog has findings THEN stop (exit 1) without writing.
    violation: exit 1
    source: NFR5
  - id: BR4.2
    statement: Stamping touches the posts folder only.
    category: constraint
    applies_to: [DateStamper]
    trigger: stamping
    logic: Stamping walks NOTES with BR1.4 and never opens a file under PAGES for writing.
    violation: n/a
    source: FR1.4

  # Group 5 — Output (OutputWriter)
  - id: BR5.1
    statement: Managed namespaces.
    category: constraint
    applies_to: [OutputWriter]
    trigger: write pass, after a clean catalog
    logic: Clean `posts/`, `meta/`, `assets/`, `pages/`, the legacy `homepage/` (removed if a previous run left it) and the five JSON files; then write. Files outside these survive.
    violation: n/a
    source: FR2.4
  - id: BR5.2
    statement: Site-page artifact.
    category: calculation
    applies_to: [SitePageArtifact]
    trigger: write pass, once per site_page entry
    logic: Write `pages/<slug>.md` = body through the post transform pipeline (links by BR3.x, embeds of posts allowed), and `pages/<slug>.json` = {slug, title} with sorted keys.
    violation: write failure → PUB007 (unchanged behaviour)
    source: FR1.3
  - id: BR5.3
    statement: Site-page images are copied like post images.
    category: policy
    applies_to: [SitePageArtifact]
    trigger: an image embed in a site page
    logic: Look up the image by BR1.6 and copy it to `assets/` under the same naming as post images; list it in the manifest.
    violation: warning if not found (unchanged)
    source: FR1.3
  - id: BR5.4
    statement: Site pages and the retired note stay out of every post index.
    category: constraint
    applies_to: [OutputWriter]
    trigger: write pass
    logic: meta, posts, graph, search index, previews, nav tree, related posts and backlinks are built from the posts-only view (BR2.8); no homepage artifact is written.
    violation: n/a
    source: FR1.2
  - id: BR5.5
    statement: Sorted manifest.
    category: constraint
    applies_to: [ContentManifest]
    trigger: end of write pass
    logic: List every written file relative to OUTPUT, sorted and unique, including `pages/*`, never `homepage/*`.
    violation: n/a
    source: NFR4
  - id: BR5.6
    statement: Identical input gives identical output.
    category: constraint
    applies_to: [OutputWriter]
    trigger: every run
    logic: For the same NOTES and PAGES content, every file under `pages/` and the manifest are byte-identical across runs.
    violation: n/a
    source: NFR4
  - id: BR5.7
    statement: Write-failure behaviour is unchanged.
    category: policy
    applies_to: [OutputWriter]
    trigger: an I/O error while writing, or a diagram render failure in a post or site page
    logic: PUB007 stops the run in place (partial output possible); a diagram failure exits 1 after full output, as today.
    violation: exit 1
    source: NFR5

  # Group 6 — Site build and homepage (ContentData, HomePage)
  - id: BR6.1
    statement: The site reads no homepage artifact.
    category: constraint
    applies_to: [ContentData]
    trigger: site build
    logic: The homepage-artifact reader, the profile slot token and HP001–HP004 are removed; the build never looks for `content/homepage/`.
    violation: n/a
    source: FR2.4
  - id: BR6.2
    statement: One heading, one title.
    category: constraint
    applies_to: [HomepageOpening]
    trigger: rendering `/`
    logic: The page has exactly one h1, "Passion Project", and the document title "Passion Project".
    violation: build-time test failure
    source: FR3.1
  - id: BR6.3
    statement: Owner name and short introduction, never the headline.
    category: policy
    applies_to: [HomepageOpening]
    trigger: rendering `/`
    logic: Show name and shortIntro from the Profile Domain's homepage selection; do not render headline.
    violation: build-time test failure
    source: FR3.2
  - id: BR6.4
    statement: Two equal capsules to the profile pages.
    category: constraint
    applies_to: [HomepageAction]
    trigger: rendering `/`
    logic: Plain links "Résumé" → `/resume` and "Portfolio" → `/portfolio`, same style, each at least 44 × 44 px, working without JavaScript.
    violation: browser test failure
    source: FR3.3
  - id: BR6.5
    statement: Interim post list until U2.
    category: policy
    applies_to: [HomePage]
    trigger: rendering `/` before U2 merges
    logic: Under the opening, keep the "오늘 발행된 글" list, now built from post metadata and the existing build-date rule instead of the homepage note; U2 replaces it with "이번 주 글".
    violation: n/a
    source: FR3.4
  - id: BR6.6
    statement: The homepage meets the site's accessibility and privacy bar.
    category: constraint
    applies_to: [HomePage]
    trigger: every change to `/`
    logic: axe WCAG 2.2 AA at 320, 768, 1024 and 1440 px in light and dark, the reduced-motion check, no request to another origin, full content without JavaScript.
    violation: browser test failure
    source: NFR1

  # Group 7 — Pipeline and fixtures (NightlyPipeline)
  - id: BR7.1
    statement: Every caller passes both folders.
    category: policy
    applies_to: [NightlyPipeline]
    trigger: any preprocess invocation
    logic: "Jenkins Verify: `fixtures/vault/Notes --pages fixtures/vault/Pages`; Jenkins Preprocess: `$VAULT_PATH --pages $PAGES_PATH --stamp-published`, PAGES_PATH from OBSIDIAN_PAGES_PATH with the Areas/Pages default; Justfile `preprocess` uses `vault` (default ./fixtures/vault/Notes) and `pages` (default ./fixtures/vault/Pages); `deploy-preprocess` uses `publish_vault` and `publish_pages`; the HIG build script passes the fixture pair."
    violation: n/a
    source: FR1.1
  - id: BR7.2
    statement: No homepage artifact in verification.
    category: policy
    applies_to: [NightlyPipeline]
    trigger: Jenkins Verify, HIG and crossunit fixture preparation
    logic: The fixture materialiser stops writing `content/homepage/`; any other fixture content it writes is unchanged.
    violation: n/a
    source: FR2.4
  - id: BR7.3
    statement: The fixture vault mirrors production.
    category: constraint
    applies_to: [NightlyPipeline]
    trigger: test setup
    logic: "`fixtures/vault/Notes/` holds today's fixture notes (including the retired homepage note) and their `attachment/`; `fixtures/vault/Pages/` holds at least one site page with an image in its own `attachment/`, one `Drafts/` note and one dot-file. Clash, embed and overlap cases use temporary on-disk vaults, as the existing publication tests do."
    violation: n/a
    source: FR1.7
```

## Rules Summary

| ID | Rule | Kind | Stops the run? |
|---|---|---|---|
| BR1.1 | Read only NOTES and PAGES | constraint | — |
| BR1.2 | Folders must not overlap | validation | exit 2 |
| BR1.3 | Missing or omitted pages folder → zero pages + one notice | policy | no (exit 2 if not a directory) |
| BR1.4 | Dot-entries and `Drafts` skipped in both folders | constraint | — |
| BR1.5 | Each note records its source folder | constraint | — |
| BR1.6 | Image lookup bounded to the source root | constraint | warning |
| BR1.7 | Fixed scan order | constraint | — |
| BR2.1 | Pages folder ⇒ site page | policy | — |
| BR2.2 | Posts folder: visibility → post / retired / PUB001 | validation | PUB001 |
| BR2.3 | Zero homepage notes fine; more than one → PUB003 | validation | PUB003 |
| BR2.4 | Site-page slug clash → PUB008 | validation | PUB008 |
| BR2.5 | Embed of retired note → PUB004–006 | validation | PUB004–006 |
| BR2.6 | Embed of a site page → PUB009 | validation | PUB009 |
| BR2.7 | Batch, sort, fail closed before stamp/write | policy | exit 1 |
| BR2.8 | Posts-only view vs all-entries link view | constraint | — |
| BR3.1–BR3.4 | Post links unchanged; retired note → `/`; site page → text; only post-to-post counts | calculation/constraint | — |
| BR4.1–BR4.2 | Check, then stamp; stamp posts folder only | policy/constraint | exit 1 |
| BR5.1–BR5.7 | Namespaces, page artifact, page images, indexes, manifest, determinism, unchanged write failures | mixed | PUB007 |
| BR6.1–BR6.6 | No artifact reader; h1/title; name + intro; capsules; interim list; a11y | mixed | test failures |
| BR7.1–BR7.3 | Both folders everywhere; no homepage fixture; fixture layout | policy/constraint | — |
