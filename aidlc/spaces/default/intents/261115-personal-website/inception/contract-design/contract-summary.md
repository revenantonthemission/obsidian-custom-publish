# Contract Summary — Passion Project personal website, first release

Upstream: `inception/units-generation/unit-of-work.md`, `unit-of-work-dependency.md`; `inception/domain-design/components.md`, `decisions.md`; `inception/requirements-analysis/requirements.md`; answers in `contract-design-questions.md` (Q1–Q2).

All units live in one repository and ship in one build. Every contract below is a file, a command line or a route; the producer and its consumers change in the same merge.

## Contracts

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---------------|----------|-----------|-------|
| C1 | U1 `u1-publish-boundary` (PreprocessorCli) | Nightly pipeline (Jenkinsfile, Justfile) | Command line | U1 |
| C2 | U1 `u1-publish-boundary` (OutputWriter) | U2 `u2-writing-section`, U3 `u3-writing-moves` (ContentData) | Shared files in `content/` | U1 |
| C3 | U2 `u2-writing-section` (WritingPages) | U3 `u3-writing-moves`, U4 `u4-navigation` | Site routes | U2 |
| C4 | U3 `u3-writing-moves` (LegacyRedirects) | U3 StaticServer at runtime | Shared file `/_redirects.json` | U3 |
| C5 | U1–U4 (site build + StaticServer) | External: public web (visitors, search engines, bookmarks) | HTTP routes | U3 for redirects; each unit for its routes |

## C1 — Publishing step command line

```yaml
command: obsidian-press <NOTES> <OUTPUT> [--pages <PAGES>] [--stamp-published]
arguments:
  NOTES: path to the posts folder (production: <vault>/Areas/Notes)
  OUTPUT: path to the generated content folder (./content)
options:
  --pages: path to the site-pages folder (production: <vault>/Areas/Pages); never stamped
  --stamp-published: stamp missing published dates into NOTES only; never PAGES
reads: only NOTES and PAGES (attachment lookup stops at the note's own folder root)
order: >-
  folder guard → pages notice → scan both folders → every catalog check →
  stamp NOTES (with --stamp-published) → rescan only if a file was stamped →
  write → diagram check → summary. Nothing is stamped or written before every
  check passed.
exit:
  0: success
  1: any coded catalog error (PUB001, PUB003–PUB006, PUB008, PUB009; nothing stamped or
     written), PUB007 (partial output), a diagram failure (full output), or an uncoded
     read error such as a missing NOTES
  2: usage error (argument parse error, overlapping folders, a path that is not a
     folder, an unresolvable '..'); nothing read, stamped or written
usage-errors (stderr, resolved paths; overlap = equal or one inside the other, compared
  by path component after lowercasing):
  - "error: --pages <PAGES> overlaps posts folder <NOTES>"
  - "error: output folder <OUTPUT> overlaps posts folder <NOTES>"
  - "error: output folder <OUTPUT> overlaps site pages folder <PAGES>"
  - "error: site pages folder <PAGES> is not a folder"
  - "error: posts folder <NOTES> is not a folder"
  - "error: cannot resolve <path>: '..' after a missing folder"
notices (stderr, at most one per run; exit 0, zero site pages):
  --pages omitted: "notice: no site pages folder given; publishing no site pages"
  folder missing: "notice: site pages folder <path> not found; publishing no site pages"
  no .md left after the skip rules (after the walk):
    "notice: site pages folder <path> is empty; publishing no site pages"
warnings (stderr):
  - "warning: skipped symbolic link <path>": once per link per run, in walk order; links
    are never read, published or stamped in either folder
  - "warning: slug collision ..." for two posts-folder notes sharing a slug (unchanged)
  - "warning: attachment not found: <name>" (posts) or "warning: attachment not found: <name> (site page <page path>)"; a post embedded in a site page keeps no Markdown images there (unsupported: the page lookup stays in PAGES), exit 0
errors (stderr "CODE path: detail", sorted by (path, code, other path)):
  PUB001: unknown visibility value in a posts-folder note (pages-folder notes skip the check)
  PUB003: more than one note marked visibility: homepage
  PUB004–PUB006: embed of the retired homepage note (whole, heading, block) from a post or site page
  PUB007: write failure
  PUB008: a site page shares its slug with a post, another site page or the retired homepage
          note; "PUB008 <page path>: site page slug \"<slug>\" clashes with <post|site page|retired homepage note> <other path>"
          or a post shares its slug with the retired homepage note;
          "PUB008 <post path>: post slug \"<slug>\" clashes with retired homepage note <other path>"
          (two posts sharing a slug stay a warning)
  PUB009: a post or site page embeds a site page;
          "PUB009 <path>: <whole|heading|block> transclusion of site page: <embed>"
removed:
  PUB002: no longer raised (a homepage is optional)
  stdout "Homepage source: …" and "Done."
stdout-summary: >-
  last line on exit 0: "published <N> posts, <M> site pages, <K> assets"
  (N = posts/*.md, M = pages/*.md, K = images copied to assets/ and assets/pages/,
  as listed in the manifest)
callers:
  Jenkinsfile Preprocess: obsidian-press --stamp-published "$VAULT_PATH" ./content --pages "$PAGES_PATH"
    (PAGES_PATH = OBSIDIAN_PAGES_PATH or <vault>/Areas/Pages)
  Justfile preprocess: obsidian-press "$vault" ./content --pages "$pages" (fixture pair by default)
  Justfile deploy-preprocess: obsidian-press --stamp-published "$publish_vault" ./content --pages "$publish_pages"
  Jenkins Verify and the HIG runner (fixtures): obsidian-press ./fixtures/vault/Notes ./content --pages ./fixtures/vault/Pages
```

