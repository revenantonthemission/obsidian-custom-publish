# U1 Business Logic Model — Profile Domain and Native Experience

## 문서 상태

- **단계**: CONSTRUCTION — U1 Functional Design
- **상태**: 완료 및 승인됨 — 2026-07-23T15:02:53Z
- **Unit**: U1 Profile Domain and Native Experience
- **입력 결정**: A/A/A/A/A/A/A/A/A/A/A/A/A/A
- **범위**: C01~C05, C11; S01, S04
- **작성일**: 2026-07-23

## 1. 목적과 경계

이 문서는 승인된 public profile 사실 한 벌을 정규화·검증한 뒤 résumé, portfolio, homepage, metadata, navigation과 résumé document용 read model로 투영하는 기능 논리를 정의한다.

다음은 이 모델의 hard boundary다.

- Production profile은 사용자가 승인한 사실만 포함한다.
- Draft, evidence와 approval state는 production profile 밖의 fact-review inventory에 존재한다.
- 실제 이름, 연락처, 경력, project와 성과 값은 이 설계에 포함하지 않는다.
- 모든 public projection은 하나의 immutable `ValidatedProfile`에서 파생된다.
- Invalid input은 어떤 partial page, metadata 또는 document result도 만들지 않는다.
- 사용자 경험은 static HTML semantics를 사용하며 새 client state, API 또는 runtime service를 요구하지 않는다.
- PBT framework, browser/PDF engine, CSS 수치와 deployment 방식은 이 단계에서 결정하지 않는다.

## 2. 핵심 모델

### 2.1 Aggregate와 read model

| Model | 역할 | 생성 조건 |
|---|---|---|
| `ProfileData` | approved-only canonical production aggregate | approved fact inventory와 production mapping이 일치 |
| `NormalizedProfile` | trim, LF와 NFC가 적용된 canonical candidate | 모든 text value를 한 번 정규화 |
| `ValidatedProfile` | 모든 domain invariant를 만족하는 immutable aggregate | issue collection이 비어 있음 |
| `ResumeProfile` | résumé, browser print와 PDF가 공유하는 ordered read model | `ValidatedProfile`에서만 선택 |
| `PortfolioProfile` | complete case study 3~6개의 ordered read model | `ValidatedProfile`에서만 선택 |
| `HomepageProfile` | 짧은 소개와 고정 internal route의 minimal read model | `ValidatedProfile`에서만 선택 |
| `ProfilePageMetadata` | visible summary와 approved claims에서 만든 route head model | 해당 page read model과 site identity가 유효 |
| `ResumeFactManifest` | web, print와 PDF가 비교하는 ordered approved-fact sequence | `ResumeProfile` 전체에서 생성 |
| `ValidationIssue` | stable code, field path와 message를 가진 진단 | 하나 이상의 rule 위반 |

### 2.2 Public-ready 최소 조건

`ProfileData`는 다음을 모두 만족해야 public-ready다.

1. 이름, 한국어 headline, homepage용 짧은 소개, 상세 소개, visible `resumeSummary`와 visible `portfolioSummary`가 있다.
2. 공개 email과 GitHub URL이 모두 승인되고 유효하다.
3. 하나 이상의 non-empty skill group이 있다.
4. 경력 또는 대표 성과 variant인 résumé highlight가 하나 이상 있고, 각 highlight에 non-empty detail block이 있다.
5. 모든 필수 six-dimension content를 가진 project가 3개 이상 6개 이하 존재한다.
6. 교육, 자격과 추가 evidence는 optional이며, absent이면 output node 자체가 존재하지 않는다.
7. 모든 public fact의 `factId`와 normalized value가 approved fact inventory record에 정확히 대응한다.

## 3. End-to-End Business Flow

### 3.1 Fact review에서 production까지

