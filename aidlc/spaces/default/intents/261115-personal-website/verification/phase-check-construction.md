# Phase Check — Construction → Operation

- **의도**: `261115-personal-website` (개인 웹사이트로의 블로그 고도화)
- **작성 단계**: CI Pipeline (`ci-pipeline`), 2026-11-20
- **검사 대상**: Construction 단계가 만든 4개 단위와 그 파이프라인
- **판정의 근거 문서**: `construction/build-and-test/cross-unit-traceability.md`, `construction/*/code-generation/traceability.json` (4개), `construction/*/code-generation/reviews/*.md` (11개), `construction/*/code-generation/code-summary.md` (4개), `construction/build-and-test/build-and-test-summary.md`, `construction/build-and-test/test-results.md`(`build-test-results`), `construction/ci-pipeline/ci-config.md`, `construction/ci-pipeline/quality-gates.md`, 저장소의 `Jenkinsfile`

## 1. 단계 문서가 요구하는 확인 항목

### 1.1 모든 Unit이 빌드·테스트되었는가 — **확인됨**

| 단위 | 산출물 | 5차 실행의 증거 |
|---|---|---|
| `u1-publish-boundary` | 전처리기 경계(게이트, 보행기, 카탈로그, 변환, 출력, 스탬핑 순서) | Rust 스위트 179건 통과, 단위 스위트 588건, `site/tests/e2e/hig-discovery.spec.ts` 3건이 3엔진 통과 (`build-test-results` R5.1–R5.4) |
| `u2-writing-section` | Writing 목록·태그·글 목록과 빈 주 홈 화면 | `site/tests/unit/homepage-empty-week.test.ts` 5건, `hig-writing.spec.ts`, `writing-lists.pbt.test.ts` 통과 |
| `u3-writing-moves` | 주소 이동, 리디렉션 테이블, 서버 조회 | `site/tests/unit/local-server.test.ts`, `legacy-redirects-build.test.ts` 통과, `REDIRECT_TARGET_MISSING` 빌드 실패 닫힘 확인 |
| `u4-navigation` | 내비게이션 모델·바·모바일 시트·중첩 경로 | `header-navigation-failure.test.ts` 4건, `hig-chrome.spec.ts` 3엔진 통과 |

실행된 스위트: Rust 179 테스트, 단위 588 테스트(51개 파일), 속성 36종, HIG 브라우저 1,242건 통과·81 스킵·0 실패(Chromium·Firefox·WebKit), `just crossunit` 16/16 통과. 포맷·타입 검사 클린.

### 1.2 코드 생성 표에 미해결 finding이 없는가 — **확인됨**

- 코드 생성 리뷰 11건의 판정은 모두 `READY`입니다 (`NOT-READY` 없음).
- 네 `traceability.json`에 `GAP` 행은 없습니다.
- 리뷰에서 나온 finding은 Build and Test가 제품과 기록 양쪽에서 처리했습니다. 5차 실행에서 U1-CG-R04를 포함한 리뷰 파생 행이 모두 `Met`입니다.
- 센서 기준 미구현 ID 2건(`NFR1`, `NFR6`)은 코드가 빠진 것이 아니라, 측정이 Build and Test 단계에 속하는 행이 `Deferred`로 남아 있기 때문입니다(§1.3).

### 1.3 단위 간 FR/NFR/AC 게이트가 통과했는가 — **통과하지 않음**

`aidlc engine sensor-traceability --stage build-and-test`의 판정은 `{"pass": false}`이고, 미구현 ID는 `NFR1`, `NFR6` 두 개입니다(2~4차 실행은 4개, 1차는 9개였고, 5차에서 `FR3.7`과 `AC3.4.1`이 빠졌습니다).

| ID | 센서가 보는 행 | Build and Test의 판정 |
|---|---|---|
| `NFR1` | u2 `NFR1.7`이 `Deferred` | **Met** — 실제 볼트 기준 106,391 B / 137행 = 777 B/행 (§6.4, 1차 실행; R5.6 이후 행 마크업 변경 없음) |
| `NFR6` | u1 `NFR6.2`–`NFR6.7`, u2 `NFR6.8`·`NFR6.9`가 `Deferred` | `NFR6.2`–`NFR6.9` **Met**. 단 **u1 `NFR6.1`은 Unverified** — 머지 커밋에서 Jenkins Verify가 초록이어야 하며(§1.4) |

센서는 코드 생성 단계의 `traceability.json`만 읽으므로, Build and Test의 판정과 센서 판정은 서로를 바꾸지 않습니다. 두 `Deferred` 행은 측정 주체가 Build and Test인 설계 의도대로 남겨 둔 것입니다.

### 1.4 CI 품질 게이트가 Build and Test가 기록한 명령을 강제하는가 — **확인됨**

`aidlc-state.md`의 Construction Verification Command와 Jenkins Verify 단계의 명령을 겹쳐 보면:

