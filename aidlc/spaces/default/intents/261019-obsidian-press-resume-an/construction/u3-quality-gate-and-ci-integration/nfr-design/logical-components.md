# U3 Logical Components — Quality Gate and CI Integration

## 문서 상태

- **단계**: CONSTRUCTION — U3 NFR Design (artifact 2/2)
- **Unit**: U3 Quality Gate and CI Integration (C12 · S05)
- **작성일**: 2026-07-29
- **근거**: [nfr-design-patterns.md](nfr-design-patterns.md) PD-U3-01~05, [verification-orchestration.md](../functional-design/verification-orchestration.md), [adapter-rules.md](../functional-design/adapter-rules.md), [nfr-requirements.md](../nfr-requirements/nfr-requirements.md)

## 1. 구성 요소

### LC-U3-01 — Jenkins Verify stage

- **책임**: Install 뒤·Preprocess 앞에서 `cargo test --release --manifest-path preprocessor/Cargo.toml` → `cd site && npm run test:unit && npm run test:pbt`를 순차 실행한다 (PD-U3-01).
- **입력**: Install stage의 release build 산출물, `node_modules`. **출력**: console log(1차 증거), exit status.
- **실패 의미**: 어떤 step 실패도 pipeline 실패 — Preprocess/Build Site/Deploy 미진행, silent retry 없음 (OR-U3-03).
- **제약**: seed 무주입 (PD-U3-03); 실행 자체는 네트워크 비의존 (NFR-U3-006); cargo test 바이너리의 CWD가 package root여야 `../fixtures/vault`가 성립 (OR-U3-02).

### LC-U3-02 — RUN_DEPLOY parameter와 Deploy gate

- **책임**: `parameters { booleanParam(name: 'RUN_DEPLOY', defaultValue: true, ...) }` + Deploy stage의 `when { expression { params.RUN_DEPLOY } }` (OR-U3-06).
- **불변 조건**: Deploy stage 내용(credential check `aws sts get-caller-identity`, S3 sync, CloudFront invalidation — 3개 `sh` step 전부)은 불변; stage-level `when`이 셋 모두를 gate한다. nightly cron은 기본값 true로 오늘과 동일하게 배포.
- **확인 사항**: `parameters` block 최초 추가 직후 첫 트리거 빌드는 parameter 미등록으로 falsy일 수 있음 — 실제 validation 실행에서 확인·기록 (OR-U3-06 wiring 확인).

### LC-U3-03 — Verify 실패 evidence archiver

- **책임**: Verify stage `post { failure }`에서 `archiveArtifacts artifacts: 'preprocessor/tests/*.proptest-regressions', allowEmptyArchive: true` (PD-U3-04; 경로는 독립 검토가 정정 — proptest 지속 파일은 test 파일의 형제 파일이다).
- **비책임**: 성공 실행에서는 아무것도 보존하지 않는다 (proptest 성공 실행은 seed를 남기지 않는 비대칭 — OR-U3-05에 명시 기록됨).

### LC-U3-04 — Jenkins Preprocess 정리 라인 제거

- **책임**: Preprocess stage의 `rm -rf content/posts content/meta content/assets` 라인 삭제 (OR-U3-07). C09의 validate→clean→write가 정리를 단일 소유.
- **검증**: 실제 validation 실행에서 Preprocess가 정상 동작함을 확인 (동작 보존 정리).

### LC-U3-05 — Evidence mapping 표

- **책임**: §5.5 cross-unit 항목 × 담당 spec 파일·test 이름의 markdown 표 (PD-U3-05). **gap adapter(LC-U3-06/07)의 존재 여부를 이 표가 결정한다** (FD Q6-A) — 표가 전 항목 커버를 판정하면 adapter는 0개.
- **위치**: Code Generation 산출물, `aidlc-docs/construction/u3-quality-gate-and-ci-integration/code/` 아래.

### LC-U3-06 — no-JS core navigation smoke spec (조건부)

- **책임**: JavaScript 비활성 context에서 핵심 navigation smoke — chromium 단일, viewport 320×800/1440×900 (NFR-U3-002).
- **배치**: U1 evidence 기계 바깥, `site/tests/e2e/` 아래 별도 파일 (AR-U3-03의 구체 경로); `test:crossunit`이 실행 (PD-U3-02).
- **비책임**: 확장 상세·인쇄의 no-JS 측면은 U1 spec 소유 (AR-U3-01).

### LC-U3-07 — 내부 link 무결성 sweep (조건부)

- **책임**: `site/dist/` HTML 정적 순회로 내부 href/src 대상 존재 확인 — browser·preview server 불요 (NFR-U3-003); `test:crossunit`이 실행.
- **전제**: build 산출물 존재 (U1/U2 명령에 이 전제를 전파하지 않는 것이 PD-U3-02의 격리 목적).
- **PBT 재검토**: 파서 등 새 순수 로직이 생기면 adapter-rules §3 발동 — Code Generation에서 처치 명시.

### LC-U3-08 — `test:crossunit` npm script (조건부)

- **책임**: U3 소유 gap adapter(LC-U3-06/07)만 실행하는 좁은 진입점 (PD-U3-02; 이름은 Code Generation에서 확정).
- **변경 표면**: `site/package.json` scripts 필드 한정 — dependency 블록·lockfile 불변 (tech-stack §1 정합화).
- **조건**: LC-U3-05가 gap을 판정한 경우에만 존재한다.

### LC-U3-09 — ST-E04 local/CI equivalent verification report

- **책임**: 로컬 실행과 `RUN_DEPLOY=false` 실제 Jenkins validation 실행의 증거(명령, 결과, 시간, seed 출력 발췌, commit SHA)를 전사하는 markdown report (PD-U3-05; §5.7 Provides).
- **마감 조건 연결**: 이 report가 인용하는 실제 Jenkins 실행이 ST-E04 마감의 필요조건 — diff·local-only로는 닫히지 않는다 (§5.10).

## 2. 변경 표면 요약

| 파일 | 변경 | 구성 요소 |
|---|---|---|
| `Jenkinsfile` | Verify stage 신설, parameters + when gate, post-failure archiver, `rm -rf` 제거 | LC-U3-01~04 |
| `site/tests/**` (조건부) | U3 소유 gap adapter spec | LC-U3-06/07 |
| `site/package.json` scripts (조건부) | `test:crossunit` 항목 | LC-U3-08 |
| `aidlc-docs/construction/u3-.../code/` | mapping 표, ST-E04 report | LC-U3-05/09 |
| 그 외 전부 | **불변** | — |

## 3. Traceability

| 구성 요소 | 패턴 | FD 규칙 | NFR |
|---|---|---|---|
| LC-U3-01 | PD-U3-01/03 | OR-U3-02/03 | NFR-U3-001/006 |
| LC-U3-02 | — | OR-U3-06/09 | — |
| LC-U3-03 | PD-U3-04 | OR-U3-05 | NFR-U3-007 |
| LC-U3-04 | — | OR-U3-07 | — |
| LC-U3-05 | PD-U3-05 | OR-U3-08, AR-U3-01/02 | — |
| LC-U3-06 | PD-U3-02 | AR-U3-02/03 | NFR-U3-002 |
| LC-U3-07 | PD-U3-02 | AR-U3-02/05 | NFR-U3-003 |
| LC-U3-08 | PD-U3-02 | AR-U3-03 | NFR-U3-004 |
| LC-U3-09 | PD-U3-05 | OR-U3-06/10 | NFR-U3-005/007 |
