# U2 Functional Design Plan — Homepage Publication Boundary

## 문서 상태

- **단계**: CONSTRUCTION — U2 Functional Design
- **상태**: artifact 4/4 생성·검증·독립 검토 완료 — 완료 gate 승인 대기
- **Unit**: U2 Homepage Publication Boundary
- **Bounded Context**: Homepage Publication
- **작성일**: 2026-07-28
- **Feature Branch**: `codex/feature/resume-home-boundary`
- **Branch Base**: U1 병합 뒤 최신 검증된 local `develop` at `af32509` (merge `codex/fix/diagram-render-gate`)
- **PBT Enforcement**: Full; 이 단계에는 PBT-01이 적용됨

## 1. 입력과 전제

- [Unit of Work Definitions](../../inception/application-design/unit-of-work.md) — §4 U2
- [Unit of Work Story Map](../../inception/application-design/unit-of-work-story-map.md)
- [Application Design](../../inception/application-design/application-design.md)
- [Components](../../inception/application-design/components.md) — C06~C10
- [Services](../../inception/application-design/services.md) — S02, S03
- [Requirements](../../inception/requirements/requirements.md) — FR-008, FR-009, FR-012, FR-013, FR-015, FR-017
- [User Stories](../../inception/user-stories/stories.md) — ST-U01, ST-U06, ST-E03
- U1이 병합한 provider contract: 안정된 `/resume`·`/portfolio` route, validated homepage profile projection과 server-rendered panel primitive

다음 결정은 이미 승인됐으며 이 계획에서 다시 열지 않는다.

- frontmatter `visibility: homepage`와 기본 `post`를 typed `PublicationScope`로 정규화하고, 알 수 없는 값은 기본값으로 떨어뜨리지 않고 source path와 값을 포함한 오류로 실패한다.
- homepage source는 build마다 정확히 하나여야 하며 0개 또는 2개 이상이면 어떤 output도 성공으로 보고하지 않는다.
- `visibility: homepage` source는 homepage body를 만드는 단일 projection에만 존재하고, `/posts/passion-project` route, 일반 글 목록, tag, hub, 오늘 발행 글, knowledge search, RSS, sitemap post entry, nav tree, previews, graph node/edge, related, backlink/forward-link 등 승인된 일반 discovery surface 전체에서 제외된다.
- 일반 note의 homepage wikilink는 alias와 지원되는 heading/block fragment 의미를 보존하며 `/`로 정규화한다.
- homepage source를 대상으로 하는 full, heading, block transclusion은 모두 variant와 source path를 식별하는 authoring error로 거부한다.
- homepage outbound link는 homepage 렌더링에는 사용할 수 있으나 다른 post의 backlink, related score, graph 또는 ranking에 기여하지 않는다.
- homepage는 normal `posts/{slug}.md`·`meta/{slug}.json`이 아니라 dedicated homepage artifact로만 물질화한다.
- `/` 자체는 정상 sitemap route로 남고 `/resume`·`/portfolio`도 sitemap에 포함된다.
- 정확히 하나의 profile slot을 U1 canonical profile fragment(짧은 소개 + `/resume`·`/portfolio` CTA)로 build-time 조합하고, slot 0개 또는 여러 개는 source path와 count를 포함한 build error다. profile 사실을 Vault Markdown에 복제하지 않는다.
- slot 바깥의 Vault content와 기존 오늘 발행 글 composition을 보존하고, unrelated posts의 route, 순서, content와 discoverability를 보존한다.
- 새 client-side JavaScript, Preact island 또는 외부 runtime 의존성을 추가하지 않는다 (FR-013).
- 외부 Vault 편집은 `Areas/Notes/Passion Project.md` 하나로 제한하며, U2 consuming behavior와 fixture가 먼저 준비된 뒤에만 적용하고 정확한 diff를 검토한다. 별도 승인 없이 외부 repository의 commit 또는 push를 하지 않는다.
- `content/`, generated `site/public/*.json`, `site/dist/`와 Rust `target/`은 authored source가 아니라 documented preprocess/build 명령의 output이다 (FR-017).
- Infrastructure, Terraform, AWS, deployment와 Jenkins 변경은 이 단계의 범위가 아니다.
- Rust PBT framework, generator library, run count와 seed 문법 선택은 U2 NFR Requirements에서 확정한다. site 쪽 test는 U1이 승인한 Vitest/fast-check 도구를 재사용한다.

