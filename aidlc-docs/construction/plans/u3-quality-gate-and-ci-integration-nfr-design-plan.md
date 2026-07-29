# U3 NFR Design Plan — Quality Gate and CI Integration

## 문서 상태

- **단계**: CONSTRUCTION — U3 NFR Design
- **상태**: artifact 생성 완료, 승인 gate 대기
- **Unit**: U3 Quality Gate and CI Integration
- **작성일**: 2026-07-29
- **Feature Branch**: `codex/feature/resume-quality-gates`
- **선행 승인**: U3 Functional Design (2026-07-29, "승인"), U3 NFR Requirements (2026-07-29, "승인")

## 1. 입력과 전제

- [U3 NFR Requirements](../u3-quality-gate-and-ci-integration/nfr-requirements/nfr-requirements.md) — NFR-U3-001~008, matrix
- [Tech Stack Decisions](../u3-quality-gate-and-ci-integration/nfr-requirements/tech-stack-decisions.md) — 신규 도입 0, Jenkins core 문법만
- [verification-orchestration.md](../u3-quality-gate-and-ci-integration/functional-design/verification-orchestration.md) — OR-U3-01~10
- [Unit of Work §5.9](../../inception/application-design/unit-of-work.md) — NFR Design 산출: network-independent orchestration, deterministic reports, seed propagation, failure semantics

다음은 이미 승인됐으며 다시 열지 않는다.

- Verify stage의 위치·내용·실패 의미론 (OR-U3-02/03), CI 범위 = build+example+PBT (FD Q3-A), `RUN_DEPLOY` 경로 (OR-U3-06).
- seed evidence는 framework 기본 출력 + console log + 실패 시 archiveArtifacts (OR-U3-05); 재현 경로 (proptest regressions / fast-check seed).
- 신규 dependency 0 (NFR-U3-004), Jenkins core 문법만·plugin 0 (tech-stack §3).
- gap adapter의 matrix·실행 형태 (NFR-U3-002/003); 생성 여부는 evidence mapping 표가 결정 (FD Q6-A).
- 시간 기준선·네트워크 경계·보존 정책 (NFR-U3-001/006/007).

## 2. 목표와 산출물

남은 설계 자유도 — Verify 내부 구조, gap adapter의 로컬 명령 표면, CI seed 정책, 실패 evidence 보존의 구현 위치, report의 형태 — 를 확정한다. 답변 검증 뒤 생성:

- `aidlc-docs/construction/u3-quality-gate-and-ci-integration/nfr-design/nfr-design-patterns.md`
- `aidlc-docs/construction/u3-quality-gate-and-ci-integration/nfr-design/logical-components.md`

## 3. 실행 계획

- [x] 승인된 FD/NFR 결정과 §5.9 NFR Design 산출 요구를 분석한다.
- [x] 미확정 설계 항목을 질문으로 작성한다 (승인 결정 반복 없음, 각 질문 ≥2 선택지 + `X) Other`).
- [x] 답변 수집·검증; 모호하면 clarification file. — 1회 제출로 5/5 A 확정; Q2-A와 tech-stack §1 포괄 문장의 정합화 수행(비침묵 기록).
- [x] 두 artifact 생성, traceability 검증, 독립 검토·구조 검증. — 독립 검토가 BLOCKER 1건(Q4-A 예시 glob의 실존하지 않는 경로) 적발, 정정·기록; minor 1·note 2 반영.
- [x] 표준 2-option 완료 gate 제시.

## 4. NFR Design Questions

각 `[Answer]:` 뒤에 선택한 문자 하나를 입력해 주세요. `X`를 선택하면 같은 줄에 구체적인 설계를 작성해 주세요.

### Question 1 — Verify stage 내부 구조

Install stage는 npm ci ∥ cargo build를 parallel로 실행합니다. Verify 내부는 어떻게 구성할까요?

A) **단일 stage 순차 실행**: `cargo test --release` → `cd site && npm run test:unit && npm run test:pbt`를 한 stage에서 순서대로 실행한다. console log의 실패 귀속이 단순하고(1차 증거 품질 — OR-U3-05), nightly cron이라 wall-clock 단축의 실익이 없다. **(권장)**

B) Install처럼 Rust ∥ site parallel sub-stage로 나눈다 (wall-clock 단축; log interleaving으로 1차 증거 가독성 하락).

X) Other (please describe after [Answer]: tag below)

[Answer]: A) **단일 stage 순차 실행**: `cargo test --release` → `cd site && npm run test:unit && npm run test:pbt`를 한 stage에서 순서대로 실행한다. console log의 실패 귀속이 단순하고(1차 증거 품질 — OR-U3-05), nightly cron이라 wall-clock 단축의 실익이 없다.

### Question 2 — Gap adapter의 로컬 실행 명령 표면

gap adapter가 생성될 경우(no-JS smoke, link sweep) 로컬에서 어떤 명령으로 실행할까요?

A) **신규 좁은 npm script**(예: `test:crossunit`)를 추가한다 — U1/U2 stable command(`test:unit`/`test:e2e`)의 실행 집합과 전제(예: `test:unit`은 build 산출물 불요)를 불변으로 유지하고, U3 소유 검증은 U3 명령으로 격리한다. §5.6의 "필요 시 Justfile narrow adapter"는 이 script를 감싸는 경우에만 고려한다. **(권장)**

