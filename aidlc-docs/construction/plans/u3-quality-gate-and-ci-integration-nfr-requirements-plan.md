# U3 NFR Requirements Plan — Quality Gate and CI Integration

## 문서 상태

- **단계**: CONSTRUCTION — U3 NFR Requirements
- **상태**: artifact 생성 완료, 승인 gate 대기
- **Unit**: U3 Quality Gate and CI Integration
- **작성일**: 2026-07-29
- **Feature Branch**: `codex/feature/resume-quality-gates`
- **선행 승인**: U3 Functional Design (2026-07-29, "승인")
- **PBT Enforcement**: PBT-09(framework 선택·검증)는 이 단계에 **N/A** — U3는 새 property도 새 framework도 도입하지 않는다 (FD Q7-A `No PBT properties identified`; proptest 1.11.0·fast-check는 U1/U2가 이미 선택·설치·증명함). 새 순수 로직 발생 시 재검토 조건은 [adapter-rules.md §3](../u3-quality-gate-and-ci-integration/functional-design/adapter-rules.md)이 소유한다.

## 1. 입력과 전제

- [U3 Functional Design Plan](u3-quality-gate-and-ci-integration-functional-design-plan.md) — 승인된 Q1~Q7(A)
- [verification-orchestration.md](../u3-quality-gate-and-ci-integration/functional-design/verification-orchestration.md) — OR-U3-01~10
- [adapter-rules.md](../u3-quality-gate-and-ci-integration/functional-design/adapter-rules.md) — AR-U3-01~05, PBT-01 N/A
- [Unit of Work §5.9](../../inception/application-design/unit-of-work.md) — NFR Requirements 산출: browser/viewport/accessibility/PDF matrix, CI evidence·tooling 요구
- [Requirements](../../inception/requirements/requirements.md) — NFR-005(재현성), NFR-008(호환성·browser matrix), NFR-009(인쇄·PDF), NFR-010(품질 게이트)

다음은 이미 승인됐으며 다시 열지 않는다.

- FD Q1~Q7: `RUN_DEPLOY` 경로, Verify stage 배치·실패 의미론, CI = build+example+PBT(e2e 제외), framework 기본 seed evidence + console log + archiveArtifacts, `rm -rf` 제거, evidence mapping + 부족분만 adapter, PBT N/A.
- U1/U2 stable command topology와 내용 (OR-U3-01); owner-local test 이동·복제 금지.
- axe는 chromium-scoped (U1 parity, U2에서 재확인) — U3는 accessibility 도구를 새로 도입하지 않는다.
- U2 seed 재현 경로: proptest는 커밋된 `proptest-regressions` `cc` 라인, fast-check는 runner 출력 seed.
- push, merge, 배포, Terraform/AWS mutation, external Vault 변경은 별도 승인 없이는 범위 밖.

## 2. 현재 측정 기준선

- `just test` (Rust example+PBT): 19 suites, 약 55초 (U2 Step 15 기록; debug profile).
- `npm run test:unit`: 16 files / 195 tests. `npm run test:pbt`: 6 files / 37 properties × 100 runs.
- CI trigger: nightly cron (`H 0 * * *`) — 개발자가 결과를 대기하는 pipeline이 아니다.
- Jenkins agent: 로컬 Mac 단일 노드, npm·cargo 가용 (현 Install stage가 이미 사용).

## 3. 목표와 산출물

CI Verify의 시간·결정성·증거 보존 요구, gap adapter의 browser/viewport matrix, link sweep 실행 형태, tooling 경계, cross-unit PDF parity의 집계 위치를 확정한다. 답변 검증 뒤 생성:

- `aidlc-docs/construction/u3-quality-gate-and-ci-integration/nfr-requirements/nfr-requirements.md`
- `aidlc-docs/construction/u3-quality-gate-and-ci-integration/nfr-requirements/tech-stack-decisions.md`

## 4. 실행 계획

- [x] 승인된 FD 규칙과 NFR-005/008/009/010, §5.9 산출 요구를 분석한다.
- [x] 측정 기준선(테스트 수·시간·CI 환경)을 확인한다.
- [x] 미확정 NFR 항목을 질문으로 작성한다 (승인 결정 반복 없음, 각 질문 ≥2 선택지 + `X) Other`).
- [x] 답변 수집·검증; 모호하면 clarification file. — 1회 제출로 7/7 A 확정, 상호 일관성·기존 승인 호환성 통과.
- [x] 두 artifact 생성, traceability 검증, 독립 검토·구조 검증. — 독립 검토 PASS (blocker 0; minor 1 수정, note 3 반영·2 수용).
- [x] 표준 2-option 완료 gate 제시.

