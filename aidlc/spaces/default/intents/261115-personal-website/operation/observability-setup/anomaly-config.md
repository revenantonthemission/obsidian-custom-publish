# 이상 탐지 설정 — `261115-personal-website`

- **단계**: Observability Setup (`observability-setup`), 2026-11-21 KST
- **결정**: Q2 C(외부 대시보드), Q3 B(30일 보존), Q4 C(외부 알림)
- **상위 산출물**: 네 단위의 `construction/*/nfr-design/{performance-design,security-design,reliability-design}.md`, `construction/*/infrastructure-design/{monitoring-design,infrastructure-specification}.md`(`monitoring-design`, `infrastructure-specification`), `operation/deployment-execution/health-check-report.md`

## 1. 원칙

이环境에는 안정적인 요청률 시계열이 없습니다(야간 1회 발행 + 수동 확인). 따라서机器学习 기반 이상 탐지 대신 **정적 임계값 + 30일 창의 이상 패널**을 둡니다. 임계값은 SLO 위반보다 낮게 잡아 먼저 알립니다(`alarms.md` §3).

## 2. 탐지 항목

| # | 신호 | 정상 범위 | 이상 조건 | 심각도 | 출처 |
|---|---|---|---|---|---|
| D1 | 사이트 페이지 수 `<M>` | 빈 폴더 동안 0, 이후 `Areas/Pages`의 `.md` 수 | 의도와 다름(1건이면 알림) | P3 | `reliability-design.md` §2 |
| D2 | 게시 글 수 `<N>` | 이전 실행 수 ± 그날 추가·삭제 수 | 그 외 | P3 | `monitoring-design.md`(U1) |
| D3 | 전처리 소요 시간 | ≤ 1.5 × 기준선 | 초과 | P3 | `reliability-design.md` §4 |
| D4 | 오류 로그 라인 수 | 0 | 1건 이상 | P2 | `log-queries.md` §3 |
| D5 | 리디렉션 테이블 오류 | 0 | 1건 이상 | P2 | `monitoring-design.md`(U3) |
| D6 | 체크 실패(가용성 S6) | 0 | 1건 이상 | P1/P2 | `slo-config.md` §2 |
| D7 | 30일 발행 성공률 | ≥ 95% | 미만 | P2 | `observability-design.md` §5 |

## 3. 탐지 방식

| 방식 | 적용 항목 | 설정 |
|---|---|---|
| 정적 임계값 알림 | D1–D7 전부 | Grafana Alerting, 1회 위반에서 알림(`alarms.md`) |
| 시계열 이상 패널 | D2·D3·D4 | Grafana의 30일 롤링 패널. 급격한 기울기 변화를 사람이 확인 |
| ML 기반 anomaly detection | 미적용 | 충분한 시계열이 없고, 자동 프로브도 두지 않음(Q1 B) |

## 4. 확인과 억제

1. 알림이 오면 체크 로그와 Jenkins 콘솔을 먼저 봅니다(자동 복구 없음).
2. 소유자가 의도한 변경(글 추가·삭제, 재시작, 수동 검토)이면 `checks.jsonl`의 `note`에 기록하고 규칙을 조정하지 않습니다.
3. 같은 규칙이 1시간 내 재발하면 Slack 스레드로 묶습니다(`alarms.md` §3).
4. 실제 장애면 `rollback-runbook.md`의 트리거 T1–T6에 매핑해 되돌립니다.

## 5. 보존과 전제조건

- 로그와 탐지 근거 데이터는 **30일** 보존합니다(Q3 B).
- 30일 운영 데이터가 쌓이기 전에는 `U1-SLO-NIGHTLY`, `U1-SLO-PAGECOUNT`가 Unverified로 남습니다.
- 대시보드·Slack 계정과 Alloy 설치는 유지관리자 작업입니다(`dashboards.md` §4).
