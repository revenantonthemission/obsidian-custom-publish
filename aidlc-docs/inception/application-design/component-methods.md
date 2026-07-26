# Component Methods — 이력서·포트폴리오 재구축

## 문서 상태

- **단계**: INCEPTION - Application Design
- **상태**: 승인됨
- **상세 수준**: Standard
- **범위**: 고수준 method signature, input/output type과 목적
- **상세 규칙 이관**: unit별 Functional Design

## 1. 표기와 공통 Type

아래 signature는 architecture contract를 설명하는 TypeScript/Rust 유사 표기다. 실제 symbol 이름과 파일 배치는 Functional Design에서 기존 module 관례에 맞게 확정할 수 있지만 component 책임, 입력 방향과 output 의미는 유지해야 한다.

| Type | 의미 |
|---|---|
| `ProfileData` | `site/src/lib/profile/`에 작성된 typed canonical production data |
| `ValidatedProfile` | C01 validation을 통과한 immutable profile |
| `ResumeProfile` | résumé에 필요한 approved projection |
| `PortfolioProfile` | portfolio에 필요한 approved projection |
| `HomepageProfile` | homepage 소개와 내부 CTA에 필요한 approved projection |
| `ValidationResult<T>` | 성공한 typed value 또는 field-addressable issue collection |
| `ProfilePageMetadata` | title, description, canonical, Open Graph, Twitter와 JSON-LD를 포함하는 head contract |
| `JsonLdDocument` | 승인 사실에서 생성된 JSON-LD object |
| `AstroFragment` | build-time에 생성되는 정적 Astro/HTML fragment |
| `PublicationCatalog` | homepage, discoverable posts와 linkable sources로 나뉜 validated Rust catalog |
| `HomepageArtifact` | normal post output과 분리된 generated homepage content contract |
| `GeneratedOutputManifest` | 한 preprocess run에서 생성한 artifact inventory |
| `VerificationResult` | command status와 evidence를 포함하는 한 gate의 결과 |

오류는 silent fallback이 아니라 build/test runner가 실패로 승격할 수 있는 typed result 또는 exception/`Result`로 전달한다. 정확한 error class와 message는 Functional Design에서 정의한다.

## 2. C01 — Profile Domain

| Method signature | Input | Output | 고수준 목적 |
|---|---|---|---|
| `getCanonicalProfile(): ProfileData` | 없음 | read-only `ProfileData` | 저장소가 소유하는 승인 완료 production data 한 벌을 반환한다. |
| `validateProfile(input: ProfileData): ValidationResult<ValidatedProfile>` | typed canonical candidate | validated immutable profile 또는 issues | consumer가 public output을 만들기 전에 domain shape를 fail-fast 검증한다. |
| `requireValidProfile(input: ProfileData): ValidatedProfile` | typed canonical candidate | validated profile; invalid 시 build failure | Astro page와 document workflow가 invalid data를 누락 처리하지 않게 한다. |
| `selectResumeProfile(profile: ValidatedProfile): ResumeProfile` | validated profile | ordered résumé projection | résumé, print와 PDF가 공유할 approved read model을 만든다. |
| `selectPortfolioProfile(profile: ValidatedProfile): PortfolioProfile` | validated profile | ordered project case-study projection | portfolio에 필요한 facts와 optional public evidence를 투영한다. |
| `selectHomepageProfile(profile: ValidatedProfile): HomepageProfile` | validated profile | short intro와 internal-route projection | Vault에 profile 사실을 복제하지 않고 homepage slot 입력을 만든다. |

**Deferred**: field predicates, project count/ordering rule, identifier uniqueness, URL parser, optional section omission, validation error taxonomy와 PBT properties.

## 3. C02 — Profile Presentation

Astro component는 side-effect 없는 build-time render function으로 표현한다.

