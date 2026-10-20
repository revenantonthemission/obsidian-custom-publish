# U2 Business Rules — Homepage Publication Boundary

## 문서 상태

- **단계**: CONSTRUCTION — U2 Functional Design
- **Unit**: U2 Homepage Publication Boundary
- **작성일**: 2026-07-28
- **결정 근거**: [Functional Design Plan](../../plans/homepage-publication-boundary-functional-design-plan.md) Q1~Q12 (모두 A)

규칙 ID는 `BR-U2-###`로 안정적이며 Code Generation과 test가 이 ID로 추적한다.

## 1. Scope 정규화와 Cardinality

| ID | 규칙 | 근거 |
|---|---|---|
| BR-U2-001 | frontmatter `visibility` key 부재는 `Post` scope다. 기존 Vault의 모든 note는 편집 없이 현재 의미를 유지한다 | Q2; FR-009.5 |
| BR-U2-002 | `visibility`가 존재하면 exact lowercase YAML scalar `homepage` 또는 `post`만 인식한다 | Q2 |
| BR-U2-003 | 그 외 모든 값·타입은 `PUB001`로 거부하고 detail에 원문 값을 포함한다. silent default fallback은 없다 | Q2; S02 failure boundary |
| BR-U2-004 | scope 인식은 Vault 원본을 변경하지 않는다. scanner의 기존 frontmatter 자동 삽입 동작에 `visibility`를 추가하지 않는다 | Q2; FR-008.3~4 |
| BR-U2-005 | exactly-one homepage 검증은 조건·flag·escape hatch 없이 모든 build에서 활성이다 | Q1 |
| BR-U2-006 | homepage source 0개는 `PUB002`, 2개 이상은 `PUB003`으로 구분한다. `PUB003`의 detail은 발견된 모든 source path를 나열한다 | Q1 |
| BR-U2-007 | U2 Construction 동안 실행 증거는 fixture vault가 제공한다. 실제 Vault 대상 preprocess는 승인된 `Passion Project.md` 편집 적용 이후의 실행만 U2 검증 증거로 인정한다 | Q1 |
| BR-U2-008 | 편집 전 실제 Vault 실행의 `PUB002` 실패는 결함이 아니라 전환 미완료 신호로 해석한다. 이를 이유로 강제를 약화하지 않는다 | Q1 |

## 2. Partition과 Discovery 제외

| ID | 규칙 | 근거 |
|---|---|---|
| BR-U2-009 | homepage source는 아래 §2.1 surface matrix의 모든 일반 discovery surface에서 제외된다 | FR-009; ST-U06 AC-U06-02 |
| BR-U2-010 | post-scoped source의 route, 순서, content와 discoverability는 U2 이전과 동일하다 | ST-U06 AC-U06-03 |
| BR-U2-011 | homepage body를 만드는 projection은 정확히 하나(`HomepageSource` → `HomepageArtifact`)다 | S02 strict invariant |
| BR-U2-012 | homepage outbound link는 homepage 렌더링에 사용할 수 있으나 graph node/edge, backlink, forward-link, related score 입력에 기여하지 않는다 | C07/C08 승인 |

### 2.1 Discovery Surface Matrix

| Surface | homepage 포함 여부 | 비고 |
|---|---|---|
| `/posts/{slug}` route 생성 | 제외 | `/posts/passion-project` 부재 = 404 |
| 일반 글 목록·오늘 발행 글 | 제외 | 오늘 발행 글은 post-only metadata에서만 계산 |
| 404 최근 글 목록 | 제외 | `404.astro`의 recent posts도 post-only metadata에서만 계산 |
| tag 목록·hub 파생 | 제외 | |
| knowledge search index | 제외 | |
| RSS | 제외 | |
| sitemap post entry | 제외 | `/` 자체와 `/resume`·`/portfolio`는 정상 포함 |
| nav tree | 제외 | |
| previews | 제외 | |
| graph node/edge | 제외 | homepage와 incident한 edge 전체 |
| related posts | 제외 | |
| backlink/forward-link metadata | 제외 | 일반 post의 forward-link 목록에도 homepage entity를 넣지 않는다 |

## 3. Reference Truth Table (C08)

