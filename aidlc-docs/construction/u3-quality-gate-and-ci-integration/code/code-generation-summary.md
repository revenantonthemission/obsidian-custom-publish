# U3 Code Generation Summary

## 문서 상태

- **단계**: CONSTRUCTION — U3 Code Generation Step 8
- **작성일**: 2026-07-29
- **코드 commit**: `81fb40e` (10 files, +254/−4)

## 1. Step 실행 기록

| Step | 결과 |
|---|---|
| 1 — Evidence mapping | [evidence-mapping.md](evidence-mapping.md); gap 정확히 2개 → Step 2 진행 |
| 2 — Gap adapter | `crossunit.spec.ts`(no-JS smoke, chromium JS-off, 2 viewport) + `link-sweep.mjs`(정적 dist sweep) + `playwright.crossunit.config.ts`(자체 preview webServer) + chromium `testIgnore` 확장(실행 집합 net-zero) + **`just crossunit`** recipe (npm script 대체 — §3.2) |
| 3 — Jenkinsfile | parameters + Verify(순차, ensure 단계 포함 — §3.1, 정정 glob archiver) + `rm -rf` 제거 + Deploy `when` gate |
| 4 — 정적 검증 | diff 구조 검토 1:1 대응; Jenkins linter 인증 불가 기록 ([report §3](st-e04-report.md)) |
| 5 — 로컬 등가 실행 | 전부 green; 기준선 Rust 98초 + site 약 15초; seed 2회 관측; `CI` env 미정의 확인 |
| 6 — U1/U2 회귀 | just test·unit·pbt·e2e 양 케이스·astro check baseline·resume:pdf:verify 전부 green ([report §5](st-e04-report.md)) |
| 7 — ST-E04 report | [st-e04-report.md](st-e04-report.md); 실제 Jenkins 2-run은 pending (ID-U3-02) |
| 8 — 이 문서 | obligation closure §2, 비침묵 결정 §3 |

## 2. Obligation Closure

| 의무 | 이행 |
|---|---|
| OR-U3-01/02/03 (stable command·Verify 배치·실패 의미론) | Jenkinsfile Verify + 로컬 등가 실행; ensure 단계 확장은 §3.1 |
| OR-U3-04 (e2e CI 제외) | Verify에 e2e 없음; e2e는 로컬 회귀에서 실행 |
| OR-U3-05 (seed evidence) | seed 2회 관측; 정정 glob archiver; 비대칭 명시 |
| OR-U3-06/07/09 (`RUN_DEPLOY`·rm-rf·no-deploy) | 구현·diff 검증; Deploy 내용 불변; 2-run은 pending |
| OR-U3-08 + AR-U3-01~05 (mapping·gap-only·격리·read-only·결정성) | mapping 표 + 2 adapter; U1 기계 밖 배치; browser-불요 sweep |
| OR-U3-10 (실패 귀속) | `.post-tag` 결함을 소유 표면 귀속으로 보고 후 사용자 승인 하에 수정 (§3.4) |
| NFR-U3-001~008 | 기준선 기록·chromium matrix·정적 sweep·dependency 0(최종 상태: package.json 무변경)·PDF 로컬 집계·stage 네트워크 경계·기본 보존·framework 실패 출력 |
| PD-U3-01~05, LC-U3-01~09, ID-U3-01~04 | 구현·검증 완료; LC-U3-08은 §3.2의 형태 편차; LC-U3-09는 pending 절 포함 |
| PBT-01/adapter-rules §3 (link-sweep 순수 로직) | **처치 기록**: href/src 추출·경로 해석 로직에 property를 식별하지 않음 — 근거: 매 실행이 실제 build 전체(실빌드 221 pages/7,330 참조)를 전수 입력으로 소비하는 example-등가 검증이며, fixture의 의도된 음성 1건으로 정탐이, 실빌드 green으로 무오탐이 각각 실증됨. 새 일반화(외부 URL 검사 등) 도입 시 재검토. |

## 3. 비침묵 결정 (상세는 [report §6](st-e04-report.md))

1. **Verify에 fixture-ensure 단계 추가** — OR-U3-02 명령 목록의 기록된 확장 (HP001 fail-closed; U2 선례 재사용).
2. **`test:crossunit` npm script → `just crossunit`** — package.json이 review subject라는 사실을 e2e fail-closed로 실증 후 원상 복구; NFR Design Q2-A 문자에 대한 강제 편차, 격리 의도 보존 (§5.6 Justfile narrow adapter). tech-stack §1의 정합화 blockquote에 후속 기록 추가됨.
3. **crossunit spec의 배치** — `site/tests/e2e/` (AR-U3-03 문자 준수) + 기존 chromium project `testIgnore` 확장으로 U1 실행 집합 net-zero (PD-U3-02 이행).
4. **`.post-tag` AA 결함의 소유 표면 수정** — 사용자 승인 "1"; U3 귀속 규칙(OR-U3-10)에 따라 보고 후 수정; 상세 근거·수치는 report §6.3.
5. **320px header nav의 JS 의존 사실** + smoke의 CTA 경로 채택.
6. **fixture dist에서 sweep은 설계상 실패** — green 기준은 실빌드; report §4에 명문화.
7. **Jenkins linter 인증 불가** — 구조 검토 대체 (계획 Step 4 규정 경로).

## 4. 변경 표면 최종 대조 (logical-components §2 대비)

| 파일 | 계획 | 실제 |
|---|---|---|
| `Jenkinsfile` | 4건 | 4건 + ensure 단계 (§3.1) |
| `site/tests/**` | 조건부 spec | `crossunit.spec.ts` |
| `site/package.json` | 조건부 scripts | **무변경** (§3.2) |
| `Justfile` | §5.6 narrow adapter 여지 | `crossunit` recipe |
| 추가 (U3 소유) | — | `playwright.crossunit.config.ts`, `scripts/crossunit/` 2 파일, `playwright.config.ts` testIgnore 1줄 |
| 소유 표면 수정 (승인) | — | `post.css`·`PostCard.astro`의 `.post-tag` color (§3.4) |
| 그 외 | 불변 | 불변 — dependency·lockfile·review subject·Deploy 내용·Vault 무접촉 |
