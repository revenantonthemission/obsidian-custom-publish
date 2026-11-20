# Performance Design — U3 `u3-writing-moves`

Upstream (frozen): `construction/u3-writing-moves/nfr-requirements/performance-requirements.md` (NFR4.9, NFR4.10, NFR6.12, NFR6.13, NFR6.14), `security-requirements.md` (NFR5.22–NFR5.25), `tech-stack-decisions.md`; `construction/u3-writing-moves/functional-design/functional-spec.md`, `rules.md` (BR1.1–BR4.4, BR3.6); `inception/contract-design/contract-summary.md` (C4, C5).

Unit kind: `ui`. The unit adds one build-time artefact (the redirect table) and one request-time lookup (the redirect match). It moves three pages without changing their content, their data or their media. The performance design has three parts: the cost the build pays, the cost each request pays, and the budget the moved pages keep.

## 1. Build-time design

### 1.1 The table writer

| Concern | Design | Evidence |
|---|---|---|
| Where the table is written | The Astro integration's `astro:build:done` hook, registered in the site's Astro config, writes `_redirects.json` into the hook's `dir` argument — the build's own output directory, resolved the way the profile integration already resolves its own (`site/scripts/profile/astro-profile-integration.mjs:50`, `:223`). The production build's output directory is `site/dist`, so the nightly rsync copies the table to the web root with the rest of the output. | NFR4.9, BR3.1 |
| What it reads | Only the `writing/tags/<key>/` directories the build just produced, plus the two fixed rules (`/tags` → `/writing/tags`, `/graph` → `/writing/graph`). One rule per tag page the build produced. | BR3.1, W5 |
| What it checks before writing | Every rule's target exists in the build output it is about to ship: `writing/tags/<key>/index.html` for a tag rule, `writing/tags/index.html` and `writing/graph/index.html` for the fixed rules. A missing target fails the build with `REDIRECT_TARGET_MISSING`; the rule is never dropped (`security-design.md` §6, Rule 2). | NFR5.25, NFR4.9 |
| What it writes | `{ "version": 1, "rules": [ { from, to } ] }`, sorted by `from`, unique, with decoded absolute paths and no trailing slash. Two builds of the same vault produce byte-identical output. | NFR4.9, C4 |
| What it costs | One directory listing of the built tag pages, one existence check per rule and one file write. The build output gains exactly one file (`_redirects.json`) and no asset. | NFR6.13 |
| How it is checked | Against an **isolated** build: the unit suite's build helper writes the site to its own `--outDir` (`site/tests/unit/support/astro-build.ts:47`), and the build-output check reads the table from that directory. The shared `site/dist` is never the subject of the check, because the repository's own build-output tests avoid it (`site/tests/unit/hig-built-html.test.ts:3-4`) and the Jenkins Verify stage runs the unit suite before the Build Site stage (`Jenkinsfile:66`, `Jenkinsfile:103`). | NFR4.9 |

The build's wall-clock budget stays the repository's: the isolated build helper fails a build that runs past 60 s (`site/tests/unit/support/astro-build.ts:43`). No percentage band on build time is claimed, because the repository records no build-time baseline.

### 1.2 The writer's output is derived from the build, not from a second reader

The rules come from the built page directories, so a rule cannot exist without its page and a page cannot exist without its rule. The writer needs no second read of `content/meta/*.json`, and there is no second place where the tag list can differ from the pages. With BR3.6 every built tag page is servable, including a dotted key such as `node.js`, so one rule per built tag page is correct and no key is excluded.

## 2. Request-time design

### 2.1 The per-request cost

| Step | Cost | Design |
|---|---|---|
| Decode the path once, strip one trailing slash | one `decodeURIComponent` and one string operation | BR3.2 |
| Check whether the table changed | one `stat` of the table file per request; the file is re-read only when its presence or modification time changed | NFR4.10, BR3.5 |
| Match the decoded path against the table | one `Map.get` on a decoded key | NFR4.10 |
| On a match: check the raw query | one regular-expression test over the raw query string | NFR5.22, `security-design.md` §4 |
| On a match: answer 301 with the assembled `Location` | one header write; no file is read for the target | BR3.3, NFR4.10 |
| No match | the normal file lookup, now with the directory-index branch (BR3.6) | BR3.2, BR3.4, BR3.6 |

