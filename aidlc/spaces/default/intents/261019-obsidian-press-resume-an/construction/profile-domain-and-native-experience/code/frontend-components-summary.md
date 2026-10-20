# U1 Frontend Components Summary — Profile Domain and Native Experience

## 문서 상태

- **단계**: CONSTRUCTION — U1 Code Generation, Part 2 Generation, Step 18
- **상태**: 완료 — Step 18 frontend verification과 traceability closure 통과
- **완료 시각**: 2026-07-25T05:13:03Z
- **Unit**: U1 Profile Domain and Native Experience
- **Bounded Context**: Profile Experience
- **Project Type**: Brownfield
- **Implementation Worktree**: `/private/tmp/obsidian-blog-u1-nfr`
- **Feature Branch**: `codex/feature/resume-profile-experience`
- **요약 범위**: Steps 16~17의 C02/C04/C05 frontend 구현과 Step 18의 test/traceability closure
- **PBT Enforcement**: Full
- **Deployment Authority**: 없음

이 문서는 승인된 Functional Design의 frontend contract와 NFR Design의 ownership 경계를 구현 source에 대응시키고, Step 18의 canonical example/PBT/static-output 증거와 obligation-map closure를 기록한다.

## 1. 결과와 현재 완료 경계

구현된 frontend slice는 하나의 fact-approved production assembly에서 두 renderer-neutral presentation tree를 만들고, 이를 정적 Astro route와 기존 site shell에 조합한다.

- C02는 frozen résumé/portfolio presentation tree, 정적 semantic Astro component와 profile/print style을 소유한다.
- C04는 `BaseLayout`의 backward-compatible typed metadata/JSON-LD host와 pathname-bound resource policy를 소유한다.
- C05는 desktop/mobile이 공유하는 immutable primary-navigation state를 소유한다.
- `/resume`와 `/portfolio`는 production-only fact-approved source, C03 metadata builder와 C02 presentation builder를 조합한다.
- Profile content, local navigation, contact/evidence/PDF action과 native disclosure content는 최초 server-rendered HTML에 존재한다.
- Profile component나 route는 새 client state, client directive, Preact island, runtime API, form 또는 external runtime service를 추가하지 않는다.

이 문서가 완료를 주장하지 않는 후속 범위는 다음과 같다.

- Step 19 clean preview, request ledger, manifest-based CSS budget/new-JS analyzer와 stable browser command
- Step 20 full responsive/browser/JavaScript-off/keyboard/Axe/manual accessibility/print matrix
- Step 21 actual PDF rendering, PDF.js inspection과 expected=web=print=PDF manifest parity
- Step 22 release journal, single-writer promotion/rollback와 five-command routing completion
- Step 23 exact-SHA human review와 reviewed `site/public/resume.pdf` promotion

따라서 정적 frontend source가 존재한다는 사실은 WCAG 2.2 AA evidence, canonical resource-budget pass, successful non-loopback request 0, reviewed PDF 또는 deployment readiness를 뜻하지 않는다.

## 2. 생성·수정 파일

### 2.1 C02 renderer-neutral presentation과 Astro components

| File | 책임 |
|---|---|
| `site/src/components/profile/presentation.ts` | Validated résumé/portfolio projection을 frozen semantic read model로 변환하고 fact ID, entity ID/order, optional omission과 typed block shape를 보존 |
| `site/src/components/profile/ProfileShell.astro` | Route별 단 하나의 `h1`, labelled profile-local navigation과 content slot을 조합 |
| `site/src/components/profile/ProfileLocalNavigation.astro` | `홈 → Résumé → Portfolio`의 normal anchors와 exact current-page semantics 출력 |
| `site/src/components/profile/ContentBlocks.astro` | Typed paragraph 또는 ordered/unordered list를 text node와 `p`/`ol`/`ul`/`li`로 출력 |
| `site/src/components/profile/ContactActions.astro` | Approved contact, evidence와 document action을 purpose-bearing normal anchors로 출력 |
| `site/src/components/profile/ResumeContent.astro` | Résumé direct-section order, optional sections와 project/education/certification summaries 출력 |
| `site/src/components/profile/ResumeEntry.astro` | Initially closed native `details/summary`, item-specific logical heading, summary, detail blocks와 optional evidence 출력 |
| `site/src/components/profile/PortfolioContent.astro` | Portfolio intro와 canonical project collection 출력 |
| `site/src/components/profile/CaseStudy.astro` | Addressable semantic project `article`, visible summary, six ordered dimensions와 optional evidence 출력 |

