<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-21T01:40:36Z — 단계 템플릿이 AWS Incident Manager·SSM 자동화·AWS Backup을 요구하지만 이 프로젝트에는 AWS 자원이 없습니다. 같은 목적을 이 환경의 실제 자산(launchd 세 서비스, Jenkins 작업, 웹 루트, Slack)에 대응시켜 런북·계획·에스컬레이션 표로 만들었습니다.
- 2026-11-21T01:40:36Z — 실패 모드(T1–T6), 심각도(P1–P3), 자동 복구 미적용은 이미 정해져 있어 다시 묻지 않았습니다. RTO·RPO, 에스컬레이션, 커뮤니케이션 세 가지만 묻고 모두 A를 받았습니다.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-21T01:40:36Z — RPO를 "해당 없음"으로 기록했습니다. 볼트의 `published` 날짜만 기록 상태이고 롤백으로 되돌리지 않으므로, 일반적인 데이터 손실 목표를 적용하면 오해를 만듭니다.
- 2026-11-21T01:40:36Z — 온콜 로테이션·보조 연락처·외부 공지 채널을 만들지 않았습니다(소유자 1인). 사후검토 문서는 Observability 단계에서 연동하기로 한 Slack 채널에 타임라인을 남긴 뒤 `aidlc/` 레코드에 보관하는 경로로 설계했습니다.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-21T01:40:36Z — 롤백 목표 2시간을 그대로 RTO로 채택했습니다. 별도 목표를 만들면 롤백 런북의 시간 예산(80분+여유 40분)과 어긋나기 때문입니다.
- 2026-11-21T01:40:36Z — 카오스 공학·장애 주입을 하지 않았습니다. 단일 정적 오리진에 복구 대상이 없어 검증 가치보다 절차가 큽니다. 대신 롤백 리허설을 권고 사항으로 남겼습니다.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-21T01:40:36Z — Slack 웹훅·Grafana 계정이 아직 준비되지 않아 알림 사슬이 문서에만 있습니다. 실제 사고 시에는 수동 확인으로 동작합니다.
- 2026-11-21T01:40:36Z — `origin/develop`은 여전히 `db7ecae`입니다. push가 릴리스이므로 유지관리자의 결정이며, push 뒤 첫 자동 관측 신호가 생깁니다.
- 2026-11-21T01:40:36Z — 실제 롤백 리허설을 한 적이 없습니다. 문서만 검증된 상태입니다.