The lookup is a map lookup on a string, so its cost does not grow with the number of tags beyond the hash-table constant factor; the table is read once per change. The `stat` per request replaces a file read per request and is the cheapest way to honour BR3.5's "re-read when it changes" without a timer. A matched request does no file work at all: the server does not resolve the target at request time, because the writer has already proved every target at build time (§1.1).

The directory-index branch adds one `stat` to a request whose path resolves to a directory — the case that is answered 404 today — and nothing to a request whose path resolves to a file.

The seam that makes this observable is the one the tech-stack decisions name: `loadRedirectTable(tablePath, { readFile, stat })`, with the server passing its own defaults. The unit test passes counting functions and asserts the read count, so "no file read per request" is measured rather than asserted.

### 2.2 Failure behaviour on the request path

A missing, unreadable or invalid table means the server serves files normally, answers no redirect and writes one error line (BR3.4). The request path never throws out of the handler: a value that cannot be placed in a header is answered 400, not thrown (`security-design.md` §4), because an uncaught exception in a request handler exits the process and the blog stays down until launchd restarts it.

The one window in which a 301 can point at a missing page — the publish copying the table before a brand-new tag's page — is not handled on the request path; it is handed to Infrastructure Design as a deploy-ordering requirement (`security-design.md` §6.1).

## 3. Page-load budgets for the moved pages

### 3.1 Core Web Vitals

The budgets are the ones the repository already enforces in `site/tests/e2e/hig-performance.spec.ts:38-40`: LCP ≤ 2500 ms, CLS ≤ 0.1, TBT ≤ 200 ms, measured on the loopback build with the same throttling profile. The routes the specification measures stay the routes it measures, with `/writing/graph` replacing `/graph` in `CWV_ROUTES` and `MOBILE_NETWORK_ROUTES` (`site/tests/e2e/hig-performance.spec.ts:12-28`).

The two tag routes stay out of those lists, as NFR6.12 states: they ship the shared search (`client:idle`) and theme-toggle (`client:load`) islands like every measured route and add no media of their own, and U3 changes their address and back link only, so their load profile is the one the measured routes already prove.

### 3.2 Requests, assets and bytes

| Claim | Design | Where it is measured |
|---|---|---|
| No new request per moved page | The back link is an anchor; the moved pages keep the same stylesheets, the same islands and the same data as today. The only CSS change is the back-link rule, which moves into `grouped.css`, a stylesheet the moved pages already load and which is inlined, so the request set per route is unchanged. | the per-route request collector (§3.3) |
| No hashed file is added, renamed or changed — on any route | `grouped.css` is inlined into every page that loads it, and no file under `_astro/` carries its rules (measured in the current `site/dist`: `.grouped-row`, `.tag-chip`, `.listing-header` and `.grouped-empty` occur in no `_astro/*.css` file, while `index.html`, `tags/index.html`, `graph/index.html` and `posts/empty-hub/index.html` carry them inline; the one `.grouped-list` in `_slug_.<hash>.css` is `.post-after .grouped-list` from `post.css`). The rule move therefore changes inline style blocks only. | a search of every file under the build output's `_astro/` for the selectors `grouped.css` alone defines — `.grouped-row`, `.tag-chip`, `.listing-header`, `.grouped-empty`, `.back-link`, `.back-link-chevron` — which must find none; `.grouped-list` is deliberately not searched, because `post.css` uses it too. Plus the `_astro/` file count, unchanged |
| The moved pages' CSS grows by the rule | about 280 bytes minified (327 bytes of source), inline | the minified size of `grouped.css` in the built pages' inline block |
| One extra anchor per moved page | The markup change is the back-link anchor and its chevron span. | the DOM check for the back link |

