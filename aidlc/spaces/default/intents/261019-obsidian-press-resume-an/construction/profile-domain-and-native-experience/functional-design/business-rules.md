# U1 Functional Design — Business Rules

## 문서 상태와 범위

- **Unit**: U1 Profile Domain and Native Experience
- **Bounded Context**: Profile Experience
- **상태**: 완료 및 승인됨 — 2026-07-23T15:02:53Z
- **입력 결정**: U1 Functional Design 질문 Q1~Q14의 승인된 A/A/A/A/A/A/A/A/A/A/A/A/A/A
- **소유 범위**: C01~C05, C11, S01, S04
- **PBT Enforcement**: Full; 이 문서는 PBT-01 property identification을 수행한다.

이 문서는 승인된 profile candidate가 public-ready profile, résumé, portfolio, metadata, navigation, print 및 PDF 계약으로 승격되는 규칙을 정의한다. 실제 이름, 연락처, 경력, 프로젝트, 성과 또는 외부 링크 값은 포함하지 않는다. Framework, library, browser/PDF engine, CSS 수치, breakpoint와 배포 방식은 이 문서의 범위가 아니다.

## 1. 규칙 판정 모델

### 1.1 판정 단계

Public output 판정은 다음 순서를 바꿀 수 없다.

1. Candidate의 text와 line ending을 정규화한 새 값을 만든다. 입력 candidate 자체는 변경하지 않는다.
2. 정규화된 값의 shape, 필수값, cardinality, identifier, order, period, URL, block과 relation을 전부 검증한다.
3. 모든 독립적으로 판정 가능한 issue를 집계한다.
4. Issue가 하나라도 있으면 validated value, selector result, page fragment, metadata 또는 document request를 만들지 않는다.
5. Issue가 없을 때만 immutable validated profile을 만들고 consumer projection을 생성한다.
6. Fact approval, metadata consistency, navigation 및 document parity gate를 각각 적용한다. 뒤 단계의 실패도 public-ready 완료를 닫는다.

Application Design의 “fail-fast”는 첫 issue에서 검사를 중단한다는 뜻이 아니라, 첫 public output 전에 전체 candidate를 판정하고 실패를 닫는다는 뜻이다.

### 1.2 진단 계약

모든 판정 실패는 다음 세 필드로 표현한다.

| Field | Contract |
|---|---|
| `code` | 아래 catalog의 안정적인 machine-readable 식별자다. 문구 변경과 무관하게 같은 규칙은 같은 code를 사용한다. |
| `path` | Root `profile` 기준 field path다. Collection element는 source index를 사용한다. 예: `profile.projects[2].problem[0]`. |
| `message` | 아래 catalog의 고정 template을 사용한다. 실제 개인 값이나 승인되지 않은 원문을 message에 복사하지 않는다. |

Issue 순서는 검증을 반복해도 같아야 한다.

1. Phase 순서: shape/text → scalar/domain → collection/identity/order → relation/approval → projection/metadata/navigation → document/parity
2. 같은 phase 안에서는 root schema의 field 순서
3. Collection은 source index의 숫자 순서
4. 같은 path에서는 `code`, 이어서 `message`의 사전식 순서

정확히 같은 `code`와 `path`의 issue는 한 번만 보고한다. 선행 판정이 불가능한 경우 cascade issue를 만들지 않는다. 예를 들어 필수 field가 없으면 `field.required`만 보고하고 그 field의 text format 판정은 생략한다.

### 1.3 진단 catalog

| Code | Path 대상 | Message template |
|---|---|---|
| `field.required` | 누락된 필수 field | `필수값이 없습니다.` |
| `field.type` | 허용되지 않은 value shape | `허용된 값 종류가 아닙니다.` |
| `text.empty` | 정규화 뒤 비어 있는 text | `정규화한 텍스트가 비어 있습니다.` |
| `collection.minimum` | 최소 cardinality 미달 collection | `최소 {min}개가 필요합니다.` |
| `collection.range` | 허용 cardinality 밖의 collection | `{min}개 이상 {max}개 이하만 허용합니다.` |
| `fact.identifier.format` | kebab-case가 아닌 atomic fact ID | `Fact ID는 소문자 영숫자 kebab-case여야 합니다.` |
| `fact.identifier.duplicate` | aggregate 전체에서 중복된 atomic fact ID | `Fact ID가 다른 public fact에 중복 사용되었습니다.` |
| `identifier.format` | kebab-case가 아닌 entity ID | `ID는 소문자 영숫자 kebab-case여야 합니다.` |
| `identifier.duplicate` | 같은 entity kind 안의 중복 ID | `같은 entity 종류 안에서 ID가 중복됩니다.` |
| `order.positive-integer` | 양의 정수가 아닌 order | `표시 순서는 양의 정수여야 합니다.` |
| `order.duplicate` | 같은 ordered collection 안의 중복 order | `같은 collection 안에서 표시 순서가 중복됩니다.` |
| `period.precision` | 허용되지 않거나 서로 다른 period precision | `기간은 year 또는 year-month의 같은 정밀도를 사용해야 합니다.` |
| `period.value` | 유효하지 않은 year/month 또는 endpoint | `유효한 기간 값이 아닙니다.` |
| `period.range` | 종료가 시작보다 이른 기간 | `기간 종료가 시작보다 이를 수 없습니다.` |
| `reference.kind` | 허용되지 않은 relation variant 또는 복수 parent | `허용된 relation 종류가 아닙니다.` |
| `reference.missing` | 존재하지 않는 entity를 가리키는 reference | `참조 대상 entity가 존재하지 않습니다.` |
| `contact.email.invalid` | 유효하지 않은 public email address | `공개 이메일 형식이 유효하지 않습니다.` |
| `contact.github.invalid` | 유효하지 않은 GitHub profile URL | `GitHub profile URL 형식이 유효하지 않습니다.` |
| `evidence.url.invalid` | 유효하지 않은 optional evidence URL | `공개 근거 URL 형식이 유효하지 않습니다.` |
| `content.block.kind` | paragraph/list 이외의 content block | `허용되지 않은 content block 종류입니다.` |
| `content.block.empty` | 빈 paragraph 또는 빈 list/item | `Content block과 list item은 비어 있을 수 없습니다.` |
| `approval.record.missing` | fact inventory에 없는 production fact | `Production fact에 대응하는 승인 기록이 없습니다.` |
| `approval.status` | Approved가 아닌 fact의 materialization | `승인되지 않은 fact는 production output에 포함할 수 없습니다.` |
| `approval.value-mismatch` | 승인값과 production normalized value 불일치 | `승인된 값과 production 값이 일치하지 않습니다.` |
| `approval.production-extra` | 승인 inventory에 없는 production claim | `승인 범위를 벗어난 production fact가 있습니다.` |
| `metadata.title.mismatch` | route별 exact title template 불일치 | `Metadata title이 페이지의 고정 title 계약과 일치하지 않습니다.` |
| `metadata.route.invalid` | route identity 또는 canonical 불일치 | `페이지 route와 metadata URL 계약이 일치하지 않습니다.` |
| `metadata.description.mismatch` | visible summary와 description 불일치 | `Metadata description은 화면의 승인된 summary와 같아야 합니다.` |
| `metadata.claim.unsupported` | visible approved allowlist 밖의 claim | `화면의 승인된 사실보다 강한 metadata claim입니다.` |
| `metadata.structured-data.invalid` | 허용 type, item 수 또는 순서 불일치 | `구조화 데이터가 페이지의 승인된 projection과 일치하지 않습니다.` |
| `jsonld.serialization` | 안전한 serialize/parse round-trip 실패 | `구조화 데이터 직렬화 결과를 안전하게 복원할 수 없습니다.` |
| `navigation.model.invalid` | label, href, 순서 또는 desktop/mobile parity 불일치 | `공통 navigation model 계약이 일치하지 않습니다.` |
| `navigation.current.invalid` | 경로별 expected current item과 다른 상태 | `현재 경로에 필요한 navigation current 상태가 유일하지 않습니다.` |
| `document.link.invalid` | stable `/resume.pdf` 계약 불일치 | `이력서 문서 링크가 고정 public contract와 일치하지 않습니다.` |
| `document.source.invalid` | 별도 fact source 또는 source fingerprint 불일치 | `PDF 요청이 현재 승인된 résumé source에서 파생되지 않았습니다.` |
| `document.generation.failed` | 현재 source의 generation 실패 | `현재 résumé source에서 PDF를 생성하지 못했습니다.` |
| `document.missing` | PDF file 부재 | `승인된 이력서 PDF 파일이 없습니다.` |
| `document.unreadable` | PDF를 열거나 text/structure를 검사할 수 없음 | `이력서 PDF를 읽거나 검사할 수 없습니다.` |
| `document.stale` | PDF source identity가 현재 source와 다름 | `이력서 PDF가 현재 승인된 source보다 오래되었습니다.` |
| `document.parity` | web/print/PDF manifest 불일치 | `Web, print와 PDF의 승인 사실이 일치하지 않습니다.` |

