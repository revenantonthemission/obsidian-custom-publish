# Application Design Plan — 이력서·포트폴리오 재구축

## 문서 상태

- **단계**: INCEPTION - Application Design / Planning
- **상태**: Artifact 승인됨 — Application Design 완료
- **Plan 승인**: 2026-07-23T10:22:29Z
- **Artifact 승인**: 2026-07-23T10:46:02Z
- **답변 검증**: 2026-07-23T10:10:20Z — A/B/A/B/A/A, clarification 불필요
- **Artifact 검증**: 2026-07-23T10:34:30Z — 필수 문서, 추적성, 의존성, Markdown와 Mermaid 검증 통과
- **상세 수준**: Standard
- **작성일**: 2026-07-23
- **입력**:
  - `aidlc-docs/inception/requirements/requirements.md`
  - `aidlc-docs/inception/user-stories/stories.md`
  - `aidlc-docs/inception/user-stories/personas.md`
  - `aidlc-docs/inception/plans/execution-plan.md`
  - `aidlc-docs/inception/reverse-engineering/`
- **예정 산출물**:
  - `aidlc-docs/inception/application-design/components.md`
  - `aidlc-docs/inception/application-design/component-methods.md`
  - `aidlc-docs/inception/application-design/services.md`
  - `aidlc-docs/inception/application-design/component-dependency.md`
  - `aidlc-docs/inception/application-design/application-design.md`

## 1. 목적과 설계 깊이

승인된 제품 요구사항과 사용자 스토리를 현재 Rust 전처리기와 Astro 정적 사이트의 고수준 application architecture로 변환한다. 이 단계는 컴포넌트 책임, 인터페이스, build-time service orchestration, 의존 방향과 데이터 흐름을 확정한다.

다음은 이 단계에서 다루지 않는다.

- validation과 filtering의 세부 알고리즘 및 모든 business rule;
- PBT framework, generator와 property의 상세 설계;
- CSS 수치, 최종 typography, breakpoint와 시각적 polish;
- 실제 신원·경력·프로젝트 사실 작성과 승인;
- 구현, feature branch 생성, 외부 Vault 편집;
- Terraform 편집, AWS mutation 또는 배포.

세부 business rule은 Units Generation 이후 각 unit의 Functional Design에서, PBT framework와 품질 수치는 NFR Requirements에서 확정한다.

## 2. 확정된 입력과 다시 열지 않는 결정

- 한국어 정적 경로 `/resume`와 `/portfolio`를 제공한다.
- 두 경로는 저장소 소유의 typed canonical profile data를 함께 사용한다.
- 이력서는 요약과 정적 `<details>` 기반 선택 상세를 결합한다.
- 포트폴리오는 승인된 프로젝트 3~6개와 여섯 가지 case-study 항목을 제공한다.
- 공개 이메일과 GitHub CTA는 사용자 사실 승인 뒤에만 제공한다.
- 새 client JavaScript, Preact island, 외부 runtime API 또는 외부 runtime dependency를 추가하지 않는다.
- `Passion Project.md`만 외부 Vault 편집 범위로 허용한다.
- 홈페이지 전용 원본은 일반 route, 목록, tag, 오늘 글, search, RSS, sitemap, nav tree, previews, graph, related, backlink/forward-link와 hub 파생 탐색에서 제외한다.
- 홈페이지 원본의 일반 탐색 제외가 다른 게시물의 순서, 콘텐츠와 탐색 가능성을 바꾸어서는 안 된다.
- 구조화 데이터는 승인된 사실만 사용하며 페이지 의미보다 강한 schema 타입을 주장하지 않는다.
- 다운로드 PDF는 version control에 포함하고 웹 이력서와 fact-parity gate를 둔다.
- WCAG 2.2 AA, responsive, print/PDF와 network-independent test 목표를 유지한다.
- PBT full mode와 최소 Jenkins test/seed 범위는 유지한다.
- Infrastructure Design은 모든 unit에서 실행하지만 no-change compatibility design이며, 별도 승인 없이 Terraform/AWS/deploy를 변경하지 않는다.
- Construction은 U1 전체 loop, U2 전체 loop, U3 전체 loop, 통합 Build and Test 순서다.
- Git Flow base reconciliation 전에는 feature branch를 만들지 않는다.

## 3. 현재 시스템에서 확인된 설계 압력

### 3.1 Astro

