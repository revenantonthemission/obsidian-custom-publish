<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-20T13:44:35Z — 단계 파일이 "기능 플래그 구성, 환경 승격 매트릭스"를 별도 산출물로 나열했지만, 이 단계의 `produces`는 네 개뿐이라 승격 매트릭스(§4)와 기능 플래그 결정(§5)을 `deployment-strategy.md` 안에 넣었습니다. 둘 다 전략의 부분이지 독립 문서가 아닙니다.
- 2026-11-20T13:44:35Z — 이 단계의 다섯 주제(전략·승격·승인·롤백·플래그)는 모두 이전 단계·팀 규칙에 답이 기록되어 있어 다시 묻지 않았습니다. 이전 단계가 정하지 않은 운영 파라미터 하나(롤백 목표 시간)만 새로 물었고, 답은 2시간 이내였습니다(Q6, B).

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-20T13:44:35Z — U3 인프라 설계는 두 번째 복사를 `rsync -a --checksum`으로 적었지만, 구현은 `site/scripts/publish-dist.sh:39-42`의 `cp` 후 `mv -f`입니다. 산출물은 코드에 있는 쪽을 기준으로 적었고(원자적 이름변경이라는 목적은 그대로 충족), 설계 문서와 코드의 차이는 이 일지에 남깁니다.
- 2026-11-20T13:44:35Z — U1 인프라 리뷰 R-10이 권한 롤백 시 작업 공간의 `site/public/assets/pages/` 삭제를 조건으로 걸었는데, 자산 교체형 복사는 U1 병합이 아닌 독립 커밋 `86ac5cc`으로 들어갔습니다. U1 병합만 되돌려도 교체 방식이 남으므로 절차서에는 "86ac5cc까지 함께 되돌리는 경우에만 정리한다"로 조건을 좁혔습니다.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-20T13:44:35Z — 자동화된 post-deploy 러너(F1)를 이 단계에서 만들지 않았습니다. 팀 규칙이 사람의 수동 확인을 관행으로 두고 있고 F1은 이미 별도 작업으로 기록되어 있어, 범위를 넓히지 않고 절차서의 수동 확인 항목(H1–H3)으로만 남겼습니다.
- 2026-11-20T13:44:35Z — 롤백 시간 예산(합계 80분, 목표 120분)을 실측이 아니라 목표 표로 적었습니다. 유일한 실측 기준인 야간 작업 약 10분도 추정치이므로 표 전체를 목표로 표시하고, 실측이 쌓이면 다음 갱신 때 실제 값으로 바꾸는 것으로 남겼습니다.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-20T13:44:35Z — `origin/develop`이 `db7ecae`라 이 작업 전체가 아직 어떤 배포에도 실리지 않았습니다. push가 곧 릴리스이므로 첫 배포 시점은 유지관리자의 결정이며, deployment-execution 단계가 다룹니다.
- 2026-11-20T13:44:35Z — U3의 고정 재시작이 아직 일어나지 않았습니다. 실행 중인 서버는 2026-11-17에 시작한 프로세스로 U3의 서버 코드 커밋 `b147d7b` 이전입니다. U3의 이동 페이지를 처음 싣는 배포 **전에** 재시작해야 하며, 그 순서는 deployment-execution 단계가 지켜야 합니다.
- 2026-11-20T13:44:35Z — 자동 post-deploy 러너(F1)와 16상태 수동 접근성 검토 기록은 여전히 미착수 상태입니다. 앞의 둘은 `observability-setup`이 소유하는 SLO 두 건과 함께 다음 단계로 넘어갑니다.
