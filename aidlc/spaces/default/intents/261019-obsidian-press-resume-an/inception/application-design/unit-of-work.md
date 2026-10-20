# Unit of Work Definitions — 이력서·포트폴리오 재구축

## 문서 상태

- **단계**: INCEPTION - Units Generation / Part 2
- **상태**: 승인됨
- **상세 수준**: Standard
- **작성일**: 2026-07-23
- **승인된 decomposition 답변**: A/A/A/A/A
- **Unit 수**: 3
- **Unit 유형**: 하나의 repository와 static release 안의 logical work units
- **입력**:
  - [Unit of Work Plan](../plans/unit-of-work-plan.md)
  - [Application Design](application-design.md)
  - [Components](components.md)
  - [Services](services.md)
  - [User Stories](../user-stories/stories.md)
  - [Requirements](../requirements/requirements.md)

## 1. Approved Decomposition

| ID | Unit | Bounded context | Production ownership | Primary outcome |
|---|---|---|---|---|
| U1 | Profile Domain and Native Experience | Profile Experience | C01~C05, C11; S01, S04 | 승인된 canonical profile에서 `/resume`, `/portfolio`, metadata, navigation와 print/PDF source 생성 |
| U2 | Homepage Publication Boundary | Homepage Publication | C06~C10; S02, S03 | homepage source를 normal post/discovery에서 구조적으로 분리하고 canonical profile slot을 조합 |
| U3 | Quality Gate and CI Integration | Verification and CI | C12; S05 | owner-local test를 이동하지 않고 cross-unit browser/PDF evidence와 최소 Jenkins 실행을 집계 |

세 unit은 독립 배포 service, versioned package 또는 runtime scaling boundary가 아니다. unit은 Construction design, authored-source ownership, feature branch, review와 merge의 경계다. 최종 사용자는 하나의 정적 사이트와 PDF를 받는다.

## 2. Global Unit Rules

### 2.1 Ownership

- 각 production component C01~C12와 service S01~S05는 정확히 하나의 unit이 소유한다.
- downstream unit은 provider의 public interface 또는 generated artifact contract를 소비한다. canonical profile facts와 publication classification을 복제하지 않는다.
- Story 역할은 `Primary Owner`, `Contributor`, `Closure Unit`으로 구분한다.
- post-closure integrated verification 실패는 이미 닫힌 story를 다시 열 수 있지만 U3가 해당 production behavior를 재소유하지 않는다.

### 2.2 Construction Sequence

1. Units Generation artifact 승인을 받는다.
2. dirty primary worktree를 건드리지 않는 별도 branch-base reconciliation gate를 통과한다.
3. 최신 검증된 `develop`에서 U1 feature branch를 만들고 다섯 Construction stage와 required approvals를 완료한다.
4. U1을 `--no-ff`로 local `develop`에 병합한 뒤 그 최신 base에서 U2를 시작한다.
5. 같은 방식으로 U2 완료·병합 뒤 U3를 시작한다.
6. U3 완료·병합 뒤 integrated Build and Test를 한 번 실행한다.

later unit을 앞서 만들거나 병렬 implementation하지 않는다. push는 별도 승인 없이는 수행하지 않는다.

### 2.3 Source, Fact and Deployment Boundaries

- Authored source에서 behavior를 변경하고 `content/`, `site/dist/`, Rust `target/`와 generated `site/public` JSON/assets를 유일한 behavior source로 직접 수정하지 않는다.
- `site/public/resume.pdf`는 C01/C02/C11에서 파생되고 review되는 version-controlled release asset 예외이며 canonical fact source가 아니다.
- public profile facts와 final PDF에는 별도 사용자 fact approval이 필요하다.
- external Vault write는 U2의 `Areas/Notes/Passion Project.md` 하나로 제한한다.
- unit별 Infrastructure Design은 기존 static delivery compatibility를 검증하고 no-change decision을 기록한다.
- Infrastructure Design 실행은 Terraform edit, AWS mutation, push 또는 deployment 권한을 만들지 않는다.

### 2.4 PBT Ownership

- U1은 profile validation, projection, ordering와 serialization에 식별되는 property 및 TypeScript-side generator/test를 소유한다.
- U2는 publication partition, reference transform, unrelated-post preservation, determinism와 idempotence property 및 Rust generator/test를 소유한다.
- U3는 U1/U2 test implementation을 이동·복제하거나 늦추지 않는다. stable command, shrinking과 seed replay evidence를 ST-E04 CI gate에 연결한다.
- Units Generation 자체의 PBT enforcement는 N/A다. Functional Design, NFR Requirements, Code Generation과 Build and Test의 binding obligation은 각 unit에 전달한다.

