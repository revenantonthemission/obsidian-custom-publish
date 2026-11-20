# Deployment Pipeline 질문과 답변

- **단계**: Deployment Pipeline (`deployment-pipeline`), 2026-11-20, `261115-personal-website`
- **작성자**: 릴리스 엔지니어 역할 (aidlc-pipeline-deploy-agent)
- **왜 다시 묻지 않았는지**: 이 단계의 다섯 주제(배포 전략, 환경 승격 게이트, 프로덕션 승인 절차, 롤백 절차, 기능 플래그)는 모두 이전 단계·저장소·팀 규칙에 이미 답이 기록되어 있습니다. 프로토콜의 "답이 이미 기록된 질문은 다시 묻지 않는다" 규칙에 따라 질문을 파일에 남기고, 기록된 답과 그 근거를 함께 적었습니다. 답이 달라지면 게이트의 구성이 달라지므로, 이 파일은 승인 게이트에서 수정 대상으로 읽힙니다.
- **근거 문서**: `aidlc/spaces/default/memory/team.md` (`## Way of Working`, `## Testing Posture`, `## Deployment`), `construction/ci-pipeline/ci-config.md`, `construction/ci-pipeline/quality-gates.md`, 네 단위의 `construction/{u1-publish-boundary,u2-writing-section,u3-writing-moves,u4-navigation}/infrastructure-design/{cicd-pipeline.md,infrastructure-specification.md}`, `construction/nfr-design/memory.md`, `construction/build-and-test/build-and-test-summary.md`.

## Q1. [릴리스 엔지니어] 배포 전략은 무엇인가요?

정적 트리를 언제 교체하는지 — 트리 교체(recreate)와 트래픽 전환(blue-green·canary·rolling) 중 무엇이 이 프로젝트의 배포 절차인지 정합니다.

- A. 전량 교체(recreate) — 새 트리를 웹 루트에 그대로 미러링하고 트래픽 전환은 없다
- B. Blue-green — 두 트리를 번갈아 써 가며 전환한다
- C. Canary — 일부 트래픽만 새 트리로 보내 점진적으로 넓힌다
- D. Rolling — 트리 전체를 요청 단위로 점진적으로 교체한다

[Answer]: A

기록된 근거: `team.md` `## Deployment` — "Deploy copies `site/dist/` into the web root `~/Sites/obsidian-blog` with `rsync -a --delete`" ✓, "We deploy `develop` to production every night, with no staging environment and no approval step" ✓. `construction/u3-writing-moves/infrastructure-design/cicd-pipeline.md` §"Deployment strategy" — "Recreate, one environment, no traffic shifting" ✓. `construction/u4-navigation/infrastructure-design/cicd-pipeline.md` §"Deployment strategy" — "Recreate, one environment, no traffic shifting… the swap is therefore in place and not atomic" ✓. `construction/u1-publish-boundary/infrastructure-design/cicd-pipeline.md` §4 — "All-at-once nightly publish (rsync to the web root). Blue-green and canary do not apply to a single static site on one host" ✓.

## Q2. [릴리스 엔지니어] 환경 승격 게이트는 어떻게 되나요?

dev → staging → prod 승격 단계가 있는지, 있다면 어디서 막는지를 정합니다.

- A. 승격 단계 없음 — 프로덕션 환경 하나이고 `develop`이 곧 프로덕션이다
- B. dev → staging → prod 3단계, staging에서手动 승격 게이트를 둔다
- C. staging 환경만 추가하고 prod 승격은 자동이다
- D. 위 조합 외의 다른 구성

[Answer]: A

기록된 근거: `team.md` `## Deployment` — "We deploy `develop` to production every night, with **no staging environment** and no approval step" ✓, "`main` is a milestone marker, not a working branch" (`team.md` `## Way of Working`) ✓. `construction/u3-writing-moves/infrastructure-design/infrastructure-specification.md` §Deployment Environments — "One production environment (`develop` → nightly job → web root). No staging" ✓. `construction/u3-writing-moves/infrastructure-design/cicd-pipeline.md` §"Environment promotion" — "None… There is no staging environment, so a promotion stage does not exist" ✓. `construction/u1-publish-boundary/infrastructure-design/infrastructure-specification.md` §Deployment Environments — "Unchanged: production only (nightly); validation-only runs with `RUN_DEPLOY` unchecked" ✓.

