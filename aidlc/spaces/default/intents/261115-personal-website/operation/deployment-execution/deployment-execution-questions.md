# 배포 실행 질문과 답변

- **단계**: Deployment Execution (`deployment-execution`), 2026-11-21 00:46 KST, `261115-personal-website`
- **작성자**: 릴리스 엔지니어 역할 (aidlc-pipeline-deploy-agent)
- **왜 이 질문이 필요한가**: 배포는 되돌릴 수 없는 공개 행위입니다. `team.md`는 "push = 릴리스"를, `Justfile`의 `deploy`는 유지관리자의 허가 하에서만 실행하도록 정합니다. 앞 단계는 배포 **설계**와 **환경 준비**를 끝냈지만, 실제 배포 실행 여부와 그 경로는 아직 결정되지 않았습니다.
- **근거 문서**: `operation/deployment-pipeline/cd-config.md`(`cd-config`), `deployment-strategy.md`(`deployment-strategy`), `rollback-runbook.md`, `operation/environment-provisioning/environment-inventory.md`(`environment-inventory`), `construction/build-and-test/test-results.md`(`build-test-results`), `Jenkinsfile`, `Justfile`, `site/scripts/publish-dist.sh`, team/project 규칙.

## Q1. [릴리스 엔지니어] 지금 배포를 실행할까요?

현재 로컬 `develop`은 `d5a6e86`(네 단위와 빌드·테스트 마감 커밋 포함)이고 `origin/develop`은 `db7ecae`(작업 이전)입니다. 웹 루트는 여전히 2026-11-07 빌드입니다. 배포 경로에 따라 공개 시점과 볼트 쓰기 여부가 달라집니다.

- A. 지금 `just deploy`로 배포 — 현재 체크아웃에서 전처리(실제 볼트의 `published` 날짜 스탬핑 포함)·빌드·웹 루트 복사를 실행하고 H1–H3을 확인한다
- B. `develop`을 push한 뒤 Jenkins 수동 실행 — push가 곧 릴리스이고, Verify 게이트가 원격 커밋에서 돌고 Deploy까지 진행된다
- C. `develop`만 push하고 다음 야간 0시 작업에 맡긴다 — 배포 시점을 야간에 둔다
- D. 아직 배포하지 않는다 — 준비 상태와 계획만 기록하고, 실제 배포는 유지관리자가 직접 수행한다
- X. Other (please specify)

[Answer]: A

답변: 지금 `just deploy`로 배포합니다. 현재 체크아웃(`develop` @ `d5a6e86`)에서 실제 볼트 전처리(`published` 날짜 스탬핑 포함)·사이트 빌드·웹 루트 복사를 실행하고, 배포 후 H1–H3을 확인합니다. 이 경로는 `site/scripts/publish-dist.sh`를 호출하므로 야간 배포와 같은 절차입니다.

## Q2. [릴리스 엔지니어] `npm run test:e2e`가 막힌 상태를 배포 게이트에서 어떻게 다룰까요?

빌드·테스트 5차 실행에서 모든 스위트가 통과했지만, `npm run test:e2e`만 수동 접근성 기록이 만료되어(`MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`, digest `3d578e5b…`) 테스트 하나도 실행하지 못했습니다. `TEAM-E2E-A11Y`는 Not Met이고, 수동 16상태 검토는 2–4시간이 걸립니다. Jenkins Verify 게이트에는 e2e가 포함되지 않습니다.

- A. 알려진 격차로 수용하고 배포한다 — assertion 실패가 없고 Jenkins 게이트에도 e2e가 없으므로, 배포 후 H1–H3으로 확인한다
- B. 배포 전에 16상태 수동 검토를 마치고 `npm run test:e2e`까지 통과시킨 뒤 배포한다
- C. 검토가 끝날 때까지 배포를 보류한다
- D. 위 조합 외의 다른 처리
- X. Other (please specify)

[Answer]: A

