# 관측 설정 질문과 답변

- **단계**: Observability Setup (`observability-setup`), 2026-11-21 02:01 KST, `261115-personal-website`
- **작성자**: 운영 엔지니어 역할 (aidlc-operations-agent)
- **왜 다시 묻지 않았는가**: 골든 시그널, 발행 성공률·페이지 수 SLO, 대시보드의 위치, 로그 소스, 추적의 부재는 이미 `monitoring-design.md`와 `observability-design.md`(네 단위, 특히 U1·U3)에 구체적으로 정해져 있습니다. 이 단계는 새로 정해지지 않은 네 가지 운영 파라미터만 묻고, 나머지는 기록된 값으로 산출물을 채웁니다.
- **근거 문서**: 네 단위의 `construction/*/nfr-design/{performance-design,security-design,reliability-design}.md`, `construction/u1-publish-boundary/nfr-design/observability-design.md`, 네 단위의 `construction/*/infrastructure-design/{monitoring-design,infrastructure-specification}.md`(`monitoring-design`, `infrastructure-specification`), `operation/deployment-execution/{deployment-log,health-check-report}.md`, `construction/ci-pipeline/quality-gates.md`, `Jenkinsfile`, launchd plist 두 개.

## Q1. [운영 엔지니어] 오리진·터널의 가용성·지연시간 SLO를 정할까요?

U3의 모니터링 설계는 "오리진과 터널의 uptime·latency SLI는 Operation 단계에서 정한다"고 명시적으로 넘겨놨지만, 어느 문서에도 목표 수치가 없습니다. 지금은 발행 성공률(≥95%, 30일 롤링)과 배포 후 도달성(매 확인 100%)만 정의되어 있습니다.

- A. 새 SLO를 정하지 않는다 — 정적 사이트·단일 오리진이고 요청 수준 지표 수집기가 없으므로, 기존 발행 성공률·도달성·리디렉션 정확도 SLI만 유지한다
- B. 가용성 99.9%/30일 롤링만 추가한다 — 수동 확인 기록을 근거로 산정하고, 자동 측정기는 두지 않는다
- C. 가용성 99%/30일 롤링 + 지연 p95 2초를 추가한다 — 수동 확인 기록으로 산정한다
- D. 위 조합 외의 다른 목표
- X. Other (please specify)

[Answer]: B

답변: 오리진·터널의 가용성 SLO를 **99.9%/30일 롤링**으로 추가합니다. 단, 측정 근거는 유지관리자의 수동 확인 기록이며 자동 프로브는 두지 않습니다(Q1 B의 조건). 오류 예산은 0.1%(30일 약 43분)입니다.

## Q2. [운영 엔지니어] 대시보드를 어떤 수준으로 만들까요?

현재 "대시보드"는 Jenkins 작업 페이지(빌드 이력·스테이지 보기)입니다. API는 인증 없이 403을 반환해 자동 수집도 바로 되지 않습니다(`http://127.0.0.1:8081/job/obsidian-blog-develop/api/json` → 403).

- A. 문서화된 읽기 위치만 유지한다 — Jenkins 작업 페이지, 서버·터널 로그 파일, 배포 후 확인 표를 문서로 정리하고 새 도구를 추가하지 않는다
- B. 로컬 스크립트를 만든다 — 빌드 이력과 로그를 정기적으로 요약해 파일로 남긴다(cron 등록은 유지관리자 결정)
- C. 클라우드 대시보드를 도입한다 — CloudWatch/Grafana 등 새 서비스를 추가한다
- D. 위 조합 외의 다른 수준
- X. Other (please specify)

[Answer]: C

답변: 클라우드 대시보드를 도입합니다(Q2 C). 이 프로젝트에 AWS 계정·CloudWatch 설정이 없으므로, 외부 서비스(Grafana Cloud 등)와 로컬 수집기(Alloy) 조합을 기본안으로 설계합니다. 계정 생성·API 키·웹훅 등 자격 증명은 유지관리자가 별로 준비해야 하며 저장소에 커밋하지 않습니다.

## Q3. [운영 엔지니어] 로그 보존 기간을 어떻게 정할까요?

네 로그 파일의 현재 크기는 Jenkins error 3.5 KB, output 119 B, 서버 723 B, 터널 47 KB입니다. 회전·정리 설정은 어느 plist에도 없습니다.

