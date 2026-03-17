# UI Icons & Visual Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Lucide icons to header, footer, callout titles, and a copy-to-clipboard button on code blocks.

**Architecture:** `lucide-static` for build-time SVG rendering in Astro templates (zero client JS), `lucide-preact` only for the interactive copy button island. Callout icons via CSS `mask-image` pseudo-elements to avoid preprocessor changes.

**Tech Stack:** Astro 6, Preact, lucide-static, lucide-preact, CSS mask-image

---

### Task 1: Install Lucide packages

**Files:**
- Modify: `site/package.json`

**Step 1: Install both packages**

Run: `cd site && npm install lucide-static lucide-preact`

**Step 2: Verify installation**

Run: `cd site && node -e "import('lucide-static').then(m => console.log('lucide-static OK, keys:', Object.keys(m).length)); import('lucide-preact').then(m => console.log('lucide-preact OK'))"`
Expected: Both print OK

**Step 3: Commit**

```bash
git add site/package.json site/package-lock.json
git commit -m "chore: install lucide-static and lucide-preact"
```

---

### Task 2: Add icons to Header

**Files:**
- Modify: `site/src/components/Header.astro`

**Step 1: Update Header.astro with Lucide static icons**

Import icons from `lucide-static` and render with `set:html`:

```astro
---
import ThemeToggle from "../islands/ThemeToggle.tsx";
import { Split, Tags, Waypoints } from "lucide-static";
---

<header class="site-header">
  <a href="/" class="site-title">
    <span class="nav-icon" set:html={Split} />
    obsidian-press
  </a>
  <nav>
    <a href="/tags" class="site-nav-link">
      <span class="nav-icon" set:html={Tags} />
      Tags
    </a>
    <a href="/graph" class="site-nav-link">
      <span class="nav-icon" set:html={Waypoints} />
      Graph
    </a>
    <ThemeToggle client:load />
  </nav>
</header>
```

**Step 2: Add icon sizing CSS to global.css**

Add to `site/src/styles/global.css` after `.site-nav-link:hover`:

```css
.nav-icon {
  display: inline-flex;
  align-items: center;
}

.nav-icon svg {
  width: 16px;
  height: 16px;
  vertical-align: middle;
}

.site-title,
.site-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
```

**Step 3: Verify visually**

Run: `cd site && npx astro dev`
Check: Header shows Split icon + "obsidian-press", Tags icon + "Tags", Waypoints icon + "Graph"

**Step 4: Commit**

```bash
git add site/src/components/Header.astro site/src/styles/global.css
git commit -m "feat: add Lucide icons to header navigation"
```

---

### Task 3: Add icon to Footer

**Files:**
- Modify: `site/src/components/Footer.astro`

**Step 1: Update Footer.astro**

```astro
---
import { Split } from "lucide-static";
---

<footer class="site-footer">
  Built with <span class="nav-icon" set:html={Split} /> obsidian-press
</footer>
```

**Step 2: Add inline-flex to footer for alignment**

Add to `site/src/styles/global.css` after `.site-footer`:

```css
.site-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}
```

Note: This replaces `text-align: center` since flexbox centering handles it.

**Step 3: Verify visually**

Run: `cd site && npx astro dev`
Check: Footer shows "Built with [Split icon] obsidian-press" properly aligned

**Step 4: Commit**

```bash
git add site/src/components/Footer.astro site/src/styles/global.css
git commit -m "feat: add Lucide icon to footer"
```

---

### Task 4: Add callout icons via CSS

**Files:**
- Modify: `site/src/styles/callouts.css`

**Step 1: Add base icon styles for callout-title**

Add after the `.callout-title` rule in `callouts.css`:

```css
/* ── Callout icons ── */
.callout-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.callout-title::before {
  content: "";
  display: inline-block;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  background-color: var(--callout-border);
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}
```

**Step 2: Add per-type icon masks**

SVG data URIs from Lucide's 24x24 viewBox. Add after the base icon styles:

