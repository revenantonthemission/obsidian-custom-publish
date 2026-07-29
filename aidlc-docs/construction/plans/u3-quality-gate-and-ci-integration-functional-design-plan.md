# U3 Functional Design Plan — Quality Gate and CI Integration

## 문서 상태

- **단계**: CONSTRUCTION — U3 Functional Design
- **상태**: 질문 답변 대기
- **Unit**: U3 Quality Gate and CI Integration
- **작성일**: 2026-07-29
- **Feature Branch**: `codex/feature/resume-quality-gates`
- **Branch Base**: U2 병합 뒤 최신 검증된 local `develop` at `50937d9`
- **PBT Enforcement**: Full; 이 단계에는 PBT-01이 적용됨 (adapter의 N/A 근거 포함)

## 1. 입력과 전제

- [Unit of Work §5](../../inception/application-design/unit-of-work.md) — C12/S05 소유, ST-E04 primary/closure, CI scope = 경로·test/PBT·seed만
- [Stories ST-E04](../../inception/user-stories/stories.md) — AC-E04-01~04 (현재 경로로 build/test 실행, seed 상시 기록, 외부 서비스 없이 로컬 재현, 최소 범위·무배포)
- U1/U2 stable commands: `just test`(Rust example+PBT) · `npm run test:unit`·`test:pbt`·`test:e2e` — U3는 변경 없이 aggregation만 한다
- U2 handoff: proptest는 커밋된 `proptest-regressions`(`cc` 라인)로 실패 재현, fast-check는 runner 출력 seed로 재현; 기본 e2e의 오늘-글 단언은 `HOMEPAGE_TODAY_OVERRIDE=2024-03-01` 고정 권장
- **현재 Jenkins 실측** (2026-07-29): nightly cron → Checkout → Install(npm ci ∥ cargo build) → Preprocess(자체 `rm -rf` 잔존, stamp-published, JSON 복사) → Build Site → **무조건 Deploy**. 어떤 test도 실행하지 않는다. 경로·browser 결함은 f82c9eb/4c326b3에서 이미 수정됨.

다시 열지 않는 결정: FR-016(경로·관련 test·seed의 최소 CI 변경; 무관 refactoring·배포 변경 금지), FR-018(무배포), ST-E04 마감 조건("Deploy 미호출 실제 Jenkins validation 실행"으로만 닫힘 — diff나 local-only 증거 불가), U1/U2 소유 test의 이동·복제 금지, push/merge/Vault 변경 별도 승인.

## 2. 목표와 산출물

verification orchestration 규칙과 adapter의 PBT N/A 근거를 확정한다. 답변 검증 뒤 생성:

- `aidlc-docs/construction/u3-quality-gate-and-ci-integration/functional-design/verification-orchestration.md`
- `aidlc-docs/construction/u3-quality-gate-and-ci-integration/functional-design/adapter-rules.md`

## 3. 실행 계획

- [x] U3 정의·ST-E04 AC·현재 Jenkinsfile·U1/U2 stable command와 seed 재현 경로를 분석한다.
- [x] 미확정 orchestration 항목을 질문으로 작성한다 (승인 결정 반복 없음, 각 질문 ≥2 선택지 + `X) Other`).
- [ ] 답변 수집·검증(형식·명확성·상호 일관성·기존 승인 호환성); 모호하면 clarification file.
- [ ] 두 artifact 생성, PBT-01 N/A 근거·traceability 검증, 독립 검토·구조 검증.
- [ ] 표준 2-option 완료 gate 제시.

## 4. Functional Design Questions

각 `[Answer]:` 뒤에 선택한 문자 하나를 입력해 주세요. `X`를 선택하면 같은 줄에 구체적인 규칙을 작성해 주세요.

### Question 1 — Validation-only Jenkins 실행 경로

ST-E04는 Deploy를 호출하지 않는 **실제 Jenkins 실행** 증거를 요구하지만, 현 pipeline은 성공 시 무조건 배포합니다. 어떤 안전 경로를 만들까요?

A) `RUN_DEPLOY` boolean parameter(기본값 **true**)를 추가하고 Deploy stage에 `when { expression { params.RUN_DEPLOY } }`를 건다. nightly cron은 기본값으로 오늘과 동일하게 배포하고, 수동 validation 실행은 `RUN_DEPLOY=false`로 Deploy를 건너뛴다 — 배포 동작 불변 + 안전 경로 확보. **(권장)**

B) validation 전용 별도 Jenkins job/Jenkinsfile을 신설한다 (기존 pipeline 완전 불변; 파일·job 표면이 하나 늘어난다).

C) 안전 경로를 만들 수 없다고 판정하고 §5.10 규정대로 ST-E04를 열어 둔 채 Infrastructure Design gate에서 중단·별도 결정을 요청한다.

