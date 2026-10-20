# U1 Functional Design Plan — Profile Domain and Native Experience

## 문서 상태

- **단계**: CONSTRUCTION — U1 Functional Design
- **상태**: 완료 및 승인됨
- **Unit**: U1 Profile Domain and Native Experience
- **Bounded Context**: Profile Experience
- **작성일**: 2026-07-23
- **Feature Branch**: `codex/feature/resume-profile-experience`
- **Branch Base**: reconciled local `develop` at `67f70a4240819ed8b9408360f9b59512660f8e10`
- **PBT Enforcement**: Full; 이 단계에는 PBT-01이 적용됨

## 1. 입력과 전제

- [Unit of Work Definitions](../../inception/application-design/unit-of-work.md)
- [Unit of Work Story Map](../../inception/application-design/unit-of-work-story-map.md)
- [Application Design](../../inception/application-design/application-design.md)
- [Components](../../inception/application-design/components.md)
- [Component Methods](../../inception/application-design/component-methods.md)
- [Services](../../inception/application-design/services.md)
- [Requirements](../../inception/requirements/requirements.md)
- [User Stories](../../inception/user-stories/stories.md)

다음 결정은 이미 승인됐으며 이 계획에서 다시 열지 않는다.

- 승인 완료된 TypeScript production profile data 한 벌이 canonical source다.
- 초안, 근거와 승인 기록은 production data 밖의 AI-DLC fact-review artifact에 둔다.
- `/resume`와 `/portfolio`는 한국어 정적 페이지이며 새 client JavaScript나 외부 runtime API를 추가하지 않는다.
- 이력서는 처음에는 상세가 닫힌 summary-first 화면을 제공하고 native `<details>`로 승인된 상세를 노출한다.
- 포트폴리오는 승인된 프로젝트 3~6개와 문제, 역할, 핵심 결정, 구조, 결과, 배운 점을 제공한다.
- 브라우저 인쇄와 `/resume.pdf`는 웹 이력서의 승인된 상세 전체를 같은 canonical source에서 사용한다.
- Résumé와 Portfolio는 desktop/mobile Header에 server-rendered link로 존재하고 knowledge search, graph, tags와 nav tree에는 profile entry를 넣지 않는다.
- Infrastructure, Terraform, AWS와 deployment는 이 unit의 Functional Design 범위가 아니다.

실제 이름, 이메일, 경력, 프로젝트와 성과 값은 이 질문의 답변으로 승인되지 않는다. 별도 fact inventory와 명시적 사용자 승인 전에는 production data, public route content 또는 PDF에 넣지 않는다.

## 2. 목표와 산출물

이 단계는 기술 도구가 아니라 U1의 business/domain contract를 확정한다.

- canonical profile entity와 관계, 필수·선택값 및 public-ready 조건
- 문자열, 기간, identifier, ordering, URL과 validation 규칙
- résumé, portfolio, homepage, metadata와 document projection 규칙
- optional data omission, failure와 fact-approval 경계
- 정적 UI의 section/component contract
- web, print와 PDF의 fact-parity 의미
- C01~C05, C11, S01과 S04의 PBT-01 property 또는 명시적 N/A 근거

답변 검증 뒤 다음 파일을 생성한다.

- `aidlc-docs/construction/profile-domain-and-native-experience/functional-design/business-logic-model.md`
- `aidlc-docs/construction/profile-domain-and-native-experience/functional-design/business-rules.md`
- `aidlc-docs/construction/profile-domain-and-native-experience/functional-design/domain-entities.md`
- `aidlc-docs/construction/profile-domain-and-native-experience/functional-design/frontend-components.md`

PBT framework, generator library, run count, seed syntax, browser/PDF engine, viewport, breakpoint, CSS 수치와 print margin은 다음 U1 NFR Requirements/NFR Design에서 확정한다.

## 3. 실행 계획

### 3.1 Context 분석

- [x] U1 definition, story ownership, acceptance criteria와 dependency를 분석한다.
- [x] C01~C05, C11, S01과 S04의 승인된 책임과 deferred decision을 분석한다.
- [x] FR-001~FR-007, FR-010~FR-013, ST-U01~ST-U05, ST-E01~ST-E03와 EDGE-001~EDGE-006, EDGE-008~EDGE-011을 추적한다.
- [x] 승인된 fact, source/generated, no-JS, no-push와 no-deploy 경계를 고정한다.