## Q3. [릴리스 엔지니어] 프로덕션 배포의 승인 절차는 무엇인가요?

누가, 어떤 지점에서 배포를 승인하는지를 정합니다.

- A. 승인 절차 없음 — `develop`을 push하는 것이 곧 릴리스이며, 야간 작업이 배포한다
- B. 유지관리자가 배포 직전에 수동으로 승인한다
- C. Jenkins 승인 플러그인(파이프라인 단계에서 승인 대기)
- D. 위 조합 외의 다른 구성

[Answer]: A

기록된 근거: `team.md` `## Deployment` — "We deploy `develop` to production every night, with no staging environment and **no approval step, so pushing `develop` is the release**" ✓. `construction/u3-writing-moves/infrastructure-design/cicd-pipeline.md` §"Restart order" — "The project has no release approval step — pushing `develop` is the release" ✓. `construction/u1-publish-boundary/infrastructure-design/cicd-pipeline.md` §4 — "The vault needs no rollback… run the Jenkins job manually, or `just deploy` from `develop` with the owner's go-ahead" (수동 경로에만 유지관리자의 허가가 붙습니다) ✓.

## Q4. [릴리스 엔지니어] 롤백 절차는 무엇인가요?

문제가 생겼을 때 무엇을 되돌리고 어떻게 되돌리는지를 정합니다.

- A. `develop`에서 해당 커밋을 되돌리고 다시 빌드한다 — 수동 Jenkins 실행 또는 `just deploy`
- B. 이전 빌드 산출물을 보관해 두고 즉시 교체한다
- C. 이전 릴리스 태그로 되돌린다
- D. 위 조합 외의 다른 절차

[Answer]: A

기록된 근거: `team.md` `## Deployment` — "Rollback is a revert on `develop` followed by a rebuild, through a manual Jenkins run or `just deploy`. Releases are not tagged, and no previous build is kept" ✓. `construction/u3-writing-moves/infrastructure-design/cicd-pipeline.md` §"Rollback" — "Revert the offending commit on `develop`, then rebuild and redeploy — a manual Jenkins run or `just deploy` from the local checkout" ✓, 그 절의 세 가지 보충(U3 되돌리기가 배포 정의까지 되돌린다 · 301의 `Cache-Control: no-cache`가 롤백을 되돌릴 수 있게 한다 · 서버 스크립트를 되돌렸다면 재시작이 필요하다)도 같은 문서에 있습니다 ✓. `construction/u4-navigation/infrastructure-design/cicd-pipeline.md` §"Rollback" ✓. `construction/u1-publish-boundary/infrastructure-design/infrastructure-specification.md` §Deployment — "rollback is a revert on `develop` plus a rebuild" ✓.

## Q5. [릴리스 엔지니어] 기능 플래그를 사용하나요?

새 동작을 서버 없이 켜고 끄는 수단이 필요한지 정합니다.

- A. 사용하지 않음 — 페이지 이동과 리디렉션 테이블이 한 빌드에 함께 들어간다
- B. Cloudflare / CloudWatch Evidently
- C. AWS AppConfig
- D. 저장소 안의 자체 플래그 파일

[Answer]: A

기록된 근거: `construction/u3-writing-moves/infrastructure-design/cicd-pipeline.md` §"Feature flags and artifact management" — "U3 uses no feature flag: the moved pages and the redirect table ship in the same build as everything else" ✓. `construction/ci-pipeline/ci-config.md` §5 — "아티팩트는 `site/dist/` 트리 자체. 버전·태그가 없고 이전 빌드도 보존되지 않습니다" ✓, §10 — "기능 플래그를 추가하지 않음" ✓.

## Q6. [릴리스 엔지니어] 롤백은 얼마나 빨리 끝나야 하나요?

