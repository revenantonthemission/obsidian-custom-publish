# ST-E04 Local/CI Equivalent Verification Report (LC-U3-09)

## 문서 상태

- **단계**: CONSTRUCTION — U3 Code Generation Step 7
- **작성일**: 2026-07-29
- **대상 commit**: `81fb40e` (feature branch `codex/feature/resume-quality-gates`, base `50937d9`)
- **결정성 규칙**: [PD-U3-05](../nfr-design/nfr-design-patterns.md) — 재현 가능한 참조(명령·파일·test 이름·commit)만 판정 근거로 삼는다.

## 1. AC 대응 증거

| AC | 증거 | 상태 |
|---|---|---|
| AC-E04-01 (현 경로로 build/test 실행) | Verify sequence 로컬 등가 실행 전부 green (§2); `--manifest-path` 형태로 repo root CWD에서 `../fixtures/vault` 해석 검증 | **로컬 확보** |
| AC-E04-02 (seed 상시 기록) | fast-check runner가 매 실행 seed 출력 — 관측 2회: `-1861385005`, `640372461`. proptest는 실패 시에만 `cc` 기록(승인된 비대칭, OR-U3-05) | **확보** |
| AC-E04-03 (외부 서비스 없이 재현) | 재현 경로 모두 repo-local: fast-check는 출력 seed, proptest는 커밋된 `preprocessor/tests/*.proptest-regressions` | **확보** |
| AC-E04-04 (최소 범위·무배포) | 변경 표면 = Jenkinsfile 4건 + U3 소유 파일 + Justfile recipe; Deploy 내용·job 설정·인프라 무변경 (ID-U3-01) | **확보** |

## 2. 로컬 등가 실행 (Verify sequence, 2026-07-29)

| 명령 | 결과 | 시간 (기준선, NFR-U3-001) |
|---|---|---|
| `cargo test --release --manifest-path preprocessor/Cargo.toml` | 전 suite ok | **1분 38초** |
| `node scripts/crossunit/ensure-fixture-content.mjs` | homepage artifact present | <1초 |
| `npm run test:unit` | 16 files / 195 pass | 약 7초 |
| `npm run test:pbt` | 6 files / 37 pass, seed 출력 | 약 7초 |

환경: `CI` env **미정의** 확인 — pbt-runner가 정의 시 run count를 100→1,000으로 올리므로(NFR-U3-001) Jenkins 실측 시 재확인 항목.

## 3. Jenkinsfile 정적 검증 (Step 4)

- **구조 검토**: `git diff` 전문이 승인된 변경 집합(LC-U3-01~04)과 1:1 대응 — parameters block, Verify stage(순차 2-step + stage-local `post { failure }` archiver, 정정 glob), `rm -rf` 라인 삭제, Deploy `when` gate. Deploy 3-step·trigger·environment·pipeline-level post 불변.
- **Declarative linter**: 로컬 Jenkins(localhost:8080)의 `/pipeline-model-converter/validate`는 **인증 요구로 접근 불가**("Authentication required", anonymous) — 계획 Step 4 규정대로 기록하고 구조 검토로 대체.

## 4. Cross-unit gate 실행 증거 (Steps 1~2)

- **Evidence mapping**: [evidence-mapping.md](evidence-mapping.md) — §5.5 전 항목 판정; gap 정확히 2개(no-JS smoke, link sweep) = 설계 후보와 일치.
- **link sweep 정탐·무오탐**: fixture dist(asset 복사 포함)에서 실패가 **의도된 깨진 참조 1건**(`post-with-image` → `/assets/nonexistent-image.png`, missing-image edge fixture)뿐 — 오탐 0. fixture dist는 이 의도적 음성 때문에 sweep이 설계상 실패하며, green 기준은 완전한 실빌드다.
- **실빌드 green**: 실제 Vault preprocess(140 posts + 1 homepage) → 221-page build → `just crossunit` — **7,330개 내부 참조 전부 해석** + no-JS smoke 8/8 pass.
- **no-JS smoke**: chromium JS-비활성, 320×800/1440×900 — homepage 렌더·core nav 노출·`/resume` 도달(본문 CTA 경로)·`/resume` 직접 렌더.

## 5. U1/U2 회귀 확인 (Step 6)

| 명령 | 결과 |
|---|---|
| `just test` (debug) | 전 suite ok, 1분 57초 |
| `npm run test:unit` / `test:pbt` | 16/195 · 6/37 pass (전 변경 반영 후 재실행) |
| `npm run test:e2e` (기본) | `result: pass` |
| `HOMEPAGE_TODAY_OVERRIDE=2024-03-01 npm run test:e2e` | `result: pass` (§6의 결함 수정 후) |
| `npx astro check` | 0 errors / 6 hints — U1/U2 baseline 동일 |
| `npm run resume:pdf:verify` | pass, `surfaceParity: "pass"` — U1 provider 계약·수동 접근성 기록 무손상 (NFR-U3-005 로컬 integrated 증거) |

## 6. 실행 중 발견·처리된 사실 (비침묵)

