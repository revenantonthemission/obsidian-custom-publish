# Requirements: Repository Cleanup and HIG Redesign

Intent `261019-hig-redesign`. Initial description: "Cleanup worktrees and branches, and Redesign the blog by Apple's Human Interface Guidelines." [desc]

Source tags: `[desc]` the initial description; `[Q1]`–`[Q9]` and `[F1]`–`[F2]` the answers in `requirements-analysis-questions.md` (same folder); `[RE]` the code knowledge base in `aidlc/spaces/default/codekb/obsidian-blog/`; `[TP]` the affirmed practices in `team-practices.md` (practices-discovery stage) and `memory/team.md`; `[PR]` the hard rules in `memory/project.md`; `[assumption]` a statement the maintainer has not confirmed.

## Intent Analysis

The maintainer wants two things done to obsidian-press, the self-hosted Obsidian Publish replacement behind https://rvnnt.dev (business-overview.md):

1. **A clean repository.** 31 local branches and 3 extra worktrees have piled up. Almost all of them are already merged, but some still hold work that must not be lost: an unmerged Mermaid fix and uncommitted portfolio work. The goal is a repository with only the branches that matter, and nothing lost along the way. [desc] [RE]
2. **A site that looks and behaves like a modern Apple interface.** The current design uses the Tailwind stone and teal palettes, solid surfaces, light/dark switching tied to sunrise and the reader's location, a CDN font, and 13 known accessibility gaps (code-structure.md, code-quality-assessment.md). The goal is a redesign following Apple's Human Interface Guidelines: the current Liquid Glass material language on top of Apple's foundations for typography, color, layout, motion and accessibility. It covers every reader-facing page, including the profile pages and the résumé's print and PDF output. [desc] [Q1] [Q2] [F2]

**Type**: enhancement (visual redesign plus accessibility remediation) and repository maintenance. **Scope**: system-wide on the site (`site/`); the Rust preprocessor stays functionally unchanged (architecture.md). **Complexity**: complex. Every page, the shared chrome and the heavily verified profile subsystem are touched.

## Functional Requirements

### FR1: Repository cleanup

The cleanup runs before the redesign starts, so the redesign branches off a clean `develop`. `develop` is the trunk and branches merge back with `git merge --no-ff` [TP]. No step pushes to `origin` [TP].

- **FR1.1** Commit the uncommitted portfolio work on `codex/feature/infra-engineer-portfolio` (role metadata, presentation and style changes, test changes including the replaced `portfolio-product-engineer.spec.ts`, and `docs/portfolio/infra-engineer/`). Write the message as `<type>: <description>` with a Korean description, and merge the branch into `develop` with `--no-ff`. [Q8] [TP]
- **FR1.2** Bring the Mermaid puppeteer-configuration fix (`9e1c203`, `preprocessor/src/mermaid.rs`) and its `.puppeteer-config.json` ignore line onto `develop`. None of the branch's other changes are brought over: the older `.aidlc/aidlc-rules/` tree, `AGENTS.md`, the `CLAUDE.md` and Justfile additions, the old `aidlc-docs/` records, the generated `site/public/*.json` and the `package-lock.json` change. Then delete `codex/chore/aidlc-scaffolding`. [Q7] [F1]
- **FR1.3** Commit the AI-DLC setup separately from the portfolio work, on its own `chore/` branch merged into `develop` with `--no-ff`. The setup is the new `.claude/` framework files, the `.claude/settings.json` change, `.mcp.json`, the `aidlc/` workspace, the `.gitignore` block, and the move of the old `aidlc-docs/` records into `aidlc/spaces/default/intents/261019-obsidian-press-resume-an/`. [TP: one phase per branch] [assumption: that the maintainer wants the AI-DLC setup committed]
- **FR1.4** Add `.aidlc/worktrees/` to `.gitignore`, so AI-DLC build worktrees can never be committed. [PR: never commit nested worktree checkouts] [TP]
- **FR1.5** Remove the 3 linked worktrees: `/Users/revenantonthemission/Projects/obsidian-blog-u1-nfr`, `.claude/worktrees/u2-home-boundary` and `.claude/worktrees/u3-quality-gates`. Before removing each one, check it for uncommitted or untracked changes. A worktree that has any is reported with its changes listed and left in place. After the removals, prune stale worktree records. [Q6] [TP]
- **FR1.6** Delete every local branch merged into `develop` except `develop` and `main`. That is the 27 branches already merged, plus the branches merged by FR1.1 and FR1.3. Use git's safe delete (`git branch -d`), which refuses a branch with commits not reachable from `develop`; any refusal is reported, never forced. [Q6] [TP]
- **FR1.7** Leave `develop`, `main` and both remote branches untouched apart from the merges above. `main` stays the milestone marker merged by hand. [TP]