현재 구현 상태는 이 결정들의 반대편에 있다: `site/src/pages/index.astro`는 `getPostContent("passion-project")`로 homepage를 normal post로 읽고, rendered HTML을 `이번주에 작성된 포스트` heading regex로 잘라 오늘 발행 글을 삽입하며, scanner에는 `visibility` frontmatter 처리가 없다. 이 간극이 U2의 작업 대상이다.

## 2. 목표와 산출물

이 단계는 구현 도구가 아니라 U2의 publication business/domain contract를 확정한다.

- publication cardinality와 scope 정규화 규칙
- homepage reference(wikilink/alias/fragment/transclusion) truth table
- discovery surface 별 포함/제외 matrix
- dedicated homepage artifact와 profile slot contract
- 오류 taxonomy와 fail-closed data flow
- C06~C10, S02, S03의 PBT-01 property 또는 명시적 N/A 근거

답변 검증 뒤 다음 파일을 생성한다.

- `aidlc-docs/construction/homepage-publication-boundary/functional-design/business-logic-model.md`
- `aidlc-docs/construction/homepage-publication-boundary/functional-design/business-rules.md`
- `aidlc-docs/construction/homepage-publication-boundary/functional-design/domain-entities.md`
- `aidlc-docs/construction/homepage-publication-boundary/functional-design/frontend-components.md`

Rust PBT framework/generator/seed 문법, 성능 수치와 test 도구 구성은 다음 U2 NFR Requirements에서 확정한다.

## 3. 실행 계획

### 3.1 Context 분석

- [x] U2 definition, story ownership(ST-U01, ST-U06, ST-E03), acceptance criteria와 U1 provider contract를 분석한다.
- [x] C06~C10, S02, S03의 승인된 책임과 Functional Design 이관 항목을 분석한다.
- [x] FR-008, FR-009, FR-012, FR-013, FR-015, FR-017, EDGE-007, EDGE-012를 추적한다.
- [x] 현재 구현(scanner frontmatter 필드, `content/posts`·`content/meta` layout, `data.ts` getter, `index.astro` heading-split composition)을 확인한다.
- [x] 승인된 exactly-one, discovery 제외, transclusion 거부, Vault write, no-push와 no-deploy 경계를 고정한다.

### 3.2 질문과 답변

- [x] Publication Cardinality, Scope Parsing, Error Taxonomy, Catalog Representation, Artifact Contract, Rendering Boundary, Output Lifecycle, Reference Semantics, Slot Composition과 Gateway Compatibility의 미확정 항목을 조사한다.
- [x] 이미 승인된 제품 결정을 반복하지 않는 context-specific 질문을 작성한다.
- [x] NFR 도구 선택(Rust PBT framework 등)을 이 질문에서 제외한다.
- [x] 모든 질문에 최소 두 개의 의미 있는 선택지와 마지막 `X) Other`를 제공한다.
- [x] 모든 `[Answer]:`를 수집하고 선택 형식, 명확성, 상호 일관성과 기존 승인 호환성을 검증한다.
- [x] 모호하거나 혼합된 답변이 있으면 별도 clarification question file을 만들고 모두 해소한다. 해당 없음 — 12개 답변이 모두 명확한 A 선택이다.

### 3.3 Functional Design 생성

- [x] `PublicationScope`, catalog projection, homepage artifact와 slot contract의 entity/value object/lifecycle을 설계한다.
- [x] scope 정규화, cardinality, reference truth table과 transclusion 거부의 rule matrix를 설계한다.
- [x] deterministic publication 진단 taxonomy와 fail-closed data flow를 설계한다.
- [x] discovery surface 포함/제외 matrix를 기존 pipeline output 기준으로 설계한다.
- [x] dedicated artifact schema, output lifecycle과 Astro gateway 계약을 설계한다.
- [x] homepage composition(slot 치환 + 오늘 발행 글)의 component contract를 설계한다.
- [x] 네 개의 필수 Functional Design artifact를 생성한다.

### 3.4 PBT-01과 품질 검증

- [x] C06~C10, S02, S03의 property/N/A inventory를 최종 확정한다.
- [x] 모든 관련 component에 category, precondition, generator domain, operation, assertion/oracle와 traceability가 있는 `Testable Properties`를 문서화한다. precondition/operation은 property 문장에 내장한다.
- [x] property가 없는 component/operation에 `No PBT properties identified`와 구체적인 이유를 문서화한다 (S02, S03).
- [x] Round-trip, Invariant, Idempotence, Commutativity, Oracle, Induction과 Easy verification 적용 여부를 각각 판정한다.
- [x] determinism을 idempotence로 잘못 분류하지 않고 human review 대상을 PBT로 대체하지 않는다.
- [x] identified properties를 U2 Code Generation plan과 ST-E03 publication slice의 binding test requirement로 전달한다.
- [x] FR, Story/AC, EDGE와 component traceability를 검증한다.
- [x] Obsidian Press project extension OBSIDIAN-01~05 준수 상태를 검증한다.
- [x] 완성 prompt 전에 독립 검토, 링크와 Markdown 구조 검증을 수행한다.
- [x] 표준 2-option Functional Design 완료 gate를 제시하고 명시적 승인을 기다린다.

