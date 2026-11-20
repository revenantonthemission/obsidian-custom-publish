# 환경 프로비저닝 질문과 답변

- **단계**: Environment Provisioning (`environment-provisioning`), 2026-11-20, `261115-personal-website`
- **작성자**: 플랫폼 엔지니어 역할 (aidlc-aws-platform-agent)
- **왜 다시 묻지 않았는지**: 이 프로젝트에는 AWS 환경이 없습니다. 네 단위의 인프라 명세가 모두 "이 단위는 인프라를 추가하지 않는다"(U1·U2·U3·U4)와 "VPC·서브넷·보안 그룹·시크릿 관리자·교차 계정 연결이 없다"를 명시합니다. 따라서 이 단계의 네 주제 중 AWS에 해당하는 항목은 적용 대상이 아니며, 이 단계는 **검증 전용(validation-only)** 으로 진행합니다. 새로 만들 자원은 없고, 이미 존재하는 단일 macOS 환경이 인프라 명세와 맞는지 측정하고 확인하며, 앞 단계에서 답이 남지 않은 운영 파라미터 네 가지만 묻습니다.
- **근거 문서**: 네 단위의 `construction/{u1-publish-boundary,u2-writing-section,u3-writing-moves,u4-navigation}/infrastructure-design/infrastructure-specification.md`(`infrastructure-specification`), `construction/u1-publish-boundary/nfr-requirements/security-requirements.md`, `operation/deployment-pipeline/cd-config.md`(`cd-config`), `operation/deployment-pipeline/rollback-runbook.md`, `Jenkinsfile`, `Justfile`, `aidlc/spaces/default/memory/team.md`(`## Deployment`), `aidlc/spaces/default/memory/project.md`(Jenkins 시작 금지 규칙).

## Q1. [인프라 엔지니어] 원본 서버의 LAN 노출을 유지할까요, 닫을까요?

정적 서버가 `HOST=0.0.0.0`로 떠 있어 같은 네트워크의 어느 기기에서든 `http://<이 컴퓨터>:8080`으로 인증 없이 접속할 수 있습니다(측정: 포트 8080이 `*:8080`에서 리스닝). U3의 인프라 명세는 "U3는 이 노출을 바꾸지 않는다, 유지관리자에게 남긴다"로 결정했습니다.

- A. 유지 — `HOST=0.0.0.0` 그대로 두고 이 노출을 문서에만 남긴다
- B. 닫기 — `HOST=127.0.0.1`로 바꾸고 고정 재시작으로 반영한다. LAN에서 다른 기기로 미리 보는 용도가 사라진다
- C. 유지하되 별도 작업으로 이관 — 지금은 그대로 두고, 변경 여부를 별도 항목으로 남긴다
- D. 위 조합 외의 다른 처리
- X. Other (please specify)

[Answer]: B

답변: LAN 노출을 닫습니다 — `~/Library/LaunchAgents/dev.rvnnt.blog.plist`의 `HOST`를 `127.0.0.1`로 바꾸고 U3의 고정 재시작과 함께 반영합니다. LAN에서 다른 기기로 미리 보던 용도는 사라집니다.

## Q2. [운영 엔지니어] U3 고정 재시작을 언제 실행할까요?

서버 코드가 U3 커밋 `b147d7b`(2026-11-20 10:12) 이후 바뀌었지만, 실행 중인 프로세스(PID 2488)는 2026-11-17 00:53에 시작되어 아직 옛 코드입니다. U3의 이동 페이지를 처음 싣는 배포는 반드시 그 전에 재시작이 있어야 하며, 재시작의 전제조건(작업 복사본이 U3 병합 이후의 `develop`에 있고 서버 스크립트가 그 커밋과 같음)은 지금 모두 충족됩니다.

