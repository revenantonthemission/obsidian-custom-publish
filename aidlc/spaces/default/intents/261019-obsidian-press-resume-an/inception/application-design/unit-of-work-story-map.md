# Unit of Work Story Map — 이력서·포트폴리오 재구축

## 문서 상태

- **단계**: INCEPTION - Units Generation / Part 2
- **상태**: 승인됨
- **상세 수준**: Standard
- **작성일**: 2026-07-23
- **Story 수**: 10
- **Acceptance Criteria 수**: 40
- **추적 범위**: FR-001~FR-018, NFR-001~NFR-010, USCN-001~USCN-004, EDGE-001~EDGE-012
- **입력**:
  - [Unit of Work Plan](../plans/unit-of-work-plan.md)
  - [Unit Definitions](unit-of-work.md)
  - [Unit Dependencies](unit-of-work-dependency.md)
  - [User Stories](../user-stories/stories.md)
  - [Requirements](../requirements/requirements.md)

## 1. Role Semantics

| Role | Meaning |
|---|---|
| Primary Owner | story의 production behavior 또는 enabling outcome 구현을 주도하는 unit |
| Contributor | provider contract, named property slice, approval 또는 post-closure evidence를 제공하지만 parent story를 단독으로 닫지 않는 주체 |
| Closure Unit | story의 모든 필수 acceptance criterion이 최초 충족됐다고 판정하는 unit |
| Reopen Verifier | 닫힌 story를 downstream/integrated gate에서 다시 검증하고 실패 시 owning story를 reopen하는 unit |

Story closure와 전체 feature completion은 다르다. U1/U2 story는 owner-local evidence로 닫을 수 있지만 U3 또는 integrated Build and Test의 regression failure가 다시 열 수 있다.

## 2. Story-to-Unit Summary

| Story | Primary Owner | Contributor | Closure Unit | Closure note |
|---|---|---|---|---|
| ST-U01 — 홈페이지에서 프로필 발견과 이동 | U2 | U1 route/navigation | U2 | U1 destination과 Header contract 위에서 U2 homepage CTA/no-JS 흐름 완료 |
| ST-U02 — 핵심 이력 판단과 상세 검토 | U1 | U3 integrated evidence | U1 | U1 unit-level content/metadata/accessibility evidence로 닫고 U3 실패 시 reopen |
| ST-U03 — 이력서 사본 인쇄·다운로드 | U1 | U3 post-closure PDF/parity verification | U1 | U1 print/PDF/parity/negative evidence로 닫음; U3는 closure를 지연하지 않음 |
| ST-U04 — 대표 프로젝트와 작업 방식 판단 | U1 | U3 integrated evidence | U1 | U1 data/presentation/metadata evidence로 닫음 |
| ST-U05 — 공개 근거 확인과 연락 | U1 | user fact approval, U3 integrated evidence | U1 | 실제 승인 연락처·링크 없이는 닫지 않음 |
| ST-U06 — 중복 없는 블로그 탐색 | U2 | U3 integrated evidence | U2 | 실제 scoped Vault diff와 generated/discovery 결과 필요 |
| ST-E01 — 공용 프로필 데이터의 일관된 관리 | U1 | U2 consumer | U1 | U2는 projection을 소비하고 facts를 복제하지 않음 |
| ST-E02 — 승인된 사실만 공개 | U1 | user fact approval, U3 parity observation | U1 | 사용자 승인 기록과 cross-surface inventory 필요 |
| ST-E03 — 재현 가능한 예제·PBT 품질 검증 | U2 parent | U1 profile-property slice | U2 | U1 slice 완료 뒤 U2 publication slice와 parent closure; U3가 재소유하지 않음 |
| ST-E04 — CI에서 동일한 품질 게이트 실행 | U3 | U1/U2 stable local commands | U3 | Jenkins path/test/PBT/seed/replay와 no-deploy evidence 필요 |

## 3. Acceptance-Criterion Ownership

### 3.1 ST-U01 — Homepage Discovery and Navigation

