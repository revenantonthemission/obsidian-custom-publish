# U2 NFR Requirements — Homepage Publication Boundary

## 문서 상태

- **단계**: CONSTRUCTION — U2 NFR Requirements
- **Unit**: U2 Homepage Publication Boundary
- **작성일**: 2026-07-28
- **결정 근거**: [NFR Requirements Plan](../../plans/homepage-publication-boundary-nfr-requirements-plan.md) Q1~Q10 (모두 A)

모든 NFR은 측정 가능하고, 검증 방법과 함께 Code Generation의 binding requirement다.

## NFR Catalog

### NFR-U2-001 — Rust PBT 도구

- **요구**: FD-P-C07/C08/C09 property는 proptest(dev-dependency)로 구현하며, 구조적 custom generator(Strategy 조합), 자동 shrinking, 실패 seed 지속·재현, `cargo test` 통합의 네 가지 능력을 사용한다.
- **검증**: PBT-09 framework smoke(`preprocessor/tests/pbt_framework_smoke.rs`)가 통과하고, [tech-stack-decisions.md](tech-stack-decisions.md) §TSD-U2-01의 4항목 증명이 유효하다.
- **추적**: Q1; FR-015.3; ST-E03 AC-E03-02~04.

### NFR-U2-002 — 실패 지속과 회귀 고정

- **요구**: `proptest-regressions/` 실패 지속 파일을 저장소에 커밋해 모든 과거 실패 사례가 매 실행 시 novel case보다 먼저 재검사되게 한다. 의미 있는 최소 반례는 명명된 example test로도 승격한다. 실패 출력은 재현 seed(`cc` 라인)를 항상 포함해야 한다.
- **검증**: 실패 발생 시 지속 파일 존재·커밋 여부와 example 승격 여부를 code review gate에서 확인한다.
- **추적**: Q2; FR-015.6, FR-016.3; ST-E03 AC-E03-03.

### NFR-U2-003 — Run Count와 시간 예산

- **요구**: property당 proptest 기본 256 cases를 사용한다. `just test` 전체는 로컬 기준 3분 이내여야 한다. 예산 초과 시 개별 property의 케이스 수를 명시적으로 조정하고 근거를 tech-stack-decisions 또는 test 주석에 기록한다.
- **검증**: 측정 baseline — smoke 추가 후 전체 87 test가 약 26초(wall)로 통과했다. Code Generation 완료 시 재측정한다.
- **추적**: Q3; FR-014.1, FR-015.

### NFR-U2-004 — Preprocessor 결정성

- **요구**: 같은 입력(vault 내용 + 코드)에서 연속 두 번 실행한 `content/` 전체 tree(파일 목록과 각 파일 내용)가 byte 동일해야 한다. timestamp, 실행 환경 값, hash map 순회 순서 같은 비결정 원천은 산출물에 들어갈 수 없다.
- **검증**: fixture vault에 대한 이중 실행 byte 비교 자동 test (U2 Code Generation 의무). FD-P-C07-05·FD-P-C09-04가 property 수준을 보완한다.
- **추적**: Q4; FR-009.5, FR-017.3; ST-E01 AC-E01-04.

### NFR-U2-005 — 진단 출력·종료 코드

- **요구**: publication 진단은 stderr에 진단당 한 줄, `PUB### {path}: {detail}` 형식으로 BR-U2-023의 정렬 순서 그대로 출력하고 종료 코드는 1이다. 기계 파싱용 JSON 출력은 도입하지 않는다.
- **검증**: PUB001~PUB007 각각의 example test가 형식·순서·종료 코드를 단언한다 (business-logic-model §6 진단 example 의무와 결합). PUB007의 종료 코드 1은 BR-U2-028의 "비-zero"를 의도적으로 좁힌 것이며, BR-U2-023의 단계별 정렬은 write 단계 오류인 PUB007에는 적용되지 않는다.
- **추적**: Q5; BR-U2-023~028; EDGE-007, EDGE-012.

### NFR-U2-006 — 오늘 발행 글 시간 주입

- **요구**: `/` 조합의 "오늘" 값은 build 시작 시 한 번 계산해 조합 로직에 주입 가능한 매개변수여야 한다. production build는 실제 날짜를 쓰고, test는 고정 날짜를 주입해 글 있음/없음 두 경우를 결정적으로 검증한다. `new Date()` 직접 호출이 조합 로직 안에 남지 않는다.
- **검증**: FE-P-U2-02 example이 고정 날짜 주입으로 두 경우를 검증한다. 정확한 주입 메커니즘은 NFR Design/Code Generation이 정한다.
- **추적**: Q6; BR-U2-041; FE-P-U2-02.

