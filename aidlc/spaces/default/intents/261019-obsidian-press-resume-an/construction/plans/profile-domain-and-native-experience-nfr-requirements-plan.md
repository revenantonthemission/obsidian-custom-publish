# U1 NFR Requirements Plan — Profile Domain and Native Experience

## 문서 상태

- **단계**: CONSTRUCTION — U1 NFR Requirements
- **상태**: artifact 승인 완료
- **Unit**: U1 Profile Domain and Native Experience
- **Bounded Context**: Profile Experience
- **작성일**: 2026-07-24
- **Target Feature Branch**: `codex/feature/resume-profile-experience`
- **Branch Base**: reconciled local `develop` at `67f70a4240819ed8b9408360f9b59512660f8e10`
- **Primary Worktree**: 기존 사용자 변경을 보존하기 위해 `main`에 유지
- **PBT Enforcement**: Full; 이 단계에는 blocking rule `PBT-09`가 적용됨

## 1. 입력과 고정된 경계

- [Approved Business Logic Model](../profile-domain-and-native-experience/functional-design/business-logic-model.md)
- [Approved Business Rules](../profile-domain-and-native-experience/functional-design/business-rules.md)
- [Approved Domain Entities](../profile-domain-and-native-experience/functional-design/domain-entities.md)
- [Approved Frontend Components](../profile-domain-and-native-experience/functional-design/frontend-components.md)
- [Unit of Work Definitions](../../inception/application-design/unit-of-work.md)
- [Unit of Work Story Map](../../inception/application-design/unit-of-work-story-map.md)
- [Component Methods](../../inception/application-design/component-methods.md)
- [Requirements](../../inception/requirements/requirements.md)
- [User Stories](../../inception/user-stories/stories.md)

다음 결정은 이미 승인됐으며 이 질문에서 다시 열지 않는다.

- `/resume`와 `/portfolio`는 한국어 정적 route이고, 새 profile client JavaScript, Preact island, runtime API, database 또는 외부 runtime service를 추가하지 않는다.
- 모든 핵심 콘텐츠, profile navigation, 연락·근거·PDF link와 native `<details>`는 최초 server-rendered HTML에서 JavaScript 없이 사용할 수 있다.
- Résumé는 닫힌 `<details>` 안에도 승인된 상세 전체를 포함하며, `/resume.pdf`는 같은 `/resume` source에서 파생된다.
- Web, print와 PDF는 ordered `ResumeProfile`의 승인된 모든 text, period와 URL fact manifest가 완전히 일치해야 한다. PDF byte equality는 요구하지 않는다.
- Portfolio는 승인된 complete project 3~6개를 보여 주며 긴 한국어·Unicode를 임의로 자르지 않는다.
- 실제 이름, 연락처, 경력, 성과, project와 URL은 이 NFR 답변으로 승인되지 않는다. 별도 fact inventory와 명시적 사용자 승인이 필요하다.
- Security와 Resiliency extension은 비활성화 상태다. 다만 승인된 `NFR-007` 콘텐츠 무결성·개인정보 요구는 제품 요구사항으로 계속 적용한다.
- Terraform, AWS mutation, deployment와 push는 범위 밖이다. NFR 도구 선택도 그 권한을 만들지 않는다.

## 2. 현재 기술 기준선

| Area | Existing baseline | NFR implication |
|---|---|---|
| Runtime/build | Astro 6 static output, Node `>=22.12.0`, TypeScript 5.9, npm/npx | 새 site 검증 도구는 `site/package.json`과 npm lockfile에 통합 |
| Test runner | Site-side unit/PBT/browser runner 없음 | U1에서 TypeScript runner와 PBT framework를 함께 선택해야 함 |
| Styling | `--c-` variables, light/dark theme, breakpoints 480/768/960px, global `:focus-visible`, reduced-motion rule | Profile NFR은 기존 shell과 breakpoint 체계를 깨지 않아야 함 |
| Browser | 요구사항이 Playwright smoke를 명시하지만 dependency/configuration은 없음 | 정확한 engine, viewport, accessibility와 print matrix가 필요 |
| PDF | `site/public/resume.pdf`와 generation/inspection tool이 아직 없음 | browser engine, font readiness, extraction과 visual-review gate가 필요 |
| Network | Production shell은 기존 CDN font/CSS를 참조하지만 tests는 외부 service에 의존할 수 없음 | U1이 추가하는 runtime request는 0이어야 하고 PDF/test font 전략은 offline이어야 함 |
| Delivery | Existing S3/CloudFront static delivery; U1 infrastructure mutation 미승인 | Runtime scaling은 existing delivery에 위임하고 authored artifact quality를 gate |

## 3. NFR Category Assessment

