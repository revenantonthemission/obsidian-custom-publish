# U3 NFR Requirements — Quality Gate and CI Integration

## 문서 상태

- **단계**: CONSTRUCTION — U3 NFR Requirements (artifact 1/2)
- **Unit**: U3 Quality Gate and CI Integration (C12 · S05)
- **작성일**: 2026-07-29
- **근거**: [계획 문서](../../plans/u3-quality-gate-and-ci-integration-nfr-requirements-plan.md) Q1~Q7 답변(모두 A), [verification-orchestration.md](../functional-design/verification-orchestration.md), [adapter-rules.md](../functional-design/adapter-rules.md), [Requirements](../../../inception/requirements/requirements.md) NFR-005/008/009/010

## 1. NFR 요구

### NFR-U3-001 — CI Verify 시간: 측정 기준선 방식 (Q1-A)

Verify stage에 hard budget을 두지 않는다. Code Generation의 실제 Jenkins validation 실행에서 Verify 소요 시간을 측정해 **기준선으로 기록**하고, 이후 현저한 회귀(기준선의 2배 초과)를 발견하면 보고한다. 근거: nightly cron(`H 0 * * *`)으로 개발자 대기 시간이 없어 hard budget은 비례성이 없다. 로컬 기준선 참고치: `just test` 19 suites/약 55초(debug), `test:unit` 195 tests, `test:pbt` 37 properties × 100. 기준선 측정 시 Jenkins 환경의 `CI` env 유무를 확인·기록한다 — site PBT runner는 `CI`가 정의되면 run count를 100→1,000으로 올리므로(pbt-runner.mjs) 기준선의 전제가 달라진다.

### NFR-U3-002 — no-JS smoke의 browser/viewport matrix (Q2-A; NFR-008)

no-JS core navigation smoke가 evidence mapping 표에 의해 실제로 생성되는 경우: **chromium 단일 engine, JavaScript 비활성 context**, viewport는 U2 homepage.spec.ts의 쌍 **320×800 / 1440×900** 재사용. engine 다양성(firefox/webkit)은 U1/U2 기존 spec이 소유하므로 aggregation unit이 중복하지 않는다. NFR-008의 "JavaScript 비활성 시 핵심 콘텐츠·링크 동작" 요구를 이 smoke가 cross-unit 수준에서 확인한다. NFR-008의 나머지 no-JS 측면(확장 상세, 인쇄)은 U1 spec 소유로 남는다 (AR-U3-01 재구현 금지).

### NFR-U3-003 — 내부 link sweep: 정적 산출물 분석 (Q3-A; NFR-005)

link sweep이 생성되는 경우: browser 없이 **`site/dist/` HTML을 정적으로 순회**하며 내부 href/src 대상의 존재를 확인한다. Node 내장 + 기존 설치 도구만 사용한다. 결정적·네트워크 비의존(NFR-005 자동 충족)이며 preview server가 불필요하다. 파서 등 **새 순수 로직이 생기면 [adapter-rules.md §3](../functional-design/adapter-rules.md)의 PBT 재검토 조건이 발동**한다 — Code Generation에서 해당 로직의 PBT 처치를 명시 기록해야 한다.

### NFR-U3-004 — 신규 dependency 0 (Q4-A)

U3의 gap adapter는 **기존 Playwright/Vitest/Node 내장만** 사용하며, `site/package.json`/`package-lock.json`에 신규 dependency를 추가하지 않는다. 도구 부족이 실제로 발생하면 임의 설치 대신 **plan-change gate**를 연다. 상세 도구 목록은 [tech-stack-decisions.md](tech-stack-decisions.md)가 소유한다.

### NFR-U3-005 — print/PDF parity의 집계 위치 (Q5-A; NFR-009)

U1의 `resume:pdf:verify`를 **변경 없이** U3의 로컬 integrated Build and Test 증거에 포함한다. **CI Verify에는 넣지 않는다** — PDF pipeline은 browser 의존이고 PDF 바이트가 비재현(U1 기록)이라 CI 부적합. parity 실패는 OR-U3-10의 ST-U03 reopen 규칙을 따르며 U3가 재소유하지 않는다.

### NFR-U3-006 — CI 네트워크 의존 경계 (Q6-A; NFR-005)

NFR-005의 "테스트는 네트워크 비의존" 요구를 **stage 경계로 해석**한다: Install stage(npm ci, cargo 의존성 다운로드)는 네트워크를 사용할 수 있고, **Verify stage의 test 실행 자체는 네트워크 비의존**이어야 한다. 테스트 중 외부 호출이 발견되면 소유 unit의 결함으로 보고한다 (U3가 고치지 않는다 — OR-U3-10 귀속 규칙).

