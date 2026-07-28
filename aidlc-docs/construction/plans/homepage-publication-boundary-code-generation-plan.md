# U2 Code Generation Plan — Homepage Publication Boundary

## 문서 상태

- **단계**: CONSTRUCTION — U2 Code Generation, Part 1 (계획)
- **상태**: 계획 승인 대기
- **Unit**: U2 Homepage Publication Boundary
- **작성일**: 2026-07-28
- **Feature Branch**: `codex/feature/resume-home-boundary`
- **선행 승인**: U2 Functional Design, NFR Requirements, NFR Design, Infrastructure Design (모두 2026-07-28 "승인")
- **PBT Enforcement**: Full — PBT-02~08·10이 이 단계에 적용된다

## 1. 입력과 전제

구속력 있는 입력: [Business Rules](../homepage-publication-boundary/functional-design/business-rules.md)(BR-U2-001~046, PUB/HP vocabulary), [Business Logic Model](../homepage-publication-boundary/functional-design/business-logic-model.md)(FD-P 17 + example 의무), [Domain Entities](../homepage-publication-boundary/functional-design/domain-entities.md), [Frontend Components](../homepage-publication-boundary/functional-design/frontend-components.md)(FE-P-U2-01~06), [NFR Requirements](../homepage-publication-boundary/nfr-requirements/nfr-requirements.md)(NFR-U2-001~011), [Tech Stack Decisions](../homepage-publication-boundary/nfr-requirements/tech-stack-decisions.md)(TSD-U2-01~07), [NFR Design](../homepage-publication-boundary/nfr-design/nfr-design-patterns.md)(PD-U2-01~09, LC-U2-01~12), [Infrastructure Design](../homepage-publication-boundary/infrastructure-design/infrastructure-design.md)(no-change 판정, C1-A·C2-A 경계).

고정 경계:

- exactly-one 강제는 상시 활성이며, U2 Construction 실행 증거는 fixture vault가 제공하고 실제 Vault 증거는 승인된 편집 이후만 인정한다 (FD Q1-A).
- 외부 Vault 편집은 Step 14의 human gate를 통과한 `Passion Project.md` 하나뿐이다 (BR-U2-044~046).
- Justfile 접촉은 rm -rf 2줄 제거 + 동작 보존 refactoring 한정 (C1-A). Jenkins·Terraform·AWS·배포·push·merge는 이 단계에서 실행되지 않는다.
- 신규 test 명령 없음; `vitest.pbt.config.ts` include와 `pbt-runner.mjs` `PBT_FILE` regex의 U2 경로 가산 확장은 명시 의무다 (PD-U2-08).

## 2. 파일 Inventory

**Rust 수정**: `preprocessor/src/types.rs`(PublicationScope, visibility 필드), `scanner.rs`(visibility 파싱 입력 수집; 원본 불변), `linker.rs`·`transform.rs`(homepage reference/transclusion 의미), `output.rs`(cleaner·homepage artifact·manifest·post-only discovery), `lib.rs`·`main.rs`(6-pass 논리 orchestration + stderr reporter/exit 1), `search.rs`·`preview.rs`·`nav_tree.rs`·`related.rs`(post-only projection 소비 — 필요한 최소 변경).

**Rust 신규**: `preprocessor/src/catalog.rs`(LC-U2-01~03: ScopeParser, PublicationCatalogBuilder, DiagnosticCollector), `preprocessor/tests/publication_catalog.rs`, `publication_transform.rs`, `publication_output.rs`, `tests/*.proptest-regressions`(실패 발생 시).

**Site 수정**: `site/src/lib/data.ts`(getHomepage 추가; 기존 getter 불변), `site/src/pages/index.astro`(조합 재작성, page-scoped CSS, meta.title), `site/playwright.config.ts`(homepage firefox/webkit 신규 project 2개), `site/vitest.pbt.config.ts`·`site/scripts/profile/pbt-runner.mjs`(U2 경로 가산 확장). e2e 지원 코드가 필요하면 **U2 전용 신규 모듈**로 한정한다 — U1의 `tests/e2e/support/*`(evidence/identity 기계)는 변경하지 않는다.

