# CD 파이프라인 구성 — `261115-personal-website`

- **단계**: Deployment Pipeline (`deployment-pipeline`), 2026-11-20
- **역할**: 릴리스 엔지니어 (aidlc-pipeline-deploy-agent)
- **질문과 답**: `deployment-pipeline-questions.md` (6개, 모두 답변됨 — Q6 롤백 목표 시간은 2시간 이내)
- **상위 산출물**: `construction/ci-pipeline/ci-config.md`(`ci-config`), `construction/ci-pipeline/quality-gates.md`(`quality-gates`), 네 단위의 `construction/{u1-publish-boundary,u2-writing-section,u3-writing-moves,u4-navigation}/infrastructure-design/infrastructure-specification.md`(`infrastructure-specification`), 같은 경로의 `cicd-pipeline.md`(`cicd-pipeline`)
- **같은 단계의 다른 산출물**: `deployment-strategy.md`(전략·승격·기능 플래그), `rollback-runbook.md`(롤백 절차)

## 1. 릴리스 트리거 — 무엇이 배포를 일으키는가

| 항목 | 값 | 근거 |
|---|---|---|
| 릴리스 행위 | `git push origin develop` — push 자체가 릴리스 | `team.md` `## Deployment` — "no approval step, so pushing `develop` is the release" |
| 자동 실행 | Jenkins 작업 `obsidian-blog-develop`, 크론 `H 0 * * *` — 매일 0시 | `Jenkinsfile:4-6`, `team.md` `## Deployment` |
| 체크아웃 대상 | `origin/develop` (SCM Checkout) | `Jenkinsfile:32-34` |
| 배포 단위 | `site/dist/` 트리 전체 | `ci-config.md` §5, `infrastructure-specification.md` §Storage |
| 배포 대상 | `WEB_ROOT` = `/Users/revenantonthemission/Sites/obsidian-blog` (launchd `dev.rvnnt.blog`가 실제로 serves하는 디렉터리) | `Jenkinsfile:17` |
| 검증 전용 실행 | `RUN_DEPLOY` 파라미터를 체크 해제하면 Deploy만 건너뛴다 | `Jenkinsfile:8-14`, `Jenkinsfile:108-110` |
| push 트리거 | 없음 — push마다 도는 게이트가 아니라 야간 배치다 | `ci-config.md` §2 |

**배포 승격 단계는 없습니다.** 환경은 하나이고(`infrastructure-specification.md` §Deployment Environments — "One production environment… No staging"), `main`은 마일스톤 표식입니다. 승격 매트릭스는 `deployment-strategy.md` §4에 있습니다.

## 2. 배포 파이프라인 (단계별)

| # | 단계 | 명령 | 게이트 | 이 단계의 확인 |
|---|---|---|---|---|
| 1 | Checkout | `checkout scm` | — | `origin/develop`을 SSH로 당긴다. 원격은 이것 하나뿐 |
| 2 | Install | `cd site && rm -rf .generated && npm ci` / `cargo build --release --manifest-path preprocessor/Cargo.toml` (병렬) | — | `.generated`을 지우는 것은 폰트 머티리얼라이저의 실패 닫힘을 위한 것(`Jenkinsfile:41-43`) |
| 3 | Verify | `cargo test --release` → fixture 전처리 → JSON 4종 복사 → `npm run test:unit && npm run test:pbt` | **프로덕션 게이트.** 실패 시 Deploy까지 가지 않는다 | `quality-gates.md` §2(G1). 축소 카운터예시 아카이브(`Jenkinsfile:68-74`) |
| 4 | Preprocess | `obsidian-press --stamp-published "${VAULT_PATH}" ./content --pages "${PAGES_PATH}"` → JSON 복사 → `node site/scripts/sync-public-assets.mjs content/assets site/public/assets` | exit 0 필수 | 실제 볼트 `Areas/Notes`를 읽고 `published` 날짜를 채운다. 자산 복사는 교체 방식이라 철회된 이미지가 남지 않는다(`Jenkinsfile:95-97`) |
| 5 | Build Site | `cd site && npx astro build` | 실패 시 중단 | 빌드 완료 훅이 `_redirects.json`을 이 빌드 출력 안에 씁니다. 문법 위반·대상 누락은 `REDIRECT_TARGET_MISSING`으로 빌드를 실패시킵니다 |
| 6 | Deploy | `bash site/scripts/publish-dist.sh site/dist "${WEB_ROOT}"` | 앞 단계가 모두 초록이고 `RUN_DEPLOY`가 체크됐을 때 | **두 번의 복사**(§3). `Justfile`의 `deploy` 레시피가 같은 스크립트를 호출하므로 두 배포 정의가 같은 절차를 수행합니다 |

