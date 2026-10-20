# U1 Functional Design — Domain Entities

## 문서 상태

- **단계**: CONSTRUCTION — U1 Functional Design
- **Unit**: U1 Profile Domain and Native Experience
- **Bounded Context**: Profile Experience
- **상태**: 완료 및 승인됨 — 2026-07-23T15:02:53Z
- **입력 결정**: U1 Functional Design Q1~Q14 = A/A/A/A/A/A/A/A/A/A/A/A/A/A
- **PBT Enforcement**: Full; 이 문서에는 PBT-01이 적용됨

## 1. 목적과 모델링 경계

이 문서는 U1이 소유하는 canonical profile aggregate, entity, value object, 관계, lifecycle, validation result, read model과 résumé fact manifest를 기술 중립적으로 정의한다.

다음 경계를 고정한다.

- 실제 이름, 연락처, 경력, 프로젝트, 성과, 교육 또는 자격 값은 이 문서에 포함하지 않는다.
- Production profile에는 사용자가 공개를 승인한 값과 그 stable `factId`만 존재한다.
- Draft, evidence, review status와 approval record는 production aggregate 밖의 fact-review artifact가 소유한다.
- `Experience`, `Achievement`와 `Project`는 서로 독립된 entity다. `Project`만 관련 `Experience` 또는 `Achievement`를 선택적으로 참조하며 사실을 중첩하거나 복사하지 않는다.
- 모든 public projection은 하나의 immutable `ValidatedProfile`에서 파생된다.
- 화면, metadata, print와 PDF는 새로운 사실을 만들거나 기존 사실을 추론하지 않는다.
- 새 runtime state, client-side workflow, database 또는 외부 runtime API를 domain model에 도입하지 않는다.
- PBT framework, browser/PDF engine, CSS 수치, 파일 배치와 배포 방식은 이 문서의 결정 대상이 아니다.

이 문서의 type 표기는 논리 계약이다. 특정 언어의 class, interface, schema library 또는 serialization framework를 뜻하지 않는다.

## 2. 공통 Value Objects

### 2.1 `FactId`와 `PublicFact<T>`

| Type | Shape | Invariant |
|---|---|---|
| `FactId` | stable lowercase kebab-case identifier | aggregate 전체에서 unique; 다른 의미의 fact에 재사용 금지 |
| `PublicFact<T>` | `factId`와 normalized `value: T` | 같은 `factId`의 production value가 fact-review inventory의 `Approved` normalized value와 정확히 같음 |

`FactId`는 `[a-z0-9]+(?:-[a-z0-9]+)*` 형태다. 앞뒤 또는 연속 hyphen, uppercase, whitespace와 빈 값은 허용하지 않는다.

`PublicFact<T>`에는 `Pending`, `Excluded`, evidence, reviewer, timestamp 또는 target-surface state를 넣지 않는다. 이 정보는 Section 7의 production 외부 review model만 소유한다. Entity `id`, `order`, variant tag와 relation reference는 구조 제어값이며 `PublicFact`가 아니다. 다만 그 변경도 final inventory와 production diff 승인 대상이다.

### 2.2 Text values

| Type | 용도 | Validation |
|---|---|---|
| `NormalizedText` | 모든 public text의 base value | 한 번의 canonicalization 뒤 non-empty |
| `SingleLineText` | 이름, headline, title, label, one-line summary, skill | LF를 포함하지 않는 `NormalizedText` |
| `BodyText` | paragraph content | LF를 허용하는 `NormalizedText`; raw markup 의미 없음 |
| `KoreanNarrativeText` | 소개, summary와 case-study 서술 | 한국어 prose를 기본으로 하되 기술명·고유명사·코드 표기는 허용 |

Text canonicalization은 각 leaf value에 정확히 다음 순서로 적용한다.

1. 앞뒤 Unicode whitespace를 제거한다.
2. CRLF와 CR을 LF로 바꾼다.
3. Unicode NFC를 적용한다.
4. 내부 공백, 내부 LF, paragraph 구조와 승인된 문장부호를 보존한다.
5. 정규화 뒤 빈 문자열이면 invalid다.
6. 길이를 자르거나 말줄임표를 넣거나 문장을 다시 쓰지 않는다.

`KoreanNarrativeText`의 사실성·언어 적합성은 human review 대상이다. 자동 language detection이 public fact approval을 대신하지 않는다. 긴 한국어, Unicode와 기술 문자열은 domain에서 유효하며 presentation/print layout이 이를 수용해야 한다.

### 2.3 Entity identity와 display order

| Type | Shape | Invariant |
|---|---|---|
| `EntityId<K>` | entity kind `K`에 속한 lowercase kebab-case identifier | 같은 concrete entity kind 안에서 unique |
| `DisplayOrder` | positive integer | sibling ordered collection 안에서 unique; gap 허용 |

`EntityId`도 `[a-z0-9]+(?:-[a-z0-9]+)*` 형태다. Validator는 invalid ID를 자동 소문자화하거나 rewrite하지 않는다.

Display ordering 규칙은 다음과 같다.

- `order` 오름차순만 canonical display order로 사용한다.
- `1..N` 연속성은 요구하지 않는다.
- 같은 sibling collection의 duplicate order는 invalid다.
- Date, source-array position, title 또는 ID를 display-order fallback으로 사용하지 않는다.
- Candidate의 array arrangement가 달라도 유효한 explicit order가 같으면 read model order는 같아야 한다.

Typed content block의 block 및 list-item sequence는 하나의 승인된 content value 내부 구조이므로 entity display collection이 아니다. 그 sequence는 명시된 array position을 그대로 보존하며 별도 `DisplayOrder`를 요구하지 않는다.

### 2.4 Tagged period

| Type | Shape | Validation |
|---|---|---|
| `YearPoint` | tag `year`, value `YYYY` | 네 자리 Gregorian year |
| `YearMonthPoint` | tag `year-month`, value `YYYY-MM` | 유효한 네 자리 year와 `01`~`12` month |
| `DatePoint` | `YearPoint` 또는 `YearMonthPoint` | tag와 lexical value 일치 |
| `PeriodEnd` | date point 또는 tag `present` | `present`는 종료 위치에서만 허용 |
| `Period` | `start: DatePoint`, `end: PeriodEnd` | dated end는 start와 같은 precision이며 start보다 이르지 않음 |

