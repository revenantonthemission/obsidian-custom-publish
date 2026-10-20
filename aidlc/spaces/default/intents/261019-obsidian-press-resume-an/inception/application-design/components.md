# Application Components — 이력서·포트폴리오 재구축

## 문서 상태

- **단계**: INCEPTION - Application Design
- **상태**: 승인됨
- **상세 수준**: Standard
- **범위**: 고수준 component 책임과 public interface
- **상세 규칙 이관**: unit별 Functional Design
- **입력 결정**: Application Design 답변 A/B/A/B/A/A

## 1. 설계 원칙

1. 프로필의 공개 사실은 `site/src/lib/profile/`의 승인 완료 TypeScript data 한 벌만 canonical source로 사용한다.
2. 초안, 근거와 사용자 승인 기록은 production data에 섞지 않고 AI-DLC review artifact로 관리한다.
3. Vault의 모든 문서를 하나의 게시물 집합으로 취급하지 않는다. Rust가 `visibility`를 typed publication scope로 정규화한 뒤 homepage source와 일반 게시물 projection을 구조적으로 분리한다.
4. Astro는 homepage source를 일반 post slug로 읽지 않고 dedicated generated contract로 읽는다.
5. 새 사용자 경험은 build-time Astro component와 정적 HTML/CSS로 제공한다. 새 client JavaScript, Preact island, runtime API 또는 database를 추가하지 않는다.
6. 브라우저 인쇄와 PDF는 `/resume`에 사용한 동일한 승인 data를 사용한다. PDF는 별도 사실 원본이 아니다.
7. 검증과 자동화는 build 결과를 관찰하되 application component에 test-runner 또는 CI 세부를 역의존시키지 않는다.
8. Terraform, AWS resource와 deployment flow는 component 변경 대상이 아니다.

## 2. Component Catalog

| ID | Component | 종류 | 변경 | 고수준 책임 |
|---|---|---|---|---|
| C01 | Profile Domain | TypeScript build-time domain | New | canonical profile type, 승인 완료 data, fail-fast validation과 ordered projection |
| C02 | Profile Presentation | Astro page/component | New | `/resume`, `/portfolio`, 공통 profile UI와 정적 semantic rendering |
| C03 | Profile Metadata Builder | TypeScript pure projection | New | page metadata와 conservative JSON-LD 생성 |
| C04 | Base Layout Metadata Host | Astro layout | Extend | metadata와 JSON-LD를 공통 `<head>`에 안전하게 출력 |
| C05 | Header Navigation | Astro server-rendered navigation / 기존 Preact compatibility | Extend | hydration과 무관한 desktop/mobile 공통 profile navigation model 제공 |
| C06 | Homepage Composition | Astro build-time composition | New/Refactor | homepage의 정확히 한 profile slot에 canonical profile CTA 조합 |
| C07 | Publication Catalog | Rust domain | New/Extend | `visibility` 정규화, homepage와 discoverable post projection 분리 |
| C08 | Link and Transclusion Transformer | Rust transformation | Extend | homepage reference route 정규화와 homepage transclusion 거부 |
| C09 | Output Materializer | Rust output boundary | Extend | dedicated homepage artifact와 일반 post/discovery artifact 물질화 |
| C10 | Static Data Gateway | TypeScript filesystem adapter | Extend | Astro에 homepage와 discoverable post 전용 read interface 제공 |
| C11 | Resume Document Boundary | Build-time document adapter | New | `/resume` 기반 print/PDF 생성·안정 URL 계약 |
| C12 | Verification and Automation Adapters | Test/build/CI boundary | New/Extend | build, link, browser, PDF, PBT evidence의 network-independent 실행 경계 |

## 3. Component Definitions

### C01 — Profile Domain

**목적**

이력서, 포트폴리오, homepage profile slot, metadata와 PDF가 공유하는 공개 사실을 저장소 소유의 단일 typed domain으로 제공한다.

**책임**

