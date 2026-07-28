# U2 NFR Design Plan — Homepage Publication Boundary

## 문서 상태

- **단계**: CONSTRUCTION — U2 NFR Design
- **상태**: artifact 2/2 생성·검증·독립 검토 완료 — 완료 gate 승인 대기
- **Unit**: U2 Homepage Publication Boundary
- **작성일**: 2026-07-28
- **Feature Branch**: `codex/feature/resume-home-boundary`
- **선행 승인**: U2 NFR Requirements (2026-07-28, "승인")
- **PBT Enforcement**: Full; 이 단계는 PBT 직접 enforcement 단계가 아니나 승인된 PBT-09 결정과 property 소유는 binding이다

## 1. 입력과 전제

- [NFR Requirements](../homepage-publication-boundary/nfr-requirements/nfr-requirements.md) — NFR-U2-001~011
- [Tech Stack Decisions](../homepage-publication-boundary/nfr-requirements/tech-stack-decisions.md) — TSD-U2-01~07 (특히 이 단계로 이연된 TSD-U2-04 "오늘" 주입 메커니즘, TSD-U2-07 matrix 신규 구성)
- [Functional Design artifacts](../homepage-publication-boundary/functional-design/business-rules.md) — BR-U2-001~046, 진단 vocabulary, FD-P property
- [Unit of Work §4.9](../../inception/application-design/unit-of-work.md) — NFR Design 산출: producer-side partition, artifact schema/read gate, error propagation, owner-local test pattern
- 현재 pipeline 구조: preprocessor 5-pass (scan → link → transform → search → output), `site/src/lib/data.ts` gateway, U1 Playwright/axe 구성

다음은 이미 승인됐으며 다시 열지 않는다.

- FD의 모든 계약 (staged 진단, exactly-one, artifact 경로/schema, slot token, gateway fail-closed)과 NFR-U2-001~011의 측정 요구.
- proptest 1.11.0, 256 cases, 지속 파일 커밋, `just test` 3분 예산.
- `content/` tree byte 결정성; `PUB### {path}: {detail}` stderr/exit-1.
- `/` 자동 접근성 전용, 3-browser × 320×800·1440×900 (신규 project/spec으로 달성 — TSD-U2-07), 신규 CSS는 review-subject 밖 gzip 4KiB 이내.
- 신규 test 명령 없음; U3 aggregation 경계; no-JS·no-push·no-deploy·Vault write gate.

## 2. 목표와 산출물

이 단계는 NFR을 만족시키는 설계 pattern과 logical component를 확정한다. 카테고리(Resilience, Scalability, Performance, Security/Integrity, Logical Components)는 각각 적용 또는 근거 있는 N/A로 판정한다.

답변 검증 뒤 다음 파일을 생성한다.

- `aidlc-docs/construction/homepage-publication-boundary/nfr-design/nfr-design-patterns.md`
- `aidlc-docs/construction/homepage-publication-boundary/nfr-design/logical-components.md`

## 3. 실행 계획

- [x] NFR/TSD/FD 계약과 현재 pipeline·gateway·test 구조를 분석한다.
- [x] pipeline 배치, 결정성, 정리 소유, 시간 주입, 조합 로직 배치, 오류 전파, Playwright 구성, test 조직, runtime N/A의 미확정 항목을 질문으로 작성한다.
- [x] 모든 `[Answer]:`를 수집하고 형식·명확성·상호 일관성·기존 승인 호환성을 검증한다. 1차 제출은 8/9(Q1 공란, Q8 답변이 태그 다음 줄)였다. Q8은 의미가 유일해 같은 줄로 기계적 정규화했고, Q1은 추정 없이 재질문해 사용자가 직접 A를 기입했다. 최종 9개 답변이 모두 명확한 A 선택으로 형식·명확성·상호 일관성·기존 승인 호환성 검증을 통과했다. clarification file 불필요.
- [x] 두 artifact를 생성하고 카테고리 판정·traceability를 검증한다 (PD-U2-01~09, LC-U2-01~12).
- [x] 독립 검토와 Markdown/링크 구조 검증을 수행한다 — BLOCKING 0, MATERIAL 3, MINOR 5 전부 수정 반영.
- [x] 표준 2-option 완료 gate를 제시하고 명시적 승인을 기다린다.

