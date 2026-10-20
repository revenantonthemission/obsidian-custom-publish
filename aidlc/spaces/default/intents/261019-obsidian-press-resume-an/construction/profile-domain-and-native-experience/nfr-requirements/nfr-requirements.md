# U1 NFR Requirements — Profile Domain and Native Experience

## 문서 상태

- **단계**: CONSTRUCTION — U1 NFR Requirements
- **Unit**: U1 Profile Domain and Native Experience
- **상태**: 승인됨 (2026-07-24T06:02:15Z, 사용자 입력: "다음 단계로 진행해")
- **생성일**: 2026-07-24
- **승인된 답변**: Q1~Q14 = A/A/A/A/A/B/A/A/A/A/A/B/A/A
- **Feature Branch**: `codex/feature/resume-profile-experience`
- **PBT Enforcement**: Full; 이 단계의 blocking rule은 PBT-09
- **Extensions**: Obsidian Press project extension 활성; Security와 Resiliency 비활성

## 1. 목적과 고정 경계

이 문서는 승인된 U1 Functional Design을 구현 가능한 비기능 수용 기준으로 구체화한다. 다음 입력이 binding이다.

- [NFR Requirements Plan](../../plans/profile-domain-and-native-experience-nfr-requirements-plan.md)
- [Business Logic Model](../functional-design/business-logic-model.md)
- [Business Rules](../functional-design/business-rules.md)
- [Domain Entities](../functional-design/domain-entities.md)
- [Frontend Components](../functional-design/frontend-components.md)
- [Requirements](../../../inception/requirements/requirements.md)
- [User Stories](../../../inception/user-stories/stories.md)

다음 경계는 이 단계에서 다시 열지 않는다.

1. `/resume`와 `/portfolio`는 한국어 정적 route이며 새 profile client JavaScript, hydrated island, runtime API, database 또는 외부 runtime service를 추가하지 않는다.
2. 핵심 콘텐츠, navigation, contact/evidence/PDF link와 native `<details>`는 JavaScript 없이 server-rendered HTML에서 사용할 수 있어야 한다.
3. Web, print와 `/resume.pdf`는 같은 승인된 `ResumeProfile`과 ordered fact manifest에서 파생되어야 한다.
4. 실제 공개 사실은 이 문서가 승인하지 않는다. Production materialization 전에 별도 fact inventory와 명시적 사용자 승인이 필요하다.
5. Infrastructure, Terraform, AWS resource, deployment, CloudFront policy와 remote push는 이 단계의 권한 밖이다.

## 2. 승인된 결정 요약

| Question | Choice | 확정된 계약 |
|---|---|---|
| Q1 | A | 기존 480/768px profile breakpoint와 exact Chromium boundary viewport matrix |
| Q2 | A | Chromium full matrix; Firefox/WebKit focused JS on/off compatibility smoke |
| Q3 | A | WCAG 2.2 AA automated and manual evidence matrix |
| Q4 | A | No-new-JS/request와 incremental profile CSS 24KiB gzip structural budget |
| Q5 | A | A4 portrait, 12mm margin, page-count report-only print contract |
| Q6 | B | Playwright Chromium PDF와 package-pinned Pretendard subset |
| Q7 | A | Hash-bound non-public receipt, PDF.js semantic extraction와 non-threshold visual review |
| Q8 | A | Astro `getViteConfig()` Vitest + `fast-check` + `@fast-check/vitest` |
| Q9 | A | Local 100/CI 1,000 runs, suite seed, focused seed/path replay와 shrinking |
| Q10 | A | Vitest pure contracts; Playwright actual route/browser/print/PDF |
| Q11 | A | Numeric coverage 대신 complete named-obligation traceability |
| Q12 | B | Startup-only one retry와 verified atomic PDF replacement |
| Q13 | A | Offline automated link gate와 human-reviewed external reachability evidence |
| Q14 | A | U1-specific SLO/load/telemetry 없음; local static artifact readiness gate |

14개 답변은 모두 유효한 선택지와 일치하며 모호함, 상호 충돌 또는 기존 승인 충돌이 없다. 별도 clarification question은 필요하지 않다.

## 3. 측정 가능한 NFR Catalog

### NFR-U1-001 — Responsive layout와 content preservation

