# Frontend Components — U3 `u3-writing-moves`

Upstream: `inception/refined-mockups/mockups.md` (M4), `interaction-spec.md` ("Old-Address Redirect (server)"), `accessibility-checklist.md`; `functional-spec.md`, `rules.md`; `inception/domain-design/components.md` (DiscoveryPages, LegacyRedirects, StaticServer, WritingPages); `inception/contract-design/contract-summary.md` (C3, C4, C5).

Every page is server-rendered. U3 adds no island: the moved pages keep today's static markup and the graph island's data fetch. The only new runtime behaviour is the static server's redirect lookup, which runs before the file lookup.

## Hierarchy

```
/writing/tags                    /writing/tags/<tag>          /writing/graph
└─ BaseLayout                    └─ BaseLayout                └─ BaseLayout
   ├─ BackLink  "‹ Writing"        ├─ BackLink  "‹ Writing"     ├─ BackLink  "‹ Writing"
   └─ listing-header              └─ listing-header            └─ graph-header
      ├─ h1                       ├─ h1 (tag name)                ├─ h1
      ├─ chip list                └─ post list                    └─ segmented tabs
         └─ tag chips → module       └─ post previews           ├─ #graph-panel-graph
                                                                          └─ GraphView (existing island)
                                                                      └─ #graph-panel-list
                                                                         └─ GraphList (existing)

/writing (U2)
├─ capsule "Tags"  → module → /writing/tags
└─ capsule "Graph" → module → /writing/graph

StaticServer (site/scripts/local-server.mjs)
├─ normalise: decode once, strip one trailing slash
├─ redirect table (_redirects.json, re-read when it appears or changes)
├─ match exact → 301 + Location (target encoded once, query kept)
└─ no match → file lookup → file, directory index.html, or 404 page
```

Text fallback: the three moved pages are the existing pages with a new address and a "‹ Writing" back link above the Large Title; every tag and graph link comes from one address module; the static server turns the old addresses into 301s before it looks for files, and it serves a path that resolves to a directory by that directory's `index.html`.

## Components

| Component | File | Props | Markup and states | data-testid |
|---|---|---|---|---|
| Address module | `site/src/lib/tag-urls.mjs` (new, with a `.d.mts` type declaration) | — | the sanitized key of one tag; the decoded address (`tagPath`, `tagIndexPath`, `graphPath`, `legacyTagPath`) and the encoded address (`tagHref`), each segment encoded once; a dependency-free ES module so the TypeScript site code and the plain-Node build step can both import it | — |
| Back link | `site/src/components/writing/BackLink.astro` (new) | `href = '/writing'` | `<a href="/writing" class="back-link">` with the existing chevron icon and the text "Writing"; the same markup, class and test id as `/writing/all` uses today | `back-link` |
| Tag index page | `site/src/pages/writing/tags/index.astro` (moved) | — | `BaseLayout` + `BackLink` + `listing-header` + chip list; the chips call the address module (BR2.1) | `tag-index`, `tag-chip` |
| Tag page | `site/src/pages/writing/tags/[tag].astro` (moved) | — | `BaseLayout` + `BackLink` + `listing-header` + post list; the page's own tag links call the address module | `tag-page` |
| Graph page | `site/src/pages/writing/graph.astro` (moved) | — | `BaseLayout` + `BackLink` + the existing `graph-header` with its two tabs, the graph panel and the list panel; the island still fetches `/graph.json` | `graph-page` |
| Post tag chips | `site/src/layouts/PostLayout.astro` | — | the chips' `href` comes from the address module instead of a literal | `post-tag-chip` |
| Hub tag chips | `site/src/layouts/HubLayout.astro` | — | the chips' `href` comes from the address module instead of a literal | `hub-tag-chip` |
| Writing capsules | `site/src/pages/writing/index.astro` | — | the Tags capsule calls the module's tag index address, the Graph capsule its graph address; labels, icons and layout unchanged | `writing-capsule-tags`, `writing-capsule-graph` |
| Redirect-table writer | `site/scripts/build/legacy-redirects-integration.mjs` (new, with a `.d.mts` type declaration) | — | an Astro integration registered in the site's Astro config; its build-done hook writes `site/dist/_redirects.json` from the tag pages the build produced; no pipeline stage and no npm lifecycle hook | — |
| Redirect module | `site/scripts/redirect-table.mjs` (new, with a `.d.mts` type declaration) | — | `loadRedirectTable(tablePath, { readFile, stat })`, `matchRedirect(rules, decodedPath)` and `redirectLocation(target, query)`; the loader takes the table path plus injectable `readFile` and `stat` functions and the server passes its own defaults, so the read count is observable in a unit test; pure and importable without side effects, so the unit test can import it without binding the server's port | — |
| Server lookup | `site/scripts/local-server.mjs` | — | imports the redirect module, looks the decoded path up before the file lookup and answers 301; the clean-URL rewrite is extended so a path that resolves to a directory is served by that directory's `index.html` (BR3.6); the rest of the server is unchanged | — |

