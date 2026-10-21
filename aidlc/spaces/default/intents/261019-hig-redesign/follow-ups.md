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

## Open

- **The manual 16-state review:** `site/package.json` and `scripts/profile/asset-budget.mjs` changed, so the record needs digest `d1dc47492c27136d18a640ba7ce7bb1bbfe4cba8f2e5b88140b93469d6174b98`.
- **The vault note `Computer Engineering/Infrastructure/Infrastructure as Code.md`:**
  - Its Ansible D2 diagram names a node `vars`, a reserved D2 keyword (`strategy -> vars`, D2 error 19:13). Preprocessing the real vault fails on it, and so would the nightly publish.
  - The preprocessor's error message blames `mmdc` for every failed diagram, including this D2 one.
- **Astro 7:** a major upgrade, needed only to clear the last critical advisory.