## 2. Text, Period, Identifier와 Ordering 규칙

### 2.1 Text normalization

| Rule ID | Predicate와 required outcome | Failure diagnostic | Traceability |
|---|---|---|---|
| BR-TXT-001 | 모든 user-facing scalar text, paragraph와 list item에 대해 CRLF와 단독 CR을 LF로 바꾸고, 바깥 공백을 제거한 뒤 Unicode NFC를 한 번 적용한다. 내부 공백, LF 문단 경계와 승인된 문장부호는 보존한다. | Value shape가 text가 아니면 `field.type`; 정규화 뒤 비면 `text.empty`. | FR-001, FR-002; AC-E01-02, AC-E01-04, AC-E02-03; USCN-004; EDGE-001, EDGE-005 |
| BR-TXT-002 | 필수 text는 존재해야 하며 BR-TXT-001 뒤 non-empty여야 한다. 누락과 supplied-empty는 서로 다른 issue다. | 누락은 `field.required`; supplied-empty는 `text.empty`. | FR-001; AC-E01-02; USCN-004; EDGE-001 |
| BR-TXT-003 | 선택 text가 없으면 valid omission이다. 선택 text가 제공됐으면 필수 text와 같은 정규화·non-empty 규칙을 적용하며 empty를 absence로 바꾸지 않는다. | `text.empty` 또는 `field.type`. | FR-001, FR-004, FR-005; AC-U02-03, AC-U04-03, AC-E01-03; EDGE-006 |
| BR-TXT-004 | 정규화는 값을 임의 길이로 자르거나 요약하거나 번역하지 않는다. 긴 한국어, Unicode와 기술 식별자는 원 의미를 보존한다. | Domain issue는 없다. 잘림·overflow는 NFR의 example/browser/print gate 실패다. | FR-003, FR-004, FR-005, FR-007; AC-U02-01, AC-U04-02; USCN-001, USCN-002; EDGE-005 |

BR-TXT-001의 정규화 함수는 idempotent여야 한다. 이미 정규화된 text에 다시 적용해도 code point sequence가 바뀌지 않는다.

### 2.2 Period

| Rule ID | Predicate와 required outcome | Failure diagnostic | Traceability |
|---|---|---|---|
| BR-PER-001 | Date point는 명시적인 `year` 또는 `year-month` 정밀도 variant다. `year`는 유효한 네 자리 연도, `year-month`는 같은 연도와 01~12 월을 가진다. 추정한 month를 보충하지 않는다. | `period.precision` 또는 `period.value`. | FR-001, FR-002, FR-004, FR-005; AC-E01-02, AC-E02-01~03; USCN-004 |
| BR-PER-002 | Period start는 concrete date point여야 한다. End는 같은 정밀도의 concrete date point 또는 `present`다. `present`는 end에만 허용한다. | `period.precision` 또는 `period.value`. | FR-001, FR-002, FR-004; AC-U02-01, AC-E02-02; USCN-001 |
| BR-PER-003 | Concrete end가 있으면 같은 정밀도의 start보다 이르지 않아야 한다. 서로 다른 정밀도를 비교 가능하게 만들기 위해 값을 추정해서는 안 된다. | `period.range`; 서로 다른 정밀도는 `period.precision`. | FR-001, FR-002; AC-E01-02, AC-E02-01; USCN-004 |
| BR-PER-004 | Experience period는 Experience가 존재할 때 필수다. Achievement와 project period는 선택값이지만 제공되면 BR-PER-001~003을 모두 만족해야 한다. 표시 순서는 period가 아니라 명시적 `order`가 결정한다. | 누락된 Experience period는 `field.required`; invalid optional period는 해당 period diagnostic. | FR-001, FR-004, FR-005; AC-U02-01, AC-U04-01, AC-E01-02; EDGE-003 |

### 2.3 Entity identity와 order

| Rule ID | Predicate와 required outcome | Failure diagnostic | Traceability |
|---|---|---|---|
| BR-ID-001 | Career, achievement, skill group, project와 ordered optional entity의 ID는 `^[a-z0-9]+(?:-[a-z0-9]+)*$` 형태의 stable ASCII kebab-case다. Display label이나 title 변경만으로 ID를 다시 만들지 않는다. | `identifier.format`. | FR-001, FR-005; AC-U04-01, AC-E01-02; USCN-004; EDGE-003 |
| BR-ID-002 | ID uniqueness scope는 entity kind별이다. 서로 다른 kind는 같은 문자열을 사용할 수 있지만 같은 kind 안의 모든 ID는 unique해야 한다. | 충돌한 각 element의 ID path에 `identifier.duplicate`. | FR-001, FR-005; AC-U04-01, AC-E01-02; EDGE-003 |
| BR-ID-003 | Atomic `factId`는 BR-ID-001과 같은 kebab-case shape이며 aggregate 전체에서 globally unique하다. 한 fact ID를 다른 semantic fact나 production path에 재사용하지 않는다. | `fact.identifier.format` 또는 `fact.identifier.duplicate`. | FR-001, FR-002; AC-E01-01~02, AC-E02-02~03; USCN-004 |
| BR-ORD-001 | 모든 ordered collection element는 unique positive integer `order`를 가진다. 1부터 연속일 필요는 없고 gap은 허용한다. | Invalid value는 `order.positive-integer`; 충돌한 각 path는 `order.duplicate`. | FR-001, FR-005; AC-U04-01, AC-E01-02; USCN-002, USCN-004; EDGE-003 |
| BR-ORD-002 | Projection은 collection-local `order`의 오름차순만 사용한다. Tie, source-array order, date, title 또는 ID fallback sort를 사용하지 않는다. | 사전 validation 실패는 BR-ORD-001 diagnostic; valid input의 잘못된 결과는 verification failure다. | FR-001, FR-005; AC-U04-01, AC-E01-04; USCN-002, USCN-004; EDGE-003 |
| BR-ORD-003 | Résumé의 큰 section 순서는 소개·연락·PDF → 핵심 역량 → 경력·대표 성과 → 대표 project 요약 → 존재하는 교육·자격이다. 경력과 성과는 각각 BR-ORD-002로 정렬하고 경력 group을 먼저 투영한다. Portfolio는 project order를 그대로 사용한다. | 잘못된 projection order는 owning selector/presentation verification failure다. | FR-004, FR-005; AC-U02-01, AC-U04-01, AC-E01-04; USCN-001, USCN-002 |

