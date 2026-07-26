# U1 Functional Design — Frontend Components

## 문서 상태

- **단계**: CONSTRUCTION — U1 Functional Design
- **범위**: C02 Profile Presentation, C04 Base Layout Metadata Host, C05 Header Navigation과 C11 Resume Document Boundary의 frontend-facing contract
- **상태**: 완료 및 승인됨 — 2026-07-23T15:02:53Z
- **입력 결정**: U1 Functional Design 답변 A/A/A/A/A/A/A/A/A/A/A/A/A/A
- **표현 방식**: build-time에 완성되는 정적 HTML과 renderer-neutral read model
- **사실 승인 경계**: 이 문서는 구조와 동작만 정의한다. 실제 이름, 연락처, 경력, 프로젝트, 성과와 URL을 승인하거나 production content로 만들지 않는다.

## 1. 범위와 고정 원칙

이 설계는 validated profile projection을 두 개의 정적 route와 공통 site shell에 표현하는 계약이다. Canonical fact의 형태, validation과 selector는 C01이 소유하고 metadata projection은 C03이 소유한다. 이 문서의 component는 raw candidate, draft, evidence record 또는 approval state를 입력으로 받지 않는다.

다음 원칙은 binding이다.

1. `/resume`와 `/portfolio`는 한국어 정적 route이며 직접 URL로 접근할 수 있다.
2. 사용자 대면 핵심 콘텐츠, 연락 CTA, evidence link, profile-local navigation과 Header의 profile anchor는 최초 server-rendered HTML에 존재한다.
3. 새 client state, client-side JavaScript, Preact island, runtime API, database, 연락 form 또는 외부 runtime service를 추가하지 않는다.
4. Résumé 상세는 native `<details>`를 사용하고 `open` 상태 없이 렌더링한다. JavaScript가 없어도 `<summary>`로 열고 닫을 수 있다.
5. Portfolio case study는 프로젝트 순서와 여섯 필수 dimension 순서를 보존한다.
6. Typed paragraph/list block은 text와 list node로 렌더링한다. Raw HTML, arbitrary Markdown 또는 unvalidated `set:html` 입력을 허용하지 않는다.
7. Optional data가 없으면 해당 section, heading, CTA와 placeholder를 함께 생략한다. 값이 제공됐지만 invalid한 경우에는 생략으로 회복하지 않고 C01/C03/C11 gate가 public output 전에 실패한다.
8. CSS 수치, breakpoint, viewport, focus style, print margin·pagination, browser matrix와 PDF tool은 U1 NFR Requirements/NFR Design으로 이관한다.

## 2. Static Frontend Composition

두 profile route는 동일한 document hierarchy를 사용한다.

1. `BaseLayout`
   1. 기존 skip link
   2. `Header`
   3. 단 하나의 `main` landmark
   4. `ProfileShell`
      1. route의 단 하나인 `h1`
      2. h1 바로 뒤의 `ProfileLocalNavigation`
      3. route별 content
   5. 기존 footer

`ProfileShell`은 Header나 footer를 복제하지 않는다. `BaseLayout`은 기존 theme/search behavior를 보존하고 C03의 metadata만 `<head>`에 host한다. Route별 component는 같은 validated input에서 body read model과 metadata를 각각 만들게 하되, metadata 문자열을 page component 안에서 다시 작성하지 않는다.

Heading level은 다음과 같이 계산한다.

- route title은 정확히 하나의 `h1`이다.
- page의 직접 section은 `h2`다.
- section 안의 collection group 또는 반복 item title은 `h3`다.
- group 아래의 item title이나 case-study dimension은 필요한 경우 `h4`다.
- 장식용 label을 heading으로 만들지 않으며 heading level을 건너뛰지 않는다.

## 3. Frontend Read Models and Props

아래 type 이름은 renderer-neutral interface를 설명한다. 모든 collection은 read-only이며 C01 selector가 canonical order로 제공한다.

### 3.1 공통 계약

| Contract | Required fields | 의미 |
|---|---|---|
| `ProfileRouteIdentity` | `resume` 또는 `portfolio`, pathname | 현재 route와 current-page semantics |
| `ProfileShellProps` | route identity, fixed route label, local navigation, metadata, content slot | 공통 profile shell |
| `ProfileLocalNavigationItem` | `href`, text label, `current` | `홈`, `Résumé`, `Portfolio` anchor |
| `ContactActionView` | kind, `href`, visible purpose label | 승인 email, GitHub와 선택 추가 link의 semantic anchor |
| `EvidenceActionView` | evidence ID, `href`, visible purpose label | 한 case study의 승인된 외부 또는 내부 근거 anchor |
| `TextBlockView` | paragraph text 또는 ordered/unordered list of text items | raw markup이 없는 approved content block |
| `ProfilePageMetadata` | title, Korean description, canonical, Open Graph, Twitter, optional ordered JSON-LD documents | C03이 만든 complete head model |
| `ResumeDocumentLink` | fixed public path `/resume.pdf`, visible purpose label | C11이 소유하는 다운로드 계약 |

