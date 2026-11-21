# 사고 대응 질문과 답변

- **단계**: Incident Response (`incident-response`), 2026-11-21 02:23 KST, `261115-personal-website`
- **작성자**: 운영 엔지니어 역할 (aidlc-operations-agent)
- **왜 다시 묻지 않았는가**: 가장likely한 실패 모드는 롤백 런북 T1–T6과 `reliability-design.md`의 실패 클래스에, 알림·심각도는 `alarms.md`에, 자동 복구를 두지 않는 결정은 `rollback-runbook.md`에 이미 기록되어 있습니다. 새로 정해지지 않은 세 가지(복구 시간 목표, 에스컬레이션, 커뮤니케이션·사후검토)만 묻습니다.
- **근거 문서**: `operation/observability-setup/{dashboards,alarms}.md`(`dashboards`, `alarms`), 네 단위의 `construction/*/nfr-design/{reliability-design,security-design}.md`(`reliability-design`, `security-design`), 네 단위의 `construction/*/infrastructure-design/infrastructure-specification.md`(`infrastructure-specification`), `operation/deployment-pipeline/rollback-runbook.md`, `operation/deployment-execution/health-check-report.md`

## Q1. [운영 엔지니어] 복구 시간 목표(RTO)와 데이터 손실 목표(RPO)를 어떻게 정할까요?

롤백 런북은 "회귀 발견 후 2시간 이내 정상화"를 목표로 정합니다(C4). 볼트에는 `published` 날짜가 기록되지만 롤백으로 되돌리지 않습니다. 그 밖의 상태는 없습니다.

- A. RTO = 2시간(롤백 런북 목표 그대로), RPO = 해당 없음(되돌릴 상태가 없음)으로 기록한다
- B. RTO = P1 30분/P2 2시간으로 더 짧게 잡는다
- C. 별도 목표를 정하지 않는다
- D. 위 조합 외의 다른 목표
- X. Other (please specify)

[Answer]: A

답변: RTO는 롤백 런북의 2시간 목표를 그대로 쓰고, RPO는 "해당 없음"으로 기록합니다. 되돌릴 상태가 볼트의 `published` 날짜뿐이고 그것은 롤백으로 복구되지 않기 때문입니다.

## Q2. [운영 엔지니어] 에스컬레이션 경로를 어떻게 둘까요?

저장소 소유자가 한 명이고 외부 온콜·관리자가 없습니다. 롤백 런북 §3은 "외부 에스컬레이션 경로 없음"으로 기록합니다.

- A. 단일 소유자 유지 — 외부 에스컬레이션 없음(기록과 동일)
- B. 보조 연락처 한 명을 추가한다 — 채널과 이름은 별도로 지정
- C. 외부 온콜 서비스를 도입한다
- D. 위 조합 외의 다른 경로
- X. Other (please specify)

[Answer]: A

답변: 단일 소유자 구조를 유지하고 외부 에스컬레이션 경로를 두지 않습니다. 롤백 런북 §3의 기존 기록과 동일합니다.

## Q3. [운영 엔지니어] 사고 중 커뮤니케이션과 사후검토를 어디까지 기록할까요?

운영 단계 규칙은 P1·P2에 타임라인·원인·재발 방지를 담은 사후검토를 요구합니다. 현재 사고 전용 채널이나 템플릿은 없습니다.

- A. Slack 채널에 타임라인을 남기고, P1·P2는 48시간 내 사후검토 문서를 `aidlc/` 레코드에 기록한다
- B. 최소 기록 — 롤백 런북 체크리스트만 남기고 별도 포스트모템은 쓰지 않는다
- C. 사후검토를 하지 않는다
- D. 위 조합 외의 다른 처리
- X. Other (please specify)

[Answer]: A

답변: 사고 중에는 Slack 채널에 타임라인을 남기고, P1·P2는 해결 후 48시간 내 사후검토 문서를 `aidlc/` 레코드에 기록합니다. 운영 단계 규칙의 요구사항을 그대로 따릅니다.

## 기록되지 않은 판단 (사람에게 다시 묻지 않은 것)

- **실패 모드**: T1(도달성), T2(구주소 리디렉션), T3(야간 빨간색), T4(글 수 불일치), T5(U2 되돌림 순서), T6(링크 404) — `rollback-runbook.md` §2. 전처리 실패 클래스는 `reliability-design.md` §1.
- **자동 복구**: 만들지 않습니다. 되돌림은 사람이 결정하며(`rollback-runbook.md` §3), Observability 단계에서도 자동 복구 액션을 두지 않았습니다(`alarms.md` §5).
- **심각도와 알림 경로**: P1/P2/P3과 Slack 경로는 `alarms.md` §4에 정의되어 있습니다.
- **AWS SSM/Incident Manager/Backup**: 이 프로젝트에는 AWS 자원이 없어 적용 대상이 아닙니다(`infrastructure-specification` §Infrastructure Services).

## 측정된 현재 상태 (2026-11-21 02:23 KST)

| 관찰 | 값 |
|---|---|
| 최근 배포 | 01:27 `just deploy`, H1–H3 전부 통과 |
| 오리진·터널·Jenkins | 세 서비스 모두 실행 중 |
| 롤백 목표 | 2시간(예산 80분 + 여유 40분) |
| 사고 기록 | 아직 없음 — 이 단계가 템플릿과 절차를 만듭니다 |
| `origin/develop` | `db7ecae` — push = 릴리스, 유지관리자 결정 |

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