```css
/* Info: note, info */
.callout-note .callout-title::before,
.callout-info .callout-title::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 16v-4'/%3E%3Cpath d='M12 8h.01'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 16v-4'/%3E%3Cpath d='M12 8h.01'/%3E%3C/svg%3E");
}

/* ClipboardList: abstract */
.callout-abstract .callout-title::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='8' height='4' x='8' y='2' rx='1' ry='1'/%3E%3Cpath d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/%3E%3Cpath d='M12 11h4'/%3E%3Cpath d='M12 16h4'/%3E%3Cpath d='M8 11h.01'/%3E%3Cpath d='M8 16h.01'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='8' height='4' x='8' y='2' rx='1' ry='1'/%3E%3Cpath d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/%3E%3Cpath d='M12 11h4'/%3E%3Cpath d='M12 16h4'/%3E%3Cpath d='M8 11h.01'/%3E%3Cpath d='M8 16h.01'/%3E%3C/svg%3E");
}

/* CircleCheck: todo */
.callout-todo .callout-title::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='m9 12 2 2 4-4'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='m9 12 2 2 4-4'/%3E%3C/svg%3E");
}

/* Lightbulb: tip */
.callout-tip .callout-title::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5'/%3E%3Cpath d='M9 18h6'/%3E%3Cpath d='M10 22h4'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5'/%3E%3Cpath d='M9 18h6'/%3E%3Cpath d='M10 22h4'/%3E%3C/svg%3E");
}

/* Check: success, done, check */
.callout-success .callout-title::before,
.callout-done .callout-title::before,
.callout-check .callout-title::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E");
}

/* TriangleAlert: warning, attention, caution */
.callout-warning .callout-title::before,
.callout-attention .callout-title::before,
.callout-caution .callout-title::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3'/%3E%3Cpath d='M12 9v4'/%3E%3Cpath d='M12 17h.01'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3'/%3E%3Cpath d='M12 9v4'/%3E%3Cpath d='M12 17h.01'/%3E%3C/svg%3E");
}

/* X: danger, failure */
.callout-danger .callout-title::before,
.callout-failure .callout-title::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 6 6 18'/%3E%3Cpath d='m6 6 12 12'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 6 6 18'/%3E%3Cpath d='m6 6 12 12'/%3E%3C/svg%3E");
}

/* Bug: bug */
.callout-bug .callout-title::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m8 2 1.88 1.88'/%3E%3Cpath d='M14.12 3.88 16 2'/%3E%3Cpath d='M9 7.13v-1a3.003 3.003 0 1 1 6 0v1'/%3E%3Cpath d='M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6'/%3E%3Cpath d='M12 20v-9'/%3E%3Cpath d='M6.53 9C4.6 8.8 3 7.1 3 5'/%3E%3Cpath d='M6 13H2'/%3E%3Cpath d='M3 21c0-2.1 1.7-3.9 3.8-4'/%3E%3Cpath d='M20.97 5c0 2.1-1.6 3.8-3.5 4'/%3E%3Cpath d='M22 13h-4'/%3E%3Cpath d='M17.2 17c2.1.1 3.8 1.9 3.8 4'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m8 2 1.88 1.88'/%3E%3Cpath d='M14.12 3.88 16 2'/%3E%3Cpath d='M9 7.13v-1a3.003 3.003 0 1 1 6 0v1'/%3E%3Cpath d='M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6'/%3E%3Cpath d='M12 20v-9'/%3E%3Cpath d='M6.53 9C4.6 8.8 3 7.1 3 5'/%3E%3Cpath d='M6 13H2'/%3E%3Cpath d='M3 21c0-2.1 1.7-3.9 3.8-4'/%3E%3Cpath d='M20.97 5c0 2.1-1.6 3.8-3.5 4'/%3E%3Cpath d='M22 13h-4'/%3E%3Cpath d='M17.2 17c2.1.1 3.8 1.9 3.8 4'/%3E%3C/svg%3E");
}

/* AlertCircle: important */
.callout-important .callout-title::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='12' x2='12' y1='8' y2='12'/%3E%3Cline x1='12' x2='12.01' y1='16' y2='16'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='12' x2='12' y1='8' y2='12'/%3E%3Cline x1='12' x2='12.01' y1='16' y2='16'/%3E%3C/svg%3E");
}

/* HelpCircle: question, help, faq */
.callout-question .callout-title::before,
.callout-help .callout-title::before,
.callout-faq .callout-title::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'/%3E%3Cpath d='M12 17h.01'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'/%3E%3Cpath d='M12 17h.01'/%3E%3C/svg%3E");
}

/* Quote: quote, cite */
.callout-quote .callout-title::before,
.callout-cite .callout-title::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z'/%3E%3Cpath d='M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z'/%3E%3Cpath d='M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z'/%3E%3C/svg%3E");
}

/* List: example */
.callout-example .callout-title::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 12h.01'/%3E%3Cpath d='M3 18h.01'/%3E%3Cpath d='M3 6h.01'/%3E%3Cpath d='M8 12h13'/%3E%3Cpath d='M8 18h13'/%3E%3Cpath d='M8 6h13'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 12h.01'/%3E%3Cpath d='M3 18h.01'/%3E%3Cpath d='M3 6h.01'/%3E%3Cpath d='M8 12h13'/%3E%3Cpath d='M8 18h13'/%3E%3Cpath d='M8 6h13'/%3E%3C/svg%3E");
}
```

