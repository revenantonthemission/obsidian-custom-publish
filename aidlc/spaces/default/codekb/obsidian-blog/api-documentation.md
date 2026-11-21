# API Documentation

The system has no network API of its own. Its interfaces are a CLI, a vault frontmatter contract, a generated file contract between the preprocessor and the site, static HTTP routes, JSON files fetched by islands, island props, and a set of npm/just commands.

## 1. Preprocessor CLI

```text
obsidian-press <VAULT> <OUTPUT> [--stamp-published]
```

| Argument | Meaning |
|---|---|
| `VAULT` | Folder to scan (production: `.../Obsidian Vault/Areas/Notes`; dev/test: `./fixtures/vault`). Never the whole vault. |
| `OUTPUT` | Output directory (always `./content`). |
| `--stamp-published` | Before scanning, write `published: <today>` into notes lacking it, or whose mtime date is later than their `published`. Notes without frontmatter get one. Modifies the vault. |

Exit codes and stderr:

| Condition | Output | Exit |
|---|---|---|
| Unknown or non-scalar `visibility` | `PUB001 <path>: unknown visibility value "x"` | 1, nothing written |
| No homepage | `PUB002 : scanned N sources, none declares visibility: homepage` | 1, nothing written |
| Several homepages | `PUB003 <first path>: N homepage sources declared: ...` | 1, nothing written |
| `![[Homepage]]` / `![[Homepage#Heading]]` / `![[Homepage#^id]]` in any note | `PUB004` / `PUB005` / `PUB006` per occurrence | 1, nothing written |
| Write failure | `PUB007 <path>: <io error>` | 1 |
| Any diagram failed to render | `N diagram render(s) failed: ...` (Mermaid failures add a `PUPPETEER_EXECUTABLE_PATH` hint) | 1, output already written |
| Success | progress lines on stdout, `Done.` | 0 |

Environment used indirectly: `PUPPETEER_EXECUTABLE_PATH` (Mermaid browser), `.puppeteer-config.json` in the cwd (optional), `d2`, `mmdc`, `typst`, `git` on `PATH`.

## 2. Vault Frontmatter Contract

| Key | Type | Effect |
|---|---|---|
| `tags` | list of strings | Tag pages, graph colours, related posts. May contain `/` (sanitized to `-` in URLs). |
| `created` | date/string | Fallback: file birth time. Emitted in meta, unused by the site. |
| `published` | date/string `YYYY-MM-DD` | Sort order, RSS, "오늘 발행된 글", hub child dates. |
| `is_hub` | bool | Hub page + `/hubs/<slug>` route + nav tree root/child. |
| `hub_parent` | string (note title) | Nests the note under that hub. |
| `description` | string | `<meta name="description">` for the post. |
| `visibility` | `post` (default) or `homepage` | Publication scope; anything else is PUB001. |

Note identity: title = file name without `.md`; slug = lowercased, spaces to `-`, only alphanumerics, Hangul and `-` kept. Excluded: names starting with `.` and folders named `Drafts`.

## 3. Generated File Contract (`content/`)

| Path | Producer | Consumer | Shape |
|---|---|---|---|
| `posts/<slug>.md` | `output.rs::write_posts` | `data.ts::getPostContent` | Markdown with embedded HTML (anchors, callouts, diagram containers, `<img>`). |
| `meta/<slug>.json` | `write_posts` (`OutputMeta`) | `data.ts::getAllPostMeta/getPostMeta` | `{ slug, title, tags[], created, published, updated, backlinks[], forward_links[], is_hub, hub_parent, description, reading_time_min, word_count, related_posts[] }` |
| `homepage/index.md` | `write_homepage` | `data.ts::getHomepage` | Transformed homepage body; must contain exactly one `<!-- profile:slot -->` line. |
| `homepage/meta.json` | `write_homepage` | `getHomepage` | `{ "title": string }` (non-empty, else HP002). |
| `assets/*` | diagram renderers, image copy | copied to `site/public/assets/`; `render.ts` reads sizes | `<slug>-<lang>-<n>-<light|dark>.svg`, binary D2 formats, copied images. |
| `graph.json` | `LinkGraph::to_graph_json` | `data.ts::getGraph`, `/graph` list, LocalGraph props, GraphView fetch | `{ nodes: [{ slug, title, tags, is_hub, backlink_count }], edges: [{ source, target }] }` (undirected, sorted, deduped). |
| `search-index.json` | `search.rs` | Search island fetch | `{ documents: [{ slug, title, snippet }], inverted_index: { token: [{ doc_idx, count }] } }` (tokens sorted). |
| `previews.json` | `preview.rs` | `data.ts::getPreviewSummary` (from `site/public/`), link-preview script | `{ <slug>: { title, tags, summary } }` |
| `nav-tree.json` | `nav_tree.rs` | NavTree island fetch | `{ roots: [NavTreeNode], orphans: [NavTreeNode] }`, `NavTreeNode = { slug, title, is_hub, children[] }` |
| `manifest.json` | `write_manifest` | none in the site (audit inventory) | Sorted list of every file written, excluding itself. |

