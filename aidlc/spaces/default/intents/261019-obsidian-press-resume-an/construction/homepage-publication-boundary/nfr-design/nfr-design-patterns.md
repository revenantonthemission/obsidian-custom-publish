# U2 NFR Design Patterns — Homepage Publication Boundary

## 문서 상태

- **단계**: CONSTRUCTION — U2 NFR Design
- **Unit**: U2 Homepage Publication Boundary
- **작성일**: 2026-07-28
- **결정 근거**: [NFR Design Plan](../../plans/homepage-publication-boundary-nfr-design-plan.md) Q1~Q9 (모두 A)

Pattern ID는 `PD-U2-##`로 안정적이며 [logical-components.md](logical-components.md)와 Code Generation이 이 ID로 추적한다.

## 1. Patterns

### PD-U2-01 — 검증된 6-pass pipeline (Q1)

pipeline을 scan → **catalog** → link → transform → search → output의 6-pass 논리 모델로 확장한다 (물리적 함수 구조는 Code Generation이 정하되 논리 순서와 진단 경계는 불변이다). catalog pass는 scope 파싱·cardinality 검증·1차 진단(PUB001~003)을 소유하고, 성공 시에만 downstream이 실행된다. link/transform pass가 2차 진단(PUB004~006)을 수집한다. catalog는 downstream의 **유일한 source 공급자**다 — 어떤 pass도 raw scan 결과를 직접 소비하지 않으므로, homepage가 discovery에 새는 경로가 타입 수준에서 사라진다. 기존 pass의 내부 책임은 변경되지 않는다.

### PD-U2-02 — 자료구조 층 결정성 (Q2)

순회 순서가 산출물에 닿는 모든 collection은 정렬 구조(BTreeMap 또는 정렬된 Vec)를 사용하고, serde 직렬화는 필드 선언 순서를 따른다. timestamp·실행 환경 값은 산출물에 넣지 않는다(BR-U2-032). 검증은 fixture vault 이중 실행 후 `content/` 전체 tree byte 비교 integration test 하나가 담당한다(NFR-U2-004). 출력 직전 정렬 방식은 채택하지 않는다 — 정렬을 잊은 새 호출부가 컴파일되는 것 자체를 막는 것이 목적이다.

### PD-U2-03 — 단일 소유 정리 (Q3)

C09의 OutputCleaner가 관리 namespace(`posts/`, `meta/`, `homepage/`, discovery JSON, `manifest.json`, assets) 정리를 완전히 소유하고, Justfile의 `rm -rf` 라인은 **`preprocess`와 `deploy-preprocess` 두 recipe 모두에서** 제거한다. 순서는 **검증 → 정리 → 쓰기**다: 모든 진단이 통과하기 전에는 정리도 시작하지 않으므로, 검증 실패는 이전 실행의 output을 보존한다(BR-U2-024). 이것이 U2의 build-time resilience 핵심이다 — 현재 Justfile은 preprocessor 실행 *전에* 삭제하므로 실패 시 아무것도 남지 않는다.

### PD-U2-04 — 매개변수 + env override 시간 주입 (Q4)

오늘 발행 글 계산은 날짜를 매개변수로 받는 순수 함수다. production `index.astro`는 build 시작 시 1회 계산한 실제 날짜를 전달하고, unit/PBT test는 고정 날짜를 직접 주입한다. e2e fixture build는 환경 변수 override(설정 시 그 값, 미설정 시 실제 날짜)로 결정성을 확보한다. env 읽기는 date 결정 지점 한 곳에만 존재하고 조합 로직 내부에는 `new Date()` 호출이 없다(NFR-U2-006).

### PD-U2-05 — 순수 조합 모듈 (Q5)

fence-aware slot token 계수, 치환 분할, 오늘 발행 글 heading 분할은 `site/src/lib/homepage.ts`의 순수 함수다. `index.astro`는 이 함수들과 U1 fragment·`getHomepage()` 결과의 조합만 담당한다. 순수 함수는 unit test와 fast-check PBT(FD-P-C06-01~02)로 직접 검증하고, page는 build/e2e로 검증한다.

### PD-U2-06 — 코드 포함 즉시 throw (Q6)

`getHomepage()`(HP001/HP002)와 slot 검증(HP003/HP004)은 `HP### {path}: {detail}` 형식 메시지의 `Error`를 즉시 throw한다. Astro build가 이를 표면화해 실패한다. Result 중간층은 두지 않는다 — 소비자가 build 하나뿐이고, 값으로 전달된 오류는 무시될 수 있는 반면 throw는 무시될 수 없다.

### PD-U2-07 — 가산적 Playwright matrix (Q7)

