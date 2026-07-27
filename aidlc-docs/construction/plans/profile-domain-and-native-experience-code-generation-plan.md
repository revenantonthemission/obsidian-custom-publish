# U1 Code Generation Plan — Profile Domain and Native Experience

## 문서 상태

- **단계**: CONSTRUCTION — U1 Code Generation, Part 1 Planning
- **상태**: 전체 계획 승인됨 — 2026-07-24T08:09:41Z, 사용자 입력: "다음 단계로 진행해줘"
- **Unit**: U1 Profile Domain and Native Experience
- **Bounded Context**: Profile Experience
- **작성일**: 2026-07-24
- **Project Type**: Brownfield
- **Workspace Root**: `/Users/revenantonthemission/Projects/obsidian-blog`
- **Implementation Worktree**: `/private/tmp/obsidian-blog-u1-nfr`
- **Feature Branch**: `codex/feature/resume-profile-experience`
- **Validated Base**: local `develop` at `67f70a4240819ed8b9408360f9b59512660f8e10`
- **PBT Enforcement**: Full; Planning에서 PBT-01~PBT-10, Generation에서 PBT-02~PBT-08/PBT-10과 owner-local U1 property slice 적용
- **Extensions**: Obsidian Press project extension 활성; Security와 Resiliency extension 비활성
- **Deployment Authority**: 없음; local generation/verification만 수행
- **Single Source of Truth**: 승인 뒤 U1 Code Generation은 이 문서의 순서, path, gate와 checkbox만 따라 실행한다.
- **Plan Inventory**: 25 sequential steps, 148 execution checkboxes
- **Validation**: 25-step sequence, required AI-DLC layers/N/A dispositions, 15 relative inputs, path/whitespace, story/NFR/PBT/no-deploy gates 통과
- **Independent Review**: Existing MobileNav preservation, `FactApprovedProfile` receipt gate, PBT-06 state model과 stale NFR status를 보정한 뒤 blocking/material finding 없음

## 1. 목적과 승인 범위

이 계획은 승인된 U1 Functional Design, NFR Requirements, NFR Design과 Infrastructure Design을 실제 Astro/TypeScript application source, owner-local test/tooling, 검토 증거와 reviewed derived PDF로 구현하는 순서를 고정한다.

계획 승인은 다음만 승인한다.

1. 아래 Step 1~25의 구현 순서와 exact authored path.
2. 기존 U1 feature worktree의 PBT-09 변경을 보존·확장하는 것.
3. application code는 implementation worktree에, AI-DLC markdown은 primary workflow workspace에 작성하는 것.
4. 실제 공개 fact와 exact-SHA PDF는 각각 별도 명시적 사람 승인 뒤에만 materialize/promote하는 것.
5. local build/test와 private generated evidence를 생성하는 것.

계획 승인은 다음을 승인하지 않는다.

- 이름, 연락처, 경력, 프로젝트, 성과, 수치 또는 link의 사실성·공개 가능성;
- placeholder/sample fact의 production 사용;
- external Vault edit;
- `preprocessor/`, `infra/`, `Justfile`, `Jenkinsfile` 또는 homepage composition 변경;
- Git merge, push, pull request, AWS/Terraform/DNS/CloudFront mutation 또는 deployment;
- direct/fixture Astro output을 production-complete deployable set으로 간주하는 것.

## 2. 승인 입력

- [U1 Business Logic Model](../profile-domain-and-native-experience/functional-design/business-logic-model.md)
- [U1 Business Rules](../profile-domain-and-native-experience/functional-design/business-rules.md)
- [U1 Domain Entities](../profile-domain-and-native-experience/functional-design/domain-entities.md)
- [U1 Frontend Components](../profile-domain-and-native-experience/functional-design/frontend-components.md)
- [U1 NFR Requirements](../profile-domain-and-native-experience/nfr-requirements/nfr-requirements.md)
- [U1 Tech Stack Decisions](../profile-domain-and-native-experience/nfr-requirements/tech-stack-decisions.md)
- [U1 NFR Design Patterns](../profile-domain-and-native-experience/nfr-design/nfr-design-patterns.md)
- [U1 Logical Components](../profile-domain-and-native-experience/nfr-design/logical-components.md)
- [U1 Infrastructure Design](../profile-domain-and-native-experience/infrastructure-design/infrastructure-design.md)
- [U1 Deployment Architecture](../profile-domain-and-native-experience/infrastructure-design/deployment-architecture.md)
- [Unit Definitions](../../inception/application-design/unit-of-work.md)
- [Unit Dependencies](../../inception/application-design/unit-of-work-dependency.md)
- [Unit Story Map](../../inception/application-design/unit-of-work-story-map.md)
- [User Stories](../../inception/user-stories/stories.md)
- [Brownfield Code Structure](../../inception/reverse-engineering/code-structure.md)

## 3. Unit generation context

### 3.1 Story와 acceptance ownership

| Scope | U1 책임 | 완료 주장 |
|---|---|---|
| ST-U02 | AC-U02-01~04: résumé summary/details/omission/metadata | U1에서 완료 |
| ST-U03 | AC-U03-01~04: print, reviewed PDF, full parity, negative failure | U1에서 unit evidence로 완료; U3 regression이 reopen 가능 |
| ST-U04 | AC-U04-01~04: 3~6 case studies, six dimensions, evidence omission, metadata | U1에서 완료 |
| ST-U05 | AC-U05-01~04: approved email/GitHub/evidence와 invalid-required failure | 실제 fact 승인 뒤 U1에서 완료 |
| ST-E01 | AC-E01-01~04: canonical source, field diagnostics, omission, determinism | U1에서 완료 |
| ST-E02 | AC-E02-01~04: no inference, approved-only outputs, cross-surface parity | 실제 fact/PDF 승인 뒤 U1에서 완료 |
| ST-U01 | AC-U01-02~04의 internal routes, Header/local navigation, no-JS links만 제공 | U2가 homepage CTA composition 뒤 story를 닫음 |
| ST-E03 | AC-E03-01~04의 profile-domain property/generator/shrink/replay slice | U2 publication slice 뒤 parent story를 닫음 |
| ST-E04 | 네 read-only stable command의 provider contract만 제공 | U3 actual Jenkins validation-only execution이 닫음 |

U1은 ST-U01, ST-E03 parent 또는 ST-E04를 완료로 표시하지 않는다.

### 3.2 Requirement boundary

- **Owned/implemented**: FR-001~007, FR-010~011; U1 slice of FR-012~017.
- **No-deploy guard**: FR-018.
- **Deferred to U2**: FR-008~009, homepage composition, external Vault/publication boundary.
- **NFR implementation/evidence**: NFR-U1-001~015 전체.
- **Named edge coverage**: EDGE-001~006, EDGE-008~011.
- **Deferred edge coverage**: EDGE-007과 EDGE-012는 U2.

### 3.3 Component와 service ownership

| Owner | 구현 책임 | 금지 경계 |
|---|---|---|
| C01 Profile Domain | typed fact, normalization, validation, projections, approved correspondence | browser/filesystem/PDF side effect |
| C02 Profile Presentation | renderer-neutral semantic model, Astro components/routes, profile styles | canonical fact copy, client island |
| C03 Profile Metadata Builder | visible summary 기반 metadata와 conservative typed JSON-LD | head tag rendering, inferred claim |
| C04 Base Layout Metadata Host | safe JSON-LD serializer, unique head/resource policy | route-local duplicate serializer |
| C05 Header Navigation | one immutable ordered nav model, segment-aware current state, static desktop/mobile anchors | search/graph/tag data injection |
| C11 Resume Document Boundary | pure manifest/digest/evidence/receipt/review contracts | browser/filesystem mutation |
| S01 Profile Assembly | C01 validation 뒤 C02/C03/C11 input assembly | partial invalid output |
| S04 Resume Document Service | font/build/preview/browser/PDF/filesystem prepare/promote/rollback | second fact source, C12 import |
| U1 Verification Provider | owner-local read-only observations and evidence | production import, tracked source mutation |
| C12/S05 | U3 소유 | U1에서 구현하거나 복제하지 않음 |

### 3.4 External and cross-unit dependencies

1. U1은 reconciled `develop`에서 분기한 focused feature branch에서만 application change를 만든다.
2. U2는 U1의 `HomepageProfile`, `/resume`, `/portfolio` contract를 read-only로 소비한다.
3. U3는 U1이 제공하는 네 read-only command만 실행·집계하며 assertion을 복제하지 않는다.
4. 실제 public fact는 사용자 승인에 의존한다. Required fact가 Pending/Excluded이면 U1 public-ready completion은 blocked다.
5. External URL reachability는 fact review의 human evidence이며 runtime/unit/CI network check가 아니다.
6. Full-site deployment eligibility는 exact production Vault preprocessing에 의존하지만 U1은 이를 실행하거나 주장하지 않는다.

### 3.5 Interfaces and contracts

- `ProfileData → NormalizedProfile → ValidatedProfile`은 one-way fail-closed structural pipeline이다.
- Pure selectors는 generated test domain에서 `ValidatedProfile`을 입력으로 검증할 수 있지만, production S01/routes/metadata/document assembly는 current `FactApprovalReceipt`가 exact inventory와 production diff correspondence를 증명해 만든 `FactApprovedProfile`만 입력으로 받는다.
- `FactApprovedProfile`만 production `ResumeProfile`, `PortfolioProfile`, `HomepageProfile`, metadata와 manifest를 만들 수 있다.
- Invalid candidate는 sorted/deduplicated `ValidationIssue[]`만 반환하고 partial output을 반환하지 않는다.
- Résumé/Portfolio/metadata/JSON-LD/PDF는 한 canonical approved source에서 파생된다.
- Expected, screen web, print와 PDF의 ordered full manifest가 source identity까지 exact equality여야 한다.
- `/resume.pdf`는 fixed public descriptor이며 hand-authored alternate body를 갖지 않는다.
- Exactly five stable U1 commands만 provider contract다: `test:unit`, `test:pbt`, `test:e2e`, `resume:pdf`, `resume:pdf:verify`.
- Existing `test:pbt:framework`는 NFR-stage internal capability evidence이며 stable U1/U3 command가 아니다.

### 3.6 API, repository, database와 runtime infrastructure

| Layer | 판정 | 근거 |
|---|---|---|
| Network API layer | N/A | Static read-only output; runtime endpoint 없음 |
| Repository/data-access layer | N/A | Database/persistence adapter 없음; authored TypeScript source와 derived files만 존재 |
| Database entities/migrations | N/A | Database, schema migration, mutable/per-user state 없음 |
| Runtime service/queue/cache | N/A | Astro static build와 local operator process만 존재 |
| Deployment infrastructure generation | No-change/N/A | Existing S3/CloudFront topology 유지; Terraform/AWS/Jenkins Deploy 변경 금지 |

## 4. Brownfield baseline and preservation

### 4.1 Existing branch-local work to preserve

| Path | Current state | Plan |
|---|---|---|
| `site/package.json` | modified | Node engine와 Vitest/fast-check selections를 보존하고 selected tools/commands만 확장 |
| `site/package-lock.json` | modified | 현재 lock delta를 기반으로 exact dependencies를 추가; blind regeneration 금지 |
| `site/vitest.config.ts` | untracked | Astro-aware unit/framework config로 채택·정리 |
| `site/tests/pbt/framework-selection.pbt.test.ts` | untracked | NFR PBT-09 capability evidence로 보존; production property suite와 분리 |

