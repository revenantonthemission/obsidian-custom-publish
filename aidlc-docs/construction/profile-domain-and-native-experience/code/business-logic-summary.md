# U1 Business Logic Summary — Profile Domain and Native Experience

## 문서 상태

- **단계**: CONSTRUCTION — U1 Code Generation, Part 2 Generation, Step 10
- **상태**: 완료 — 2026-07-24T17:52:07Z
- **Unit**: U1 Profile Domain and Native Experience
- **Bounded Context**: Profile Experience
- **Project Type**: Brownfield
- **Implementation Worktree**: `/private/tmp/obsidian-blog-u1-nfr`
- **Feature Branch**: `codex/feature/resume-profile-experience`
- **요약 범위**: Code Generation Steps 4~9와 Step 10 traceability correction
- **PBT Enforcement**: Full
- **Deployment Authority**: 없음

## 1. 결과와 완료 경계

현재 구현은 하나의 typed profile candidate를 정규화·검증하고, 별도의 exact fact-approval gate를 통과한 동일 source에서 résumé, portfolio, homepage, metadata와 résumé document용 pure contract를 만드는 build-time business-logic slice다.

완료된 범위는 다음과 같다.

- C01 typed aggregate, normalization, aggregate validation, fact approval과 세 read-model selector
- C03 route-exact metadata와 conservative typed JSON-LD builder/consistency validator
- C04의 pure JSON-LD safe serialization과 profile/legacy resource policy
- C05의 fixed navigation model과 segment-aware current-state resolver
- C11의 complete ordered résumé manifest, canonical digests, fixed document request/link, structured evidence mapping과 receipt validation/assembly contract
- S01의 test-only validated seam과 production-only fact-approved assembly boundary
- Example unit tests, owner-local PBT, replay-safe runner와 fail-closed obligation map

다음은 아직 완료되지 않았다.

- 실제 `profile-data.ts`, trusted `production-profile.ts`, fact inventory, production diff와 human approval receipt
- C02 renderer-neutral presentation tree, `/resume`·`/portfolio` routes, BaseLayout/Header integration과 CSS
- 실제 browser/PDF renderer·inspector, candidate, `site/public/resume.pdf`와 release transaction
- External Vault edit, deployment, Git push 또는 merge

따라서 이 문서는 pure business contracts의 구현 완료만 기록한다. Native pages, 실제 공개 사실, reviewed PDF 또는 U1 전체 완료를 주장하지 않는다.

## 2. 생성·수정 파일

### 2.1 생성된 production/business source

| Owner | Files | 책임 |
|---|---|---|
| C01 Profile Domain | `site/src/lib/profile/types.ts`, `issues.ts`, `normalization.ts`, `validation.ts`, `fact-approval.ts`, `selectors.ts` | Typed aggregate, diagnostics, normalization, validation, approval와 projections |
| S01 Profile Assembly | `site/src/lib/profile/assembly.ts`, `index.ts` | Test seam, production assembly와 approved public barrel |
| C03 Profile Metadata | `site/src/lib/profile/metadata.ts` | Route metadata, typed JSON-LD와 consistency gate |
| C04/C05 shared seams | `site/src/lib/layout/json-ld.ts`, `profile-resources.ts`, `site/src/lib/navigation.ts` | Safe host serialization, resource policy와 navigation state |
| C11 Resume Document Boundary | `site/src/lib/profile/canonical-digest.ts`, `resume-manifest.ts`, `document-boundary.ts`, `resume-evidence.ts`, `resume-receipts.ts` | Source identity, manifest, document request, evidence mapping과 receipts |

이 파일들은 모두 implementation worktree의 authored source다. `site/dist/`, `.astro/`와 `.artifacts/` 아래 build output은 business source가 아니다.

### 2.2 생성된 test와 traceability source