The moved pages are the existing files: their markup, styles and data calls stay as they are, and only the address, the back link and the tag-link source change. `/writing/all` switches to the shared `BackLink` component, so one implementation of the back link exists.

Both edits to U2's files are U3's, declared here as the named owner: the `/writing/all` page swaps its inline back-link markup for the shared component (markup-only, no behaviour change), and the `.back-link` rules move from `writing.css` into `grouped.css` (styles-only). The units are built serially in this workflow, U3 after U2, so each edit lands on the file U2 last wrote. Neither edit changes a route, its content or its owner, so contract C3's entry for `/writing/all` stays as it is.

## State and data flow

- The tag index and the tag pages read the same data as today (`getTagIndex()`, the post previews); the move changes no data call (BR1.3).
- The address module is the only place that knows a tag address; it takes the tag name, sanitizes it the same way the tag index is keyed and returns the decoded and the encoded address (BR2.1, BR2.2).
- The build-done hook takes the tag keys from the tag pages the build produced and writes the sorted table; two builds of the same vault produce the same bytes (BR3.1).
- The server holds no state between requests beyond the cached table, its presence and its modification time; a request never mutates the table (BR3.5).
- A failed table read clears the rules and logs one line; the server keeps serving files (BR3.4).
- The file lookup serves a path that resolves to a directory by that directory's `index.html`, so every page the build produced is reachable at its address, including a tag key containing a dot (BR3.6).

## Styles

- The moved pages keep their existing stylesheets; the back link's `.back-link` and `.back-link-chevron` rules live in `grouped.css`, the stylesheet the three moved pages already load, and move out of `writing.css`, which the `/writing` pages share — a cross-unit edit U3 owns and declares (BR1.2). The moved pages therefore gain no stylesheet request and no new file under the hashed asset directory. `grouped.css` stays under the build's 4096-byte inline limit with the rules added, so it is still inlined into the pages' `<style>` block rather than emitted as a hashed file.
- No new colour, no new motion and no new token: the module only changes addresses, and the back link is the existing visual pattern.
- The chip and capsule layouts do not change, so the 44 × 44 px target sizes and the focus styles stay as they are.
- The graph page keeps its own stylesheet, including the rule that shows the list panel without JavaScript; the no-JavaScript check asserts that panel is visible (BR4.3).

## Interaction flows

1. **Tag index:** open `/writing/tags` → chips with counts → follow a chip → the tag's page at `/writing/tags/<tag>`.
2. **Tag page:** open `/writing/tags/<tag>` → post list → follow a post → the post page; the browser's back link returns to the tag page.
3. **Back link:** follow "‹ Writing" → `/writing`.
4. **Graph:** open `/writing/graph` → the island fetches `/graph.json` → the graph renders; the two tabs and the list panel behave as today.
5. **Old address:** request `/tags/<tag>` → 301 → the browser follows to `/writing/tags/<tag>`; the URL in the address bar is the new one, and the query of the old request is kept.
6. **JavaScript disabled:** flows 1 to 4 behave the same, except the graph island's canvas; the list panel and every link stay reachable (BR4.3).

## Validation

There are no forms and no user input. The validation points are:

- the address module sanitizes the tag and encodes the segment exactly once, so a tag name with `/`, whitespace or non-ASCII characters yields one safe segment (BR2.2);
- the build-done hook's table shape is checked when it is written: a rule without a `from` or a `to`, or a duplicate `from`, fails the build rather than shipping a broken table (BR3.1);
- the server's table validation rejects an unknown version, a non-list `rules` value and a rule whose `from` or `to` is not a decoded absolute path without a trailing slash; on rejection the server serves files normally and logs one line (BR3.4).

## Integration points

| Point | Owner | U3 use |
|---|---|---|
| `/writing` route and the Writing page | U2 | the back link's target; the capsules' page |
| Shared content files in `content/` | U2 (C3) | the capsules' labels; unchanged |
| `_redirects.json` contract | U3 (C4) | the table's shape, its location at the site root and the lookup contract |
| HTTP route answers | U3 (C5) | the 301 status, the `Location` target and the kept query |
| The site's Astro config | existing | the new integration is registered there; the build command stays `npx astro build` |
| `just site-build` and the Jenkins Build Site step | existing | unchanged; the table is written by the build itself |
| `/writing/...` marker rule | U4 | the three moved pages inherit `aria-current="true"`; U3 does not touch the chrome |
| `getTagIndex()` and the tag key rule | existing | the tag list and the key derivation (unchanged) |
| `GraphView` island and `/graph.json` | existing | unchanged; the data file is not an old address |
| `HIG_ROUTES` and the old-address expectations in the HIG specs, including `hig-performance.spec.ts`'s Core Web Vitals and mobile-network route lists | existing HIG suite | the routes and the expectations move to the new addresses |
| `just crossunit` link sweep and the no-JavaScript smoke | existing | the link sweep proves no old address; the smoke is extended to the three moved routes |
| Manual 16-state accessibility review | owner | invalidated by the moved pages and the shared back link; redone once at release end |