## 6. Artifact Validation Result

- **검증 완료 시각**: 2026-07-28
- **필수 artifact**: 2/2 — `nfr-design-patterns.md`(PD-U2-01~09 + 5-category 판정)와 `logical-components.md`(LC-U2-01~12), `aidlc-docs/construction/homepage-publication-boundary/nfr-design/`.
- **Category 판정**: Resilience는 build-time fail-closed로 소진(runtime N/A 근거 기록), Scalability는 정적 전달 구조 흡수로 N/A, Performance/Security-Integrity/Logical Components는 적용 — 침묵 누락 없음.
- **독립 검토**: BLOCKING 0, MATERIAL 3, MINOR 5 — 전부 수정 반영. MATERIAL: (1) firefox/webkit가 `testMatch`로 U1 spec에 고정되어 있어 "실행 대상 추가"가 U1 project 불변과 모순 → homepage 전용 신규 project 두 개로 교정(TSD-U2-07 그대로); (2) 승인 경로의 site PBT 파일이 현행 `vitest.pbt.config.ts` include·`pbt-runner.mjs` regex(`tests/pbt/u1/**` 고정)에 걸리지 않아 조용히 스킵될 위험 → 두 곳의 가산 확장을 Code Generation 의무로 명시; (3) Justfile `rm -rf`가 `preprocess`·`deploy-preprocess` 두 recipe에 존재 → 둘 다 제거로 명시. MINOR: 6-pass 논리 모델 표기, PUB007 example의 `publication_output.rs` 귀속, FE-P/DE-P의 명명 파일 배정, NFR-U2-001/003 추적 행 추가, PD-U2-09에 4KiB·외부 요청 0 명문화.
- **구조 검증**: 9개 PD ID·12개 LC ID 중복 없음, 인용된 모든 BR/FD-P/DE-P/FE-P/NFR/TSD ID 실재, 상대 링크 해석 가능.
- **Mutation Boundary**: AI-DLC 문서만 변경. application source, manifest, external Vault, generated output, Terraform/AWS, push, deployment 불변.
- **Artifact Gate**: 제시됨 — 명시적 승인 대기.

## 4. NFR Design Questions

각 `[Answer]:` 뒤에 선택한 문자 하나를 입력해 주세요. `X`를 선택하면 같은 줄에 구체적인 규칙을 작성해 주세요.

### Question 1 — Publication 검증의 pipeline 배치

C07 catalog 구축과 진단을 기존 5-pass pipeline 어디에 둘까요?

A) scan 직후의 독립된 새 pass로 둔다: scan → **catalog(scope 파싱·cardinality·1차 진단)** → link/transform(2차 진단) → search → output. 기존 pass의 책임은 바뀌지 않고, catalog가 downstream의 유일한 source 공급자가 된다. **(권장)**

B) scan pass 내부에 scope 파싱·검증을 통합해 pass 수를 유지한다. scanner가 catalog를 직접 반환한다.

X) Other (please describe after [Answer]: tag below) — pass 구조와 책임 배치를 설명한다.

[Answer]: A) scan 직후의 독립된 새 pass로 둔다: scan → **catalog(scope 파싱·cardinality·1차 진단)** → link/transform(2차 진단) → search → output. 기존 pass의 책임은 바뀌지 않고, catalog가 downstream의 유일한 source 공급자가 된다.

### Question 2 — 결정성 구현 pattern

`content/` byte 결정성(NFR-U2-004)을 어느 층에서 강제할까요?

A) 자료구조 층에서 강제한다: 순회 순서가 산출물에 닿는 모든 collection은 정렬된 구조(BTreeMap/정렬 Vec)를 쓰고, serde 직렬화는 필드 선언 순서를 따른다. 이중 실행 byte 비교는 fixture 기반 integration test 하나가 검증한다. **(권장)**

B) 출력 층에서 강제한다: 내부는 HashMap을 허용하고 직렬화 직전에만 정렬한다.

X) Other (please describe after [Answer]: tag below) — 강제 지점과 검증 방법을 설명한다.

