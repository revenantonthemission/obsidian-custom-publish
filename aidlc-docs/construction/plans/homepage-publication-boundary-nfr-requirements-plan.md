# U2 NFR Requirements Plan — Homepage Publication Boundary

## 문서 상태

- **단계**: CONSTRUCTION — U2 NFR Requirements
- **상태**: 질문 답변 대기
- **Unit**: U2 Homepage Publication Boundary
- **작성일**: 2026-07-28
- **Feature Branch**: `codex/feature/resume-home-boundary`
- **선행 승인**: U2 Functional Design (2026-07-28, "승인")
- **PBT Enforcement**: Full; 이 단계에는 PBT-09(framework 선택·검증)가 적용됨

## 1. 입력과 전제

- [U2 Functional Design Plan](homepage-publication-boundary-functional-design-plan.md) — 승인된 Q1~Q12(A) 결정
- [Business Rules](../homepage-publication-boundary/functional-design/business-rules.md) — BR-U2-001~046, PUB/HP 진단 vocabulary
- [Business Logic Model](../homepage-publication-boundary/functional-design/business-logic-model.md) — FD-P property 17개와 example 의무
- [Unit of Work §4.9](../../inception/application-design/unit-of-work.md) — NFR Requirements 산출: Rust PBT framework, determinism/error/test performance, static contract
- [Requirements](../../inception/requirements/requirements.md) — FR-014, FR-015, NFR-003~NFR-006

다음은 이미 승인됐으며 다시 열지 않는다.

- PBT 전체 적용: custom generator, 자동 shrinking, seed 재현, 기존 test runner 통합을 지원하는 framework를 언어별로 선택한다 (FR-015.3).
- site 쪽 test는 U1이 승인·설치한 Vitest 4.x + fast-check 4.x(`@fast-check/vitest`)를 재사용한다. TS framework를 다시 선택하지 않는다.
- U2 property 소유: FD-P-C07/C08/C09는 Rust, FD-P-C06/C10은 TypeScript. U3는 aggregation만 한다.
- 새 client JavaScript·Preact island·외부 runtime 의존성 금지 (FR-013).
- `preprocessor/Cargo.toml`·`Cargo.lock`은 이 단계가 새 Rust PBT dependency를 승인한 경우에만 변경할 수 있다 (unit-of-work §4.6).
- Infrastructure, Terraform, AWS, deployment와 Jenkins 변경은 범위가 아니다 (Jenkins의 U2 test 실행은 U3 ST-E04 소유).
- PBT가 발견한 최소 반례는 영구 example 회귀로 고정한다 (FR-015.6).

## 2. 현재 스택 분석

- **Rust**: edition 2024, rustc/cargo 1.97.1 (Homebrew). dependencies: anyhow, serde, serde_json, serde_yml 0.0.12, walkdir, clap, regex, chrono, tempfile, lindera 2. **PBT dependency 없음** — 이 단계가 선택·설치한다.
- **YAML 파싱**: `serde_yml 0.0.12` — `visibility` scope 파싱(BR-U2-002~003)이 이 layer 위에 놓인다.
- **Test 실행**: `just test` = `cd preprocessor && cargo test`. 현재 85개 test가 `fixtures/vault/` 실데이터를 사용한다.
- **출력 정리**: 현재 `just preprocess`가 Justfile에서 `rm -rf content/posts content/meta content/assets`를 수행한다. BR-U2-026은 이 정리를 C09(preprocessor 내부)로 이동시키므로 Justfile 중복은 Code Generation에서 정리한다.
- **site test**: U1의 Vitest/fast-check/Playwright/axe 구성이 `site/`에 존재하며 U2는 suite를 추가한다.

## 3. 목표와 산출물

이 단계는 U2의 측정 가능한 NFR과 도구 결정을 확정한다.

- Rust PBT framework 선택과 PBT-09 증명 (custom generator, shrinking, seed 재현, runner 통합)
- 실패 재현·회귀 고정 정책
- run count와 test 시간 예산
- preprocessor 결정성 NFR
- 진단 출력·종료 코드 계약
- `/` 조합의 시간 의존성 처리
- `/` 접근성·browser matrix·정적 자원 계약
- U2 stable command topology (U3 handoff)

답변 검증 뒤 다음 파일을 생성한다.

- `aidlc-docs/construction/homepage-publication-boundary/nfr-requirements/nfr-requirements.md`
- `aidlc-docs/construction/homepage-publication-boundary/nfr-requirements/tech-stack-decisions.md`

PBT-09 준수를 위해 선택된 Rust framework는 dev-dependency로 실제 설치하고, custom generator·shrinking·seed 재현·cargo test 통합을 증명하는 framework smoke test를 이 feature branch 안에서 검증한다.

## 4. 실행 계획

### 4.1 Context 분석

- [x] 승인된 FD property 17개의 framework 요구(생성기 도메인, oracle, 상태 idempotence)를 분석한다.
- [x] 현재 Rust/edition/의존성/test 명령과 site test 구성을 확인한다.
- [x] FR-014, FR-015, NFR-003~006과 U3 handoff 의무를 추적한다.