Acceptance criteria:

- **AC1.1** Given the cleanup has finished, when `git branch` and `git worktree list` run, then the only local branches are `develop`, `main` and any branch the redesign has opened, and the only worktree is the main checkout.
- **AC1.2** Given `git log develop` after the cleanup, then it contains the portfolio commit (via a merge commit), the Mermaid fix, and the AI-DLC setup commit (via a merge commit), and `develop` still builds and passes its existing suites.
- **AC1.3** Given a worktree has an uncommitted or untracked change, when the cleanup reaches it, then the worktree and its branch stay in place and the report names the changed files.
- **AC1.4** Given a branch has a commit that is not on `develop`, when the cleanup tries to delete it, then the deletion is refused and reported, and the branch stays.
- **AC1.5** Given the cleanup has finished, then `origin/develop` and `origin/main` are unchanged, and nothing was pushed.

### FR2: HIG design system

- **FR2.1 Semantic tokens.** Replace the current palette with one semantic token layer named with the `--c-` prefix. It covers background and grouped background levels, label levels (primary to quaternary), separator, fill levels, tint (accent), and the system colors used for callouts and graph categories. Every hard-coded color is replaced by a token: the callout palettes, the graph category colors in `graphUtils.ts`, the `#2563eb` fallback in `nav-tree.css`, `#fff` on the accent, and the shadows. The unused dark callout tokens are removed. [Q1] [PR: `--c-` names] [RE: TD-05]
- **FR2.2 Typography.** Use Pretendard on every route, served from this site as `.woff2` subsets split by `unicode-range` with `font-display: swap`. The CDN font stylesheet is removed. The type scale follows Apple's text styles (Large Title, Title 1–3, Headline, Body, Callout, Subheadline, Footnote, Caption 1–2) expressed in `rem`. Korean headings keep `word-break: keep-all`, and long unbroken strings wrap instead of overflowing. [Q4] [Q1]
- **FR2.3 Layout and spacing.** Spacing follows an 8-point grid with 4-point half steps. Corner radii are concentric: a container's radius equals its child's radius plus the padding between them. Breakpoints are expressed mobile-first (`min-width`) at one scale, which replaces today's mix of `max-width` and `min-width` queries. [Q1] [RE: TD-14]
- **FR2.4 Liquid Glass materials.** The header, the desktop and mobile navigation, the post sidebar, the search overlay, the link-preview card and sheet, and the mobile sidebar sheet use a translucent material: a backdrop blur and saturation over a tinted fill, with an edge highlight. They float above the content. Body content surfaces stay solid. [Q1]
- **FR2.5 Material fallbacks.** The materials fall back to opaque surfaces with the same tokens when `backdrop-filter` is unsupported, when `prefers-reduced-transparency: reduce` matches, and when `prefers-contrast: more` matches (which also strengthens separators). [Q1] [Q5]
- **FR2.6 Motion.** Every animation uses only `transform` and `opacity`, with Apple-style easing. When `prefers-reduced-motion: reduce` matches, animations and transitions are removed or reduced to opacity crossfades, and scripted scrolling jumps instead of animating. [TP: web rules] [Q5]

