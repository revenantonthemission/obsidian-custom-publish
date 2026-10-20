# Code Summary: Repository Cleanup and HIG Redesign

The overview below summarizes the finished build across all three attempts: what changed, the key decisions, the test results, and where the build departed from the plan. The sections after it are the step-by-step record: the test baseline (plan Step 1), the cleanup report (plan Steps 2–8), the TDD record (plan Steps 9–38), and the Build and Test repair of the second attempt ("Loop-back 1 Repair", plan Steps 39–52).

## Overview

### What was built

- **Cleanup.** The portfolio work and the AI-DLC setup were committed and merged, and only the Mermaid fix was brought over from `codex/chore/aidlc-scaffolding`. Three worktrees were removed, and 31 branches were deleted: 30 safely, plus the scaffolding branch by force after its tip was recorded. Only `develop` and `main` remain.
- **Redesign.** One `--c-` token layer, self-hosted Pretendard and KaTeX, and Liquid Glass bars with opaque fallbacks. Appearance is Automatic, Light or Dark, with the sunrise and location logic removed. The chrome, post pages, other blog pages, search and profile pages are restyled, and the résumé print layout is in pt. All 13 accessibility gaps are fixed.
- **Prettier** for `site/`, then a candidate for the new résumé PDF release and the hand-off for the accessibility review.
- **The Build and Test repair (second attempt).** Build and Test failed six targets that traced to the first attempt. Each now passes:
  - Post images carry their size, and the first one loads eagerly. Mobile LCP on the diagrams post fell from 3.5–4.1 s to about 1.7 s.
  - Three contrast pairs are fixed: the selected segment, the dark search snippet, and highlighted code and links.
  - The overflow check now sees clipped content at six widths, which found and fixed one real defect.
  - The missing first-failing tests were added, and so was a regression test for the Mermaid fix.
- **The second Build and Test repair (third attempt, "Loop-back 2 Repair", plan Steps 53–60).** Build and Test's second run failed two accessibility targets, and both now pass:
  - **Highlighted links.** A link inside a highlight is `--c-tint-hover`, always underlined, with a thicker underline on hover. It reaches at least 5.63:1 in light mode and 5.37:1 in dark on every ground; it was as low as 4.07:1, and 1.73:1 in the dark homepage note.
  - **The homepage note.** The highlight rule moved into a new `highlight.css` that both the homepage and the post pages load, so the note no longer shows the browser's yellow.
  - **Search snippets** wrap to two lines instead of being cut off. This departs from the mockup's one-line snippet.
  - **Overflow checks** now open the search dialog, the sheets and the graph list, and they assert each route's HTTP status.
  - No review-subject file changed, so the review digest stays `be3fa9c6…48ed9d`.
- `develop` is at `987f497`, 52 commits ahead of `origin/develop`. Nothing was pushed.

### Files created and modified

| Area | Files |
|---|---|
| Repository (Steps 2–4) | `.gitignore` (`.aidlc/worktrees/`), `preprocessor/src/mermaid.rs` (cherry-pick of `9e1c203`), the 9 portfolio paths of `11bb661`, the AI-DLC setup of `a70b98d` |
| Fixtures | new `fixtures/vault/Empty Hub.md` and `fixtures/vault/Post With Code.md` |
| Tokens and styles | new `tokens.css`, `base.css`, `chrome.css`, `fonts.css`, `graph.css`, `grouped.css`, `home.css`, `outline.css` and `segmented.css`. `global.css` is now only the entry point. Restyled: `callouts.css`, `diagrams.css`, `link-preview.css`, `nav-tree.css`, `post.css`, `search.css` and `profile/*.css`. Deleted: `mobile-sidebar.css` |
| Appearance | new `src/lib/appearance.ts`, the ES5 bootstrap in `BaseLayout.astro`, and `ThemeToggle.tsx`. Deleted: `src/lib/solar.ts` |
| Components, layouts, pages | `Header`, `Footer`, `BacklinkList`, `HubNav`, `HubProgress`, `PostCard`, `RelatedPosts`, `TableOfContents` and `PortfolioContent`; new `OutlineTabs` and `GraphList`. The `Base`, `Hub` and `Post` layouts. The pages `index`, `404`, `graph`, `tags/*`, `resume`, `portfolio` and `portfolio/[role]` |
| Islands | `GraphView`, `LocalGraph`, `MobileNav`, `NavTree`, `Search`, `ThemeToggle` and `TreeNodeItem`. Deleted: `MobileSidebar` |
| Libraries and scripts | new `lib/home-sections.ts`, `icons.ts`, `modal.ts`, `search.ts`, `search-keys.ts` and the `shiki-themes/xcode-{light,dark}.json` themes; new `scripts/outline.ts`, `scroll-regions.ts`, `svg-icon.ts` and `tabs.ts`. Changed: `render.ts`, `graphSim.ts`, `graphUtils.ts`, `layout/profile-resources.ts`, `copy-button.ts`, `heading-fold.ts`, `link-preview.ts` and `toc-highlight.ts`. Deleted: `scripts/diagram-wrap.ts` |
| Tooling | new `playwright.hig.config.ts` and `scripts/hig/build-and-serve.mjs`. `playwright.config.ts` now ignores the `hig-*` specs. `scripts/profile/asset-budget.mjs` gets new inline-script baselines and traces inline sheets by content. `scripts/profile/accessibility-review-contract.mjs` adds the four files split out of `global.css` to the review subject. `package.json` and `package-lock.json` gain `rehype-parse`, `prettier` and `prettier-plugin-astro`. `katex` is **not** declared: the KaTeX stylesheet resolves through the copy `rehype-katex` installs (review finding R-01, accepted as a risk). Also `.prettierrc` and `.prettierignore` |
| Loop-back 1 repair (Steps 39–52) | new `src/lib/image-size.ts`; `render.ts` (`rehypeImageLoading()`); `tokens.css` (four state tokens), `segmented.css`, `profile/foundation.css`, `search.css`, `post.css`, `grouped.css`; new `tests/unit/render-images.test.ts`; `hig-tokens.test.ts`, `support/hig.ts` and the `hig-chrome`, `hig-pages`, `hig-performance`, `hig-post`, `hig-profile` and `hig-search` specs; `preprocessor/src/mermaid.rs` (`mmdc_args()`, `puppeteer_config_in()` and 3 tests); `CLAUDE.md` test counts |
| Tests | new e2e `hig-smoke`, `hig-appearance`, `hig-chrome`, `hig-post`, `hig-pages`, `hig-search`, `hig-profile` and `hig-performance` specs with `support/hig.ts`. New unit tests `appearance`, `hig-tokens`, `hig-built-html`, `hig-built-assets`, `render-sections`, `search-keys` and `search`, with `support/astro-build.ts`. Changed: `graph-view`, `profile-tooling`, `profile-presentation` (shared build helper only), `homepage.spec.ts` and `support/profile-page.ts` |
| Documentation | `CLAUDE.md` and `site/README.md` |
| Formatting | 199 files reformatted mechanically in `54e48ea` |

### Key implementation decisions

- **Tokens and materials**
  - The light `--c-control-border` became `#86868B` (3.25:1 on the grouped background). The designed `#8E8E93` reached only 2.92:1, and the 3:1 target stayed.
  - The glass sits on its own layer. A `backdrop-filter` on the bar itself made the bar the containing block of the fixed navigation sheet.
- **Post page**
  - The outline renders twice, once in the panel and once in the sheet. Moving one Astro island between them would hydrate the tree twice.
  - The heading-fold toggle sits at the end of the heading row. At 320 px, the leading margin cannot hold a 44 px target.
  - Callout types follow Obsidian's alias families, so `important` is green.
  - The Xcode Shiki themes were wired in at Step 17, because the axe checks on the code panel needed them.
- **Graph.** The graph island fetches `/graph.json` itself. This gives it loading, error and empty states, and keeps the graph out of the page HTML. Its list view is built at build time, so it works when the fetch fails.
- **Search and modals.** The search dialog is named by `aria-label="검색"`. A hidden heading would have added an `h2` to every page outline, profile pages included. The outline sheet and the search dialog share `lib/modal.ts`.
- **Profile tooling.** The asset budget traces an inline stylesheet to the asset whose bytes it carries. Unmatched sheets still fail closed. No limit was relaxed. The CSS budget is 4,487 of 24,576 bytes gzip.
- **Fonts and KaTeX.** KaTeX is served from the installed `katex` package (0.16.45), with no CDN. `fonts.css` is imported from BaseLayout's frontmatter, because through the `global.css` import chain Vite emitted no font files.
- **Prettier.** Two spaces, semicolons, single quotes, width 100, and `trailingComma: "es5"`, which keeps BaseLayout's inline scripts valid ES5. One `prettier-ignore` keeps the tag chips reading "#tag".
- **Image loading (repair).**
  - Every `/assets/` image gets its file's `width` and `height`. A small reader with no new dependency handles SVG (the root size, else the `viewBox`), PNG, GIF, JPEG (including EXIF rotation) and WebP.
  - The first image, or the first light/dark diagram pair, is `loading="eager"` with `fetchpriority="high"`. Later images stay lazy, and the CSS is unchanged.
- **Contrast states (repair).**
  - The selected segment keeps its raised pill and gains a 1 px ring in the new `--c-segment-indicator`.
  - A selected search option's second line uses the new `--c-selected-secondary-text` (`--c-text` in dark mode).
  - Highlighted code lines use the new `--c-code-highlight` with a 3 px tint bar. The light `mark` fill is `--c-mark-fill`, orange at 20%.
  - A current tag chip keeps its colors on the grouped background.

### Test coverage summary

| Suite | Baseline | After the first attempt | Final |
|---|---|---|---|
| `cargo test --release` | 110 | 110 | 113 (36 unit, 77 integration) |
| `npm run test:unit` | 300 in 22 files | 348 in 29 files | 360 in 30 files |
| `npm run test:pbt` | 37 | 37 | 37 |
| `npx astro check` | 0 errors, 6 hints | 0 errors, 7 hints | 0 errors, 7 hints (189 files) |
| HIG browser suite (three engines) | — | 846 pass, 15 skips | 905 pass, 55 deliberate engine-only skips |
| Mobile-network Core Web Vitals (Chromium) | — | the diagrams post at 3.5 s LCP | every route under 1.8 s LCP; worst CLS 0.0087 |
| `npm run format:check` | — | pass | pass |
| `just crossunit` | — | red only on the fixture's intended broken link; Playwright half 8 pass | the same |
| `npm run test:e2e` | — | automated evidence 6 of 6; stops at the manual record | the same, with the new digest `be3fa9c6…48ed9d` |

No coverage percentage was measured. The site has no coverage provider installed, and the team reports coverage without a minimum.

Requirement coverage is mapped in `traceability.json`. One acceptance criterion still has no complete check:
- **AC2.1.** No test scans for literal colors, and some remain outside `tokens.css`: `rgba()` shadows in `segmented.css` and `profile/foundation.css`, `rgba()` fallbacks for `--c-scrim` in `search.css` and `outline.css`, and the print palette in `profile/print.css`.

AC4.1 is now checked: no overflow or clipped content at 320, 375, 768, 1024, 1440 and 1920 px, in both appearances.

### Deviations from the plan

- **Two follow-ups outside the plan.** Each had its own branch, a `--no-ff` merge and a safe delete:
  - `refactor/hig-token-aliases` removed the transitional aliases, before the review files settle.
  - `fix/hig-self-hosted-font` fixed Pretendard, which had not loaded since Step 17.
- The Xcode themes moved from Step 20 to Step 17.
- **Step 31's Red was recorded after the implementation was written.** The edit was set aside to reproduce the failure.
- Design departures, also listed above: the fold toggle position, the twice-rendered outline, green `important` callouts, the search `aria-label`, and the graph fetching its own data.
- **Repair: five design departures for the maintainer to confirm** (details under Step 43):
  - the ring on the selected segment;
  - `--c-text` for the selected search snippet in dark mode;
  - the highlighted code-line style;
  - the light `mark` fill at 20%;
  - the current tag chip on the grouped background.
- **Repair: checks beyond the plan.**
  - Step 42 added browser checks of rendered contrast beside the token pairs.
  - The six-width overflow matrix runs as 14 route tests of 12 cells each.
  - The overflow helper excludes 1 × 1 px visually hidden boxes, a rule written before its first run.
- **Repair: one rendering change beyond the fixture.** An SVG attachment that gives only a `viewBox` now draws at its own width when that is narrower than the column. Diagrams are not affected.

### Open items for the maintainer

- **PDF.** Review candidate `8017640e…` and promote it (FR6.2). The repair did not change the résumé's print output, so the candidate stays current.
- **Accessibility review.** Redo the 16-state review with the new digest `be3fa9c63c1973455c247bed56ae3462175a68d34a6b08d032f2b4143848ed9d` (FR6.4). It replaces `4b45fd8f…37e47`, because the repair changed `tokens.css` and `profile/foundation.css`. Before the review, decide whether `search.css`, `Search.tsx`, `ThemeToggle.tsx`, `icons.ts` and `Footer.astro` should join the review subject (R-07). Adding them changes the digest again.
- **Push.** Pushing `develop` releases it, because the nightly job publishes `origin/develop`.
- **Local content.** Local `content/` and `site/public/*.json` hold fixture output. `VAULT_PATH=<vault>/Areas/Notes just preprocess` regenerates them from the vault without writing to it.

## Test Baseline (plan Step 1)

Taken on 2026-10-20 on `codex/feature/infra-engineer-portfolio` at `265b38a` (the same commit as `develop`), with the uncommitted portfolio work present in the working tree. The fixture content was materialized as the Jenkins Verify stage does:

- `cargo build --release --manifest-path preprocessor/Cargo.toml`
- `./preprocessor/target/release/obsidian-press ./fixtures/vault ./content` (13 sources, 12 posts, 1 homepage artifact; two expected fixture warnings for the missing image and heading)
- `cp content/search-index.json content/graph.json content/previews.json content/nav-tree.json site/public/`
- in `site/`: `node scripts/crossunit/ensure-fixture-content.mjs` ("homepage artifact present")

| Suite | Command | Passed | Failed | Skipped | Notes |
|---|---|---|---|---|---|
| Rust | `cargo test --release --manifest-path preprocessor/Cargo.toml` | 110 | 0 | 0 | 33 library unit tests and 77 integration tests in 16 files; 0 doc tests |
| Site unit | `npm run test:unit` | 300 | 0 | 0 | 22 test files |
| Site properties | `npm run test:pbt` | 37 | 0 | 0 | 6 test files; seed 1509240351, 100 runs |
| Type check | `npx astro check` | n/a | 0 errors | n/a | 159 files, 0 warnings, 6 hints |

Remote and branch references at the baseline:

| Reference | Commit |
|---|---|
| `develop` | `265b38a9877c9640cbe8af3216481962238ffe48` |
| `main` | `23e08e667b47a2fee8e8dfa64d89babaf3d76699` |
| `origin/develop` | `5df7e255104670b4166d1a3451612e2bbeb48003` |
| `origin/main` | `23e08e667b47a2fee8e8dfa64d89babaf3d76699` |

## Repository Cleanup Report (plan Steps 2–8)

### Commits and merges on `develop` (plan Steps 2–4)