## 3. Public-ready schema, cardinality와 relation 규칙

### 3.1 Public-ready minimum

| Rule ID | Predicate와 required outcome | Failure diagnostic | Traceability |
|---|---|---|---|
| BR-READY-001 | Public-ready root에는 승인된 이름, 한국어 headline, 짧은 소개, 상세 소개, visible `resumeSummary`, visible `portfolioSummary`, public email, GitHub profile, 하나 이상의 skill group, 하나 이상의 typed résumé highlight와 project 3~6개가 있어야 한다. | 누락 field는 `field.required`; collection 최소/범위는 `collection.minimum` 또는 `collection.range`. | FR-001~FR-006, FR-011; AC-U02-01, AC-U04-01, AC-U05-01, AC-E01-02, AC-E02-02; USCN-001, USCN-002, USCN-004; EDGE-001, EDGE-002 |
| BR-READY-002 | Skill group은 non-empty label과 하나 이상의 non-empty skill item을 가진다. Group과 item order는 명시적이며 deterministic하다. | `field.required`, `text.empty`, `collection.minimum`, BR-ID/BR-ORD diagnostics. | FR-001, FR-004; AC-U02-01, AC-E01-02; USCN-001; EDGE-001, EDGE-003 |
| BR-READY-003 | Typed résumé highlight는 career 또는 achievement entity다. 두 collection을 합쳐 최소 하나가 있어야 한다. Career가 없더라도 complete achievement가 있으면 public-ready가 될 수 있다. 근거 없는 고용 entity를 만들지 않는다. | 두 collection이 모두 비면 résumé highlight path에 `collection.minimum`. | FR-002, FR-004; AC-U02-01, AC-E02-01~03; USCN-001; EDGE-001, EDGE-006 |
| BR-READY-004 | Experience가 있으면 stable ID, order, organization, role, required period, one-line summary와 non-empty typed detail을 가진다. Achievement가 있으면 stable ID, order, title, one-line summary와 non-empty typed detail을 가지며 period는 선택이다. | 누락/empty/type/period/ID/order에 해당하는 catalog diagnostic. | FR-001, FR-002, FR-004; AC-U02-01~03, AC-E01-02, AC-E02-02; USCN-001; EDGE-001, EDGE-006 |
| BR-READY-005 | Project collection은 3개 이상 6개 이하다. 각 project는 stable ID, order, title, résumé용 approved outcome summary와 여섯 complete case-study dimension을 가진다. | Project count는 `collection.range`; project field 위반은 해당 field diagnostic. | FR-001, FR-005; AC-U04-01~02, AC-E01-02; USCN-002, USCN-004; EDGE-001~EDGE-003 |
| BR-READY-006 | Experience(career), achievement, education, certification과 additional-link collection은 각각 선택이다. Experience와 achievement는 두 collection을 합친 BR-READY-003의 최소값을 만족해야 한다. 선택 collection이 absent 또는 zero-item이면 대응 section 전체를 생략한다. Element가 하나라도 있으면 그 element의 required contract는 완전해야 한다. | 빈 optional collection 자체는 issue가 아니며 résumé highlight 합계가 0이면 `collection.minimum`; 불완전 element는 해당 field diagnostic. | FR-004; AC-U02-03, AC-E01-03; USCN-001; EDGE-006 |

### 3.2 Entity relation

| Rule ID | Predicate와 required outcome | Failure diagnostic | Traceability |
|---|---|---|---|
| BR-REL-001 | Career, achievement와 project는 독립 entity다. Project 안에 career/achievement의 fact text를 중첩 복사하지 않는다. | 중복 copy는 approval/projection consistency failure로 처리한다. | FR-001, FR-002, FR-005; AC-E01-01, AC-E02-03; USCN-002, USCN-004 |
| BR-REL-002 | Project relation은 absent, 하나의 career reference 또는 하나의 achievement reference 중 정확히 한 variant다. Relation이 없으면 독립 project로 유효하다. Career와 achievement parent를 동시에 지정하지 않는다. | 허용되지 않은 variant나 복수 parent는 `reference.kind`. | FR-001, FR-005; AC-U04-01~02, AC-E01-02; USCN-002 |
| BR-REL-003 | Project relation이 있으면 같은 validated profile 안의 정확한 entity kind와 existing ID를 가리켜야 한다. Relation은 display order나 approval을 암시하지 않는다. | `reference.missing` 또는 `reference.kind`. | FR-001, FR-002, FR-005; AC-U04-02, AC-E01-02, AC-E02-03; USCN-002, USCN-004 |

## 4. Contact, evidence URL과 content block 규칙

### 4.1 Contact와 evidence

| Rule ID | Predicate와 required outcome | Failure diagnostic | Traceability |
|---|---|---|---|
| BR-URL-001 | Public email은 승인된 normalized address value다. 정확히 하나의 `@`, non-empty local/domain part를 가지며 whitespace, control character, scheme, display name, query와 fragment를 허용하지 않는다. Domain은 점으로 구분된 non-empty label과 최종 label을 가진다. `mailto:` CTA는 validated address에서 파생한다. | `contact.email.invalid`; 누락은 `field.required`. | FR-002, FR-006; AC-U05-01, AC-U05-04, AC-E02-02~03; USCN-001, USCN-002; EDGE-004 |
| BR-URL-002 | GitHub contact는 HTTPS, exact `github.com` host와 한 account identity path를 가진 profile URL이다. Credential, non-default port, query와 fragment를 허용하지 않는다. | `contact.github.invalid`; 누락은 `field.required`. | FR-002, FR-006; AC-U05-01, AC-U05-04, AC-E02-02~03; USCN-001, USCN-002; EDGE-004 |
| BR-URL-003 | External evidence는 HTTPS absolute URL만 허용한다. Internal evidence는 host가 없는 single-slash root-relative site path만 허용하며 scheme-relative path와 parent traversal을 허용하지 않는다. | `evidence.url.invalid`. | FR-002, FR-005, FR-006, FR-012; AC-U04-03, AC-U05-02~03; USCN-002; EDGE-004 |
| BR-URL-004 | Optional evidence link가 없거나 공개 불가로 Excluded되면 CTA를 만들지 않는다. Optional이라도 값이 제공됐는데 syntax가 invalid하면 조용히 생략하지 않고 실패한다. | Provided-invalid는 `evidence.url.invalid`; valid absence는 issue 없음. | FR-005, FR-006; AC-U04-03, AC-U05-03, AC-E01-03; USCN-002; EDGE-004 |
| BR-URL-005 | Domain validation은 network에 접속하지 않는다. URL의 실제 존재, 공개 가능성과 label이 가리키는 의미는 atomic fact evidence와 사용자 승인이 증명한다. Syntax-valid만으로 public approval을 추론하지 않는다. | 승인 record가 없거나 불일치하면 approval diagnostic. | FR-002, FR-005, FR-006, FR-013; AC-U05-02~04, AC-E02-01~03; USCN-001, USCN-002; EDGE-004, EDGE-011 |

### 4.2 Typed content

