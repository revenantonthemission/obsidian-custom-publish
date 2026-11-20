# Logical Components — U2 `u2-writing-section`

Upstream: `inception/domain-design/components.md` (WritingLists, WritingPages, HomePage); `functional-design/frontend-components.md`; the NFR designs in this folder.

| Logical component | File | NFR patterns | Failure domain | Blast radius |
|---|---|---|---|---|
| ContentData (extended) | `site/src/lib/data.ts` | `WR001` fail-closed on missing metadata | site build | the build fails loudly, so nothing deploys |
| KoreanBuildDate | `site/src/lib/writing-lists.ts` (`resolveKoreanBuildDate(env, now)`) | injectable clock; validated override | homepage weekly list | wrong week shown; unit- and property-tested |
| WritingLists | `site/src/lib/writing-lists.ts` | pure, frozen, total order | the three pages | wrong order or membership; NFR8 equality test |
| WritingPages | `site/src/pages/writing/index.astro`, `writing/all.astro`, `components/writing/*` | static, no island, text-only rendering | `/writing`, `/writing/all` | page-level; Playwright and axe gate |
| HomePage weekly card | `site/src/pages/index.astro` | replaces the interim list | `/` | page-level |
| writing.css | `site/src/styles/writing.css` | sticky glass with solid fallback; tokens only | three pages | visual only |

**Shared resources:**
- `content/meta` is read-only, from U1.
- `PostCard.astro` is reused unchanged.
- `HIG_ROUTES` is extended.
- `homepage.ts` loses `filterTodayPosts` and `resolveBuildDate` when the interim list goes, along with their tests.
- The fixture vault gains an undated post and a second-year post.
