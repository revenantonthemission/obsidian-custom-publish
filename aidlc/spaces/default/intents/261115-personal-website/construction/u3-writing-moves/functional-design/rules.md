# Business Rules — U3 `u3-writing-moves`

Upstream: `inception/units-generation/unit-of-work.md` (U3); `inception/requirements-analysis/requirements.md` (FR5.1–FR5.4, FR4.1, NFR1–NFR4, NFR6); `inception/user-stories/stories.md` (US4.1, US5.1, US5.2, US7.1); `inception/refined-mockups/mockups.md` (M4), `interaction-spec.md` ("Old-Address Redirect (server)"), `accessibility-checklist.md`; `inception/domain-design/components.md` (DiscoveryPages, LegacyRedirects, StaticServer, ContentData, WritingPages); `inception/contract-design/contract-summary.md` (C3, C4, C5).

U3 is a UI unit. It carries a rules file because the address move, the address rule and the server's redirect lookup are the unit's decision logic and are tested on their own. The YAML block is the source of truth.

```yaml
rules:
  - id: BR1.1
    statement: The three discovery pages are served only under /writing/....
    category: constraint
    applies_to: [DiscoveryPages]
    trigger: building the site
    logic: |
      The tag index is served at "/writing/tags", one page per tag at
      "/writing/tags/<tag>" and the graph at "/writing/graph". The build produces
      no page at "/tags", "/tags/<tag>" or "/graph": the old page files are gone,
      so those addresses exist only as redirects (BR3).
    violation: test failure (a file at an old address fails the build-output check)
    source: FR5.1, FR5.4, AC5.1.1, AC5.1.3

  - id: BR1.2
    statement: The moved pages keep today's content and add a back link to Writing.
    category: policy
    applies_to: [DiscoveryPages]
    trigger: rendering any of the three moved pages
    logic: |
      Each moved page keeps the content, layout and wording it has today (tag
      index chips with counts, one tag page per tag with its post list and its
      empty state, the graph page with its header, its two tabs and its list
      panel), and gains one plain "‹ Writing" back link above the Large Title,
      pointing to "/writing". The back link is the same markup, class and test id
      the "/writing/all" page already uses, so there is one implementation of it.
      The back link's rules (".back-link" and ".back-link-chevron") live in the
      stylesheet the three moved pages already load, "grouped.css"; they move
      out of "writing.css", which the "/writing" pages share, so the moved pages
      gain no stylesheet request and no new file under the hashed asset
      directory. That stylesheet move is a cross-unit edit U3 owns and declares.
    violation: n/a
    source: AC5.1.1; mockups.md M4

  - id: BR1.3
    statement: The moved pages read the same data as today.
    category: constraint
    applies_to: [DiscoveryPages]
    trigger: building the moved pages
    logic: |
      The tag index, the tag pages and the graph read the same site data modules
      as the old pages: the sanitized tag index with its posts, the post preview
      summaries and the graph data. The move changes addresses only; no tag,
      post, count, order or graph edge changes.
    violation: n/a
    source: AC5.1.1, NFR4

  - id: BR2.1
    statement: One shared address module owns every tag and graph address, old and new.
    category: policy
    applies_to: [DiscoveryPages, WritingPages, PostLayout, HubLayout, LegacyRedirects]
    trigger: building any link to, or rule for, a tag or graph address
    logic: |
      One module owns the addresses. It derives them from one tag key, the
      sanitized tag (the same key the tag index is keyed by today: "/" and
      whitespace runs become "-", the name is lower-cased):
      - the tag index address "/writing/tags";
      - a tag page address "/writing/tags/<key>";
      - the graph address "/writing/graph";
      - the old tag address "/tags/<key>", the old tag index "/tags" and the
        old graph "/graph".
      The tag index page, the tag chips on post pages, the tag chips on hub
      pages, the Writing capsules and the redirect-table writer all call that
      module; no call site writes a tag or graph address as a literal, and the
      table writer never mixes a key from one side with a key from the other.
    violation: test failure (a rendered link or a rule outside the module's addresses)
    source: FR5.3, AC5.1.2, AC5.2.2; U3 responsibility in unit-of-work.md

  - id: BR2.2
    statement: A tag address carries the sanitized key; the encoded form is used once.
    category: calculation
    applies_to: [DiscoveryPages, WritingPages, PostLayout, HubLayout, LegacyRedirects]
    trigger: building a tag address
    logic: |
      The module returns the decoded address ("/writing/tags/<key>") and the
      encoded address ("/writing/tags/<key>", each segment percent-encoded
      exactly once). The encoded form is what goes into markup and into a
      Location header; the decoded form is what the redirect table stores
      (BR3.1). A Korean tag therefore appears encoded in a link and in a
      Location header, and decoded in the table, and is never encoded twice.
    violation: test failure
    source: FR5.3, AC5.2.2, NFR4; contract C4; interaction-spec.md "Old-Address Redirect (server)"

  - id: BR2.3
    statement: The Writing capsules point at the new addresses.
    category: policy
    applies_to: [WritingPages]
    trigger: rendering "/writing"
    logic: |
      The Tags capsule links to "/writing/tags" and the Graph capsule links to
      "/writing/graph", through the shared module (BR2.1). The capsules, their
      labels and their layout do not change.
    violation: test failure
    source: FR5.3, AC4.1.5, AC5.1.2

  - id: BR2.4
    statement: The built site contains no link to an old address.
    category: constraint
    applies_to: [DiscoveryPages, WritingPages, PostLayout, HubLayout, SiteChrome]
    trigger: every build
    logic: |
      No rendered link points to "/tags", "/tags/<tag>" or "/graph". The link
      sweep over the built site reports no such link; the only internal links
      left are the new addresses. The graph data file stays at "/graph.json":
      it is fetched by the graph island, not linked, and it is not an old
      address.
    violation: test failure (the link sweep fails)
    source: FR5.3, AC5.1.2; U3 constraint in unit-of-work.md

  - id: BR3.1
    statement: The build writes a sorted redirect table into the site output.
    category: constraint
    applies_to: [LegacyRedirects]
    trigger: building the site
    logic: |
      A build step of the site itself writes "_redirects.json" at the site root,
      that is "site/dist/_redirects.json" in the build output, which the
      nightly rsync copies to the web root unchanged. The step is an Astro
      integration's build-done hook, registered in the site's Astro config, so
      both "just site-build" and the Jenkins Build Site step keep running the
      same "npx astro build" command and no pipeline stage is added.
      The file has the shape { "version": 1, "rules": [ { from, to } ] }:
      - "from" and "to" hold decoded absolute paths without a trailing slash,
        exactly as contract C4 states ("/tags/운영체제" and
        "/writing/tags/운영체제"); the percent-encoded form exists only in
        markup and in a Location header (BR2.2);
      - one rule "/tags" to "/writing/tags" and one rule "/graph" to
        "/writing/graph";
      - one rule "/tags/<key>" to "/writing/tags/<key>" for every tag page the
        build produced, so the rules and the pages cannot drift apart; every
        one of those pages is servable at its address (BR3.6).
      The rules are sorted by "from" and unique, so two builds of the same vault
      produce the same bytes.
    violation: test failure (a missing, unsorted, duplicated or wrongly shaped table)
    source: FR5.2, AC5.2.1, AC5.2.3, C4

  - id: BR3.2
    statement: The server matches old addresses exactly, after one decode and one trailing-slash strip.
    category: calculation
    applies_to: [StaticServer]
    trigger: a request arrives
    logic: |
      Before looking for files, the server reads the request path, decodes it
      once, strips one trailing slash (except for "/") and looks the result up
      in the table's "from" values. The match is exact, never a prefix match:
      "/graph.json" does not match "/graph" and is served as a file. A tag that
      is not in the table has no rule and is answered with the normal 404.
    violation: n/a
    source: FR5.2, AC5.2.5, C4

  - id: BR3.3
    statement: A matched old address answers 301 with the new address and the original query.
    category: policy
    applies_to: [StaticServer]
    trigger: a request matches a rule
    logic: |
      The response is 301 with a Location header holding the rule's decoded
      target, each segment percent-encoded exactly once, followed by the
      original query string when the request carried one. "/tags" and "/tags/"
      both answer 301 with "Location: /writing/tags"; "/tags/<tag>" answers 301
      with "Location: /writing/tags/<tag>"; "/graph" and "/graph/" answer 301
      with "Location: /writing/graph".
    violation: test failure (wrong status, target or query)
    source: FR5.2, AC5.2.1, AC5.2.2, AC5.2.3, AC5.2.4

  - id: BR3.4
    statement: A missing, unreadable or invalid table means no redirects, never a crash.
    category: constraint
    applies_to: [StaticServer]
    trigger: the table cannot be used
    logic: |
      The server accepts the table only when the file parses as JSON, the
      version is 1, "rules" is a list, and every rule's "from" and "to" are
      decoded absolute paths without a trailing slash. Anything else - a
      missing file, an unreadable file, invalid JSON, an unknown version, a
      wrong shape or a rule whose path is not a decoded absolute path - means
      the server serves files normally, answers no redirect and writes one
      error line to its log. It never fails a request and never answers a
      redirect it cannot prove.
    violation: test failure
    source: C4

  - id: BR3.5
    statement: The table is read again when it appears or changes, and the first restart is pinned.
    category: constraint
    applies_to: [StaticServer]
    trigger: the table's presence or modification time changes
    logic: |
      The server re-reads the table when its presence or its modification time
      changes, so a table that appears after the server started is picked up
      without a restart; contract C4 names the modification time, and the
      presence change is the case a table that did not exist yet cannot
      report.
      The one manual restart is pinned: the new server code is restarted after
      U3 merges and before the first nightly deploy that ships the moved
      pages. In the window between that restart and the deploy the old pages
      are still in the web root and no table exists, so the server serves them
      normally and answers no redirect (BR3.4) and no old address breaks; the
      deploy then brings the new pages and the table together, and the running
      server picks the table up. This resolves the open question on C4 in the
      contract summary.
    violation: n/a
    source: C4, ADR-002; U3 deployment model in unit-of-work.md

  - id: BR3.6
    statement: A request path that resolves to a directory is served by that directory's index.html.
    category: constraint
    applies_to: [StaticServer]
    trigger: a request path resolves to a directory inside the web root
    logic: |
      The server's clean-URL rewrite is extended so that a path which resolves
      to a directory inside the web root is served by that directory's
      "index.html", whatever the path's shape. Today the rewrite appends
      "index.html" only to a path without a dot, so a tag key that contains a
      dot ("node.js") produces a directory the server answers 404 for, and the
      rule BR3.1 writes for that tag page would point at an address the server
      cannot serve. With this rule every page the build produced is servable at
      its own address, including a tag key containing a dot.
      A path that resolves to a file is still served as that file - "/graph.json"
      stays a file - and a path that resolves to nothing is still answered with
      the 404 page. The rule changes the file lookup only; the redirect lookup
      still runs first (BR3.2, BR3.3) and the request path still reads no file
      for the table between changes (BR3.5).
    violation: test failure (a built page directory answered 404)
    source: FR5.1, AC5.1.3, NFR5

  - id: BR4.1
    statement: The moved pages stay inside the accessibility bar.
    category: constraint
    applies_to: [DiscoveryPages]
    trigger: every change to the moved pages
    logic: |
      "/writing/tags", "/writing/tags/<tag>" and "/writing/graph" pass axe
      WCAG 2.2 AA at 320, 768, 1024 and 1440 px in light and dark, plus the
      reduced-motion check. Each page has exactly one h1, one h2 per section and
      every control is at least 44 × 44 px. The back link is a real link with a
      visible focus style, and the graph page keeps its keyboard path.
    violation: test failure
    source: NFR1, AC7.1.1

  - id: BR4.2
    statement: The moved pages make no request to another origin.
    category: constraint
    applies_to: [DiscoveryPages]
    trigger: every page load
    logic: |
      No moved page loads a resource, font, script or data file from another
      origin. The graph data file is served from the site's own root.
    violation: test failure
    source: NFR2, AC7.1.2

  - id: BR4.3
    statement: The moved pages work without JavaScript, and a check proves it.
    category: constraint
    applies_to: [DiscoveryPages, StaticServer]
    trigger: the no-JavaScript crossunit run
    logic: |
      With JavaScript off the tag index, the tag pages and the graph page show
      all their content and links, the graph's list panel stays visible - the
      stylesheet rule that shows it without JavaScript is part of the graph
      page's own stylesheet - and every control is reachable by keyboard. The
      no-JavaScript crossunit smoke is extended to visit the three moved
      routes and to assert that the graph's list panel is visible, because the
      link sweep alone cannot observe it. "just crossunit" passes with only the
      fixture's deliberate broken image reported, and the link sweep reports no
      "/tags" or "/graph" link.
    violation: test failure
    source: NFR3, AC7.1.3; U3 constraint in unit-of-work.md

  - id: BR4.4
    statement: Existing suites stay green on the U3 merge.
    category: constraint
    applies_to: [DiscoveryPages, LegacyRedirects, StaticServer]
    trigger: build-and-test
    logic: |
      The Rust, unit, property, format and type checks pass. The tests that
      assert the old addresses are updated to the new addresses, not deleted:
      the HIG route list, the tag and graph page checks, the Writing capsule
      checks, the search-from-tags check, the performance specification's own
      Core Web Vitals and mobile-network route lists, and the profile
      specification's baseline routes.
    violation: test failure
    source: NFR6, AC7.1.4
```

