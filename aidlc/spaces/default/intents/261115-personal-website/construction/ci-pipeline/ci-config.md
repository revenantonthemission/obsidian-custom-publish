# CI 파이프라인 구성 — `261115-personal-website`

- **단계**: CI Pipeline (`ci-pipeline`), 2026-11-20
- **대상 저장소**: `obsidian-blog` (Rust 전처리기 + Astro 정적 사이트)
- **파이프라인 정의**: 저장소 루트의 `Jenkinsfile` (Declarative Pipeline) — 이 의도가 새 파일을 만들지 않습니다. U3이 Deploy 단계의 복사 절차를 `site/scripts/publish-dist.sh`로 합친 변경만 이미 반영되어 있고, 나머지 단계는 그대로입니다.
- **상위 산출물**: 각 단위의 `code-summary` (`construction/{u1-publish-boundary,u2-writing-section,u3-writing-moves,u4-navigation}/code-generation/code-summary.md`), `build-and-test-summary` (`construction/build-and-test/build-and-test-summary.md`), `build-test-results` (`construction/build-and-test/test-results.md`).

## 1. 목적

이 문서는 이 의도의 CI 구성을 확정된 사실로 기록합니다. 판단 근거는 다음 세 곳에 이미 있습니다.

- 팀 규칙: `aidlc/spaces/default/memory/team.md` (`## Way of Working`, `## Testing Posture`, `## Deployment`)
- 단위별 인프라 설계: `construction/u1-publish-boundary/infrastructure-design/cicd-pipeline.md`, `construction/u3-writing-moves/infrastructure-design/cicd-pipeline.md`
- Build and Test 5차 실행의 판정: `construction/build-and-test/build-and-test-summary.md` (92개 타깃, 87 Met / 1 Not Met / 3 Unverified / 1 N/A), `build-test-results` (R5.1–R5.8)

질문과 그 기록된 답은 `ci-pipeline-questions.md`에 있습니다.

## 2. 작업과 트리거

| 항목 | 값 | 근거 |
|---|---|---|
| 작업 이름 | `obsidian-blog-develop` | `team.md` `## Deployment` |
| Jenkins | 127.0.0.1:8081 (로컬 에이전트) | 같은 곳 |
| 트리거 | `cron('H 0 * * *')` — 매일 0시 | `Jenkinsfile:4-6` |
| 체크아웃 대상 | `origin/develop` (SCM Checkout) | `Jenkinsfile:32-34`, `team.md` `## Deployment` |
| 매개변수 | `RUN_DEPLOY` (기본값 true). 체크 해제 시 검증만 실행하고 Deploy를 건너뜁니다 | `Jenkinsfile:8-14` |
| 수동 실행 | Jenkins에서 즉시 실행 가능 (`RUN_DEPLOY`를 체크해 두면 배포까지) | `team.md` `## Deployment` — "through a manual Jenkins run or `just deploy`" |

**push 트리거는 없습니다.** 파이프라인은 push마다 도는 게이트가 아니라, 병합된 `develop`을 야간에 한 번 빌드·검증·배포하는 작업입니다. 병합을 막는 것은 §7의 로컬 게이트입니다. 팀 규칙이 "Jenkins runs them before every nightly deploy"와 "The Verify stage is the production gate"로 정한 배치입니다.

## 3. 단계 구성 (현재 `Jenkinsfile`)