- Synthetic-only fixture: `site/tests/fixtures/profile-fixtures.ts`
- Obligation map: `site/tests/obligations/u1-profile.json`
- Unit suites: `profile-domain.test.ts`, `profile-projections.test.ts`, `profile-metadata-navigation.test.ts`, `resume-document.test.ts`, `profile-tooling.test.ts`, `obligation-map.test.ts`
- PBT framework proof: `site/tests/pbt/framework-selection.pbt.test.ts`
- PBT support: `site/tests/pbt/u1/setup.ts`, `mutations.ts`, `arbitraries/profile.ts`, `approval.ts`, `metadata.ts`, `manifest.ts`
- Canonical PBT suites: `profile-domain.pbt.test.ts`, `profile-presentation.pbt.test.ts`, `profile-metadata-navigation.pbt.test.ts`, `resume-document.pbt.test.ts`
- Runner: `site/scripts/profile/pbt-runner.mjs`

Fixtures, arbitraries, mutation cases, obligation records와 generated approval examples는 test source다. Production module은 이를 import하지 않으며 이 값들은 공개 가능한 실제 경력·성과·연락처 또는 사람의 승인을 뜻하지 않는다.

### 2.3 Tooling/configuration delta

- **Modified**: `site/package.json`, `site/package-lock.json`, `site/.gitignore`
- **Created for current pure checks**: `site/vitest.config.ts`, `site/vitest.pbt.config.ts`, `site/tsconfig.profile-tools.json`
- **Created but not current business-logic evidence**: `site/playwright.config.ts`

`playwright.config.ts`, Playwright/Axe, Pretendard와 PDF.js dependencies는 승인된 후속 browser/font/PDF steps를 위한 선행 toolchain이다. 존재 자체가 route, accessibility 또는 PDF 검증 완료를 뜻하지 않는다.

## 3. 구현된 business contracts

### 3.1 C01 — Profile Domain

C01은 `ProfileData → NormalizedProfile → ValidatedProfile → FactApprovedProfile` 경계를 소유한다.

1. 모든 text leaf에 trim → CRLF/CR을 LF로 변환 → NFC 순서를 적용한다.
2. 내부 whitespace, 문단, punctuation과 전체 Unicode content를 보존하며 truncate하거나 식별자·URL의 의미를 rewrite하지 않는다.
3. Required shape, cardinality, ID/order, period, URL, content block, project six dimensions와 relation을 aggregate 전체에서 검사한다.
4. Optional absent는 valid omission이고 optional provided-invalid는 diagnostic이다.
5. 모든 발견 가능한 issue를 모은 뒤 하나라도 있으면 partial validated value를 반환하지 않는다.
6. 성공한 정확한 immutable object만 private runtime capability로 등록한다.
7. Résumé, portfolio와 homepage selector는 explicit numeric `order`를 사용하고 source fact identity/cardinality를 보존한다.
8. Absent optional section·field는 property 자체를 생략하며 placeholder, inferred claim 또는 synthetic link를 만들지 않는다.

Résumé와 portfolio는 각자 소유한 fact 변경에 대해 unrelated projection을 바꾸지 않는다. Shared fact만 그 fact를 allowlist에 둔 모든 consumer에 반영된다.

### 3.2 C03 — Profile Metadata Builder

C03은 approved projection에서만 metadata를 만든다.

- Title은 `{approvedName} — Résumé` 또는 `{approvedName} — Portfolio` exact template이다.
- Description은 해당 route에서 보이는 approved summary와 같다.
- Canonical, Open Graph와 Twitter URL/title/description은 같은 exact route identity를 사용한다.
- Résumé JSON-LD는 conservative `ProfilePage`와 minimal `Person`만 만든다.
- Portfolio JSON-LD는 `CollectionPage`, ordered `ItemList`와 allowlisted project claim만 만든다.
- `sameAs`는 approved GitHub 범위를 넘지 않으며 project evidence를 사람 identity로 추론하지 않는다.
- Candidate validator는 invalid metadata를 repair, drop 또는 partially accept하지 않는다. Exact immutable reconstruction 또는 ordered diagnostics 중 하나만 반환한다.