## 3. U1 — Profile Domain and Native Experience

### 3.1 Identity

| Field | Value |
|---|---|
| Unit ID | U1 |
| Bounded context | Profile Experience |
| Recommended branch | `codex/feature/resume-profile-experience` |
| Branch base | branch-base reconciliation 뒤 최신 검증된 local `develop` |
| Construction order | First |
| Deployment boundary | 없음; one static release의 logical unit |

### 3.2 Objective

사용자가 공개를 승인한 profile facts 한 벌을 typed canonical source로 만들고, 그 projection에서 한국어 native résumé와 portfolio, conservative metadata, no-JS navigation, print representation과 stable PDF source를 생성한다.

### 3.3 Owned Components and Services

| Kind | Ownership |
|---|---|
| Components | C01 Profile Domain, C02 Profile Presentation, C03 Profile Metadata Builder, C04 Base Layout Metadata Host, C05 Header Navigation, C11 Resume Document Boundary |
| Services | S01 Profile Assembly, S04 Resume Document |
| Canonical source | `site/src/lib/profile/`의 approved-only typed production data |
| Derived release asset | `site/public/resume.pdf` |

### 3.4 Story Roles

| Role | Stories |
|---|---|
| Primary and Closure | ST-U02, ST-U03, ST-U04, ST-U05, ST-E01, ST-E02 |
| Contributor | ST-U01 route, header, profile-local navigation와 internal destination |
| Named PBT slice | ST-E03 profile-domain properties; slice는 U1에서 완료하지만 parent story는 U2에서 닫음 |
| Post-closure observer | U3가 ST-U03 integrated regression을 검증하고 실패 시 reopen |

### 3.5 Responsibilities

- approved-only `ProfileData` type, canonical data, validator와 ordered consumer projections를 정의한다.
- draft, evidence와 approval record를 production source 밖의 AI-DLC fact-review boundary에 유지한다.
- `/resume`와 `/portfolio`의 semantic static HTML, Korean content contract와 profile-local navigation을 제공한다.
- résumé summary/native `<details>`, portfolio case-study structure, approved contact/evidence links와 optional-section omission을 제공한다.
- Résumé와 Portfolio anchor를 desktop/mobile server-rendered Header에 제공하고 hydration 또는 `MobileNav.open`에 의존하지 않게 한다.
- visible facts와 동일한 projection에서 page metadata와 conservative JSON-LD를 만든다.
- browser print와 full-detail `/resume.pdf`가 같은 approved facts를 사용하도록 한다.
- profile business rules의 example tests와 applicable PBT를 owning code와 함께 제공한다.

### 3.6 Expected Authored-Source Impact

정확한 파일은 U1 Functional Design과 Code Generation plan에서 확정한다. 현재 허용된 예상 경로는 다음과 같다.

| Path or area | Expected role |
|---|---|
| `site/src/lib/profile/` | new types, approved data, validation와 selectors |
| `site/src/pages/resume.astro` | new résumé route |
| `site/src/pages/portfolio.astro` | new portfolio route |
| `site/src/components/`의 profile-specific files | shared static profile presentation |
| `site/src/components/Header.astro` | hydration-independent desktop/mobile profile links |
| `site/src/islands/MobileNav.tsx` | 기존 island compatibility가 필요한 경우에만 최소 prop/markup integration; profile link의 유일한 carrier 금지 |
| `site/src/layouts/BaseLayout.astro` | backward-compatible metadata/JSON-LD host |
| `site/src/styles/` | scoped profile, responsive와 print styles using `--c-` variables |
| `site/public/resume.pdf` | reviewed derived release asset |
| `site/package.json`, `site/package-lock.json`, site test/config paths | U1 NFR Requirements에서 선택한 build/test/PDF tooling에 필요한 최소 변경 |

기존 code organization을 유지하며 새 independently versioned package를 만들지 않는다. `site/public`의 generated JSON/assets는 authored behavior source가 아니다.

### 3.7 Provider and Consumer Contracts

**Inputs**

- user-approved fact inventory and evidence record;
- existing BaseLayout/Header/theme contracts;
- configured site identity and static build context.

**Provides to U2**

- validated homepage profile projection;
- reusable server-rendered profile panel primitive or equivalent stable presentation contract;
- working `/resume` and `/portfolio` internal route targets.