Text block은 입력 순서를 보존하고 빈 paragraph나 빈 list를 받지 않는다. Presentation layer는 내용을 요약, 절단, 재정렬 또는 Markdown/HTML로 재해석하지 않는다.

### 3.2 Résumé props

| Contract | Required fields | Optional fields |
|---|---|---|
| `ResumePageProps` | validated `ResumeProfile`, `ProfilePageMetadata`, `ResumeDocumentLink` | 없음 |
| `ResumeIntroView` | approved name, headline, visible `resumeSummary`, detailed introduction blocks | 없음 |
| `SkillGroupView` | stable ID, order, heading, non-empty skill items | 없음 |
| `CareerResumeEntryView` | kind `career`, stable ID, order, organization, role, required display period, one-line summary, non-empty detail blocks | approved evidence actions |
| `AchievementResumeEntryView` | kind `achievement`, stable ID, order, title, one-line summary, non-empty detail blocks | display period, approved evidence actions |
| `ResumeEntryView` | discriminated union of complete `CareerResumeEntryView` or `AchievementResumeEntryView` | 없음 |
| `ResumeProjectSummaryView` | project ID, order, title, approved outcome summary | period, internal portfolio anchor |
| `EducationView` | ID, order, title, approved descriptive fields | period, detail blocks |
| `CertificationView` | ID, order, title, approved descriptive fields | period, evidence action |
| `ContactActionsProps` | approved email action and approved GitHub action | additional approved actions |
| `ResumeDetailsProps` | complete discriminated `ResumeEntryView` | 없음 |

`ResumePageProps`는 invalid 또는 partially validated profile을 표현할 수 없다. `ResumeDocumentLink`도 required prop이므로 page-local string으로 `/resume.pdf`를 복제하지 않는다.

### 3.3 Portfolio props

| Contract | Required fields | Optional fields |
|---|---|---|
| `PortfolioPageProps` | validated `PortfolioProfile`, `ProfilePageMetadata` | 없음 |
| `PortfolioIntroView` | visible `portfolioSummary`, approved email and GitHub actions | additional approved actions |
| `CaseStudyProps` | project ID, order, title, approved outcome summary, problem blocks, role blocks, decision blocks, architecture blocks, outcome blocks, lesson blocks | period, evidence actions |
| `CaseStudyDimensionView` | fixed dimension identity, Korean heading, non-empty blocks | 없음 |

`PortfolioProfile`은 3~6개의 complete case study만 포함한다. Presentation component가 project count나 missing dimension을 고쳐 쓰거나 불완전한 card를 렌더링하지 않는다.

### 3.4 Shell, Header and metadata props

| Contract | Required fields | Optional fields |
|---|---|---|
| `BaseLayoutProps` | pathname, title/description contract or complete profile metadata, body slot | ordered typed JSON-LD documents |
| `NavigationItem` | `href`, text label | decorative presentation token |
| `NavigationState` | navigation item, boolean current state | 없음 |
| `HeaderProps` | pathname, immutable primary navigation state | existing search/theme enhancement props |

Profile route는 complete `ProfilePageMetadata`를 전달한다. 기존 route의 legacy title/description props는 backward compatibility를 위해 유지할 수 있지만, profile metadata와 동시에 서로 다른 값을 제공하면 duplicate tag를 선택하지 않고 build-time conflict로 실패한다.

## 4. Exact Route Structure and Visibility

### 4.1 `/resume`

Résumé는 아래 순서를 고정한다.

1. **Page identity**
   - `h1` label은 `Résumé`다.
   - 바로 다음에 `홈`, `Résumé`, `Portfolio` 순서의 compact local navigation을 둔다.
   - `/resume` anchor 하나에만 `aria-current="page"`를 둔다.
2. **소개·연락·PDF**
   - Approved name, headline과 visible `resumeSummary`를 먼저 표시한다.
   - Detailed introduction의 typed blocks를 source order로 표시한다.
   - Email, GitHub와 `/resume.pdf`를 목적이 드러나는 text anchor group으로 표시한다.
   - Additional approved contact link가 없으면 해당 anchor만 생략한다.