1. 공개 근거에서 proposed atomic fact와 evidence를 수집한다.
2. Proposed text를 trim → line-ending LF → Unicode NFC 순서로 정규화한다.
3. 각 atomic fact에 stable `factId`, normalized value, evidence, target surface와 review state를 기록한다.
4. 사용자는 fact를 `Approved`, `Excluded` 또는 `Pending`으로 명시적으로 판정한다.
5. `Approved` record만 같은 `factId`와 normalized value로 production `ProfileData`에 materialize한다.
6. `Excluded` optional fact는 production에 넣지 않는다.
7. Required fact가 `Pending` 또는 `Excluded`이면 production mapping을 완료하지 않고 public-ready gate를 실패시킨다.
8. 사용자는 final inventory와 production diff를 함께 승인한다.

다음 변경은 재승인이 필요하다.

- normalized public value 변경;
- `factId` 변경;
- evidence 또는 public target surface 변경;
- project 선정, entity relation 또는 public order 변경;
- public link destination 변경;
- metadata나 PDF에 새 claim을 추가하는 projection 변경.

PBT는 mapping shape와 provenance invariant를 검증할 수 있지만 사실의 진실성, evidence의 충분성 또는 사람의 승인을 대신하지 않는다.

### 3.2 Normalize

정규화는 모든 승인 text fact와 typed text block의 leaf value에 동일하게 적용한다.

1. 앞뒤 Unicode whitespace를 제거한다.
2. CRLF와 CR을 LF로 통일한다.
3. Unicode를 NFC로 정규화한다.
4. 내부 공백, 문단 경계와 승인된 punctuation은 보존한다.
5. 정규화 뒤 빈 값인 text fact 또는 block은 invalid다.
6. 길이를 자르거나 말줄임표를 삽입하지 않는다.
7. Stable entity ID는 자동으로 소문자화하거나 다시 쓰지 않고 kebab-case predicate로 검증한다.
8. URL은 text normalization 뒤 해당 link rule로 검증하며 destination 의미를 바꾸는 rewrite를 하지 않는다.

정규화는 idempotent다. 같은 value를 다시 정규화해도 결과가 달라지지 않아야 한다.

### 3.3 Validate

Validation은 output 생성 전 aggregate 전체에 대해 수행한다.

1. Required aggregate field와 minimum cardinality를 확인한다.
2. Entity shape와 variant별 required field를 확인한다.
3. Text, ID, period, order, URL, block과 relation predicate를 확인한다.
4. Project count와 six-dimension completeness를 확인한다.
5. Optional value는 absent와 provided를 구분한다. Absent는 valid omission이고 provided-invalid는 issue다.
6. Relation target existence와 entity-kind compatibility를 확인한다.
7. Fact inventory와 production fact의 `factId`/normalized-value correspondence를 확인한다.
8. 모든 발견 가능한 issue를 수집한다.
9. Issue를 canonical validation phase, root schema field, collection source index, `code`의 사전식 순서, `message`의 사전식 순서로 stable sort하고 같은 `code`/`path`의 exact duplicate를 제거한다.
10. Issue가 하나라도 있으면 validated value와 어떤 partial output도 반환하지 않는다.
11. Issue가 없을 때만 immutable `ValidatedProfile`을 반환한다.

“Fail-fast”는 첫 오류에서 검사를 중단한다는 뜻이 아니라, invalid candidate가 public-output boundary를 넘기 전에 aggregate 단위로 닫힌다는 뜻이다.

### 3.4 Select projections

모든 selector는 pure, deterministic, non-mutating operation이다.

#### Résumé

`ResumeProfile`은 다음 순서로 구성된다.

1. 소개, 연락 CTA와 stable `/resume.pdf` descriptor;
2. ordered skill groups;
3. ordered career group, 이어서 ordered achievement group; 두 collection을 합친 typed résumé highlight가 최소 하나여야 한다.
4. ordered project summaries;
5. present한 경우에만 ordered education;
6. present한 경우에만 ordered certification.

