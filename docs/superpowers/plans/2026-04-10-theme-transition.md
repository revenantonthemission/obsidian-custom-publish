# Theme Transition & Sunrise/Sunset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add smooth CSS transitions to theme switching, crossfade diagrams, auto-switch themes at sunrise/sunset, and make graph visualizations re-render on theme change.

**Architecture:** CSS transitions scoped under a `.theme-transitioning` class (never on page load). Diagrams stacked with opacity instead of display toggling. Sunrise-Sunset.org API fetched once per day with geolocation caching. Graph components observe `data-theme` mutations to re-render.

**Tech Stack:** Preact (islands), CSS custom properties, D3.js (graphs), Sunrise-Sunset.org REST API, Geolocation API, Rust preprocessor

---

## File Structure

| File | Responsibility |
|---|---|
| `site/src/lib/solar.ts` | **New** — Geolocation caching, Sunrise-Sunset.org API client, solar theme computation, scheduling helpers |
| `site/src/styles/global.css` | Add `.theme-transitioning` rule |
| `site/src/styles/diagrams.css` | Rewrite theme switching from display to opacity, add `.diagram-container` styles |
| `preprocessor/src/transform.rs` | Wrap themed diagram pairs in `<div class="diagram-container">` |
| `site/src/islands/ThemeToggle.tsx` | Add transition class toggling, solar scheduling, manual override tracking |
| `site/src/layouts/BaseLayout.astro` | Extend FOUC script with solar-aware theme resolution |
| `site/src/islands/LocalGraph.tsx` | Add MutationObserver for theme-aware canvas redraw |
| `site/src/islands/GraphView.tsx` | Replace hardcoded link stroke, add MutationObserver for theme re-render |

---

### Task 1: CSS Transition System

**Files:**
- Modify: `site/src/styles/global.css:345-353` (after the reduced-motion block)

- [ ] **Step 1: Add the `.theme-transitioning` rule to global.css**

Add immediately before the `/* ── Responsive: Phone ── */` comment (line 355):

```css
/* ── Theme transition ── */
html.theme-transitioning,
html.theme-transitioning *,
html.theme-transitioning *::before,
html.theme-transitioning *::after {
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease !important;
}
```

The `!important` is needed to override existing component-level transitions (e.g., `.site-nav-link`'s `transition: background 0.15s`). The rule only applies during the ~300ms window when `.theme-transitioning` is present.

Note: The existing `@media (prefers-reduced-motion: reduce)` block at line 346 already sets `transition-duration: 0.01ms !important` on all elements — this correctly overrides our transition for users who prefer reduced motion. No additional work needed.

- [ ] **Step 2: Verify the reduced-motion override works**

Open `site/src/styles/global.css` and confirm that the `@media (prefers-reduced-motion: reduce)` block (lines 346-353) uses `!important` on `transition-duration`. It does:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
  }
}
```

This means our `.theme-transitioning` transitions are automatically suppressed for users with reduced motion. No additional CSS needed.

- [ ] **Step 3: Commit**

```bash
git add site/src/styles/global.css
git commit -m "feat: add theme-transitioning CSS rule for smooth theme switches"
```

---

### Task 2: Diagram Crossfade CSS

**Files:**
- Modify: `site/src/styles/diagrams.css:47-61`

- [ ] **Step 1: Rewrite the diagram theme switching section**

Replace lines 47-61 of `diagrams.css` (the entire `/* ── Diagram light/dark theme switching ── */` section) with:

```css
/* ── Diagram light/dark theme switching ── */

.diagram-container {
  position: relative;
  display: inline-block;
  width: 100%;
}

.diagram-container .diagram-dark {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* Default (light): show light, hide dark */
.diagram-dark { opacity: 0; pointer-events: none; }
.diagram-light { opacity: 1; }

/* Explicit dark mode */
[data-theme="dark"] .diagram-light { opacity: 0; pointer-events: none; }
[data-theme="dark"] .diagram-dark { opacity: 1; pointer-events: auto; }

/* System dark mode preference (no explicit theme set) */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .diagram-light { opacity: 0; pointer-events: none; }
  :root:not([data-theme="light"]) .diagram-dark { opacity: 1; pointer-events: auto; }
}