1. **HP001 전제**: fresh workspace에서 Verify가 Preprocess보다 앞서므로 `test:unit`의 U1 격리 build가 HP001로 fail-closed — U2의 fixture materializer를 재사용하는 `ensure-fixture-content.mjs` 단계를 Verify에 추가 (부재 시에만 기록; 실제 preprocess 산출물 우선).
2. **package.json은 review subject**: `test:crossunit` script 추가가 수동 접근성 기록 digest를 이동시켜 e2e가 fail-closed(`MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`) — **즉시 원상 복구**로 digest·기록 유효성 회복을 e2e pass로 실증. U3 명령은 §5.6이 허용하는 Justfile narrow recipe **`just crossunit`** 으로 이행 (NFR Design Q2-A 문자에 대한 강제 편차, 격리 의도는 보존).
3. **`.post-tag` 대비 결함 (실제 결함, 소유 표면 수정)**: axe가 override 케이스 homepage에서 대비 4.39:1 검출 — 토큰 계산으로 라이트 테마 `--c-text-muted` on `--c-code-bg` = **4.40:1 (AA 미달)** 확정, `.post-tag`가 렌더되는 모든 페이지(/posts·/tags 포함, axe 커버리지 밖) 공통. U3는 소유하지 않으므로 사용자 승인(응답 "1") 후 소유 표면 2곳(`post.css`, `PostCard.astro`)의 `color`를 `--c-text`(라이트 16.03/다크 13.93)로 수정. review subject 무접촉. U2 Step 15의 양-케이스 pass 기록과의 상충은 axe color-contrast의 violation/incomplete 비결정성이 유력한 설명으로 기록한다.
4. **320px header nav는 JS 의존**: 모바일 메뉴 토글이 `addEventListener` 기반 — no-JS 방문자의 네비게이션 경로는 본문 링크(homepage profile CTA)이며 smoke가 그 경로를 검증한다 (U1 승인 설계의 실측 사실; 결함 아님).
5. **preview IPv4**: `astro preview`가 ::1에만 바인딩될 수 있어 crossunit config는 `--host 127.0.0.1` + URL readiness로 고정.

## 7. Pending — 실제 Jenkins 실행 (ID-U3-02 순서)

ST-E04의 마감 필요조건인 **Deploy 미호출 실제 Jenkins validation 실행** 증거는 이 report에 아직 없다 (§5.10: diff·local-only 불가). 남은 순서:

1. U3 → `develop` `--no-ff` 병합 (별도 승인).
2. `develop` → main 반영 (별도 승인).
3. **Run 1**: main 반영 직후 "Build Now" — parameter 등록 빌드, null-falsy로 Deploy skip (관찰 기록용; 다음 cron 창 이전 수행, 늦으면 그날 배포 1회 skip 사실을 여기 기록).
4. **Run 2**: "Build with Parameters" + 명시적 `RUN_DEPLOY=false` — **증거 실행**; console log(Verify 결과·seed 라인·stage skip)를 이 report에 전사.

이 실행이 전사되기 전까지 ST-E04는 열려 있으며, 마감은 §6 handoff(U3 → Integrated Build and Test)에서 일어난다.

### 7.1 Run 1 전사 (2026-07-29, "Started by user admin")

새 Jenkinsfile의 첫 실제 실행. console log 핵심 발췌:

- **Checkout**: `origin/develop` → `9022826` ("Merge branch 'codex/feature/resume-quality-gates' into develop") — **job의 추적 branch는 실측상 `develop`** (workspace `obsidian-blog-develop`). Infrastructure Q3-A의 운영자 답변(main/master)과 다름 — 정정 기록은 [infrastructure-design.md ID-U3-02](../infrastructure-design/infrastructure-design.md) 참조. develop push(`af32509..9022826`)만으로 가시성이 충족되었다.
- **Install**: npm ci ∥ cargo build --release — 캐시로 빠르게 완료.
- **Verify (신설 stage 실전 첫 실행, 전부 green)**:
  - `cargo test --release` — 전 suite ok (unit 33, publication_catalog 11, publication_output 6, publication_transform 6 포함).
  - `ensure-fixture-content: homepage artifact present`.
  - `test:unit` — 16 files / **195 passed** (7.68s).
  - `test:pbt` — `[pbt-run-config] {"numRuns":1000,"seed":1804141478,...}` → 6 files / **37 passed** (26.96s). **`CI` env가 Jenkins에 정의되어 있음이 실측 확인** — NFR-U3-001이 예고한 100→1,000 상향이 실제로 발생; CI Verify 기준선은 1,000-run 전제로 기록한다 (Verify 전체 약 1분).
  - **seed 상시 기록 실증 (AC-E04-02)**: seed `1804141478`이 console log에 남음.
- **Preprocess**: `rm -rf` 없이 정상 동작 (C09 정리 소유 실증) — "Stamped 0 posts", 140 posts + 1 homepage artifact.
- **Build Site**: 221 pages.
- **Deploy**: `Stage "Deploy" skipped due to when conditional` — **Deploy 미호출 실제 Jenkins 실행이 성립** (`params.RUN_DEPLOY` 미등록/false falsy 경로).
- Finished: **SUCCESS**.
- 관찰: pipeline-level post success의 "Blog deployed successfully." 메시지는 Deploy skip 시에도 출력된다 — 기존 post block의 표시 결함(무해; U3 범위 밖, 후속 결정 사항으로 기록).

### 7.2 Run 2 (증거 실행) — 대기

parameter가 등록된 상태에서 **"Build with Parameters" + 명시적 `RUN_DEPLOY=false`** 실행의 console log가 전사되면 ST-E04 마감 조건이 완결된다.
