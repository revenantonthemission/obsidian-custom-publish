# U1 Non-Applicable Layers Summary — Profile Domain and Native Experience

## 문서 상태

- **단계**: CONSTRUCTION — U1 Code Generation, Part 2 Generation, Step 12
- **상태**: API 및 Repository/Database Layer Generation/Testing N/A 판정 완료 — 2026-07-24T18:37:51Z
- **Unit**: U1 Profile Domain and Native Experience
- **Project Type**: Brownfield
- **Validated Base**: local `develop` at `67f70a4240819ed8b9408360f9b59512660f8e10`
- **Implementation Worktree**: `/private/tmp/obsidian-blog-u1-nfr`
- **Feature Branch**: `codex/feature/resume-profile-experience`
- **Architecture**: Astro static output, inherited S3/CloudFront delivery
- **Decision Scope**: U1이 새로 만드는 network/transport API, repository/data-access/database와 runtime state infrastructure
- **Next Scope**: Step 13 verified Pretendard materialization and Astro build integration
- **Deployment Authority**: 없음

## 1. Step 11 decision

| Activity | Decision | Rationale |
|---|---|---|
| API Layer Generation | N/A | U1 application output은 static이며 request-time application server나 transport endpoint를 추가하지 않는다. Build/document materialization, preview/browser/PDF child process와 filesystem release tooling은 local-only다. |
| API Layer Unit Testing | N/A | U1에는 method, request/body/query, response/status/header, auth/session, retry 또는 transport serialization contract가 없다. |
| Internal TypeScript module APIs | Applicable and tested | C01/C03/C11/S01 function contracts는 API layer가 아니라 in-process business logic이며 existing unit/PBT가 검증한다. |

이 N/A 판정은 저장소 전체에 HTTP surface나 browser network behavior가 없다는 뜻이 아니다. U1 변경분이 새 network/transport API를 도입하지 않았다는 범위로 한정한다.

## 2. Binding architecture rationale

승인된 요구·설계는 다음 경계를 고정한다.

- FR-013은 정적 HTML/CSS 우선, U1-owned client JavaScript 0개와 새 외부 runtime API/dependency 0개를 요구한다.
- U1 NFR Requirements는 `/resume`와 `/portfolio`를 public read-only static routes로 정의하며 authentication, authorization, session, form submission, secret storage, analytics와 contact tracking을 N/A로 둔다.
- C01 normalization/validation/projection, C03 metadata, C04 host serialization, C05 navigation, C11 manifest/source guard와 S01 assembly는 pure build-time 또는 static-render inputs다.
- S04의 future preview, browser와 PDF process는 local build/test child process이며 deployed application server가 아니다.
- LC-U1-20은 runtime API, mutable/per-user state 또는 static delivery architecture 변경이 생길 때만 이 N/A 결정을 재평가한다.
- FR-018과 project boundary는 deployment, AWS/Terraform mutation과 remote push를 별도 명시적 권한 밖에 둔다.

## 3. Source and dependency scan

### 3.1 U1 authored-source result

Scoped scan 대상은 다음 current application source 17개다.

- `site/src/lib/profile/*.ts`
- `site/src/lib/layout/json-ld.ts`
- `site/src/lib/layout/profile-resources.ts`
- `site/src/lib/navigation.ts`

Scan result:

- Runtime network call: 0
- Astro runtime API/action/request/cookie primitive: 0
- HTTP verb endpoint handler: 0
- Server/API/auth client import: 0
- Form, OAuth or session primitive: 0
- Non-relative application dependency import: 0

전체 U1 delta 44개에는 tests, runner와 configuration도 포함된다. 이 전체 범위를 추가로 검색한 결과 active runtime endpoint, server handler, auth/session, form/action, webhook 또는 external API client는 없다.

### 3.2 Runtime-surface and Astro result

- `site/astro.config.mjs`는 U1에서 수정되지 않았고 `output: 'static'`을 유지한다.
- Server, hybrid 또는 edge adapter가 추가되지 않았다.
- `site/src/pages/**`, existing layouts, components와 islands에는 U1 delta가 없다.
- `src/pages/api` 또는 equivalent endpoint directory가 생성되지 않았다.
- U1 library를 import하는 existing page, layout, component 또는 island는 아직 없다. Static profile route wiring은 approved Steps 16~18의 후속 범위다.