| # | 단계 | 명령 | 게이트 | 이 의도의 변경 |
|---|---|---|---|---|
| 1 | Checkout | `checkout scm` | — | 없음 |
| 2 | Install | `cd site && rm -rf .generated && npm ci` / `cargo build --release --manifest-path preprocessor/Cargo.toml` (병렬) | — | 없음. `.generated`을 지우는 이유는 폰트 머티리얼라이저가 버전 불일치 산출물에 실패 닫힘하기 때문 (`Jenkinsfile:41-43`) |
| 3 | Verify | `cargo test --release --manifest-path preprocessor/Cargo.toml` → fixture 전처리(`./fixtures/vault/Notes` + `--pages ./fixtures/vault/Pages`) → JSON 4종을 `site/public/`으로 복사 → `cd site && npm run test:unit && npm run test:pbt` | **프로덕션 게이트.** 하나라도 실패하면 작업이 중단되고 Deploy까지 가지 않습니다 | 없음. U1이 fixture 페이지를 추가했고 U2·U3·U4가 단위 스위트에 테스트를 더했습니다 |
| 4 | Preprocess | `obsidian-press --stamp-published "${VAULT_PATH}" ./content --pages "${PAGES_PATH}"` → JSON 복사 → `node site/scripts/sync-public-assets.mjs content/assets site/public/assets` | exit 0 필수 (exit 1·2가 작업을 멈춤) | 없음. `VAULT_PATH`/`PAGES_PATH`는 `Areas/Notes`와 `Areas/Pages`로 고정되어 있습니다 (`Jenkinsfile:17-21`) |
| 5 | Build Site | `cd site && npx astro build` | 실패 시 작업 중단 | U3이 등록한 Astro 통합의 build-done 훅이 이 빌드 안에서 `_redirects.json`을 씁니다. 문법 위반이나 대상 페이지 누락은 `REDIRECT_TARGET_MISSING`으로 빌드를 실패시킵니다 |
| 6 | Deploy | `bash site/scripts/publish-dist.sh site/dist "${WEB_ROOT}"` | 앞 단계가 모두 초록일 때만, 그리고 `RUN_DEPLOY`가 체크됐을 때 | **U3이 바꾼 부분입니다.** 스크립트 하나로 트리 복사 → 리디렉션 테이블 복사(`--checksum`, 없으면 `rm -f`) 순서를 지킵니다. `Justfile`의 `deploy` 레시피가 같은 스크립트를 호출하므로 두 배포 정의가 같은 절차를 수행합니다 |

`post` 블록은 성공·실패 메시지만 출력합니다 (`Jenkinsfile:121-124`). Verify 실패 시에는 축소된 property 카운터예시를 `preprocessor/tests/*.proptest-regressions`로 보존합니다 (`Jenkinsfile:68-74`).

## 4. 실행 환경

| 변수 | 값 | 비고 |
|---|---|---|
| `WEB_ROOT` | `~/Sites/obsidian-blog` (기본값, 환경으로 대체 가능) | launchd 서비스 `dev.rvnnt.blog`가 실제로 serves하는 디렉터리 |
| `VAULT_PATH` | 실제 Obsidian 볼트의 `Areas/Notes` | 야간 배포는 이 폴더를 읽고 `published` 날짜를 채웁니다 |
| `PAGES_PATH` | 실제 볼트의 `Areas/Pages` | 아직 없으면 전처리기가 "not found"를 찍고 계속합니다 |
| `PUPPETEER_EXECUTABLE_PATH` | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` | `.puppeteer-config.json`은 gitignore 대상이라 CI 작업 공간에 없고, Mermaid 렌더링이 이 경로에 의존합니다 (`Jenkinsfile:22-27`) |
| `CARGO_HOME` | `${WORKSPACE}/.cargo` | 작업 공간 캐시 |

Preprocess 단계는 `chrome-headless-shell`이 있으면 그 바이너리를 우선 사용합니다(`Jenkinsfile:79-89`). 데스크톱 Chrome이 야간 부하에서 CDP 노출에 30초를 넘겨 puppeteer가 타임아웃된 이력이 있기 때문입니다.

## 5. 배포 단위와 전략

- **환경**: 하나. 스테이징이 없습니다. `develop`이 곧 프로덕션이며 `main`은 마일스톤 표식입니다.
- **전략**: 전량 교체(recreate). 정적 사이트 한 개를 한 호스트에 두므로 blue-green·canary가 성립하지 않습니다.
- **산출물**: `site/dist/` 트리 자체. 버전·태그가 없고 이전 빌드도 보존되지 않습니다.
- **롤백**: `develop`에서 해당 커밋을 되돌리고 다시 빌드합니다 — Jenkins 수동 실행 또는 `just deploy`. 별도 아티팩트를 되돌릴 필요가 없습니다.
- **비밀**: 없음. 전처리·빌드·배포는 모두 로컬 경로와 파일 복사만 씁니다. 파이프라인이 만나는 유일한 원격은 `checkout scm`이 SSH로 당기는 `origin`(`git@github.com:revenantonthemission/obsidian-custom-publish.git`)이며, 키는 Jenkins 에이전트에 있습니다.

## 6. 배포 후 확인 (사람의 수동 확인)

| 확인 | 시점 | 주체 | 비고 |
|---|---|---|---|
| `/` 와 글 하나가 HTTP 200 | 배포 직후마다 | 유지관리자 | 기존 팀 관행 (`team.md` `## Deployment`) |
| `/tags`가 301 + `Cache-Control: no-cache`, `Location`이 가리키는 대상이 200 | U3의 이동된 페이지가 처음 배포된 야간부터, 배포마다 | 유지관리자 | U3이 추가한 확인 (`construction/u3-writing-moves/infrastructure-design/cicd-pipeline.md` §"Manual release check") |