Primary `main` worktree의 dirty/untracked user changes는 건드리지 않는다. Application work는 isolated implementation worktree에서 하고 workflow markdown만 primary workspace에 기록한다.

### 4.2 Existing files modified or removed

| Action | Exact path | Purpose |
|---|---|---|
| Modify | `site/package.json` | exact tool pins, exactly five stable U1 scripts, retained internal framework proof |
| Modify | `site/package-lock.json` | reproducible selected dependencies |
| Modify | `site/astro.config.mjs` | pre-module-graph font/build integration |
| Modify | `site/.gitignore` | `.generated/`와 `.artifacts/` private generated boundaries |
| Modify | `site/README.md` | local commands, fact/PDF review workflow, non-deploy boundary |
| Modify | `site/vitest.config.ts` | unit/obligation/framework test selection |
| Modify | `site/src/layouts/BaseLayout.astro` | backward-compatible typed metadata, JSON-LD host, profile resource policy |
| Modify | `site/src/components/Header.astro` | one nav model, desktop/static mobile parity, automation IDs |
| Modify | `site/src/styles/global.css` | existing mobile navigation의 native/static no-JS support |
| Modify | `site/src/islands/MobileNav.tsx` | in-place native disclosure/SSR anchors; existing search/theme behavior와 component path 보존 |

### 4.3 New authored application source

```text
site/src/lib/profile/
├── types.ts
├── issues.ts
├── normalization.ts
├── validation.ts
├── fact-approval.ts
├── profile-data.ts
├── production-profile.ts
├── selectors.ts
├── assembly.ts
├── metadata.ts
├── resume-manifest.ts
├── canonical-digest.ts
├── document-boundary.ts
├── resume-evidence.ts
├── resume-receipts.ts
└── index.ts

site/src/lib/layout/
├── json-ld.ts
└── profile-resources.ts

site/src/lib/navigation.ts

site/src/components/profile/
├── presentation.ts
├── ProfileShell.astro
├── ProfileLocalNavigation.astro
├── ContentBlocks.astro
├── ContactActions.astro
├── ResumeContent.astro
├── ResumeEntry.astro
├── PortfolioContent.astro
└── CaseStudy.astro

site/src/pages/resume.astro
site/src/pages/portfolio.astro

site/src/styles/profile/
├── foundation.css
├── font.css
├── resume.css
├── portfolio.css
└── print.css
```

`site/src/lib/profile/profile-data.ts`는 실제 fact 승인 뒤에만 생성하며 sole production fact source다. `production-profile.ts`는 tracked non-public machine receipt를 build time에 읽고 pure gate를 통과한 `FactApprovedProfile`만 조립한다. `aidlc-docs/`나 test fixture를 runtime import하지 않는다.

### 4.4 New configuration and owner-local tooling

```text
site/vitest.pbt.config.ts
site/playwright.config.ts
site/tsconfig.profile-tools.json

site/scripts/profile/
├── astro-profile-integration.mjs
├── font-allowlist.json
├── font-materializer.mjs
├── profile-paths.mjs
├── compile-profile-tools.mjs
├── pbt-runner.mjs
├── startup-retry.mjs
├── preview-supervisor.mjs
├── clean-profile-build.mjs
├── request-ledger.mjs
├── asset-budget.mjs
├── pdf-renderer.mjs
├── pdf-inspector.mjs
├── pdf-viewer.mjs
├── release-store.mjs
├── resume-coordinator.mjs
├── verification-provider.mjs
└── cli.mjs
```

Node 22.12 compatibility를 위해 새 unapproved TypeScript runtime loader를 추가하지 않는다. `compile-profile-tools.mjs`가 repository-local `tsc`와 `site/tsconfig.profile-tools.json`을 사용해 pure C01/C11 modules를 private `.artifacts/profile/tools/`에 compile하고 local tool이 그 output을 소비한다.

### 4.5 New tests and obligation evidence

```text
site/tests/fixtures/profile-fixtures.ts

site/tests/pbt/u1/
├── setup.ts
├── arbitraries/profile.ts
├── arbitraries/metadata.ts
├── arbitraries/manifest.ts
├── arbitraries/release.ts
├── mutations.ts
├── profile-domain.pbt.test.ts
├── profile-presentation.pbt.test.ts
├── profile-metadata-navigation.pbt.test.ts
├── resume-document.pbt.test.ts
└── release-state-machine.pbt.test.ts

site/tests/unit/
├── profile-domain.test.ts
├── profile-projections.test.ts
├── profile-presentation.test.ts
├── profile-metadata-navigation.test.ts
├── resume-document.test.ts
├── profile-tooling.test.ts
├── resume-release.test.ts
└── obligation-map.test.ts

site/tests/obligations/u1-profile.json

site/tests/e2e/
├── profile-routes.spec.ts
├── profile-responsive.spec.ts
├── profile-accessibility.spec.ts
├── profile-cross-browser.spec.ts
├── profile-print.spec.ts
├── profile-resources.spec.ts
└── support/
    ├── profile-page.ts
    ├── manifest-observer.ts
    └── manual-review-subject.ts
```

### 4.6 Approval-gated and generated paths

| Path | Tracking/public status | Creation rule |
|---|---|---|
| `site/verification/profile/fact-approval.json` | tracked, non-public machine receipt | complete inventory + exact production diff의 explicit user approval 뒤 생성; public fact value를 복제하지 않고 revision/digest/decision identity만 보존 |
| `site/verification/profile/manual-web-accessibility.json` | tracked, non-public | actual route review + exact current subject digest 뒤 생성 |
| `site/verification/resume/current-release.json` | tracked, non-public | exact candidate SHA review + successful promotion/final verification 뒤 생성 |
| `site/public/resume.pdf` | tracked, public derived asset | prepare/review/promote/two-pass gate 뒤 생성; placeholder 금지 |
| `site/.generated/profile-font/` | gitignored, private generated | verified Pretendard allowlist/hash/license materialization |
| `site/.artifacts/profile/tools/` | gitignored, private generated | Node tooling용 TypeScript compile output |
| `site/.artifacts/profile/resume/` | gitignored, private generated | candidate, draft receipt, viewer/pages, manual review, lock/journal/recovery |
| `site/.artifacts/profile/verification/` | gitignored, private generated | budget/request/browser/test reports |
| `site/dist/` | gitignored build output | local profile-validation output only; authored source/deploy authority 아님 |

### 4.7 Code Generation documentation

```text
aidlc-docs/construction/profile-domain-and-native-experience/code/
├── profile-fact-inventory.md
├── profile-production-diff.md
├── profile-fact-approval-receipt.md
├── profile-fact-digest-spec.md
├── business-logic-summary.md
├── non-applicable-layers-summary.md
├── frontend-components-summary.md
├── verification-and-document-summary.md
├── deployment-artifacts-summary.md
└── code-generation-summary.md
```

모든 파일은 markdown only다. Application은 이 directory를 import하지 않는다.

## 5. Test and command contract

### 5.1 Exact selected dependencies

| Package | Exact target | Classification |
|---|---|---|
| `vitest` | 4.1.10 | existing direct devDependency |
| `fast-check` | 4.9.0 | existing direct devDependency |
| `@fast-check/vitest` | 0.4.1 | existing direct devDependency |
| `@playwright/test` | 1.61.1 | new direct devDependency |
| `@axe-core/playwright` | 4.12.1 | new direct devDependency |
| `pdfjs-dist` | 5.4.624 | new direct devDependency |
| `pretendard` | 1.3.9 | new direct build-time dependency |

Lockfile mutation 전에 registry metadata/peer/engine/integrity를 다시 검사한다. Approved exact target과 충돌하면 버전을 임의 변경하지 않고 계획 변경 gate를 연다.

### 5.2 Stable commands

| Command | Mutation | Required flow |
|---|---|---|
| `npm run test:unit` | tracked source/output read-only | Vitest examples + obligation completeness |
| `npm run test:pbt` | tracked source/output read-only | pre-worker validated seed/run/focus → U1 PBT only |
| `npm run test:e2e` | `dist`와 private evidence만 | verified font → clean build → owned loopback preview → Playwright/Axe/analyzers |
| `npm run resume:pdf -- --prepare` | private artifacts only | candidate/render/inspection/draft receipt; public PDF/receipt unchanged |
| `npm run resume:pdf -- --promote <candidate-id>` | only approved tracked mutation path | exact review → receipt/PDF transaction → clean second build → finalize or rollback |
| `npm run resume:pdf:verify` | always tracked read-only | no lock/journal → clean build/preview → current public PDF/receipt full reinspection |

`test:pbt:framework`는 retained internal tool-selection proof다. U3가 호출할 stable command가 아니며 real U1 property count를 대신하지 않는다.

### 5.3 PBT execution policy

1. `PBT_RUNS`는 positive safe integer이며 local default 100, CI default 1,000이다.
2. One signed 32-bit suite `PBT_SEED`를 worker 전에 생성/검증하고 항상 출력한다.
3. `PBT_PATH`는 explicit seed, exact file과 exact full test name focus가 함께 있을 때만 허용한다.
4. Default shrinking/counterexample/path output을 보존하고 retry, normal-run `endOnFailure`, primitive-only random loop와 `fc.gen()`을 금지한다.
5. Valid generator는 unique kebab IDs, sparse unique order, 3/6 project boundary, Korean/Unicode/NFC, absent/present optional을 직접 구성한다.
6. Invalid generator는 unrelated invariant를 보존하면서 정확히 하나의 labelled mutation을 만든다.
7. 한 canonical property execution이 여러 approved umbrella/refinement alias를 만족할 수 있으나 alias별 duplicate execution은 금지한다.

### 5.4 Canonical property suites

| Suite | Canonical obligations |
|---|---|
| `profile-domain.pbt.test.ts` | normalization idempotence; valid invariants/input immutability; controlled diagnostic mutation; source permutation/order; optional omission; provenance/non-interference |
| `profile-presentation.pbt.test.ts` | résumé hierarchy/details/omission/static surface; portfolio completeness/six-dimension order |
| `profile-metadata-navigation.pbt.test.ts` | metadata claim allowlist/route equality; JSON-LD round-trip/script safety; Header/local nav order/current/static parity |
| `resume-document.pbt.test.ts` | canonical digest; full manifest parity; source/link mutation; assembly valid/invalid |
| `release-state-machine.pbt.test.ts` | pure reference model versus LC-U1-16 journal transition model over generated command sequences; invariant after every transition, including empty sequence, crash-resume and rollback |

`site/tests/obligations/u1-profile.json`은 U1-P01~12, all refinements/N/A, NFR-U1-001~015, owned/contributor AC, EDGE와 named negative path를 canonical test ID에 연결한다. Missing mapping과 semantic duplicate는 `obligation-map.test.ts`가 실패시킨다.

### 5.5 PBT-01~PBT-10 planning compliance

