# Security Design — U3 `u3-writing-moves`

Upstream (frozen): `construction/u3-writing-moves/nfr-requirements/security-requirements.md` (NFR5.22, NFR5.23, NFR5.24, NFR5.25, NFR2.4, NFR3.4, NFR1.15, NFR6.15, NFR6.16), `performance-requirements.md` (NFR4.9, NFR4.10, NFR6.12, NFR6.13, NFR6.14), `tech-stack-decisions.md`; `construction/u3-writing-moves/functional-design/functional-spec.md`, `rules.md` (BR1.1–BR4.4, BR3.6); `inception/contract-design/contract-summary.md` (C4, C5).

Unit kind: `ui`. The unit introduces the site's only request-time decision: a lookup in a build-written table that decides whether a request is answered with a 301 or served as a file. The table is public and attacker-readable, and the server trusts it enough to put its contents into a response header. Everything below is about keeping that trust narrow.

**The upstream text is aligned.** The dotted-key behaviour is now settled in the stages that own it: functional design carries BR3.6 (a path that resolves to a directory is served by its `index.html`), and NFR5.25, NFR6.16 and the tech-stack row "Where the table's rules come from" say that every built tag page gets a rule, that the writer checks each rule's target at build time, and that the server answers 301 on a match without resolving the target again. This design follows that text; it carries no amendment of its own.

## 1. Threat model

| Threat | Boundary that stops it | Design section |
|---|---|---|
| Open redirect: a visitor-supplied path or host ends up in a `Location` header | only the table's `to` reaches the header; the path and the host never do | §3 |
| Header injection through the query string | on a match, the raw query is inspected before assembly; percent-encoded control bytes are answered 400 | §4 |
| A crash in the request handler takes the blog down | the handler catches its own failures and answers 400 or 404; nothing throws out of it | §4 |
| A hostile or broken table puts a foreign origin or a malformed value into a response | the table is accepted only in the grammar §5.1 states; anything else means no redirects at all | §5 |
| A permanent redirect points at an address the server cannot serve | every built tag page is servable (BR3.6), and the writer fails the build when a rule's target page is missing from the build output | §6 |
| The publish copies the table before the pages it names | not closed by the server: the deploy ordering is inherited by Infrastructure Design | §6.1 |
| A third-party origin on a moved page | same-origin only; the graph data file stays at the site's own root | §7 |
| The moved pages only work with JavaScript | static markup; the graph's list panel is revealed by the graph stylesheet | §7 |
| An inaccessible marker, an invisible back link, a target under 44 × 44 px | the axe matrix and the focus/target assertions | §7 |

## 2. The server's request path, end to end

```text
request
  -> split the raw target into path and raw query            (§4)
  -> decode the path once, strip one trailing slash         (BR3.2)
  -> exact lookup in the table's "from" values              (BR3.2, §5)
       no match -> the normal file lookup, directory index   (BR3.4, BR3.6)
       match    -> raw-query check                          (§4)
                    encoded control byte -> 400              (NFR5.22)
                    otherwise -> assemble the Location value (§3)
                                 -> validate it              (§4)
                                 -> 301 with Location, or 400 (BR3.3, §4)
```

**The order is deliberate.** The raw-query check runs only on a matched request, because the query reaches a header only when a rule matched; a request that matches nothing is served exactly as today, whatever its query. So the server answers **301 on every match whose query passes the raw-query check, and 400 on a match whose query does not**. Contract C4's "on match: 301" describes the matched case for a well-formed request; the 400 is the refusal NFR5.22 adds for a query that could not be placed in a header safely, and it applies only when a rule matched. Nothing on this path reads a file for the target: a matched request does one map lookup and writes one header (NFR4.10).

Every branch returns an answer. No branch throws out of the handler, and no branch writes to the log except the two cases the design says it does: one error line when the table cannot be used (§5) and one line when a hostile query is refused (§4).

## 3. The `Location` value

The value has exactly two parts:

1. the matched rule's `to`, each segment percent-encoded exactly once (BR2.2, BR3.3);
2. the request's raw query, appended byte-for-byte and never decoded or re-encoded.