- `index.astro`는 현재 `getPostContent("passion-project")`와 특정 한국어 heading 정규식에 의존한다.
- `BaseLayout.astro`는 title, description, canonical, 기본 Open Graph와 Twitter metadata를 제공하지만 JSON-LD 주입 계약은 없다.
- `getAllPostMeta()`는 모든 `content/meta/*.json`을 반환하고 post route, tag, RSS, 오늘 글과 기타 목록이 이를 공유한다.
- native profile route, profile domain package, profile-specific component 또는 test package가 없다.
- Header의 desktop/mobile link 목록은 각각 별도 markup/props로 관리된다.

### 3.2 Rust와 generated contract

- 모든 Vault note가 하나의 `VaultIndex.posts`에 들어가고 output/search/preview/nav/graph/related가 전체 집합을 순회한다.
- 현재 `passion-project`는 일반 route와 sitemap, RSS, search, preview, nav tree, graph뿐 아니라 다른 일반 글의 backlinks와 related 결과에도 영향을 준다.
- homepage-only 상태를 site consumer마다 반복 필터링하면 한 surface를 빠뜨릴 위험이 있다.
- 권장 구조는 scan 결과에서 typed publication scope를 검증한 뒤, 일반 게시물 projection과 전용 homepage artifact를 구조적으로 분리하는 것이다.
- 홈페이지에서 일반 글로 향하는 outbound wikilink는 화면 동작을 위해 필요하지만 discovery graph와 ranking에는 영향을 주지 않아야 한다.

### 3.3 콘텐츠와 문서 출력

- `Passion Project.md`의 현재 `# Portfolio.` 블록이 GitHub 및 두 외부 Notion 링크를 소유한다.
- canonical profile fact를 Vault에도 복제하면 single-source 요구사항과 승인 상태가 어긋날 수 있다.
- PDF가 수동 편집된 별도 사실 원본이 되면 웹/PDF parity를 보장하기 어렵다.

## 4. 잠정 capability와 component 후보

사용자 답변 전의 후보이며 최종 component 이름과 책임은 답변 검증 후 확정한다.

| Capability | 잠정 Component/Service | 고수준 책임 |
|---|---|---|
| Canonical profile | Profile Domain | type, approved data, fail-fast validation, ordered selectors |
| Profile presentation | Profile Components | shared layout/navigation/contact와 route-specific resume/portfolio sections |
| Metadata | Profile Metadata Builder | page metadata와 conservative JSON-LD projection |
| Homepage composition | Homepage Composition Service | Vault-derived content와 repository-owned profile intro/CTA의 build-time 조합 |
| Publication boundary | Publication Catalog | homepage source와 discoverable posts의 typed projection 및 validation |
| Generated output | Output Materializer | homepage artifact와 normal post/discovery artifacts의 구조적 분리 |
| Site data access | Static Data Gateway | dedicated homepage getter와 post-only metadata/content getters |
| PDF | Resume Document Service | approved web route 기반 PDF generation, stable delivery와 parity evidence |
| Quality orchestration | Verification Adapters | build/link/metadata/browser/print/PDF evidence를 기존 runner와 연결 |

runtime service, server endpoint 또는 database는 추가하지 않는다. 위 service는 모두 build-time orchestration 또는 순수 projection을 뜻한다.

## 5. 실행 체크리스트

### 5.1 Planning and Decision Gate

- [x] Application Design 상세 규칙과 승인된 execution plan을 읽는다.
- [x] 승인된 requirements, stories와 personas를 읽는다.
- [x] 실제 Astro/Rust/Vault/generated 경계를 검토한다.
- [x] 이미 확정된 제품 결정을 질문 대상에서 제외한다.
- [x] application design plan과 context-specific 질문을 생성한다.
- [x] 초기 6개 질문과 필요 시 추가된 모든 follow-up `[Answer]` 값을 수집한다.
- [x] 모든 답변의 선택지 형식과 구체성을 검증한다.
- [x] 답변 사이의 모순과 requirements/stories 충돌을 분석한다.
- [x] 애매한 답변이 없어 follow-up `[Answer]` 질문이 필요하지 않음을 확인한다.
- [x] 모든 애매함을 해소하고 확정 설계 결정을 이 계획에 반영한다.
- [x] application design generation plan 승인 프롬프트를 audit에 기록한다.
- [x] 사용자의 명시적 plan 승인을 기록한다.

### 5.2 Mandatory Artifact Generation

- [x] `components.md`에 component 이름, 목적, 책임과 public interface를 정의한다.
- [x] `component-methods.md`에 고수준 method signature, input/output type과 목적을 정의한다.
- [x] 세부 business rule은 Functional Design으로 명시적으로 이관한다.
- [x] `services.md`에 build-time service 책임, interaction과 orchestration을 정의한다.
- [x] `component-dependency.md`에 dependency matrix와 communication pattern을 정의한다.
- [x] `component-dependency.md`에 Mermaid data-flow 및 sequence diagram을 추가한다.
- [x] 모든 Mermaid diagram에 동등한 text alternative를 제공한다.
- [x] `application-design.md`에 네 세부 문서를 일관된 single view로 통합한다.

