# U2 Business Logic Model — Homepage Publication Boundary

## 문서 상태

- **단계**: CONSTRUCTION — U2 Functional Design
- **Unit**: U2 Homepage Publication Boundary
- **작성일**: 2026-07-28
- **결정 근거**: [Functional Design Plan](../../plans/homepage-publication-boundary-functional-design-plan.md) Q1~Q12 (모두 A)

## 1. Fail-Closed Data Flow

두 단계의 검증 경계가 모든 write와 compose에 앞선다.

```
[Rust preprocessor]
  scan → scope 파싱(Q2) → 1차 진단 집계: PUB001~PUB003 전부, path·code 정렬
                            실패 ── 종료 (이전 output 불변; reference 검사 미실행)
                            성공 ↓  (catalog 확정)
  reference/transclusion 해석 → 2차 진단 집계: PUB004~PUB006 전부, path·code 정렬
                            실패 ── 종료 (이전 output 불변)
                            성공 ↓
  관리 namespace 전체 정리(Q7) → post-only output + homepage artifact + discovery output + manifest
                            write 실패 ── PUB007, 비-zero 종료 (부분 산출물은 성공으로 표시되지 않음)
[Astro build]
  getHomepage() fail-closed(HP001/HP002) → slot 검증(HP003/HP004) → 치환 + 오늘 발행 글 → 정적 `/`
                            실패 ── Astro build 실패
```

핵심 성질:

- **검증-쓰기 분리** (Q8): publication 진단이 하나라도 있으면 clean도 write도 시작하지 않는다. 실패한 검증은 이전 실행의 output을 보존한다.
- **전체 재생성** (Q7): write 단계가 시작되면 관리 namespace는 현재 catalog만의 함수가 된다. stale `/posts/passion-project` 잔존은 구조적으로 불가능하다.
- **단일 검증 지점** (Q4): catalog가 존재하면 exactly-one과 scope 유효성은 이미 증명된 것이다. downstream 재검증 없음.
- **fail-closed 소비** (Q12): site 쪽에서 homepage 데이터의 어떤 누락·손상도 빈 페이지가 아니라 build 실패다.

## 2. 승인 결정과 로직의 대응

| 결정 | 로직 반영 |
|---|---|
| Q1 상시 강제 | cardinality 검증은 builder에 내장되어 우회 경로가 없다 |
| Q3 일괄 진단 | 단계별 일괄 수집(BR-U2-023): catalog 단계가 PUB001~003 전부를, catalog 성공 시 reference 단계가 PUB004~006 전부를 수집해 각각 write 전에 한 번에 보고한다 |
| Q9 full parity | fragment 해석은 기존 heading/block anchor 파생 함수를 재사용하며 homepage는 base URL만 다르다 |
| Q11 독립 치환 | 상호 불간섭은 규범 규칙 BR-U2-042가 소유한다. token 인식·계수는 항상 pre-render Markdown 수준이며, 삽입 방식만 Code Generation의 선택이다 |

## 3. PBT 언어·소유 경계

| 소유 | 언어·도구 | 대상 |
|---|---|---|
| U2 Rust (framework은 NFR Requirements에서 선택) | preprocessor tests | C07, C08, C09 property와 example |
| U2 TypeScript (U1 승인 Vitest + fast-check 재사용) | `site/tests` | C06, C10 property와 example |
| U3 | CI aggregation만 | property 이동·복제·지연 금지 |

## 4. Stage-Level Testable Properties (PBT-01)

모든 property는 U2 Code Generation의 binding test requirement이며 ST-E03 publication slice로 추적된다. Generator 상세와 run count는 NFR Requirements 이후 확정하되, generator domain은 아래에 고정한다. precondition과 operation은 property 문장에 내장되어 있고(예: "builder 성공 시", "token 정확히 1개인 body"), traceability는 §7이 소유한다.

### 4.1 C07 Publication Catalog (Rust)