Note: The collapsible callout `details > summary.callout-title` already has `display: flex` and uses `::before` for the collapse arrow. To handle the conflict:

- For non-collapsible callouts (`.callout > .callout-title`): use `::before` for the icon
- For collapsible callouts (`details.callout > summary.callout-title`): move the collapse arrow to `::after` and use `::before` for the icon

**Step 3: Verify visually**

Run: `cd site && npx astro dev`
Check: Callout titles show colored icons matching their type

**Step 4: Commit**

```bash
git add site/src/styles/callouts.css
git commit -m "feat: add Lucide callout icons via CSS mask-image"
```

---

### Task 5: Add copy-to-clipboard button on code blocks

**Files:**
- Modify: `site/src/layouts/PostLayout.astro`
- Modify: `site/src/styles/post.css`

**Step 1: Add client-side script to PostLayout.astro**

Add before closing `</BaseLayout>`. This uses vanilla JS with DOM creation methods (no innerHTML) for safety. The SVG icons are hardcoded Lucide Copy and Check icons — no user content is involved.

```html
<script>
  function createCopySvg() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("width", "14");
    rect.setAttribute("height", "14");
    rect.setAttribute("x", "8");
    rect.setAttribute("y", "8");
    rect.setAttribute("rx", "2");
    rect.setAttribute("ry", "2");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2");
    svg.appendChild(rect);
    svg.appendChild(path);
    return svg;
  }

  function createCheckSvg() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    const polyline = document.createElementNS(ns, "polyline");
    polyline.setAttribute("points", "20 6 9 17 4 12");
    svg.appendChild(polyline);
    return svg;
  }

  function initCopyButtons() {
    document.querySelectorAll("pre.shiki").forEach((pre) => {
      if (pre.parentElement?.querySelector(".copy-btn")) return;

      const wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper";
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.ariaLabel = "Copy code";
      btn.appendChild(createCopySvg());

      btn.addEventListener("click", async () => {
        const code = pre.textContent || "";
        await navigator.clipboard.writeText(code);
        btn.replaceChildren(createCheckSvg());
        btn.classList.add("copied");
        setTimeout(() => {
          btn.replaceChildren(createCopySvg());
          btn.classList.remove("copied");
        }, 1500);
      });

      wrapper.appendChild(btn);
    });
  }
  initCopyButtons();
  document.addEventListener("astro:after-swap", initCopyButtons);
</script>
```

**Step 2: Add copy button CSS to post.css**

Add after the `.code-block pre` rule:

```css
/* ── Copy button ── */
.code-block-wrapper {
  position: relative;
}

.copy-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: var(--c-code-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 0.3rem;
  cursor: pointer;
  color: var(--c-text-muted);
  opacity: 0;
  transition: opacity 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.code-block-wrapper:hover .copy-btn,
.copy-btn:focus-visible {
  opacity: 1;
}

.copy-btn:hover {
  color: var(--c-text);
}

.copy-btn.copied {
  color: #22c55e;
  opacity: 1;
}
```

**Step 3: Verify visually**

Run: `cd site && npx astro dev`
Check: Hover over code blocks shows copy button, clicking copies and shows check icon

**Step 4: Commit**

```bash
git add site/src/layouts/PostLayout.astro site/src/styles/post.css
git commit -m "feat: add copy-to-clipboard button on code blocks"
```

---

### Task 6: Final verification and build

**Step 1: Full build test**

Run: `cd site && npx astro build`
Expected: Build succeeds with no errors

**Step 2: Visual verification checklist**

Run: `cd site && npx astro dev`

- [ ] Header: Split + "obsidian-press", Tags + "Tags", Waypoints + "Graph"
- [ ] Footer: Split icon inline with "Built with obsidian-press"
- [ ] Callout note: blue Info icon
- [ ] Callout warning: yellow TriangleAlert icon
- [ ] Callout tip: green Lightbulb icon
- [ ] Collapsible callout: icon + collapse arrow coexist
- [ ] Code block: copy button appears on hover, copies text, shows check

**Step 3: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: clean up UI icons implementation"
```
