# 대시보드 구성 — `261115-personal-website`

- **단계**: Observability Setup (`observability-setup`), 2026-11-21 KST
- **결정**: Q2 C — 클라우드 대시보드 도입
- **상위 산출물**: 네 단위의 `construction/*/nfr-design/{performance-design,security-design,reliability-design}.md`, `construction/*/infrastructure-design/{monitoring-design,infrastructure-specification}.md`(`monitoring-design`, `infrastructure-specification`), `operation/deployment-execution/health-check-report.md`

## 1. 선택한 스택

| 계층 | 선택 | 이유 |
|---|---|---|
| 대시보드·지표·로그 저장 | Grafana Cloud(Q2 C) | 이 프로젝트에 AWS 계정·CloudWatch 설정이 없고, 기존 관측 소스는 Jenkins 콘솔과 4개 로그 파일뿐입니다. 외부 서비스 중 가장 적은 설정으로 지표·로그·알림을 한 곳에 모을 수 있는 조합입니다 |
| 로컬 수집기 | Grafana Alloy(Mac, launchd) | 로그 파일을 Loki로, 체크 기록을 Prometheus 원격 기록으로 전송합니다. 기존 launchd 서비스 두 개와 같은 패턴으로 등록 가능 |
| 알림 | Grafana Alerting → Slack(Q4 C) | `alarms.md` 참조 |
| 추적 | 미적용 | `tracing-config.md` 참조 |

**CloudWatch·X-Ray를 쓰지 않는 이유**: 이 환경은 AWS 자원이 없고(`infrastructure-specification` §Infrastructure Services), CloudWatch로 보낼 지표도 없습니다. AWS 자격 증명을 새로 만들지 않는다는 기존 결정(`cd-config.md` §7)도 유지합니다.

## 2. 데이터 소스

| 소스 | 전송 내용 | 수집기 설정 |
|---|---|---|
| `~/Library/Logs/obsidian-blog-server.log` | 서버 요청·리디렉션 테이블 오류 라인 | Alloy `local.file_match` + `loki.source.file` |
| `~/Library/Logs/obsidian-blog-tunnel.log` | 터널 연결 상태 | 동일 |
| `/opt/homebrew/var/log/jenkins/{output,error}.log` | Jenkins 프로세스 로그 | 동일(읽기 권한 확인 필요) |
| Jenkins 작업 콘솔 | 발행 요약 줄 `<N> posts, <M> site pages, <K> assets`, 알림·진단 줄 | 수동 확인 기록에요약을 붙여 전송 |
| `~/Library/Logs/obsidian-blog/checks.jsonl` | H1·H2·H3·공개 확인 결과 | 전용 내보내기 스크립트가 Prometheus 원격 기록으로 전송(미착수) |

보존 기간은 Q3 B에 따라 **30일**입니다. external 스토리지의 retention도 30일로 설정합니다.

## 3. 대시보드 레이아웃

```
┌───────────────────────────────────────────────────────────────┐
│ 1행  S6 가용성 99.9% 게이지 │ 오류 예산 잔여(분) │ 최근 체크 결과 │
├───────────────────────────────────────────────────────────────┤
│ 2행  S1 발행 성공률(30일) │ S2 페이지 수 │ S3 도달성 │ S4 리디렉션 │
├───────────────────────────────────────────────────────────────┤
│ 3행  일일 발행 글 수 추이 │ 전처리 소요 시간 │ 자산 수 추이      │
├───────────────────────────────────────────────────────────────┤
│ 4행  로그 오류 라인(5분 버킷) │ 테이블 거부 라인 │ 최근 배포 표식  │
└───────────────────────────────────────────────────────────────┘
```

| 행 | 패널 | 지표/쿼리 | 근거 |
|---|---|---|---|
| 1 | 가용성 게이지 | `sum(check_success)/sum(check_total)` 30일 | S6, Q1 B |
| 1 | 오류 예산 | `43.2분 - realtime` 계산 패널 | `slo-config.md` §2 |
| 1 | 최근 체크 | H1/H2/H3/공개 결과 표 | `health-check-report.md` §2 |
| 2 | 발행 성공률 | Jenkins 결과 카운트 / 총 실행 | `observability-design.md` §5 |
| 2 | 페이지 수 | 요약 줄 `<M>` 파싱 | `monitoring-design.md`(U1) |
| 2–3 | 도달성·리디렉션·테이블 | 체크 기록 라벨별 성공률 | `monitoring-design.md`(U3) |
| 3 | 발행 글 수 | 요약 줄 `<N>` 추이, 기준선과 비교 | `monitoring-design.md`(U1) |
| 3 | 전처리 시간 | Jenkins 스테이지 시간, 기준 ≤1.5× | `reliability-design.md` §4 |
| 4 | 오류 로그 | `count_over_time({job="blog-server"} |= "error" [5m])` | `log-queries.md` |

## 4. 설치·설정 순서(유지관리자 작업)

1. Grafana Cloud 계정 생성 후 API 키 발급 → 환경 변수 `GRAFANA_CLOUD_API_KEY`.
2. Alloy 설치 → `/etc`가 아닌 사용자 영역(`~/.config/alloy/`)에 설정 파일 배치, launchd 등록.
3. Loki·Prometheus 원격 기록 엔드포인트를 환경 변수로 주입(저장소에 넣지 않음).
4. 위 4행 대시보드를 Grafana에 JSON으로 import.
5. 한 번 수동 배포 후 패널에 데이터가 들어오는지 확인.

이 단계는 **설정안만** 산출합니다. 계정 생성, 키 발급, 서비스 설치는 유지관리자의 몫이며, 자격 증명을 저장소에 커밋하지 않습니다(`security-design.md`의 비밀 취급 원칙).

## 5. 적용하지 않은 것

| 항목 | 이유 |
|---|---|
| CloudWatch Dashboard·Metrics | AWS 계정·지표가 없음(§1) |
| CloudWatch Synthetics canary | Q1 B가 자동 프로브를 두지 않기로 결정 |
| X-Ray | 분산 서비스가 없음(`tracing-config.md`) |
| 스크린샷 비교 베이스라인 | 팀 규칙: 두지 않음 |
| 30일 초과 보존 | Q3 B(30일) |
