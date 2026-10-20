# U3 Evidence Mapping — Cross-Unit Coverage (LC-U3-05)

## 문서 상태

- **단계**: CONSTRUCTION — U3 Code Generation Step 1
- **작성일**: 2026-07-29
- **판정 원칙**: [AR-U3-01](../functional-design/adapter-rules.md) 재구현 금지 — covered 판정은 실제 spec 파일·test 이름 인용으로만 성립하고, gap 판정만 adapter 신설을 허용한다.

## 1. §5.5 항목별 판정

| # | §5.5 항목 | 담당 증거 (spec 파일 · test) | 판정 |
|---|---|---|---|
| 1 | narrow/wide responsive | `profile-responsive.spec.ts` — 14 tests `${route} at ${viewport} reads without overflow or clipping` (2 route × 7 viewport: 320·479·480·767·768·1440·390); `homepage.spec.ts` — describe 320×800/1440×900 loop | **Covered** |
| 2 | keyboard, focus, accessible name | `profile-accessibility.spec.ts` — `native disclosures answer the keyboard`, `the skip link reaches main content by keyboard alone`, `focus stays visible while tabbing the profile`, axe 16-matrix(accessible-name 규칙 포함); `homepage.spec.ts` — `CTAs are keyboard reachable under reduced motion` | **Covered** |
| 3 | reduced-motion | `profile-accessibility.spec.ts` — `reduced motion is honoured`; `homepage.spec.ts` axe test의 `reducedMotion: 'reduce'` | **Covered** |
| 4 | **no-JS core navigation smoke** | `profile-cross-browser.spec.ts` — `${route} at ${viewport} with JavaScript disabled` (firefox/webkit × /resume·/portfolio × 320·1280): **render 확인만**. chromium JS-off 셀 없음, homepage(`/`) 없음, navigation 통과(무JS로 링크 따라 이동) 없음 | **Gap** → LC-U3-06 |
| 5 | required routes · homepage CTA · route absence | `profile-routes.spec.ts` — `${route} serves a complete, self-describing document`; `homepage.spec.ts` — `profile fragment renders with internal CTAs...`, `the homepage-as-post route is absent`, `rss and sitemap carry no homepage entry`, `the 404 recent list carries no homepage entry` | **Covered** |
| 6 | **internal links** | `profile-routes.spec.ts` — `internal links close over emitted build output`: **`/resume`·`/portfolio` 페이지의 anchor만** manifest 대조. homepage·posts·tags·graph 등 나머지 build 산출물의 내부 href/src는 어떤 spec도 sweep하지 않음 (`homepage.spec.ts`는 4개 nav anchor의 존재만 확인, 해석 안 함) | **Gap** → LC-U3-07 |
| 7 | canonical/social metadata · JSON-LD | `profile-routes.spec.ts` — `metadata and JSON-LD assert only facts the page shows`, canonical 검사; homepage `<title>`은 U2 unit test 소유. JSON-LD는 profile route에만 존재(설계상) — 검증 대상 전부 covered | **Covered** |
| 8 | print media · tracked PDF · PDF link · readability · web/PDF parity | `profile-print.spec.ts` — `print media expands closed disclosures...`, A4/Letter pagination; `resume:pdf:verify` — release pair 검증 + §5.2 재검사(web/print/PDF 3-surface, `mappedFacts`, `surfaceParity`); `/resume.pdf` link는 `profile-routes.spec.ts`의 deferred-document 처리 | **Covered** (CI 밖, 로컬 integrated 증거 — NFR-U3-005) |
| 9 | PBT seed·shrunk counterexample 재현 evidence | spec이 아니라 실행 증거 — Step 5/7 (로컬 등가 실행 + ST-E04 report)이 수집 | **Orchestration** (OR-U3-05) |
| 10 | stable command 연결·CI 실행 | Verify stage (LC-U3-01) + 로컬 등가 실행 | **Orchestration** (OR-U3-01/02) |

## 2. Gap 판정 결과

**정확히 두 개** — 설계가 후보로 식별한 것과 일치 (AR-U3-02):

1. **LC-U3-06 — no-JS core navigation smoke**: chromium + JS 비활성 + 320×800/1440×900 (NFR-U3-002). 기존 커버리지와의 차별점: chromium engine, homepage(`/`) 포함, **navigation 통과**(무JS 링크 이동) 확인.
2. **LC-U3-07 — 내부 link 무결성 sweep**: `site/dist/` 전역 정적 순회 (NFR-U3-003). 기존 커버리지와의 차별점: profile 2-page 한정 → build 산출물 전체.

따라서 LC-U3-08(`test:crossunit` script)도 생성된다. Step 2가 진행된다.

## 3. 재검증 참조

이 표의 모든 covered 판정은 위 spec 파일·test 이름으로 재검증 가능하다 (PD-U3-05 결정성 규칙). 대조 기준 commit: 이 파일과 같은 커밋의 tree.