| Rule ID | Predicate와 required outcome | Failure diagnostic | Traceability |
|---|---|---|---|
| BR-CONT-001 | Detail과 case-study content는 ordered typed block array다. 허용 block은 non-empty paragraph와 하나 이상의 non-empty item을 가진 list뿐이다. List item 순서는 source order를 보존한다. | `content.block.kind` 또는 `content.block.empty`. | FR-004, FR-005; AC-U02-02, AC-U04-02; USCN-001, USCN-002; EDGE-001, EDGE-005 |
| BR-CONT-002 | 모든 project는 problem, role, key decision, architecture/structure, verifiable outcome와 lesson의 여섯 dimension 각각에 하나 이상의 valid block을 가진다. | 빠진 dimension은 `field.required` 또는 `collection.minimum`; invalid block은 BR-CONT-001 diagnostic. | FR-005; AC-U04-02, AC-E01-02, AC-E02-02~03; USCN-002; EDGE-001 |
| BR-CONT-003 | Raw HTML, arbitrary Markdown와 embedded link node는 content schema에 존재하지 않는다. Text는 literal content로 취급하고 markup으로 해석하지 않는다. Link는 별도 typed evidence entity만 사용한다. | Unsupported node는 `content.block.kind`; text 안의 markup-like characters는 안전하게 text로 표현한다. | FR-002, FR-005, FR-013; AC-U04-02~03, AC-E02-02; USCN-002; EDGE-005, EDGE-011 |

## 5. Approval, validation과 projection 규칙

### 5.1 Atomic fact approval

| Rule ID | Predicate와 required outcome | Failure diagnostic | Traceability |
|---|---|---|---|
| BR-APR-001 | Production source 밖의 fact inventory는 각 atomic `factId`에 normalized final value, evidence, target surface와 `Approved`, `Excluded` 또는 `Pending` 상태를 기록한다. `factId`는 inventory 안에서 stable하고 unique하다. | 누락은 `approval.record.missing`; 허용되지 않은 상태/shape는 `approval.status`. | FR-002; AC-E02-01~03; USCN-004 |
| BR-APR-002 | Production data에는 `Approved` record의 normalized value만 같은 stable `factId` mapping으로 materialize한다. Evidence와 approval status 자체는 production profile에 복사하지 않는다. | Non-approved는 `approval.status`; value 차이는 `approval.value-mismatch`; extra claim은 `approval.production-extra`. | FR-002, FR-011; AC-U05-04, AC-E02-02~03; USCN-001, USCN-002, USCN-004; EDGE-004, EDGE-009 |
| BR-APR-003 | Public-ready gate는 final fact inventory와 production diff에 대한 사용자의 명시적 승인을 요구한다. PBT, build 성공, public source 존재 또는 schema validity가 human approval을 대신하지 않는다. | 승인 기록 부재는 `approval.record.missing`; completion 상태는 닫지 않는다. | FR-002; AC-U04-01~02, AC-U05-01~02, AC-E02-01~03; USCN-004 |
| BR-APR-004 | Approved value, target surface, project selection/order 또는 production diff가 바뀌면 영향받은 atomic facts는 다시 승인해야 한다. 이전 approval을 새 normalized value에 자동 이월하지 않는다. | `approval.value-mismatch` 또는 `approval.record.missing`. | FR-002, FR-005; AC-U04-01~02, AC-E02-03; USCN-004; EDGE-009 |
| BR-APR-005 | `Pending`, `Excluded`, placeholder, 예시 fact와 공개 근거로 증명할 수 없는 추정은 page, metadata, JSON-LD, print와 PDF에 나타날 수 없다. | `approval.status` 또는 `approval.production-extra`. | FR-002, FR-004~FR-006, FR-010~FR-011; AC-U02-03, AC-U04-03, AC-U05-03~04, AC-E02-01~04; USCN-001, USCN-002, USCN-004; EDGE-004, EDGE-006, EDGE-009 |

### 5.2 Validation과 fail-closed behavior

| Rule ID | Predicate와 required outcome | Failure diagnostic | Traceability |
|---|---|---|---|
| BR-VAL-001 | Validator는 정규화 뒤 독립적으로 발견 가능한 모든 issue를 catalog와 canonical 순서로 집계한다. 첫 issue에서 검사를 끝내지 않는다. | 각 위반의 해당 diagnostic. | FR-001; AC-E01-02; USCN-004; EDGE-001~EDGE-004 |
| BR-VAL-002 | Issue가 하나라도 있으면 partial validated value, partial projection 또는 “가능한 field만” 포함한 public result를 반환하지 않는다. | Aggregate validation failure; 개별 원인은 issue collection에 보존한다. | FR-001, FR-002; AC-U05-04, AC-E01-02, AC-E02-02; USCN-004; EDGE-001~EDGE-004 |
| BR-VAL-003 | 같은 candidate와 같은 approval context는 byte-level message ordering까지 같은 issue collection 또는 structurally equal validated value를 만든다. Validation은 입력을 변경하지 않는다. | 차이는 deterministic contract verification failure다. | FR-001, FR-015; AC-E01-04, AC-E03-01~02; USCN-004; EDGE-010 |
| BR-VAL-004 | S01은 C01 validation과 approval gate를 presentation, metadata와 document-source projection보다 먼저 실행한다. 앞 gate가 실패하면 downstream consumer는 호출되지 않는다. | 원래 gate의 issues를 반환하고 downstream fallback을 만들지 않는다. | FR-001, FR-002; AC-E01-02, AC-E02-02; USCN-004; EDGE-001~EDGE-004 |

### 5.3 Consumer projection

| Rule ID | Predicate와 required outcome | Failure diagnostic | Traceability |
|---|---|---|---|
| BR-SEL-001 | Résumé, portfolio와 homepage selector는 `ValidatedProfile`만 입력받고 원본 fact를 수정하거나 page-local copy를 만들지 않는다. 모든 projected fact는 source `factId`로 추적 가능하다. | Invalid source는 projection을 만들지 않으며 approval/provenance gate가 실패한다. | FR-001, FR-002; AC-E01-01, AC-E02-03; USCN-004 |
| BR-SEL-002 | Résumé projection의 처음 보이는 content는 identity, `resumeSummary`, contact/PDF actions, ordered skills, Experience의 organization·role·required period·one-line summary, Achievement의 title·optional period·one-line summary와 project title·approved outcome summary다. Experience는 role을 heading으로 사용하되 별도 organization fact도 같은 disclosure summary에 표시한다. 각 complete detail은 처음 닫힌 native detail 영역에도 static content로 존재한다. | 누락/순서/상세 불완전은 presentation verification failure다. | FR-003, FR-004, FR-013; AC-U02-01~02, AC-U03-03; USCN-001; EDGE-005, EDGE-011 |
| BR-SEL-003 | Portfolio projection은 `portfolioSummary`와 project 3~6개를 BR-ORD-002 순서로 제공한다. 각 project는 visible title, optional period와 approved `outcomeSummary`를 먼저 제공하고 여섯 case-study dimension을 고정 순서로 제공하며, optional evidence가 없으면 link만 생략한다. | 사전 data 위반은 catalog diagnostic; projection 불일치는 verification failure다. | FR-003, FR-005, FR-013; AC-U04-01~03; USCN-002; EDGE-002~EDGE-005 |
| BR-SEL-004 | Homepage projection은 승인된 짧은 소개와 고정 internal `/resume`, `/portfolio` 목적만 제공한다. U2 consumer가 Vault나 page-local source에 profile fact를 복사하도록 요구하지 않는다. | Provenance 불일치는 approval/projection verification failure다. | FR-001, FR-003, FR-012~FR-013; AC-U01-01~03, AC-E01-01; USCN-001~USCN-003 |
| BR-SEL-005 | Optional scalar, collection 또는 evidence가 valid하게 absent면 해당 heading, wrapper, CTA와 placeholder를 전부 생략한다. 인접한 필수 content와 document order는 변하지 않는다. | Valid absence는 issue 없음. Empty heading/link가 생기면 presentation verification failure다. | FR-004~FR-005; AC-U02-03, AC-U04-03, AC-U05-03, AC-E01-03; USCN-001, USCN-002; EDGE-006 |

## 6. Metadata와 JSON-LD 규칙