Period 전체를 하나의 `PublicFact<Period>`로 승인한다.

- `Experience.period`는 required다.
- `Achievement.period`, `Project.period`, `Education.period`와 `Certification.period`는 optional이다.
- Optional period가 present하면 완전하고 valid해야 한다.
- `year`와 `year-month` 사이를 추정으로 변환하거나 missing month를 채우지 않는다.
- Period가 없으면 date text 또는 placeholder를 투영하지 않는다.

### 2.5 Typed content blocks

| Variant | Required fields | Validation |
|---|---|---|
| `ParagraphBlock` | tag `paragraph`, `text: PublicFact<BodyText>` | normalized non-empty text |
| `ListBlock` | tag `list`, style `ordered` 또는 `unordered`, one or more `PublicFact<SingleLineText>` items | item마다 non-empty; source sequence 보존 |
| `ContentBlock` | `ParagraphBlock` 또는 `ListBlock` | unknown variant 금지 |
| `ContentBlocks` | one or more `ContentBlock` | empty dimension/detail collection 금지 when required |

Raw HTML, arbitrary Markdown, embedded link syntax와 executable content는 허용하지 않는다. Link는 `EvidenceLink`로 분리한다. Presentation은 block content를 재해석, 요약, 절단 또는 reorder하지 않는다.

### 2.6 Contact and link values

| Type | Shape | Validation |
|---|---|---|
| `EmailAddress` | one public mailbox address | display name/comment 없이 non-empty local/domain; whitespace와 control character 금지; network lookup 없음 |
| `GitHubProfileUrl` | `https://github.com/{account}` 형태의 absolute URL | scheme `https`, host `github.com`, non-empty account path; credentials/query/fragment 금지 |
| `ExternalEvidenceUrl` | absolute HTTPS URL | non-empty host; embedded credentials 금지; network reachability는 domain validation 밖 |
| `InternalEvidencePath` | root-relative site path | `/`로 시작하고 `//`, scheme, host, backslash와 `.`/`..` traversal segment를 허용하지 않음 |
| `LinkDestination` | tagged external URL 또는 internal path | tag와 value shape 일치 |

Email의 `mailto:` href는 approved `EmailAddress`에서 파생하며 별도 fact로 저장하지 않는다. Optional link가 absent하면 valid omission이다. Optional이어도 value가 제공됐는데 invalid하면 silent omission하지 않고 validation failure다.

### 2.7 References

`ProfileEntityReference`는 다음 두 variant만 허용한다.

| Variant | Target |
|---|---|
| `experience` | 같은 aggregate의 `Experience.id` |
| `achievement` | 같은 aggregate의 `Achievement.id` |

Reference는 target의 fact를 복제하지 않는다. Target kind와 ID가 모두 일치해야 한다. Project는 zero or one `ProfileEntityReference`를 가질 수 있고, absent이면 독립 프로젝트다. Experience와 Achievement reference를 동시에 가질 수 없다. Reverse reference는 저장하지 않고 필요할 때 derive한다.

## 3. Canonical Aggregate

### 3.1 `ProfileData`

`ProfileData`는 repository-owned production aggregate다.

| Field | Type and cardinality | Required | Aggregate rule |
|---|---|---:|---|
| `identity` | exactly one `ProfileIdentity` | Yes | 이름과 headline 완전성 |
| `narrative` | exactly one `ProfileNarrative` | Yes | 네 가지 visible/shared narrative 완전성 |
| `contact` | exactly one `ContactProfile` | Yes | approved email과 GitHub 모두 필요 |
| `skillGroups` | one or more `SkillGroup` | Yes | group/item 모두 non-empty |
| `experiences` | zero or more `Experience` | No | collection-local ID/order unique |
| `achievements` | zero or more `Achievement` | No | collection-local ID/order unique |
| `projects` | three through six `Project` | Yes | 모든 project가 complete case study |
| `education` | zero or more `Education` | No | empty면 section 전체 omission |
| `certifications` | zero or more `Certification` | No | empty면 section 전체 omission |

`experiences`와 `achievements`는 각각 optional이지만 두 collection의 합은 public-ready profile에서 one or more여야 한다. 이것이 Q1의 typed résumé highlight 최소 조건이다. Résumé는 경력을 먼저, 대표 성과를 다음에 표시하고 각 collection의 local order를 보존한다.

### 3.2 `ProfileIdentity`

| Field | Type | Required | Validation / projection |
|---|---|---:|---|
| `name` | `PublicFact<SingleLineText>` | Yes | 모든 필요한 projection이 같은 fact ID/value를 재사용 |
| `headline` | `PublicFact<KoreanNarrativeText>` constrained to single line | Yes | 한국어 headline; homepage/résumé shared fact |

Identity는 별도 entity ID가 없는 aggregate-owned value object다. 이름이나 headline을 metadata-only copy로 다시 저장하지 않는다.

### 3.3 `ProfileNarrative`

| Field | Type | Required | Validation / projection |
|---|---|---:|---|
| `shortIntro` | `PublicFact<KoreanNarrativeText>` | Yes | homepage의 visible introduction |
| `detailedIntro` | `ContentBlocks` | Yes | résumé의 visible detailed introduction |
| `resumeSummary` | `PublicFact<KoreanNarrativeText>` constrained to single line | Yes | résumé first view와 résumé metadata description이 같은 value 사용 |
| `portfolioSummary` | `PublicFact<KoreanNarrativeText>` constrained to single line | Yes | portfolio first view와 portfolio metadata description이 같은 value 사용 |

네 field는 목적이 다르므로 서로 자동 대체하지 않는다. Metadata builder가 hidden summary를 만들거나 visible copy보다 강한 문장을 합성할 수 없다.

### 3.4 `ContactProfile`