| Step | Branch | Commit | Merge commit on `develop` | Content |
|---|---|---|---|---|
| 2 (FR1.1) | `codex/feature/infra-engineer-portfolio` | `11bb661` feat: 인프라 엔지니어 직무 포트폴리오를 추가합니다 | `1424e27` | the 9 portfolio paths the plan lists, including the deletion of `portfolio-product-engineer.spec.ts`; the 3 portfolio unit files passed (35 tests) before the commit |
| 3 (FR1.3) | `chore/aidlc-setup` | `a70b98d` chore: AI-DLC 작업 환경을 도입합니다 | `c9590bd` | 460 files: `.claude/` framework and `settings.json`, `.mcp.json`, the AI-DLC `.gitignore` block, the `aidlc/` workspace, and the 96 `aidlc-docs/` records moved into `aidlc/spaces/default/intents/261019-obsidian-press-resume-an/` (recorded as renames) |
| 4 (FR1.2) | `fix/mermaid-puppeteer-config` | `a029615` fix: mermaid 렌더링 시 puppeteer 설정 파일을 지원합니다 (cherry-picked from `9e1c203` with `-x`) | `7896636` | `preprocessor/src/mermaid.rs` only |
| 4 (FR1.4) | `fix/mermaid-puppeteer-config` | `f2554e7` chore: AI-DLC Bolt 워크트리를 git 추적에서 제외합니다 | `7896636` | `.aidlc/worktrees/` added to `.gitignore` |

Notes on how these were carried out:

- **Step 2.** The `aidlc-docs/` deletions were already staged when the build started. The portfolio commit named its 9 paths explicitly, so those deletions stayed out of it. Because `git merge` refuses while the index differs from `HEAD`, they were unstaged for the merge and staged again in Step 3. No file was lost: the records stay in history and their moved copies were committed in Step 3.
- **Step 3.** Switching the main checkout from `chore/aidlc-setup` to `develop` before the merge would have deleted the newly tracked `.claude/` and `aidlc/` files from the working tree while the AI-DLC hooks were reading them. The `git merge --no-ff` therefore ran in a temporary worktree of `develop` in the session scratchpad, which was removed straight after. `develop` then had the same tree as the branch, so the main checkout switched to it without changing any file.
- **Step 4.** The cherry-pick conflicted in two places, because `develop` had since reformatted `mermaid.rs` with rustfmt and already ignored `.puppeteer-config.json` (line 23 of `.gitignore`). `mermaid.rs` keeps `develop`'s formatting plus the new `PUPPETEER_CONFIG_PATH` static and the `-p` argument; `.gitignore` keeps `develop`'s copy, so the `.puppeteer-config.json` line was not added a second time. The `.aidlc/worktrees/` line went into its own commit so the cherry-picked commit matches `9e1c203`. `cargo fmt --check` was clean and `cargo test --release` passed 110 tests before the commit.

### Worktrees removed (plan Step 5)

Each worktree was checked with `git status --porcelain --untracked-files=all` (empty for all three) and `lsof +D` (no process had a file open there) before `git worktree remove`. `git worktree prune` then had nothing left to prune.

| Worktree | Branch | Result | Ignored generated output removed with it |
|---|---|---|---|
| `/Users/revenantonthemission/Projects/obsidian-blog-u1-nfr` | `codex/fix/diagram-render-gate` | removed | `preprocessor/target/`, `site/node_modules/`, `site/dist/`, `site/.astro/`, `site/.generated/`, `site/.artifacts/` (old verification evidence, compiled tools and PDF staging), `.DS_Store` files |
| `.claude/worktrees/u2-home-boundary` | `codex/feature/resume-home-boundary` | removed | the same set plus `content/`, `site/public/assets/`, `site/public/graph.json` |
| `.claude/worktrees/u3-quality-gates` | `codex/feature/resume-quality-gates` | removed | the same set as u2 |

No worktree had uncommitted or untracked changes, so none was kept.

### Branches deleted safely (plan Step 6)

`git branch --merged develop` listed all 27 branches, and `git branch -d` deleted each one without a refusal:

| Branch | Tip | Branch | Tip |
|---|---|---|---|
| `codex/chore/reconcile-develop-main` | `67f70a4` | `feature/diagram-theme-sync` | `988bc0f` |
| `codex/feature/kakaopay-data-platform-portfolio` | `ee8e8d7` | `feature/image-embeds` | `68306d1` |
| `codex/feature/portfolio-data-ai-rescope` | `6dbc290` | `feature/local-serving` | `2153bc9` |
| `codex/feature/resume-home-boundary` | `bd238a1` | `feature/markdown-rendering-improvements` | `6c419ab` |
| `codex/feature/resume-profile-experience` | `cbf80d5` | `feature/phase1-scaffolding` | `c984755` |
| `codex/feature/resume-quality-gates` | `2de9c81` | `feature/phase2-preprocessor` | `b05e26e` |
| `codex/fix/diagram-render-gate` | `f82c9eb` | `feature/phase3-site` | `6f058db` |
| `codex/fix/jenkins-cargo-path` | `4c326b3` | `feature/phase4-islands` | `99f29f9` |
| `codex/fix/portfolio-korean-copy` | `d2e9cb7` | `feature/phase5-markdown-pipeline` | `893c8ac` |
| `codex/resume-product-engineer` | `d2884f8` | `feature/phase6-infrastructure` | `1c7e3c1` |
| `feature/callouts-highlights-ui` | `781f826` | `feature/phase7-deploy` | `1e44ab1` |
| `feature/code-review-fixes` | `d053f0a` | `feature/phase7-integration` | `4ff5482` |
| `feature/code-review-fixes-2` | `c21e9f4` | `feature/portfolio-docsuri` | `85a5431` |
| | | `feature/remaining-review-fixes` | `bc72993` |

The three branches merged by this build (`codex/feature/infra-engineer-portfolio`, `chore/aidlc-setup`, `fix/mermaid-puppeteer-config`) were also deleted with `git branch -d` right after their merges.

### Scaffolding branch removed by force (plan Step 7)

`codex/chore/aidlc-scaffolding` was deleted with `git branch -D`, the only forced deletion of this build. Before the deletion its tip was `fd98004ec696f78978437319fc0aeb9779a8af00`. It held these 10 commits that are not on `develop`:

| Commit | Date | Subject | Outcome |
|---|---|---|---|
| `fd98004ec696f78978437319fc0aeb9779a8af00` | 2026-07-26 | docs: Step 21 을 완료로 기록하고 Step 22 를 다음 단계로 지정합니다 | dropped on purpose |
| `e6d03fd627b9020a691a0b97d2d72b0101ee6a09` | 2026-07-26 | docs: 서수 출처 결정과 기간 결함을 계약에 기록합니다 | dropped on purpose |
| `3dd3ac314ae7fd595060038b61c711dd7a12a211` | 2026-07-25 | docs: 렌더러 결과와 인스펙터 실측 구조를 계약에 추가합니다 | dropped on purpose |
| `9b24f825d0ddf5262c4f32252c84b33c0f668d60` | 2026-07-25 | docs: Step 21 PDF 파이프라인 계약을 추출해 기록합니다 | dropped on purpose |
| `44dce7a1c18000b5a54f3c823759c0d81046bf0c` | 2026-07-25 | docs: Step 20 을 완료로 기록하고 Step 21 을 다음 단계로 지정합니다 | dropped on purpose |
| `7b6fbdd179bb0105a1d68c7bd71bb8c9e786e526` | 2026-07-25 | docs: Step 20 브라우저 검증 계약을 추출해 기록합니다 | dropped on purpose |
| `6d8ff67d1e69538f3652699301ca674e73f8d415` | 2026-07-25 | docs: Step 19 를 완료로 기록하고 Step 20 을 다음 단계로 지정합니다 | dropped on purpose |
| `04adc8d797e07429db11f6fa2f87903c23b9a14a` | 2026-07-25 | docs: U1 프로필 도메인 AI-DLC 산출물을 추가합니다 | dropped on purpose |
| `89160ecd4441dade6f67880168d12c149a272aaf` | 2026-07-25 | chore: AI-DLC 워크플로 스캐폴딩을 도입합니다 | dropped on purpose |
| `9e1c20348dec83d8bb7db33037b35b4642680c0e` | 2026-07-25 | fix: mermaid 렌더링 시 puppeteer 설정 파일을 지원합니다 | cherry-picked to `develop` as `a029615` (plan Step 4) |

The nine dropped commits stay recoverable from the recorded tip with `git branch codex/chore/aidlc-scaffolding fd98004ec696f78978437319fc0aeb9779a8af00` for as long as git keeps the unreachable objects. Deleting a branch also deletes its own reflog, so the limit is garbage collection: `git gc` prunes unreachable objects no sooner than two weeks after they become unreachable (the default `gc.pruneExpire`).

### Final inventory (plan Step 8; AC1.1–AC1.5)

- `git branch`: `develop` and `main` only (AC1.1).
- `git worktree list`: the main checkout only, on `develop` at `7896636` (AC1.1).
- `git log --oneline -8 develop` (AC1.2):

  ```text
  7896636 Merge branch 'fix/mermaid-puppeteer-config' into develop
  f2554e7 chore: AI-DLC Bolt 워크트리를 git 추적에서 제외합니다
  a029615 fix: mermaid 렌더링 시 puppeteer 설정 파일을 지원합니다
  c9590bd Merge branch 'chore/aidlc-setup' into develop
  a70b98d chore: AI-DLC 작업 환경을 도입합니다
  1424e27 Merge branch 'codex/feature/infra-engineer-portfolio' into develop
  11bb661 feat: 인프라 엔지니어 직무 포트폴리오를 추가합니다
  265b38a Merge branch 'codex/resume-product-engineer' into develop
  ```

- `git rev-parse origin/develop origin/main`: `5df7e255104670b4166d1a3451612e2bbeb48003` and `23e08e667b47a2fee8e8dfa64d89babaf3d76699`, unchanged from the baseline. `main` is still `23e08e6`. Nothing was pushed (AC1.5).
- No worktree had changes and no branch refused deletion, so AC1.3 and AC1.4 had no case to exercise.

Suites rerun on `develop` at `7896636`:

| Suite | Baseline | After the cleanup |
|---|---|---|
| `cargo test --release` | 110 passed, 0 failed, 0 ignored | 110 passed, 0 failed, 0 ignored |
| `npm run test:unit` | 300 passed in 22 files | 300 passed in 22 files |
| `npm run test:pbt` | 37 passed in 6 files (seed 1509240351) | 37 passed in 6 files (seed 1079016561) |
| `npx astro check` | 0 errors, 0 warnings, 6 hints | 0 errors, 0 warnings, 6 hints |

## TDD Record (plan Steps 9–31)

Each Red entry is the failing output of the scoped command from `unit-test-instructions.md`, recorded before the matching Green step.

### Step 9: runner readiness

`npx playwright test --config playwright.hig.config.ts tests/e2e/hig-smoke.spec.ts`: 3 passed (chromium, firefox, webkit). The fixture preprocess and Astro build took about 5 s (32 pages).

### Step 10: business logic, Red

`npx vitest run tests/unit/hig-tokens.test.ts tests/unit/appearance.test.ts tests/unit/render-sections.test.ts tests/unit/search-keys.test.ts`:

```text
FAIL  tests/unit/appearance.test.ts   Error: Cannot find module '../../src/lib/appearance'
FAIL  tests/unit/hig-tokens.test.ts   Error: ENOENT: no such file or directory, open '.../site/src/styles/tokens.css'
FAIL  tests/unit/search-keys.test.ts  Error: Cannot find module '../../src/lib/search-keys'
FAIL  render-sections > wraps each H2 section ... in order          AssertionError: expected [] to have a length of 2 but got +0
FAIL  render-sections > keeps nested headings inside their H2 section ...  AssertionError (no card found)
FAIL  render-sections > wraps already-rendered homepage chunks ...  TypeError: wrapHomeSections is not a function
Test Files  4 failed (4)
     Tests  3 failed | 2 passed (5)
```

The two passing tests assert today's behaviour that must not change: posts render without cards, and a note without an H2 renders the same with or without the option.

### Step 11: business logic, Green

The same command: 4 files, 25 tests passed (8 token, 7 appearance, 5 section, 5 search-key). The first Green run failed one pair the design table had not computed: `--c-control-border` `#8E8E93` reaches only 2.92:1 on `--c-bg-grouped` `#F2F2F7` in light mode, below the 3:1 target for UI boundaries. The target stayed; the light token became `#86868B` (3.25:1 on the grouped background, 3.33:1 on `--c-surface-2`, 3.62:1 on white), and the test now also checks `--c-surface-2`, where chips and inputs sit.

### Step 13: appearance, Red

`npx playwright test --config playwright.hig.config.ts tests/e2e/hig-appearance.spec.ts`: 27 failed (9 tests in each of chromium, firefox and webkit). Chromium reasons:

```text
first visit ...                 Expected [] / Received 4 geolocation calls
stale legacy theme state ...    data-theme Expected "" Received "light"
unrecognized stored value ...   data-theme Expected "" Received "light"
stored light ... system dark    data-theme Expected "light" Received "dark"
blocked storage ...             page.waitForFunction: Test timeout of 60000ms exceeded (islands never hydrate)
without JavaScript ...          dark: Expected "rgb(0, 0, 0)" Received "rgb(250, 250, 249)"
names the stored choice (R-07)  toHaveAccessibleName "화면 모드: 다크": element(s) not found
cycles at 320 px / 1024 px      toHaveAccessibleName "화면 모드: 자동": element(s) not found
```

### Steps 14–15: appearance, Green and Refactor

The same command: 27 passed (19.6 s). `npm run test:unit` 325 passed in 26 files, `npm run test:pbt` 37 passed, `npx astro check` 0 errors. Until each stylesheet is rebuilt (Steps 17–29), `global.css` keeps `--c-` aliases for the old token names (`--c-text-muted`, `--c-border`, `--c-accent`, `--c-accent-hover`) that point at the new tokens, and the remaining `[data-theme="dark"]` rules also apply under `prefers-color-scheme: dark`.

### Step 16: shared chrome, Red

`npx vitest run tests/unit/hig-built-html.test.ts`: 6 failed. English `aria-label`s ("Table of contents" on 5 posts, "Back to reference 1/2", "Hub navigation"); two `button.search-trigger` per page; 47 inline SVGs not hidden (`span.nav-icon`, `button.mobile-sidebar-btn`); no platform-marked shortcut hint; a scroll script without `requestAnimationFrame`/`scaleX`; a back-to-top glyph instead of an icon.

`npx playwright test --config playwright.hig.config.ts tests/e2e/hig-chrome.spec.ts` (Chromium shown; Firefox and WebKit matched it):

| Check family | Result |
|---|---|
| C-01 axe, 14 routes × 4 widths × 2 appearances, reduced motion | 112 passed: the token layer from Step 14 already fixed the contrast gaps; these cells now guard against regressions |
| C-04 chrome T1 targets at 320 and 1024 px | 28 failed (controls under 44 px) |
| navigation sheet: 52 px rows, page hidden behind it; no-JS sheet (C-10) | 2 failed |
| C-03 bar text and `--c-text` focus ring (R-02), glass by default (FR2.4), opaque under increased contrast and reduced transparency (C-09) | 5 failed (no `.site-bar`, no `[data-material]` surfaces) |
| shortcut hint per platform (C-13); skip link to `#main-content` (C-06) | 2 failed |
| C-08 durations ≤ 0.1 s under reduced motion | 14 passed (the existing global override); back-to-top jump: 1 failed (scrolls smoothly) |
| C-14 no overflow at 320 px with 200 % text | 14 failed |