Production builders와 consistency validator는 exact `FactApprovedProfile` capability를 다시 검사한다. Projection-only `*ForTest` seam은 owner-local tests용 internal leaf API이며 approved public barrel에는 없다.

### 3.3 C11 — Resume Document Boundary

C11은 browser/filesystem side effect가 아닌 pure document contract를 소유한다.

- Present section vector는 intro/contact, skills, highlights, project summaries, optional education, optional certifications 순서다.
- Manifest는 source identity, section key/order, entity kind/ID/order/parent와 모든 atomic résumé fact를 기록한다.
- 각 fact entry는 entry order, section, applicable entity, `factId`, canonical path, value kind와 normalized value를 가진다.
- Source와 manifest는 schema-versioned, length-prefixed, NFC-aware SHA-256 encoding을 사용한다.
- Digest domain은 `obsidian-press:profile-source`와 `obsidian-press:resume-fact-manifest`로 분리한다.
- Source route는 `/resume`, public link는 `/resume.pdf`, tracked target descriptor는 `site/public/resume.pdf`로 고정한다.
- Manifest parity는 ordered structural equality다. Set equality, subset, flat-text identity inference와 PDF byte equality는 oracle이 아니다.
- Structured web/print observations, PDF occurrence·annotation·tag tree·outline mapping과 draft/manual/release receipt shape는 current source/manifest/candidate identity에 묶인다.

현재 pure mapper와 receipt validator/assembler는 존재하지만 실제 PDF extraction, rendered four-surface evidence와 negative document pipeline은 Step 21이 소유한다. Release store, journal과 rollback은 Step 22가 소유한다.

### 3.4 S01 — Profile Assembly

`assembleValidatedProfile`은 human approval 없이 projection behavior를 검사하는 test-only seam이다.

Production `assembleFactApprovedProfile`은 성공한 exact `validateFactApproval` result만 받는다. 같은 source로 résumé, portfolio와 homepage를 조립하며, metadata는 assembly object에 복제하지 않고 같은 approved source를 C03 builder에 별도로 전달한다.

P-S01-01/U1-P11은 다음을 property로 검증한다.

- Synthetic all-Approved correspondence가 성공하면 production assembly와 résumé/portfolio metadata가 같은 exact approved source에서 생성된다.
- Metadata description은 assembly의 visible route summary와 같다.
- Structural clone, invalid approval 또는 invalid profile로 만든 unregistered candidate는 production assembly에서 거부되고 두 approved metadata builder에서도 value 없이 실패한다.

이 검증은 approval 구조와 boundary만 증명한다. Synthetic record가 실제 claim의 진실성이나 공개 허가를 증명하지 않는다.

## 4. Diagnostic contract

모든 validator는 `ValidationResult<T>`를 반환한다.

- Success: immutable `value`
- Failure: non-empty ordered `issues`, `value` 없음

Issue path는 `profile` root와 candidate source index를 사용한다. Message는 고정 template이며 승인되지 않은 실제 값을 복제하지 않는다. Issue는 validation phase → root field → numeric source index → code → message → path 순으로 정렬하고 같은 `code+path`를 exact dedupe한다.

Canonical vocabulary는 정확히 40개다.

| Category | Codes |
|---|---|
| Shape, text, cardinality | `field.required`, `field.type`, `text.empty`, `collection.minimum`, `collection.range` |
| Identity and order | `fact.identifier.format`, `fact.identifier.duplicate`, `identifier.format`, `identifier.duplicate`, `order.positive-integer`, `order.duplicate` |
| Value, relation, contact and content | `period.precision`, `period.value`, `period.range`, `reference.kind`, `reference.missing`, `contact.email.invalid`, `contact.github.invalid`, `evidence.url.invalid`, `content.block.kind`, `content.block.empty` |
| Fact approval | `approval.record.missing`, `approval.status`, `approval.value-mismatch`, `approval.production-extra` |
| Metadata, host and navigation | `metadata.title.mismatch`, `metadata.route.invalid`, `metadata.description.mismatch`, `metadata.claim.unsupported`, `metadata.structured-data.invalid`, `jsonld.serialization`, `navigation.model.invalid`, `navigation.current.invalid` |
| Document | `document.link.invalid`, `document.source.invalid`, `document.generation.failed`, `document.missing`, `document.unreadable`, `document.stale`, `document.parity` |