| Category | Assessment | Question / planned treatment |
|---|---|---|
| Scalability | Runtime API, database, queue 또는 per-user state가 없는 bounded static artifact다. Project cardinality는 3~6으로 고정됐다. | Q14에서 별도 production SLO/load scope가 필요한지만 결정한다. 선택하지 않으면 runtime capacity engineering은 명시적 N/A다. |
| Performance | No-new-JS는 고정됐지만 CSS/build-output budget과 timing gate는 미정이다. | Q4 |
| Availability | Existing static hosting을 상속하지만 U1 route/PDF availability SLO와 monitoring 범위는 미정이다. | Q14 |
| Security / integrity | Authentication/authorization/session은 N/A다. Approved-only facts, safe URL과 offline verification은 계속 필요하다. | Q13 |
| Tech stack | TypeScript runner/PBT, browser/PDF generation과 inspection stack이 없다. | Q2, Q6~Q10 |
| Reliability | Invalid source, browser/PDF failure, stale output와 retry policy가 미정이다. | Q12 |
| Maintainability | Test layer ownership, stable commands와 numeric coverage policy가 미정이다. | Q10~Q11 |
| Usability | Responsive breakpoints, browser matrix, accessibility evidence와 print pagination 수치가 미정이다. | Q1~Q3, Q5 |
| Search / share quality | Exact metadata, visible-summary parity, typed JSON-LD와 safe serialization은 Functional Design에서 승인됐다. | 새 user choice 없이 title/description/canonical/OG/Twitter uniqueness, JSON parse round-trip, visible-summary equality와 approved-claim allowlist를 offline zero-tolerance gate로 파생한다. |

## 4. 공식 도구 근거

