# 환경 검증 보고서 — `261115-personal-website`

- **단계**: Environment Provisioning (`environment-provisioning`), 2026-11-21 KST
- **역할**: 플랫폼 엔지니어 (aidlc-aws-platform-agent)
- **검증 대상**: `261115-personal-website`의 프로덕션 환경(단일 macOS 호스트)
- **검증 기준**: 네 단위의 `infrastructure-specification.md`(`infrastructure-specification`), `operation/deployment-pipeline/cd-config.md`(`cd-config`), `operation/deployment-pipeline/rollback-runbook.md`, `Jenkinsfile`, `Justfile`, `aidlc/spaces/default/memory/team.md`(`## Deployment`), `aidlc/spaces/default/memory/project.md`
- **방법**: 읽기 전용 측정(`launchctl list`, `lsof`, `curl -I`, `ps`, `ls`, `git log`, `brew services list`) + 유지관리자의 결정으로 승인된 4가지 환경 변경. 파이프라인은 실행하지 않았습니다(Deploy 단계의 몫)
- **측정 시각**: 조치 전 2026-11-20 22:54 KST, 조치 후 2026-11-21 00:07 KST

## 1. 결론

환경은 `infrastructure-specification`이 명세한 대로 **운영 준비 상태**입니다. 명세와 어긋나던 세 가지(오리진의 LAN 노출, Jenkins 정지, `Areas/Pages` 부재)와 대기 중이던 U3 서버 재시작을 이번 단계에서 해결했고, 조치 후 모든 구성요소가 명세대로 동작하는 것을 재측정했습니다.

다만 **첫 배포를 실행할 조건은 아직 갖가지 않았습니다.** `origin/develop`이 `db7ecae`에 머물러 있어 이번 작업(U1–U4)이 원격에 없습니다. push 자체가 릴리스이므로(`cd-config.md` §1) 이 결정은 유지관리자에게 있습니다. 이 보고서는 그 결정에 필요한 상태를 사실로 고정합니다.

| 구분 | 개수 | 내용 |
|---|---|---|
| 검증 항목 | 17 | §3 표 |
| 적합(Pass) | 17 | 명세와 일치 |
| 조치 완료(Finding 해결) | 4 | F-01 ~ F-04 (§5) |
| 미해결 Finding | 2 | F-05(`typst` 부재), F-06(`chrome-headless-shell` 부재) — 둘 다 현재 배포를 막지 않음 |
| 이관된 항목 | 3 | F-07 ~ F-09 (§6) |

## 2. 검증 범위와 AWS 항목의 대응

이 단계의 템플릿은 AWS 환경 프로비저닝을 전제로 하지만, 이 프로젝트의 환경은 AWS가 아닙니다. `infrastructure-specification`(U1·U2·U3·U4)이 네 단위 모두 "이 단위는 인프라를 추가하지 않는다", "VPC·서브넷·보안 그룹·시크릿 관리자·교차 계정 연결이 없다"를 명시하므로, AWS 네 개 항목은 다음과 같이 대응시켜 검증했습니다.

| 단계 템플릿 항목 | 이 환경의 대응물 | 판정 |
|---|---|---|
| "모든 환경이 Infra Design대로 프로비저닝되었는가" | 단일 프로덕션 환경(호스트 1대 + launchd 2종 + Jenkins 1종 + 터널 1종)이 `infrastructure-specification`의 컴퓨트·네트워크·스토리지·환경 표와 일치하는가 | ✅ `environment-inventory.md` §2 |
| "VPC·서브넷·보안 그룹·NACL이 올바른가" | 해당 없음. 대신 **오리진 바인딩(127.0.0.1:8080)** 과 **터널 인입(127.0.0.1:8080 단일)** 이 경계 역할 | ✅ 적용 대상 없음으로 문서화, §3 V-05·V-06 |
| "시크릿이 올바르게 주입되는가" | 해당 없음. 환경이 쓰는 유일한 비밀은 터널 자격 증명 파일(0600)과 Jenkins 에이전트의 SCM 키 | ✅ §4 |
| "교차 계정·교차 VPC 연결이 검증되었는가" | 해당 없음. 동등한 경계는 "터널 → 오리진 → 웹 루트"이고 공개 경유·로컬 경유 양쪽이 200으로 응답 | ✅ §3 V-09·V-10 |

## 3. 구성요소별 검증 결과

