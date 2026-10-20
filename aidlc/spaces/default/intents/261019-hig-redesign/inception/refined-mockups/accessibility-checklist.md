# Accessibility Checklist

This checklist lists every accessibility obligation of the redesign and how it is checked. It covers NFR1 and FR5.1–FR5.11 in `requirements.md` (requirements-analysis stage) and the testing posture in `team-practices.md` (practices-discovery stage): test-first, with Playwright and axe at 320, 768, 1024 and 1440 px in both appearances plus reduced motion, and no screenshot baselines. Under test-first development, each check below is written as a failing test before the page it covers is restyled.

The target is WCAG 2.2 Level AA, plus Apple's 44-point minimum for touch targets where this checklist says so.

## Automated Checks

| ID | Check | How it is checked | Covers |
|---|---|---|---|
| C-01 | No axe violations (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) on every route | Playwright with axe on `/`, one post with code, math, callouts and diagrams, one hub, `/tags`, one tag, `/graph`, `/404`, `/resume`, `/portfolio`, `/portfolio/product-engineer` and `/portfolio/infra-engineer`, at 320, 768, 1024 and 1440 px, in light and dark, with reduced motion | NFR1, A11Y-13 |
| C-02 | Text contrast of the opaque token pairs | A Vitest unit test parses the token definitions and asserts every text pair in `design-system-mapping.md`, "Contrast evidence": at least 4.5:1, or 3:1 for large text and UI boundaries | FR5.1, A11Y-01, A11Y-02 |
| C-03 | Text contrast on glass, in the worst case (closes review finding R-03) | The same unit test composites each glass material over black (light) and white (dark). It asserts that every text token a material allows reaches at least 4.5:1. A Playwright check then confirms that, on the header bar and the graph controls, every text node's computed color is `--c-text` or text inside an opaque tint pill. This is checked separately because axe reports text over translucent backgrounds as incomplete | NFR1, FR2.4 |
| C-04 | Touch-target sizes by class (closes review finding R-04; see Target Classes) | A Playwright test measures the bounding box of every element in each class at 320 px and 1024 px | FR5.8, A11Y-09 |
| C-05 | Keyboard paths | Playwright, keyboard only: open search, move through results, open a result; open and close the outline sheet; switch outline tabs with the arrow keys; reach every note through the graph list view; expand a tree node; fold a heading; cycle the appearance | FR5.2–FR5.6 |
| C-06 | Focus management | Playwright: focus enters the search dialog and the outline sheet on open, stays trapped while open, and returns to the trigger on close; the skip link moves focus to `#main-content` | FR5.2, FR5.3 |
| C-07 | Link preview behavior | Playwright: a preview appears on keyboard focus and on hover; Escape dismisses it without moving focus; the pointer can move onto the card without it closing; on a touch-emulated context a tap navigates at once | FR5.7, A11Y-08 |
| C-08 | Reduced motion | Playwright with `reducedMotion: 'reduce'`: no transition or animation longer than 0.1 s on any route, and back-to-top jumps instead of scrolling smoothly (extends the existing profile check to every route) | FR2.6, FR5.10, A11Y-12 |
| C-09 | Reduced transparency and increased contrast | Playwright emulates `prefers-reduced-transparency: reduce` (Chromium) and `prefers-contrast: more`; every glass surface's computed `backdrop-filter` is `none` and its background is opaque | FR2.5 |
| C-10 | No-JavaScript behavior | Extends `just crossunit`: with JavaScript disabled, pages follow the system appearance, and the navigation sheet opens and its links work | FR3.1, constraint on the navigation sheet |
| C-11 | Appearance model, including legacy state (closes review finding R-02) | Playwright: a stale `theme=dark` with `theme-manual` set renders in Automatic mode and the legacy keys are removed; an unrecognized `appearance` value renders Automatic; blocked storage renders Automatic; a stored `light` renders light before first paint with the system in dark mode | FR3.1–FR3.4 |
| C-12 | Accessible names in Korean | A unit test over the built HTML: every `aria-label`, and every visible label of the controls listed in FR5.5, contains Hangul. The approved navigation labels are exempt | FR5.5, A11Y-06 |
| C-13 | Decorative icons hidden | A unit test over the built HTML: every inline `svg` without a `title` element has `aria-hidden="true"`; the search shortcut hint matches the platform | FR5.9, A11Y-11 |
| C-14 | Zoom and reflow | Playwright at 320 px wide with a 200% text-size factor (root font size 32 px): no horizontal overflow, no clipped text | NFR1 |