`post` 블록은 성공·실패 메시지만 출력합니다(`Jenkinsfile:121-124`). 배포 후 확인은 파이프라인 안에 없고 §4의 수동 확인입니다.

## 3. 배포 절차 — 두 번의 복사

`site/scripts/publish-dist.sh:37-44`가 배포 절차의 유일한 정의입니다.

1. **복사 1 — 트리(테이블 제외)**: `rsync -a --delete --exclude="/_redirects.json" --exclude="/.redirects.json.tmp" site/dist/ "$WEB_ROOT/"`
   - 앵커 패턴이 루트 파일 하나만 가리킵니다. `--delete-excluded`가 없으므로 대상의 예전 테이블은 교체도 삭제도 되지 않고, 예전 규칙이 남은 채 페이지만 바뀝니다.
   - 이 복사가 끝나면 새 빌드의 모든 페이지가 제자리이고, 이전 `tags/`·`graph/` 트리는 사라집니다.
2. **복사 2 — 테이블**: `cp site/dist/_redirects.json "$WEB_ROOT/.redirects.json.tmp"` → `mv -f`로 이름 변경.
   - `cp`는 새 수정 시간을 만들고 `mv -f`는 원자적으로 이름만 바꾸므로, 서버는 반쯤 쓰인 파일을 읽지 않고 예전 테이블 또는 새 테이블을 읽습니다.
   - 빌드가 테이블을 만들지 않았다면 `rm -f`가 대상의 테이블을 지웁니다. 어떤 규칙도 자신이 가리키는 페이지를 outlive 하지 않습니다.

**이 순서가 지켜져야 하는 이유**: 서버는 요청 시점에 리디렉션 대상을 검사하지 않으므로(NFR4.10), 테이블은 자신이 가리키는 페이지보다 뒤에 놓여야 합니다(NFR5.25). `infrastructure-specification.md` §"The two-copy deploy"와 `cicd-pipeline.md` §"Deployment strategy"가 같은 근거를 담고 있고, 이 스크립트가 그 순서를 코드에 고정합니다.

**잔여 창(무해한 방향)**: 두 복사 사이에는 예전 테이블이 새 트리 위에 살아 있습니다. 이번 빌드에서 사라진 태그의 예전 주소는 301을 준 뒤 404를 줍니다 — 두 번째 복사 뒤에도 그 주소는 404입니다(계약 C5). 반대 방향, 즉 새 규칙이 페이지보다 먼저 사는 경우는 일어나지 않습니다.

## 4. 배포 후 확인(헬스 체크)

| # | 확인 | 기준 | 주체 | 실패 시 |
|---|---|---|---|---|
| H1 | `/` 가 HTTP 200 | 200 | 유지관리자 | 롤백(`rollback-runbook.md`) |
| H2 | 글 하나가 HTTP 200 | 200 | 유지관리자 | 롤백 |
| H3 | `/tags` 가 301, `Cache-Control: no-cache`, `Location` 이 가리키는 대상이 200 | 301 + 대상 200 | 유지관리자 | 롤백(P2 — `monitoring-design.md` §"Legacy-address redirect mismatch") |

- H1·H2는 팀 규칙(`team.md` `## Deployment`)의 관행이고, H3는 U3이 추가한 확인입니다(`cicd-pipeline.md` §"Manual release check").
- H3는 U3의 이동 페이지가 처음 배포된 야간부터, 배포마다 적용됩니다.
- 자동화된 post-deploy 러너는 아직 없습니다(`F1`, 별도 작업). 이 단계는 그 항목을 새로 만들지 않습니다.