| ID | Authored reference | 결과 | 근거 |
|---|---|---|---|
| BR-U2-013 | `[[Passion Project]]` | `/` anchor, 표시 텍스트는 기존 규칙(title) | Q9 |
| BR-U2-014 | `[[Passion Project\|표시명]]` | `/` anchor, alias 표시 텍스트 보존 | Q9 |
| BR-U2-015 | `[[Passion Project#Heading]]` | `/#{기존 heading anchor 규칙}` — normal post와 같은 anchor 파생 | Q9 |
| BR-U2-016 | `[[Passion Project#^block]]` | `/#{기존 block anchor 규칙}` | Q9 |
| BR-U2-017 | 존재하지 않는 heading/block fragment | 기존 pipeline의 미해결 fragment 처리와 동일 | Q9 |
| BR-U2-018 | `![[Passion Project]]` (full) | `PUB004` authoring error | 승인 결정 |
| BR-U2-019 | `![[Passion Project#Heading]]` | `PUB005` authoring error | 승인 결정 |
| BR-U2-020 | `![[Passion Project#^block]]` | `PUB006` authoring error | 승인 결정 |
| BR-U2-021 | homepage를 대상으로 하지 않는 모든 reference | U2 이전과 결과 동일 | Q9 |
| BR-U2-022 | code fence 내부 문자열 | 어떤 reference 해석·치환도 하지 않는다 (기존 fence 보호 재사용) | 기존 규칙 |

- BR-U2-018~020의 detail은 variant(full/heading/block)와 source path를 식별한다.
- transclusion 거부도 §4의 일괄 진단 집계에 포함된다. 첫 발견에서 중단하지 않는다.

## 4. 진단 계약과 Output Lifecycle

| ID | 규칙 | 근거 |
|---|---|---|
| BR-U2-023 | publication boundary 이슈는 단계별 일괄 수집한다: scope·cardinality 이슈(PUB001~PUB003)를 전부 수집해 실패하고, catalog가 성공한 경우에만 reference/transclusion 이슈(PUB004~PUB006)를 전부 수집해 실패한다. 각 보고는 `path` 오름차순, 동일 path 내 `code` 오름차순으로 정렬한다. catalog 단계가 실패하면 reference 검사는 실행되지 않는다 | Q3 |
| BR-U2-024 | 진단 보고와 실패는 어떤 output write보다 앞선다. 검증 실패는 이전 실행의 output을 변경하지 않는다 | Q3, Q8 |
| BR-U2-025 | publication 밖 기존 pipeline 오류 경로(I/O, slug 중복 등)는 현재 동작을 유지한다 | Q3 |
| BR-U2-026 | write 단계는 관리 namespace(`posts/`, `meta/`, `homepage/`, discovery JSON, `manifest.json`, 복사된 assets) 전체를 비운 뒤 재생성한다. 결과는 항상 현재 입력만의 함수다 | Q7 |
| BR-U2-027 | `GeneratedOutputManifest`는 이번 실행이 쓴 모든 파일의 정렬된 상대 경로를 기록한다 | Q7 |
| BR-U2-028 | write 실패는 `PUB007`과 비-zero 종료로 보고한다. 부분 산출물이 남을 수 있으나 성공으로 표시되지 않으며 다음 실행의 전체 재생성이 덮는다. 별도 staging은 두지 않는다 | Q8 |
| BR-U2-029 | 외부 Vault를 읽을 수 없으면 저장소 파일이나 stale output으로 우회하지 않고 명시적 blocker로 실패한다 | EDGE-012; ST-U06 AC-U06-04 |

## 5. 진단 Vocabulary

Rust preprocessor (`{code, path, detail}`):

| Code | 의미 | Detail 필수 내용 |
|---|---|---|
| PUB001 | unknown `visibility` 값 또는 타입 | 원문 값/타입 표현 |
| PUB002 | homepage source 부재 (전환 미완료 신호 포함) | 검사한 source 수 |
| PUB003 | homepage source 중복 | 발견된 모든 source path |
| PUB004 | homepage 대상 full transclusion | 참조 원문 |
| PUB005 | homepage 대상 heading transclusion | 참조 원문과 fragment |
| PUB006 | homepage 대상 block transclusion | 참조 원문과 block ID |
| PUB007 | output write 실패 | 대상 경로와 OS 오류 |

`path` 규약: PUB002는 특정 source가 없으므로 빈 path를 사용하며 정렬에서 가장 앞에 온다. PUB003의 `path`는 중복 source path 중 사전순 첫 번째이고 detail이 전체 목록을 나열한다. PUB007의 `path`는 쓰기 실패한 output 경로다.

Site build (Astro/TypeScript, build 실패 진단):

| Code | 의미 | 발생 지점 |
|---|---|---|
| HP001 | homepage artifact 파일 누락 | C10 `getHomepage()` |
| HP002 | homepage artifact malformed (meta parse 실패, 빈 `title`, 빈 body) | C10 `getHomepage()` |
| HP003 | profile slot 0개 (path와 count 포함) | C06 compose |
| HP004 | profile slot 2개 이상 (path와 count 포함) | C06 compose |

- 이 vocabulary 밖의 코드는 사용할 수 없다. 코드 추가는 이 문서의 개정이다.

## 6. Homepage Artifact와 Gateway