**Provides to U3**

- stable profile-domain example/PBT command;
- generated route, metadata, print and PDF contracts;
- unit-level test and fact/parity evidence.

### 3.8 Entry Criteria

- Units Generation artifacts approved.
- branch-base reconciliation completed and validated.
- U1 branch created from current validated `develop`.
- U1 Functional Design may begin without final public copy, but no unapproved fact may enter production data.

### 3.9 Required Construction Stages

| Stage | U1 output |
|---|---|
| Functional Design | exact profile fields/rules, projection/order behavior, metadata/PDF parity logic and PBT-01 property inventory |
| NFR Requirements | accessibility/responsive/print targets, TypeScript PBT framework and browser/PDF tool requirements |
| NFR Design | no-JS/mobile navigation, metadata, print/PDF, testability and static performance patterns |
| Infrastructure Design | `/resume`, `/portfolio`, `/resume.pdf`, cache/clean-route/rollback compatibility; expected no-change decision |
| Code Generation | authored source, owner-local examples/PBT, unit verification evidence and approved PDF generation path |

### 3.10 Exit and Closure Gate

- ST-U02, ST-U03, ST-U04, ST-U05, ST-E01와 ST-E02 acceptance evidence is complete.
- ST-U01 contributor contract is available for U2.
- ST-E03 profile-property slice has example/PBT, shrinking and seed replay evidence.
- required public facts, selected projects, contact values and external links have explicit user approval before public-ready completion.
- web/print/PDF fact parity and U1 negative paths pass at unit level.
- `cd site && npx astro build` and applicable focused checks pass.
- U1 Infrastructure Design records compatibility/no-change or stops for separate authority.
- U1 review is approved and merge to local `develop` succeeds with `--no-ff`; no push or deploy occurs.

## 4. U2 — Homepage Publication Boundary

### 4.1 Identity

| Field | Value |
|---|---|
| Unit ID | U2 |
| Bounded context | Homepage Publication |
| Recommended branch | `codex/feature/resume-home-boundary` |
| Branch base | U1 merge 뒤 최신 검증된 local `develop` |
| Construction order | Second |
| Deployment boundary | 없음; one static release의 logical unit |

### 4.2 Objective

`visibility: homepage`를 typed publication scope로 처리하고 정확히 하나인 homepage source를 normal posts와 모든 knowledge discovery output에서 구조적으로 분리한다. dedicated homepage artifact의 profile slot에 U1 canonical profile fragment를 조합하면서 unrelated posts를 보존한다.

### 4.3 Owned Components and Services

| Kind | Ownership |
|---|---|
| Components | C06 Homepage Composition, C07 Publication Catalog, C08 Link and Transclusion Transformer, C09 Output Materializer, C10 Static Data Gateway |
| Services | S02 Publication Projection, S03 Homepage and Static Site Composition |
| Authored publication source | external `Areas/Notes/Passion Project.md` |
| Generated contract | dedicated homepage artifact와 post-only content/meta/discovery artifacts |

### 4.4 Story Roles

| Role | Stories |
|---|---|
| Primary and Closure | ST-U01, ST-U06 |
| PBT slice and Parent Closure | ST-E03 publication properties; U1 profile slice를 입력으로 받아 parent story를 U2에서 닫음 |
| Consumer | ST-E01 canonical profile contract를 복제하지 않고 U1 provider interface로 사용 |

### 4.5 Responsibilities

- frontmatter `visibility: homepage`와 `post` default를 `PublicationScope`로 정규화한다.
- missing/duplicate homepage source와 unknown visibility를 path-aware failure로 처리한다.
- homepage source와 discoverable posts를 immutable typed projection으로 분리한다.
- normal post의 homepage wikilink를 `/`와 supported fragment로 정규화하고 alias를 보존한다.
- full/heading/block homepage-target transclusion을 모두 authoring error로 거부한다.
- dedicated homepage artifact를 normal post output 밖에 생성한다.
- post route, list, today, tag, hub, 404 recent, search, RSS, sitemap post URL, nav tree, preview, graph, related, backlink와 forward-link에 post-only projection을 사용한다.
- homepage-origin link가 target의 graph/backlink/related ranking에 영향을 주지 않게 한다.
- Astro gateway가 homepage와 post-only data를 다른 required interface로 읽게 한다.
- exact-one profile slot을 U1 canonical profile fragment로 build-time composition한다.
- unrelated posts의 route, order, content와 discoverability를 보존한다.
- publication business rules의 example tests와 applicable Rust PBT를 owning code와 함께 제공한다.

