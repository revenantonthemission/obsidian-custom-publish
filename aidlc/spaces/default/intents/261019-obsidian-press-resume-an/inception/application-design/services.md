# Build-time Services and Orchestration — 이력서·포트폴리오 재구축

## 문서 상태

- **단계**: INCEPTION - Application Design
- **상태**: 승인됨
- **상세 수준**: Standard
- **입력 결정**: Application Design 답변 A/B/A/B/A/A
- **서비스 형태**: 모두 build-time orchestration 또는 pure projection
- **런타임 변경**: 없음
- **배포 권한**: 없음

## 1. 서비스 설계 원칙

이 문서의 `Service`는 배포되는 서버, API 또는 장기 실행 프로세스를 뜻하지 않는다. Rust 전처리기와 Astro 정적 빌드 안에서 여러 component를 한 방향으로 조정하는 논리적 service boundary를 뜻한다. 방문자는 최종 HTML, CSS, JSON과 PDF만 받으며 이 기능 때문에 새 runtime service, client-side JavaScript, Preact island, 외부 runtime API 또는 외부 runtime dependency를 사용하지 않는다.

다음 원칙을 모든 service에 적용한다.

1. **Approved facts only**: production profile source에는 사용자가 공개를 승인한 사실만 들어간다. 초안, 근거와 승인 기록은 production data 밖의 AI-DLC review artifact가 소유한다.
2. **Producer-side publication boundary**: 홈페이지 전용 원본은 Rust producer에서 일반 게시물 projection과 분리한다. Astro consumer마다 같은 필터를 반복하지 않는다.
3. **Single direction**: authored source → validated domain/projection → generated contract → static presentation → verification 순서만 허용한다.
4. **Fail closed**: 필수 사실, homepage source, profile slot, PDF 또는 parity 계약이 유효하지 않으면 불완전한 공개 결과를 성공으로 취급하지 않는다.
5. **Generated output is not canonical**: `content/`, `site/dist/`, generated public JSON/assets와 PDF는 입력 사실을 수정하는 장소가 아니다.
6. **No implicit deployment**: service orchestration의 종료점은 검증된 정적 결과다. Terraform, AWS, S3 sync와 CloudFront invalidation은 호출하지 않는다.

## 2. Service Catalog

### S01 — Profile Assembly Service

**Purpose**

저장소 소유의 승인된 profile data 한 벌을 검증하고 `/resume`, `/portfolio`, 공용 profile presentation과 page metadata를 같은 사실 projection에서 조립한다.

**Participating components**

- C01 Profile Domain
- C02 Profile Presentation
- C03 Profile Metadata Builder
- C04 Base Layout Metadata Host
- C05 Header Navigation

**Inputs**

- `site/src/lib/profile/`의 typed canonical profile data
- 페이지 목적: résumé 또는 portfolio
- 운영 domain과 고정 route contract

**Outputs**

- 한국어 `/resume`와 `/portfolio` static HTML
- résumé 요약과 승인된 전체 상세를 제공하는 semantic presentation
- 3~6개 project case study presentation
- 승인된 연락 및 공개 근거 CTA
- page별 title, description, canonical, Open Graph, Twitter metadata와 conservative JSON-LD
- desktop/mobile Header의 `/resume`, `/portfolio` 링크

**Responsibilities**

1. C01 validation을 presentation이나 metadata projection보다 먼저 실행한다.
2. C02와 C03가 동일한 validated profile value를 소비하게 하고 페이지별 사실 복제를 금지한다.
3. `/resume`는 `ProfilePage`와 승인된 `Person` main entity를, `/portfolio`는 `CollectionPage`와 승인된 project의 `ItemList`/`CreativeWork`를 넘지 않는 보수적인 JSON-LD로 투영한다.
4. 실제 공개 code URL과 의미가 있을 때만 더 구체적인 project schema를 허용한다.
5. C04에 typed metadata와 JSON-LD를 전달하고 raw user-authored JSON 문자열을 직접 삽입하지 않는다.
6. C05에서 Résumé와 Portfolio를 desktop/mobile 공통 navigation에 노출하되 knowledge search, graph, tags와 nav tree에는 넣지 않는다.
7. mobile profile anchor는 server-rendered HTML에 존재하며 기존 conditional `MobileNav` island의 hydration 또는 open state에 의존하지 않는다.
8. résumé의 선택 상세는 정적 HTML semantics로 제공하며 새 client JavaScript를 요구하지 않는다.

**Failure boundary**