- A. 지금 실행 — 이 단계에서 작업 복사본(`develop`, `cf4993f`) 기준으로 재시작한다
- B. 배포 직전에 실행 — Deployment Execution 단계에서 첫 U3 배포 직전으로 미룬다
- C. 유지관리자가 직접 실행 — 이 단계는 절차와 전제조건만 기록한다
- D. 위 조합 외의 다른 시점
- X. Other (please specify)

[Answer]: A

답변: 지금 실행합니다 — 작업 복사본이 `develop`의 `cf4993f`이고 `site/scripts/local-server.mjs`와 `site/scripts/redirect-table.mjs`가 U3 커밋 `b147d7b` 이후 변경되지 않아 전제조건이 충족됩니다. 재시작 뒤에도 U3의 이동 페이지는 아직 배포되지 않았으므로(웹 루트에 `_redirects.json` 없음) 예전 주소는 그대로 200을 답합니다.

## Q3. [콘텐츠 담당자] 사이트 페이지 폴더(`Areas/Pages`)를 만들까요?

야간 전처리는 `Areas/Notes`(게시 글)와 `Areas/Pages`(사이트 페이지) 두 폴더만 읽습니다. 지금 `Areas/Pages`는 없어서 전처리가 "없음" 알림만 찍고 넘어갑니다. U1의 인프라 명세는 "첫 초록 실행 뒤 유지관리자가 만든다"로 남겨뒀습니다.

- A. 지금 빈 폴더를 만든다 — 이 단계에서 `Areas/Pages`를 생성한다(내용은 비어 있음)
- B. 나중에 만든다 — 지금은 만들지 않고, 사이트 페이지 게시는 보류로 둔다
- C. 다른 폴더를 사용한다 — 경로를 지정하면 `OBSIDIAN_PAGES_PATH`에 넣는다
- D. 위 조합 외의 다른 처리
- X. Other (please specify)

[Answer]: A

답변: 지금 빈 `Areas/Pages` 폴더를 만듭니다. 폴더는 비어 있으므로 사이트 페이지 수는 0이고, 전처리는 기존 `Areas/Notes`만 처리합니다.

## Q4. [릴리스 엔지니어] Jenkins를 언제 켜 두시겠습니까?

Jenkins(`127.0.0.1:8081`)는 지금 꺼져 있습니다(측정: 리스닝 없음, `brew services list`의 jenkins = none). 야간 작업이 0시에 도는 것은 Jenkins가 떠 있어야 합니다. 프로젝트 규칙상 `brew services start jenkins`는 금지입니다(포트 8080을 블로그에서 가져가며 plist를 다시 씁니다). 기존 LaunchAgent(`homebrew.mxcl.jenkins.plist`)는 이미 `--httpListenAddress=127.0.0.1 --httpPort=8081`로 설정되어 있어 그 정의 그대로 시작하면 안전합니다.

- A. 지금 시작하고 계속 켜 둔다 — 기존 plist 그대로 `launchctl kickstart`로 시작한다
- B. 필요할 때만 켠다 — 지금은 켜지 않는다. 꺼져 있는 날에는 야간 배포가 일어나지 않는다
- C. 다른 방식 — 직접 지시
- D. 위 조합 외의 다른 처리
- X. Other (please specify)

[Answer]: A

답변: 지금 시작하고 계속 켜 둡니다 — 프로젝트 규칙상 `brew services start jenkins`는 금지이므로, 기존 plist(`--httpListenAddress=127.0.0.1 --httpPort=8081`) 그대로 `launchctl kickstart`로 시작합니다. 이 정의는 `KeepAlive`라 프로세스가 죽으면 다시 뜹니다.

## 기록되지 않은 판단 (사람에게 다시 묻지 않은 것)