All discovery artifacts are built from the posts-only view: the homepage never appears in `posts/`, `meta/`, the graph, search, previews or the nav tree. TypeScript mirrors of these shapes live in `site/src/lib/types.ts` (hand-maintained; `created` intentionally omitted).

## 4. Static HTTP Routes (site)

| Route | Source | Data | Notes |
|---|---|---|---|
| `/` | `pages/index.astro` | homepage artifact, today's posts, profile homepage projection | HP001–HP004 fail the build. |
| `/posts/<slug>` | `pages/posts/[slug].astro` | every `meta/*.json` (hubs included) | PostLayout. |
| `/hubs/<slug>` | `pages/hubs/[slug].astro` | metas with `is_hub` | Children = hub `forward_links`. |
| `/tags` | `pages/tags/index.astro` | `getTagIndex()` | Chips sorted by count. |
| `/tags/<tag>` | `pages/tags/[tag].astro` | `getTagIndex()` | `tag` is `sanitizeTag` output. |
| `/graph` | `pages/graph.astro` | `getGraph()` for the list tab; GraphView fetches `/graph.json` | Two segmented tabs. |
| `/resume` | `pages/resume.astro` | approved profile, résumé metadata, current PDF link | Profile resource policy. |
| `/portfolio` | `pages/portfolio.astro` | approved profile (role `data-engineer-ai`) | |
| `/portfolio/<role>` | `pages/portfolio/[role].astro` | `PORTFOLIO_ROLES` minus `/portfolio` → `product-engineer`, `infra-engineer` | |
| `/rss.xml` | `pages/rss.xml.ts` | posts with `published` | Item links `/posts/<slug>/` (trailing slash). |
| `/404` | `pages/404.astro` | five most recent non-hub posts | Served by the local server with status 404 for any missing path. |
| `/sitemap-index.xml` | `@astrojs/sitemap` | all pages | |
| `/resume.pdf`, `/favicon.*`, `/apple-touch-icon.png`, `/icon-192.png`, `/icon-512.png`, `/manifest.webmanifest`, `/robots.txt` | `site/public/` | static | `resume.pdf` changes only through the résumé release transaction. |
| `/search-index.json`, `/graph.json`, `/previews.json`, `/nav-tree.json`, `/assets/*` | copied into `site/public/` | preprocessor | Fetched at run time. |

There are no redirects anywhere today: Astro config has no `redirects`, and the local server cannot issue 3xx responses.

보완(금번 스캔): 위 문장은 빌드 시점의 라우트 정의에 관한 기존 기록이다. 현재 배포 경로에는 빌드 산출물이 생성하는 **`_redirects.json` 테이블**이 추가되어 있다(`site/scripts/publish-dist.sh:34-44`). 테이블은 `rsync` 단계에서 제외되고, 게시의 마지막에 임시 이름(`.redirects.json.tmp`)으로 복사된 뒤 `mv -f`로 원자적으로 교체된다. 스크립트 주석(`10-14`)에 따르면 서버는 파일의 존재/mtime 변경을 감지해 테이블을 다시 읽는다. 따라서 3xx 자체는 서버/테이블 계약의 영역이며, 이 스캔에서는 서버 구현 파일이 범위 밖이라 실제 301 emitting과 `Cache-Control` 헤더를 검증하지 않았다.

### Local server behaviour (`site/scripts/local-server.mjs`)

- `GET`/`HEAD` only (405 otherwise); URL decoded (400 on bad encoding).
- Rewrite: path ending in `/` → `<path>index.html`; path without `.` → `<path>/index.html`; otherwise served as is.
- Containment check against the web root; missing file → `404.html` with status 404.
- `Cache-Control`: `public, max-age=31536000, immutable` under `/_astro/`, else `no-cache`; `Last-Modified` + `If-Modified-Since` 304; gzip for compressible types over 1 KiB; `X-Content-Type-Options: nosniff`.
- `PORT` (default 8080), `HOST` (default 127.0.0.1; the launchd plist sets `0.0.0.0`), web root from `argv[2]` or `~/Sites/obsidian-blog`.

## 5. Navigation Model (`site/src/lib/navigation.ts`)

- `getPrimaryNavigation()` → frozen `[ {/tags, Tags}, {/graph, Graph}, {/resume, Résumé}, {/portfolio, Portfolio} ]`.
- `getProfileLocalNavigation()` → `[ {/, 홈}, {/resume, Résumé}, {/portfolio, Portfolio} ]`.
- `getPrimaryNavigationState(pathname)` / `getProfileLocalNavigationState(pathname)` → `ValidationResult<NavigationState[]>`; current = exact match or prefix `href/`; fails on invalid paths, more than one current item, or a model that is not one of the two approved models.

## 6. Island Props and Client Contracts