3. **핵심 역량**
   - 하나 이상의 skill group을 group order로 표시한다.
   - 각 group heading과 non-empty skill list를 표시한다.
4. **경력·대표 성과**
   - Career collection이 있으면 `경력` group을 먼저 표시하고 collection-local order를 보존한다.
   - Achievement collection이 있으면 `대표 성과` group을 다음에 표시하고 collection-local order를 보존한다.
   - 각 Experience의 닫힌 native `<details>` 안에서 `<summary>`가 role을 heading으로 사용하고 organization, required approved period와 one-line summary를 모두 표시한다.
   - 각 Achievement의 `<summary>`는 title, 존재하는 경우 approved period와 one-line summary를 표시한다.
   - Required non-empty detail blocks는 같은 `<details>`의 detail content에 둔다. Summary text만으로도 어느 item인지와 핵심 내용을 구분할 수 있다.
   - Career와 achievement가 모두 없는 상태는 public-ready invariant 위반이므로 이 section을 조용히 생략한 page를 만들지 않는다.
5. **대표 프로젝트 요약**
   - Canonical project order를 보존한다.
   - 각 item의 title과 approved outcome summary는 항상 보인다.
   - Portfolio fragment anchor가 제공되는 경우 정적 내부 anchor로 렌더링하고, 제공되지 않으면 link 모양의 placeholder를 만들지 않는다.
   - 여섯 case-study dimension 전체는 이 route에서 복제하지 않고 `/portfolio`가 소유한다.
6. **교육**
   - Approved education collection이 non-empty일 때만 section과 heading을 함께 표시한다.
   - Collection order를 보존한다.
7. **자격**
   - Approved certification collection이 non-empty일 때만 section과 heading을 함께 표시한다.
   - Collection order를 보존한다.

교육과 자격이 모두 없으면 두 section 모두 사라지고 빈 wrapper나 “추가 예정” 문구를 남기지 않는다. 모든 `<details>`는 screen HTML에서 처음에 닫혀 있지만 detail content 자체는 server-rendered DOM에 존재한다.

### 4.2 `/portfolio`

Portfolio는 아래 순서를 고정한다.

1. **Page identity**
   - `h1` label은 `Portfolio`다.
   - 바로 다음에 `홈`, `Résumé`, `Portfolio` 순서의 compact local navigation을 둔다.
   - `/portfolio` anchor 하나에만 `aria-current="page"`를 둔다.
2. **소개와 연락**
   - Visible `portfolioSummary`를 표시한다.
   - Approved email과 GitHub anchor를 표시하고 additional contact action은 있을 때만 추가한다.
3. **대표 프로젝트**
   - 3~6개 case study를 canonical project order로 표시한다.
   - 각 case study는 stable project ID로 addressable한 semantic `article`이며 title, optional approved period와 visible approved outcome summary를 먼저 표시한다.
   - 각 article 안에서 dimension을 다음 순서로 모두 표시한다.
     1. `문제`
     2. `역할`
     3. `핵심 결정`
     4. `구조`
     5. `결과`
     6. `배운 점`
   - 각 dimension은 non-empty paragraph/list blocks를 source order로 표시한다.
   - Approved evidence가 있으면 여섯 dimension 뒤에 목적이 명확한 anchor list로 표시한다.
   - Evidence가 없으면 evidence heading, link container와 placeholder를 모두 생략한다. Case-study 설명 자체는 완전하게 남는다.

Case study는 정보 축약을 위해 client-side tab, carousel, modal 또는 collapsed state를 사용하지 않는다. 모든 project와 여섯 dimension은 최초 HTML에서 순서대로 읽을 수 있다.

## 5. Shared Navigation Contracts

### 5.1 Profile-local navigation

`ProfileLocalNavigation`은 `nav` landmark와 구별 가능한 한국어 accessible name을 사용한다. Ordered anchors는 정확히 다음과 같다.

1. `홈` → `/`
2. `Résumé` → `/resume`
3. `Portfolio` → `/portfolio`

현재 profile route와 일치하는 정확히 하나의 anchor에 `aria-current="page"`를 둔다. Current anchor도 이동 가능한 정상 anchor로 유지한다. 이 navigation은 page heading 바로 뒤에 있고 JavaScript, menu-open state 또는 hydration을 사용하지 않는다.

### 5.2 Global Header navigation

`getPrimaryNavigation`에 해당하는 immutable model의 order와 label은 다음과 같다.

1. `Tags`
2. `Graph`
3. `Résumé`
4. `Portfolio`

