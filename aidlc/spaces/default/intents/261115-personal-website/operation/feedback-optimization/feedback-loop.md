# 피드백 루프 — `261115-personal-website`

- **단계**: Feedback & Optimization (`feedback-optimization`), 2026-11-21 KST (마지막 단계)
- **결정**: Q4 A — `feedback-loop.md` 한 파일에 기록하고 다음 intent에서 참고
- **상위 산출물**: `operation/observability-setup/{dashboards,alarms,slo-config}.md`(`dashboards`, `alarms`, `slo-config`), `operation/deployment-execution/deployment-log.md`(`deployment-log`), `operation/performance-validation/test-results.md`(`test-results`), `operation/incident-response/incident-plan.md`(`incident-plan`)

## 1. 이번 워크플로의 운영 결과

| 관점 | 결과 | 출처 |
|---|---|---|
| 배포 | `just deploy` 1회 성공, H1–H3 통과 | `deployment-log.md` |
| 성능 | 목표 전부 충족, 실제 기준선 35.18초/260페이지 채택 | `test-results.md` |
| SLO | 30일 데이터 없음 — 미산정, 첫 보고 2026-12-21 | `slo-report.md` |
| 비용 | 인프라 0원, 외부 서비스 비용 모니터링 도입 예정 | `cost-analysis.md` |
| 드리프트 | 현재 없음, 저장소 밖 plist 추적 공백은 외부 감지 도입 예정 | `drift-report.md` |
| 사고 | 실제 사고 없음. 런북·에스컬레이션만 준비 | `incident-plan.md` |

## 2. 다음 이터레이션 입력(미해결 항목)

| # | 항목 | 영향 | 소유 | 우선순위 |
|---|---|---|---|---|
| F-1 | `origin/develop` 미push | 이번 작업이 원격에도 반영되지 않음. push = 릴리스 | 유지관리자 | 높음 |
| F-2 | 16상태 수동 접근성 검토(`TEAM-E2E-A11Y`) | `npm run test:e2e`가 계속 실패 닫힘 | 유지관리자(2–4시간) | 높음 |
| F-3 | Jenkins Verify on merge commit(`U1-NFR6.1`) | 원격 커밋 검증 미완료 | push 후 Jenkins | 높음 |
| F-4 | Grafana·Slack 계정/웹훅 미준비 | 대시보드·알림이 설계에만 존재 | 유지관리자 | 중간 |
| F-5 | 비용 모니터링 도구 미도입 | 외부 비용 미추적 | 유지관리자(Q2 C) | 낮음 |
| F-6 | 외부 드리프트 감지 미도입 | plist 변경 추적 공백 | 유지관리자(Q3 C) | 중간 |
| F-7 | 자동 post-deploy 러너(`F1`) | H1–H3 수동 확인 계속 | 별도 작업 | 중간 |
| F-8 | k6 부하 테스트 미실행 | 동시 요청 견딤 미검증 | 설치·승인 후(`load-test-plan.md`) | 낮음 |
| F-9 | ` Areas/Pages`가 빈 폴더 | 사이트 페이지 0개 게시 | 유지관리자가 콘텐츠 추가 시 해결 | 낮음 |
| F-10 | `typst`·`chrome-headless-shell` 미설치 | typst 블록 추가 시 전처리 실패 가능 | 유지관리자 | 낮음 |

## 3. 자동화할 토일

| 작업 | 현재 | 자동화 후보 |
|---|---|---|
| 배포 후 H1–H3 확인 | 수동 curl | F-7 자동 러너 |
| SLO 체크 기록 | 수동 `checks.jsonl` | 내보내기 스크립트 |
| 월간 로그 정리 | 수동(30일) | 정리 스크립트 |
| plist 검토 | 월 1회 수동 | F-6 외부 드리프트 감지 |

## 4. 사용자 행동 신호

이 사이트에는 분석 도구·계정·로그인이 없습니다. 따라서 **사용자 행동 패턴 데이터는 없습니다**. 기능 제안은 기록하지 않고, 다음 intent에서 요구사항으로 새로 들어와야 합니다.

## 5. 다음 intent 시작 시 읽을 것

1. 이 파일의 §2 표(F-1~F-10) — 미해olved 항목과 소유자.
2. `slo-report.md` — 2026-12-21 이후 첫 준수율.
3. `drift-report.md` — plist 기준값.
4. `cost-analysis.md` — 외부 서비스 비용 기준선.

이 문서가 피드백 루프의 유일한 전달 지점입니다(Q4 A). 자동 intent 생성이나 별도 백로그는 만들지 않습니다.
