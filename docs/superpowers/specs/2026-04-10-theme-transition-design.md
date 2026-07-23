# Theme Transition & Sunrise/Sunset Auto-Switching

**Date:** 2026-04-10
**Status:** Approved

## Overview

Improve the light/dark theme system with two enhancements:
1. Smooth CSS transitions when switching themes (including diagram crossfades)
2. Automatic theme switching based on sunrise/sunset, using browser geolocation

## Design Decisions

- **Transition duration:** 300ms ease, unified across all elements
- **No animation on page load** — transitions only fire during active switches (manual toggle or solar boundary)
- **Auto mode is always on.** Manual toggle overrides temporarily; the next sunrise/sunset boundary reverts to auto
- **Geolocation + Sunrise-Sunset.org API** — request coordinates once (cached 30 days), fetch sunrise/sunset times once per day from API (cached with date). If geolocation denied or API fails, use 06:30/18:30 defaults.

## 1. CSS Transition System

A `.theme-transitioning` class is added to `<html>` before a theme switch and removed after 300ms. All transition rules are scoped under this class so they never fire on page load.

```css
html.theme-transitioning * {
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease;
}
```

Shiki code blocks and callouts inherit this naturally since their colors are CSS-variable-driven.

## 2. Diagram Stacking for Crossfade

### Current State

`.diagram-light` and `.diagram-dark` are siblings toggled via `display: none/block`. Cannot be transitioned.

### New Approach

- The preprocessor wraps each light/dark pair in `<div class="diagram-container">`
- Light diagram stays in normal document flow (defines container size)
- Dark diagram is `position: absolute; top: 0; left: 0` overlaid on top
- Active variant: `opacity: 1`; inactive: `opacity: 0`
- Under `.theme-transitioning`: `transition: opacity 300ms ease`

### Preprocessor Change

`render_themed_diagram()` in `transform.rs` wraps the two output elements in `<div class="diagram-container">...</div>`.

### CSS Changes (diagrams.css)

```css
.diagram-container {
  position: relative;
  display: inline-block;
}

.diagram-container .diagram-dark {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* Replace display: none/block with opacity: 0/1 */
.diagram-dark { opacity: 0; }
.diagram-light { opacity: 1; }

[data-theme="dark"] .diagram-light { opacity: 0; }
[data-theme="dark"] .diagram-dark { opacity: 1; }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .diagram-light { opacity: 0; }
  :root:not([data-theme="light"]) .diagram-dark { opacity: 1; }
}

html.theme-transitioning .diagram-light,
html.theme-transitioning .diagram-dark {
  transition: opacity 300ms ease;
}
```

## 3. Sunrise/Sunset Auto-Switching

### Sunrise/Sunset API (`site/src/lib/solar.ts`)