### 3.2 질문과 답변

- [x] Business Logic, Domain Model, Business Rules, Data Flow, Integration, Error Handling, Business Scenarios와 Frontend Components의 미확정 항목을 조사한다.
- [x] 이미 승인된 제품 결정을 반복하지 않는 context-specific 질문을 작성한다.
- [x] 실제 public fact와 NFR 도구 선택을 이 질문에서 제외한다.
- [x] 모든 질문에 최소 두 개의 의미 있는 선택지와 마지막 `X) Other`를 제공한다.
- [x] 모든 `[Answer]:`를 수집하고 선택 형식, 명확성, 상호 일관성과 기존 승인 호환성을 검증한다.
- [x] 모호하거나 혼합된 답변이 있으면 별도 clarification question file을 만들고 모두 해소한다. 해당 없음 — 14개 답변이 모두 명확한 A 선택이다.

### 3.3 Functional Design 생성

- [x] entity, value object, 관계, lifecycle과 public-ready invariant를 설계한다.
- [x] field별 필수·선택·정규화·기간·ID·순서·URL validation matrix를 설계한다.
- [x] deterministic issue taxonomy와 fail-closed data flow를 설계한다.
- [x] résumé, portfolio, homepage, metadata/JSON-LD와 document projection allowlist를 설계한다.
- [x] summary-first résumé, case study, contact, optional omission과 navigation component contract를 설계한다.
- [x] fact-review inventory에서 approved-only production data로 연결되는 human approval gate를 설계한다.
- [x] web/print/PDF normalized fact manifest와 mismatch failure를 설계한다.
- [x] 네 개의 필수 Functional Design artifact를 생성한다.

### 3.4 PBT-01과 품질 검증

- [x] C01~C05, C11, S01과 S04의 preliminary property/N/A inventory를 작성한다.
- [x] 모든 관련 component에 category, precondition, generator domain, operation, assertion/oracle와 traceability가 있는 `Testable Properties`를 문서화한다.
- [x] property가 없는 component/operation에 `No PBT properties identified`와 구체적인 이유를 문서화한다.
- [x] Round-trip, Invariant, Idempotence, Commutativity, Oracle, Induction과 Easy verification 적용 여부를 각각 판정한다.
- [x] determinism을 idempotence로 잘못 분류하지 않고 human approval, CSS visual quality와 PDF byte identity를 PBT로 대체하지 않는다.
- [x] identified properties를 U1 Code Generation plan과 ST-E03 profile slice의 binding test requirement로 전달한다.
- [x] FR, Story/AC, EDGE와 component traceability를 검증한다.
- [x] Obsidian Press project extension OBSIDIAN-01~05 준수 상태를 검증한다.
- [x] 완성 prompt 전에 독립 검토, 링크와 Markdown 구조 검증을 수행한다.
- [x] 표준 2-option Functional Design 완료 gate를 제시하고 명시적 승인을 기다린다.

## 4. Preliminary PBT-01 Inventory

이 표는 답변 전 계획 baseline이다. 최종 준수 판정은 네 개의 Functional Design artifact에 property와 N/A 근거를 모두 기록한 뒤에만 가능하다.