The first run also failed all 14 duration checks, because `reducedMotion` had been passed to `test.use` directly, where Playwright ignores it. That was a defect in the new spec; it now goes through `contextOptions`, which also puts the axe matrix under reduced motion as C-01 requires.

### Steps 17–18: shared chrome, Green and Refactor

- `npx vitest run tests/unit/hig-built-html.test.ts`: 6 passed. `npm run test:unit`: 331 passed in 27 files. `npm run test:pbt`: 37 passed. `npx astro check`: 0 errors (one new hint: `navigator.platform` is deprecated; it is the deliberate fallback where `userAgentData` does not exist, as in Safari and Firefox).
- Smoke, appearance and chrome specs together in three browsers: 547 passed, 2 skipped (reduced-transparency emulation exists only in Chromium), 15 failed. The 15 are owned by later steps: `scrollable-region-focusable` on `.table-wrapper` and the diagram wrappers at 320 px on two posts (Step 20, R-05), and the homepage profile buttons overflowing at 320 px with 200 % text (Step 23).
- Three test defects were fixed on the way, none of them loosening a check:
  1. The chrome target selector `header a` also matched the post and profile pages' own `<header>` elements; it is now scoped to `.site-header` and `.site-footer`.
  2. The overflow helper reported the closed navigation sheet, whose `content-visibility: hidden` slot still returns a box; it now skips content that is not rendered (`checkVisibility()`).
  3. The C-13 rule counted the graph's named image (`role="img"` with a Korean `aria-label`) as decoration; named images are content.
- Two genuine defects surfaced: the `backdrop-filter` on the bar made it the containing block of the fixed sheet, which collapsed into the bar (the glass now sits on its own layer, and the sheet test also checks that the sheet is full height); and two isolated Astro builds in parallel test files deleted each other's prerender chunks in `site/.astro` (builds now take turns through `tests/unit/support/astro-build.ts`, which `profile-presentation.test.ts` also uses).
- Wired the Xcode themes into `render.ts` in this step rather than Step 20, because the failing C-01 axe cells on the code post required it: on `--c-code-bg` the GitHub syntax colors no longer reached 4.5:1.

### Step 19: post page, Red