- 필수 profile fact, 필수 URL, project 수·ID·순서 또는 case-study 필수 항목이 유효하지 않으면 Astro build 전에 actionable validation error로 중단한다.
- 미승인 fact와 placeholder는 production data에 들어갈 수 없으므로 조용히 숨기는 대신 content approval gate를 완료하지 못한 상태로 보고한다.
- metadata/JSON-LD projection이 화면의 승인 사실보다 강한 주장을 만들면 build 또는 verification failure다.

**Out of scope**

- 실제 profile 사실의 조사·추정·승인
- 세부 validation 알고리즘과 PBT generator 선택
- CSS 수치와 최종 visual polish
- PDF binary 생성

### S02 — Publication Projection Service

**Purpose**

외부 Vault의 authored `visibility`를 typed publication scope로 정규화하고, exactly-one homepage projection과 discoverable post-only projection을 만든 뒤 서로 다른 generated contract로 물질화한다.

**Participating components**

- C07 Publication Catalog
- C08 Link and Transclusion Transformer
- C09 Output Materializer

**Inputs**

- 외부 Vault의 Markdown과 attachments
- `visibility: homepage` frontmatter
- `visibility`가 없는 기존 note에 적용되는 기본 `post` scope
- heading, block와 wikilink reference map

**Outputs**

- 정확히 하나인 dedicated homepage artifact
- discoverable post-only Markdown 및 metadata
- post-only search index, RSS/sitemap input, nav tree, previews, graph, related, backlink와 forward-link data
- homepage source를 대상으로 하는 normal wikilink의 `/` route projection

**Responsibilities**

1. scan 시 `visibility`를 C07의 typed `PublicationScope`로 파싱한다.
2. build마다 homepage source가 정확히 하나인지 모든 output write 전에 검증한다.
3. reference resolution에는 homepage와 post를 모두 볼 수 있는 reference view를 제공하되 discovery derivation에는 post-only projection만 제공한다.
4. normal post의 homepage wikilink는 alias와 지원되는 heading/block fragment 의미를 보존하며 `/`로 정규화한다.
5. homepage source를 대상으로 하는 full, heading 또는 block transclusion은 모두 명확한 authoring error로 거부한다.
6. homepage source의 outbound link는 homepage 화면 렌더링에는 사용할 수 있지만 다른 post의 backlink, related score, graph 또는 ranking에는 기여시키지 않는다.
7. C09는 homepage를 normal `posts/{slug}.md`와 `meta/{slug}.json`에 쓰지 않고 dedicated homepage artifact로만 쓴다.
8. C09는 global discovery artifact builder에 C07의 post-only projection만 전달한다.

**Strict projection invariant**

`visibility: homepage`인 source는 홈페이지 body를 만드는 단일 projection에는 존재하고 아래 일반 discovery surface에는 존재하지 않는다.

- `/posts/passion-project`
- 일반 post metadata와 route generation
- 일반 목록, tag 목록, hub와 오늘 발행 글
- knowledge search
- RSS
- `/posts/passion-project` sitemap entry
- nav tree
- previews
- graph node와 edge
- related posts
- backlink와 forward-link discovery metadata
- hub-derived discovery

`/` 자체는 정상 sitemap route로 남으며 `/resume`와 `/portfolio`도 Astro의 static route로 sitemap에 포함된다. 이 규칙은 homepage body를 없애는 것이 아니라 같은 source를 normal post로 재공개하지 않는 규칙이다.

**Failure boundary**

- homepage source가 0개 또는 2개 이상이면 output을 성공으로 보고하지 않는다.
- 알 수 없는 `visibility` 값은 기본값으로 떨어뜨리지 않고 source path와 값을 포함한 오류로 실패한다.
- homepage-target transclusion은 variant와 source path를 식별하는 오류로 실패한다.
- 외부 Vault를 읽을 수 없으면 repository file이나 stale generated output으로 대체하지 않고 blocker로 보고한다.
- output serialization 또는 write 실패는 부분 산출물을 성공으로 표시하지 않는다. 구체적인 staging/atomicity 기법은 U2 Functional Design에서 정한다.

**Out of scope**

- 외부 Vault 문서의 자동 수정
- search, related 또는 graph ranking 알고리즘의 관련 없는 변경
- generated JSON이나 Markdown의 수동 패치

### S03 — Homepage and Static Site Composition Service

**Purpose**

dedicated homepage artifact를 repository-owned profile summary와 exactly-one profile slot에서 조합하고, 기존 오늘 발행 글 동작 및 static site shell과 함께 `/`를 생성한다.

**Participating components**

