# Accessibility Checklist — first release

Target: WCAG 2.2 AA plus the site's HIG rules (requirements NFR1, NFR3). Each line becomes a Playwright or unit check, written before the code (team Testing Posture).

## Every New or Changed Page (`/`, `/writing`, `/writing/all`, `/writing/tags`, `/writing/tags/<tag>`, `/writing/graph`)

- [ ] axe WCAG 2.2 AA: no violations at 320, 768, 1024, 1440 px, light and dark
- [ ] Reduced motion: no transform animation when `prefers-reduced-motion: reduce`
- [ ] Exactly one `<h1>`; each section has an `<h2>`; no heading level skipped
- [ ] Landmarks: `<header>`, `<nav aria-label="주요 탐색">`, `<main id="main-content">`; skip link first in tab order
- [ ] Every interactive control (capsules, rows, nav items, back link, sheet button) has a target of at least 44 × 44 px; inline text links inside prose are exempt
- [ ] Focus is visible on every control; focus is never fully hidden under the bar or a sticky year header (WCAG 2.2 2.4.11)
- [ ] All content and links work with JavaScript off (`just crossunit`)
- [ ] No request to another origin
- [ ] `lang="ko"` on `<html>`; English labels are short proper nouns
- [ ] Text contrast ≥ 4.5:1, UI component contrast ≥ 3:1, in light and dark

## Homepage

- [ ] h1 "Passion Project"; document title "Passion Project"
- [ ] Capsules are links with visible text, inside `<nav aria-label="프로필 바로가기">`
- [ ] Empty week row is plain text, not a link

## `/writing/all`

- [ ] Year headings are `<h2>`, reachable by heading navigation
- [ ] Sticky year header: text contrast holds over any row beneath; solid background under `prefers-reduced-transparency`
- [ ] Each row exposes title and full date (`<time datetime>`)

## Navigation

- [ ] `aria-current="page"` only on `/writing`; `aria-current="true"` on Writing sub-pages; none elsewhere
- [ ] Current state shown by more than colour (indicator shape)
- [ ] Navigation sheet lists Writing and works with JavaScript off

## Pages Whose Header Changes (posts, hubs, `/resume`, `/portfolio`, 404)

- [ ] Existing HIG suites still pass with the one-item top bar
- [ ] Profile local navigation unchanged

## Manual Review

- [ ] The owner redoes the 16-state manual accessibility review once, after all first-release pages are done (feasibility Q5)
