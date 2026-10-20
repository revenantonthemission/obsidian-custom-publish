# U1 Tech Stack Decisions — Profile Domain and Native Experience

## 문서 상태

- **단계**: CONSTRUCTION — U1 NFR Requirements
- **Unit**: U1 Profile Domain and Native Experience
- **상태**: 승인됨 (2026-07-24T06:02:15Z, 사용자 입력: "다음 단계로 진행해")
- **생성일**: 2026-07-24
- **Decision Input**: Q1~Q14 = A/A/A/A/A/B/A/A/A/A/A/B/A/A
- **PBT-09**: Compliant

## 1. 평가 기준과 변경 경계

Tech stack은 다음 순서로 평가한다.

1. 승인된 static/no-new-client-JS architecture와 same-source web/print/PDF contract를 보존한다.
2. Node/npm lockfile에서 offline 또는 network-independent local/CI verification이 재현된다.
3. Korean/Unicode, accessibility, PDF semantic evidence, domain PBT shrinking와 focused replay를 지원한다.
4. 기존 Astro 6/Vite pipeline과 충돌하거나 experimental blocking API를 요구하지 않는다.
5. U1은 tool과 owner-local command를 정의하고 U3는 Jenkins에서 이를 집계한다.

이 문서의 tool 선택은 application facts, Vault edit, Infrastructure, AWS, deployment 또는 push를 승인하지 않는다.

## 2. Decision Records

### TS-U1-001 — Existing static application baseline 유지

- **Decision**: Astro 6 static output, TypeScript 5.9와 npm lockfile baseline을 유지한다. Effective Node engine은 `^22.12.0 || >=24.0.0`으로 좁혀 Vitest가 지원하지 않는 Node 23을 제외한다.
- **Rationale**: U1은 runtime service 없이 build-time typed profile, static HTML/CSS와 generated PDF를 추가한다.
- **Constraints**: Custom Markdown path는 `site/src/lib/render.ts`이며 package manager는 npm/npx다. Profile feature는 Astro Markdown config 또는 Bun을 도입하지 않는다.
- **Rejected**: Runtime API, database, client-side profile application, separate PDF content source.
- **Status**: Existing and retained.

### TS-U1-002 — Astro-aware Vitest runner

- **Decision**: `astro/config`의 `getViteConfig()`를 사용하는 Vitest 4.1.10을 site owner-local TypeScript example/PBT runner로 사용한다.
- **Configuration**: `site/vitest.config.ts`, Node environment, explicit test include.
- **Rationale**: Existing Astro/Vite resolution을 공유하면서 pure domain, renderer-neutral tree, metadata와 manifest test를 ESM/TypeScript로 실행한다.
- **Rejected**: Jest/Mocha 신규 stack; experimental Astro Container API를 blocking gate로 사용; direct Vite duplication.
- **Status**: Direct devDependency, config and executable smoke present on the U1 feature branch.

### TS-U1-003 — fast-check와 official Vitest connector

- **Decision**: fast-check 4.9.0과 `@fast-check/vitest` 0.4.1을 사용한다.
- **Rationale**: Structured custom arbitrary, automatic shrinking, signed seed와 counterexample path replay, Vitest lifecycle integration을 한 stack에서 제공한다.
- **Rejected**: Hand-written random loop; primitive-only generator; standalone `fc.assert` lifecycle wrapper; shrinking-disabled test.
- **Status**: Both are direct devDependencies and locked. Framework smoke passes.

### TS-U1-004 — Playwright browser and PDF boundary

- **Decision**: `@playwright/test` 1.61.1과 its bundled Chromium, Firefox, WebKit을 browser acceptance stack으로 선택한다.
- **PDF role**: Bundled Chromium `page.pdf()`만 canonical PDF engine이다.
- **Rationale**: Exact engine provisioning, JS-disabled context, keyboard/accessibility/responsive/print flows와 Chromium PDF를 같은 pinned release에서 제공한다.
- **Rejected**: Branded local browsers, Puppeteer 추가 stack, system print dialog, hand-authored PDF.
- **Status**: Selected exact Code Generation target; not installed during this PBT-09-only dependency gate.

### TS-U1-005 — Axe accessibility automation

- **Decision**: `@axe-core/playwright` 4.12.1을 Playwright actual-route test에 결합한다.
- **Rationale**: WCAG-tagged automated scan을 keyboard, focus, contrast, target size와 manual assessment로 보완할 수 있다.
- **Rejected**: Axe-only certification claim; blanket exclusion; DOM snapshot-only accessibility.
- **Status**: Selected exact Code Generation target; not installed in this stage.

### TS-U1-006 — Pretendard same-origin font materialization