## Target Classes (FR5.8)

| Class | Minimum hit area | Members |
|---|---|---|
| T1 controls | 44 × 44 CSS px | every `<button>` (search, appearance, menu summary, copy, outline, close, retry, heading fold, back to top); primary navigation links in the bar and the sheet; tabs and segmented-control segments; tag chips; graph legend chips; profile contact actions and role navigation; hub previous and next links |
| T2 list rows | at least 44 px tall, full row width | grouped-list rows, navigation tree rows |
| T3 compact lists | at least 24 × 24 px with at least 8 px between targets (WCAG 2.5.8) | table-of-contents entries, footnote back-references in the footnote list |
| T4 inline | exempt (WCAG 2.5.8 inline exception) | links inside sentences of the article body, inline footnote references |

## Manual Checks

These complement the automated checks. The maintainer performs them as part of the one 16-state review (FR6.4), after the redesign and Prettier settle.

| ID | Check |
|---|---|
| M-01 | VoiceOver on macOS Safari and iOS Safari: read a post from start to end; use the rotor to move between headings and links; open search and choose a result |
| M-02 | Keyboard only, on a real browser, over the whole site, with the focus ring visible at every stop |
| M-03 | Text over glass on real content: scroll the header bar over a dark code panel, a dark image and a diagram, in both appearances |
| M-04 | 200% and 400% browser zoom on a post and on `/resume` |
| M-05 | The 16-state profile matrix (`/resume` and `/portfolio` × 320×800 and 1440×900 × light and dark × disclosures closed and all open), recorded by the maintainer through the existing review tooling |

## Mapping of the Known Gaps

| Gap | Fixed by | Verified by |
|---|---|---|
| A11Y-01 link contrast | `--c-tint` at 5.47:1 | C-01, C-02 |
| A11Y-02 white on accent | `--c-on-tint` on `--c-tint-fill` at 5.47:1 | C-02 |
| A11Y-03 search semantics | Search Dialog spec | C-05, C-06 |
| A11Y-04 mobile sidebar | Outline Sheet spec | C-05, C-06 |
| A11Y-05 `aria-expanded` | tree toggles, heading fold, callouts | C-05, C-01 |
| A11Y-06 English labels | Korean names throughout | C-12 |
| A11Y-07 pointer-only graph, hue-only categories | list view; shapes plus labels | C-05, C-01 |
| A11Y-08 hover-only previews | focus trigger; one-tap navigation on touch | C-07 |
| A11Y-09 small targets | target classes T1–T4 | C-04 |
| A11Y-10 appearance ignores the system | appearance model | C-10, C-11 |
| A11Y-11 decorative SVGs, ⌘K hint | `aria-hidden`; platform hint | C-13 |
| A11Y-12 width animation, smooth scroll | `scaleX`; reduced-motion jump | C-08 |
| A11Y-13 no checks on blog routes | C-01 over every route | C-01 |

## Sources

- `aidlc/spaces/default/intents/261019-hig-redesign/inception/requirements-analysis/requirements.md`: NFR1, NFR7, FR2.5, FR2.6, FR3, FR5, FR6.4.
- `aidlc/spaces/default/intents/261019-hig-redesign/inception/practices-discovery/team-practices.md`: Testing Posture (test-first, Playwright and axe matrix, no screenshot baselines).
- `aidlc/spaces/default/codekb/obsidian-blog/code-quality-assessment.md`: gaps A11Y-01 to A11Y-13.
- `design-system-mapping.md` and `interaction-spec.md` (same folder).