### 4.2 질문과 답변

- [x] framework, 재현 정책, 예산, 결정성, 진단, 시간 의존성, 접근성, matrix, 자원, 명령의 미확정 항목을 질문으로 작성한다.
- [x] 이미 승인된 결정을 반복하지 않고 모든 질문에 최소 두 개의 의미 있는 선택지와 마지막 `X) Other`를 제공한다.
- [ ] 모든 `[Answer]:`를 수집하고 형식·명확성·상호 일관성·기존 승인 호환성을 검증한다.
- [ ] 모호한 답변이 있으면 clarification file로 해소한다.

### 4.3 생성과 검증

- [ ] 측정 가능한 U2 NFR catalog(`nfr-requirements.md`)를 생성한다.
- [ ] 도구 결정 기록(`tech-stack-decisions.md`)을 생성한다.
- [ ] 선택된 Rust PBT framework를 dev-dependency로 설치하고 PBT-09 smoke(custom generator, shrinking, seed 재현, runner 통합)를 증명한다.
- [ ] 독립 검토와 Markdown/링크 구조 검증을 수행한다.
- [ ] 표준 2-option 완료 gate를 제시하고 명시적 승인을 기다린다.

## 5. NFR Requirements Questions

각 `[Answer]:` 뒤에 선택한 문자 하나를 입력해 주세요. `X`를 선택하면 같은 줄에 구체적인 규칙을 작성해 주세요.

### Question 1 — Rust PBT framework

FD-P-C07/C08/C09 property를 구현할 Rust framework를 무엇으로 할까요? (요구: custom generator, 자동 shrinking, seed 재현, `cargo test` 통합 — FR-015.3)

A) `proptest`를 dev-dependency로 채택한다. `Strategy` 조합으로 구조적 custom generator를 만들고, 통합 shrinking, `proptest-regressions/` 실패 지속, 환경 변수 기반 seed 재현과 `cargo test` 통합을 그대로 사용한다. **(권장)**

B) `quickcheck`를 채택한다. `Arbitrary` trait 기반으로 가볍지만 구조적 generator 조합과 shrinking 제어가 proptest보다 제한적이다.

C) `arbitrary` crate + 자체 harness를 구성한다. 의존성은 최소지만 shrinking·seed 재현을 직접 구현해야 한다.

X) Other (please describe after [Answer]: tag below) — framework와 네 가지 요구의 충족 방식을 설명한다.

[Answer]:

### Question 2 — 실패 재현과 회귀 고정 정책

PBT 실패의 재현과 영구 고정을 어떻게 운영할까요?

A) framework의 실패 지속 파일(`proptest-regressions/*.txt` 등)을 저장소에 커밋해 모든 과거 실패가 매 실행마다 재검사되게 하고, 의미 있는 최소 반례는 FR-015.6에 따라 별도의 명명된 example test로도 승격한다. 실패 출력의 seed로 같은 실패를 재현할 수 있어야 한다. **(권장)**

B) 실패 지속 파일만 커밋하고 example 승격은 사례별 판단으로 남긴다.

C) 실패 지속 파일은 커밋하지 않고 seed 기록·재현만 요구한다.

X) Other (please describe after [Answer]: tag below) — 지속 파일, seed, example 승격 규칙을 설명한다.

[Answer]:

### Question 3 — run count와 test 시간 예산

property당 실행 횟수와 전체 test 시간 예산을 어떻게 정할까요?

A) property당 framework 기본값(proptest 기준 256 cases)을 사용하고, `just test` 전체(기존 85 test + U2 추가)는 로컬 기준 3분 이내를 유지한다. 예산 초과 시 개별 property의 케이스 수를 명시적으로 조정하고 그 근거를 기록한다. **(권장)**

B) U1 TS PBT와 통일해 property당 100 cases로 고정하고 같은 3분 예산을 적용한다.

C) 기본값을 쓰되 시간 예산은 정하지 않는다.

X) Other (please describe after [Answer]: tag below) — 케이스 수, 예산과 조정 규칙을 설명한다.

[Answer]:

### Question 4 — preprocessor 결정성 NFR

FD-P-C07-05·C09-04를 뒷받침하는 결정성 요구를 어느 강도로 정할까요?

A) 같은 입력(vault 내용 + 코드)에서 연속 두 번 실행한 `content/` 전체 tree(파일 목록·내용)가 byte 동일해야 한다. timestamp, 실행 환경, hash map 순회 순서 같은 비결정 원천을 산출물에서 배제하고, fixture 기반 자동 test로 검증한다. **(권장)**

B) 구조적 동등성만 요구한다: 파일 목록과 parsed 내용이 같으면 serialization byte 차이는 허용한다.

X) Other (please describe after [Answer]: tag below) — 동일성 수준과 검증 방법을 설명한다.

[Answer]:

### Question 5 — 진단 출력·종료 코드 계약