각 highlight는 closed first view에서 식별 가능한 heading, 존재하는 경우 approved period와 one-line summary를 제공하고 required non-empty detail block은 native detail content에 둔다. Experience는 `role`을 heading으로 사용하면서 별도의 required `organization`도 같은 summary에 표시하고 period를 항상 표시한다. Achievement는 `title`을 heading으로 사용하며 period는 존재할 때만 표시한다. Career와 achievement는 각 collection-local `order`로 정렬하며 career group이 먼저다. Project는 title과 approved `outcomeSummary`를 제공한다. Portfolio가 소유하는 six-dimension case-study 전체를 résumé에 복제하지 않는다.

#### Portfolio

`PortfolioProfile`은 visible `portfolioSummary`, public contact actions와 project 3~6개를 `order` 오름차순으로 제공한다. 각 project는 title, optional period와 visible approved `outcomeSummary`를 먼저 제공하고, problem, role, key decisions, architecture, outcome과 lessons를 고정된 비교 순서로 제공하며 valid public evidence만 포함한다.

#### Homepage

`HomepageProfile`은 이름, headline, 짧은 소개와 고정 route `/resume`, `/portfolio`만 제공한다. Homepage composition과 actual Vault slot은 U2 소유이며 U1은 read model만 제공한다.

#### Non-interference

- Resume-only optional fact 변경은 `PortfolioProfile` 또는 `HomepageProfile`을 바꾸지 않는다.
- Portfolio six-dimension detail 변경은 résumé의 project summary field가 별도 승인값인 한 `ResumeProfile`을 바꾸지 않는다.
- Shared fact 변경은 그 fact를 allowlist에 둔 모든 projection에 반영된다.
- 어떤 selector도 source에 없는 claim, placeholder 또는 inferred date를 만들지 않는다.

### 3.5 Render static experience

Presentation은 validated read model을 semantic static structure로 옮긴다.

- `/resume`와 `/portfolio`에 하나의 page-level heading이 있다.
- Profile-local navigation은 `홈`, `Résumé`, `Portfolio` 순서이고 현재 route 하나에만 current-page semantics를 준다.
- Résumé의 모든 detail은 초기 `open` state가 없는 native disclosure에 존재한다.
- Disclosure summary에는 title, 존재하는 경우 period와 one-line summary가 있어 closed state에서도 목적을 이해할 수 있다.
- Absent optional section은 heading, wrapper, CTA와 placeholder를 모두 생략한다.
- Contact link는 label만 보고 email/GitHub 목적을 알 수 있다.
- Portfolio project는 source order가 아니라 explicit `order`로 정렬하고 six dimensions를 고정된 순서로 표시한다.
- Raw HTML이나 arbitrary Markdown을 public content value로 해석하지 않는다.
- Browser print와 PDF의 résumé representation에는 web résumé의 승인 detail 전체가 포함된다.

### 3.6 Build metadata and structured data

Metadata는 route identity, site identity와 해당 visible profile projection에서만 생성한다.

| Route | Title rule | Description rule | Canonical | Conservative structured data |
|---|---|---|---|---|
| `/resume` | exact template `{approvedName} — Résumé` | visible `resumeSummary`와 byte-for-byte 같은 normalized value | site origin + `/resume` | `ProfilePage`와 minimal `Person` |
| `/portfolio` | exact template `{approvedName} — Portfolio` | visible `portfolioSummary`와 byte-for-byte 같은 normalized value | site origin + `/portfolio` | `CollectionPage`, ordered `ItemList`와 allowlisted `CreativeWork` |

Open Graph와 Twitter description은 같은 route description을 사용한다. Structured-data scalar claim은 다음 둘 중 하나여야 한다.

- visible projection의 approved fact;
- page type, canonical route, list position처럼 사실이 아닌 fixed schema/route constant.

