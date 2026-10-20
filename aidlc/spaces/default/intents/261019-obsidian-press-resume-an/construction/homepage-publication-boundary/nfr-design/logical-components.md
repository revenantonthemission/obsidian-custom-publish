# U2 Logical Components — Homepage Publication Boundary

## 문서 상태

- **단계**: CONSTRUCTION — U2 NFR Design
- **Unit**: U2 Homepage Publication Boundary
- **작성일**: 2026-07-28
- **결정 근거**: [NFR Design Plan](../../plans/homepage-publication-boundary-nfr-design-plan.md) Q1~Q9 (모두 A); [Patterns](nfr-design-patterns.md) PD-U2-01~09

LC ID는 안정적이며 Code Generation의 파일·test 배치가 이 목록을 따른다. "소유"는 FD component(C06~C10) 기준이다.

## 1. Rust Preprocessor Components

### LC-U2-01 — ScopeParser (C07)

- **계약**: frontmatter `visibility` 값을 `PublicationScope`로 파싱. exact lowercase scalar만 인식, key 부재 → `Post`, 그 외 → PUB001 진단 (BR-U2-001~004).
- **오류**: 값을 변경하지 않고 DiagnosticCollector에 기록.
- **Test**: `publication_catalog.rs` — FD-P-C07-03 property + PUB001 example.

### LC-U2-02 — PublicationCatalogBuilder (C07)

- **계약**: scan 결과 → scope 파싱 → exactly-one 검증 → `PublicationCatalog { homepage, posts, linkable }` 또는 1차 진단 실패 (PD-U2-01). catalog projection은 immutable·정렬 구조 (PD-U2-02).
- **오류**: PUB002(빈 path, 정렬 최상단)·PUB003(사전순 첫 중복 path) 규약 준수.
- **Test**: `publication_catalog.rs` — FD-P-C07-01/02/04/05 + DE-P-U2-01/02.

### LC-U2-03 — DiagnosticCollector + StderrReporter (C07~C09 공유)

- **계약**: `PublicationDiagnostic {code, path, detail}` 수집, path·code 정렬, 단계별 일괄 보고 (BR-U2-023). 출력은 stderr `PUB### {path}: {detail}` 한 줄/진단, exit 1 (NFR-U2-005).
- **Test**: `publication_catalog.rs`(PUB001~003)·`publication_transform.rs`(PUB004~006) — 형식·순서·종료 코드 example. PUB007은 write 단계 진단이므로 `publication_output.rs`(LC-U2-05)가 소유한다.

### LC-U2-04 — PublicationLinkResolver / TransclusionPolicy (C08)

- **계약**: `LinkableSources` 기반 homepage reference truth table(BR-U2-013~017) 적용, homepage transclusion 3종 거부(PUB004~006), 기존 fence 보호·anchor 파생 재사용 (BR-U2-018~022).
- **Test**: `publication_transform.rs` — FD-P-C08-01~04(DE-P-U2-04의 Rust 절반 포함) + transclusion/fragment example.

### LC-U2-05 — OutputCleaner (C09)

- **계약**: 검증 통과 후 관리 namespace(`posts/`, `meta/`, `homepage/`, discovery JSON, `manifest.json`, assets) 전체 정리 (PD-U2-03). Justfile `rm -rf`는 제거되고 이 component가 단일 소유자다.
- **오류**: 정리 실패는 PUB007.
- **Test**: `publication_output.rs` — stale 파일 잔존 불가 example (EDGE-007 회귀); FD-P-C09-04와 DE-P-U2-03; PUB007 형식·종료 코드 example.

### LC-U2-06 — HomepageArtifactWriter (C09)

- **계약**: `content/homepage/index.md`(transform 완료 Markdown) + `content/homepage/meta.json`(`{ title }`, 비결정 값 금지) 기록 (BR-U2-030~032). homepage는 posts/meta/discovery output에 부재.
- **Test**: `publication_output.rs` — FD-P-C09-01/02 + 부재 example.

### LC-U2-07 — ManifestWriter (C09)

- **계약**: 생성 파일의 정렬된 상대 경로 목록을 `content/manifest.json`에 기록, 자기 자신 제외 (BR-U2-027).
- **Test**: `publication_output.rs` — FD-P-C09-03.

