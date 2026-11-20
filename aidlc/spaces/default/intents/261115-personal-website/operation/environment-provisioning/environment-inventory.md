# 환경 인벤토리 — `261115-personal-website`

- **단계**: Environment Provisioning (`environment-provisioning`), 2026-11-21 KST
- **역할**: 플랫폼 엔지니어 (aidlc-aws-platform-agent)
- **질문과 답**: `environment-provisioning-questions.md` (4개, 모두 답변됨 — Q1 LAN 노출 닫기, Q2 고정 재시작 지금 실행, Q3 `Areas/Pages` 생성, Q4 Jenkins 시작·유지)
- **상위 산출물**: 네 단위의 `construction/{u1-publish-boundary,u2-writing-section,u3-writing-moves,u4-navigation}/infrastructure-design/infrastructure-specification.md`(`infrastructure-specification`), `operation/deployment-pipeline/cd-config.md`(`cd-config`)
- **측정 시각**: 조치 전 2026-11-20 22:54 KST, 조치 후 2026-11-21 00:07 KST (2026-11-20T15:07:24Z)

## 1. 이 환경의 정체

이 프로젝트의 프로덕션 환경은 **AWS가 아니라 단일 macOS 호스트 한 대**입니다. `infrastructure-specification.md`(U1·U2·U3·U4)는 모두 "이 단위는 인프라를 추가하지 않는다", "VPC·서브넷·보안 그룹이 없다", "IaC가 필요 없다(Jenkinsfile과 Justfile이 파이프라인 정의다)"로 명시합니다. 따라서 이 단계는 자원을 만드는 단계가 아니라 **존재하는 환경의 목록과 검증**을 산출하는 단계로 수행했고, 유지관리자가 결정한 네 가지 운영 변경만 반영했습니다.

| 관점 | 내용 |
|---|---|
| 환경 수 | 1개 (프로덕션). 스테이징 없음 — `infrastructure-specification.md` §Environments, `cd-config.md` §1 |
| 컴퓨트 | 정적 사이트 빌드(Astro → `site/dist/`) + Node 정적 서버(`site/scripts/local-server.mjs`, 포트 8080) |
| 파이프라인 | Jenkins 작업 `obsidian-blog-develop` (크론 `H 0 * * *`, `origin/develop` 체크아웃) |
| 배포 대상 | `WEB_ROOT` = `/Users/revenantonthemission/Sites/obsidian-blog` |
| 외부 노출 경로 | Cloudflare Tunnel `obsidian-blog` → `http://127.0.0.1:8080` → `https://rvnnt.dev` |
| 데이터 입력 | iCloud 볼트의 `Areas/Notes`(게시 글)와 `Areas/Pages`(사이트 페이지) 두 폴더만 |
| IaC | 없음. 파이프라인 정의는 저장소의 `Jenkinsfile`·`Justfile`, 런타임 정의는 저장소 밖의 launchd plist 두 개 |
| 비용 | 청구 가능한 클라우드 자원이 없음 |

## 2. 구성요소 목록