- `site/src/lib/profile/` 아래에서 profile type과 승인 완료 canonical data를 소유한다.
- 필수값, 선택값, URL, identifier, ordering과 collection shape를 dependency-free validator에 전달한다.
- 유효하지 않은 production data를 조용히 생략하지 않고 build를 중단할 수 있는 validation result를 제공한다.
- resume, portfolio와 homepage가 필요한 read-only projection을 canonical order로 제공한다.
- 승인되지 않은 draft, 근거와 approval state가 production data에 들어오지 않도록 authoring 경계를 문서화한다.

**Public interfaces**

- `CanonicalProfileSource`: production profile data를 반환하는 read-only interface
- `ProfileValidator`: raw typed data를 validated profile로 승격하는 fail-fast interface
- `ResumeProfileSelector`, `PortfolioProfileSelector`, `HomepageProfileSelector`: consumer별 read model projection

**의존 및 소비자**

- 외부 runtime dependency가 없다.
- C02, C03, C06, C11이 validated projection을 소비한다.
- C12가 validator와 projection의 observable contract를 검증한다.

**Functional Design 이관**

정확한 field별 validation rule, error taxonomy, optional section 생략 규칙, ordering invariant와 PBT property는 U1 Functional Design에서 정의한다.

### C02 — Profile Presentation

**목적**

승인된 profile projection을 한국어 정적 `/resume`와 `/portfolio` 경험으로 표현한다.

**책임**

- 기존 `BaseLayout`과 `--c-` design token을 사용하는 두 native static route를 제공한다.
- résumé에는 빠른 요약과 정적 `<details>` 기반 선택 상세를 제공한다.
- portfolio에는 승인된 case study의 문제, 역할, 핵심 결정, 구조, 결과와 배운 점을 구분해 표현한다.
- 공개 email, GitHub, 선택적인 evidence link와 `/resume.pdf` CTA를 semantic link로 표현한다.
- 두 route의 상호 이동과 현재 위치를 드러내는 profile-local navigation을 제공한다.
- logical heading, landmark, list, link, `<details>`와 print-friendly document order를 유지한다.
- 새 client script나 island 없이 서버 빌드 결과의 HTML에 핵심 콘텐츠를 포함한다.

**Public interfaces**

- `ProfileShellProps`: route identity, page heading, local navigation과 content slot
- `ResumePageProps`: validated résumé projection, metadata와 PDF path
- `PortfolioPageProps`: validated portfolio projection과 metadata
- `ContactActionsProps`, `ResumeSectionProps`, `CaseStudyProps`: 정적 하위 presentation contract

**의존 및 소비자**

- C01 projection과 C03 metadata를 입력으로 받고 C04 layout을 사용한다.
- C05의 global navigation과 공존하며 C11의 stable PDF link를 노출한다.
- C12가 generated route와 semantic output을 검증한다.

**Functional/NFR Design 이관**

section별 표시 조건, 정확한 markup ordering, CSS 수치, breakpoint, focus style, print page-break rule과 접근성 test matrix는 U1의 Functional/NFR Design에서 정의한다.

### C03 — Profile Metadata Builder

**목적**

page content와 동일한 승인 사실에서 검색·공유 metadata와 보수적인 구조화 데이터를 순수 projection으로 만든다.

**책임**

- `/resume`와 `/portfolio`에 고유 title, Korean description, canonical path, Open Graph와 Twitter 값을 제공한다.
- résumé는 `ProfilePage`와 승인된 최소 `Person` main entity를 사용한다.
- portfolio는 `CollectionPage`와 승인된 project item을 나타내는 `ItemList`를 사용한다.
- project item은 자료가 뒷받침하는 범위에서만 일반 `CreativeWork` 의미를 사용하며 조직, 고용, 성과 또는 소유권을 추론하지 않는다.
- 화면 content와 metadata가 별도의 사실 copy로 갈라지지 않도록 C01 projection만 입력으로 받는다.
- undefined optional fact를 JSON-LD에서 생략할 수 있는 typed result를 제공한다.

**Public interfaces**

- `ProfileMetadataBuilder`: route별 `ProfilePageMetadata` projection
- `ProfileStructuredDataBuilder`: approved projection에서 JSON-LD document 생성
- `ProfilePageMetadata`: C04가 소비하는 complete head contract

**의존 및 소비자**