**Site 신규**: `site/src/lib/homepage.ts`(LC-U2-10 순수 함수), `site/tests/unit/homepage-composition.test.ts`, `site/tests/pbt/homepage-composition.pbt.test.ts`, `site/tests/e2e/homepage.spec.ts`.

**기타**: `fixtures/vault/`(homepage fixture + homepage 참조 fixture), `Justfile`(rm -rf 2줄 제거), 외부 `Areas/Notes/Passion Project.md`(Step 14 gate 후).

**금지**: `content/`·`site/dist/`·`target/`·generated `site/public` JSON의 직접 편집(FR-017); U1 소유 파일(profile 소스, `REVIEW_SUBJECT_SOURCE_FILES` 대상, U1 spec/project)의 변경.

## 3. 순차 실행 계획

각 step은 컴파일·관련 test 통과·`git diff --check`를 종료 조건으로 하고, 발견된 결함은 해당 step에서 수정한다.

### Step 1 — Fixture 전략과 확장
- [ ] `fixtures/vault/`에 정확히 하나의 homepage fixture(`visibility: homepage`, slot token, 오늘 발행 글 heading, 일반 wikilink 몇 개)를 추가한다.
- [ ] 일반 post fixture 하나에 homepage 대상 wikilink(bare/alias/heading/block)를 추가해 truth table happy path를 fixture로 만든다.
- [ ] **오류 사례(unknown visibility, 중복 homepage, homepage transclusion)는 main fixture vault에 넣지 않는다** — 넣으면 모든 실행이 실패한다. tempfile 기반 per-test vault로 구성한다.
- [ ] 기존 test 기대를 확인한다: fixture 추가 시점에는 `visibility:`가 무시되어 homepage fixture가 normal post로 scan되므로 기존 단언(`scanner_test.rs`의 `>= 7`, `search_test.rs`의 상대 등식)은 그대로 green이어야 한다. **`search_test.rs`의 post-only 의미 갱신은 Step 5~6(projection이 실제로 바뀌는 시점)에서 수행한다** — 미리 바꾸면 중간 단계 gate가 깨진다.

### Step 2 — Scope 파싱 (LC-U2-01)
- [ ] `types.rs`에 `PublicationScope` + visibility 표현을 추가하고 `scanner.rs`가 원본 무변경으로 수집하게 한다 (BR-U2-001~004; frontmatter 자동 삽입에 visibility 미추가).

### Step 3 — Catalog와 진단 (LC-U2-02/03)
- [ ] `catalog.rs`: builder(exactly-one, PUB001~003, path 규약), immutable 정렬 projection(BTreeMap/정렬 Vec — PD-U2-02), `LinkableSources`.
- [ ] DiagnosticCollector + stderr reporter(`PUB### {path}: {detail}`, 정렬 유지, exit 1 — NFR-U2-005).

### Step 4 — Reference/Transclusion (LC-U2-04)
- [ ] `linker.rs`/`transform.rs`: truth table BR-U2-013~017(기존 anchor 파생 재사용), transclusion 거부 PUB004~006(일괄 수집), 비-homepage 결과 불변, fence 보호 재사용 (BR-U2-018~022).

### Step 5 — Output lifecycle (LC-U2-05~07)
- [ ] `output.rs`: 검증→정리→쓰기 순서로 관리 namespace 전체 정리(PD-U2-03), `content/homepage/index.md`+`meta.json`(BR-U2-030~032), `content/manifest.json`(자기 제외 정렬 목록), post-only discovery 출력 (BR-U2-009~012, §2.1 matrix).
- [ ] Justfile `preprocess`·`deploy-preprocess`의 rm -rf 2줄을 제거한다 (C1-A).
- [ ] projection 전환에 따라 기존 test 기대를 이 시점에 갱신한다: `search_test.rs`의 등식을 post-only 의미로, catalog 소비로 서명이 바뀌는 기존 test 호출부(`linker_test`·`output_test`·`preview_test`·`nav_tree_test` 등)를 함께 조정한다 — 각 서명 변경은 그것을 도입한 step이 호출부 갱신까지 책임진다.