### 5.3 Completeness and Consistency

- [x] FR-001~FR-018을 하나 이상의 component/service/interface에 추적한다.
- [x] ST-U01~ST-U06과 ST-E01~ST-E04의 owning component와 interaction을 추적한다.
- [x] homepage-only 제외 surface 전체와 다른 post 보존 경계를 확인한다.
- [x] source/generated, external Vault, approved-fact와 PDF parity 경계를 확인한다.
- [x] no-new-client-JS, no-runtime-service와 no-deploy 원칙을 확인한다.
- [x] Application Design의 PBT enforcement가 N/A임을 기록하고 later-stage handoff를 보존한다.
- [x] 실제 구현 세부가 Functional/NFR Design을 선점하지 않는지 검토한다.
- [x] 독립 검토로 누락, 순환 의존, 중복 source와 승인 경계 위반이 없는지 확인한다.
- [x] Markdown link, heading, table와 Mermaid render를 검증한다.
- [x] 완료 checklist와 `aidlc-state.md`, `audit.md`를 갱신한다.
- [x] Application Design artifact approval gate를 제시하고 명시적 승인을 기다린다.

## 6. Application Design Questions

아래 질문은 공개 결과, authored contract 또는 component ownership을 실제로 바꾸는 미확정 결정만 다룬다. 각 `[Answer]:` 뒤에 선택한 알파벳을 입력해 주세요. 원하는 선택지가 없으면 `X`를 선택하고 같은 줄에 구체적인 규칙을 적어 주세요.

| Mandatory Question Category | Covered By |
|---|---|
| Component Identification | Q1 profile domain, Q2 homepage composition |
| Component Methods | Q1 validation/approval contract, Q5 link/transclusion contract |
| Service Layer Design | Q2 homepage orchestration, Q6 PDF generation/delivery |
| Component Dependencies | Q3 navigation/search, Q4 Vault→Rust contract, Q5 route resolution |
| Design Patterns | Q1 domain representation, Q2 composition, Q4 typed publication scope |

### Question 1 — canonical profile 형식과 사실 승인 경계

공용 프로필 데이터와 사용자 사실 승인 상태를 어떤 계약으로 관리할까요?

A) `site/src/lib/profile/` TypeScript domain package가 type, 승인 완료 data와 새 dependency 없는 fail-fast validator를 소유하고, 초안·근거·승인 기록은 production data 밖의 AI-DLC review artifact에서 관리한다. 승인 전 사실은 application source에 넣지 않는다. **(권장)**

B) version-controlled JSON을 canonical data로 두고 TypeScript loader/type/validator가 build 시 검증한다. 초안·근거·승인 기록은 별도 review artifact로 관리한다.

C) TypeScript canonical data의 각 atomic public fact에 `draft | approved` 상태를 보관하고, 모든 렌더링 사실이 승인된 item만 public projection에 허용하며 draft가 하나라도 남으면 build를 실패시킨다.

X) Other (please describe after [Answer]: tag below) — 구체적인 module, validation과 approval 경계를 설명한다.

[Answer]: A) `site/src/lib/profile/` TypeScript domain package가 type, 승인 완료 data와 새 dependency 없는 fail-fast validator를 소유하고, 초안·근거·승인 기록은 production data 밖의 AI-DLC review artifact에서 관리한다. 승인 전 사실은 application source에 넣지 않는다.

### Question 2 — 홈페이지 프로필 영역의 ownership과 위치

짧은 소개와 Résumé·Portfolio CTA 카드를 누가 소유하고 홈페이지 어디에 조합할까요?

A) canonical profile data를 소비하는 Astro component를 Vault 본문보다 먼저 고정 배치한다. `Passion Project.md`에서는 기존 임시 Portfolio 블록만 제거한다.

B) `Passion Project.md`의 현재 Portfolio 블록을 명시적인 profile slot으로 교체하고, build-time Homepage Composition Service가 정확히 한 slot을 검증한 뒤 canonical-data 기반 Astro component를 그 위치에 삽입한다.

X) Other (please describe after [Answer]: tag below) — 공유 프로필 사실은 canonical data 밖에 중복하지 않는다는 전제 아래 source ownership과 삽입 위치 규칙을 설명한다.

