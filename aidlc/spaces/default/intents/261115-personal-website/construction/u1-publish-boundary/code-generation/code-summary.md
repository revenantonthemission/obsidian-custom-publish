# Code Summary — U1 `u1-publish-boundary`

Branch: `feature/u1-publish-boundary` off `develop`, local only, 14 commits. Nothing has been merged or pushed. Every step of the approved plan (1–17) is done.

## Files created / modified / deleted

| Step | Files |
|---|---|
| 2 | new `site/scripts/sync-public-assets.mjs`, `site/tests/unit/sync-public-assets.test.ts`; changed `Jenkinsfile`, `Justfile`, `site/scripts/hig/build-and-serve.mjs` |
| 3 | moved (`git mv`) 15 notes and `attachment/` from `fixtures/vault/` to `fixtures/vault/Notes/`; changed 13 Rust test files (`block_ref`, `heading_ref`, `image_embed`, `linker`, `nav_tree`, `output`, `preview`, `publication_catalog`, `publication_output`, `publication_transform`, `scanner`, `search`, `transform`), the U1 lines of `.gitignore`, `Justfile`, `Jenkinsfile`, `build-and-serve.mjs` |
| 4 | new `fixtures/vault/Pages/About.md`, `Pages/attachment/portrait.png`, `Pages/Drafts/Now.md`, `Pages/.hidden.md`; changed `Notes/Post With Formatting.md`, `.gitignore` (the Pages lines) |
| 5 | new `preprocessor/src/boundary.rs`, `preprocessor/tests/cli_boundary_test.rs`; changed `src/lib.rs`, `src/main.rs`, `tests/common/mod.rs` |
| 6 | new `src/walker.rs`, `tests/walker_test.rs`; changed `src/scanner.rs`, `src/types.rs` (`NoteSource`), `src/hub_dates.rs`, `src/lib.rs`, `tests/common/mod.rs` |
| 7 | changed `src/scanner.rs` (`scan_sources`), `src/boundary.rs` (notices), `src/main.rs`, `tests/cli_boundary_test.rs`, `tests/scanner_test.rs` |
| 8 | changed `src/catalog.rs` (rewritten), `src/main.rs`, `src/output.rs`, `src/scanner.rs`, `tests/publication_catalog.rs` (rewritten), `tests/publication_transform.rs` |
| 9 | new `tests/stamping_order_test.rs`; changed `src/main.rs` |
| 10 | changed `src/transform.rs`, `src/catalog.rs`, `src/output.rs`, `tests/publication_transform.rs` |
| 11 | changed `src/output.rs`, `src/transform.rs`, `src/main.rs`, `src/types.rs` (`source_root`), `src/scanner.rs`, `src/hub_dates.rs`, `tests/publication_output.rs` (rewritten), `tests/common/mod.rs` |
| 13 | new `site/tests/unit/content-data.test.ts`; changed `site/src/lib/data.ts`, `site/src/lib/homepage.ts`, `site/src/pages/index.astro`, `site/src/styles/home.css`, `site/tests/unit/homepage-composition.test.ts`, `site/tests/pbt/u2/homepage-composition.pbt.test.ts` |
| 14 | changed `site/src/pages/index.astro`, `site/src/styles/home.css`, `site/tests/e2e/hig-pages.spec.ts`, `site/tests/e2e/crossunit.spec.ts`, `site/tests/e2e/homepage.spec.ts` |
| 15 | changed `Jenkinsfile`, `Justfile`, `site/scripts/hig/build-and-serve.mjs`, `site/scripts/profile/homepage-fixture-content.mjs`, `site/scripts/crossunit/ensure-fixture-content.mjs`, `site/scripts/profile/verification-provider.mjs` |
| 17 | changed `CLAUDE.md` (committed); `inception/contract-design/contract-summary.md` C1/C2 (changed on disk, not committed: it lives in the untracked intent record) |

## Commits