## 4. Preliminary PBT-01 Inventory

이 표는 답변 전 계획 baseline이다. 최종 준수 판정은 네 개의 Functional Design artifact에 property와 N/A 근거를 모두 기록한 뒤에만 가능하다.

| Owner | Preliminary property categories | Planned assertions | Explicit non-property boundary |
|---|---|---|---|
| C07 Publication Catalog | Invariant, Oracle, Easy verification | homepage/post partition의 상호 배제·전체 포괄, exactly-one 검증, unknown-visibility 거부, unrelated post의 순서·내용 보존, 같은 입력의 결정적 catalog | 실제 Vault I/O와 filesystem 오류는 example 검증 대상; codec이 없으면 Round-trip N/A |
| C08 Link and Transclusion Transformer | Invariant, Oracle, Easy verification | homepage wikilink `/` 정규화의 alias/fragment 보존, homepage transclusion variant 전면 거부, non-homepage reference 결과 불변, code-fence 내부 비변환 | 렌더링된 anchor의 시각 표현은 example/browser 검증 대상 |
| C09 Output Materializer | Round-trip, Invariant, Idempotence 후보 | homepage artifact serialize → C10 parse 구조 동등성, homepage가 `posts/`·`meta/`·discovery output에 부재, manifest가 실제 생성 파일과 일치, 같은 catalog의 재실행 출력 동등성 | write 실패·권한 오류는 example 검증 대상; byte-level 파일 시스템 상태는 property가 아님 |
| C10 Static Data Gateway | Round-trip(C09와 쌍), Invariant, Easy verification | post getter가 homepage를 반환하지 않음, homepage getter의 fail-closed 진단, malformed artifact 거부 | Astro build 통합과 module cache 동작은 example 검증 대상 |
| C06 Homepage Composition | Invariant, Idempotence 후보, Easy verification | 정확히 한 번의 slot 치환, slot 바깥 content 보존, 0/2+ slot 거부, 조합 결과에 slot token 부재 | profile panel의 시각 layout과 CSS는 example/browser 검증 대상 |
| S02 Publication Projection | 독립 property 없음(예정); C07~C09 property로 커버 | 전체 pipeline 통합은 fixture 기반 example로 검증 | side-effect orchestration은 S04 선례에 따라 example/document 검증 대상 |
| S03 Homepage Composition | 독립 property 없음(예정); C06/C10 property로 커버 | Astro build 통합, 오늘 발행 글 동작과 `/` 산출은 example로 검증 | Astro rendering 자체는 PBT 대상이 아님 |

현재 Commutativity와 Induction 대상은 식별되지 않았다. Vault 원본의 사실 정확성은 사용자 review 대상이고 PBT가 대신 증명하지 않는다.

## 5. Functional Design Questions

각 `[Answer]:` 뒤에 선택한 문자 하나를 입력해 주세요. `X`를 선택하면 같은 줄에 구체적인 규칙을 작성해 주세요.

### Question 1 — 전환 순서와 exactly-one 강제 시점

exactly-one homepage 검증이 항상 켜져 있으면, U2 코드가 들어간 뒤 아직 편집되지 않은 실제 Vault에 대한 `just preprocess`는 실패하게 됩니다. 이 전환 기간을 어떻게 다룰까요?

A) 강제를 조건 없이 항상 활성으로 두고, missing homepage와 duplicate homepage를 별도 진단 코드로 구분한다. U2 Construction 동안 실행 증거는 fixture vault가 제공하고, 실제 Vault 대상 preprocess는 승인된 `Passion Project.md` 편집이 적용된 뒤에만 U2 검증 증거로 사용한다. 편집 전 실제 Vault 실행의 실패는 결함이 아니라 전환 미완료를 정확히 알리는 신호다. **(권장)**

B) publication 코드는 먼저 들어가되 exactly-one 강제 활성화를 U2 Code Generation의 마지막 slice로 미뤄, 중간 기간에도 실제 Vault 대상 preprocess가 현재 동작으로 계속 성공하게 한다. Vault 편집과 강제 활성화를 같은 slice에서 함께 적용한다.

