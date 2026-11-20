<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-20T16:28:38Z — 이 단계를 "무조건 배포 실행"이 아니라 "배포 경로를 유지관리자가 고르는 단계"로 먼저 다뤘습니다. push는 곧 릴리스이고 `just deploy`는 유지관리자의 허가가 필요하므로, 질문 없이 배포를 시작하면 팀 규칙을 어기게 됩니다. 세 가지 질문(경로, e2e 격차, 재검증 범위)을 먼저 물었고 모두 A를 받았습니다.
- 2026-11-20T16:28:38Z — Q1 A(`just deploy`)와 Q3 A("배포 경로의 Verify에 맡김")가 실제로는 맞지 않는다는 점을 발견했습니다. `just deploy`는 Jenkins Verify를 돌리지 않으므로 `U1-NFR6.1`은 이번 배포로 닫히지 않습니다. 다시 묻지 않고 세 산출물에 "Unverified로 남는다"고 명시했습니다.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-20T16:28:38Z — 단계 템플릿 Step 3의 "Push artifacts through the pipeline"을 `just deploy`(로컬 경로)로 수행했습니다. Q1 A의 명시적 선택이며, push는 유지관리자의 별도 결정으로 남겼습니다. `origin/develop`은 여전히 `db7ecae`입니다.
- 2026-11-20T16:28:38Z — 데이터베이스 마이그레이션 로그를 만들지 않았습니다. 이 프로젝트에 데이터베이스가 없어 적용 대상이 아닙니다(`environment-inventory.md` §10).
- 2026-11-20T16:28:38Z — 자동 post-deploy 러너(`F1`)를 이 단계에서 만들지 않았습니다. H1–H3을 수동으로 확인하고 격차로 기록했습니다.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-20T16:28:38Z — `npm run test:e2e`의 만료를 Q2 A로 수용하면서, 배포 후 실제 HTTP 응답(H1–H3 + 공개 경로)으로 보완했습니다. assertion 실패가 없고 Jenkins 게이트에 e2e가 없으므로 2–4시간의 수동 검토를 이 배포의 조건으로 두지 않았습니다.
- 2026-11-20T16:28:38Z — 배포 후 서버를 재시작하지 않았습니다. U3의 고정 재시작은 이미 끝났고, `_redirects.json`은 수정 시간 변화로 서버가 다시 읽으므로 추가 재시작은 이득이 없습니다(`cd-config.md` §3).
- 2026-11-20T16:28:38Z — 전처리 중 볼트에 2개의 `published` 날짜가 기록됐습니다. 야간 작업과 같은 동작이고 Q1 A에 포함된 행위지만, 되돌림으로 복구되지 않으므로 세 산출물에 각각 명시했습니다.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-20T16:28:38Z — `origin/develop`이 `db7ecae`로, 이번 작업은 로컬 배포로만 실렸습니다. push가 릴리스이므로 그 시점은 유지관리자의 결정입니다.
- 2026-11-20T16:28:38Z — `U1-NFR6.1`은 Unverified입니다. Q3 A에 따라 로컬 재검증을 생략했고 `just deploy`는 Verify를 돌리지 않으므로, 원격 커밋에 대한 Jenkins 실행이 필요합니다.
- 2026-11-20T16:28:38Z — `TEAM-E2E-A11Y`는 Not Met입니다. 16상태 수동 검토(2–4시간) 뒤 `npm run test:e2e`를 다시 실행해야 합니다. 이번 배포에서는 수용된 격차입니다.
- 2026-11-20T16:28:38Z — 전처리가 기록한 `published` 날짜 2건의 대상 글 이름이 출력에 없었습니다. 필요하면 볼트에서 직접 확인해야 합니다.