Résumé의 `Person`은 approved visible name, email과 GitHub `sameAs` 범위를 넘지 않는다. Portfolio `ItemList`는 visible project order, title과 canonical anchor를 표현한다. 각 item의 보수적 `CreativeWork`는 visible project title, summary와 approved evidence URL allowlist 안에서만 표현할 수 있다. 검증되지 않은 직함, 고용 관계, 소유권, 성과 수치 또는 더 강한 project type을 만들지 않는다.

Typed JSON-LD document가 없으면 script output도 없다. Document가 있으면 serialization → extraction → parse 결과가 원 typed document와 structural equality를 가져야 하고, 승인 text가 script boundary를 끝낼 수 없어야 한다.

### 3.7 Resolve navigation state

Primary navigation model은 다음 ordered item을 정확히 한 번 가진다.

1. `Tags` → `/tags`
2. `Graph` → `/graph`
3. `Résumé` → `/resume`
4. `Portfolio` → `/portfolio`

Navigation state는 query와 fragment를 제외한 pathname에 대해 segment-aware match를 사용한다.

- Exact path와 trailing slash/descendant segment는 해당 item을 current로 만든다.
- `/resume-old`는 `/resume`의 current state가 아니다.
- Unknown path에서는 current item이 없을 수 있다.
- Current item은 최대 하나다.
- Desktop와 mobile output은 같은 ordered model을 소비한다.
- Mobile의 Résumé와 Portfolio anchor는 hydration이나 menu open state 없이 server-rendered HTML에 항상 존재한다.

Profile-local navigation은 `홈` → `/`, `Résumé` → `/resume`, `Portfolio` → `/portfolio` 순서이고 현재 route 하나에만 current-page semantics를 준다.

### 3.8 Generate and verify résumé document

1. `ResumeProfile` 전체에서 expected `ResumeFactManifest`를 만든다.
2. Manifest는 source identity, present-section order vector, entity kind/ID/order vector와 ordered fact entries를 기록한다. 각 entry는 section key/order, applicable entity kind/ID/order, atomic `factId`, semantic path, value kind와 normalized text/period/URL value를 가진다.
3. Screen web representation, print representation과 document request가 같은 expected manifest fingerprint를 참조하는지 확인한다.
4. Print representation은 screen에서 닫혀 있는 detail도 모두 포함한다.
5. PDF는 rendered `/resume`의 print representation에서만 생성하며 hand-authored second fact source를 받지 않는다.
6. Generated PDF가 missing, unreadable 또는 expected source fingerprint와 다르면 실패한다.
7. PDF에서 관찰한 normalized fact sequence가 expected manifest와 value 및 order 모두 일치해야 한다.
8. 한 fact의 삭제, 변경, 추가 또는 order 변경도 mismatch다.
9. Presentation-only label, layout, pagination과 PDF binary bytes는 fact parity에서 제외한다.
10. Visual readability와 page-break 품질은 별도 document/browser evidence로 검증한다.

Fingerprint algorithm, PDF text extraction과 visual threshold는 NFR Design이 정하지만 exact full-manifest equality라는 기능 의미는 바꾸지 않는다.

## 4. Failure Model

### 4.1 Stable field path

Issue path는 root `profile`에서 시작한다.

- Collection entity field: `profile.projects[2].outcomes[0]`
- ID 자체가 missing/invalid/duplicate인 entity: `profile.projects[2].id`
- Aggregate cardinality: `profile.projects`
- Approval mapping: `profile.facts[4].factId`
- Route output consistency: `profile.metadata.resume.description`

Validation path는 candidate의 root schema와 source index를 가리킨다. 같은 candidate에 대해 항상 같으며, issue가 승인되지 않은 실제 값을 message에 복사하지 않는다. Validated output과 fact manifest의 identity는 별도로 stable entity ID와 `factId`를 사용한다.

### 4.2 Failure categories

