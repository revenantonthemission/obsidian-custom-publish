# Responsive Web Design — Design Document

Date: 2026-03-17
Goal: Make the site fully usable on tablet (768px) and phone (375px) while preserving the editorial aesthetic.

## Breakpoint System

Three breakpoints, mobile-first `min-width` queries:

| Value | Purpose |
|---|---|
| 480px | Phone spacing, font sizes, touch targets |
| 768px | Hamburger→inline nav transition, hover preview disable |
| 960px | Sidebar appears as desktop column (existing) |

## 1. Hamburger Menu (< 768px)

- Desktop (768px+): current inline nav links
- Mobile (< 768px): site title + hamburger icon (lucide `Menu`/`X`)
- Tap opens dropdown panel below header with stacked nav links, 48px touch targets, 150ms slide transition
- New Preact island `MobileNav.tsx` handles open/close state
- CSS hides inline nav at < 768px, shows hamburger; reverse at 768px+
- ThemeToggle moves into dropdown on mobile

## 2. Mobile TOC/Nav Floating Button + Overlay

- Floating button: fixed bottom-right, `2.5rem` circle, lucide `List` icon, same styling as back-to-top. Post pages only, < 960px.
- Tap opens full-screen overlay with semi-transparent backdrop
- Two tabs inside overlay: "목차" (TOC) and "탐색" (Nav Tree)
- No local graph on mobile (canvas too small to be useful)
- New Preact island `MobileSidebar.tsx` with `client:visible`
- Extracts TOC from headings client-side (same regex as TableOfContents.astro)
- Back-to-top button shifts up to avoid overlap

## 3. Spacing & Typography

| Property | < 480px | 480–768px | 768px+ |
|---|---|---|---|
| `.site-main` padding | `1.5rem 1rem` | `2rem 1.25rem` | `2rem 1.5rem` |
| `.post-title` | `1.5rem` | `1.75rem` | `2rem` |
| `h1` | `1.4rem` | `1.6rem` | `1.75rem` |
| `h2` | `1.2rem` | `1.3rem` | `1.35rem` |
| Back-to-top | `1rem` from edges | `1.5rem` | `2rem` |

Touch targets below 768px: nav links padded to 48px height, copy button enlarged, tag links padded.

No `clamp()` — simple breakpoint steps matching the site's straightforward design.

## 4. Component-specific Fixes

- **Search modal**: < 480px width 95%, no max-width cap
- **Link preview tooltip**: disabled below 768px (no hover on touch)
- **Hub prev/next**: stacks vertically below 480px
- **Code blocks**: < 480px padding reduced to 0.75rem, language badge hidden
- **Graph page**: < 768px aspect ratio 3:4 (portrait), hint text "핀치하여 확대"

## Files to Change

| File | Change |
|---|---|
| `site/src/styles/global.css` | Breakpoint media queries for spacing, typography, header, back-to-top |
| `site/src/styles/post.css` | Post title scaling, code block mobile, floating button, overlay |
| `site/src/styles/search.css` | Mobile search modal width |
| `site/src/styles/link-preview.css` | Disable below 768px |
| `site/src/components/Header.astro` | Add hamburger button markup, conditional CSS |
| `site/src/islands/MobileNav.tsx` | New — hamburger menu state |
| `site/src/islands/MobileSidebar.tsx` | New — floating TOC/nav overlay |
| `site/src/layouts/PostLayout.astro` | Add MobileSidebar island |
| `site/src/pages/graph.astro` | Portrait aspect ratio + hint text on mobile |
| `site/src/components/HubNav.astro` | Vertical stack on phone |