Presentation builder는 이미 validated된 projection을 validate, sort, repair, truncate 또는 infer하지 않는다. Fixed navigation label, section/dimension heading과 purpose-bearing action label을 제외하고 새로운 fact나 claim을 만들지 않는다.

### 2.2 Routes와 shared frontend contracts

| File | 책임 |
|---|---|
| `site/src/pages/resume.astro` | Approved résumé projection, C03 metadata, C11 document-link contract와 C02 components를 조합 |
| `site/src/pages/portfolio.astro` | Approved portfolio projection, C03 metadata와 C02 components를 조합 |
| `site/src/lib/layout/json-ld.ts` | Typed JSON-LD의 script-safe serialization, extraction과 structural round-trip contract |
| `site/src/lib/layout/profile-resources.ts` | Exact profile path의 local-font-only head policy와 legacy-route resource preservation |
| `site/src/lib/navigation.ts` | Fixed primary/profile-local models와 segment-aware current-state resolver |

두 page component는 profile fact, title, description, canonical 또는 JSON-LD literal을 route-local string으로 복제하지 않는다. Metadata construction 또는 production approval gate가 실패하면 partial page를 만들지 않고 build를 실패시킨다.

### 2.3 Profile style ownership

| Layer | File | Owner와 책임 |
|---|---|---|
| Font entry | `site/src/styles/profile/font.css` | C02 authored entry; S04가 materialize한 distinct `RVNNT Profile` generated subset을 참조 |
| Foundation | `site/src/styles/profile/foundation.css` | C02 shared typography, spacing, shell, navigation/action targets와 long-content wrapping |
| Résumé | `site/src/styles/profile/resume.css` | C02 résumé section, card와 native details screen layout |
| Portfolio | `site/src/styles/profile/portfolio.css` | C02 project article와 six-dimension screen layout |
| Print | `site/src/styles/profile/print.css` | C02/C11 contract의 résumé-only A4 print, CSS detail expansion, omission과 fragmentation |

Generated WOFF2, generated font CSS, `site/dist/`와 private verification artifacts는 authored frontend behavior source가 아니다.

### 2.4 Modified existing shell files

| File | 변경 |
|---|---|
| `site/src/layouts/BaseLayout.astro` | Legacy props를 보존하면서 exclusive typed profile metadata branch, one authoritative head set, ordered safe JSON-LD host와 typed resource policy 추가 |
| `site/src/components/Header.astro` | One immutable four-item navigation state를 desktop와 mobile representation에 공유하고 profile links/current state 추가 |
| `site/src/islands/MobileNav.tsx` | Existing path를 유지하면서 `useState`/event-driven menu를 initially closed native `details/summary/nav` SSR representation으로 변경 |
| `site/src/styles/global.css` | Existing mobile-navigation selector에 native disclosure marker, label과 target styling을 맞춤 |

Existing Search와 ThemeToggle behavior는 변경하지 않는다.

## 3. C02 presentation contract

### 3.1 Résumé tree

`buildResumePresentation()`은 present optional section만 남긴 다음 아래 direct-section order를 보존한다.

1. `소개·연락·PDF`
2. `핵심 역량`
3. `경력·대표 성과`
4. `대표 프로젝트 요약`
5. `교육` — present할 때만
6. `자격` — present할 때만

Career group은 Achievement group보다 먼저 온다. 각 entry는 approved ID/order와 source fact IDs를 유지하고 `initiallyOpen: false`다. Career summary에는 role, organization, required period와 one-line summary가 있으며 Achievement summary에는 title, optional period와 one-line summary가 있다. Required detail blocks는 같은 disclosure의 server-rendered content로 남는다.