[Answer]: B) `Passion Project.md`의 현재 Portfolio 블록을 명시적인 profile slot으로 교체하고, build-time Homepage Composition Service가 정확히 한 slot을 검증한 뒤 canonical-data 기반 Astro component를 그 위치에 삽입한다.


### Question 3 — profile의 전역 navigation 노출

새 profile route를 기존 블로그 navigation과 어떻게 연결할까요? 어느 선택에서도 홈페이지 CTA, 두 profile page의 상호 링크, sitemap과 외부 검색 metadata는 제공한다.

A) desktop/mobile 공통 Header에 Résumé와 Portfolio를 추가하되 지식 콘텐츠용 내부 search, graph, tags와 nav tree에는 넣지 않는다. 

B) Header는 유지하고 홈페이지 CTA와 두 profile page의 상호 링크만 제공한다.

X) Other (please describe after [Answer]: tag below) — 새 client-side search 동작을 추가하지 않는 범위에서 각 navigation/discovery surface별 포함 규칙을 설명한다.

[Answer]: A) desktop/mobile 공통 Header에 Résumé와 Portfolio를 추가하되 지식 콘텐츠용 내부 search, graph, tags와 nav tree에는 넣지 않는다.


### Question 4 — Vault의 homepage-only 선언 문법

`Passion Project.md`가 homepage source임을 authored frontmatter에서 어떤 문법으로 선언할까요? 내부 구현은 어느 선택에서도 typed `PublicationScope`로 정규화하고 정확히 한 homepage source만 허용한다.

A) `homepage_only: true` boolean field — 기존 `is_hub` 계열 snake_case 관례와 맞는 최소 계약

B) `visibility: homepage` enum field — `post` 기본값과 `homepage` 값을 갖는 명시적 publication scope

C) 예약 tag를 사용한다 — 예: `homepage-only`

X) Other (please describe after [Answer]: tag below) — 정확한 frontmatter key/value와 기본값을 설명한다.

[Answer]: B) `visibility: homepage` enum field — `post` 기본값과 `homepage` 값을 갖는 명시적 publication scope

### Question 5 — 일반 글에서 homepage source를 참조하는 의미

일반 Vault note가 homepage source를 wikilink 또는 transclusion할 경우 어떻게 처리할까요?

A) base·alias·heading·block을 포함한 모든 일반 wikilink variant는 route target을 `/`로 정규화하고 display alias와 지원되는 fragment 의미를 보존한다. full·heading·block을 포함한 모든 homepage-source transclusion은 중복 공개를 막기 위해 명확한 build error로 거부한다. **(권장)**

B) base·alias·heading·block을 포함한 모든 일반 wikilink와 모든 full·heading·block transclusion을 authoring error로 보고 build를 실패시킨다.

X) Other (please describe after [Answer]: tag below) — link variant별 target/fragment/alias와 transclusion variant별 허용·오류 규칙을 설명한다.

[Answer]: A) base·alias·heading·block을 포함한 모든 일반 wikilink variant는 route target을 `/`로 정규화하고 display alias와 지원되는 fragment 의미를 보존한다. full·heading·block을 포함한 모든 homepage-source transclusion은 중복 공개를 막기 위해 명확한 build error로 거부한다.

### Question 6 — print/PDF 콘텐츠와 공개 버전 계약

웹 상세, 브라우저 인쇄와 다운로드 PDF의 관계를 어떻게 정할까요? 모든 선택은 같은 승인된 canonical data와 build-time browser rendering을 사용하고 fact-parity gate를 둔다.

A) 인쇄와 PDF 모두 웹의 승인된 상세 전체를 포함하고, Git-tracked `site/public/resume.pdf`를 안정 URL `/resume.pdf`에서 갱신한다. Git history를 version history로 사용한다. **(권장)**

B) 인쇄와 PDF는 채용 검토용 핵심 요약만 포함하고 웹에서만 확장 상세를 제공하며, 안정 URL `/resume.pdf`를 갱신한다.

C) 브라우저 인쇄는 승인된 상세 전체를 포함하고 다운로드 PDF는 간결한 요약으로 분리하며, 안정 URL `/resume.pdf`를 갱신한다.

D) 승인된 상세 전체 PDF를 날짜 또는 version이 포함된 URL로 추가하고 stable latest link도 제공한다. 과거 버전은 각각 계속 공개 승인을 유지하는 동안만 보존하며, 공개가 철회된 사실을 포함한 버전은 public asset에서 제거한다.

X) Other (please describe after [Answer]: tag below) — 콘텐츠 깊이, path, version, approval과 retention 규칙을 설명한다.

