# 사고 대응 런북 — `261115-personal-website`

- **단계**: Incident Response (`incident-response`), 2026-11-21 KST
- **결정**: Q1 A(RTO 2시간, RPO 해당 없음), Q2 A(단일 소유자), Q3 A(Slack 타임라인 + 48시간 사후검토)
- **상위 산출물**: `operation/observability-setup/{dashboards,alarms}.md`(`dashboards`, `alarms`), 네 단위의 `construction/*/nfr-design/{reliability-design,security-design}.md`(`reliability-design`, `security-design`), `construction/*/infrastructure-design/infrastructure-specification.md`(`infrastructure-specification`), `operation/deployment-pipeline/rollback-runbook.md`

## 1. 런북 목록

| # | 상황 | 트리거 | 첫 행동 | 심각도 |
|---|---|---|---|---|
| RB-1 | 배포 후 `/` 또는 글이 200이 아님 | T1 | 롤백 런북 §4 즉시 실행 | P1 |
| RB-2 | `/tags`가 301이 아니거나 대상이 200이 아님 | T2 | H3 재확인 후 롤백 | P2 |
| RB-3 | 리디렉션 테이블 거부 로그 | T2 변형 | `_redirects.json` 형식 확인, 필요 시 다시 배포 | P2 |
| RB-4 | 야간 Jenkins 빨간색 | T3 | Verify 콘솔 확인. Verify 실패면 배포 없음 → 이전 빌드 유지 | P2 |
| RB-5 | 요약의 글 수가 예상과 불일치 | T4 | `<N>`·`<M>`과 볼트 메타 확인, 오には 전처리 경로 재점검 | P3 |
| RB-6 | 링크 404(되돌림 후 포함) | T6 | `just crossunit` 링크 스윕 실행 | P3 |
| RB-7 | 정적 서버 프로세스 종료 | `launchctl list dev.rvnnt.blog`에 PID 없음 | `launchctl kickstart -k gui/$(id -u)/dev.rvnnt.blog` | P1 |
| RB-8 | 터널 연결 끊김 | 공개 사이트 5xx/timeout, `dev.rvnnt.tunnel` PID 없음 | `launchctl kickstart -k gui/$(id -u)/dev.rvnnt.tunnel` | P1 |
| RB-9 | Jenkins 꺼짐(야간 미실행) | 8081 리스닝 없음 | **금지된 명령 주의** — `brew services start jenkins`를 쓰지 않습니다. 기존 plist 그대로 `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/homebrew.mxcl.jenkins.plist` | P3 |

## 2. 공통 절차

1. **탐지**: `alarms.md`의 Slack 알림 또는 직접 확인.
2. **한 문장 진술**: 어떤 주소, 어떤 상태, 언제부터 — Slack 채널에 남깁니다(Q3 A).
3. **분류**: 배포 이전부터 있던 문제인지, 이번 빌드에서 생긴 문제인지 구분합니다(`rollback-runbook.md` §4 단계 0).
4. **완화**: 해당 런북의 첫 행동 실행. 되돌림이 필요하면 `rollback-runbook.md` §4를 따릅니다.
5. **복구 확인**: H1·H2·H3 재확인(`health-check-report.md` §2).
6. **기록**: 타임라인과 조치 내용을 Slack에 남기고, P1·P2는 48시간 내 사후검토 문서를 작성합니다.

## 3. 재시작 런북 주의사항

- plist를 수정했다면 `launchctl kickstart -k`만으로는 새 설정이 반영되지 않습니다. `launchctl bootout` 후 `launchctl bootstrap`으로 다시 등록해야 합니다(Environment Provisioning에서 확인).
- Jenkins는 절대 `brew services start jenkins`로 시작하지 않습니다 — 포트 8080을 블로그에서 가져갑니다(프로젝트 금지 규칙).
- 서버 재시작은 U3 고정 재시작이 이미 완료됐으므로, 단순 프로세스 회복以外에는 필요 없습니다.

## 4. 롤백과의 관계

| 항목 | 값 |
|---|---|
| 복구 목표(RTO) | 2시간(`rollback-runbook.md` §6 예산 80분 + 여유 40분) |
| 데이터 손실 목표(RPO) | 해당 없음. 볼트의 `published` 날짜는 되돌리지 않습니다 |
| 이전 빌드 | 보존하지 않음. 되돌림은 항상 재빌드입니다 |
| 서버 코드 되돌림 | `local-server.mjs`·`redirect-table.mjs`를 건드렸을 때만 재시작 |

## 5. 사후검토 템플릿(P1·P2, 48시간 내)

```
# 사고 <YYYY-MM-DD> — <한 줄 요약>
- 타임라인: 발견 → 진단 → 완화 → 복구 시각
- 영향: 어떤 경로, 몇 명(또는 "개인 사이트 소유자"), 지속 시간
- 원인: 코드/설정/운영 중 무엇이 바뀌었나
- 기여 요인: 탐지가 늦었거나 런북이 없었던 지점
- 잘한 점 / 개선점
- 액션 항목: 담당(단일 소유자), 기한
```

`aidlc/spaces/default/intents/261115-personal-website/operation/incident-response/` 아래에 기록하고, 재발 방지 항목은 `feedback-optimization` 단계로 넘깁니다.