1. Profile layout은 기존 480px와 768px breakpoint를 재사용하고 unrelated 960px post/sidebar rule을 변경하지 않는다.
2. Chromium은 320×800, 479×900, 480×900, 767×1024, 768×1024와 1440×900을 검증한다. 대표 mobile journey는 390×844를 추가한다.
3. 모든 viewport에서 `documentElement.scrollWidth <= clientWidth`여야 한다.
4. Required fact와 CTA의 bounding box는 content viewport 안에 있어야 한다.
5. 긴 한국어, Unicode, URL, 기술명과 project title을 ellipsis, line clamp 또는 content-hiding `max-height`로 자르지 않는다.
6. Evidence URL은 자신의 container 안에서 wrap되어야 한다.

**Maps to**: NFR-001, NFR-002, NFR-008; FR-003~FR-007, FR-012~FR-014; ST-U01~ST-U05; EDGE-005, EDGE-011.

### NFR-U1-002 — Browser compatibility와 provisioning

1. Lockfile이 고정한 Playwright release의 bundled Chromium, Firefox와 WebKit만 acceptance engine으로 사용한다.
2. Chromium은 NFR-U1-001 전체 matrix, accessibility, reduced motion, print와 PDF flow를 소유한다.
3. Firefox와 WebKit은 각각 320×800 및 1280×800에서 `/resume`와 `/portfolio`의 JavaScript enabled/disabled route, keyboard, native details, visible server-rendered profile navigation과 overflow를 검증한다.
4. PDF generation은 Chromium 하나로 고정한다.
5. Branded Chrome/Safari 설치에 의존하지 않는다. Required engine 또는 OS library가 없으면 skip하지 않고 non-zero로 실패한다.
6. U3는 pinned browser install/cache command를 Jenkins에 집계하되 U1 test implementation을 복제하지 않는다.

**Maps to**: NFR-001, NFR-002, NFR-005, NFR-008, NFR-010; FR-013, FR-014, FR-016; ST-U01~ST-U05, ST-E04; EDGE-005, EDGE-011.

### NFR-U1-003 — WCAG 2.2 AA evidence

1. `/resume`와 `/portfolio`는 light/dark, narrow 320×800/wide 1440×900, closed-details/all-details-open 상태에서 `@axe-core/playwright` scan을 통과해야 한다.
2. Axe는 WCAG 2 A/AA, WCAG 2.1 A/AA와 WCAG 2.2 AA tag를 사용하며 blanket exclusion을 허용하지 않는다.
3. 별도 assertions가 heading/landmark/name, logical keyboard order, native details, visible focus, no-JS behavior, reduced motion, contrast와 target size를 검증한다.
4. Normal text contrast는 4.5:1 이상이다. 18pt regular 또는 14pt bold 이상의 large text와 non-text UI는 3:1 이상이다.
5. Custom target은 24×24 CSS px 이상이어야 하며, 더 작다면 적용 가능한 WCAG 2.2 exception과 근거를 기록해야 한다.
6. Author-created sticky content는 focus를 완전히 가리지 않아야 한다.
7. Reading order, 색상 외 의미 전달과 tagged PDF structure는 manual checklist도 통과해야 한다. Axe injection은 no-JS evidence가 아니다.

**Maps to**: NFR-001, NFR-002, NFR-008, NFR-009; FR-004~FR-007, FR-010, FR-012~FR-014; ST-U01~ST-U05; EDGE-005, EDGE-011.

### NFR-U1-004 — Deterministic static performance

1. U1-owned hydrated component 수, 새 client JavaScript chunk 수와 새 external runtime request 수는 각각 0이다.
2. Build manifest에서 `/resume` 또는 `/portfolio`가 새로 reach하는 profile-owned CSS resource의 unique gzip byte 합계는 24KiB 이하여야 한다.
3. Pre-existing BaseLayout/global shell resource는 baseline으로 측정하고 incremental U1 budget에서 제외한다.
4. 콘텐츠를 임의로 자르거나 줄여 budget을 맞추지 않는다.
5. 시간 기반 Lighthouse score, LCP와 CLS는 이 unit의 blocking SLO가 아니다.

**Maps to**: NFR-002, NFR-003, NFR-008; FR-003~FR-005, FR-013, FR-014; U1 contributor slice of ST-U01, ST-U02~ST-U05; EDGE-005, EDGE-011.

### NFR-U1-005 — Print pagination와 readability