Uses the free [Sunrise-Sunset.org API](https://sunrise-sunset.org/api) — no API key required:
```
GET https://api.sunrise-sunset.org/json?lat={lat}&lng={lng}&formatted=0
```
Returns ISO 8601 timestamps for sunrise, sunset, and twilight phases.

- One fetch per day, results cached in localStorage under key `"solar"` with today's date
- If the API call fails or is offline, fall back to 06:30/18:30 local time defaults

### Geolocation Flow

1. On first visit, call `navigator.geolocation.getCurrentPosition()`
2. On success, cache `{ lat, lng, ts }` in localStorage under key `"geo"`
3. On denial/error, fall back to 06:30/18:30 local time defaults
4. Cached coordinates reused on subsequent visits; re-fetch if >30 days old
5. Once coordinates are available, fetch sunrise/sunset from the API and cache result

### Scheduling Logic (ThemeToggle.tsx)

1. On mount, compute today's sunrise/sunset from coordinates (or defaults)
2. Determine current "solar theme" — light if between sunrise and sunset, dark otherwise
3. If user hasn't manually toggled, apply the solar theme
4. `setTimeout` for the next boundary (upcoming sunrise or sunset)
5. When timeout fires: switch theme with transition animation, schedule next boundary
6. Manual toggle sets `localStorage["theme-manual"]` to current ISO timestamp
7. Next solar boundary clears `theme-manual` and resumes auto mode

### FOUC Script Enhancement (BaseLayout.astro)

The inline `<script is:inline>` gains solar awareness:
- Reads cached `solar` data (sunrise/sunset timestamps) from localStorage
- Compares current time against cached sunrise/sunset — just a timestamp comparison, no math needed
- Sets correct theme immediately (no flash, no waiting for island hydration)
- Falls back to current behavior (`localStorage.theme` or `prefers-color-scheme`) if no cached solar data exists yet
- The ThemeToggle island handles the actual API fetch on hydration, so the FOUC script stays minimal

## 4. State Management

### localStorage Keys

| Key | Value | Purpose |
|---|---|---|
| `theme` | `"light"` or `"dark"` | Current active theme (unchanged) |
| `theme-manual` | ISO timestamp or absent | When user last manually toggled |
| `geo` | `{ lat, lng, ts }` JSON | Cached geolocation coordinates |
| `solar` | `{ sunrise, sunset, date }` JSON | Cached API response (sunrise/sunset ISO timestamps + date string) |

### Theme Resolution Priority (on page load)

1. If `theme-manual` exists AND next solar boundary hasn't passed → use `localStorage.theme`
2. Else → compute solar theme from cached geo (or 06:30/18:30 defaults), clear stale `theme-manual`
3. Final fallback → system `prefers-color-scheme`

## 5. Graph Re-Rendering on Theme Change

### Audit Findings

| Component | Issue |
|---|---|
| **LocalGraph.tsx** (canvas) | Reads `--c-accent`, `--c-text`, `--c-border` once on mount via `getComputedStyle()`. Never re-renders when theme changes — colors freeze at initial theme. |
| **GraphView.tsx** (D3 SVG) | Node colors hardcoded in `graphUtils.ts` (`#ef4444`, `#3b82f6`, etc.). Link stroke hardcoded `rgba(150,150,150,0.3)`. Labels use `var(--c-text)` (works), but nodes/links don't adapt. |
| **graphUtils.ts** | `getNodeColor()` returns hardcoded hex values with no dark-mode variants. |

### Fixes

#### LocalGraph.tsx
- Add a `MutationObserver` on `document.documentElement` watching `data-theme` attribute changes
- When theme changes: re-read CSS variables via `getComputedStyle()`, redraw the canvas with new colors
- Clean up the observer on component unmount

#### GraphView.tsx
- Replace hardcoded link stroke with CSS variable: `var(--c-border)` (adapts automatically via CSS)
- Node colors: use the same hardcoded palette (these are semantic category colors that work on both themes), but adjust node stroke/outline for contrast on dark backgrounds
- Add a `MutationObserver` on `data-theme` to re-apply dynamic attributes (link stroke, any computed colors) when theme changes

#### graphUtils.ts
- Keep the current color palette (category colors are intentionally vivid and work on both light and dark backgrounds)
- No changes needed here — the graph components handle theme adaptation at the rendering level

### Non-Fixable Limitations

| Component | Reason |
|---|---|
| **Typst diagrams** | Typst CLI has no theme/color-scheme support — always renders single variant |
| **D2 binary (PNG/GIF/PDF)** | Binary formats can't produce light/dark variants from a single source |

## 6. Files Changed

| File | Change |
|---|---|
| `site/src/lib/solar.ts` | **New** — geolocation + Sunrise-Sunset.org API client, caching, scheduling |
| `site/src/islands/ThemeToggle.tsx` | Solar scheduling, `.theme-transitioning` class toggling |
| `site/src/islands/LocalGraph.tsx` | Add MutationObserver to re-read CSS vars and redraw canvas on theme change |
| `site/src/islands/GraphView.tsx` | Replace hardcoded colors with CSS vars, add MutationObserver for theme re-render |
| `site/src/layouts/BaseLayout.astro` | Extend FOUC script with solar-aware theme resolution |
| `site/src/styles/global.css` | Add `.theme-transitioning` transition rules |
| `site/src/styles/diagrams.css` | Rewrite to opacity-based stacking with crossfade |
| `preprocessor/src/transform.rs` | Wrap diagram pairs in `.diagram-container` |

## 6. Edge Cases

- **User crosses midnight:** setTimeout for sunrise (next day) handles this naturally
- **Tab backgrounded:** setTimeout may fire late, but the next page load corrects via FOUC script
- **SSR:** Solar calc in FOUC script is client-only (inline script). ThemeToggle is `client:load`. No server-side concerns.
- **No JavaScript:** Falls back to CSS `prefers-color-scheme` media queries (existing behavior, unchanged)