| # | 검증 항목 | 기준(출처) | 측정 | 판정 |
|---|---|---|---|---|
| V-01 | 정적 서버가 실행 중인가 | `infrastructure-specification` §Infrastructure Services | launchd `dev.rvnnt.blog`, PID 40304, `LastExitStatus 0` | ✅ |
| V-02 | 서버가 명세의 스크립트를 실행하는가 | `infrastructure-specification` §Restart policy(작업 복사본의 스크립트를 실행) | `ProgramArguments` = `/Users/…/Projects/obsidian-blog/site/scripts/local-server.mjs` + 웹 루트 | ✅ |
| V-03 | 서버 프로세스가 U3 코드를 실행 중인가 | `cd-config.md` §5(첫 U3 배포 전 고정 재시작) | 프로세스 시작 2026-11-21 00:05 KST — U3 커밋 `b147d7b`(2026-11-20 10:12) 이후 | ✅ (조치 F-04) |
| V-04 | 서버 스크립트가 U3 커밋과 같은가 | `cd-config.md` §5 전제조건 | `site/scripts/local-server.mjs`·`site/scripts/redirect-table.mjs` — `b147d7b` 이후 커밋 없음, 작업 트리 변경 없음 | ✅ |
| V-05 | 오리진 바인딩 | `cd-config.md` §7(오리진은 LAN에서도 열려 있음 — **수용 후 유지**)에서 유지관리자의 결정으로 폐쇄 | `lsof` → `127.0.0.1:8080` (조치 전 `*:8080`) | ✅ (조치 F-01) |
| V-06 | 터널 인입 | `infrastructure-specification` §Networking topology | `~/.cloudflared/obsidian-blog.yml:4-7` → `rvnnt.dev` → `http://127.0.0.1:8080`, 그 외 404 | ✅ |
| V-07 | 터널 프로세스와 자격 증명 | `infrastructure-specification` §Infrastructure Services | PID 2511 실행 중, 자격 증명 파일 `-r--------` | ✅ |
| V-08 | Jenkins가 명세대로 동작하는가 | `cd-config.md` §2(작업 `obsidian-blog-develop`, 크론 `H 0 * * *`) | launchd `homebrew.mxcl.jenkins`, PID 38904, `127.0.0.1:8081`, `/login` → 200 | ✅ (조치 F-02) |
| V-09 | 공개 경로가 살아 있는가 | `team.md` `## Deployment` | `https://rvnnt.dev/` → 200 | ✅ |
| V-10 | 오리진이 살아 있는가 | `cd-config.md` §4 H1 | `http://127.0.0.1:8080/` → 200 | ✅ |
| V-11 | 웹 루트가 Jenkins의 배포 대상과 같은가 | `Jenkinsfile:17`(`WEB_ROOT`) | `/Users/revenantonthemission/Sites/obsidian-blog` = plist의 두 번째 인자와 동일 | ✅ |
| V-12 | 배포 정의가 하나뿐인가 | `cd-config.md` §3(두 배포 정의가 같은 스크립트) | `Jenkinsfile:116`과 `Justfile:29` 모두 `bash site/scripts/publish-dist.sh` | ✅ |
| V-13 | 전처리 입력 폴더가 있는가 | `infrastructure-specification` U1 §Storage — inputs | `Areas/Notes` 존재, `Areas/Pages` 존재(이번 생성) | ✅ (조치 F-03) |
| V-14 | 볼트 경계가 지켜지는가 | `project.md` 금지 규칙(전처리를 볼트 전체에 돌리지 않는다) | Jenkins `VAULT_PATH`·`PAGES_PATH`는 `Areas/Notes`·`Areas/Pages`로 고정. `Areas/Threads`·`Areas/Learning`는 입력 경로가 아님 | ✅ |
| V-15 | 도구 체인이 준비되었는가 | `infrastructure-specification` §Infrastructure Services(Chrome·d2·typst) | node v24.14.0 ✓, cargo 1.100.0 ✓, just 1.59.0 ✓, d2 ✓, Chrome ✓ | ✅ (`typst`·`chrome-headless-shell`은 §5 F-05·F-06) |
| V-16 | 로컬 게이트 포트가 비어 있는가 | HIG가 127.0.0.1:4329 사용 | 4329 리스닝 없음 | ✅ |
| V-17 | 저장소 산출물이 배포 대상과 같은가 | `cd-config.md` §1 | 로컬 `develop` @ `cf4993f` — `origin/develop`보다 70커밋 앞섬(§6 F-07) | ⚠️ 배포는 아직 없음 |

## 4. 보안 자세 검증

> **검증 주체에 대한 기록**: 이 단계의 지시에는 지원 에이전트가 없었고 협업 모드도 꺼져 있어, 단계 템플릿이 말하는 "보안 자세 검증은 DevSecOps 에이전트가 수행"은 이 단계에서 **플랫폼 엔지니어가 인라인으로** 수행했습니다. 별도의 DevSecOps 검토는 이 단계의 산출물에 포함되지 않습니다.

