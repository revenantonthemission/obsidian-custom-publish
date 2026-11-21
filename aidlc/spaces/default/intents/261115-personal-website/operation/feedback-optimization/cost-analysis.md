# 비용 분석 — `261115-personal-website`

- **단계**: Feedback & Optimization (`feedback-optimization`), 2026-11-21 KST
- **결정**: Q2 C — 별도 비용 모니터링 도입
- **상위 산출물**: `operation/observability-setup/{dashboards,alarms,slo-config}.md`(`dashboards`, `alarms`, `slo-config`), `operation/deployment-execution/deployment-log.md`(`deployment-log`), `operation/performance-validation/test-results.md`(`test-results`), `operation/incident-response/incident-plan.md`(`incident-plan`)

## 1. 현재 비용

| 항목 | 비용 | 근거 |
|---|---|---|
| AWS(EC2·S3·CloudWatch 등) | **0원** | 클라우드 자원 없음. `infrastructure-specification` §Infrastructure Services |
| 오리진·터널·Jenkins | 0원 | 기존 Mac과 무료 터널 서비스 사용 |
| Grafana Cloud | 미가입(무료 티어 예정) | Observability 단계 설계 |
| Slack | 미가입(무료 플랜 예정) | Observability 단계 설계 |
| 도메인 `rvnnt.dev` | 기존 소유(청구 내역 없음) | 이번 작업에서 변경 없음 |

이번 배포(`deployment-log.md`)와 성능 검증(`test-results.md`)은 비용을 발생시키지 않았습니다.

## 2. 비용 모니터링 도입안(Q2 C)

| 항목 | 내용 |
|---|---|
| 목적 | Grafana Cloud·Slack 등 외부 서비스의 월 청구액을 한 곳에서 추적 |
| 후보 | 각 서비스의 사용량 페이지를 주 1회 확인하는 수동 시트 또는 무료 비용 추적 도구 |
| 첫 적용 | 외부 서비스 가입 후 첫 청구월부터 |
| 임계값 | 월 0원 초과 시 기록, 무료 티어 상 도달 시 검토 |
| 자격 증명 | 저장소 밖(환경 변수·시크릿 저장소). 저장소에 커밋하지 않음 |
| 상태 | **설계만** — 도구 설치·계정 연동은 유지관리자 작업 |

## 3. 최적화 기회

| 기회 | 효과 | 판단 |
|---|---|---|
| 인스턴스 우 사이징 | 해당 없음 | 클라우드 컴퓨트 없음 |
| 스토리지 계층화 | 해당 없음 | 로그 30일, 최대 47 KB |
| 불필요한 서비스 정리 | 낮음 | 서비스 3개 모두 사용 중 |
| 무료 티어 유지 | 중간 | Grafana·Slack 유료 플랜 전환 전 검토 |
| 자동화된 토일 감소 | 중간 | 수동 체크·배포 후 확인·월간 로그 정리 — 자동화 후보는 `feedback-loop.md` |

## 4. 측정 한계

실제 청구 데이터가 없어 **절감액 estimation은 하지 않습니다**. 숫자를 추측하는 대신, 외부 서비스 가입 이후 첫 청구월에 기준선을 잡습니다.

## 5. 결론

인프라 비용은 0입니다. 비용 관리의 대상은 외부 서비스이며, 도입한 모니터링안은 그 경로만 추적합니다. 사고 대응(`incident-plan.md`)과 성능 기준선(`test-results.md`)에 비용 제약은 없습니다.