## C2 — Generated content (`content/`)

```yaml
shared-schema: content-v2
unchanged:
  posts/<slug>.md: post Markdown with embedded HTML
  meta/<slug>.json:
    slug: string
    title: string
    tags: string[]
    created: string|null
    published: "YYYY-MM-DD"|null
    updated: string|null
    backlinks: string[]
    forward_links: string[]
    is_hub: boolean          # consumers: hubs are topics, never list items (ADR-003)
    hub_parent: string|null
    description: string|null
    reading_time_min: number
    word_count: number
    related_posts: string[]
  graph.json, search-index.json, previews.json, nav-tree.json: shapes unchanged; posts only
  assets/*: post images and diagrams, URLs "/assets/<name>" (unchanged)
added:
  pages/<slug>.md: site page body after the post transform pipeline
  pages/<slug>.json:
    slug: string
    title: string
  assets/pages/*: site-page images and diagrams; page bodies reference "/assets/pages/<name>",
                  so a page image never shadows a post image of the same name
removed:
  homepage/index.md
  homepage/meta.json
rules:
  - site pages never appear in meta/, posts/, graph, search, previews, nav-tree, backlinks or related_posts
  - a link to the retired homepage note renders as an anchor to "/" and adds no graph edge or backlink
  - a link to a site page renders as plain text (no anchor) and adds no graph edge or backlink
  - a link to the retired homepage note has no fragment (its headings no longer exist on "/")
  - manifest.json lists pages/* and assets/pages/* and no homepage/*; sorted
  - a stale homepage/ from an older run is removed with the other managed namespaces
  - an image embed is reduced to its file name, so no copy lands outside OUTPUT
  - output is byte-identical for identical input
```

## C3 — Writing routes used by other units

```yaml
routes:
  /writing: Writing landing (U2); contains capsules with hrefs to Tags and Graph
            - U2 ships hrefs "/tags" and "/graph"
            - U3 changes them to "/writing/tags" and "/writing/graph"
  /writing/all: full by-year list (U2)
navigation-target:
  U4 PrimaryNav item "Writing" → href "/writing"
markers (U4, pure function of the normalised path):
  "/writing": aria-current="page"
  "/writing/<anything>": aria-current="true"
  otherwise: none
```

## C4 — Redirect table

```yaml
shared-schema: redirects-v1
location: <web root>/_redirects.json   # produced at build output dist/_redirects.json
content-type: application/json; charset=utf-8
shape:
  version: 1
  rules:                     # sorted by "from", unique
    - from: string           # decoded absolute path, no trailing slash, e.g. "/tags/운영체제"
      to: string             # decoded absolute path, e.g. "/writing/tags/운영체제"
generated-rules:
  - { from: "/tags",  to: "/writing/tags" }
  - { from: "/graph", to: "/writing/graph" }
  - { from: "/tags/<tag>", to: "/writing/tags/<tag>" }   # one per current tag
server-behaviour:
  - decode the request path once; strip one trailing slash (except "/")
  - exact match against "from"; no prefix matching ("/graph.json" never matches "/graph")
  - on match: 301, Location = percent-encoded "to" (each segment encoded once) + original query string
  - table missing, unreadable or invalid: no redirects, normal file serving, one error line in the server log
  - table re-read when its modification time changes
```

## C5 — Public routes (external)

```yaml
openapi: 3.0.3
info: { title: Passion Project public routes, version: "first-release" }
paths:
  /:            { get: { responses: { "200": { description: site-built homepage } } } }
  /writing:     { get: { responses: { "200": { description: Writing landing } } } }
  /writing/all: { get: { responses: { "200": { description: every ordinary post by year } } } }
  /writing/tags: { get: { responses: { "200": { description: tag index } } } }
  /writing/tags/{tag}:
    get:
      parameters: [{ name: tag, in: path, required: true, schema: { type: string } }]
      responses: { "200": { description: one tag }, "404": { description: unknown tag } }
  /writing/graph: { get: { responses: { "200": { description: graph } } } }
  /tags:        { get: { responses: { "301": { description: "Location /writing/tags" } } } }
  /tags/{tag}:
    get:
      parameters: [{ name: tag, in: path, required: true, schema: { type: string } }]
      responses: { "301": { description: "Location /writing/tags/{tag}, percent-encoded" }, "404": { description: tag no longer exists } }
  /graph:       { get: { responses: { "301": { description: "Location /writing/graph" } } } }
  /posts/{slug}, /hubs/{slug}, /resume, /portfolio, /rss.xml:
    get: { responses: { "200": { description: unchanged } } }
```

## Contract Ownership Rules

- Each contract's provider unit owns its spec; a change to a spec is made in the same merge as every consumer change.
- Additive changes (new fields, new files) are safe: consumers ignore unknown fields.
- Removing or renaming a field, file, route or error code needs the consumer updated in the same merge and a note in `CLAUDE.md`.
- The redirect table is the only contract read at runtime by already-deployed code (the server), so its shape changes only with a new `version` value, and the server ignores tables with an unknown version.

## Open Questions

| Contract | Question | Blocks |
|----------|----------|--------|
| C1 | The owner must reword the project rule on `Areas/Notes` to name `Areas/Pages` before U1 merges | U1 merge |
| C4 | When to restart `dev.rvnnt.blog` on the new server code relative to U3's first nightly deploy (units review R-03) | U3 release |
