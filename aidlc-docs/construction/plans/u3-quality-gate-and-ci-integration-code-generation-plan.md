# U3 Code Generation Plan — Quality Gate and CI Integration

## 문서 상태

- **단계**: CONSTRUCTION — U3 Code Generation
- **상태**: 완료 및 승인됨 (계획 승인·완료 승인 모두 2026-07-29, 사용자 응답 "승인"; Step 1~8 실행 기록은 aidlc-state.md와 code/ 산출물 참조)
- **Unit**: U3 Quality Gate and CI Integration
- **작성일**: 2026-07-29
- **Feature Branch**: `codex/feature/resume-quality-gates`
- **선행 승인**: U3 Functional Design · NFR Requirements · NFR Design · Infrastructure Design (모두 2026-07-29, "승인")

## 1. 입력과 전제

- 승인된 설계 전체: OR-U3-01~10, AR-U3-01~05, NFR-U3-001~008, PD-U3-01~05, LC-U3-01~09, ID-U3-01~04.
- §5.9 Code Generation 산출: "browser/static/PDF adapters, minimal Jenkins/optional Just wiring and verification evidence".
- ID-U3-02: 실제 Jenkins 실행 증거는 main 반영(별도 승인) 뒤 2-run 순서로 확보 — **이 단계 안에서는 로컬 등가 실행 + Jenkinsfile 정적 검증까지**.
- 불변 경계: U1/U2 production source·owner-local test·review-subject 파일, Deploy stage 내용, dependency 블록·lockfile, Jenkins job 설정, external Vault, push/merge/배포.

## 2. 실행 단계 (Part 2)

### Step 1 — Evidence mapping 표 작성 (LC-U3-05)

§5.5 cross-unit 항목 전체를 U1 spec 6종 + U2 `homepage.spec.ts` + `resume:pdf:verify`의 실제 test 이름과 대조해 covered/gap을 판정하는 `aidlc-docs/construction/u3-quality-gate-and-ci-integration/code/evidence-mapping.md`를 작성한다. **이 표가 Step 2의 존재를 결정한다** — 전 항목 covered면 Step 2는 "생성 없음"으로 기록하고 건너뛴다.

### Step 2 — Gap adapter 구현 (조건부; LC-U3-06/07/08)

표가 gap으로 판정한 항목만: no-JS smoke는 `site/tests/e2e/` 별도 파일(chromium, JS 비활성, 320×800/1440×900), link sweep은 `site/dist/` 정적 순회. `test:crossunit` script를 scripts 필드에만 추가. 새 순수 로직이 생기면 PBT 처치를 명시 기록 (adapter-rules §3). U1 evidence 기계·record 불변 확인.

### Step 3 — Jenkinsfile 변경 (LC-U3-01~04)

`parameters { booleanParam(RUN_DEPLOY, defaultValue: true) }` + Verify stage(순차: cargo test --release → test:unit → test:pbt; `post { failure }`에 정정된 glob `preprocessor/tests/*.proptest-regressions`, `allowEmptyArchive: true`) + Deploy `when { expression { params.RUN_DEPLOY } }` + Preprocess의 `rm -rf` 라인 제거. Deploy 내용 3-step·trigger·environment·pipeline-level post 불변.

### Step 4 — Jenkinsfile 정적 검증

구조 검토(승인된 변경 집합 대비 diff 검증)를 기본으로 하고, 로컬 Jenkins 서버의 declarative linter(`/pipeline-model-converter/validate`)가 접근 가능하면 실행해 결과를 기록한다 (접근 불가 시 그 사실을 기록하고 구조 검토로 대체 — 실제 실행 검증은 ID-U3-02 순서가 소유).

### Step 5 — 로컬 등가 실행 (Verify sequence)

repo root에서 Verify와 동일한 명령 sequence를 실행해 성공을 증명한다: `cargo test --release --manifest-path preprocessor/Cargo.toml`(CWD 가정 검증 포함) → `cd site && npm run test:unit && npm run test:pbt`. 소요 시간을 기준선으로 기록 (NFR-U3-001; `CI` env 미정의 확인 포함), fast-check seed 출력 발췌.

### Step 6 — U1/U2 회귀 확인

`just test` · `npm run test:unit` · `npm run test:pbt` · `npm run test:e2e`가 U2 종료 시점과 동일하게 통과함을 확인한다 (Step 2가 site를 변경한 경우 필수; 변경이 없어도 비간섭 증거로 1회 실행). `npx astro check` baseline(0 errors/6 hints) 유지 확인.

### Step 7 — ST-E04 report 작성 (LC-U3-09)

`aidlc-docs/construction/u3-quality-gate-and-ci-integration/code/st-e04-report.md`: 로컬 등가 실행 증거(명령·결과·시간·seed 발췌·commit SHA), Jenkinsfile 정적 검증 결과, evidence mapping 참조를 전사하고, **실제 Jenkins 2-run 실행 증거가 main 반영(별도 승인) 이후 추가될 pending 항목**임을 ID-U3-02 순서로 명시한다.

### Step 8 — Obligation closure와 summary

전 단계 의무(OR/AR/NFR/PD/LC/ID)의 이행 여부를 대조하고, 비침묵 결정 전부를 `aidlc-docs/construction/u3-quality-gate-and-ci-integration/code/code-generation-summary.md`에 기록한다. 완료 gate 제시.

## 3. 검증과 경계

- 각 step은 실행 증거(명령 출력·diff·counts)로 검증하고 상태 파일에 기록한다.
- 이 단계 어디에서도 push, merge, 배포, Jenkins job 설정 변경, external Vault 변경, dependency 추가가 일어나지 않는다.
- Step 3 이후 Jenkinsfile은 feature branch에만 존재한다 — nightly cron(main 추적)은 이 변경을 보지 못하므로 승인 전 배포 경로에 영향이 없다.

## 4. 완료 조건

Step 1~8 전부 `[x]` + 실행 증거 기록 + 표준 2-option 완료 gate. 이후 U3 → develop 병합 gate(별도 승인), main 반영과 실제 Jenkins 실행(별도 승인, ID-U3-02)은 이 계획의 범위 밖이다.