- Astro는 `getViteConfig()`를 사용하는 Vitest 설정과 production build를 대상으로 한 Playwright 검증을 공식 안내한다: [Astro Testing](https://docs.astro.build/en/guides/testing/).
- fast-check는 custom arbitraries, automatic shrinking과 seed/path replay를 제공하며, Vitest에서는 `@fast-check/vitest` connector를 권장한다: [fast-check with Vitest](https://fast-check.dev/docs/tutorials/setting-up-your-test-environment/property-based-testing-with-vitest/), [fast-check Parameters](https://fast-check.dev/docs/api/interfaces/Parameters/).
- Playwright는 Chromium, Firefox와 WebKit project, print media emulation, Chromium PDF generation과 tagged PDF option을 제공한다: [Playwright Browsers](https://playwright.dev/docs/browsers), [Playwright Page API](https://playwright.dev/docs/api/class-page#page-pdf).
- Playwright accessibility guidance는 `@axe-core/playwright` 자동 검사를 manual assessment와 함께 사용할 것을 명시한다: [Playwright Accessibility Testing](https://playwright.dev/docs/accessibility-testing).
- WCAG 2.2 AA는 320 CSS px reflow, normal text 4.5:1 contrast, target size 24×24 CSS px 또는 정의된 exception과 focus-not-obscured criteria를 제공한다: [WCAG 2.2](https://www.w3.org/TR/WCAG22/).
- Mozilla PDF.js는 Node.js examples와 `pdfjs-dist` prebuilt package를 제공한다: [PDF.js Examples](https://mozilla.github.io/pdf.js/examples/), [PDF.js Project](https://github.com/mozilla/pdf.js).
- Existing site font인 Pretendard v1.3.9는 full/dynamic-subset webfont distribution과 SIL OFL 1.1 license를 제공한다: [Pretendard](https://github.com/orioncactus/pretendard), [Pretendard License](https://github.com/orioncactus/pretendard/blob/main/LICENSE).

이 근거는 선택지를 현실적인 현재 tool capability에 맞추기 위한 것이며, 아직 dependency 또는 application source를 변경하지 않는다.

## 5. 목표 산출물

모든 답변을 검증한 뒤 다음 artifact를 생성한다.

- `aidlc-docs/construction/profile-domain-and-native-experience/nfr-requirements/nfr-requirements.md`
- `aidlc-docs/construction/profile-domain-and-native-experience/nfr-requirements/tech-stack-decisions.md`

Artifact는 다음을 포함해야 한다.

- accessibility, responsive, static performance, compatibility, print/PDF, reliability와 maintainability의 측정 가능한 acceptance target;
- browser, viewport, theme, JavaScript-disabled와 print evidence matrix;
- PDF generation, font readiness, atomic output와 semantic/visual inspection contract;
- TypeScript unit/example runner, PBT framework, custom generator, shrinking, run-count와 seed/path replay policy;
- stable local commands와 U3 CI handoff;
- scalability, availability, authentication/authorization, runtime monitoring 또는 numeric code coverage가 N/A인 경우 구체적인 근거;
- PBT-09 framework 선택, 실제 `site/package.json`/lockfile dependency 반영과 four-capability verification.

## 6. 실행 계획

### 6.1 Context 분석과 질문

- [x] 승인된 U1 Functional Design artifact 네 개와 U1 requirements/story/application inputs를 분석한다.
- [x] 현재 Astro/TypeScript/npm/CSS/CI/PDF baseline을 조사한다.
- [x] scalability, performance, availability, security, tech stack, reliability, maintainability와 usability를 모두 평가한다.
- [x] 이미 승인된 route, no-JS, approved-fact, full-manifest parity와 deployment 경계를 다시 열지 않는 질문을 작성한다.
- [x] 모든 질문에 최소 두 개의 의미 있는 선택지, 마지막 `X) Other`와 빈 `[Answer]:`를 제공한다.
- [x] 공식 Astro, fast-check, Vitest, Playwright와 PDF.js capability를 현재 문서로 확인한다.
- [x] NFR coverage, PBT-09와 browser/PDF 세 관점의 독립 검토를 수행하고 모든 blocking/material finding을 해소한다.
- [x] 14 questions/answers/Other count, option blank-line, relative link, Markdown whitespace와 no-diagram status를 기계 검증한다.
- [x] 모든 `[Answer]:`를 수집한다.
- [x] 선택 형식, 명확성, 상호 일관성, 기존 승인과의 호환성을 검증한다.
- [x] 모호함이나 충돌이 있으면 별도 clarification question file을 만들고 모두 해소한다. 검증 결과 clarification은 필요하지 않다.

### 6.2 NFR Requirements와 Tech Stack Decisions

- [x] Q1~Q14를 측정 가능한 U1 NFR acceptance matrix로 변환한다.
- [x] responsive/browser/accessibility/theme/no-JS/print matrix를 확정한다.
- [x] performance, availability, reliability, integrity와 maintainability target 또는 명시적 N/A를 기록한다.
- [x] Metadata uniqueness, visible-summary parity, JSON-LD safe round-trip와 approved claim allowlist의 offline zero-tolerance gate를 기록한다.
- [x] PDF generation, bundled/system font, page format, inspection과 visual-review contract를 확정한다.
- [x] test layer, stable npm command와 U3 handoff를 확정한다.
- [x] `nfr-requirements.md`와 `tech-stack-decisions.md`를 생성한다.

### 6.3 PBT-09와 품질 검증

- [x] TypeScript PBT framework와 test-runner integration을 선택하고 tech-stack decision에 기록한다.
- [x] Framework가 domain custom generators, automatic shrinking, seed/path replay와 selected runner integration을 지원함을 검증한다.
- [x] Selected framework를 direct project dependency로 반영하고 npm lockfile consistency를 검증한다.
- [x] 답변 뒤 NFR artifact generation turn에서 선택된 `site/` devDependencies와 lockfile을 실제로 반영하고 site-side gate를 실행한다. 이를 미루면 PBT-09는 blocking 상태로 남으므로 completion prompt를 제시하지 않는다.
- [x] Generator가 Functional Design의 Hangul/Unicode, optional fields, 3/6 boundaries, labelled invalid mutation과 relation semantics를 보존하도록 요구사항을 기록한다.
- [x] Local/CI run count, seed logging, replay syntax, shrink output와 no-silent-retry policy를 기록한다.
- [x] PBT-09 compliance를 독립 검토한다.
- [x] Requirement/story/edge/Functional Design traceability를 검증한다.
- [x] Relative link, Markdown table/fence와 question-format validation을 수행한다.
- [x] 표준 2-option NFR Requirements completion gate를 제시하고 명시적 artifact 승인을 기다린다.

## 7. NFR and Tech Stack Questions

각 `[Answer]:` 뒤에 선택한 문자 하나를 입력해 주세요. `X`를 선택하면 같은 줄에 구체적인 기준을 작성해 주세요.

### Question 1 — Responsive breakpoint와 viewport evidence

기존 site shell의 breakpoint와 profile page의 responsive acceptance viewport를 어떻게 고정할까요?

A) Profile에 관련된 기존 480/768px breakpoint를 재사용하고, unrelated post/sidebar의 960px rule은 변경하지 않는다. Chromium에서 320×800, 479/480×900, 767/768×1024와 1440×900을 검증하고 대표 mobile journey는 390×844에서 추가 실행한다. **(권장)**

B) 기존 480/768px shell breakpoint를 유지하면서 profile layout 전용 640/1024px breakpoint를 추가한다. Chromium에서 320×800, 479/480×900, 639/640×900, 767/768×1024, 1023/1024×900과 1440×900을 검증한다.

C) Profile-specific breakpoint를 추가하지 않고 fluid layout과 기존 shell rule만 사용한다. Chromium에서 320×800, 479/480×900, 767/768×1024와 1440×900을 검증한다.

X) Other (please describe after [Answer]: tag below) — breakpoint, 최소/대표 viewport와 boundary verification 범위를 구체적으로 적는다.

[Answer]: A) Profile에 관련된 기존 480/768px breakpoint를 재사용하고, unrelated post/sidebar의 960px rule은 변경하지 않는다. Chromium에서 320×800, 479/480×900, 767/768×1024와 1440×900을 검증하고 대표 mobile journey는 390×844에서 추가 실행한다.

어느 선택에서도 `documentElement.scrollWidth <= clientWidth`여야 하고, required fact와 CTA의 bounding box는 content viewport 안에 있어야 한다. 긴 한국어, URL, 기술명과 project title에는 ellipsis, line clamp 또는 fact text를 숨기는 max-height를 사용하지 않는다. Evidence URL은 자기 container 안에서 안전하게 wrap해야 한다.

### Question 2 — Playwright browser compatibility matrix

Playwright smoke와 cross-browser compatibility를 어떤 matrix로 실행할까요?

A) Chromium이 Q1의 전체 boundary/state matrix, accessibility, reduced-motion, print와 PDF flow를 소유한다. Firefox와 WebKit은 각각 320×800과 1280×800에서 JavaScript enabled/disabled route, keyboard, native details, visible server-rendered profile navigation과 overflow smoke를 실행한다. PDF generation은 Chromium 하나로 고정한다. **(권장)**

B) Chromium, Firefox와 WebKit 모두에서 320×800과 1280×800의 JavaScript enabled/disabled route, keyboard, accessibility와 layout smoke를 실행하고, Chromium은 Q1의 추가 boundary matrix를 실행한다. Print media와 PDF generation만 Chromium으로 제한한다.

C) Chromium에서 Q1의 전체 boundary/state matrix만 자동화하고 Firefox와 WebKit은 320×800 및 1280×800 release checklist로 수동 검증한다. PDF generation은 Chromium으로 고정한다.