Education, certification 또는 optional period가 absent이면 해당 optional property/node를 생략한다. Additional-contact와 evidence collection은 renderer-neutral tree에서 typed empty array로 남지만, empty collection의 heading, wrapper와 anchor markup은 출력하지 않는다. Disabled CTA, `#` link 또는 “준비 중” placeholder도 만들지 않는다.

### 3.2 Portfolio tree

`buildPortfolioPresentation()`은 canonical 3~6 project vector를 그대로 유지한다. 각 project는 approved ID/order, visible outcome summary와 다음 dimension vector를 갖는다.

1. `문제`
2. `역할`
3. `핵심 결정`
4. `구조`
5. `결과`
6. `배운 점`

각 dimension의 typed blocks와 present evidence order를 보존한다. Evidence가 없으면 evidence heading, container와 anchor를 함께 생략한다. Project content를 tab, carousel, modal 또는 collapsed client state로 축약하지 않는다.

### 3.3 Static semantics와 automation hooks

- `ProfileShell`은 기존 `BaseLayout`의 Header, `main` 또는 footer를 복제하지 않는다.
- Route `h1` 바로 뒤에 distinct accessible name을 가진 profile-local `nav`가 온다.
- Résumé disclosure는 `open` attribute가 없는 native `details/summary`다.
- Résumé entry title은 summary 안에서 `role="heading"`과 `aria-level="4"`를 사용한다. Heading-order 검사는 native heading만 스캔하지 않고 이 logical heading도 포함해야 한다.
- Portfolio project는 `id="project-{approved-id}"`를 가진 semantic `article`이다.
- Content block은 raw HTML, arbitrary Markdown 또는 unvalidated `set:html`을 사용하지 않는다.
- Repeated entity/action hooks는 approved IDs를 suffix로 사용한다. 주요 pattern은 `profile-shell-{route}`, `profile-local-navigation-link-{id}`, `resume-entry-details-{id}`, `resume-entry-summary-{id}`, `resume-content-{entity}-{id}`, `case-study-article-{id}`, `case-study-dimension-{dimension}-{id}`와 `{variant}-link-{action-id}`다.

“Profile content가 raw HTML을 사용하지 않는다”는 claim은 C02 content components에 한정한다. `BaseLayout`의 validated JSON-LD payload와 Header의 trusted build-time SVG는 승인된 별도 `set:html` 경계다.

## 4. C04/C05 shell integration

### 4.1 Metadata와 JSON-LD host

`BaseLayout`은 profile metadata를 받을 때 title, description, canonical, Open Graph와 Twitter tag를 각각 하나의 authoritative set으로 출력한다. Metadata pathname과 actual route가 다르거나 legacy props가 conflicting value를 함께 제공하면 어느 쪽도 임의로 우선하지 않고 build를 실패시킨다.

Typed JSON-LD document는 C03 input order를 보존한다. Serializer는 `<`, `>`, `&`, U+2028과 U+2029를 script-safe escape로 바꾸고, document가 absent/empty이면 JSON-LD script를 출력하지 않는다. Page-local raw JSON string이나 visible fact보다 강한 claim은 허용하지 않는다.

### 4.2 Resource policy

- `/resume`와 `/portfolio` 및 trailing-slash variant는 same-origin profile font policy를 선택하고 existing jsDelivr preconnect, external Pretendard와 unused KaTeX stylesheet를 head에서 제외한다.
- Existing non-profile route는 prior three-resource default를 유지한다.
- Unknown, mixed 또는 injected policy는 fail closed한다.

이 source policy는 actual browser request evidence를 대신하지 않는다. Manifest reachability와 runtime request ledger의 canonical verification은 Step 19가 소유한다.

### 4.3 Shared navigation

Primary navigation의 exact visible vector는 `Tags → Graph → Résumé → Portfolio`다. Profile-local navigation은 `홈 → Résumé → Portfolio`다. Resolver는 query/fragment를 current identity에 사용하지 않고 root 이외의 trailing slash와 slash-delimited descendant를 같은 item에 매핑하며 `/resume-old` 같은 prefix collision은 match하지 않는다. 어떤 pathname에서도 current item은 최대 하나다.