| Hash | Message |
|---|---|
| `86ac5cc` | ci: 공개 자산 복사를 교체 방식의 공유 스크립트 하나로 모읍니다 |
| `0913276` | refactor: 픽스처 노트와 첨부를 fixtures/vault/Notes 로 옮깁니다 |
| `6e326bd` | test: 사이트 페이지 픽스처와 강조된 링크 픽스처를 추가합니다 |
| `2afc01a` | feat: 게시 폴더·사이트 페이지 폴더·출력 폴더가 겹치면 종료 코드 2로 멈춥니다 |
| `1588bd0` | feat: 스캔과 날짜 기록이 같은 폴더 순회 규칙을 쓰고 심볼릭 링크를 건너뜁니다 |
| `c64f5ae` | feat: 사이트 페이지 폴더를 함께 스캔하고 폴더가 없거나 비었으면 안내를 출력합니다 |
| `d20150b` | feat: 폴더 우선으로 글·사이트 페이지·은퇴한 홈페이지 노트를 분류하고 PUB008·PUB009를 검사합니다 |
| `e544f1a` | feat: 모든 검사를 마친 뒤에만 게시 날짜를 기록하고 기록한 글이 있을 때만 다시 스캔합니다 |
| `7dbcbfc` | feat: 은퇴한 홈페이지 노트 링크는 / 로, 사이트 페이지 링크는 일반 텍스트로 렌더링합니다 |
| `6463bde` | feat: 사이트 페이지를 pages/ 와 assets/pages/ 에 쓰고 홈페이지 산출물을 없애며 요약 줄을 출력합니다 |
| `0b9c421` | feat: 사이트가 홈페이지 산출물을 읽지 않고 일반 글과 허브를 따로 제공합니다 |
| `49b139b` | feat: 홈페이지 첫 화면에 이름·짧은 소개와 Résumé·Portfolio 캡슐을 둡니다 |
| `39a14ed` | ci: 모든 전처리 호출이 사이트 페이지 폴더를 넘기고 검증 단계가 홈페이지 산출물을 만들지 않습니다 |
| `d505a2f` | docs: 사이트 페이지 게시 경계와 새 CLI·content 계약을 CLAUDE.md 에 기록합니다 |

## Key implementation decisions

- **Folder guard** (`boundary.rs`): resolves NOTES, PAGES and OUTPUT through the nearest existing ancestor. A `..` after a missing folder is a usage error. Overlap is a whole-component prefix check with case folding, using no new dependency. Existing components are compared by their canonical on-disk names. Exit code 2.
- **Shared walker** (`walker.rs`): used by both the scan and the stamper. It roots at the canonical path, skips dot entries, `Drafts` and every entry that is itself a symbolic link, and returns those links so the run prints each warning once.
- **Catalog**: folder-first kinds (Post, SitePage, RetiredHomepage, the last optional). PUB002 is gone. PUB008 covers every clash involving a site page; post/post clashes keep a warning. PUB009 is new. PUB004–006 apply to site-page bodies too. Every finding is batched and sorted, and the run fails before any stamp or write.
- **Order** (`main.rs`): guard → notice → scan → catalog → stamp → rescan (only when something was stamped) → catalog → write → summary.
- **Links**: a link to the retired note renders as `/` with no fragment. A link to a site page is plain text. The graph and backlinks are posts only.
- **Output**:
  - `pages/<slug>.md` and `pages/<slug>.json` (`{slug,title}`).
  - Page images go to `assets/pages/`, with body URLs `/assets/pages/…` from the transform's asset prefix.
  - Copy destinations and URLs use the file name only.
  - Attachment lookup stops at `PostMeta.source_root`; a linked image is rejected.
  - `homepage/` is cleaned but never written. The manifest is sorted.
  - The summary line `published <N> posts, <M> site pages, <K> assets` is the last stdout line.
- **Site**:
  - `getOrdinaryPosts()` sits beside `getHubs()`. The homepage artifact reader, the slot code and HP001–HP004 are removed.
  - `index.astro` renders h1 "Passion Project", then the name and short introduction from the Profile Domain (no headline), the Résumé and Portfolio capsules, and the interim "오늘 발행된 글" list.
- **Pipeline**:
  - One shared asset-sync script (`SYNC001` for a missing source, `SYNC002` for overlapping folders) replaces the add-only copies in four places.
  - `PAGES_PATH` (Jenkins) and `pages`/`publish_pages` (Justfile) pass `--pages` everywhere.
  - Verify no longer runs `ensure-fixture-content.mjs`.

## Test coverage summary

| Suite | Before U1 | After U1 |
|---|---|---|
| `cargo test --release` | 125 | 175 (47 unit + 128 integration) — all pass |
| `npm run test:unit` | 449 | 451 — all pass |
| `npm run test:pbt` | 37 | 34 — all pass (artifact/slot properties removed with their code; `resolveBuildDate` property added) |
| HIG Playwright (3 browsers) | — | 988 passed, 65 skipped (pre-existing documented skips), 0 failed |

New test files:

| Test file | Tests | Kind |
|---|---|---|
| `cli_boundary_test.rs` | 13 | CLI |
| `walker_test.rs` | 7 | |
| `stamping_order_test.rs` | 5 | |
| `publication_catalog.rs` (rewritten) | 18 | incl. property vs brute-force reference |
| `publication_transform.rs` | 13 | |
| `publication_output.rs` (rewritten) | 13 | incl. determinism property |
| `sync-public-assets.test.ts` | 6 | |
| `content-data.test.ts` | 6 | |
| `hig-pages.spec.ts` homepage W5 block | — | rewritten; NFR1-b test moved to `Post With Formatting` |