- **VPC·서브넷·보안 그룹·NACL**: 적용 대상 없음. 이 프로젝트는 단일 macOS 호스트의 정적 사이트이고, 네 단위의 인프라 명세가 모두 네트워크 자원을 없음으로 명시합니다(`infrastructure-specification.md` §Networking topology — "the site has no ingress of its own and no VPC, subnet or security group").
- **시크릿 관리자·파라미터 저장소**: 적용 대상 없음. 저장소와 웹 루트에 비밀은 없고, 환경이 쓰는 유일한 자격 증명은 Jenkins 에이전트의 SCM SSH 키(저장소 밖)와 `~/.cloudflared/e6c190a8-….json`(권한 `-r--------`)입니다. 새 비밀 주입 경로를 만들지 않습니다(`cd-config.md` §7).
- **교차 계정·교차 VPC 연결**: 적용 대상 없음. 이 환경의 동등한 경계는 "터널 → `http://127.0.0.1:8080` → 웹 루트"이고, 그 경계는 동작합니다(측정: `https://rvnnt.dev/` → 200, 로컬 `http://127.0.0.1:8080/` → 200).
- **환경 프로비저닝 자체**: 이 단계는 자원을 만들지 않습니다. `cd-config.md` §9와 네 단위 명세가 합의한 "IaC를 추가하지 않는다"를 그대로 따릅니다.

## 측정된 현재 상태 (2026-11-20 22:54 KST)

절차를 추측이 아니라 사실에 세우기 위해 이 시점에 환경의 구성요소를 확인했습니다.

| 관찰 | 값 | 의미 |
|---|---|---|
| 정적 서버 | launchd `dev.rvnnt.blog`, PID 2488, node v24.14.0, 시작 2026-11-17 00:53:24 | U3의 서버 코드 커밋 `b147d7b`(2026-11-20 10:12) **이전** 프로세스. 고정 재시작이 아직 일어나지 않았습니다 |
| 리스닝 포트 | 8080 → `*:8080`(LAN 노출), 8081 → 응답 없음(Jenkins 정지), 4329 → 비어 있음(HIG 로컬 게이트 포트) | Jenkins가 꺼져 있어 야간 작업이 현재는 돌지 않습니다. 로컬 게이트 포트는 비어 있습니다 |
| 터널 | launchd `dev.rvnnt.tunnel`, PID 2511, `~/.cloudflared/obsidian-blog.yml` → `rvnnt.dev` → `http://127.0.0.1:8080`, 자격 증명 파일 `-r--------` | 터널 → 오리진 경계가 정상입니다 |
| 웹 루트 | `/Users/revenantonthemission/Sites/obsidian-blog` — 2026-11-07 빌드, `tags/`·`graph/` 있음, `_redirects.json` 없음 | 라이브 사이트는 아직 U3 이전 상태입니다. U3의 이동 페이지는 배포된 적이 없습니다 |
| 라이브 응답 | 로컬 `/` → 200, `/tags` → 200, `/writing/tags` → 404, `/writing/graph` → 404 · 공개 `https://rvnnt.dev/` → 200, `/tags` → 200, `/writing/tags` → 404 | 공개 경로와 오리진이 같은 트리를 내고 있습니다 |
| 볼트 | `Areas/Notes` 있음, `Areas/Pages` 없음 | 사이트 페이지 입력 폴더가 아직 없습니다 |
| 작업 복사본 | `develop` @ `cf4993f`, `origin/develop`보다 70커밋 앞섬. `site/scripts/local-server.mjs`·`site/scripts/redirect-table.mjs`는 `b147d7b` 이후 변경 없음 | 재시작 전제조건은 충족되지만, push가 없으므로 아무것도 배포되지 않았습니다 |
| 도구 | node v24.14.0 ✓(plist 핀과 일치), just 1.59.0 ✓, cargo 1.100.0 ✓, d2 ✓, Chrome ✓, `chrome-headless-shell` 없음, `typst` 없음 | Jenkins의 Preprocess는 데스크톱 Chrome으로 대체 경로를 씁니다. 볼트에 typst 블록이 없어 `typst` 부재는 현재 영향이 없습니다 |

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