X) Other (please describe after [Answer]: tag below)

[Answer]:

### Question 2 — Test stage 배치와 실패 의미

CI에서 test를 어디서 실행하고 실패를 어떻게 다룰까요?

A) Install 뒤·Preprocess 앞에 **Verify stage 신설**: `cargo test`(release build 재활용 경로) + `cd site && npm run test:unit && npm run test:pbt`를 실행하고, 실패는 pipeline 실패(이후 stage 미진행 → 배포 차단)다. silent retry 없음. **(권장)**

B) Build Site 뒤에 Verify를 두어 실제 build 산출물 이후 검증한다 (실패 시에도 build 완료본 확보; 배포는 여전히 차단).

X) Other (please describe after [Answer]: tag below)

[Answer]:

### Question 3 — e2e의 CI 편입 범위

`npm run test:e2e`(5-project Playwright + preview supervisor, 수 분)는 CI에 넣을까요?

A) **CI는 build + example + PBT까지만** (결정적·경량; ST-E04의 "relevant build/example/PBT" 문언 충족). e2e는 U1/U2 stable local command로 유지하고, CI 편입은 별도 후속 결정으로 남긴다. **(권장)**

B) e2e도 Verify stage에 포함한다 — agent가 로컬 Mac이라 브라우저는 존재하며, `HOMEPAGE_TODAY_OVERRIDE=2024-03-01`을 고정해 결정성을 확보한다 (nightly 수 분 증가).

X) Other (please describe after [Answer]: tag below)

[Answer]:

### Question 4 — Seed evidence 형식 (AC-E04-02)

CI의 seed 기록·재현 증거를 어떤 형식으로 남길까요?

A) framework 기본 출력을 증거로 삼는다: fast-check runner는 매 실행 seed를 출력하고, proptest는 실패 시 `cc` 라인을 출력·지속 파일에 기록한다(커밋 정책은 U2 승인). Jenkins console log가 1차 증거이고, 실패 시 `proptest-regressions` 변화를 archiveArtifacts로 보존한다 — 새 기계 없음. **(권장)**

B) 실행마다 구조화된 seed-report 파일을 생성·archive하는 adapter를 추가한다.

X) Other (please describe after [Answer]: tag below)

[Answer]:

### Question 5 — Jenkins Preprocess의 잔존 `rm -rf`

C09가 정리를 소유하게 된 지금, Jenkinsfile line 45의 `rm -rf content/...`는 어떻게 할까요?

A) 제거한다 — Justfile C1-A와 같은 동작 보존 정리이며 정리 규칙의 단일 소유를 완성한다 (FR-016 경로·test 범위 내의 최소 변경으로 판정). **(권장)**

B) 유지한다 — Jenkins 변경 표면을 최소화한다 (규칙 이중화 감수).

X) Other (please describe after [Answer]: tag below)

[Answer]:

### Question 6 — Cross-unit smoke의 소유와 범위 (C12)

§5.5의 cross-unit 확인(responsive/keyboard/no-JS smoke, routes·CTA·links·metadata·JSON-LD, print/PDF parity)을 어떻게 구성할까요?

A) **재구현 금지 + 부족분만**: 기존 U1 spec(6종)과 U2 `homepage.spec.ts`가 이미 커버하는 항목은 evidence mapping 표로 닫고, 실제 부족분(예: no-JS core navigation smoke, cross-unit 내부 link 무결성 sweep)만 최소 adapter spec으로 추가한다. U1 evidence 기계·record는 불변. **(권장)**

B) U3 전용 cross-unit spec suite를 신설해 §5.5 항목 전체를 독립적으로 재검증한다.

X) Other (please describe after [Answer]: tag below)

[Answer]:

### Question 7 — Adapter의 PBT-01 처치

C12/S05 adapter의 PBT 처치를 확정합니다.

A) `No PBT properties identified`로 판정한다: C12/S05는 business logic 없이 기존 검증을 orchestration·aggregation하는 adapter이며, U1 S04·U2 S02/S03 선례대로 example/실행-evidence 검증이 맞다. 새 순수 로직(예: link sweep 파서)이 생기면 그 부분만 property를 재검토한다. **(권장)**

B) adapter 산출(report 구조 등)에 property를 식별해 적용한다.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## 5. 답변 검증과 생성 경계

- 답변은 문자·설명 일치, 단일 의미, 상호 일관성, 기존 승인 호환성을 검증한다. Q1~Q7 명확화 전에는 artifact를 생성하지 않는다.
- 이 계획 작성은 application source, Jenkinsfile, external Vault, 배포를 변경하지 않는다. Functional Design 승인 전에는 U3 NFR Requirements로 진행하지 않는다.