### Step 6 — Pipeline orchestration
- [ ] `lib.rs`/`main.rs`: scan → catalog(1차 진단) → link/transform(2차 진단) → search → output의 논리 순서와 fail-closed 종료 (PD-U2-01; PUB007 wiring).

### Step 7 — Rust test: catalog
- [ ] `publication_catalog.rs`: FD-P-C07-01~05 + DE-P-U2-01/02 property(256 cases), PUB001~003 형식·순서·exit example, EDGE-012 blocker example.

### Step 8 — Rust test: transform
- [ ] `publication_transform.rs`: FD-P-C08-01~04(DE-P-U2-04 Rust 절반), PUB004~006 example, truth table 전 variant example.

### Step 9 — Rust test: output + 결정성
- [ ] `publication_output.rs`: FD-P-C09-01~04 + DE-P-U2-03, manifest 정확성, homepage 부재 전수 검사, stale 잔존 불가(EDGE-007 회귀), PUB007 example, 이중 실행 byte 결정성 integration test (LC-U2-08; NFR-U2-004).
- [ ] `just test` 전체 green + 3분 예산 내 확인 (NFR-U2-003).

### Step 10 — Site gateway와 순수 조합 (LC-U2-09/10)
- [ ] `data.ts`: `getHomepage()` — HP001/HP002 즉시 throw (PD-U2-06); 기존 getter 불변.
- [ ] `homepage.ts`: fence-aware token 계수·치환 분할·오늘 발행 글 분할·날짜 매개변수 순수 함수 (BR-U2-036~042; PD-U2-04/05); HP003/HP004.

### Step 11 — Page 조합 (LC-U2-11)
- [ ] `index.astro` 재작성: getHomepage + homepage.ts + U1 canonical fragment 조합, `<title>`=meta.title(BR-U2-043), page-scoped CSS(PD-U2-09, gzip 4KiB 이내), build 시작 1회 날짜 계산, 새 client JS 0.

### Step 12 — Site test: unit + PBT
- [ ] `homepage-composition.test.ts`(손상 mode, FE-P-U2-02/03) + `homepage-composition.pbt.test.ts`(FD-P-C06-01/02, FD-P-C10-01/02, FE-P-U2-05).
- [ ] `vitest.pbt.config.ts` include와 `pbt-runner.mjs` `PBT_FILE` regex를 U2 경로로 가산 확장하고, **U2 PBT가 실제로 실행됨을 test 수 증가로 확인한다** (침묵 스킵 방지 — PD-U2-08).

### Step 13 — e2e와 예산
- [ ] `homepage.spec.ts`: axe(무 위반), keyboard·reduced-motion smoke, CTA·Notion 부재(FE-P-U2-01), 공통 nav 보존(FE-P-U2-06), hydration marker 부재(FE-P-U2-04), 외부 요청 0.
- [ ] **discovery 제외 표면 단언**: `/posts/{homepage-slug}` route가 404이고, homepage 항목이 `rss.xml`·sitemap·404 페이지 최근 글 목록에 부재함을 build output/e2e로 단언한다 (BR-U2 §2.1의 site 표면 절반).
- [ ] **U1 evidence 기계 격리**: `homepage.spec.ts`는 U1의 evidence fragment/matrix key/obligation 기계(`tests/e2e/support/evidence` 등)를 사용하지도 기록하지도 않는다 — U1의 sealed 48-key record에 항목을 추가하면 `BROWSER_EVIDENCE_INCOMPLETE`로 `test:e2e` 전체가 깨진다. e2e 지원 코드가 필요하면 U2 전용 신규 모듈로 한정하고 U1 support 파일은 변경하지 않는다.
- [ ] `playwright.config.ts`에 homepage firefox/webkit 신규 project 2개 추가(기존 3 project 불변 — TSD-U2-07/PD-U2-07).
- [ ] 오늘 발행 글 양 경우 검증: env override를 fixture published 날짜로 설정한 실행(글 있음)과 어떤 fixture에도 없는 날짜로 설정한 실행(글 없음) 두 번으로 결정적으로 검증한다 (PD-U2-04) — 명령 topology는 불변.
- [ ] 예산 검증: 새 JS 0 bytes, 신규 CSS gzip ≤ 4KiB, `npm run test:*` 모두 green.