[Answer]: A) 자료구조 층에서 강제한다: 순회 순서가 산출물에 닿는 모든 collection은 정렬된 구조(BTreeMap/정렬 Vec)를 쓰고, serde 직렬화는 필드 선언 순서를 따른다. 이중 실행 byte 비교는 fixture 기반 integration test 하나가 검증한다.

### Question 3 — Output 정리의 소유 이전

BR-U2-026의 전체 정리를 C09가 소유하면 Justfile의 기존 `rm -rf`는 어떻게 할까요?

A) C09가 관리 namespace 정리를 완전히 소유하고 Justfile의 `rm -rf` 라인은 제거한다 — 정리 규칙의 단일 소유. `just preprocess`의 관찰 가능 결과는 동일하다. **(권장)**

B) C09 정리를 추가하되 Justfile `rm -rf`도 유지한다 (이중 방어; 규칙이 두 곳에 존재).

X) Other (please describe after [Answer]: tag below) — 소유와 Justfile 처리를 설명한다.

[Answer]: A) C09가 관리 namespace 정리를 완전히 소유하고 Justfile의 `rm -rf` 라인은 제거한다 — 정리 규칙의 단일 소유. `just preprocess`의 관찰 가능 결과는 동일하다.

### Question 4 — "오늘" 주입 메커니즘 (TSD-U2-04 이연 결정)

오늘 발행 글의 날짜 주입을 어떻게 구현할까요?

A) 이중 구조: 조합 로직을 순수 함수로 추출해 날짜를 **매개변수**로 받고(unit/PBT test는 직접 주입), production `index.astro`는 build 시작 시 1회 계산한 실제 날짜를 전달한다. e2e fixture build는 **환경 변수 override**(설정 시 그 값, 미설정 시 실제 날짜)로 결정적 검증을 한다. **(권장)**

B) 환경 변수 하나만 사용한다: 모든 경로가 env를 읽고 test가 env를 설정한다.

C) 매개변수만 사용한다: e2e는 고정 날짜 없이 글 있음/없음 구조를 실제 날짜 기준으로 assert한다.

X) Other (please describe after [Answer]: tag below) — 주입 경로와 test 전략을 설명한다.

[Answer]: A) 이중 구조: 조합 로직을 순수 함수로 추출해 날짜를 **매개변수**로 받고(unit/PBT test는 직접 주입), production `index.astro`는 build 시작 시 1회 계산한 실제 날짜를 전달한다. e2e fixture build는 **환경 변수 override**(설정 시 그 값, 미설정 시 실제 날짜)로 결정적 검증을 한다.

### Question 5 — Slot 조합 로직의 배치

token 계수·치환·분할 로직을 site 어디에 둘까요?

A) `site/src/lib/homepage.ts`의 순수 함수들로 추출한다 (fence-aware token 계수, 치환 분할, 오늘 발행 글 분할). `index.astro`는 이 함수들과 U1 fragment의 조합만 담당한다. 순수 함수는 unit/fast-check PBT로 직접 test한다. **(권장)**

B) `index.astro` frontmatter에 인라인으로 두고 e2e/build test로만 검증한다.

X) Other (please describe after [Answer]: tag below) — 모듈 경계와 test 접근을 설명한다.

[Answer]: A) `site/src/lib/homepage.ts`의 순수 함수들로 추출한다 (fence-aware token 계수, 치환 분할, 오늘 발행 글 분할). `index.astro`는 이 함수들과 U1 fragment의 조합만 담당한다. 순수 함수는 unit/fast-check PBT로 직접 test한다.

### Question 6 — Gateway 오류 전파 pattern

`getHomepage()`의 HP001/HP002와 slot 검증의 HP003/HP004를 어떻게 전파할까요?

A) 코드·경로·상세를 담은 `Error`를 즉시 throw한다 (`HP001 content/homepage/meta.json: ...` 형식 메시지). Astro build가 이를 표면화해 실패한다. Result 타입 같은 중간 층은 도입하지 않는다. **(권장)**

B) typed Result를 반환하고 호출부(page/조합 함수)가 throw한다 — 오류가 값으로 한 번 이동한 뒤 실패한다.

X) Other (please describe after [Answer]: tag below) — 전파 경로와 메시지 형식을 설명한다.

[Answer]: A) 코드·경로·상세를 담은 `Error`를 즉시 throw한다 (`HP001 content/homepage/meta.json: ...` 형식 메시지). Astro build가 이를 표면화해 실패한다. Result 타입 같은 중간 층은 도입하지 않는다.