| ID | Category | Property | Generator domain | Oracle/Assertion |
|---|---|---|---|---|
| FD-P-C07-01 | Invariant | builder 성공 시 homepage와 posts는 서로소이고 합집합이 입력 전체다 | 임의 크기의 synthetic source 집합, 정확히 1개 homepage | 집합 동등성 |
| FD-P-C07-02 | Invariant | homepage 0개 또는 ≥2개 입력은 절대 catalog를 만들지 않고 PUB002/PUB003을 낸다 | homepage 수 0, 2~N | 실패 + 코드 일치 |
| FD-P-C07-03 | Invariant | 임의 non-canonical `visibility` 값은 PUB001로 거부된다 | 임의 YAML scalar/list/boolean/대소문자 변형 | 실패 + detail에 원문 값 |
| FD-P-C07-04 | Oracle | post projection은 같은 입력의 legacy scan 결과와 순서·내용이 같다 | post-only 입력 | 기존 scan 경로를 oracle로 비교 |
| FD-P-C07-05 | Invariant | 같은 입력의 catalog와 진단 목록은 결정적으로 동일하다 (입력 순서 무관 정렬 포함) | 입력 순열 | 구조 동등성 |

### 4.2 C08 Link and Transclusion Transformer (Rust)

| ID | Category | Property | Generator domain | Oracle/Assertion |
|---|---|---|---|---|
| FD-P-C08-01 | Oracle | homepage wikilink variant는 truth table(BR-U2-013~017)과 정확히 일치한다 | bare/alias/heading/block/미해결 fragment 조합 | truth table 독립 구현 비교 |
| FD-P-C08-02 | Invariant | homepage 대상 transclusion 3종은 모두 PUB004~006으로 거부된다 | variant × 임의 fragment | 실패 + variant·path 식별 |
| FD-P-C08-03 | Invariant | homepage를 대상으로 하지 않는 문서의 변환 결과는 U2 이전 transform과 동일하다 | homepage 참조 없는 임의 문서 | 기존 transform을 oracle로 비교 |
| FD-P-C08-04 | Invariant | code fence 내부의 wikilink·transclusion·token 문자열은 변환·계수되지 않는다 | fence 안팎에 같은 참조 배치 | fence 내부 byte 불변 |

### 4.3 C09 Output Materializer (Rust)

| ID | Category | Property | Generator domain | Oracle/Assertion |
|---|---|---|---|---|
| FD-P-C09-01 | Round-trip | homepage artifact를 쓰고 다시 parse하면 원 projection과 구조가 같다 (`title`, body) | 임의 Korean/Unicode title·body | serialize→parse 동등성 |
| FD-P-C09-02 | Invariant | homepage는 `posts/`·`meta/`·search·graph·previews·nav tree·related·backlink output 어디에도 없다 | homepage + 임의 posts | 생성 결과 전수 검사 |
| FD-P-C09-03 | Easy verification | manifest는 실제 생성 파일 집합과 정확히 일치한다 | 임의 catalog | directory listing 비교 (manifest 파일 자신은 목록에서 제외) |
| FD-P-C09-04 | Idempotence | 이미 output이 있는 상태에서 같은 catalog로 재실행해도 최종 상태가 첫 실행과 같다 (전체 정리+재생성의 idempotence) | 임의 사전 output 상태(stale 파일 포함) | 상태 동등성 |

### 4.4 C06 Homepage Composition (TypeScript, fast-check)

| ID | Category | Property | Generator domain | Oracle/Assertion |
|---|---|---|---|---|
| FD-P-C06-01 | Invariant | token 정확히 1개인 body의 조합 결과는 token이 사라지고 fragment가 정확히 한 번 삽입되며 나머지 content가 보존된다 | token 위치·주변 content 임의 배치 | 치환 전후 구조 비교 |
| FD-P-C06-02 | Invariant | token 0개는 HP003, ≥2개는 HP004로 실패하고 fence 내부 token은 계수되지 않는다 | token 수 0~N, fence 안팎 배치 | 실패 + count 일치 |

### 4.5 C10 Static Data Gateway (TypeScript, fast-check)