| Rule | Plan disposition | Evidence target |
|---|---|---|
| PBT-01 Property identification | Compliant input: approved U1-P01~12/refinement catalog; NFR Design이 추가한 mutable release journal은 이 planning stage에서 재평가 | obligation map + this matrix |
| PBT-02 Round-trip | Applicable to JSON-LD serialize/embed/extract/parse U1-P09; other public encode/decode pairs remain explicit N/A | `profile-metadata-navigation.pbt.test.ts` |
| PBT-03 Invariants | Applicable to domain, projection, presentation, metadata/navigation, manifest and release-state invariants | five canonical suites |
| PBT-04 Idempotence | Applicable to text/profile normalization U1-P01; no other idempotence claim is inferred | `profile-domain.pbt.test.ts` |
| PBT-05 Oracle/model | Applicable to labelled validation mutations, metadata/navigation, full manifest comparison and release transition reference model | domain, metadata/navigation, document and release suites |
| PBT-06 Stateful | Applicable because LC-U1-16/17 introduced a mutable journal after Functional Design. A pure reference state plus generated valid command sequences checks every transition; actual filesystem/fsync/crash effects remain complementary named examples | `arbitraries/release.ts`, `release-state-machine.pbt.test.ts`, `resume-release.test.ts` |
| PBT-07 Generator quality | Structured reusable domain/metadata/manifest/release generators, direct constraint construction and boundary weighting | `site/tests/pbt/u1/arbitraries/` |
| PBT-08 Shrinking/reproducibility | Default shrinking; one pre-worker signed seed; local/CI runs; exact focused seed/path replay; no retry | `pbt-runner.mjs`, `setup.ts`, command evidence |
| PBT-09 Framework | Already compliant with locked Vitest 4.1.10, fast-check 4.9.0 and connector 0.4.1; retained internal smoke | package/config/framework-selection evidence |
| PBT-10 Complementary tests | Every critical story/document/release path has named example/browser/document tests; shrunk defects become permanent examples | unit/E2E/document suites and obligation map |

The release PBT models only deterministic journal states and allowed transitions. It does not pretend to verify actual filesystem durability, browser output or human review; those stay in the named example/document gates.

### 5.6 Required complementary examples

PBT가 다음 concrete examples를 대체하지 않는다.

- project count 2/3/6/7;
- missing name/email/GitHub, duplicate ID/order, invalid-present versus absent optional URL;
- Korean text와 exact six case-study labels;
- exact route label/title/description/canonical and `/resume-old` prefix collision;
- mobile Header anchors in initial server HTML with JavaScript disabled;
- missing/unreadable/stale/one-fact-changed PDF and ambiguous duplicate mapping;
- symlink, directory/non-regular, outside-allowlist and cross-device promotion paths;
- startup-only retry cleanup and semantic failure no-retry;
- interrupted journal states, stale review/receipt and rollback recovery;
- actual fact-approval record and exact production diff.

PBT가 발견한 shrunk defect는 적절한 permanent example regression으로 승격하고 original property도 유지한다.

### 5.7 Browser/manual/document evidence

| Evidence | Exact matrix/gate |
|---|---|
| Responsive Chromium | 320×800, 479×900, 480×900, 767×1024, 768×1024, 1440×900; journey 390×844 |
| Cross-browser | Firefox/WebKit 320×800와 1280×800, both routes, JS on/off |
| Accessibility | both routes, light/dark, 320×800/1440×900, details closed/all-open; Axe tags + keyboard/focus/reduced motion/contrast/target checks |
| Manual web accessibility | exact subject digest, reading order, color-independent meaning, focus appearance/obscuration, approved exception |
| Print | A4 12mm canonical; private Letter compatibility; CSS-only detail expansion; ≥10pt/≥1.35; page split/clipping/link evidence |
| Resources | same-origin verified WOFF2; unique profile CSS gzip ≤24KiB; zero U1 client JS; zero successful non-loopback request |
| PDF | Chromium offline render, PDF.js text/link/structure/outline/pages, expected=web=print=PDF full ordered manifest, exact-SHA human review |

Required browser/tool/record가 missing이면 skip-success를 허용하지 않는다.

## 6. Detailed generation steps

### Step 1 — Reconfirm isolated brownfield baseline

**Stories/requirements**: FR-017, FR-018; OBSIDIAN-03~05.

- [x] Implementation worktree가 `codex/feature/resume-profile-experience`이고 expected base descendant인지 확인한다.
- [x] Current dirty file set을 기록하고 existing four PBT-09 changes가 in-scope인지 재확인한다.
- [x] Primary worktree와 unrelated user changes가 implementation path와 겹치지 않는지 확인한다.
- [x] `site/src/pages/index.astro`, `site/src/lib/data.ts`, `site/src/lib/render.ts`, `preprocessor/`, `infra/`, `Justfile`, `Jenkinsfile`와 external Vault를 U1 no-edit set으로 고정한다.
- [x] Greenfield project structure setup은 N/A임을 기록하고 existing Astro/npm organization을 유지한다.

### Step 2 — Integrate exact dependencies, configs and generated boundaries

**Stories/requirements**: ST-E03 profile slice; AC-E03-02~04; NFR-U1-002/006/008~010/012.

- [x] Exact selected versions의 registry integrity, peer와 Node engine compatibility를 검사한다.
- [x] Existing `site/package.json`과 lock delta를 보존하며 `@playwright/test`, Axe, Pretendard와 PDF.js를 추가한다.
- [x] `site/vitest.config.ts`, new `site/vitest.pbt.config.ts`, `site/playwright.config.ts`와 `site/tsconfig.profile-tools.json`을 작성한다.
- [x] `site/.gitignore`에 `.generated/`와 `.artifacts/`를 추가하고 verification/public tracked paths는 ignore하지 않는다.
- [x] No unapproved runtime loader, duplicate Vite, DOM emulator, PDF postprocessor 또는 client dependency가 추가되지 않았는지 확인한다.
- [x] `npm ls`와 lockfile root/resolution 일치를 확인하되 browser/PDF release는 후속 step 전까지 실행하지 않는다.

### Step 3 — Create fixtures and canonical obligation map

**Stories/requirements**: ST-E01; U1 slice of ST-E03; NFR-U1-008~011.

- [x] `site/tests/fixtures/profile-fixtures.ts`에 production fact와 분리된 Korean/Unicode valid/invalid fixtures를 작성한다.
- [x] `site/tests/obligations/u1-profile.json`에 all U1 umbrella/refinement/N/A, NFR, story/AC, EDGE와 negative path를 canonical test ID로 매핑한다.
- [x] `site/tests/unit/obligation-map.test.ts`가 missing mapping, unknown test ID와 duplicate semantic execution을 fail closed하게 한다.
- [x] Fixture/module이 `profile-data.ts`, route output 또는 public asset에 import되지 않는지 static assertion을 둔다.

### Step 4 — Generate C01 domain types, normalization and diagnostics

**Stories/requirements**: ST-E01; AC-E01-01~04; FR-001/002; EDGE-001~006.

- [x] `types.ts`, `issues.ts`, `normalization.ts`에 approved immutable entities/read models/result types를 구현한다.
- [x] Text trim → LF → NFC, no truncation, stable kebab ID predicate, typed URL/period/block contracts를 구현한다.
- [x] Stable `profile...` issue path, code/message와 complete stable sort/exact duplicate removal을 구현한다.
- [x] Input mutation, locale sort, byte slicing 또는 invalid-present optional omission이 발생하지 않게 한다.

### Step 5 — Generate C01 validation and fact-approval gate

**Stories/requirements**: ST-U04/U05, ST-E01/E02; AC-U04-01~03, AC-U05-01~04, AC-E01-02~03, AC-E02-01~03.

- [x] `validation.ts`에 aggregate/cardinality/entity/relation/URL/order/project-count/six-dimension rules를 구현한다.
- [x] `fact-approval.ts`에 normalized factId/value/target-surface/provenance/review correspondence와 inventory digest contract를 구현한다.
- [x] 모든 발견 가능한 issue를 수집한 뒤 invalid candidate에는 validated/partial output을 반환하지 않는다.
- [x] Required Pending/Excluded, unapproved link/metric와 inventory-production mismatch를 terminal diagnostics로 만든다.

### Step 6 — Generate C01 selectors and S01 assembly

**Stories/requirements**: ST-U02/U04, ST-E01/E02; AC-U02-01~03, AC-U04-01~03, AC-E01-01/03/04.

- [x] `selectors.ts`에 canonical `ResumeProfile`, `PortfolioProfile`, `HomepageProfile` projections를 구현한다.
- [x] Résumé group order, Portfolio project/six-dimension order와 absent optional omission을 고정한다.
- [x] `assembly.ts`에 pure test용 validated selector seam과 production-only `FactApprovedProfile` assembly를 type-level로 분리한다.
- [x] Production S01/routes/metadata/document는 current verified `FactApprovalReceipt` 없이 construct/call할 수 없게 한다.
- [x] Resume-only/portfolio-only/shared fact의 non-interference와 no-inferred-claim boundary를 유지한다.
- [x] `index.ts`에서 approved public API만 export하고 internal mutable helpers를 노출하지 않는다.

### Step 7 — Generate C03, C04 and C05 pure contracts

**Stories/requirements**: ST-U01 contributor, ST-U02/U04, ST-E01/E02; AC-U01-03~04, AC-U02-04, AC-U04-04; NFR-U1-013/015.

- [x] `metadata.ts`에 exact title/visible-description/canonical/OG/Twitter와 conservative typed JSON-LD builders를 구현한다.
- [x] `site/src/lib/layout/json-ld.ts`에 `<`, `>`, `&`, U+2028/U+2029 safe serializer와 round-trip contract를 구현한다.
- [x] `profile-resources.ts`에 profile route CDN Pretendard/preconnect/unused KaTeX exclusion과 legacy-route preservation policy를 구현한다.
- [x] `navigation.ts`에 fixed `Tags`, `Graph`, `Résumé`, `Portfolio` order와 query/fragment/trailing-slash/segment-aware current resolver를 구현한다.
- [x] `/resume-old` 같은 prefix collision과 multiple-current state를 거부한다.

### Step 8 — Generate C11 pure document contracts

**Stories/requirements**: ST-U03, ST-E02; AC-U03-02~04, AC-E02-02~04; NFR-U1-005~007/012.

- [x] `resume-manifest.ts`에 full section/entity/order/fact/path/kind/value manifest를 구현한다.
- [x] `canonical-digest.ts`에 versioned domain tag와 field-ordered length-prefixed SHA-256 encoder를 구현한다.
- [x] `document-boundary.ts`에 fixed `/resume.pdf`, source identity와 stable-link guard를 구현한다.
- [x] `resume-evidence.ts`에 structured web/print comparator와 deterministic PDF evidence mapper를 구현한다.
- [x] `resume-receipts.ts`에 draft/release receipt schema, exact-SHA human-review validator와 pure release assembly를 구현한다.
- [x] Set equality, core subset, flat-text identity inference와 PDF byte equality를 parity oracle로 사용하지 않는다.

### Step 9 — Generate business-logic tests, PBT runner and stable pure commands

**Stories/requirements**: ST-E01; U1 slice of ST-E03; all Functional Design U1 properties; NFR-U1-008~011.

