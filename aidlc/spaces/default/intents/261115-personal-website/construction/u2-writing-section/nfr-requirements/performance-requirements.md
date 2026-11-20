# Performance Requirements — U2 `u2-writing-section`

Upstream: `inception/requirements-analysis/requirements.md` (NFR1, NFR3, NFR4, NFR6, NFR8); `construction/u2-writing-section/functional-design/functional-spec.md`, `rules.md` (BR1.x, BR2.x); codekb `technology-stack.md`.

U2 adds three server-rendered views. Nothing runs at request time: the pages are static HTML built nightly. The performance concerns are page weight, build cost, and the sticky-header rendering on `/writing/all`.

## Requirements

| ID | Requirement | Target | Measurement | Source |
|---|---|---|---|---|
| NFR1.5 | `/writing` and `/writing/all` load no JavaScript of their own: no island, and no `<script>` beyond the site-wide chrome scripts every page already has | 0 new scripts | Playwright: compare the script request set of `/writing/all` with `/posts/simple-post/` | NFR3, design (no islands) |
| NFR1.6 | The sticky year header animates nothing and uses only `position: sticky` and the existing glass material | no transform or opacity animation on headers | CSS review plus the reduced-motion check | team web rules |
| NFR1.7 | `/writing/all` stays light as the post count grows | HTML ≤ 2 KB per post row on average and no images in rows; for today's 155 posts the page is ≤ 350 KB uncompressed | build the real-content site once in Build and Test and measure `dist/writing/all/index.html` | NFR8; open question about splitting above ~500 posts |
| NFR1.8 | The homepage stays no heavier than after U1 apart from the weekly rows; the weekly rows' Korean glyphs pull one extra Pretendard subset (25,716 B) beyond the rows' own markup, and that one-time font cost is accepted as a known cost | `/` transferred bytes ≤ 255,387 B, the value measured on the assembled build (Build and Test runs 2–4). The budget was reset from 237,228 B by the maintainer on 2026-11-20, recorded as a human-made requirement change. No new font, image or stylesheet file beyond `writing.css`; a custom subset for the weekly rows' glyphs stays a follow-up | HIG performance request log on `/` | NFR1, U1 baseline; maintainer requirement change 2026-11-20 |
| NFR4.7 | List building is linear after one sort | `weekPosts`, `recentPosts`, `postsByYear`, `topics` are O(n log n) in post count | review plus a property test at 1,000 generated posts finishing within the existing PBT run time | NFR4 |
| NFR6.8 | Build time stays flat | `npx astro build` on the fixture content gains less than 10 % against the U1 build | Build and Test timing | NFR6 |