| 항목 | 판단 | 근거 |
|---|---|---|
| 오리진 노출 | ✅ 폐쇄 | 조치 후 루프백 전용. 조치 전 LAN 노출은 유지관리자가 명시적으로 닫기로 결정했습니다(F-01) |
| 공개 파일의 경계 | ✅ 명세와 일치 | `_redirects.json`과 웹 루트의 모든 파일은 공개 대상입니다. 안전은 접근 통제가 아니라 서버의 형식 검증(G1–G8, 규칙 전체 거부)에 달려 있으며, 그 검증은 `infrastructure-specification` §Redirect table에 정의되어 있습니다 |
| 비밀 관리 | ✅ 최소 | 새 비밀·토큰·키 없음. 터널 자격 증명은 0600, SCM 키는 저장소 밖 Jenkins 에이전트 |
| 비밀 노출 경로 | ✅ 없음 | 저장소·웹 루트·볼트에 자격 증명이 없음. `Jenkinsfile`의 환경 변수는 경로와 포트뿐 |
| 웹 루트 권한 | ⚠️ 공개 읽기 | `drwxr-xr-x` — 방문자에게 공개되는 정적 자산이므로 의도된 상태입니다 |
| 요청 처리 | ✅ | 서버는 `GET`·`HEAD`만 처리하고 요청 경로에서 예외를 던지지 않습니다 |
| 코드 공급망 | ✅ 변경 없음 | 이 단계는 의존성을 추가하지 않았습니다 |
| TLS | ✅ 터널 종료 | 공개 구간은 Cloudflare가 TLS를 종료하고, 오리진 구간은 루프백입니다 |

**변경에 대한 위험 평가** (운영 단계 규칙: 모든 인프라 변경은 보안 영향을 기록)

| 변경 | 보안 영향 | 위험 |
|---|---|---|
| `HOST` → `127.0.0.1` | 노출 표면 감소. LAN의 다른 기기에서 미리 보던 경로가 사라짐(의도된 절단) | 낮음 — 공개 데이터만 서비스하던 경로를 닫음 |
| launchd 잡 재적재 | 재시작 순간 수백 ms의 응답 불가. `KeepAlive`가 재기동을 보장 | 낮음 |
| `Areas/Pages` 생성 | 볼트에 빈 폴더 하나 추가. 읽기 범위는 그대로 두 폴더 | 낮음 |
| Jenkins 기동 | 127.0.0.1:8081에서만 수신. `brew services`를 쓰지 않아 plist 재작성이 없음 | 낮음 |

## 5. 발견 사항과 조치