| Owner | Preliminary property categories | Planned assertions | Explicit non-property boundary |
|---|---|---|---|
| C01 Profile Domain | Invariant, Oracle, Easy verification; conditional Idempotence | valid-domain closure, controlled invalid mutation과 field path, project count, unique ID/order, deterministic selectors, optional omission, projection provenance와 input immutability | direct TypeScript source에 codec이 없으면 Round-trip N/A; normalization을 선택하지 않으면 Idempotence N/A |
| C02 Profile Presentation | Invariant, Easy verification | projection의 section/order/count, native closed `<details>` 안의 complete static detail, six case-study dimensions, absent optional heading/link omission | CSS layout, contrast, keyboard behavior와 visual quality는 example/browser 검증 대상 |
| C03 Profile Metadata Builder | Invariant, Oracle, Easy verification | route identity/canonical, approved visible claim allowlist, JSON-LD item count/order/position과 optional omission | 검색엔진 결과나 외부 crawler 동작은 PBT 대상 아님 |
| C04 Base Layout Metadata Host | Round-trip, Invariant | JSON-LD serialize/embed/extract/parse structural equality, absent documents의 script omission, Unicode와 script-boundary safety | custom transform이 없이 표준 serializer에 완전히 위임되는 부분은 integration example로 대체 가능 |
| C05 Header Navigation | Invariant, Oracle | item order/href preservation, segment-aware current state 최대 1개, desktop/mobile link-set parity와 server-rendered profile anchors | fixed label/icon visual layout은 example/browser 검증 대상 |
| C11 Resume Document Boundary | Invariant, Oracle, Easy verification | stable `/resume.pdf`, canonical source fingerprint, web/PDF normalized fact-manifest parity와 controlled mismatch rejection | browser/PDF binary generation, byte identity와 visual quality는 document/example 검증 대상 |
| S01 Profile Assembly | Easy verification | valid input만 complete projections를 만들고 invalid input은 partial public output 없이 닫힘 | 독립 business logic이 없으면 C01~C05 property를 중복하지 않고 integration example만 둔다 |
| S04 Resume Document | No independent PBT property identified, pending final confirmation | pure source/parity guard는 C11에서 소유 | browser, filesystem과 visual side effect orchestration은 example/document 검증 대상 |

현재 Commutativity와 Induction 대상은 식별되지 않았다. human fact truth/approval은 사용자 review gate이고 PBT가 대신 증명하지 않는다.

## 5. Functional Design Questions

각 `[Answer]:` 뒤에 선택한 문자 하나를 입력해 주세요. `X`를 선택하면 같은 줄에 구체적인 규칙을 작성해 주세요.

### Question 1 — public-ready 최소 profile schema

승인된 production profile이 public-ready로 판정되기 위한 최소 데이터는 무엇이어야 할까요?

A) 이름, 한국어 headline, 짧은 소개, 상세 소개, 승인 email·GitHub, 하나 이상의 기술 그룹, 하나 이상의 typed résumé highlight와 완전한 project 3~6개를 필수로 둔다. Résumé highlight는 경력 또는 대표 성과일 수 있어 근거 없는 고용 정보를 강제하지 않는다. 교육, 자격과 추가 링크는 선택값이다. **(권장)**

B) A의 공통 필드에 더해 최소 한 개의 경력 entity를 필수로 두고, 각 경력에는 조직, 역할, 기간과 요약이 모두 있어야 한다. 대표 성과는 별도 선택값이다.

C) 이름, headline, 소개, 승인 email·GitHub, 하나의 자유 형식 역량 요약과 project 3~6개를 필수로 둔다. 구조화된 기술 그룹, 경력과 별도 성과 entity는 선택값이며, project result 중 하나 이상을 첫 화면의 승인된 대표 성과로 명시적으로 투영한다.

X) Other (please describe after [Answer]: tag below) — 필수 entity, 최소 개수와 선택 section을 구체적으로 설명한다.

[Answer]: A) 이름, 한국어 headline, 짧은 소개, 상세 소개, 승인 email·GitHub, 하나 이상의 기술 그룹, 하나 이상의 typed résumé highlight와 완전한 project 3~6개를 필수로 둔다. Résumé highlight는 경력 또는 대표 성과일 수 있어 근거 없는 고용 정보를 강제하지 않는다. 교육, 자격과 추가 링크는 선택값이다.

### Question 2 — 경력·성과·프로젝트 관계

canonical domain에서 경력, 대표 성과와 project의 관계를 어떻게 표현할까요?

A) 경력, 성과와 project를 각각 독립 entity로 두고, project가 관련 경력 또는 성과 ID를 선택적으로 참조한다. 중첩하거나 사실을 복사하지 않으며 한 project는 독립 작업일 수도 있다. **(권장)**

B) 모든 project는 정확히 하나의 경력 또는 독립 활동 entity에 속해야 하며 parent ID가 필수다. Project 사실은 parent에 복제하지 않는다.

C) 경력·성과와 project는 완전히 독립이며 서로의 ID를 참조하지 않는다. 화면의 연관성은 명시적 순서와 설명만으로 표현한다.

X) Other (please describe after [Answer]: tag below) — entity ownership, cardinality와 reference 규칙을 설명한다.

[Answer]: A) 경력, 성과와 project를 각각 독립 entity로 두고, project가 관련 경력 또는 성과 ID를 선택적으로 참조한다. 중첩하거나 사실을 복사하지 않으며 한 project는 독립 작업일 수도 있다.