| Rule ID | Predicate와 required outcome | Failure diagnostic | Traceability |
|---|---|---|---|
| BR-META-001 | Canonical profile의 `resumeSummary`는 `/resume` 첫 화면에 그대로 보이고 résumé description, Open Graph description과 Twitter description이 같은 normalized value를 재사용한다. `portfolioSummary`에도 같은 규칙을 적용한다. | `metadata.description.mismatch`. | FR-002, FR-011; AC-U02-04, AC-U04-04, AC-E01-01, AC-E02-03; USCN-001, USCN-002 |
| BR-META-002 | `/resume` title은 exact template `{approvedName} — Résumé`, `/portfolio` title은 `{approvedName} — Portfolio`다. 두 route는 fixed path와 configured site identity에서 만든 exact canonical URL을 가지며 OG/Twitter title과 URL도 같은 route title/canonical을 사용한다. Metadata-only fact copy를 두지 않는다. | Title template 또는 OG/Twitter title 불일치는 `metadata.title.mismatch`; route identity, canonical 또는 OG/Twitter URL 불일치는 `metadata.route.invalid`. | FR-003, FR-011; AC-U02-04, AC-U04-04; USCN-001, USCN-002 |
| BR-META-003 | Résumé JSON-LD는 `ProfilePage`와 최소 승인된 `Person` 의미만 사용한다. Portfolio JSON-LD는 `CollectionPage`, ordered `ItemList`와 각 project의 보수적 `CreativeWork` 의미만 사용한다. 조직 관계, 고용, 소유권, 성과 수치 또는 더 구체적인 project type을 visible approved fact 없이 추론하지 않는다. | `metadata.claim.unsupported` 또는 `metadata.structured-data.invalid`. | FR-002, FR-011; AC-U02-04, AC-U04-04, AC-E02-02~03; USCN-001, USCN-002 |
| BR-META-004 | JSON-LD의 claim은 visible projection allowlist의 exact fact 또는 고정 route/page 의미여야 한다. Optional absent fact는 property 자체를 생략한다. `ItemList` item 수는 project 수와 같고 position은 displayed project의 1-based ordinal이며 BR-ORD-002 순서를 보존한다. | `metadata.claim.unsupported` 또는 `metadata.structured-data.invalid`. | FR-005, FR-011; AC-U04-01~04, AC-E01-03~04; USCN-002; EDGE-002, EDGE-003, EDGE-006 |
| BR-META-005 | C03은 typed JSON-LD document collection만 만들고 C04는 raw author-authored JSON string을 받지 않는다. Ordered collection을 serialize하고 host output에서 다시 extract/parse했을 때 문서 수, 순서, key/value와 Unicode text가 구조적으로 같아야 한다. Text는 script 실행 경계를 종료하거나 executable code가 될 수 없게 안전하게 표현한다. | `jsonld.serialization`. | FR-011, FR-013, FR-015; AC-U02-04, AC-U04-04, AC-E03-01~02; USCN-001, USCN-002; EDGE-005, EDGE-010, EDGE-011 |
| BR-META-006 | Structured-data collection이 absent 또는 empty인 기존 route에는 JSON-LD host output을 만들지 않고 기존 title/description contract를 유지한다. Profile route에는 required document set이 정확히 한 번 존재해야 한다. | Profile route 누락/중복은 `metadata.structured-data.invalid`; valid absence는 issue 없음. | FR-011; AC-U02-04, AC-U04-04; EDGE-006 |
| BR-META-007 | Metadata consistency gate는 metadata와 JSON-LD를 validated source 및 visible route projection과 비교한다. 한 claim이라도 allowlist를 벗어나면 전체 page를 public-ready로 만들지 않는다. | 해당 metadata diagnostic; partial metadata fallback 금지. | FR-002, FR-011; AC-U02-04, AC-U04-04, AC-E02-02~03; USCN-004 |

## 7. Navigation 규칙

| Rule ID | Predicate와 required outcome | Failure diagnostic | Traceability |
|---|---|---|---|
| BR-NAV-001 | Primary navigation의 ordered model은 `Tags` → `Graph` → `Résumé` → `Portfolio`이며 profile href는 각각 `/resume`, `/portfolio`다. Desktop과 mobile은 같은 immutable model을 소비한다. | `navigation.model.invalid`. | FR-003, FR-012; AC-U01-03~04; USCN-001~USCN-003 |
| BR-NAV-002 | Desktop과 좁은 화면의 server-rendered HTML에는 primary model의 같은 label/href set과 order가 존재한다. Résumé와 Portfolio anchor의 존재가 hydration, mobile-open state 또는 새 client JavaScript에 의존하지 않는다. | `navigation.model.invalid`. | FR-003, FR-012~FR-013; AC-U01-03~04; USCN-001~USCN-003; EDGE-011 |
| BR-NAV-003 | Current state는 pathname의 exact route 또는 slash-delimited descendant만 match한다. 비슷한 prefix는 match하지 않는다. 한 model에서 `aria-current="page"`는 최대 하나이며 profile route에서는 해당 item이 정확히 하나다. | `navigation.current.invalid`. | FR-003, FR-012~FR-013; AC-U01-03~04; USCN-001, USCN-002; EDGE-011 |
| BR-NAV-004 | 각 profile heading 아래 local navigation은 `홈`(`/`) → `Résumé`(`/resume`) → `Portfolio`(`/portfolio`) 순서의 static anchors다. 현재 profile page 하나만 current이며 homepage link는 profile page에서 current가 아니다. | `navigation.model.invalid` 또는 `navigation.current.invalid`. | FR-003, FR-012~FR-013; AC-U01-03~04; USCN-001, USCN-002; EDGE-011 |
| BR-NAV-005 | Profile route는 primary/profile-local navigation에만 속한다. Search index, graph, tag index와 content nav tree에 profile entry를 주입하지 않는다. 기존 Tags, Graph, search와 theme control의 의미를 바꾸지 않는다. | Profile entry leak 또는 기존 item 손실은 navigation/integration verification failure다. | FR-003, FR-012~FR-013; AC-U01-03~04; USCN-003 |

## 8. Print, PDF와 fact-parity 규칙