PUB 진단(BR-U2-023)의 출력 형식을 어떻게 정할까요?

A) stderr에 진단당 한 줄, `PUB### {path}: {detail}` 형식으로 정렬 순서 그대로 출력하고 종료 코드는 1이다. 기계 파싱용 JSON 출력은 도입하지 않는다 — 소비자는 사람과 CI 로그뿐이다. **(권장)**

B) A의 가독 출력에 더해 `--diagnostics-json` 옵션으로 구조화 출력을 제공한다.

X) Other (please describe after [Answer]: tag below) — 형식, stream과 종료 코드 규칙을 설명한다.

[Answer]:

### Question 6 — 오늘 발행 글의 시간 의존성

`index.astro`는 현재 `new Date()`로 "오늘"을 계산합니다. 결정적 test(FE-P-U2-02)를 위해 어떻게 다룰까요?

A) "오늘" 값을 build 시작 시 한 번 계산해 조합 로직에 주입 가능한 매개변수로 만든다. production build는 실제 날짜를 쓰고, test는 고정 날짜를 주입해 글 있음/없음 두 경우를 결정적으로 검증한다. **(권장)**

B) 현재 `new Date()` 직접 호출을 유지하고, test는 오늘 날짜로 fixture metadata를 동적으로 생성해 검증한다 (자정 경계에서 취약).

X) Other (please describe after [Answer]: tag below) — 시간 주입과 test 전략을 설명한다.

[Answer]:

### Question 7 — `/` 접근성 검증 범위

U1은 `/resume`·`/portfolio`에 자동 axe + 12-state 수동 review를 운영합니다. U2의 `/`는 어느 범위로 검증할까요?

A) 자동 검증만 적용한다: U1과 같은 axe 규칙(WCAG 2.0/2.1 A/AA + 2.2 AA)을 `/`에 실행하고 keyboard·reduced-motion Playwright smoke를 포함한다. U1의 수동 review matrix는 U1 profile 계약 소유이므로 확장하지 않는다. `/`는 기존 site shell을 재사용하고 새 상호작용 요소가 없다. **(권장)**

B) 수동 review matrix에 `/` 상태(테마 × viewport)를 추가하고 U1과 같은 서명 절차를 적용한다.

X) Other (please describe after [Answer]: tag below) — 자동·수동 범위를 설명한다.

[Answer]:

### Question 8 — browser·viewport matrix

`/` smoke test의 실행 matrix를 어떻게 정할까요?

A) U1과 동일하게 chromium·firefox·webkit × 320×800·1440×900을 재사용한다. 도구 버전도 U1이 pin한 Playwright 구성을 따른다. **(권장)**

B) chromium × 두 viewport만 실행해 시간을 아낀다.

X) Other (please describe after [Answer]: tag below) — browser와 viewport 집합을 설명한다.

[Answer]:

### Question 9 — `/` 정적 자원 계약

U2가 `/`에 추가하는 자원의 상한을 어떻게 정할까요?

A) 새 client JavaScript 0 bytes(기존 island·script 유지), 새 외부 origin 요청 0. slot fragment 스타일은 기존 global/profile 스타일 재사용을 우선하고, 신규 CSS를 추가하는 경우 gzip 4KiB 이내로 제한한다. **(권장)**

B) 새 client JS 0 bytes와 외부 요청 0만 요구하고 CSS 수치 상한은 두지 않는다.

X) Other (please describe after [Answer]: tag below) — JS·CSS·요청 상한을 설명한다.

[Answer]:

### Question 10 — U2 stable command topology (U3 handoff)

U3가 CI에 연결할 U2의 안정 명령을 어떻게 구성할까요?

A) 신규 명령을 만들지 않는다. Rust는 `just test`(= `cargo test`, U2 example·PBT 포함, 실패 시 seed 확인 가능)가 U2의 stable command이고, site는 U1의 기존 `npm run test:unit`·`test:pbt`·`test:e2e`에 U2 suite를 추가한다. U3는 이 기존 명령들을 변경 없이 aggregation한다. **(권장)**

B) `just test-publication`(Rust publication suite filter)과 site의 U2 전용 script를 신설해 U2 gate를 독립 실행 가능하게 한다.

X) Other (please describe after [Answer]: tag below) — 명령 이름과 포함 범위를 설명한다.

[Answer]:

## 6. 답변 검증과 생성 경계

- 모든 답변은 문자 선택과 설명의 일치, 단일 의미, 상호 일관성 및 기존 승인 호환성을 검증한다.
- Q1~Q10이 모두 명확해진 뒤에만 두 artifact를 생성하고 PBT-09 설치·증명을 수행한다.
- Cargo.toml/Cargo.lock 변경은 Q1 승인 결과의 dev-dependency 추가로 한정한다.
- NFR Requirements 승인 전에는 U2 NFR Design으로 진행하지 않는다.
- 이 계획 작성은 application source, external Vault, generated output, Terraform, AWS와 deployment를 변경하지 않는다.