### Question 3 — 기간의 정밀도

공개 근거보다 정밀한 날짜를 만들지 않으면서 경력과 project 기간을 어떻게 모델링할까요?

A) 각 기간에 `year` 또는 `year-month` 정밀도를 명시하는 tagged value를 사용하고, 종료는 같은 정밀도의 값 또는 `present`를 허용한다. 경력 기간은 필수, 성과·project 기간은 선택이며 서로 다른 정밀도를 추정으로 맞추지 않는다. **(권장)**

B) 모든 기간을 `YYYY-MM`로 통일하고 시작·종료 월이 모두 승인된 entity만 공개한다.

C) 사용자가 승인한 한국어 display string만 저장하고 날짜 비교나 자동 정렬에는 사용하지 않는다. 모든 표시 순서는 별도 `order`만 따른다.

X) Other (please describe after [Answer]: tag below) — 허용 정밀도, 진행 중 표현, 필수 여부와 표시 규칙을 설명한다.

[Answer]: A) 각 기간에 `year` 또는 `year-month` 정밀도를 명시하는 tagged value를 사용하고, 종료는 같은 정밀도의 값 또는 `present`를 허용한다. 경력 기간은 필수, 성과·project 기간은 선택이며 서로 다른 정밀도를 추정으로 맞추지 않는다.

### Question 4 — 텍스트 정규화와 빈 값

승인된 한국어·Unicode 텍스트를 validation과 projection에서 어떻게 canonicalize할까요?

A) 앞뒤 공백 제거, 줄바꿈 LF 통일과 Unicode NFC 정규화를 한 번 적용하고, 정규화 뒤 빈 문자열을 거부한다. 내부 공백, 문단 구조와 승인된 문장부호는 보존하며 임의 길이 절단은 하지 않는다. 승인 inventory에는 정규화된 최종값을 표시한다. **(권장)**

B) production validator는 값을 변경하지 않고 앞뒤 공백, CRLF, 비-NFC와 빈 문자열을 오류로 거부한다. 작성자가 승인 전에 canonical form으로 직접 고친다.

C) 앞뒤 공백과 줄바꿈만 정규화하고 Unicode code-point sequence는 그대로 보존한다. 정규화 뒤 빈 문자열은 거부한다.

X) Other (please describe after [Answer]: tag below) — trim, line ending, Unicode와 empty-value 정책을 설명한다.

[Answer]: A) 앞뒤 공백 제거, 줄바꿈 LF 통일과 Unicode NFC 정규화를 한 번 적용하고, 정규화 뒤 빈 문자열을 거부한다. 내부 공백, 문단 구조와 승인된 문장부호는 보존하며 임의 길이 절단은 하지 않는다. 승인 inventory에는 정규화된 최종값을 표시한다.

### Question 5 — production data와 사용자 fact approval 연결

Production data에 `draft | approved` 상태를 넣지 않는 기존 결정을 유지하면서 실제 사용자 승인을 어떤 단위로 증명할까요?

A) 별도 fact inventory가 atomic `factId`별 normalized value, evidence, target surface와 `Approved | Excluded | Pending`을 기록한다. Production data는 Approved 값만 같은 stable ID로 materialize하고, 사용자가 최종 inventory와 production diff를 명시적으로 승인한다. **(권장)**

B) identity, contact, 각 경력, 각 성과와 각 project entity 단위로 전체 nested value를 한 번에 승인한다. Production data는 Approved entity만 포함하고 entity-level record로 추적한다.

C) 완성된 résumé·portfolio·PDF snapshot 전체를 한 번에 승인하며 field/entity별 상태나 stable fact ID는 관리하지 않는다.

X) Other (please describe after [Answer]: tag below) — approval 단위, evidence, production mapping과 변경 시 재승인 규칙을 설명한다.

[Answer]: A) 별도 fact inventory가 atomic `factId`별 normalized value, evidence, target surface와 `Approved | Excluded | Pending`을 기록한다. Production data는 Approved 값만 같은 stable ID로 materialize하고, 사용자가 최종 inventory와 production diff를 명시적으로 승인한다.

### Question 6 — fail-fast와 validation issue 의미

Application Design의 “fail-fast”와 field-addressable issue collection을 어떤 하나의 오류 계약으로 통일할까요?