X) Other (please describe after [Answer]: tag below) — engine, desktop/mobile project와 각 engine이 소유할 automated scenario를 적는다.

[Answer]: A) Chromium이 Q1의 전체 boundary/state matrix, accessibility, reduced-motion, print와 PDF flow를 소유한다. Firefox와 WebKit은 각각 320×800과 1280×800에서 JavaScript enabled/disabled route, keyboard, native details, visible server-rendered profile navigation과 overflow smoke를 실행한다. PDF generation은 Chromium 하나로 고정한다. 

Browser version은 lockfile이 고정한 Playwright release의 bundled engine으로 재현한다. Branded Chrome/Safari 설치에 의존하지 않는다.

Selected matrix의 Chromium, Firefox와 WebKit binary/cache 및 필요한 OS library는 explicit pinned Playwright install step으로 provision한다. 필요한 engine이 없으면 skip하지 않고 non-zero로 실패한다. U3가 이 stable install/cache command의 최소 Jenkins integration을 소유하며, 이 결정은 deployment나 general infrastructure mutation을 허가하지 않는다.

### Question 3 — WCAG 2.2 AA verification depth

이미 승인된 WCAG 2.2 AA 목표를 어떤 evidence gate로 검증할까요?

A) 두 route의 light/dark와 narrow/wide에서 closed-details 상태와 all-details-open 상태를 각각 `@axe-core/playwright`로 검사하고, semantic heading/landmark/name, keyboard-only navigation, visible focus, native details, 별도의 no-JS behavior, reduced-motion, contrast와 target-size assertion을 보완한다. Reading order, 색상 외 의미와 tagged PDF structure는 manual checklist도 통과해야 하며 blanket axe exclusion은 허용하지 않는다. **(권장)**

B) 두 route의 default theme narrow/wide에서 closed/open 상태에 axe와 semantic assertion을 적용하고 keyboard와 no-JS behavior를 별도 자동 검증한다. Light/dark visual contrast, focus appearance, target size와 print/PDF reading order는 release 전 manual checklist로 확인한다.

X) Other (please describe after [Answer]: tag below) — automated scan 상태, keyboard/no-JS scenario, numeric measurement와 manual assessment 범위를 적는다.

[Answer]: A) 두 route의 light/dark와 narrow/wide에서 closed-details 상태와 all-details-open 상태를 각각 `@axe-core/playwright`로 검사하고, semantic heading/landmark/name, keyboard-only navigation, visible focus, native details, 별도의 no-JS behavior, reduced-motion, contrast와 target-size assertion을 보완한다. Reading order, 색상 외 의미와 tagged PDF structure는 manual checklist도 통과해야 하며 blanket axe exclusion은 허용하지 않는다. 

자동 검사는 접근성 인증을 대신하지 않는다. Fixed AA oracle은 normal text 4.5:1, 18pt regular 또는 14pt bold 이상 large text와 non-text UI 3:1, custom target 24×24 CSS px 또는 기록된 WCAG 2.2 exception, logical Tab order와 author-created sticky content가 focus를 완전히 가리지 않는 것이다. Axe는 WCAG 2 A/AA, 2.1 A/AA와 2.2 AA tag를 사용한다. Axe script injection은 no-JS 동작 증거로 간주하지 않는다.

### Question 4 — Deterministic static performance budget

Content 길이를 임의로 제한하지 않으면서 U1의 정적 성능 회귀를 어떤 방식으로 gate할까요?

A) Deterministic structural budget을 사용한다. U1이 소유하는 hydrated component, 새 client JS chunk와 새 external runtime request는 0개다. Build manifest에서 `/resume` 또는 `/portfolio`가 새로 reach하는 profile-owned CSS resource의 unique gzip byte 합계를 24KiB 이하로 제한한다. Pre-existing shared shell CSS는 제외한다. 시간 기반 Lighthouse SLO는 두지 않는다. **(권장)**

B) A의 structural gate에 local production preview 기준 mobile Lighthouse performance 90 이상, LCP 2.0초 이하와 CLS 0.05 이하를 추가한다. 같은 pinned browser/host에서 반복해 timing variance를 관리한다.

C) Approved no-new-JS/no-new-runtime-request와 build success만 blocking으로 두고 CSS byte 또는 timing budget은 report-only로 남긴다.

X) Other (please describe after [Answer]: tag below) — blocking asset delta, CSS raw/gzip accounting, HTML size 또는 timing budget과 측정 환경을 적는다.

[Answer]: A) Deterministic structural budget을 사용한다. U1이 소유하는 hydrated component, 새 client JS chunk와 새 external runtime request는 0개다. Build manifest에서 `/resume` 또는 `/portfolio`가 새로 reach하는 profile-owned CSS resource의 unique gzip byte 합계를 24KiB 이하로 제한한다. Pre-existing shared shell CSS는 제외한다. 시간 기반 Lighthouse SLO는 두지 않는다. 

기존 BaseLayout의 global shell resource는 baseline으로 측정하며, U1이 새로 추가한 resource만 incremental budget에 포함한다.

### Question 5 — Print paper, margin과 page-count policy

전체 승인 상세를 보존하는 résumé print/PDF의 page contract를 어떻게 정할까요?