[Answer]: A) 인쇄와 PDF 모두 웹의 승인된 상세 전체를 포함하고, Git-tracked `site/public/resume.pdf`를 안정 URL `/resume.pdf`에서 갱신한다. Git history를 version history로 사용한다.

### 6.1 Answer Validation Result

| Question | Answer | Confirmed Design Decision |
|---|---|---|
| Q1 | A | `site/src/lib/profile/` TypeScript domain package가 type, 승인 완료 data, dependency-free fail-fast validation을 소유한다. Draft, public evidence와 approval record는 production data 밖의 AI-DLC review artifact에 둔다. |
| Q2 | B | `Passion Project.md`는 정확히 하나인 profile slot만 선언한다. Homepage Composition Service가 canonical-data 기반 Astro component를 build-time에 그 위치에 삽입한다. |
| Q3 | A | Résumé와 Portfolio를 desktop/mobile Header 및 profile-local navigation에 제공한다. Knowledge search, graph, tags와 nav tree에는 profile entry를 추가하지 않는다. |
| Q4 | B | authored frontmatter는 `visibility: homepage`를 사용하고 기존 문서의 기본값은 `post`다. Rust는 이를 typed `PublicationScope`로 정규화하며 homepage source는 정확히 하나여야 한다. |
| Q5 | A | 모든 일반 wikilink variant는 homepage route `/`와 지원 fragment로 정규화하고 alias를 보존한다. Homepage source를 대상으로 하는 모든 transclusion variant는 build error다. |
| Q6 | A | Browser print와 committed PDF는 승인된 web detail 전체를 포함한다. PDF는 `site/public/resume.pdf`에서 Git으로 version 관리하고 `/resume.pdf`로 제공한다. |

**Format Validation**: Passed. 모든 답변은 해당 질문의 유효한 option letter와 정확한 선택 내용을 사용한다.

**Ambiguity Validation**: Passed. 혼합 선택, 조건 없는 "상황에 따라", 미정 항목 또는 undefined term이 없다.

**Consistency Validation**: Passed. Q1→Q2→Q6의 승인 사실 흐름, Q4→Q5의 publication/reference 흐름, Q3의 static navigation 경계가 서로 일관된다.

**Requirements Validation**: Passed. FR-001, FR-002, FR-008~FR-013, FR-017~FR-018과 관련 stories를 위반하지 않으며 새 client JavaScript, runtime service, Terraform/AWS/deploy 또는 Git mutation을 승인하지 않는다.

**Independent Review**: Passed. 추가 clarification은 필요하지 않다.

## 7. 답변 검증 규칙

- 초기 6개의 질문과 답변 검증 중 추가된 모든 follow-up 질문에 답해야 한다.
- 각 답변은 해당 질문의 유효한 선택지 문자로 시작해야 한다.
- `X`를 선택하면 같은 줄에 구현 가능한 구체 규칙을 설명해야 한다.
- `A와 B 혼합`, `상황에 따라`, `잘 모르겠음`처럼 결정 기준이 없는 답변은 clarification 대상이다.
- 이미 승인된 requirements, stories, no-deploy 경계와 충돌하는 답변은 그대로 채택하지 않고 충돌을 구체적으로 설명한 follow-up 질문을 만든다.
- 실제 이메일, 경력, 프로젝트나 성과 값을 적어도 이 질문 답변만으로 public fact approval로 간주하지 않는다.
- 답변 검증 후 보수적인 JSON-LD 계약을 설계한다.
  - `/resume`: `ProfilePage`와 승인된 `Person` main entity
  - `/portfolio`: `CollectionPage`와 승인된 project의 `ItemList`/`CreativeWork`; 실제 공개 code URL과 의미가 있는 경우에만 더 구체적인 타입
- PBT framework 선택은 각 unit의 NFR Requirements로 이관한다.
- Playwright browser/viewport matrix와 세부 print assertion은 U3 NFR Requirements와 NFR Design으로 이관한다.

## 8. Plan Approval and Generation Boundary

모든 답변이 형식·명확성·일관성 검증을 통과하면 확정 결정을 이 문서에 반영하고 application design generation plan 승인 게이트를 제시한다. 사용자의 명시적 plan 승인 전에는 `aidlc-docs/inception/application-design/`의 최종 설계 산출물을 생성하지 않는다.

Application Design 자체는 PBT enforcement table의 적용 단계가 아니므로 현재 준수 판정은 **N/A**다. U1/U2의 property identification, language별 framework와 generators, shrinking, seed, CI 의무는 승인된 execution plan에 따라 이후 단계로 전달한다.