| Build and Test가 기록한 명령 | 강제 위치 |
|---|---|
| `cargo test --release` | Jenkins Verify (`Jenkinsfile:57`) + 로컬 게이트 |
| fixture 전처리 (`just preprocess`와 같은 입력) | Jenkins Verify (`Jenkinsfile:64`) + 로컬 게이트 |
| `npm run test:unit`, `npm run test:pbt` | Jenkins Verify (`Jenkinsfile:66`) + 로컬 게이트 |
| `cargo fmt --check` | 로컬 게이트만 — 팀 Testing Posture가 병합 전 실행으로 정함 |
| `npm run format:check` | 로컬 게이트만 — 같은 사유 |
| `npx astro check` | 로컬 게이트만 — 같은 사유 |
| `npx playwright test --config playwright.hig.config.ts` | 로컬 게이트만 — 같은 사유 |
| `just crossunit` | 로컬 게이트만 — 같은 사유 |

강제 위치가 갈리는 여섯 명령은 팀 규칙이 명시한 배치이며("Jenkins does not run every check, so before merging UI work we run the rest locally"), 어느 명령도 빠지지 않습니다. 전체 매핑은 `construction/ci-pipeline/quality-gates.md` §3·§4에 있습니다.

`TC-SF-CI`(병합 전에 선택된 테스트가 CI에서 실행됨)는 Build and Test가 소유 단계 `ci-pipeline`를 근거로 `N/A`로 두었던 행이며, 이 단계가 **Met**로 채웠습니다(§4).

## 2. 미해결 4건과 소유자

| 타깃 | 판정 | 소유 | 필요한 것 |
|---|---|---|---|
| `TEAM-E2E-A11Y` | Not Met | 유지관리자 | 변경이 정리된 뒤 16상태 수동 검토 1회(2–4시간) 후 `npm run test:e2e` (약 2분) |
| `U1-NFR6.1` | Unverified | ci-pipeline (이 단계) | `develop` push(배포) 뒤 첫 야간 실행 또는 수동 실행의 Verify 로그 (약 10분, 비용 없음) |
| `U1-SLO-NIGHTLY` | Unverified | observability-setup | 30일 야간 신호 후 판정 |
| `U1-SLO-PAGECOUNT` | Unverified | observability-setup | 운영 실행 후 판정 |

## 3. 판정

**조건부 통과 — 전이 차단 사유 없음.** 차단 사유 두 가지(추적성 파일 누락, 미해결 코드 생성 finding) 모두 없습니다: 네 `traceability.json`과 11개 리뷰가 모두 존재하고 `READY`이며 `GAP` 행이 없습니다.

다만 다음을 그대로 기록합니다.

- 단위 간 센서 판정은 `FAIL`이며, 미구현 ID 2건은 `Deferred`로 남겨 둔 측정 행이고 그중 `U1-NFR6.1`은 아직 증거가 없습니다(§1.3).
- 92개 타깃 판정표에는 미해결 4건이 남아 있습니다(§2). Build and Test 게이트에서 유지관리자가 이 실패를 수락한 결정(2026-11-20, `Accept failure`)과 이 표가 함께 Operation 단계로 넘어갑니다. **네 건은 이 표의 소유자에게만 달려 있으며, 이 표는 Operation 단계의 소유자가 다시 읽어야 합니다.**
- `npm run test:e2e`는 기록이 현재가 아니면 실패 닫힘을 유지합니다. 16상태 검토가 끝나기 전까지 이 스위트는 병합 게이트에 들어가지 않습니다.

Operation 단계(`deployment-pipeline`부터)가 시작할 때 읽어야 할 것은 두 가지입니다. 첫째, `U1-NFR6.1`의 증거는 배포 동작(`develop` push) 뒤에야 생기므로, 배포 실행 단계에서 야간 또는 수동 실행의 Verify 로그를 확인해야 합니다. 둘째, 두 SLO 행은 `observability-setup`이 소유합니다.

## 4. 증거 목록

| 항목 | 경로 |
|---|---|
| 단위 간 추적과 센서 판정 | `construction/build-and-test/cross-unit-traceability.md` |
| 단위별 추적 표 | `construction/{u1-publish-boundary,u2-writing-section,u3-writing-moves,u4-navigation}/code-generation/traceability.json` |
| 코드 생성 리뷰 (11건, 모두 READY) | `construction/*/code-generation/reviews/review-0*.md` |
| 92개 타깃 판정표 | `construction/build-and-test/build-and-test-summary.md` |
| 5차 실행 기록 | `construction/build-and-test/test-results.md` |
| CI 구성 | `construction/ci-pipeline/ci-config.md` |
| 품질 게이트 | `construction/ci-pipeline/quality-gates.md` |
| 파이프라인 정의 | `Jenkinsfile` |
| 팀 규칙 | `aidlc/spaces/default/memory/team.md` (`## Testing Posture`, `## Deployment`) |
