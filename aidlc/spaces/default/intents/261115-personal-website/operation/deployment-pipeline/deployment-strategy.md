# 배포 전략 — `261115-personal-website`

- **단계**: Deployment Pipeline (`deployment-pipeline`), 2026-11-20
- **질문과 답**: `deployment-pipeline-questions.md` Q1·Q2·Q3·Q5 (배포 전략 = 전량 교체, 승격 게이트 = 없음, 승인 절차 = 없음, 기능 플래그 = 사용하지 않음)
- **상위 산출물**: `construction/ci-pipeline/ci-config.md`(`ci-config`), `construction/ci-pipeline/quality-gates.md`(`quality-gates`), 네 단위의 `construction/*/infrastructure-design/infrastructure-specification.md`(`infrastructure-specification`), `construction/*/infrastructure-design/cicd-pipeline.md`(`cicd-pipeline`)
- **같은 단계의 다른 산출물**: `cd-config.md`(파이프라인 구성), `rollback-runbook.md`(롤백 절차)

## 1. 전략 요약

| 항목 | 선택 | 근거 |
|---|---|---|
| 배포 전략 | **전량 교체(recreate)** — 새 트리를 웹 루트에 그대로 미러링하고 트래픽 전환은 없음 | `cicd-pipeline.md`(U3) §"Deployment strategy" — "Recreate, one environment, no traffic shifting" ✓, `cicd-pipeline.md`(U4) §"Deployment strategy" ✓, `cicd-pipeline.md`(U1) §4 ✓ |
| 환경 수 | 1 (프로덕션) | `team.md` `## Deployment` — "no staging environment" ✓, `infrastructure-specification.md` §Deployment Environments ✓ |
| 승격 단계 | 없음 | `cicd-pipeline.md`(U3) §"Environment promotion" — "There is no staging environment, so a promotion stage does not exist" ✓ |
| 릴리스 승인 | 없음 — `develop` push가 릴리스 | `team.md` `## Deployment` ✓ |
| 배포 단위 | `site/dist/` 트리 전체 | `ci-config.md` §5 ✓ |
| 산출물 관리 | 버전·태그 없음, 아티팩트 저장소 없음, 이전 빌드 미보존 | `team.md` `## Deployment` — "Releases are not tagged, and no previous build is kept" ✓, `cicd-pipeline.md`(U3) §"Feature flags and artifact management" ✓ |
| 롤백 방식 | 되돌린 소스에서 다시 빌드 (산출물 복원이 아님) | `team.md` `## Deployment` ✓, `cicd-pipeline.md`(U3) §"Rollback" ✓ |
| 롤백 목표 시간 | **2시간 이내** | `deployment-pipeline-questions.md` Q6 (B) |
| 기능 플래그 | 없음 | `deployment-pipeline-questions.md` Q5 (A), `cicd-pipeline.md`(U3) §"Feature flags and artifact management" ✓ |

## 2. 왜 트래픽 전환 전략이 성립하지 않는가

blue-green·canary·rolling은 "이전 버전과 새 버전이 동시에 서는" 상태를 전제로 합니다. 이 프로젝트에는 그 상태가 존재할 수 없습니다.

- 배포 산출물은 정적 트리 하나이고, 서버는 `site/scripts/local-server.mjs`가 요청마다 파일을 찾아 그대로 스트리밍합니다. 요청 경로에 트리 전환 지점이 없습니다.
- 두 번째 트리를 두고 전환 절차(디렉터리 스왑, 서버 재시작, 전환 후 정리)를 만들면, 얻는 것은 "가용성 이득"이고 비용은 "누군가 소유할 스왑 절차"입니다.
- 로드 밸런서나 트래픽 분기 지점이 없습니다. Cloudflare Tunnel은 `http://127.0.0.1:8080`으로만 연결하는 터널입니다(`infrastructure-specification.md` §Networking topology).
- 출처는 하나, 야간 릴리스는 하나, 스케일은 개인 블로그 수준입니다.

`cicd-pipeline.md`(U4) §"Deployment strategy"는 이 판단과 수용한 노출을 이미 기록했습니다: "one origin, one nightly release, a static tree, no staging environment and no second copy to switch to, so a build-then-swap step would add a second tree and a swap procedure for no availability gain."

## 3. 교체(전량 교체) 자체의 성질과 수용한 노출

`rsync -a --delete`는 웹 루트를 빌드 트리의 거울로 만듭니다. 교체는 **제자리(in place)이고 원자적이지 않습니다** — 동기화 창 동안 요청은 절반만 바뀐 트리를 볼 수 있습니다(예: 새 HTML이 도착했는데 해시된 자산이 아직 복사되지 않은 상태).

| 노출 | 크기 | 왜 수용하는가 |
|---|---|---|
| 트리 동기화 중의 혼합 상태 | 한 기계에서 rsync 몇 초 | 출처 하나, 야간 릴리스 하나, 정적 트리. U4의 변경은 자산도 늘리지 않고 접합면마다 내비게이션 항목 세 개만 줄입니다(`cicd-pipeline.md`(U4) §"Deployment strategy") |
| 두 복사 사이의 예전 테이블 | 두 복사 사이 몇 초 | 새 규칙이 페이지보다 먼저 사는 경우는 없습니다. 반대 방향(사라진 태그의 예전 주소가 301 후 404)은 그 주소가 두 번째 복사 뒤에도 404라는 점 외에 달라지지 않습니다(계약 C5) |
| 배포 직후의 검증 창 | 유지관리자의 수동 확인 시간 | 자동 러너가 아직 없습니다(`F1`). §5의 H1–H3이 그 창을 메웁니다 |

