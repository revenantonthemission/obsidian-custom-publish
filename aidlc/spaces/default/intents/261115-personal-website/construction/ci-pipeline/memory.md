<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-20T13:01:06Z — 이 단계의 네 주제(CI 도구, 브랜치 전략, 병합 전 품질 게이트, 아티팩트 저장소)는 모두 기록에 답이 있습니다(team.md의 Way of Working·Testing Posture·Deployment, 저장소의 `Jenkinsfile`, u1·u3의 `infrastructure-design/cicd-pipeline.md`). 프로토콜의 "답이 있는 질문을 다시 묻지 않는다" 규칙에 따라 질문을 파일에 남기고 기록된 답과 근거를 적었지, 새로 묻지 않았습니다.
- 2026-11-20T13:01:06Z — 단계 조건은 "CI가 이미 있고 Adequate하면 skip"이지만 이 단계는 실행했습니다. 기존 Jenkins 파이프라인이 Adequate한 것은 사실이지만(`u3` 설계: "U3 adds no stage"), 이 단계가 `TC-SF-CI` 행의 소유 단계이고 Construction → Operation 단계 경계 판정(`verification/phase-check-construction.md`)을 만드는 단계이므로, 산출물이 남습니다.
- 2026-11-20T13:01:06Z — `Jenkinsfile`에 push 트리거가 없다는 점을 파이프라인의 사실로 적었습니다. Verify는 야간 작업의 프로덕션 게이트이고 병합을 막는 것은 로컬 Construction Verification Command입니다. 팀 규칙이 정한 배치이므로 누락으로 적지 않았습니다.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-20T13:01:06Z — 이 단계는 `Jenkinsfile`을 고치지 않았습니다. 이 의도가 필요로 한 유일한 파이프라인 변경(U3의 두 번 복사 배포)은 U3의 병합에서 `site/scripts/publish-dist.sh` 호출 형태로 이미 반영되어 있습니다(`Jenkinsfile:116`). 단계의 산출물은 그 구성의 문서입니다.
- 2026-11-20T13:01:06Z — 단계 Step 4는 파이프라인 설정 파일 작성을 제안하지만, 이 단계의 `produces`는 markdown 세 개이므로 실행 가능한 설정은 두지 않고 `ci-config.md`에 구성으로 기록했습니다. 실제 실행 파일은 U3의 병합이 이미 정한 위치(`Jenkinsfile`)에 그대로 있습니다.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-20T13:01:06Z — 브라우저 스위트(1,242건)를 Jenkins로 옮기지 않았습니다. 팀 Testing Posture가 "Jenkins does not run every check"로 정한 배치이고, 옮기면 유지관리자가 확인한 야간 배포 리듬이 바뀝니다. 대신 강제 위치를 로컬 게이트로 표에 고정했습니다.
- 2026-11-20T13:01:06Z — `/` 255,387 B 예산을 CI 게이트로 만들지 않고 Build and Test의 측정 항목으로 남겼습니다. 반복 가능한 측정 스크립트 커밋은 이 단계의 산출물이 아닌 새 제품 코드이며, 후속 항목으로 기록했습니다.
- 2026-11-20T13:01:06Z — `Deferred`로 남은 코드 생성 추적 행을 `OK`로 바꾸지 않았습니다. 그 파일들의 소유는 Code Generation이고, 센서 판정은 있는 그대로 보고하고(미구현 ID `NFR1`, `NFR6`) 이유를 함께 적었습니다.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-20T13:01:06Z — `U1-NFR6.1`은 머지 커밋에서 Jenkins Verify가 도는 실행을 기다립니다. `develop` push가 배포이자 유지관리자의 결정이므로 이 단계가 대신 실행할 수 없습니다.
- 2026-11-20T13:01:06Z — `TEAM-E2E-A11Y`는 유지관리자의 16상태 수동 검토를 기다립니다. 검토가 끝나기 전까지 `npm run test:e2e`는 병합 게이트 밖에서 실패 닫힘을 유지합니다.
- 2026-11-20T13:01:06Z — 페이지 바이트 측정에 커밋된 스크립트가 없습니다. 반복 측정이 필요하면 별도 변경으로 스크립트를 저장소에 두는 것이 자연스럽습니다.
