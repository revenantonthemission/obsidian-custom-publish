# Security Design — U2 `u2-writing-section`

Upstream: `nfr-requirements/security-requirements.md` (NFR5.19, NFR5.20, NFR2.2, NFR3.2, NFR1.9, NFR1.10, NFR6.9); `functional-design/rules.md` (BR1.1, BR2.5, BR2.6); `inception/contract-design/contract-summary.md` (C2).

## 1. Approach

U2 has no runtime and takes no visitor input. Its security work comes down to four things:

- list only what U1 published as an ordinary post;
- render text as text;
- add no origin;
- fail the build instead of shipping a silently empty site.

| Layer | Control | Requirement |
|---|---|---|
| Input boundary | The list functions take only `PostMeta` entries with `is_hub === false` from `content/meta`. Site pages and the retired note never reach `meta/` (U1). | NFR5.19 |
| Missing data | If `content/meta` is missing or contains zero entries while `content/manifest.json` lists `posts/*`, the build throws a coded `WR001` error naming the path. A genuinely empty site, with no posts in the manifest either, renders the empty states. | NFR5.19 (fail closed, NFR review finding) |
| Output encoding | Titles, summaries, counts and dates go through Astro text expressions. `set:html` is used only for decorative icons, as `PostCard` does today. | NFR5.20 |
| Origins | No external font, script or image. All links are same-origin paths. | NFR2.2 |
| No-JS | Anchors only. The sticky header is CSS-only. | NFR3.2 |
| Accessibility | One h1 and an h2 per section. 44 px rows, capsules and back link. Rows on `/writing/all` get `scroll-margin-block-start: calc(var(--bar-inset) * 2 + var(--bar-height) + var(--year-header-height))`, so focus is never hidden under a stuck header (WCAG 2.2 2.4.11). | NFR1.9, NFR1.10 |

## 2. Tests (written first)

| Test | Asserts |
|---|---|
| `writing-lists.test.ts` | hubs and undated posts are handled per BR1.1, BR1.3 and BR1.4; output is frozen; identical input gives identical output (deterministic HTML input) |
| `writing-lists.pbt.test.ts` | every ordinary post appears exactly once in `postsByYear`; ordering holds for random titles, including Korean and identical dates; the slug tiebreak gives a total order |
| `content-data.test.ts` (extended) | `WR001` when the metadata is missing but the manifest lists posts |
| `hig-writing.spec.ts` | the NFR8 equality on `/writing/all`, plus the click from `/writing` → "모든 글 보기" → `/writing/all`; same-origin request log; one h1; 44 px targets; focus on a row under a stuck header is fully visible; a fixture title containing `<b>` and `&` renders literally |
| `crossunit.spec.ts` (extended) | `/writing` and `/writing/all` with JavaScript off |
| `HIG_ROUTES` + `hig-chrome.spec.ts` | axe at 4 widths × 2 themes, plus reduced motion, for `/writing` and `/writing/all` |

## 3. Residual risk

A post title that is legitimately very long or unusual still renders as text. It can only affect layout, which the 320 px overflow checks cover.
