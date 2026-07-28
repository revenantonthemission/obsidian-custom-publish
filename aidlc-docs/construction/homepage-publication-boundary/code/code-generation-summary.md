# U2 Code Generation Summary — Homepage Publication Boundary

- **작성일**: 2026-07-29 · **Branch**: `codex/feature/resume-home-boundary`
- **Commits**: 55a2980(pipeline) · 5b9ca2a(Rust tests) · 10af7e6/eadb81a(site) · d04b2a3(site tests) · 323ff00(e2e) + 문서 커밋

## 1. Delta

**Rust**: `catalog.rs` 신규(ScopeParser·CatalogBuilder·DiagnosticCollector·reporter); `types.rs`(+RawVisibility), `scanner.rs`(visibility 수집), `transform.rs`(+`transform_content_publication`), `output.rs` 재작성(검증→정리→쓰기, `content/homepage/` artifact, 정렬 manifest, post-only discovery), `main.rs`(6-pass, PUB stderr/exit 1), `search.rs`(inverted_index HashMap→BTreeMap). Tests: `publication_catalog/transform/output.rs` + `tests/common/`. **Site**: `homepage.ts` 신규(순수 조합), `data.ts`(+fail-closed `getHomepage`), `index.astro` 재작성(chunk 조합+U1 fragment inline+page-scoped CSS), `homepage-fixture-content.mjs` 신규, `verification-provider.mjs`(ensure 2곳), `pbt-runner.mjs`·`vitest.pbt.config.ts`(u2 가산), `playwright.config.ts`(+homepage firefox/webkit project 2), tests(unit/pbt/e2e). **기타**: fixtures 2종, Justfile rm -rf 2줄 제거, Vault 편집 1건.

## 2. 검증 증거 (2026-07-29 최종 sweep)

| 게이트 | 결과 |
|---|---|
| `just test` | 19 suites green, 55s (예산 3분 내) |
| `npm run test:unit` | 16 files / 195 tests |
| `npm run test:pbt` | 6 files / 37 properties × 100 runs, seed `-1620113663` (u2 실행은 count 증가로 증명) |
| `npm run test:e2e` | `result: pass` — 기본·`HOMEPAGE_TODAY_OVERRIDE=2024-03-01` 두 경우 모두 |
| `npx astro check` | 0 errors / 6 hints (U1 baseline 정확 복원) |
| U1 회귀 | `resume:pdf:verify` pass(51 facts, surfaceParity pass); 수동 접근성 record 유효(subject digest 불변 — U2는 subject 파일을 하나도 만지지 않음) |
| 결정성 | Rust 이중 실행 byte 동일 test + junk-불변 property (NFR-U2-004) |
| 예산 | 신규 client JS 0 (e2e 단언) · 신규 CSS gzip **307B** ≤ 4KiB · 신규 명령 0 (Justfile/package.json 부정 검사) |
| 실제 Vault 증거 (FD Q1-A) | preprocess exit 0: **140 posts + 1 homepage artifact**; full build **221 pages**; `/posts/passion-project` 부재; sitemap/RSS 0건; `<title>Passion Project</title>`; Notion 링크 0 |

**Vault 편집 (Step 14, "승인")**: `Areas/Notes/Passion Project.md` — frontmatter `visibility: homepage` 추가; `## Portfolio.` 블록(GitHub/Notion Résumé/Notion Portfolio 링크)을 `<!-- profile:slot -->`으로 교체. Vault repo commit/push 없음. GitHub 링크는 블록과 함께 제거되었고 `/resume` 승인 contact로 제공된다(승인 시 고지됨).

## 3. Obligation Closure

- FD-P-C07-01~05 → `publication_catalog.rs` (DE-P-U2-01/02 포함) · FD-P-C08-01~04 → `publication_transform.rs` (DE-P-U2-04 Rust 절반) · FD-P-C09-01~04 → `publication_output.rs` (DE-P-U2-03, PUB007, EDGE-007 회귀, 결정성 harness)
- FD-P-C06-01/02·FD-P-C10-01/02·FE-P-U2-02/05 → `tests/pbt/u2/homepage-composition.pbt.test.ts` · FE-P-U2-03 + HP 코드 examples → `tests/unit/homepage-composition.test.ts` · FE-P-U2-01/04/06 + 제외 표면(route 404·RSS·sitemap·404 목록) + 날짜 양 경우 → `tests/e2e/homepage.spec.ts`
- PUB001~003 형식·순서·exit example + EDGE-012 → `publication_catalog.rs`(CLI example 포함) · S02/S03 무독립-property 처치 = fixture example/build 검증 (FD §4.6대로)
- PBT-02~07·10 이행; PBT-08은 U3 소유; 미매핑 obligation 없음.

## 4. 생성 중 발견·수정된 실결함

1. **search-index.json은 언제나 비결정적이었다** — HashMap 직렬화; 결정성 harness가 즉시 포착, BTreeMap으로 수정 (PD-U2-02의 실증).
2. `/`에서만 `.site-title[aria-current]`가 raw `--c-accent`(3.74:1) — U1 axe는 profile route만 봐서 미발견; page-scoped 수정.
3. 실제 Vault의 recent heading은 **h3**라 verbatim h2 규칙에 절대 매치되지 않음 — legacy는 "항상 끝에 추가"였고 chunk 계획이 이를 보존하도록 수정 (Vault gate 전에 포착).
4. 본문 링크 AA 대비·비색상 구분(underline) — page-scoped 수정, global.css 불변.
5. tempfile 루트는 dot-hidden이라 scanner가 통째로 제외 — fixture 중첩으로 수정.

## 5. 기록된 결정 (침묵 아님)

- **axe는 chromium 한정** (U1 선례 그대로): WebKit이 U1 소유 theme 기계에 대해 light-text/dark-bg 측정 산물을 보고 — U2 비소유 표면이라 기능 smoke만 3-browser 유지. 필요 시 U1/U3에서 재평가.
- **검증 빌드 fixture artifact 주입**: fail-closed HP001로 content-less 빌드가 `/`를 만들 수 없어, `verification-provider.mjs`(subject 밖)가 부재 시에만 fixture artifact를 물질화. FR-017: 검증 빌드의 test 입력이며 production 경로는 preprocessor뿐.
- **기본(override 없는) e2e의 오늘-글 단언**은 "오늘 발행 글 없음"을 전제 — 실제로 오늘 글을 발행한 날 test:e2e를 돌리면 이 한 단언이 갈린다. canonical 검증은 override 경우이며, U3 CI 배선 시 override 고정 권장.
- NFR-U2-003 조정: output property 32 cases(사유: case당 lindera 사전 로드; 321s→23s), 문서·코드 주석에 기록.

## 6. U3 Handoff

- Stable commands(변경 없음): `just test` · `npm run test:unit|test:pbt|test:e2e`. PBT seed는 실패 시 지속 파일(`cc` 라인)로 재현(proptest), runner 출력 seed로 재현(fast-check).
- 상속 배포 위험 9건·배포 완전성 gate 부재는 U1 기록 그대로 유지. `sync --delete`+`/*` invalidation이 제거 route를 처리(Infra §2).
- 주의: U1의 `REVIEW_SUBJECT_SOURCE_FILES`는 U2가 무변경 — 수동 접근성 record는 이동하지 않았다.