## 4. 환경 승격 매트릭스

| 환경 | 트리거 | 통과해야 할 게이트 | 승격 조건 | 산출물 |
|---|---|---|---|---|
| 프로덕션(유일) | `git push origin develop` → 야간 `obsidian-blog-develop` (크론 `H 0 * * *`) | G1 Jenkins Verify (Rust·단위·속성 스위트, `quality-gates.md` §2) | G1 통과 + Build Site 통과 + `RUN_DEPLOY` 체크 | `site/dist/` → `~/Sites/obsidian-blog` |
| (스테이징) | 존재하지 않음 | — | — | — |
| (dev) | `develop`의 작업 복사본에서 `just deploy` — 유지관리자의 허가 하에 | 로컬 게이트 G2 (`quality-gates.md` §3) 전량 | 로컬 게이트 통과 | 같은 웹 루트(별도 환경이 아님) |

`just deploy`는 프로덕션 경로와 같은 절차를 수행합니다(`site/scripts/publish-dist.sh`를 호출). 별도 환경이 아니라 "같은 환경에 다른 경로로 도달하는 방법"이므로 승격 단계가 아닙니다.

## 5. 기능 플래그 — 사용하지 않음

이동된 페이지와 리디렉션 테이블은 다른 모든 것과 같은 빌드에 들어갑니다. 예전 주소는 플래그가 아니라 서버의 조회로 답합니다(`cicd-pipeline.md`(U3) §"Feature flags and artifact management").

| 대안 | 왜 채택하지 않음 |
|---|---|
| CloudWatch Evidently / AppConfig | 플래그가 켜지지 않았을 때의 동작(예전 주소를 404로 두는지, 301로 둘지)을 사이트가 정의해야 합니다. 계약 C4는 "일치 시 301"을 고정하고, 서버가 한 번에 테이블을 읽습니다. 플래그는 경로 하나를 두 벌로 나누고, 그 분기를 계약에 추가하지 않은 채로 얹힙니다 |
| 저장소 안의 자체 플래그 파일 | 빌드 시점에 결정되는 정적 트리에 요청 시점 상태를 넣는 것은 새 동작입니다. 계약 C4·C5와 NFR5.25가 정한 "한 빌드에 함께"라는 경계를 깨고, U3의 검증 대상(테이블 문법·대상 존재)도 복잡해집니다 |
| 페이지 단위 롤아웃 | 정적 트리 전체 교체 전략과 양립하지 않습니다. §2의 이유와 같습니다 |

## 6. 산출물과 버전 관리

- **배포 단위**: `site/dist/` 트리. 이 트리가 곧 산출물입니다.
- **버전·태그**: 없습니다. 롤백은 산출물이 아니라 소스로 돌아갑니다.
- **이전 빌드 보존**: 없습니다. `team.md` `## Deployment` — "no previous build is kept". 이 때문에 롤백은 항상 재빌드입니다(`rollback-runbook.md`).
- **산출물 저장소**: 없습니다. CI 구성에도, 이 전략에도 아티팩트 저장소를 두지 않습니다(`ci-config.md` §5, `deployment-pipeline-questions.md` Q3).
- **리디렉션 테이블**: 빌드 산출물의 일부이지 별도 산출물이 아닙니다. `site/dist/_redirects.json` → 웹 루트의 `_redirects.json`. 요청 시점에 서버가 읽고, 공개·공격자가 읽을 수 있는 파일이므로 안전은 서버의 검증에 달려 있습니다.

## 7. 배포 후 확인(헬스 체크)

| # | 확인 | 기준 | 실패 판정 |
|---|---|---|---|
| H1 | `/` | HTTP 200 | P1 (`monitoring-design.md` §"Post-deploy reachability failure") |
| H2 | 글 하나 | HTTP 200 | P1 |
| H3 | `/tags` → 301 + `Cache-Control: no-cache`, `Location`의 대상 | 301, 대상 200 | P2 (`monitoring-design.md` §"Legacy-address redirect mismatch") |

확인 절차와 실패 시 처리는 `cd-config.md` §4와 `rollback-runbook.md`에 있습니다.

## 8. 중단 기준

| 기준 | 출처 |
|---|---|
| 첫 병합 후 첫 야간 실행이 빨간색 | `cicd-pipeline.md`(U1) §4 |
| H1 또는 H2 실패 | `team.md` `## Deployment`, `monitoring-design.md` |
| 요약의 글 수가 그날 추가·삭제한 수보다 많이 어긋남 | `cicd-pipeline.md`(U1) §4, `monitoring-design.md` |
| H3 실패 | `cicd-pipeline.md`(U3) §"Manual release check" |

**운영 신호에 따른 중단**(야간 초록률, 예기치 않은 페이지 수)은 `quality-gates.md` G6이 `observability-setup`에 넘긴 항목이며, 이 전략의 중단 기준과 별개입니다.

## 9. 변경하지 않은 것

- **스테이징 환경, 승격 단계, 트래픽 전환** — §2.
- **배포 승인 절차** — `develop` push가 릴리스입니다.
- **산출물 저장소·태그·이전 빌드 보관** — §6.
- **기능 플래그** — §5.
- **요청 시점의 리디렉션 대상 검증** — 계약 C4와 NFR4.10의 평면 요청 경로를 지키며, 대신 배포 순서가 보장합니다(NFR5.25).
