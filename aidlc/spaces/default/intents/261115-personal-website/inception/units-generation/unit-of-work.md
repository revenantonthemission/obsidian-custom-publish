# Units of Work — Passion Project personal website, first release

Upstream: `inception/domain-design/components.md`, `decisions.md`; `inception/requirements-analysis/requirements.md`; `inception/user-stories/stories.md`; answers in `units-generation-questions.md` (Q1–Q2).

Every unit merges to `develop` on its own branch and ships with the nightly deploy; units with no dependency between them may be built in parallel (Q2). U1 is the thin end-to-end slice (team Walking Skeleton): on its own it runs through preprocess, site build and the existing test suites.

| Unit ID | Directory | Name | Kind | Complexity |
|---------|-----------|------|------|------------|
| U1 | `u1-publish-boundary` | Publishing boundary and site-built homepage opening | service | L |
| U2 | `u2-writing-section` | Writing section and weekly list | ui | M |
| U3 | `u3-writing-moves` | Tags and Graph under Writing, redirects | ui | M |
| U4 | `u4-navigation` | Writing-only navigation | ui | S |

## U1 — `u1-publish-boundary`

**Description:** The publishing step reads `Areas/Notes` and `Areas/Pages`, classifies every note, writes site pages, stops requiring a homepage, and the site's homepage switches to a site-built opening.

**Responsibilities (components):**
- PreprocessorCli: separate site-pages input.
- DateStamper: stamp posts only.
- VaultScanner: one scan over both folders, source folder recorded, missing folder → notice.
- PublicationCatalog: classify Post / SitePage / RetiredHomepage (folder first: everything in the pages folder is a SitePage; `visibility` is checked only for posts; more than one retired homepage note stays an error); page/post slug clash error; embed errors kept.
- LinkResolver: links (and heading links) to the retired note go to `/`; links to site pages render as plain text, add nothing to backlinks or graph.
- OutputWriter: site-pages namespace; no homepage artifact.
- ContentData: drop the homepage-artifact reader; expose ordinary posts and hubs separately.
- HomePage (opening only): Large Title "Passion Project", name and short introduction from the Profile Domain, plain Résumé and Portfolio capsules. The vault-note cards are removed.
- NightlyPipeline: Jenkinsfile Preprocess and `just preprocess` / `just deploy` pass both folders; Verify and fixture materializers stop expecting a homepage artifact; fixture vault gains `Pages/` and keeps a retired homepage note.

**Deployment model:** embedded in the existing preprocessor binary and site build; ships with the nightly run.

**Constraints:** The owner rewords the project rule on `Areas/Notes` to name `Areas/Pages` before this unit is merged (practices follow-up F4). Rust changes pass `cargo fmt --check`. Korean truncation by `char_indices()`.

**End-to-end check:** `just preprocess` against the fixture vault, the site build, `cargo test --release`, `npm run test:unit`, `npm run test:pbt` and the HIG suite all pass; the homepage shows the new opening.

## U2 — `u2-writing-section`

**Description:** The Writing landing page, the full by-year list, and the homepage's weekly list.

**Responsibilities (components):**
- WritingLists: KST week window, 5 recent dated posts (ties by title), by-year groups with "날짜 없음" last, topics with counts; ordinary posts only.
- WritingPages: `/writing` (Tags/Graph capsules to the current `/tags` and `/graph`, until U3 moves them), `/writing/all` with sticky year headers.
- HomePage: "이번 주 글" section with empty state and "모든 글 보기".
- New `writing.css`.

**Deployment model:** site build.

**Constraints:** Playwright HIG and axe checks for `/`, `/writing`, `/writing/all` written first.

## U3 — `u3-writing-moves`

**Description:** Tags and Graph move under `/writing/`; every internal tag link follows; old addresses redirect.

**Responsibilities (components):**
- DiscoveryPages: `/writing/tags`, `/writing/tags/<tag>`, `/writing/graph` with a "‹ Writing" back link; old page files removed.
- Tag links in `PostLayout.astro`, `HubLayout.astro` and the Writing capsules point to `/writing/...` through one shared tag-URL helper.
- LegacyRedirects: build writes a sorted redirect table into the output.
- StaticServer: reads the table from the web root; decode once, exact match with optional trailing slash, 301 with percent-encoded target and original query; `/graph.json` untouched; missing table → no redirects.

**Deployment model:** site build plus a one-time manual restart of `dev.rvnnt.blog` when this unit first ships (ADR-002).

**Constraints:** `just crossunit` link sweep finds no `/tags` or `/graph` links. HIG checks for the moved pages, including the Writing current-section marker on them once U4 lands.

## U4 — `u4-navigation`

**Description:** The top bar and navigation sheet hold only "Writing", with current-page and current-section markers.

**Responsibilities (components):**
- SiteChrome: navigation model with one item; marker rule by path (`/writing` → `page`; any `/writing/...` → `true`; else none); header and sheet render it; profile local navigation unchanged.

**Deployment model:** site build.

**Constraints:** Touches files under the manual accessibility review (`navigation.ts`, `Header.astro`, `MobileNav.tsx`); the review is redone once at the end. The property test that hard-codes the Tags menu item is updated. The marker rule is a pure function tested on paths, so it does not need U3's pages to exist.