C) 강제를 CLI flag opt-in으로 두고 기본은 legacy 동작을 유지한다. 문서화된 명령과 CI만 flag를 켜고, 전환 완료 뒤 flag 제거는 별도 정리 작업으로 남긴다.

X) Other (please describe after [Answer]: tag below) — 전환 기간의 build 의미와 강제 활성화 시점을 설명한다.

[Answer]: A) 강제를 조건 없이 항상 활성으로 두고, missing homepage와 duplicate homepage를 별도 진단 코드로 구분한다. U2 Construction 동안 실행 증거는 fixture vault가 제공하고, 실제 Vault 대상 preprocess는 승인된 `Passion Project.md` 편집이 적용된 뒤에만 U2 검증 증거로 사용한다. 편집 전 실제 Vault 실행의 실패는 결함이 아니라 전환 미완료를 정확히 알리는 신호다.

### Question 2 — `visibility` 값 파싱 규칙

승인된 "unknown 값은 오류" 경계 아래에서, frontmatter `visibility` 값의 인식 규칙을 얼마나 엄격하게 정할까요?

A) YAML scalar string의 exact lowercase `homepage` 또는 `post`만 인식한다. key 부재는 `post` 기본값이고, 그 외 모든 값과 타입(대소문자 변형, 앞뒤 공백, list, boolean 등)은 source path와 실제 값을 포함한 unknown-visibility 오류다. **(권장)**

B) trim과 case-insensitive 비교로 `homepage`/`post`를 인식해 canonical lowercase로 정규화하고, 그 외 값은 오류로 처리한다.

C) A의 exact match를 유지하되, 대소문자·공백만 다른 근접 변형에는 오류 메시지에 의도 추정 힌트를 추가한다.

X) Other (please describe after [Answer]: tag below) — 인식 값, 정규화와 거부 규칙을 설명한다.

[Answer]: A) YAML scalar string의 exact lowercase `homepage` 또는 `post`만 인식한다. key 부재는 `post` 기본값이고, 그 외 모든 값과 타입(대소문자 변형, 앞뒤 공백, list, boolean 등)은 source path와 실제 값을 포함한 unknown-visibility 오류다.

### Question 3 — publication 진단 계약

기존 preprocessor는 첫 오류에서 즉시 실패합니다. publication boundary 오류(unknown visibility, cardinality, homepage transclusion/reference)를 어떤 계약으로 보고할까요?

A) publication boundary 이슈를 전부 수집해 stable `{code, path, detail}`를 path·code 순으로 정렬한 뒤 어떤 output write 전에 한 번에 실패한다. 진단 코드는 U1 선례를 따른 stable vocabulary로 등록하고, publication 밖 기존 pipeline 오류 경로는 현재 동작을 유지한다. **(권장)**

B) 기존 pipeline과 일관되게 첫 publication 이슈에서 즉시 실패한다. 수정 후 재실행으로 다음 이슈를 확인한다.

C) 파일 단위로는 이슈를 모두 수집하되, 파일 사이에서는 첫 실패 파일에서 중단한다.

X) Other (please describe after [Answer]: tag below) — aggregation 범위, ordering과 code vocabulary 규칙을 설명한다.

[Answer]: A) publication boundary 이슈를 전부 수집해 stable `{code, path, detail}`를 path·code 순으로 정렬한 뒤 어떤 output write 전에 한 번에 실패한다. 진단 코드는 U1 선례를 따른 stable vocabulary로 등록하고, publication 밖 기존 pipeline 오류 경로는 현재 동작을 유지한다.

### Question 4 — Publication Catalog 표현

scan 결과를 downstream에 어떤 형태의 typed 표현으로 제공할까요?

A) `PublicationCatalog`가 `homepage`(exactly-one `HomepageSource`)와 `posts`(`DiscoverablePosts`)를 별개의 immutable typed projection으로 보유하고, cardinality를 검증한 builder만 catalog를 생성할 수 있게 한다. reference resolution용 `LinkableSources`는 두 projection의 read-only 합성 view다. **(권장)**

B) 단일 collection에 `PublicationScope` tag를 붙여 보관하고 downstream이 filter helper로 homepage/post view를 조회한다. cardinality 검증은 별도 validation 단계가 수행한다.

C) 기존 `VaultIndex` 구조를 유지하고 각 downstream 호출부에 scope 검사 helper만 추가한다. 새 catalog type은 도입하지 않는다.

X) Other (please describe after [Answer]: tag below) — type 구조, 생성 경로와 불변성 규칙을 설명한다.