Desktop Header와 mobile representation은 같은 `NavigationState[]`를 받는다. Mobile markup은 hydration 이전부터 네 anchor를 모두 포함하는 native disclosure다.

## 5. CSS와 print contract

Profile styles는 existing `--c-` color/surface tokens를 재사용하고 새 unprefixed color/surface variable을 만들지 않는다. Screen layout은 mobile-first이며 existing boundary를 다음과 같이 재사용한다.

- Phone: `max-width: 479px`
- Small tablet: `min-width: 480px` and `max-width: 767px`
- Desktop profile layout: `min-width: 768px`
- Unrelated post/sidebar `960px` behavior는 변경하지 않는다.

Shared flex/grid child에 `min-width: 0`을 두고 long text, URL, heading과 action label은 `overflow-wrap: anywhere`로 container 안에서 wrap한다. Ellipsis, line clamp, content-hiding `max-height` 또는 profile content truncation을 추가하지 않는다.

Résumé-only print layer는 다음 source contract를 갖는다.

- `@page { size: A4; margin: 12mm; }`
- Body type `10pt`와 line-height `1.4`
- Closed `details` detail content의 CSS-only `display: block`
- Global/local navigation, progress, toggle affordance, document CTA와 screen-only decoration omission
- Heading과 first following block의 page keep
- Fitting small card와 `details.resume-entry`의 `break-inside: avoid-page`
- Long `.resume-entry-detail-content`의 `break-inside`/`page-break-inside: auto`
- Black/gray text, border와 spacing을 통한 grayscale hierarchy

이 규칙의 actual Chromium pagination, A4/Letter compatibility, link annotation, clipping와 visual evidence는 Steps 20~21에서 검증한다. Source inspection이나 ad hoc gzip 계산은 Step 19의 canonical provenance/reachability analyzer를 대체하지 않는다.

## 6. No-new-profile-island 결과의 정확한 의미

다음 범위에서 new profile island는 없다.

- `site/src/components/profile/`와 두 profile page에는 `client:*` directive, client state, event script 또는 interactive framework component가 없다.
- `MobileNav.tsx`는 existing filename/path를 유지하지만 Header가 client directive 없이 render하며 native disclosure가 open state를 소유한다.
- Required profile/local/global anchors와 résumé details content는 hydration 성공에 의존하지 않는다.

이는 profile route에 JavaScript나 hydration이 전혀 없다는 뜻이 아니다. Existing `Search client:idle`, `ThemeToggle client:load`, Header search trigger와 BaseLayout theme/progress/back-to-top scripts는 inherited shell behavior로 남는다. Step 19 analyzer가 판정하는 값도 “U1-owned hydrated component/new client chunk 0”이지 전체 route JavaScript 0이 아니다.

## 7. Traceability handoff

| Frontend obligation | Implementation | Canonical property / complementary evidence | 현재 경계 |
|---|---|---|---|
| Résumé hierarchy, omission와 closed disclosure | `presentation.ts`, `ResumeContent.astro`, `ResumeEntry.astro` | `U1-P07`, `P-C02-01/03`, `FD-P-C02-01/03`; `PBT-U1-PRESENTATION` + named example/static output | Step 18 canonical closure 완료; browser layout은 후속 단계 |
| Portfolio completeness와 six-dimension order | `presentation.ts`, `PortfolioContent.astro`, `CaseStudy.astro` | `U1-P07`, `P-C02-02/03`, `FD-P-C02-02/03`; `PBT-U1-PRESENTATION` + named example/static output | Step 18 canonical closure 완료; browser layout은 후속 단계 |
| Static interaction surface와 profile-local navigation | Profile actions/shell/components | `FD-P-C02-03`, `P-C05-03`; server output example | Initial HTML closure 완료; keyboard/focus는 Step 20 |
| JSON-LD safe round-trip와 optional host | `json-ld.ts`, `BaseLayout.astro` | `U1-P09`, `P-C04-01/02`, `FD-P-C04-01/02`; `PBT-U1-METADATA-NAVIGATION` + head-output example | Pure/static host closure 완료; browser 관찰은 후속 단계 |
| Shared desktop/mobile navigation | `navigation.ts`, `Header.astro`, `MobileNav.tsx` | `U1-P10`, `P-C05-01~03`, `FD-P-C05-01/02`; navigation PBT + SSR parity example | SSR parity/isolation closure 완료; breakpoint/keyboard는 Step 20 |
| Responsive/content preservation | Profile style layers | NFR-U1-001 source contributor | Actual viewport matrix is Steps 19~20 |
| WCAG semantic surface | Semantic headings/nav/details/anchors | NFR-U1-003 source contributor | Axe/keyboard/focus/manual evidence is Step 20 |
| Ownership와 complete traceability | Owner-local files and obligation map | NFR-U1-011 | Step 18 owner-local closure 완료 |
| Search/share consistency | C03 metadata, C04 host and route output | NFR-U1-015, `U1-P09` | Static metadata/output closure 완료; browser evidence later |

