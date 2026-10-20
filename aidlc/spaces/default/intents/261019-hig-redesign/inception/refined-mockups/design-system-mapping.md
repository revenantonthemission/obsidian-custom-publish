# Design System Mapping

This document defines the token layer that replaces today's Tailwind-derived palette (FR2.1). It maps every current token and hard-coded color to its replacement, and records the contrast evidence behind each color. All names use the `--c-` prefix, a hard rule in `memory/project.md`. Requirements come from `requirements.md` (requirements-analysis stage); the practices that shape them (web rules, files under 800 lines, motion only on `transform` and `opacity`) come from `team-practices.md` (practices-discovery stage).

Contrast ratios below were computed with the WCAG 2.x relative-luminance formula on 2026-10-20. Translucent cases were composited in sRGB over the worst-case backdrop.

## Color Tokens

### Backgrounds and labels

| Token | Light | Dark | Role |
|---|---|---|---|
| `--c-bg` | `#FFFFFF` | `#000000` | reading pages (posts, 404, graph) |
| `--c-bg-grouped` | `#F2F2F7` | `#000000` | pages built from grouped lists (home, hubs, tags, profile) |
| `--c-surface` | `#FFFFFF` | `#1C1C1E` | groups and cards on the grouped background |
| `--c-surface-2` | `#F5F5F7` | `#2C2C2E` | code panels, inline code, chips, inputs |
| `--c-text` | `#1D1D1F` | `#F5F5F7` | primary label |
| `--c-text-secondary` | `#636366` | `#A1A1A6` | metadata, summaries, counts |
| `--c-text-tertiary` | `#8E8E93` | `#8E8E93` | decorative or disabled only; never informative text |
| `--c-separator` | `#C6C6C8` | `#38383A` | dividers between rows; decorative only |
| `--c-control-border` | `#8E8E93` | `#8E8E93` | the boundary of controls that need one (inputs, chips in increased contrast) |
| `--c-fill` | `rgba(120,120,128,0.12)` | `rgba(120,120,128,0.24)` | pressed and hover fills, segmented-control track |
| `--c-tint` | `#0F766E` | `#2DD4BF` | link text, focus ring, progress line, current item |
| `--c-tint-hover` | `#115E59` | `#5EEAD4` | link hover |
| `--c-tint-fill` | `#0F766E` | `#0F766E` | filled buttons, current-section pill, skip link |
| `--c-on-tint` | `#FFFFFF` | `#FFFFFF` | text on `--c-tint-fill` |
| `--c-scrim` | `rgba(0,0,0,0.25)` | `rgba(0,0,0,0.5)` | dims the page behind dialogs and sheets |

### System colors (callouts, graph, status)

Each hue has a base color, used for fills, icons and graph nodes, and a text color, used for titles and small text on the hue's tinted fill.

| Hue | Light base | Light text | Dark base | Dark text | Used by |
|---|---|---|---|---|---|
| blue | `#007AFF` | `#0040DD` | `#0A84FF` | `#409CFF` | note, info, abstract callouts; graph category OS |
| green | `#34C759` | `#1C7430` | `#30D158` | `#30DB5B` | tip, success, check callouts; graph category Web; "복사됨" state |
| orange | `#FF9500` | `#C93400` | `#FF9F0A` | `#FFB340` | warning, caution, question callouts; graph category DB |
| red | `#FF3B30` | `#C70014` | `#FF453A` | `#FF6961` | danger, error, bug, failure callouts; graph category Hub |
| purple | `#AF52DE` | `#8944AB` | `#BF5AF2` | `#DA8FFF` | example callouts; graph category Network |
| gray | `#8E8E93` | `#6C6C70` | `#8E8E93` | `#AEAEB2` | quote, cite and default callouts; default graph category |

Callout fill: the base color at 12% opacity over the page in light mode, and at 18% in dark mode.

### Contrast evidence