## Summary

| ID | Rule |
|---|---|
| BR1.1 | The three pages live only under `/writing/...`; the build produces no old page |
| BR1.2 | Same content and layout, plus one plain "‹ Writing" back link above the Large Title; its rules live in the stylesheet the moved pages already load |
| BR1.3 | The same data modules as today; the move changes addresses only |
| BR2.1 | One shared address module owns every tag and graph address, old and new |
| BR2.2 | The tag segment is the sanitized key; the decoded form is stored, the encoded form is used once |
| BR2.3 | The Writing capsules point at `/writing/tags` and `/writing/graph` |
| BR2.4 | No rendered link points to `/tags` or `/graph`; `/graph.json` stays a fetched file |
| BR3.1 | The site build's own build-done hook writes a sorted, unique `_redirects.json` with decoded paths |
| BR3.2 | The server decodes once, strips one trailing slash, matches exactly |
| BR3.3 | A match answers 301 with the once-encoded target and the original query |
| BR3.4 | A missing or invalid table means no redirects, never a crash |
| BR3.5 | The table is re-read when it appears or changes; the first restart is pinned before the first deploy |
| BR3.6 | A path that resolves to a directory is served by that directory's `index.html`, whatever the path's shape |
| BR4.1 | Axe WCAG 2.2 AA at four widths in light and dark, plus reduced motion |
| BR4.2 | No request to another origin |
| BR4.3 | The moved pages work without JavaScript and a check proves it |
| BR4.4 | Existing suites stay green; old-address expectations are updated, not deleted |