Résumé와 Portfolio의 href는 각각 `/resume`, `/portfolio`다. Desktop list와 narrow-screen server-rendered list는 같은 `NavigationState` collection을 입력으로 받아 item order, href와 text label을 그대로 보존한다.

기존 `MobileNav` enhancement가 계속 존재할 수 있지만 다음 제한을 지킨다.

- Résumé와 Portfolio anchor는 mobile용 server-rendered HTML에 이미 존재한다.
- Anchor의 존재, href와 keyboard activation은 hydration 성공이나 `MobileNav.open`에 의존하지 않는다.
- Existing island는 profile anchor의 유일한 carrier가 될 수 없다.
- Profile item을 search, graph data, tags, knowledge nav tree에 주입하지 않는다.
- Existing search와 theme control의 client behavior는 변경하지 않는다.

Current-page resolver는 pathname의 query/fragment를 current identity에 사용하지 않고 root 이외의 trailing slash를 동등하게 취급한다. Exact route 또는 slash-delimited descendant만 current로 보며 `/resume-old` 같은 유사 prefix는 match하지 않는다. 어떤 pathname에서도 Header item의 `aria-current="page"`는 최대 하나다.

## 6. Interaction and Accessibility Semantics

| User intent | Static contract |
|---|---|
| Profile route 이동 | Text가 있는 normal internal anchor. Script handler 금지 |
| Email 연락 | Approved address에서 파생된 labelled `mailto:` anchor |
| GitHub 확인 | Approved HTTPS GitHub anchor with a purpose-bearing label |
| Project evidence 확인 | HTTPS external 또는 root-relative internal anchor; URL 자체가 아닌 목적 label 사용 |
| Résumé 상세 열기/닫기 | Initially closed native `<details>`와 item-specific `<summary>` |
| PDF 다운로드 | Stable `/resume.pdf` anchor; form, blob URL 또는 runtime generation 금지 |
| 현재 위치 파악 | 단 하나의 `h1`, labelled navigation landmark와 최대 하나의 `aria-current="page"` |
| Case study 비교 | Ordered semantic articles, logical headings and lists; client tabs/carousel 금지 |

추가 접근성 규칙은 다음과 같다.

- Icon 또는 presentation token은 text label을 대체하지 않는다. 장식 icon은 accessible name에 중복되지 않게 처리한다.
- Contact와 evidence link label은 대상과 목적을 구분할 수 있어야 한다.
- `<summary>`는 “상세 보기”만 반복하지 않고 연결된 item title을 포함한다.
- Screen과 print의 DOM reading order는 같다. Visual reordering으로 의미 순서를 바꾸지 않는다.
- Approved Unicode text와 URL을 presentation layer에서 truncate하지 않는다.
- Keyboard focus appearance, contrast 수치, target size와 viewport별 배치는 NFR 단계에서 측정 가능한 기준으로 확정한다.

## 7. Metadata and JSON-LD Hosting

C03은 visible projection에서 complete `ProfilePageMetadata`를 만들고 C04는 이를 변형하거나 claim을 추가하지 않고 host한다.

### 7.1 Route metadata

- `/resume` description은 화면에 보이는 canonical `resumeSummary`와 같은 normalized value다.
- `/portfolio` description은 화면에 보이는 canonical `portfolioSummary`와 같은 normalized value다.
- `/resume` title은 exact template `{approvedName} — Résumé`, `/portfolio` title은 `{approvedName} — Portfolio`다.
- 두 route는 서로 다른 title, description, canonical, Open Graph와 Twitter identity를 가진다.
- Canonical은 configured site identity와 고정 route path에서 만들어지며 component가 host/domain을 추정하지 않는다.
- Missing required metadata, route mismatch 또는 visible summary와 다른 description은 build-time consistency failure다.

### 7.2 Structured-data host

- `/resume`의 typed documents는 `ProfilePage`와 승인된 최소 `Person` claim만 host한다. `Person` fact allowlist는 화면에 보이는 approved name, email과 GitHub `sameAs`다.
- `/portfolio`의 typed documents는 `CollectionPage`, ordered `ItemList`와 승인된 범위의 `CreativeWork` claim만 host한다. `ItemList`는 displayed project position, title과 canonical anchor를 보존하며 `CreativeWork`는 visible title, summary와 approved evidence URL 밖의 claim을 추가하지 않는다.
- Undefined optional property는 serialization 전에 생략한다.
- C04는 validated `JsonLdDocument`를 input order로 각각 하나의 non-executable `application/ld+json` script에 안전하게 serialize한다.
- Document collection이 없으면 JSON-LD script를 전혀 출력하지 않는다.
- Serialized script payload를 DOM에서 추출해 JSON parse한 결과는 원 typed document와 구조적으로 같아야 한다. Unicode와 script-closing text도 이 round-trip을 깨거나 executable markup을 만들 수 없다.
- Raw user-authored JSON string, page-local JSON-LD literal 또는 visible fact보다 강한 claim은 허용하지 않는다.