### Step 14 — **HUMAN GATE: Vault 편집**
- [ ] 소비 동작·fixture·test가 모두 green인 상태에서 `Passion Project.md`의 **정확한 제안 diff**(visibility 추가, slot token 추가, 임시 Notion block 제거)를 사용자에게 제시하고 명시적 승인을 기다린다.
- [ ] 승인 후 편집을 적용하고, 실제 Vault 대상 `just preprocess` + full build 증거를 수집한다 (FD Q1-A의 실제 Vault 증거).
- [ ] Vault repository의 commit/push는 수행하지 않는다 (BR-U2-046).

### Step 15 — 최종 검증과 요약
- [ ] 전체 sweep: `just test`, `npm run test:unit`·`test:pbt`(U2 포함 확인)·`test:e2e`, `npx astro check`(U1 상속 hint baseline 대비; `astro build`가 진실 원천), direct astro build, 결정성 이중 실행.
- [ ] NFR-U2-010 부정 검사: Justfile·package.json에 U2 전용 신규 명령이 없음을 확인한다.
- [ ] NFR-U2-011: U2 test 전체가 외부 네트워크 없이 실행 가능함을 확인한다 (fixture·generator의 로컬 자원 한정; e2e는 loopback만).
- [ ] U1 명령 회귀 확인: `resume:pdf:verify` 포함 U1 stable command가 여전히 green인지 확인 (U1 provider 계약 보존).
- [ ] obligation closure: FD-P 17 + DE-P 4 + FE-P 6 + example 의무 전부가 실제 test에 매핑되고 실행됐는지 검증하고 누락을 fail-closed로 보고한다.
- [ ] `aidlc-docs/construction/homepage-publication-boundary/code/code-generation-summary.md` 작성 (delta, 명령 결과, PBT seed 정책 증거, Vault diff 기록, U3 handoff).

## 4. PBT-02~10 Disposition

| 규칙 | 처치 |
|---|---|
| PBT-02 (property 구현) | FD-P 17 + DE-P/FE-P 정밀화를 Step 7~9·12에서 구현 |
| PBT-03 (custom generator) | Korean/Unicode·YAML 변형·token 배치·손상 mode 도메인 generator (Step 7~9·12) |
| PBT-04 (shrinking 유지) | proptest/fast-check 기본 shrinking 비활성화 금지 |
| PBT-05 (seed 재현) | proptest-regressions 커밋 + fast-check seed 정책(U1 계승) — NFR-U2-002 |
| PBT-06 (상태 property) | FD-P-C09-04(정리+재생성 idempotence)가 해당; 그 외 상태 기계 없음 |
| PBT-07 (경계 국소화) | 실패 시 counterexample을 example로 승격 (FR-015.6) |
| PBT-08 (CI 실행) | U3 소유 — U2는 stable command와 seed 정책만 제공 |
| PBT-09 | NFR Requirements에서 완료 (proptest 1.11.0 증명) |
| PBT-10 (문서화) | Step 15 summary에 property↔test 매핑 기록 |

## 5. Hard Human Gates

1. **이 계획의 승인** (Part 1 → Part 2 진입).
2. **Step 14 Vault diff 승인** — 정확한 diff 제시 후 명시적 승인 전에는 외부 Vault를 변경하지 않는다.

## 6. 경계

- 이 계획 문서 자체는 application source를 변경하지 않는다. Part 2는 계획 승인 후에만 시작한다.
- push, merge, 배포, Terraform/AWS/Jenkins 변경, Vault commit/push는 이 단계 어디에서도 수행하지 않는다.
- U1 소유 계약(REVIEW_SUBJECT_SOURCE_FILES, profile 소스, U1 spec/project)은 변경하지 않는다 — U1 수동 접근성 기록은 U2로 인해 이동하지 않아야 하며, Step 15가 이를 확인한다.