| Method/component signature | Input | Output | 고수준 목적 |
|---|---|---|---|
| `renderProfileShell(props: ProfileShellProps): AstroFragment` | page identity, heading, local navigation, content slot | shared profile page shell | résumé와 portfolio에 공통 header/layout/landmark와 상호 navigation을 제공한다. |
| `renderResumePage(props: ResumePageProps): AstroFragment` | `ResumeProfile`, `ProfilePageMetadata`, `ResumeDocumentLink` | `/resume` page fragment | 승인된 summary와 선택 상세를 semantic static HTML로 렌더링한다. |
| `renderPortfolioPage(props: PortfolioPageProps): AstroFragment` | `PortfolioProfile`, `ProfilePageMetadata` | `/portfolio` page fragment | ordered case studies를 비교 가능한 정적 구조로 렌더링한다. |
| `renderResumeSection(props: ResumeSectionProps): AstroFragment` | section heading, summary와 optional details | semantic section | 선택 data가 있는 résumé section을 표현한다. |
| `renderResumeDetails(props: ResumeDetailsProps): AstroFragment` | accessible summary와 approved detail | native `<details>` fragment | 새 client JavaScript 없이 펼침 상세를 제공한다. |
| `renderCaseStudy(props: CaseStudyProps): AstroFragment` | one approved project projection | semantic case-study article | 문제, 역할, 결정, 구조, 결과와 배운 점을 일관된 순서로 표현한다. |
| `renderContactActions(props: ContactActionsProps): AstroFragment` | approved email, GitHub와 optional evidence links | labelled link group | 연락과 공개 근거 CTA를 keyboard/assistive-technology friendly markup으로 제공한다. |

**Deferred**: 정확한 section visibility, Korean labels, heading level calculation, CSS class, breakpoint, page-break와 interaction test details.

## 4. C03 — Profile Metadata Builder

| Method signature | Input | Output | 고수준 목적 |
|---|---|---|---|
| `buildResumeMetadata(profile: ResumeProfile, site: SiteIdentity): ProfilePageMetadata` | approved résumé projection와 canonical site identity | complete résumé head model | `/resume`의 고유 검색·공유 metadata를 visible facts와 같은 source에서 만든다. |
| `buildPortfolioMetadata(profile: PortfolioProfile, site: SiteIdentity): ProfilePageMetadata` | approved portfolio projection와 site identity | complete portfolio head model | `/portfolio`의 고유 검색·공유 metadata를 만든다. |
| `buildResumeStructuredData(profile: ResumeProfile, canonicalUrl: URL): readonly JsonLdDocument[]` | approved résumé projection와 canonical URL | `ProfilePage` 및 최소 `Person` documents | page/person 의미를 실제 승인 facts 범위에서 표현한다. |
| `buildPortfolioStructuredData(profile: PortfolioProfile, canonicalUrl: URL): readonly JsonLdDocument[]` | approved project projection와 canonical URL | `CollectionPage` 및 `ItemList` documents | portfolio collection과 ordered project items를 보수적으로 표현한다. |
| `validateMetadataConsistency(metadata: ProfilePageMetadata, source: ValidatedProfile): ValidationResult<ProfilePageMetadata>` | built metadata와 source profile | validated metadata 또는 issues | metadata가 canonical URL과 approved visible facts를 벗어나지 않는지 build gate에 전달한다. |

**Deferred**: exact copy, optional schema property mapping, JSON-LD serialization/escaping과 mismatch diagnostics.

## 5. C04 — Base Layout Metadata Host

| Method/component signature | Input | Output | 고수준 목적 |
|---|---|---|---|
| `renderBaseLayout(props: BaseLayoutProps, content: AstroFragment): AstroFragment` | existing layout props, optional `ProfilePageMetadata`, page content | complete static HTML document | profile와 기존 route가 공통 head/body shell을 사용하게 한다. |
| `renderHeadMetadata(metadata: ProfilePageMetadata): AstroFragment` | complete head model | `<title>`, meta와 canonical fragment | title/description/OG/Twitter/canonical을 한 계약에서 출력한다. |
| `renderStructuredData(documents?: readonly JsonLdDocument[]): AstroFragment \| null` | optional JSON-LD documents | JSON-LD script fragment 또는 no output | structured data가 있는 route에만 serialized JSON-LD를 출력한다. |

**Deferred**: backward-compatible prop normalization, serialization/escaping implementation과 multiple-document markup choice.

## 6. C05 — Header Navigation