| Pair | Light | Dark | Requirement |
|---|---|---|---|
| `--c-text` on `--c-bg` / `--c-bg-grouped` / `--c-surface-2` | 16.83 / 15.08 / 15.46 | 19.29 / 19.29 / 12.80 | 4.5 |
| `--c-text-secondary` on `--c-bg` / `--c-bg-grouped` / `--c-surface` | 5.99 / 5.37 / 5.99 | 8.16 / 8.16 / 6.61 | 4.5 |
| `--c-tint` (links) on `--c-bg` / `--c-bg-grouped` / `--c-surface-2` | 5.47 / 4.90 / 5.03 | 11.28 / 11.28 / 7.49 | 4.5 |
| `--c-on-tint` on `--c-tint-fill` | 5.47 | 5.47 | 4.5 |
| Focus ring `--c-tint` against the page | 5.47 | 11.28 | 3.0 |
| `--c-control-border` against `--c-bg` / `--c-surface` | 3.26 | 5.22 | 3.0 |
| Callout text color on its fill (blue, green, orange, red, purple, gray) | 6.47, 5.30, 4.79, 5.18, 5.19, 4.63 | 6.33, 8.80, 9.11, 6.35, 7.94, 7.87 | 4.5 |
| Graph node base color against the page (light uses the text variants) | 4.40 to 7.56 | 5.76 to 10.39 | 3.0 |

## Materials (Liquid Glass)

| Token | Light | Dark | Used by |
|---|---|---|---|
| `--c-glass-regular` | `rgba(255,255,255,0.72)` | `rgba(28,28,30,0.72)` | header bar, graph controls (bars that hold primary text only) |
| `--c-glass-thick` | `rgba(255,255,255,0.94)` | `rgba(28,28,30,0.90)` | outline panel and sheet, navigation sheet, search dialog, link preview card |
| `--glass-blur` | `blur(20px) saturate(180%)` | same | `backdrop-filter` for both materials |
| `--c-glass-edge` | `inset 0 0.5px 0 rgba(255,255,255,0.7), 0 0 0 0.5px rgba(0,0,0,0.08)` | `inset 0 0.5px 0 rgba(255,255,255,0.14), 0 0 0 0.5px rgba(255,255,255,0.06)` | the edge highlight |

**The worst-case contrast rule (closes review finding R-03).** The backdrop behind glass is whatever content scrolls under it, so contrast is computed against the worst possible backdrop: black for the light material and white for the dark one. Each material then may carry only the text tokens that pass in that case.

| Material | Worst-case composite | `--c-text` | `--c-text-secondary` | `--c-tint` | Allowed text |
|---|---|---|---|---|---|
| regular, light (0.72 over black) | `#B8B8B8` | 8.48 | 3.02 | 2.76 | primary only |
| regular, dark (0.72 over white) | `#5C5C5D` | 6.13 | 2.60 | 3.59 | primary only |
| thick, light (0.94 over black) | `#F0F0F0` | 14.77 | 5.25 | 4.80 | all three |
| thick, dark (0.90 over white) | `#333334` | 11.59 | 4.91 | 6.78 | all three |

A unit test (`accessibility-checklist.md`, check C-03) recomputes this table from the token values. It fails if a material's alpha drops below the level its allowed text needs, or if a component puts a disallowed text token on a material.

**Fallbacks.** Under any of the following, every glass surface switches to its opaque counterpart (`--c-surface`), and borders switch to `--c-control-border` (FR2.5):
- `@supports not (backdrop-filter: blur(1px))`
- `@media (prefers-reduced-transparency: reduce)`
- `@media (prefers-contrast: more)`

## Typography

The font is Pretendard, served from this site as `.woff2` subsets split by `unicode-range`, with `font-display: swap` (FR2.2). The font stack is `"Pretendard Variable", Pretendard, system-ui, sans-serif`, and Korean `word-break: keep-all` applies to headings.

