# 에스컬레이션 매트릭스 — `261115-personal-website`

- **단계**: Incident Response (`incident-response`), 2026-11-21 KST
- **결정**: Q2 A — 단일 소유자 유지, 외부 에스컬레이션 경로 없음
- **상위 산출물**: `operation/observability-setup/{dashboards,alarms}.md`(`dashboards`, `alarms`), 네 단위의 `construction/*/nfr-design/{reliability-design,security-design}.md`(`reliability-design`, `security-design`), `construction/*/infrastructure-design/infrastructure-specification.md`(`infrastructure-specification`), `rollback-runbook.md` §3

## 1. 연락처와 경로

| 심각도 | 1차 대응 | 30분 경과 | 1시간 경과 | 채널 |
|---|---|---|---|---|
| P1 | 저장소 소유자(단 1인) | 없음 | 없음 | Slack 자기 채널 + 알림 |
| P2 | 저장소 소유자 | 없음 | 없음 | Slack |
| P3 | 저장소 소유자 | 없음 | 없음 | Slack |

`rollback-runbook.md` §3이 정한 대로 **외부 에스컬레이션 경로가 없습니다**. 보조 연락처·온콜 로테이션·인시던트 커맨더는 만들지 않았습니다(Q2 A).

## 2. 심각도 판정 기준

| 심각도 | 조건 | 대표 런북 |
|---|---|---|
| P1 | `/` 또는 글이 200이 아님, 서버·터널 프로세스 없음 | RB-1·RB-7·RB-8 |
| P2 | 구주소 301 실패, 테이블 거부, 빨간 빌드 | RB-2·RB-3·RB-4 |
| P3 | 글 수 불일치, 링크 404, Jenkins 꺼짐 | RB-5·RB-6·RB-9 |

판정 근거는 `alarms.md` §2와 `runbooks.md` §1입니다.

## 3. 대응 시간

| 심각도 | 목표 | 근거 |
|---|---|---|
| P1 | RTO 2시간 이내 복구 | Q1 A, 롤백 런북 §6 |
| P2 | 당일 확인·조치 | `alarms.md` §4 |
| P3 | 다음 근무 시간 | `alarms.md` §4 |

## 4. 알림 전달 사슬

```
탐지(Slack 알림 또는 직접 확인)
  → 유지관리자 1인이 판정
  → runbooks.md의 해당 절차 실행
  → H1·H2·H3 재확인
  → P1/P2: 48시간 내 사후검토 문서
```

Slack 웹훅·Grafana 계정은 아직 준비되지 않았습니다(Observability 단계의 미착수 항목). 준비 전에는 유지관리자가 Jenkins 콘솔과 로그를 직접 확인합니다(`log-queries.md`).

## 5. 적용하지 않은 것

| 항목 | 이유 |
|---|---|
| 온콜 로테이션·보조 담당자 | 소유자 1인(Q2 A) |
| PagerDuty·전화 호출 | 외부 서비스 없음 |
| 자동 복구 에스컬레이션 | 되돌림은 사람이 결정(`alarms.md` §5) |
| 외부 공지·상태 페이지 | 개인 사이트, 대상 없음 |
| AWS Incident Manager | AWS 자원 없음(`infrastructure-specification`) |