No-throw public guards snapshot owned data and fail closed for malformed values, proxies/getters, stale identities, unexpected keys와 structurally imitated capabilities.

## 5. Fact-approval gate

Production fact publication은 다음 순서로만 가능하다.

1. `validateProfile`이 normalized aggregate 전체를 검사하고 성공한 exact frozen object를 private `WeakSet` capability로 등록한다.
2. `validateFactApproval`이 그 exact capability, inventory/production-diff/receipt identity와 digest, global fact correspondence, target surfaces, status와 normalized value를 검사한다.
3. 모든 materialized fact가 정확히 하나의 matching `Approved` record를 가져야 한다. Required `Pending`/`Excluded`, missing record, value mismatch와 production extra는 terminal failure다.
4. 성공한 exact `{profile, approval}` object만 두 번째 private capability로 등록한다. Clone, proxy, deserialized value와 structural imitation은 capability가 아니다.
5. Production assembly, metadata, manifest와 document-request path가 이 capability를 다시 검사한다.
6. `site/src/lib/profile/index.ts`는 approved assembly/metadata/manifest/document entry points만 노출한다. Raw validation, approval construction, selectors, capability checks, `*ForTest` seams와 evidence/receipt internals은 public barrel에 없다.

TypeScript의 `@internal`은 leaf-module import를 언어 차원에서 금지하지 않는다. 따라서 Step 15의 trusted `production-profile.ts`와 future production consumers는 approved barrel/boundary만 사용해야 하며 tests만 internal leaf seam을 직접 사용한다.

사람만 fact의 진실성, evidence sufficiency와 공개 가능성을 승인할 수 있다. 현재 구현은 receipt를 생성하거나 human truth를 추론하지 않는다. Exact inventory와 production diff를 작성·승인하는 hard gate는 Steps 14~15에 남아 있다.

## 6. Property aliases와 canonical evidence

Canonical suite는 assertion의 중복 소유권을 정한다. Mapping 자체는 후속 refinement 완료를 뜻하지 않으며 `deferredCoverage`가 아직 열린 범위를 명시한다.

| Canonical evidence | Current umbrella/refinement ownership |
|---|---|
| `PBT-U1-DOMAIN` | `U1-P01~06`, `U1-P11`; `P-C01-01~06`, `P-S01-01`; `DE-P01~12`의 적용 crosswalk |
| `PBT-U1-METADATA-NAVIGATION` | `U1-P08`와 현재 pure C04/C05 slice; `P-C03-01~04`, `DE-P13`, safe JSON-LD round-trip와 fixed navigation state |
| `PBT-U1-PRESENTATION` | 현재 C01 projection/render-ready data invariant; C02 tree refinements는 Step 18까지 open |
| `PBT-U1-DOCUMENT` | 현재 `U1-P12` manifest/request slice; `P-C11-01~03`, `DE-P14~15`, `FD-P-C11-02` |
| `PBT-U1-RELEASE` | Step 22의 future release-journal state-machine owner |

Step 10 review에서 `DE-P13`은 metadata-navigation suite로, `DE-P15`는 document suite로 canonical mapping을 바로잡았다.

### Deferred property coverage

