# 피드백·최적화 질문과 답변

- **단계**: Feedback & Optimization (`feedback-optimization`), 2026-11-21 11:15 KST, `261115-personal-website` (마지막 단계)
- **작성자**: 운영 엔지니어 역할 (aidlc-operations-agent)
- **왜 다시 묻지 않았는가**: SLO 목표·알림 임계값은 `slo-config.md`·`alarms.md`에, 배포 결과는 `deployment-log.md`에, 성능 측정은 `test-results.md`에, 사고 절차는 `incident-plan.md`에 이미 있습니다. 이 단계는 그 결과를 **다음 주기로 되돌리는 방식**만 묻습니다.
- **근거 문서**: `operation/observability-setup/{dashboards,alarms,slo-config}.md`(`dashboards`, `alarms`, `slo-config`), `operation/deployment-execution/deployment-log.md`(`deployment-log`), `operation/performance-validation/test-results.md`(`test-results`), `operation/incident-response/incident-plan.md`(`incident-plan`), `operation/performance-validation/load-test-plan.md`

## Q1. [운영 엔지니어] SLO 보고는 언제 시작할까요?

30일 운영 데이터가 아직 없습니다. 첫 배포는 2026-11-21에 있었고, 야간 작업은 `origin/develop`이 `db7ecae`인 동안 예전 커밋을 배포합니다.

- A. 지금은 기준선만 기록하고 30일이 쌓인 뒤 첫 준수율 보고를 작성한다
- B. 매월 1일 보고를 시작하고, 데이터 부족 구간은 "미산정"으로 표시한다
- C. 지금 즉시 보고서를 쓰고 현재 상태(미산정)를 기록한다
- D. 위 조합 외의 다른 처리
- X. Other (please specify)

[Answer]: A

답변: 30일 운영 데이터가 쌓인 뒤 첫 SLO 준수율 보고를 작성합니다. 그 전에는 `slo-report.md`에 기준선과 "미산정" 상태만 기록합니다.

## Q2. [운영 엔지니어] 비용은 어디까지 추적할까요?

이 프로젝트에는 AWS 자원이 없어 클라우드 비용이 0입니다. 새로 설계된 외부 서비스(Grafana Cloud, Slack)는 무료 티어로 시작합니다.

- A. 클라우드 비용 없음으로 기록하고 외부 서비스 비용은 추적하지 않는다
- B. Grafana Cloud·Slack 등 외부 서비스의 월 비용만 기록한다(무료 티어 포함)
- C. 별도 비용 모니터링 도구를 도입한다
- D. 위 조합 외의 다른 처리
- X. Other (please specify)

[Answer]: C

답변: 별도 비용 모니터링 도구를 도입합니다(Q2 C). AWS 비용은 0이지만 Grafana·Slack 등 외부 서비스의 청구액을 한 곳에서 추적하기 위한 설정안을 `cost-analysis.md`에 담습니다. 도구 설치·계정 연동은 유지관리자 작업입니다.

## Q3. [운영 엔지니어] 설정 드리프트는 어떻게 감지할까요?

launchd plist 두 개는 저장소 밖에 있고, `dev.rvnnt.blog.plist`의 `HOST`는 이번 단계에서 직접 바꿨습니다. git으로는 이 변경을 추적할 수 없습니다.

- A. 수동 점검만 유지 — 배포 후 확인과 월 1회 plist 검토로 충분
- B. 저장소 설정과 실행 환경을 비교하는 스크립트를 만든다
- C. 외부 드리프트 감지 서비스를 도입한다
- D. 위 조합 외의 다른 처리
- X. Other (please specify)

[Answer]: C

답변: 외부 드리프트 감지 서비스를 도입합니다(Q3 C). launchd plist·웹 루트·터널 설정의 불일치를 감지하는 설정안을 `drift-report.md`에 담고, 실제 서비스 연동은 유지관리자 작업으로 남깁니다.

## Q4. [운영 엔지니어] 운영 인사이트를 어디로 되돌릴까요?

이 워크플로가 끝나면 다음 이터레이션이 올 수 있습니다. 고장 징후·반복 작업·개선 아이디어의 전달 위치가 필요합니다.

- A. `feedback-loop.md` 한 파일에 기록하고, 다음 intent를 시작할 때 참고한다
- B. 별도 백로그 파일을 만들어 다음 이터레이션의 입력으로 쓴다
- C. 자동으로 다음 intent를 만든다
- D. 위 조합 외의 다른 처리
- X. Other (please specify)

[Answer]: A

답변: 운영 인사이트는 `feedback-loop.md` 한 파일에 기록하고, 다음 intent를 시작할 때 참고합니다. 자동 intent 생성이나 별도 백로그 파일은 만들지 않습니다.

## 기록되지 않은 판단 (사람에게 다시 묻지 않은 것)

- **SLO 달성 여부**: 30일 신호가 없어 산정 불가. `U1-SLO-NIGHTLY`, `U1-SLO-PAGECOUNT`, 신규 가용성 SLO 모두 미산정으로 기록합니다(`slo-config.md`).
- **배포·성능 결과**: H1–H3 통과, 빌드 35.18초/260페이지를 새 기준선으로 채택, 설정된 성능 목표 모두 충족(`deployment-log.md`, `test-results.md`).
- **사고**: 아직 실제 사고 없음. 런북과 에스컬레이션 표만 준비됨(`incident-plan.md`).
- **자동화할 토일**: 자동 post-deploy 러너(`F1`)와 체크 기록 내보내기, k6 실행이 남아 있습니다. 모두 별도 작업으로 기록합니다.

## 측정된 현재 상태 (2026-11-21 11:15 KST)

| 관찰 | 값 |
|---|---|
| 공개 사이트 | `/` 200(0.908 s), 글 200(1.193 s), `/writing/tags` 200 |
| 실행 중 서비스 | 오리진 PID 40304, 터널 PID 2511, Jenkins PID 38904 |
| `origin/develop` | `db7ecae` — 이번 작업 미push. push = 릴리스, 유지관리자 결정 |
| 외부 서비스 비용 | 청구된 금액 없음(Grafana·Slack 미가입) |
| 미해결 게이트 | `TEAM-E2E-A11Y`, `U1-NFR6.1`, 두 SLO, 자동 러너 F1 |

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