| Field | Type and cardinality | Required | Validation / projection |
|---|---|---:|---|
| `email` | `PublicFact<EmailAddress>` | Yes | `mailto:` action 파생 |
| `github` | `PublicFact<GitHubProfileUrl>` | Yes | résumé와 portfolio contact action 공유 |
| `additionalLinks` | zero or more `EvidenceLink` | No | absent link/collection은 anchor와 wrapper 모두 omission |

Contact value는 페이지별로 복제하지 않는다. `additionalLinks`는 contact purpose의 link만 소유하며 project evidence를 중복 저장하지 않는다.

### 3.5 `SkillGroup` and `Skill`

#### `SkillGroup`

| Field | Type | Required | Validation |
|---|---|---:|---|
| `id` | `EntityId<skill-group>` | Yes | skill-group kind 안에서 unique |
| `order` | `DisplayOrder` | Yes | root `skillGroups` 안에서 unique |
| `title` | `PublicFact<SingleLineText>` | Yes | normalized non-empty |
| `skills` | one or more `Skill` | Yes | local ID/order unique |

#### `Skill`

| Field | Type | Required | Validation |
|---|---|---:|---|
| `id` | `EntityId<skill>` | Yes | skill kind 안에서 aggregate-wide unique |
| `order` | `DisplayOrder` | Yes | owning group 안에서 unique |
| `name` | `PublicFact<SingleLineText>` | Yes | normalized non-empty; arbitrary truncation 없음 |

Skill group과 skill order는 explicit order만 사용한다. Alphabetic 또는 source-array fallback sort는 허용하지 않는다.

### 3.6 `Experience`

| Field | Type and cardinality | Required | Validation / meaning |
|---|---|---:|---|
| `id` | `EntityId<experience>` | Yes | experience kind 안에서 unique |
| `order` | `DisplayOrder` | Yes | `experiences` 안에서 unique |
| `organization` | `PublicFact<SingleLineText>` | Yes | 추정 금지 |
| `role` | `PublicFact<SingleLineText>` | Yes | first-view title 구성의 approved source |
| `period` | `PublicFact<Period>` | Yes | tagged precision; no inferred month |
| `summary` | `PublicFact<KoreanNarrativeText>` constrained to single line | Yes | closed first view에서 항상 visible |
| `details` | `ContentBlocks` | Yes | one or more approved blocks; native detail content 제공 |
| `evidence` | zero or more `EvidenceLink` | No | valid public evidence만 제공 |

Experience가 존재하면 organization, role, period, summary와 non-empty details가 모두 있어야 한다. Empty disclosure나 summary-only Experience를 public-ready highlight로 허용하지 않는다. Experience는 Project 안에 중첩되지 않는다.

### 3.7 `Achievement`

| Field | Type and cardinality | Required | Validation / meaning |
|---|---|---:|---|
| `id` | `EntityId<achievement>` | Yes | achievement kind 안에서 unique |
| `order` | `DisplayOrder` | Yes | `achievements` 안에서 unique |
| `title` | `PublicFact<SingleLineText>` | Yes | closed first view에서 visible |
| `period` | `PublicFact<Period>` | No | absent면 period output 없음 |
| `summary` | `PublicFact<KoreanNarrativeText>` constrained to single line | Yes | closed first view에서 visible |
| `details` | `ContentBlocks` | Yes | one or more approved blocks; native detail content 제공 |
| `evidence` | zero or more `EvidenceLink` | No | valid public evidence만 제공 |

Achievement는 title, summary와 non-empty details를 모두 가져야 한다. 고용 관계나 수치 성과를 암시하지 않으며, 그런 claim은 해당 atomic fact와 evidence에 대한 별도 승인이 있을 때만 text value에 존재할 수 있다.

### 3.8 `Project`

| Field | Type and cardinality | Required | Validation / meaning |
|---|---|---:|---|
| `id` | `EntityId<project>` | Yes | project kind 안에서 unique |
| `order` | `DisplayOrder` | Yes | root `projects` 안에서 unique |
| `title` | `PublicFact<SingleLineText>` | Yes | résumé와 portfolio shared fact |
| `period` | `PublicFact<Period>` | No | absent면 period output 없음 |
| `outcomeSummary` | `PublicFact<KoreanNarrativeText>` constrained to single line | Yes | résumé project summary와 portfolio overview가 재사용 |
| `problem` | `ContentBlocks` | Yes | case-study dimension 1 |
| `role` | `ContentBlocks` | Yes | case-study dimension 2 |
| `keyDecisions` | `ContentBlocks` | Yes | case-study dimension 3 |
| `architecture` | `ContentBlocks` | Yes | case-study dimension 4 |
| `outcomes` | `ContentBlocks` | Yes | case-study dimension 5 |
| `lessons` | `ContentBlocks` | Yes | case-study dimension 6 |
| `evidence` | zero or more `EvidenceLink` | No | absent면 evidence UI 전체 omission |
| `relatedProfileEntity` | zero or one `ProfileEntityReference` | No | existing Experience 또는 Achievement 하나만 참조; content copy 금지 |

Project invariant는 다음과 같다.

- Root aggregate에는 exactly three through six projects가 있어야 한다.
- 여섯 dimension은 모두 one or more typed blocks를 가져야 한다.
- Dimension display order는 `problem → role → keyDecisions → architecture → outcomes → lessons`로 고정된다.
- Résumé는 title, optional period와 `outcomeSummary`만 사용한다. 여섯 dimension을 résumé용 copy로 만들지 않는다.
- Portfolio는 canonical project order와 여섯 dimension 전체를 사용한다.
- Related reference는 project의 context를 연결할 뿐 target의 organization, role, period, title 또는 summary를 project 안에 복제하지 않는다.

### 3.9 `Education`

| Field | Type and cardinality | Required when entity exists | Validation |
|---|---|---:|---|
| `id` | `EntityId<education>` | Yes | education kind 안에서 unique |
| `order` | `DisplayOrder` | Yes | `education` 안에서 unique |
| `title` | `PublicFact<SingleLineText>` | Yes | normalized non-empty |
| `subtitle` | `PublicFact<SingleLineText>` | No | absent면 subtitle node 없음 |
| `period` | `PublicFact<Period>` | No | provided-invalid는 failure |
| `details` | zero or more `ContentBlock` | No | absent면 detail node 없음 |
| `evidence` | zero or more `EvidenceLink` | No | approved public link만 |