/* Transition only during active theme switches */
html.theme-transitioning .diagram-light,
html.theme-transitioning .diagram-dark {
  transition: opacity 300ms ease;
}
```

Key changes from the old CSS:
- `display: none/block` replaced with `opacity: 0/1` (enables CSS transition)
- `pointer-events: none` on hidden diagrams prevents invisible diagrams from capturing clicks
- `.diagram-container` positions the dark variant absolutely over the light one
- Transition only applies under `.theme-transitioning`
- Removed `!important` — no longer needed since `opacity` doesn't conflict like `display` did

- [ ] **Step 2: Commit**

```bash
git add site/src/styles/diagrams.css
git commit -m "feat: rewrite diagram theme CSS from display toggle to opacity crossfade"
```

---

### Task 3: Preprocessor Diagram Container Wrapping

**Files:**
- Modify: `preprocessor/src/transform.rs:592-638`
- Test: `preprocessor/src/transform.rs` (inline tests)

- [ ] **Step 1: Write the failing test**

Add this test to the `mod tests` block at the bottom of `transform.rs` (after line 686):

```rust
#[test]
fn test_render_themed_diagram_wraps_in_container() {
    let result = render_themed_diagram(
        "test",
        "source",
        "my-slug",
        1,
        None,
        &ThemePair { light: "light", dark: "dark" },
        |_src, _theme| Ok("<svg>mock</svg>".to_string()),
    );
    assert!(
        result.starts_with(r#"<div class="diagram-container">"#),
        "Expected diagram-container wrapper, got: {result}"
    );
    assert!(
        result.ends_with("</div>"),
        "Expected closing </div>, got: {result}"
    );
    assert!(
        result.contains("diagram-light"),
        "Expected light variant, got: {result}"
    );
    assert!(
        result.contains("diagram-dark"),
        "Expected dark variant, got: {result}"
    );
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd preprocessor && cargo test test_render_themed_diagram_wraps_in_container -- --nocapture`

Expected: FAIL — the current output doesn't have a `<div class="diagram-container">` wrapper.

- [ ] **Step 3: Modify `render_themed_diagram()` to wrap output in container div**

In `transform.rs`, change the last line of `render_themed_diagram()` (line 637):

Replace:
```rust
    parts.join("\n")
```

With:
```rust
    format!(r#"<div class="diagram-container">{}</div>"#, parts.join("\n"))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd preprocessor && cargo test test_render_themed_diagram_wraps_in_container -- --nocapture`

Expected: PASS

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `cd preprocessor && cargo test`

Expected: All tests pass. Some integration tests may reference exact HTML output from diagrams — if any fail due to the new wrapper div, update those expected strings to include `<div class="diagram-container">...</div>`.

- [ ] **Step 6: Commit**

```bash
git add preprocessor/src/transform.rs
git commit -m "feat: wrap themed diagram pairs in diagram-container div for crossfade"
```

---

### Task 4: Solar Utility Module

**Files:**
- Create: `site/src/lib/solar.ts`

- [ ] **Step 1: Create `solar.ts` with type definitions and constants**

```typescript
/** Cached geolocation coordinates. */
export interface GeoCache {
  lat: number;
  lng: number;
  ts: number; // timestamp when cached
}

/** Cached sunrise/sunset times from API. */
export interface SolarCache {
  sunrise: string; // ISO 8601
  sunset: string;  // ISO 8601
  date: string;    // YYYY-MM-DD
}

const GEO_KEY = "geo";
const SOLAR_KEY = "solar";
const MANUAL_KEY = "theme-manual";
const GEO_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const DEFAULT_SUNRISE_HOUR = 6;
const DEFAULT_SUNRISE_MIN = 30;
const DEFAULT_SUNSET_HOUR = 18;
const DEFAULT_SUNSET_MIN = 30;
```

- [ ] **Step 2: Add geo caching functions**

```typescript
/** Read cached geo from localStorage, or null if missing/stale. */
export function getCachedGeo(): GeoCache | null {
  try {
    const raw = localStorage.getItem(GEO_KEY);
    if (!raw) return null;
    const geo: GeoCache = JSON.parse(raw);
    if (Date.now() - geo.ts > GEO_MAX_AGE_MS) return null;
    return geo;
  } catch {
    return null;
  }
}

/** Request geolocation and cache the result. Returns coordinates or null on failure. */
export function requestGeoAndCache(): Promise<GeoCache | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const geo: GeoCache = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ts: Date.now(),
        };
        localStorage.setItem(GEO_KEY, JSON.stringify(geo));
        resolve(geo);
      },
      () => resolve(null),
      { timeout: 10000 }
    );
  });
}
```

- [ ] **Step 3: Add API fetch and caching**

```typescript
/** Fetch sunrise/sunset from API and cache result. Returns cached data or null. */
export async function fetchAndCacheSolar(lat: number, lng: number): Promise<SolarCache | null> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const res = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0&date=${today}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== "OK") return null;

    const solar: SolarCache = {
      sunrise: json.results.sunrise,
      sunset: json.results.sunset,
      date: today,
    };
    localStorage.setItem(SOLAR_KEY, JSON.stringify(solar));
    return solar;
  } catch {
    return null;
  }
}

/** Read cached solar data from localStorage if it's for today. */
export function getCachedSolar(): SolarCache | null {
  try {
    const raw = localStorage.getItem(SOLAR_KEY);
    if (!raw) return null;
    const solar: SolarCache = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (solar.date !== today) return null;
    return solar;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Add solar theme computation and scheduling helpers**

```typescript
/** Build default sunrise/sunset Date objects for today. */
function getDefaultTimes(): { sunrise: Date; sunset: Date } {
  const now = new Date();
  const sunrise = new Date(now);
  sunrise.setHours(DEFAULT_SUNRISE_HOUR, DEFAULT_SUNRISE_MIN, 0, 0);
  const sunset = new Date(now);
  sunset.setHours(DEFAULT_SUNSET_HOUR, DEFAULT_SUNSET_MIN, 0, 0);
  return { sunrise, sunset };
}

/** Determine which theme should be active right now based on solar times. */
export function getSolarTheme(solar: SolarCache | null): "light" | "dark" {
  const now = new Date();
  let sunrise: Date;
  let sunset: Date;

  if (solar) {
    sunrise = new Date(solar.sunrise);
    sunset = new Date(solar.sunset);
  } else {
    ({ sunrise, sunset } = getDefaultTimes());
  }

  return now >= sunrise && now < sunset ? "light" : "dark";
}

/** Milliseconds until the next solar boundary (sunrise or sunset). */
export function msUntilNextBoundary(solar: SolarCache | null): number {
  const now = new Date();
  let sunrise: Date;
  let sunset: Date;

  if (solar) {
    sunrise = new Date(solar.sunrise);
    sunset = new Date(solar.sunset);
  } else {
    ({ sunrise, sunset } = getDefaultTimes());
  }

  // Find next boundary
  if (now < sunrise) return sunrise.getTime() - now.getTime();
  if (now < sunset) return sunset.getTime() - now.getTime();

  // Past both today — next sunrise is tomorrow
  const tomorrowSunrise = new Date(sunrise);
  tomorrowSunrise.setDate(tomorrowSunrise.getDate() + 1);
  return tomorrowSunrise.getTime() - now.getTime();
}

/** Check if the manual override is still valid (hasn't crossed a solar boundary). */
export function isManualOverrideActive(solar: SolarCache | null): boolean {
  const raw = localStorage.getItem(MANUAL_KEY);
  if (!raw) return false;

  const manualTime = new Date(raw);
  const now = new Date();
  let sunrise: Date;
  let sunset: Date;

  if (solar) {
    sunrise = new Date(solar.sunrise);
    sunset = new Date(solar.sunset);
  } else {
    ({ sunrise, sunset } = getDefaultTimes());
  }

  // Manual override is stale if a solar boundary has passed since the toggle
  if (manualTime < sunrise && now >= sunrise) return false;
  if (manualTime < sunset && now >= sunset) return false;

  return true;
}

/** Set the manual override timestamp. */
export function setManualOverride(): void {
  localStorage.setItem(MANUAL_KEY, new Date().toISOString());
}

/** Clear the manual override. */
export function clearManualOverride(): void {
  localStorage.removeItem(MANUAL_KEY);
}
```

- [ ] **Step 5: Commit**

```bash
git add site/src/lib/solar.ts
git commit -m "feat: add solar utility module with API client, geo caching, and scheduling"
```

---

### Task 5: ThemeToggle with Transitions and Solar Scheduling

**Files:**
- Modify: `site/src/islands/ThemeToggle.tsx:1-42`

- [ ] **Step 1: Rewrite ThemeToggle.tsx with transition and solar support**

Replace the entire file content:

```tsx
import { useState, useEffect, useCallback } from "preact/hooks";
import { Sun, Moon } from "lucide-preact";
import {
  getCachedGeo,
  requestGeoAndCache,
  getCachedSolar,
  fetchAndCacheSolar,
  getSolarTheme,
  msUntilNextBoundary,
  isManualOverrideActive,
  setManualOverride,
  clearManualOverride,
} from "../lib/solar";

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Add .theme-transitioning to <html>, wait for transition, then remove. */
function withTransition(apply: () => void): void {
  const el = document.documentElement;
  el.classList.add("theme-transitioning");
  apply();
  const cleanup = () => {
    el.classList.remove("theme-transitioning");
    el.removeEventListener("transitionend", cleanup);
  };
  el.addEventListener("transitionend", cleanup);
  // Safety timeout in case transitionend doesn't fire
  setTimeout(() => el.classList.remove("theme-transitioning"), 350);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  // Apply theme to DOM and localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Solar scheduling
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;

    async function initSolar() {
      // Get or request geolocation
      let geo = getCachedGeo();
      if (!geo) {
        geo = await requestGeoAndCache();
      }

      // Get or fetch solar times
      let solar = getCachedSolar();
      if (!solar && geo) {
        solar = await fetchAndCacheSolar(geo.lat, geo.lng);
      }

      // Apply solar theme if no manual override
      if (!isManualOverrideActive(solar)) {
        clearManualOverride();
        const solarTheme = getSolarTheme(solar);
        if (solarTheme !== theme) {
          withTransition(() => setTheme(solarTheme));
        }
      }

      // Schedule next boundary
      scheduleBoundary(solar, geo);
    }

    function scheduleBoundary(
      solar: import("../lib/solar").SolarCache | null,
      geo: import("../lib/solar").GeoCache | null
    ) {
      const ms = msUntilNextBoundary(solar);
      timerId = setTimeout(async () => {
        // At boundary: clear manual override and switch theme
        clearManualOverride();

        // Re-fetch solar data (may be a new day)
        let freshSolar = solar;
        if (geo) {
          freshSolar = await fetchAndCacheSolar(geo.lat, geo.lng);
        }

        const solarTheme = getSolarTheme(freshSolar);
        withTransition(() => setTheme(solarTheme));

        // Schedule next
        scheduleBoundary(freshSolar, geo);
      }, ms);
    }

    initSolar();

    return () => {
      if (timerId !== null) clearTimeout(timerId);
    };
  }, []); // Run once on mount

  const toggle = useCallback(() => {
    setManualOverride();
    withTransition(() => setTheme((t) => (t === "light" ? "dark" : "light")));
  }, []);

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      style={{
        background: "none",
        border: "1px solid var(--c-border)",
        borderRadius: "var(--radius)",
        padding: "0.35em 0.5em",
        cursor: "pointer",
        color: "var(--c-text)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
```

- [ ] **Step 2: Verify the site builds**

Run: `cd site && npx astro build`

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add site/src/islands/ThemeToggle.tsx
git commit -m "feat: add smooth theme transitions and sunrise/sunset auto-switching to toggle"
```

---

### Task 6: FOUC Script Solar Awareness

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro:49-57`

- [ ] **Step 1: Replace the FOUC prevention script**

Replace lines 49-57 of `BaseLayout.astro` (the entire `<script is:inline>` block in `<head>`):

```html
<script is:inline>
  // Apply saved theme immediately to prevent flash of unthemed content
  (function() {
    var theme;
    var manual = localStorage.getItem("theme-manual");
    var solar = null;

    // Try to read cached solar data
    try {
      var raw = localStorage.getItem("solar");
      if (raw) {
        solar = JSON.parse(raw);
        // Check if solar data is for today
        var today = new Date().toISOString().slice(0, 10);
        if (solar.date !== today) solar = null;
      }
    } catch(e) { solar = null; }

    if (manual && solar) {
      // Manual override active — check if a solar boundary has passed
      var mt = new Date(manual);
      var now = new Date();
      var sr = new Date(solar.sunrise);
      var ss = new Date(solar.sunset);
      var boundaryPassed = (mt < sr && now >= sr) || (mt < ss && now >= ss);
      if (boundaryPassed) {
        // Override expired — use solar theme
        localStorage.removeItem("theme-manual");
        theme = (now >= sr && now < ss) ? "light" : "dark";
      } else {
        // Override still valid — use saved theme
        theme = localStorage.getItem("theme");
      }
    } else if (solar) {
      // No manual override — use solar theme
      var now2 = new Date();
      var sr2 = new Date(solar.sunrise);
      var ss2 = new Date(solar.sunset);
      theme = (now2 >= sr2 && now2 < ss2) ? "light" : "dark";
    } else {
      // No solar data yet — fall back to saved theme or system preference
      theme = localStorage.getItem("theme");
      if (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        theme = "dark";
      }
    }

    if (theme) document.documentElement.setAttribute("data-theme", theme);
  })();
</script>
```

This script is intentionally written in ES5 style (no `const`/`let`, no arrow functions) to maximize browser compatibility — it runs synchronously before any other JS loads.

- [ ] **Step 2: Verify the site builds**

Run: `cd site && npx astro build`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add site/src/layouts/BaseLayout.astro
git commit -m "feat: extend FOUC script with solar-aware theme resolution"
```

---

### Task 7: LocalGraph Theme Re-Rendering

**Files:**
- Modify: `site/src/islands/LocalGraph.tsx:23-102`

- [ ] **Step 1: Refactor the useEffect to support theme-aware re-rendering**

Replace the entire `useEffect` block (lines 23-102) with:

```tsx
useEffect(() => {
  if (!data || !canvasRef.current || data.nodes.length === 0) return;

  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d")!;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.scale(dpr, dpr);

  const nodes: GraphNode[] = data.nodes.map((n) => ({ ...n }));
  const links: GraphLink[] = data.edges.map((e) => ({ ...e }));

  const sim = forceSimulation(nodes)
    .force(
      "link",
      forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.slug)
        .distance(50)
    )
    .force("charge", forceManyBody().strength(-120))
    .force("center", forceCenter(size / 2, size / 2))
    .force("collide", forceCollide().radius(15));

  /** Read current theme colors from CSS variables. */
  function readThemeColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
      accent: styles.getPropertyValue("--c-accent").trim() || "#0d9488",
      text: styles.getPropertyValue("--c-text").trim() || "#1c1917",
      border: styles.getPropertyValue("--c-border").trim() || "#e7e5e4",
    };
  }

  let colors = readThemeColors();
  setReady(true);

  sim.on("tick", () => {
    ctx.clearRect(0, 0, size, size);

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    for (const link of links as unknown as ResolvedLink[]) {
      ctx.beginPath();
      ctx.moveTo(link.source.x!, link.source.y!);
      ctx.lineTo(link.target.x!, link.target.y!);
      ctx.stroke();
    }

    for (const node of nodes) {
      const isCurrent = node.slug === slug;
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, isCurrent ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isCurrent ? colors.accent : getNodeColor(node);
      ctx.fill();
    }

    ctx.fillStyle = colors.text;
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    for (const node of nodes) {
      ctx.fillText(node.title, node.x!, node.y! + 14);
    }
  });

  // Re-render canvas when theme changes
  const observer = new MutationObserver(() => {
    colors = readThemeColors();
    // Force a re-tick by reheating the simulation briefly
    sim.alpha(0.1).restart();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  const handleClick = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (const node of nodes) {
      const dx = x - node.x!;
      const dy = y - node.y!;
      const HIT_RADIUS_SQ = 100;
      if (dx * dx + dy * dy < HIT_RADIUS_SQ && node.slug !== slug) {
        window.location.href = node.is_hub ? `/hubs/${node.slug}` : `/posts/${node.slug}`;
        break;
      }
    }
  };
  canvas.addEventListener("click", handleClick);

  return () => {
    sim.stop();
    observer.disconnect();
    canvas.removeEventListener("click", handleClick);
  };
}, [data, slug]);
```

Key changes:
- Extracted `readThemeColors()` helper for re-reading CSS variables
- `colors` is a mutable binding that the `tick` handler closes over
- `MutationObserver` watches `data-theme` on `<html>`, re-reads colors and briefly reheats the simulation to redraw with new colors
- Observer is cleaned up on unmount alongside the simulation

- [ ] **Step 2: Verify the site builds**

Run: `cd site && npx astro build`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add site/src/islands/LocalGraph.tsx
git commit -m "feat: re-render LocalGraph canvas on theme change via MutationObserver"
```

---

### Task 8: GraphView Theme Re-Rendering

**Files:**
- Modify: `site/src/islands/GraphView.tsx:25-118`

- [ ] **Step 1: Refactor the useEffect to support theme-aware re-rendering**

Replace the entire `useEffect` block (lines 25-118) with:

```tsx
useEffect(() => {
  if (!data || !svgRef.current) return;

  const container = svgRef.current.parentElement;
  const w = width || container?.clientWidth || 800;
  const h = height || container?.clientHeight || 600;

  const svg = select(svgRef.current);
  svg.selectAll("*").remove();
  svg.attr("width", w).attr("height", h);

  const nodes: GraphNode[] = data.nodes.map((n) => ({ ...n }));
  const links: GraphLink[] = data.edges.map((e) => ({ ...e }));

  const g = svg.append("g");

  const zoomBehavior = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 4])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
  svg.call(zoomBehavior);
  setReady(true);

  // Draw edges — use CSS variable for theme-adaptive stroke
  const linkElements = g
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", "var(--c-border, rgba(150, 150, 150, 0.3))")
    .attr("stroke-width", 1);

  // Draw nodes
  const nodeElements = g
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", (d) => getNodeRadius(d))
    .attr("fill", (d) => getNodeColor(d))
    .attr("cursor", "pointer")
    .on("click", (_event, d) => {
      window.location.href = d.is_hub ? `/hubs/${d.slug}` : `/posts/${d.slug}`;
    });

  // Draw labels — already uses CSS variable
  const labelElements = g
    .append("g")
    .attr("class", "labels")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .text((d) => d.title)
    .attr("font-size", "11px")
    .attr("text-anchor", "middle")
    .attr("fill", "var(--c-text, #1c1917)")
    .attr("pointer-events", "none");

  // Simulation
  const sim = forceSimulation(nodes)
    .force(
      "link",
      forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.slug)
        .distance(80)
    )
    .force("charge", forceManyBody().strength(-200))
    .force("center", forceCenter(w / 2, h / 2))
    .force("collide", forceCollide().radius(20));

  sim.on("tick", () => {
    linkElements
      .attr("x1", (d) => (d as unknown as ResolvedLink).source.x!)
      .attr("y1", (d) => (d as unknown as ResolvedLink).source.y!)
      .attr("x2", (d) => (d as unknown as ResolvedLink).target.x!)
      .attr("y2", (d) => (d as unknown as ResolvedLink).target.y!);

    nodeElements.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);

    labelElements
      .attr("x", (d) => d.x!)
      .attr("y", (d) => d.y! + getNodeRadius(d) + 14);
  });

  // Re-apply dynamic attributes when theme changes
  const observer = new MutationObserver(() => {
    // link stroke uses CSS var — browser re-resolves automatically
    // labels use CSS var — browser re-resolves automatically
    // Force SVG repaint to pick up new CSS variable values
    svg.style("display", "none");
    svg.node()!.offsetHeight; // trigger reflow
    svg.style("display", null);
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  return () => {
    sim.stop();
    observer.disconnect();
  };
}, [data, width, height]);
```

Key changes:
- Link stroke changed from hardcoded `"rgba(150, 150, 150, 0.3)"` to `"var(--c-border, rgba(150, 150, 150, 0.3))"`
- `MutationObserver` watches `data-theme` changes and forces SVG repaint so CSS variable references re-resolve
- Observer cleaned up on unmount

- [ ] **Step 2: Verify the site builds**

Run: `cd site && npx astro build`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add site/src/islands/GraphView.tsx
git commit -m "feat: make GraphView theme-aware with CSS variables and MutationObserver"
```

---

### Task 9: Integration Verification

**Files:** None (verification only)

- [ ] **Step 1: Run the preprocessor to regenerate content**

Run: `just preprocess`

Expected: Preprocessor completes successfully. Diagram HTML in generated content now has `<div class="diagram-container">` wrappers around themed diagram pairs.

- [ ] **Step 2: Run the full Rust test suite**

Run: `cd preprocessor && cargo test`

Expected: All tests pass (including the new `test_render_themed_diagram_wraps_in_container`).

- [ ] **Step 3: Build the site**

Run: `cd site && npx astro build`

Expected: Build succeeds with no errors.

- [ ] **Step 4: Start dev server and manually test theme transitions**

Run: `cd site && npx astro dev`

Test checklist:
1. Click the theme toggle — background, text, borders should smoothly transition over ~300ms
2. Diagrams (D2/Mermaid) should crossfade between light and dark versions
3. Shiki code blocks should transition smoothly
4. Callout colors should transition smoothly
5. The browser should prompt for geolocation permission (allow it)
6. Check localStorage for `geo` and `solar` keys — both should be populated
7. Check that the graph visualization (local graph on post pages, full graph on /graph) updates colors when theme changes

- [ ] **Step 5: Commit any fixes found during verification**

```bash
git add -A
git commit -m "fix: integration fixes from theme transition verification"
```

Only run this step if fixes were needed. Skip if everything passed cleanly.