## 5. NFR Requirements Questions

각 `[Answer]:` 뒤에 선택한 문자 하나를 입력해 주세요. `X`를 선택하면 같은 줄에 구체적인 요구를 작성해 주세요.

### Question 1 — CI Verify 시간 예산

Verify stage(cargo test release + unit + PBT)의 시간 요구를 어떻게 정할까요? nightly cron이라 개발자 대기 시간은 없습니다.

A) **측정 기준선 방식**: hard budget을 두지 않는다. Code Generation의 실제 Jenkins validation 실행에서 Verify 소요 시간을 측정·기록해 기준선으로 삼고, 이후 현저한 회귀(예: 기준선의 2배 초과)를 발견하면 보고한다 — nightly 특성에 비례한 최소 규칙. **(권장)**

B) hard budget을 설정한다 (예: Verify ≤ 15분; 초과는 설계 이슈로 처리·보고).

X) Other (please describe after [Answer]: tag below)

[Answer]: A) **측정 기준선 방식**: hard budget을 두지 않는다. Code Generation의 실제 Jenkins validation 실행에서 Verify 소요 시간을 측정·기록해 기준선으로 삼고, 이후 현저한 회귀(예: 기준선의 2배 초과)를 발견하면 보고한다 — nightly 특성에 비례한 최소 규칙.

### Question 2 — Gap adapter의 browser/viewport matrix (NFR-008)

no-JS core navigation smoke가 실제로 생성될 경우의 matrix를 확정합니다 (생성 여부 자체는 evidence mapping 표가 결정 — FD Q6-A).

A) **최소 matrix**: chromium 단일 engine에서 JavaScript 비활성 context로 실행하고, U2 homepage.spec.ts의 viewport 쌍(320×800 / 1440×900)을 재사용한다. engine 다양성 검증은 U1/U2 기존 spec이 이미 소유하므로 aggregation unit이 중복하지 않는다. **(권장)**

B) U2와 동일하게 firefox/webkit project를 추가해 3-engine으로 실행한다 (no-JS 동작의 engine 간 차이까지 검증; 실행 시간·표면 증가).

X) Other (please describe after [Answer]: tag below)

[Answer]: A) **최소 matrix**: chromium 단일 engine에서 JavaScript 비활성 context로 실행하고, U2 homepage.spec.ts의 viewport 쌍(320×800 / 1440×900)을 재사용한다. engine 다양성 검증은 U1/U2 기존 spec이 이미 소유하므로 aggregation unit이 중복하지 않는다.

### Question 3 — 내부 link 무결성 sweep의 실행 형태 (NFR-005)

cross-unit 내부 link sweep이 생성될 경우의 실행 형태를 확정합니다.

A) **정적 산출물 분석**: browser 없이 `site/dist/`의 HTML을 정적으로 순회하며 내부 href/src의 대상 존재를 확인한다 (Node 내장 + 기존 설치 도구만; 결정적이고 빠르며 NFR-005의 네트워크 비의존을 자동 충족). 새 순수 로직(파서 등)이 생기면 adapter-rules §3의 PBT 재검토 조건이 발동한다. **(권장)**

B) Playwright로 실제 페이지를 crawl하며 링크를 따라간다 (렌더링 뒤 DOM 기준; 실행 시간 증가, preview server 필요).

X) Other (please describe after [Answer]: tag below)

[Answer]: A) **정적 산출물 분석**: browser 없이 `site/dist/`의 HTML을 정적으로 순회하며 내부 href/src의 대상 존재를 확인한다 (Node 내장 + 기존 설치 도구만; 결정적이고 빠르며 NFR-005의 네트워크 비의존을 자동 충족). 새 순수 로직(파서 등)이 생기면 adapter-rules §3의 PBT 재검토 조건이 발동한다.

### Question 4 — 신규 tooling·dependency 경계

§5.6은 "승인된 verification tooling"의 package.json 변경을 허용하지만, 현 설계는 필요를 예상하지 않습니다.

A) **신규 dependency 0을 NFR로 고정**: gap adapter는 기존 Playwright/Vitest/Node 내장만 사용한다. 도구가 부족한 상황이 실제로 발생하면 임의 설치 대신 plan-change gate를 연다. **(권장)**