| AC | Primary evidence owner | Contributor | Closure condition |
|---|---|---|---|
| AC-U01-01 | U2 | U1 homepage projection/panel | `/`에 approved short intro와 distinct Résumé/Portfolio CTA가 정확히 한 번 표시 |
| AC-U01-02 | U2 | U1 internal routes | external Notion 대신 `/resume`, `/portfolio`로 연결 |
| AC-U01-03 | U2 | U1 Header/profile-local navigation | homepage와 두 profile page의 목적이 분명한 이동 경로가 모두 존재 |
| AC-U01-04 | U2 | U1 hydration-independent Header links | homepage CTA와 profile navigation이 JavaScript 없이 keyboard로 동작 |

**Closure**: U2. Fixture만으로 닫지 않고 actual homepage composition과 permitted Vault source result가 필요하다.

### 3.2 ST-U02 — Résumé Summary and Details

| AC | Primary evidence owner | Contributor | Closure condition |
|---|---|---|---|
| AC-U02-01 | U1 | — | `/resume` first view에 approved core summary가 존재 |
| AC-U02-02 | U1 | — | native `<details>`로 approved detail을 keyboard/pointer에서 이용 |
| AC-U02-03 | U1 | user fact approval | absent/unapproved optional data가 empty heading/placeholder 없이 생략 |
| AC-U02-04 | U1 | U3 metadata regression | unique title/description/canonical/social/approved JSON-LD가 visible content와 일치 |

**Closure**: U1. U3 regression failure reopens ST-U02.

### 3.3 ST-U03 — Print and Downloadable Résumé

| AC | Primary evidence owner | Contributor | Closure condition |
|---|---|---|---|
| AC-U03-01 | U1 | U3 post-closure print regression | U1 print-media smoke/review에서 screen-only UI 제거, readable flow와 주요 section 분리 방지 |
| AC-U03-02 | U1 | U3 link/file regression | reviewed Git-tracked `/resume.pdf`가 유효하고 읽을 수 있음 |
| AC-U03-03 | U1 | user fact approval, U3 integrated parity | U1 unit-level web/print/PDF approved core-fact parity 통과 |
| AC-U03-04 | U1 | U3 negative regression | missing/broken/stale/mismatched PDF의 unit-level negative gate가 명확히 실패 |

**Closure**: U1. U3는 모든 AC를 다시 관찰할 수 있지만 deferred AC를 소유하지 않는다. U3 failure는 story를 reopen한다.

### 3.4 ST-U04 — Portfolio Case Studies

| AC | Primary evidence owner | Contributor | Closure condition |
|---|---|---|---|
| AC-U04-01 | U1 | user project approval | approved case study 3~6개가 deterministic order로 표시 |
| AC-U04-02 | U1 | user fact approval | problem, role, decision, architecture, outcome, lesson 모두 approved content로 존재 |
| AC-U04-03 | U1 | — | unavailable/private optional evidence link는 broken CTA 없이 생략 |
| AC-U04-04 | U1 | U3 metadata regression | unique portfolio metadata/JSON-LD가 visible approved content와 일치 |

**Closure**: U1. Project selection과 case-study facts의 explicit user approval 없이는 구조 테스트만으로 닫지 않는다.

### 3.5 ST-U05 — Evidence and Contact

| AC | Primary evidence owner | Contributor | Closure condition |
|---|---|---|---|
| AC-U05-01 | U1 | user contact approval | approved email/GitHub CTA가 résumé와 portfolio에서 labelled/accessible |
| AC-U05-02 | U1 | user link approval | public evidence link가 실제 approved purpose와 일치 |
| AC-U05-03 | U1 | — | absent/private optional link가 placeholder 없이 생략 |
| AC-U05-04 | U1 | user approval record | invalid/unapproved required contact가 public-ready build를 실패 |

**Closure**: U1. U3 link/accessibility regression failure reopens ST-U05.

### 3.6 ST-U06 — Non-duplicated Blog Discovery

| AC | Primary evidence owner | Contributor | Closure condition |
|---|---|---|---|
| AC-U06-01 | U2 | U1 profile panel | approved homepage source와 profile CTA가 `/`에 조합 |
| AC-U06-02 | U2 | — | post route/list/search/RSS/sitemap 및 full surface matrix에서 homepage source 제외 |
| AC-U06-03 | U2 | — | unrelated post route/order/content/discoverability 보존 |
| AC-U06-04 | U2 | external Vault access gate | Vault unreadable 시 substitute 없이 explicit blocker |

