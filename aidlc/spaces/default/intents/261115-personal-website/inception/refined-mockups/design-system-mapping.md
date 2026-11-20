# Design System Mapping — first release

Upstream: `mockups.md`; existing tokens in `site/src/styles/tokens.css` and components in `site/src/styles/grouped.css`, `chrome.css`, `home.css`, `base.css`. Rule: colour tokens use their `--c-` names (project rule); no new colour, font, radius or shadow is introduced.

## Components

| Mockup element | Existing component / class | Change |
|----------------|----------------------------|--------|
| Large Title (M1–M4) | `.listing-header h1`, `.home-title` | None |
| Owner name | New `.home-name` text style using `--text-title-3`, weight 600 | New class, existing tokens |
| Introduction | Body text, `--c-text-secondary` | None |
| Capsules Résumé / Portfolio / Tags / Graph | `.capsule` (plain) | No `.capsule-filled` on the homepage (Q3) |
| Grouped card / list | `.grouped-list` on `body[data-surface='grouped']` | None |
| Full post row | `PostCard.astro` (`.grouped-row`) | None |
| Compact post row | `.grouped-row` without summary/reading-time | New `CompactPostRow` variant; min height 44 px |
| Topic row | `.grouped-row` with trailing count | New trailing `.grouped-row-count` in `--c-text-secondary` |
| Empty row | `.grouped-empty` | None |
| "모든 글 보기" row | `.grouped-row` with chevron | None |
| Year header (sticky) | New `.year-header` | `position: sticky; inset-block-start: calc(var(--bar-inset) * 2 + var(--bar-height))`; background `--c-glass-thick` with `--glass-blur`; falls back to `--c-bg-grouped` under `prefers-reduced-transparency` or without `backdrop-filter` |
| Back link "‹ Writing" | Plain text link with `ChevronLeft` (Lucide, decorative) | New, existing link style |
| Top bar | `Header.astro`, `.site-nav-link` | Items from `navigation.ts` (Writing only); `aria-current` value per page |
| Navigation sheet | `MobileNav.tsx` | Same items |

## Tokens Used

| Purpose | Token |
|---------|-------|
| Page background | `--c-bg-grouped` |
| Card / list | `--c-surface` |
| Primary text | `--c-text` |
| Secondary text (dates, counts, intro) | `--c-text-secondary` |
| Separators | `--c-separator` |
| Hover / pressed | `--c-fill` |
| Sticky header glass | `--c-glass-thick`, `--glass-blur`, `--c-glass-edge` |
| Spacing | `--space-2` … `--space-8` |
| Radius | `--radius-lg` (cards), `--radius-capsule` (capsules) |
| Type | `--text-large-title`, `--text-title-3`, `--text-headline`, `--text-subheadline` |
| Motion | `--dur-fast`, `--ease-standard` on `transform`/`opacity` only |
| Target | `--target` (44 px) |

## Icons (Lucide, tuned to SF Symbols regular weight)

| Use | Icon | SF Symbols equivalent |
|-----|------|-----------------------|
| Row chevron | `ChevronRight` 18 px | `chevron.right` |
| Back link | `ChevronLeft` 18 px | `chevron.left` |

All through `decorativeIcon()` (1.75 stroke, `aria-hidden`).

## Stylesheets

- New page styles go in a new `writing.css` imported by the Writing pages, not in `global.css` (keeps the accessibility-review subject set unchanged where possible).
- `home.css` loses the vault-note card rules and gains `.home-name` and the opening layout.