### LC-U2-08 — DeterminismHarness (test 전용)

- **계약**: fixture vault 이중 실행 → `content/` tree byte 비교 (NFR-U2-004, PD-U2-02). production code가 아니라 integration test다.
- **Test**: `publication_output.rs` 내 결정성 integration test.

## 2. Site Components

### LC-U2-09 — HomepageGateway (C10, `site/src/lib/data.ts`)

- **계약**: `getHomepage(): HomepageData` — 두 artifact 파일 읽기·검증, 누락 HP001·malformed HP002를 `HP### {path}: {detail}` Error로 즉시 throw (PD-U2-06). 기존 getter 불변 (BR-U2-034).
- **Test**: `homepage-composition.test.ts`(손상 mode example) + `homepage-composition.pbt.test.ts`(FD-P-C10-01/02).

### LC-U2-10 — HomepageComposer (C06, `site/src/lib/homepage.ts`)

- **계약**: 순수 함수 — fence-aware token 계수(BR-U2-036~037), 치환 분할(BR-U2-040), 오늘 발행 글 heading 분할(BR-U2-041), 날짜 매개변수(PD-U2-04). count ≠ 1은 HP003/HP004 throw.
- **Test**: `homepage-composition.test.ts`(unit) + `homepage-composition.pbt.test.ts`(FD-P-C06-01/02 — DE-P-U2-04의 site 절반 포함; FE-P-U2-02/05).

### LC-U2-11 — HomepageComposition Page (C06/S03, `site/src/pages/index.astro`)

- **계약**: `getHomepage()` + LC-U2-10 + U1 canonical fragment의 조합만 담당 (PD-U2-05). `<title>` = meta.title (BR-U2-043). 신규 CSS는 page-scoped (PD-U2-09). 새 client JS 없음.
- **Test**: FE-P-U2-03은 `homepage-composition.test.ts`(조합 결과 문자열 검사), FE-P-U2-01/04/06은 `homepage.spec.ts`(build output·live DOM 검사)가 소유한다.

### LC-U2-12 — HomepageSmokeSpec (`site/tests/e2e/homepage.spec.ts`)

- **계약**: axe(WCAG 2.0/2.1 A/AA + 2.2 AA), keyboard·reduced-motion smoke, CTA·외부 요청 0 검사. chromium은 기존 project가 자동 편입하고, firefox·webkit는 **homepage 전용 신규 project 두 개**로 실행해 3-browser × 320×800·1440×900 달성 — viewport는 spec 내부 설정 (PD-U2-07). U1 spec과 기존 project 정의 불변.
- **Test**: 자기 자신이 e2e 검증 주체; `npm run test:e2e`로 실행 (NFR-U2-010).

## 3. 비소유 경계

- U1 canonical homepage profile fragment와 `REVIEW_SUBJECT_SOURCE_FILES`는 U1 소유 — U2는 참조만 한다.
- CI aggregation과 Jenkins 실행은 U3 소유 — U2는 stable command만 제공한다.
- runtime 실행 component는 없다 (Q9 N/A 판정, [Patterns §2](nfr-design-patterns.md) 참조).

## 4. Traceability

| LC | Pattern | FD/NFR |
|---|---|---|
| LC-U2-01~02 | PD-U2-01, PD-U2-02 | BR-U2-001~008; FD-P-C07-*; NFR-U2-004 |
| LC-U2-03 | PD-U2-01, PD-U2-06 | BR-U2-023~025; NFR-U2-005 |
| LC-U2-04 | PD-U2-01 | BR-U2-013~022; FD-P-C08-* |
| LC-U2-05~08 | PD-U2-02, PD-U2-03 | BR-U2-026~032; FD-P-C09-*; NFR-U2-004 |
| LC-U2-09~11 | PD-U2-04~06, PD-U2-09 | BR-U2-033~043; FD-P-C06/C10-*; FE-P-U2-*; NFR-U2-006/009 |
| LC-U2-12 | PD-U2-07, PD-U2-08 | NFR-U2-007~008, NFR-U2-011 |