자동화된 post-deploy 러너는 아직 없습니다. 이 항목을 별도 작업으로 기록해 두었습니다(`F1`).

## 7. 병합 전 로컬 게이트

`aidlc-state.md`의 **Construction Verification Command**이 병합 게이트입니다.

```
(cd preprocessor && cargo fmt --check && cargo test --release) && just preprocess && (cd site && npm run test:unit && npm run test:pbt && npm run format:check && npx astro check && npx playwright test --config playwright.hig.config.ts) && just crossunit
```

- Build and Test 5차 실행에서 이 명령은 통과했습니다 (`build-test-results` R5.1–R5.3): Rust 179 테스트, 단위 588 테스트(51개 파일), 속성 36종, HIG 브라우저 1,242건 통과·81 스킵·0 실패(Chromium/Firefox/WebKit), `just crossunit` 16/16 통과, `cargo fmt --check`·`npm run format:check`·`npx astro check` 클린.
- Jenkins Verify가 돌지 않는 부분(포맷, 타입 검사, 브라우저 검사, 링크 스윕)은 팀 규칙이 병합 전 로컬 실행으로 정한 것이며, 그 목록이 `quality-gates.md` §3에 매핑되어 있습니다.
- `npm run test:e2e`는 병합 게이트에 들어 있지 않습니다. 수동 16상태 접근성 검토 기록이 현재가 아니면 `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`로 실패 닫힘을 유지하기 때문입니다(§9).

## 8. 이 의도가 파이프라인에 남긴 변경

1. **Deploy 단계의 복사 절차만 변경** (U3). `site/scripts/publish-dist.sh` 하나로 트리와 리디렉션 테이블을 순서대로 복사하고, `Justfile`의 `deploy` 레시피와 같은 스크립트를 호출합니다. 페이지가 먼저 도착하고 그 페이지를 가리키는 규칙이 나중에 도착하므로, 새 규칙이 자기 대상보다 먼저 살아날 수 없습니다.
2. **단계 추가 없음.** 검증 단계·환경·스크립트·시크릿은 늘지 않았습니다.
3. **U1의 fixture 페이지 입력.** Verify 단계의 fixture 전처리가 `--pages`를 받고 `site/public/`에 JSON 네 종을 복사하므로, U1이 추가한 사이트 페이지가 단위 스위트에서 읽힙니다.

## 9. 미해결 — 이 단계가 소유하는 항목

| 항목 | 상태 | 처리 |
|---|---|---|
| `U1-NFR6.1` — U1 머지 커밋에서 Jenkins Verify가 초록 | Unverified | 머지 커밋은 `develop`에 있습니다(`c8a64f1` 이후의 머지). `develop` push가 배포이자 유지관리자의 결정이므로, push 뒤 첫 야간 실행(또는 수동 실행)이 이 타깃의 증거가 됩니다. 약 10분, 비용 없음 |
| 16상태 접근성 검토 (`TEAM-E2E-A11Y`) | Not Met | 변경이 정리된 뒤 한 번 다시 작성합니다. 유지관리자 작업 2–4시간 |
| 자동 post-deploy 러너 (`F1`) | 미착수 | 별도 작업으로 기록됨. 이 단계의 범위 밖 |
| `/` 255,387 B 예산의 반복 측정 | Build and Test 단계에서 측정 | 측정 스크립트가 저장소에 커밋되어 있지 않습니다. 반복 가능한 스크립트 커밋은 별도 변경입니다 |

## 10. 변경하지 않은 것 (근거)

- **브라우저 검증을 Jenkins로 옮기지 않음.** 팀 규칙이 "Jenkins does not run every check"로 정했고, 브라우저 스위트(1,242건)는 로컬 병합 게이트로 유지합니다. 야간 Verify는 Rust·단위·속성 세 스위트만 돌립니다.
- **커버리지 하한을 추가하지 않음.** 팀 규칙이 커버리지를 보고만 하고 하한을 두지 않습니다("We report test coverage … but enforce no minimum percentage"). Build and Test 5차의 측정치는 Rust 87.45%, 사이트 54.01%입니다.
- **스테이징·블루그린·카나리를 추가하지 않음.** 환경이 하나이고 배포 단위가 정적 트리 전체이므로 성립하지 않습니다.
- **기능 플래그를 추가하지 않음.** 페이지 이동과 리디렉션 테이블이 한 빌드에 함께 들어갑니다.