- C01에만 domain dependency를 가진다.
- C02 route와 C04 layout이 결과를 소비한다.
- C12가 canonical, metadata와 visible fact consistency를 검증한다.

**Functional Design 이관**

정확한 title/description 문구, optional JSON-LD property, serialization validation과 mismatch failure rule은 U1 Functional Design에서 정의한다.

### C04 — Base Layout Metadata Host

**목적**

기존 공통 layout이 profile route의 complete metadata와 JSON-LD를 중복 markup 없이 출력하도록 한다.

**책임**

- 기존 기본 metadata prop과 호환되는 typed metadata input을 수용한다.
- canonical, Open Graph, Twitter와 optional JSON-LD를 한 `<head>`에서 출력한다.
- JSON-LD가 없을 때 기존 page 동작을 유지한다.
- profile page가 기존 header, theme, skip link, main landmark와 footer를 계속 사용하게 한다.
- JSON-LD payload를 executable client application code로 취급하지 않는다.

**Public interface**

- `BaseLayoutProps`: 기존 title/description/canonical contract와 optional structured-data contract

**의존 및 소비자**

- C03의 metadata result를 소비하고 C02 및 C06의 rendered content를 host한다.
- 기존 browser theme와 search island의 동작을 변경하지 않는다.

**Functional Design 이관**

serialization/escaping 방식, multiple JSON-LD document 처리와 기존 prop migration rule은 U1 Functional Design에서 확정한다.

### C05 — Header Navigation

**목적**

Résumé와 Portfolio를 desktop/mobile header에 일관되게 노출하면서 knowledge discovery와 profile navigation을 분리한다.

**책임**

- `/resume`와 `/portfolio`를 기존 Tags/Graph와 함께 primary header navigation에 제공한다.
- desktop markup과 mobile navigation prop이 같은 immutable navigation model을 사용하도록 한다.
- mobile에서도 Résumé와 Portfolio anchor를 server-rendered HTML에 포함하며 기존 `MobileNav` island의 hydration 또는 `open` 상태를 유일한 노출 경로로 사용하지 않는다.
- pathname에 따라 profile route의 `aria-current`를 제공한다.
- profile route를 search index, graph, tags 또는 nav tree에 주입하지 않는다.
- 기존 search와 theme control의 runtime behavior를 변경하지 않는다.

**Public interfaces**

- `NavigationItem`: href, label과 선택적인 presentation token
- `PrimaryNavigationModel`: desktop/mobile이 공유하는 ordered item collection
- 기존 `Header`의 `pathname` prop

**의존 및 소비자**

- route constant 외에 C01의 개인 사실을 소비하지 않는다.
- C02, homepage와 모든 기존 route에서 C04를 통해 렌더링된다.

**Functional Design 이관**

정확한 link label, icon 선택, 좁은 화면의 native/server-rendered markup 배치와 keyboard test는 U1 Functional/NFR Design에서 정의한다.

### C06 — Homepage Composition

**목적**

Rust가 제공한 homepage 전용 content 안의 정확히 한 profile slot을 canonical profile 소개와 내부 CTA로 build-time에 조합한다.

**책임**

- C10에서 dedicated homepage artifact를 읽고 C01에서 homepage profile projection을 읽는다.
- authored `Passion Project.md`에 선언된 profile slot이 정확히 하나인지 확인할 수 있는 composition contract를 제공한다.
- slot을 짧은 한국어 소개와 `/resume`, `/portfolio` CTA를 포함한 Astro fragment로 대체한다.
- profile 사실을 Vault Markdown에 복제하지 않는다.
- 기존 homepage의 다른 authored content와 오늘 발행된 일반 게시물 section을 보존한다.
- slot 누락 또는 중복을 silent fallback으로 처리하지 않고 build failure로 전달한다.

**Public interfaces**

- `HomepageProfilePanelProps`: canonical homepage projection과 두 internal route
- `HomepageComposer`: homepage artifact, rendered profile fragment와 existing dynamic section을 조합하는 build-time interface
- `ComposedHomepage`: C04가 host할 정적 HTML composition

**의존 및 소비자**