A) A4 portrait의 CSS `@page { size: A4; margin: 12mm; }`를 sole page authority로 사용하고 Letter는 ephemeral compatibility artifact로 readable reflow만 확인한다. Page count는 hard limit을 두지 않고 report한다. Printable content box 안에 전체 높이가 들어가는 entry는 page를 가로질러 분할하지 않고, 긴 detail만 잘림 없이 나눈다. **(권장)**

B) A와 같은 A4/12mm/pagination rule을 사용하되 PDF가 4 page를 넘으면 content를 자르지 않고 blocking failure로 처리해 fact/content review로 되돌린다.

C) A와 같은 A4/12mm/pagination rule을 사용하되 PDF가 3 page를 넘으면 content를 자르지 않고 blocking failure로 처리해 fact/content review로 되돌린다.

X) Other (please describe after [Answer]: tag below) — paper, orientation, margin, hard/soft page count와 split/orphan rule을 적는다.

[Answer]: A) A4 portrait의 CSS `@page { size: A4; margin: 12mm; }`를 sole page authority로 사용하고 Letter는 ephemeral compatibility artifact로 readable reflow만 확인한다. Page count는 hard limit을 두지 않고 report한다. Printable content box 안에 전체 높이가 들어가는 entry는 page를 가로질러 분할하지 않고, 긴 detail만 잘림 없이 나눈다.

모든 선택에서 committed/public artifact는 `page.pdf({ preferCSSPageSize: true })`로 canonical CSS page rule을 따른다. Ephemeral Letter compatibility check만 test-only `@page { size: Letter; }` override로 별도 생성하며 public CSS/PDF를 바꾸지 않는다. Print CSS 자체가 closed `<details>`의 승인된 내용을 전부 표시해야 하며 generation script가 `open` attribute를 임시로 설정해 우회하지 않는다. Global/local navigation, toggle affordance, progress와 screen-only decoration을 숨긴다. Body text는 10pt 이상, line-height 1.35 이상이고, heading은 적어도 첫 following content block과 같은 page에 남으며, fact/link label은 clip되지 않고 PDF URL annotation은 목적지와 일치해야 한다. 흑백에서도 hierarchy가 유지되어야 한다.

### Question 6 — PDF generation engine과 Korean font

`/resume`의 반복 가능한 offline PDF generation에 사용할 Korean font distribution을 어떻게 고정할까요?

A) Upstream Pretendard v1.3.9의 unmodified full variable WOFF2와 SIL OFL 1.1 notice를 repository asset으로 고정한다. Profile screen/print/PDF가 같은 local family를 사용해 단일 font file과 가장 단순한 offline generation path를 얻되 larger static asset을 수용한다.

B) Lockfile-pinned `pretendard@1.3.9` package를 build-time font source로 사용하고 official Unicode-range WOFF2 subset과 CSS를 same-origin static asset으로 materialize한다. Delivered font bytes를 줄이는 대신 package/copy-integrity와 여러 subset asset을 관리한다. **(권장)**

X) Other (please describe after [Answer]: tag below) — exact font family/version/license, full/subset distribution, same-origin source와 offline CI 재현 방법을 적는다.

[Answer]: B) Lockfile-pinned `pretendard@1.3.9` package를 build-time font source로 사용하고 official Unicode-range WOFF2 subset과 CSS를 same-origin static asset으로 materialize한다. Delivered font bytes를 줄이는 대신 package/copy-integrity와 여러 subset asset을 관리한다.

PDF engine은 모든 선택에서 lockfile-pinned `@playwright/test`의 bundled Chromium과 `page.pdf()`로 고정한다. Q5-selected page contract, `preferCSSPageSize: true`, `tagged: true`, `outline: true`, `printBackground: false`를 사용한다. Profile/print는 legacy global font와 구별되는 selected same-origin family를 명시하고, local production preview에서 font response가 성공한 뒤 `document.fonts.ready`와 `document.fonts.check()`가 그 family를 확인해야 한다. PDF generation은 loopback 외 request를 모두 차단하고 successful non-loopback request가 0임을 단언한다. Existing jsDelivr Pretendard/KaTeX stylesheet는 profile route에서 suppress하거나 aborted baseline request로 남길 수 있지만 selected PDF font가 될 수 없다. Network font fetch, hand-authored PDF body 또는 PDF-only fact source는 허용하지 않는다. Atomic replace policy는 Q12를 따른다.

### Question 7 — PDF semantic and visual inspection stack

PDF actual output의 full fact identity, visible parity와 layout regression을 어떤 machine-readable binding/evidence로 검증할까요?

A) Public asset 밖의 `ResumeDocumentInspectionReceipt`가 exact PDF SHA-256, source fingerprint, canonical manifest digest와 full fact/order mapping을 보존한다. `pdfjs-dist`가 actual PDF의 page text와 link annotation을 추출하고 deterministic occurrence/order mapper가 receipt entry와 연결한다. Local PDF.js viewer에서 actual PDF page를 render해 Playwright structural/screenshot review와 manual review를 수행하되 pixel delta 자체는 blocking으로 두지 않는다. **(권장)**

B) A와 같은 hash-bound inspection receipt와 `pdfjs-dist` semantic extraction을 사용하고, pinned environment의 local PDF.js viewer screenshot도 approved baseline 대비 changed-pixel ratio 0.5% 초과 시 blocking으로 처리한다. Baseline update에는 명시적 review가 필요하다.