**Closure**: U2. Actual authorized Vault file diff와 generated contract evidence가 필요하다.

### 3.7 ST-E01 — Canonical Profile Management

| AC | Primary evidence owner | Contributor | Closure condition |
|---|---|---|---|
| AC-E01-01 | U1 | U2 read-only consumer | one approved fact change가 résumé/portfolio/metadata projections에 중복 편집 없이 반영 |
| AC-E01-02 | U1 | — | required value/URL/id/order/project-count violations가 field-addressable failure |
| AC-E01-03 | U1 | — | absent optional value가 empty section/CTA/placeholder 없이 생략 |
| AC-E01-04 | U1 | — | same valid input이 deterministic data/order output 생성 |

**Closure**: U1. U2 consumption은 fact duplication이 없음을 확인하지만 ST-E01을 다시 소유하지 않는다.

### 3.8 ST-E02 — Approved Facts Only

| AC | Primary evidence owner | Contributor | Closure condition |
|---|---|---|---|
| AC-E02-01 | U1 fact-review process | user review | public evidence가 증명하지 못하는 fact를 inference하지 않고 review inventory에 남김 |
| AC-E02-02 | U1 | user approval | unapproved fact/placeholder가 page, metadata와 PDF에 없음 |
| AC-E02-03 | U1 | user approval | explicitly approved facts만 all profile outputs에 일관되게 반영 |
| AC-E02-04 | U1 | U3 parity observation | web/PDF mismatch가 completion을 차단 |

**Closure**: U1 after explicit fact approval. Test result alone cannot replace human approval.

### 3.9 ST-E03 — Reproducible Example and Property Tests

| AC | U1 profile slice | U2 publication slice and parent closure | U3 boundary |
|---|---|---|---|
| AC-E03-01 | C01/profile transformation property inventory or per-component N/A | C07~C09/reference/output property inventory or N/A; verify both slices | no property ownership |
| AC-E03-02 | profile domain generators, PBT and complementary examples | publication generators, PBT and complementary examples; verify both slices | execute only under ST-E04 |
| AC-E03-03 | shrinking, seed and minimal counterexample evidence for U1 tests | shrinking, seed and minimal counterexample evidence for U2 tests; verify both slices | aggregate output under ST-E04 |
| AC-E03-04 | offline U1 seed replay | offline U2 seed replay and parent closure | CI/local equivalence belongs ST-E04 |

**Closure**: U2 after both owner-local slices pass. U1 closes only its named slice. U3 must not postpone, move or duplicate ST-E03 tests.

### 3.10 ST-E04 — CI Quality Gates

| AC | Primary evidence owner | Contributor | Closure condition |
|---|---|---|---|
| AC-E04-01 | U3 | U1/U2 stable commands | Jenkins uses current repository paths and executes relevant build/example/PBT gates |
| AC-E04-02 | U3 | U1/U2 framework output | CI logs every PBT seed and exposes shrunk counterexample on failure |
| AC-E04-03 | U3 | U1/U2 offline replay interface | same commit/seed reproduces failure locally without external service |
| AC-E04-04 | U3 | per-unit no-deploy guard | Jenkins change stays path/test/seed-only and no deploy/AWS/Terraform mutation occurs |

**Closure**: U3. Integrated Build and Test still executes the final gate and may reopen any owning story.

## 4. Functional-Requirement Traceability