Coverage on the whole project is reported by Build and Test on the full suite; no minimum percentage is enforced (team.md Testing Posture; maintainer decision 2026-11-20, human-made requirement change).

## TDD record (Red → Green)

| Step | Red command | Failing output | Green |
|---|---|---|---|
| 2 | `npx vitest run --config vitest.config.ts tests/unit/sync-public-assets.test.ts` | `Failed to load url ../../scripts/sync-public-assets.mjs` | 6/6 |
| 5 | `cargo test --release --test cli_boundary_test` | 8 failed: `unexpected argument '--pages'` | 8/8 |
| 6 | `cargo test --release --test walker_test` | `E0432 unresolved import obsidian_press::walker` | 7/7 |
| 7 | `cargo test --release --test cli_boundary_test`, `--test scanner_test` | 5 failed: `no site-page count`; `E0432 scan_sources` | 13/13, 6/6 |
| 8 | `cargo test --release --test publication_catalog` | 20 compile errors (`EntryKind`, `Pub008`, `Pub009`, `other_path`) | 18/18 |
| 9 | `cargo test --release --test stamping_order_test` | 2 of 5 failed (PUB008 vault stamped; `Scanning` printed once, 2 expected) | 5/5 |
| 10 | `cargo test --release --test publication_transform` | 3 behaviour failures (retired fragment kept; page link rendered as an anchor) | 13/13 |
| 11 | `cargo test --release --test publication_output` | 10 of 13 failed | 13/13 |
| 13 | `npx vitest run --config vitest.config.ts tests/unit/content-data.test.ts` | 5 failed (`getOrdinaryPosts is not a function`, …) | 6/6 |
| 14 | `npx playwright test --config playwright.hig.config.ts tests/e2e/hig-pages.spec.ts --project=chromium -g "homepage \(W5\)\|highlighted link"` | 2 failed (`.home-opening` and the capsule test ids missing) | 114/114 (3 browsers) |

Step 8's property test first failed on a bug in its own reference sort, not in the product code. The reference was fixed and the regression file it had produced was deleted; it records no product counterexample.

## Baselines and NFR measurements

The same machine and day were used for both measurements. Real-vault runs used a copy of `Areas/Notes` under `preprocessor/target/u1-baseline/` (gitignored); the real vault was never touched.

| Measure | Before | After | Target | Result |
|---|---|---|---|---|
| Real vault, no stamping (median of 3) | 167.14 s | 167.66 s | ≤ 1.1× (NFR6.5) | 1.003× met |
| Real vault, stamping (0 stamped) | 168.67 s | 167.85 s | ≤ 1.5× (NFR6.4) | 0.995× met |
| `cargo test --release` | 3.86 s | 4.39 s | ≤ 1.2× (NFR6.6) | 1.14× met |
| `npm run test:unit` | 15.29 s | 12.82 s | ≤ 1.2× | met |
| `npm run test:pbt` | 6.86 s | 6.68 s | ≤ 1.2× | met |
| `/` transferred bytes (fixture build) | 320,156 B | 229,036 B | ≤ before (NFR1.4) | met |

- **Post count:** P = 155 in the last Jenkins workspace. The after-U1 real-vault run printed `published 155 posts, 0 site pages, 305 assets`, which matches.
- **Origins:** one origin only, both before and after.

## Verification command (Step 16)

| Part | Result |
|---|---|
| `cargo fmt --check` | pass |
| `cargo test --release` | pass (175) |
| `just preprocess` | pass (`published 14 posts, 1 site pages, 3 assets`) |
| `npm run test:unit` / `test:pbt` | pass (451 / 34) |
| `npm run format:check` | pass |
| `npx astro check` | pass (0 errors, 0 warnings) |
| HIG Playwright | pass (988 / 65 skipped / 0 failed) |
| `just crossunit` | **exit 1**: the link sweep reports only the fixture's deliberate `nonexistent-image.png`, which also happens without U1; the JS-off specs pass 8/8 |

## Tests written but not executed

- `site/tests/e2e/homepage.spec.ts` (updated). It runs under `npm run test:e2e`, which the plan excludes until the owner's end-of-release 16-state accessibility review restores the manual record.
- **Closed later (Build and Test run 5, 2026-11-20):** the FR2.2 rendered-site checks now also run in the unsealed HIG suite, as `site/tests/e2e/hig-discovery.spec.ts` — the retired homepage note has no route, no RSS entry and no sitemap entry. The sealed copy stays for the end-of-release review.