B) 이 단계에서 link-check 등 검증 tooling 후보를 심사해 최대 1개까지 사전 승인한다.

X) Other (please describe after [Answer]: tag below)

[Answer]: A) **신규 dependency 0을 NFR로 고정**: gap adapter는 기존 Playwright/Vitest/Node 내장만 사용한다. 도구가 부족한 상황이 실제로 발생하면 임의 설치 대신 plan-change gate를 연다.

### Question 5 — Cross-unit print/PDF parity의 집계 위치 (NFR-009)

§5.5는 print/PDF parity 확인을 요구하지만, CI는 build+example+PBT로 한정됐습니다 (FD Q3-A).

A) **로컬 integrated 증거로 집계**: U1의 `resume:pdf:verify`를 변경 없이 U3의 로컬 integrated Build and Test 증거에 포함하고, CI Verify에는 넣지 않는다 — PDF pipeline은 browser 의존 + PDF 바이트 비재현(U1 기록)이라 CI 부적합. parity 실패는 ST-U03 reopen 규칙(OR-U3-10)을 따른다. **(권장)**

B) CI Verify에도 `resume:pdf:verify`를 포함한다 (FD Q3-A의 CI 범위 문언과 긴장; browser·후처리 의존이 CI에 들어옴).

X) Other (please describe after [Answer]: tag below)

[Answer]: A) **로컬 integrated 증거로 집계**: U1의 `resume:pdf:verify`를 변경 없이 U3의 로컬 integrated Build and Test 증거에 포함하고, CI Verify에는 넣지 않는다 — PDF pipeline은 browser 의존 + PDF 바이트 비재현(U1 기록)이라 CI 부적합. parity 실패는 ST-U03 reopen 규칙(OR-U3-10)을 따른다.

### Question 6 — CI 네트워크 의존 경계 (NFR-005)

NFR-005는 "테스트는 네트워크·외부 서비스 가용성에 의존하지 않아야 한다"고 요구합니다. CI에서 이 경계를 어디에 둘까요?

A) **stage 경계로 해석**: Install stage(npm ci, cargo 의존성 다운로드)는 네트워크를 사용할 수 있고, Verify stage의 test 실행 자체는 네트워크 비의존이어야 한다 — 위반(테스트 중 외부 호출)이 발견되면 소유 unit의 결함으로 보고한다. **(권장)**

B) pipeline 전체 오프라인 실행을 요구한다 (의존성 사전 캐시 구축 필요; FR-016 최소 변경 범위를 넘는 CI 부채).

X) Other (please describe after [Answer]: tag below)

[Answer]: A) **stage 경계로 해석**: Install stage(npm ci, cargo 의존성 다운로드)는 네트워크를 사용할 수 있고, Verify stage의 test 실행 자체는 네트워크 비의존이어야 한다 — 위반(테스트 중 외부 호출)이 발견되면 소유 unit의 결함으로 보고한다.

### Question 7 — CI 증거 보존 정책

console log(1차 증거)와 실패 시 archiveArtifacts(`proptest-regressions` 변화)의 보존 기간을 정합니다.

A) **Jenkins job 기본 보존 정책 그대로** 둔다 — 새 보존 규칙을 추가하지 않는다. ST-E04 마감에 쓰이는 validation 실행의 증거는 aidlc-docs에 요약·전사되므로 build 기록 자체의 만료와 독립적으로 남는다. **(권장)**

B) `buildDiscarder`로 명시 보존(예: 최근 30 build)을 설정한다 (Jenkinsfile 변경 표면 증가; FR-016 범위 재판정 필요).

X) Other (please describe after [Answer]: tag below)

[Answer]: A) **Jenkins job 기본 보존 정책 그대로** 둔다 — 새 보존 규칙을 추가하지 않는다. ST-E04 마감에 쓰이는 validation 실행의 증거는 aidlc-docs에 요약·전사되므로 build 기록 자체의 만료와 독립적으로 남는다.

## 6. 답변 검증과 생성 경계

- 답변은 문자·설명 일치, 단일 의미, 상호 일관성, 기존 승인 호환성을 검증한다. Q1~Q7 명확화 전에는 artifact를 생성하지 않는다.
- 이 계획 작성은 application source, Jenkinsfile, external Vault, 배포를 변경하지 않는다. NFR Requirements 승인 전에는 U3 NFR Design으로 진행하지 않는다.
