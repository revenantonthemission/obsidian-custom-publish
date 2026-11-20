# 추적 설정 — `261115-personal-website`

- **단계**: Observability Setup (`observability-setup`), 2026-11-21 KST
- **상위 산출물**: 네 단위의 `construction/*/nfr-design/{performance-design,security-design,reliability-design}.md`, `construction/*/infrastructure-design/{monitoring-design,infrastructure-specification}.md`(`monitoring-design`, `infrastructure-specification`), `construction/u1-publish-boundary/nfr-design/observability-design.md`

## 1. 판정: 분산 추적은 적용하지 않습니다

| 항목 | 내용 |
|---|---|
| X-Ray / OpenTelemetry / Jaeger 계측 | **미적용** |
| 이유 1 | 실행 구조가 "프로세스 하나, 실행마다 한 번"입니다. 전처리는 배치, 사이트는 빌드 산출물, 서버는 정적 파일을 스트리밍합니다(`observability-design.md` §1) |
| 이유 2 | 서비스 간 호출·DB·큐·외부 API가 없습니다(`infrastructure-specification` §Infrastructure Services — "Database / cache / queue / search: None") |
| 이유 3 | 요청 경로에 분기 지점이 없습니다. 서버는 리디렉션 조회 후 파일을 읽고, 성공한 요청은 로그를 남기지 않습니다(`monitoring-design.md`(U3) §Logs & Tracing) |
| 비용·복잡성 | 추적 시스템을 추가하면 단일 정적 사이트에 스팬·샘플링·수집기를 관리해야 하지만 얻는 정보가 없습니다 |

U1·U3의 모니터링 설계도 같은 결론을 이미 기록했습니다: "Tracing. Not applicable: one process per run" / "No log aggregation, no tracing".

## 2. 대신 관측하는 지점

| 목적 | 수단 | 위치 |
|---|---|---|
| 발행 단계별 결과 | Jenkins 스테이지 뷰와 콘솔 라인 순서 | `observability-design.md` §2 |
| 요청 경로의 정확성(이동 페이지) | HIG 빌드의 경로별 요청 수집기 | `monitoring-design.md`(U3) — "Moved-route request set" |
| 배포 후 실제 응답 | H1·H2·H3 수동 확인 | `health-check-report.md` §2 |
| 서버 내부 오류 | 서버 로그의 테이블 오류 한 줄 | `log-queries.md` §3 |

이 네 가지가 이 환경에서 "요청이 어디를 지났는지"를 대신 답합니다.

## 3. 나중에 추적이 필요해지는 조건

다음 중 하나가 생기면 이 문서를 다시 열어 계측을 검토합니다.

- 서버가 외부 API·DB·캐시를 호출하게 될 때
- 요청이 두 개 이상의 프로세스를 지나게 될 때
- p95 지연을 실제로 측정해야 하는 요구가 생길 때(Q1 B로 자동 프로브를 두지 않은 결정이 바뀌는 경우)

그 경우 최소 변경은 `local-server.mjs`의 요청 핸들러에 상관 ID를 붙여 구조화 로그를 남기는 것입니다. 지금은 하지 않습니다.

## 4. 구성 파일 상태

이 단계에서 만드는 추적 설정 파일은 **없습니다**. 대시보드의 추적 패널도 두지 않습니다(`dashboards.md` §5).