`site/tests/e2e/homepage.spec.ts`를 추가한다. 기존 chromium project는 `testIgnore` 방식이라 이 spec을 자동 편입하고, firefox·webkit는 U1 project가 `testMatch`로 U1 spec에 고정되어 있으므로 **homepage 전용 신규 project 두 개를 config에 추가**한다 — 기존 세 project 정의는 변경하지 않는다(TSD-U2-07의 "신규 project/spec 추가" 그대로). viewport(320×800·1440×900)는 spec 내부에서 설정해 3-browser × 2-viewport를 달성한다. U1 검증 결과와 review-subject가 움직이지 않는 가산적 확장이다.

### PD-U2-08 — Owner-local test 배치 (Q8)

Rust: `preprocessor/tests/publication_catalog.rs`·`publication_transform.rs`·`publication_output.rs` — example과 proptest property를 같은 파일에 두고, 지속 파일은 `tests/*.proptest-regressions`로 커밋한다(NFR-U2-002). Site: `site/tests/unit/homepage-composition.test.ts`, `site/tests/pbt/homepage-composition.pbt.test.ts`, `site/tests/e2e/homepage.spec.ts` — U1 명명 관례를 따른다. 모두 기존 명령(`just test`, `npm run test:*`)으로 실행된다(NFR-U2-010). **주의**: 현행 `vitest.pbt.config.ts` include와 `pbt-runner.mjs`의 `PBT_FILE` 검증 regex는 `tests/pbt/u1/**`에 고정되어 있으므로, U2 PBT 파일이 조용히 스킵되지 않도록 두 곳을 U2 경로까지 **가산 확장**하는 것이 Code Generation 의무다 — 확장 없이는 NFR-U2-010 검증이 통과될 수 없다.

### PD-U2-09 — Review-subject 격리 CSS (NFR-U2-009)

U2 신규 CSS는 U1 수동 접근성 review subject에 속한 파일·디렉터리 밖에 둔다 — 기본은 `index.astro`의 page-scoped style이다. 기존 global/profile 스타일은 **참조로만** 재사용한다. 신규 CSS는 gzip 4KiB 이내이고 새 외부 origin 요청은 0이다(NFR-U2-009). 이 pattern이 NFR-U2-007의 "수동 review 무효화 없음" 약속을 구조적으로 보장한다.

## 2. Category 판정

| Category | 판정 |
|---|---|
| Resilience | **Build-time으로 소진** — staged fail-closed 진단(PD-U2-01), 검증-전-정리-금지(PD-U2-03), fail-closed gateway(PD-U2-06). Runtime HA·재시도·복구는 N/A: 정적 사전 생성 site로 runtime 실행 주체가 없다 (Q9) |
| Scalability | **N/A (근거 기록)** — autoscaling·queue·부하 분산은 기존 S3/CloudFront 정적 전달 구조가 흡수한다. vault 규모 증가는 build 시간 문제이며 `just test` 3분 예산(NFR-U2-003)과 별개로 U2가 새 상한을 도입하지 않는다 (Q9-A) |
| Performance | 적용 — test 시간 예산(NFR-U2-003), `/` 자원 상한(NFR-U2-009, PD-U2-09), 결정성으로 인한 불필요 재생성 없음(PD-U2-02) |
| Security/Integrity | 적용 — fail-closed 진단·gateway, no-new-JS(FR-013), review-subject 격리(PD-U2-09), byte 결정성은 산출물 무결성 검증 가능성의 기반(PD-U2-02). auth/session·telemetry는 N/A: 수집·인증 주체가 없다 (Q9) |
| Logical Components | 적용 — [logical-components.md](logical-components.md) LC-U2-01~12 |

## 3. Traceability

| Pattern | 근거 | NFR/FD |
|---|---|---|
| PD-U2-01 | Q1 | BR-U2-023~024; FD-P-C07-*; NFR-U2-005 |
| PD-U2-02 | Q2 | NFR-U2-004; FD-P-C07-05, FD-P-C09-04 |
| PD-U2-03 | Q3 | BR-U2-024, BR-U2-026; NFR-U2-004 |
| PD-U2-04 | Q4 | NFR-U2-006; FE-P-U2-02 |
| PD-U2-05 | Q5 | FD-P-C06-01~02; BR-U2-036~042 |
| PD-U2-06 | Q6 | BR-U2-033, BR-U2-038; NFR-U2-005의 site 대응 |
| PD-U2-07 | Q7 | NFR-U2-007~008; TSD-U2-07 |
| PD-U2-08 | Q8 | NFR-U2-001, NFR-U2-002, NFR-U2-003, NFR-U2-010; PBT-09 |
| PD-U2-09 | NFR-U2-009 | NFR-U2-007; U1 review-subject 계약 |