### Question 7 — `/` smoke의 Playwright 구성

TSD-U2-07의 신규 project/spec을 어떤 구조로 추가할까요?

A) 기존 `site/playwright.config.ts`에 U2 전용 spec(`homepage.spec.ts`)을 추가하고, chromium project가 두 viewport 전부를, firefox·webkit는 해당 spec을 실행 대상에 추가해 3-browser × 320×800·1440×900을 달성한다. U1 spec과 project 정의는 변경하지 않는다. **(권장)**

B) `/` 전용 별도 Playwright config 파일을 만들어 U1 구성과 완전히 분리한다 (명령 topology에 새 실행 경로가 생기지 않도록 기존 `test:e2e`가 두 config를 순차 실행).

X) Other (please describe after [Answer]: tag below) — project/spec 구조를 설명한다.

[Answer]: A) 기존 `site/playwright.config.ts`에 U2 전용 spec(`homepage.spec.ts`)을 추가하고, chromium project가 두 viewport 전부를, firefox·webkit는 해당 spec을 실행 대상에 추가해 3-browser × 320×800·1440×900을 달성한다. U1 spec과 project 정의는 변경하지 않는다.

### Question 8 — U2 test 파일 조직

owner-local test를 어디에 어떤 이름으로 둘까요?

A) U1 관례를 따른다. Rust: `preprocessor/tests/publication_catalog.rs`·`publication_transform.rs`·`publication_output.rs`(example + 같은 파일의 proptest property), 지속 파일은 `tests/*.proptest-regressions`. Site: `site/tests/unit/homepage-composition.test.ts`, `site/tests/pbt/homepage-composition.pbt.test.ts`, `site/tests/e2e/homepage.spec.ts`. **(권장)**

B) Rust example과 property를 별도 파일로 분리하고(site도 동일), 파일 수를 늘려 단위를 더 잘게 유지한다.

X) Other (please describe after [Answer]: tag below) — 파일 배치와 명명 규칙을 설명한다.

[Answer]: A) U1 관례를 따른다. Rust: `preprocessor/tests/publication_catalog.rs`·`publication_transform.rs`·`publication_output.rs`(example + 같은 파일의 proptest property), 지속 파일은 `tests/*.proptest-regressions`. Site: `site/tests/unit/homepage-composition.test.ts`, `site/tests/pbt/homepage-composition.pbt.test.ts`, `site/tests/e2e/homepage.spec.ts`.

### Question 9 — Runtime 카테고리 N/A 경계

Resilience/Scalability의 runtime 관심사를 어떻게 판정할까요?

A) U1과 같은 근거로 명시적 N/A를 기록한다: 정적 사전 생성 site이므로 runtime HA, autoscaling, cache invalidation(런타임), queue, auth/session, telemetry는 해당 없음. U2의 resilience는 build-time fail-closed(진단·정리·재생성)로 이미 소진되며, scalability는 기존 정적 전달 구조가 흡수한다. **(권장)**

B) 일부 항목(예: 대규모 vault에서의 preprocessor 처리 시간 상한)을 추가 NFR로 승격해 검토한다.

X) Other (please describe after [Answer]: tag below) — 판정과 근거를 설명한다.

[Answer]: A) U1과 같은 근거로 명시적 N/A를 기록한다: 정적 사전 생성 site이므로 runtime HA, autoscaling, cache invalidation(런타임), queue, auth/session, telemetry는 해당 없음. U2의 resilience는 build-time fail-closed(진단·정리·재생성)로 이미 소진되며, scalability는 기존 정적 전달 구조가 흡수한다.

## 5. 답변 검증과 생성 경계

- 모든 답변은 문자 선택과 설명의 일치, 단일 의미, 상호 일관성 및 기존 승인 호환성을 검증한다.
- Q1~Q9가 모두 명확해진 뒤에만 두 artifact를 생성한다.
- 이 단계는 문서만 변경한다. application source, Cargo/npm manifest, external Vault, generated output, Terraform, AWS와 deployment는 변경하지 않는다.
- NFR Design 승인 전에는 U2 Infrastructure Design으로 진행하지 않는다.
