# 사고 대응 계획 — `261115-personal-website`

- **단계**: Incident Response (`incident-response`), 2026-11-21 KST
- **상위 산출물**: `operation/observability-setup/{dashboards,alarms}.md`(`dashboards`, `alarms`), 네 단위의 `construction/*/nfr-design/{reliability-design,security-design}.md`(`reliability-design`, `security-design`), `construction/*/infrastructure-design/infrastructure-specification.md`(`infrastructure-specification`), `operation/deployment-pipeline/rollback-runbook.md`

## 1. 목적과 범위

이 사이트는 개인 블로그로, 사용자·계약·다중 서비스가 없습니다. 사고 대응의 목적은 **공개 페이지가 다시 200을 답하게 만드는 것**과 **같은 실패가 반복되지 않게 기록하는 것** 두 가지입니다. AWS Incident Manager·SSM 자동화·PagerDuty는 적용 대상이 아닙니다(`infrastructure-specification` §Infrastructure Services).

## 2. 복구 목표

| 항목 | 값 | 근거 |
|---|---|---|
| RTO | 2시간 | Q1 A, 롤백 런북 §6(예산 80분 + 여유 40분) |
| RPO | 해당 없음 | 되돌릴 상태가 볼트의 `published` 날짜뿐이고 복구 대상이 아님(Q1 A) |
| 탐지 | Slack 알림 또는 유지관리자 직접 확인(`alarms.md`) | 자동 프로브 없음 |
| 인증 | H1·H2·H3 재확인 | `health-check-report.md` §2 |

## 3. 심각도와 대응 시간

| 심각도 | 조건 | 대응 | 사후검토 |
|---|---|---|---|
| P1 | 사이트 전체 도달 불가(RB-1·RB-7·RB-8) | 즉시 되돌림/재시작, RTO 2시간 이내 | 48시간 내 문서 |
| P2 | 구주소 리디렉션·테이블·빌드 실패(RB-2·RB-3·RB-4) | 당일 확인, 필요 시 되돌림 | 48시간 내 문서 |
| P3 | 글 수 불일치·링크 404·Jenkins 꺼짐(RB-5·RB-6·RB-9) | 다음 근무 시간 내 | 선택 |

심각도 경계는 `alarms.md` §4를 따릅니다.

## 4. 커뮤니케이션(Q3 A)

- 사고가 감지되면 Slack 채널에 한 문장 진술을 남깁니다(주소·상태·시각).
- 완화·복구 각 단계마다 한 줄씩 추가해 타임라인을 완성합니다.
- 외부 공지 채널은 없습니다. 개인 사이트이므로 대상이 소유자 1인입니다.
- P1·P2는 48시간 내 사후검토 문서를 `aidlc/` 레코드에 저장하고, 재발 방지 항목을 `feedback-optimization`에 넘깁니다(`runbooks.md` §5 템플릿).

## 5. 훈련과 검증

| 활동 | 여부 | 이유 |
|---|---|---|
| 카오스 공학 / 장애 주입 | 하지 않음 | 단일 정적 오리진, 재해 복구 대상이 없음 |
| 롤백 리허설 | 권장(미실시) | 실제 되돌림 경로는 문서만 검증됨. 다음 배포에서 한 번 연습 |
| H1–H3 수동 확인 | 매 배포 수행 | `health-check-report.md`에 절차와 결과 기록 |
| 로그 보존 확인 | 매월 1일 | 30일(Q3 B, `log-queries.md` §4) |

## 6. 남은 격차

| 항목 | 상태 |
|---|---|
| `origin/develop` = `db7ecae` | push = 릴리스, 유지관리자 결정 |
| Slack 채널·웹훅 | Observability 단계에서 설계만, 미준비 |
| Grafana/Alloy | 미설치 — 사고 탐지는 현재 수동 |
| `U1-NFR6.1` / 30일 SLO 신호 | Unverified |
| 16상태 수동 접근성 검토 | Not Met (이 사고 계획과 별개 게이트) |
