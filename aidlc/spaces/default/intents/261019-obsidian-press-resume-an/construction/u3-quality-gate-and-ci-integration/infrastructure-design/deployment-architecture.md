# U3 Deployment Architecture — Quality Gate and CI Integration

## 문서 상태

- **단계**: CONSTRUCTION — U3 Infrastructure Design (artifact 2/2)
- **Unit**: U3 Quality Gate and CI Integration (C12 · S05)
- **작성일**: 2026-07-29
- **근거**: [infrastructure-design.md](infrastructure-design.md) ID-U3-01~04, [logical-components.md](../nfr-design/logical-components.md) LC-U3-01~04, 현행 `Jenkinsfile` 실측

## 1. Pipeline 구조 — 현행과 U3 이후

| 순서 | 현행 stage | U3 이후 stage | 변경 |
|---|---|---|---|
| 1 | Checkout | Checkout | 불변 |
| 2 | Install (npm ci ∥ cargo build --release) | Install | 불변 |
| 3 | — | **Verify** (신설) | cargo test(release) → test:unit → test:pbt, 순차; 실패 = pipeline 실패 + `post { failure }` archiver |
| 4 | Preprocess (`rm -rf` 포함) | Preprocess (`rm -rf` 제거) | 정리 라인 삭제 (LC-U3-04) |
| 5 | Build Site | Build Site | 불변 |
| 6 | Deploy (무조건) | Deploy + `when { expression { params.RUN_DEPLOY } }` | stage-level gate만 추가; 내용 3-step(credential check, S3 sync, CF invalidation) 불변 |

pipeline 상단에 `parameters { booleanParam(name: 'RUN_DEPLOY', defaultValue: true, ...) }`가 추가된다. trigger(`cron('H 0 * * *')`), environment block, pipeline-level post block은 불변이다 (Verify stage 자체의 `post { failure }` archiver는 신설 — LC-U3-03).

## 2. 두 실행 경로

### 배포 경로 (기본 — 오늘과 동일)

nightly cron 또는 무param 수동 실행 → `RUN_DEPLOY` 기본값 true → 전체 stage 실행, Verify 통과 시에만 Deploy 도달. **Verify 실패는 배포를 차단한다** — 이것이 U3가 배포 경로에 더하는 유일한 행동 변화이며, 성공 경로의 배포 동작은 오늘과 동일하다.

### Validation 경로 (ST-E04 증거용)

수동 "Build with Parameters" + `RUN_DEPLOY=false` → Checkout ~ Build Site까지 전부 실행, Deploy는 `when` gate로 skip. AWS 자격 증명 불요 (ID-U3-03). 실행 시점·순서는 [ID-U3-02](infrastructure-design.md)가 소유한다: main 반영(별도 승인) 뒤 **2-run 순서** — 등록 빌드("Build Now", null-falsy로 Deploy skip) 후 명시적 `RUN_DEPLOY=false` 실행이 증거 실행이다.

## 3. 무변경 경계의 재확인

- 배포 대상(S3 bucket, CloudFront distribution, DNS)과 배포 방법(`aws s3 sync --delete`, `create-invalidation '/*'`)은 불변 (ID-U3-01).
- Jenkins job 설정·plugin·agent 환경 불변; Playwright browser는 CI에 불요 (tech-stack §3).
- 상속된 아홉 개 배포 리스크는 배포 권한 소유로 잔존 (ID-U3-04); Verify gate는 그중 어느 것도 닫지 않는다.
- rollback 경로는 U3가 정의하지 않는다 — 기존과 동일하게 이전 산출물 재배포에 의존하며, U1의 rollback-arm 잔여도 그대로 남는다.

## 4. Traceability

| 항목 | 근거 |
|---|---|
| Verify 신설·배치 | OR-U3-02, PD-U3-01, LC-U3-01 |
| Deploy `when` gate | OR-U3-06, LC-U3-02, ID-U3-02 |
| `rm -rf` 제거 | OR-U3-07, LC-U3-04 |
| 무변경 경계 | ID-U3-01/03/04, OR-U3-09 |
