# Performance Design — U2 `u2-writing-section`

Upstream: `nfr-requirements/performance-requirements.md` (NFR1.5–NFR1.8, NFR4.7, NFR6.8), `tech-stack-decisions.md`; `functional-design/functional-spec.md`, `rules.md`, `frontend-components.md`.

## 1. Approach

All work happens at build time. Pages are static HTML with no island, so request-time performance is the HTML weight plus the shared CSS. Lists are computed once per page from metadata that is already loaded in memory.

| Concern | Design | Requirement |
|---|---|---|
| No new JavaScript | Plain Astro markup. `/writing` and `/writing/all` use `BaseLayout` only, the same layout as `/tags`, so their script requests must equal those of `/tags`. | NFR1.5 |
| Sticky header cost | `position: sticky` with the existing `data-material` glass (`base.css`). No scroll listener, no animation. Under reduced transparency the header uses `--c-bg-grouped` (a U2 override on `.year-header`, because the material's default fallback is `--c-surface`). | NFR1.6 |
| `/writing/all` weight | A compact row is one `<li><a>` with the title and one `<time>`: no summary, no image, no reading time. Measured on the real-content build as `dist/writing/all/index.html` bytes ÷ ordinary-post count ≤ 2,048 B, and the file ≤ 350 KB at the count measured that day. | NFR1.7 |
| Homepage weight | The weekly card reuses `PostCard`. The only new file is `writing.css`, which is shared. The baseline is the U1 after-measurement recorded in U1's `code-summary.md` (229,036 B transferred on the fixture build). The weekly rows' Korean glyphs pull one extra Pretendard subset (25,716 B) on top of the rows' markup, so the maintainer reset the budget on 2026-11-20 — a human-made requirement change — from 229,036 B + 4,096 B per row (237,228 B) to the measured 255,387 B. Pass when `/` ≤ 255,387 B. A custom subset for the weekly rows' glyphs stays a follow-up. | NFR1.8 |
| List building | One stable sort per list (`published` desc, `title` asc by code point, then `slug` asc), then linear grouping. No nested scans. | NFR4.7 |
| Build time | No new data loading: the lists read from the `getAllPostMeta()` cache. Pass when the median of 3 `npx astro build` runs on the fixture content is ≤ 1.10 × the median of 3 U1 builds on the same machine. | NFR6.8 |

## 2. CSS budget

`writing.css` stays small (target ≤ 3 KiB unminified). It is loaded only by `/`, `/writing` and `/writing/all`. Those pages stay under the existing 30 KiB per-route CSS budget once they are added to `HIG_ROUTES`; the existing HIG performance check enforces it.

## 3. Measurement procedure (Build and Test)

1. **Real content:** build with `just preprocess` using `VAULT_PATH` set to a copy of `Areas/Notes` and no stamping. Never use `deploy-preprocess`, which stamps the vault. Record the size of `/writing/all/index.html` and the ordinary-post count.
2. **Homepage weight:** on the fixture HIG build, record the bytes transferred for `/` and the weekly-row count (with the HIG runner's fixed build date).
3. **Build time:** time the fixture build, median of 3, at the U1 head and the U2 head.
4. Grade NFR1.7, NFR1.8 and NFR6.8 Met or Not Met. A missed target is never relaxed.
