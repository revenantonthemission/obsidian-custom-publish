# 품질 게이트 정의 — `261115-personal-website`

- **단계**: CI Pipeline (`ci-pipeline`), 2026-11-20
- **대상**: Build and Test 5차 실행이 판정한 92개 타깃 (`construction/build-and-test/build-and-test-summary.md`의 Target Verification Matrix: 87 Met / 1 Not Met / 3 Unverified / 1 N/A). 실행 기록은 `build-test-results`(`test-results.md`) R5.1–R5.8, 단위별 구현 근거는 각 단위의 `code-summary`에 있습니다.
- **파이프라인 구성**: `ci-config.md`

## 1. 게이트 목록

| # | 게이트 | 강제 위치 | 실패 시 |
|---|---|---|---|
| G1 | **Verify (프로덕션 게이트)** — Rust 스위트, fixture 전처리, 단위 스위트, 속성 스위트 | Jenkins `obsidian-blog-develop`의 Verify 단계 (`Jenkinsfile:55-75`) | 야간 작업 중단, Deploy 미실행, 축소 카운터예시 아카이브 보존 |
| G2 | **병합 전 로컬 게이트** — 포맷, 타입 검사, 브라우저 검사(3엔진), JS 비활성 스모크·링크 스윕 | 유지관리자의 로컬 실행, `aidlc-state.md`의 Construction Verification Command | 병합 보류 |
| G3 | **접근성 검토 기록 게이트** — `npm run test:e2e`의 수동 16상태 기록 대조 | 테스트 제공자 자체 (`site/scripts/profile/accessibility-review-contract.mjs`) | 기록이 최신이 아니면 `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`로 실패 닫힘. 현재 병합 게이트 밖 |
| G4 | **배포 산출물 순서 게이트** — 페이지가 리디렉션 규칙보다 먼저 도착 | Jenkins Deploy 단계 → `site/scripts/publish-dist.sh` | 빌드가 `REDIRECT_TARGET_MISSING`으로 실패하면 테이블이 쓰이지 않고 Deploy까지 가지 않음 |
| G5 | **배포 후 확인** — `/`·글 하나 HTTP 200, `/tags` 301과 대상 200 | 유지관리자의 수동 확인 | 롤백(`develop` 되돌리기 + 재빌드) |
| G6 | **운영 신호 게이트** — 야간 작업 초록률 ≥ 95 % (30일), 예기치 않은 사이트 페이지 수 0 | 관측 단계(`observability-setup`)가 운영 신호로 판정 | 운영 단계의 소유 |

## 2. G1 — Jenkins Verify가 강제하는 것

| 명령 | 막는 대상 | 관련 타깃 |
|---|---|---|
| `cargo test --release --manifest-path preprocessor/Cargo.toml` | Rust 단위·통합·property 스위트의 실패 | U1의 전처리·게이트·카탈로그 행, U3의 서버·테이블 행, U4의 모델 행 |
| `./preprocessor/target/release/obsidian-press ./fixtures/vault/Notes ./content --pages ./fixtures/vault/Pages` | fixture 전처리의 실패 (exit 1·2) | U1의 페이지 입력 행, U2·U3·U4의 콘텐츠 입력 행 |
| `cp content/{search-index,graph,previews,nav-tree}.json site/public/` | 단위 스위트가 읽을 JSON 4종의 준비 | 단위 스위트 전체 |
| `cd site && npm run test:unit && npm run test:pbt` | 단위 스위트와 속성 스위트의 실패 | U1의 콘텐츠·자산 복사 행, U2의 목록 행, U3의 주소·테이블 행, U4의 내비게이션·중첩 경로 행 |

Verify 단계가 막지 않는 것(§3)이 팀 규칙으로 확정되어 있습니다.

## 3. G2 — 병합 전 로컬 게이트가 강제하는 것

Construction Verification Command 한 줄이 이 게이트 전체입니다.