| Island | Hydration | Props | Fetches |
|---|---|---|---|
| `Search` | `client:idle` (BaseLayout) | none; listens for `open-search` (`detail.trigger`) | `/search-index.json` on first open |
| `ThemeToggle` | `client:load` (Header) | none | localStorage key `appearance` (`auto`/`light`/`dark`) |
| `MobileNav` | none (static HTML) | `items: readonly NavigationState[]` | none |
| `GraphView` | `client:load` (`/graph`) | `descriptionId?: string` | `/graph.json` |
| `LocalGraph` | `client:visible` (PostLayout) | `slug: string`, `data: GraphData` (2-hop subgraph) | none |
| `NavTree` (via `OutlineTabs`) | `client:visible` | `currentSlug: string` | `/nav-tree.json` |

Client scripts: `link-preview.ts` fetches `/previews.json` for `.post-content a[href^="/posts/"]`; `outline.ts`, `tabs.ts`, `toc-highlight.ts`, `heading-fold.ts`, `copy-button.ts`, `scroll-regions.ts` act on PostLayout markup. The header search buttons carry `data-search-open`.

## 7. Site Library Functions Used Across Pages

- `data.ts`: `getAllPostMeta()` (sorted by `published` desc, missing dates last, cached), `getPostMeta(slug)`, `getPostContent(slug)`, `getHomepage(contentDir?)`, `getGraph()`, `getLocalGraph(slug)`, `getHubs()`, `sanitizeTag(tag)`, `getTagIndex()`, `formatDateKo(iso)`, `getPreviewSummary(slug)`.
- `render.ts`: `renderMarkdown(md, { homeSections?, assetsDir? })`, `wrapHomeSections(html)`, `LEAD_IMAGE_MAX_PRECEDING_CHARS`.
- `homepage.ts`: `PROFILE_SLOT_TOKEN`, `countSlotTokens`, `assertExactlyOneSlot`, `splitRenderedAtSlot`, `splitAtRecentHeading`, `filterTodayPosts`, `resolveBuildDate(env, now)` (`HOMEPAGE_TODAY_OVERRIDE`), `buildHomepageChunks`.
- `site.ts`: `SITE_NAME`, `SITE_DESCRIPTION`, `SITE_URL`, `SITE_LOCALE`, `documentTitle(pageTitle?)`.
- Profile barrel `lib/profile/index.ts` (public) vs `production-profile.ts` (build/server only: `getProductionProfileAssembly()`, `assertNoProfileApprovalLeak(dir)`, `getApprovedExternalDestinations()`).

## 8. Commands

| Command | Effect |
|---|---|
| `just preprocess` | Preprocess `VAULT_PATH` (default `./fixtures/vault`) into `./content`, copy JSON and assets to `site/public/`. |
| `just build` / `just site-build` / `just dev` | Preprocess + build; build only; preprocess + `astro dev`. |
| `just deploy` | Real-vault preprocess with `--stamp-published`, build, `rsync -a --delete` to `WEB_ROOT`. Maintainer go-ahead only. |
| `just serve` | Foreground local server on the web root. |
| `just test` | `cargo test` in `preprocessor/`. |
| `just crossunit` | Link sweep + JavaScript-off Playwright checks over an existing build. |
| `npm run test:unit` / `test:pbt` / `test:e2e` / `resume:pdf` / `resume:pdf:verify` | The profile CLI's closed set of five stable commands (CI may run the four read-only ones, never `resume:pdf`). |
| `npm run format` / `format:check` / `test:coverage` / `test:pbt:framework` | Prettier; coverage (reported, not enforced); PBT tool-selection evidence. |
| `npx playwright test --config playwright.hig.config.ts` | HIG browser checks (fixture build served on 127.0.0.1:4329). |

## 9. 배포 게시 계약 (금번 스캔에서 확인)

`Jenkinsfile:116`과 `Justfile:29`가 동일하게 호출하는 유일한 게시 진입점이다.

| 항목 | 계약 |
|---|---|
| 호출 | `bash site/scripts/publish-dist.sh <dist-dir> <web-root>` |
| 인자 검증 | 인자 수 ≠ 2 또는 빈 값이면 사용법 출력 후 exit 2; `DIST`가 디렉터리가 아니면 exit 1 (`publish-dist.sh:17-32`) |
| 1단계 | `mkdir -p "$WEB_ROOT"` 후 `rsync -a --delete --exclude="/_redirects.json" --exclude="/.redirects.json.tmp" "$DIST/" "$WEB_ROOT/"` |
| 2단계 | 빌드에 `_redirects.json`이 있으면 `$WEB_ROOT/.redirects.json.tmp`로 복사한 뒤 `mv -f`로 원자적 교체; 없으면 웹 루트의 테이블과 임시 파일을 제거 (`publish-dist.sh:34-44`) |
| 셸 계약 | `set -eu`; 외부 npm 의존성 없음(`rsync`/`cp`/`mv`/`mkdir`만 사용) |

H1/H2/H3 검사값의 정의는 `business-overview.md`의 "현재 인텐트" 표에 한 번만 기록되어 있다. 이 절은 게시 계약만 설명하며 검사 결과 기록 형식은 아직 정의되지 않았다(요구사항 단계 대상).