## 5. 배포 전 필수 조건 — 첫 U3 배포의 고정 재시작

U3은 태그 인덱스·태그 페이지·그래프를 `/writing/...` 아래로 옮기고 예전 주소를 영구 리디렉션으로 답합니다. 서버의 요청 경로가 바뀌기 때문에 **이동 페이지를 처음 싣는 배포는 반드시 그 전에 launchd 서비스를 재시작해야 합니다.** 순서가 반대면 배포가 예전 페이지 트리를 지운 뒤 구주소가 404를 답합니다(`infrastructure-specification.md` §Restart policy).

**재시작의 전제조건** (실측 확인, 2026-11-20 13:14 KST)

| 전제 | 실측 | 판정 |
|---|---|---|
| 작업 복사본이 U3 병합 커밋 이후의 `develop`에 있어야 한다 | 작업 복사본은 `develop`의 `d9a52d6` (U3 병합 이후) | 충족 |
| `site/scripts/local-server.mjs`와 `site/scripts/redirect-table.mjs`가 그 커밋과 달라지지 않았어야 한다 | 두 파일 모두 커밋된 상태, 작업 트리 변경 없음 | 충족 |
| 재시작이 아직 일어나지 않았어야 한다 | 실행 중인 프로세스 PID 2488, 시작 2026-11-17 00:53 — U3의 서버 코드 커밋 `b147d7b`(2026-11-20 10:12) **이전** | 재시작 필요 |

**순서**

1. `git -C ~/Projects/obsidian-blog switch develop` 후 `git pull`로 대상 커밋에 맞춥니다.
2. `launchctl kickstart -k gui/$(id -u)/dev.rvnnt.blog`
3. 재시작 직후 `/tags` 는 아직 예전 페이지의 200을 답합니다(테이블이 아직 없으므로). 이 구간에서는 예전 페이지가 그대로 있고 깨지는 주소가 없습니다.
4. 배포가 새 트리와 테이블을 순서대로 놓고, 실행 중인 서버가 수정 시간 변화로 테이블을 다시 읽습니다. 배포 뒤 추가 재시작은 필요 없습니다.

**Jenkins는 `brew services start jenkins` 로 시작하지 않습니다** — 프로젝트 규칙이며, 이 명령은 포트 8080을 블로그에서 가져가 127.0.0.1:8080을 차지합니다. 수동 실행은 127.0.0.1:8081의 Jenkins 화면에서 합니다.

## 6. 중단 기준과 롤백 진입

| 상황 | 판정 | 처리 |
|---|---|---|
| 야간 작업의 Verify 또는 Build Site 실패 | 배포되지 않음 (이전 빌드가 계속 살아 있음) | 배포 자체가 일어나지 않으므로 롤백 불필요. property 카운터예시는 아카이브됨 |
| 배포 후 H1·H2 실패 | P1 | 롤백 즉시 (`rollback-runbook.md`) |
| 배포 후 H3 실패 (구주소가 301이 아니거나 대상이 200이 아님) | P2 | 롤백 (`rollback-runbook.md`) |
| 첫 병합 후 첫 야간 실행이 빨간색 | 중단 기준 | 되돌린 뒤 재빌드 (`cicd-pipeline.md` §4, U1) |
| 요약의 글 수가 그날 추가·삭제한 수보다 많이 어긋남 | 중단 기준 | 동일 |
| U2를 되돌려야 하는데 U3·U4가 병합된 상태 | 순서 제약 | U3·U4도 함께 되돌리고, 되돌리기 push 전에 로컬 게이트의 `just crossunit`을 실행 (`cicd-pipeline.md` §"Ordering constraint", U2 코드 생성 요약) |
| 이력·게시 글 수가 기준과 어긋남 | 운영 신호 | `observability-setup` 소유 (`quality-gates.md` G6) |

## 7. 보안

