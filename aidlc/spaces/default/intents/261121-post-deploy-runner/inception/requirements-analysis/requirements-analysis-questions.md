# 요구사항 분석 질문과 답변

- **단계**: Requirements Analysis (`requirements-analysis`), 2026-11-21, `261121-post-deploy-runner`
- **작성자**: 프로덕트 매니저 역할 (aidlc-product-agent)
- **근거**: 인텐트 설명(`project-description.json`), `codekb/obsidian-blog/{business-overview,architecture,code-structure}.md`, `inception/reverse-engineering/developer-scan.md`, 이전 인텐트의 `rollback-runbook.md`(T1·T2), `cd-config.md`(H1–H3)

## Q1. [운영 엔지니어] 헬스 체크는 어느 오리진을 대상으로 할까요?

배포는 Mac 로컬에서 일어나고, 오리진(`127.0.0.1:8080`)과 공개 URL(`https://rvnnt.dev`)은 터널로 연결됩니다. 로컬 배포(`just deploy`)와 Jenkins 배포 모두 같은 웹 루트를 갱신합니다.

- A. 로컬 오리진(`127.0.0.1:8080`)만 확인한다 — 외부 네트워크 의존 없이 배포 결과를 즉시 검증한다
- B. 공개 URL(`https://rvnnt.dev`)만 확인한다 — 방문자가 실제로 보는 경로를 확인하지만 터널·DNS에 의존한다
- C. 둘 다 확인한다 — 로컬은 배포 검증, 공개는 터널까지의 도달성 확인
- D. 위 조합 외의 다른 대상
- X. Other (please specify)

[Answer]: C

답변: 로컬 오리진과 공개 URL을 모두 확인합니다. 로컬은 배포 결과 검증, 공개는 터널까지의 도달성 확인입니다.

## Q2. [품질 엔지니어] H2(글 하나 200)의 대상 URL을 어떻게 정할까요?

글 URL을 하드코드하면 글이 삭제·이름 변경될 때 러너가 깨집니다. 반대로 매번 동적으로 고르면 선택 규칙이 필요합니다.

- A. 고정 경로 하나를 설정값으로 둔다(예: `/posts/infrastructure-as-code`) — 가장 단순
- B. `sitemap-0.xml` 또는 `search-index.json`에서 첫 글 URL을 읽는다 — 빌드 산출물 기반
- C. 홈페이지 HTML에서 첫 글 링크를 파싱한다 — 사용자가 실제로 보는 링크
- D. 위 조합 외의 다른 규칙
- X. Other (please specify)

[Answer]: C

답변: 홈페이지 HTML에서 첫 글 링크를 파싱해 H2 대상으로 사용합니다. 하드코드된 경로가 글 삭제·이름 변경에 깨지지 않고, 사용자가 실제로 보는 링크를 확인합니다.

## Q3. [운영 엔지니어] H3(구주소 301) 재시도를 어떻게 할까요?

`publish-dist.sh`가 리디렉션 테이블을 `mv -f`로 교체한 직후 서버가 mtime 변화를 감지해 다시 읽기까지 짧은 지연이 있습니다. 즉시 1회 요청은 실패할 수 있습니다(개발자 스캔의 우려 2번).

- A. 5회 × 1초 간격으로 재시도한다(총 5초)
- B. 10회 × 0.5초 간격으로 재시도한다(총 5초)
- C. 재시도 없이 1회만 확인하고 실패를 보고한다
- D. 위 조합 외의 다른 정책
- X. Other (please specify)

[Answer]: A

답변: 5회 × 1초(총 5초) 재시도합니다. 리디렉션 테이블 재읽기 지연으로 인한 일시적 실패를 흡수하면서 대기 시간을 짧게 유지합니다.

## Q4. [릴리스 엔지니어] 검사 실패 시 러너는 어떻게 할까요?

T1(H1/H2 실패, P1)과 T2(H3 실패, P2)가 이미 정의되어 있습니다. 되돌리기는 `develop` revert + 재빌드이고 push가 릴리스입니다.

- A. 실패 항목과 트리거 ID(T1/T2)를 출력하고 non-zero로 종료한다 — Jenkins는 빨간색이 되고, 되돌림은 사람이 결정한다
- B. 자동으로 `git revert` + `just deploy`를 실행한다 — 사람 개입 없이 복구하지만 push가 수반된다
- C. 실패를 기록만 하고 exit 0으로 종료한다 — 배포는 계속 성공으로 표시
- D. 위 조합 외의 다른 처리
- X. Other (please specify)

[Answer]: B

답변: 자동으로 되돌리고 재배포합니다(Q4 B). 다만 이 선택은 두 가지 충돌을 만듭니다 — (1) 러너가 `just deploy` 안에서 호출되면 재배포 후 검사가 다시 실행되어 무한 재귀가 생길 수 있음, (2) 팀 규칙은 `just deploy`를 유지관리자의 허가 하에서만 실행하도록 함. Q5에서 처리 방식을 확정합니다.

## 기록되지 않은 판단 (사람에게 다시 묻지 않은 것)

- **삽입점**: 두 배포 경로가 `site/scripts/publish-dist.sh` 호출로 수렴한다는 사실(Jenkinsfile:116, Justfile:29)은 스캔으로 확인됐다. 러너를 `publish-dist.sh` 안에 둘지, 두 정의에서 각각 호출할지는 코드 생성 단계의 설계로 남긴다.
- **금지 사항**: `site/package.json`은 접근성 검토 subject라 명령을 추가할 수 없다(Justfile:46-48). 새 명령은 `Justfile`/`site/scripts/`에 둔다.
- **기존 검증**: H3의 301/`Cache-Control: no-cache` 동작은 2026-11-21 배포에서 수동으로 확인됐다(`health-check-report.md`). 서버 구현 파일은 이번 집중 스캔 범위 밖이라 미재검증 상태다.
- **테스트 전략**: express/Minimal — 요구사항별 단위 테스트(컴포넌트당 happy path 1개)와 기존 스위트 유지.

## Q5. [릴리스 엔지니어] Q4의 자동 되돌림에서 재귀와 팀 규칙 충돌을 어떻게 처리할까요?

Q4 B(자동 revert + `just deploy`)에는 두 충돌이 있습니다. (1) 러너가 `just deploy` 안에서 호출되면 재배포 후 검사가 다시 실행되어 무한 재귀가 생길 수 있습니다. (2) 팀 규칙은 `just deploy`를 유지관리자의 허가 하에서만 실행하도록 합니다. 이전 답(Q4 B)을 유지하면서 처리 방식을 정합니다.

- A. 재귀 방지 플래그(`--no-post-check`)를 두고 자동 revert + `just deploy` 유지 — 재배포 성공 여부는 로그에만 기록
- B. 자동 `git revert`만 하고 재배포는 사람이 수동으로 실행 — 팀 규칙 준수
- C. 공개 URL 실패(터널 문제)는 보고만 하고, 로컬 오리진 실패 시에만 자동 revert 실행
- D. 자동 되돌림을 취소하고 Q4 A(실패 출력 + non-zero, 사람이 결정)로 돌아간다
- X. Other (please specify)

[Answer]: A

답변: 재귀 방지 플래그를 두고 자동 revert + `just deploy`를 유지합니다. 재배포 시 검사를 건너뛰므로 무한 재귀가 없고, 재배포 성공 여부는 로그에만 기록합니다. 이번 선택이 로컬 `just deploy` 자동 실행에 대한 유지관리자의 명시적 허가입니다. 공개 터널 실패도 되돌림 트리거가 되는 위험은 수용된 것으로 기록합니다.