롤백은 되돌리기 + 재빌드 절차라 시간이 듭니다. 회귀를 발견한 뒤 "다시 정상이어야 하는" 시점을 정하면 절차서에 시간 기준이 생기고, 그 기준을 못 맞출 절차는 자동화 대상이 됩니다.

- A. 30분 이내 — 되돌린 커밋을 push하고 Jenkins 수동 실행으로 재배포한다
- B. 2시간 이내 — 같은 경로지만 당일 중 복구는 충분하다
- C. 다음 야간 배포까지 대기해도 된다 — 야간 작업이 되돌린 `develop`을 배포한다
- D. 시간 목표를 정하지 않는다 — 절차만 문서화한다

[Answer]: B

답변: 2시간 이내 — 되돌린 커밋을 push하고 재빌드하는 경로(수동 Jenkins 실행 또는 `just deploy`)로 당일 중 복구되면 충분합니다. 이 시간 목표는 절차서의 "복구 완료 기준"이 되며, 야간 작업이 되돌린 `develop`을 배포하는 경로(C)는 이 목표를 채우지 못하므로 채택하지 않았습니다.

## 기록되지 않은 판단 (사람에게 다시 묻지 않은 것)

- **자동 post-deploy 러너**: 배포 후 HTTP 200 확인(`/`, 글 하나)과 `/tags`의 301 + 대상 200 확인은 사람의 수동 확인으로 남습니다. 자동 러너는 별도 작업으로 이미 기록되어 있습니다(`F1`). 이 단계는 그 항목을 새로 만들지 않고, 절차서의 수동 확인 항목으로만 남깁니다.
- **U2 되돌리기의 순서 제약**: U2 인프라 설계 리뷰 R-01(Major)이 지적한 대로, U3·U4가 병합된 뒤 U2만 되돌리면 U3·U4의 링크가 깨집니다. U2 코드 생성 요약이 정한 처리("U2를 되돌릴 때는 U3·U4도 함께 되돌릴 것, 되돌리기 push 전에 로컬 게이트의 `just crossunit`을 실행할 것")를 절차서에 그대로 넣습니다. Jenkins에 링크 스윕을 추가하는 것은 프로덕션 게이트를 바꾸는 일이므로 별도 작업으로 남깁니다.
- **16상태 접근성 검토 기록**: `npm run test:e2e`는 기록이 최신이 아니면 `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`로 실패 닫힘을 유지합니다. 기록은 변경이 정리된 뒤 한 번 다시 작성합니다. 이 단계는 그 위치를 바꾸지 않습니다.

## 측정된 현재 상태 (2026-11-20 13:14 KST)

절차서를 추측이 아니라 사실에 세우기 위해 이 시점에 세 가지를 확인했습니다.

| 관찰 | 값 | 의미 |
|---|---|---|
| `origin/develop` | `db7ecae` (이 작업 이전) | 로컬 `develop`은 이 작업 전체를 갖고 있지만 **push되지 않았습니다**. 야간 작업은 `origin/develop`을 체크아웃하므로, U1–U4는 아직 어떤 배포에도 실리지 않았습니다 |
| 실행 중인 서버 | PID 2488, 시작 2026-11-17 00:53 | U3의 서버 코드 커밋(`b147d7b`, 2026-11-20 10:12) **이전**에 시작된 프로세스입니다. 즉 리디렉션 분기가 없는 서버가 아직 돌고 있고, BR3.5가 정한 고정 재시작은 아직 일어나지 않았습니다 |
| 라이브 응답 | `/tags` → 200, `/writing/tags` → 404, `Last-Modified: 2026-11-07` | 라이브 사이트는 아직 U3 이전 상태입니다. U3의 이동 페이지와 `_redirects.json`은 배포된 적이 없습니다 |

따라서 **U3의 이동 페이지를 처음 싣는 배포는 반드시 그 전에 고정 재시작이 precede해야 합니다.** 순서가 반대면 배포가 이전 페이지 트리를 지운 뒤 구주소가 404를 답합니다(`construction/u3-writing-moves/infrastructure-design/infrastructure-specification.md` §Restart policy).

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