B) 기존 명령에 편입한다 — no-JS smoke는 playwright.config.ts의 새 project로 `test:e2e`에, link sweep은 새 Vitest 파일로 `test:unit`에 (U2가 자기 unit 안에서 쓴 방식; 단 `test:unit`에 build 산출물 전제가 새로 생기고, U1 evidence 기계가 실행하는 집합이 커진다).

X) Other (please describe after [Answer]: tag below)

[Answer]: A) **신규 좁은 npm script**(예: `test:crossunit`)를 추가한다 — U1/U2 stable command(`test:unit`/`test:e2e`)의 실행 집합과 전제(예: `test:unit`은 build 산출물 불요)를 불변으로 유지하고, U3 소유 검증은 U3 명령으로 격리한다. §5.6의 "필요 시 Justfile narrow adapter"는 이 script를 감싸는 경우에만 고려한다.

### Question 3 — CI의 seed 정책 (seed propagation)

CI Verify의 PBT 실행에 seed를 주입할까요?

A) **주입하지 않는다** — framework 기본 무작위 seed로 실행하고(실행마다 새 입력 공간 탐색 = nightly의 누적 커버리지 가치), 재현은 승인된 경로(fast-check 출력 seed, proptest `cc` regressions)로 한다. OR-U3-05와 정합. **(권장)**

B) 고정 seed를 주입한다 (실행 간 완전 결정성; 대신 nightly가 항상 같은 입력만 재검사해 PBT의 탐색 가치가 사라진다).

X) Other (please describe after [Answer]: tag below)

[Answer]: A) **주입하지 않는다** — framework 기본 무작위 seed로 실행하고(실행마다 새 입력 공간 탐색 = nightly의 누적 커버리지 가치), 재현은 승인된 경로(fast-check 출력 seed, proptest `cc` regressions)로 한다. OR-U3-05와 정합.

### Question 4 — 실패 evidence 보존의 구현 위치

`proptest-regressions` 변화의 archiveArtifacts(OR-U3-05)를 어디에 구현할까요?

A) **Verify stage의 `post { failure }`**에 한정한다 — `archiveArtifacts artifacts: 'preprocessor/proptest-regressions/**', allowEmptyArchive: true`. 보존이 실패한 Verify와만 결합되고, TS 실패(regressions 파일 없음)에도 step이 오류 없이 지나간다. **(권장)**

B) pipeline 전역 `post { failure }`에 둔다 (Deploy 등 다른 stage 실패에도 실행됨 — 증거와 원인의 결합이 느슨해진다).

X) Other (please describe after [Answer]: tag below)

[Answer]: A) **Verify stage의 `post { failure }`**에 한정한다 — `archiveArtifacts artifacts: 'preprocessor/proptest-regressions/**', allowEmptyArchive: true`. 보존이 실패한 Verify와만 결합되고, TS 실패(regressions 파일 없음)에도 step이 오류 없이 지나간다.

> (검증 기록 2026-07-29: 선택지 A의 예시 glob `preprocessor/proptest-regressions/**`는 독립 검토에서 실존하지 않는 경로로 판정되었다 — proptest 지속 파일은 `preprocessor/tests/*.proptest-regressions`. 승인된 결정(Verify-국소 post failure + allowEmptyArchive)은 불변이며, glob은 artifact에서 정정되었다.)

### Question 5 — Evidence mapping 표와 ST-E04 report의 형태 (deterministic reports)

FD Q6-A의 evidence mapping 표와 §5.7의 "ST-E04 local/CI equivalent verification report"를 어떤 형태로 만들까요?

A) **AI-DLC markdown 문서**로 Code Generation 단계에서 작성한다 — mapping 표는 §5.5 항목 × 담당 spec 파일·test 이름을 인용하고, report는 로컬 실행과 Jenkins validation 실행의 증거(명령, 결과, 시간, seed 출력 발췌)를 전사한다. 재현 가능한 참조(파일 경로, test 이름, commit)만 담아 결정성을 확보한다. **(권장)**

B) markdown에 더해 기계가독 JSON 산출물을 병행 생성한다 (소비자 없는 이중 표현; drift 표면 증가).

X) Other (please describe after [Answer]: tag below)

[Answer]: A) **AI-DLC markdown 문서**로 Code Generation 단계에서 작성한다 — mapping 표는 §5.5 항목 × 담당 spec 파일·test 이름을 인용하고, report는 로컬 실행과 Jenkins validation 실행의 증거(명령, 결과, 시간, seed 출력 발췌)를 전사한다. 재현 가능한 참조(파일 경로, test 이름, commit)만 담아 결정성을 확보한다.

## 5. 답변 검증과 생성 경계

- 답변은 문자·설명 일치, 단일 의미, 상호 일관성, 기존 승인 호환성을 검증한다. Q1~Q5 명확화 전에는 artifact를 생성하지 않는다.
- 이 계획 작성은 application source, Jenkinsfile, external Vault, 배포를 변경하지 않는다. NFR Design 승인 전에는 U3 Infrastructure Design으로 진행하지 않는다.