1. Canonical print authority는 `@page { size: A4; margin: 12mm; }`와 `page.pdf({ preferCSSPageSize: true })`다.
2. Letter는 test-only `@page { size: Letter; }` override로 생성하는 ephemeral compatibility artifact이며 public CSS/PDF를 바꾸지 않는다.
3. Page count는 report하지만 hard limit을 두지 않는다. 승인된 content를 page count 때문에 자르지 않는다.
4. Printable content box에 들어가는 entry는 page를 가로질러 분할하지 않고, 긴 detail만 잘림 없이 분할할 수 있다.
5. Print CSS 자체가 닫힌 `<details>`의 승인된 전체 내용을 표시해야 한다. Generation script가 `open` attribute를 임시 설정해 우회하지 않는다.
6. Global/local navigation, toggle affordance, progress와 screen-only decoration은 print에서 숨긴다.
7. Body text는 10pt 이상, line-height는 1.35 이상이다. Heading은 적어도 첫 following content block과 같은 page에 남아야 한다.
8. Text와 link label은 clip되지 않고 PDF URL annotation은 승인된 destination과 일치해야 한다. 흑백에서도 hierarchy가 유지되어야 한다.

**Maps to**: NFR-001, NFR-002, NFR-009; FR-004, FR-010, FR-013, FR-014; ST-U03, ST-E02; EDGE-005, EDGE-008, EDGE-009.

### NFR-U1-006 — Offline PDF generation과 Korean font

1. PDF engine은 lockfile-pinned `@playwright/test` bundled Chromium의 `page.pdf()`다.
2. Generation options는 `preferCSSPageSize: true`, `tagged: true`, `outline: true`, `printBackground: false`다.
3. `pretendard@1.3.9` package의 official Unicode-range WOFF2 subset과 CSS를 build time에 same-origin static asset으로 materialize한다. License와 copy-integrity evidence를 보존한다.
4. Profile screen/print/PDF는 legacy global font와 구별되는 selected same-origin family를 명시한다.
5. Local production preview에서 font response가 성공한 뒤 `document.fonts.ready`와 `document.fonts.check()`가 selected family를 확인해야 한다.
6. Generation 중 loopback 외 request를 차단하고 successful non-loopback request가 0임을 단언한다.
7. Existing jsDelivr Pretendard/KaTeX stylesheet는 selected PDF font가 될 수 없다. Network font, hand-authored PDF body와 PDF-only fact source를 금지한다.

**Maps to**: NFR-003, NFR-005, NFR-007, NFR-009; FR-002, FR-004, FR-010, FR-013, FR-014; ST-U03, ST-E02; EDGE-008, EDGE-009.

### NFR-U1-007 — PDF identity, semantic parity와 visual review

1. `ResumeDocumentInspectionReceipt`는 public asset이나 canonical source가 아닌 derived verification evidence다.
2. Receipt는 inspected PDF SHA-256, current source fingerprint, canonical manifest digest와 full fact/entity/section/order mapping을 보존한다.
3. `pdfjs-dist`가 actual PDF의 page text, URL link annotation, structure tree와 outline destination을 추출한다.
4. Deterministic occurrence/order mapper가 extracted evidence를 receipt entry와 연결해야 한다. Raw flat text만으로 `factId`, semantic path, entity/order 또는 source identity를 복원했다고 간주하지 않는다.
5. Normalization은 Unicode NFC, line-wrap whitespace와 soft hyphen만 허용한다. Duplicate value 또는 split/merge가 ambiguous하면 실패한다.
6. Missing, unreadable, stale-source, wrong public path, missing/extra/changed/reordered fact, structure/outline 또는 link mismatch는 즉시 실패한다.
7. Local PDF.js viewer에서 actual pages를 render하고 Playwright structural/screenshot review와 manual reading-order review를 수행한다.
8. Pixel delta 자체에는 blocking threshold를 두지 않는다. PDF byte equality도 content-parity oracle이 아니며 SHA-256은 receipt가 검사한 exact bytes만 식별한다.

**Maps to**: NFR-005, NFR-007, NFR-009, NFR-010; FR-002, FR-004, FR-010, FR-014; ST-U03, ST-E02; EDGE-008, EDGE-009.

### NFR-U1-008 — TypeScript test runner와 PBT framework