Future `resume.astro`, `portfolio.astro`와 static `/resume.pdf` asset은 그 자체로 API가 아니다. Static output을 유지하고 request-time handler가 없다면 이 N/A 판정을 바꾸지 않는다.

### 3.3 Direct dependency delta

| Dependency class | Added packages | API relevance |
|---|---|---|
| Static application asset | `pretendard@1.3.9` | Build-time/same-origin font materialization input; API client가 아니다. |
| Test and inspection tooling | `@playwright/test`, `@axe-core/playwright`, `vitest`, `fast-check`, `@fast-check/vitest`, `pdfjs-dist` | Dev/test dependencies; deployed runtime transport가 아니다. |
| Server/auth/API client | None | Astro server adapter, HTTP client, auth/session SDK 또는 API framework가 추가되지 않았다. |

Added scripts는 `test:unit`, `test:pbt`와 internal `test:pbt:framework`뿐이다. 모두 local test execution이며 request-time server를 시작하거나 remote API를 호출하지 않는다.

## 4. Existing repository behavior explicitly excluded from the N/A claim

다음 behavior는 저장소에 이미 존재하지만 U1이 생성·수정한 API layer가 아니다.

### 4.1 Static RSS generation

`site/src/pages/rss.xml.ts`는 `GET(context: APIContext)`를 export한다. 그러나 unchanged Astro static configuration에서 build time에 실행되어 `/rss.xml` 정적 파일을 만든다. U1은 이 파일, handler 또는 output contract를 수정하지 않았다.

### 4.2 Existing browser fetches

- `site/src/lib/solar.ts`는 기존 sunrise/sunset external API를 선택적으로 호출한다.
- `Search.tsx`는 `/search-index.json`을 읽는다.
- `NavTree.tsx`와 `MobileSidebar.tsx`는 `/nav-tree.json`을 읽는다.
- `site/src/scripts/link-preview.ts`는 `/previews.json`을 읽는다.

이들은 U1 이전부터 존재하고 U1 delta에 포함되지 않는다. Same-origin generated JSON fetch는 static artifact consumption이며, solar fetch는 inherited external browser behavior다. 따라서 “repository has no external API” 또는 “browser performs no network requests”라고 주장하지 않는다.

### 4.3 Static delivery and resource descriptors

- S3/CloudFront object GET, clean-route rewrite와 generated JSON/assets는 inherited static delivery contract다.
- `profile-resources.ts`의 jsDelivr URL은 existing BaseLayout legacy policy를 typed descriptor로 표현할 뿐 network I/O를 실행하지 않는다.
- Exact profile route policy는 external resource list가 비어 있지만 아직 BaseLayout에 연결되지 않았다.

## 5. Why U1 business objects and tools are not an API layer

- `ResumeDocumentRequest`는 source identity, fixed paths와 expected manifest를 담는 pure C11 value object다. HTTP method, URL request, body, headers, file handle 또는 PDF bytes가 없다.
- `canonical-digest.ts`의 Web Crypto SHA-256은 in-process digest computation이며 network client가 아니다.
- `resume-evidence.ts`와 `resume-receipts.ts`는 observations/receipts의 pure shape와 validators다. Remote renderer, upload 또는 status endpoint를 호출하지 않는다.
- `pbt-runner.mjs`는 local Vitest worker를 spawn하는 test tool이다.
- `playwright.config.ts`와 future preview supervisor는 controlled loopback verification 전용이며 production server가 아니다.
- Public email, GitHub와 evidence URL은 approved data values다. URL을 보유·검증하는 것과 remote API를 호출하는 것은 다르다.

## 6. API unit-testing N/A rationale

API unit test는 존재하는 transport contract를 검증해야 한다. 현재 U1에는 다음 대상이 없다.

- HTTP method/path/version
- Request body, query, header 또는 content type
- Response schema, status 또는 error mapping
- Authentication, authorization, cookie 또는 session behavior
- Client timeout, retry, rate-limit 또는 remote error behavior
- Endpoint middleware, controller 또는 transport serializer

따라서 mock HTTP handler나 empty request/response test를 만드는 것은 승인되지 않은 interface를 발명하고 pure domain tests를 중복한다. API test 부재는 전체 test waiver가 아니다.

- C01/C03/C11/S01은 `test:unit`과 `test:pbt`가 검증한다.
- Static route HTML, metadata, links와 server-rendered semantics는 Steps 18~20의 production-output/browser checks가 검증한다.
- PDF source/parity와 release behavior는 Steps 21~23의 document/example gates가 검증한다.
- 이 후속 tests는 static/document evidence이며 API unit tests로 재분류하지 않는다.