- **Decision**: `pretendard@1.3.9` package의 official dynamic subset CSS/WOFF2와 SIL OFL 1.1 notice를 build-time source로 사용한다.
- **Rationale**: Korean glyph coverage와 screen/print/PDF family identity를 유지하면서 network font fetch를 제거한다.
- **Rejected**: Runtime jsDelivr font as PDF authority; uncontrolled system font; PDF-only embedded fact/content source; unversioned copied font.
- **Status**: Version selected; copy-integrity, license and materialization implementation은 Code Generation handoff.

### TS-U1-007 — PDF.js semantic inspection

- **Decision**: `pdfjs-dist` 5.4.624를 exact Code Generation target으로 사용하고, non-public hash-bound inspection receipt와 local PDF.js viewer를 결합한다.
- **Rationale**: Text, link annotation, structure tree, outline와 rendered page를 actual PDF에서 검사한다. Version 5.4.624는 repository Node floor를 만족한다.
- **Compatibility boundary**: 검토 시 최신 6.1.200은 Node `>=22.13.0 || >=24`를 요구하므로 현재 project floor `>=22.12.0`와 불일치해 선택하지 않는다.
- **Rejected**: Flat text-only parity; pixel threshold-only gate; PDF metadata를 canonical source로 사용; Node floor를 암묵적으로 올리는 latest-major adoption.
- **Status**: Exact compatible version selected; Code Generation에서 direct devDependency와 lockfile 반영 필요.

### TS-U1-008 — Hash-bound document evidence

- **Decision**: Public PDF와 별도로 `ResumeDocumentInspectionReceipt`를 생성한다.
- **Fields**: PDF SHA-256, source fingerprint, manifest digest, full fact/entity/section/order mapping, tool versions, review timestamp와 result.
- **Authority**: Receipt는 derived non-public evidence이며 canonical profile이나 fact approval source가 아니다.
- **Rationale**: PDF bytes와 source/manifest identity를 결합하면서 actual PDF extraction이 visible evidence를 독립 검증한다.
- **Rejected**: PDF byte equality as content oracle; public receipt; raw text에서 identity 추론; XMP postprocessor 추가.
- **Status**: Logical contract selected; schema and implementation are Code Generation handoff.

### TS-U1-009 — Command topology and ownership

- **Decision**: Stable target commands는 `test:unit`, `test:pbt`, `test:e2e`, `resume:pdf`, `resume:pdf:verify`다.
- **Current capability command**: `test:pbt:framework`는 NFR stage의 PBT-09 executable proof다.
- **Ownership**: U1 defines implementation/assertions. U3 provisions browsers, sets CI PBT count/seed and aggregates commands without duplicating tests.
- **Rationale**: Pure, browser, document와 CI concerns를 명확히 분리한다.
- **Rejected**: One opaque all-in-one script; Jenkins-only assertions; local-only PBT; silent missing-browser skip.
- **Status**: Framework capability command exists; five feature commands are Code Generation handoff.

## 3. Dependency State

### 3.1 Installed for PBT-09

| Package | Declared range | Locked version | Classification | Evidence |
|---|---|---|---|---|
| `vitest` | `^4.1.10` | 4.1.10 | Direct devDependency | Astro-aware config and two-test smoke |
| `fast-check` | `^4.9.0` | 4.9.0 | Direct devDependency | Structured arbitrary and `fc.check` |
| `@fast-check/vitest` | `^0.4.1` | 0.4.1 | Direct devDependency | `test.prop` lifecycle integration |

`npm ci --ignore-scripts`, `npm ls --depth=0 vitest fast-check @fast-check/vitest`, the framework smoke and Astro build pass in the isolated U1 worktree. The lockfile root dependency entries and resolved package entries agree.

### 3.2 Selected for Code Generation

| Package / capability | Exact target | Intended classification | Installation gate |
|---|---|---|---|
| `@playwright/test` | 1.61.1 | Direct devDependency | Browser/PDF config, bundled-engine install and smoke |
| `@axe-core/playwright` | 4.12.1 | Direct devDependency | Axe matrix and manual complement documented |
| `pretendard` | 1.3.9 | Direct build-time dependency | Same-origin asset copy, license and integrity |
| `pdfjs-dist` | 5.4.624 | Direct devDependency | Node-floor check, text/link/structure/outline extraction |

These packages are selected decisions, not current implementation claims. Code Generation must re-check registry integrity and peer/engine compatibility before lockfile mutation without silently changing the selected major/version contract.

### 3.3 Intentionally absent

| Package / service | Reason |
|---|---|
| Direct `vite` | Astro already owns compatible Vite 7.3.2; duplicate direct ownership is unnecessary |
| `@vitest/coverage-v8` | Q11 selected obligation traceability rather than numeric coverage |
| DOM emulation package | Pure U1 tests use Node; actual DOM/browser behavior belongs to Playwright |
| Lighthouse | Timing score is not the selected deterministic performance gate |
| PDF postprocessor | Q7 selected an external receipt, not XMP/attachment mutation |
| Runtime API/database/analytics | Static public experience requires none |