| Category | 결과 |
|---|---|
| Required/missing | field-addressable issue; public output 차단 |
| Normalized empty | field-addressable issue; public output 차단 |
| Invalid ID/order/period/relation | 모든 관련 issue 집계; public output 차단 |
| Project count outside 3~6 | aggregate count issue; public output 차단 |
| Provided-invalid optional URL/value | field issue; silent omission 금지 |
| Absent optional section/link | valid omission; output node 없음 |
| Pending/excluded required fact | approval issue; production materialization 차단 |
| Metadata claim outside allowlist | consistency issue; page build 차단 |
| JSON-LD unsafe/non-round-trippable | serialization issue; page build 차단 |
| Missing/stale/mismatched PDF | document issue; U1 completion 차단 |

## 5. State and Side Effects

U1 domain logic에는 runtime mutable state가 없다.

- Normalize, validate, select, metadata, navigation과 manifest logic은 pure build-time transformations다.
- Rendering은 static read-model consumption이다.
- Filesystem, browser와 PDF generation은 S04 boundary side effect이며 C11의 validated request와 parity contract를 따라야 한다.
- Network availability는 domain URL validation의 입력이 아니다. 실제 link reachability는 later verification evidence다.

따라서 stateful PBT는 U1 Functional Design에서 식별되지 않는다.

## 6. Testable Properties — PBT-01

### 6.1 Property catalog

| ID | Owner | Category | Generated domain / precondition | Operation | General assertion / oracle | Traceability |
|---|---|---|---|---|---|---|
| U1-P01 | C01 | Idempotence | Korean/Unicode text, CRLF/LF, edge whitespace와 typed blocks | normalize once/twice | `normalize(normalize(x)) = normalize(x)`; internal approved content 보존 | FR-001/002; AC-E01-04; EDGE-005 |
| U1-P02 | C01 | Invariant, Easy verification | structurally valid profile with 3~6 projects, unique IDs/orders와 valid links | normalize + validate | success output satisfies every domain predicate, input is unmodified, cardinalities and facts preserved | FR-001/005; AC-E01-01/04, AC-U04-01 |
| U1-P03 | C01 | Oracle, Easy verification | valid base plus exactly one labelled invalid mutation | validate | failure contains expected stable code/path and no validated value; reference rule model agrees | FR-001/006; AC-E01-02, AC-U05-04; EDGE-001~004 |
| U1-P04 | C01 | Invariant | valid profile with sparse positive unique orders and permuted source arrays | select projections | each ordered collection follows numeric `order`, preserves members/count, permits gaps and is independent of source-array order; career group precedes achievement group | FR-001/005; AC-U04-01, AC-E01-04; EDGE-003 |
| U1-P05 | C01 | Invariant | optional values independently absent/present | select projections | absent optional produces no view-model node while required facts remain; provided-invalid never reaches selector | FR-004~006; AC-U02-03, AC-U04-03, AC-U05-03, AC-E01-03; EDGE-006 |
| U1-P06 | C01 | Oracle, Invariant | valid canonical profile plus one controlled fact change | all selectors | every output claim is source fact or fixed constant; mapped consumers change, unrelated projection does not | FR-001/002; AC-E01-01, AC-E02-02/03 |
| U1-P07 | C02 | Invariant, Easy verification | valid résumé/portfolio read models with optional combinations and long Unicode | static semantic render model | required section/count/order and six dimensions correspond; native details exist closed; absent optional headings/CTA do not exist | FR-003~007/013; AC-U02-01~03, AC-U04-01~03, AC-U05-01/03 |
| U1-P08 | C03 | Oracle, Invariant | valid route projections/site identity plus controlled route, title, canonical, description, claim and ItemList mutations | metadata/JSON-LD builders and consistency validator | valid output uses exact route title/canonical/type, descriptions equal visible summaries, all scalar claims are approved allowlist/fixed constants and ItemList order/position matches projects; every controlled invalid mutation returns its expected diagnostic and no validated metadata | FR-011; AC-U02-04, AC-U04-04, AC-E02-02/03 |
| U1-P09 | C04 | Round-trip, Invariant | typed JSON-LD with Korean/Unicode, quotes, slash-like strings and optional document lists | serialize/embed/extract/parse | parsed structure equals input; absent list emits no script; document count has neither omission nor duplication; script boundary remains intact | FR-011/013; NFR-006/007 |
| U1-P10 | C05 | Oracle, Invariant | exact routes, descendants, trailing slash, unknown routes and prefix collisions | navigation-state projection | item order/href/label preserved; current count ≤1; canonical matcher agrees; desktop/mobile profile link set/order equal | FR-003/012/013; AC-U01-03/04; EDGE-011 |
| U1-P11 | S01 | Easy verification | valid and one-mutation-invalid profiles | assembly pipeline | valid input yields all requested projections; invalid input yields none and exposes stable issues | FR-001/002; AC-E01-02, AC-E02-02 |
| U1-P12 | C11 | Oracle, Invariant, Easy verification | canonical résumé manifest plus identical or controlled delete/change/add/reorder/source/path mutation | pure document-source/parity guard | identical full ordered manifests with current source identity and `/resume.pdf` pass; any controlled manifest, source identity or public-path mutation fails | FR-004/010; AC-U03-02~04, AC-E02-04; EDGE-008/009 |