## 7. Future reevaluation triggers

다음 중 하나가 U1 scope에 들어오면 API generation/testing N/A를 폐기하고 Requirements → Design → Code Generation traceability를 다시 수행해야 한다.

| Trigger | Required reassessment |
|---|---|
| Astro `src/pages/api`, HTTP verb handler, server action, middleware 또는 request/cookie API 추가 | Endpoint ownership, request/response schema, status/error behavior와 contract tests |
| `output: 'server'`/hybrid, server adapter, Lambda, edge 또는 serverless handler 도입 | Runtime boundary, deployment architecture, security/NFR와 integration tests |
| Profile-owned browser `fetch`/XHR/WebSocket, external CMS/profile API 또는 new HTTP-consumed JSON/feed contract | Client contract, offline/failure behavior, privacy/network policy와 client tests |
| Contact/user-submission form, webhook 또는 query/body semantics 도입 | Input validation, abuse/privacy boundary, response/error contract와 browser/API tests |
| Authentication, cookie, session, per-user state 또는 personalization 도입 | Identity/session/security design and negative authorization tests |
| Runtime PDF generation/status/download-token service 또는 remote renderer 도입 | Service protocol, source authorization, timeout/retry and parity failure tests |
| Mutable profile CRUD, queue/cache/database-backed request handling | API and repository boundaries, consistency model and stateful/integration tests |
| New request/response/header/versioning or remote-client retry contract | Explicit API schema and unit/contract test generation |

Static anchors, static `.astro` pages, JSON-LD script data, local loopback preview와 build-time file access만으로는 reevaluation trigger가 아니다.

## 8. PBT and project-extension disposition

- API layer가 존재하지 않으므로 API-specific round-trip, invariant, stateful generator와 API example tests는 N/A다.
- 이 판정은 current C01/C03/C11/S01 PBT-02~08/PBT-10 의무를 면제하거나 변경하지 않는다.
- PBT-06 release-journal state model은 approved Step 22 owner에 그대로 남아 있다.
- No new application or generated-output file was written for Step 11; this markdown is the only generated artifact.
- `content/`, `site/dist/`, `.astro/`와 generated `site/public` indexes는 수정하지 않았다.
- No external Vault, infrastructure, AWS/Terraform, deployment, push 또는 merge action occurred.

## 9. Step 12 decision

| Activity | Decision | Rationale |
|---|---|---|
| Repository/data-access layer generation | N/A | U1은 CRUD, query, aggregate persistence, external source adapter 또는 runtime state store를 추가하지 않는다. Profile aggregate는 Git-tracked authored source의 domain 이름이지 Repository pattern의 persisted aggregate가 아니다. |
| Repository unit testing | N/A | 저장·조회·갱신·삭제, transaction, query mapping, optimistic concurrency 또는 repository error contract가 존재하지 않는다. |
| Database entity and migration generation | N/A | Database engine, ORM, schema, table/document entity, connection configuration와 data migration이 없다. |
| Runtime persistence/state infrastructure | N/A | U1 delta에는 request-time write, per-user state, queue/worker, runtime cache, telemetry/analytics sink 또는 health-check endpoint가 없다. |
| Local build/document filesystem adapters | Applicable in later steps | Step 13 font materialization과 Steps 21~23 PDF/release tooling은 private/generated 또는 explicitly tracked artifact를 다룬다. 이는 runtime repository/database가 아니지만 filesystem safety와 recovery 검증을 면제받지 않는다. |

이 판정은 “저장소 전체에 storage가 없다”거나 “향후 U1이 파일을 쓰지 않는다”는 뜻이 아니다. U1의 deployed static application에 repository/database/runtime state layer가 없다는 범위로 한정한다.

## 10. Repository, state and dependency scan

### 10.1 Current U1 delta

Exact scan은 current U1 application source 17개와 tests, runner, configuration을 포함한 전체 delta 44개를 대상으로 했다.

- 17개 application source의 external package import: 0
- 17개 application source의 Node/filesystem import: 0
- Repository/DAO/ORM/database/schema/SQL/query/migration implementation: 0
- Runtime storage, queue/worker, cache, telemetry/analytics 또는 health-check implementation: 0
- U1이 수정한 page/layout/component/island, Astro output configuration, infrastructure, preprocessor 또는 Jenkins runtime path: 0
- Direct persistence dependency: 0