Education collection 전체가 absent 또는 empty이면 résumé의 교육 heading, wrapper와 placeholder를 모두 생략한다.

### 3.10 `Certification`

| Field | Type and cardinality | Required when entity exists | Validation |
|---|---|---:|---|
| `id` | `EntityId<certification>` | Yes | certification kind 안에서 unique |
| `order` | `DisplayOrder` | Yes | `certifications` 안에서 unique |
| `title` | `PublicFact<SingleLineText>` | Yes | normalized non-empty |
| `issuer` | `PublicFact<SingleLineText>` | No | absent면 issuer node 없음 |
| `period` | `PublicFact<Period>` | No | provided-invalid는 failure |
| `details` | zero or more `ContentBlock` | No | absent면 detail node 없음 |
| `evidence` | zero or more `EvidenceLink` | No | approved public link만 |

Certification collection 전체가 absent 또는 empty이면 résumé의 자격 heading, wrapper와 placeholder를 모두 생략한다.

### 3.11 `EvidenceLink`

| Field | Type | Required | Validation |
|---|---|---:|---|
| `id` | `EntityId<evidence-link>` | Yes | evidence-link kind 안에서 aggregate-wide unique |
| `order` | `DisplayOrder` | Yes | owning evidence collection 안에서 unique |
| `label` | `PublicFact<SingleLineText>` | Yes | destination이 아니라 목적을 설명하는 label |
| `destination` | `PublicFact<LinkDestination>` | Yes | HTTPS external 또는 root-relative internal only |

EvidenceLink는 Contact, Experience, Achievement, Project, Education 또는 Certification 중 정확히 한 canonical owner에 속한다. 같은 link를 여러 surface에서 보여야 하면 그 owner entity를 projection하고 link fact를 복사하지 않는다.

## 4. Relationships and Cardinalities

| From | Relationship | To | Cardinality | Ownership / delete rule |
|---|---|---|---|---|
| `ProfileData` | owns | `ProfileIdentity` | exactly 1 | aggregate와 함께 존재 |
| `ProfileData` | owns | `ProfileNarrative` | exactly 1 | aggregate와 함께 존재 |
| `ProfileData` | owns | `ContactProfile` | exactly 1 | aggregate와 함께 존재 |
| `ProfileData` | owns | `SkillGroup` | 1..N | group 제거 후에도 최소 cardinality 유지 |
| `SkillGroup` | owns | `Skill` | 1..N | group 안에서만 display order 의미 |
| `ProfileData` | owns | `Experience` | 0..N | Achievement와 합쳐 최소 1 |
| `ProfileData` | owns | `Achievement` | 0..N | Experience와 합쳐 최소 1 |
| `ProfileData` | owns | `Project` | 3..6 | 선정과 order 변경은 user reapproval 대상 |
| `ProfileData` | owns | `Education` | 0..N | empty collection은 omitted |
| `ProfileData` | owns | `Certification` | 0..N | empty collection은 omitted |
| eligible owner entity | owns | `EvidenceLink` | 0..N | link는 한 canonical owner만 가짐 |
| `Project` | references | `Experience` or `Achievement` | 0..1 total | non-owning exclusive variant; referenced target 삭제 전 reference 제거 필요 |

Entity kind별 ID uniqueness는 separate namespace를 사용한다. 예를 들어 같은 lexical ID가 Experience와 Achievement에 각각 존재할 수 있으나, reference에는 kind가 반드시 포함되어 ambiguity가 없어야 한다.

Project reference에는 display order가 없다. Optional target identity만 보존하며 target facts 또는 project facts를 복제하지 않는다.

## 5. Normalized and Validated Domain States

### 5.1 State types

| State | Meaning | May feed public projection? |
|---|---|---:|
| `ProfileData` | production candidate with fact IDs and values | No |
| `NormalizedProfile` | every text/link leaf canonicalized once; input preserved | No |
| `ValidatedProfile` | all structural, cardinality, value, uniqueness and reference invariants pass | Yes, only after fact-approval gate for production |
| `FactApprovedProfile` | `ValidatedProfile` plus external materialization receipt proving approved-only correspondence | Yes |
| `PublicReleaseReadyProfile` | fact-approved route outputs plus current readable PDF and full manifest parity | Yes; U1 completion state |

`ValidatedProfile` is immutable. It is not constructible by assertion or by copying a candidate into a branded shape; only a successful aggregate validation may create it.

### 5.2 Public-ready invariants

A profile cannot become `FactApprovedProfile` unless all conditions below hold.

1. Identity, narrative and required contact values are complete and valid.
2. At least one non-empty SkillGroup exists.
3. `experiences.length + achievements.length >= 1`.
4. Every Experience and Achievement has one or more approved detail blocks.
5. Three through six complete Projects exist.
6. Entity IDs and sibling orders satisfy their exact scopes.
7. Every provided period, URL, content block and relation is valid.
8. Every production `PublicFact` has one matching `Approved` record with the same `factId`, normalized value and canonical target path.
9. No `Pending` or `Excluded` fact is materialized.
10. The user explicitly approved the final fact inventory and production diff.

`PublicReleaseReadyProfile` additionally requires:

1. `/resume` and `/portfolio` read models and metadata were derived from the same fact-approved profile.
2. `/resume.pdf` exists at the stable public contract, is readable and was regenerated from the current résumé source.
3. Expected, web, print and PDF résumé fact manifests are equal.
4. Missing, stale, unreadable or mismatched document evidence has no success fallback.

### 5.3 Validation result

`ValidationResult<T>` is exactly one of:

- success with one complete immutable value `T` and no issues;
- failure with a non-empty ordered collection of `ValidationIssue` and no value.

No partial normalized profile, partial validated entity, partial read model, page, metadata document or PDF success result crosses a failed boundary.

### 5.4 `ValidationIssue`

| Field | Meaning |
|---|---|
| `code` | stable machine-readable `ProfileIssueCode` |
| `path` | stable logical `ProfilePath` from root `profile` |
| `message` | deterministic human-readable explanation; no personal value echo unless needed to locate the field |