**The inline budget.** Astro 7.4.1 inlines a stylesheet when `build.inlineStylesheets` is `'auto'` (the default; `site/astro.config.mjs` does not set it) and the stylesheet's **minified** size is strictly below Vite's `build.assetsInlineLimit`, 4096 bytes by default (`site/node_modules/astro/dist/core/build/plugins/plugin-css.js`). The decision is made in `plugin-css.js`'s inline-stylesheets step from Vite's `build.assetsInlineLimit` through `shouldInlineAsset` (`site/node_modules/astro/dist/core/build/plugins/util.js:14-24`); there is no `experimental.inlineStylesheetsMaxSize` setting in this version, and the site's config sets neither option. The limit applies **per emitted stylesheet**, not per page or per `<style>` element: in the built HTML the graph page carries one 4948-byte `<style>` element that is `segmented.css` (1316 bytes) followed by `grouped.css` (3632 bytes), each under the limit on its own, and `/writing/all` one 6302-byte element that is `grouped.css` plus `writing.css`; `graph.css` (4459 bytes minified) is over the limit and is served as `graph.<hash>.css`. The per-page element sizes are therefore not what the limit is checked against; the per-stylesheet size is.

The budget this unit spends: `grouped.css` is about 3632 bytes minified today; the back-link rules add about 280 bytes, so it becomes about 3912 bytes, with roughly 184 bytes of headroom.

**The guard.** A unit check over the isolated build reads the inline `<style>` element of the built tag index — the one page whose element is `grouped.css` alone (3632 bytes today, beginning with grouped.css's first rule) — and fails when it reaches 4096 bytes, or when `grouped.css` appears as a file under `_astro/`, so later growth cannot silently turn the inline block into a hashed request on every page that loads `grouped.css`. If a later change would push it past the limit, the back-link rules move out first, into a stylesheet of their own, rather than `grouped.css` becoming a file for every page.

### 3.3 The per-route request collector

The browser checks' existing request listeners collect foreign origins only (`site/tests/e2e/hig-pages.spec.ts:140-146`, `site/tests/e2e/hig-writing.spec.ts:74-84`). The moved routes' check adds a collector that records every request the page makes and compares the **set of logical resources** and the **request count** with a fixed expectation written in the test.

**A logical resource, not a hashed name.** The pages request content-hashed assets — `/_astro/Search.<hash>.js`, `/_astro/client.<hash>.js`, `/_astro/BaseLayout.<hash>.css`, `/_astro/PretendardVariable.subset.<n>.<hash>.woff2` — whose hashes change whenever shared code changes. Each collected request is mapped onto one logical resource:

| Logical resource | How a collected request is matched to it |
|---|---|
| the document | the route's own path |
| a stylesheet | `/_astro/<name>.<hash>.css` — one resource per distinct `<name>` |
| an island or its runtime | `/_astro/<name>.<hash>.js` — one resource per distinct `<name>` |
| a font file | `/_astro/PretendardVariable.subset.<n>.<hash>.woff2` — one resource per distinct `<n>` |
| the graph data | `/graph.json` on the graph route |

The comparison uses the path of the request URL, never the origin. An added or dropped resource changes the set and the count and fails the check; a rebuild that only changes hashes does not. The "no hashed file renamed" claim is not proven here — the search in §3.2 proves it, because the collector deliberately ignores hashes.

Today's baseline, measured from the built site: the tag index requests its document, one stylesheet (`BaseLayout`), the search island and its runtime (`Search`, `client`), and two font files; the graph page requests its document, two stylesheets (`graph`, `BaseLayout`), the graph island's bundles and the two font files. The moved routes are checked against the expectation of the routes they replace.

### 3.4 The no-JavaScript and accessibility budgets

The moved pages are static Astro pages with no new island (BR4.3). The no-JavaScript crossunit run is extended to the three moved routes and asserts that the graph's list panel is visible without JavaScript. The axe matrix covers the three moved routes at 320, 768, 1024 and 1440 px in light and dark plus the reduced-motion check (BR4.1).

## 4. Capacity and growth

The table grows with the number of tag pages, not with traffic: one rule per tag page. The vault's tag count is small and the file is read only when it changes. The per-request work is one decode, one `stat`, one map lookup and — on a match — one regular-expression test and one header write, independent of the tag count beyond the hash table's own factor.

## 5. What is explicitly not designed here

No caching tier, no CDN change, no connection pool, no async processing, no horizontal scaling: the unit serves a static site from one Node process on one machine, as it does today. The only runtime additions are a map lookup in front of the existing file lookup and the directory-index branch inside it.