## Deviations from the plan

- **Contract C1/C2 not committed.** The update to `contract-summary.md` is on disk but not committed, because the whole intent record under `aidlc/` is untracked. It is committed with the record.
- **Page count before the summary line existed.** Step 7 reads the page count from the progress line `Found <n> sources (<m> site pages)`.
- **Highlight test form.** The Step 10 highlight test asserts the preprocessor's output `<mark>[Simple Post](/posts/simple-post/)</mark>`, because the site's Markdown renderer makes the anchor. The Playwright NFR1-b test asserts the rendered `<mark><a>`.
- **Step 12 ran without the Justfile.** It ran the binary with `--pages` directly, because the Justfile gained `--pages` only in Step 15.
- **Step 13 touched `index.astro` and `home.css`.** It changed both minimally to stop reading `content/homepage`. As a result, 3 of Step 14's 5 Playwright tests already passed at Red.
- **Messages the design left open:**
  - `error: site pages folder <PAGES> is not a folder` (exit 2).
  - A missing NOTES keeps the uncoded `Error: cannot read posts folder …` (exit 1).
  - PUB008 names the retired note as `retired homepage note`.
- **Extras:**
  - `SYNC002` overlap guard and its test.
  - Two transform unit tests (page asset prefix; `../` reduced to the file name).
  - A `resolveBuildDate` property test.
  - `PostMeta.source_root` (not serialised).
- **Fixture prep between Steps 11 and 13.** After Step 11 the site unit suite needed `ensure-fixture-content.mjs` first, as Jenkins Verify did at those commits. Step 13 removed the need.
- **Unit-scoped property-test command.** The command in `unit-test-instructions.md` finds no files. The working form is `PBT_RUNS=100 PBT_SEED=42 npx vitest run --config vitest.pbt.config.ts <file>`.
- **Comparison of Korean names that don't exist yet.** No Unicode NFC normalisation is applied to such names; they are compared after lowercase only, per the plan (deviation from `security-design.md` §2).

## Step 18 — repair requested at the skeleton checkpoint

The first skeleton verification failed only at the link sweep, on the fixture's deliberate `nonexistent-image.png`. The code review also had a Major finding: a post and the retired homepage note could share a slug. The owner chose to fix both.

| Sub-step | Red | Green | Commit |
|---|---|---|---|
| 18a link sweep | `npx vitest run --config vitest.config.ts tests/unit/link-sweep.test.ts` → `process.exit unexpectedly called with "1"` (no export) | 5/5. `link-sweep.mjs` exports `sweep(distDir, knownBroken)`, reads `known-broken-links.json` (one declared entry) and exits 0 only when the broken links equal the declared set. A stale or misplaced declaration fails. `LINK001` is raised for a malformed declaration file. | `883417d` |
| 18b post/retired slug clash | `cargo test --release --test publication_catalog` → 2 failed (`unwrap_err()` on `Ok`); `--test publication_output a_post_sharing` → exit 0, expected 1 | PUB008 now also covers a post and the retired note sharing a slug: either order, the error names the post, the run exits 1 and nothing is written. A post/post clash still gives only a warning. Catalog tests 20/20, output tests 14/14. | `0b21f4f` |

Files:
- **18a:** `site/scripts/crossunit/link-sweep.mjs`, `site/scripts/crossunit/known-broken-links.json` (new), `site/tests/unit/link-sweep.test.ts` (new).
- **18b:** `preprocessor/src/catalog.rs`, `preprocessor/src/scanner.rs` (comment), `preprocessor/tests/publication_catalog.rs`, `preprocessor/tests/publication_output.rs`, `CLAUDE.md`.
- **Not committed:** the C1 text in the untracked record.

The recorded verification command was re-run after both commits and exited 0:

| Part | Result |
|---|---|
| `cargo fmt --check` | clean |
| `cargo test --release` | 178 |
| `just preprocess` | `published 14 posts, 1 site pages, 3 assets` |
| `npm run test:unit` | 456 |
| `npm run test:pbt` | 34 |
| `npm run format:check` | clean |
| `npx astro check` | 0 errors |
| HIG Playwright | 988 passed, 65 skipped |
| `just crossunit` | link sweep passes with the one declared known-broken link; crossunit 8/8 |

The superseded statement under "Verification command (Step 16)" above, that `just crossunit` exits 1, applies only to the run before Step 18.

Remaining note: a post/retired clash still prints the old `slug collision` warning just before the PUB008 error. It is cosmetic, and the run stops either way.

