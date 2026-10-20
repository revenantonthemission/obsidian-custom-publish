# U2 Frontend Components — Homepage Publication Boundary

## 문서 상태

- **단계**: CONSTRUCTION — U2 Functional Design
- **Unit**: U2 Homepage Publication Boundary
- **작성일**: 2026-07-28
- **결정 근거**: [Functional Design Plan](../../plans/homepage-publication-boundary-functional-design-plan.md) Q1~Q12 (모두 A)

U2의 frontend 표면은 `/` 하나다. `/resume`·`/portfolio`는 U1이 소유하며 U2는 U1 provider contract를 소비만 한다.

## 1. C10 — Static Data Gateway (`site/src/lib/data.ts`)

| 항목 | 계약 |
|---|---|
| 신설 | `getHomepage(): HomepageData` — `content/homepage/index.md`와 `content/homepage/meta.json`을 읽고 검증해 `{ title, body }` 반환 |
| 오류 표면화 | 파일 누락은 HP001, meta parse 실패·빈 `title`·빈 body는 HP002로 **throw** — build가 실패한다. 빈 문자열 fallback 금지 (BR-U2-033) |
| 기존 getter | `getAllPostMeta`, `getPostMeta`, `getPostContent`, `getGraph`, `getLocalGraph`, `getHubs`, `getTagIndex`, `getPreviewSummary` 등은 이름·서명·동작 불변 (BR-U2-034). homepage가 generated output에서 사라지므로 자연스럽게 post-only가 된다 |
| Cache | 기존 module-level cache 패턴을 따르되 read-only generated result에만 적용한다 |

## 2. C06 — Homepage Composition (`site/src/pages/index.astro` + 지원 모듈)

| 항목 | 계약 |
|---|---|
| 데이터 접근 | `getHomepage()`만 사용. `getPostContent("passion-project")` 등 normal-post 우회 금지 (BR-U2-035) |
| slot 인식 | rendered 전 body에서 단독 줄 `<!-- profile:slot -->` token을 계수·치환한다. fence 내부 미계수 (BR-U2-036~037) |
| slot 검증 | count ≠ 1이면 HP003/HP004 throw — silent fallback 없음 (BR-U2-038) |
| slot 치환물 | U1 canonical homepage profile fragment: 짧은 소개 + `/resume`·`/portfolio` CTA. server-rendered, hydration·새 client JS 없음 (BR-U2-039; FR-013) |
| 오늘 발행 글 | 기존 규칙 보존: rendered HTML을 `이번주에 작성된 포스트` h2에서 잘라 post-only metadata 기반 `오늘 발행된 글` section으로 대체 (BR-U2-041) |
| 독립성 | slot 치환(Markdown/fragment 수준)과 오늘 발행 글 치환(rendered HTML 수준)은 서로 간섭하지 않는다 (BR-U2-042) |
| metadata | `<BaseLayout title>`은 `meta.title` 사용 — hardcoded "Passion Project" 제거 (BR-U2-043) |
| 보존 | slot 바깥 authored content와 기존 site shell·theme·metadata 동작 보존 |

token 인식·계수는 항상 pre-render Markdown 수준이다. Code Generation이 정하는 것은 삽입 방식(예: rendered HTML에 fragment 삽입 vs Astro component 조합)뿐이며, 위 관찰 가능 계약(정확히 한 번, token 잔존 없음, content 보존, 상호 불간섭 BR-U2-042, no-JS)은 변경할 수 없다.

## 3. 접근성·정적 동작 계약

- CTA와 profile fragment의 모든 이동은 server-rendered anchor로 JavaScript 없이 완료된다 (ST-U01 AC-U01-04).
- 좁은 화면(320px)과 넓은 화면에서 CTA 텍스트·포커스가 잘리거나 가려지지 않는다 (ST-U01 checklist).
- 기존 `--c-` theme 변수 문맥과 light/dark 동작을 보존한다.
- 홈페이지에서 임시 외부 Notion URL이 제거된다 (ST-U01 checklist; Vault 편집 BR-U2-045와 함께 닫힘).

## 4. Frontend Property Refinements와 Example 의무

Stage-level property(FD-P-C06-01~02, FD-P-C10-01~02)는 [business-logic-model.md](business-logic-model.md) §4가 소유한다. 아래는 frontend 정밀화다.

| ID | Refinement/Example | 종류 |
|---|---|---|
| FE-P-U2-01 | 조합 결과에 `/resume`·`/portfolio` anchor가 각각 정확히 존재하고 외부 Notion URL이 없다 | example (build output assertion) |
| FE-P-U2-02 | 오늘 발행 글: 오늘 날짜 post 있음/없음 두 경우 모두 기존 동작과 동일한 section 구조를 만든다 | example |
| FE-P-U2-03 | hardcoded "Passion Project" title 문자열이 부재하고, artifact 유래 영역의 `<title>`·표시 내용은 `meta.title`·body에서만 파생된다 (profile fragment와 오늘 발행 글 UI 문자열은 각자의 소유 계약을 따른다) | example |
| FE-P-U2-04 | slot fragment는 island·hydration marker 없이 정적 HTML로 존재한다 | example (FR-013) |
| FE-P-U2-05 | fence 내부 token이 있는 body에서 치환 결과의 fence 내용이 byte 보존된다 | FD-P-C06-02 정밀화 |
| FE-P-U2-06 | 조합된 `/`가 공통 Header navigation(U1 nav contract)을 보존해 홈페이지↔`/resume`↔`/portfolio` 교차 탐색이 가능하다 | example (AC-U01-03) |

Playwright smoke(대표 viewport의 CTA 접근·키보드 이동)는 FR-014에 따라 U2 Code Generation의 example 의무이며 정확한 viewport matrix는 NFR Requirements에서 확정한다.

## 5. Traceability

| 요소 | 근거 |
|---|---|
| getHomepage 계약 | C10; Q12; ST-U06 AC-U06-04; EDGE-012 |
| slot 인식·검증·치환 | C06, S03; Q10, Q11; FR-008; ST-U01 AC-U01-01~02 |
| 공통 navigation 보존 (FE-P-U2-06) | FR-012; ST-U01 AC-U01-03 |
| 오늘 발행 글 보존 | Q11; S03 책임 4 |
| no-JS·접근성 | FR-013; ST-U01 AC-U01-04; NFR-001 문맥 |
| Notion URL 제거 | FR-008.1~2; ST-U01 checklist |