### 4.6 Expected Authored-Source Impact

| Path or area | Expected role |
|---|---|
| `preprocessor/src/types.rs`, `scanner.rs` | publication scope와 parsed source representation |
| `preprocessor/src/linker.rs`, `transform.rs`, `syntax.rs` | homepage reference and transclusion semantics using shared syntax/fence-safe transforms |
| `preprocessor/src/output.rs`, `search.rs`, `preview.rs`, `nav_tree.rs`, `related.rs` | dedicated homepage/post-only materialization and discovery projection |
| `preprocessor/src/lib.rs`, `main.rs` | pipeline orchestration only where required |
| `preprocessor/Cargo.toml`, `preprocessor/Cargo.lock` | U2 NFR Requirements가 새 Rust PBT dependency를 승인한 경우에만 dependency/lock update |
| `preprocessor/tests/` | focused examples and Rust PBT for catalog/transform/output invariants |
| `fixtures/vault/` | homepage visibility/reference/transclusion/unrelated-post fixtures |
| `site/src/lib/data.ts`, related types | strict dedicated homepage and discoverable-post gateways |
| `site/src/pages/index.astro` | slot composition and existing today-post behavior |
| `site/src/pages/posts/[slug].astro`, `rss.xml.ts`, tag/hub/404 consumers | post-only contract consumption where current generic getters require migration |
| external `Areas/Notes/Passion Project.md` | exactly one `visibility: homepage` declaration and one approved profile slot |

`content/`, generated `site/public/*.json`, `site/dist/`와 Rust `target/`은 direct authored edits가 아니라 documented preprocess/build commands의 output이다.

### 4.7 Provider and Consumer Contracts

**Consumes from U1**

- stable `/resume` and `/portfolio` routes;
- validated homepage profile projection and server-rendered panel primitive;
- no duplicated profile facts.

**Provides to U3**

- stable Rust example/PBT command;
- homepage/post partition and generated manifest evidence;
- route absence, discovery exclusion and unrelated-post preservation contracts;
- scoped external Vault diff evidence.

### 4.8 Entry Criteria

- U1 has completed all five Construction stages, required approvals and `--no-ff` merge.
- latest local `develop` contains the stable profile route/panel provider contract.
- U2 branch is created from that latest validated `develop`.
- external Vault file is readable; write occurs only after consumer behavior and tests are ready.

### 4.9 Required Construction Stages

| Stage | U2 output |
|---|---|
| Functional Design | publication cardinality/rules, reference truth table, surface matrix, artifact/slot contract and PBT-01 property inventory |
| NFR Requirements | Rust PBT framework, determinism/error/test performance and static contract requirements |
| NFR Design | producer-side partition, artifact schema/read gate, error propagation and owner-local test pattern |
| Infrastructure Design | route removal/addition, static asset/cache/invalidation/rollback compatibility; expected no-change decision |
| Code Generation | Rust/Astro authored source, fixtures, examples/PBT, scoped Vault change and unit verification evidence |

### 4.10 Exit and Closure Gate

- ST-U01 and ST-U06 acceptance evidence is complete.
- ST-E03 publication slice plus inherited U1 profile slice has local example/PBT, shrinking and seed replay evidence; parent ST-E03 closes here.
- homepage source appears once at `/` and never as a normal post or discovery entity.
- all specified link/transclusion variants and failure cases pass.
- unrelated fixture posts are preserved and deterministic.
- exact external Vault diff is reviewed and limited to `Passion Project.md`; no external commit/push is implied.
- `just test` plus the safe cross-pipeline site gate passes, or the approved alternative and reason are recorded.
- U2 Infrastructure Design records compatibility/no-change or stops for separate authority.
- U2 review is approved and merge to local `develop` succeeds with `--no-ff`; no push or deploy occurs.

## 5. U3 — Quality Gate and CI Integration

### 5.1 Identity

| Field | Value |
|---|---|
| Unit ID | U3 |
| Bounded context | Verification and CI |
| Recommended branch | `codex/feature/resume-quality-gates` |
| Branch base | U2 merge 뒤 최신 검증된 local `develop` |
| Construction order | Third |
| Deployment boundary | 없음; one static release의 logical unit |

### 5.2 Objective

U1/U2가 제공하는 stable local gates를 cross-unit browser, accessibility, link, metadata, print/PDF와 CI evidence로 조정한다. Jenkins의 경로·test/PBT seed 실행만 최소 수정하고 deployment behavior는 변경하지 않는다.