- C01, C02의 presentation primitive, C10과 기존 Markdown renderer를 소비한다.
- C04가 최종 composition을 host하고 C12가 exact-one slot과 CTA를 검증한다.

**Functional Design 이관**

slot token 문법, rendered HTML 경계, 오늘 글 section과의 정확한 조합 순서, 오류 문구와 idempotence property는 U2 Functional Design에서 정의한다.

### C07 — Publication Catalog

**목적**

Vault scan 결과를 link resolution에 필요한 authored source view, 정확히 하나인 homepage source와 일반 discoverable post view로 분리한다.

**책임**

- frontmatter `visibility: homepage`와 기본 `post` 값을 typed `PublicationScope`로 정규화한다.
- unknown visibility, homepage source 부재와 중복을 명확한 build error로 표현한다.
- homepage source를 직접 식별하는 `HomepageSource` projection을 제공한다.
- normal route, 목록, tag, 오늘 글, search, RSS, sitemap, preview, nav tree, graph, related, backlink/forward-link와 hub 파생 탐색에 사용할 `DiscoverablePosts` projection을 제공한다.
- 일반 note에서 homepage source를 참조할 수 있도록 별도의 linkable authored-source lookup을 제공한다.
- homepage outbound link가 discovery graph 또는 ranking에 영향을 주지 않게 downstream input boundary를 분리한다.
- projection 생성이 다른 일반 게시물의 순서, content와 discoverability를 바꾸지 않도록 immutable catalog를 제공한다.

**Public interfaces**

- `PublicationScope`: `Post | Homepage`
- `PublicationCatalog`: homepage, discoverable posts와 linkable source lookup을 보유한 validated catalog
- `HomepageSource`, `DiscoverablePosts`, `LinkableSources`: downstream별 read-only projections
- `PublicationCatalogBuilder`: scanned Vault index를 validated catalog로 변환

**의존 및 소비자**

- 기존 scanner의 parsed frontmatter와 `VaultIndex`를 입력으로 받는다.
- C08과 C09가 projections을 소비한다.
- C12가 partition, preservation과 determinism을 검증한다.

**Functional Design 이관**

unknown value parsing, error taxonomy, exact collection representation, graph edge filtering, invariant/idempotence property와 migration behavior는 U2 Functional Design에서 정의한다.

### C08 — Link and Transclusion Transformer

**목적**

homepage source가 일반 post route를 갖지 않는 상태에서도 authored reference의 의미를 명시적으로 처리한다.

**책임**

- 일반 note의 homepage-source wikilink target을 `/`로 정규화한다.
- alias와 지원되는 heading/block fragment 의미를 public route target에 보존한다.
- homepage source를 대상으로 하는 full, heading, block transclusion을 명확한 build error로 거부한다.
- homepage outbound links를 homepage rendering에는 사용할 수 있지만 discovery graph 입력에는 제공하지 않는다.
- 기존 syntax parser와 code-fence 보호 규칙을 재사용한다.

**Public interfaces**

- `PublicationLinkResolver`: authored reference를 public route target으로 해석
- `TransclusionPolicy`: transclusion 허용 여부와 diagnostic을 반환
- 기존 transform entry point의 publication-aware variant

**의존 및 소비자**

- C07의 linkable source와 scope lookup을 소비한다.
- C09가 homepage와 일반 post content를 변환할 때 호출한다.
- C12가 wikilink variant와 거부 경로를 검증한다.

**Functional Design 이관**

fragment normalization table, alias rendering, diagnostic text, malformed reference와 collision 처리 규칙은 U2 Functional Design에서 정의한다.

### C09 — Output Materializer

**목적**

validated publication projections를 source 종류에 맞는 generated contract로 물질화한다.

**책임**

- homepage source를 일반 `posts/{slug}.md`와 `meta/{slug}.json`에서 분리된 dedicated homepage artifact로 출력한다.
- 일반 post Markdown와 metadata는 C07의 discoverable post projection만 대상으로 출력한다.
- search, graph, preview, nav tree, related와 backlink/forward-link output은 discoverable projection만 사용한다.
- dedicated homepage artifact가 C10에서 명시적으로 읽을 수 있는 typed shape를 제공한다.
- 반복 실행에서 제외된 homepage의 stale normal-post artifact가 공개 결과에 남지 않도록 output manifest 경계를 소유한다.
- generated content와 public JSON을 authored source로 취급하지 않는다.

