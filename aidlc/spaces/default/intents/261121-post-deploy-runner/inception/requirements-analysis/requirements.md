# 요구사항 — 자동 post-deploy 러너

- **단계**: Requirements Analysis (`requirements-analysis`), 2026-11-21, `261121-post-deploy-runner`
- **질문과 답**: `requirements-analysis-questions.md` Q1~Q5 — Q1 C(로컬+공개 모두), Q2 C(홈 HTML 첫 글 링크), Q3 A(5회×1초), Q4 B(자동 revert+재배포), Q5 A(재귀 방지 플래그)
- **근거**: `project-description.json`, `codekb/obsidian-blog/{business-overview,architecture,code-structure}.md`, `inception/reverse-engineering/developer-scan.md`, 이전 인텐트의 `rollback-runbook.md`(T1·T2), `cd-config.md`(H1–H3)

## 1. 의도 분석

배포가 끝난 뒤 "사이트가 실제로 살아 있는지"를 사람이 매번 `curl`로 확인하던 수동 작업(`F1`)을 자동화한다. 두 배포 경로(Jenkins 야간 작업, 로컬 `just deploy`)는 `site/scripts/publish-dist.sh` 호출로 수렴하므로, 그 직후에 헬스 체크를 붙여 **배포 성공 여부를 게이트로 바꾼다**. 실패하면 정의된 롤백 트리거(T1/T2)에 따라 되돌리고 재배포한다.

성공 기준: 배포 직후 H1·H2·H3이 로컬 오리진과 공개 URL에서 자동 확인되고, 결과가 기록되며, 실패 시 자동 복구가 수행된다.

## 2. 기능 요구사항

### FR1. 배포 후 헬스 체크

| ID | 요구사항 | 인수 조건 |
|---|---|---|
| **FR1** | 러너는 게시 직후 정의된 헬스 체크를 수행한다 | Given 배포 완료, When 러너 실행, Then H1·H2·H3 결과가 모두 기록된다 |
| **FR1.1** | H1: `/` 가 HTTP 200인지 확인한다 | Given 웹 루트 갱신, When 요청, Then 200 |
| **FR1.2** | H2: 글 하나가 HTTP 200인지 확인한다 | 홈페이지 HTML에서 첫 글 링크를 파싱해 대상으로 쓴다(Q2 C) |
| **FR1.3** | H3: `/tags` 가 301 + `Cache-Control: no-cache`이고 `Location` 대상이 200인지 확인한다 | 테이블 재읽기 지연을 흡수하기 위해 5회 × 1초(총 5초) 재시도한다(Q3 A) |
| **FR1.4** | 로컬 오리진(`127.0.0.1:8080`)과 공개 URL(`https://rvnnt.dev`)을 모두 확인한다(Q1 C) | 각 오리진별로 H1–H3 결과를 구분해 기록 |
| **FR1.5** | 확인 결과(항목, 오리진, 상태, 시각, 재시도 횟수)를 사람이 읽을 수 있는 형태로 출력·기록한다 | 로그에 민감 정보(자격 증명 등)를 남기지 않는다 |

### FR2. 두 배포 경로 통합

| ID | 요구사항 | 인수 조건 |
|---|---|---|
| **FR2** | 러너는 Jenkins Deploy 스테이지와 로컬 `just deploy` 경로 모두에서 호출된다 | Given 어느 경로든 게시 완료, When 흐름이 끝나기 전, Then 러너가 실행된다 |
| **FR2.1** | 재귀 방지 수단을 제공한다(Q5 A) | `--no-post-check` 플래그가 있으면 헬스 체크와 자동 롤백을 건너뛴다 |
| **FR2.2** | 새 명령은 `Justfile` 또는 `site/scripts/`에 둔다 | `site/package.json`을 수정하지 않는다(justfile:46-48 review subject) |

### FR3. 실패 처리와 자동 복구