1. Site owner-local pure/example/PBT runner는 Astro `getViteConfig()` 기반 Vitest다.
2. TypeScript PBT framework는 `fast-check`, Vitest integration은 `@fast-check/vitest`다.
3. Direct devDependencies와 lockfile은 각각 Vitest 4.1.10, fast-check 4.9.0과 `@fast-check/vitest` 0.4.1을 resolve한다.
4. Effective site Node engine은 `^22.12.0 || >=24.0.0`으로 고정해 selected Vitest가 지원하지 않는 Node 23을 제외한다.
5. Executable framework smoke는 structured domain arbitrary, connector lifecycle, generated case의 automatic shrinking, same-seed reproduction과 exact seed/path replay를 검증해야 한다.
6. Custom random loop는 PBT-09를 충족하지 않는다.

**Maps to**: NFR-004, NFR-005, NFR-010; FR-014~FR-016; ST-E01, ST-E03, ST-E04; EDGE-010.

### NFR-U1-009 — PBT execution, shrinking와 reproducibility

1. `PBT_RUNS`는 validated positive integer다. Default actual property assertion당 local 100 runs, CI 1,000 runs다.
2. Wrapper는 Vitest worker 시작 전에 signed 32-bit suite seed 하나를 생성하거나 `PBT_SEED` override를 받아 항상 출력하고 모든 property에 전달한다.
3. `PBT_PATH`는 explicit `PBT_SEED`와 exact file/test focus가 함께 있을 때만 허용한다. Global unfocused path replay는 금지한다.
4. Default fast-check failure output의 seed, path, shrunk counterexample와 shrink count를 보존한다.
5. Flaky retry와 normal-run `endOnFailure`을 금지한다. Time limit을 사용하면 incomplete run이 성공하지 않도록 `markInterruptAsFailure: true`를 사용한다.
6. Generator는 main path에서 `fc.gen()`을 사용하지 않고 shrink-friendly composed arbitrary를 사용한다.
7. 한 labelled invalid mutation을 제외한 domain invariant는 shrinking 중에도 유지한다.
8. 한 canonical test가 여러 refinement ID를 충족할 수 있지만 traceability alias마다 동일 semantic property를 중복 실행하지 않는다.

**Maps to**: NFR-005, NFR-010; FR-015, FR-016; ST-E01, ST-E03, ST-E04; EDGE-010.

### NFR-U1-010 — Test-layer ownership

1. Vitest는 normalization, validation, selectors, renderer-neutral presentation tree, metadata/JSON-LD, manifest의 example tests와 PBT를 소유한다.
2. Playwright는 production build/preview의 actual Astro route, JavaScript disabled, keyboard, accessibility, responsive, print와 PDF flow를 소유한다.
3. Experimental Astro Container API는 blocking gate에 사용하지 않는다.
4. Stable target commands는 `test:unit`, `test:pbt`, `test:e2e`, `resume:pdf`, `resume:pdf:verify`다.
5. U3는 stable commands를 Jenkins에 집계할 뿐 U1 implementation 또는 assertion을 복제하지 않는다.

**Maps to**: NFR-004, NFR-005, NFR-010; FR-014~FR-017; ST-E01, ST-E03, ST-E04; EDGE-010.

### NFR-U1-011 — Maintainability와 complete obligation traceability

1. Numeric line, statement 또는 branch coverage threshold는 두지 않는다.
2. 모든 U1 Functional Design property와 explicit N/A, named negative path, required Story/AC와 EDGE scenario가 named example/PBT/browser/document test에 연결되어야 한다.
3. 미연결 obligation은 blocking이다.
4. Coverage percentage는 fact review, web/print/PDF parity, critical example scenario 또는 PBT obligation을 대신하지 않는다.
5. PBT가 발견한 shrunk defect는 적절한 permanent example regression으로 승격하고 원 property도 유지한다.
6. Production fact는 C01 canonical profile과 its validated projections에서만 소비한다. C02 presentation, C03 metadata, C04 host, C05 navigation, C11 document boundary 또는 S04 document orchestration에 fact copy를 만들지 않는다.
7. C01은 domain/validation/projection, C02는 static semantic presentation, C03은 metadata builder, C04는 backward-compatible host, C05는 shared navigation, C11은 pure manifest/source guard, S01은 assembly, S04는 browser/filesystem side effect만 소유한다. 책임을 교차 복제하지 않는다.
8. Profile CSS는 기존 `--c-` variable만 사용하고 unprefixed color/surface variable을 추가하지 않는다. Profile-local style을 우선하며 `set:html` content 또는 print처럼 global selector가 필요한 예외는 owning file과 근거를 기록한다.
9. Authored source와 generated boundary를 보존한다. `site/public/resume.pdf`는 reviewed derived release asset이지 canonical source가 아니며, receipt/temp file과 generated public JSON/assets도 behavior source가 될 수 없다.