- C06 Homepage Composition
- C10 Static Data Gateway
- C01 Profile Domain
- C02 Profile Presentation의 homepage summary/CTA component
- C04 Base Layout Metadata Host

**Inputs**

- C10이 읽은 dedicated homepage artifact
- C10이 읽은 discoverable post-only metadata와 previews
- C01의 validated homepage projection과 C02가 표현하는 profile summary
- `Passion Project.md`가 선언한 단 하나의 profile slot

**Outputs**

- Vault-authored homepage context
- slot 위치에 삽입된 짧은 소개와 `/resume`, `/portfolio` CTA
- post-only projection에서 계산된 오늘 발행 글
- 기존 site shell과 metadata 안의 static `/`

**Responsibilities**

1. C10의 dedicated getter만 사용하고 `getPostContent("passion-project")` 같은 normal-post 우회를 금지한다.
2. homepage artifact 누락을 빈 문자열로 조용히 바꾸지 않고 build error로 전달한다.
3. recognized profile slot이 정확히 하나인지 검증한 뒤 C02의 canonical-data 기반 component를 그 위치에 삽입한다.
4. slot 바깥의 Vault content와 기존 오늘 발행 글 composition을 보존한다.
5. profile summary fact를 Vault Markdown에 복제하지 않는다.
6. CTA는 내부 `/resume`, `/portfolio`를 가리키고 JavaScript 없이 이동 가능해야 한다.

**Failure boundary**

- profile slot이 0개 또는 여러 개면 source path와 count를 포함한 build error로 실패한다.
- homepage artifact와 post-only metadata contract가 누락되거나 parse되지 않으면 Astro build를 실패시킨다.
- slot literal과 세부 split/compose 알고리즘은 U2 Functional Design에서 정하되 exactly-one invariant는 이 단계에서 고정한다.

**External Vault write gate**

- U2 consuming behavior와 fixture가 먼저 존재해야 한다.
- 그 뒤 `Areas/Notes/Passion Project.md` 하나에만 `visibility: homepage`와 profile slot을 적용하고 기존 임시 Portfolio/Notion block을 제거한다.
- 다른 Vault 문서와 attachment는 수정하지 않는다.
- 외부 repository의 정확한 diff를 검토하며 별도 승인 없이 commit 또는 push하지 않는다.

### S04 — Resume Document Service

**Purpose**

승인된 `/resume` static page의 전체 상세를 browser print와 stable downloadable PDF로 투영하고, 웹과 PDF 사이에 별도 사실 원본이 생기지 않게 한다.

**Participating components**

- C11 Resume Document Boundary
- C01 Profile Domain의 approved résumé projection
- C02 Profile Presentation의 résumé route
- C12 Verification and Automation Adapters의 PDF/parity checks

**Inputs**

- validated profile data로 생성된 `/resume` static HTML
- C01의 approved résumé projection과 C11 document request validation
- résumé print stylesheet
- stable public contract `/resume.pdf`

**Outputs**

- browser print에서 읽을 수 있는 전체 승인 상세
- build-time browser rendering으로 생성한 `site/public/resume.pdf`
- Astro가 최종 `site/dist/resume.pdf`로 복사하는 stable downloadable asset
- PDF render와 fact-parity evidence

**Responsibilities**

1. PDF는 `/resume`와 같은 승인된 전체 상세를 사용하며 별도 hand-edited résumé data를 받지 않는다.
2. 첫 번째 static render를 browser print media로 렌더링해 PDF를 갱신하고, 최종 build/link/parity gate가 stable asset을 확인하게 한다.
3. `site/public/resume.pdf`는 Git history로 version 관리하는 **tracked derived release asset**이다. canonical fact source가 아니며 수동으로 사실을 편집하지 않는다.
4. navigation과 화면 전용 장식은 print/PDF에서 제거하되 읽기 순서와 핵심 사실은 유지한다.
5. PDF 생성 과정은 외부 network availability에 의존하지 않는다.

**Failure boundary**

- PDF가 없거나 읽을 수 없거나 `/resume.pdf` link가 깨지면 completion gate를 실패시킨다.
- web/print/PDF 핵심 사실이 다르면 public-ready 상태로 처리하지 않는다.
- PDF generation 실패 시 기존 binary가 존재한다는 이유만으로 성공하지 않는다. 현재 source에서 재생성한 증거가 필요하다.
- browser engine, print assertions와 parity extraction의 상세 방식은 U1/U3 NFR Requirements와 NFR Design에서 정한다.

### S05 — Verification Orchestration Service

**Purpose**