Acceptance criteria:

- **AC2.1** Given any stylesheet in `site/src/styles/` or any component style after the redesign, when it is searched for literal color values, then none appear outside the token definitions (the only exception is Shiki's per-token variables).
- **AC2.2** Given a browser without `backdrop-filter` support, or with reduced transparency or increased contrast requested, when any page loads, then every material surface is opaque and the text on it meets NFR1's contrast ratios.
- **AC2.3** Given a profile or blog route loads, when its network requests are recorded, then no font or stylesheet comes from a third-party host other than the KaTeX stylesheet allowed by NFR4.
- **AC2.4** Given the reader has requested reduced motion, when they open the search overlay, a link preview, a sheet or the back-to-top action, then no transition longer than 0.1 s runs and no scripted smooth scroll happens.

### FR3: Light and dark appearance

- **FR3.1** By default the site follows the system appearance through `prefers-color-scheme`. Pages render the correct appearance with JavaScript disabled. [Q3]
- **FR3.2** A control offers Automatic, Light and Dark. The choice is stored per browser and applied before first paint by the ES5 inline bootstrap script in `BaseLayout.astro`, so the page never flashes the wrong theme. [Q3] [TP: CLAUDE.md pitfalls]
- **FR3.3** In Automatic mode, a change to the system appearance while a page is open switches the page live, including themed diagram pairs. [Q3]
- **FR3.4** The geolocation request, the call to `api.sunrise-sunset.org` and the sunrise/sunset logic in `solar.ts` and `ThemeToggle.tsx` are removed. The duplicated theme logic becomes one appearance model. [Q3] [RE: TD-04, A11Y-10]

Acceptance criteria:

- **AC3.1** Given a first visit with the system in dark mode, when any page loads, then it renders dark without a location prompt and without any request to a sunrise API.
- **AC3.2** Given the reader chose Light, when they reload or open another page, then it renders light before first paint even if the system is dark.
- **AC3.3** Given browser storage is blocked, when the reader opens any page, then the site behaves as Automatic and the control still works for the current page.
- **AC3.4** Given JavaScript is disabled, when any page loads, then it follows the system appearance.

### FR4: Page redesign (screen)

- **FR4.1 Shared chrome.** Redesign the header, desktop navigation, mobile navigation, footer, search trigger, appearance control, skip link, reading progress and back-to-top on the new system. [Q2]
- **FR4.2 Post pages.** Redesign the article layout, sidebar (table of contents, backlinks, related posts, local graph), code blocks and copy button, callouts, tables, figures, math, footnotes, heading fold, hub child dates, diagrams and link previews. The CSS keeps styling the existing preprocessor HTML contract (code-structure.md, "Emitted HTML Contract"). [Q2] [RE]
- **FR4.3 Other blog pages.** Redesign the homepage (including "오늘 발행된 글"), hub pages, tag index and tag pages, the graph page and the 404 page. The `is:global` overrides in `index.astro` move into the token layer. [Q2] [RE: TD-15]
- **FR4.4 Profile pages.** Redesign `/resume`, `/portfolio`, `/portfolio/product-engineer` and `/portfolio/infra-engineer` on the new system. They keep:
  - the approved fact text
  - the profile DOM data-attribute contract
  - the CSS budget (24 KiB gzip)
  - no third-party requests
  - a self-hosted `.woff2` font
  - no new client JavaScript reachable from profile routes beyond what the asset budget accepts (see FR6.2)

  [Q2] [RE]
- **FR4.5 Empty and error states.** Every list and data view keeps a designed empty or error state: no posts published today, a tag with no posts, a search with no results, and graph or preview data that fails to load. [corner checklist]

Acceptance criteria:

- **AC4.1** Given each route in api-documentation.md, when it renders at 320, 375, 768, 1024, 1440 and 1920 px wide in both appearances, then nothing overflows horizontally and no content is clipped.
- **AC4.2** Given the redesign is finished, when the profile verification runs (`npm run test:unit`, the profile e2e specs and the asset budget), then the approved facts and the data-attribute contract are unchanged and the profile CSS is at most 24 KiB gzip.
- **AC4.3** Given search finds nothing, when the results render, then a designed "no results" state appears (it never shows a blank panel).

### FR5: Accessibility remediation (all 13 known gaps)

- **FR5.1** All link text and all text on the accent meet 4.5:1 contrast in both appearances. This covers links in posts, the table of contents, related posts, post cards, hub navigation, tags, the skip link and the mobile preview button. [Q5: A11Y-01, A11Y-02]
- **FR5.2** The search overlay is a modal dialog:
  - `role="dialog"` with `aria-modal="true"` and a labelled input
  - a visible focus indicator
  - focus trapped while open and returned to the trigger on close
  - Escape closes it
  - results exposed as a listbox navigable with arrow keys

  [Q5: A11Y-03]
- **FR5.3** The mobile sidebar's tabs follow the WAI-ARIA tabs pattern with arrow-key support. Its overlay is a dialog with focus management. [Q5: A11Y-04]
- **FR5.4** Expand and collapse controls expose `aria-expanded`: the navigation tree, the heading fold and collapsible callouts. [Q5: A11Y-05]
- **FR5.5** Accessible names and visible control labels are Korean, matching `lang="ko"` (appearance control, table of contents, hub navigation, copy button, tree controls). [Q5: A11Y-06]
- **FR5.6** The global graph and the local graph can be operated with a keyboard: nodes can be reached and opened without a pointer, or an equivalent accessible list of the same nodes and links is provided. Categories are distinguished by more than hue (labels, shapes or patterns). [Q5: A11Y-07]
- **FR5.7** Link previews also open on keyboard focus. They can be dismissed with Escape, stay open while hovered, and do not block navigation. On touch devices the first tap on a link navigates, and the preview has its own explicit affordance. [Q5: A11Y-08]
- **FR5.8** Every interactive control has a hit area of at least 44 × 44 CSS px (Apple's minimum), or 44 px tall for inline text links in navigation. [Q5: A11Y-09]
- **FR5.9** Decorative SVGs carry `aria-hidden="true"`. The search shortcut hint shows `⌘K` on Apple platforms and `Ctrl K` elsewhere. [Q5: A11Y-11]
- **FR5.10** Reading progress animates through `transform: scaleX()` instead of `width`, updated once per animation frame. Scripted smooth scrolling respects reduced motion. [Q5: A11Y-12]
- **FR5.11** Automated accessibility checks cover the blog routes; see NFR1 and NFR7. [Q5: A11Y-13]

(A11Y-10, appearance that ignores the system setting, is covered by FR3.)

Acceptance criteria:

- **AC5.1** Given the search overlay is open, when the reader presses Tab repeatedly, then focus stays inside it. When they press Escape, it closes and focus returns to the search trigger.
- **AC5.2** Given a keyboard-only reader on `/graph`, when they navigate, then they can reach and open any node's post without a pointer.
- **AC5.3** Given a link inside a post receives keyboard focus, then its preview appears. When the reader presses Escape, the preview closes and focus stays on the link.
- **AC5.4** Given any page at 320 px wide, when interactive controls are measured, then each one's hit area is at least 44 × 44 CSS px.

### FR6: Print, PDF and verification artifacts

- **FR6.1** Restyle the résumé's print layout and the portfolio print rules to match the new design. The PDF parity contract still holds: facts are neither dropped nor reordered, the period format is `YYYY-MM – 현재`, and the screen-only selectors are kept in sync with `pdf-renderer.mjs`. [F2] [RE]
- **FR6.2** Prepare a new PDF résumé release with `npm run resume:pdf -- --prepare`. The maintainer reviews it, and it is promoted only after that human review (`--promote`). The new release replaces the outdated public `/resume.pdf`, and the download link reappears once the release matches the current profile. [F2] [TP]
- **FR6.3** Where the redesign changes inline scripts or client JavaScript that the asset budget fingerprints, update the asset-budget baselines deliberately, recording what changed and why. Update the profile markup assertions in `profile-presentation.test.ts` together with the markup they pin. [Q2] [RE]
- **FR6.4** After the redesign and Prettier (FR7) settle, the maintainer redoes the 16-state manual accessibility review once. The redesign work prepares the checklist and the build to review. It never writes or re-stamps the review record itself. [TP] [Q9]

Acceptance criteria:

- **AC6.1** Given the restyled résumé, when the PDF inspector runs on the prepared candidate, then every approved fact appears in its approved order.
- **AC6.2** Given the prepared PDF has not been reviewed by the maintainer, then it is not promoted and `/resume.pdf` is unchanged.

### FR7: Prettier

- **FR7.1** At the end of this redesign, before the accessibility review (FR6.4), add Prettier for `site/`. It gets a committed configuration, `format` and `format:check` npm scripts, and a dedicated reformatting commit separate from the design changes. Any inline-script fingerprints the reformat changes are refreshed under FR6.3. [Q9] [TP]

Acceptance criteria:

- **AC7.1** Given Prettier has landed, when `npm run format:check` runs in `site/`, then it passes, and the existing suites (NFR7) still pass.

## Non-Functional Requirements

- **NFR1 Accessibility.** Every route has zero axe violations under the WCAG 2.0, 2.1 and 2.2 A and AA tags. The checks run at 320, 768, 1024 and 1440 px wide, in light and dark, and with reduced motion. Text contrast is at least 4.5:1, and large text and UI components at least 3:1, in both appearances, including text on material surfaces. Every function works by keyboard with a visible focus indicator. Text resized to 200% causes no loss of content or function. [Q5] [TP]
- **NFR2 Performance.** On a mid-range mobile Lighthouse profile against a local production build, for the homepage, a long post with diagrams and math, `/graph` and `/resume`:
  - Largest Contentful Paint under 2.5 s
  - Cumulative Layout Shift under 0.1
  - Interaction to Next Paint under 200 ms
  - Total Blocking Time under 200 ms

  Each blog route loads at most 30 KiB of gzipped CSS (excluding KaTeX), and profile routes stay within their existing 24 KiB budget. Font loading must not add layout shift. [origin: maintainer's web performance rules] [RE]
- **NFR3 Compatibility.** The site supports the latest two versions of Safari (macOS and iOS), Chrome, Edge and Firefox. Where `backdrop-filter` or newer media queries are unsupported, the fallbacks in FR2.5 apply. The existing Playwright projects (chromium, firefox, webkit) exercise this. [Q1] [RE]
- **NFR4 Privacy and third parties.** Choosing the appearance sends no reader data to any third party. Fonts are served only from this site. The KaTeX stylesheet may stay on its CDN only if it carries a Subresource Integrity hash; otherwise it is self-hosted. [Q3] [Q4] [origin: security assessment in code-quality-assessment.md and the maintainer's web security rules]
- **NFR5 Maintainability.** New and changed frontend files stay under 800 lines. Tokens are CSS custom properties with the `--c-` prefix. Motion uses only `transform` and `opacity`, semantic HTML comes first, and `<style is:global>` is used for `set:html` content. [TP] [PR]
- **NFR6 Safety of the cleanup.** No commit becomes unreachable and no uncommitted change is lost (FR1.5, FR1.6). Every destructive git step is preceded by its check and followed by a report of what it removed. [Q6]
- **NFR7 Testing.** Work follows test-first development [TP]:
  - Each page's Playwright and axe acceptance checks are written failing first, then the page is restyled until they pass.
  - The existing suites stay green: `cargo test --release`, `npm run test:unit`, `npm run test:pbt`.
  - Before merging: `npx astro check` reports 0 errors and `just crossunit` passes.
  - `npm run test:e2e` passes once the maintainer has redone the review in FR6.4.

  No screenshot baselines are kept. [TP] [Q5]

## Constraints

- `develop` is the trunk; branches merge back with `--no-ff`; each phase of work gets its own branch off `develop`; merged branches and their worktrees are deleted right away. [TP] [PR]
- Pushing `develop` is a release, because the nightly Jenkins job deploys `origin/develop`. Nothing in this intent pushes, deploys, runs `just deploy` or writes to the Obsidian vault without the maintainer's go-ahead. [TP]
- Apple's San Francisco fonts may not be served as web fonts. Pretendard is licensed under the SIL Open Font License, which permits self-hosting. [Q4]
- `<script is:inline>` blocks in `BaseLayout.astro` must be ES5. Styles for `set:html` content must be global. Decorative images use `alt=""`. [TP: CLAUDE.md pitfalls]
- The Rust preprocessor's emitted HTML contract (code-structure.md) does not change unless the emitter, the stylesheet and the tests change together. Preprocessor changes are not planned. [RE]
- Approved profile facts and the fact-approval receipt must not change. [RE]
- The site uses npm and npx. [TP]

## Assumptions

- The web rendering of Liquid Glass is a backdrop blur and saturation, a tinted translucent fill, and an edge highlight. The refraction and lensing effects of Apple's native material are not reproduced, because CSS cannot do them faithfully. [assumption]
- The maintainer wants the AI-DLC setup committed (FR1.3). [assumption]
- Removing stray tracked scratch files (`tmp/pdfs/`, `output/pdf/`, `preprocessor/.astro/`) is not part of "cleanup worktrees and branches" and is left for later. [assumption]
- The RSS feed's content and format are unchanged. [assumption]
- The redesign reaches production only when the maintainer pushes `develop`; the nightly job then publishes it. [TP]

## Out of Scope

- Changes to Jenkins or CI: gating the new checks in the Verify stage, and a runner for the post-deploy HTTP 200 check. The plan skips the CI pipeline stage. [TP]
- Security headers and Content-Security-Policy at the server or Cloudflare edge. [RE: TD-11]
- ESLint and Stylelint (later work, per practices). [TP]
- Pushing to `origin`, deploying, and cleaning up remote branches (the remote holds only `develop` and `main`).
- Changes to profile fact content, and new pages or features.
- A print stylesheet for blog posts.

## Open Questions

- The exact material parameters (blur radius, tint opacity, edge highlight) and the type and spacing scales: settled in Refined Mockups.
- How the three-way appearance control fits the asset budget's rule against new client JavaScript on profile routes (FR4.4, FR6.3): settled in Refined Mockups and the code plan.
- The order of the restyle, for example proving the tokens and both appearances on one post page before the remaining pages: settled in the code plan.
- Prettier's quote style, given today's mix of single and double quotes: settled in the code plan.
- Whether KaTeX is self-hosted or kept on its CDN with an integrity hash (NFR4): settled in the code plan.

## Sources

- `aidlc/spaces/default/codekb/obsidian-blog/business-overview.md`: purpose, audiences, profile business rules.
- `aidlc/spaces/default/codekb/obsidian-blog/architecture.md`: the preprocessor-to-Astro pipeline and the hosting model.
- `aidlc/spaces/default/codekb/obsidian-blog/code-structure.md`: stylesheets, tokens, breakpoints, motion, print styles, the emitted HTML contract.
- `aidlc/spaces/default/codekb/obsidian-blog/code-quality-assessment.md`: accessibility gaps A11Y-01 to A11Y-13, verification gates, technical debt, the branch and worktree inventory.
- `aidlc/spaces/default/intents/261019-hig-redesign/inception/practices-discovery/team-practices.md`: way of working, testing posture, deployment, code style.
- `aidlc/spaces/default/memory/project.md`: the affirmed hard rules.
- `requirements-analysis-questions.md`: Questions 1–9 and Follow-ups 1–2.
- `codex/chore/aidlc-scaffolding` as inspected on 2026-10-20: its 10 commits and 108 changed files (Follow-up 1).