Issue paths address the authored candidate by source index, including when an entity ID is valid. This lets the author locate the exact source occurrence and keeps duplicate-ID diagnostics unambiguous.

- Entity field: `profile.projects[2].outcomes[0]`
- Invalid or duplicate entity ID: `profile.projects[2].id`
- Aggregate count: `profile.projects`
- Approval mapping: `profile.facts[4].factId`
- Route consistency: `profile.metadata.resume.description`

Issues are aggregated before public output, exact duplicates are removed, and then sorted by:

1. canonical validation phase;
2. root schema field rank;
3. collection source index with numeric semantics;
4. lowercase dotted issue code의 사전식 순서;
5. message template의 사전식 순서.

`ProfileIssueCode`와 message template의 canonical vocabulary는 [Business Rules](business-rules.md) Section 1.3이 소유한다. Domain entity validator는 그 lowercase dotted code를 그대로 사용하며 별도 uppercase alias를 만들지 않는다.

| Domain area | Binding code family |
|---|---|
| shape/text/cardinality | `field.*`, `text.*`, `collection.*` |
| fact/entity identity와 order | `fact.identifier.*`, `identifier.*`, `order.*` |
| period/relation | `period.*`, `reference.*` |
| contact/evidence/content | `contact.*`, `evidence.*`, `content.*` |
| approval | `approval.*` |
| metadata/JSON-LD/navigation | `metadata.*`, `jsonld.*`, `navigation.*` |
| document/parity | `document.*` |

Provided-invalid optional data uses the same field-specific issue codes as required data; it is not downgraded to a warning.

## 6. Read Models and Derived Contracts

### 6.1 `ResumeProfile`

`ResumeProfile` is a read-only ordered projection with these fields:

| Field | Source | Rule |
|---|---|---|
| `identity` | `ProfileIdentity` | same fact IDs and values |
| `resumeSummary` | `ProfileNarrative.resumeSummary` | first view and metadata source |
| `detailedIntro` | `ProfileNarrative.detailedIntro` | all approved blocks retained |
| `contactActions` | `ContactProfile` | email, GitHub and present additional links |
| `skillGroups` | root skill groups | group and skill order ascending |
| `experiences` | root experiences | career section first; collection order ascending |
| `achievements` | root achievements | achievement section second; collection order ascending |
| `projectSummaries` | root projects | title, optional period, outcomeSummary and project identity only |
| `education` | root education | absent collection produces no read-model section |
| `certifications` | root certifications | absent collection produces no read-model section |

Résumé fixed section order is:

1. 소개·연락·PDF
2. 핵심 역량
3. 경력·대표 성과
4. 대표 프로젝트 요약
5. 교육, when present
6. 자격, when present

Every present Experience/Achievement has and retains one or more detail blocks in the read model even though screen disclosure begins closed. Experience retains separate organization, role and required period facts; presentation uses role as its heading but also displays organization in the same summary. Achievement retains title and its optional period. PDF and print consumers receive those same blocks and facts. A selector never creates a period, title, summary, evidence link or detail that is absent from the canonical entity.

### 6.2 `PortfolioProfile`

`PortfolioProfile` contains:

- visible `portfolioSummary`;
- required email and GitHub contact actions plus present additional contact links;
- exactly three through six complete Projects in `order` ascending;
- every Project's visible title, optional period, visible outcome summary, six ordered dimensions and present evidence links.

The selector resolves relation identity only when the portfolio contract needs context; it never copies target Experience/Achievement facts into the Project.

### 6.3 `HomepageProfile`

`HomepageProfile` contains only:

- approved name;
- approved headline;
- approved `shortIntro`;
- fixed internal destinations `/resume` and `/portfolio`.

It contains no Vault content, post/discovery state, metadata-only claim, external Notion link or page-specific fact copy. U2 owns placement in the actual homepage artifact.

### 6.4 `ProfilePageMetadata`

| Field | Résumé source | Portfolio source |
|---|---|---|
| page identity | fixed `resume` route identity | fixed `portfolio` route identity |
| title | exact template `{approvedName} — Résumé` | exact template `{approvedName} — Portfolio` |
| description | exact normalized `resumeSummary` | exact normalized `portfolioSummary` |
| canonical | operating site origin plus `/resume` | operating site origin plus `/portfolio` |
| Open Graph / Twitter | same route title, description and canonical claims | same route title, description and canonical claims |
| JSON-LD | conservative `ProfilePage` and approved minimum `Person` | conservative `CollectionPage`, `ItemList` and approved project `CreativeWork` claims |

`ProfilePageMetadata` is a derived value object, not a second canonical fact source. JSON-LD scalar claims must be fixed constants or carry provenance to visible `PublicFact` IDs. Optional claims are omitted, never represented by empty strings or placeholders.

### 6.5 Navigation models

| Model | Ordered items | Current-state rule |
|---|---|---|
| `PrimaryNavigationModel` | `Tags`, `Graph`, `Résumé`, `Portfolio` | normalized exact route 또는 slash-delimited descendant matching; prefix collision 제외; at most one current item |
| `ProfileLocalNavigationModel` | `홈`, `Résumé`, `Portfolio` | current profile page has `aria-current="page"` |

Navigation items are fixed route/presentation values, not personal facts. Desktop and mobile projections consume the same immutable primary model. Profile items never enter search, graph, tags or knowledge nav-tree domain collections.

### 6.6 `ResumeFactManifest`

`ResumeFactManifest` is the semantic parity contract for all approved résumé facts.

| Field | Meaning |
|---|---|
| `sourceIdentity` | identity of the exact validated résumé projection |
| `sectionOrder` | fixed present-section vector after optional omission |
| `entityOrder` | ordered entity kind/ID vectors for skill groups, entries, projects, education and certifications |
| `entries` | ordered normalized fact entries |
| `fingerprint` | deterministic identity derived from `sourceIdentity`, both order vectors and every entry; algorithm deferred to NFR Design |

Each manifest entry contains:

- required section key and section order;
- owning entity kind, ID and entity order when applicable to an entity-owned fact;
- globally unique `factId`;
- canonical semantic path;
- fact value kind;
- normalized text, period or URL value.