- **비밀**: 전처리·빌드·배포는 모두 로컬 경로와 파일 복사입니다. 파이프라인이 만나는 유일한 원격은 `checkout scm`이 SSH로 당기는 `origin`이며, 키는 Jenkins 에이전트에 있습니다. 새 자격 증명·토큰·키를 추가하지 않습니다.
- **변경 없음**: 이 단계는 인프라를 바꾸지 않습니다. IAM·네트워크 정책·암호화 설정도 건드리지 않으므로 위험 평가 대상이 없습니다.
- **상속되는 노출(문서화만)**: 웹 루트는 공개 읽기 대상이며 `_redirects.json`도 공개 파일입니다. 안전은 접근 통제가 아니라 서버의 검증(문법 G1–G8, 규칙 전체 거부)에 달려 있습니다(`infrastructure-specification.md` §"Redirect table"). 오리진은 `HOST=0.0.0.0`로 LAN에서도 열려 있고, 이는 **수용 후 유지**하기로 한 결정입니다(변경 없음). 공개 데이터만 추가로 드러나므로 위험은 늘지 않습니다.
- **릴리스 권한**: push = 릴리스이며, 저장소의 유일한 소유자가 수행합니다. 별도 승인 절차는 없습니다.

## 8. 이 단계가 넘기는 항목

| 항목 | 상태 | 처리 |
|---|---|---|
| `origin/develop`에 아직 push되지 않음 | 측정됨 | `origin/develop`은 `db7ecae`(이 작업 이전)입니다. 이 작업 전체는 push 전까지 어떤 배포에도 실리지 않습니다. push 자체가 릴리스이므로 유지관리자의 결정입니다 |
| U3 고정 재시작 | 대기 | §5의 순서대로, U3의 이동 페이지를 처음 싣는 배포 **전에** 실행 |
| `U1-NFR6.1` — U1 병합 커밋에서 Jenkins Verify가 초록 | Unverified | push 뒤 첫 야간 또는 수동 실행의 Verify 로그가 증거 (약 10분) |
| `TEAM-E2E-A11Y` — 16상태 수동 접근성 검토 | Not Met | 변경이 정리된 뒤 유지관리자가 1회 작성(2–4시간). 그전까지 `npm run test:e2e`는 병합 게이트 밖 |
| `U1-SLO-NIGHTLY`, `U1-SLO-PAGECOUNT` | Unverified | 30일 운영 신호 필요 (`observability-setup` 소유) |
| 자동 post-deploy 러너 (`F1`) | 미착수 | 별도 작업. 이 단계가 새로 만들지 않음 |
| `npm run test:e2e`의 병합 게이트 편입 | 보류 | 수동 검토 기록이 최신이 아니면 실패 닫힘을 유지. 편입은 별도 결정 |
| 페이지 바이트 예산의 반복 측정 | 후속 | 측정 스크립트가 저장소에 커밋되어 있지 않음 |

## 9. 변경하지 않은 것 (근거)

- **스테이징·블루그린·카나리·롤링을 추가하지 않음** — 환경이 하나이고 배포 단위가 정적 트리 전체입니다(`deployment-strategy.md` §2).
- **배포 승인 단계를 추가하지 않음** — `team.md` `## Deployment`이 "no approval step, so pushing `develop` is the release"로 정했습니다.
- **아티팩트 저장소·버전 태그·이전 빌드 보관을 추가하지 않음** — 배포 단위는 `site/dist/` 트리 자체이고 이전 빌드는 보존되지 않습니다(`team.md` `## Deployment`).
- **기능 플래그를 추가하지 않음** — 이동 페이지와 리디렉션 테이블이 한 빌드에 함께 실립니다(`deployment-strategy.md` §5).
- **Jenkins에 링크 스윕을 추가하지 않음** — 프로덕션 게이트를 바꾸는 일이므로 유지관리자의 별도 결정으로 남깁니다(`rollback-runbook.md` §4가 이 공백을 절차로 덮습니다).
- **리디렉션 서버를 요청 시점에 검증하지 않음** — 계약 C4와 NFR4.10의 평면 요청 경로를 지키고, 대신 배포 순서가 보장합니다(NFR5.25).
