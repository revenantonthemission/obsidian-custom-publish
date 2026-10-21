# HIG Redesign: Follow-ups

Closed on 2026-10-21, after the HIG redesign and the résumé certifications work. Each code change has its own branch off `develop`, merged with `--no-ff`. Nothing was pushed.

## Design changes confirmed by the maintainer

The maintainer confirmed all seven recorded departures as the design on 2026-10-21. Nothing goes back to the mockup.

| Departure | Where it is recorded |
|---|---|
| R-23: a link inside a highlight is `--c-tint-hover`, and hover thickens its underline | `construction/code-generation/reviews/review-03.md` |
| Search snippets wrap to two clamped lines instead of the mockup's one line | `code-summary.md`, loop-back 2 (R-18) |
| The selected segment always gets a 1 px `--c-segment-indicator` ring | `code-summary.md`, Step 43, departure 1 |
| In dark mode the selected search option's snippet is `--c-text` | `code-summary.md`, Step 43, departure 2 |
| A highlighted code line has a 6% gray fill and a 3 px `--c-tint` bar | `code-summary.md`, Step 43, departure 3 |
| The light `mark` fill is orange at 20% | `code-summary.md`, Step 43, departure 4 |
| The current tag chip keeps its tint capsule on the grouped background | `code-summary.md`, Step 43, departure 5 |

## Review findings

| Finding | Change | Merge |
|---|---|---|
| R-01: `katex` undeclared | `katex` declared, plus `@shikijs/types`, which `render.ts` imports for types and which was undeclared too. The new `tests/unit/declared-dependencies.test.ts` fails on any undeclared import in `src/`. | `f4ba184` |
| R-16: the first image loads eagerly wherever it sits | The first image, or diagram pair, is the lead image only when at most `LEAD_IMAGE_MAX_PRECEDING_CHARS` (280) non-space characters come before it. On the real content, 11 of the 113 posts with images keep an eager lead image. | `6659aad` |

## Tooling and dependencies

- **Coverage:** `npm run test:coverage` (`@vitest/coverage-v8`) writes `.artifacts/coverage/`. Coverage is reported, not enforced. The unit suite's first figure is 53.0% of lines, 50.9% of branches and 56.8% of functions in `src/` and `scripts/`. Merged as `dcbce8d`.
- **Dependencies:** production advisories went from 27 to 6, merged as `282b4fd`.
  - `npm audit fix` brought Astro from 6.1.5 to 6.4.8.
  - `vite` moved to 7.3.7, and `sharp` to 0.35.5 through `overrides`.
  - Astro 6.4.8's island runtime changed one inherited inline script, so its baseline in `asset-budget.mjs` moved to the new bytes. Those bytes are identical to `astro/dist/runtime/server/astro-island.prebuilt.js`.
  - **What remains:**
    - The critical Astro advisory, GHSA-26w7-cxv4-gfx2, remote code execution through AVIF image optimization. It is fixed only in Astro 7, and this site never uses Astro's image pipeline.
    - Five low advisories: the KaTeX chain, with no fix released, and an esbuild issue on the Windows dev server.
- **Link sweep on real content:** with `VAULT_PATH` set to `Areas/Notes` and read only, without `--stamp-published`, all 11,473 internal references across 259 pages resolve, and the no-JS navigation checks pass 8 of 8.

## Resolved after the first pass

- **The vault note `Infrastructure as Code.md`:** its D2 diagram used the reserved keyword `vars` as a node. The maintainer fixed it, and the real folder now preprocesses with every diagram rendered.
- **The diagram failure message:** the preprocessor now records each failed diagram's language and post, names them in the final error, and gives the Mermaid browser hint only when a Mermaid diagram failed. Merged as `671bd11`.
- **Astro 7:** Astro 7.4.1, `@astrojs/preact` 6.1.0 and Vite 8.3.5, with Node at least 22.22. No critical or high advisory remains; production keeps only the four low ones in the KaTeX chain, which have no fix. Merged as `8c839b7`.
  - Vite 8 minifies CSS with Lightning CSS, which rewrites at-rule strings to double quotes with `\"` escapes. The Pretendard `@license` metadata is now written in that form, so the OFL notice ships byte for byte.
  - The three Astro island loaders took Astro 7's own bytes, and the search dispatcher took Vite 8's backtick strings, which are the same statements. Each was checked before its baseline moved.
  - The C-13 check now counts an svg inside an `aria-hidden="true"` ancestor as hidden. KaTeX draws stretchy symbols that way, and the real content failed only on those.

## Open

- **The manual 16-state review:** the record needs digest `494dc4dfaa6f02521e9ef5c8624161c2d59c8e0bb8bb9c9ba6adaea0eb26956b`, after the Astro 7 upgrade.
- **Dev-only advisories:** three moderate Vitest advisories, which only Vitest 5 fixes.
- **The npm cache:** part of `~/.npm/_cacache` is owned by another user.