| Method/component signature | Input | Output | 고수준 목적 |
|---|---|---|---|
| `getPrimaryNavigation(): readonly NavigationItem[]` | 없음 | Tags, Graph, Résumé, Portfolio를 포함한 ordered model | desktop/mobile navigation의 single build-time source를 제공한다. |
| `getNavigationState(items: readonly NavigationItem[], pathname: string): readonly NavigationState[]` | navigation model과 current path | `aria-current`를 포함한 item state | route-aware current-page semantics를 계산한다. |
| `renderHeader(props: HeaderProps): AstroFragment` | pathname와 shared navigation model | desktop/mobile header fragment | 기존 theme/search control을 보존하며 Résumé/Portfolio anchor가 hydration이나 conditional island state 없이 양쪽 viewport의 server-rendered HTML에 존재하게 한다. |

**Deferred**: exact ordering/label/icon, active matching edge case, native/server-rendered mobile markup 배치와 mobile layout assertions.

## 7. C06 — Homepage Composition

| Method/component signature | Input | Output | 고수준 목적 |
|---|---|---|---|
| `renderHomepageProfilePanel(props: HomepageProfilePanelProps): AstroFragment` | `HomepageProfile`, `/resume`, `/portfolio` route constants | static intro/CTA fragment | canonical profile facts로 homepage profile slot UI를 만든다. |
| `composeHomepage(source: HomepageArtifact, profile: AstroFragment, dynamic: HomepageDynamicSections): CompositionResult<ComposedHomepage>` | generated homepage content, profile fragment, 오늘 글 등 기존 dynamic section | composed homepage 또는 slot diagnostic | authored content의 정확히 한 profile slot에 fragment를 주입하고 나머지 content를 보존한다. |
| `assertSingleProfileSlot(source: HomepageArtifact): ValidationResult<ProfileSlotLocation>` | generated homepage artifact | one slot location 또는 issues | missing/duplicate slot을 build failure로 전달한다. |
| `renderHomepage(page: ComposedHomepage, metadata: PageMetadata): AstroFragment` | completed composition와 homepage metadata | `/` page fragment | C04가 host할 최종 homepage static content를 제공한다. |

**Deferred**: slot token, parse boundary, exact dynamic-section ordering, raw/rendered composition 단계와 idempotence property.

## 8. C07 — Publication Catalog

Rust signature는 ownership 세부보다 domain contract를 우선한 개념 표기다.

| Method signature | Input | Output | 고수준 목적 |
|---|---|---|---|
| `parse_publication_scope(raw: Option<&str>) -> Result<PublicationScope>` | frontmatter `visibility` value | `Post` 또는 `Homepage` | authored enum과 default를 typed scope로 정규화한다. |
| `build_publication_catalog(index: VaultIndex) -> Result<PublicationCatalog>` | complete scan result | validated immutable catalog | 정확히 하나인 homepage source와 normal post projection을 만든다. |
| `homepage_source(catalog: &PublicationCatalog) -> &HomepageSource` | validated catalog | homepage source | C08/C09에 dedicated homepage input을 제공한다. |
| `discoverable_posts(catalog: &PublicationCatalog) -> &DiscoverablePosts` | validated catalog | ordered normal post view | route와 모든 knowledge discovery artifact의 유일한 post input을 제공한다. |
| `linkable_sources(catalog: &PublicationCatalog) -> &LinkableSources` | validated catalog | authored reference lookup | 일반 note가 homepage source를 `/` target으로 해석할 수 있게 한다. |
| `scope_of(catalog: &PublicationCatalog, source_id: SourceId) -> Option<PublicationScope>` | catalog와 source identity | optional typed scope | transformer가 target publication semantics를 조회하게 한다. |

**Deferred**: parser diagnostics, homepage cardinality algorithm, stable ordering representation, collision handling, graph partition과 PBT invariants.

## 9. C08 — Link and Transclusion Transformer