A) 어떤 public output도 만들기 전에 전체 candidate를 검증하고, 발견 가능한 모든 issue를 stable `{code, path, message}` 순서로 집계한 뒤 한 번에 실패한다. Partial validated value나 partial page는 반환하지 않는다. **(권장)**

B) 고정된 validation 순서에서 첫 issue의 `{code, path, message}`만 반환하고 즉시 실패한다. 수정 후 다시 실행해 다음 issue를 확인한다.

X) Other (please describe after [Answer]: tag below) — aggregation, ordering, path 형식과 partial-output 규칙을 설명한다.

[Answer]: A) 어떤 public output도 만들기 전에 전체 candidate를 검증하고, 발견 가능한 모든 issue를 stable `{code, path, message}` 순서로 집계한 뒤 한 번에 실패한다. Partial validated value나 partial page는 반환하지 않는다.

### Question 7 — email과 link validation

필수 연락처와 선택 evidence link의 absent/invalid 상태를 어떻게 처리할까요?

A) Email은 승인된 address value에서 `mailto:`를 파생하고, GitHub는 `https://github.com/...`, 외부 evidence는 HTTPS, 내부 evidence는 root-relative site path만 허용한다. 선택 link가 없으면 CTA를 생략하지만 값이 제공됐는데 invalid하면 필수·선택 모두 field-addressable build failure로 처리한다. Domain validation은 network에 접속하지 않는다. **(권장)**

B) 필수 email·GitHub가 invalid하면 실패하고, 선택 evidence link가 invalid하면 warning과 함께 해당 CTA만 생략한다.

C) 모든 evidence는 HTTPS absolute URL만 허용하고 내부 route link는 case study evidence로 허용하지 않는다. 제공된 invalid 값은 모두 실패한다.

X) Other (please describe after [Answer]: tag below) — 허용 scheme/host/path, optional omission과 provided-invalid 규칙을 설명한다.

[Answer]: A) Email은 승인된 address value에서 `mailto:`를 파생하고, GitHub는 `https://github.com/...`, 외부 evidence는 HTTPS, 내부 evidence는 root-relative site path만 허용한다. 선택 link가 없으면 CTA를 생략하지만 값이 제공됐는데 invalid하면 필수·선택 모두 field-addressable build failure로 처리한다. Domain validation은 network에 접속하지 않는다.

### Question 8 — stable ID와 명시적 순서

경력, 성과, 기술 그룹과 project의 identity와 ordering을 어떻게 검증할까요?

A) ID는 entity 종류 안에서 unique한 stable kebab-case string으로 두고, ordered collection마다 unique positive integer `order`를 필수로 둔다. Order gap은 허용하지만 duplicate와 fallback/date sort는 허용하지 않는다. **(권장)**

B) 모든 entity 종류를 통틀어 ID를 globally unique하게 하고, 각 collection의 order는 `1..N`으로 연속이어야 한다.

C) ID는 entity 종류 안에서 unique하게 하고, 각 collection의 order는 `1..N`으로 연속이어야 한다. 날짜나 source-array order는 사용하지 않는다.

X) Other (please describe after [Answer]: tag below) — ID scope/format, order 범위, gap과 tie 규칙을 설명한다.

[Answer]: A) ID는 entity 종류 안에서 unique한 stable kebab-case string으로 두고, ordered collection마다 unique positive integer `order`를 필수로 둔다. Order gap은 허용하지만 duplicate와 fallback/date sort는 허용하지 않는다.

### Question 9 — case-study 본문 표현

여섯 필수 case-study dimension과 résumé detail을 어떤 content value로 모델링할까요?

A) 각 dimension을 non-empty paragraph/list block의 typed array로 표현하고 raw HTML과 arbitrary Markdown을 허용하지 않는다. Link는 별도 typed evidence entity로 관리한다. **(권장)**

B) 각 dimension을 paragraph, list, emphasis와 inline code만 허용하는 renderer-neutral restricted rich-text node로 표현한다. Raw HTML은 금지하고 link는 별도 typed evidence entity로 관리한다.

C) 각 dimension을 하나의 plain-text paragraph로 제한하고 list나 inline formatting은 허용하지 않는다.

X) Other (please describe after [Answer]: tag below) — 허용 block, inline 표현, link와 HTML 규칙을 설명한다.