- [x] Unit tests `profile-domain`, `profile-projections`, `profile-metadata-navigation`와 `resume-document`를 구현한다.
- [x] PBT setup/arbitraries/mutations와 four canonical PBT suites를 구현한다.
- [x] `pbt-runner.mjs`가 pre-worker run/seed/path/focus validation과 exact local Vitest spawn을 수행하게 한다.
- [x] `test:unit`과 `test:pbt` stable commands를 연결하고 framework proof는 별도 internal script로 유지한다.
- [x] Local 100-run suite, explicit same-seed replay와 one focused seed/path replay를 실행해 shrink evidence가 보존되는지 확인한다.
- [x] 발견된 defect는 fix 후 permanent example regression으로 추가한다.

**Step 9 completion evidence — 2026-07-24T17:37:05Z**:

- Step 9 initial close에서 six unit files/54 tests와 four canonical PBT files/24 properties가 통과했다. Step 10 traceability re-review가 one obligation-map regression과 two S01 production-boundary properties를 추가해 current count는 55 tests/26 properties다. Local default는 100회와 generated seed `1018959259`를 출력했고, 같은 seed의 full suite를 두 번 재실행했으며 focused seed/path `0` replay도 통과했다.
- One-use failing property가 seed `4242`에서 counterexample `[10]`, shrink 7회와 path `0:1:0:0:0:0:0:2`를 출력했고, 같은 path가 동일 counterexample를 재현했다. Proof file은 즉시 제거했으며 separate framework proof 2 tests도 유지한다.
- Source literal focus를 그대로 Vitest에 전달하면 fast-check의 runtime seed suffix 때문에 zero-test success가 될 수 있던 runner defect를 AST prevalidation과 suffix-aware anchored filter로 수정하고 `profile-tooling.test.ts`에 permanent regression을 추가했다.
- Current pure C01/C03/C11/S01 property slice만 닫았다. Renderer-neutral C02 tree와 BaseLayout/Header surface refinements는 Step 18, mutable release-state PBT와 release alias는 Step 22에 남아 있으며 obligation map이 이를 `deferredCoverage`로 fail-closed 검증한다.

### Step 10 — Write Business Logic Summary

**Stories/requirements**: ST-E01/E02; AI-DLC Business Logic Summary.

- [x] `code/business-logic-summary.md`에 created/modified files, C01/C03/C11/S01 contracts, diagnostics, property aliases와 fact gate를 기록한다.
- [x] Summary가 test fixture나 review artifact를 production source로 설명하지 않는지 확인한다.

**Step 10 completion evidence — 2026-07-24T17:52:07Z**:

- `aidlc-docs/construction/profile-domain-and-native-experience/code/business-logic-summary.md`가 exact authored/test/tooling inventory, 40-code diagnostic vocabulary, capability-based fact gate, canonical property ownership, PBT compliance와 current/future artifact boundaries를 기록한다.
- Summary review 중 DE-P13/DE-P15 canonical suite mapping을 바로잡고, non-vacuous P-S01-01 production assembly/metadata success·failure properties와 obligation regression을 추가했으며 FD-P-C11-01 actual four-surface mapping을 Step 21로 명시적으로 이연했다.
- Current verification은 TypeScript two checks, six unit files/55 tests, four canonical PBT files/26 properties × 100 runs at seed `1729`, framework proof two tests, Astro build, Markdown GFM parse, path/whitespace/diff checks를 통과했다.
- Synthetic fixtures/reviews는 test-only이고 actual fact inventory, production source/receipt, routes, rendered PDF와 release는 생성되지 않았음을 독립 review가 확인했다. Blocking/material finding은 없다.

### Step 11 — Resolve API Layer Generation, Testing and Summary as N/A

**Stories/requirements**: FR-013/018; static architecture boundary.

- [x] Runtime/network API가 생성되지 않았음을 source/dependency scan으로 확인한다.
- [x] API unit test가 N/A인 이유와 future reevaluation trigger를 `code/non-applicable-layers-summary.md`에 기록한다.
- [x] Runtime endpoint, server handler, auth/session/form 또는 external API client가 추가되지 않았는지 확인한다.

**Step 11 completion evidence — 2026-07-24T18:00:34Z**:

- `aidlc-docs/construction/profile-domain-and-native-experience/code/non-applicable-layers-summary.md`가 U1 network/transport API generation과 API unit testing의 N/A 근거, repository-wide baseline carveout과 future reevaluation trigger를 기록한다.
- 17개 U1 application source와 tests/tooling/configuration을 포함한 44개 전체 delta를 검색한 결과 runtime network call, endpoint/server handler, auth/session/form/webhook 또는 external API client 추가가 없다. `site/src/pages/**`와 static Astro configuration은 unchanged다.
- Dependency delta는 Pretendard static asset과 local test/inspection tooling뿐이며 server adapter, API/auth client 또는 transport framework는 없다.
- Independent review가 local materialization/browser/PDF/filesystem tooling을 pure build-time contract로 과도하게 축소한 표현 한 건을 찾아냈고, static application output과 local-only tooling의 정확한 경계로 수정했다. Focused re-review와 GFM validation은 clean이다.

### Step 12 — Resolve Repository Layer and Database Migration Generation as N/A

**Stories/requirements**: FR-001/017/018; NFR-U1-014.

- [x] Repository/data-access layer, database entity와 migration이 생성되지 않았음을 확인한다.
- [x] Authored TypeScript source, tracked derived receipt/PDF와 private generated artifacts의 차이를 `non-applicable-layers-summary.md`에 기록한다.
- [x] Runtime persistence, queue, cache, telemetry 또는 health-check code가 추가되지 않았는지 확인한다.

**Step 12 completion evidence — 2026-07-24T18:37:51Z**:

- Exact 17-file U1 application-source and 44-file full-delta scans found no repository/DAO, ORM/database/schema/migration, runtime persistence, queue/worker, cache, telemetry/analytics or health-check implementation. Application source has no external or Node/filesystem import, and direct persistence dependencies are absent.
- `non-applicable-layers-summary.md` separates tracked authored source/tooling, future tracked non-public receipts, future tracked public `site/public/resume.pdf`, gitignored private generated artifacts and transient build output. It also preserves inherited build filesystem/cache, browser storage, S3/CloudFront and misleading-name carveouts.
- Repository CRUD/migration tests are N/A, but Step 22 PBT-06 release-journal state sequences and filesystem crash/recovery/rollback examples remain applicable. Step 13 local font materialization is explicitly outside the runtime repository/database N/A.
- A missing/prunable uncommitted implementation worktree was reconstructed at the exact path/branch from 175 recorded successful patches plus the exact dependency commands. The restored 44-file delta passed TypeScript two checks, 55 unit tests, 26 properties at seed `1729`, two framework tests and the four-route Astro build; no stage, commit, push, merge, deployment or external write occurred.
- Independent summary review found one lifecycle overstatement between pre-approval review documentation and post-gate machine receipts. The categories were split, focused re-review is clean, and remark/GFM parses the result as six tables with no code or Mermaid blocks.

### Step 13 — Generate verified Pretendard materialization and Astro build integration

**Stories/requirements**: ST-U02/U03/U04; NFR-U1-004~006; LC-U1-04/05/07/09.

- [x] Exact Pretendard package의 official CSS/WOFF2/license path와 SHA-256 allowlist를 `font-allowlist.json`에 고정한다.
- [x] `profile-paths.mjs`와 `font-materializer.mjs`에 fixed-root containment, regular-file/no-symlink/hash/license, exclusive staging과 atomic directory publish를 구현한다.
- [x] `astro-profile-integration.mjs`를 `site/astro.config.mjs`에 등록해 every direct Astro build가 module resolution 전에 materializer를 실행하게 한다.
- [x] `font.css`가 generated input을 distinct profile family로 import하고 Vite가 same-origin hashed WOFF2로 emit하게 한다.
- [x] Missing/mismatch/symlink/non-regular case와 idempotent fresh-clone materialization을 `profile-tooling.test.ts`로 검증한다.
- [x] Reduced current site의 clean `npx astro build`가 별도 manual pre-step 없이 성공하는지 확인하되 deployable full-site라고 주장하지 않는다.

**Step 13 completion evidence — 2026-07-24T19:16:14Z**:

- `pretendard@1.3.9`의 variable dynamic subset을 선택하고 official CSS 1개, WOFF2 92개, `LICENSE.txt` 1개의 exact relative path/byte count/SHA-256과 94-source-set digest `c28d95671cafcc4495da4ab84fed67b3d861f76d3a6f343ae1d95d1fa7c5d438`를 allowlist에 고정했다. Static dynamic subset과 WOFF fallback은 승인 범위 밖이다.
- Materializer는 fixed site/package/generated roots, normalized relative paths, package-lock identity, `lstat`/`realpath` containment, regular-file/no-symlink, byte/hash/WOFF2 magic, complete CSS URL/order/range/weight와 OFL evidence를 fail closed로 검증한다. UUID exclusive staging, per-file exclusive writes/fsync, staging identity, cooperating publisher lock, atomic directory rename, exact-tree verification과 owned cleanup을 적용하며 valid existing output은 inode/mtime 변경 없이 재사용하고 invalid target은 보존한 채 실패한다.
- Generated CSS는 font-face 의미 변경을 `Pretendard Variable` → `RVNNT Profile` family alias로 제한한다. Verified copyright comment와 wording-preserving, whitespace-canonicalized full OFL text를 pre-hash 비표준 `@license` metadata at-rule로 포함한다. 이 at-rule은 브라우저 스타일 의미에는 영향이 없지만 standalone CSS validator warning 가능성은 비차단 caveat다.
- Step 13 완료 시 `astro-profile-integration.mjs`는 Astro integrations의 첫 항목에서 materializer를 실행했다. Step 15는 config-setup gate를 유지하면서 final public-output leak scan이 sitemap 뒤에 실행되도록 이 integration을 마지막 항목으로 옮겼다. `font.css`는 private generated CSS만 import하고 Vite `7.3.2` 회귀 검증은 exact license metadata 1회, 92개 unique root-relative same-origin hashed WOFF2 URL과 92개 emitted file의 1:1 closure, distinct family, private `LICENSE.txt`/manifest 비노출, metadata 변경 시 CSS filename hash 변경을 확인한다.
- Missing license, same-length font hash mismatch, symlink, non-regular source, allowlist traversal, CSS closure mismatch, tampered output, idempotent reuse와 two-builder convergence를 포함한 focused tooling 13 tests가 통과했다. Full verification은 TypeScript 두 checks, six unit files/66 tests, four PBT files/26 properties × 100 at seed `1729`, framework two tests와 fresh `npx astro build`를 통과했다.
- Fresh direct Astro build는 manual pre-step 없이 private 95-output tree를 materialize하고 reduced four-route site를 성공적으로 생성했다. Profile routes가 아직 생성되지 않았으므로 actual reduced `dist/`의 WOFF2는 의도적으로 0개이며 route reachability/emission은 Steps 17~18/20에서 닫는다. Existing legacy output inventory/hash는 범위 제한 전후 동일하고 full-site deployment readiness는 주장하지 않는다.
- Independent filesystem/security, Astro/license/resource와 test-oracle reviews는 acquisition-failure lock cleanup, waiting-builder exact-output reuse, close-error preservation, global legal-comment leakage, post-hash mutation과 URL-origin oracle을 보완한 뒤 blocking finding 없음으로 종료했다. No fact, route, PDF, external Vault, deployment, push 또는 merge mutation이 발생하지 않았다.

### Step 14 — Create and approve the actual profile fact inventory

**Stories/requirements**: ST-U02~U05, ST-E02; AC-U05-04, AC-E02-01~03; hard human gate.