`BaseLayout`은 title, description, canonical, Open Graph와 Twitter tag를 각각 하나의 authoritative set으로 출력한다. Legacy props와 complete metadata가 충돌하면 어느 쪽을 임의로 우선하지 않고 실패한다.

## 8. Print and Resume Document Boundary

`/resume`는 screen, browser print와 PDF의 하나뿐인 content source다.

1. Screen route는 모든 승인된 summary와 detail blocks를 DOM에 포함하되 native `<details>`를 처음에는 닫아 둔다.
2. Print representation은 같은 DOM order에서 모든 approved detail content를 보이게 하고 global/local navigation, interactive summary affordance와 screen-only 장식을 숨길 수 있는 semantic styling hooks를 제공한다.
3. C11은 rendered `/resume`와 print representation에서 `site/public/resume.pdf`를 파생한다. Alternate hand-authored résumé body나 PDF-only fact input은 금지한다.
4. `ResumeDocumentLink`는 public href `/resume.pdf`를 단일 계약으로 제공하고 C02는 이를 소개·연락 action group에 server-rendered anchor로 노출한다.
5. Ordered `ResumeProfile`의 모든 approved text, period와 URL을 presentation label을 제외한 normalized fact manifest로 만든다. Manifest는 source identity, present-section order vector, entity kind/ID/order vector와 ordered entries를 가진다. 각 entry는 section key/order, applicable entity kind/ID/order, atomic `factId`, semantic path, value kind와 normalized text/period/URL value를 가진다.
6. Screen web representation, print representation과 document request는 같은 expected manifest fingerprint를 참조한다. Web, print와 PDF의 observed manifest는 entry 수와 순서를 포함해 expected manifest와 같아야 한다.
7. PDF binary byte equality는 property가 아니다. Missing, unreadable, stale source, broken public link 또는 one-fact mismatch는 completion failure다.

PDF browser/engine, local serving, extraction library, page size, margin, font readiness, visual threshold와 deterministic file metadata는 U1 NFR Requirements/NFR Design에서 정한다.

## 9. Omission and Failure Matrix

| Condition | Frontend behavior | Forbidden behavior |
|---|---|---|
| Optional education/certification collection absent | Entire section and heading omitted | Empty heading, placeholder, fabricated fact |
| Career absent but approved achievement present | Career group omitted; achievement group rendered | Empty career group |
| Optional education/certification details absent | Entity summary remains; empty detail node omitted | Empty toggle |
| Optional additional contact/evidence absent | Corresponding anchor and empty link group omitted | `#`, disabled CTA, “준비 중” |
| Optional URL provided but invalid | Public build fails before render | Warning-only omission |
| Required email/GitHub invalid or unapproved | Public build fails; no contact CTA output is accepted | Guessing or silent fallback |
| Project count outside 3~6, duplicate ID/order, missing dimension | Public build fails before any portfolio output | Partial project list/card |
| Required résumé highlight missing | Public build fails | Résumé without career/achievement evidence |
| Raw HTML/arbitrary Markdown enters a text block | Validation/build failure | Direct raw injection |
| Metadata missing, route-mismatched or overclaiming | Consistency/build failure | Body-only page with stale metadata |
| JSON-LD serialization cannot round-trip safely | Build failure and no structured-data output | Unsafe raw script insertion |
| Header model has duplicate current item or missing profile anchor | Build/test failure | Desktop-only or hydrated-only link |
| PDF descriptor/file/parity is missing, stale or mismatched | Document/completion gate failure | Broken link acceptance or manual PDF fact edit |

Presentation components may omit only values that the validated read model marks absent and optional. They do not catch a required-domain error and continue rendering a partial public page.

## 10. PBT-01 Testable Properties

Framework, generator library, run count, seed syntax and shrinking command are deferred to U1 NFR Requirements. The following property semantics are binding inputs to Code Generation.

### 10.1 C02 Profile Presentation

#### FD-P-C02-01 — Résumé hierarchy and omission invariant