[Answer]: A) 각 dimension을 non-empty paragraph/list block의 typed array로 표현하고 raw HTML과 arbitrary Markdown을 허용하지 않는다. Link는 별도 typed evidence entity로 관리한다.

### Question 10 — visible summary와 metadata description

페이지별 고유 description을 별도 hidden fact copy 없이 어떻게 만들까요?

A) Canonical profile에 승인된 `resumeSummary`와 `portfolioSummary`를 두고 각각 해당 페이지 첫 화면에도 그대로 표시한다. Metadata description은 같은 normalized value를 재사용하고 JSON-LD claim은 visible projection allowlist에서만 만든다. **(권장)**

B) Visible short intro와 case-study summary에서 deterministic template과 길이 규칙으로 page별 description을 파생한다. Metadata-only 문장은 저장하지 않는다.

C) 하나의 visible profile summary를 두 페이지가 공유하고 route purpose label을 deterministic하게 붙여 page별 description을 만든다.

X) Other (please describe after [Answer]: tag below) — description source, visible placement와 projection 규칙을 설명한다.

[Answer]: A) Canonical profile에 승인된 `resumeSummary`와 `portfolioSummary`를 두고 각각 해당 페이지 첫 화면에도 그대로 표시한다. Metadata description은 같은 normalized value를 재사용하고 JSON-LD claim은 visible projection allowlist에서만 만든다.

어느 선택에서도 JSON-LD는 typed document만 입력받고, safe serialization 뒤 extract/parse한 구조가 원 document와 같아야 하며 visible approved claim보다 강한 사실을 추가하지 않는다.

### Question 11 — Header label과 order

기존 `Tags`, `Graph`와 새 profile link의 공통 navigation order와 label을 어떻게 정할까요?

A) 기존 순서를 보존해 `Tags`, `Graph`, `Résumé`, `Portfolio`로 배치하고 desktop/mobile가 같은 ordered model을 사용한다. **(권장)**

B) Profile discoverability를 우선해 `Résumé`, `Portfolio`, `Tags`, `Graph`로 배치하고 desktop/mobile가 같은 ordered model을 사용한다.

C) 기존 순서를 보존하되 한국어 label인 `Tags`, `Graph`, `이력서`, `포트폴리오`를 사용한다.

X) Other (please describe after [Answer]: tag below) — 고정된 `/resume`, `/portfolio` route는 유지하고 정확한 label과 order를 설명한다.

[Answer]: A) 기존 순서를 보존해 `Tags`, `Graph`, `Résumé`, `Portfolio`로 배치하고 desktop/mobile가 같은 ordered model을 사용한다.

어느 선택에서도 좁은 화면의 Résumé·Portfolio anchor는 `MobileNav.open`이나 hydration에 의존하지 않는 server-rendered HTML에 존재해야 한다.

### Question 12 — résumé first-view summary와 section order

처음에는 모든 native `<details>`가 닫혀 있고 optional section은 data가 없으면 생략된다는 승인 아래, résumé의 first-view summary와 section 순서를 어떻게 구성할까요?

A) `소개·연락·PDF` → `핵심 역량` → `경력·대표 성과` → `대표 project 요약` → optional `교육·자격` 순서로 둔다. 각 ordered 경력·성과의 title, period와 one-line summary 및 각 대표 project의 title과 approved outcome summary는 닫힌 화면에서도 보이고, 상세 block만 `<details>` 안에 둔다. **(권장)**

B) `소개·연락·PDF` → `경력·대표 성과` → `핵심 역량` → `대표 project 요약` → optional `교육·자격` 순서로 두고, 나머지 summary/detail 구분은 A와 같이 적용한다.

C) `소개·연락·PDF` → `대표 project 요약` → `핵심 역량` → `경력·대표 성과` → optional `교육·자격` 순서로 두고, 나머지 summary/detail 구분은 A와 같이 적용한다.

X) Other (please describe after [Answer]: tag below) — 첫 화면에 항상 보이는 field, `<details>` 안의 field와 정확한 section order를 설명한다.

[Answer]: A) `소개·연락·PDF` → `핵심 역량` → `경력·대표 성과` → `대표 project 요약` → optional `교육·자격` 순서로 둔다. 각 ordered 경력·성과의 title, period와 one-line summary 및 각 대표 project의 title과 approved outcome summary는 닫힌 화면에서도 보이고, 상세 block만 `<details>` 안에 둔다.