| ID | Category | Property | Generator domain | Oracle/Assertion |
|---|---|---|---|---|
| FD-P-C10-01 | Invariant | 누락·malformed artifact(빈 title, JSON 오류, 파일 부재 조합)는 항상 HP001/HP002 진단으로 실패하고 빈 값을 반환하지 않는다 | 손상 mode 조합 | 실패 + 코드 일치 |
| FD-P-C10-02 | Round-trip | C09가 쓴 유효 artifact는 `getHomepage()`에서 원 값과 동일하게 읽힌다 (FD-P-C09-01의 site-side 쌍) | 유효 artifact 생성물 | 값 동등성 |

### 4.6 S02 / S03 — No independent PBT properties identified

- **S02 Publication Projection**: 독립 business logic이 없다. scope·cardinality·reference·materialization 로직은 전부 C07~C09가 소유하고 property도 거기서 검증된다. S02 고유 책임은 side-effect orchestration(호출 순서, 종료 코드)이며 U1 S04 선례에 따라 fixture 기반 example과 문서 gate로 검증한다.
- **S03 Homepage Composition**: slot 검증·치환 로직은 C06이, artifact 읽기는 C10이 소유한다. S03 고유 책임은 Astro build 통합과 기존 오늘 발행 글 동작 보존이며, 이는 build 결과에 대한 example test(BR-U2-041~043 assertion)로 검증한다.

## 5. Category 판정

| Category | 판정 |
|---|---|
| Round-trip | 적용 — FD-P-C09-01/FD-P-C10-02 (artifact codec 쌍) |
| Invariant | 적용 — partition, cardinality, 제외, 보존, fence, fail-closed 소비 |
| Idempotence | 적용 — FD-P-C09-04 (전체 정리+재생성 재실행). 단순 결정성(FD-P-C07-05)은 idempotence로 분류하지 않는다 |
| Commutativity | N/A — 순서 교환 가능한 이항 연산이 없다. 두 치환(Q11)의 상호 불간섭은 규범 규칙 BR-U2-042로 고정되며 교환 법칙 property의 대상이 아니다 |
| Oracle | 적용 — legacy pipeline 비교(FD-P-C07-04, FD-P-C08-03)와 truth table 독립 구현(FD-P-C08-01) |
| Induction | N/A — 재귀적 데이터 구조에 대한 구조 귀납 대상이 없다 |
| Easy verification | 적용 — FD-P-C09-03 (생성은 복잡하나 검증은 directory 비교) |

Human 판단 대체 금지: Vault 원본의 내용 적절성, homepage 시각 layout과 Vault diff 승인은 사용자 review 대상이며 PBT가 대신하지 않는다.

## 6. Example Test 의무 (PBT 보완)

| 대상 | 필수 example |
|---|---|
| 전환 시나리오 | fixture vault에 homepage fixture 추가 후: `/posts/{homepage-slug}` 부재, 목록·search·RSS·sitemap·graph 제외, unrelated fixture posts 보존 (EDGE-007 회귀) |
| 진단 출력 | PUB001~PUB007 각각의 구체 사례와 메시지 형식 |
| Vault 접근 불가 | 읽기 불가 경로에서 blocker 보고 (EDGE-012) |
| Composition | slot 1개 정상 조합, 오늘 발행 글 치환 동작(글 있음/없음), `<title>` = meta.title |
| CTA | `/` 조합 결과에 `/resume`·`/portfolio` 내부 anchor 존재, 외부 Notion URL 부재 (ST-U01) |
| Shrinking 규정 | PBT가 발견한 최소 반례는 영구 example 회귀로 고정한다 (FR-015.6) |

## 7. Traceability

| Property/Example | FR | Story/AC | Edge |
|---|---|---|---|
| FD-P-C07-01~05 | FR-009, FR-015 | ST-U06 AC-U06-01~03; ST-E03 AC-E03-01~02 | EDGE-007 |
| FD-P-C08-01~04 | FR-009, FR-015 | ST-U06; ST-E03 | EDGE-007 |
| FD-P-C09-01~04 | FR-009.5, FR-017 | ST-U06 AC-U06-02 | EDGE-007 |
| FD-P-C06-01~02, FD-P-C10-01~02 | FR-008, FR-013 | ST-U01 AC-U01-01~02; ST-U06 AC-U06-04 | EDGE-012 |
| §6 examples | FR-014 | ST-U01, ST-U06 checklist | EDGE-007, EDGE-012 |