[Answer]: A) `PublicationCatalog`가 `homepage`(exactly-one `HomepageSource`)와 `posts`(`DiscoverablePosts`)를 별개의 immutable typed projection으로 보유하고, cardinality를 검증한 builder만 catalog를 생성할 수 있게 한다. reference resolution용 `LinkableSources`는 두 projection의 read-only 합성 view다.

### Question 5 — dedicated homepage artifact 경로와 schema

normal post output(`content/posts/{slug}.md`, `content/meta/{slug}.json`) 밖의 dedicated artifact를 어디에 어떤 schema로 둘까요?

A) `content/homepage/index.md`(transform 완료 Markdown body)와 `content/homepage/meta.json`을 둔다. meta는 rendering에 필요한 결정적 최소값(`title`과 필수 필드)만 담고 timestamp 같은 비결정 값을 포함하지 않는다. 디렉터리 자체가 publication 경계를 표현한다. **(권장)**

B) `content/homepage.md`와 `content/homepage.json`을 content root의 평면 파일로 둔다. schema 최소성 규칙은 A와 같다.

C) body 문자열을 포함한 단일 `content/homepage.json` 하나로 통합한다.

X) Other (please describe after [Answer]: tag below) — 경로, 파일 구성과 metadata 필드를 설명한다.

[Answer]: A) `content/homepage/index.md`(transform 완료 Markdown body)와 `content/homepage/meta.json`을 둔다. meta는 rendering에 필요한 결정적 최소값(`title`과 필수 필드)만 담고 timestamp 같은 비결정 값을 포함하지 않는다. 디렉터리 자체가 publication 경계를 표현한다.

### Question 6 — homepage body rendering 경계

homepage body의 Markdown → HTML 변환을 어느 쪽이 담당할까요?

A) artifact body는 preprocessor transform까지 마친 Markdown으로 두고, HTML rendering은 normal post와 같은 site unified pipeline(`renderMarkdown`)이 담당한다. callout, wikilink anchor, KaTeX, Shiki 등 기존 rendering 동작을 그대로 재사용한다. **(권장)**

B) preprocessor가 homepage body를 HTML까지 pre-render해 artifact에 저장하고, Astro는 저장된 HTML을 그대로 host한다.

X) Other (please describe after [Answer]: tag below) — rendering 책임 분담과 그 이유를 설명한다.

[Answer]: A) artifact body는 preprocessor transform까지 마친 Markdown으로 두고, HTML rendering은 normal post와 같은 site unified pipeline(`renderMarkdown`)이 담당한다. callout, wikilink anchor, KaTeX, Shiki 등 기존 rendering 동작을 그대로 재사용한다.

### Question 7 — stale artifact 정리와 output manifest

homepage가 normal post에서 제외되면 이전 실행이 남긴 `posts/passion-project.md` 같은 stale artifact가 공개 결과에 남지 않아야 합니다. output lifecycle을 어떻게 정할까요?

A) preprocessor가 관리하는 output namespace(`posts/`, `meta/`, `homepage/`, discovery JSON, 복사된 assets)를 매 실행 시작에 전부 비우고 재생성한다. `GeneratedOutputManifest`는 이번 실행이 생성한 inventory를 기록한다. 결과는 항상 현재 입력만의 함수다. **(권장)**

B) 이전 manifest와 이번 생성 목록을 비교해 더 이상 생성되지 않는 파일만 삭제하는 manifest 기반 diff 정리를 한다. 최초 실행은 manifest 부재를 전체 정리로 처리한다.

C) 알려진 전환 사례만 정리한다: homepage로 지정된 slug의 normal artifact를 명시적으로 삭제하고 그 외 파일은 덮어쓰기만 한다.

X) Other (please describe after [Answer]: tag below) — 정리 범위, manifest 역할과 최초 실행 규칙을 설명한다.

[Answer]: A) preprocessor가 관리하는 output namespace(`posts/`, `meta/`, `homepage/`, discovery JSON, 복사된 assets)를 매 실행 시작에 전부 비우고 재생성한다. `GeneratedOutputManifest`는 이번 실행이 생성한 inventory를 기록한다. 결과는 항상 현재 입력만의 함수다.

### Question 8 — write ordering과 atomicity

output 쓰기 실패가 부분 산출물을 성공으로 보이게 하지 않아야 합니다. 어느 수준의 쓰기 보장을 채택할까요?

A) 모든 검증(publication 진단 포함)을 어떤 write보다 앞서 완료하고, write 단계 실패는 명확한 오류로 종료한다. 부분 산출물이 disk에 남을 수 있으나 실패한 실행은 성공을 보고하지 않으며, 다음 실행의 전체 재생성이 이를 덮는다. 별도 staging은 두지 않는다. **(권장)**