| ID | 요구사항 | 인수 조건 |
|---|---|---|
| **FR3** | 실패 항목을 롤백 트리거 T1/T2에 매핑한다 | Given H1/H2 실패, Then T1·P1. Given H3 실패, Then T2·P2 |
| **FR3.1** | 실패 시 `develop`의 최근 병합 커밋을 `git revert -m 1 --no-edit`로 되돌린다 | revert 커밋은 로컬에만 만들고 **push하지 않는다** |
| **FR3.2** | 되돌린 뒤 `just deploy --no-post-check`로 재배포한다(Q4 B + Q5 A) | 재귀 없이 한 번만 재배포하고, 성공 여부는 로그에 기록 |
| **FR3.3** | 최종 종료 코드는 검사 통과 0, 실패 non-zero다 | 재배포 성공/실패와 무관하게 원래 실패 이력을 non-zero로 보고한다 |
| **FR3.4** | 되돌릴 커밋을 찾지 못하거나 revert가 실패하면 자동 재배포를 중단하고 사람에게 알린다 | 부분 상태에서 추가 변경을 하지 않는다 |

### FR4. 테스트

| ID | 요구사항 | 인수 조건 |
|---|---|---|
| **FR4** | 각 요구사항에 최소 1개의 happy-path 단위 테스트를 둔다(express/Minimal) | 링크 파싱, 재시도, 결과 포맷, 트리거 매핑 각각에 테스트가 있다 |
| **FR4.1** | 기존 테스트 스위트를 변경 없이 통과시킨다 | `npm run test:unit`, `npm run test:pbt`, `cargo test --release` 등 기존 스위트가 깨지지 않는다 |

## 3. 비기능 요구사항

| ID | 요구사항 | 측정 |
|---|---|---|
| **NFR1** | 헬스 체크 전체(두 오리진 × 3검사 + 재시도 포함)는 60초 이내에 끝난다 | 실행 시간 측정 |
| **NFR2** | 자동 복구 중 외부 서비스 호출은 재배포(`just deploy`) 외에는 없다 | 코드 검토 |
| **NFR3** | 자격 증명·토큰·웹훅 URL을 코드나 로그에 남기지 않는다 | 코드·로그 검토 |
| **NFR4** | `site/package.json`과 접근성 검토 subject 파일을 변경하지 않는다 | review subject digest 불변 |

## 4. 제약

- **C1**: `develop` push = 릴리스. 자동 복구는 로컬 revert·재배포까지만 하고 push하지 않는다(`team.md`).
- **C2**: 롤백 트리거는 `rollback-runbook.md` T1(H1/H2, P1), T2(H3, P2)를 그대로 쓴다.
- **C3**: `site/package.json`은 review subject라 명령을 추가할 수 없다.
- **C4**: 두 배포 경로는 모두 `site/scripts/publish-dist.sh`를 호출한다(`Jenkinsfile:116`, `Justfile:29`).

## 5. 가정

- **A1**: 오리진이 `127.0.0.1:8080`에서, 터널이 `rvnnt.dev` → `http://127.0.0.1:8080`으로 동작한다(2026-11-21 실측).
- **A2**: 홈페이지 HTML에 글 링크가 존재한다(2026-11-21 실측).
- **A3**: H3의 301/`no-cache` 동작은 서버가 이미 구현했다(2026-11-21 수동 검증). 서버 구현 파일은 이번 집중 스캔 범위 밖이라 미재검증.
- **A4**: 되돌릴 대상은 `develop`의 가장 최근 병합 커밋이다(rollback-runbook §4 단계 1). 결정 규칙은 코드 생성에서 확정.
- **A5**: 공개 터널 실패도 자동 되돌림 트리거가 되는 위험을 수용한다(Q5 A에서 확인).

## 6. 범위 밖

- Jenkins 파이프라인 구조 변경, 스테이징 환경, 기능 플래그.
- `develop` 자동 push, 원격 Jenkins 작업 트리거.
- 16상태 수동 접근성 검토, Grafana·Slack 연동, 비용/드리프트 도구.
- 서버의 리디렉션 구현 수정(이 인텐트는 검증만 추가).

## 7. 열린 질문

- 러너 삽입 위치: `publish-dist.sh` 내부 호출 vs Jenkins/Justfile 양쪽 호출 — 코드 생성 설계로 넘김.
- revert 대상 병합 커밋의 식별 규칙(최근 병합 커밋 vs 배포 커밋) — 코드 생성에서 확정.
- 자동 재배포까지 실패했을 때의 2차 복구 — 사람 개입으로 제한(FR3.4).