**Maps to**: NFR-004, NFR-005, NFR-010; FR-001, FR-002, FR-014~FR-017; ST-E01, ST-E02, U1 slice of ST-E03, U3 handoff to ST-E04; EDGE-001~EDGE-006, EDGE-008~EDGE-011.

### NFR-U1-012 — Fail-closed document reliability

1. Browser launch 또는 local preview readiness와 같이 분류된 transient startup error만 한 번 재시도할 수 있다.
2. Source, semantic, parity 또는 layout mismatch는 재시도하지 않고 즉시 non-zero로 실패한다. PBT failure에는 retry를 적용하지 않는다.
3. Temporary PDF는 `site/public/`과 같은 filesystem의 non-public temporary path에 생성한다.
4. Generation 뒤 source fingerprint를 다시 확인하고 NFR-U1-007의 semantic/structure/review gate를 통과한 뒤에만 atomic rename한다.
5. 실패하면 이전 public file은 보존하되 current source에 대해 stale로 판정하고 non-zero로 종료한다.
6. Receipt와 diagnostics는 `public/` 밖에 둔다.
7. Error output은 failed stage, attempt, source fingerprint, file/path와 mismatch rule을 식별해야 한다.

**Maps to**: NFR-005, NFR-007, NFR-009, NFR-010; FR-010, FR-014; ST-U03, ST-E02; EDGE-008, EDGE-009.

### NFR-U1-013 — Link integrity, privacy와 network independence

1. Automated gate는 URL scheme/host/path, internal route existence와 approved fact mapping을 offline으로 검증한다.
2. External reachability evidence는 fact inventory에 URL, expected destination, verifier와 checked-at timestamp를 기록하고 final user fact approval에서 검토한다.
3. Unit/PBT/CI/runtime network reachability check는 추가하지 않는다.
4. Profile route는 public static content이므로 authentication, authorization, session, form submission, secret storage, analytics와 contact tracking은 N/A다.
5. Syntax-valid URL만으로 truth, public suitability 또는 human approval을 추론하지 않는다.

**Maps to**: NFR-005, NFR-007, NFR-008; FR-002, FR-005, FR-006, FR-012~FR-014; ST-U04, ST-U05, ST-E02; EDGE-004, EDGE-011.

### NFR-U1-014 — Static artifact availability와 scalability boundary

1. U1-specific traffic target, uptime SLO, load test, runtime telemetry와 health-check infrastructure를 추가하지 않는다.
2. Local production preview에서 `/resume`와 `/portfolio`는 200 HTML과 non-empty body를 반환해야 한다.
3. `/resume.pdf`는 200 `application/pdf`, non-empty body, current source fingerprint와 exact manifest parity를 만족해야 한다.
4. Runtime scalability와 availability는 기존 S3/CloudFront static delivery contract에 위임한다.
5. 이 local gate는 production monitoring, deployment 또는 Infrastructure mutation 권한을 만들지 않는다.

**Maps to**: NFR-003, NFR-005, NFR-010; FR-003, FR-010, FR-013, FR-014, FR-018; ST-U02~ST-U04, ST-E04; EDGE-008, EDGE-009.

### NFR-U1-015 — Search와 share consistency

1. `/resume`와 `/portfolio`의 title, description, canonical, Open Graph와 Twitter metadata는 route별로 unique해야 한다.
2. Metadata description은 해당 route의 visible approved summary와 exact equality를 유지한다.
3. Typed JSON-LD는 serialize/embed/extract/parse round-trip에서 구조와 Unicode content를 보존한다.
4. 모든 non-constant metadata/JSON-LD claim은 approved fact allowlist에 있어야 한다.
5. Portfolio `ItemList` order와 position은 visible project order와 같아야 한다.
6. Missing, duplicate, wrong-route, unapproved 또는 mismatched metadata는 zero-tolerance failure다.

**Maps to**: NFR-005, NFR-006, NFR-007; FR-002, FR-005, FR-011, FR-013, FR-014; ST-U02, ST-U04, ST-E01, ST-E02; EDGE-005.