| 명령 | 막는 대상 | 비고 |
|---|---|---|
| `cargo fmt --check` | Rust 포맷 | 팀 Code Style |
| `cargo test --release` | Rust 스위트 | Jenkins와 동일 |
| `just preprocess` | fixture 전처리 | Jenkins Verify와 같은 fixture 입력 |
| `npm run test:unit` | 단위 스위트 | Jenkins와 동일 |
| `npm run test:pbt` | 속성 스위트 | Jenkins와 동일 |
| `npm run format:check` | Prettier | Jenkins에 없음 — 팀 Testing Posture가 병합 전 로컬 실행으로 정함 |
| `npx astro check` | 타입 검사 | Jenkins에 없음 — 같은 사유 |
| `npx playwright test --config playwright.hig.config.ts` | 브라우저 검사 (Chromium·Firefox·WebKit, 1,242건) | Jenkins에 없음 — 같은 사유. 브라우저 동작을 요구하는 타깃의 유일한 증거 |
| `just crossunit` | JS 비활성 스모크(16건)와 링크 스윕(내부 참조 816개, 40개 페이지) | Jenkins에 없음 — 같은 사유. fixture의 선언된 깨진 이미지 1건만 남고 그것도 실패 사유가 아님 |

**G2가 G1을 대체하지 않습니다.** 두 게이트는 같은 스위트를 서로 다른 위치에서 돌립니다: Jenkins는 배포 직전의 마지막 방어선이고, 로컬 게이트는 병합을 막는 첫 방어선입니다.

## 4. 매핑 — 92개 타깃을 게이트에 배정

| 게이트 | 담당 타깃 유형 | 판정 |
|---|---|---|
| G1 Jenkins Verify | Rust·단위·속성 스위트로 확인되는 모든 행 | Met (Build and Test 5차) |
| G2 로컬 게이트 | 브라우저 동작·링크 무결성·타입·포맷을 요구하는 행 (`AC7.1.1`–`AC7.1.4`, U2·U3·U4의 브라우저 행) | Met (Build and Test 5차) |
| G3 접근성 검토 | `TEAM-E2E-A11Y` | **Not Met** — 수동 16상태 검토 대기 |
| G4 배포 순서 | U3 `NFR5.25`(테이블이 자기 대상보다 나중에 생김), U3 `NFR5.22` | Met (U3의 Vitest + 빌드 실패 닫힘) |
| G5 배포 후 확인 | 배포 절차 자체(롤백 포함) | 유지관리자 수동 확인 — 자동 러너는 `F1`로 별도 기록 |
| G6 운영 신호 | `U1-SLO-NIGHTLY`, `U1-SLO-PAGECOUNT` | **Unverified** — 30일 운영 신호 필요 (`observability-setup` 소유) |
| 측정 후 판정 (게이트 아님) | `U2-NFR1.8`, `U4-PD-ROOT-BYTES`(페이지 바이트), `U1-NFR6.6`(스위트 시간), `TC-SF-COV80`, `TEAM-RUST-COV`(커버리지) | Met. 커버리지는 팀 규칙대로 보고만 하고 하한을 두지 않습니다 |
| 이 단계 소유 | `U1-NFR6.1`(머지 커밋에서 Jenkins Verify 초록) | **Unverified** — `develop` push(배포) 뒤 첫 야간 또는 수동 실행이 증거 |

### `TC-SF-CI`의 처리

Build and Test는 `TC-SF-CI`(병합 전에 선택된 테스트가 CI에서 실행됨)를 소유 단계가 `ci-pipeline`인 `N/A`로 두었습니다. 이 단계가 그 행을 채웁니다.