C) Direct devDependency로 선택한 PDF postprocessor가 canonical manifest digest와 source fingerprint를 PDF XMP metadata 또는 attachment에도 넣어 self-identifying PDF를 만들고, final-byte hash receipt와 `pdfjs-dist` visible text/link 검증을 함께 사용한다. Post-process 뒤 tagged structure와 outline이 그대로 검증되어야 하며 actual PDF viewer screenshot은 B와 같은 0.5% blocking threshold를 사용한다.

X) Other (please describe after [Answer]: tag below) — PDF byte와 source/manifest identity를 묶는 channel, extractor/renderer, semantic normalization, layout check와 visual threshold/manual boundary를 적는다.

[Answer]: A) Public asset 밖의 `ResumeDocumentInspectionReceipt`가 exact PDF SHA-256, source fingerprint, canonical manifest digest와 full fact/order mapping을 보존한다. `pdfjs-dist`가 actual PDF의 page text와 link annotation을 추출하고 deterministic occurrence/order mapper가 receipt entry와 연결한다. Local PDF.js viewer에서 actual PDF page를 render해 Playwright structural/screenshot review와 manual review를 수행하되 pixel delta 자체는 blocking으로 두지 않는다. 


Raw flat PDF text만으로 `factId`, semantic path, entity/order와 source fingerprint를 복원했다고 간주하지 않는다. Receipt 또는 embedded channel이 identity를 보존하고 actual PDF extraction이 visible text/URL evidence를 독립 검증해야 한다. PDF.js structure tree는 존재하고 résumé heading/link order와 일치해야 하며, document outline의 destination은 모두 resolve되고 URL link annotation은 manifest destination과 같아야 한다. Manual reading-order review도 유지한다. Extraction은 NFC, line-wrap whitespace와 soft hyphen만 명시적으로 normalize하며 duplicate value 또는 split/merge가 ambiguous하면 실패한다. Missing, unreadable, stale-source, wrong public path, missing/extra/changed/reordered fact, structure/outline 또는 link annotation mismatch는 즉시 실패한다. PDF binary byte equality는 content-parity oracle로 사용하지 않지만 SHA-256은 receipt가 검사한 exact bytes를 식별한다.

### Question 8 — TypeScript test runner와 PBT framework

PBT-09를 충족할 U1 TypeScript runner/framework 조합을 무엇으로 선택할까요?

A) Astro `getViteConfig()` 기반 Vitest를 새 site owner-local example/unit runner로 확립하고 `fast-check`와 공식 connector `@fast-check/vitest`를 사용한다. Custom arbitraries, automatic shrinking, seed/path replay와 runner lifecycle을 한 stack으로 통합한다. **(권장)**

B) Astro `getViteConfig()` 기반 Vitest를 새 site owner-local example/unit runner로 확립하고 standalone `fast-check`를 각 test에서 `fc.assert`로 실행한다. Shared setup의 global configuration, lifecycle과 timeout을 직접 관리하며 connector dependency는 추가하지 않는다.

X) Other (please describe after [Answer]: tag below) — runner, PBT framework/connector와 four PBT-09 capability 통합 방법을 적는다.

[Answer]:  A) Astro `getViteConfig()` 기반 Vitest를 새 site owner-local example/unit runner로 확립하고 `fast-check`와 공식 connector `@fast-check/vitest`를 사용한다. Custom arbitraries, automatic shrinking, seed/path replay와 runner lifecycle을 한 stack으로 통합한다. 
 
선택된 non-built-in runner/framework/connector는 NFR Requirements 완료 전에 `site/package.json` direct devDependency와 npm lockfile에 실제 반영되어야 한다. Framework 없이 custom random loop를 작성하는 선택은 PBT-09를 충족하지 않는다.

### Question 9 — PBT run count, seed replay와 shrinking policy

승인된 12개 U1 umbrella property와 22 business-rule, 15 domain, 9 frontend refinement의 mapped obligation을 어떤 실행량으로 운영할까요?

A) Validated positive integer `PBT_RUNS`로 global run count를 제어하고 local default는 actual property assertion당 100 runs, CI는 1,000 runs로 둔다. **(권장)**

B) `PBT_RUNS`를 같은 방식으로 사용하고 local과 CI 모두 actual property assertion당 100 runs를 실행한다.

C) `PBT_RUNS`를 같은 방식으로 사용하고 local과 CI 모두 actual property assertion당 250 runs를 실행한다.

X) Other (please describe after [Answer]: tag below) — local/CI runs, seed 생성·로그, replay syntax, shrinking과 retry rule을 적는다.

[Answer]: A) Validated positive integer `PBT_RUNS`로 global run count를 제어하고 local default는 actual property assertion당 100 runs, CI는 1,000 runs로 둔다.

한 canonical test가 여러 refinement ID를 충족할 수 있으며 traceability alias마다 같은 semantic property를 중복 실행하지 않는다. Wrapper는 Vitest worker 시작 전에 signed 32-bit suite seed 하나를 만들거나 `PBT_SEED` override를 받아 항상 출력하고 모든 property에 전달한다. `PBT_PATH`는 `PBT_SEED`와 exact file/test focus가 함께 있을 때만 사용하며 전체 suite에 global path를 적용하지 않는다. Default fast-check failure output의 seed, path, shrunk counterexample와 shrink count를 보존하고 flaky retry와 normal-run `endOnFailure`을 금지한다. Time limit을 두면 incomplete run이 성공하지 않도록 `markInterruptAsFailure: true`를 사용한다. Generator는 main path에서 `fc.gen()`을 피하고 shrink-friendly composed arbitrary를 사용하며, 한 labelled invalid mutation을 제외한 domain invariant를 shrink 중에도 유지한다.

