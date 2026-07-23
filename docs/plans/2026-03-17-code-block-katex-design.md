# Code Block & KaTeX Styling Design

Date: 2026-03-17
Goal: Sharpen code block design (visual polish + language badge) and fix inline KaTeX size mismatch.

## 1. Inline KaTeX Size Fix

KaTeX's default CSS sets `.katex` to `font-size: 1.21em`, making inline math 21% larger than surrounding text. Override for inline context only:

```css
.post-content > p .katex,
.post-content > li .katex {
  font-size: 1em;
}
```

Display math (`.katex-display`) keeps the default — block math benefits from the larger size for readability.

## 2. Code Block Visual Polish

- Add explicit `padding: 1rem` to `.code-block pre` for consistent spacing
- Add subtle box-shadow for depth alongside existing border
- Larger copy button hit target with smoother hover transition
- Unify font-size: change inline code from `0.875em` to match pre code sizing

## 3. Language Badge

Show code language using Shiki's existing `data-language` attribute on `<pre>`:

```css
.code-block pre.shiki::before {
  content: attr(data-language);
  position: absolute;
  top: 0.4rem;
  right: 3rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--c-text-muted);
  opacity: 0.6;
}
```

- Muted uppercase label (e.g. `PYTHON`, `RUST`)
- Positioned left of copy button to avoid overlap
- Hidden when `.code-filename` is present (filename already implies language)
- Pure CSS — no preprocessor or rendering pipeline changes needed

## Scope

All changes are CSS-only in `post.css` and `global.css`. No Rust preprocessor or Astro rendering changes required.