## 4. Browser, State and Evidence Matrix

| Evidence set | Routes | Engine / viewport | Theme / state | Blocking assertions |
|---|---|---|---|---|
| Responsive boundary | `/resume`, `/portfolio` | Chromium 320×800, 479×900, 480×900, 767×1024, 768×1024, 1440×900; journey 390×844 | Default plus required content states | No horizontal overflow, clipping or truncation; required bounding boxes in viewport |
| Accessibility | Both routes | Chromium narrow 320×800 / wide 1440×900 | Light/dark; closed/all-open | Axe tags, semantics, keyboard, focus, contrast, target size, reduced motion |
| Cross-browser | Both routes | Firefox/WebKit 320×800 and 1280×800 | JS enabled/disabled | Route, visible profile navigation, keyboard, native details, overflow |
| Print | `/resume` | Chromium A4 canonical; Letter ephemeral | Print media; details visually expanded by CSS | Paper/margin, typography, pagination, no clipping, URL annotation |
| PDF | `/resume.pdf` | Bundled Chromium + PDF.js | Offline selected font | Source/manifest/hash receipt, text/link/structure/outline, manual reading order |
| Static readiness | All three public paths | Local production preview | N/A | 200, MIME/body, current source identity and parity |

Manual evidence is mandatory for reading order, color-independent meaning, focus appearance where automation is insufficient, grayscale hierarchy, tagged PDF structure and final PDF page review. Manual evidence records reviewer, timestamp, inspected SHA-256 and outcome.

## 5. Test and Command Contract

| Stable command | Owner | Required role | Stage status |
|---|---|---|---|
| `npm run test:pbt:framework` | U1 NFR Requirements | Executable PBT-09 capability proof | Implemented and passing on the U1 feature branch |
| `npm run test:unit` | U1 Code Generation | Pure examples, renderer-neutral contracts and metadata/manifest tests | Required handoff |
| `npm run test:pbt` | U1 Code Generation | U1 owner-local properties with run/seed/path policy | Required handoff |
| `npm run test:e2e` | U1 Code Generation | Production route/browser/accessibility/print flow | Required handoff |
| `npm run resume:pdf` | U1 Code Generation | Offline fail-closed PDF generation | Required handoff |
| `npm run resume:pdf:verify` | U1 Code Generation | Receipt-bound actual PDF verification | Required handoff |
| Jenkins aggregate | U3 | Provision tools and invoke stable U1/U2 commands with CI run count/seed logging | U3 handoff |

The current framework smoke is capability evidence, not a substitute for U1 domain PBT or critical example tests.

## 6. PBT Contract and Complementary Testing

The approved Functional Design identifies 12 U1 umbrella properties, 22 business-rule refinements, 15 domain refinements and 9 frontend refinements. Code Generation must maintain a canonical obligation map so one test may satisfy aliases without duplicate execution.

| PBT concern | Required treatment |
|---|---|
| Custom generators | Reusable structured generators for Korean/Unicode text, optional fields, exact 3/6 boundaries, sparse unique order, typed relation and one labelled invalid mutation |
| Shrinking | Framework default shrinking remains enabled; composed arbitraries preserve all unrelated invariants |
| Reproducibility | One logged signed 32-bit suite seed; explicit focused seed/path replay |
| Examples | Critical user journeys and every named negative/document path retain explicit example tests |
| Regression | Shrunk defect becomes a permanent example regression when appropriate |
| S04 boundary | Browser/filesystem/PDF side effects use named example/document tests; pure C11 source/parity guards retain PBT |

PBT-09 is compliant at this stage: Vitest, fast-check and the official Vitest connector are direct locked devDependencies, and the executable smoke verifies custom structured input, runner integration, shrinking and seed/path replay.

## 7. Explicit N/A Decisions

| Concern | N/A rationale |
|---|---|
| U1 traffic/load target | Static bounded content adds no service, database, queue or per-user state |
| U1 uptime SLO/failover | Existing S3/CloudFront delivery remains unchanged; production monitoring is not authorized |
| Runtime telemetry/health checks | No new runtime and no monitoring authority |
| Authentication/authorization/session/secrets | Public read-only static routes with no form or account |
| Analytics/contact tracking | Not requested and would add privacy/runtime scope |
| Lighthouse timing SLO | Deterministic structural budget is the selected blocking gate |
| Numeric code coverage | Complete named-obligation traceability is the selected maintainability gate |
| Pixel-delta threshold | Structural screenshot and manual review are mandatory, but raw delta is not a stable quality oracle |
| Stateful PBT | U1 domain is immutable build-time data; no mutable state machine exists |
| PDF byte equality | Browser PDF bytes are not the content oracle; manifest parity plus hash-bound inspection is |
| Infrastructure mutation/deployment implementation | No Terraform, AWS, CloudFront, push or deployment authority was granted. The approved per-unit Infrastructure Design compatibility/no-change verification still executes and may not be skipped. |