- **Category**: Invariant, Oracle, Easy verification
- **Precondition**: Any valid `ResumeProfile` satisfying C01 public-ready invariants.
- **Generator domain**: Unicode/NFC Korean text blocks; one or more skill groups; career/achievement combinations with at least one total highlight and required non-empty detail per highlight; ordered projects; optional education, certification and evidence collections.
- **Operation**: Build the renderer-neutral résumé tree, then render static markup.
- **Assertion/oracle**:
  - direct sections occur exactly in `소개·연락·PDF → 핵심 역량 → 경력·대표 성과 → 대표 프로젝트 요약 → 교육 → 자격` order after removing absent optional sections;
  - collection item ID/order vectors equal the input projection vectors;
  - each initially closed Experience summary contains role as heading plus organization, required period and one-line summary;
  - each Achievement summary contains title, period when present and one-line summary;
  - every highlight's required non-empty detail blocks remain in the same server-rendered disclosure;
  - absent optional collections/links produce no related heading, anchor or placeholder;
  - all input text blocks occur without truncation or raw-markup interpretation.
- **Traceability**: FR-003, FR-004, FR-006, FR-013; AC-U02-01~03, AC-U05-01~03, AC-E01-03~04; EDGE-005, EDGE-006, EDGE-011; Q9, Q12, Q13.

#### FD-P-C02-02 — Portfolio completeness and ordering invariant

- **Category**: Invariant, Oracle, Easy verification
- **Precondition**: Any valid `PortfolioProfile` containing 3~6 complete case studies.
- **Generator domain**: 3~6 unique ordered projects, Unicode typed blocks for all six dimensions, and optional zero-or-more evidence links.
- **Operation**: Build the portfolio tree and flatten semantic article headings, dimension identities and anchors.
- **Assertion/oracle**:
  - article ID/order vector equals the canonical input vector;
  - each article exposes the approved outcome summary before the six dimensions;
  - each article has exactly one of each required dimension in `문제 → 역할 → 핵심 결정 → 구조 → 결과 → 배운 점` order;
  - every generated text block is attributable to that project projection;
  - zero evidence produces no evidence heading/container/anchor while non-empty evidence preserves input order;
  - all case-study content is in initial server-rendered output without tab/carousel/modal state.
- **Traceability**: FR-003, FR-005~FR-007, FR-011~FR-013; AC-U04-01~04, AC-U05-02~03; EDGE-002~EDGE-005, EDGE-011; Q7~Q9, Q13.

#### FD-P-C02-03 — Static interaction surface invariant

- **Category**: Invariant, Easy verification
- **Precondition**: Any valid résumé or portfolio page props.
- **Generator domain**: Valid route models with optional content combinations and long Unicode labels.
- **Operation**: Inspect the rendered semantic tree without executing client code.
- **Assertion/oracle**: Every required route/contact/evidence/PDF action is a server-rendered anchor, every résumé disclosure is native details/summary, no form or client-state-only control is introduced, and there is exactly one h1 with unskipped logical headings.
- **Traceability**: FR-003, FR-004, FR-006, FR-012, FR-013; AC-U01-03~04, AC-U02-02, AC-U05-01~03; EDGE-011.

**Category N/A decisions for C02**

- **Round-trip**: N/A. C02 does not decode static HTML back into domain entities; such parsing would create a second fact model.
- **Idempotence**: N/A. Repeat-render determinism is required, but rendered output is not a valid input to the render operation, so this is not idempotence.
- **Commutativity**: N/A. Section, project and dimension order is meaningful and intentionally non-commutative.
- **Induction**: N/A. Collection preservation is directly checked over bounded generated collections; no recursive construction needs an induction property.
- CSS layout, contrast, focus rendering and visual quality are example/browser checks, not PBT substitutes.

### 10.2 C04 Base Layout Metadata Host

#### FD-P-C04-01 — JSON-LD safe round-trip

- **Category**: Round-trip, Invariant, Easy verification
- **Precondition**: An ordered collection of valid typed JSON-LD documents whose values are JSON-compatible.
- **Generator domain**: Empty and non-empty document collections; nested arrays/objects; Korean/Unicode; quotes, angle brackets and script-closing substrings; optional fields already omitted.
- **Operation**: Safe serialize → host in JSON-LD script node(s) → extract payload → JSON parse.
- **Assertion/oracle**: Parsed documents are structurally equal to input documents in the same order; no payload creates an executable script boundary; script count equals document count.
- **Traceability**: FR-002, FR-011, FR-013; AC-U02-04, AC-U04-04, AC-E02-02~03; Q10.

#### FD-P-C04-02 — Optional host and unique metadata invariant

