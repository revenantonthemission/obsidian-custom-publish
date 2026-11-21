# SLO.report — `261115-personal-website`

- **단계**: Feedback & Optimization (`feedback-optimization`), 2026-11-21 KST
- **결정**: Q1 A — 30일 데이터가 쌓인 뒤 첫 준수율 보고
- **상위 산출물**: `operation/observability-setup/{dashboards,alarms,slo-config}.md`(`dashboards`, `alarms`, `slo-config`), `operation/deployment-execution/deployment-log.md`(`deployment-log`), `operation/performance-validation/test-results.md`(`test-results`), `operation/incident-response/incident-plan.md`(`incident-plan`)

## 1. 현재 상태(기준선 보고)

| SLI | SLO | 창 | 현재 | 판정 |
|---|---|---|---|---|
| 발행 성공률 | ≥ 95% | 30일 롤링 | 데이터 0일 | **미산정** |
| 사이트 페이지 수 일치 | 0회 불일치 | 실행마다 | 최근 실행 0개(빈 폴더 알림 정상) | 일치 |
| 배포 후 도달성 | 100% | 확인한 배포 | 1회 확인, 100% | 일치(표본 1) |
| 구주소 리디렉션 | 100% | 확인한 배포 | 1회 확인, 100% | 일치(표본 1) |
| 테이블 거부 | 0건 | 확인한 배포 | 0건 | 일치 |
| 오리진·터널 가용성 | 99.9% | 30일 롤링 | 데이터 0일 | **미산정** |

첫 배포는 2026-11-21 01:27이므로, 첫 준수율 보고일은 **2026-12-21**입니다(Q1 A).

## 2. 오류 예산

| SLO | 예산 | 현재 소진 |
|---|---|---|
| 가용성 99.9%/30일 | 0.1% ≈ 43분 12초 | 미산정 |
| 발행 성공 ≥95%/30일 | 5% ≈ 1.5회/30일 | 미산정 |

측정 해상도 한계(하루 1회 수동 확인으로 43분을 정밀 측정 불가)는 `slo-config.md` §2에 기록되어 있습니다.

## 3. 다음 보고에 포함할 항목

1. 30일 롤링 발행 성공률(Jenkins 빌드 이력).
2. 가용성 체크 로그 집계(`checks.jsonl`이 아직 없음 — 별도 작업).
3. 배포 후 확인 횟수와 H1·H2·H3 성공률(`deployment-log.md`).
4. 구주소 리디렉션 성공률과 테이블 거부 건수.
5. 성능 기준선 대비 변화(35.18초/260페이지, `test-results.md`).
6. 사고 건수와 MTTR(`incident-plan.md` — 현재 사고 0건).

## 4. 보고 전제조건

| 항목 | 상태 |
|---|---|
| Grafana·Slack 연동 | 미준비(설계만) |
| `checks.jsonl` 자동 수집 | 미착수 |
| `origin/develop` push | 안 됨 — 유지관리자 결정 |
| 30일 운영 데이터 | 2026-12-21에 확보 예정 |

## 5. 결론

지금은 **준수율을 산정할 수 없습니다**. 대신 기준선과 측정 방법을 고정해 두고, 30일 뒤 첫 보고에서 같은 방법으로 비교합니다.