### 5.3 Owned Components and Services

| Kind | Ownership |
|---|---|
| Components | C12 Verification and Automation Adapters |
| Services | S05 Verification Orchestration |
| Production behavior ownership | 없음; U1/U2 public contracts를 read-only로 관찰 |
| CI scope | related build/example/PBT commands, seed logging and current Rust path only |

### 5.4 Story Roles

| Role | Stories |
|---|---|
| Primary and Closure | ST-E04 |
| Integrated Contributor | ST-U03 post-closure PDF/parity regression; failure reopens ST-U03 |
| Evidence Aggregator | all user-story route/content/browser/link/metadata/print contracts |
| Explicit Non-owner | ST-E03 property definitions, generators and tests remain U1/U2; U3 aggregation belongs to ST-E04 |

### 5.5 Responsibilities

- U1/U2 stable local example/PBT commands를 변경 없이 실행 가능한 verification plan에 연결한다.
- narrow/wide responsive, keyboard, focus, accessible name, reduced-motion와 no-JS core navigation smoke를 제공한다.
- required routes, homepage CTA, route absence, internal links, canonical/social metadata와 JSON-LD를 확인한다.
- print media, tracked PDF, PDF link, readability와 web/PDF approved-fact parity를 검증한다.
- U1/U2 PBT seed와 shrunk counterexample이 재현 가능한지 실행 evidence를 수집한다.
- Jenkins의 incorrect Rust path와 relevant test/PBT/seed invocation만 최소 수정한다.
- CI failure를 silent retry하지 않고 command, seed와 counterexample evidence로 보고한다.
- no-deploy assertion을 유지하고 existing deployment stages를 확장·실행하지 않는다.

### 5.6 Expected Authored-Source Impact

| Path or area | Expected role |
|---|---|
| `site/tests/**`와 `site/` 아래 승인된 browser-test configuration | cross-unit static/browser/print/PDF checks |
| `site/package.json`, `site/package-lock.json` | approved verification tooling only |
| `Jenkinsfile` | current Rust path, relevant build/test/PBT commands and seed output |
| `Justfile` | stable local verification recipe가 필요한 경우에만 narrow adapter |
| `aidlc-docs/construction/u3-quality-gate-and-ci-integration/` | AI-DLC design/verification evidence only; application authored source가 아님 |

U3는 U1/U2 production source 또는 owner-local property tests를 test-centralization 목적으로 이동하지 않는다. `infra/`는 compatibility reference only다.

### 5.7 Provider and Consumer Contracts

**Consumes from U1**

- stable site build and profile-domain test commands;
- `/resume`, `/portfolio`, metadata, print and PDF public contracts;
- fact-approval and unit-level parity evidence.

**Consumes from U2**

- stable Rust example/PBT command;
- homepage/post generated contract and exclusion evidence;
- external Vault change evidence.

**Provides**

- ST-E04 local/CI equivalent verification report;
- seed/replay and cross-unit browser/PDF evidence;
- final integrated Build and Test entry contract.

### 5.8 Entry Criteria

- U1 and U2 each completed five Construction stages, approvals and sequential `--no-ff` merge.
- current local `develop` exposes stable owner-local commands and public contracts.
- U3 branch is created from that latest validated `develop`.
- no unresolved U1/U2 test or fact/PDF blocker is hidden as a U3 task.

### 5.9 Required Construction Stages

| Stage | U3 output |
|---|---|
| Functional Design | verification orchestration rules and PBT N/A rationale for non-business-logic adapters |
| NFR Requirements | browser/viewport/accessibility/PDF matrix, CI evidence and tooling requirements |
| NFR Design | network-independent orchestration, deterministic reports, seed propagation and failure semantics |
| Infrastructure Design | confirms CI validation does not mutate deployment infrastructure; expected no-change decision |
| Code Generation | browser/static/PDF adapters, minimal Jenkins/optional Just wiring and verification evidence |

### 5.10 Exit and Closure Gate