The manifest includes every `PublicFact` used by `ResumeProfile`, including closed detail content and optional values that are present. It excludes:

- presentation-only Korean section labels;
- CSS, icon and layout values;
- disclosure open/closed state;
- PDF binary metadata and byte sequence;
- portfolio-only six-dimension detail not selected into `ResumeProfile`.

Manifest equality requires the same source identity, fingerprint, section vector, entity vector and ordered fact entries. One missing, extra, changed or reordered fact is a mismatch.

### 6.7 Resume document contracts

| Contract | Required semantic fields | Invariant |
|---|---|---|
| `ResumeDocumentLink` | public href `/resume.pdf`, purpose label | href is stable and not page-local duplicate state |
| `ResumeDocumentRequest` | rendered `/resume` identity, source fingerprint, expected fact manifest, target release path | source and manifest come from the current `ResumeProfile` |
| `ResumeDocumentResult` | generation status, output identity and inspection input | stale pre-existing file cannot represent success |
| `ResumeDocumentInspection` | readable/file status and extracted fact manifest | parity compares semantics, not PDF bytes |

Browser, filesystem and PDF generation are boundary side effects. The pure domain part is the source/fingerprint/manifest guard.

## 7. Fact Review and Approval Lifecycle

### 7.1 Production-external review models

`FactReviewInventory` and `FactApprovalReceipt` are review artifacts, not members of `ProfileData`.

Each `FactReviewRecord` contains:

| Field | Meaning |
|---|---|
| `factId` | stable ID that is carried into `PublicFact<T>` when approved |
| `canonicalPath` | intended production logical path |
| `normalizedValue` | exact value shown to the reviewer |
| `evidence` | public source reference or explicit user-provided basis |
| `targetSurfaces` | intended résumé, portfolio, homepage, metadata and/or PDF use |
| `status` | exactly `Approved`, `Excluded` or `Pending` |
| `decisionRecord` | explicit user review evidence for the current normalized value |

`FactApprovalReceipt` identifies the reviewed inventory revision and the exact production diff revision approved together. It does not become a runtime user session or database record.

### 7.2 Materialization rules

1. Normalize a proposed atomic fact before review.
2. Assign a stable `factId` and canonical target path.
3. Keep the fact out of production while it is `Pending`.
4. Materialize only `Approved` values with the same `factId` and normalized value.
5. Omit an `Excluded` optional fact completely.
6. Block public-ready materialization when a required fact is `Pending` or `Excluded`.
7. Require explicit approval of the final inventory and production diff.

Reapproval is mandatory when any of these changes:

- normalized public value;
- fact ID or canonical target path;
- evidence or target surfaces;
- selected project set or project/entity display order;
- Experience/Achievement relationship;
- public link destination;
- metadata or PDF projection allowlist.

Changing a normalized value for the same semantic fact keeps the stable `factId` but resets its status to `Pending`. A removed fact ID is not reassigned to a different semantic fact.

Human approval establishes truth and publication permission. Structural validation and PBT can prove correspondence and omission rules, but cannot prove that a career claim, metric, role or evidence is true.

## 8. Aggregate and Entity Invariants

| ID | Invariant | Failure behavior |
|---|---|---|
| `INV-01` | every public text leaf is normalized once and non-empty | collect field issue; no validated value |
| `INV-02` | fact IDs are valid, globally unique and approved-value matched | block fact materialization/public output |
| `INV-03` | entity IDs are valid and unique within concrete kind | collect all ID issues |
| `INV-04` | every sibling entity collection has positive unique order; gaps allowed | no fallback order; validation failure |
| `INV-05` | one or more skill groups, each with one or more skills | aggregate/child cardinality issue |
| `INV-06` | Experience and Achievement combined count is at least one, and every such entity has non-empty details | public-ready failure; no empty or summary-only résumé highlight |
| `INV-07` | Experience period is required; other optional periods are complete when present | field issue; no inferred precision |
| `INV-08` | Project count is 3..6 and each project has all six dimensions | aggregate and field issues; no partial portfolio |
| `INV-09` | each Project has at most one optional reference and it resolves to the declared Experience or Achievement kind | relation issue; no dangling or multi-parent projection |
| `INV-10` | absent optional values produce no read-model node; provided-invalid values fail | silent broken/empty output forbidden |
| `INV-11` | every selector preserves fact provenance, explicit order and input immutability | projection failure |
| `INV-12` | metadata descriptions equal visible route summaries and JSON-LD never strengthens claims | page build failure |
| `INV-13` | expected/web/print/PDF résumé manifests are fully equal | U1 completion blocked |
| `INV-14` | validation failure returns all deterministic issues and no partial value | public assembly receives nothing |

## 9. PBT-01 Testable Properties

The following properties are binding inputs to U1 Code Generation. Framework, run count, seed syntax, reusable generator implementation and shrinking command remain U1 NFR Requirements decisions.

### 9.1 Entity and value-object properties