## 4. PBT-09 Capability Verification

| Required capability | Selected mechanism | Executable evidence | Result |
|---|---|---|---|
| Custom domain generators | fast-check composed `record`, `array`, constrained integer and mapped Korean/Unicode text | `framework-selection.pbt.test.ts` structured profile summary arbitrary | Pass |
| Automatic shrinking | fast-check `fc.check` with shrinkable integer counterexample | Initial failing meta-check reports `numShrinks > 0` | Pass |
| Seed/path reproducibility | `RunDetails.seed` and `counterexamplePath` replay | Same-seed rerun과 captured seed/path rerun이 generated case의 동일 minimal counterexample을 재현 | Pass |
| Runner integration | `@fast-check/vitest` `test.prop` plus Vitest `expect` | `npm run test:pbt:framework` | Pass |
| Project dependency | Direct devDependencies and npm lockfile | `npm ls --depth=0` and lock root/resolution inspection | Pass |

The deliberately false property is inspected through `fc.check`, so the surrounding Vitest suite remains green. It proves framework capability only and is not a substitute for real U1 properties.

## 5. Reproducibility Policy

Code Generation must add a stable `test:pbt` wrapper with these constraints.

1. Validate positive integer `PBT_RUNS`; use 100 locally and 1,000 in CI.
2. Generate or accept one signed 32-bit `PBT_SEED` before worker startup and print it on every run.
3. Forward the same seed and run count to every property.
4. Accept `PBT_PATH` only with explicit seed and exact file/test focus.
5. Preserve framework failure output, shrinking and shrink count.
6. Do not enable flaky retry, normal-run `endOnFailure` or primitive-only random loops.
7. Treat an interrupted incomplete property run as failure.

## 6. Test-Layer Allocation

| Layer | Technology | Owns | Does not own |
|---|---|---|---|
| Pure example/PBT | Vitest + fast-check connector | Domain, normalization, diagnostics, selectors, presentation tree, metadata/JSON-LD, manifest | Actual Astro route, CSS layout, PDF I/O |
| Browser E2E | Playwright + Axe | Production route, JS off, keyboard, accessibility, responsive, print | Domain truth or fact approval |
| Document generation | Playwright Chromium + Pretendard | Offline font-ready canonical PDF | Separate PDF content source |
| Document inspection | PDF.js + receipt + manual review | Actual text/link/structure/outline/page evidence | Canonical facts or byte-equality oracle |
| CI aggregation | Existing Jenkins, U3 | Provisioning and stable command execution with seed evidence | U1 test duplication, deployment |

## 7. Compatibility and Risk Notes

1. Vitest 4.1.10 and connector 0.4.1 run successfully on the validated Node 24.14.0 environment and share Astro's Vite 7.3.2. The site engine is `^22.12.0 || >=24.0.0`, matching Vitest's supported Node lines while retaining the approved 22.12 minimum.
2. The PBT lockfile change was created in an isolated worktree, so the dirty primary `main` worktree's pre-existing `site/package-lock.json` change remains untouched.
3. `npm audit` reports 17 findings in the existing Astro/tooling graph. The report does not list Vitest, fast-check or `@fast-check/vitest` as vulnerable packages. Security extension is disabled, and broad dependency upgrades are outside this focused decision.
4. No Playwright browser binary, font asset, PDF binary, generated public data, Terraform/AWS resource or deployment was created in this stage.

## 8. Decision Traceability

| Decision | Questions | Requirements | Functional owners | Handoff |
|---|---|---|---|---|
| TS-U1-001 | Q4, Q10, Q14 | FR-013/014/018; NFR-003/008/010 | C02, C04, C05 | NFR Design static boundaries |
| TS-U1-002/003 | Q8~Q11 | FR-014~016; NFR-004/005/010 | C01~C05, C11, S01 | Code Generation example/PBT |
| TS-U1-004/005 | Q1~Q3, Q5, Q10 | FR-003~007/010/012~014; NFR-001/002/008/009 | C02, C05, C11, S04 | Browser/accessibility/print |
| TS-U1-006 | Q5, Q6 | FR-004/010/013; NFR-003/009 | C02, C11, S04 | Font materialization/PDF |
| TS-U1-007/008 | Q7, Q12 | FR-002/004/010/014; NFR-005/007/009/010 | C11, S04 | Inspection schema and gates |
| TS-U1-009 | Q9~Q12 | FR-014~017; NFR-004/005/010 | All U1 test owners; U3 aggregate | Stable commands and Jenkins |

## 9. Completion Decision

PBT-09 has no blocking finding. The framework is selected, documented, included as direct project dependencies, locked and executable across all four required capabilities. Remaining browser, font and PDF packages are intentionally deferred to U1 Code Generation because this stage selects their contracts but does not implement the feature.