- [x] `profile-fact-inventory.md`에 atomic factId/path/normalized value/evidence/public surfaces/review state를 작성한다.
- [x] Name/headline/intros/summaries, public email/GitHub, skill group, career/achievement, optional education/certification을 inventory한다.
- [x] Final 3~6 projects, exact order, problem/role/decision/architecture/outcome/lesson, every metric와 optional evidence URL을 inventory한다.
- [x] External URL마다 expected destination, human verifier와 checked-at를 기록하고 automated reachability call은 하지 않는다.
- [x] Unsupported claim을 추론하지 않고 Pending/Excluded로 표시한다.
- [x] `profile-production-diff.md`에 Approved-only normalized materialization diff와 inventory digest를 작성한다.
- [x] `profile-fact-approval-receipt.md`에 versioned schema로 receipt ID, inventory revision/SHA-256, production-diff revision/SHA-256, ordered approved-record digest, proposed materialized-profile digest, exact audit interaction/timestamp와 decision을 기록한다.
- [x] **PAUSE**: 사용자에게 complete inventory와 production diff의 정확성·공개 가능성 승인을 요청하고 exact response를 audit에 기록한다.
- [x] 승인 뒤에만 exact response와 current three digests를 결합한 final human receipt를 complete로 표시하고, 같은 identity만 담은 versioned `site/verification/profile/fact-approval.json` machine receipt를 생성한다.
- [x] Machine receipt는 public fact value를 복제하지 않으며 inventory/diff/profile digest, receipt ID, decision/audit identity와 schema version만 포함한다.
- [x] Required fact가 Pending/Excluded이거나 approval이 모호하면 Step 15로 진행하지 않는다.

**Step 14 pre-approval preparation evidence — 2026-07-25T03:22:28Z**:

- `profile-fact-inventory.md`에는 77개 atomic candidate record가 stable factId, canonical path, exact normalized typed value, evidence ID, canonical target surfaces, requirement, `Pending` status와 null decision record로 기록되어 있다. Name/narratives/contact, 4개 skill group, Hansono Experience 1개, optional Education 1개와 Certification 2개가 포함된다.
- Final project proposal은 `obsidian-custom-publish`, `mcp-local-reference`, `AdiuBear` 3개와 order `10/20/30`이다. 각 project는 problem, role, key decisions, architecture, outcomes, lessons의 여섯 paragraph fact와 optional public repository evidence를 가진다. 근거 없는 quantitative metric과 project period는 제안하지 않았다.
- 네 external destination에는 exact expected destination과 human verifier를 기록했다. Human checked-at는 Question 2 A 응답의 exact audit timestamp로 채우도록 Pending으로 고정했으며 automated reachability call은 실행하지 않았다.
- Non-scope contact/location/image data, temporary Notion links, fixture/persona/Git identity/filesystem username과 unsupported metric은 inventory record로 수집하지 않았다. 이전 `sogangcomputerclub.org`와 `Flutter Sample Project`는 unselected alternative로만 기록했고 자동 `Excluded` 판정을 만들지 않았다.
- Draft inventory SHA-256은 `cb6f9eae1eb2ecd7807739f3382a379ca9ae7555622140cc63775a4e9e719d64`, empty Approved-record SHA-256은 `d246c1b43e0b1cfae877a25f5b09e48e4219bd00903b8f8aea20325a239345d8`다. Approved-only current production diff는 empty이며 digest는 `6003a6cce6d94dfca0bacc2a2c7227c8d1d6c596457a6888e58ab1471f3c62d8`다.
- Exact candidate facts와 structural controls의 proposed materialized-profile SHA-256은 `775177b9cd3dd6b662e25a3094d96ba56260084de06d9d527c531481b4c9e15e`다. Pre-approval Markdown receipt는 `decision: Pending`과 `decisionRecordedAt: NOT_RECORDED`를 명시해 machine-valid receipt를 주장하지 않는다.
- `profile-fact-review-questions.md`는 atomic value/public disclosure, four external destinations, structure/order/omission, inventory+production-diff joint approval의 네 질문을 strict blank-line, final `X) Other`, empty `[Answer]:` 형식으로 제공한다.
- 네 Markdown은 remark/GFM으로 14개 table, 33개 heading, zero code/HTML/Mermaid block으로 parse됐다. Record uniqueness/path/surface/period/project-dimension/privacy/question checks와 deterministic digest generation이 통과했다.
- `profile-fact-digest-spec.md`는 exact canonical payload와 deterministic generator를 one JavaScript code block으로 보존한다. Extracted source SHA-256 `f8567fc136ccf8bfbb5361eb66cb1ffb3f2475afafe025c697201a804deddc1d`, independent execution의 four expected digests와 generated four-review-file byte equality가 통과했다.
- 모든 candidate가 아직 Pending이고 Approved set이 비어 있으므로 PAUSE checkbox는 열려 있다. `profile-data.ts`, machine receipt, route, PDF와 public output은 생성하지 않았고 Step 15는 차단 상태다.

**Step 14 completion evidence — 2026-07-25T03:54:20Z**:

- 사용자가 네 질문에 제시된 exact A option을 그대로 작성했다. 응답은 A/A/A/A이며 candidate value와 공개 가능성, 네 external destination의 직접 확인, exact structure/project order/omission, inventory와 production diff의 공동 승인을 모호성이나 모순 없이 결합한다. Exact raw turn `"작성 완료"`과 승인 선택은 audit interaction `U1-CG-S14-FACT-APPROVAL-20260725T034431Z`에 기록했다.
- 77개 record는 모두 `Approved`, Pending/Excluded는 0개다. 모든 decision record와 네 human URL ledger row는 `2026-07-25T03:44:31Z`에 결속됐으며 required fact, selected optional fact와 structural decision에 미해결 항목이 없다.
- Final identity는 inventory `25357f9902858abeafe17a3b3016c43328852ea8dce29453e48cd83da31fa345`, ordered Approved records `356356f9dc5f8b2b93e4d7bf88a3f11a8181f55f1485ed82c8994ae994aa6474`, production diff `a4ebc55bd3e3d78ae8d3239abdc81e0a52921d19e1c0c0cb28ea49cbad53c6e1`, materialized profile `775177b9cd3dd6b662e25a3094d96ba56260084de06d9d527c531481b4c9e15e`다.
- Final generator source SHA-256은 `a186c6989f06fe95d98d143e4329f04a87b11298e4c3c40199b8a371f2f29e59`다. Evidence registry의 설명 metadata와 runtime `FactReviewEvidence` exact-key projection을 분리했으며 29개 user-provided와 48개 public-source record가 구현 계약과 일치한다. 이 canonical-envelope correction은 fact value, evidence source/ID, surface, requirement, structure 또는 승인 선택을 바꾸지 않았다.
- Normative generator 독립 실행은 77 Approved records와 네 digest를 재현했고 generated inventory/diff/receipt/questions가 repository files와 byte-for-byte 일치했다. Human receipt와 `site/verification/profile/fact-approval.json`은 exact 11-key identity로 일치하며 machine receipt에는 이름, 이메일, URL, career/project 문장이나 structural content가 없다.
- `site/src/lib/profile/profile-data.ts`는 계속 absent이고 Step 15 production materialization은 아직 실행하지 않았다. Route, metadata output, PDF, external Vault, infrastructure, deployment, stage, commit, push 또는 merge mutation도 발생하지 않았다.
- 모든 hard-gate 조건을 통과했으므로 Step 14는 complete이며 Step 15 exact materialization을 진행할 수 있다.

### Step 15 — Materialize the sole production ProfileData

**Stories/requirements**: ST-U02/U04/U05, ST-E01/E02; AC-E01-01~04, AC-E02-02~03.

- [x] 승인된 diff 그대로 `site/src/lib/profile/profile-data.ts`를 생성한다.
- [x] Approved atomic value, stable ID/order/relation을 정확히 보존하고 receipt identity를 fact source에 섞지 않는다.
- [x] Excluded/Pending fact, placeholder, inferred date/metric/link와 fixture value가 production source에 없는지 검사한다.
- [x] `production-profile.ts`가 non-public machine receipt와 `profile-data.ts`를 build time에만 결합하고, C01 validation 뒤 `fact-approval.ts`가 exact receipt revisions/digests/current audit decision을 대조해 `FactApprovedProfile`을 만들게 한다.
- [x] Machine receipt는 client bundle/public output에 emit되지 않으며 missing/stale/schema-invalid receipt는 build를 fail closed하게 한다.
- [x] Production S01 assembly를 build-time에 실행해 structural-invalid 또는 approval-invalid data가 route/metadata/document output을 만들지 못하게 한다.
- [x] Inventory versus production full factId/value/path/surface diff가 zero이고 materialized-profile digest가 receipt와 같은지 named test로 검증한다.

**Step 15 completion evidence — 2026-07-25T04:30:11Z**:

- `profile-data.ts`는 승인된 77개 atomic fact를 9개 root field, 4개 skill group, Hansono Experience 1개, ordered project 3개, Education 1개와 Certification 2개로 exact materialize한다. Achievement/additional link는 empty이고 project period/relation 및 certification issuer는 property 자체가 absent다. `satisfies Unbranded<ProfileData>`와 recursive freeze를 적용했으며 receipt, evidence registry, review state, Pending/Excluded, placeholder, inferred date/metric/link와 fixture import가 없다.
- Build-only `production-profile.ts`는 exact 11-key receipt와 fixed approved identity를 먼저 검증하고, recursive exact-key source-shape 검사 뒤 C01 validation을 실행한다. 77개 fact를 29 user-provided/48 public-source evidence membership에 exact하게 결합하고 모든 decision record를 receipt audit ID/time과 맞춘다. Approved-record, materialized-profile와 production-diff canonical SHA-256을 실제 value/path/surface/requirement 및 numeric order/block/absence/relation structure에서 재계산한 뒤에만 `validateFactApproval`과 S01 `assembleFactApprovedProfile`을 실행한다.
- Runtime에서 재현한 identity는 Approved records `356356f9dc5f8b2b93e4d7bf88a3f11a8181f55f1485ed82c8994ae994aa6474`, materialized profile `775177b9cd3dd6b662e25a3094d96ba56260084de06d9d527c531481b4c9e15e`, production diff `a4ebc55bd3e3d78ae8d3239abdc81e0a52921d19e1c0c0cb28ea49cbad53c6e1`로 Step 14 receipt와 exact하게 같다. Inventory identity `25357f9902858abeafe17a3b3016c43328852ea8dce29453e48cd83da31fa345`도 fixed receipt와 일치한다.
- Astro config setup에서 production S01 gate가 font materialization보다 먼저 실행된다. Missing receipt import, key/schema/revision/audit/value/structure/digest drift는 route generation 전 fail closed다. Build-done scanner는 sitemap 뒤에 실행되며 symlink, `fact-approval.json` path, receipt ID/revision/digest/audit/timestamp가 file content 또는 relative file/directory path에 있으면 실패한다. Actual four-route `dist/`에는 해당 filename과 marker가 0개다.
- `production-profile.test.ts`의 18 tests는 77-record full factId/value/path/surface/requirement zero diff, 세 digest, audit identity, raw-source/private-receipt import boundary, exact optional omission, receipt missing/extra/schema/revision/decision/audit/time drift, fact/order/relation/invalid-shape drift, arbitrary root/nested extra key, receipt-marker content/file/directory leak을 검증한다. 새 domain PBT는 equivalent clone과 explicit-order source permutation에서 materialized facts, structure와 digest가 invariant임을 100 runs로 확인한다.
- Final verification은 full/project-tools TypeScript checks, seven unit files/84 tests, four PBT files/27 properties × 100 at seed `1729`, framework two tests, clean four-route `npx astro build`, independent `dist/` marker scan과 `git diff --check`를 통과했다. 두 independent review는 exact generator/digest 재현 뒤 unmodeled `status: Pending` extra-key와 identity-bearing output path의 두 P2를 찾았고, recursive exact-key 검사와 relative path/directory marker 검사 및 회귀 테스트로 모두 종료한 뒤 새 finding 없음으로 마쳤다.
- Route, presentation, metadata output, PDF, public receipt copy, external Vault, infrastructure/AWS/Terraform, deployment, stage, commit, push 또는 merge mutation은 발생하지 않았다.

