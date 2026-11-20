<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-20T17:19:38Z — 골든 시그널·발행 SLO·대시보드 위치·추적 부재는 이미 `monitoring-design.md`와 `observability-design.md`에 정해져 있어 다시 묻지 않았습니다. 새로 결정이 필요했던 네 가지(가용성 SLO 수치, 대시보드 수준, 로그 보존, 알림 경로)만 물었고 B·C·B·C를 받았습니다.
- 2026-11-20T17:19:38Z — Q2 C(클라우드 대시보드)를 이 프로젝트에 맞게 "Grafana Cloud + 로컬 Alloy"로 구체화했습니다. AWS 계정·CloudWatch 설정이 없고 `cd-config.md`가 새 AWS 자격 증명을 만들지 않기로 했으므로, CloudWatch를 기본안으로 쓰는 것은 기록과 충돌합니다.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-20T17:19:38Z — 단계 템플릿의 "CloudWatch dashboard·X-Ray·Logs Insights·anomaly detection"을 그대로 만들지 않았습니다. 이 환경에는 AWS 지표도 분산 서비스도 없어서, 같은 목적을 Grafana/Loki/Alloy 조합과 문서화된 로그 쿼리로 대신했습니다. `tracing-config.md`는 미적용 판정과 그 근거만 담습니다.
- 2026-11-20T17:19:38Z — Q1 B의 "자동 측정기 없음"과 Q2 C의 "외부 대시보드"가 infrastructure상 긴장 관계입니다. 체크 기록을 수동으로 남기고 그 기록을 내보내는 스크립트를 별도 작업으로 표시해, 자동 프로브 없이 대시보드를 채우는 경로를 설계했습니다.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-20T17:19:38Z — 가용성 99.9%/30일을 수동 체크 기록으로 산정하는 한계를 숨기지 않고 문서에 적었습니다. 하루 1회 확인으로 43분 예산을 정밀 측정할 수 없으므로, 정밀도가 필요하면 자동 프로브를 별도 작업으로 추가해야 한다고 남겼습니다.
- 2026-11-20T17:19:38Z — ML 이상 탐지 대신 정적 임계값과 30일 이상 패널을 택했습니다. 야간 1회 발행과 수동 확인만으로는 안정적인 시계열이 없어 ML 기준선을 만들 수 없습니다.
- 2026-11-20T17:19:38Z — 자격 증명(Grafana API 키, Slack 웹훅)을 저장소 밖에 두기로 했습니다. 계정 생성과 키 발급은 유지관리자 작업으로 명시하고, 이 단계는 설정안만 산출했습니다.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-20T17:19:38Z — Grafana Cloud 계정·API 키, Slack 웹훅, Alloy 설치가 모두 미준비입니다. 대시보드·알림은 설정안일 뿐 실제 동작하지 않습니다.
- 2026-11-20T17:19:38Z — 30일 운영 데이터가 없어 `U1-SLO-NIGHTLY`, `U1-SLO-PAGECOUNT`와 신규 S6의 달성 여부를 산정할 수 없습니다.
- 2026-11-20T17:19:38Z — `origin/develop`은 여전히 `db7ecae`입니다. push가 릴리스이므로 유지관리자의 결정이며, push 뒤 야간 실행이 첫 자동 관측 신호를 만듭니다.