| Method signature | Input | Output | 고수준 목적 |
|---|---|---|---|
| `resolve_publication_link(reference: &WikiLinkRef, catalog: &PublicationCatalog) -> Result<PublicRouteTarget>` | parsed wikilink와 linkable source view | route, alias와 optional fragment | homepage target은 `/`로, 일반 target은 기존 post route로 정규화한다. |
| `validate_transclusion(reference: &TransclusionRef, catalog: &PublicationCatalog) -> Result<AllowedTransclusion>` | parsed transclusion와 scope lookup | allowed normal target 또는 diagnostic | homepage full/heading/block transclusion을 공개 전에 거부한다. |
| `transform_publication_content(source: SourceId, catalog: &PublicationCatalog, assets: Option<&Path>) -> Result<TransformedContent>` | source identity, catalog, optional asset directory | transformed body와 asset inventory | 기존 Markdown transform을 publication semantics와 결합한다. |
| `discovery_edges_for(source: SourceId, links: &[ResolvedLink], catalog: &PublicationCatalog) -> Vec<DiscoveryEdge>` | resolved authored links와 catalog | filtered discovery edges | homepage-related links가 graph/ranking에 들어가지 않는 downstream contract를 제공한다. |

**Deferred**: base/alias/heading/block truth table, fragment slug behavior, malformed target, diagnostic text와 edge filtering implementation.

## 10. C09 — Output Materializer

| Method signature | Input | Output | 고수준 목적 |
|---|---|---|---|
| `write_output(catalog: &PublicationCatalog, graph: &PublicationGraph, output_dir: &Path) -> Result<GeneratedOutputManifest>` | validated projections, publication-safe graph, output directory | generated artifact manifest | one preprocess run의 homepage, post, discovery output을 orchestration한다. |
| `write_homepage_artifact(source: &HomepageSource, content: &TransformedContent, output_dir: &Path) -> Result<HomepageArtifactRef>` | dedicated source와 transformed body | generated homepage reference | homepage를 normal post path 밖의 dedicated contract로 기록한다. |
| `write_post_artifacts(posts: &DiscoverablePosts, graph: &PublicationGraph, output_dir: &Path) -> Result<Vec<PostArtifactRef>>` | normal post projection와 graph | post/meta references | route-enabled 일반 게시물만 Markdown/metadata로 기록한다. |
| `write_discovery_artifacts(posts: &DiscoverablePosts, graph: &PublicationGraph, output_dir: &Path) -> Result<DiscoveryArtifactRefs>` | normal projection와 graph | search/preview/nav/graph artifact references | 모든 knowledge discovery output이 같은 filtered input을 사용하게 한다. |
| `reconcile_generated_manifest(previous: Option<&GeneratedOutputManifest>, current: &GeneratedOutputManifest, output_dir: &Path) -> Result<()>` | prior/current generated inventory | completion 또는 scoped diagnostic | homepage의 stale normal-post artifact가 남지 않게 generated-only 범위를 조정한다. |

**Deferred**: exact paths/schema, cleanup implementation, filesystem atomicity, write order, serialization and idempotence properties.

## 11. C10 — Static Data Gateway

| Method signature | Input | Output | 고수준 목적 |
|---|---|---|---|
| `getHomepageArtifact(): HomepageArtifact` | 없음; generated content root | validated homepage artifact | homepage가 `getPostContent("passion-project")`에 의존하지 않게 한다. |
| `getDiscoverablePostMeta(): readonly PostMeta[]` | 없음; generated meta root | publication-safe sorted metadata | route/list/tag/RSS/오늘 글 consumer에 normal posts만 제공한다. |
| `getPostMeta(slug: string): PostMeta \| null` | normal post slug | metadata 또는 not-found | 일반 post detail lookup을 유지한다. |
| `getPostContent(slug: string): string \| null` | normal post slug | transformed Markdown 또는 not-found | 일반 post content를 읽되 homepage artifact는 반환하지 않는다. |
| `getGraph(): GraphData` | 없음 | publication-safe graph | graph consumer에 filtered generated contract를 제공한다. |
| `getTagIndex(): Readonly<Record<string, readonly PostMeta[]>>` | 없음 | tag-to-post view | normal post metadata에서 tag navigation을 만든다. |
| `getHubs(): readonly PostMeta[]` | 없음 | normal hub posts | homepage source가 hub view에 들어오지 않게 한다. |
| `getPreviewSummary(slug: string): string \| null` | normal post slug | optional generated summary | post-only preview lookup을 제공한다. |

**Deferred**: path constants, JSON schema checking, null versus exception boundary, module cache lifecycle와 legacy getter migration.