## Loop-back 1 repair (Build and Test, 2026-11-20)

Build and Test graded U1-CG-R02 Not Met: review finding R-02 had never been decided. It also found a stale command in `unit-test-instructions.md`. The repair was built on `feature/u3-writing-moves`, the assembled stack (U1 → U2 → U4 → U3). Steps 1–18 were confirmed present on that branch and not rebuilt.

**Step 19: embedded-post images on a site page (BR5.2; R-02).** Decision: a site page that embeds a post does not support that post's Markdown images. The page body points at `/assets/pages/<name>`, but the image lookup stays inside PAGES, so the image is not copied. The run still exits 0, and the warning now names the embedding page.

- Red: `cd preprocessor && cargo test --release --test publication_output an_embedded_posts_image` gave 1 failed. The run exited 0, but the warning did not name the page:

  ```
  expected `warning: attachment not found: diagram.png (site page /private/var/folders/…/Vault/Pages/Colophon.md)` in stderr:
  warning: attachment not found: diagram.png
  test result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 14 filtered out
  ```

- Green: `copy_referenced_images` in `output.rs` takes an `origin` suffix. Posts pass an empty suffix, so their warning is unchanged and `image_lookup_never_leaves_the_source_root` still passes as written. Site pages pass ` (site page <page path>)`. Output tests 15/15; full `cargo test --release` 179.
- New test: `an_embedded_posts_image_on_a_site_page_is_unsupported_and_named` in `preprocessor/tests/publication_output.rs`. It uses a temporary on-disk vault with no mocks. It checks exit 0, the exact warning line, that the post keeps `assets/diagram.png`, that no `assets/pages/diagram.png` is written or listed in the manifest, and that the page body points at `/assets/pages/diagram.png`.
- Docs: one line in `CLAUDE.md` (Publishing CLI, site pages). One warning line in C1 in `inception/contract-design/contract-summary.md`.
- Commit: `22e1468 test: 사이트 페이지에 넣은 글의 이미지는 지원하지 않음을 시험으로 고정합니다`. It holds `preprocessor/src/output.rs`, `preprocessor/tests/publication_output.rs` and `CLAUDE.md`. The contract summary sits in the untracked AI-DLC record tree, so it was edited but not committed, as in Step 18.

**Step 20: stale test command.** Every command in the corrected `unit-test-instructions.md` was re-run, and each exited 0:

| Command | Result |
|---|---|
| Rust: the 7 U1 test files | 79 passed (13 + 20 + 15 + 13 + 6 + 5 + 7) |
| `just preprocess` | exit 0 |
| Vitest: `sync-public-assets` and `content-data` | 2 files, 15 tests |
| Property tests | none for this unit (item 4) |
| Playwright: `hig-pages.spec.ts` | 156 passed, 6 skipped |

**Step 21: records and full verification.** `source-manifest.json` keeps every entry and adds `preprocessor/tests/publication_output.rs` and the contract summary. `preprocessor/src/output.rs` and `CLAUDE.md` were already listed. No row in `traceability.json` needed to change: BR5.2 and BR1.6 already point at `preprocessor/tests/publication_output.rs` and `preprocessor/src/output.rs`, the files that hold the new test and the fix.

The recorded verification command exited 0:

| Part | Result |
|---|---|
| `cargo fmt --check` | clean |
| `cargo test --release` | 179 |
| `just preprocess` | `published 17 posts, 1 site pages, 3 assets` |
| `npm run test:unit` | 46 files, 542 tests |
| `npm run test:pbt` | 6 files, 36 tests |
| `npm run format:check` | clean |
| `npx astro check` | 217 files, 0 errors |
| HIG Playwright | 1,183 passed, 77 skipped |
| `just crossunit` | link sweep: 816 references across 40 pages resolve, apart from the 1 declared known-broken link; crossunit 16/16 |

## Known limitations and leftovers

- **R2:** the stamper still replaces `published:` anywhere in a note (existing behaviour).
- **Unused homepage-section code:** `site/src/lib/home-sections.ts`, `wrapHomeSections` in `render.ts` and its test, and `.home-content` in `base.css` are no longer used by any page. They are kept because the plan does not list them.
- **Private copy left on disk:** `preprocessor/target/u1-baseline/` (≈ 87 MB, gitignored) holds a private copy of `Areas/Notes`. Delete it after Build and Test re-measures.
- **Merge preconditions:**
  - the owner rewords the `Areas/Notes` project rule (F4);
  - the 16-state accessibility review is redone at the end of the release, because `index.astro`, `home.css` and `verification-provider.mjs` changed.