답변: 수동 접근성 기록 만료와 `TEAM-E2E-A11Y` Not Met를 알려진 격차로 수용합니다. 5차 실행에서 assertion 실패가 없었고 Jenkins Verify 게이트에는 e2e가 포함되지 않으므로, 배포 후 H1–H3으로 실제 동작을 확인합니다.

## Q3. [릴리스 엔지니어] 배포 전 검증을 어디까지 다시 실행할까요?

`U1-NFR6.1`(U1 병합 커밋에 대한 Jenkins Verify)은 아직 Unverified입니다. 5차 실행의 Construction Verification Command는 커밋 `8d19fde`에서 통과했고, 그 커밋은 `dfaf5a2`로 `develop`에 병합됐습니다.

- A. 배포 경로의 Verify에 맡긴다 — Jenkins 수동 실행 또는 야간 작업이 원격 커밋에서 Verify를 돌린다
- B. 배포 전에 로컬 검증 명령을 다시 실행한다 — `cargo fmt --check` → `cargo test --release` → `just preprocess` → unit·pbt·format·astro check·HIG → `just crossunit` (약 10분)
- C. 추가 검증 없이 5차 결과로 충분하다고 본다
- D. 위 조합 외의 다른 처리
- X. Other (please specify)

[Answer]: A

답변: 로컬 검증 명령을 다시 실행하지 않습니다. 5차 실행의 검증 명령이 `8d19fde`에서 통과했고 그 커밋은 `dfaf5a2`로 `develop`에 병합됐습니다. 다만 선택한 배포 경로(`just deploy`)는 Jenkins Verify를 돌리지 않으므로, `U1-NFR6.1`은 원격 커밋에 대한 Jenkins 실행이 있을 때까지 Unverified로 남습니다 — 이 조합은 배포 기록에 명시합니다.

## 기록되지 않은 판단 (사람에게 다시 묻지 않은 것)

- **AWS 자격 증명 확인**: 생략. 이 파이프라인은 AWS CLI·CDK·SAM·CloudFormation을 쓰지 않습니다(`cd-config.md` §7).
- **데이터베이스 마이그레이션**: 해당 없음. 이 프로젝트에 데이터베이스가 없습니다(`environment-inventory.md` §10). 마이그레이션 로그를 만들지 않습니다.
- **종속 서비스 상태**: 이미 Environment Provisioning에서 검증했습니다 — 오리진·터널·Jenkins가 모두 실행 중이고 로컬·공개 사이트가 200입니다(`environment-inventory.md` §3, `validation-report.md` §7).
- **배포 전제조건(고정 재시작)**: 이미 완료했습니다. 서버 PID 40304는 U3 코드를 실행 중이고, 웹 루트에 `_redirects.json`이 없는 지금은 예전 주소가 그대로 200입니다(`validation-report.md` §5 F-04).

## 측정된 현재 상태 (2026-11-21 00:46 KST)

| 관찰 | 값 | 의미 |
|---|---|---|
| 로컬 `develop` | `d5a6e86` (CI·CD·환경 기록 커밋 포함) | 배포 소스 준비 완료 |
| `origin/develop` | `db7ecae` | Jenkins가 체크아웃할 원격은 아직 이전 커밋 |
| 웹 루트 | 2026-11-07 빌드, `tags/`·`graph/` 있음, `_redirects.json` 없음 | U3 이동 페이지는 배포된 적 없음 |
| 오리진 | `127.0.0.1:8080`, PID 40304, U3 코드 | 배포 전제조건 충족 |
| Jenkins | `127.0.0.1:8081`, PID 38904, `/login` → 200 | 수동 실행 가능 |
| 빌드·테스트 | 5차: 92 targets 중 87 Met · 1 Not Met(`TEAM-E2E-A11Y`) · 3 Unverified | assertion 실패 없음. `npm run test:e2e`만 기록 만료로 거부 |
| Verify 커밋 | `8d19fde`에서 검증 명령 통과, `dfaf5a2`로 `develop` 병합 | 로컬 게이트는 이미 초록 |
| 롤백 | 목표 2시간 이내, 되돌리기 + 재빌드 경로 | `rollback-runbook.md` 절차 유효 |

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