| # | 구성요소 | 역할 | 식별 | 정의 위치 | 상태(조치 후) |
|---|---|---|---|---|---|
| E1 | 정적 파일 서버 | 오리진 | launchd `dev.rvnnt.blog`, node v24.14.0, PID **40304** | `~/Library/LaunchAgents/dev.rvnnt.blog.plist` | 실행 중, `127.0.0.1:8080` 바인딩 |
| E2 | Cloudflare Tunnel | 공개 인입 | launchd `dev.rvnnt.tunnel`, `cloudflared`, PID 2511 | `~/.cloudflared/obsidian-blog.yml` | 실행 중, `rvnnt.dev` → `http://127.0.0.1:8080` |
| E3 | Jenkins | 빌드·배포 파이프라인 | launchd `homebrew.mxcl.jenkins`, java, PID **38904** | `~/Library/LaunchAgents/homebrew.mxcl.jenkins.plist` | 실행 중, `127.0.0.1:8081` |
| E4 | 웹 루트 | 서비스 대상 트리 | `/Users/revenantonthemission/Sites/obsidian-blog` | `Jenkinsfile:17`(`WEB_ROOT`) | 2026-11-07 빌드(미배포 상태) |
| E5 | 볼트 입력 | 원본 글과 사이트 페이지 | `…/Obsidian Vault/Areas/Notes`, `…/Areas/Pages` | `Jenkinsfile:18,21`, `Justfile:8-9` | 둘 다 존재(`Pages`는 이번에 생성, 비어 있음) |
| E6 | 전처리 배치 | 볼트 → `content/` JSON | `preprocessor/target/release/obsidian-press` | `Jenkinsfile:89` | nightly Preprocess 단계에서 실행 |
| E7 | 사이트 빌드 | `content/` → `site/dist/` | `npx astro build` | `Jenkinsfile:103` | nightly Build Site 단계에서 실행 |
| E8 | 배포 스크립트 | 트리 반영(두 번의 복사) | `site/scripts/publish-dist.sh` | `Jenkinsfile:116`, `Justfile:29` | 두 배포 정의가 같은 스크립트를 호출 |
| E9 | 파이프라인 정의 | 단계·게이트·변수 | `Jenkinsfile`, `Justfile` | 저장소 | `cd-config.md` §2와 일치 |
| E10 | 테스트 도구 모음 | 브라우저·링크 스윕 | `site/scripts/hig/`, `site/scripts/crossunit/`, Playwright | 저장소 | HIG는 127.0.0.1:4329 사용(현재 비어 있음) |

**없음(명시적으로)**: 데이터베이스, 캐시, 큐, 검색 서비스, 오브젝트 스토리지, 로드 밸런서, VPC·서브넷·보안 그룹·NACL, 비밀 관리자·파라미터 저장소, 교차 계정/교차 VPC 연결. 근거: `infrastructure-specification.md` §Infrastructure Services(네 단위 모두 "None"/"Unchanged").

## 3. 실행 상태와 리스닝 포트 (조치 후 측정)

| 포트 | 바인딩 | 프로세스 | 판정 |
|---|---|---|---|
| 8080 | `127.0.0.1:8080` (IPv4) | node 40304 | ✅ 조치 전에는 `*:8080`(LAN 노출) — 이번 조치로 폐쇄 |
| 8081 | `127.0.0.1:8081` (IPv6) | java 38904 (Jenkins) | ✅ 조치 전에는 리스닝 없음 — 이번 조치로 기동 |
| 4329 | 비어 있음 | — | ✅ HIG 로컬 게이트가 쓰는 포트, 충돌 없음 |

- E1의 프로세스 시작 시각은 조치 후 2026-11-21 00:05 KST 입니다. 조치 전 프로세스(PID 2488)는 2026-11-17 00:53:24 시작으로, U3의 서버 코드 커밋 `b147d7b`(2026-11-20 10:12) **이전**이었습니다.
- E2는 조치 전후 모두 PID 2511로 동일합니다. 터널은 설정이 바뀌지 않았으므로 재시작이 필요 없었습니다.
- HTTP 응답(조치 후): 로컬 `http://127.0.0.1:8080/` → 200, 공개 `https://rvnnt.dev/` → 200. 터널 경계는 그대로 동작합니다.

## 4. 구성 파일과 경로

| 파일 | 역할 | 이 단계에서 한 일 |
|---|---|---|
| `~/Library/LaunchAgents/dev.rvnnt.blog.plist` | E1의 런타임 정의 (`HOST`, `PORT`, `ProgramArguments`, `RunAtLoad`, `KeepAlive`) | **`HOST`를 `0.0.0.0` → `127.0.0.1`로 변경** 후 재로드(Q1) |
| `~/Library/LaunchAgents/dev.rvnnt.tunnel.plist` | E2의 런타임 정의 | 변경 없음 |
| `~/.cloudflared/obsidian-blog.yml` | 터널 인입 규칙 | 변경 없음 |
| `~/Library/LaunchAgents/homebrew.mxcl.jenkins.plist` | E3의 런타임 정의 (`--httpListenAddress=127.0.0.1 --httpPort=8081`) | **재작성 없음**. 기존 정의를 그대로 로드(Q4) |
| `Jenkinsfile` | 파이프라인 정의(단계·변수·게이트) | 변경 없음 |
| `Justfile` | 로컬 절차(`deploy`, `crossunit`, `deploy-preprocess`) | 변경 없음 |
| `site/scripts/publish-dist.sh` | 배포 절차의 유일한 정의 | 변경 없음 |
| `site/scripts/local-server.mjs` | 서버 구현(U3 리디렉션 분기 포함) | 변경 없음(작업 복사본이 `develop` @ `cf4993f`) |

