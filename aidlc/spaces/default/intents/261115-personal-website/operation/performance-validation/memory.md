<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-21T02:05:31Z — 이 단계를 "다시 테스트하는 단계"가 아니라 "기존 결과를 배포된 실제 사이트에 대조하는 단계"로 다뤘습니다. Q3 A에 따라 전체 검증 명령을 재실행하지 않고, 방금 수행한 라이브 HTTP 측정과 5차 결과만 사용했습니다.
- 2026-11-21T02:05:31Z — Q1 C(전용 부하 도구)와 Q3 A(재실행 없음)를 조합해, k6 도입은 **계획**으로만 남기고 실행은 별도 승인 후로 미뤘습니다. 공개 URL에 부하를 주는 행위는 유지관리자 승인 없이 하지 않습니다.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-21T02:05:31Z — 성능 기준선을 픽스처(2.99 s/19소스)에서 실제 볼트(35.18 s/156소스·260페이지)로 바꿨습니다(Q2 B). 두 입력 집합이 달라 직접 비교하지 않는다는 점을 매트릭스에 명시했습니다.
- 2026-11-21T02:05:31Z — `curl`로 측정한 전송 크기는 HTML 문서만이라, CDP로 18개 요청을 합한 255,387 B와 직접 비교할 수 없습니다. 이 차이를 결과 문서에 명시해 오해를 막았습니다.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-21T02:05:31Z — 부하 테스트의 최대 VU를 3, 총 2분으로 잡았습니다. 개인 블로그에 대한 부하 영향과 검증 가치의 균형을考虑했습니다.
- 2026-11-21T02:05:31Z — 오리진 직접 응답(0.002 s)과 공개 응답(0.9–1.2 s)을 분리해 기록했습니다. 병목이 오리진이 아니라 터널·네트워크에 있음을 데이터로 남기기 위해서입니다.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-21T02:05:31Z — k6가 설치되지 않았고 공개 부하 승인도 없습니다. 부하 테스트는 계획일 뿐 실행되지 않았습니다.
- 2026-11-21T02:05:31Z — `TEAM-E2E-A11Y`, `U1-NFR6.1`, 두 SLO는 여전히 미해결입니다. 코드 성능 문제가 아니라 수동 검토·운영 데이터·push 대기입니다.
- 2026-11-21T02:05:31Z — `origin/develop`은 여전히 `db7ecae`입니다. push = 릴리스이므로 유지관리자의 결정입니다.