B) 전체 output을 temp staging directory에 먼저 쓰고 성공 시에만 최종 위치로 원자적으로 교체한다. 실패 시 기존 output이 그대로 남는다.

C) 파일별 temp 파일 + rename으로 개별 파일 원자성만 보장한다.

X) Other (please describe after [Answer]: tag below) — 검증·쓰기 순서와 실패 시 disk 상태 규칙을 설명한다.

[Answer]: A) 모든 검증(publication 진단 포함)을 어떤 write보다 앞서 완료하고, write 단계 실패는 명확한 오류로 종료한다. 부분 산출물이 disk에 남을 수 있으나 실패한 실행은 성공을 보고하지 않으며, 다음 실행의 전체 재생성이 이를 덮는다. 별도 staging은 두지 않는다.

### Question 9 — homepage wikilink fragment/alias truth table

일반 note가 homepage source를 참조할 때 alias와 fragment 의미를 어디까지 보존할까요?

A) full parity: `[[Passion Project]]` → `/`, `[[Passion Project|표시명]]`은 alias 보존, `#heading`과 `#^block` fragment는 기존 normal post와 같은 anchor 생성 규칙으로 `/#...`에 연결한다. 존재하지 않는 heading/block은 기존 pipeline의 미해결 fragment 처리와 동일하게 다룬다. **(권장)**

B) bare link와 alias, heading fragment까지만 지원하고 homepage 대상 block fragment(`#^block`)는 authoring error로 거부한다.

C) 모든 fragment를 버리고 homepage wikilink는 항상 bare `/`로 정규화한다. alias는 보존한다.

X) Other (please describe after [Answer]: tag below) — variant별 결과와 미해결 fragment 처리를 설명한다.

[Answer]: A) full parity: `[[Passion Project]]` → `/`, `[[Passion Project|표시명]]`은 alias 보존, `#heading`과 `#^block` fragment는 기존 normal post와 같은 anchor 생성 규칙으로 `/#...`에 연결한다. 존재하지 않는 heading/block은 기존 pipeline의 미해결 fragment 처리와 동일하게 다룬다.

### Question 10 — profile slot 표기

`Passion Project.md` 안에서 정확히 하나여야 하는 profile slot을 어떤 표기로 선언할까요?

A) 단독 줄의 HTML comment token(예: `<!-- profile:slot -->`)을 쓴다. Obsidian reading view와 rendered page 어디에도 보이지 않고, code fence 안의 동일 문자열은 token으로 세지 않으며, 조합 후 결과 HTML에 token이 남지 않는다. **(권장)**

B) Obsidian comment 문법의 단독 줄 token(예: `%%profile-slot%%`)을 쓴다. Obsidian에서는 보이지 않지만 다른 Markdown 도구에서는 literal text로 노출될 수 있다.

C) 보이는 구조를 쓴다: 약속된 heading(예: `## 프로필`) section을 slot으로 인식해 치환한다. authored 문서에서 slot 위치가 눈에 보인다.

X) Other (please describe after [Answer]: tag below) — token 문법, fence 처리와 치환 후 잔존물 규칙을 설명한다.

[Answer]: A) 단독 줄의 HTML comment token(예: `<!-- profile:slot -->`)을 쓴다. Obsidian reading view와 rendered page 어디에도 보이지 않고, code fence 안의 동일 문자열은 token으로 세지 않으며, 조합 후 결과 HTML에 token이 남지 않는다.

### Question 11 — 오늘 발행 글 section과 조합 규칙

현재 `/`는 rendered HTML을 `이번주에 작성된 포스트` heading으로 잘라 오늘 발행 글을 삽입합니다. profile slot 조합과 이 기존 동작을 어떻게 함께 정의할까요?

A) 기존 heading 기반 치환 규칙을 관찰 가능한 동작 그대로 보존하고, profile slot 치환은 그와 독립적인 별도 규칙으로 둔다. 문서 순서는 authored 순서를 따르고 두 치환은 서로의 결과에 간섭하지 않는다. Vault diff는 profile slot 추가와 임시 Notion block 제거로 최소화된다. **(권장)**

B) 승인된 단일 Vault 편집에서 오늘 발행 글 위치도 명시적 token으로 전환해 heading regex 의존을 제거한다. 두 slot 모두 같은 typed composition 규칙을 따르고, token 부재·중복 규칙도 profile slot과 대칭으로 정의한다.