### 6.2 Generator and shrink contract

- `validProfile` generator는 primitive soup가 아니라 complete domain aggregate를 만든다.
- Project count 3과 6 boundary에 높은 가중치를 두고 invalid count는 valid base를 2 또는 7로 한 번만 바꾼다.
- ID/order generator는 uniqueness를 구성 단계에서 보장하고 filtering에 의존하지 않는다.
- Optional field는 absent/present가 모두 충분히 생성되며 present branch는 항상 valid value를 만든다.
- Text는 Hangul, Latin technology name, digit, punctuation, long Unicode, combining input before NFC와 line-ending variation을 포함한다.
- JSON-LD safety input은 quotes, backslash, `<`, script-like text와 Unicode line separators를 포함한다.
- URL/email generator는 domain-allowed shape만 만들고 network에 접속하지 않는다.
- Invalid generator는 valid base에 exactly one labelled mutation을 적용해 expected issue path를 알 수 있게 한다.
- Shrinking은 valid case의 schema/cardinality/uniqueness를 유지하거나 chosen single violation만 유지한다.
- PBT가 실제 defect를 발견하면 shrunk 최소 반례를 해당 named example suite의 영구 regression case로 승격하고 property와 example을 함께 유지한다.
- `ValidatedProfile`은 production validator를 통과해 만들며 임의로 fabricated branded value를 만들지 않는다.
- Parity generator는 하나의 canonical manifest에서 identical copy 또는 one controlled mutation을 만든다.

### 6.3 Explicit N/A

| Category or component | 판정과 이유 |
|---|---|
| C01 Round-trip | 별도 public serialize/deserialize pair가 아직 없다. 도입 시 PBT-02 대상 재평가 |
| Commutativity | 순서가 business meaning이고 operation order를 바꾸면 같은 결과여야 하는 연산이 없음 |
| Induction | Recursive/divide-and-conquer domain operation이 없음 |
| C02 visual layout/keyboard behavior | CSS, focus와 browser interaction은 generated value invariant보다 example/Playwright evidence가 적합 |
| C04 standard host integration | Pure serializer seam에는 U1-P09를 적용하고 full Astro document integration은 example test로 보완 |
| C11 PDF byte equality and file I/O | Browser metadata와 pagination 때문에 byte identity는 business fact parity가 아니다. Missing/unreadable file, extraction fidelity와 visual quality는 S04 document/example gate가 검증 |
| S04 Resume Document | `No PBT properties identified` for independent orchestration: browser/filesystem/visual side effects. Pure source and parity rules are already owned by C11 U1-P12 |
| Human fact approval | 사람이 사실과 evidence를 승인하는 행위는 generator가 증명할 수 없음 |
| Stateful PBT | Runtime state machine, mutable session 또는 concurrent state가 없음 |

