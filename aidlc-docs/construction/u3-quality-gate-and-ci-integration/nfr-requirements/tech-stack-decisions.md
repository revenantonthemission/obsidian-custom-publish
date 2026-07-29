# U3 Tech Stack Decisions — Quality Gate and CI Integration

## 문서 상태

- **단계**: CONSTRUCTION — U3 NFR Requirements (artifact 2/2)
- **Unit**: U3 Quality Gate and CI Integration (C12 · S05)
- **작성일**: 2026-07-29
- **근거**: [계획 문서](../../plans/u3-quality-gate-and-ci-integration-nfr-requirements-plan.md) Q3/Q4 답변(A), [nfr-requirements.md](nfr-requirements.md), [adapter-rules.md](../functional-design/adapter-rules.md)

## 1. 결정 — 신규 도입 없음 (Q4-A)

U3는 **어떤 신규 dependency, framework, 외부 도구도 도입하지 않는다**. `site/package.json` / `site/package-lock.json` / `preprocessor/Cargo.toml` / `Cargo.lock`은 U3에서 변경되지 않는다. 도구 부족이 실제로 발생하면 임의 설치 대신 plan-change gate를 연다 (NFR-U3-004).

## 2. 기존 스택 사용 목록

U3가 사용하는 모든 도구는 U1/U2가 이미 선택·설치·증명했다.

| 도구 | 도입 주체 | U3의 용도 |
|---|---|---|
| Playwright (5-project 구성) | U1 (U2가 project 추가) | no-JS smoke가 생성될 경우의 spec 실행 (chromium, JS 비활성 context — NFR-U3-002) |
| Vitest 4.x | U1 | link sweep이 생성될 경우의 정적 분석 test 실행 후보 (NFR-U3-003) |
| Node 내장 (fs, path 등) | — | `site/dist/` 정적 순회 (NFR-U3-003) |
| fast-check 4.x (`@fast-check/vitest`) | U1 | U3 신규 사용 없음 — seed 출력 evidence만 집계 (OR-U3-05) |
| proptest 1.11.0 | U2 | U3 신규 사용 없음 — `cc` 라인·`proptest-regressions` evidence만 집계 (OR-U3-05) |
| cargo / npm | 기존 | Verify stage 명령 실행 (OR-U3-02) |

## 3. Jenkins 표면 — plugin 추가 없음

FD가 승인한 Jenkinsfile 변경(OR-U3-02/05/06/07)은 전부 **declarative pipeline 핵심 문법**으로 구현된다:

- `parameters { booleanParam(...) }` — core
- `when { expression { ... } }` — core
- `archiveArtifacts` — core step
- stage 신설·`sh` step — core

Jenkins plugin 설치·갱신·제거는 없다. agent 환경 요구도 현행과 동일하다: npm·cargo(현 Install stage가 이미 사용), **Playwright browser는 CI에 불요**(e2e 제외 — FD Q3-A). `PUPPETEER_EXECUTABLE_PATH` 등 기존 env는 불변.

## 4. PBT-09 처치 — N/A

이 단계는 framework를 선택·검증하지 않는다: U3는 새 property를 도입하지 않고(FD Q7-A `No PBT properties identified`), 기존 framework(proptest·fast-check)는 U1/U2 단계에서 custom generator·shrinking·seed 재현·runner 통합이 이미 증명되었다. 새 순수 로직 발생 시의 재검토 조건은 [adapter-rules.md §3](../functional-design/adapter-rules.md)이 소유하며, 그 경우에도 framework는 기존 설치본을 사용한다.

## 5. Traceability

| 결정 | 답변 | NFR | FD 규칙 |
|---|---|---|---|
| 신규 dependency 0 | Q4-A | NFR-U3-004 | verification-orchestration §4 Mutation Boundary, AR-U3-03 |
| 정적 link sweep 도구(Node/Vitest) | Q3-A | NFR-U3-003 | AR-U3-02/05 |
| Jenkins core 문법만, plugin 0 | Q1/Q2/Q4-A (FD) | NFR-U3-007 | OR-U3-02/05/06/07 |
| CI에 browser 불요 | Q3-A (FD) | NFR-U3-002 matrix | OR-U3-04 |
| PBT-09 N/A | Q7-A (FD) | — | adapter-rules §3 |