Nothing else reaches the header. The request path is used only as the lookup key. The `Host` header is read only to build the URL base the server parses the request target against (`site/scripts/local-server.mjs:144`); only the parsed pathname is used, so neither the host nor an authority in the request line can reach the `Location` value. A request target that carries an authority (`//host/path`) therefore contributes only its path to the lookup, and answers the table's own target or the 404 — never a foreign origin (NFR5.22). The target comes from a file the build wrote from the site's own data, so a visitor cannot choose it (BR2.1, BR3.1).

The match is exact: `/graph.json` does not match `/graph` and is served as a file (BR2.2, BR2.4). A tag that is not in the table has no rule and is answered with the normal 404 (BR3.2), which is what contract C5 promises for a tag that no longer exists.

## 4. The query string and the 400 answer

**Where the query comes from.** The request target is split once, on its first `?`: everything after it is the raw query, byte for byte. The query is never taken from the parsed `URL.search`, because the parser re-encodes it — `new URL('/tags?x=a b', 'http://h').search` is `?x=a%20b`, not the `?x=a b` that arrived — and the requirement is byte-for-byte. A target with no `?` has no query. The path keeps the semantics it has today: the parsed pathname, decoded once (`site/scripts/local-server.mjs:142-145`).

**The raw-query check, on a match, before assembly.** The raw query is searched for the percent-encoded form of any control byte — `%00` to `%1f` and `%7f`, hex digits in either case — with one pattern over the raw characters:

```text
HOSTILE_QUERY = /%(?:[01][0-9a-f]|7f)/i
```

A matched request whose query matches the pattern is answered 400 and never redirected. The check reads the raw characters and matches the encoded spelling; it never decodes the query, so a percent-encoded control byte is never turned into a control byte (NFR5.22).

**The post-assembly check.** The assembled value is checked once more against the character set Node's HTTP layer refuses in a header value: every byte below `0x20` except the tab (`0x09`), and `0x7F` — the set `invalidHeaderCharRegex = /[^\t\x20-\x7e\x80-\xff]/` matches. A value carrying one of those bytes is answered 400 and never written. Node's HTTP parser refuses raw control bytes in the request target in its default (non-lenient) mode, so this check is the second line, not the first; it stays because it does not depend on the parser's mode.

**The guarded write.** The 301 is written inside a guard: the handler catches anything the HTTP layer still refuses and answers 400 instead of letting the exception escape. `res.writeHead` throws `ERR_INVALID_CHAR` for a value the layer refuses, and an uncaught exception in a request handler exits the process, so the blog would stay down until launchd restarts it. The two checks above make the 400 the normal answer; the guard makes it the answer when they are wrong.

## 5. The table's acceptance and the writer's guarantees

### 5.1 The acceptance grammar

The table is accepted only when it parses as JSON, its version is 1, `rules` is a list, and **every** rule's `from` and `to` satisfies the grammar below. The same conditions hold for `from` and for `to`:

| # | Condition | Why |
|---|---|---|
| G1 | the path starts with exactly one `/` — it starts with `/`, and its second character is not `/` | `//evil.example` is not a path: a URL parser reads it as the host `evil.example`, so a path-shaped string can carry an authority |
| G2 | the path contains no backslash (`\`) | a backslash is a separator in some parsers, so `/\evil.example` can be read as an authority |
| G3 | the path contains no control byte (`0x00`–`0x1F`, `0x7F`) | a control byte cannot be placed in a header value, and it is the shape a header injection takes |
| G4 | the path contains no `?` and no `#` | a target carrying a query or a fragment is not the address the rule names |
| G5 | no segment of the path is exactly `.` or `..` | a dot segment can walk out of the address space the rule names |
| G6 | the path carries no scheme and no authority | implied by G1–G2, stated so an implementer does not have to derive it |
| G7 | the path does not end with `/` (a path of length 1, `/`, is refused too: no rule names the site root) | contract C4 and BR3.4 require paths without a trailing slash; the server strips one trailing slash from the request before the lookup, so a rule with one could never match |
| G8 | the path contains no percent-escape — no `%` followed by two hex digits | the table stores **decoded** paths; an escape means the path is not decoded, and it is the shape a percent-encoded authority takes (`/%2F%2Fevil.example` decodes to `//evil.example`) |

G1–G8 are the whole test: a validator written from this table and the rejection list in §8 describe the same set.

A non-ASCII character is **allowed**. The table stores the decoded path, and contract C4's own example is a decoded Korean tag path (`/tags/운영체제`); the header carries the once-encoded form. A dot inside a segment is allowed too (`/tags/node.js`); only a segment that is exactly `.` or `..` is refused.

A path that fails any of G1–G8 is not a decoded absolute path, so the **whole table is rejected**: the server serves files normally, answers no redirect and writes one error line to its log. A missing file, an unreadable file, invalid JSON, an unknown version, a wrong shape, or a rule whose path is not a decoded absolute path all have the same outcome (BR3.4, C4, NFR5.23, NFR5.24). The rejection is all-or-nothing, because a table that carries one hostile rule is a table the server cannot prove.

### 5.2 The writer's guarantees

The writer derives its rules from the built tag page directories and the two fixed rules, so no rule's `to` is another rule's `from`: the fixed rules point at `/writing/tags` and `/writing/graph`, the tag rules at `/writing/tags/<key>`, while every `from` is under `/tags` or `/graph`. No pair can loop, and the writer's own test asserts that no such pair exists (NFR5.23). The loop condition is a guarantee of the writer's output, not part of the server's acceptance set: the server accepts exactly the shape contract C4 states (BR3.4). The web root is written only by the build and the deploy, so a looping table would need a table the build did not write; even then a browser stops following after its own redirect limit, and no request reaches the file system on the way.

The writer's output is also checked before it is written (§6, Rule 2).

**Re-read.** The table is re-read when its presence or modification time changes, so a table that appears after the server started is picked up without a restart (BR3.5). The one manual restart is pinned by BR3.5: the new server code is restarted after U3 merges and before the first nightly deploy that ships the moved pages.

## 6. A redirect never points at a 404

Two rules make this true for every build the deploy ships.

**Rule 1 — every built tag page is servable (BR3.6).** The clean-URL rewrite is extended so that a path which resolves to a directory is served by that directory's `index.html`, whatever the path's shape. The containment check that guards every served file still applies to the resolved index, so no path can escape the web root. Today the rewrite appends `index.html` only to a path without a dot (`site/scripts/local-server.mjs:61-65`), and a path that resolves to a directory is answered 404 (`:152-153`), so a dotted tag key (`node.js`) produces a page directory the server cannot serve.

**Rule 2 — the writer fails the build when a target is missing.** Before it writes the table, the writer checks every rule's target against the build output it is about to ship: for a tag rule, `writing/tags/<key>/index.html` must exist; for the fixed rules, `writing/tags/index.html` and `writing/graph/index.html`. A missing target is not dropped — dropping it would bring back the exclusion the NFR review removed and break NFR4.9's count — it **fails the build** with one coded tooling error naming the rule and the missing file (`REDIRECT_TARGET_MISSING`), the same way the writer already fails the build for a rule without a `from` or `to` or a duplicate `from` (`functional-design/frontend-components.md` > Validation). A failed build writes no table, and the nightly deploy does not run.

Consequences:

- every tag page the build produced is servable, including a dotted key, and has exactly one rule, so BR3.1, W5, C4, C5 and NFR4.9's count formula hold unchanged;
- a table that reaches the web root names only pages that were in the same build output;
- the server needs no request-time check of the target, so the request path stays flat (NFR4.10).

### 6.1 The publish window — inherited by Infrastructure Design

The table and the pages it names do not reach the web root at the same instant. The nightly publish copies the build output with `rsync -a --delete` (`Justfile:30`, `Jenkinsfile:115`), and `_redirects.json` sorts before `writing/`, so the table can land first. The server re-reads the table when its modification time changes, so the new rules become live mid-copy. In that window a request for a **brand-new** tag's old address is answered 301 to a page that is not there yet, and the follow-up request is answered 404. Addresses whose pages already existed in the previous publish are unaffected.

The server does not close this window. A request-time check of every target was considered and rejected: it adds a file-system read to every matched request (NFR4.10) and makes the server answer something other than 301 on a well-formed match, which contract C4 does not allow (`tech-stack-decisions.md` > "Where the table's rules come from"). NFR5.25 names the residual and hands it on.

**What Infrastructure Design inherits.** The deploy must make the table land **after** the pages it names. One way that keeps a single place in charge of ordering is two copies in the same deploy step: the tree first with the table excluded (an excluded destination file is neither replaced nor deleted, so the old table keeps serving the old rules), then the table on its own. The choice of mechanism, and whether `Justfile` and `Jenkinsfile` both change, is Infrastructure Design's.

## 7. The pages themselves

| Control | Design | Evidence |
|---|---|---|
| No third-party origin (NFR2.4) | The moved pages load nothing from another origin. The graph data file stays at `/graph.json` on the site's own root and is fetched by the graph island, not linked (BR2.4). The table is served as `application/json; charset=utf-8` from the same root. | the browser checks' foreign-origin listeners (`site/tests/e2e/hig-pages.spec.ts:140-146`); the served content type of `_redirects.json` |
| Works without JavaScript (NFR3.4) | The pages are static Astro pages with no new island. The graph's list panel is revealed by the graph page's own stylesheet, and the no-JavaScript crossunit run is extended to the three moved routes to assert it, because the link sweep cannot observe it (BR4.3). | `just crossunit` |
| Accessibility bar (NFR1.15) | The axe matrix covers the three moved routes at four widths in light and dark plus the reduced-motion check; each page has one h1; the back link is a real link with a visible focus style and a 44 × 44 px target (BR4.1). | the HIG axe matrix |

### 7.1 Where the back link's styles live

The 44 × 44 px rule for the back link exists today in `site/src/styles/writing.css:67-81` (`.back-link`, `.back-link-chevron`), and `writing.css` is loaded by the homepage, `/writing` and `/writing/all` — but by none of the three moved pages: the tag pages load `grouped.css` (`site/src/pages/tags/index.astro:4`, `site/src/pages/tags/[tag].astro:5`) and the graph page loads `segmented.css`, `grouped.css` and `graph.css` (`site/src/pages/graph.astro:6-8`).

**Decision: the rules move into `grouped.css`,** the one stylesheet all four pages (the three moved pages and `/writing/all`, `site/src/pages/writing/all.astro:8`) load. The rule keeps its `--target` token (`site/src/styles/tokens.css:126`).

Consequences:

- **no hashed file changes anywhere.** `grouped.css` is inlined into every page that loads it, and no file under the hashed asset directory carries its rules — measured in the current `site/dist`: `.grouped-row`, `.tag-chip`, `.listing-header` and `.grouped-empty` occur in none of the `_astro/*.css` files, while the pages carry them inline (`index.html`, `tags/index.html`, `graph/index.html`, `posts/empty-hub/index.html`). The single `.grouped-list` occurrence in `_slug_.<hash>.css` is the rule `.post-after .grouped-list`, which belongs to `post.css`. The move therefore changes inline style blocks only: no new request, no new file, no renamed file (`performance-design.md` §3.2);
- the inline block grows by the rule: about 280 bytes minified. `grouped.css` is about 3632 bytes minified today, so it becomes about 3912 bytes, with roughly 184 bytes of headroom under the 4096-byte inline limit; the guard that keeps it there is in `performance-design.md` §3.2;
- `/writing/all` keeps the rule, because it loads `grouped.css` as well, and the rule leaves `writing.css` entirely, so there is one implementation;
- the `.back-link` class and the `back-link` test id are unchanged, so BR1.2's "the same markup, class and test id" holds.

This is the cross-unit edit the tech-stack decisions and the functional design declare: U3 owns the `/writing/all` back-link refactor and this stylesheet move.

## 8. Evidence

| Claim | Where it is proven |
|---|---|
| The table's shape, the lookup, the assembly, the 400 answers | Vitest over `site/scripts/redirect-table.mjs` — the pure functions and the table validation, with the `readFile`/`stat` seam. The table-validation cases are table-driven and cover, for both `from` and `to`, one case per grammar condition: a relative path (G1), a host (`//evil.example/x`, G1), a backslash (`/\evil.example/x`, G2), a NUL byte and a line-feed byte (G3), a query (`/tags?x=1`) and a fragment (`/tags#x`) (G4), a dot segment (`/tags/../evil`, G5), a scheme (`https://elsewhere.example/x`, G1/G6), a trailing slash (`/tags/`, G7) and a percent-encoded host (`/%2F%2Fevil.example`, G8) — each a whole-table rejection with no redirect and no failed request. Accepted cases: `/tags/운영체제` and `/tags/node.js`. The raw-query cases cover `%0d`, `%0A`, `%00`, `%1f` and `%7F` (refused) and `%20`, `%2F` and a Korean percent-encoded query (appended byte-for-byte) |
| The writer fails the build on a missing target | Vitest over the writer against an isolated build output from which one tag page's `index.html` has been removed: the writer throws `REDIRECT_TARGET_MISSING` naming the rule, and no table is written. A complete output gives one rule per tag page plus the two fixed rules (NFR4.9) |
| The redirect answers at HTTP level | the HIG browser suite against the production server it already runs (`site/dist` on 127.0.0.1:4329): status, `Location` value and kept query for `/tags`, `/tags/`, `/graph`, `/graph/`, `/tags/<tag>`, `/tags/<tag>/`; `/graph.json` served as a file; an unknown tag answered 404; `/tags?x=%0d%0a` answered 400 with the server still serving the next request; `//evil.example` and a percent-encoded host answered the table's target or the 404, never a foreign origin (NFR5.22, NFR6.16) |
| A dotted tag key is redirected and served (BR3.6) | a server Vitest check that starts `site/scripts/local-server.mjs` as a child process against a temporary web root holding a synthetic `writing/tags/node.js/index.html` and a table with the rule `/tags/node.js` → `/writing/tags/node.js`. **The port:** the check obtains a free port by listening on port 0 with `node:net` on `127.0.0.1`, reading the assigned port and closing that listener, then starts the server with `PORT=<that port>` and `HOST=127.0.0.1` and the temporary root as `argv[2]`; it never uses 8080 (the live blog, `dev.rvnnt.blog`) or 4329 (the HIG instance). It waits for the server's `serving … at http://127.0.0.1:<port>` line before the first request, asserts 301 with `Location: /writing/tags/node.js` and then 200 for the target, and kills the child and removes the temporary root in its teardown, also on failure (NFR6.16) |
| No old address in the built site | the crossunit link sweep (BR2.4) |
| The old-address expectations updated, not deleted | the repository-wide grep for the `/tags` and `/graph` address text across `site/`, `preprocessor/`, `Justfile` and `Jenkinsfile`, with each hit either updated or confirmed as a data path (`/graph.json`) or as correct after the move (the property-test arbitraries and `resolveRouteResourcePolicy('/tags')`, which stays a legacy route) (NFR6.15) |
| The whole suite stays green | the recorded Construction Verification Command |

## 9. Upstream review points, and where each is answered

These are the points the NFR Requirements stage's reviews raised that bear on design. The four marked "carried" were raised as Minor findings in that stage's final READY review and are decided here.

| Point (upstream NFR Requirements review) | Severity there | Answered by |
|---|---|---|
| NFR4.9's rule count versus a dotted-key exclusion | Major (fixed upstream) | §6 — every built tag page is servable (BR3.6) and gets one rule; the writer fails the build rather than dropping a rule |
| NFR5.22's rule and its own acceptance case | Minor (fixed upstream) | §4 — the raw-query pattern refuses `%00`–`%1f` and `%7f` before assembly, without decoding |
| The back link's 44 × 44 px rule could not reach the moved pages | Minor (fixed upstream) | §7.1 — the rules move into `grouped.css` |
| The hashed-directory search would hit `.post-after .grouped-list` from `post.css` | Minor (carried) | `performance-design.md` §3.2 — the search names only selectors that `grouped.css` alone defines: `.grouped-row`, `.tag-chip`, `.listing-header`, `.grouped-empty`, `.back-link`, `.back-link-chevron` |
| "301 on every match" against NFR5.22's 400 | Minor (carried) | §2 — the raw-query check runs on a match before assembly; the server answers 301 on every match whose query passes it and 400 otherwise, and the rejected request-time target check rests on NFR4.10 as well as C4 |
| What happens when the writer's target check fails | Minor (carried) | §6 Rule 2 — the build fails with `REDIRECT_TARGET_MISSING`; the rule is never dropped |
| The dotted-key server check names no port | Minor (carried) | §8 — a free port from a port-0 listener on 127.0.0.1, never 8080 or 4329, with teardown on success and failure |