Portfolio의 여섯 case-study dimension 전체는 `/portfolio`가 소유한다. Résumé가 사용하는 project summary는 같은 canonical project projection에서 파생하며 별도 사실 copy를 만들지 않는다.

### Question 13 — profile-local navigation

공통 Header 외에 `/resume`와 `/portfolio` 안의 정적 profile-local navigation을 어떤 형태로 제공할까요?

A) Page heading 아래에 `홈`, Question 11에서 정한 résumé label, portfolio label의 compact navigation을 같은 순서로 두고 현재 page에 `aria-current="page"`를 표시한다. **(권장)**

B) 상단에는 `홈 / 현재 page` breadcrumb를 두고, heading 아래에는 반대 profile page로 가는 목적형 CTA 하나를 둔다.

C) Heading 근처에 반대 profile page로 가는 목적형 CTA만 두고, 홈 이동과 현재 위치는 공통 Header와 page heading이 담당한다.

X) Other (please describe after [Answer]: tag below) — 새 client JavaScript 없이 link label, 위치, 순서와 current-page 의미를 설명한다.

[Answer]: A) Page heading 아래에 `홈`, Question 11에서 정한 résumé label, portfolio label의 compact navigation을 같은 순서로 두고 현재 page에 `aria-current="page"`를 표시한다.

어느 선택에서도 모든 link는 server-rendered anchor이며 Question 11의 label 결정과 고정된 `/`, `/resume`, `/portfolio` route를 재사용한다.

### Question 14 — web·print·PDF fact parity

웹은 닫힌 `<details>` 안에도 승인된 상세 전체를 포함하고 PDF도 상세 전체를 포함한다는 승인과 기존 “core fact parity” 문구를 어떻게 통일할까요?

A) Ordered `ResumeProfile`의 모든 승인 사실을 normalized fact manifest로 만들고 web, print와 PDF에서 전부 자동 비교한다. Presentation-only label과 layout은 제외하고 text/URL은 Question 4·7 규칙으로 normalize하며 entity/section order는 비교한다. **(권장)**

B) 이름, 연락처, summary, 경력 제목·기간과 project 이름만 core manifest로 자동 비교하고, 나머지 승인 상세는 PDF visual/manual review로 확인한다.

C) Section별 content digest와 별도의 ordered section/entity ID vector를 비교해 전체 text 변경과 순서 변경을 감지하되 개별 atomic fact ID는 비교하지 않는다.

X) Other (please describe after [Answer]: tag below) — 자동 비교 대상, normalization, ordering sensitivity와 manual-review 경계를 설명한다.

[Answer]: A) Ordered `ResumeProfile`의 모든 승인 사실을 normalized fact manifest로 만들고 web, print와 PDF에서 전부 자동 비교한다. Presentation-only label과 layout은 제외하고 text/URL은 Question 4·7 규칙으로 normalize하며 entity/section order는 비교한다.

PDF binary byte equality는 browser metadata 차이 때문에 parity property로 사용하지 않는다. Missing, unreadable, stale-source와 one-fact mismatch는 별도 negative gate로 실패해야 한다.

## 6. Answer Validation Result

- **제출 시각**: 2026-07-23T13:51:44Z
- **답변**: A/A/A/A/A/A/A/A/A/A/A/A/A/A
- **형식 검증**: 통과. Q3의 선택이 `[Answer]:` 바로 다음 줄에 적혀 있었으나 의미가 유일해 같은 줄로 기계적으로 정규화했다.
- **명확성 검증**: 통과. 조건부, 혼합 선택, 미정 표현 또는 `X` 설명이 없다.
- **상호 일관성 검증**: 통과. 최소 schema, 독립 entity/reference, tagged 기간, normalized approved fact, aggregate fail-closed validation, strict link rule, explicit order, typed content blocks, visible metadata summary, shared navigation, résumé ordering과 full manifest parity가 하나의 data flow로 연결된다.
- **기존 승인 호환성**: 통과. Approved-only TypeScript source, 한국어 static route, closed native details, project 3~6개, no-new-client-JS, full-detail `/resume.pdf`, fixed route, no-push와 no-deploy 경계를 변경하지 않는다.
- **Clarification Status**: Not required.
- **Fact Approval Status**: 이 답변은 domain policy 승인이지 실제 이름, 연락처, 경력, project 또는 성과의 공개 승인이 아니다.