C) 오늘 발행 글 section을 authored 문서에서 분리해 조합 규칙(예: 항상 profile slot 다음)으로 위치를 고정한다. Vault 문서는 해당 heading을 더 이상 갖지 않는다.

X) Other (please describe after [Answer]: tag below) — 두 치환의 인식 규칙, 순서와 실패 의미를 설명한다.

[Answer]: A) 기존 heading 기반 치환 규칙을 관찰 가능한 동작 그대로 보존하고, profile slot 치환은 그와 독립적인 별도 규칙으로 둔다. 문서 순서는 authored 순서를 따르고 두 치환은 서로의 결과에 간섭하지 않는다. Vault diff는 profile slot 추가와 임시 Notion block 제거로 최소화된다.


### Question 12 — Astro gateway 호환 전략

`data.ts`의 기존 getter들을 어떻게 이행할까요?

A) 기존 getter 이름과 서명을 유지한다. homepage가 normal output에서 사라지므로 기존 getter는 자연스럽게 post-only가 된다. 새 `getHomepage()`를 추가하고 `index.astro`를 그것으로 이전하며, homepage getter는 artifact 누락·malformed를 빈 값으로 숨기지 않고 명확한 build 진단으로 실패한다. normal post getter의 기존 동작(누락 시 빈 값)은 U2에서 바꾸지 않는다. **(권장)**

B) `HomepageDataGateway`/`PostDataGateway` 모듈로 재구성하고 기존 getter는 새 gateway를 위임 호출하는 호환 wrapper로 유지한다. consumer 이전은 점진적으로 한다.

C) B의 재구성을 하되 기존 getter를 제거하고 모든 consumer(page, RSS, tag, hub, 404, search 관련)를 U2 안에서 일괄 이전한다.

X) Other (please describe after [Answer]: tag below) — getter 유지/신설 범위와 오류 표면화 규칙을 설명한다.

[Answer]: A) 기존 getter 이름과 서명을 유지한다. homepage가 normal output에서 사라지므로 기존 getter는 자연스럽게 post-only가 된다. 새 `getHomepage()`를 추가하고 `index.astro`를 그것으로 이전하며, homepage getter는 artifact 누락·malformed를 빈 값으로 숨기지 않고 명확한 build 진단으로 실패한다. normal post getter의 기존 동작(누락 시 빈 값)은 U2에서 바꾸지 않는다.

## 6. Answer Validation Result

- **제출 시각**: 2026-07-28 (사용자 응답 "작성 완료")
- **답변**: A/A/A/A/A/A/A/A/A/A/A/A (12/12)
- **형식 검증**: 통과. 모든 답변이 해당 질문의 A 선택지 본문과 정확히 일치한다. Q9의 답변 줄 끝 공백 하나와 Q11 답변에 복사된 `**(권장)**` 표기는 의미가 유일해 U1 Q3 선례에 따라 기계적으로 정규화했다.
- **명확성 검증**: 통과. 조건부, 혼합 선택, 미정 표현 또는 `X` 설명이 없다.
- **상호 일관성 검증**: 통과. 무조건 활성인 exactly-one 강제(Q1)와 엄격한 scalar 파싱(Q2)이 write 전 일괄 진단(Q3)으로 이어지고, builder 전용 catalog(Q4)가 dedicated `content/homepage/` artifact(Q5)와 site 쪽 rendering 재사용(Q6)에 연결된다. 매 실행 전체 재생성(Q7)이 staging 없는 validate-before-write(Q8)의 부분 산출물 잔존을 다음 실행에서 덮는 전제를 제공한다. full-parity fragment(Q9), HTML comment slot token(Q10), 독립적 heading 치환 보존(Q11), 호환 getter + fail-closed `getHomepage()`(Q12)가 하나의 data flow로 연결되며 상충이 없다.
- **기존 승인 호환성**: 통과. exactly-one·discovery 제외·transclusion 거부·`/` 정규화·slot cardinality·Vault write 범위·no-JS·no-push/no-deploy 경계를 어느 답변도 변경하지 않는다.
- **Clarification Status**: Not required.