| Requirement | Primary unit | Contributor or verifier | Unit-level completion |
|---|---|---|---|
| FR-001 | U1 | — | U1 canonical type/validation/projection gate |
| FR-002 | U1 | user fact approval; U3 parity observation | U1 after explicit approval; mismatch reopens |
| FR-003 | U1 | U2 homepage entry; U3 route verification | U1 native routes; journey entry completes in U2 |
| FR-004 | U1 | U3 integrated résumé verification | U1 |
| FR-005 | U1 | user project/fact approval | U1 |
| FR-006 | U1 | user contact approval; U3 link verification | U1 |
| FR-007 | U1 | U3 responsive/theme regression | U1 |
| FR-008 | U2 | U1 homepage profile projection/routes | U2 |
| FR-009 | U2 | U3 exclusion regression | U2 |
| FR-010 | U1 | U3 integrated PDF verification | U1; U3 failure reopens |
| FR-011 | U1 | U3 metadata/JSON-LD verification | U1 |
| FR-012 | U1 profile navigation + U2 homepage navigation | U3 link verification | U2 after both provider/consumer parts |
| FR-013 | U1 profile/no-JS + U2 homepage/static composition | U3 no-JS/browser verification | U2 implementation; final regression evidence U3 |
| FR-014 | U3 | U1/U2 owner-local examples | U3 verification orchestration |
| FR-015 | U1/U2 owner-local PBT | U3 CI execution evidence | property implementation U2; full workflow evidence U3 |
| FR-016 | U3 | U1/U2 stable commands | U3 |
| FR-017 | U2 publication producer boundary | U1 profile authored boundary; U3 final audit | U3 final evidence |
| FR-018 | U3 overall evidence | U1/U2 per-unit no-deploy guards | U3; integrated/final audit retains boundary |

All FR-001~FR-018 are assigned. A verifier role does not transfer production ownership.

## 5. Non-Functional-Requirement Traceability

| Requirement | Implementation owner | Verification/contributor | Completion gate |
|---|---|---|---|
| NFR-001 — Accessibility | U1 profile; U2 homepage | U3 browser/print evidence | U3 final evidence; owner fixes remain U1/U2 |
| NFR-002 — Responsive | U1 profile; U2 homepage | U3 viewport evidence | U3 |
| NFR-003 — Static performance | U1 and U2 | U3 no-new-bundle/runtime assertion | U2 implementation, U3 regression evidence |
| NFR-004 — Maintainability | U1 canonical domain; U2 publication contract | independent design/code review | U2 |
| NFR-005 — Testability/reproducibility | U1/U2 deterministic owner-local tests | U3 CI/seed evidence | U3 |
| NFR-006 — Search/share quality | U1 metadata; U2 leak prevention | U3 metadata/discovery assertions | U2 |
| NFR-007 — Integrity/privacy | U1 | user approval; U3 link/parity observation | U1; failure reopens |
| NFR-008 — Compatibility/no-JS | U1 profile; U2 homepage | U3 browser matrix | U3 final evidence |
| NFR-009 — Print/PDF quality | U1 | U3 integrated document verification | U1; failure reopens |
| NFR-010 — Quality gates | U3 | U1/U2 local gates | U3 and integrated Build and Test |

All NFR-001~NFR-010 are assigned. U3 evidence closure does not permit U3 to patch owning CSS/domain/publication behavior.

## 6. User-Scenario Traceability

| Scenario | Primary unit | Contributor | Scenario completion |
|---|---|---|---|
| USCN-001 — 채용 담당자의 빠른 이력 확인 | U1 | U2 homepage entry; U3 integrated evidence | implementation journey complete after U2; final regression evidence U3 |
| USCN-002 — 협업자의 프로젝트 판단 | U1 | U2 homepage entry; U3 integrated evidence | implementation journey complete after U2; final regression evidence U3 |
| USCN-003 — 블로그 독자의 일반 탐색 | U2 | U3 integrated evidence | U2 |
| USCN-004 — 운영자의 콘텐츠 갱신 | U1 profile + U2 publication | U3 CI/replay | U3 |

All USCN-001~USCN-004 are assigned.

## 7. Edge/Error Traceability

| Edge | Primary unit | Contributor/verifier | Closure behavior |
|---|---|---|---|
| EDGE-001 — missing required profile | U1 | — | U1 validation failure |
| EDGE-002 — project count outside 3~6 | U1 | — | U1 validation failure |
| EDGE-003 — duplicate id/order | U1 | — | U1 deterministic validation failure |
| EDGE-004 — invalid contact/project URL | U1 | user approval; U3 link check | U1 fail/omit rule |
| EDGE-005 — long Korean/Unicode/URL | U1 profile; U2 homepage | U3 viewport/print verification | U3 evidence; failure reopens owner |
| EDGE-006 — absent optional section | U1 | — | U1 omission rule |
| EDGE-007 — homepage source reappears | U2 | U3 discovery regression | U2 failure |
| EDGE-008 — PDF missing/broken | U1 | U3 integrated document check | U1 failure; U3 reopens |
| EDGE-009 — web/PDF mismatch | U1 | user approval; U3 parity check | U1 failure; U3 reopens |
| EDGE-010 — PBT failure | U1/U2 owning slice | U3 CI replay | U3 final seed evidence; fix in owner |
| EDGE-011 — JS unavailable/reduced motion | U1 profile; U2 homepage | U3 browser verification | U3 evidence; failure reopens owner |
| EDGE-012 — external Vault unavailable | U2 | — | explicit U2 blocker; no substitute |