| ID | 규칙 | 근거 |
|---|---|---|
| BR-U2-030 | dedicated artifact는 `content/homepage/index.md` + `content/homepage/meta.json`이며, homepage는 `posts/`·`meta/`에 어떤 형태로도 기록되지 않는다 | Q5 |
| BR-U2-031 | artifact body는 normal post와 같은 transform 규칙을 통과한 Markdown이고, HTML rendering은 site unified pipeline이 담당한다 | Q6 |
| BR-U2-032 | meta는 결정적 최소값(`title`: 비어 있지 않은 NFC string)만 담고 timestamp 등 비결정 값을 포함하지 않는다 | Q5 |
| BR-U2-033 | `getHomepage()`는 artifact 누락·malformed를 빈 값으로 숨기지 않고 `HP001`/`HP002`로 build를 실패시킨다 | Q12 |
| BR-U2-034 | 기존 normal post getter의 이름, 서명과 동작(누락 시 빈 값 포함)은 U2에서 변경하지 않는다. homepage가 output에서 사라짐으로써 자연스럽게 post-only가 된다 | Q12 |
| BR-U2-035 | `index.astro`는 `getHomepage()`로 이전하고 `getPostContent("passion-project")` 같은 normal-post 우회는 금지된다 | Q12; S03 |

## 7. Slot Composition과 오늘 발행 글

| ID | 규칙 | 근거 |
|---|---|---|
| BR-U2-036 | profile slot token은 단독 줄의 `<!-- profile:slot -->` literal이며 앞뒤 공백만 허용한다 | Q10 |
| BR-U2-037 | code fence 내부의 동일 문자열은 token으로 세지 않는다 | Q10 |
| BR-U2-038 | 인식된 token이 0개면 `HP003`, 2개 이상이면 `HP004`로 build를 실패시킨다. silent fallback은 없다 | C06 승인; Q10 |
| BR-U2-039 | 치환 내용은 U1 canonical homepage profile fragment(짧은 소개 + `/resume`·`/portfolio` CTA)뿐이며, server-rendered이고 새 client JavaScript를 요구하지 않는다. profile 사실을 Vault Markdown에 복제하지 않는다 | FR-008, FR-013 |
| BR-U2-040 | 조합 결과 HTML에 token이 잔존하지 않고, slot 바깥의 authored content는 치환 범위 밖에서 보존된다 | Q10 |
| BR-U2-041 | 오늘 발행 글 치환은 기존 규칙을 관찰 가능한 동작 그대로 보존한다: rendered HTML을 `이번주에 작성된 포스트` h2에서 잘라 post-only metadata로 계산한 오늘 발행 글 section으로 대체한다 | Q11 |
| BR-U2-042 | slot 치환과 오늘 발행 글 치환은 상호 독립이며 서로의 결과에 간섭하지 않는다. 문서 순서는 authored 순서를 따른다 | Q11 |
| BR-U2-043 | `/`의 `<title>`은 artifact meta의 `title`을 사용한다 (기존 hardcoded 값의 원천을 authored source로 이동; 현재 title은 파일명 파생이라 값은 동일) | S03 metadata 책임·C04 host 계약에 따른 FD 신규 결정 |

## 8. External Vault Write Gate

| ID | 규칙 | 근거 |
|---|---|---|
| BR-U2-044 | Vault 편집은 U2 consuming behavior와 fixture가 먼저 존재한 뒤에만 수행한다 | S03 write gate |
| BR-U2-045 | 편집 대상은 `Areas/Notes/Passion Project.md` 하나이며 내용은 `visibility: homepage` 추가, profile slot token 추가, 임시 Portfolio/Notion block 제거로 제한된다 | FR-008.3~4 |
| BR-U2-046 | 편집의 정확한 diff를 검토 기록으로 남기고, 외부 repository의 commit/push는 별도 승인 없이 수행하지 않는다 | S03 write gate |

이 gate는 U2가 author하는 편집 diff만 규율한다. scanner의 기존 `published` frontmatter 자동 기록 동작(BR-U2-004가 보존)은 변경되지 않으며, homepage source에 기록되는 `published`는 discovery에 무의미하므로 gate 위반이 아니다.

## 9. Traceability

| 구간 | FR / Story / Edge |
|---|---|
| BR-U2-001~008 | FR-009.5; ST-U06 AC-U06-01; EDGE-007 |
| BR-U2-009~012 | FR-009.2~4; ST-U06 AC-U06-02~03; EDGE-007 |
| BR-U2-013~022 | FR-009; ST-U06; 승인된 reference/transclusion 결정 |
| BR-U2-023~029 | FR-014.2, FR-017; EDGE-007, EDGE-012 |
| BR-U2-030~035 | FR-009.5, FR-017; ST-U06 AC-U06-04 |
| BR-U2-036~043 | FR-008, FR-012, FR-013; ST-U01 AC-U01-01~04 |
| BR-U2-044~046 | FR-008.3~4; ST-U06 constraint checklist |