### Question 10 — Unit, render와 browser test layer

U1의 pure contract, static markup와 actual route를 어떤 test layer로 나눌까요?

A) Vitest는 domain/normalization/validation/selectors, renderer-neutral presentation tree, metadata/JSON-LD와 manifest example/PBT를 소유한다. Playwright는 production build/preview의 actual Astro route, no-JS, keyboard, accessibility, responsive, print와 PDF flow를 소유한다. Experimental Astro Container API는 blocking gate에 사용하지 않는다. **(권장)**

B) A에 experimental Astro Container API 기반 `.astro` component unit tests를 추가하고, Playwright는 browser behavior만 검증한다.

C) Vitest는 C01/C03/C11 pure domain과 PBT만 소유하고, 모든 C02/C04/C05 markup/metadata integration은 Playwright actual-route tests로 검증한다.

X) Other (please describe after [Answer]: tag below) — pure, component/static markup와 browser/PDF test ownership을 적는다.

[Answer]: A) Vitest는 domain/normalization/validation/selectors, renderer-neutral presentation tree, metadata/JSON-LD와 manifest example/PBT를 소유한다. Playwright는 production build/preview의 actual Astro route, no-JS, keyboard, accessibility, responsive, print와 PDF flow를 소유한다. Experimental Astro Container API는 blocking gate에 사용하지 않는다.

Stable npm script는 최소 `test:unit`, `test:pbt`, `test:e2e`, `resume:pdf`, `resume:pdf:verify`로 분리하고, U3는 구현을 복제하지 않고 이 command를 집계한다.

### Question 11 — Coverage and maintainability gate

새 profile code의 coverage를 어떤 completion gate로 관리할까요?

A) Numeric line coverage threshold는 두지 않는다. 대신 모든 U1 Functional Design property/N/A, named negative path, required Story/AC와 edge scenario가 traceability table의 named example/PBT/browser/document test에 연결되어야 한다. 미연결 obligation은 blocking이다. **(권장)**

B) A의 traceability gate에 `@vitest/coverage-v8`을 추가하고 `site/src/lib/profile/`의 branch coverage 90%와 statement coverage 90%를 적용한다. Presentation `.astro`는 Playwright evidence로 관리하고 numeric denominator에서 제외한다.

C) A의 traceability gate에 `@vitest/coverage-v8`을 추가하고 새 profile TypeScript code의 branch/statement coverage 80%를 적용한다. Presentation `.astro`는 Playwright evidence로 관리한다.

X) Other (please describe after [Answer]: tag below) — traceability와 numeric coverage 대상/threshold/exclusion을 적는다.

[Answer]: A) Numeric line coverage threshold는 두지 않는다. 대신 모든 U1 Functional Design property/N/A, named negative path, required Story/AC와 edge scenario가 traceability table의 named example/PBT/browser/document test에 연결되어야 한다. 미연결 obligation은 blocking이다.

어느 선택에서도 coverage percentage가 approved-fact review, web/print/PDF parity, example scenario 또는 PBT obligation을 대신하지 않는다.

### Question 12 — Fail-closed document reliability와 retry

Browser/local-server/PDF side effect가 실패할 때 retry와 last-known file을 어떻게 처리할까요?

A) 자동 retry 없이 한 번 실패하면 non-zero로 종료한다. Verified atomic replace와 stale-file rule은 아래 공통 계약을 따른다.

B) Browser launch 또는 local preview readiness 같은 분류된 transient startup error만 한 번 재시도한다. Source/parity/layout mismatch는 재시도하지 않고 즉시 실패한다. **(권장)**

C) Transient browser/local-server error를 최대 세 번 재시도하되 각 attempt와 원인을 기록한다. Source/semantic/layout mismatch는 재시도하지 않는다.

X) Other (please describe after [Answer]: tag below) — retryable error, attempt 수, diagnostics, temp/atomic replace와 stale-file rule을 적는다.

[Answer]: B) Browser launch 또는 local preview readiness 같은 분류된 transient startup error만 한 번 재시도한다. Source/parity/layout mismatch는 재시도하지 않고 즉시 실패한다.

Temporary PDF는 `site/public/`과 같은 filesystem의 non-public temporary path에 생성한다. Generation 뒤 source fingerprint를 다시 확인하고 Q7 semantic, structure와 actual-PDF review gate를 모두 통과시킨 뒤에만 atomic rename한다. 실패하면 이전 public file은 보존하되 current source에 대해 stale로 판정하고 non-zero로 종료하며, diagnostics/receipt는 `public/` 밖에 둔다. Deployment는 별도 단계이므로 U1 local failure가 현재 배포본을 덮어쓰지 않는다. Error output은 failed stage, attempt, source fingerprint, file/path와 mismatch rule을 식별해야 한다.

### Question 13 — Public link integrity and offline verification

Tests가 network-independent여야 한다는 승인과 “존재하는 공개 link만 CTA로 제공” 요구를 어떻게 함께 충족할까요?

A) Automated gate는 URL scheme/host/path, internal route existence와 approved fact mapping을 offline으로 검증한다. External reachability evidence는 fact inventory에 URL, expected destination, verifier와 checked-at timestamp로 기록하고 final user fact approval에서 검토한다. CI/runtime network check는 추가하지 않는다. **(권장)**