- **Category**: Invariant, Oracle
- **Precondition**: A valid complete metadata model, with zero or more JSON-LD documents.
- **Generator domain**: Resume/portfolio route identities, distinct normalized visible summaries and empty/non-empty document collections.
- **Operation**: Render the head model and enumerate authoritative tags/scripts.
- **Assertion/oracle**: Exactly one title/description/canonical/OG/Twitter set is emitted; zero documents emit zero JSON-LD scripts; route canonical and description equal the supplied complete model; legacy/profile prop conflicts are rejected rather than duplicated.
- **Traceability**: FR-011; AC-U02-04, AC-U04-04; EDGE-011; Q10.

**Category N/A decisions for C04**

- **Idempotence**: N/A. Hosting output is not fed back as `BaseLayoutProps`.
- **Commutativity**: N/A. JSON-LD document order is preserved as observable input order.
- **Induction**: N/A. A flat finite document collection is checked directly.
- Search-engine interpretation and external crawler behavior are outside PBT; the observable head contract remains testable offline.

### 10.3 C05 Header Navigation

#### FD-P-C05-01 — Shared desktop/mobile navigation invariant

- **Category**: Invariant, Oracle, Easy verification
- **Precondition**: Fixed primary navigation model and any pathname.
- **Generator domain**: `/`, known routes, slash-delimited descendants, unknown routes, query/fragment variants, trailing-slash variants, prefix collisions and Unicode-safe path strings.
- **Operation**: Resolve navigation state and render desktop plus narrow-screen server markup.
- **Assertion/oracle**:
  - both markup variants expose the ordered `(label, href)` vector `Tags, Graph, Résumé, Portfolio`;
  - `/resume` and `/portfolio` anchors exist in both server-rendered variants before hydration;
  - current-item count is zero or one;
  - normalized exact `/resume` and `/portfolio` paths plus slash-delimited descendants select the corresponding item, while prefix collisions and unrelated paths select neither;
  - island open/hydration state is not an input to anchor existence.
- **Traceability**: FR-003, FR-012, FR-013; AC-U01-03~04; EDGE-011; Q11.

#### FD-P-C05-02 — Profile navigation isolation

- **Category**: Invariant, Oracle
- **Precondition**: Any primary navigation state.
- **Generator domain**: All valid pathname/current-state combinations.
- **Operation**: Project Header anchors and compare them with the fixed model.
- **Assertion/oracle**: Profile links remain presentation navigation only; producing Header state does not add profile entities to search, graph, tags or knowledge nav-tree inputs.
- **Traceability**: FR-012, FR-013; ST-U01 contributor boundary; Q11.

**Category N/A decisions for C05**

- **Round-trip**: N/A. Navigation markup is not parsed into the model by production code.
- **Idempotence**: N/A. Deterministic state calculation does not consume its own output as input.
- **Commutativity**: N/A. Approved item order is a user-visible contract.
- **Induction**: N/A. The fixed four-item collection has no recursive rule.
- Visual mobile breakpoint and keyboard-focus appearance require browser examples in the NFR test matrix.

### 10.4 C11 Resume Document Boundary

#### FD-P-C11-01 — Full approved-fact manifest parity

- **Category**: Invariant, Oracle, Easy verification
- **Precondition**: Any valid ordered `ResumeProfile` and document request derived from the same source identity.
- **Generator domain**: Valid résumé projections with optional sections, Unicode text, tagged period values, URL values, detail blocks and order gaps allowed by the domain.
- **Operation**: Build the expected normalized manifest from `ResumeProfile`; derive web/print/document manifests through their pure adapters; compare source identity, section key/order, applicable entity kind/ID/order, atomic `factId`, semantic path, value kind and normalized text/period/URL value.
- **Assertion/oracle**: Web, print and PDF manifests equal the complete expected manifest and reference the same source fingerprint; presentation-only labels are excluded; one missing, extra, changed or reordered fact rejects parity.
- **Traceability**: FR-002, FR-004, FR-010, FR-013; AC-U03-02~04, AC-E02-02~04; EDGE-008, EDGE-009; Q14.

#### FD-P-C11-02 — Source and stable-link guard

- **Category**: Invariant, Oracle
- **Precondition**: A valid profile plus either matching or deliberately mutated document source identity/link descriptor.
- **Generator domain**: Matching requests and controlled mutations of source fingerprint, public path, target path and manifest fact.
- **Operation**: Validate document request and public link contract before accepting generation result.
- **Assertion/oracle**: Only a request derived from the same résumé source with public href `/resume.pdf` is accepted; every controlled mismatch is field-addressable and no partial success is returned.
- **Traceability**: FR-010; AC-U03-02~04; EDGE-008, EDGE-009; Q14.

