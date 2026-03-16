# UI Icons & Visual Improvements Design

## Summary

Add Lucide icons to header/footer navigation, callout titles, and a copy-to-clipboard button on code blocks. Uses `lucide-static` for build-time SVG rendering and `lucide-preact` for the interactive copy button.

## Icon Library

- **`lucide-static`** — SVG strings used in Astro templates via `set:html`, zero client JS
- **`lucide-preact`** — Preact components, used only for the interactive CopyButton island

## 1. Header & Footer Icons

**File:** `site/src/components/Header.astro`

| Element | Icon | Rendering |
|---|---|---|
| `obsidian-press` (site title) | `Split` | `lucide-static` + `set:html` |
| `Tags` nav link | `Tags` | `lucide-static` + `set:html` |
| `Graph` nav link | `Waypoints` | `lucide-static` + `set:html` |

**File:** `site/src/components/Footer.astro`

| Element | Icon |
|---|---|
| `Built with obsidian-press` | `Split` |

Icons sized at 16px, aligned with text via flexbox `align-items: center` + `gap`.

## 2. Callout Icons (CSS-only)

**File:** `site/src/styles/callouts.css`

Icons injected via CSS `::before` pseudo-elements on `.callout-title`, using SVG as `mask-image`. No preprocessor changes needed.

| Callout types | Lucide icon |
|---|---|
| note, info | `Info` |
| abstract | `ClipboardList` |
| todo | `CircleCheck` |
| tip | `Lightbulb` |
| success, done, check | `Check` |
| warning, attention, caution | `TriangleAlert` |
| danger, failure | `X` |
| bug | `Bug` |
| important | `AlertCircle` |
| question, help, faq | `HelpCircle` |
| quote, cite | `Quote` |
| example | `List` |

Icon color inherits from `--callout-border` per group. Size: 1em, vertically centered with title text.

## 3. Code Block Copy Button

**File:** `site/src/islands/CopyButton.tsx` (new Preact island)
**Integration:** `site/src/layouts/PostLayout.astro` (client-side script)

- Client-side script queries all `pre.shiki` elements, injects a CopyButton
- Button shows `Copy` icon, changes to `Check` for 1.5s on success
- Positioned `absolute` top-right of the code block
- Subtle styling: semi-transparent, more visible on hover/focus
- Uses `lucide-preact` for `Copy` and `Check` icons

## Non-goals

- No changes to the Rust preprocessor
- No changes to `render.ts` unified pipeline
- No task-list/checkbox styling (not in scope)