### Step 16 — Generate C02 renderer-neutral presentation and Astro components

**Stories/requirements**: ST-U02/U04/U05; AC-U02-01~03, AC-U04-01~03, AC-U05-01~03; FD-P-C02-01~03.

- [x] `presentation.ts`가 validated projections를 semantic renderer-neutral trees로 변환하게 한다.
- [x] `ProfileShell`, local navigation, typed content blocks와 contact/evidence actions를 구현한다.
- [x] Résumé intro/skills/career/achievement/project/optional education/certification 순서와 initially closed native details를 구현한다.
- [x] Portfolio 3~6 semantic articles와 exact six-dimension order를 구현한다.
- [x] Required link/details/summary에 stable `{component}-{role}` `data-testid`를, repeated entity에는 stable approved ID suffix를 사용한다.
- [x] Raw HTML/arbitrary Markdown, truncation, placeholder, client tab/modal/carousel와 new hydration을 추가하지 않는다.

**Step 16 completion evidence — 2026-07-25T04:40:59Z**:

- `site/src/components/profile/presentation.ts`는 validated `ResumeProfile`과 `PortfolioProfile`만 입력받아 frozen renderer-neutral trees를 만든다. Fact value마다 approved `factId`를 유지하고 explicit entity/evidence ID와 order, typed paragraph/list shape, tagged period value와 optional property omission을 보존한다. 입력 collection을 sort/repair하지 않으며 fixed local navigation과 presentation-only purpose labels 외에는 fact나 claim을 만들지 않는다.
- Résumé tree는 `소개·연락·PDF → 핵심 역량 → 경력·대표 성과 → 대표 프로젝트 요약 → present 교육 → present 자격` 순서다. Career group을 Achievement group보다 먼저 유지하고 모든 highlight에 `initiallyOpen: false`, full detail blocks와 present evidence를 포함한다. Portfolio tree는 canonical 3~6 project order와 `문제 → 역할 → 핵심 결정 → 구조 → 결과 → 배운 점` dimension order를 그대로 유지한다.
- `ProfileShell.astro`, `ProfileLocalNavigation.astro`, `ContentBlocks.astro`, `ContactActions.astro`, `ResumeContent.astro`, `ResumeEntry.astro`, `PortfolioContent.astro`, `CaseStudy.astro`를 추가했다. Shell은 기존 `BaseLayout`의 `main`/Header/footer를 복제하지 않고 one h1 뒤 labelled local navigation을 출력한다. Résumé는 `open` attribute 없는 native details/summary에 role/title, organization when career, period when present, summary와 static detail content를 모두 둔다. Portfolio는 모든 project를 addressable semantic article로 출력하고 six dimensions를 initial HTML에 펼쳐 둔다.
- Paragraph/list는 Astro text node와 `p`/`ol`/`ul`/`li`로만 렌더링한다. Contact, evidence와 PDF는 labelled normal anchors이고 absent optional section/detail/evidence/action은 heading/wrapper/placeholder까지 생략한다. `set:html`, Markdown parsing, truncation, client directive, script, form, tab, modal, carousel와 new hydration은 없다.
- Local/contact/evidence links, résumé details/summary와 repeated profile entities에는 component-role 기반 `data-testid`를 사용하고 repeated item은 approved ID suffix를 갖는다. Review에서 발견한 generic repeated evidence-wrapper test ID P2는 wrapper ID 제거로 종료했으며 evidence action은 approved evidence ID/order와 label/destination fact provenance를 유지한다.
- Verification은 `npx astro check` 0 errors, existing seven unit files/84 tests, four PBT files/27 properties × 100 at seed `1729`, direct reduced four-route `npx astro build`와 `git diff --check`를 통과했다. Step 18이 소유하는 renderer/static-markup unit/PBT와 production-route output closure는 obligation map의 기존 `remainingStep: 18` 상태로 유지했다.
- 두 independent review는 section/dimension/navigation order, optional omission, semantic details/article/heading structure, stable IDs와 no-raw-markup/no-hydration boundary를 확인했다. 한 P2 수정 뒤 focused re-review는 새 blocker 없음으로 종료했다.
- Route, BaseLayout, Header/MobileNav, profile CSS, test/obligation-map closure, PDF/release, external Vault, infrastructure/AWS/Terraform, deployment, stage, commit, push 또는 merge mutation은 발생하지 않았다.

### Step 17 — Integrate routes, BaseLayout, Header and profile styles

**Stories/requirements**: ST-U01 contributor, ST-U02~U05; all route/browser NFRs.

- [x] `resume.astro`와 `portfolio.astro`가 S01 output, C03 metadata와 C02 components만 조합하게 한다.
- [x] `BaseLayout.astro`에 unique typed metadata/JSON-LD host와 profile resource policy를 backward-compatible하게 추가한다.
- [x] `Header.astro`가 one immutable nav state를 desktop와 existing `MobileNav.tsx`에 전달하게 한다.
- [x] `MobileNav.tsx`를 in-place native disclosure/static SSR markup으로 최소 변경해 hydration 없이도 initial HTML에 all four ordered anchors가 존재하고 keyboard로 열고 이동할 수 있게 한다.
- [x] Existing search/theme controls와 their client behavior는 변경하지 않는다.
- [x] `foundation.css`, `resume.css`, `portfolio.css`, `print.css`를 구현하고 existing `--c-` variables, 480/768px boundaries를 사용한다.
- [x] Print CSS 자체가 details 전체를 표시하고 A4/12mm, ≥10pt/≥1.35와 screen-only omission/page-break rules를 적용하게 한다.
- [x] Profile route에서 external Pretendard/preconnect/unused KaTeX가 빠지고 legacy route default resource behavior가 유지되는지 확인한다.

**Step 17 completion evidence — 2026-07-25T04:54:38Z**:

- `resume.astro`와 `portfolio.astro`는 build-only `getProductionProfileAssembly()`의 approved résumé/portfolio projection, C03 production metadata builder와 C02 presentation/component tree만 조합한다. Route-local title, description, canonical, JSON-LD 또는 profile fact copy는 없고 configured `Astro.site.origin`만 site identity로 전달한다.
- `BaseLayout.astro`는 legacy props를 유지하면서 exclusive typed `metadata` branch를 추가했다. Profile metadata는 one title/description/canonical/OG/Twitter set으로 host되고 JSON-LD는 `serializeJsonLdDocuments()`의 script-safe payload만 `application/ld+json` script에 전달한다. Path/legacy-prop conflict, serialization failure와 unknown/mixed resource policy는 build를 fail closed한다.
- Pathname-bound C04 policy는 `/resume`와 `/portfolio`에서 jsDelivr preconnect, external Pretendard와 unused KaTeX를 모두 제거하고 route-local font/profile CSS를 same-origin build output으로 제공한다. Generated legacy `/tags`와 `/graph`는 기존 three external link resources를 exact destination/order로 유지한다.
- `Header.astro`는 fixed immutable `Tags → Graph → Résumé → Portfolio` state 하나를 desktop과 `MobileNav.tsx`에 전달한다. MobileNav는 `useState`, event handler와 `client:load`가 없는 initially closed native `details/summary/nav` SSR tree이며 all four anchors와 correct `aria-current`가 initial HTML에 존재한다. Existing search triggers, Search `client:idle`와 ThemeToggle `client:load` behavior는 그대로다.
- Added `foundation.css`, `resume.css`, `portfolio.css` and résumé-only `print.css`. Screen styles reuse existing tokens, use exact 479/480/767/768 boundaries, wrap long text/URLs and add no truncation, line clamp or content-hiding max height. Profile-owned generated CSS sanity union is 18,738 gzip bytes against 24,576; Step 19 still owns the canonical provenance/reachability analyzer.
- Print owns canonical `@page` A4/12mm, 10pt/1.4 body type, CSS-only closed-detail expansion, global/local navigation/progress/toggle/screen-decoration omission, heading-first-block keep and entry fragmentation. Review found one P1 where short details could split; `details.resume-entry { break-inside: avoid-page; }` now keeps fitting entries together while detail content retains `break-inside/page-break-inside: auto` for long-detail pagination, and focused re-review closed it.
- Final verification passed `npx astro check` with 0 errors, existing seven unit files/84 tests, four PBT files/27 properties × 100 at seed `1729`, direct six-page `npx astro build`, parsed two JSON-LD documents per profile route, exact SSR navigation/resource assertions and `git diff --check`. Step 18 retains canonical renderer/static-output unit/PBT closure in unchanged deferred coverage.
- Three independent contract/navigation/CSS reviews report no remaining blocker/P1/P2. No browser/manual accessibility review, PDF/release, external Vault write, deployment, Git stage/commit/push/merge or infrastructure/AWS/Terraform mutation occurred.

### Step 18 — Generate frontend tests and Frontend Components Summary

**Stories/requirements**: ST-U01 contributor, ST-U02/U04/U05; U1-P07/P09/P10; NFR-U1-001/003/011/015.

- [x] `profile-presentation.test.ts`와 presentation PBT로 hierarchy, omission, typed blocks, no raw markup와 static interaction을 검증한다.
- [x] Metadata/navigation unit/PBT로 exact labels/order/current state, visible-description equality와 JSON-LD script-boundary cases를 검증한다.
- [x] Production Astro output test가 one h1, heading order, server HTML anchors/details와 automation IDs를 검증하게 한다.
- [x] `code/frontend-components-summary.md`에 created components, modified shell files, CSS ownership와 no-new-island 결과를 기록한다.

**Step 18 completion evidence — 2026-07-25T05:13:03Z**:

- Added `profile-presentation.test.ts` with fixed renderer-neutral examples and one isolated lockfile-local Astro build into an exact temporary output root. Replaced the presentation PBT's selector duplication with three direct `buildResumePresentation()`/`buildPortfolioPresentation()` properties for section/project order, typed fact/block attribution, optional-node-only removal, closed disclosures, declarative actions and exact six dimensions.
- Existing metadata/navigation examples and properties retain exact label/order/current-state, visible-description construction, JSON-LD script-safe round trip and absent-host coverage. The production output example complements them with canonical/visible-summary equality, authoritative metadata singleton and ordered JSON-LD host assertions rather than duplicating the pure properties.
- Static output assertions cover one h1, unskipped logical headings including each résumé entry's required ARIA level, item-matched native details/summary containment and closed state, exact local/desktop/mobile SSR anchors/current parity, MobileNav outside an Astro island, stable unique automation IDs and structured search/nav-tree profile-route isolation.
- The obligation map removed exactly the three Step 18 deferred groups while retaining their canonical owners. Only `FD-P-C11-01` at Step 21 and `NFR-P-RELEASE-01` at Step 22 remain deferred.
- Final gates passed full and profile-tools TypeScript, `npx astro check` with 0 errors and six existing hints, 8 unit files/89 tests, 4 canonical PBT files/26 properties × 100 at seed `1729`, two same-seed full PBT runs, one exact focused presentation replay, a direct six-page Astro build and `git diff --check`.
- Independent contract/PBT/map review reports no blocker/P1/P2. Static-output review found two P2 gaps in ARIA-heading requirement and details/summary containment; both were strengthened and focused re-review reports no remaining finding. The Frontend Components Summary's empty-collection and edge-traceability wording was corrected, and focused documentation re-review is clean.
- No preview/browser server, browser/Axe/manual accessibility review, canonical Step 19 resource analyzer, PDF/release, external Vault write, deployment, Git stage/commit/push/merge or infrastructure/AWS/Terraform mutation occurred.

### Step 19 — Generate clean preview, resource analyzers and browser command

**Stories/requirements**: ST-U02~U05; NFR-U1-001~004/012~015; LC-U1-02/03/05/06/18/19.

- [x] `startup-retry.mjs`가 classified preview/browser startup failure만 clean teardown 뒤 한 번 재시도하게 한다.
- [x] `clean-profile-build.mjs`와 `preview-supervisor.mjs`가 fresh `site/dist`, ephemeral `127.0.0.1`, no existing-server reuse, process-tree cleanup을 소유하게 한다.
- [x] `request-ledger.mjs`가 context 생성 직후 non-loopback request를 abort하고 structured evidence를 만든다.
- [x] `asset-budget.mjs`가 build provenance/reachability로 unique profile CSS gzip ≤24KiB, zero U1 hydrated component/new JS를 fail closed하게 검사한다.
- [x] `verification-provider.mjs`가 browser/link/metadata/resource/manual-record evidence를 read-only로 조합하게 한다.
- [x] `test:e2e`를 clean build → owned preview → Playwright/Axe/analyzers flow에 연결한다.

### Step 20 — Generate and execute browser/accessibility/print verification

**Stories/requirements**: ST-U01 contributor, ST-U02~U05; NFR-U1-001~006/013~015.

- [x] Six E2E specs와 support modules를 exact viewport/browser/theme/details/JS matrix로 구현한다.
- [x] Internal routes, 200/non-empty HTML, unique metadata/JSON-LD, no overflow/clipping/truncation, native details와 keyboard/focus를 검사한다.
- [x] Axe WCAG 2/2.1 A/AA + 2.2 AA를 blanket exclusion 없이 실행하고 contrast/target/sticky focus/reduced-motion assertions를 보완한다.
- [x] A4/Letter print CSS, details expansion, type/page-break/link annotation와 page count report를 검사한다.
- [x] **PAUSE**: 사용자 또는 명시된 human reviewer가 actual routes에서 reading order, color-independent meaning, focus appearance/obscuration와 applicable exception을 검토할 때까지 기다린다.
- [x] Exact review-subject digest와 reviewer/time/result를 `site/verification/profile/manual-web-accessibility.json`에 기록한다.
- [x] Manual review가 fail/missing/stale이면 수정·재검토하고 PDF promotion으로 진행하지 않는다.

### Step 21 — Generate S04 PDF render, inspection and evidence pipeline

**Stories/requirements**: ST-U03, ST-E02; AC-U03-01~04, AC-E02-02~04; NFR-U1-005~007/012.

- [x] `pdf-renderer.mjs`가 pinned Chromium, loopback-only policy, font readiness와 fixed print options로 private A4 candidate를 생성하게 한다.
- [x] `pdf-inspector.mjs`가 exact PDF.js로 text/URL annotations/structure tree/outline/page images/tool versions를 추출하게 한다.
- [x] `pdf-viewer.mjs`가 actual candidate bytes의 local pages/structural review surface를 만들게 한다.
- [x] C11 pure mapper가 expected manifest에 each occurrence를 unambiguously 연결하고 expected=web=print=PDF full ordered equality를 검사하게 한다.
- [x] Draft receipt는 private candidate/source/manifest/tool/structure/font/network/print evidence를 모두 묶되 manual/public approval을 주장하지 않게 한다.
- [x] Missing/unreadable/stale/missing-extra-changed-reordered/ambiguous/link/structure/outline cases를 named tests로 실패시킨다.

### Step 22 — Generate fail-closed release transaction and complete command routing

**Stories/requirements**: ST-U03, ST-E02; AC-U03-02~04; NFR-U1-007/010/012; LC-U1-15~19.

- [x] `release-store.mjs`에 fixed allowlist, lstat/realpath/type/containment/device recheck와 single-writer lock을 구현한다.
- [x] Receipt-first/public-PDF commit, fsync/directory durability, recovery snapshots/absence sentinel와 durable journal states를 구현한다.
- [x] Pure journal transition model과 reference state를 구현하고 `release-state-machine.pbt.test.ts`에서 empty/variable-length generated command sequences의 every-step equivalence와 invariants를 검증한다.
- [x] `resume-coordinator.mjs`에 prepare, explicit promote, clean second build, pending verification, finalize/rollback flow를 구현한다.
- [x] `cli.mjs`가 exactly five stable command flows만 neutral하게 route하고 opaque pending capability를 serialize하지 않게 한다.
- [ ] `resume-release.test.ts`에 symlink/non-regular/cross-device, stale review/source, interrupted transition, unexplained hash state와 exact rollback cases를 구현한다.
  - 부분 완료: 27 negative examples. symlink, non-regular, 허용목록 이탈/상위 탈출, lock 충돌, interrupted/unexplained journal state, 다이제스트 불일치, draft 를 release 로 위장, capability 위조·직렬화·재사용을 이름으로 실패시킨다.
  - 미완: cross-device, stale review/source, exact rollback cases. 셋 다 tracked pair 를 실제로 mutate 해야 관측된다. store 의 경로가 고정인 것이 안전성 자체이므로 unit test 에서 주입하면 검증 대상 속성을 스스로 약화시킨다. Step 23 라이브 구동에서 닫는다.
- [x] `resume:pdf:verify`가 any active lock/journal과 stale/mismatched public pair를 mutation 없이 거부하는지 확인한다.
- [x] (계획 4.4 선행 조건) `compile-profile-tools.mjs` 를 생성한다. 계획 트리에 있었으나 어떤 스텝도 만들지 않았고, S04 가 C11 순수 함수를 호출하려면 필요하다.
- [x] (범위 외 수정, 사용자 승인 옵션 a) `isValidApprovalIdentity` 의 식별자 규칙을 발급 모듈 기준으로 통일한다. Step 15~18 산출물의 결함이다.

### Step 23 — Prepare, human-review and promote the exact résumé PDF

**Stories/requirements**: ST-U03, ST-U05, ST-E02; hard exact-SHA human gate.

- [x] `npm run resume:pdf -- --prepare`로 first clean build, candidate, PDF.js evidence, full parity와 draft receipt를 생성한다.
- [x] Candidate ID/SHA, source fingerprint, manifest digest와 viewer path를 사용자에게 제시한다.
- [x] **PAUSE**: 사용자가 exact candidate pages의 reading order, tagged structure, clipping, grayscale hierarchy, page breaks, Korean font/readability와 links를 검토해 fixed review record를 작성·승인할 때까지 기다린다.
- [x] Review SHA/source/manifest/checklist가 current candidate와 exact match인지 재검증한다.
- [x] `npm run resume:pdf -- --promote <candidate-id>`로 receipt/PDF transaction을 시작한다.
- [x] Clean second build와 transaction-scoped final route/MIME/source/full-parity check가 pass하면 finalize한다.
- [ ] Failure이면 same lock 아래 previous pair/first-release absence를 exact rollback하고 original failure를 non-zero로 반환한다.
  - 미실행: 트랜잭션이 forward arm 을 끝까지 갔으므로 이 분기는 한 번도 진입하지 않았다. 4-state rollback 경로는 Step 22 의 pure journal model 과 `release-state-machine.pbt.test.ts` 로만 검증되어 있고 라이브 구동 증거가 없다.
  - Step 22 가 이 스텝으로 넘긴 cross-device 와 stale review/source 잔여도 같은 이유로 닫히지 않았다. 셋 다 rollback arm 진입이 전제이며 forward arm 이 성공하면 관측할 방법이 없다. 다음 릴리스에서 실패를 유도하거나, store 의 고정 경로 안전성을 약화시키지 않는 별도 주입 지점을 설계해야 닫힌다.
- [x] Independent `npm run resume:pdf:verify`가 current tracked PDF/receipt를 read-only로 재검증하는지 확인한다.
  - 확인 과정에서 `cli.mjs` 의 다섯 번째 배선 결함을 찾아 고쳤다. 출력 조건이 `result.result !== 'pass'` 였고, CLI 가 스스로 계산한 통과 판정을 갖는 명령은 이것뿐이라 판정 전체가 조용히 버려졌다. 무출력 + exit 0 은 동작하는 검증과 no-op 을 구분할 수 없어 이 체크박스를 정직하게 닫을 수 없었다.
  - 수정 뒤 판정이 출력된다. `releaseState: ABSENT`, candidate `e36d47c6…`, `pdfSha256` `834faa3b…`, `receiptSha256` `2f6b2496…`, `sourceIdentity` `6ea953a0…`, `manifestFingerprint` `aab8a08b…` 로 현재 tracked pair 가 current source 에 대해 재검증된다.
  - 다만 이 명령의 실제 동작은 digest 대조이며 §5.2 가 규정한 `clean build/preview → full reinspection` 이 아니다. PDF.js 재추출도 clean build 도 하지 않는다. Step 22 구현 범위의 편차이므로 Step 24~25 로 넘긴다.

### Step 24 — Generate documentation and deployment-artifact no-change evidence

**Stories/requirements**: FR-017/018; U1→U2/U3 handoff; AI-DLC Documentation and Deployment Artifacts.

- [x] `site/README.md`에 five commands, PBT replay, fact gate, manual accessibility, PDF prepare/review/promote/verify와 no-deploy warning을 기록한다.
  - 기존 파일은 손대지 않은 Astro starter-kit 템플릿이었다. 실제 운영 문서로 교체하면서 세 사람 게이트, PBT replay 문법, 후보 PDF 의 non-reproducibility, canonical digest 객체 함정을 기록했다.
- [x] `code/verification-and-document-summary.md`에 browser/manual/PDF evidence, receipt/currentness와 negative gates를 기록한다.
  - 통과 주장과 미실행 주장을 분리해 기록한다. §6 이 rollback arm 미진입, cross-device/stale review-source, 빈 note 11행, `resume:pdf:verify` 계약 편차, `FD-P-C11-01` 다섯 건을 미실행/잔여로 남긴다.
