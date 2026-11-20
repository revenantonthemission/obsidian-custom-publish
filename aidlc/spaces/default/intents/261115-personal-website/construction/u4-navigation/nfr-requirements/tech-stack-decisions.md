# Tech Stack Decisions — U4 `u4-navigation`

Upstream: codekb `technology-stack.md`; `construction/u4-navigation/functional-design/frontend-components.md`, `rules.md`; `inception/requirements-analysis/requirements.md` (NFR2, NFR3, NFR6); team Code Style.

U4 adds no dependency, no runtime and no new file type. It edits four existing chrome files and `chrome.css`.

| Area | Decision | Rationale | Alternatives rejected |
|---|---|---|---|
| Model and marker | Pure TypeScript in the existing `site/src/lib/navigation.ts`: one frozen primary item, a new `resolveNavigationMarker(pathname)`, and frozen per-item states | unit-testable without a build; deterministic (NFR4.8); keeps the module's current boundary and its existing validation | computing the marker inside `Header.astro` or `MobileNav.tsx` (untestable outside a browser); a client-side router or island (adds JavaScript, fails NFR3.3) |
| Rendering | Astro server-rendered `Header.astro` plus the existing Preact `MobileNav.tsx`; the sheet stays a native `<details>` disclosure with static HTML | no new island (NFR2.3), works without JavaScript (NFR3.3), same pattern as today | a new navigation Web Component or island; CSS-only path matching |
| Current-state attribute | `aria-current="page"` on `/writing`, `aria-current="true"` on `/writing/<anything>`, absent elsewhere; the same indicator for both values | the ARIA current-state vocabulary announced by assistive technology; matches C3 and BR1.3 | a `data-current` attribute or class only (announces nothing to assistive technology); `aria-current="location"` (different meaning, not requested) |
| Styles | Extend the existing `site/src/styles/chrome.css` attribute selectors to `[aria-current='true']`; only `--c-` tokens | reuses the existing indicator; adds no stylesheet, font or image (NFR2.3/NFR6.11) | a new `navigation.css`; changing `global.css` |
| Profile navigation | Keep `ProfileLocalNavigation.astro` and its model untouched | FR6.3, BR1.5; the profile shell is outside U4's scope | folding the profile routes into the primary model |
| Tests | Existing harness only: Vitest (unit), fast-check (U1-P10 property), Playwright plus axe (`hig-chrome.spec.ts`, `HIG_ROUTES`) | team TDD posture; no new devDependency | adding a new test framework or screenshot baselines |
| Out of scope | No change to the preprocessor, the static server, the redirect table or the `/writing` routes (U2/U3) | contracts C1, C2, C4 stay with their owners | — |