각 owning unit이 만든 example/PBT와 static build, browser, print, PDF, link 및 CI gate를 재현 가능한 순서로 실행하고, 결과를 배포와 분리한다.

**Participating components**

- C12 Verification and Automation Adapters
- U1-owned profile validation tests
- U2-owned publication/filtering tests
- existing Rust and Astro build runners
- U3 browser/PDF/cross-unit checks와 Jenkins integration

**Inputs**

- authored source와 fixture
- U1/U2가 선택한 PBT framework, generators와 seed
- generated content and static output
- tracked PDF

**Outputs**

- local/CI pass 또는 actionable non-zero failure
- PBT seed, shrinking과 최소 counterexample evidence
- responsive, keyboard, focus, reduced-motion, metadata, print와 PDF evidence
- source/generated attribution과 skipped-gate reason

**Responsibilities**

1. U1은 profile-domain property와 test를, U2는 publication-filtering property와 test를 owning code와 함께 만든다.
2. U3는 U1/U2 PBT logic을 재구현하지 않고 안정된 command를 Jenkins에 연결한다.
3. Rust 변경에는 `just test`, site 변경에는 `cd site && npx astro build`를 적용한다.
4. 안전한 source/Vault/working-tree 조건에서는 `just build`를 사용한다. 그렇지 않으면 `just test`와 `just site-build`를 사용하고 end-to-end fixture pipeline을 건너뛴 이유를 기록한다.
5. Playwright와 PDF checks는 network-independent fixture/static server를 대상으로 한다.
6. CI 변경은 현재 잘못된 Rust path, 관련 test/PBT command와 seed output의 최소 범위로 제한한다.
7. 모든 검증 명령에서 deployment stage를 분리하고 호출하지 않는다.

**Failure boundary**

- 실패 seed, shrunk counterexample 또는 failed surface를 식별할 수 없는 테스트 결과는 재현성 gate를 충족하지 않는다.
- unrelated Jenkins debt, deployment behavior 또는 AWS credential 검사를 바꿔야 한다면 현재 scope를 중단하고 별도 승인을 요청한다.
- 테스트 성공은 배포 승인이나 production fact 승인으로 해석하지 않는다.

## 3. End-to-End Orchestration

| Order | Service | Required input | Produced result | Blocking condition |
|---:|---|---|---|---|
| 0 | Approval gate | 사용자가 검수한 실제 공개 사실 | production profile data에 넣을 수 있는 fact set | 미승인 identity, 경력, project, 역할, 성과, 결과, metric 또는 URL |
| 1 | S01 Profile Assembly | approved canonical profile | validated profile views와 metadata projection | domain 또는 semantic metadata validation 실패 |
| 2 | S02 Publication Projection | readable Vault와 typed visibility | dedicated homepage + post-only generated contract | homepage count, invalid scope, prohibited transclusion 또는 I/O 실패 |
| 3 | S03 Homepage Composition | homepage artifact, post metadata, validated profile와 S01 route output | composed `/`와 `/resume`, `/portfolio`를 포함한 first-pass static site | missing artifact, profile slot count 또는 Astro build 실패 |
| 4 | S04 Resume Document | first-pass `/resume`와 print contract | refreshed `site/public/resume.pdf` | PDF generation 또는 content parity 준비 실패 |
| 5 | S05 Verification | authored source, refreshed generated outputs와 PDF | final build/test evidence | example/PBT/browser/metadata/link/print/PDF/parity gate 실패 |
| 6 | Stop boundary | 검증된 결과 | review 가능한 source diff와 artifacts | 배포·AWS·Terraform 작업은 별도 승인 없이는 실행하지 않음 |

이 순서는 파일 수준의 세부 명령을 고정하지 않는다. 특히 PDF를 생성한 뒤 최종 Astro build가 필요한지, static server를 어떤 command로 띄우는지는 U1/U3 NFR Design과 Code Generation에서 확정한다. 고정되는 계약은 PDF가 현재 승인된 route에서 재생성되고 최종 output과 parity gate가 이를 확인해야 한다는 점이다.

## 4. Service Interaction Contracts

