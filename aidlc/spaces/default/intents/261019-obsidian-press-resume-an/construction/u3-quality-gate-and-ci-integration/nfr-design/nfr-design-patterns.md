# U3 NFR Design Patterns — Quality Gate and CI Integration

## 문서 상태

- **단계**: CONSTRUCTION — U3 NFR Design (artifact 1/2)
- **Unit**: U3 Quality Gate and CI Integration (C12 · S05)
- **작성일**: 2026-07-29
- **근거**: [계획 문서](../../plans/u3-quality-gate-and-ci-integration-nfr-design-plan.md) Q1~Q5 답변(모두 A), [nfr-requirements.md](../nfr-requirements/nfr-requirements.md), [verification-orchestration.md](../functional-design/verification-orchestration.md)

## 1. 설계 패턴

### PD-U3-01 — Verify 단일 stage 순차 실행 (Q1-A)

Verify는 **하나의 stage에서 순차 실행**한다: `cargo test --release --manifest-path preprocessor/Cargo.toml` → `cd site && npm run test:unit && npm run test:pbt`. Install(parallel)과 달리 순차인 이유: console log가 1차 증거(OR-U3-05)이므로 실패 귀속의 단순함이 wall-clock보다 우선하고, nightly cron이라 단축의 실익이 없다. `sh` step 실패는 즉시 stage 실패 → pipeline 실패 → 이후 stage 미진행 (OR-U3-03 실패 의미론의 구현).

### PD-U3-02 — U3 명령 격리 (Q2-A)

gap adapter가 생성되면 **신규 좁은 npm script**(예: `test:crossunit`; 이름은 Code Generation에서 확정)로 실행한다. U1/U2 stable command(`test:unit`/`test:pbt`/`test:e2e`)의 실행 집합·전제는 불변이다 — 특히 `test:unit`에 build 산출물 전제를 만들지 않고, U1 evidence 기계가 실행하는 집합을 키우지 않는다. 이 변경은 `site/package.json`의 **scripts 필드에 한정**된다 (dependency 블록·lockfile 불변 — [tech-stack-decisions §1 정합화](../nfr-requirements/tech-stack-decisions.md) 참조). Justfile narrow adapter는 이 script를 감싸는 경우에만 고려한다 (§5.6).

### PD-U3-03 — Seed 무주입 (Q3-A)

CI Verify는 seed를 주입하지 않는다 — env 변수·flag 없이 framework 기본 무작위 seed로 실행한다. nightly마다 새 입력 공간을 탐색하는 누적 커버리지가 PBT의 가치이고, 재현은 승인된 경로가 담당한다: fast-check는 runner 출력 seed, proptest는 커밋되는 `cc` regressions (OR-U3-05). 단 기준선 측정 시 Jenkins 환경의 `CI` env 유무 확인(NFR-U3-001)은 이 패턴의 전제 조건이다 — run count가 달라지면 "기본 실행"의 의미가 달라진다.

### PD-U3-04 — 실패-국소 evidence 보존 (Q4-A)

archiveArtifacts는 **Verify stage의 `post { failure }`에 한정**한다:

```groovy
post { failure { archiveArtifacts artifacts: 'preprocessor/tests/*.proptest-regressions', allowEmptyArchive: true } }
```

보존이 실패한 Verify와만 결합되어 증거-원인 대응이 명확하고, TS-side 실패(regressions 파일 없음)에도 `allowEmptyArchive: true`로 step이 오류 없이 지나간다. pipeline 전역 post에 두지 않는다 — Deploy 실패 같은 무관한 실패에 증거 기계가 작동하면 안 된다.

> **경로 정정 (2026-07-29, 독립 검토 BLOCKER)**: 계획 Q4-A의 예시 glob `preprocessor/proptest-regressions/**`는 실존하지 않는 경로였다. proptest 지속 파일은 test 파일의 **형제 파일**로 생성된다 — `preprocessor/tests/*.proptest-regressions` (U2 [nfr-design-patterns.md](../../homepage-publication-boundary/nfr-design/nfr-design-patterns.md)의 승인 기록과 커밋된 `preprocessor/tests/publication_output.proptest-regressions`가 증거). 잘못된 glob은 실제 실패에서 0개 파일을 보존하고 `allowEmptyArchive`가 이를 침묵시켰을 것이다. 승인된 결정(Verify-국소 `post { failure }` + `allowEmptyArchive`)은 불변이며 glob만 정정한다.

### PD-U3-05 — 결정적 report (Q5-A)

evidence mapping 표와 ST-E04 report는 **AI-DLC markdown 문서**로 Code Generation 단계에서 작성한다. 기계가독 병행 산출물은 만들지 않는다(소비자 없는 이중 표현). 결정성 규칙: 재현 가능한 참조만 담는다 — spec 파일 경로, test 이름, commit SHA, 명령과 그 출력 발췌. 실행 시각·환경 서술은 증거 전사로서만 포함하고, 문서의 판정(covered/gap)은 참조만으로 재검증 가능해야 한다.

## 2. §5.9 산출 대응

| §5.9 요구 | 담당 패턴 |
|---|---|
| network-independent orchestration | PD-U3-01 (Verify 실행은 NFR-U3-006 stage 경계 안에서 네트워크 비의존) |
| deterministic reports | PD-U3-05 |
| seed propagation | PD-U3-03 (무주입 + 승인된 재현 경로로의 전파) |
| failure semantics | PD-U3-01 (즉시 실패·미진행), PD-U3-04 (실패 시 보존) |

## 3. Traceability

| 패턴 | 답변 | NFR | FD 규칙 |
|---|---|---|---|
| PD-U3-01 | Q1-A | NFR-U3-006/008 | OR-U3-02/03 |
| PD-U3-02 | Q2-A | NFR-U3-002/003/004 | OR-U3-01/08, AR-U3-03 |
| PD-U3-03 | Q3-A | NFR-U3-001 (CI env 전제) | OR-U3-05 |
| PD-U3-04 | Q4-A | NFR-U3-007 | OR-U3-05 |
| PD-U3-05 | Q5-A | NFR-U3-007 (전사 보존) | OR-U3-08, §5.7 Provides |