| Rule ID | Predicate와 required outcome | Failure diagnostic | Traceability |
|---|---|---|---|
| BR-DOC-001 | Public document link는 항상 `/resume.pdf`다. PDF fact source는 현재 validated `ResumeProfile`을 모두 포함한 rendered `/resume` 하나뿐이며 별도 hand-authored résumé fact source를 허용하지 않는다. | `document.link.invalid` 또는 `document.source.invalid`. | FR-002, FR-004, FR-010; AC-U03-02~04, AC-E02-02~04; USCN-001, USCN-004; EDGE-008, EDGE-009 |
| BR-DOC-002 | Screen에서는 native detail이 처음 닫혀 있지만 그 상세 text는 static document에 존재한다. Print와 PDF는 current open state와 무관하게 모든 승인 상세를 résumé section/entity order대로 포함한다. Screen-only navigation과 장식은 fact manifest에 들어가지 않는다. | 누락은 `document.parity`; presentation/print quality는 별도 NFR gate다. | FR-004, FR-010, FR-013; AC-U02-02, AC-U03-01, AC-U03-03; USCN-001; EDGE-005, EDGE-009, EDGE-011 |
| BR-DOC-003 | Ordered `ResumeProfile`의 모든 승인 fact를 stable normalized manifest로 만든다. Manifest는 source identity, present-section order vector, entity kind/ID/order vector와 ordered entries를 가진다. 각 entry는 section key/order, applicable entity kind/ID/order, source `factId`, semantic path, value kind와 normalized text/period/URL value를 보존한다. Text는 BR-TXT 규칙, period는 BR-PER 규칙, URL은 BR-URL 규칙을 사용하고 typed block의 paragraph/list-item 순서를 보존한다. Fingerprint는 fingerprint field 자체를 제외한 source identity, 두 order vector와 모든 entry에서 파생되며 presentation-only label과 layout은 제외한다. | Manifest 생성 provenance 불일치는 `document.source.invalid`. | FR-001, FR-002, FR-004, FR-010, FR-015; AC-U03-03~04, AC-E01-04, AC-E02-03~04, AC-E03-01~02; USCN-004; EDGE-009, EDGE-010 |
| BR-DOC-004 | Web, browser print와 PDF에서 추출한 normalized manifest는 같은 source identity와 fingerprint를 참조하고, present-section vector, entity kind/ID/order vector, entry 수와 각 entry의 section/order, entity tuple, `factId`, semantic path, value kind 및 normalized value가 완전히 같아야 한다. Set equality, core subset 또는 수동 눈검사만으로 대체하지 않는다. | `document.parity`. | FR-004, FR-010; AC-U03-03~04, AC-E02-03~04; USCN-001, USCN-004; EDGE-009 |
| BR-DOC-005 | Document request는 현재 résumé manifest의 deterministic source identity를 가진다. Generation result는 같은 identity를 증명해야 하며 기존 binary 존재만으로 현재 generation 성공을 주장할 수 없다. | `document.source.invalid`, `document.generation.failed` 또는 `document.stale`. | FR-010; AC-U03-02~04; USCN-004; EDGE-008, EDGE-009 |
| BR-DOC-006 | PDF missing, unreadable, generation failure, broken stable link, stale source 또는 one-fact mismatch는 각각 완료를 차단한다. 실패한 현재 generation을 이전 PDF, partial manifest 또는 manual PDF fact edit로 복구하지 않는다. | 상황별 `document.missing`, `document.unreadable`, `document.generation.failed`, `document.link.invalid`, `document.stale`, `document.parity`. | FR-002, FR-010; AC-U03-02~04, AC-E02-04; USCN-001, USCN-004; EDGE-008, EDGE-009 |
| BR-DOC-007 | PDF binary byte equality는 parity predicate가 아니다. Browser metadata나 binary encoding이 달라도 BR-DOC-004의 normalized fact manifest와 별도 visual/readability gate가 모두 통과하면 fact parity는 성립한다. | Byte difference만으로 issue를 만들지 않는다. | FR-010; AC-U03-01~03; USCN-001; EDGE-009 |

## 9. 주요 negative-path 판정표

| Negative path | Required outcome | Diagnostic 또는 gate | Traceability |
|---|---|---|---|
| 필수 identity/contact/summary가 없거나 empty | 모든 issue를 집계하고 public projection을 만들지 않음 | `field.required`, `text.empty` | EDGE-001; AC-E01-02 |
| Project가 2개 또는 7개 이상 | Public-ready 실패 | `collection.range` | EDGE-002; AC-U04-01, AC-E01-02 |
| ID/order 충돌 | Fallback sort 없이 실패 | `identifier.duplicate`, `order.duplicate` | EDGE-003; AC-U04-01, AC-E01-02 |
| Optional evidence가 absent | Link/CTA만 생략하고 본문 유지 | No issue | EDGE-004; AC-U04-03, AC-U05-03 |
| Optional evidence가 supplied-invalid | 조용히 생략하지 않고 전체 gate 실패 | `evidence.url.invalid` | EDGE-004; AC-U05-04, AC-E01-02 |
| Optional section collection이 empty | Heading, wrapper와 placeholder 없이 생략 | No issue | EDGE-006; AC-U02-03, AC-E01-03 |
| Approval record가 Pending/Excluded 또는 value가 변경됨 | Page, metadata, PDF 모두 public-ready 불가 | Approval diagnostics | AC-E02-02~04 |
| Metadata가 visible claim보다 강함 | Metadata 포함 page 전체 gate 실패 | `metadata.claim.unsupported` | AC-U02-04, AC-U04-04 |
| JavaScript/hydration이 없음 | Header/profile-local link와 native detail을 계속 사용 가능 | Browser/example gate; domain issue 없음 | EDGE-011; AC-U01-04, AC-U02-02 |
| PDF가 없거나 읽히지 않음 | 이전 binary나 web-only 성공으로 대체하지 않음 | `document.missing`, `document.unreadable` | EDGE-008; AC-U03-04 |
| PDF가 current source와 다르거나 한 fact가 다름 | Completion 실패 | `document.stale`, `document.parity` | EDGE-009; AC-U03-04, AC-E02-04 |

## 10. PBT-01 Testable Properties

### 10.1 공통 생성 domain과 경계

Property test의 생성 domain은 framework와 무관하게 다음을 포함해야 한다.

- NFC 및 non-NFC 한국어/Unicode, leading/trailing whitespace, LF/CRLF/CR, 긴 기술 문자열과 markup-like literal text
- 3개와 6개 경계의 valid project collection, 2개와 7개의 controlled-invalid mutation
- Entity-kind scoped unique/duplicate kebab IDs, sparse positive order, duplicate/zero/non-integer order
- Absent/empty optional collection, present-valid optional field와 present-invalid optional field
- `year`, `year-month`, `present`, month boundary, reversed range와 mixed precision
- Valid public email/GitHub, HTTPS evidence, root-relative evidence와 scheme/host/traversal negative URL
- paragraph/list block, empty item와 unsupported block kind
- Absent/career/achievement project relation과 missing/wrong-kind target
- Approved/Pending/Excluded fact record, normalized value mismatch와 production extra
- JSON-safe Unicode 및 script-boundary-like literal text

Valid generator는 BR-TXT~BR-CONT의 구조적 제약을 만족하는 complete profile을 만든다. Invalid case는 valid value에 규칙 하나를 통제해 위반시키는 mutation을 우선 사용하며, 선행 오류 때문에 의도한 diagnostic을 관찰할 수 없는 case는 precondition에서 제외한다. Generator와 test는 network에 접속하지 않는다.

### 10.2 C01 — Profile Domain

| Property ID | Category | Generated domain / precondition | Operation | Assertion / oracle | Traceability |
|---|---|---|---|---|---|
| P-C01-01 | Idempotence | 임의의 Unicode text와 line ending | BR-TXT-001 normalization을 한 번, 이어서 두 번 적용 | `normalize(normalize(x))`와 `normalize(x)`가 code point 단위로 같다. 내부 whitespace와 LF 문단은 첫 결과에서 보존된다. | BR-TXT-001~004; FR-001, FR-015; AC-E01-04, AC-E03-01 |
| P-C01-02 | Invariant, Easy verification | Complete valid profile | Validate | 성공 value는 모든 required/cardinality/ID/order/period/URL/block/relation predicate를 checker로 다시 쉽게 확인할 수 있고 input은 변하지 않는다. | BR-READY, BR-ID, BR-ORD, BR-PER, BR-URL, BR-CONT; AC-E01-01~04 |
| P-C01-03 | Oracle | Valid profile + 하나의 controlled-invalid mutation | Validate | 간단한 rule-to-code oracle이 예측한 `{code,path}`가 결과에 존재하고 validated value는 없다. Unrelated valid field는 추가 issue를 만들지 않는다. | BR-VAL-001~003; FR-001, FR-015; AC-E01-02, AC-E03-01~02; EDGE-001~EDGE-004 |
| P-C01-04 | Invariant, Oracle | Valid profile의 ordered collection을 source-array permutation하되 explicit order 유지 | Resume/portfolio selector | 결과는 단순 `order` ascending reference sort와 같고 element/fact multiset 및 cardinality를 보존한다. | BR-ORD-001~003, BR-SEL-002~003; AC-U04-01, AC-E01-04 |
| P-C01-05 | Invariant, Easy verification | Valid profile에서 optional section/link의 모든 존재·부재 조합 | Consumer selectors | Absent optional 결과만 없어지고 required fact와 상대 order는 유지된다. Empty heading, placeholder 또는 synthetic link가 생기지 않는다. | BR-READY-006, BR-URL-004, BR-SEL-005; AC-U02-03, AC-U04-03, AC-U05-03, AC-E01-03 |
| P-C01-06 | Invariant, Oracle | Valid approved profile | 모든 consumer selector | 각 projected fact의 `factId`와 normalized value가 source allowlist에 정확히 존재하며 selector가 새 fact를 만들거나 원본을 바꾸지 않는다. | BR-APR-002~005, BR-SEL-001~004; AC-E01-01, AC-E02-02~03 |