Story mapping은 ST-U01 contributor의 AC-U01-03~04, ST-U02의 AC-U02-01~04, ST-U04의 AC-U04-01~04와 ST-U05의 AC-U05-01~04를 포함한다. Step 18 frontend slice는 validated read-model과 project completeness의 EDGE-001~003, contact/evidence의 EDGE-004, content/omission의 EDGE-005~006, owner-local property inventory의 EDGE-010과 static route/navigation의 EDGE-011을 잇는다. PDF file/parity의 EDGE-008~009는 Steps 21~23 owner에 남고 이 단계가 완료로 흡수하지 않는다.

Obligation map에서 Step 18이 소유한 다음 세 `deferredCoverage` record는 canonical PBT refinement와 static output example이 실제로 존재하고 통과한 뒤 제거했다.

- `U1-P07`, `P-C02-01~03`, `FD-P-C02-01~03`
- `U1-P09`, `P-C04-02`, `FD-P-C04-02`
- `U1-P10`, `P-C05-02`, `FD-P-C05-01~02`

Step 21의 `FD-P-C11-01`과 Step 22의 `NFR-P-RELEASE-01` deferred coverage는 이 단계에서 닫지 않는다.

## 8. PBT Compliance — Step 18 final disposition

| Rule | 판정 | Evidence |
|---|---|---|
| PBT-01 | Compliant | Approved U1-P/P-C/FD-P inventory와 unique canonical obligation aliases를 유지한다. |
| PBT-02 | Compliant / static HTML N/A | Generated typed JSON-LD serialize/embed/extract/parse round-trip을 유지한다. Static HTML rendering은 inverse operation이 없어 explicit N/A다. |
| PBT-03 | Compliant | Presentation PBT가 selector가 아니라 `buildResumePresentation()`/`buildPortfolioPresentation()`을 직접 실행해 hierarchy, omission, typed blocks, fact attribution과 static-action invariants를 검증한다. Metadata/navigation invariants도 generated inputs로 유지한다. |
| PBT-04 | Compliant / C02 N/A | Normalization idempotence는 existing C01 property가 소유한다. Render output은 render input이 아니므로 C02 idempotence를 주장하지 않는다. |
| PBT-05 | Compliant | Exact section/dimension/navigation vectors와 JSON-LD structural equality를 independent simple oracle로 비교한다. |
| PBT-06 | Open at Step 22 | Current frontend tree와 host는 pure/stateless다. Mutable release-journal state model은 Step 22 owner에 남는다. |
| PBT-07 | Compliant | Reusable constrained valid-profile, metadata, navigation, Unicode와 optional-boundary generators를 C02/C04/C05 properties가 소비한다. |
| PBT-08 | Compliant | Existing runner로 signed seed `1729`, 100 runs의 two full same-seed passes와 exact presentation property focused replay를 실행했다. Shrinking/path reproduction capability는 Step 9의 one-use failure proof를 유지하고 retry는 0이다. |
| PBT-09 | Compliant prior decision | Locked Vitest `4.1.10`, fast-check `4.9.0`와 `@fast-check/vitest` `0.4.1` selection을 유지한다. |
| PBT-10 | Compliant | Named presentation examples와 isolated production Astro output example이 canonical PBT를 보완하며 critical static route behavior를 PBT만으로 완료 처리하지 않는다. |

