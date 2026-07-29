# U3 Functional Design — Adapter Rules and PBT Disposition

## 문서 상태

- **단계**: CONSTRUCTION — U3 Functional Design (artifact 2/2)
- **Unit**: U3 Quality Gate and CI Integration (C12 Verification and Automation Adapters)
- **작성일**: 2026-07-29
- **근거**: [계획 문서](../../plans/u3-quality-gate-and-ci-integration-functional-design-plan.md) Q6/Q7 답변(A), [Unit of Work §5](../../../inception/application-design/unit-of-work.md), [verification-orchestration.md](verification-orchestration.md)

## 1. Adapter 정의

C12 adapter는 기존 검증을 **orchestration·aggregation하는 얇은 층**이다. business logic을 갖지 않으며, U1/U2 public contract(route, 생성된 content, 공개 JSON, build 산출물)를 read-only로 관찰한다. adapter는 검증 판정을 새로 정의하지 않고, 이미 정의된 gate를 실행 가능한 형태로 연결한다.

## 2. Adapter 규칙

### AR-U3-01 — 재구현 금지 (Q6-A)

U1 spec(6종)·U2 `homepage.spec.ts`가 이미 검증하는 항목을 다시 구현하지 않는다. §5.5 항목별 처리는 **evidence mapping 표가 우선**이고, adapter 신설은 표가 gap으로 판정한 항목에만 허용된다. U1/U2 owner-local test의 이동·복제는 test-centralization 목적 여부와 무관하게 금지다 (§5.6).

### AR-U3-02 — Gap adapter 최소성 (Q6-A)

각 gap adapter spec은 (1) 닫는 §5.5 항목과 (2) evidence mapping 표의 해당 gap 행을 명시해야 한다. 현재 식별된 후보는 두 개다:

- **no-JS core navigation smoke** — JavaScript 비활성 상태에서 핵심 navigation이 동작하는지의 smoke 확인 (§5.5).
- **cross-unit 내부 link 무결성 sweep** — build 산출물 전반의 내부 link가 깨지지 않는지의 sweep.

후보의 확정·추가 발견은 NFR Requirements matrix와 Code Generation 실행 증거에서 결정된다. 표가 전 항목 커버를 판정하면 adapter는 0개다 — 후보라는 이유로 만들지 않는다.

### AR-U3-03 — 배치와 격리

새 adapter spec은 U2 `homepage.spec.ts` 선례를 따라 **U1 evidence 기계 바깥**에 둔다: `site/tests/e2e/` 아래 별도 파일, 필요 시 별도 Playwright project. `test:e2e`의 evidence-sealed provider(`cli.mjs`→`verification-provider.mjs`)와 manual accessibility record, review-subject 파일(`REVIEW_SUBJECT_SOURCE_FILES`와 `src/components/profile`, `src/lib/layout`, `src/styles/profile`)은 불변이다.

### AR-U3-04 — Read-only 관찰

adapter는 U1/U2 소유 content·fixture·record를 변경하지 않는다. 관찰 대상은 public contract뿐이다: route, 생성된 HTML/JSON, build 산출물. adapter 실행이 검증 대상의 상태를 바꾸면 그것은 adapter가 아니라 소유권 침범이다.

### AR-U3-05 — 결정성

adapter는 network-independent이고 결정적이어야 한다: flaky timeout 단언 금지, deterministic wait 사용, 외부 서비스 비의존 (NFR-005 예고; 상세 요구는 U3 NFR Requirements/NFR Design에서 확정).

## 3. PBT-01 처치 — No PBT properties identified (Q7-A)

**판정**: C12/S05에 대해 `No PBT properties identified`.

**근거**:

1. C12/S05는 business logic 없이 기존 검증을 orchestration·aggregation하는 adapter다 (§1). property로 표현할 불변식은 이미 U1/U2 owner-local PBT가 소유하고 있으며, U3가 그것을 재서술하면 §5.4 Explicit Non-owner 위반이다.
2. 선례: U1 S04(Resume Document)와 U2 S02/S03(조회·조립 adapter)도 `No PBT properties identified`로 판정되어 example/실행-evidence 검증을 따랐다.
3. adapter의 올바름은 실행 evidence로 검증된다: Jenkins console log, seed 출력, evidence mapping 표, 실행 결과 (OR-U3-05).

**재검토 조건**: adapter 구현 중 **새 순수 로직**(예: link sweep의 HTML parsing/URL 정규화 함수)이 생기면, 그 부분에 한해 property 식별을 재검토한다. 재검토 없이 순수 로직을 example-only로 두는 것은 허용되지 않는다 — Code Generation 단계에서 해당 로직의 PBT 처치를 명시적으로 기록해야 한다.

## 4. Traceability

| 규칙 | 답변 | Unit of Work | 관련 |
|---|---|---|---|
| AR-U3-01 | Q6-A | §5.4, §5.6 | OR-U3-08 |
| AR-U3-02 | Q6-A | §5.5 | OR-U3-08 |
| AR-U3-03 | Q6-A | §5.6 | U2 homepage.spec.ts 선례 |
| AR-U3-04 | — | §5.3 | FR-017 (authored/generated 경계의 read-only 준수) |
| AR-U3-05 | — | NFR-005 | U3 NFR 단계 |
| PBT-01 N/A | Q7-A | §5.9 Functional Design 출력, PBT-08 | U1 S04·U2 S02/S03 선례 |