### NFR-U2-007 — `/` 접근성 검증 범위

- **요구**: `/`에 U1과 같은 자동 axe 규칙(WCAG 2.0/2.1 A/AA + 2.2 AA, blanket exclusion 없음)과 keyboard·reduced-motion Playwright smoke를 실행한다. U1의 12-state 수동 review matrix는 확장하지 않는다 — `/`는 기존 site shell을 재사용하고 새 상호작용 요소를 추가하지 않는다.
- **검증**: axe 위반 0을 build gate로 한다. 수동 review subject(`REVIEW_SUBJECT_SOURCE_FILES`)는 U1 소유이며 U2가 변경하지 않는다.
- **추적**: Q7; FR-014.4; ST-U01 AC-U01-04; NFR-001 문맥.

### NFR-U2-008 — Browser·Viewport Matrix

- **요구**: `/` smoke는 chromium·firefox·webkit × 320×800·1440×900에서 실행한다. 도구 버전은 U1이 pin한 Playwright 구성을 재사용하고 U2가 새 버전을 도입하지 않는다.
- **검증**: Playwright project matrix 구성과 실행 결과.
- **추적**: Q8; FR-014.3, FR-014.6.

### NFR-U2-009 — `/` 정적 자원 계약

- **요구**: U2 변경으로 `/`에 (a) 새 client JavaScript 0 bytes — 기존 island·inline script는 유지, (b) 새 외부 origin 요청 0, (c) 신규 CSS를 추가하는 경우 gzip 4KiB 이내. slot fragment 스타일은 기존 global/profile 스타일을 **참조로 재사용**하는 것을 우선하되, 신규 CSS는 U1 수동 접근성 review subject에 속한 파일·디렉터리(`src/styles/global.css`, `src/styles/profile` 등) **밖**(예: `index.astro` page-scoped style)에 둔다 — NFR-U2-007의 subject 불변 약속을 지키기 위함이다.
- **검증**: build 산출물 비교(신규 script 태그·hydration marker 부재), U1 request-ledger 방식의 외부 요청 검사, 신규 CSS gzip 측정.
- **추적**: Q9; FR-013; FE-P-U2-04.

### NFR-U2-010 — Stable Command Topology (U3 Handoff)

- **요구**: U2는 신규 test 명령을 만들지 않는다. Rust stable command는 `just test`(= `cd preprocessor && cargo test`, U2 example·PBT 포함)이고, site는 U1의 `npm run test:unit`·`test:pbt`·`test:e2e`에 U2 suite를 추가한다. U3는 이 명령들을 변경 없이 aggregation한다.
- **검증**: Justfile·package.json에 U2 전용 신규 명령이 없고, U2 test가 기존 명령으로 전부 실행됨을 확인한다.
- **추적**: Q10; unit-of-work §4.7 (U2 → U3 provider); FR-016 경계.

### NFR-U2-011 — Network 독립성

- **요구**: U2의 모든 test(Rust PBT·example, site unit·PBT·e2e fixture)는 외부 네트워크나 외부 서비스 가용성에 의존하지 않는다. fixture와 generator는 저장소·로컬 자원만 사용한다.
- **검증**: 네트워크 차단 환경에서의 실행 가능성; U1 request-ledger 선례의 loopback-only 검사.
- **추적**: ST-E03 AC-E03-04와 constraint checklist("테스트 fixture와 생성기는 외부 네트워크 또는 서비스에 의존하지 않는다").

## Traceability Summary

| NFR | 근거 질문 | FR/Story |
|---|---|---|
| NFR-U2-001~003 | Q1~Q3 | FR-015, FR-016.3; ST-E03 |
| NFR-U2-004~005 | Q4~Q5 | FR-009.5, FR-017; ST-E01, EDGE-007/012 |
| NFR-U2-006 | Q6 | BR-U2-041; ST-U01 |
| NFR-U2-007~009 | Q7~Q9 | FR-013, FR-014; ST-U01 |
| NFR-U2-010~011 | Q10, 승인 전제 | unit-of-work §4.7; ST-E03/ST-E04 경계 |