### NFR-U3-007 — CI 증거 보존 (Q7-A)

Jenkins job의 **기본 보존 정책을 그대로** 둔다 — `buildDiscarder` 등 새 보존 규칙을 추가하지 않는다. 1차 증거는 console log, 실패 시 `proptest-regressions` 변화는 archiveArtifacts로 보존한다 (OR-U3-05). ST-E04 마감에 쓰이는 validation 실행의 증거는 **aidlc-docs에 요약·전사**되므로 build 기록의 만료와 독립적으로 남는다.

### NFR-U3-008 — 실패 출력 계약 (승인 상속; NFR-005)

새 요구가 아니라 상속의 명시다: 실패한 gate는 문제 경로 또는 규칙을 식별할 수 있는 출력과 non-zero exit status를 제공해야 한다 (NFR-005). U3 범위에서 이는 framework 기본 동작(cargo test/Vitest/Playwright의 실패 출력 + exit code)과 OR-U3-03의 pipeline 실패 의미론으로 충족되며, U3는 출력 형식을 재정의하지 않는다.

## 2. Browser / Viewport / Accessibility / PDF Matrix (§5.9 산출)

검증 표면별 소유와 실행 위치의 통합 뷰. U3가 새로 정의하는 행은 굵게 표시된 두 행뿐이며, 나머지는 U1/U2 승인 사항의 전사다.

| 검증 표면 | Engine | Viewport | 소유 | 실행 위치 |
|---|---|---|---|---|
| U1 profile spec 6종 | chromium(profile-cross-browser 제외 5종) + firefox/webkit-focused project | U1 승인 matrix | U1 | 로컬 `test:e2e` |
| U2 homepage.spec.ts | chromium + homepage-firefox/webkit project | 320×800 / 1440×900 | U2 | 로컬 `test:e2e` |
| accessibility (axe) | chromium 한정 (U1 parity, U2 재확인) | 상동 | U1/U2 | 로컬 `test:e2e` |
| **no-JS core navigation smoke** (생성 시) | **chromium, JS 비활성** | **320×800 / 1440×900** | **U3 (NFR-U3-002)** | 로컬; CI 미포함 |
| **내부 link 무결성 sweep** (생성 시) | **browser 불요 — `site/dist/` 정적 분석** | **N/A** | **U3 (NFR-U3-003)** | 로컬; CI 미포함 |
| print/PDF parity (`resume:pdf:verify`) | chromium (U1 기계) | print media | U1 | 로컬 integrated 증거 (NFR-U3-005); CI 미포함 |
| CI Verify | browser 불요 | N/A | U3 | Jenkins: cargo test(release) + `test:unit` + `test:pbt` (OR-U3-02) |

## 3. CI Evidence 요구 요약

| 항목 | 요구 | 근거 |
|---|---|---|
| seed 기록 | fast-check 매 실행 seed 출력; proptest 실패 시 `cc` 라인 (성공 실행 비대칭은 명시 기록) | OR-U3-05, AC-E04-02 |
| 1차 증거 | Jenkins console log | Q4-A (FD) |
| 실패 보존 | `proptest-regressions` 변화 archiveArtifacts | OR-U3-05 |
| 보존 기간 | Jenkins 기본; ST-E04 증거는 aidlc-docs 전사 | NFR-U3-007 |
| 시간 | 실측 기준선 기록; 2배 초과 회귀 보고 | NFR-U3-001 |
| 네트워크 | Verify stage 실행은 비의존 | NFR-U3-006 |

## 4. Traceability

| NFR | 답변 | 상위 NFR | FD 규칙 |
|---|---|---|---|
| NFR-U3-001 | Q1-A | NFR-010 | OR-U3-02 |
| NFR-U3-002 | Q2-A | NFR-008 | OR-U3-08, AR-U3-02 |
| NFR-U3-003 | Q3-A | NFR-005 | OR-U3-08, AR-U3-02/05 |
| NFR-U3-004 | Q4-A | — (§5.6 경계) | verification-orchestration §4 Mutation Boundary, AR-U3-03 |
| NFR-U3-005 | Q5-A | NFR-009 | OR-U3-04/10 |
| NFR-U3-006 | Q6-A | NFR-005 | OR-U3-02/03 |
| NFR-U3-007 | Q7-A | NFR-010 | OR-U3-05 |
| NFR-U3-008 | — (상속) | NFR-005 | OR-U3-03/05 |
