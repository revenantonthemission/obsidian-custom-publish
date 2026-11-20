# Bolt Plan — Passion Project personal website, first release

Upstream: `inception/requirements-analysis/requirements.md`; `inception/domain-design/components.md`; `inception/units-generation/unit-of-work.md`, `unit-of-work-dependency.md`; `inception/contract-design/contract-summary.md`.

A **Bolt** is one build pass over a piece of the work — design, code and tests for one unit — ending in something that runs and merges to `develop` on its own branch. Four Bolts, one unit each, built one at a time (delivery-planning Q1, Q2). The order matches the unit dependency chain U1 → U2 → U4 → U3 (`inception/units-generation/unit-of-work-dependency.md`).

Construction settings: iteration one unit at a time, checkpoints enabled, serial execution. Branches start from `develop` and merge back with a merge commit (team Way of Working).

## Bolt 1 — U1 `u1-publish-boundary` · walking skeleton

The **walking skeleton** is the thinnest version that runs the whole way through — vault to built site — proving the pieces connect before the rest is built.

- **Stories:** US1.1–US1.3, US2.1–US2.2, US3.1–US3.2 (and US7.1 for `/`)
- **Proves:** the publishing boundary change (two folders, classification, no homepage note) works through preprocess, site build and every existing suite.
- **Definition of Done:**
  - Fixture vault covers posts, a site page, a retired homepage note, a page/post slug clash case.
  - `cargo test --release`, `npm run test:unit`, `npm run test:pbt`, `npm run format:check`, `npx astro check` and the HIG Playwright suite pass.
  - Homepage shows "Passion Project", name, introduction, Résumé and Portfolio buttons; axe clean at 4 widths × 2 themes.
  - Jenkinsfile and Justfile pass `--pages`.
  - The owner has reworded the `Areas/Notes` project rule before merge.
- **Confidence hypothesis:** the nightly publish keeps producing the same posts, with site pages excluded and no homepage artifact, and nothing else changes for visitors except the homepage opening.
- **Expected demo:** `just preprocess` on the fixture vault, then the built homepage; `content/pages/` present, `content/homepage/` absent; a slug clash run stops with PUB008.

## Bolt 2 — U2 `u2-writing-section`

- **Stories:** US3.3–US3.4, US4.1–US4.2 (and US7.1 for its pages)
- **Definition of Done:** `/writing` and `/writing/all` live; homepage "이번 주 글" with empty state; week rule tested at the KST midnight boundary; every ordinary post appears once on `/writing/all`; HIG and axe checks pass.
- **Confidence hypothesis:** visitors can reach every post from Writing within 2 clicks, and the weekly list is correct on Monday just after midnight.
- **Expected demo:** fixed build date, then `/`, `/writing`, `/writing/all`.

## Bolt 3 — U4 `u4-navigation`

- **Stories:** US6.1–US6.2 (and US7.1 for the header)
- **Definition of Done:** top bar and sheet hold only Writing; marker rule unit-tested on paths; Tags/Graph menu items gone; the property test that hard-coded the Tags item updated; HIG suites pass on every page type.
- **Confidence hypothesis:** the one-item navigation is understandable and passes accessibility checks on every page.
- **Expected demo:** desktop bar and phone sheet on `/`, `/writing`, a post.

## Bolt 4 — U3 `u3-writing-moves`

- **Stories:** US5.1–US5.2 (and US7.1 for the moved pages)
- **Definition of Done (redirects first, per Q3):**
  1. Redirect table generated into the build with sorted, unique rules (test).
  2. Server redirect behaviour tested: `/tags`, `/tags/`, Korean `/tags/<tag>`, `/graph`, query kept, `/graph.json` untouched, missing table harmless.
  3. Pages moved; layouts' tag links use the shared helper; `just crossunit` finds no `/tags` or `/graph` links.
  4. Release step: after merging and before the next nightly deploy, the owner restarts `dev.rvnnt.blog`, then checks `curl -I https://rvnnt.dev/tags` returns 301.
- **Confidence hypothesis:** no old bookmark or outside link breaks.
- **Expected demo:** `curl -I` on each old address against the local server, then the moved pages.

## After the Last Bolt

The owner redoes the manual 16-state accessibility review once (feasibility Q5).