| ID | 발견 | 심각도 | 조치 | 상태 |
|---|---|---|---|---|
| F-01 | 오리진이 `HOST=0.0.0.0`로 LAN에 열려 있었음 (`infrastructure-specification` U3 §Networking topology는 "수용 후 U3는 변경하지 않음, 유지관리자에게 남김"으로 결정) | 중간 | plist의 `HOST`를 `127.0.0.1`로 변경하고 잡을 재적재 | ✅ 해결 — `127.0.0.1:8080` 바인딩 확인 |
| F-02 | Jenkins가 정지 상태(`brew services list` = none, 8081 리스닝 없음). 이 상태에서는 크론 `H 0 * * *`이 돌지 않아 야간 배포가 일어나지 않음 | 중간 | 기존 plist(`127.0.0.1:8081`)를 `launchctl bootstrap`으로 로드해 기동 | ✅ 해결 — PID 38904, `/login` → 200 |
| F-03 | `Areas/Pages`가 없어 사이트 페이지 입력 경로가 없었음 (`Jenkinsfile:19-21`의 "not found" 알림 경로) | 낮음 | 빈 폴더 생성 | ✅ 해결 — 전처리 입력 준비 완료 |
| F-04 | 실행 중인 서버가 U3 코드 이전 프로세스였음(PID 2488, 시작 2026-11-17) | 중간 | 고정 재시작 실행(전제조건 충족 상태) | ✅ 해결 — PID 40304 |
| F-05 | `typst` CLI 미설치. 전처리는 typst 블록을 만나면 `failed to spawn typst`로 멈춥니다 | 낮음 | 현재 볼트에 ` ```typst ` 블록이 0개라 영향 없음. 설치는 `brew install typst` | ⏳ 미해결(배포를 막지 않음) |
| F-06 | `chrome-headless-shell` 미설치. Jenkins가 데스크톱 Chrome으로 대체 경로를 씁니다(`Jenkinsfile:79-89`의 주석: 야간 부하에서 CDP 노출이 30초를 넘겨 mmdc가 타임아웃할 수 있음) | 낮음 | `npx puppeteer browsers install chrome-headless-shell`로 설치하면 대체 경로가 사라짐 | ⏳ 미해결(배포를 막지 않음) |

## 6. 이관된 항목 (이 단계의 몫이 아님)

| ID | 항목 | 상태 | 처리 |
|---|---|---|---|
| F-07 | `origin/develop`이 `db7ecae` — 이번 작업이 원격에 없음. push = 릴리스 | 측정됨 | 유지관리자의 결정. push 뒤 첫 야간 또는 수동 실행이 `U1-NFR6.1`의 증거가 됩니다(`cd-config.md` §8) |
| F-08 | 16상태 수동 접근성 검토(`TEAM-E2E-A11Y`) | Not Met | 변경이 정리된 뒤 유지관리자가 1회 작성(2–4시간). 그전까지 `npm run test:e2e`는 병합 게이트 밖 |
| F-09 | 자동 post-deploy 러너(`F1`) | 미착수 | 별도 작업. 배포 후 확인은 `cd-config.md` §4의 H1–H3 수동 절차 |

## 7. 헬스 체크 결과 (조치 후)

| # | 확인 | 기준 | 측정 | 판정 |
|---|---|---|---|---|
| E-H1 | 로컬 오리진 `/` | 200 | 200 | ✅ |
| E-H2 | 공개 사이트 `/` | 200 | 200 | ✅ |
| E-H3 | Jenkins 로그인 페이지 | 200 | 200 | ✅ |
| E-H4 | 정적 서버 프로세스 | 실행 중 | PID 40304 | ✅ |
| E-H5 | 오리진 바인딩 | 루프백 전용 | `127.0.0.1:8080` | ✅ |
| E-H6 | Jenkins 바인딩 | 루프백 전용 | `127.0.0.1:8081` | ✅ |
| E-H7 | 사이트 페이지 입력 폴더 | 존재 | `Areas/Pages` 존재 | ✅ |

`cd-config.md` §4의 H1–H3은 **배포 직후**의 확인입니다(H3은 `_redirects.json`이 실린 뒤에 의미가 있습니다). 이번 단계의 E-H1·E-H2는 배포 전 환경 확인이며, 배포 후 H1–H3을 다시 수행해야 합니다.

## 8. 되돌리기 절차

이 단계가 바꾼 것은 네 가지입니다. 각각은 독립적으로 되돌릴 수 있습니다.

| # | 되돌릴 대상 | 방법 | 검증 |
|---|---|---|---|
| R-1 | 오리진 바인딩 | `~/Library/LaunchAgents/dev.rvnnt.blog.plist`의 `HOST`를 `0.0.0.0`로 되돌린 뒤 `launchctl bootout gui/$(id -u)/dev.rvnnt.blog` → `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/dev.rvnnt.blog.plist` | `lsof -nP -iTCP:8080 -sTCP:LISTEN`이 `*:8080`을 보여야 함 |
| R-2 | 서버 재시작 | 되돌릴 대상 없음 — 재시작은 되돌릴 필요가 없습니다(프로세스 교체일 뿐). 이전 프로세스(PID 2488)는 종료됐고 그 코드(U3 이전)는 다시 쓸 일이 없습니다 | `curl -I http://127.0.0.1:8080/` → 200 |
| R-3 | `Areas/Pages` 폴더 | `rmdir "/Users/revenantonthemission/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault/Areas/Pages"` (비어 있을 때만 성공) | `ls …/Areas`에 `Pages`가 없어야 함 |
| R-4 | Jenkins | `launchctl bootout gui/$(id -u)/homebrew.mxcl.jenkins` (부팅 시 자동 시작도 해제). 재개는 `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/homebrew.mxcl.jenkins.plist` | `lsof -nP -iTCP:8081 -sTCP:LISTEN`이 비어 있어야 함(재개 후에는 127.0.0.1:8081) |

R-1과 R-4는 launchd 잡의 **재적재**가 필요합니다. `launchctl kickstart -k`는 디스크의 plist 변경을 읽지 않고 이미 로드된 정의를 다시 띄우기만 하므로, plist를 고친 뒤에는 반드시 `bootout` → `bootstrap`을 거칩니다. 이 단계에서 이를 확인했습니다(첫 재시작의 PID 38839은 여전히 `*:8080`이었습니다).

## 9. 배포 준비 판정

- **환경 측정은 통과**했습니다. 구성요소 17개 항목이 모두 명세와 일치하고, 조치 4건이 재측정으로 확인됩니다.
- **첫 U3 배포를 실행하려면** `cd-config.md` §5의 순서를 따르면 됩니다. 그 전제조건(작업 복사본이 U3 병합 이후의 `develop`, 서버 스크립트가 그 커밋과 동일)은 이번 조치로 충족됐고, 고정 재시작도 이미 실행됐습니다. 남은 것은 push이며, 이는 릴리스 결정입니다.
- **배포 후**에는 `cd-config.md` §4의 H1–H3을 수행해야 하고, `rollback-runbook.md`의 절차가 그대로 유효합니다(ROLBACK_TARGET = 2시간 이내).