**Public interfaces**

- `OutputMaterializer`: catalog와 publication-aware graph/transform 결과를 output directory에 기록
- `HomepageArtifact`: homepage body와 필요한 최소 metadata의 generated contract
- `GeneratedOutputManifest`: 생성된 normal post, homepage, discovery artifact inventory

**의존 및 소비자**

- C07 projections, C08 transformer와 기존 search/preview/nav/related builders를 소비한다.
- C10이 generated contract를 읽는다.
- C12가 manifest와 excluded surface를 검증한다.

**Functional Design 이관**

정확한 artifact filename/schema, stale cleanup 범위, write ordering, atomicity와 serialization property는 U2 Functional Design에서 정의한다.

### C10 — Static Data Gateway

**목적**

Astro가 filesystem layout과 publication filtering을 반복 구현하지 않도록 build-time read interface를 제공한다.

**책임**

- dedicated homepage artifact를 읽는 `getHomepage...` interface를 제공한다.
- 일반 page/list/tag/RSS consumer에 discoverable post metadata와 content만 제공한다.
- profile route와 homepage route가 generated post slug 예외에 의존하지 않게 한다.
- generated contract 누락 또는 malformed data를 consumer별 빈 값으로 숨기지 않고 build diagnostic으로 전달할 수 있다.
- 기존 graph, preview, hub와 tag getter가 normal publication contract를 소비하게 유지한다.
- module-level cache는 read-only generated result에만 적용한다.

**Public interfaces**

- `HomepageDataGateway`: dedicated homepage artifact read
- `PostDataGateway`: discoverable post metadata/content read
- 기존 graph, hub, tag와 preview query interface의 publication-safe form

**의존 및 소비자**

- C09의 generated contract에만 filesystem dependency를 가진다.
- C06, 기존 Astro route, RSS와 sitemap build가 소비한다.
- C12가 missing/malformed contract와 route exclusion을 검증한다.

**Functional Design 이관**

exact path, parse/validation error type, cache invalidation과 기존 getter compatibility strategy는 U2 Functional Design에서 정의한다.

### C11 — Resume Document Boundary

**목적**

동일한 승인 data로 렌더링된 `/resume`를 브라우저 인쇄와 downloadable PDF에 연결한다.

**책임**

- C02의 complete résumé route를 PDF rendering source로 사용한다.
- print media가 화면 전용 navigation과 장식을 숨길 수 있는 document boundary를 제공한다.
- generated PDF를 Git-tracked `site/public/resume.pdf`에 갱신하고 public `/resume.pdf` contract를 유지한다.
- PDF에 별도 hand-authored fact source를 두지 않는다.
- generation result와 file identity를 C12가 parity와 visual verification에 사용할 수 있게 반환한다.
- PDF 생성은 build-time/local automation이며 runtime browser service가 아니다.

**Public interfaces**

- `ResumeDocumentRequest`: rendered résumé source, target path와 deterministic generation context
- `ResumeDocumentResult`: output path, generation status와 verification input
- `ResumeDocumentLink`: stable `/resume.pdf` public contract

**의존 및 소비자**

- C01의 승인 projection과 C02의 rendered route를 간접 입력으로 받는다.
- C02가 stable link를 노출하고 C12가 file/parity/print evidence를 검증한다.

**Functional/NFR Design 이관**

browser/tool 선택, page size, margin, font readiness, deterministic metadata, parity extraction과 visual threshold는 U1 NFR Requirements/NFR Design에서 정의한다.

### C12 — Verification and Automation Adapters

**목적**

domain, Rust publication, Astro route, browser, print/PDF와 CI gate를 application runtime 밖에서 일관되게 실행하고 evidence를 수집한다.

**책임**