Direct dependency delta는 `pretendard@1.3.9` static materialization input과 Playwright/Axe/Vitest/fast-check/PDF.js local test/inspection tooling뿐이다. Lockfile의 Vitest optional peer metadata에 `@opentelemetry/api` 이름이 나타나지만 direct dependency로 설치되지 않았고 import나 configuration도 없다.

### 10.2 Local tooling is not runtime persistence

`site/scripts/profile/pbt-runner.mjs`는 source/config를 read-only로 검사하고 child test process를 실행한다. `writeSync` 사용은 stdout diagnostics 출력이며 persisted application state write가 아니다. Playwright와 TypeScript tooling이 만드는 `.artifacts/`, `.astro/`와 `dist/` output은 gitignored local evidence/build output이다.

현재 delta에는 `site/public/resume.pdf`, tracked verification receipt, PDF candidate, release journal 또는 current-release pointer가 없다. 이들은 승인된 future step owner가 생성하기 전까지 완료된 artifact로 주장하지 않는다.

### 10.3 Evidence recovery provenance

Step 12 시작 시 private implementation worktree가 filesystem에서 사라지고 Git metadata에 prunable entry만 남아 있었다. Branch tip에는 아직 implementation commit이 없었으므로 session의 성공 기록에서 original 175 `apply_patch` operations와 exact three dependency-install commands를 같은 path/branch에 순서대로 재실행했다.

복구 뒤 current delta는 original boundary와 같은 tracked modification 3개와 untracked authored file 41개이며, TypeScript two checks, 55 unit tests, 26 properties at seed `1729`, two framework tests와 four-route Astro static build를 다시 통과했다. 복구 과정에서 application behavior를 추가하거나 user data를 삭제하지 않았고 stage, commit, push 또는 merge도 수행하지 않았다.

## 11. Authored, tracked-derived and private-generated artifact boundary

| Artifact class | Paths/examples | Ownership and lifecycle |
|---|---|---|
| Tracked authored application source | `site/src/lib/profile/**`, `site/src/lib/layout/json-ld.ts`, `site/src/lib/layout/profile-resources.ts`, `site/src/lib/navigation.ts`; future approved `site/src/lib/profile/profile-data.ts` | Human-reviewed TypeScript source and contract implementation. Future `profile-data.ts` is the sole production fact source only after the hard fact-approval gate. |
| Tracked authored tests/tooling/configuration | `site/tests/**`, `site/scripts/profile/**`, `site/playwright.config.ts`, Vitest/TypeScript config and package metadata | Repository-owned verification or local tool source. It may read/write local artifacts when its approved step requires that behavior, but it is not deployed runtime state. |
| Tracked non-public review documentation | Future AI-DLC fact inventory, production diff and human approval receipt | Inventory, diff and initial receipt are prepared before the Step 14 approval pause. The human receipt becomes complete only after the exact approval response and current digests match; none is an alternate runtime fact store. |
| Tracked non-public machine receipts | Future `site/verification/profile/fact-approval.json`, `site/verification/profile/manual-web-accessibility.json`, `site/verification/resume/current-release.json` | Digest, review and decision identity evidence generated only after each named human and technical gate passes. These are derived records, not alternate public fact stores. |
| Tracked public derived asset | Future `site/public/resume.pdf` | Generated only from the approved canonical source, promoted only after exact candidate review and transaction verification. It is never an independently authored résumé or canonical data source. |
| Gitignored private generated input/output | `site/.generated/profile-font/`, `site/.artifacts/profile/tools/`, `site/.artifacts/profile/resume/`, `site/.artifacts/profile/verification/` | Reproducible font input, compiled tools, candidates, journals, reports and review surfaces. They are local implementation evidence and cannot establish released state by themselves. |
| Gitignored transient build output | `site/.astro/`, `site/dist/` | Framework/build cache and static output. Direct reduced builds are verification evidence, not a deployment candidate or durable application store. |

“Repository-owned aggregate”와 “repository path”라는 domain 문구는 Git/source ownership 또는 fixed file location을 뜻한다. Repository/data-access abstraction, database collection 또는 queryable runtime store를 뜻하지 않는다.

## 12. Why receipts and document paths do not create a repository layer