**Round-trip N/A**: C01 production source에는 별도 serialization/deserialization 또는 parse/format inverse가 정의되지 않았다. JSON-LD round-trip은 C04가 소유한다.

**Commutativity N/A**: normalization → validation → projection은 의도적으로 순서가 있는 pipeline이며 서로 교환 가능한 독립 연산으로 주장하지 않는다.

**Induction N/A**: C01은 recursive structure 또는 inductive algorithm을 사용하지 않는다.

### 10.3 C02 — Profile Presentation

| Property ID | Category | Generated domain / precondition | Operation | Assertion / oracle | Traceability |
|---|---|---|---|---|---|
| P-C02-01 | Invariant, Easy verification | Valid résumé projection과 optional section 조합 | Semantic résumé representation 생성 | Section 순서는 BR-ORD-003과 같고 Experience summary에는 organization, role와 required period가, Achievement summary에는 title과 present한 경우 period가 있으며 두 variant 모두 one-line summary가 존재한다. 모든 detail은 처음 닫힌 native detail node 안에도 static하게 존재한다. | BR-SEL-002, BR-SEL-005, BR-DOC-002; AC-U02-01~03; EDGE-006, EDGE-011 |
| P-C02-02 | Invariant, Easy verification | Valid portfolio projection 3~6개 | Semantic portfolio representation 생성 | Article 수와 order가 projection과 같고 각 article에 여섯 dimension이 정확히 한 ordered group으로 존재한다. | BR-READY-005, BR-CONT-002, BR-SEL-003; AC-U04-01~02 |
| P-C02-03 | Invariant | Valid projection에서 optional evidence/section을 제거한 pair | 두 representation 비교 | 제거한 optional node와 CTA만 사라지고 required text, heading order와 remaining links는 동일하다. | BR-URL-004, BR-SEL-005; AC-U02-03, AC-U04-03, AC-U05-03 |

**Round-trip, Idempotence, Commutativity와 Induction N/A**: C02는 inverse, repeat-application, order-independent pair 또는 recursive algorithm을 주장하지 않는 one-way presentation이다. CSS layout, contrast, focus, keyboard behavior, visual quality와 print pagination은 generated semantic tree property가 아니라 NFR example/browser/visual 검증 대상이다.

### 10.4 C03 — Profile Metadata Builder

| Property ID | Category | Generated domain / precondition | Operation | Assertion / oracle | Traceability |
|---|---|---|---|---|---|
| P-C03-01 | Invariant, Oracle | Valid résumé/portfolio projection과 configured site identity | Route metadata 생성 | Title은 `{approvedName} — Résumé` 또는 `{approvedName} — Portfolio` exact template이고 description은 해당 visible summary와 같으며 canonical/OG/Twitter identity는 fixed route oracle과 같고 두 route identity가 다르다. | BR-META-001~002; AC-U02-04, AC-U04-04 |
| P-C03-02 | Invariant, Easy verification | Valid projection의 optional fact 조합 | JSON-LD document 생성 | 모든 claim이 visible approved allowlist 또는 fixed page meaning에 속하고 absent fact property가 없다. | BR-META-003~004; AC-E02-02~03 |
| P-C03-03 | Invariant, Oracle | 3~6개 ordered project | Portfolio structured data 생성 | Item 수는 project 수와 같고 1-based position 및 project identity 순서는 displayed projection reference model과 같다. | BR-META-003~004; AC-U04-01, AC-U04-04 |
| P-C03-04 | Oracle, Invariant | Valid metadata plus exactly one controlled route, title, canonical, description, unsupported-claim, JSON-LD type/count/order/position mutation | `validateMetadataConsistency` | Reference rule maps the mutation to the expected stable metadata diagnostic, returns no validated metadata and never repairs, drops or partially accepts the invalid claim. | BR-META-001~007; FR-002, FR-011, FR-015; AC-U02-04, AC-U04-04, AC-E02-02~03; EDGE-002, EDGE-003, EDGE-006 |

**Round-trip N/A**: C03은 typed documents를 생성하는 owner이며 serialize/parse inverse는 C04에서 검증한다.

**Idempotence, Commutativity와 Induction N/A**: Metadata build는 pure deterministic projection이지만 repeat application을 다시 입력으로 받지 않으므로 idempotence가 아니며, 교환 또는 recursive contract가 없다.

### 10.5 C04 — Base Layout Metadata Host

| Property ID | Category | Generated domain / precondition | Operation | Assertion / oracle | Traceability |
|---|---|---|---|---|---|
| P-C04-01 | Round-trip | 허용 JSON value, 한국어/Unicode와 script-boundary-like literal을 가진 ordered typed document collection | Safe serialize → host embed → extract → parse | 복원한 ordered document collection이 원래 collection과 구조적으로 같고 host script boundary를 추가로 만들지 않는다. | BR-META-005; FR-011, FR-015; AC-U02-04, AC-U04-04, AC-E03-01 |
| P-C04-02 | Invariant | Absent/empty 또는 non-empty document collection | Structured-data host 생성 | Absent/empty면 host가 없고, non-empty면 모든 document가 정확히 한 번 같은 순서로 복원된다. Existing non-profile metadata input은 변하지 않는다. | BR-META-005~006; AC-U02-04, AC-U04-04; EDGE-006 |

**Idempotence, Commutativity와 Induction N/A**: Host result를 다시 host input으로 사용하지 않으며 독립 연산 교환이나 recursion이 없다.

### 10.6 C05 — Header Navigation

| Property ID | Category | Generated domain / precondition | Operation | Assertion / oracle | Traceability |
|---|---|---|---|---|---|
| P-C05-01 | Invariant, Oracle | Fixed primary model과 임의 pathname | Current-state 계산 | Output length/order/label/href는 input과 같고 `aria-current`는 최대 하나다. `/resume`·descendant와 `/portfolio`·descendant는 각 exact segment item 하나, 유사 prefix와 unrelated route는 none이다. | BR-NAV-001, BR-NAV-003; AC-U01-03~04 |
| P-C05-02 | Invariant, Easy verification | 모든 site pathname | Desktop/mobile header representation 생성 | 두 representation의 ordered navigation label/href multiset이 같고 Résumé/Portfolio anchor가 server-rendered tree에 항상 존재한다. | BR-NAV-001~002; AC-U01-03~04; EDGE-011 |
| P-C05-03 | Oracle | `/resume`, `/portfolio` | Profile-local navigation 생성 | Simple fixed model oracle `홈`, `Résumé`, `Portfolio`와 exact href/order가 같고 current item이 해당 profile page 하나다. | BR-NAV-004; AC-U01-03~04 |

**Round-trip, Idempotence, Commutativity와 Induction N/A**: Navigation은 inverse나 recursive algorithm이 없는 deterministic projection이다. Fixed label/icon의 시각 배치는 example/browser 검증 대상이다.