All EDGE-001~EDGE-012 are assigned.

## 8. Evidence Ownership Matrix

| Evidence | Producer | Consumer/reviewer | Story/requirement use |
|---|---|---|---|
| fact inventory and explicit approval record | user + U1 review artifact | U1, U3 parity observation | ST-E02, ST-U03~U05, FR-002 |
| profile validation examples/PBT | U1 | U2 contract consumer, U3 ST-E04 runner | ST-E01, ST-E03 slice, FR-001/015 |
| résumé/portfolio route/content/metadata build | U1 | U2 routes, U3 integrated checks | ST-U01 contributor, ST-U02/U04/U05 |
| unit-level print/PDF/parity/negative report | U1 | U3 post-closure checks | ST-U03 |
| publication examples/PBT | U2 | U3 ST-E04 runner | ST-U06, ST-E03 parent, FR-009/015 |
| generated surface/manifest preservation report | U2 | U3 | ST-U06, FR-009/017 |
| external Vault exact diff | U2 | user review, U3 final evidence | ST-U01/U06, EDGE-012 |
| browser/link/metadata/PDF report | U3 | integrated Build and Test | ST-E04 and cross-unit regression |
| Jenkins path/test/PBT/seed evidence | U3 | integrated/final review | ST-E04, FR-016, NFR-010 |
| no-deploy/Infrastructure no-change record | each unit; U3 aggregates | final review | FR-018 |

## 9. PBT Story Handoff

| Property area | Owner | Story slice | Closure |
|---|---|---|---|
| profile validity, ordering, optional omission, projections and applicable serialization | U1 | ST-E03 profile slice | slice complete in U1 |
| publication partition, unrelated-post preservation, link closure, output determinism/idempotence | U2 | ST-E03 publication slice | parent ST-E03 closes in U2 |
| stable command execution, seed logging, shrinking output and local/CI replay | U3 | ST-E04 | ST-E04 closes in U3 |

PBT does not replace the explicit example evidence listed for each user story. A shrunk business-relevant counterexample becomes a permanent example regression where appropriate.

## 10. Premature-Closure and Duplication Guards

- U1 must not close ST-U01; homepage slot/CTA and actual Vault result belong to U2.
- U1 profile PBT must not close parent ST-E03; U2 publication slice must also complete.
- ST-U03 must not be kept artificially open until U3; U1 closes it with unit-level document evidence and U3 may reopen it.
- U1/U2 local tests alone must not close ST-E04; Jenkins path, execution, seed and replay evidence belong to U3.
- A reviewed Jenkinsfile diff or local-only simulation must not close ST-E04; an actual validation-only Jenkins execution that does not invoke deployment is required.
- ST-U05 and ST-E02 cannot close from placeholder/schema tests without actual user fact approval.
- ST-U01, ST-U06, FR-008 and FR-009 cannot close from fixture-only evidence without the actual permitted Vault diff and generated result.
- U2 consumes U1 `HomepageProfile`; it must not copy canonical profile facts.
- U3 executes U1/U2 PBT commands; it must not copy properties, generators or test implementation.
- U3 inspects the PDF; it must not hand-edit PDF facts or become the document source.

## 11. Coverage Summary

| Trace set | Expected | Assigned | Result |
|---|---:|---:|---|
| Stories | 10 | 10 | Complete |
| Acceptance Criteria | 40 | 40 | Complete |
| Functional Requirements | 18 | 18 | Complete |
| Non-functional Requirements | 10 | 10 | Complete |
| User Scenarios | 4 | 4 | Complete |
| Edge/Error Scenarios | 12 | 12 | Complete |

The map distinguishes implementation, contribution, closure and downstream evidence. No Story or requirement is intentionally unassigned.