| Question | Answer | Confirmed Functional Decision |
|---|---|---|
| Q1 | A | exactly-one 강제 상시 활성; missing/duplicate 별도 진단 코드; fixture가 전환기 증거, 실제 Vault 증거는 편집 후 |
| Q2 | A | exact lowercase scalar `homepage`/`post`만 인식; key 부재 → `post`; 그 외 → path·값 포함 오류 |
| Q3 | A | publication 이슈 전체 수집, `{code, path, detail}` path·code 정렬, write 전 일괄 실패, stable code vocabulary |
| Q4 | A | builder 전용 `PublicationCatalog`; `HomepageSource`/`DiscoverablePosts` 분리 projection; `LinkableSources` 합성 view |
| Q5 | A | `content/homepage/index.md` + `content/homepage/meta.json`; 결정적 최소 meta, timestamp 금지 |
| Q6 | A | artifact body는 transform 완료 Markdown; HTML rendering은 기존 site unified pipeline 재사용 |
| Q7 | A | 관리 namespace 매 실행 전체 재생성; `GeneratedOutputManifest`가 생성 inventory 기록 |
| Q8 | A | 모든 검증 후 write; staging 없음; 실패 실행은 성공 미보고, 다음 실행이 덮음 |
| Q9 | A | full parity: alias 보존, heading/block fragment를 기존 anchor 규칙으로 `/#...` 연결 |
| Q10 | A | 단독 줄 HTML comment token; fence 내 미인식; 조합 결과에 token 잔존 금지 |
| Q11 | A | 기존 heading 기반 오늘 발행 글 치환 보존; slot 치환과 상호 독립 |
| Q12 | A | 기존 getter 유지(자연 post-only) + fail-closed `getHomepage()` 신설; `index.astro` 이전 |

## 7. 답변 검증과 생성 경계

- 모든 답변은 문자 선택과 설명의 일치, 단일 의미, 상호 일관성 및 기존 승인 호환성을 검증한다.
- `X` 답변은 구현 도구가 아니라 business/domain contract를 충분히 설명해야 한다.
- Q1~Q12가 모두 명확해진 뒤에만 네 개의 Functional Design artifact를 생성한다.
- 최종 artifact에는 component별 Testable Properties 또는 구체적인 N/A 근거가 있어야 한다. 누락되면 PBT-01 blocking finding이므로 완료 gate를 제시하지 않는다.
- Functional Design 승인 전에는 U2 NFR Requirements로 진행하지 않는다.
- 이 계획 작성은 application source, external Vault, generated output, Terraform, AWS와 deployment를 변경하지 않는다.

## 8. Artifact Validation Result

- **검증 완료 시각**: 2026-07-28
- **필수 artifact**: 4/4 생성 — `domain-entities.md`, `business-rules.md`, `business-logic-model.md`, `frontend-components.md` (모두 `aidlc-docs/construction/homepage-publication-boundary/functional-design/`).
- **설계 내용**: 승인된 A×12 결정을 반영해 46개 business rule(BR-U2-001~046), 12-surface discovery 제외 matrix(404 최근 글 포함), 10-variant reference truth table, PUB001~PUB007·HP001~HP004 진단 vocabulary, 단계별 일괄 진단 계약, dedicated artifact/slot contract와 gateway 계약을 고정했다.
- **PBT-01**: Compliant. C06~C10에 17개 stage-level property(FD-P-*)를 category·generator domain·oracle과 함께 문서화하고, S02/S03에는 구체적 소유 근거가 있는 `No independent PBT properties identified`를 기록했다. determinism(FD-P-C07-05)은 idempotence로 분류하지 않았고 FD-P-C09-04만 상태 idempotence다. DE-P-U2-01~04와 FE-P-U2-01~06 정밀화가 모두 존재하는 FD-P ID를 참조한다.
- **독립 검토**: 1회 독립 검토가 BLOCKING 0, MATERIAL 3(단계별 진단 집계 불일치, 404 surface 누락, PUB002/003 path 규약 미정), MINOR 8을 보고했고 11건 전부 수정 반영 후 재확인했다. 검토는 upstream 승인 문서와 현재 코드(getter 이름, output layout, index.astro, scanner)에 대한 사실 검증을 포함하며 코드 대조는 PASS였다.
- **구조 검증**: 4개 artifact의 code fence balance, BR-U2 ID 46개 중복 없음, FD-P ID 17개 중복 없음, 상대 링크 해석 가능성을 확인했다.
- **기록된 FD 신규 결정**: BR-U2-043(`/` `<title>`을 meta.title로 이동; 현재 값과 동일)은 Q 선택이 아닌 S03 metadata 책임 기반의 신규 결정으로 명시했다. Vault write gate는 U2 authored diff만 규율하며 scanner의 기존 `published` 자동 기록과 충돌하지 않음을 기록했다.
- **Fact/Mutation Boundary**: application source, external Vault, generated output, Git ref(remote), Terraform/AWS resource와 deployment는 변경하지 않았다.
- **Artifact Gate**: 제시됨 — 명시적 승인 대기.