### 10.7 C11 — Resume Document Boundary

| Property ID | Category | Generated domain / precondition | Operation | Assertion / oracle | Traceability |
|---|---|---|---|---|---|
| P-C11-01 | Invariant, Easy verification | Valid ordered `ResumeProfile` | Normalized source manifest 생성 | 모든 approved résumé text, period와 URL fact가 정확히 한 stable entry로 존재하고 section/order, applicable entity kind/ID/order, source `factId`, semantic path, value kind와 normalized value가 checker를 만족한다. Presentation-only 값은 없다. | BR-DOC-001~003; AC-U03-03, AC-E02-03 |
| P-C11-02 | Oracle | Source manifest와 동일하거나 entry 하나가 누락·추가·변경·재정렬된 target manifest | Parity 판정 | 단순 ordered structural equality oracle과 결과가 같고 exact equality만 통과한다. | BR-DOC-004; AC-U03-03~04, AC-E02-04; EDGE-009 |
| P-C11-03 | Invariant, Easy verification | Current source identity 및 valid/invalid request mutation | Document-source request 판정 | Exact source identity와 `/resume.pdf`만 통과하고 separate source, stale identity와 다른 public path는 controlled diagnostic으로 실패한다. | BR-DOC-001, BR-DOC-005~006; AC-U03-02~04; EDGE-008, EDGE-009 |

**Round-trip N/A**: Browser/PDF binary generation과 text extraction은 logical inverse가 아니며 lossy presentation boundary다. Byte identity를 property로 사용하지 않는다.

**Idempotence, Commutativity와 Induction N/A**: File generation 반복의 byte identity를 보장하지 않고, 외부 document side effect는 operation-order나 recursive property 대상이 아니다. Visual/readability와 실제 PDF inspection은 example/document gate가 보완한다.

### 10.8 S01 — Profile Assembly Service

| Property ID | Category | Generated domain / precondition | Operation | Assertion / oracle | Traceability |
|---|---|---|---|---|---|
| P-S01-01 | Easy verification | Valid profile 또는 controlled-invalid profile | 전체 assembly 판정 | Valid input만 complete résumé/portfolio/metadata contract를 만들고 모든 output provenance가 같은 source identity다. Invalid input은 downstream public output이 0개다. | BR-VAL-004, BR-SEL-001, BR-META-007; AC-E01-01~02, AC-E02-02~03 |

S01은 C01~C05의 property를 orchestration 수준에서 연결할 뿐 중복 property를 새로 소유하지 않는다. Round-trip, Idempotence, Commutativity와 Induction은 적용되지 않는다.

### 10.9 S04 — Resume Document Service

**No independent PBT properties identified.**

S04의 pure source identity, manifest와 parity predicate는 C11의 P-C11-01~03이 소유한다. S04 자체는 browser, filesystem, font readiness, PDF creation과 inspection이라는 side-effect orchestration이므로 property generator가 human-readable document quality를 증명하지 못한다. 다음 항목은 PBT 대신 explicit example/document negative tests로 검증한다.

- 현재 generation failure가 기존 binary로 성공 처리되지 않음
- `/resume.pdf` missing, unreadable와 broken link
- stale source identity와 one-fact mismatch
- print에서 모든 detail 포함 및 screen-only navigation 제외
- PDF visual/readability inspection

Traceability: BR-DOC-001~007; FR-010, FR-014~FR-015; AC-U03-01~04, AC-E03-01~02; EDGE-008~EDGE-010.

### 10.10 Category 적용 결론과 handoff

| Category | U1 판정 |
|---|---|
| Round-trip | C04의 typed JSON-LD serialize/embed/extract/parse에 적용 |
| Invariant | C01~C05와 C11의 validation, projection, omission, metadata, navigation 및 manifest에 적용 |
| Idempotence | C01 text normalization에 적용 |
| Commutativity | N/A; U1 pipeline은 순서가 의도된 변환이며 교환 가능성을 주장하지 않음 |
| Oracle | C01 sorting/diagnostic, C03 metadata/item order, C05 current state, C11 parity에 적용 |
| Induction | N/A; recursive 또는 divide-and-conquer business algorithm이 없음 |
| Easy verification | Validated closure, semantic content completeness, allowlist, manifest와 orchestration fail-closed에 적용 |

P-C01-01~06, P-C02-01~03, P-C03-01~04, P-C04-01~02, P-C05-01~03, P-C11-01~03과 P-S01-01은 U1 Code Generation plan의 binding PBT requirement로 이관한다. PBT는 AC-U01~U05, AC-E01~E02의 concrete example tests와 S04 document tests를 대체하지 않는다. PBT가 defect를 발견하면 shrunk 최소 반례를 해당 named example suite의 영구 regression case로 승격하고 property와 example을 함께 유지한다. Framework, shrink configuration, seed syntax와 run count는 U1 NFR Requirements에서 정한다.

## 11. Traceability coverage

| Trace group | Covered rules |
|---|---|
| FR-001 공용 typed profile | BR-TXT, BR-PER, BR-ID, BR-ORD, BR-READY, BR-REL, BR-VAL, BR-SEL |
| FR-002 승인된 사실만 공개 | BR-PER, BR-REL, BR-URL, BR-CONT, BR-APR, BR-VAL, BR-META, BR-DOC |
| FR-003 내부 한국어 profile route | BR-READY, BR-SEL, BR-NAV, BR-META |
| FR-004 résumé summary/detail | BR-PER, BR-READY, BR-CONT, BR-SEL, BR-DOC |
| FR-005 project case study | BR-ID, BR-ORD, BR-READY, BR-REL, BR-URL, BR-CONT, BR-SEL, BR-META |
| FR-006 contact CTA | BR-READY, BR-URL, BR-APR |
| FR-007 page direction의 functional content hierarchy | BR-TXT-004, BR-ORD-003, BR-SEL-002~003 |
| FR-010 print/PDF | BR-DOC |
| FR-011 metadata/structured data | BR-APR, BR-META |
| FR-012 navigation/cross-link | BR-URL-003, BR-SEL-004, BR-NAV |
| FR-013 no-new-client-JS/static behavior | BR-CONT-003, BR-URL-005, BR-SEL-002~004, BR-META-005, BR-NAV, BR-DOC-002 |
| FR-014~FR-015 example/PBT handoff | Section 10 properties와 S04 explicit examples |
| USCN-001 빠른 이력 확인 | BR-READY, BR-SEL-002, BR-NAV, BR-DOC |
| USCN-002 project 판단 | BR-READY-005, BR-REL, BR-URL, BR-CONT, BR-SEL-003, BR-META, BR-NAV |
| USCN-003 일반 탐색 | BR-SEL-004, BR-NAV-001~005 |
| USCN-004 운영자 갱신 | BR-TXT~BR-APR, BR-VAL, BR-DOC와 Section 10 |
| EDGE-001~004 | BR-TXT-002~003, BR-ID, BR-ORD, BR-READY, BR-URL, BR-VAL |
| EDGE-005~006 | BR-TXT-004, BR-CONT, BR-READY-006, BR-SEL-005, BR-DOC-002 |
| EDGE-008~009 | BR-DOC-001~007 |
| EDGE-010 | Section 10 PBT properties와 Code Generation handoff |
| EDGE-011 | BR-SEL-002, BR-NAV-002~004, BR-DOC-002 |

U1은 ST-U01의 route/navigation contributor contract만 제공하며 homepage composition closure는 U2에 남는다. ST-E03에서는 profile property slice만 제공하고 parent story closure는 U2에 남는다. 이 Functional Design은 application source, external Vault, generated output, PDF binary, Infrastructure, AWS와 deployment를 변경하지 않는다.