- deployment stage를 호출하지 않는 실제 Jenkins validation execution에서 relevant build/example/PBT가 실행되고 seed와 failure 시 shrunk-counterexample evidence를 제공해야 ST-E04가 닫힌다. Jenkinsfile diff 또는 local-only 결과만으로 닫지 않는다.
- U1/U2 owner-local example/PBT commands execute with shrinking and reproducible seed evidence.
- cross-unit route, no-JS navigation, content, link, metadata, responsive, accessibility, print and PDF gates pass.
- integrated PDF/parity failure reopens ST-U03 rather than being waived or reimplemented in U3.
- Jenkins changes stay within path/test/PBT/seed scope and do not alter deployment behavior.
- U3 Infrastructure Design records no deployment-infrastructure change.
- 안전한 validation-only Jenkins execution path를 만들거나 실행할 수 없으면 ST-E04를 열어 둔 채 Infrastructure Design 또는 Code Generation gate에서 중단하고 별도 결정을 요청한다.
- U3 review is approved and merge to local `develop` succeeds with `--no-ff`; no push or deploy occurs.

## 6. Cross-Unit Readiness and Closure

| Handoff | Required provider state | Consumer action | Story effect |
|---|---|---|---|
| Branch-base gate → U1 | reconciled, tested local `develop`; dirty primary tree untouched | create U1 branch only | no story closes at branch setup |
| U1 → U2 | profile routes/panel contract, approved facts/PDF, U1 tests and merge complete | consume provider contract without copying facts | ST-U01 remains open; ST-E03 profile slice complete |
| U2 → U3 | homepage/post partition, slot composition, U2 tests, Vault diff and merge complete | observe stable public/local contracts | ST-U01 and ST-E03 close in U2 |
| U3 → Integrated Build and Test | cross-unit verification and CI contract merged | run complete affected gates | ST-E04 closes; failures reopen owning stories |

ST-U03 closes in U1 after unit-level print/PDF/parity and negative evidence. U3 adds post-closure integrated evidence; it is not a deferred acceptance criterion required to claim U1 completion.

## 7. Ownership Completeness

### 7.1 Components

| Unit | Components | Count |
|---|---|---:|
| U1 | C01, C02, C03, C04, C05, C11 | 6 |
| U2 | C06, C07, C08, C09, C10 | 5 |
| U3 | C12 | 1 |
| Total | C01~C12 exactly once | 12 |

### 7.2 Services

| Unit | Services | Count |
|---|---|---:|
| U1 | S01, S04 | 2 |
| U2 | S02, S03 | 2 |
| U3 | S05 | 1 |
| Total | S01~S05 exactly once | 5 |

Production ownership is exclusive. Test observation, artifact consumption and Story contribution do not create a second production owner.

## 8. Brownfield Code Organization

Code Organization 질문은 N/A다. 기존 `preprocessor/`, `site/`, `fixtures/`, `Justfile`와 `Jenkinsfile` 구조를 유지하며 새 service root, workspace package 또는 per-unit release directory를 만들지 않는다.

Unit별 예상 path는 ownership과 review scope를 나타내며 implementation manifest가 아니다. 새 파일명, exact test directories와 tool configuration은 해당 unit의 approved Functional/NFR/Code Generation plan에서 확정한다.

## 9. Execution Count and Branch Recommendations

- **Inception executions**: Application Design + Units Generation = 2
- **Per-unit Construction executions**: 5 stages × 3 units = 15
- **Integrated Build and Test**: 1
- **Total planned stage executions**: 18
- **Remaining after Units Generation approval**: branch-base gate + 15 per-unit stages + integrated Build and Test; approval and fact/Vault gates are additional

Recommended unit branches are names, not current Git mutations.

| Order | Branch | Base condition | Merge |
|---:|---|---|---|
| 1 | `codex/feature/resume-profile-experience` | reconciled validated `develop` | local `develop`, `--no-ff` |
| 2 | `codex/feature/resume-home-boundary` | U1 merged and validated | local `develop`, `--no-ff` |
| 3 | `codex/feature/resume-quality-gates` | U2 merged and validated | local `develop`, `--no-ff` |

No branch is created during Units Generation. No local branch or merge is pushed without separate authorization.

## 10. Deferred Decisions

The following remain in their assigned later gate:

- exact profile schema, field predicates, public copy and fact approval inventory;
- slot literal, artifact schema and wikilink/transclusion truth table;
- TypeScript/Rust PBT frameworks, generators and seed syntax;
- browser/version/viewport/accessibility tooling and thresholds;
- PDF engine, print dimensions, deterministic metadata and parity extraction;
- exact file additions, test directory names, commands and Jenkins syntax;
- any infrastructure implementation discovered by a no-change compatibility review.

These deferred decisions do not change the three approved unit boundaries. A later discovery that requires a component owner, execution order, runtime/deployment model or infrastructure scope change must return to the applicable approval gate.
