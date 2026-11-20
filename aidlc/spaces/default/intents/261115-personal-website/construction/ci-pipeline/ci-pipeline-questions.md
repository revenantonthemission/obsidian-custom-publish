# CI Pipeline 질문과 답변

- **단계**: CI Pipeline (`ci-pipeline`), 2026-11-20, `261115-personal-website`
- **작성자**: CI 파이프라인 담당 에이전트 (aidlc-pipeline-deploy-agent)
- **왜 다시 묻지 않았는지**: 이 단계의 네 주제(CI 도구, 브랜치 전략, 병합 전 품질 게이트, 아티팩트 저장소)는 모두 이전 단계·저장소·팀 규칙에 이미 답이 기록되어 있습니다. 프로토콜의 "답이 이미 기록된 질문은 다시 묻지 않는다" 규칙에 따라 질문을 파일에 남기고, 기록된 답과 그 근거를 함께 적었습니다. 답이 달라지면 게이트의 구성이 달라지므로, 이 파일은 승인 게이트에서 수정 대상으로 읽힙니다.
- **근거 문서**: `aidlc/spaces/default/memory/team.md` (`## Way of Working`, `## Testing Posture`, `## Deployment`), 저장소의 `Jenkinsfile`, `construction/u1-publish-boundary/infrastructure-design/cicd-pipeline.md`, `construction/u3-writing-moves/infrastructure-design/cicd-pipeline.md`, `construction/build-and-test/build-and-test-summary.md`, `construction/build-and-test/test-results.md`(`build-test-results`), 네 단위의 `construction/{u1-publish-boundary,u2-writing-section,u3-writing-moves,u4-navigation}/code-generation/code-summary.md`.

## Q1. [릴리스 엔지니어] 이 프로젝트의 CI 도구는 무엇인가요?

nightly 배포를 실행하는 실제 파이프라인이 무엇인지 알아야 Jenkins 단계 목록·트리거·게이트 배치를 확정할 수 있습니다.

- A. Jenkins (저장소의 `Jenkinsfile`로 정의된 Declarative Pipeline)
- B. GitHub Actions (`.github/workflows/*.yml`)
- C. AWS CodePipeline / CodeBuild
- D. 위 세 가지 외의 다른 도구
- X. Other (please specify)

[Answer]: A

기록된 근거: `team.md` `## Deployment` — "The Jenkins job `obsidian-blog-develop` (cron `H 0 * * *`, Jenkins on 127.0.0.1:8081) checks out `origin/develop`" ✓. 저장소의 `Jenkinsfile:1-125`가 그 유일한 파이프라인 정의 ✓.

## Q2. [릴리스 엔지니어] 브랜치 전략은 무엇인가요?

파이프라인이 어느 브랜치를 체크아웃하고 어디로 배포할 수지를 정합니다.

- A. `develop` 단일 트렁크 — 짧은 가지가 `develop`으로 머지되고, `develop`의 push가 곧 배포다
- B. GitFlow (`develop` 통합 + `main` 릴리스)
- C. GitHub Flow (`main` + PR)
- D. Release 브랜치 (`release/*`에서 동결 후 `main`으로)

[Answer]: A

기록된 근거: `team.md` `## Way of Working` — "`develop` is our trunk… pushing `develop` is the release" ✓. `## Deployment` — "We deploy `develop` to production every night, with no staging environment and no approval step" ✓. 저장소에는 `origin`에 `develop`와 `main`만 있습니다 ✓.

## Q3. [릴리스 엔지니어] 빌드 산출물을 보관하는 아티팩트 저장소를 사용하나요?

배포 단위와 버전 관리 방식을 정합니다.

- A. 없음 — 정적 사이트 트리(`site/dist/`)를 웹 루트에 그대로 미러링하고, 배포된 트리 자체가 산출물이다
- B. Amazon ECR (컨테이너 이미지)
- C. Amazon S3 (빌드 아카이브)
- D. Amazon CodeArtifact (패키지 저장소)

[Answer]: A

기록된 근거: `team.md` `## Deployment` — "Deploy copies `site/dist/` into the web root `~/Sites/obsidian-blog` with `rsync -a --delete`" ✓, "Releases are not tagged, and no previous build is kept" ✓. `construction/u3-writing-moves/infrastructure-design/cicd-pipeline.md` §"Feature flags and artifact management" — "The deployed artifact is the `site/dist/` tree itself… The artifact is never versioned, tagged or stored apart from the build that produced it" ✓.

## Q4. [품질 담당] 병합 전에 어떤 품질 게이트가 통과해야 하나요?

각 게이트의 명령과 강제 위치(원격 파이프라인 대 로컬)를 확정해야 합니다. Build and Test 5차 실행이 판정한 92개 타깃(87 Met / 1 Not Met / 3 Unverified / 1 N/A)이 이 목록에 매핑됩니다.

- A. 팀 기록의 기존 조합 — Jenkins Verify가 Rust·단위·속성 스위트를 막고, 병합 전 로컬 게이트가 포맷·타입·브라우저·링크 스윕을 막는다
- B. Jenkins Verify만 게이트로 삼는다 (브라우저 검사 제외)
- C. 로컬 게이트만 삼는다 (원격 파이프라인은 배포 전용)
- D. 위 조합 외의 다른 구성

[Answer]: A

기록된 근거: `team.md` `## Testing Posture` — "Jenkins runs them before every nightly deploy. They are `cargo test --release`… `npm run test:unit`… and `npm run test:pbt`" ✓, "Jenkins does not run every check, so before merging UI work we run the rest locally: `npm run format:check`, `npx astro check`, `just crossunit`, the Playwright browser checks, including `npm run test:e2e` when the profile routes change" ✓. `team.md` `## Deployment` — "The Verify stage is the production gate" ✓. 매핑표는 `quality-gates.md` §3 ✓.

## 기록되지 않은 판단 (사람에게 다시 묻지 않은 것)

- **자동화 post-deploy 러너**: 배포 후 HTTP 200 확인과 `/tags` 리디렉션 확인은 사람의 수동 확인으로 남습니다. 자동 러너는 별도 작업으로 이미 기록되어 있습니다(`F1`, `inception/practices-discovery/evidence.md`, `inception/requirements-analysis/requirements.md`). 이 단계는 그 항목을 새로 만들지 않습니다.
- **16상태 접근성 검토 기록**: `npm run test:e2e`는 기록 다이제스트가 최신이 아니면 `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`로 실패 닫힘을 유지합니다. 기록은 변경이 정리된 뒤 한 번 다시 작성합니다(팀 Testing Posture). 이 단계는 게이트를 새로 만들지 않고 그 위치를 그대로 기록합니다.
- **페이지 바이트 예산의 반복 측정**: NFR1.8의 `/` 255,387 B 예산은 Build and Test가 Chromium + CDP `encodedDataLength`로 측정해 판정합니다. 저장소에는 측정 스크립트가 커밋되어 있지 않으므로, 이 게이트는 자동 CI 게이트가 아니라 Build and Test 단계의 측정 항목으로 남습니다. 반복 가능한 스크립트 커밋은 별도 변경입니다.