| Style | Token | Size / line height | Weight | Used by |
|---|---|---|---|---|
| Large Title | `--text-large-title` | 34 px / 1.2 (28 px under 480 px) | 700 | page titles, post title |
| Title 1 | `--text-title-1` | 28 px / 1.25 | 700 | résumé name in print, 404 |
| Title 2 | `--text-title-2` | 22 px / 1.3 | 700 | h2, section headers of grouped lists |
| Title 3 | `--text-title-3` | 20 px / 1.35 | 600 | h3, navigation sheet rows |
| Headline | `--text-headline` | 17 px / 1.45 | 600 | h4, list row titles |
| Body | `--text-body` | 17 px / 1.75 | 400 | article text |
| Callout | `--text-callout` | 16 px / 1.6 | 400 | callout bodies, outline panel |
| Subheadline | `--text-subheadline` | 15 px / 1.5 | 400 | summaries, nav bar links |
| Footnote | `--text-footnote` | 13 px / 1.45 | 400 | metadata, dates, captions |
| Caption | `--text-caption` | 12 px / 1.4 | 500 | badges, code language label |

- **Units.** All sizes are written in `rem` (17 px = 1.0625rem), so browser zoom and the text size setting scale them (NFR1, 200%).
- **Letter spacing.** Titles use -0.02em; body text uses 0.
- **Code font.** `ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace`. The unloaded JetBrains Mono entry is dropped (TD-05).

## Spacing, Radius, Elevation

| Token | Values |
|---|---|
| `--space-1` … `--space-16` | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px (an 8-point grid with 4-point half steps) |
| `--radius-xs` | 6 px (inline code, badges) |
| `--radius-sm` | 10 px (buttons in panels, inputs) |
| `--radius-md` | 14 px (code panels, callouts, cards) |
| `--radius-lg` | 22 px (grouped lists, outline panel, sheets: 14 px inner radius + 8 px padding) |
| `--radius-capsule` | 999px (bar, chips, capsule buttons) |
| `--shadow-float` | light `0 8px 32px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)`; dark `0 8px 32px rgba(0,0,0,0.55)` |
| `--max-reading` | 720 px; `--outline-width` 260 px |

## Breakpoints (mobile-first, replacing the mixed scale)

| Name | Query | Change |
|---|---|---|
| base | (no query) | phones: compact bar, navigation sheet, single column |
| `sm` | `min-width: 480px` | larger phone spacing; Large Title grows from 28 px to 34 px |
| `md` | `min-width: 768px` | wide header bar replaces the sheet; two-column grids on profile pages |
| `lg` | `min-width: 1100px` | floating outline panel replaces the outline sheet on post pages |
| `xl` | `min-width: 1440px` | content stays centered; margins grow, never the measure |

## Motion

| Token | Value | Used by |
|---|---|---|
| `--dur-fast` | 150 ms | hover and press feedback (opacity, scale 0.97) |
| `--dur-normal` | 250 ms | sheet and dialog entrance (translateY plus opacity) |
| `--dur-slow` | 350 ms | outline sheet, diagram crossfade |
| `--ease-standard` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | most transitions |
| `--ease-spring` | `cubic-bezier(0.2, 0.9, 0.3, 1.05)` | sheet and dialog entrance (a slight overshoot) |

- **Allowed properties.** Only `transform` and `opacity` animate.
- **Appearance switches.** The appearance switches instantly. The old `.theme-transitioning` rule, which animated colors on every element, is removed.
- **Reduced motion.** Under `prefers-reduced-motion: reduce`, entrances become 0.01 ms opacity changes, and scripted scrolling jumps.

## Data Visualization

| Graph category | Hue | Shape | Legend label |
|---|---|---|---|
| os | blue | circle | 운영체제 |
| web | green | square | 웹 |
| db | orange | diamond | 데이터베이스 |
| network | purple | triangle | 네트워크 |
| hub | red | star | 허브 |
| default | gray | circle outline | 기타 |

Node fills use the light text variants (all at least 4.40:1 against white) and the dark base colors (at least 5.76:1 against black). The legend shows shape plus color plus label, so no category relies on hue alone (FR5.6). The local graph's canvas font switches from `10px sans-serif` to the Caption style.

## Code Highlighting (Xcode-style)

These are custom Shiki themes `xcode-light` and `xcode-dark`, passed to the existing dual-theme setup in `render.ts` in place of `github-light` and `github-dark`. The panel is `--c-surface-2`.

