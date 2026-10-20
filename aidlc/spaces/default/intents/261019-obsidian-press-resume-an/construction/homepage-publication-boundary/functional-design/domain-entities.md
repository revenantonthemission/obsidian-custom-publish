# U2 Domain Entities — Homepage Publication Boundary

## 문서 상태

- **단계**: CONSTRUCTION — U2 Functional Design
- **Unit**: U2 Homepage Publication Boundary
- **작성일**: 2026-07-28
- **결정 근거**: [Functional Design Plan](../../plans/homepage-publication-boundary-functional-design-plan.md) Q1~Q12 (모두 A)

이 문서는 U2의 canonical entity, value object, 관계와 lifecycle을 확정한다. 구현 언어 표기는 계약을 명확히 하기 위한 것이며 정확한 Rust/TypeScript 문법은 Code Generation이 소유한다.

## 1. Value Objects

### 1.1 PublicationScope (Rust, C07)

| Variant | 의미 | 인식 규칙 (Q2) |
|---|---|---|
| `Post` | 일반 discoverable 게시물 | frontmatter `visibility` key 부재, 또는 exact lowercase scalar `post` |
| `Homepage` | 홈페이지 전용 원본 | exact lowercase scalar `homepage` |

- 인식은 YAML scalar string에만 적용한다. 그 외 모든 값과 타입(대소문자 변형, 앞뒤 공백 포함, list, boolean, number 등)은 `PUB001`로 거부한다.
- 인식 과정은 원본 값을 변경하지 않는다. 자동 교정, trim 정규화, 유사값 수용은 없다.
- default 적용(`Post`)은 key 부재에만 해당한다. key가 존재하면 반드시 두 canonical 값 중 하나여야 한다.

### 1.2 PublicationDiagnostic (Rust, C07~C09 공유)

```
PublicationDiagnostic { code: 고정 vocabulary, path: Vault-relative source path, detail: 사람이 읽는 맥락 }
```

- `code`는 [business-rules.md](business-rules.md) §5의 stable vocabulary에 등록된 값만 허용한다.
- 집계 순서는 `path` 오름차순, 같은 path 안에서 `code` 오름차순으로 결정적이다 (Q3).
- `detail`은 실제 발견 값(예: unknown visibility의 원문 값, duplicate의 상대 경로 목록, transclusion variant)을 포함해야 한다.
- path 규약 (BR-U2 §5): PUB002는 특정 source가 없으므로 빈 path(정렬 최상단)를 쓰고, PUB003의 `path`는 중복 path 중 사전순 첫 번째이며 detail이 전체 목록을 나열한다.
- 집계는 단계별이다 (BR-U2-023): catalog 단계는 PUB001~PUB003을 전부 수집해 실패하고, catalog 성공 시에만 reference 단계가 PUB004~PUB006을 전부 수집한다.

### 1.3 ProfileSlotToken (문법 상수, C06)

- 정확한 literal: `<!-- profile:slot -->`
- 단독 줄이어야 하며 앞뒤 공백만 허용한다 (Q10).
- code fence 내부의 동일 문자열은 token으로 세지 않는다.
- 조합 결과 HTML에는 token이 잔존하지 않는다.

## 2. Entities and Projections

### 2.1 HomepageSource (Rust, C07)

정확히 하나여야 하는 homepage 원본의 typed projection.

| Field | 필수 | 의미 |
|---|---|---|
| `title` | 필수 | scanner가 파생한 note title (현재 규칙 유지: 파일명 기반) |
| `path` | 필수 | Vault-relative source path (진단용) |
| `body` | 필수 | frontmatter를 제외한 원문 body |
| `headings` / `blocks` | 필수 | 기존 scanner가 수집하는 heading/block anchor map (fragment 해석용, Q9) |

- homepage source는 slug 기반 route identity를 갖지 않는다. `/posts/{slug}` 세계에 존재하지 않는 것이 이 entity의 본질이다.

### 2.2 DiscoverablePosts (Rust, C07)

`PublicationScope::Post`인 모든 source의 ordered immutable collection.

- 기존 scan 결과의 순서, content와 필드를 보존한다 (기존 `Post` 표현 재사용).
- route, 목록, tag, hub, 오늘 발행 글, search, RSS, sitemap post entry, nav tree, previews, graph, related, backlink/forward-link 파생의 유일한 입력이다.

### 2.3 LinkableSources (Rust, C07 → C08)

reference resolution 전용 read-only 합성 view (Q4).

- homepage와 discoverable posts를 모두 조회할 수 있다 — 일반 note가 homepage를 wikilink로 참조할 수 있어야 하기 때문이다.
- 이 view는 링크 target 해석에만 쓰이고 discovery derivation에는 절대 전달되지 않는다.

### 2.4 PublicationCatalog (Rust, C07)

```
PublicationCatalog { homepage: HomepageSource, posts: DiscoverablePosts, linkable: LinkableSources }
```