| Remaining step | Open aliases | 완료 조건 |
|---|---|---|
| Step 18 | `U1-P07`, `P-C02-01~03`, `FD-P-C02-01~03` | Renderer-neutral C02 tree와 static presentation verification |
| Step 18 | `U1-P09`, `P-C04-02`, `FD-P-C04-02` | Unique BaseLayout JSON-LD host integration |
| Step 18 | `U1-P10`, `P-C05-02`, `FD-P-C05-01~02` | Header desktop/mobile SSR parity와 knowledge-surface isolation |
| Step 21 | `FD-P-C11-01` | Actual web/print/PDF evidence mapping against the expected manifest |
| Step 22 | `NFR-P-RELEASE-01` | Pure release transition model, command sequences와 per-step invariants |

## 7. PBT compliance at Step 10

| Rule | Status | Evidence or boundary |
|---|---|---|
| PBT-01 | Compliant | Approved U1-P/P-C/DE-P/FD-P catalogs and canonical obligation map |
| PBT-02 | Compliant for current slice | C04 JSON-LD round-trip; C01 has no inverse and PDF binary round-trip is explicitly N/A |
| PBT-03 | Compliant for current slice | Ordering, omission, provenance, metadata, navigation, manifest and S01 invariants; surface refinements remain explicitly deferred |
| PBT-04 | Compliant | Unicode/line-ending/profile normalization idempotence |
| PBT-05 | Compliant for current slice | Independent diagnostic, ordering, metadata and exact manifest oracles |
| PBT-06 | Open at owning step | Current domain logic is pure; approved mutable release-journal model remains Step 22 |
| PBT-07 | Compliant | Reusable complete-profile, approval, metadata and manifest arbitraries plus labelled shrink-friendly mutations |
| PBT-08 | Compliant | Automatic shrinking, printed signed seed, same-seed and focused seed/path replay with no retry |
| PBT-09 | Compliant | Vitest 4.1.10, fast-check 4.9.0 and `@fast-check/vitest` 0.4.1 |
| PBT-10 | Compliant | Six explicit unit suites complement four canonical PBT suites; runner defect has a permanent example regression |

There is no blocking PBT finding for the implemented Step 10 slice. Deferred properties retain named owners and required future steps rather than being reported complete.

## 8. Verification evidence

- `npx tsc --noEmit --pretty false`: passed.
- `npx tsc -p tsconfig.profile-tools.json --pretty false`: passed.
- `npm run test:unit`: six files, 55 tests passed; the obligation-map suite contains seven tests.
- `npm run test:pbt`: four canonical files, 26 properties at 100 runs after the S01 correction.
- Focused S01 valid and invalid production-boundary properties: each 100 runs with seed `1729`, passed.
- `npm run test:pbt:framework`: two tests passed.
- Default seed logging, two same-seed full replays, focused seed/path replay and one-use shrinking/path reproduction were demonstrated in Step 9.
- `npx astro build`: passed after the Step 10 traceability correction; four baseline static routes built.
- Independent reviews found and drove the traceability/S01 corrections; focused re-review and final summary review found no material issue.

Step 10 changes no actual application behavior beyond correcting test/traceability coverage. The business summary itself is documentation under `aidlc-docs/`.

## 9. Artifact and production boundaries

- `site/tests/fixtures/profile-fixtures.ts` and every PBT arbitrary are synthetic test data only.
- `site/tests/obligations/u1-profile.json` includes future canonical evidence paths; it is a traceability plan, not proof that every future file or obligation already exists.
- `resume-evidence.ts` and `resume-receipts.ts` define pure structures and validators; they do not render, inspect, promote or persist a PDF.
- No actual fact inventory, production profile, machine approval receipt, route, Header/BaseLayout integration, public PDF or release receipt exists yet.
- No generated `content/`, `site/dist/`, `.astro/`, `.generated/` or `.artifacts/` output is a canonical source.
- No API, repository/data-access layer, database, runtime server, external Vault edit, AWS change, deployment, push or merge occurred.

Step 11 must now verify the API layer and its tests are N/A for this static architecture and record the reevaluation trigger without weakening these boundaries.