- A. 기본값 유지 — macOS/Jenkins의 기본 동작에 맡기고 별도 정리를 하지 않는다
- B. 30일 보존 — 오래된 로그를 정리하는 절차(또는 스크립트)를 문서화한다
- C. 90일 보존 — 같은 절차를 90일 기준으로 문서화한다
- D. 위 조합 외의 다른 기간
- X. Other (please specify)

[Answer]: B

답변: 로그를 **30일간 보존**합니다(Q3 B). 외부 대시보드에 전송되는 로그의 보존도 30일로 맞추고, 로컬 로그의 정리 절차를 문서화합니다.

## Q4. [운영 엔지니어] 알림은 어떤 경로로 받을까요?

모니터링 설계의 모든 알림은 "유지관리자가 Jenkins 콘솔·로그·배포 후 요청을 직접 읽는다"는 수동 방식입니다. 저장소 소유자가 한 명이고 외부 알림 서비스는 없습니다.

- A. 기존 수동 확인만 유지 — 새 알림 채널을 만들지 않는다
- B. Jenkins 로컬 이메일 알림을 추가한다 — 빨간 빌드만 메일로 보낸다
- C. 외부 알림 서비스(Slack 등)를 연동한다
- D. 위 조합 외의 다른 경로
- X. Other (please specify)

[Answer]: C

답변: 외부 알림 서비스(Slack 등)를 연동합니다(Q4 C). 심각도별 경로를 정의하고, 웹훅 URL은 환경 변수·시크릿 저장소로 관리합니다. 이 단계는 설정안과 절차를 산출하며, 실제 자격 증명 발급과 서비스 가입은 유지관리자의 몫입니다.

## 기록되지 않은 판단 (사람에게 다시 묻지 않은 것)

- **골든 시그널**: 이미 명세되어 있습니다 — 발행 결과(성공/실패), 게시 글·사이트 페이지·자산 수, 배포 후 `/`·글의 HTTP 200, `/tags`의 301과 대상 200, 서버의 리디렉션 테이블 오류 라인(`monitoring-design.md`(U1·U3)).
- **추적(tracing)**: 적용 대상 없음. 프로세스 하나, 요청마다 파일을 스트리밍하는 정적 서버라 분산 추적이 없습니다(`observability-design.md` §1, `monitoring-design.md`(U1) §Logs). 산출물에는 "미적용"으로 기록합니다.
- **SLO 수치(발행·도달성·리디렉션)**: 이미 정해져 있습니다 — 발행 성공 ≥95%(30일 롤링, 소유자 귀책 PUB 제외), 배포 후 도달성 100%, 구주소 리디렉션 100%, 테이블 거부 0건(`observability-design.md` §5, `monitoring-design.md`(U3) §SLIs/SLOs).
- **알림 심각도와 롤백 경로**: P1(도달성 실패)·P2(Jenkins 실패·구주소 불일치·테이블 거부)와 되돌리기 절차가 이미 정의되어 있습니다(`monitoring-design.md`(U3) §Alerts, `rollback-runbook.md`).

## 측정된 현재 상태 (2026-11-21 02:01 KST)

| 관찰 | 값 | 의미 |
|---|---|---|
| 관측 소스 | Jenkins 작업 페이지·콘솔, `~/Library/Logs/obsidian-blog-server.log`(723 B), `~/Library/Logs/obsidian-blog-tunnel.log`(47 KB), `/opt/homebrew/var/log/jenkins/{output,error}.log` | 집계기·지표 저장소·알림 서비스 없음 |
| Jenkins API | `/job/obsidian-blog-develop/api/json` → 403 | 자동 수집은 인증 없이는 불가. 사람이 UI로 읽는다 |
| 로그 회전 | plist에 회전·보존 설정 없음 | Q3의 대상 |
| 현재 SLO 근거 | 발행 ≥95%/30일, 도달성·리디렉션 100%/확인마다 | `observability-design.md`, `monitoring-design.md` |
| 최근 배포 | 2026-11-21 01:27 `just deploy`, H1–H3 전부 통과 | `health-check-report.md` |
| 남은 신호 | 30일 운영 데이터가 없어 SLO 달성 여부 산정 불가 | `U1-SLO-NIGHTLY`, `U1-SLO-PAGECOUNT` |

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