Step 18의 blocking PBT finding은 없다. PBT-06의 mutable release model은 승인된 owner인 Step 22에 계속 deferred되어 있으며, frontend slice 완료 판정에 흡수하지 않는다.

## 9. Step 18 completion evidence

- **Test delta**: `site/tests/unit/profile-presentation.test.ts`를 추가하고, `site/tests/pbt/u1/profile-presentation.pbt.test.ts`를 actual C02 mapper properties로 교체했다. `site/tests/unit/obligation-map.test.ts`와 `site/tests/obligations/u1-profile.json`은 Step 18 alias closure만 반영했다.
- **Type/static check**: full TypeScript와 profile-tools TypeScript가 통과했다. `npx astro check`는 98 files, 0 errors와 기존 6 hints를 보고했다.
- **Named examples**: `npm run test:unit`은 8 files, 89 tests를 통과했다.
- **Property suite**: `PBT_SEED=1729 PBT_RUNS=100 npm run test:pbt`는 4 canonical files, 26 properties를 통과했다. 같은 seed의 full run을 두 번 통과했고, exact résumé presentation property focused replay도 100 runs로 통과했다.
- **Production output example**: Unit suite가 lockfile-local `node_modules/astro/bin/astro.mjs`를 사용해 매 실행마다 exact `mkdtemp` output root에 한 번 build하고 그 디렉터리만 cleanup한다. Shared `site/dist` 또는 preview/browser server를 evidence input으로 사용하지 않는다.
- **Output assertions**: 두 route의 one h1, logical heading progression과 entry `aria-level=4`, matching native details/summary containment와 initially closed state, exact local/desktop/mobile anchor vectors/current state, MobileNav no-island boundary, stable unique automation IDs, canonical/visible-summary description equality, authoritative metadata singleton과 ordered JSON-LD types를 검사한다. Copied search-index/nav-tree의 structured slug에는 exact profile route가 없음을 확인한다.
- **Direct build**: `npx astro build`는 `/resume`와 `/portfolio`를 포함한 6 static pages를 생성했고 private profile approval boundary를 통과했다.
- **Obligation closure**: `U1-P07/P09/P10`의 Step 18 refinement groups는 canonical owner를 유지한 채 deferred coverage에서 제거했다. `FD-P-C11-01` Step 21과 `NFR-P-RELEASE-01` Step 22만 exact later-owner deferral로 남는다.
- **Diff/boundary**: `git diff --check`가 implementation worktree와 AI-DLC documentation tree에서 통과했다. Step 18은 production component/runtime source, external Vault, public PDF, deployment 또는 Git ref를 변경하지 않았다.
- **Independent review**: Contract/PBT/map review는 blocker/P1/P2 없음으로 종료했다. Static-output review가 matching summary containment과 required ARIA heading assertion 두 P2를 찾았고 둘 다 강화한 뒤 5/5 focused test와 focused re-review에서 remaining finding이 없음을 확인했다.

## 10. Artifact, security and delivery boundaries

- Production routes는 Step 14~15에서 승인·materialize된 exact fact-approved source를 소비하지만 이 문서가 fact truth 또는 공개 승인을 새로 부여하지 않는다.
- Profile components는 runtime authentication, authorization, session, contact form, analytics 또는 tracking을 추가하지 않는다.
- External URL truth/reachability는 runtime/CI network request가 아니라 approved fact-review evidence가 소유한다.
- `/resume.pdf` anchor는 stable public-path contract다. Current reviewed PDF의 존재, MIME, source currentness와 parity는 Steps 21~23 전에는 주장하지 않는다.
- `site/dist/`, `.astro/`, `.generated/`와 `.artifacts/` output은 generated/private evidence boundary이며 canonical frontend source가 아니다.
- Knowledge search, graph, tags와 nav tree에 profile entity를 삽입하지 않는다.
- External Vault, `infra/`, Terraform, AWS, CloudFront, DNS, Jenkins deploy, Git stage/commit/push/merge와 production deployment는 이 summary와 Step 18의 권한 밖이다.