B) A의 deterministic offline gate와 evidence record에 별도 opt-in `verify:external-links` pre-release command를 추가한다. 이 command는 GET, 최대 5 redirect, 10초 timeout과 final 2xx를 확인하고 HEAD-only failure로 link를 broken 처리하지 않는다. Unit/PBT/CI 기본 gate와 분리하고 실패하면 public-ready completion을 막는다.

X) Other (please describe after [Answer]: tag below) — offline validation, external reachability 확인 주체/시점과 blocking 범위를 적는다.

[Answer]: A) Automated gate는 URL scheme/host/path, internal route existence와 approved fact mapping을 offline으로 검증한다. External reachability evidence는 fact inventory에 URL, expected destination, verifier와 checked-at timestamp로 기록하고 final user fact approval에서 검토한다. CI/runtime network check는 추가하지 않는다. 

Profile route는 public static content이므로 authentication, authorization, session, form submission과 secret storage는 U1 NFR에서 N/A다. Analytics나 contact tracking도 추가하지 않는다.

### Question 14 — Availability, scalability and runtime observability scope

Existing S3/CloudFront static delivery를 사용하는 U1에 별도 production SLO나 runtime monitoring을 둘까요?

A) U1-specific traffic target, uptime SLO, load test, runtime telemetry와 health-check infrastructure를 추가하지 않는다. Local production preview에서 `/resume`와 `/portfolio`의 200 HTML/non-empty body, `/resume.pdf`의 200 `application/pdf`/non-empty body, source fingerprint와 parity를 gate하고 production scalability/availability는 existing static delivery contract에 위임한다. **(권장)**

B) A의 local gate를 U1 completion contract로 유지하고, 월 99.9% availability와 5분 간격 `/resume`, `/portfolio`, `/resume.pdf` external synthetic check를 separately authorized follow-up candidate로 기록한다. Monitoring authority와 owner가 승인되기 전에는 이 candidate가 U1 completion을 막거나 구현을 허가하지 않는다.

X) Other (please describe after [Answer]: tag below) — traffic/load target, availability SLO, synthetic check, telemetry와 infrastructure authorization boundary를 적는다.

[Answer]: A) U1-specific traffic target, uptime SLO, load test, runtime telemetry와 health-check infrastructure를 추가하지 않는다. Local production preview에서 `/resume`와 `/portfolio`의 200 HTML/non-empty body, `/resume.pdf`의 200 `application/pdf`/non-empty body, source fingerprint와 parity를 gate하고 production scalability/availability는 existing static delivery contract에 위임한다. 

어느 선택에서도 현재 Infrastructure, Terraform, AWS resource, deployment 또는 CloudFront cache policy를 이 NFR Requirements stage에서 변경하지 않는다.

## 8. Answer Validation and Generation Gate

- **Expected Answers**: Q1~Q14의 14개 non-empty answer
- **Current Answers**: 14/14
- **Submitted Choices**: A/A/A/A/A/B/A/A/A/A/A/B/A/A
- **Validation Status**: 통과 — 모든 답변이 유효한 선택지와 일치하며 명확하고 상호 일관적이고 기존 승인 경계와 호환됨
- **Clarification Status**: 불필요
- **PBT-09 Status**: Compliant — Vitest 4.1.10, fast-check 4.9.0, `@fast-check/vitest` 0.4.1 direct devDependencies와 lockfile, structured generator, generated-case shrinking, same-seed/path replay와 Vitest integration evidence 통과
- **Artifact Generation**: 완료; `nfr-requirements.md`와 `tech-stack-decisions.md`가 독립·기계 검증을 통과했고 사용자 승인을 기다림
- **Artifact Approval**: 2026-07-24T06:02:15Z, user input `"다음 단계로 진행해"`

질문 답변은 tool/NFR policy 승인이지 현재 question turn의 dependency installation이나 production fact approval가 아니다. 답변 검증 뒤 NFR artifact를 생성하고 선택된 PBT dependency를 `site/package.json`/lockfile에 실제 반영·검증한 다음에만 PBT-09를 완료로 판정하고, 별도의 표준 artifact approval gate를 제시한다.

## 9. Change and Extension Boundary

- 질문 생성과 answer collection turn은 `aidlc-docs/` documentation만 변경했다.
- Artifact generation turn은 PBT-09를 위해 isolated U1 worktree의 `site/package.json`, npm lockfile, `site/vitest.config.ts`와 framework capability smoke만 변경했다.
- Profile product source, generated public output, PDF binary, external Vault, Git ref, remote branch, Terraform/AWS resource와 deployment는 변경하지 않는다.
- **OBSIDIAN-01**: root `AGENTS.md`는 계속 binding이다.
- **OBSIDIAN-02**: authored/generated boundary와 dirty primary `main`의 unrelated change를 보존하고 PBT tooling은 focused feature worktree에만 반영했다.
- **OBSIDIAN-03**: clean lock install, TypeScript check, PBT framework smoke와 Astro build를 통과했다.
- **OBSIDIAN-04**: focused U1 branch/base contract를 유지하고 새 branch를 만들지 않는다.
- **OBSIDIAN-05**: 하나의 active AI-DLC run만 유지한다.
- Security와 Resiliency extension은 disabled로 유지한다. PBT Full의 `PBT-09`는 compliant이며 이 stage에 blocking finding이 없다.