- TypeScript profile validation, Rust unit/integration/PBT, Astro build와 link/content assertion을 호출하는 adapter를 제공한다.
- 좁은/넓은 viewport, keyboard, accessible name, focus, reduced motion와 print media smoke를 browser adapter로 실행한다.
- PDF existence, stable link, render와 web/PDF fact parity를 검증한다.
- PBT seed와 shrunk counterexample을 test runner 및 CI report에서 보존한다.
- 동일 명령을 local automation과 Jenkins의 최소 관련 stage에서 재사용할 수 있게 한다.
- fixture와 test가 외부 network 또는 service availability에 의존하지 않게 한다.
- deploy, Terraform 또는 AWS mutation command를 verification plan에 포함하지 않는다.

**Public interfaces**

- `VerificationPlan`: 실행할 unit/integration/browser/document gate의 immutable description
- `VerificationAdapter`: 한 gate를 실행하고 structured result를 반환
- `VerificationReport`: command, status, evidence, PBT seed/counterexample와 skipped reason을 집계
- `CiVerificationAdapter`: 동일 gate를 Jenkins execution context에 연결

**의존 및 소비자**

- C01~C11의 public contract와 generated result를 관찰한다.
- application component는 C12에 의존하지 않는다.
- local operator와 Jenkins만 C12 결과를 소비한다.

**Functional/NFR Design 이관**

PBT framework, generator, shrink/seed syntax, Playwright matrix, command line, timeout, report schema와 pass/fail threshold는 각 unit의 NFR Requirements/NFR Design 및 Build and Test에서 정의한다.

## 4. External and Generated Boundaries

| Boundary | 설계 취급 |
|---|---|
| `Areas/Notes/Passion Project.md` | C07이 읽는 외부 authored source. 이후 승인된 scoped edit에서 `visibility: homepage`와 profile slot만 소유하며 profile fact는 소유하지 않음 |
| 다른 Vault note/attachment | read-only input이며 이 feature의 edit 대상이 아님 |
| `content/`, generated `site/public/*.json`, `site/dist/` | C09 또는 build가 재생성하는 output. 직접 동작 원본으로 편집하지 않음 |
| `site/public/resume.pdf` | C11이 canonical web résumé에서 갱신하는 version-controlled document output. 별도 fact source가 아님 |
| `infra/`와 AWS | compatibility reference only. component/interface 변경, mutation 또는 deployment 없음 |
| Public GitHub/repository evidence | content draft 입력. C01 production data에 반영하기 전 사용자 fact approval 필요 |

## 5. Ownership and Traceability Summary

| Capability | Primary owner | Supporting components | Requirements / Stories |
|---|---|---|---|
| Canonical approved profile | C01 | C03, C12 | FR-001, FR-002, ST-E01, ST-E02 |
| Native résumé experience | C02 | C03, C04, C05, C11 | FR-003, FR-004, FR-006, FR-007, FR-010~FR-013, ST-U01~ST-U03, ST-U05 |
| Portfolio case studies | C02 | C01, C03, C04 | FR-003, FR-005~FR-007, FR-011~FR-013, ST-U01, ST-U04, ST-U05 |
| Global profile navigation | C05 | C02, C04 | FR-003, FR-012, ST-U01 |
| Homepage profile slot | C06 | C01, C02, C10 | FR-008, FR-012, ST-U01, ST-U06 |
| Homepage-only publication | C07 | C08, C09, C10 | FR-009, FR-017, ST-U06 |
| Homepage reference semantics | C08 | C07, C09 | FR-009, FR-012, ST-U06 |
| Generated contract separation | C09 | C07, C08, C10 | FR-009, FR-017, ST-U06 |
| Print and committed PDF | C11 | C01, C02, C12 | FR-004, FR-010, ST-U03, ST-E02 |
| Example/PBT/browser/CI gates | C12 | C01~C11 | FR-014~FR-016, FR-018, ST-E03, ST-E04 |

## 6. Explicit Non-Components

- Runtime résumé or portfolio API
- Database, CMS, contact form or analytics pipeline
- New Preact island or client-side profile state store
- External image/CDN/embed integration
- Terraform or AWS resource change
- Deployment service
- Production draft/approval workflow

Detailed business rules, algorithms, validation predicates, generated schemas, test framework choices and visual measurements are intentionally deferred to unit-level Functional Design and NFR stages.