| Scope | Light | Ratio on `#F5F5F7` | Dark | Ratio on `#1C1C1E` |
|---|---|---|---|---|
| plain text | `#000000` | 19.29 | `#DFDFE0` | 12.78 |
| comments | `#5D6C79` | 4.96 | `#7F8C98` | 4.95 |
| strings | `#C41A16` | 5.50 | `#FC6A5D` | 5.96 |
| numbers | `#1C00CF` | 9.89 | `#D0BF69` | 9.19 |
| keywords | `#9B2393` (semibold) | 6.31 | `#FC5FA3` (semibold) | 5.92 |
| type names | `#0B4F79` | 8.01 | `#5DD8FF` | 10.32 |
| other types | `#3900A0` | 11.47 | `#D0A8FF` | 8.69 |
| functions | `#326D74` | 5.39 | `#67B7A4` | 7.20 |
| other functions | `#0F68A0` | 5.50 | `#B281EB` | 5.86 |
| attributes | `#815F03` | 5.40 | `#BF8555` | 5.43 |
| preprocessor | `#643820` | 9.06 | `#FD8F3F` | 7.44 |

Two Xcode defaults were adjusted for contrast: dark comments `#6C7986` (3.82:1) became `#7F8C98`, and dark other functions `#A167E6` (4.54:1) became `#B281EB`.

## Mapping from Current Tokens

| Current | Replacement |
|---|---|
| `--c-bg` `#fafaf9` / `#0c0a09` | `--c-bg` or `--c-bg-grouped` by page type |
| `--c-surface` `#ffffff` / `#1c1917` | `--c-surface`, or a glass material for floating chrome |
| `--c-text` | `--c-text` (new values) |
| `--c-text-muted` | `--c-text-secondary` (now 5.37 or better in light mode) |
| `--c-border` | `--c-separator` (decorative) or `--c-control-border` (control boundaries) |
| `--c-accent` `#0d9488` (3.59:1 as link text) | `--c-tint` (5.47:1); fixes A11Y-01 |
| `--c-accent-hover` | `--c-tint-hover` |
| `--c-code-bg` | `--c-surface-2` |
| `--c-callout-note`, `--c-callout-warning` and their borders (unused) | removed |
| `--c-profile-accent-text` | `--c-tint` (the override is no longer needed) |
| `--radius` 6 px | the radius scale above |
| `--max-width` 820 px, `--sidebar-width` 260 px | `--max-reading` 720 px, `--outline-width` 260 px |
| `--font-body` (CDN Pretendard), `--font-code` (JetBrains Mono) | self-hosted Pretendard; system monospace |
| callouts.css palettes, `graphUtils.ts` colors, `nav-tree.css` `#2563eb`, `#fff` on accent, overlay `rgba(0,0,0,.5)` | system color tokens, `--c-tint`, `--c-on-tint` on `--c-tint-fill`, `--c-scrim` |

## Icons

SF Symbols cannot be licensed for the web, so the site keeps Lucide (`lucide-static` at build time, `lucide-preact` in islands), drawn at 1.75 px stroke so its weight sits close to SF Symbols' regular weight.

| Purpose | Lucide icon |
|---|---|
| Site mark | `Split` (unchanged) |
| Search | `Search` |
| Appearance, by mode | `SunMoon` (자동), `Sun` (라이트), `Moon` (다크) |
| Menu | `Menu`, then `X` when open |
| Outline | `ListTree` |
| Copy | `Copy`, then `Check` |
| Disclosure | `ChevronRight` |
| Back to top | `ArrowUp` |

The mixed Unicode glyphs (↑, ▶, →, ↘, + and −) are replaced by these icons, each marked `aria-hidden="true"` (FR5.9). Callout icons stay as CSS masks, colored with the hue's base token.

## Sources

- `aidlc/spaces/default/intents/261019-hig-redesign/inception/requirements-analysis/requirements.md`: FR2.1–FR2.6, FR5.1, FR5.6, FR5.9, NFR1, NFR5.
- `aidlc/spaces/default/intents/261019-hig-redesign/inception/practices-discovery/team-practices.md`: Code Style (tokens as custom properties, `--c-` names, motion rule).
- `aidlc/spaces/default/codekb/obsidian-blog/code-structure.md`: current tokens, hard-coded colors, breakpoints and motion.
- `refined-mockups-questions.md`: Q1 (teal), Q7 (Xcode-style code).