| Property ID | Entity / operation | Category | Generated domain / precondition | Assertion / oracle | Traceability |
|---|---|---|---|---|---|
| `DE-P01` | text and content-block normalization | Idempotence, Invariant | Korean/Unicode, combining characters, CRLF/CR/LF, edge whitespace, paragraph/list leaves | normalizing twice equals once; result uses LF/NFC, is trimmed, preserves internal content and never truncates | FR-001, FR-002, FR-015; EDGE-001, EDGE-005 |
| `DE-P02` | `ProfileIdentity`, `ProfileNarrative`, `ContactProfile` validation | Invariant, Easy verification | generated valid required facts plus one labelled missing/invalid mutation | valid values close under validation; mutation yields its expected stable code/path and no entity value | FR-001, FR-002, FR-004, FR-006; AC-U02-01, AC-U05-01/04 |
| `DE-P03` | `SkillGroup` and `Skill` ordering | Invariant, Oracle | one or more groups/items with unique sparse orders and permuted candidate arrays | validated projection is numeric-order sorted, preserves exactly the same IDs/facts and does not mutate input | FR-001, FR-004; AC-E01-04; EDGE-003 |
| `DE-P04` | `Experience` / `Achievement` variant validation | Invariant, Easy verification | valid mixed collections with non-empty details, Experience period required and Achievement period optional | every projected entry has detail blocks and satisfies its variant rules; missing details or required Experience period fails at the source-index path; absent optional Achievement period remains absent | FR-002, FR-004; AC-U02-01~03; EDGE-001, EDGE-006 |
| `DE-P05` | `Period` predicate | Oracle, Easy verification | valid year/year-month points and controlled bad precision/range/present mutations | simple tagged reference predicate agrees; no precision inference; valid start/end order preserved | FR-001, FR-002; AC-E01-02; EDGE-001 |
| `DE-P06` | `Project` validation | Invariant, Oracle, Easy verification | complete project sets at 3 and 6 plus controlled 2/7, missing-dimension, duplicate-ID/order mutations | only 3..6 complete unique ordered projects validate; six-dimension reference checker agrees; failure path is exact | FR-005, FR-015; AC-U04-01~03, AC-E01-02; EDGE-002, EDGE-003 |
| `DE-P07` | Project relationship resolution | Invariant, Easy verification | valid projects with zero/one typed reference and controlled missing, wrong-kind or multi-parent mutations | every accepted optional reference resolves exactly once without copied target facts; invalid or multiple reference shape blocks profile | FR-001, FR-002, FR-005; AC-E01-02, AC-E02-02/03 |
| `DE-P08` | `EvidenceLink`, email and GitHub validation | Invariant, Oracle | allowed email/GitHub/HTTPS/root-relative values and one controlled invalid scheme/host/path mutation | conservative reference predicate agrees; absent optional link is valid; provided-invalid link always fails | FR-005, FR-006; AC-U04-03, AC-U05-01~04; EDGE-004, EDGE-006 |
| `DE-P09` | `Education` / `Certification` omission | Invariant | independently absent/present optional collections and fields | absence removes the complete read-model section/node; presence preserves IDs, facts and order; invalid provided value never reaches selector | FR-004; AC-U02-03, AC-E01-03; EDGE-006 |
| `DE-P10` | aggregate validation issues | Invariant, Oracle, Easy verification | valid aggregate plus one or multiple labelled violations | issue set equals reference rule results, stable sorted order is repeatable, exact duplicates are absent and no partial value exists | FR-001, FR-015; AC-E01-02/04; EDGE-001~004 |

### 9.2 Projection, approval and manifest properties

| Property ID | Contract / operation | Category | Generated domain / precondition | Assertion / oracle | Traceability |
|---|---|---|---|---|---|
| `DE-P11` | all C01 selectors | Invariant, Oracle | any valid immutable aggregate with optional combinations and sparse order | each output fact ID/value belongs to the canonical allowlist; member count/order is correct; unrelated projection remains unchanged after a controlled route-local fact change | FR-001, FR-002; AC-E01-01/03/04, AC-E02-02/03 |
| `DE-P12` | fact-review materialization shape | Invariant, Easy verification | generated inventory with Approved/Pending/Excluded records and matching or controlled production mutations | production fact IDs/values equal the selected Approved set; no Pending/Excluded value materializes; required non-approved fact blocks readiness | FR-002, FR-015; AC-E02-01~03, AC-U05-04 |
| `DE-P13` | route metadata builder and consistency validator | Oracle, Invariant | valid résumé/portfolio profiles and site identity plus one controlled route/title/canonical/description/claim/ItemList mutation | valid title uses the exact route template, description equals the visible route summary, canonical/type is route-fixed and every non-constant claim has source fact provenance; each mutation returns the expected stable diagnostic and no partial metadata | FR-002, FR-011, FR-015; AC-U02-04, AC-U04-04, AC-E02-02/03 |
| `DE-P14` | `ResumeFactManifest` | Invariant, Oracle, Easy verification | valid résumé profile and identical or one-change/add/delete/reorder manifest including text, period and URL facts | identical complete manifests pass; every controlled fact, value-kind/value, section-order or entity-kind/ID/order difference fails | FR-004, FR-010, FR-015; AC-U03-03/04, AC-E02-04; EDGE-009 |
| `DE-P15` | document source guard | Invariant, Oracle | current profile plus matching or controlled source fingerprint/path mutation | only current `/resume` source and stable `/resume.pdf` link contract pass; no stale/mismatched partial success | FR-010; AC-U03-02~04; EDGE-008, EDGE-009 |

These domain properties refine the shared U1 property catalog `U1-P01` through `U1-P06`, `U1-P08`, `U1-P11` and `U1-P12`. Presentation-tree, browser keyboard/focus, CSS layout and JSON-LD host serialization properties remain in their owning Functional Design artifacts and are not duplicated here.

### 9.3 Required generator semantics

- Generate complete domain objects rather than unrelated primitive values.
- Include Hangul, Latin technical terms, digits, punctuation, long Unicode, combining input before NFC and line-ending variation.
- Construct valid unique IDs/orders directly; do not depend on filtering random duplicates.
- Weight project counts 3 and 6, then derive exactly one 2 or 7 mutation for invalid cases.
- Generate Experience with required periods and Achievement/Project/supplementary records with both absent and valid-present periods.
- Generate every optional field in absent and valid-present forms.
- Create invalid cases by applying exactly one labelled mutation to a valid aggregate so the expected issue path is known.
- Preserve every unrelated invariant while shrinking a chosen invalid case.
- When a property exposes a defect, promote the shrunk minimal counterexample to the corresponding permanent named example-regression suite while retaining the general property.
- Generate references only from existing typed target sets for valid cases.
- Generate fact-review snapshots whose matching relation is known before applying one approval/value mutation.

### 9.4 Explicit N/A decisions