| Producer | Consumer | Contract | Communication |
|---|---|---|---|
| C01 Profile Domain | C02 Profile Presentation | validated, ordered profile value와 route-specific selectors | direct typed TypeScript import/call |
| C01 Profile Domain | C03 Profile Metadata Builder | approved-fact projection only | direct typed TypeScript import/call |
| C01 Profile Domain | C06 Homepage Composition | validated homepage projection | direct typed TypeScript import/call |
| C01 Profile Domain | C11 Resume Document Boundary | approved résumé projection for document-source validation | typed build-time value |
| C03 Profile Metadata Builder | C04 Base Layout Metadata Host | typed head metadata와 serializable JSON-LD | Astro props/slots |
| C07 Publication Catalog | C08 Link and Transclusion Transformer | full reference view + distinct homepage/post projections | in-process Rust types |
| C07/C08 | C09 Output Materializer | validated scope and transformed content | in-process Rust calls |
| C09 Output Materializer | C10 Static Data Gateway | versioned generated filesystem shape | generated artifact contract |
| C10 Static Data Gateway | C06 Homepage Composition | required homepage body + post-only metadata | synchronous build-time getter |
| C02 Profile Presentation | C06 Homepage Composition | canonical-data-backed summary/CTA component | Astro component props |
| Astro static route | C11 Resume Document Boundary | `/resume` print representation | local build artifact/browser page |
| C01–C11 public contracts | C12 Verification | fixtures, outputs and stable commands | read-only assertions/process exit |

## 5. Ownership by AI-DLC Unit

| Unit | Owned services/components | Upstream dependency | Completion boundary |
|---|---|---|---|
| U1 Profile Domain and Native Experience | S01, S04; C01–C05, C11 | approved profile facts | native routes, metadata, print/PDF generation contract와 U1-owned tests |
| U2 Homepage Publication Boundary | S02, S03; C06–C10; approved single Vault file | U1의 profile summary component와 safe branch base | strict homepage projection, slot composition, normal-post preservation와 U2-owned tests |
| U3 Quality Gate and CI Integration | S05; C12 | completed U1/U2 public test commands | cross-unit browser/PDF evidence와 minimal Jenkins wiring |

각 unit은 안전하게 reconciliation된 `develop`에서 별도 focused feature branch를 만들고 완료 후 `--no-ff`로 병합한다. U1 → U2 → U3 순서를 유지하며 여러 unit을 한 feature branch에 쌓지 않는다. 이 설계 문서는 branch 생성이나 Git mutation을 수행하지 않는다.

## 6. Infrastructure and Delivery Boundary

- 기존 CloudFront viewer-request function은 extensionless `/resume`와 `/portfolio`를 각각 `/index.html`로 해석할 수 있다.
- `/resume.pdf`는 확장자가 있는 static object이므로 clean-route rewrite가 필요하지 않다.
- profile page, homepage artifact와 PDF를 위해 runtime server, database, queue, object-store API 또는 새 CDN behavior가 필요하지 않다.
- 각 unit의 Infrastructure Design은 이 compatibility assumption을 실제 설정과 output으로 확인하고 **no implementation change** 결과를 기록한다.
- incompatibility가 발견되면 Terraform을 수정하지 않고 별도 scope와 authorization을 요청한다.
- `just deploy`, S3 upload, CloudFront invalidation, AWS API와 Terraform mutation은 이 service orchestration에 포함되지 않는다.

## 7. PBT and Detailed-Design Handoff

Application Design은 PBT enforcement 단계가 아니므로 현재 판정은 **N/A**다.

- U1 Functional Design은 profile validation, ordering과 projection property를 식별한다.
- U2 Functional Design은 publication filtering invariant, unrelated-post preservation와 idempotence property를 식별한다.
- 각 unit의 NFR Requirements가 language별 framework, generator, shrinking과 seed를 결정한다.
- U1/U2 Code Generation이 owning tests를 구현한다.
- U3와 integrated Build and Test는 test를 이동하거나 복제하지 않고 실행·증거를 집계한다.

세부 business rule, error wording, marker literal, file staging 방식, browser matrix와 parity extraction은 해당 unit의 Functional/NFR Design으로 이관한다.

## 8. Traceability Summary

| Service | Primary requirements | Primary stories |
|---|---|---|
| S01 Profile Assembly | FR-001~FR-007, FR-011~FR-013, NFR-001~NFR-008 | ST-U01, ST-U02, ST-U04, ST-U05, ST-E01, ST-E02 |
| S02 Publication Projection | FR-008, FR-009, FR-013, FR-017, NFR-003~NFR-006 | ST-U06, ST-E03 |
| S03 Homepage Composition | FR-003, FR-008, FR-009, FR-012, FR-013 | ST-U01, ST-U06 |
| S04 Resume Document | FR-004, FR-010, FR-013, NFR-001, NFR-007~NFR-009 | ST-U03, ST-E02 |
| S05 Verification | FR-014~FR-018, NFR-005, NFR-010 | ST-E03, ST-E04 및 모든 사용자 story evidence |