launchd plist 두 개(`dev.rvnnt.blog`, `homebrew.mxcl.jenkins`)는 저장소 밖에 있어 버전 관리 대상이 아닙니다. 이 단계가 바꾼 것은 그중 `dev.rvnnt.blog.plist`의 `HOST` 한 줄뿐이며, 되돌리는 방법은 `validation-report.md` §8에 적었습니다.

## 5. 입력 데이터 경로

| 입력 | 경로 | 읽기/쓰기 | 상태 |
|---|---|---|---|
| 게시 글 | `…/Obsidian Vault/Areas/Notes` | 읽기 + `published` 날짜 스탬핑(쓰기) | 존재. nightly Preprocess가 `--stamp-published`로 스탬핑 |
| 사이트 페이지 | `…/Obsidian Vault/Areas/Pages` | 읽기만(스탬핑 금지, NFR5.6) | **이번 조치로 생성**(빈 폴더). 전처리는 `0 site pages`로 집계 |
| 채팅형 볼트 필드 | `Areas/Threads`, `Areas/Learning` | 읽지 않음 | 존재하나 파이프라인이 읽지 않는 폴더 — 프로젝트 규칙 "전처리기를 볼트 전체에 돌리지 않는다"의 경계 |
| 픽스처 볼트 | `fixtures/vault/Notes`, `fixtures/vault/Pages` | 읽기(테스트) | 존재. Jenkins Verify는 이 쌍을 사용 |
| 빌드 산출물 | `./content/` → `site/public/*.json` → `site/dist/` | 생성 | nightly 단계가 갱신 |

`Areas/Pages`의 생성이 의미를 바꾸는 지점은 하나입니다. U1의 계약 C1에 따라 전처리는 두 폴더를 함께 읽으므로, 폴더가 없으면 "not found" 알림만 찍고 넘어가고(지금까지의 동작), 폴더가 있으면 비어 있는 목록으로 집계합니다. 어느 쪽이든 볼트의 다른 폴더는 읽히지 않습니다.

## 6. 도구 체인

| 도구 | 요구 버전·경로 | 측정 | 사용 위치 |
|---|---|---|---|
| node | plist 핀 `v24.14.0` | v24.14.0 ✅ (작업 복사본 셸과 동일) | E1, 사이트 빌드 |
| cargo | Verify의 `cargo test --release` | 1.100.0 ✅ | E6 |
| just | `just deploy`, `just crossunit` | 1.59.0 ✅ | 로컬 절차 |
| Chrome | `PUPPETEER_EXECUTABLE_PATH` 기본값 `/Applications/Google Chrome.app/...` | 존재 ✅ | Mermaid 렌더링(puppeteer/mmdc) |
| `chrome-headless-shell` | `~/.cache/puppeteer/chrome-headless-shell/*/…` | **없음** | Jenkins Preprocess가 데스크톱 Chrome으로 대체 경로를 사용(`Jenkinsfile:79-89`) |
| `d2` | D2 다이어그램 렌더러 | 존재 ✅ | 볼트의 D2 코드 블록 다수 |
| `typst` | Typst 다이어그램 렌더러 | **없음** | 볼트에 ` ```typst ` 블록이 0개 → 현재 영향 없음. 블록이 추가되면 전처리가 `PUB`-계열 오류로 멈춘다 |

## 7. 비밀과 자격 증명

| 항목 | 위치 | 권한·상태 | 취급 |
|---|---|---|---|
| 터널 자격 증명 | `~/.cloudflared/e6c190a8-7f6e-4138-beb6-5f6a62763643.json` | `-r--------` (소유자만) | 읽지 않았고, 이 단계에서 변경하지 않았습니다 |
| SCM 체크아웃 키 | Jenkins 에이전트(저장소 밖) | 이 단계에서 확인 불가 | 변경 없음. 새 키·토큰을 만들지 않았습니다 |
| 볼트 경로·포트 | `Jenkinsfile`의 환경 변수 | 평문 경로(비밀 아님) | 변경 없음 |
| 저장소·웹 루트 | `site/dist/`, `~/Sites/obsidian-blog` | 공개 읽기 대상 | 비밀을 담지 않습니다. `_redirects.json`도 공개 파일이므로 안전은 접근 통제가 아니라 서버의 문법 검증에 달려 있습니다(`infrastructure-specification.md` §Redirect table) |

## 8. 네트워크 경계

```
방문자 ──HTTPS──▶ Cloudflare (rvnnt.dev) ──터널──▶ http://127.0.0.1:8080 ──▶ 정적 서버 ──▶ ~/Sites/obsidian-blog
```

- 터널 인입은 `http://127.0.0.1:8080` 하나뿐이며, 그 외 경로는 404입니다(`~/.cloudflared/obsidian-blog.yml:4-7`).
- 오리진은 조치 전 `0.0.0.0:8080`이라 같은 네트워크에서 인증 없이 `http://<이 컴퓨터>:8080`으로 접근할 수 있었습니다. 유지관리자의 결정(Q1, 답 B)에 따라 `127.0.0.1`로 바인딩하여 **LAN 직접 경로를 닫았습니다**. 그 결과 LAN의 다른 기기에서 미리 보는 용도는 더 이상 동작하지 않습니다.
- 오리진은 `GET`과 `HEAD`만 처리하며, 서버는 요청 경로에서 예외를 던지지 않습니다(`infrastructure-specification.md` §Infrastructure Services).

