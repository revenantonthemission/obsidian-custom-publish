# 알림 설정 — `261115-personal-website`

- **단계**: Observability Setup (`observability-setup`), 2026-11-21 KST
- **결정**: Q4 C — 외부 알림 서비스(Slack) 연동
- **상위 산출물**: 네 단위의 `construction/*/nfr-design/{performance-design,security-design,reliability-design}.md`, `construction/*/infrastructure-design/{monitoring-design,infrastructure-specification}.md`(`monitoring-design`, `infrastructure-specification`), `operation/deployment-execution/health-check-report.md`

## 1. 경로

```
Grafana Alerting ──▶ Slack 웹훅 ──▶ 유지관리자
        ▲                 ▲
    Loki/Prometheus   환경 변수 SLACK_WEBHOOK_URL
```

웹훅 URL은 환경 변수 또는 유지관리자의 시크릿 저장소에 두고 **저장소에 커밋하지 않습니다**. 유일한 소유자 구조라 외부 에스컬레이션 경로는 없습니다(`rollback-runbook.md` §3).

## 2. 알림 규칙

| # | 조건 | 임계값 | 심각도 | 채널 | 근거 |
|---|---|---|---|---|---|
| A1 | 체크 후 `/` 또는 글이 200이 아님 | 1회 실패 | P1 | Slack 즉시 | `monitoring-design.md`(U3) 배포 후 도달성 실패 |
| A2 | 구주소 `/tags`가 301이 아니거나 대상이 200이 아님 | 1회 실패 | P2 | Slack 즉시 | `monitoring-design.md`(U3) 레거시 주소 불일치 |
| A3 | 오리진·터널 확인 실패 | 1회 실패 | P2 | Slack 즉시 | S6 99.9%/30일 — 임계값을 목표 아래에 둠 |
| A4 | Jenkins 빌드 FAILURE(Verify·Build Site 포함) | 1회 | P2 | Slack | `monitoring-design.md`(U1) 야간 빌드 실패 |
| A5 | 서버 로그에 리디렉션 테이블 오류 라인 | 1회 | P2 | Slack | `monitoring-design.md`(U3) 테이블 거부 |
| A6 | 요약 줄 `<M> site pages`가 의도와 불일치 | 1회 | P3 | Slack | `reliability-design.md` §2, `monitoring-design.md`(U1) |
| A7 | 30일 롤링 S6 준수율 < 99.9% | 1회 산정 | P2 | Slack | `slo-config.md` §4 |
| A8 | `npm run test:e2e`가 접근성 기록 만료로 거부 | 1회 | P3 | Slack | `monitoring-design.md`(U3) 수동 검토 deadline |

## 3. 임계값 설계 원칙

- **증상 기준**: CPU·디스크 같은 원인이 아니라 사용자에게 보이는 실패(비-200, 404, 빨간 빌드)를 알립니다.
- **SLO 아래에서 알림**: 99.9% 목표보다 이른 1회 실패에서 알립니다. 30일 43분 예산은 하루 1회 확인으로 정밀 측정이 불가능하므로(자동 프로브 없음) 조기 경고가 유일한 수단입니다.
- **평가 주기**: 이벤트 기반(A1·A2·A5·A8는 확인 직후, A4는 빌드 종료 시), 일일(A3·A6), 30일 롤링 산정(A7).
- **노이즈 억제**: 같은 규칙이 1시간 내 재발하면 Slack 스레드로 묶습니다. 자동 복구(remediation)는 두지 않습니다 — 되돌리기는 사람이 결정합니다(`rollback-runbook.md`).

## 4. 심각도·대응

| 심각도 | 정의 | 대응 |
|---|---|---|
| P1 | 사이트 전체 도달 불가 | 즉시 `rollback-runbook.md` 실행. 목표 2시간 이내 |
| P2 | 기능 저하(구주소, 테이블, 빌드) | 당일 확인, 필요 시 되돌림 |
| P3 | 관측상 이상(페이지 수, 검토 만료) | 다음 근무时间在 확인 |

P1·P2는 운영 단계 규칙에 따라 사후 분석을 남깁니다(사고 48시간 내, 타임라인·원인·재발 방지). 저장소 소유자가 한 명이므로 지정자 없이 본인이 기록합니다.

## 4a. 실제 규칙 쿼리 (PromQL)

Grafana-managed 규칙은 **Query A가 비어 있으면 `DatasourceError`가 발화**합니다(`no expression found in input`). 아래 쿼리를 그대로 넣고, **Configure no data and error handling → No data: OK**로 두세요. 지표 내보내기가 없는 동안 No data를 Alerting으로 두면 규칙 자체가 계속 깨진 상태로 알립니다.

| 용도 | 데이터 소스 | Query A | 조건 | 현재 |
|---|---|---|---|---|
| Alloy 자체 감시(지금 바로 사용) | Prometheus(`grafanacloud-prom`) | `up` | `WHEN last() OF A IS BELOW 1` | 동작 — Alloy self metrics가 전송 중 |
| H1/H2 도달성 실패 | Prometheus | `post_deploy_check_result{check=~"H1|H2"} == 0` | `WHEN last() OF A IS ABOVE 0` | 지표 없음 → No data: OK |
| H3 구주소 리디렉션 실패 | Prometheus | `post_deploy_check_result{check="H3"} == 0` | `WHEN last() OF A IS ABOVE 0` | 지표 없음 → No data: OK |
| Jenkins 실패(로그 기반) | Loki | `count_over_time({filename=~"/opt/homebrew/var/log/jenkins/.*"} |= "FAILURE" [5m]) > 0` | `WHEN last() OF A IS ABOVE 0` | 로그 전송 중 — 파일명 라벨 확인 필요 |
| 가용성 SLO 예산 | Prometheus | `1 - avg_over_time(post_deploy_check_result[30d])` | `WHEN last() OF A IS ABOVE 0.001` | 지표 없음 → No data: OK |

`post_deploy_check_result`는 아직 존재하지 않는 지표입니다. F-7러너가 H1/H2/H3 결과를 내보내는 확장이 필요하며, 그 전까지는 위 규칙들을 **만들지 않거나 비활성**으로 두고 `up` 규칙만 운영합니다. 지표 스키마는 `check`=`H1|H2|H3`, `origin`=`local|public`, 값 0/1로 정합니다.

## 5. 구현 상태

| 항목 | 상태 |
|---|---|
| Grafana Alerting 규칙 JSON | 이 문서의 표로 정의. 실제 등록은 계정 생성 후 유지관리자 작업 |
| Slack 웹훅 | 미발급(Q4 C) |
| 자동 복구 액션 | 만들지 않음(사람이 되돌림 결정) |
| PagerDuty·온콜 로테이션 | 만들지 않음(1인 소유) |

## 6. 기존 알림과의 관계

`monitoring-design.md`의 알림 표는 "유지관리자가 Jenkins 콘솔·로그·배포 후 요청을 직접 읽는다"는 수동 방식을 정했습니다. Q4 C는 그 **전달 경로만 Slack으로 바꿉니다**. 확인 절차(H1–H3), 심각도, 되돌림 트리거는 그대로입니다.