### 6.4 Canonical property crosswalk

U1-P01~U1-P12는 stage-level umbrella ID다. Business Rules의 `P-*`, Domain Entities의 `DE-*`와 Frontend Components의 `FD-*`는 같은 obligation을 세분화한다. Code Generation은 각 refinement를 추적하되 같은 assertion을 중복 구현하지 않는다.

| Umbrella | Business Rules | Domain Entities | Frontend Components |
|---|---|---|---|
| U1-P01 | P-C01-01 | DE-P01 | N/A |
| U1-P02 | P-C01-02 | DE-P02~08 | N/A |
| U1-P03 | P-C01-03 | DE-P02, DE-P04~08, DE-P10 | N/A |
| U1-P04 | P-C01-04 | DE-P03, DE-P06, DE-P11 | N/A |
| U1-P05 | P-C01-05 | DE-P09, DE-P11 | N/A |
| U1-P06 | P-C01-06 | DE-P11~12 | N/A |
| U1-P07 | P-C02-01~03 | DE-P11 | FD-P-C02-01~03 |
| U1-P08 | P-C03-01~04 | DE-P13 | N/A |
| U1-P09 | P-C04-01~02 | N/A | FD-P-C04-01~02 |
| U1-P10 | P-C05-01~03 | N/A | FD-P-C05-01~02 |
| U1-P11 | P-S01-01 | DE-P10~12 | N/A |
| U1-P12 | P-C11-01~03 | DE-P14~15 | FD-P-C11-01~02 |

## 7. Example-Test Boundary

PBT는 다음 named example을 대체하지 않는다.

- project count 2/3/6/7;
- missing required identity/contact;
- duplicate ID와 duplicate order;
- invalid provided optional link와 absent optional link;
- exact résumé/portfolio section labels and known route metadata;
- `/resume-old` prefix collision;
- no-JS server-rendered mobile profile anchors;
- missing, unreadable, stale와 one-known-fact PDF mismatch;
- Korean page content and exact six case-study labels;
- actual user fact approval record.

## 8. Traceability Summary

| Functional area | Requirements | Stories / acceptance | Edge cases |
|---|---|---|---|
| Canonical approved profile | FR-001, FR-002 | ST-E01, ST-E02 | EDGE-001, EDGE-003 |
| Résumé summary/details | FR-003, FR-004, FR-007, FR-013 | ST-U02 | EDGE-005, EDGE-006, EDGE-011 |
| Portfolio case studies | FR-003, FR-005, FR-007 | ST-U04 | EDGE-002~006 |
| Contact/evidence | FR-006 | ST-U05 | EDGE-004, EDGE-006 |
| Metadata/JSON-LD | FR-011 | AC-U02-04, AC-U04-04, ST-E02 | EDGE-005 |
| Header/local navigation | FR-003, FR-012, FR-013 | U1 contribution to ST-U01 | EDGE-011 |
| Print/PDF/parity | FR-004, FR-010 | ST-U03, ST-E02 | EDGE-008, EDGE-009 |
| Owner-local PBT slice | FR-015 | U1 contribution to ST-E03 | EDGE-010 |

## 9. Handoff

- `business-rules.md` owns stable predicates, issue codes and rule-level traceability.
- `domain-entities.md` owns exact aggregate, entity, value-object and relationship definitions.
- `frontend-components.md` owns static UI hierarchy, props, semantics and interaction boundaries.
- U1 NFR Requirements must select the TypeScript PBT and browser/PDF tooling without weakening these properties.
- U1 Code Generation planning must reference U1-P01~U1-P12 and implement the applicable properties beside the owning components.