- `resume-receipts.ts`는 draft/review/release snapshot shape와 pure validators를 정의하는 authored TypeScript contract다. Future JSON receipt는 그 contract의 derived instance이며 이 module 자체는 load/save I/O를 수행하지 않는다.
- `RESUME_DOCUMENT_REPOSITORY_PATH`는 approved public asset location `site/public/resume.pdf`를 고정하는 문자열 descriptor다. `ResumeDocumentRequest`에는 PDF bytes, file handle, connection 또는 generated path가 없다.
- Step 22의 future local release transaction은 candidate, receipt와 public PDF를 filesystem에서 prepare/promote/rollback한다. 이는 applicable document-release adapter이며 request-time repository, database 또는 durable service가 아니다.
- Receipt가 tracked된다는 사실은 canonical profile facts의 source를 바꾸지 않는다. Actual fact values는 approved `profile-data.ts`에서만 materialize되고 receipt는 digest/decision identity를 증명한다.

## 13. Existing repository behavior explicitly excluded from the Step 12 claim

다음 baseline은 실제로 존재하므로 숨기지 않되 U1 repository/database generation 증거로 세지 않는다.

- `site/src/lib/data.ts`의 build-time read-only filesystem load와 module-local caches
- `site/src/lib/solar.ts`의 inherited browser `localStorage`와 optional fetch
- Search/navigation islands의 in-memory 또는 generated JSON consumption
- Existing S3/CloudFront object storage, deploy sync와 invalidation behavior
- Lockfile transitive/optional package metadata에 나타나는 telemetry/cache/queue/database-related 이름
- Rust helper 이름 `migrate_d2_styles`; 이는 text/style migration이며 database migration이 아니다

U1이 이 baseline을 새로 소유하거나 수정하지 않았다는 것이 N/A 근거다. Repository 전체가 persistence-free라고 일반화하지 않는다.

## 14. Repository tests and PBT disposition

- Absent repository CRUD/query/transaction/mapping contract를 위한 mock repository test는 N/A다.
- Absent database schema/entity/migration에 대한 migration test도 N/A다.
- Current C01/C03/C11/S01 example tests와 PBT-02~05/PBT-07~10은 pure domain/document contract를 계속 검증하며 이 판정으로 면제되지 않는다.
- PBT-06은 N/A가 아니다. Step 22가 pure model-based release-journal state sequence를 구현하고 검증해야 한다.
- Actual filesystem `fsync`, symlink/non-regular file, cross-device behavior, crash/recovery와 rollback은 model property만으로 대체하지 않고 approved example/integration gates에 남는다.

## 15. Step 12 reevaluation triggers

| Trigger | Required reassessment |
|---|---|
| SSR/API handler, middleware 또는 browser request가 durable state를 생성·수정 | Runtime repository ownership, consistency, failure/security model와 integration tests |
| Repository/DAO abstraction, CRUD/query semantics 또는 external mutable CMS/profile source 도입 | Data-access contracts, source of truth, error mapping and repository tests |
| ORM/database driver, entity/schema/table/index 또는 migration 도입 | Database topology, migration/rollback, data integrity and environment configuration |
| Per-user/session state, queue/worker, shared runtime cache 또는 background job 도입 | State lifecycle, concurrency, privacy, delivery/retry and observability design |
| Runtime telemetry/analytics sink 또는 health/readiness endpoint 도입 | Data policy, transport contract, failure mode and operational verification |
| PDF/receipt가 profile facts의 independent canonical source가 되거나 runtime service가 release를 관리 | Canonical-source redesign, persistence/API boundary and parity/migration gates |
| Local materializer/release filesystem contract가 approved design을 벗어나 durable multi-user store로 확장 | Repository semantics, locking/consistency and stateful integration tests |

Approved build-time artifact materialization, local loopback verification 또는 tracked derived output만으로는 repository/database trigger가 아니다. 다만 해당 filesystem adapter의 안전성 검증은 그대로 applicable하다.

## 16. Step 13 handoff

Step 13은 pinned Pretendard package에서 verified same-origin font input을 `site/.generated/profile-font/`에 materialize하고 Astro build graph에 연결한다. 이 작업은 private build-time filesystem adapter이므로 Step 12 N/A 판정에 포함되지 않는다. Fixed-root containment, regular-file/no-symlink/hash/license checks, exclusive staging, atomic publish, idempotence와 clean direct build gate를 계획대로 구현해야 한다.