| Category / subject | Decision and rationale |
|---|---|
| `ProfileData` round-trip | No public encode/decode pair is defined in Functional Design. If Code Generation introduces one, PBT-02 must be added then. |
| Commutativity | Display and manifest order are business meaning. Reference canonicalization is an ordering invariant, not an independently commutative operation. |
| Induction | Aggregate and block structures are finite and non-recursive; direct invariant checks are sufficient. |
| Stateful PBT | Domain values are immutable build-time values with no session, queue, cache or state machine. |
| Human fact truth/approval | Generator output cannot prove a claim true or replace explicit user approval. Only structural inventory correspondence is property-testable. |
| PDF byte equality | Binary bytes, metadata, pagination and visual layout are not the fact-parity oracle. Full normalized manifest equality is used instead. |
| Browser and CSS behavior | Layout, focus appearance, contrast, print page breaks and disclosure interaction need example/browser/document verification, not domain-entity PBT. |
| S04 side-effect orchestration | No independent entity property: filesystem/browser generation is side-effectful; its pure source/manifest guard is already `DE-P14`/`DE-P15`. |

## 10. Traceability

### 10.1 Decision traceability

| Decision | Domain contract |
|---|---|
| Q1 | Required identity/narrative/contact, one or more SkillGroup, one or more total Experience/Achievement, Project 3..6; Education/Certification optional |
| Q2 | Independent Experience/Achievement/Project; only Project holds optional typed references |
| Q3 | Tagged `year`/`year-month` Period; required for Experience, optional for Achievement/Project; no precision inference |
| Q4 | trim, LF and NFC once; normalized empty invalid; internal content preserved and no truncation |
| Q5 | external atomic fact inventory; production `PublicFact` carries only stable fact ID/value; final inventory+diff approval |
| Q6 | aggregate all stable issues before failing; no partial validated/public value |
| Q7 | approved email, exact GitHub profile, HTTPS external/root-relative internal links; absent optional omit, invalid provided fail |
| Q8 | kind-scoped kebab IDs, sibling positive unique orders, gaps allowed, no fallback/date sort |
| Q9 | typed paragraph/list blocks, no raw HTML/Markdown, separate EvidenceLink entity |
| Q10 | visible route summaries are exact metadata descriptions; JSON-LD uses visible approved allowlist |
| Q11 | fixed primary navigation order `Tags`, `Graph`, `Résumé`, `Portfolio` |
| Q12 | résumé fixed section order and first-view summary/detail split |
| Q13 | fixed local navigation `홈`, `Résumé`, `Portfolio` with current-page semantics |
| Q14 | every approved ResumeProfile fact plus section/entity order participates in full manifest parity |

### 10.2 Requirement, story and edge traceability

| Domain area | Requirements | Stories / acceptance criteria | Edge scenarios | PBT |
|---|---|---|---|---|
| `ProfileData`, `PublicFact`, `ValidatedProfile` | FR-001, FR-002, FR-015 | ST-E01 AC-E01-01~04; ST-E02 AC-E02-01~03 | EDGE-001, EDGE-003, EDGE-010 | DE-P01~03, DE-P10~12 |
| Identity and narratives | FR-001, FR-003, FR-004, FR-011 | ST-U02 AC-U02-01/03/04; ST-U01 contributor | EDGE-001, EDGE-005, EDGE-006 | DE-P01/02, DE-P11/13 |
| Contact and evidence | FR-002, FR-005, FR-006 | ST-U04 AC-U04-03; ST-U05 AC-U05-01~04; ST-E02 | EDGE-004, EDGE-006 | DE-P08, DE-P11/12 |
| Skill groups | FR-001, FR-004 | ST-U02 AC-U02-01; ST-E01 | EDGE-001, EDGE-003, EDGE-005 | DE-P03 |
| Experience and Achievement | FR-002, FR-004 | ST-U02 AC-U02-01~03; ST-E02 | EDGE-001, EDGE-003, EDGE-006 | DE-P04/05/07 |
| Project and six dimensions | FR-002, FR-005 | ST-U04 AC-U04-01~04; ST-E01; ST-E02 | EDGE-002~006 | DE-P06~08 |
| Education and Certification | FR-002, FR-004 | ST-U02 AC-U02-03; ST-E01 AC-E01-03 | EDGE-006 | DE-P09 |
| Read models and static route inputs | FR-003~FR-007, FR-012, FR-013 | ST-U01 contributor; ST-U02; ST-U04; ST-U05 | EDGE-005, EDGE-006, EDGE-011 | DE-P11 |
| Metadata source model | FR-002, FR-011 | AC-U02-04, AC-U04-04; ST-E02 | EDGE-005 | DE-P13 |
| Résumé manifest/document boundary | FR-004, FR-010 | ST-U03 AC-U03-01~04; ST-E02 AC-E02-04 | EDGE-008, EDGE-009 | DE-P14/15 |
| U1 owner-local property slice | FR-015 | U1 contribution to ST-E03 AC-E03-01~04 | EDGE-010 | DE-P01~15 |

### 10.3 Component and service ownership

| Owner | Entity/read-model responsibility |
|---|---|
| C01 Profile Domain | all canonical entities/value objects, normalization, validation, immutable domain states and selectors |
| C02 Profile Presentation | consumes `ResumeProfile`/`PortfolioProfile`; cannot repair or reinterpret invalid entities |
| C03 Profile Metadata Builder | consumes approved read models and emits `ProfilePageMetadata` with fact provenance |
| C04 Base Layout Metadata Host | hosts complete metadata/JSON-LD; owns serialization behavior, not facts |
| C05 Header Navigation | owns fixed navigation models and current state; consumes no personal fact entity |
| C11 Resume Document Boundary | owns document source identity, stable link and fact-manifest parity contract |
| S01 Profile Assembly | requires complete validation/fact approval before public projections |
| S04 Resume Document | consumes current ResumeProfile-derived route and C11 contract; owns no separate résumé facts |

## 11. Explicit Exclusions and Handoff

- This document does not approve any real public fact.
- No placeholder value is a legal production substitute.
- No external URL reachability, browser rendering, PDF extraction fidelity, CSS measurement or accessibility certification is inferred from domain validation.
- No Infrastructure, Terraform, AWS, deployment or external Vault mutation belongs to this artifact.
- U1 NFR Requirements must choose PBT and document/browser tooling without weakening these entity invariants.
- U1 Code Generation must carry `DE-P01` through `DE-P15` into its plan, implement applicable properties with complementary examples, and retain human fact approval as a separate blocking gate.
