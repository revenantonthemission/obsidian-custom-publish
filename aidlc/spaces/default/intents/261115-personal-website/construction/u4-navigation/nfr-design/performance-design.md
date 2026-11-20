# Performance Design — U4 `u4-navigation`

Upstream: `nfr-requirements/performance-requirements.md` (NFR4.8, NFR6.11, NFR1.14); `nfr-requirements/tech-stack-decisions.md`; `functional-design/functional-spec.md`, `rules.md`, `frontend-components.md`; `inception/contract-design/contract-summary.md` (C3).

## 1. Approach

U4 changes the chrome of every page and adds no route, no data and no runtime. Every cost is build-time.

| Concern | Design | Requirement |
|---|---|---|
| Marker cost | `resolveNavigationMarker(pathname)` in `site/src/lib/navigation.ts` is a pure O(1) string function: one `split(/[?#]/, 1)` for the query and fragment, one trailing-slash trim, then two prefix comparisons against `/writing`. It is called once per page through `getPrimaryNavigationState(pathname)`, which `Header.astro` calls once per build. No file, clock, environment, DOM or locale is read. | NFR4.8 |
| Determinism | The models, the items and the states are frozen with `Object.freeze`; inputs are never mutated. The comparison is code-unit `startsWith`, never a locale-aware compare, so a Korean tag segment is never compared at all — only the `/writing` prefix is. The same pathname always yields the same frozen state. | NFR4.8 |
| Page weight | The primary navigation goes from four items to one on each of the two surfaces (four leave: Tags, Graph, Résumé, Portfolio; Writing stays), so the nav block shrinks by three anchors per surface. No new file: `chrome.css` gains two attribute selectors, no new stylesheet, font, image or script. | NFR6.11 |
| Script requests | The Writing item is a plain anchor. `Header.astro` keeps its current script set and `MobileNav` stays static HTML, so the request set of every page is unchanged. | NFR6.11 |
| Build time | No new data loading and no new build step: the marker is a function call per page over a string that Astro already has. The Astro config, the pipeline and the fixture set are untouched. | NFR1.14 |
| Motion | The marker reuses the indicator that already exists — font-weight 600 plus a 2 px `--c-bar-indicator` underline in the bar, the check icon in the sheet. No `@keyframes`, no transition, no transform or opacity change is added, and `base.css` already neutralises animation under `prefers-reduced-motion: reduce`. | NFR1.14 |

## 2. Baselines

Every comparison below names a recorded number, where it was measured and the command that reproduces it. The numbers were measured at the U2 head by that unit's Construction verification and are copied here as this design's inputs: U4 adds no fixture and no route, so the same fixture content and the same HIG runner apply, and the commands in the last column reproduce every number at the U4 head. That reproduction is what Build and Test grades.

| Baseline | Value | Measured at | Reproduce with |
|---|---|---|---|
| Fixture `npx astro build`, median of 3 | 3.63 s (runs 4.75, 3.59, 3.63) | U2 head, Construction verification | `just preprocess` (fixture pair), then `cd site && npx astro build` three times |
| `/` transferred bytes, HIG fixture build | 255,351 B (decoded 334,567 B, 18 requests). This design's budget, reset by the maintainer on 2026-11-20 to the measured 255,387 B (human-made requirement change) | U2 head, Construction verification | `site/scripts/hig/build-and-serve.mjs`, then the Playwright request log |
| `/` transferred bytes, empty-week build | 229,097 B | U2 head, Construction verification | same, with a fixture week that has no posts |
| `/writing/all` HTML, real-content build | 107,795 B for 137 rows (787 B/row) | U2 head, Construction verification | `just preprocess` against a copy of `Areas/Notes`, then measure `dist/writing/all/index.html` |
| `site/src/styles/chrome.css` | 9,561 B | working tree at the U4 head | `wc -c site/src/styles/chrome.css` |

Targets: the fixture build median ≤ 3.81 s (1.05 × 3.63 s); `/` ≤ 255,387 B (the budget reset by the maintainer on 2026-11-20 as a human-made requirement change, from the 255,351 B baseline above) and `/writing/all` ≤ 107,795 B at the same post count; `chrome.css` ≤ 10,000 B.

## 3. Measurement procedure (Build and Test)

1. **Fixture content:** run `just preprocess` with the fixture pair so `content/` and `site/public/*.json` match the baseline; never run the stamping variant against the real vault.
2. **Build time:** time three fixture `npx astro build` runs and take the median. Grade NFR1.14 against 3.81 s.
3. **Page weight:** on the HIG fixture build, record the transferred bytes for `/` and the request count; on the real-content build, record `dist/writing/all/index.html` bytes and the ordinary-post count. Grade NFR6.11 against 255,387 B and 107,795 B.
4. **CSS budget:** record `wc -c site/src/styles/chrome.css`. Grade against 10,000 B.
5. **Determinism:** the unit suite asserts that two calls with the same pathname return equal frozen states and that no property of the environment is read; the property test generates `/writing` and `/writing/<segment>` paths. Grade NFR4.8 Met or Not Met.
6. A missed target is never relaxed. Where the baseline cannot be reproduced, record that fact and grade the absolute targets only.