## 9. 이 단계가 수행한 프로비저닝

| # | 조치 | 근거 | 결과(재측정) |
|---|---|---|---|
| P1 | `dev.rvnnt.blog.plist`의 `HOST`를 `127.0.0.1`로 변경 | Q1 답 B | 포트 8080 바인딩이 `*:8080` → `127.0.0.1:8080` |
| P2 | launchd 재적재(`bootout` → `bootstrap`)로 새 `HOST` 반영, U3 고정 재시작 실행 | Q2 답 A | 새 PID 40304. U3 서버 코드를 실행 중 |
| P3 | `Areas/Pages` 빈 폴더 생성 | Q3 답 A | 폴더 존재(빈 상태). 전처리 대상 준비 완료 |
| P4 | 기존 Jenkins plist를 `launchctl bootstrap`으로 로드해 기동 | Q4 답 A | PID 38904, `127.0.0.1:8081`, `/login` → 200 |

P2에는 예상 밖의 단계가 하나 있었습니다. `launchctl kickstart -k`는 **이미 로드된 잡의 정의**로 프로세스를 다시 띄우므로, 디스크의 plist를 고친 뒤에는 반영되지 않았습니다(첫 재시작의 PID 38839은 여전히 `*:8080`으로 리스닝). plist 변경을 반영하려면 `launchctl bootout` 후 `launchctl bootstrap`으로 잡을 다시 등록해야 하며, 그 뒤부터 PID 40304가 `127.0.0.1:8080`에만 바인딩됩니다.

## 10. 변경하지 않은 것

- **Jenkins plist 재작성 금지**: `brew services start jenkins`는 plist를 다시 써서 포트 8080을 블로그에서 가져갑니다(프로젝트 규칙). 그래서 `launchctl bootstrap`으로 기존 정의를 그대로 로드했습니다. `brew services list`의 jenkins 항목도 `started`로 바뀝니다.
- **터널 설정·자격 증명·웹 루트 내용**: 그대로입니다. 웹 루트는 여전히 2026-11-07 빌드이며 U3의 이동 페이지와 `_redirects.json`은 배포된 적이 없습니다.
- **저장소 코드**: 이 단계는 `site/`·`preprocessor/`·`Jenkinsfile`·`Justfile`을 고치지 않았습니다.
- **볼트 내용**: `Areas/Pages` 폴더만 만들었고, 어떤 파일도 쓰거나 고치지 않았습니다. `Areas/Notes`의 스탬핑도 하지 않았습니다(그것은 nightly Preprocess의 몫입니다).
- **비용**: 청구 가능한 자원이 없어 비용 변화가 없습니다.