## 8. Traceability Summary

| NFR group | Product requirements | Stories / scenarios | Functional owners | Primary evidence |
|---|---|---|---|---|
| Responsive, browser, accessibility | NFR-001~NFR-003, NFR-008; FR-003~FR-007, FR-012~FR-014 | ST-U01~ST-U05; USCN-001~003; EDGE-005/011 | C02, C05 | Playwright matrix, axe, keyboard and manual checklist |
| Static performance | NFR-002/003/008; FR-013/014 | U1 contributor slice of ST-U01, ST-U02~ST-U05; EDGE-005/011 | C02, C04, C05 | Build manifest and network assertions |
| Maintainable source/ownership boundary | NFR-004; FR-001/002/017 | ST-E01/E02; USCN-004; EDGE-001~006 | C01~C05, C11, S01, S04 | Responsibility map, source/generated audit and named tests |
| Print/PDF | NFR-001/002/005/007/009/010; FR-002/004/010/014 | ST-U03, ST-E02; USCN-001/004; EDGE-008/009 | C11, S04 | Print smoke, generation receipt, PDF.js and manual review |
| PBT/testability | NFR-004/005/010; FR-014~FR-016 | ST-E01, ST-E03, ST-E04; USCN-004; EDGE-010 | C01~C05, C11, S01 | Vitest examples/PBT, seed/path output and traceability |
| Integrity and links | NFR-005/007/008; FR-002/005/006/012~014 | ST-U04/U05, ST-E02; EDGE-004/011 | C01, C02, C03 | Offline validators and approved fact inventory |
| Search/share | NFR-005~NFR-007; FR-002/005/011/013/014 | ST-U02/U04, ST-E01/E02 | C03, C04 | Metadata/JSON-LD example and PBT gates |
| Static readiness | NFR-003/005/010; FR-003/010/013/014/018 | ST-U02~U04, ST-E04; EDGE-008/009 | C11, S04 | Local production preview status/MIME/parity |

## 9. Extension Compliance and Handoff

### PBT

- **PBT-09 — Compliant**: Framework, connector, direct dependencies, lockfile and four-capability executable evidence are present.
- **PBT-01~PBT-08, PBT-10 — N/A at this stage**: PBT-01 was completed in Functional Design; Code Generation and Build and Test retain their later enforcement points.
- **Blocking PBT findings**: None.

### Obsidian Press project extension

- **OBSIDIAN-01 — Compliant**: Root project instructions and Astro/npm/source-boundary constraints remain binding.
- **OBSIDIAN-02 — Compliant**: The dirty primary `main` and its pre-existing lockfile change were not modified. PBT tooling was applied only in an isolated worktree on the focused U1 branch; generated `site/dist/` is not a behavior source.
- **OBSIDIAN-03 — Compliant**: Focused PBT smoke, clean-lock install, direct dependency validation and Astro build passed.
- **OBSIDIAN-04 — Compliant**: Work remains on `codex/feature/resume-profile-experience`, based on reconciled `develop`; no merge or push occurred.
- **OBSIDIAN-05 — Compliant**: One active AI-DLC run remains.

Security and Resiliency extensions are disabled, so their rule sets are not enforced. `npm audit` reported 17 findings in the pre-existing Astro/tooling dependency graph; none names the three newly selected PBT packages. No broad dependency upgrade or automatic audit fix was authorized or applied.

### NFR Design handoff

U1 NFR Design must map these targets into logical components and failure paths without changing the approved static architecture. The approved U1 Infrastructure Design stage then verifies route, PDF/asset, cache, invalidation and rollback compatibility and may reach a documented no-change result; it does not authorize mutation or deployment. Code Generation later owns the target command implementations, Playwright/PDF/font/PDF.js dependencies, U1 domain tests and fact-review artifacts. Actual facts, Vault changes, deployment and AWS remain separately gated.