`npx playwright test --config playwright.hig.config.ts tests/e2e/hig-post.spec.ts`: 60 failed, 5 passed, 1 skipped (Firefox has no `isMobile` emulation). Every outline, sheet, tab, tree, fold, copy, callout-contrast, scroll-region, diagram-width, link-preview and below-the-article test failed in all three browsers, mostly with "waiting for" a role or name that does not exist yet (`dialog "목차와 탐색"`, `tab "목차"`, `button "코드 복사"`, `tooltip`, `button "‘넓은 표’ 섹션 접기"`). The 5 passes are regression guards that already hold: long strings wrap (since Step 17's `overflow-wrap: anywhere` on inline code), and a tap on a post link navigates in Chromium and WebKit, because the old script called `preventDefault()` only after an `await`, too late to stop the navigation.

### Step 20: post page, Green

Commit `39be2a2` on `feature/hig-redesign`.

- The same command: 65 passed, 1 skipped (the Firefox touch test) across chromium, firefox and webkit.
- All HIG specs together (`npx playwright test --config playwright.hig.config.ts`): 624 passed, 3 skipped, 3 failed. The 3 failures are the homepage overflow with 200 % text at 320 px, one per browser, owned by Step 23. The `scrollable-region-focusable` failures on the code and diagram posts from Step 18 are gone.
- `npm run test:unit`: 331 passed in 27 files. `npm run test:pbt`: 37 passed. `npx astro check`: 0 errors, 7 hints (unchanged).
- Three defects in the Step 19 spec were fixed, none of them loosening a check:
  1. The tree test named the hub by its first heading ("Operating System Hub"). The tree names a note by its title, "Hub Page".
  2. The callout check read `.callout-title` on every callout, but the fixture's warning callout has no title, so the check threw. It now measures titled callouts only. The callouts post has just one titled callout, so the check also reads the code post (note, tip and example: blue, green and purple).
  3. Its color parser read only `rgb()`. A `color-mix()` fill computes to `color(srgb r g b)` in the range 0 to 1, which the parser now scales.
- The panel and the sheet each render their own copy of the tabs (`OutlineTabs.astro`). The sheet does not borrow the panel's element. Moving an `astro-island` re-runs its `client:visible` directive (`connectedCallback`), and before the first hydration two observers can each hydrate the tree.
- The heading fold toggle sits at the end of the heading row, not in the leading margin as `interaction-spec.md` describes. At 320 px the leading margin is 16 px, so a 44 × 44 target there would leave the viewport. Negative block margins keep the row as tall as the heading line.
- Callout types follow Obsidian's alias families onto the six design hues. The design table names only some types, so `important` now joins tip (green); before, it was red.

### Step 21: post page, Refactor

Commit `8e1dce2`. Three refactors, with no change in behaviour:

- `outline.ts` computes the sheet's Tab ring with `nextStop()` instead of a nested conditional.
- `link-preview.ts` returns one of three lookup results (found, missing, failed), which removes the early return inside a `try` block.
- `toc-highlight.ts` also recomputes the current heading when the article resizes, so folding a section updates the mark without a scroll.

Results: the post spec passed 65 with 1 skipped in three browsers. `npm run test:unit` passed 331, including the 12 tests in `render-extended-syntax`. `npx astro check` reported 0 errors.

### Step 22: other blog pages, Red

New fixture `fixtures/vault/Empty Hub.md`: a hub with no links, so the empty hub state has a route (`/hubs/empty-hub`). `cargo test --release` still passes 110.

`npx vitest run tests/unit/graph-view.test.ts tests/unit/hig-tokens.test.ts`: 4 failed, 33 passed.

```text
FAIL graph-view > the legend lists every category with a Korean label and its own shape
     expected [ [ 'hub', '허브', undefined ], …(5) ] to deeply equal [ [ 'os', '운영체제', 'circle' ], …(5) ]
FAIL graph-view > nodes are painted with their category token, never a fixed color
     expected '#ef4444' to be 'var(--c-graph-hub)'
FAIL graph-view > every shape is a closed path centered on the node
     TypeError: Cannot read properties of undefined (reading 'map')   (no SHAPES, no shapePath)
FAIL hig-tokens > graph category tokens are the text variant in light and the base color in dark ...
     Error: --c-graph-os is not defined
```

`npx playwright test --config playwright.hig.config.ts tests/e2e/hig-pages.spec.ts`: 51 failed, 24 passed (25 tests in each of chromium, firefox and webkit). Chromium:

| Test | Result |
|---|---|
| homepage: Large Title, section cards and profile card on the grouped background | failed: no `h1` |
| homepage: profile actions at 44 px, note links in `--c-tint` | failed: the actions are under 44 px |
| homepage: empty "오늘 발행된 글" message in secondary text | passed (regression guard) |
| hub list of 60 px rows; empty hub row | failed: page background is `--c-bg`, not grouped; no `.grouped-list` |
| tag chips with counted names; tag page rows | failed: page background is `--c-bg`, not grouped |
| 404 title, actions and recent rows | failed: no "페이지를 찾을 수 없습니다" heading |
| graph: segmented control and list view | failed: no `tab "그래프"` |
| graph: legend shapes and labels | failed: no chip named "운영체제" |
| graph: node shapes, token colors, 24 px hit areas, light and dark | failed: no `.graph-node` |
| graph: image description pointing to the list | failed: no description |
| graph: loading, error with retry, empty | failed: the graph never fetches, so no state appears |
| backlinks and related posts as grouped rows | failed: no `.grouped-list` |
| local graph list view | failed: no `tab "그래프"` |
| no sideways scrolling at 320 px on 7 routes | passed (regression guards) |

### Step 23: other blog pages, Green

Commit `4d32ede`.

- The same unit command: 37 passed. The pages spec: 75 passed in three browsers.
- All HIG specs: 702 passed, 3 skipped. The homepage overflow with 200 % text at 320 px is gone: the profile actions are now wrapping 44 px capsules.
- `npm run test:unit`: 335 passed. `npm run test:pbt`: 37 passed. `npx astro check`: 0 errors. `cargo test --release`: 110 passed.
- One existing assertion changed with the design. `hig-appearance.spec.ts` checks the root background on `/`, and the homepage now sits on `--c-bg-grouped` (W5). Its light value is therefore `rgb(242, 242, 247)`; dark stays `rgb(0, 0, 0)`. The check still tells light from dark.
- The graph island now loads `/graph.json` itself instead of receiving the whole graph as island props. This gives it loading, error and empty states (W8), and the graph no longer has to be serialized into the page HTML. The list view is built from the same build-time data, so it still works when the request fails.
- "No new island" (plan, Risks): no island component was added. The list views are static Astro (`GraphList.astro`) or part of existing islands (`LocalGraph.tsx`).
- The tag page's empty state ("이 태그가 달린 글이 없습니다.") is in the template. No route can show it, because a tag page exists only for a tag that has posts.

### Step 24: other blog pages, Refactor

Commit `be1cf7a`. The post header's tags now use the shared `.tag-chip` from `grouped.css` instead of a second chip style in `post.css`, and one redundant rule left `home.css`.

Results:
- The pages, post and chrome specs passed 672 with 3 skipped in three browsers.
- The homepage unit tests (`homepage-composition` and `render-sections`) passed 18.
- `npm run test:unit` passed 335 and `npm run test:pbt` passed 37.
- `npx astro check` reported 0 errors.

### Step 25: search, Red

`site/tests/e2e/hig-search.spec.ts` has 13 tests. In Chromium they cover:
- the dialog role and label, and the inert page behind it;
- the focus trap and focus returning to the trigger;
- ⌘K and Ctrl K;
- the combobox and listbox keyboard behavior, with the "결과 N개" announcement;
- IME composition, and a Korean query;
- the empty, loading and error-with-retry states;
- the close button and the dialog's placement at 320, 768, 1024 and 1440 px.

`site/tests/unit/search.test.ts` covers a pure search module that the rewrite extracts from `Search.tsx`:
- it validates the index and drops hits that point at no document;
- it never modifies its input (today's code caches sorted keys on the fetched object);
- it matches prefixes, ranks titles first, finds Korean words and returns at most 10 results.

Red results:
- `npx vitest run tests/unit/search.test.ts` failed: `Cannot find module '../../src/lib/search'`.
- `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-search.spec.ts` failed 39 of 39 (13 in each browser), each at `getByRole('dialog', { name: '검색' })`: element(s) not found. Today's search is an unlabelled `div` overlay.

### Step 26: search, Green

Commit `8b54dc6`.

Results:
- The search unit tests passed 9.
- The search spec passed 39 in three browsers.
- All HIG specs passed 741 with 3 skipped.
- `npm run test:unit` passed 344. `npm run test:pbt` passed 37.
- `npx astro check` reported 0 errors.

Fixes on the way:
- The first run failed the placement check at 768 px and wider. The dialog was measured during its 250 ms entrance, which moves it by `translateY`. The test now waits for the dialog's animations to finish (`getAnimations().finished`) before it measures. The tolerance is unchanged at ±2 px.
- The design labels the dialog with a visually hidden "검색" heading. Because the closed dialog is in every page's HTML, that heading added an h2 to every page outline. `profile-presentation.test.ts` caught it: the extra "검색" broke four of its pinned profile heading lists. The dialog is named with `aria-label="검색"` instead. The profile test is unchanged, as FR6.3 requires.

Other changes in this step:
- The outline sheet and the search dialog now share one Tab trap (`site/src/lib/focus-trap.ts`).
- Any `[data-search-open]` control passes itself in the `open-search` event, so focus returns to it in WebKit too. There, a click does not focus a button.

### Step 27: search, Refactor

Commit `a211e13`. `lib/focus-trap.ts` became `lib/modal.ts`. It now also holds `isBackdropClick()`, which the outline sheet and the search dialog had each written for themselves.

Results:
- The search and post specs passed 104 with 1 skipped in three browsers.
- `npm run test:unit` passed 344.
- `npx astro check` reported 0 errors.

### Step 28: profile pages and print, Red

`site/tests/e2e/hig-profile.spec.ts` has 19 tests per browser:
- the grouped background and the segmented local navigation on the four profile routes;
- the segmented role navigation, and project jump links as 44 px capsule chips with an icon instead of "↘";
- case studies as grouped cards (`--c-surface`, 22 px radius, six labelled dimensions, disclosures closed);
- résumé entries as grouped rows with a chevron instead of "+" or "−", and skill groups on `--c-surface`;
- contact actions as 44 px capsules;
- every control at 44 px with no sideways scrolling at 320 px;
- the 24 KiB gzip budget for the stylesheets that only profile routes load (the union over the four routes, minus what `/404`, `/tags` and `/graph` all load);
- the résumé printing on A4 with 12 mm margins, every text run at 10 pt or more with a line height of 1.35 or more (R-09).

`npx playwright test --config playwright.hig.config.ts tests/e2e/hig-profile.spec.ts`: 54 failed, 3 passed. The 3 passes are the CSS budget test in each browser, a regression guard. Chromium reasons:

| Check | Received |
|---|---|
| page background | `rgb(255, 255, 255)`, expected `--c-bg-grouped` `rgb(242, 242, 247)` |
| segmented track | `rgba(0, 0, 0, 0)`, expected `--c-fill` |
| chips | the "↘" glyph; the chips are not capsules |
| case studies, résumé rows, contact actions, 320 px controls | flat bordered boxes, a "+" marker, underlined links and 32 px controls, against grouped cards, a chevron, capsules and 44 px |
| print | `h1` 13.33px/16px, `h2` 13.33px/17.33px and 14.67px/19.07px, `h3` 13.33px/17.33px and 14px/18.2px: each line height is under 1.35 |

One defect in the new spec was fixed before this run: Chromium serializes the `@page` size as "a4", so the size is compared case-insensitively.

`profile-presentation.test.ts` needs no change: the restyle keeps every class, `data-profile-*` attribute and heading it pins.

### Step 29: profile pages and print, Green

Commit `f5cf88e`. The profile spec passed 57 in three browsers. All HIG specs passed 798 with 3 skipped; that run came before one last print-only fix, which removed the skill rows' screen separators from paper, and the profile spec passed again after it. `npm run test:unit` passed 344, including `profile-presentation` unchanged. `npm run test:pbt` passed 37. `npx astro check` reported 0 errors.

Markup changes, all outside what `profile-presentation.test.ts` pins:
- The "↘" glyph in the project jump links became a decorative Lucide `ArrowDownRight` icon (FR5.9).
- The three profile routes pass `surface="grouped"` to `BaseLayout`.

The screen-only selectors that `pdf-renderer.mjs` uses are unchanged. `print.css` now hides the new `.search-dialog` instead of the removed `.search-overlay`.

Review subjects touched in this step: `src/pages/resume.astro`, `src/pages/portfolio.astro` and `src/styles/profile/**`. As the plan expects, the accessibility record will be redone once, in Step 37.

### Step 30: profile pages, Refactor, and verification baselines

Commit `ea2993b`.

**Inline-script baselines.** `INHERITED_INLINE_SCRIPT_BASELINES` in `asset-budget.mjs` now holds the three scripts the redesign replaced on purpose. A comment cites FR3.2 and FR5.10, and FR5.2 for the dispatcher. Astro's three island loaders are unchanged.

| Script | Before | After |
|---|---|---|
| Appearance bootstrap | 2,311 B | 1,470 B, `4545842e…` |
| `[data-search-open]` dispatcher (module) | 149 B | 170 B, `b70631db…` |
| Reading progress and back to top | 769 B | 1,428 B, `2f24e41f…` |

**A provenance gap that Step 17 exposed.** The budget analysis was run against a verification build: `PROFILE_VERIFICATION_BUILD=1 npx astro build`, which writes the private build manifest, then `analyzeProfileAssets()`. It failed with `PROFILE_CSS_INLINE_TRANSFORM_UNAPPROVED` on `/resume`.
- Cause: Step 17 moved the Pretendard `@font-face` CSS out of `profile/font.css` into the global `fonts.css`. The shared profile chunk (font.css and foundation.css) then fell below Vite's 4 KiB inline limit, so Astro inlined it into each profile route.
- The resolver attributed every inline sheet to the page component's own Rollup asset. A shared chunk's asset is imported by the shared chunk, not by the page, so the resolver compared the inline bytes against the wrong asset.
- The resolver now traces an inline sheet first to the one asset whose bytes it carries under an approved transform: identical bytes, or the same bytes without Vite's trailing marker. If no single asset matches, it falls back to the old component rule, which still fails closed.
- Two fixture tests cover the change in `profile-tooling.test.ts`: an inlined shared sheet is traced, and an altered inlined sheet is still refused. All existing budget tests pass unchanged.
- No threshold, limit or rule was relaxed. `asset-budget.mjs` is explicitly not a review subject.
- After the Step 30 refactor, the shared chunk is 4,145 bytes and external again. The resolver handles either outcome.

**CSS budget.** The verification build passes:
- The profile CSS union is 4,487 bytes gzip against the limit of 24,576. At baseline it was 19,779 bytes; most of the drop is the font CSS moving to the global layer, where the tool does not count it.
- For full disclosure, all CSS that `/resume` loads, the global layer included, is 23,966 bytes gzip, and `/portfolio` loads 23,202.

**Obligation map.** No test that `tests/obligations/u1-profile.json` references was renamed, so the map needs no change; `obligation-map.test.ts` passes.

**Refactor.** The résumé entries and the case-study disclosures share one chevron mask and rule in `foundation.css`.

Results: `npm run test:unit` passed 346. `npm run test:pbt` passed 37. The profile and chrome specs passed 589 with 2 skipped. `npx astro check` reported 0 errors.

### Step 31: environment and build configuration

Commit `293d2a8`.

**Changes.**
- KaTeX's stylesheet and fonts come from the installed `katex` package (0.16.45), imported by `PostLayout.astro` and `index.astro`. Vite emits the fonts under `_astro/`. The rendering library is the same version, where the CDN served 0.16.22.
- The jsDelivr preconnect and the CDN KaTeX link are gone from the route resource policy. The policy keeps its shape and its fail-closed validation.
- `cdn.jsdelivr.net` is no longer an allowed host in `homepage.spec.ts`.

**Red.** The self-hosting edit was written before the spec. To record a genuine Red, the three source edits were set aside with a path-limited `git stash push`, the site was rebuilt, and the new spec ran. The stash was then popped, and `git stash list` was empty again.
- `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-performance.spec.ts`: 30 failed, 18 passed, 12 skipped.
- The 30 failures were the 10 non-profile routes in three browsers, each requesting `cdn.jsdelivr.net`.
- The Core Web Vitals and CSS-budget tests already passed in Chromium, as regression guards.

**Green.** The same command passed 48 with 12 skipped (the Chromium-only tests in Firefox and WebKit). All HIG specs passed 846 with 15 skipped. `npm run test:unit` passed 346. `npx astro check` reported 0 errors.

**Measurements.**
- At a 412 × 823 viewport with 4× CPU throttling: LCP was 84 ms on `/`, 204 ms on `/posts/post-with-code`, 152 ms on `/posts/post-with-diagrams`, 72 ms on `/graph` and 112 ms on `/resume`. CLS was 0.000 and TBT 0 ms on every route.
- These numbers are optimistic. As the plan specifies, only the CPU is throttled. Lighthouse's mobile profile also simulates a slow 4G network, and the server here is loopback.
- Blog CSS, KaTeX rules and font faces excluded, peaks at 26,969 bytes gzip on post routes against the 30,720-byte limit. The global layer is 20,652 bytes of that, 15,913 of them Pretendard's 92-subset `@font-face` rules. With KaTeX included, a post route loads 34,863 bytes, because the bundled KaTeX rules with hashed font URLs are 7,912 bytes.

### Step 32: full verification on the feature branch

All runs are on `feature/hig-redesign` at `293d2a8`, with the fixture build.

| Suite | Command | Result |
|---|---|---|
| Rust | `cargo test --release` | 110 passed, 0 failed (baseline 110) |
| Site unit | `npm run test:unit` | 346 passed in 28 files (baseline 300 in 22) |
| Site properties | `npm run test:pbt` | 37 passed in 6 files, seed 1334304196 (baseline 37) |
| Type check | `npx astro check` | 0 errors, 0 warnings, 7 hints in 186 files (baseline 0 errors, 6 hints in 159) |
| HIG browser checks | `npx playwright test --config playwright.hig.config.ts` | 846 passed, 15 skipped, 0 failed in chromium, firefox and webkit |
| Cross-unit | `just crossunit` | the link sweep stops the recipe at 1 broken link (see below); the recipe's Playwright half run on its own (`npx playwright test --config playwright.crossunit.config.ts`): 8 passed |

The 15 skips are deliberate:
- Reduced-transparency emulation exists only in Chromium (2).
- Firefox has no `isMobile` touch emulation (1).
- The Core Web Vitals and blog CSS tests run in Chromium only (12).

**`just crossunit`.** The one broken link is `/posts/post-with-image/` → `/assets/nonexistent-image.png`. That is the fixture vault's deliberately missing image (`Post With Image.md`, since March). The U3 record (`261019-obsidian-press-resume-an/.../code-generation-summary.md`) names it "the fixture's intended negative": it shows that the sweep detects a broken link on the fixture build, while a real-vault build shows the sweep reports no false positives.
- A real-vault build is outside this run: the rules forbid running the preprocessor on the vault.
- The sweep therefore still reports exactly that one intended negative and nothing else, and it is red only because of it.
- The sweep was not changed.

### Step 33: merge the redesign

1. `git checkout develop`.
2. `git merge --no-ff --no-edit feature/hig-redesign` created `0571b8a` ("Merge branch 'feature/hig-redesign' into develop") over `7896636`, bringing in 13 commits. Git's default message was kept.
3. `git branch --merged develop` listed the branch, so `git branch -d feature/hig-redesign` deleted it. Its tip was `293d2a8b6a3b9db9fdc8eabebba48520b11f2897`.

Nothing was pushed.

### Step 34: Prettier, Red then Green

Branch `chore/prettier-site`, created from `develop` at `0571b8a`. Three commits:
- `667a2c2` adds the configuration and the scripts.
- `ce9fa9b` makes one test independent of quote style.
- `54e48ea` is the dedicated reformatting commit.

**Configuration.**
- `prettier` 3.9.9 and `prettier-plugin-astro` 1.1.0 are pinned exactly in `devDependencies`. Each is one patch behind the latest release (3.9.10 and 1.1.1) and about four weeks old. The lockfile already held `prettier` 3.8.2, an optional peer of `@astrojs/language-server` (pulled in by `@astrojs/check`). Every range in the lockfile accepts 3.9.9.
- `site/.prettierrc`: two spaces, semicolons, `singleQuote: true`, `printWidth: 100`, `trailingComma: "es5"`, and the Astro plugin.
- `trailingComma: "es5"` never puts a comma after the last argument of a call, which is ES2017 syntax. `BaseLayout.astro`'s inline scripts must stay ES5.
- `printWidth: 100` was measured against 80 on the 208 files any candidate would change. "Lines written" counts output lines not found in the input:

| Width and commas | Lines written | Total lines after | Files newly over 800 lines |
|---|---|---|---|
| 100, es5 (chosen) | 7,384 | 59,454 (from 64,553) | none |
| 100, all | 6,070 | 59,463 | none |
| 80, all | 7,036 | 66,230 | `profile-presentation.test.ts` 781 → 941 |
| 80, es5 | 9,343 | 66,199 | `profile-presentation.test.ts` 781 → 936 |

- `site/.prettierignore` leaves alone: build output (`dist`, `.astro`, `.generated`, `.artifacts`), `node_modules`, the preprocessor's `public/*.json` and `public/assets`, `verification/` and `package-lock.json`.
- npm scripts: `format` (`prettier --write .`) and `format:check` (`prettier --check .`).

**Red.** After `667a2c2`, `npm run format:check` exited 1:

```text
[warn] tests/unit/verification-provider-schema.test.ts
[warn] tsconfig.profile-tools.json
[warn] Code style issues found in 199 files. Run Prettier with --write to fix.
```

**What the first reformat broke, and the fixes.**
- The unit suite failed to load `hig-tokens.test.ts`: `Error: tokens.css has no block opened by :root:not([data-theme="light"]) {`. Prettier prints CSS attribute selectors with single quotes, and the test looked for the double-quoted text. In `ce9fa9b`, a `"` in the opener now matches either quote. The checked tokens and values are unchanged.
- Comparing renders before and after the reformat showed one visible change. On `/tags`, the chips read "# test" instead of "#test" in all three engines, and each chip grew 4.5 px wider. Prettier had split `<span><span class="tag-chip-mark">#</span>{tag}</span>` over three lines, and the whitespace between `#` and the name renders as a space. That one line now carries `{/* prettier-ignore */}`. Astro drops the comment from the output.
- To keep the reformatting commit mechanical, the first reformat was set aside with a path-limited `git stash push -- site`, and the test fix was committed on the unformatted tree. `npm run format` then ran again and the `prettier-ignore` line was added back. `git diff stash@{0} -- site` was empty, so the stash (`2c84bc6`) was dropped.

**Green.** After `54e48ea`, `npm run format:check` exited 0: `All matched files use Prettier code style!`

**Rendering check.**
- The site was built before and after the reformat; two builds of the same tree fingerprint identically.
- The 25 JS and CSS files under `_astro/` are byte-identical.
- The HTML has no tag or text changes, only whitespace and the text of the inline scripts.
- Both builds were served locally on ports 4811 and 4812. In Chromium, WebKit and Firefox, at 1280 × 800 and 390 × 844, every one of the 34 pages had the same rendered text (`innerText`) and the same box for every visible element.

**File size.** No file newly passed 800 lines. The file closest to the limit, `tests/unit/profile-presentation.test.ts`, went from 780 to 786.

Results: `npm run test:unit` passed 346 in 28 files. `npm run test:pbt` passed 37. `npx astro check` reported 0 errors, 0 warnings and 7 hints in 186 files.

### Step 35: Prettier, Refactor and merge

Commit `7da31af`.

**Red.** After a verification build (`PROFILE_VERIFICATION_BUILD=1 npx astro build`), `analyzeProfileAssets()` failed with `PROFILE_INLINE_SCRIPT_UNAPPROVED`: 4 of the 6 approved inline scripts matched on `/resume`. The two that did not are the ones Prettier rewrote in `BaseLayout.astro`:
- the appearance bootstrap, now 1,598 bytes (`4c9847f0…e3d92b`);
- the reading-progress and back-to-top script, now 1,440 bytes (`420432ac…7b5ff6`).

**Refactor.** `INHERITED_INLINE_SCRIPT_BASELINES` in `asset-budget.mjs` takes the two new entries, and its comment says why. The `[data-search-open]` dispatcher and Astro's three island loaders still match: Vite emits the dispatcher and Astro emits the loaders, so the reformat does not change their bytes.

**Green.** The budget passes again. Profile CSS is 4,487 bytes gzip against the 24,576-byte limit, the same as before the reformat.

**Step 32 suites, rerun on `chore/prettier-site` at `7da31af`:**

| Suite | Command | Result |
|---|---|---|
| Rust | `cargo test --release` | 110 passed, 0 failed |
| Site unit | `npm run test:unit` | 346 passed in 28 files |
| Site properties | `npm run test:pbt` | 37 passed in 6 files, seed 1550045853 |
| Type check | `npx astro check` | 0 errors, 0 warnings, 7 hints in 186 files |
| Formatting | `npm run format:check` | all files match |
| HIG browser checks | `npx playwright test --config playwright.hig.config.ts` | 846 passed, 15 skipped, 0 failed (3.7 min) |
| Cross-unit | `just crossunit` | the link sweep reports only the fixture's intended negative, as in Step 32 (`/posts/post-with-image/` → `/assets/nonexistent-image.png`, 1 of 34 pages); the Playwright half passed 8 |

**Merge.**
1. `git checkout develop`.
2. `git merge --no-ff --no-edit chore/prettier-site` created `f16f02a` ("Merge branch 'chore/prettier-site' into develop") over `0571b8a`, bringing in 4 commits.
3. `git branch -d chore/prettier-site` deleted the branch. Its tip was `7da31af15fed42bb11ee9cac1ab459e0a801624b`.

Nothing was pushed.

### Follow-up to Steps 20–29: transitional token aliases removed (not a plan step)

`base.css` still held a "Transitional aliases" block whose comment said the names stay "only until the stylesheets that still read them are rebuilt (code-generation plan Steps 20–29)". Those steps are done:
- `--c-text-muted`, `--c-border`, `--c-accent`, `--c-accent-hover` and `--radius` had no reader left in `src/`, `tests/` or `scripts/`, so they are deleted.
- `--max-width` (820 px) is still read by `.site-main` and the profile shell. It moved to the Layout group of `tokens.css`, with a note on how it differs from `--max-reading`.

`base.css` and `tokens.css` are review-subject files, so the cleanup landed before the one 16-state review. Done later, it would have voided that review again.

- Branch `refactor/hig-token-aliases`, commit `bae28e2`.
- Merged with `--no-ff --no-edit` as `b147a0f` ("Merge branch 'refactor/hig-token-aliases' into develop"), then deleted with `-d`.

**Rendering check.** Before and after builds were compared as in Step 34: Chromium, WebKit and Firefox, 1280 × 800 and 390 × 844, all 34 pages.
- The final comparison found no difference in rendered text or element boxes.
- The first comparison flagged 14 of 305 boxes on `/posts/post-with-math` in Firefox only: KaTeX's visually hidden MathML spans, 0.5 px apart. A rerun showed no difference, and a comparison of one build with itself showed none either.

Results: `npm run test:unit` passed 346. `hig-tokens.test.ts` passed 9. The HIG checks passed 846 with 15 skipped. `npm run format:check` passed.

### Defect found at Step 36: the self-hosted Pretendard never loaded (not a plan step)

The first `npm run resume:pdf -- --prepare` stopped with `PDF_RENDER_FONT_NOT_READY: The profile font was not usable at résumé body size when printing began.`

**Cause.** Since Step 17, `fonts.css` had been reached through `global.css`'s `@import` chain, which starts in BaseLayout's `<style is:global>` block.
- On that path, Vite neither resolved the `url(./woff2-dynamic-subset/…)` references inside the generated `pretendard-profile.css` nor emitted the font files.
- All 92 `@font-face` sources returned 404. On `/resume`, `document.fonts` held 92 "RVNNT Profile" faces, 0 loaded, and the face covering U+0020 had status `error`.
- The two preloaded subsets were emitted only through BaseLayout's `?url` imports, under hashed names that no face referenced.
- Every route rendered in the metric-matched fallback. That is why layout, contrast and Core Web Vitals checks stayed green and nothing visual gave it away.
- Before the redesign, the profile pages imported `profile/font.css` from their frontmatter, and the files were emitted.

**Red.** The new `tests/unit/hig-built-assets.test.ts` builds into a temporary directory and checks three things: every `url()` in the built CSS names an emitted file, there are 92 "RVNNT Profile" faces, and both font preloads are files those faces use. It failed twice:
- `missing: 92`, starting with `_astro/BaseLayout.0RVfxrH8.css -> ./woff2-dynamic-subset/PretendardVariable.subset.0.woff2`;
- the two preloads `/_astro/PretendardVariable.subset.91.Csm0YNoH.woff2` and `.90.BF7RiZjm.woff2` were used by no face.

**Green.** `fonts.css` left `global.css` and is now imported from BaseLayout's frontmatter, with comments in all three files saying why. The build emits the 92 subsets with hashed names, and the preloads are the files the faces use.
- Both new tests pass.
- On `/resume`, `document.fonts.check('10pt "RVNNT Profile"')` is true and 13 faces load.
- Fonts per route: `/` 10 files and 261,348 bytes; `/resume` 13 and 340,856; `/portfolio` 15 and 389,832; `/posts/post-with-code` 12 and 314,148; `/tags/` 7 and 181,732. No font request fails.

- Branch `fix/hig-self-hosted-font`, commit `fada273`.
- Merged with `--no-ff --no-edit` as `69a57c1`, then deleted with `-d`.

Results: `npm run test:unit` passed 348 in 29 files. `npm run test:pbt` passed 37. `npx astro check` reported 0 errors. The HIG checks passed 846 with 15 skipped, the Core Web Vitals checks included. The profile asset budget passed (profile CSS 4,487 bytes gzip). `npm run format:check` passed.

### Step 36: PDF candidate

After the font fix, `npm run resume:pdf -- --prepare` on `develop` at `69a57c1` returned `prepared`:

| Field | Value |
|---|---|
| Candidate | `8017640eb9df01c7e095e7e12d76d748a3fa3f68ed0cc8cb4e413f59d903a1e3` |
| PDF SHA-256 | `bf208b5def2b214c4928e49680aebea9a85b714c0c5439f130362af930f6b49c` |
| Source identity | `2cd2d13d4807d77b5d9969eeb0320182eb9b996386d11f4da0c50755caee4841` |
| Manifest fingerprint | `b31ee0c2ebdb1fb8c29e65164d15e2870821fbdebfad040fac4cb8d56f54caae` |
| Pages, mapped facts, surface parity | 1, 42, `pass` |
| Review page | `site/.artifacts/profile/pdf/viewer/8017640eb9df01c7e095e7e12d76d748a3fa3f68ed0cc8cb4e413f59d903a1e3.html` |
| Candidate PDF | `site/.artifacts/profile/pdf/candidates/8017640e….pdf` (257,996 bytes) |
| Draft receipt | `site/.artifacts/profile/pdf/candidates/8017640e….draft.json` (SHA-256 `4138f737…72d22`) |

- Everything above is under the gitignored `.artifacts/`.
- `site/public/resume.pdf` and `site/verification/**` are unchanged.
- `--promote` was not run: promotion is the maintainer's decision after reviewing this exact SHA.
- Rerunning `--prepare` would replace the candidate, because candidates are not byte-reproducible.

### Step 37: accessibility review hand-off

`npm run test:e2e` on `develop` at `69a57c1` performed the font verification and the clean build, then ran the automated browser checks.
- The browser evidence passed: 6 of 6 spec files, 0 failed, 48 matrix cells, Axe 4.12.1, all three engines.
- The run then stopped where the plan expects, at the human gate: `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`, with `reviewSubjectDigest` `4b45fd8f0a243c942fcda10e7b1228d8f6fc5aecb754bd07456c25bc4bb37e47`.

That digest is the value the maintainer's new record must carry. The Step 38 documentation touches no review-subject file, so it stays valid. `site/verification/profile/manual-web-accessibility.json` was not written or re-stamped.

What the maintainer reviews:
- M-01 to M-05 from `inception/refined-mockups/accessibility-checklist.md`.
- M-05 is the 16-state matrix: `/resume` and `/portfolio`, at 320x800 and 1440x900, in light and dark, with disclosures `closed` and `all-open`, all in Chromium.
- Each state takes four judgements: `colorIndependentMeaning`, `focusAppearance`, `focusObscuration` and `readingOrder`.

The record the provider accepts:
- `schemaVersion: 1` and `result: "pass"`.
- `reviewSubjectSchemaVersion: 1` and the digest above.
- A non-empty `reviewer` and an ISO `reviewedAt`.
- Exactly those 16 `states`.
- `targetSizeExceptions`: a list of `{element, rationale, wcagException}`, which may be empty.
- `skippedReasons: []`.

The current record lists 12 states with `/portfolio` as `not-applicable`. Both pages now have native disclosures, so `/portfolio` takes `closed` and `all-open` too.

### Step 38: documentation

Branch `docs/hig-redesign`, commit `a190139`.

**`CLAUDE.md`:**
- The appearance model, and the removal of `solar.ts`.
- The token layer in `tokens.css` and the `--c-` color names, replacing the retired `--c-text-muted`, `--c-border` and `--c-accent`.
- Self-hosted Pretendard and KaTeX, including why `fonts.css` is imported from BaseLayout's frontmatter.
- The pinned inline-script baselines, and the code-language label.
- Prettier and the `prettier-ignore` rule for inline nodes that must touch.
- The ignored `.aidlc/worktrees/`.
- The test commands and counts: Rust 110 (33 unit, 77 integration) on 15 fixture notes, unit 348, properties 37, the HIG suite (861 tests: 846 pass, 15 skip), `just crossunit` and its intended negative, and the record `npm run test:e2e` waits for.

**`site/README.md`:**
- The manual accessibility record covers 16 states, not 12.
- It now names the four judgements per state and the files actually in the review subject.
- The digest to record is carried by the `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` error.

**Merge.** `--no-ff --no-edit` as `aeb36cc` ("Merge branch 'docs/hig-redesign' into develop"), then `git branch -d`.

**Check.** `npm run test:e2e`, rerun after the merge, reports the same `reviewSubjectDigest` (`4b45fd8f…37e47`).

Nothing was pushed. `origin/develop` and `origin/main` are unchanged.

## Loop-back 1 Repair (plan Steps 39–52)

Build and Test failed six targets whose cause lies in the first attempt's code and tests (`construction/build-and-test/test-results.md`, "Loop-Back Log"). Each fix below has its own branch off `develop`, and each Red was recorded here before its Green.

**Summary.** `develop` moved from `aeb36cc` to `204066f` through six `--no-ff` merges. Nothing was pushed.

| Target | Fix | Evidence |
|---|---|---|
| NFR2-a (diagram LCP), NFR2-b (CLS) | Post images carry their file's `width` and `height`. The first image, or the first light/dark diagram pair, loads eagerly at high priority (`src/lib/image-size.ts`, `render.ts`) | Mobile-profile LCP on the diagrams post: 4,124 ms → about 1,705 ms, and CLS 0.1011 → 0 |
| NFR1-c (UI components 3:1) | The selected segment is ringed in `--c-segment-indicator` | 1.01–1.74:1 → 3.81–6.56:1 against the track |
| NFR1-b (text 4.5:1) | `--c-selected-secondary-text`, `--c-code-highlight` and `--c-mark-fill`. A current tag chip keeps its colors on the grouped background | 3.81 → 9.00; 3.71 → 4.64; 4.36 → 4.66; 1.00 / 2.13 → 5.47 |
| NFR1-e (200% text, clipping), AC4.1 | The overflow helper reports content cut off by `hidden` or `clip` boxes, and a six-width matrix runs in both appearances. The post-row summary wraps long tokens | 15 C-14 failures found and fixed; the matrix passes on 14 routes |
| TC-9 (missing Reds) | A fold test for the `ResizeObserver`, and the inline-sheet tracing Red reproduced | Both Reds recorded, with the implementation set aside and then restored identical to `HEAD` |
| TC-10 (`bugfix` regression) | `mmdc_args()` and `puppeteer_config_in()` extracted, with three tests | Rust 110 → 113 |

### Branch `fix/hig-image-loading` (NFR2)

#### Step 39: Red

**Unit test.** New `site/tests/unit/render-images.test.ts`, 8 tests, rendering through `renderMarkdown()` against a temporary assets folder:
- SVG sizes from the root `width` and `height`, in CSS pixels (`pt` converted), and from the root `viewBox` when the root gives no absolute size. The D2 and Mermaid roots are copied from the fixture build: D2 has only a `viewBox`, and Mermaid has `width="100%"`.
- PNG, GIF, JPEG (baseline and progressive) and WebP (`VP8 `, `VP8L`, `VP8X`) sizes from their headers. A JPEG whose EXIF orientation turns it a quarter turn has its width and height swapped, as browsers display it.
- A width the note set (`![[image.png|300]]`) is kept, and the matching height is added.
- The first image is eager with `fetchpriority="high"`, and later images are lazy. Both images of the first light/dark diagram pair are eager; later pairs are lazy.
- Missing, unreadable, sizeless, outside (`/assets/../`) and remote images stay unsized, and rendering does not throw.

`npx vitest run tests/unit/render-images.test.ts`:

```text
× sizes an SVG from its root width and height, in CSS pixels
× sizes D2 and Mermaid diagrams, whose roots give no absolute size, from the root viewBox
× sizes PNG, GIF, JPEG and WebP images from their file headers
× swaps a JPEG’s width and height when its EXIF orientation turns it a quarter turn
× keeps a width the note set and adds the matching height; keeps both when both are set
     expected [ [ '300', null ], [ '300', '100' ] ] to deeply equal [ [ '300', '200' ], [ '300', '100' ] ]
× loads the first image eagerly at high priority and every later image lazily
× loads both images of the first light/dark diagram pair eagerly, and later pairs lazily
     "/assets/d2-light.svg": expected "eager", "high"; received "lazy", null
Tests  7 failed | 1 passed (8)
```

The one pass is the "unsized when missing" test: nothing is sized today, so it stands as a regression guard.

**Browser test.** `hig-performance.spec.ts` gains "Core Web Vitals on Lighthouse's mobile network profile (NFR2)" in Chromium:
- a 412 × 823 viewport at DPR 1.75, with touch;
- 4× CPU throttling;
- 562.5 ms request latency, 1,474.56 kbps down and 675 kbps up, through `Network.emulateNetworkConditions`.

It asserts LCP under 2,500 ms and CLS under 0.1 on `/`, `/posts/post-with-diagrams`, `/posts/post-with-math`, `/posts/post-with-code`, `/graph` and `/resume`.

`npx playwright test --config playwright.hig.config.ts --project=chromium tests/e2e/hig-performance.spec.ts`: 1 failed, 25 passed.

```text
✘ Core Web Vitals on Lighthouse's mobile network profile (NFR2) › /posts/post-with-diagrams: LCP under 2.5 s and CLS under 0.1 with 4× CPU and slow 4G
  Error: LCP 4140 ms
  Expected: < 2500
  Received:   4140
```

The values per route, from a second run of the new tests alone:

| Route | LCP ms | CLS |
|---|---|---|
| `/` | 1,632 | 0.0000 |
| `/posts/post-with-diagrams` | **4,124** | **0.1011** |
| `/posts/post-with-math` | 1,728 | 0.0001 |
| `/posts/post-with-code` | 1,756 | 0.0025 |
| `/graph` | 1,600 | 0.0087 |
| `/resume` | 1,644 | 0.0000 |

The command in `unit-test-instructions.md` reads `--project chromium tests/e2e/…`. Playwright's `--project` takes several values, so it read the spec path as a second project name and refused to run. The runs here use `--project=chromium`.

#### Step 40: Green

- **New `site/src/lib/image-size.ts`.** A pure reader with no new dependency.
  - SVG: the root element's `width` and `height` in CSS pixels (`px`, `pt`, `pc`, `in`, `cm` and `mm` are converted), else its `viewBox`. With one absolute side, the other follows the `viewBox` ratio. Percentages and `em` give no size. Comments before the root and nested `svg` elements are ignored.
  - Raster: the PNG `IHDR`, the GIF screen size, the JPEG start-of-frame segment (with the EXIF quarter-turn swap), and the WebP `VP8 `, `VP8L` and `VP8X` headers.
  - `assetImageSize()` reads only files inside the assets folder. A missing, unreadable or unknown file gives no size, and the image keeps its unsized markup. The preprocessor already reports a missing attachment, and the link sweep reports the broken link, so the reader adds no third report.
- **`render.ts`, `rehypeImageCaption()`.**
  - The first image, or both images of its light/dark diagram pair, gets `loading="eager"` and `fetchpriority="high"`; every later image stays `loading="lazy"`.
  - Each `/assets/` image gets its file's `width` and `height`. A width the note set (`![[image.png|300]]`) is kept, and the height follows the file's ratio.
  - `renderMarkdown()` takes an optional `assetsDir` and passes it in the file's data. The default is `../content/assets`, resolved the way `data.ts` resolves `../content`.
  - The transformer is typed with `unified`'s `Transformer`, a declared dependency. A type import from `vfile`, which `package.json` does not declare, would have repeated review finding R-01.
- **No CSS change.** `img` keeps `max-inline-size: 100%` and `block-size: auto`, and `.diagram` keeps `inline-size: 100%`, so the attributes give only the aspect ratio. The light/dark opacity crossfade is unchanged.

**Results.**
- `npx vitest run tests/unit/render-images.test.ts`: 8 passed.
- `npx playwright test --config playwright.hig.config.ts --project=chromium tests/e2e/hig-performance.spec.ts`: 26 passed.
- `npx astro check`: 0 errors, 0 warnings, 7 hints in 189 files.

The new tests alone, three runs each (`--repeat-each=3`):

| Route | LCP ms | CLS |
|---|---|---|
| `/` | 1,620 / 1,668 / 1,624 | 0.0000 |
| `/posts/post-with-diagrams` | 1,692 / 1,696 / 1,700 | 0.0000 |
| `/posts/post-with-math` | 1,720 / 1,736 / 1,720 | 0.0001 |
| `/posts/post-with-code` | 1,736 / 1,752 / 1,748 | 0.0025 |
| `/graph` | 1,596 / 1,656 / 1,596 | 0.0087 |
| `/resume` | 1,680 / 1,668 / 1,656 | 0.0000 |

**Why the diagrams post is fixed.** The PT-3 diagnosis script, rerun on this build:
- The LCP element is still the first D2 diagram.
- It is now requested at 609 ms, while the HTML is parsed, instead of after layout at 1,646 ms. It arrives at 1,403 ms and paints at 1,692 ms.
- No layout shift is recorded. Both diagrams render at 380 × 130 and 380 × 65, the same size as before.

The built markup:

```html
<img src="/assets/post-with-diagrams-d2-1-light.svg" class="diagram diagram-d2 diagram-light" alt="" loading="eager" fetchpriority="high" decoding="async" width="803" height="274">
<img src="/assets/post-with-diagrams-mermaid-2-light.svg" class="diagram diagram-mermaid diagram-light" alt="" loading="lazy" decoding="async" width="410" height="70">
```

**One rendering effect outside the fixture.** An SVG attachment whose root gives only a `viewBox` used to stretch to the column, because it had no size of its own. With the attributes, it is drawn at its `viewBox` width when that is narrower than the column. Diagrams are not affected, because `.diagram` sets `inline-size: 100%`. The fixture vault has no such attachment.

#### Step 41: Refactor and merge

`rehypeImageCaption()` had taken on three jobs. Loading and sizing moved into a new `rehypeImageLoading()`, which runs just before it, so `rehypeImageCaption()` again only wraps described images in a figure. The output is unchanged. Prettier formatted the new files.

| Suite | Result |
|---|---|
| `npx vitest run tests/unit/render-images.test.ts tests/unit/render-extended-syntax.test.ts` | 20 passed |
| `npm run test:unit` | 356 passed in 30 files |
| `npx playwright test --config playwright.hig.config.ts --project=chromium tests/e2e/hig-performance.spec.ts` | 26 passed |
| `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-post.spec.ts` | 65 passed, 1 skipped (the Firefox touch test) |
| `npm run test:pbt` | 37 passed, seed 518448633 |
| `cargo test --release` | 110 passed |
| `npx astro check` | 0 errors, 0 warnings, 7 hints |
| `npm run format:check` | all files match |

- Commit `dff930e`, merged with `--no-ff --no-edit` as `22674cb` ("Merge branch 'fix/hig-image-loading' into develop"), then deleted with `git branch -d`.

### Branch `fix/hig-contrast-pairs` (NFR1)

#### Step 42: Red

Today's values, computed with the token test's formula (`s42-current-pairs.mjs` in the session scratchpad), match the review's evidence:

| Pair | Light | Dark | Needed |
|---|---|---|---|
| selected segment, the `--c-surface` pill against the `--c-fill` track, on `--c-bg` / `--c-bg-grouped` / worst-case thick glass | 1.15 / 1.27 / 1.30 | 1.01 / 1.01 / 1.74 | 3 |
| selected search option's snippet, `--c-text-secondary` on `--c-fill` over thick glass, without / with the scrim | 4.60 / 4.60 | **3.81 / 4.43** | 4.5 |
| Xcode colors on a highlighted line (`--c-fill` over `--c-code-bg`), the ones under 4.5 | comments 4.34 | comments 3.71, attributes 4.07, other functions 4.39, keywords 4.44, strings 4.47 | 4.5 |
| `--c-tint` link inside `mark` (orange 28% over `--c-bg`) | **4.36** | 6.88 | 4.5 |
| current tag chip's mark and count, `--c-text-secondary` on `--c-tint-fill` | 1.09 | 2.13 | 4.5 |

**Token test.** `hig-tokens.test.ts` has four new tests. Each pair is computed through a new state token, and the four tokens join the list the "both dark blocks agree" test checks:
- `--c-segment-indicator` against the `--c-fill` track on `--c-bg`, `--c-bg-grouped` and worst-case thick glass: at least 3:1.
- `--c-selected-secondary-text` on `--c-fill` over worst-case thick glass, with and without `--c-scrim`: at least 4.5:1.
- Every Xcode syntax color on `--c-code-highlight` over `--c-code-bg`: at least 4.5:1.
- `--c-tint`, `--c-tint-hover` and `--c-text` on `--c-mark-fill` over `--c-bg`: at least 4.5:1.

The current tag chip has no token test. The chip's own pair, `--c-on-tint` on `--c-tint-fill`, already passes in C-02 at 5.47:1. Its defect is which rule colors the chip, and a token test cannot see that.

`npx vitest run tests/unit/hig-tokens.test.ts`:

```text
× defines every design-system token, and both dark blocks agree
    expected [ '--c-segment-indicator', …(3) ] to deeply equal []
× the selected segment's indicator reaches 3:1 against its track on every ground (R-05)
    Error: --c-segment-indicator is not defined
× the selected search option's secondary line reaches 4.5:1 on its fill over thick glass, with and without the scrim (R-12)
    Error: --c-selected-secondary-text is not defined
× every Xcode-style syntax color reaches 4.5:1 on a highlighted code line (R-12)
    Error: --c-code-highlight is not defined
× a --c-tint link inside a highlight reaches 4.5:1 on --c-mark-fill (R-12)
    Error: --c-mark-fill is not defined
Tests  5 failed | 8 passed (13)
```

**Browser checks.** The Testing Contract makes the browser checks the failing tests for UI work, and only the browser shows which rule colors an element. A new helper, `renderedContrast()` in `tests/e2e/support/hig.ts`, measures text against its own and its ancestors' background colors composited to the first opaque one. No fixture note renders a highlight around a link, a highlighted code line or a current tag chip, so those tests set the state up on the page first. New checks, light and dark, in all three engines:
- `hig-pages.spec.ts`: the selected 그래프 | 목록 segment is ringed in `--c-segment-indicator`; a current tag chip keeps its name, mark and count at 4.5:1, on `/tags` and in a post header.
- `hig-profile.spec.ts`: the current segment of the local and role navigation on `/portfolio` is ringed the same way.
- `hig-search.spec.ts`: the selected option's snippet takes `--c-selected-secondary-text`, and unselected snippets keep `--c-text-secondary`.
- `hig-post.spec.ts`: a link inside `mark`, and every syntax color on a highlighted line of the TypeScript block, reach 4.5:1.

`npx playwright test --config playwright.hig.config.ts tests/e2e/hig-pages.spec.ts tests/e2e/hig-profile.spec.ts tests/e2e/hig-search.spec.ts tests/e2e/hig-post.spec.ts -g "selection states|segmented navigation selection|snippet takes|highlights"`: 30 failed, 6 passed, counting the chip test after its correction below. In Chromium (Firefox and WebKit matched it):

```text
✘ the selected 그래프 | 목록 segment is ringed in --c-segment-indicator, light and dark
    Expected substring: "rgb(99, 99, 102) 0px 0px 0px 1px inset"
    Received string:    "rgba(0, 0, 0, 0.12) 0px 1px 3px 0px, rgba(0, 0, 0, 0.04) 0px 0px 0px 0.5px"
✘ the current local and role segment is ringed in --c-segment-indicator, light and dark   (the same strings)
✘ the selected option's snippet takes --c-selected-secondary-text, dark
    Expected: "rgb(245, 245, 247)"   Received: "rgb(161, 161, 166)"
✘ a link inside a highlight reaches 4.5:1, light                       a "Simple Post": 4.36
✘ every syntax color reaches 4.5:1 on a highlighted code line, light   "// 인사말을 만듭니다": 4.34
✘ every syntax color reaches 4.5:1 on a highlighted code line, dark    comment 3.71; function, const, return and punctuation 4.44
✘ a current tag chip keeps its name, mark and count at 4.5:1, light    /tags: a.tag-chip "#test 11": 1.00
✘ a current tag chip keeps its name, mark and count at 4.5:1, dark     /posts/post-with-code: span.tag-chip-mark "#": 2.13
```

The 6 passes are the light snippet test, which this fix leaves as it is, and the dark highlighted-link test (6.88:1), in each engine.

**A defect the first chip check missed.** The first version measured only the mark and count, and it passed on `/tags`. There, `body[data-surface='grouped'] .tag-chip` outranks `.tag-chip[aria-current='page']`, so a current chip keeps its white `--c-surface` background while its name turns `--c-on-tint` white: 1.00:1. The check now measures the chip's own text too, on the grouped `/tags` and on a post page.

#### Step 43: Green

**Tokens (`tokens.css`).** Each token is defined in `:root`. Where its dark value differs, it is in both dark blocks:

| Token | Light | Dark | Use |
|---|---|---|---|
| `--c-segment-indicator` | `var(--c-text-secondary)` (#636366) | `var(--c-text-secondary)` (#A1A1A6) | the 1 px ring on the selected segment |
| `--c-selected-secondary-text` | `var(--c-text-secondary)` | `var(--c-text)` | the second line of a selected search option |
| `--c-code-highlight` | `rgba(120, 120, 128, 0.06)` | the same | the fill of a highlighted code line |
| `--c-mark-fill` | `rgba(255, 149, 0, 0.2)` | `rgba(255, 159, 10, 0.28)` | the `==highlight==` background |

**Stylesheets.**
- `segmented.css` and `profile/foundation.css`: the selected segment keeps its raised `--c-surface` pill and gains `inset 0 0 0 1px var(--c-segment-indicator)`. Under increased contrast, the ring stays and the shadow goes. `--c-control-border`, which that mode used before, is under 3:1 against the track on thick glass.
- `search.css`: `.search-option[aria-selected='true'] .search-option-snippet` takes `--c-selected-secondary-text`.
- `post.css`: `mark` takes `--c-mark-fill`. A highlighted line takes `--c-code-highlight` and a 3 px `--c-tint` bar at its start, so it stays visible on the fainter fill.
- `grouped.css`: on the grouped background a chip sits on `--c-surface` only when it is not the current one. A current chip's mark and count inherit its `--c-on-tint` text.

**Values reached** (the token test's formula, `s43-new-pairs.mjs` in the session scratchpad; light / dark):
- Selected segment ring against the track: 5.20 / 6.56 on `--c-bg`, 4.70 / 6.56 on `--c-bg-grouped`, and 4.60 / 3.81 on worst-case thick glass.
- Selected search snippet: 4.60 / 9.00 without the scrim, and 4.60 / 10.46 with it.
- Xcode comments on a highlighted line: 4.64 / 4.64, the lowest syntax pair.
- `--c-tint` inside a highlight: 4.66 / 6.88.
- Current tag chip: 5.47 in both appearances, in the browser.

**Departures from `design-system-mapping.md` and `interaction-spec.md`.** The approved plan allows these ("Phase E adjusts the segment, search-selection and highlight tokens where their contrast falls short"):
1. **Segmented Control.** The selection is no longer marked by the raised `--c-surface` pill alone, which reaches only 1.01–1.74:1. A 1 px `--c-segment-indicator` ring marks it in every appearance. The design had a ring only under increased contrast, in `--c-control-border`.
2. **Search Dialog.** In dark mode the selected option's snippet is `--c-text` instead of `--c-text-secondary`. The mapping's worst-case rule allows every text token on thick glass, but it does not cover a fill drawn on the glass. Light mode is unchanged.
3. **Code Highlighting.** The mapping did not define highlighted lines. The first attempt used `--c-fill`; they now use `--c-code-highlight` (6% gray) and a 3 px `--c-tint` bar.
4. **Highlight (`mark`).** The light fill is orange at 20% instead of 28%; dark is unchanged.
5. **Tag Chip, current state.** The tint capsule now also applies on the grouped background, and its mark and count follow its text color. No route renders this state yet.

**Results.**
- `npx vitest run tests/unit/hig-tokens.test.ts`: 13 passed.
- `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-pages.spec.ts tests/e2e/hig-profile.spec.ts tests/e2e/hig-search.spec.ts tests/e2e/hig-post.spec.ts -g "selection states|segmented navigation selection|snippet takes|highlights"`: 36 passed.

#### Step 44: Refactor and merge

The ring's light and dark values, written out in two specs, became one `SEGMENT_INDICATOR` constant in `tests/e2e/support/hig.ts`. Prettier formatted the changed files.

| Suite | Result |
|---|---|
| `npx vitest run tests/unit/hig-tokens.test.ts` | 13 passed |
| `npm run test:unit` | 360 passed in 30 files |
| `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-pages.spec.ts tests/e2e/hig-profile.spec.ts tests/e2e/hig-search.spec.ts tests/e2e/hig-post.spec.ts tests/e2e/hig-chrome.spec.ts` (the C-01 axe matrix included) | 804 passed, 3 skipped (2 reduced-transparency tests outside Chromium, 1 Firefox touch test) |
| `npm run test:pbt` | 37 passed |
| `cargo test --release` | 110 passed |
| `npx astro check` | 0 errors, 0 warnings, 7 hints |
| `npm run format:check` | all files match |

- Commit `4894156`, merged with `--no-ff --no-edit` as `4264181` ("Merge branch 'fix/hig-contrast-pairs' into develop"), then deleted with `git branch -d`.
- `profile/foundation.css` is a review subject, so the review digest changes, as the plan expects. Step 51 records the new one.

### Branch `fix/hig-overflow-check` (NFR1 200% text, AC4.1)

#### Step 45: Red

**The helper (`tests/e2e/support/hig.ts`, `horizontalOverflow()`).** An offender is now either of these:
- an element past the viewport's right edge, unless an ancestor scrolls it (`overflow-x: auto` or `scroll`). A `hidden` or `clip` ancestor no longer excuses it, because it cuts the element off;
- a box with `overflow-x: hidden` or `clip` whose content is wider than the box (`scrollWidth` past `clientWidth`). The box is reported, because part of its content is cut off, text as well as child elements.

Two exclusions were written into the helper before the first run, not added after a failure:
- Content that is not rendered (the existing `checkVisibility()` rule).
- A visually hidden box, 1 × 1 px with its overflow hidden, and anything inside one. That is the screen-reader-only pattern of `.visually-hidden`, `.sr-only`, `.site-title-text` below 360 px and KaTeX's MathML copy, which clip their content on purpose.

**The matrix (`hig-chrome.spec.ts`).** "No sideways overflow or cut-off content at six widths (AC4.1)" runs in Chromium: one test per route in `HIG_ROUTES`, each loading the route at 320, 375, 768, 1024, 1440 and 1920 px in light and dark (12 loads) and reporting every failing cell together. Firefox and WebKit skip these 14 tests. The C-14 check (320 px, text doubled) stays in all three engines and now uses the stronger helper, as do the narrow-width checks in `hig-pages`, `hig-profile` and `hig-post`.

`npx playwright test --config playwright.hig.config.ts tests/e2e/hig-chrome.spec.ts tests/e2e/hig-pages.spec.ts tests/e2e/hig-profile.spec.ts tests/e2e/hig-post.spec.ts -g "320, 375|no horizontal overflow|never scrolls sideways|diagrams fit the column|long identifiers|wide tables"`: 15 failed, 83 passed, 28 skipped.

```text
✘ 200 % text at 320 px › no horizontal overflow on /posts/post-with-code      (chromium, firefox, webkit)
✘ 200 % text at 320 px › no horizontal overflow on /posts/post-with-diagrams  (chromium, firefox, webkit)
✘ 200 % text at 320 px › no horizontal overflow on /posts/post-with-math      (chromium, firefox, webkit)
✘ 200 % text at 320 px › no horizontal overflow on /tags/test                 (chromium, firefox, webkit)
✘ 200 % text at 320 px › no horizontal overflow on /404                       (chromium, firefox, webkit)
    + "span.grouped-row-summary cuts off content: scrollWidth=251 clientWidth=230"
```

- Every failure is the same element: the summary of a post row, on every route that lists that post (the related posts and backlinks under a post, the tag page and the 404 page's recent posts). `.grouped-row-summary` clamps the summary to two lines with `overflow: hidden`. Unlike `.grouped-row-title`, it has no `overflow-wrap`, so with doubled text an unbreakable token runs sideways past its 230 px box and is cut off.
- The old helper excused it, because a `hidden` ancestor counted as one that scrolls.
- The six-width matrix passed on all 14 routes in both appearances. At normal text size nothing overflows or is cut off.

#### Step 46: Green

`grouped.css`: `.grouped-row-summary` gains `overflow-wrap: anywhere`, as `.grouped-row-title` has. The two-line clamp still hides the lines after the second, but no line is cut off sideways any more. The helper was not changed.

The same command: 98 passed, 28 skipped (the six-width matrix in Firefox and WebKit).

#### Step 47: Refactor and merge

The helper's two ancestor walks became `isScrolledIntoReach()` and `isNeverShown()` over one `withinAny()`. One effect: a visually hidden box is now excused for its own position past the viewport, as well as for its ancestors'. Prettier formatted the changed files.

| Suite | Result |
|---|---|
| `npx playwright test --config playwright.hig.config.ts` (three engines) | 902 passed, 55 skipped (4.4 min) |
| `npm run test:unit` | 360 passed in 30 files |
| `npm run test:pbt` | 37 passed |
| `cargo test --release` | 110 passed |
| `npx astro check` | 0 errors, 0 warnings, 7 hints |
| `npm run format:check` | all files match |

The 55 skips are all deliberate:
- the 15 of the first attempt (2 reduced-transparency tests outside Chromium, 1 Firefox touch test, and 12 Chromium-only performance tests);
- the 6 mobile-network tests of Step 39 in Firefox and WebKit (12);
- the 14 six-width matrix tests in Firefox and WebKit (28).

- Commit `f37cbcc`, merged with `--no-ff --no-edit` as `30d92c5` ("Merge branch 'fix/hig-overflow-check' into develop"), then deleted with `git branch -d`.

### Branch `fix/hig-missing-red` (TDD exceptions, R-09)

#### Step 48: outline fold

**The test.** In `hig-post.spec.ts` ("outline panel from 1100 px", 1440 × 900): "folding the section being read moves aria-current="location" to the next heading without any scroll".
1. On `/posts/post-with-code`, the page scrolls until the 긴 문자열 heading is 20 px from the top. 긴 문자열 is then current, and 넓은 표 is below the reading line.
2. The test folds 긴 문자열 with a script click. Playwright's own click would first scroll the toggle into view.
3. It then expects 넓은 표 to be current and above the reading line, with `scrollY` unchanged and no scroll event fired.

**A first version that could not pass.** It put 넓은 표 16 px below the reading line, with the 긴 문자열 heading already scrolled off the top.
- It failed in all three engines with the `ResizeObserver` set aside, and failed the same way with it restored.
- A diagnosis run (`s48-debug.mjs` in the session scratchpad) showed why. In Chromium, scroll anchoring moved `scrollY` from 892 to 765 to hold the visible text still. That fired a scroll event, which the scroll listener already handles.
- The observer matters only when the fold is below the node the browser anchors to, so that no scroll follows. With 긴 문자열 at the top of the viewport, the fold leaves `scrollY` at 803 and pulls 넓은 표 from 205 px to 78 px, past the 100 px line.

**Red.** The three `ResizeObserver` lines in `toc-highlight.ts` (the comment, `const content = …` and `new ResizeObserver(schedule).observe(content)`) were set aside, and the site was rebuilt. `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-post.spec.ts -g "aria-current"`:

```text
✘ [chromium] › folding the section being read moves aria-current="location" to the next heading without any scroll
✘ [firefox]  › (the same)
✘ [webkit]   › (the same)
    Locator:  locator('.post-outline .toc').locator('a[href="#넓은-표"]')
    Expected: "location"
    Received: ""   (unexpected value "null")
```

The precondition passed: 긴 문자열 was current before the fold. Only the mark's move to 넓은 표 failed.

**Green.** The lines were restored, and `git diff --quiet -- site/src/scripts/toc-highlight.ts` confirmed the file matches `HEAD`. After a rebuild, the same command passed 3 of 3.

#### Step 49: inline-sheet tracing

**Red.** Only the `resolveInlineStyle()` hunk of `ea2993b` was set aside in `scripts/profile/asset-budget.mjs`: the trace by content (`byContent`) and its fallback, back to the old component-only match. The `isApprovedInlineCssTransform()` extraction from the same commit stayed, because the transform check uses it. `npx vitest run tests/unit/profile-tooling.test.ts -t "inlined"`:

```text
× traces a shared stylesheet that the build inlined by its exact bytes
    ProfileAssetBudgetError: An inline stylesheet does not match an approved deterministic Rollup-to-HTML transform.
    (PROFILE_CSS_INLINE_TRANSFORM_UNAPPROVED)
✓ still fails closed when an inlined shared stylesheet was altered
Tests  1 failed | 1 passed | 29 skipped (31)
```

- The old resolver matched the page component's own stylesheet, compared the inlined foundation bytes with it and failed closed. That is the failure Step 30 recorded on `/resume`.
- The "still fails closed" test passes with either resolver. It is the guard that the new trace did not loosen the check, so a pass before the change is what it should give.

**Green.** The hunk was restored, and `git diff --quiet -- site/scripts/profile/asset-budget.mjs` confirmed the file matches `HEAD`. The same command passed 2, with 29 skipped by the filter.

#### Merge

Before the commit:
- `hig-post.spec.ts` in three engines: 80 passed and 1 skipped (the Firefox touch test).
- `npm run test:unit`: 360 passed.
- `npm run test:pbt`: 37 passed.
- `cargo test --release`: 110 passed.
- `npx astro check`: 0 errors.
- `npm run format:check`: all files match.

Step 49 changed no file; its Red and Green are recorded above.

- Commit `07428c3` (the Step 48 test), merged with `--no-ff --no-edit` as `b9288a3` ("Merge branch 'fix/hig-missing-red' into develop"), then deleted with `git branch -d`.

### Branch `fix/mermaid-puppeteer-test` (targeted regression for `a029615`)

#### Step 50: Red, then Green

**Red.** Three unit tests in a new `#[cfg(test)] mod tests` at the end of `preprocessor/src/mermaid.rs`, against a real temporary folder:
- with `.puppeteer-config.json` present, `mmdc` gets `-p` and the file's absolute path;
- with no config file, there is no `-p`;
- when the source sets its own theme in `%%{init}%%`, there is no `-t` (the existing rule, now inside the same function).

`cargo test --release --manifest-path preprocessor/Cargo.toml mermaid`:

```text
error[E0432]: unresolved imports `super::mmdc_args`, `super::puppeteer_config_in`
   --> src/mermaid.rs:196:17
error: could not compile `obsidian-press` (lib test) due to 1 previous error
```

**Green.**
- `puppeteer_config_in(dir)` returns the absolute path of `dir/.puppeteer-config.json` when it exists. `PUPPETEER_CONFIG_PATH` now calls it with `.`, the same cwd-relative lookup as before.
- `mmdc_args(input, output, config, theme)` builds `-i … -o … -b transparent`, then `-p <config>` when there is one, then `-t <theme>` unless the source sets its own.
- `render_mermaid()` runs `mmdc` with those arguments. The order and the `-t` rule are unchanged.

Results:
- The same command: 3 passed.
- `cargo fmt --check`: clean.
- `cargo test --release`: 113 passed (36 unit, 77 integration). The two "never used" warnings come from the untouched `tests/publication_output.rs`.
- `npm run test:unit`: 360 passed. `npm run test:pbt`: 37 passed.

**End to end.** `cargo build --release` was followed by `./preprocessor/target/release/obsidian-press ./fixtures/vault` into a scratch folder, run from the repository root, where a local, ignored `.puppeteer-config.json` exists. Both Mermaid SVGs rendered, so `mmdc` ran with `-p`, and only the fixture's two expected warnings appeared.

- Commit `01b8c3f`, merged with `--no-ff --no-edit` as `617fe8b` ("Merge branch 'fix/mermaid-puppeteer-test' into develop"), then deleted with `git branch -d`.

### Step 51: full verification on `develop`

Every run is on `develop` at `617fe8b`, with the fixture build.

| Suite | Command | Result | Before the repair |
|---|---|---|---|
| Rust format | `cargo fmt --check` | clean | clean |
| Rust | `cargo test --release` | 113 passed (36 unit, 77 integration), 0 failed | 110 (33 unit, 77 integration) |
| Site unit | `npm run test:unit` | 360 passed in 30 files | 348 in 29 |
| Site properties | `npm run test:pbt` | 37 passed in 6 files, seed 1001995909 | 37 |
| Type check | `npx astro check` | 0 errors, 0 warnings, 7 hints in 189 files | 0 errors, 7 hints in 187 |
| Formatting | `npm run format:check` | all files match | all files match |
| HIG browser checks | `npx playwright test --config playwright.hig.config.ts` | 905 passed, 55 skipped, 0 failed (4.5 min) | 846 passed, 15 skipped |
| Cross-unit | `just crossunit` | exit 1, only on the fixture's intended negative: `/posts/post-with-image/index.html -> /assets/nonexistent-image.png has no emitted target` (1 of 34 pages). The recipe's Playwright half, run on its own (`npx playwright test --config playwright.crossunit.config.ts`): 8 passed | the same |
| Profile end to end | `npm run test:e2e` | browser evidence `pass`, 6 of 6 spec files; then `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`, as planned | the same, with digest `4b45fd8f…37e47` |

**Mobile-profile Core Web Vitals.** These are the Step 39 tests alone on this build, three runs each: `npx playwright test --config playwright.hig.config.ts --project=chromium tests/e2e/hig-performance.spec.ts -g "mobile network" --repeat-each=3`. The profile is 412 × 823 at DPR 1.75, 4× CPU, with 562.5 ms latency, 1,474.56 kbps down and 675 kbps up. Every run passed.

| Route | LCP ms | CLS |
|---|---|---|
| `/` | 1,672 / 1,632 / 1,636 | 0.0000 |
| `/posts/post-with-diagrams` | 1,708 / 1,708 / 1,704 | 0.0000 |
| `/posts/post-with-math` | 1,736 / 1,732 / 1,728 | 0.0001 |
| `/posts/post-with-code` | 1,756 / 1,764 / 1,748 | 0.0005 / 0.0025 / 0.0025 |
| `/graph` | 1,596 / 1,600 / 1,600 | 0.0087 |
| `/resume` | 1,640 / 1,636 / 1,644 | 0.0000 |

**The new review-subject digest.** `npm run test:e2e` reports `reviewSubjectDigest` `be3fa9c63c1973455c247bed56ae3462175a68d34a6b08d032f2b4143848ed9d`. It replaces `4b45fd8f…37e47`, because Step 43 changed two review subjects, `src/styles/tokens.css` and `src/styles/profile/foundation.css`. The maintainer's 16-state record must carry this digest. `site/verification/**` was not written.

Nothing else was red, so nothing needed fixing.

### Step 52: records

- **`code-summary.md`:** this section.
- **`unit-test-instructions.md`.** Only the commands that differed from what was run were changed:
  - The two performance commands read `--project chromium tests/e2e/…`, which Playwright refuses. They now read `--project=chromium`.
  - The contrast-pair and overflow commands now name the specs and the `-g` filter actually run.

  The test inventory table was left as it is, as the brief asks. It differs from what was built in four rows:
  - `render-images.test.ts` has 8 tests, not 6.
  - `hig-tokens.test.ts` gained 4 tests, not 5. The current tag chip is a browser check, because the defect was which rule colors the chip.
  - The browser checks of Step 42 and the overflow matrix's 14 route tests are not listed.
  - The Mermaid argument tests are 3, not 2.
- **`CLAUDE.md`, on branch `chore/claude-md-test-counts`.** Rust 113 (36 unit, 77 integration), unit 360, and the HIG suite at 960 tests (905 pass, 55 skip). It also notes that one project is selected with `--project=chromium`. Commit `3f290ae`, merged with `--no-ff --no-edit` as `204066f` ("Merge branch 'chore/claude-md-test-counts' into develop"), then deleted with `git branch -d`.
- **PDF résumé: not prepared again.** No change reaches the résumé's print output:
  - The only changed rule that applies on `/resume` is the ring on the current local-navigation link, and `profile/print.css` hides `.profile-local-navigation` in print (`display: none !important`).
  - The other changed elements do not occur on `/resume`: post rows, tag chips, segmented controls, `mark`, highlighted code lines, search options and images. The built page has none of them.
  - The candidate from Step 36 (`8017640e…`) stays current, and `--promote` was not run.

Final state:
- `git branch`: `develop` (at `204066f`) and `main`.
- `git worktree list`: the main checkout only.
- `origin/develop` `5df7e25`, `origin/main` `23e08e6` and `main` `23e08e6` are unchanged.
- Nothing under `aidlc/` was staged or committed.

## Loop-back 2 Repair (plan Steps 53–60)

Build and Test's second run left two targets with causes in generated styles (`build-and-test/test-results.md`, Loop-back 2): NFR1-b (links inside a highlight, R-17) and NFR1-e (search snippets cut off, R-18). Each branch starts from `develop` at `204066f` or later, and every Red below was recorded before its Green.

### Branch `fix/hig-highlight-links` (NFR1-b; R-17)

#### Step 53: Red

**Unit (`tests/unit/hig-tokens.test.ts`).** The Step 42 test "a --c-tint link inside a highlight reaches 4.5:1 on --c-mark-fill" checked only the page ground. It became "a link inside a highlight reaches 4.5:1 on --c-mark-fill over every ground it can sit on (R-12, R-17)":
- **Grounds**, each under `--c-mark-fill`, in light and dark: `--c-bg`; `--c-surface`, the homepage note's card (added beyond the plan's list, because the homepage note sits on it); `--c-surface-2`, the table header; and every callout ground, `--c-<hue>` at `--c-callout-mix` over `--c-bg`, for all six hues.
- **Colors:** the link at rest, the link on hover, and `--c-text`.
- **Where the link colors come from.** The test reads them from `src/styles/*.css`: the last rule whose selector ends in `mark a` (and `mark a:hover`), or else base.css's `a` and `a:hover`. A class-qualified highlight rule outranks `a:hover`, so without its own hover rule its color holds on hover. The pair checked is therefore the pair the stylesheets paint, not a token named in the test.

`npx vitest run tests/unit/hig-tokens.test.ts`: 1 failed, 12 passed.

```text
× a link inside a highlight reaches 4.5:1 on --c-mark-fill over every ground it can sit on (R-12, R-17)
+   "light link (--c-tint) on --c-mark-fill over --c-surface-2 (table header): 4.33 < 4.5",
+   "light link (--c-tint) on --c-mark-fill over blue callout: 4.07 < 4.5",
+   "light link (--c-tint) on --c-mark-fill over green callout: 4.28 < 4.5",
+   "light link (--c-tint) on --c-mark-fill over orange callout: 4.31 < 4.5",
+   "light link (--c-tint) on --c-mark-fill over red callout: 4.08 < 4.5",
+   "light link (--c-tint) on --c-mark-fill over purple callout: 4.11 < 4.5",
+   "light link (--c-tint) on --c-mark-fill over gray callout: 4.22 < 4.5",
+   "dark link (--c-tint) on --c-mark-fill over --c-surface-2 (table header): 4.27 < 4.5",
```

These are Build and Test's computed values exactly. The hovered link (`--c-tint-hover` from base.css) and plain text passed on every ground.

**Browser.** No fixture note renders a highlighted link, so each test builds `<mark>강조 안의 <a href="/posts/simple-post">Simple Post</a></mark>` with DOM calls (the markup `==강조 안의 [[Simple Post]]==` renders to) and measures it with `renderedContrast()`:
- `hig-post.spec.ts`, "highlights (NFR1; R-12)" › "a link inside a highlight reaches 4.5:1 in a callout and a table header, light|dark": at the end of the first callout of `/posts/post-with-callouts` (the blue note), then in the first table header of `/posts/post-with-code`.
- `hig-pages.spec.ts`, new "highlights in the homepage note (NFR1-b; R-17)" › "a highlight takes --c-mark-fill and its link reaches 4.5:1, light|dark": wraps the homepage note's first paragraph link in `mark`, expects the computed `background-color` to equal `--c-mark-fill` as the page resolves it, then measures the link.

`npx playwright test --config playwright.hig.config.ts tests/e2e/hig-post.spec.ts tests/e2e/hig-pages.spec.ts -g "highlight"` (fresh fixture build of `204066f` plus the tests): 12 failed, 12 passed. Every new test failed in all three engines; the existing highlight tests passed.

```text
✘ [chromium|firefox|webkit] highlights › a link inside a highlight reaches 4.5:1 in a callout and a table header, light
    Error: /posts/post-with-callouts .post-content .callout
    +     "label": "a. \"Simple Post\"",  "ratio": 4.07
✘ [chromium|firefox|webkit] highlights › a link inside a highlight reaches 4.5:1 in a callout and a table header, dark
    Error: /posts/post-with-code .post-content .table-wrapper th
    +     "label": "a. \"Simple Post\"",  "ratio": 4.27
✘ [chromium|firefox|webkit] highlights in the homepage note › a highlight takes --c-mark-fill and its link reaches 4.5:1, light
    Expected: "rgba(255, 149, 0, 0.2)"   Received: "rgb(255, 255, 0)"
✘ [chromium|firefox|webkit] highlights in the homepage note › a highlight takes --c-mark-fill and its link reaches 4.5:1, dark
    Expected: "rgba(255, 159, 10, 0.28)"   Received: "rgb(255, 255, 0)"
```

The homepage `mark` is the browser's yellow in both appearances, so the fill assertion stops the test before its contrast step (Build and Test measured that link at 1.73:1 in dark mode). The callout test stops at its first failing ground: in light mode the callout (4.07), in dark mode the table header (4.27), because the dark blue callout passes.

#### Step 54: Green

- **New `src/styles/highlight.css`**, imported by `PostLayout.astro` (after `post.css`) and by `pages/index.astro`:
  - `.post-content mark`: the rule that was in `post.css`, unchanged. The homepage note carries `.home-content.post-content`, so it now gets `--c-mark-fill` instead of the browser's yellow. An imported stylesheet is global, which the `set:html` note needs (CLAUDE.md pitfall).
  - `.post-content mark a`: `color: var(--c-tint-hover)`, with an underline (`from-font`, offset 0.18em) everywhere, including a table header, where base.css does not underline links.
  - `.post-content mark a:hover`: the color already is the hover color, so hover thickens the underline to 2px instead.
- **`post.css`.** The rule and its comment at line 81 ("keeps a --c-tint link inside the highlight at 4.5:1"), which held only over the page ground, are gone. A two-line pointer to `highlight.css` replaces them.
- **No token changed.** `--c-tint-hover` already exists in `tokens.css` with the same value in both dark blocks, so this step departs from `design-system-mapping.md` in one way only: a link inside a highlight is `--c-tint-hover` at rest, and its hover cue is the thicker underline, not a color change. No review-subject file changed: `highlight.css`, `post.css`, `PostLayout.astro` and `pages/index.astro` are outside `REVIEW_SUBJECT_SOURCE_FILES` and its directories.

Results:
- `npx vitest run tests/unit/hig-tokens.test.ts`: 13 passed.
- The Step 53 browser command, after a fresh fixture build: 24 passed, in all three engines.
- The built homepage now links `/_astro/highlight.*.css`.

Highlighted-link contrast after the change, computed with the token test's formula (`--c-tint-hover` on `--c-mark-fill` over each ground):

| Ground | Light | Dark |
|---|---|---|
| page (`--c-bg`) | 6.45 | 8.65 |
| homepage card (`--c-surface`) | 6.45 | 6.42 |
| table header (`--c-surface-2`) | 6.00 | 5.37 |
| callout blue / green / orange / red / purple / gray | 5.63 / 5.93 / 5.97 / 5.66 / 5.69 / 5.84 | 7.14 / 6.33 / 6.03 / 6.71 / 6.79 / 6.59 |

Rendered, with the same set-up as the tests, in Chromium, Firefox and WebKit at 1024 px (`f-rendered.mjs` in the session scratchpad). The three engines gave identical values:

| Placement | Light | Dark |
|---|---|---|
| homepage note, intro paragraph on `--c-bg-grouped` | 5.88 | 8.65 |
| post paragraph on the page | 6.45 | 8.65 |
| first callout (blue) | 5.63 | 7.14 |
| table header | 6.00 | 5.37 |

#### Step 55: Refactor and merge

- **One ground added.** The rendered run showed that the homepage note's intro paragraph sits on `--c-bg-grouped`, outside any card. The unit test now lists `--c-bg-grouped` too (5.88:1 light, 8.65:1 dark). It passed at once, because the Step 54 color already covers it.
- Prettier changed nothing.

| Suite | Result |
|---|---|
| `npx vitest run tests/unit/hig-tokens.test.ts` | 13 passed |
| `hig-post.spec.ts` and `hig-pages.spec.ts`, three engines | 179 passed, 1 skipped (the Firefox touch test) |
| `hig-chrome.spec.ts -g "no violations"` (the axe matrix: 14 routes × 4 widths × 2 appearances × 3 engines) | 336 passed |
| `npm run test:unit` | 360 passed in 30 files |
| `npm run test:pbt` | 37 passed |
| `npx astro check` | 0 errors, 0 warnings, 7 hints |
| `npm run format:check` | all files match |

The first run of the two page specs gave 3 failures in Firefox, all page-load timeouts at about 60 s on tests this branch does not touch (the homepage's "오늘 발행된 글", the hub list and the 404 page), while the run took 3.7 minutes instead of under one. A rerun of `hig-pages.spec.ts` in Firefox alone passed 31 of 31, and a rerun of both specs in three engines passed as listed above. Nothing was changed between the runs.

- Commit `fc77e2b`, merged with `--no-ff --no-edit` as `230dbb3` ("Merge branch 'fix/hig-highlight-links' into develop"), then deleted with `git branch -d`.

### Branch `fix/hig-open-state-overflow` (NFR1-e, AC4.1; R-18)

#### Step 56: Red

**The helpers (`tests/e2e/support/hig.ts`).** `horizontalOverflow()` is unchanged. New:
- `OPEN_STATES`, five states, each with its route, its opener, an `open()` that waits until the content has rendered, and `shownBelow` where CSS hides the opener:
  - the search dialog with results for "post" (`/`; the `검색 열기` button, at every width);
  - the navigation sheet (`/`; `mobile-navigation-toggle`, below 768 px, `chrome.css`);
  - the outline sheet on its 목차 tab and on its 탐색 tab, with the tree loaded (`/posts/post-with-code`; `목차 열기`, below 1100 px, `outline.css`);
  - the `/graph` 목록 tab, with its list rendered.
- `HigRoute.status` and `expectedStatus()`. `/404` expects 404, because `local-server.mjs` serves `404.html` with that status; every other route expects 200 (R-18).

**The checks (`hig-chrome.spec.ts`).**
- "200 % text at 320 px" (C-14, three engines): every route test now asserts its HTTP status first. Five new tests, "no horizontal overflow with the <state> open", load the route (asserting 200), double the text, open the state, run `freezeMotion()`, then measure.
- "no sideways overflow or cut-off content at six widths (AC4.1)" (Chromium): every route cell now records a wrong HTTP status as a problem. Five new tests, "<state> open at 320, 375, 768, 1024, 1440, 1920 px, light and dark", open the state in each of the 12 cells where its opener shows, after `freezeMotion()`. Where CSS hides the opener, the test asserts that it is hidden and skips the measurement, so a state can never be skipped by accident. Each test must measure at least one cell.
- The two overflow conditions (offenders, and a page wider than the viewport) are now built by one `overflowProblems()` function; both are still asserted in every test.

`npx playwright test --config playwright.hig.config.ts tests/e2e/hig-chrome.spec.ts -g "200 % text|six widths|open"` (fresh fixture build of `230dbb3` plus the tests): 4 failed, 78 passed, 38 skipped (the 19 Chromium-only matrix tests in Firefox and WebKit).

```text
✘ [chromium] six widths (AC4.1) › search dialog with results open at 320, 375, 768, 1024, 1440, 1920 px, light and dark
✘ [chromium] 200 % text at 320 px › no horizontal overflow with the search dialog with results open
✘ [firefox]  (the same)
✘ [webkit]   (the same)
    + "320 px, text doubled: span.search-option-snippet cuts off content: scrollWidth=2238 clientWidth=288"
    + "320 px, text doubled: span.search-option-snippet cuts off content: scrollWidth=639 clientWidth=288"
    + "375 px light: span.search-option-snippet cuts off content: scrollWidth=1119 clientWidth=343"
    + "768 px dark: span.search-option-snippet cuts off content: scrollWidth=1371 clientWidth=528"
    …
```

- Every offender is `span.search-option-snippet`: 8 per cell (the helper's cap) in all 12 matrix cells, and 8 in each engine at 200% text. Nothing else was reported.
- The navigation sheet, both outline tabs and the graph list passed everywhere they show. The openers were hidden where CSS says (the navigation toggle from 768 px, the outline button from 1100 px).
- Every load returned the expected status, `/404` included.

#### Step 57: Green

`search.css`: `.search-option-snippet` no longer uses `white-space: nowrap` and `text-overflow: ellipsis`. It now clamps to two lines (`display: -webkit-box`, `-webkit-box-orient: vertical`, `-webkit-line-clamp: 2`, `line-clamp: 2`, `overflow: hidden`) and wraps with `overflow-wrap: anywhere`, the same rules Step 46 gave `.grouped-row-summary`. Its color, its selected-state color and its size are unchanged. Nothing else was reported, so no other stylesheet changed. The helper was not changed.

**Departure from the refined mockup.** The mockup draws each result's snippet as one line ending in "…". It is now up to two lines, and lines after the second are clamped. The maintainer accepted this by choosing Retry with fix at loop-back 2. A result row grows by at most one footnote line, so fewer results fit on a phone screen at once.

The Step 56 command, after a fresh fixture build: 82 passed, 38 skipped, 0 failed.

#### Step 58: Refactor and merge

Nothing needed tidying beyond what Step 56 already factored (`overflowProblems()`, `statusProblem()`, `OPEN_STATES`); Prettier formatted the changed files.

| Suite | Result |
|---|---|
| `npx playwright test --config playwright.hig.config.ts` (three engines, this branch's build) | 937 passed, 65 skipped, 0 failed (4.8 min) |
| `npm run test:unit` | 360 passed in 30 files |
| `npm run test:pbt` | 37 passed |
| `npx astro check` | 0 errors, 0 warnings, 7 hints |
| `npm run format:check` | all files match |

The suite grew from 960 to 1,002 tests: 12 highlight checks from Step 53 (two in `hig-post` and two in `hig-pages`, in three engines), and 30 open-state checks from Step 56 (five C-14 tests and five matrix tests, in three engines). The 10 new skips are the five open-state matrix tests in Firefox and WebKit, which run in Chromium only like the 14 route tests of the matrix.

- Commit `5ccadd1`, merged with `--no-ff --no-edit` as `0e2aa67` ("Merge branch 'fix/hig-open-state-overflow' into develop"), then deleted with `git branch -d`.

### Step 59: full verification on `develop`

Every run is on `develop` at `0e2aa67`, with the fixture build.

| Suite | Command | Result | After loop-back 1 (Step 51) |
|---|---|---|---|
| Rust format | `cargo fmt --check` | clean | clean |
| Rust | `cargo test --release` | 113 passed (36 unit, 77 integration), 0 failed | 113 |
| Site unit | `npm run test:unit` | 360 passed in 30 files | 360 in 30 |
| Site properties | `npm run test:pbt` | 37 passed in 6 files, seed 1576129248 | 37 |
| Type check | `npx astro check` | 0 errors, 0 warnings, 7 hints in 189 files | the same |
| Formatting | `npm run format:check` | all files match | all files match |
| HIG browser checks | `npx playwright test --config playwright.hig.config.ts` (fresh build) | 937 passed, 65 skipped, 0 failed (5.0 min) | 905 passed, 55 skipped |
| Cross-unit | `just crossunit` | exit 1, only on the fixture's intended negative: `/posts/post-with-image/index.html -> /assets/nonexistent-image.png has no emitted target` (1 of 34 pages). Its Playwright half alone (`npx playwright test --config playwright.crossunit.config.ts`): 8 passed | the same |
| Profile end to end | `npm run test:e2e` | browser evidence `pass`, 6 of 6 spec files; then `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`, as planned | the same |

**The review-subject digest is unchanged:** `be3fa9c63c1973455c247bed56ae3462175a68d34a6b08d032f2b4143848ed9d`, the value Step 51 handed over. Phase F changed no review-subject file: the highlight rule went into a new `src/styles/highlight.css`, imported by `PostLayout.astro` and `pages/index.astro`, rather than into `global.css`, `base.css` or `tokens.css`. `search.css` is not a review subject either. `site/verification/**` was not written.

Nothing else was red, so nothing needed fixing.

### Step 60: records

- **`code-summary.md`:** this "Loop-back 2 Repair" section.
- **`unit-test-instructions.md`.** Both Loop-back 2 commands ran as written. Only two descriptions changed: the unit command's list of grounds (the grouped background and the homepage card were added), and the open-state command now records its result and points to `OPEN_STATES`. The test inventory table was left as it is.
- **`CLAUDE.md`, on branch `chore/claude-md-loopback2-counts`.** The HIG suite is now 1,002 tests (937 pass, 65 skip), and the overflow checks open the five states. Rust (113), unit (360) and property (37) counts did not change. Commit `10d9697`, merged with `--no-ff --no-edit` as `987f497` ("Merge branch 'chore/claude-md-loopback2-counts' into develop"), then deleted with `git branch -d`.
- **PDF résumé: not prepared again.** No change reaches the résumé's print output:
  - `highlight.css` is imported only by the post layout and the homepage, and `/resume` links only `foundation`, `BaseLayout` and `resume` stylesheets.
  - `search.css` ships in the `BaseLayout` bundle, but its changed rule styles search result snippets, which exist only while the search dialog shows results. The built `/resume` has no `.search-option-snippet` and no `mark`.
  - The candidate from Step 36 (`8017640e…`) stays current, and `--promote` was not run.

Final state:
- `git branch`: `develop` (at `987f497`) and `main`.
- `git worktree list`: the main checkout only.
- `origin/develop` `5df7e25`, `origin/main` `23e08e6` and `main` `23e08e6` are unchanged. Nothing was pushed.
- Nothing under `aidlc/` was staged or committed.