- **생성 경로는 builder 하나뿐이다** (parse, don't validate — Q4). builder는 scanned index를 입력받아 scope 파싱과 cardinality 검증을 수행하고, 발견된 모든 `PublicationDiagnostic`을 집계해 실패하거나 완전한 catalog를 반환한다.
- 검증을 통과한 catalog가 존재한다는 것 자체가 "homepage 정확히 하나, unknown visibility 없음"의 증명이다. downstream은 재검증하지 않는다.
- catalog와 그 projection은 immutable이다. downstream은 읽기만 한다.

### 2.5 HomepageArtifact (generated contract, C09 → C10)

| 파일 | 내용 |
|---|---|
| `content/homepage/index.md` | transform 완료 Markdown body (Q5, Q6) |
| `content/homepage/meta.json` | `{ "title": string }` — 비어 있지 않은 NFC 문자열 |

- meta는 rendering에 필요한 결정적 최소값만 담는다. timestamp, 실행 환경, 절대 경로 같은 비결정 값은 금지한다 (Q5).
- body는 normal post와 같은 transform 규칙(wikilink 해석, fence 보호, image embed 등)을 통과한 Markdown이며, HTML rendering은 site unified pipeline이 담당한다 (Q6).
- `content/posts/`와 `content/meta/`에는 homepage가 어떤 형태로도 존재하지 않는다.

### 2.6 GeneratedOutputManifest (Rust, C09)

- 이번 실행이 생성한 모든 output 파일의 content-root-relative 경로 목록, 오름차순 정렬 (Q7).
- manifest 자체도 output namespace 안에 기록한다 (`content/manifest.json`; manifest 파일 자신은 목록에 포함하지 않는다).
- manifest는 검증·테스트 oracle이며 authored source가 아니다.

### 2.7 HomepageData (TypeScript, C10)

```
HomepageData { title: string, body: string }
```

- `getHomepage()`가 artifact 두 파일을 읽고 검증해 반환한다.
- 누락·malformed는 빈 값으로 대체하지 않고 `HP001`/`HP002` build 진단으로 실패한다 (Q12). 기존 normal post getter의 관대한 동작은 U2에서 바꾸지 않는다.

### 2.8 ComposedHomepage (Astro, C06/S03)

- 입력: `HomepageData.body`의 rendered HTML, U1 canonical homepage profile fragment, post-only metadata에서 계산한 오늘 발행 글.
- slot 치환과 오늘 발행 글 heading 치환은 상호 독립적인 두 규칙이다 (Q11). 문서 순서는 authored 순서를 따른다.
- profile 사실은 U1 projection에서만 오고 Vault Markdown에 복제되지 않는다.

## 3. Lifecycle

```
Vault scan (기존 scanner + visibility 파싱)
  → PublicationCatalogBuilder: scope 정규화 + exactly-one 검증 + 진단 집계   [실패 시 여기서 종료, write 없음]
  → C08 transform: LinkableSources 기반 링크/transclusion 해석 + 진단 집계   [실패 시 여기서 종료, write 없음]
  → C09 materialize: 관리 namespace 전체 정리 → post-only output + homepage artifact + discovery output + manifest 기록
  → C10 gateway: artifact 읽기 (fail-closed)
  → C06/S03 compose: slot 치환 + 오늘 발행 글 치환 → 정적 `/`
```

- 검증(catalog + transform 진단)은 어떤 write보다 앞선다 (Q8). 검증 실패는 이전 실행의 output을 건드리지 않는다.
- write 단계 실패는 부분 산출물을 남길 수 있으나 실행은 성공을 보고하지 않으며, 다음 실행의 전체 재생성이 이를 덮는다 (Q7·Q8).

## 4. Domain-Level Property Refinements

Stage-level property 정의는 [business-logic-model.md](business-logic-model.md) §4가 소유한다. 아래는 entity 계약이 property에 추가로 요구하는 정밀화다.

| ID | Refinement | 대상 |
|---|---|---|
| DE-P-U2-01 | catalog builder의 성공 결과에서 `posts`와 `homepage`는 서로소이고 합집합이 전체 scanned source와 일치한다 | FD-P-C07-01 |
| DE-P-U2-02 | 진단 집계는 입력 순서와 무관하게 같은 입력 집합에서 같은 정렬 결과를 낸다 | FD-P-C07-05 |
| DE-P-U2-03 | `HomepageArtifact` meta의 모든 값은 같은 catalog에서 재실행해도 byte 동일하다 (비결정 필드 부재의 검증) | FD-P-C09-04 |
| DE-P-U2-04 | fence 내부 slot token 문자열은 어느 단계에서도 token으로 인식되지 않는다 | FD-P-C06-02, FD-P-C08-04 |

## 5. Traceability

| 요소 | 근거 |
|---|---|
| PublicationScope, PublicationCatalog, HomepageSource, DiscoverablePosts, LinkableSources | C07; FR-009; ST-U06 AC-U06-01~03; Q1, Q2, Q4 |
| PublicationDiagnostic | C07~C09; EDGE-007, EDGE-012; Q3 |
| HomepageArtifact, GeneratedOutputManifest | C09; FR-009.5, FR-017; Q5, Q6, Q7 |
| HomepageData, getHomepage | C10; ST-U06 AC-U06-04; Q12 |
| ProfileSlotToken, ComposedHomepage | C06, S03; FR-008; ST-U01 AC-U01-01~02; Q10, Q11 |