- [x] `code/deployment-artifacts-summary.md`에 Infrastructure implementation N/A/no-change를 기록한다.
- [x] Local output에서 `/resume/index.html`, `/portfolio/index.html`, `/resume.pdf`, hashed CSS/WOFF2 mapping, MIME/non-empty와 private evidence exclusion을 확인한다.
  - `/resume/index.html` 30,454B, `/portfolio/index.html` 34,277B, `/resume.pdf` 323,173B. `/_astro/` 아래 content-hashed CSS 4개와 WOFF2 92개가 전부 `url(/_astro/…)` 루트 상대 same-origin 이다. profile route 의 외부 CDN 참조 0, private evidence 유출 0. `dist/resume.pdf` 의 SHA-256 이 tracked `public/resume.pdf` 및 승격된 `pdfSha256` `834faa3b…` 와 일치한다.
- [x] `infra/`, Terraform, AWS, DNS, CloudFront/cache, Jenkins Deploy와 Vault가 unchanged인지 확인한다.
  - validated base `67f70a4` 대비 `infra/`, `Jenkinsfile`, `Justfile`, `preprocessor/`, `index.astro`, `data.ts`, `render.ts` 변경 0. `site/scripts/` 에 `aws s3`/`cloudfront`/`terraform` 참조 0. AWS/DNS/CloudFront mutation, Vault 쓰기, push/merge 없음.
- [x] Reduced direct build가 profile-validation output일 뿐 full-site deployment candidate가 아님을 명시한다.
  - README 의 "배포 경계" 와 deployment 요약 §4 양쪽에 기록했다. 전체 사이트 빌드는 preprocessor 가 만든 `content/` 를 요구하므로 축소 빌드의 `dist/` 를 S3 에 동기화하면 사이트 콘텐츠가 사라진다.

### Step 25 — Complete owner-local generation verification and summaries

**Stories/requirements**: all U1-owned stories; U1 provider slice for U2/U3.

- [x] `npm run test:unit`을 실행한다.
  - 15 files / 179 tests pass.
- [x] `npm run test:pbt` local default를 실행하고 printed seed를 기록한다.
  - 5 files / 32 properties × 100 runs. Printed seed `369705162`.
- [x] Same-seed/focused replay evidence를 실행한다.
  - `PBT_SEED=369705162` 전체 재실행이 5 files / 32 tests 로 동일하게 통과한다. Focused replay 는 `PBT_SEED=369705162 PBT_PATH=0 PBT_FILE=tests/pbt/u1/resume-document.pbt.test.ts PBT_FOCUS='U1-P12 canonical digests are deterministic, NFC-stable and field-sensitive'` 로 1 passed / 4 skipped.
  - **Step 24 문서 결함을 발견해 고쳤다.** README 가 focused replay 를 `npm run test:pbt -- <file> -t '<name>'` 로 적었으나 runner 는 `PBT_FILE`/`PBT_FOCUS` 환경변수만 읽고 CLI 인자 형태는 `PBT_CONFIG_INVALID` 로 거부한다. 문서대로 따라 하면 반드시 실패한다.
- [x] `npm run test:e2e`를 실행한다.
  - `result: pass`, buildId `ea921152229f6d987e29168ff397f570f57da70ab92a0075476a6a647ed82fb2`. Step 23 과 동일한 buildId 로 빌드 결정성이 유지된다.
  - 이 체크박스는 한 번 되돌아갔다. 같은 Step 25 안에서 §5.2 를 구현하며 `verification-provider.mjs` 와 `pdf-renderer.mjs` 를 수정했고 둘 다 `REVIEW_SUBJECT_SOURCE_FILES` 에 있어 review subject digest 가 `e8ca5dcc…` 에서 `0c4ed919…` 로 이동, `MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE` 로 fail-closed 했다. 계획 §7 이 규정한 동작 그대로다.
  - **사람이 재검토해 닫혔다.** 조준희 가 2026-07-27T22:56:55Z 에 digest `0c4ed919…` 기준으로 12개 상태를 다시 검토했고 48개 check 전부 `pass`, target-size 예외 0, skip 0 이다. 렌더링 표면은 실제로 바뀌지 않았지만 게이트는 tooling 변경도 subject 로 세므로 재검토를 요구했다.
- [x] `npm run resume:pdf:verify`를 실행한다.
  - `result: pass`, `releaseState: ABSENT`, `pdfSha256` `834faa3b…`, `buildId` `ea921152…`, `pageCount: 3`, `mappedFacts: 51`, `surfaceParity: pass`.
  - **§5.2 계약 편차는 해결되었다.** 사용자가 좁은 계약 재승인 대신 전체 흐름 구현을 선택했고, 이제 명령이 `no lock/journal → clean build/preview → full reinspection` 을 실제로 수행한다. tracked PDF 는 다시 렌더하지 않고 재추출해 새로 관측한 web/print surface 와 대조한다. 다시 렌더하면 소스를 자기 자신의 두 번째 렌더와 비교하게 되어 정작 발행된 파일이 검사되지 않는다.
- [x] Internal `test:pbt:framework` proof와 direct `npx astro build`를 재검증한다.
  - Framework proof 1 file / 2 tests pass. Direct build `Complete!`.
- [x] `git diff --check`, duplicate-file scan, source/generated/public/private scan과 no-edit set diff를 검사한다.
  - Whitespace clean. No-edit set 변경 0. Tracked `dist`/`.generated`/`.artifacts` 파일 0. Profile source 중복 basename 0.
- [x] All U1-P/refinement/NFR/AC/EDGE/negative obligations가 one canonical evidence에 연결되는지 검사한다.
  - 135 obligations → 22 canonical tests (pbt 5, unit 8, e2e 6, human-gate 3), deferredCoverage **0**, explicit N/A 9. `obligation-map.test.ts` 7 tests 가 missing mapping, unknown test ID, duplicate semantic execution 을 fail-closed 로 검증한다.
  - `FD-P-C11-01` 을 `PBT-U1-DOCUMENT` 에서 `UNIT-U1-PDF` 로 재지정해 마지막 deferral 을 닫았다. 그냥 지웠다면 어떤 테스트도 수행하지 않는 커버리지를 주장하게 된다.
- [x] `code/code-generation-summary.md`에 modified/created/removed files, tests, facts, PDF identity, deferred U2/U3 work와 no-deploy result를 기록한다.
  - 116 added / 9 modified / 0 removed, 테스트·의무·사실·PDF identity·배포 결과·U2/U3 이연을 기록한다. §8 이 U1 이 완료가 아닌 이유를 명시한다.
- [x] Workflow-owned `aidlc-docs/`를 feature worktree에 포함할 commit handoff를 준비하되 stage/push/merge는 별도 사용자 권한 전에는 수행하지 않는다.
  - `aidlc-docs/` 는 Step 22 에 feature branch 로 옮겨졌고 이후 모든 스텝이 함께 커밋되었다. 사용자가 각 커밋을 명시적으로 승인했다. push, merge, PR 은 수행하지 않았다.
- [x] 이 계획의 각 completed checkbox와 associated story status를 즉시 갱신한다.
  - 체크박스 4 는 되돌렸다. 한때 통과했으나 같은 스텝의 §5.2 구현이 review subject 를 이동시켜 현재 트리에서는 실패한다.
- [x] 표준 Code Generation completion message로 application/document paths를 제시하고 explicit artifact approval을 기다린다.
  - 다섯 stable 명령이 모두 required evidence 를 만든다. `test:unit` 15/179, `test:pbt` 5/32 at seed `197290827`, `test:e2e` `pass`, `resume:pdf:verify` `pass` (`pageCount 3`, `mappedFacts 51`, `surfaceParity pass`), `resume:pdf --prepare/--promote` 는 Step 23 에서 실릴리스로 구동되었다. `npx astro check` 0 errors / 6 inherited hints.
  - **완료 정의 1항은 아직 충족되지 않는다.** Step 22 의 negative-example 체크박스와 Step 23 체크박스 7 이 열려 있다. 둘 다 rollback arm 진입을 전제로 하며 forward arm 이 성공하면 관측할 방법이 없다. 완료 메시지는 이 잔여를 명시한 채 제시하고, 잔여를 기록된 deviation 으로 수용할지 아니면 rollback arm 을 실제로 구동할지는 사용자의 명시적 결정에 맡긴다.

## 7. Checkpoints and stop conditions

| Checkpoint | Must pass before | Stop condition |
|---|---|---|
| Plan approval | Step 1 | 전체 계획의 explicit user approval 없음 |
| Dependency compatibility | Step 3 | selected exact version/engine/peer/integrity conflict |
| Pure contract gates | Step 13 | C01/C03/C11 unit/PBT failure or incomplete obligation map |
| Fact approval | Step 15 | required Pending/Excluded, ambiguous approval or production diff mismatch |
| Static UI/manual web review | Step 21 | route/browser/resource/manual record missing/fail/stale |
| Exact PDF review | Promotion in Step 23 | review SHA/source/manifest/checklist mismatch |
| Release transaction | Finalize | second build/final verify failure; exact rollback required |
| U1 completion | completion message | any stable command, currentness, boundary, traceability or no-change check failure |

Fact/profile style/config/tool change after review invalidates the relevant manual accessibility/PDF evidence and returns to its checkpoint.

## 8. Story and step traceability

| Story scope | Primary steps |
|---|---|
| ST-U02 | 4~7, 15~20, 25 |
| ST-U03 | 8, 13, 20~25 |
| ST-U04 | 5~7, 15~20, 25 |
| ST-U05 | 5, 14~20, 23~25 |
| ST-E01 | 3~10, 15~18, 25 |
| ST-E02 | 5, 8, 10, 14~15, 20~25 |
| ST-U01 contributor | 7, 17~20, 25 |
| ST-E03 U1 slice | 2~3, 9, 18, 25 |
| ST-E04 provider only | 19, 22, 24~25 |

## 9. Completion definition

U1 Code Generation은 다음이 모두 참일 때만 generation complete다.

1. Step 1~25 checkbox가 모두 `[x]`이고 plan deviation이 없다.
   - **Accepted deviation 으로 충족.** 2026-07-27T14:15:49Z, 사용자 응답 "accept the rollback residual and approve". Step 22 의 negative-example 체크박스와 Step 23 체크박스 7 은 `[ ]` 로 남으며 앞으로도 `[x]` 로 바꾸지 않는다. 수용된 것은 잔여이지 수행된 작업이 아니다. 실제로 라이브 검증되지 않은 것은 4-state rollback 경로, cross-device 승격, stale review/source 거부 셋이며 pure journal model 과 `release-state-machine.pbt.test.ts` 커버리지는 유지된다.
2. Actual approved facts만 one production source에 있고 inventory-production diff가 zero다.
3. `/resume`와 `/portfolio`가 exact static/no-JS/metadata/accessibility/resource contracts를 만족한다.
4. Tracked `site/public/resume.pdf`와 non-public current receipt가 exact reviewed source/manifest에 current다.
5. Five stable commands와 internal framework proof가 required evidence를 만든다.
6. U1 obligation map에 missing/duplicate semantic obligation이 없다.
7. U2/U3 boundaries, no Vault/Jenkins/Infrastructure/deployment changes와 non-deploy claim이 보존된다.
8. Generated application code와 markdown summaries가 review-ready하며 explicit Code Generation artifact approval을 기다린다.

Tests are generated and owner-locally exercised here because U1 story closure depends on them. Later integrated Build and Test re-runs cross-unit gates; it does not replace missing U1 Code Generation evidence.