| Question | Answer | Confirmed Functional Decision |
|---|---|---|
| Q1 | A | 필수 identity/contact/intro, skill group, résumé highlight와 project 3~6개; 교육·자격·추가 링크 선택 |
| Q2 | A | 경력, 성과와 project는 독립 entity이며 project만 optional reference를 가짐 |
| Q3 | A | `year`/`year-month` tagged 기간과 `present`; 근거보다 정밀한 값 추정 금지 |
| Q4 | A | trim, LF, NFC를 한 번 적용하고 normalized empty를 거부 |
| Q5 | A | atomic fact inventory와 stable fact ID로 Approved-only production data를 연결 |
| Q6 | A | output 전 모든 issue를 stable `{code,path,message}` 순서로 집계하고 partial output 없이 실패 |
| Q7 | A | approved email/GitHub, HTTPS/root-relative evidence; absent optional만 생략하고 provided-invalid는 실패 |
| Q8 | A | entity-kind scoped stable kebab ID, collection-local positive unique order, gap 허용, fallback sort 금지 |
| Q9 | A | paragraph/list typed block, raw HTML/Markdown 금지, evidence link 분리 |
| Q10 | A | visible `resumeSummary`/`portfolioSummary`를 metadata description과 공유 |
| Q11 | A | `Tags`, `Graph`, `Résumé`, `Portfolio` ordered shared model |
| Q12 | A | 소개·역량·경력/성과·project·optional section 순서와 summary/detail split |
| Q13 | A | heading 아래 `홈`, `Résumé`, `Portfolio` static local nav와 current-page semantics |
| Q14 | A | 모든 ordered `ResumeProfile` 승인 사실의 web/print/PDF normalized manifest parity |

## 7. 답변 검증과 생성 경계

- 모든 답변은 문자 선택과 설명의 일치, 단일 의미, 상호 일관성 및 기존 승인 호환성을 검증한다.
- `X` 답변은 구현 도구가 아니라 business/domain contract를 충분히 설명해야 한다.
- 실제 공개 사실을 답변에 적더라도 이 단계의 선택 답변은 fact approval로 간주하지 않는다.
- Q1~Q14가 모두 명확해진 뒤에만 네 개의 Functional Design artifact를 생성한다.
- 최종 artifact에는 component별 Testable Properties 또는 구체적인 N/A 근거가 있어야 한다. 누락되면 PBT-01 blocking finding이므로 완료 gate를 제시하지 않는다.
- Functional Design 승인 전에는 U1 NFR Requirements로 진행하지 않는다.
- 이 계획 작성은 application source, external Vault, generated output, Terraform, AWS와 deployment를 변경하지 않는다.

## 8. Artifact Validation Result

- **검증 완료 시각**: 2026-07-23T14:15:08Z
- **필수 artifact**: 4/4 생성 및 상호 일관성 검증 완료.
- **설계 내용**: 승인된 A/A/A/A/A/A/A/A/A/A/A/A/A/A 결정, deterministic diagnostics, exact metadata title/description, Experience/Achievement variant, visible project outcome summary와 complete résumé fact manifest를 반영했다.
- **PBT-01**: Compliant. C01~C05, C11과 S01의 property 및 S04의 explicit `No PBT properties identified` 근거를 문서화하고 Code Generation handoff를 고정했다.
- **독립 검토**: 세 차례의 독립 관점 검토에서 발견된 manifest, projection, metadata negative property와 diagnostic 문제를 해결했으며 최종 재검토가 모두 PASS했다.
- **구조 검증**: 5개 대상 문서의 78개 Markdown table, 9개 relative link와 code fence balance가 통과했고 rule/property ID 중복 또는 미등록 diagnostic code가 없다.
- **Project Extension**: OBSIDIAN-01~05 준수. 문서-only Functional Design이므로 application quality gate와 generated-output refresh는 N/A이며 기존 user changes, feature branch, no-push/no-deploy 경계를 보존했다.
- **Fact/Mutation Boundary**: 실제 public fact, application source, external Vault, generated output, Git ref, remote branch, Terraform/AWS resource와 deployment는 변경하지 않았다.
- **Artifact Gate**: 2026-07-23T15:02:53Z에 사용자 응답 `"continue to the next stage"`로 승인됨.