- **판정: Met.** Jenkins Verify가 병합된 `develop`에서 Rust 스위트·단위 스위트·속성 스위트를 실행하고(`Jenkinsfile:55-67`), 병합 전에는 §3의 로컬 게이트가 브라우저 검사까지 포함한 선택된 테스트 전체를 실행합니다.
- **강제 위치의 차이는 팀 규칙의 명시적 결정**입니다("Jenkins does not run every check, so before merging UI work we run the rest locally"). 행은 weakened되지 않았고, 어느 위치에서 어떤 명령이 도는지 위 표에 고정했습니다.
- 이 단계의 산출물은 CI 구성이며, 타깃 자체의 증거는 Jenkins 실행 로그입니다.

## 5. 게이트가 아닌 것 — 왜

| 항목 | 이유 |
|---|---|
| 커버리지 하한 | 팀 Testing Posture: "We report test coverage … but enforce no minimum percentage". 5차 측정: Rust 87.45%, 사이트 54.01% — 보고만 합니다 |
| `npm run test:e2e`의 병합 게이트 편입 | 수동 16상태 기록이 현재가 아니면 실패 닫힘을 유지합니다. 기록은 변경이 정리된 뒤 한 번 다시 작성합니다. 그전까지 이 스위트는 병합 게이트 밖이며, 같은 동작은 HIG 브라우저 스위트와 `just crossunit`이 이미 덮습니다 |
| `/` 255,387 B 예산 | Build and Test 단계의 측정 항목입니다(Chromium + CDP `encodedDataLength`, 캐시 비활성, 1440×900, 라우트당 새 컨텍스트 3개). 저장소에 측정 스크립트가 커밋되어 있지 않아 반복 가능한 CI 게이트가 아닙니다. 반복 스크립트 커밋은 별도 변경입니다 |
| SLO(야간 초록률, 페이지 수) | 30일 운영 신호가 필요한 항목으로 `observability-setup` 소유입니다 |
| 아티팩트 저장소·버전 태그·롤백 보관 | 아티팩트가 `site/dist/` 트리 자체이고 이전 빌드를 보존하지 않습니다(`team.md` `## Deployment`) |

## 6. 실패 시 동작

| 게이트 | 실패 지점 | 동작 |
|---|---|---|
| G1 | Verify | 작업 중단, Deploy 미실행, 이전 빌드가 계속 살아 있음, property 카운터예시 보존 (`Jenkinsfile:68-74`) |
| G2 | 로컬 | 병합하지 않음. 브랜치와 워크트리는 유지 |
| G3 | `npm run test:e2e` | `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` — 검토 대상으로 지정된 파일이 바뀌면 즉시 닫힘. Build and Test 5차에서 3회 연속 동일 결과 |
| G4 | Build Site | `REDIRECT_TARGET_MISSING` — 테이블을 쓰지 않고 빌드 실패, Deploy 미실행 |
| G5 | 배포 후 확인 | `develop`에서 되돌리고 재빌드(수동 Jenkins 실행 또는 `just deploy`). 태그가 없고 이전 빌드가 없으므로 되돌린 소스에서 다시 만듭니다 |
| G6 | 운영 신호 | `observability-setup`의 소유 |

## 7. 이 단계가 넘기는 미해결 4건

| 타깃 | 판정 | 소유 | 필요한 것 |
|---|---|---|---|
| `TEAM-E2E-A11Y` | Not Met | 유지관리자 | 변경이 정리된 뒤 16상태 수동 검토 1회(2–4시간) 후 `npm run test:e2e`(약 2분) |
| `U1-NFR6.1` | Unverified | ci-pipeline (이 단계) | `develop` push 뒤 첫 야간 실행 또는 수동 실행의 Verify 로그 (약 10분, 비용 없음) |
| `U1-SLO-NIGHTLY` | Unverified | observability-setup | 30일 야간 신호 후 판정 |
| `U1-SLO-PAGECOUNT` | Unverified | observability-setup | 운영 실행 후 판정 |

Build and Test 게이트에서 유지관리자가 이 실패를 수락한 결정(2026-11-20, `Accept failure`)과 이 표가 함께 Operation 단계로 넘어갑니다. 이 표는 `verification/phase-check-construction.md`에도 옮겨 적었습니다.
