# Business Rules — U4 `u4-navigation`

Upstream: `inception/units-generation/unit-of-work.md` (U4); `inception/requirements-analysis/requirements.md` (FR6.1–FR6.3, NFR1–NFR3, NFR6); `inception/user-stories/stories.md` (US6.1, US6.2, US7.1); `inception/refined-mockups/mockups.md` (M0), `interaction-spec.md` ("Writing Navigation Item", "Navigation Sheet"), `accessibility-checklist.md`; `inception/domain-design/components.md` (SiteChrome); `inception/contract-design/contract-summary.md` (C3).

U4 is a UI unit. It carries a rules file because the marker rule is the unit's only decision logic and is tested on its own. The YAML block is the source of truth.

```yaml
rules:
  - id: BR1.1
    statement: The primary navigation holds exactly one section, "Writing".
    category: policy
    applies_to: [SiteChrome]
    trigger: building the primary navigation for any page
    logic: |
      The primary model is one frozen item, in this order:
      - href "/writing", label "Writing".
      Tags, Graph, Résumé and Portfolio are absent from the primary model, so they
      disappear from both the top bar and the navigation sheet. The profile local
      model (홈, Résumé, Portfolio) is a separate model and is not part of this list.
    violation: n/a
    source: FR6.1, FR6.3, AC6.1.1, AC6.2.1

  - id: BR1.2
    statement: The Writing marker is a pure function of the normalised path.
    category: calculation
    applies_to: [SiteChrome]
    trigger: rendering the chrome of any page
    logic: |
      Normalise the pathname: drop any query string and fragment; drop one trailing
      slash unless the path is "/". Then:
      - exactly "/writing" → marker "page";
      - a path that starts with "/writing/" → marker "section";
      - anything else → no marker.
      Matching is exact-segment and case-sensitive. "/writing-old", "/writingold"
      and "/Writing" get no marker. "/writing?x=1#top" is "page".
      "/writing/all/", "/writing/tags", "/writing/tags/<tag>" and "/writing/graph"
      are "section".
    violation: an unnormalisable path is rejected by the existing navigation validation (fail closed), never guessed.
    source: FR6.2, AC6.1.2, AC6.1.3, AC6.1.4, C3 markers

  - id: BR1.3
    statement: Marker vocabulary and its rendered aria-current value.
    category: constraint
    applies_to: [SiteChrome]
    trigger: rendering the top bar or the navigation sheet
    logic: |
      - marker "page" → aria-current="page";
      - marker "section" → aria-current="true";
      - no marker → the attribute is absent.
      At most one primary item carries a marker. The same visible indicator is shown
      for "page" and "section", and it is not colour alone. On every path outside
      "/writing" and its descendants, Writing carries no marker even when the profile
      local navigation marks one of its own items.
    violation: test failure
    source: FR6.2, AC6.1.2, AC6.1.3, AC6.1.4; interaction-spec.md "Writing Navigation Item"

  - id: BR1.4
    statement: The model and the marker function are pure and immutable.
    category: constraint
    applies_to: [SiteChrome]
    trigger: every call
    logic: |
      The marker depends only on the pathname. No file, clock, DOM, environment or
      locale is read. Inputs are never mutated; models, states and items are frozen.
      The rule is unit-tested on paths, so it does not need U3's routes to exist.
    violation: n/a
    source: NFR4; U4 constraint in unit-of-work.md

  - id: BR1.5
    statement: Profile local navigation is unchanged.
    category: policy
    applies_to: [SiteChrome]
    trigger: rendering /resume or /portfolio
    logic: |
      The local navigation still lists 홈 → "/", Résumé → "/resume" and
      Portfolio → "/portfolio", marking exactly the current route with
      aria-current="page" as today. The one-item primary model does not alter it.
    violation: n/a
    source: FR6.3, AC6.2.1

  - id: BR2.1
    statement: At 768 px and wider the Writing item renders in the top bar.
    category: policy
    applies_to: [SiteChrome]
    trigger: rendering any page at 768 px or wider
    logic: |
      One link labelled "Writing" in <nav aria-label="주요 탐색">, with a target of
      at least 44 × 44 px, data-testid "primary-navigation-link-writing", and
      aria-current from BR1.3. Search, appearance and every other bar control are
      unchanged.
    violation: n/a
    source: AC6.1.1, AC6.1.2, AC6.1.3, AC6.1.4; mockups M0

  - id: BR2.2
    statement: Under 768 px the sheet holds the same one item and works without JavaScript.
    category: policy
    applies_to: [SiteChrome]
    trigger: opening the navigation sheet at phone width
    logic: |
      The sheet stays the native <details> disclosure rendered as static HTML. It
      lists Writing → "/writing" on one 52 px row (at least 44 × 44 px), shows the
      same indicator when the marker is set, carries aria-current from BR1.3,
      data-testid "mobile-navigation-link-writing", and opens and navigates with
      JavaScript disabled. While open it hides the page behind it from view and focus,
      as today.
    violation: n/a
    source: AC6.1.5, NFR3; interaction-spec.md "Navigation Sheet"

  - id: BR2.3
    statement: The changed chrome stays inside the accessibility and privacy bar.
    category: constraint
    applies_to: [SiteChrome]
    trigger: every change
    logic: |
      The HIG routes ("/", "/writing", "/writing/all", "/writing/tags",
      "/writing/tags/<tag>", "/writing/graph") pass axe WCAG 2.2 AA at 320, 768,
      1024 and 1440 px in light and dark, plus the reduced-motion check. The Writing
      control is reachable and labelled. No page makes a request to another origin.
      No new island is added.
    violation: test failure
    source: NFR1, NFR2, AC7.1.1, AC7.1.2

  - id: BR2.4
    statement: Chrome and navigation work without JavaScript across the built site.
    category: constraint
    applies_to: [SiteChrome]
    trigger: just crossunit
    logic: |
      With JavaScript off every page still renders the bar, the Writing link and the
      phone sheet, and the link sweep reports only the fixture's deliberate broken
      image.
    violation: test failure
    source: NFR3, AC7.1.3

  - id: BR2.5
    statement: Existing suites stay green on the U4 merge.
    category: constraint
    applies_to: [SiteChrome]
    trigger: build-and-test
    logic: |
      The Rust, unit, property, format and type checks pass. The property test that
      pinned the four-item primary menu is updated to the one-item model, and the
      primary model's approved shape is updated with it.
    violation: test failure
    source: NFR6, AC7.1.4; U4 constraint in unit-of-work.md
```

## Summary

| ID | Rule |
|---|---|
| BR1.1 | One primary item: Writing → `/writing`; the other sections leave the bar and sheet |
| BR1.2 | Pure marker rule: `/writing` → page; `/writing/...` → section; else none |
| BR1.3 | `page` → `aria-current="page"`, `section` → `aria-current="true"`, none → absent; one indicator, not colour alone |
| BR1.4 | Pure, input-immutable, frozen, path-only |
| BR1.5 | Profile local navigation keeps 홈 / Résumé / Portfolio and its marker |
| BR2.1 | Top bar: one Writing link, ≥ 44 × 44 px, testid `primary-navigation-link-writing` |
| BR2.2 | Phone sheet: same item, 52 px row, works with JavaScript off |
| BR2.3 | Axe WCAG 2.2 AA, reduced motion, no other origin, no new island |
| BR2.4 | No-JS site check passes with only the fixture's deliberate broken image |
| BR2.5 | Existing suites and the updated navigation property stay green |
