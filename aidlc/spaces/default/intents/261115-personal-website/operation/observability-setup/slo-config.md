# SLO / SLI 설정 — `261115-personal-website`

- **단계**: Observability Setup (`observability-setup`), 2026-11-21 KST
- **질문과 답**: `observability-setup-questions.md` Q1 B(가용성 99.9%/30일, 수동 기록으로 산정), Q2 C(클라우드 대시보드), Q3 B(30일 보존), Q4 C(외부 알림)
- **상위 산출물**: 네 단위의 `construction/*/nfr-design/{performance-design,security-design,reliability-design}.md`, `construction/*/infrastructure-design/{monitoring-design,infrastructure-specification}.md`(`monitoring-design`, `infrastructure-specification`), `construction/u1-publish-boundary/nfr-design/observability-design.md`, `operation/deployment-execution/health-check-report.md`

## 1. SLO 목록

| # | SLI | SLO | 창 | 측정 근거 | 출처 |
|---|---|---|---|---|---|
| S1 | 발행 성공률(소유자 귀책 PUB 제외) | ≥ 95% | 롤링 30일 | Jenkins 빌드 이력 | `observability-design.md` §5 |
| S2 | 사이트 페이지 수가 의도와 일치 | 0회 불일치 | 실행마다 | 요약 줄 `<M> site pages` | `reliability-design.md` §2 |
| S3 | 배포 후 `/`·글 도달성 | 100% | 확인한 배포마다 | H1·H2 기록 | `health-check-report.md` §2 |
| S4 | 구주소 리디렉션 정확도 | 100% | 확인한 배포마다 | H3 기록(301 + 대상 200) | `monitoring-design.md`(U3) |
| S5 | 리디렉션 테이블 거부 | 0건 | 확인한 배포마다 | 서버 로그의 테이블 오류 라인 | `monitoring-design.md`(U3) |
| **S6(신규)** | 오리진·터널 가용성 | **99.9%** | **롤링 30일** | **수동 확인 기록(체크 로그)** | **Q1 B** |

## 2. 신규 SLO 상세 (S6)

| 항목 | 값 |
|---|---|
| 대상 | 오리진(`127.0.0.1:8080`)과 공개 경로(`https://rvnnt.dev/`) |
| SLI | 확인 시점에 `/`가 HTTP 200인 비율. 실패 시작·종료 시각을 체크 로그에 기록 |
| 목표 | 99.9% / 30일 롤링 |
| 오류 예산 | 0.1% = 30일 약 **43분 12초** |
| 제외 | 유지관리자가 의도한 점검·재시작 구간(Q1 B의 수동 산정 조건) |
| 측정 수단 | 수동 확인 기록. **자동 프로브를 두지 않습니다** |
| 데이터 저장 | `~/Library/Logs/obsidian-blog/checks.jsonl` — `timestamp`, `target`, `status`, `note` 필드 |
| 대시보드 반영 | 체크 기록을 Prometheus 원격 기록으로 전송하는 내보내기 스크립트(§5 전제조건) |

**측정 해상도에 대한 정직한 한계**: 하루 1회 수동 확인으로는 43분 예산을 정밀하게 측정할 수 없습니다. S6의 수치는 유지관리자가 선택한 목표로 기록하고, 실측은 "확인 시점 실패 횟수 × 확인 간격"의 상한으로 산정합니다. 정밀도가 필요해지면 자동 프로브를 별도 작업으로 추가해야 합니다(Q1 B에서 자동 프로브를 두지 않기로 한 결정은 유지).

## 3. 오류 예산 정책

| 잔여 예산 | 상태 | 조치 |
|---|---|---|
| > 50% | 정상 | 평상시 배포 |
| 25–50% | 주의 | 최근 실패 원인 검토, 배포 후 확인 강화 |
| < 25% | 위험 | 배포 간격 늘림, 안정성 작업 우선 |
| 0% | 고갈 | 기능 배포 중단, 안정성 복구에 집중 |

이 정책은 **문서화된 가이드**입니다. 이 프로젝트에는 배포 승인 단계가 없고 push가 곧 릴리스이므로(`team.md`), 파이프라인 게이트로 자동화하지 않습니다.

## 4. 버닝 레이트 알림

자동 프로브가 없으므로 표준 1시간/5분 다중 창 버닝 레이트는 적용할 수 없습니다. 대신:

| 조건 | 심각도 | 조치 |
|---|---|---|
| 체크 1회 실패(S3·S4) | P1/P2 | 즉시 확인, 실패 시 되돌림(`rollback-runbook.md`) |
| 30일 롤링 S6 준수율 < 99.9% | P2 | Slack 알림 + 체크 로그 검토 |
| 발행 실패 1회(S1) | P2 | Jenkins 콘솔 확인 |

SLO 위반 **이전**에 알리기 위해 임계값을 목표 아래에 두었습니다(§`alarms.md`).

## 5. 전제조건과 미착수 항목

| 항목 | 상태 | 소유 |
|---|---|---|
| Grafana Cloud 계정 + API 키 | 미준비 | 유지관리자(Q2 C) |
| Slack 웹훅 URL | 미준비 | 유지관리자(Q4 C) |
| Alloy 설치·등록(로그 전송) | 미착수 | 유지관리자 |
| 체크 기록 → Prometheus 전송 스크립트 | 미착수 | 별도 작업. 이 단계는 설정안만 산출 |
| 30일 운영 데이터 | 없음 | `U1-SLO-NIGHTLY`, `U1-SLO-PAGECOUNT` 미검증 유지 |

자격 증명은 환경 변수 또는 유지관리자의 시크릿 저장소에 두고 저장소에 커밋하지 않습니다(`security-design.md`의 비밀 취급 원칙).