**Category N/A decisions for C11**

- **Round-trip**: N/A for PDF binary. Extracted normalized fact-manifest equality is the oracle; binary bytes, metadata and layout are not a reversible domain encoding.
- **Idempotence**: N/A at Functional Design. Repeated file generation includes browser/filesystem effects and deterministic-generation requirements belong to NFR Design.
- **Commutativity**: N/A. Fact and section order is parity-significant.
- **Induction**: N/A. Manifest equality is directly checked over finite ordered facts.
- PDF binary generation, visual layout, page breaks, readability and extraction-tool fidelity require document/example verification in addition to these properties.

### 10.5 Canonical property crosswalk

`business-logic-model.md`의 U1 property ID는 stage-level umbrella이고, `business-rules.md`와 이 문서의 ID는 같은 obligation을 세분화한 refinement다. Code Generation은 동일한 test가 여러 refinement를 충족할 수 있음을 기록하되 obligation을 중복 구현하거나 누락하지 않는다.

| Umbrella | Business-rule refinements | Frontend refinements |
|---|---|---|
| U1-P07 — C02 static render correspondence | P-C02-01~03 | FD-P-C02-01~03 |
| U1-P09 — C04 JSON-LD host | P-C04-01~02 | FD-P-C04-01~02 |
| U1-P10 — C05 navigation | P-C05-01~03 | FD-P-C05-01~02 |
| U1-P12 — C11 document source/parity | P-C11-01~03 | FD-P-C11-01~02 |

Actual browser/PDF I/O, missing/unreadable file, extraction fidelity and visual quality remain S04 named example/document tests rather than new PBT property IDs.

If a property exposes a defect, Code Generation must promote the shrunk minimal counterexample to the corresponding permanent named example-regression suite while retaining the general property.

## 11. Traceability Summary

| Frontend contract | Functional Design decisions | Requirements | Stories / acceptance criteria | Edges |
|---|---|---|---|---|
| Validated read-model-only rendering and optional omission | Q1, Q5~Q9 | FR-001, FR-002, FR-004~FR-006, FR-013 | ST-U02, ST-U04, ST-U05, ST-E01, ST-E02 | EDGE-001~EDGE-006 |
| Résumé exact sections and closed native details | Q12 | FR-003, FR-004, FR-007, FR-012, FR-013 | AC-U02-01~03 | EDGE-005, EDGE-006, EDGE-011 |
| Portfolio ordered six-dimension case studies | Q8, Q9 | FR-003, FR-005, FR-007, FR-011~FR-013 | AC-U04-01~04 | EDGE-002~EDGE-005, EDGE-011 |
| Contact and evidence anchors | Q7 | FR-005, FR-006, FR-013 | AC-U05-01~04 | EDGE-004, EDGE-011 |
| Header and profile-local static navigation | Q11, Q13 | FR-003, FR-012, FR-013 | AC-U01-03~04 | EDGE-011 |
| Visible summary metadata and typed JSON-LD host | Q10 | FR-002, FR-011, FR-013 | AC-U02-04, AC-U04-04, AC-E02-02~03 | EDGE-011 |
| Stable PDF link and full fact parity | Q14 | FR-002, FR-004, FR-010, FR-013 | AC-U03-01~04, AC-E02-03~04 | EDGE-005, EDGE-008, EDGE-009, EDGE-011 |
| Owner-local property inventory | PBT-01 plan | FR-015 | AC-E03-01; U1 profile slice | EDGE-010 |

## 12. Deferred NFR Decisions and Explicit Non-Components

다음 값은 이 Functional Design이 선점하지 않는다.

- CSS class naming 세부, size, spacing, line length, color, contrast ratio와 animation;
- responsive breakpoint, target viewport와 mobile layout measurements;
- exact focus treatment, keyboard/browser matrix와 accessibility tool;
- print paper size, margin, page-break rule, ink treatment와 visual threshold;
- PDF browser/engine, generation command, font-wait strategy와 text extractor;
- PBT framework, generator package, case count, seed syntax와 shrink reporter.

다음은 U1 frontend component가 아니다.

- runtime profile API, server, database, CMS 또는 contact form;
- new client-side state, profile Preact island, tab, carousel, modal 또는 client router;
- page-local fact copy, metadata-only hidden claim 또는 PDF-only fact source;
- external embed, analytics pipeline 또는 runtime link validation;
- knowledge search, graph, tags와 nav tree에 profile entry를 삽입하는 behavior;
- Terraform, AWS resource, deployment, push 또는 cache invalidation.