## 12. C11 — Resume Document Boundary

| Method signature | Input | Output | 고수준 목적 |
|---|---|---|---|
| `getResumeDocumentLink(): ResumeDocumentLink` | 없음 | stable `/resume.pdf` descriptor | page와 tests가 공유할 public document contract를 제공한다. |
| `generateResumeDocument(request: ResumeDocumentRequest): Promise<ResumeDocumentResult>` | rendered `/resume`, `site/public/resume.pdf` target와 deterministic context | generated file result | web résumé의 approved full detail을 browser-rendered PDF로 갱신한다. |
| `inspectResumeDocument(result: ResumeDocumentResult): Promise<ResumeDocumentInspection>` | generated PDF result | page/text/file inspection data | C12의 visual, readability와 parity gate에 evidence를 제공한다. |
| `assertResumeDocumentSource(request: ResumeDocumentRequest, profile: ResumeProfile): ValidationResult<ResumeDocumentRequest>` | document request와 approved résumé projection | validated request 또는 issue | separate hand-authored fact source가 PDF generation에 들어오지 않게 한다. |

**Deferred**: browser library/command, local URL serving, paper/margin/font options, deterministic PDF metadata와 extraction strategy.

## 13. C12 — Verification and Automation Adapters

| Method signature | Input | Output | 고수준 목적 |
|---|---|---|---|
| `runProfileDomainChecks(context: VerificationContext): Promise<VerificationResult>` | source/test context와 optional PBT seed | example/PBT result | C01 validation/projection contract를 검증한다. |
| `runPublicationChecks(context: VerificationContext): Promise<VerificationResult>` | fixture Vault, Rust test context와 seed | example/PBT result | C07~C09 partition, transform와 output contract를 검증한다. |
| `runStaticBuild(context: VerificationContext): Promise<VerificationResult>` | repository/build context | Astro build와 route/content result | production static build와 required route/output을 검증한다. |
| `runLinkAndMetadataChecks(site: BuiltSite): Promise<VerificationResult>` | generated site | route, CTA, canonical, JSON-LD, PDF link result | public static contract의 존재와 consistency를 확인한다. |
| `runBrowserSmoke(plan: BrowserVerificationPlan): Promise<VerificationResult>` | built site, viewport/media/accessibility scenarios | browser evidence | responsive, keyboard, focus, reduced-motion와 print smoke를 실행한다. |
| `runResumeDocumentChecks(web: BuiltResumePage, pdf: ResumeDocumentInspection): Promise<VerificationResult>` | rendered résumé와 inspected PDF | parity/visual/readability evidence | web/print/PDF의 approved core facts와 document quality를 비교한다. |
| `runCiVerification(plan: VerificationPlan, seed: PbtSeed): Promise<VerificationReport>` | local-equivalent gates와 reproducible seed | aggregate CI report | Jenkins에서 같은 relevant gates와 seed/counterexample evidence를 남긴다. |
| `summarizeVerification(results: readonly VerificationResult[]): VerificationReport` | individual gate results | structured report | pass/fail, command, evidence, seed와 skipped reason을 한 결과로 집계한다. |

**Deferred**: PBT frameworks/generators, shrinking invocation, seed format, browser/version/viewport matrix, accessibility tooling, screenshot/PDF thresholds, exact commands와 Jenkins syntax.

## 14. Method-Level Dependency Direction

1. C01의 validated projections가 C02, C03, C06과 C11에 흐른다.
2. C03의 metadata가 C04를 통해 C02 route의 `<head>`에 흐른다.
3. C07의 typed projections가 C08과 C09에 흐르고 C09 generated contract가 C10으로 흐른다.
4. C10 homepage result와 C01 homepage projection이 C06에서 조합된다.
5. C02는 C11의 stable `/resume.pdf` link contract를 노출하고, C11은 C02가 생성한 `/resume` output을 PDF로 렌더링한다.
6. C12는 C01~C11의 public result를 관찰하지만 application component가 C12를 호출하지 않는다.

이 문서의 method는 business rule 구현을 선점하지 않는다. predicate, algorithm, error matrix, test property와 NFR 수치는 승인된 unit별 Functional Design과 NFR 단계에서 완성한다.
