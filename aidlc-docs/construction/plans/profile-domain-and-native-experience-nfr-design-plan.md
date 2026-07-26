# U1 NFR Design Plan — Profile Domain and Native Experience

## 문서 상태

- **단계**: CONSTRUCTION — U1 NFR Design
- **상태**: NFR Design 생성 및 검증 완료; 명시적 사용자 승인 대기
- **Unit**: U1 Profile Domain and Native Experience
- **Bounded Context**: Profile Experience
- **작성일**: 2026-07-24
- **Feature Branch**: `codex/feature/resume-profile-experience`
- **Branch Base**: reconciled local `develop` at `67f70a4240819ed8b9408360f9b59512660f8e10`
- **PBT Enforcement**: Full; NFR Requirements의 PBT-09 결정과 Functional Design의 PBT-01 properties가 binding
- **Extensions**: Obsidian Press project extension 활성; Security와 Resiliency extension 비활성
- **Question Set**: Q1~Q16 = A/A/A/A/A/A/A/A/A/A/A/A/A/A/A/A; completeness와 consistency 검증 완료
- **Independent Review**: 2026-07-24T06:12:58Z 통과; blocking 또는 material finding 없음
- **Artifact Review**: 2026-07-24T06:47:05Z 최종 독립 검토 통과; blocking 또는 material finding 없음

## 1. 입력과 승인된 경계

이 계획은 다음 승인 artifact를 입력으로 사용한다.

- [NFR Requirements](../profile-domain-and-native-experience/nfr-requirements/nfr-requirements.md)
- [Tech Stack Decisions](../profile-domain-and-native-experience/nfr-requirements/tech-stack-decisions.md)
- [Business Logic Model](../profile-domain-and-native-experience/functional-design/business-logic-model.md)
- [Business Rules](../profile-domain-and-native-experience/functional-design/business-rules.md)
- [Domain Entities](../profile-domain-and-native-experience/functional-design/domain-entities.md)
- [Frontend Components](../profile-domain-and-native-experience/functional-design/frontend-components.md)
- [Application Components](../../inception/application-design/components.md)
- [Component Methods](../../inception/application-design/component-methods.md)
- [Services](../../inception/application-design/services.md)

다음 결정은 이미 승인됐으며 이 단계에서 다시 열지 않는다.

1. `/resume`와 `/portfolio`는 Astro가 생성하는 한국어 정적 route다. 새 profile client JavaScript, runtime API, database, queue, cache, circuit breaker, load balancer 또는 background worker를 추가하지 않는다.
2. 핵심 콘텐츠와 link는 JavaScript 없이 server-rendered HTML에 존재한다. U1-owned hydrated component, 새 client chunk와 새 external runtime request 수는 각각 0이다.
3. Production profile 한 벌이 web, print와 PDF의 canonical fact source다. 실제 공개 사실은 별도 inventory와 명시적 사용자 승인이 있어야 production data에 들어간다.
4. Profile CSS의 incremental route-reachable unique gzip budget은 24KiB다. 기존 global shell resource는 baseline이고 콘텐츠 절단으로 budget을 맞추지 않는다.
5. Playwright 1.61.1의 bundled Chromium이 PDF engine이며, `pretendard@1.3.9` official subset을 same-origin build-time asset으로 사용한다.
6. PDF inspection은 actual PDF의 text, link annotation, structure tree, outline와 rendered page를 사용한다. Byte equality와 pixel-delta threshold는 content 또는 visual quality oracle이 아니다.
7. Browser/local-preview startup으로 분류된 transient failure만 최대 한 번 재시도한다. Source, semantic, parity, layout와 PBT failure는 즉시 실패한다.
8. `site/public/resume.pdf`는 tracked derived release asset이다. Temporary file, receipt와 diagnostics는 public 밖에 있고 canonical source가 아니다.
9. Vitest 4.1.10, fast-check 4.9.0과 `@fast-check/vitest` 0.4.1, local 100/CI 1,000 runs, 하나의 suite seed와 focused seed/path replay 계약을 유지한다.
10. Runtime traffic target, uptime SLO, load test, health check와 telemetry는 U1에서 N/A다. 기존 S3/CloudFront delivery는 inherited context이며 Infrastructure Design의 별도 compatibility/no-change gate를 대체하지 않는다.
11. Infrastructure, Terraform, AWS, deployment, remote push와 외부 Vault 변경은 이 단계의 권한 밖이다.

## 2. 필수 NFR Design 범주 평가

| 범주 | 적용 판정 | 이번 단계에서 확정할 설계 | 명시적 비적용 경계 |
|---|---|---|---|
| Resilience Patterns | Build-time/local automation에 제한적으로 적용 | clean startup retry, concurrent PDF generation, interrupted promotion recovery, fail-closed reconciliation | Runtime HA, failover, RTO/RPO, circuit breaker와 service retry는 새 runtime이 없어 N/A |
| Scalability Patterns | Static bounded-capacity policy로만 적용 | 3~6 projects와 static artifact 경계를 logical design에 표현하는 방식, 재평가 trigger | Autoscaling, shard, queue, cache, load test와 per-request throughput target은 N/A |
| Performance Patterns | 적용 | Profile CSS ownership/packaging, deterministic budget analyzer, external resource policy, build reuse 경계 | Lighthouse timing score, LCP/CLS SLO와 runtime cache tuning은 승인되지 않음 |
| Security Patterns | Product integrity/privacy 범위에 적용 | Private artifact path containment, source/manifest digest, safe JSON-LD embedding, loopback-only document generation | Security extension은 비활성이고 auth, session, secret, form, analytics, security compliance program은 N/A |
| Logical Components | 적용 | PBT coordinator, preview supervisor, font materializer, PDF renderer/inspector/promotion boundary, verification adapters | Application runtime infrastructure component는 추가하지 않음; C12는 application component가 의존하는 runtime service가 아님 |

## 3. 현재 설계에서 남은 결정

### 3.1 Resilience

- 한 번의 startup retry가 어떤 logical component와 process state를 소유하는지
- 동시에 두 generation이 실행될 때의 single-writer 또는 compare-and-swap 정책
- PDF와 receipt를 한 filesystem transaction처럼 다루면서 중간 crash를 탐지하는 commit point

### 3.2 Scalability

- Runtime scaling이 N/A라는 결정을 별도 logical policy component로 표현할지, artifact의 N/A record로만 표현할지
- Bounded project count나 static architecture가 바뀔 때 NFR 재평가를 시작하는 trigger

### 3.3 Performance

- Profile base, route-specific와 print CSS의 authored ownership과 compiled asset budget 산정 방식
- Post-build manifest 분석과 actual browser request ledger의 책임 분리
- Profile route에서 기존 CDN Pretendard와 사용하지 않는 KaTeX stylesheet를 처리하는 방식

### 3.4 Security and integrity

- Private staging/receipt path의 repository containment, symlink와 file-type 검증
- Source fingerprint와 ordered fact-manifest digest의 canonical byte encoding
- JSON-LD를 HTML script boundary에 안전하게 넣는 단일 serializer 책임

### 3.5 Logical components and orchestration

- Vitest worker가 시작되기 전 PBT seed/run/focus를 검증하는 coordinator
- E2E와 PDF가 공유할 production preview lifecycle
- Pretendard package에서 same-origin hashed asset으로 materialize하는 adapter
- PDF.js side effect와 deterministic fact occurrence/order mapping의 분리
- Machine inspection, exact-SHA manual review, receipt와 atomic public promotion의 순서
- First build, PDF generation과 final build를 결합하는 stable command topology

## 4. 목표 산출물

답변을 모두 검증한 뒤에만 다음 artifact를 생성한다.

- `aidlc-docs/construction/profile-domain-and-native-experience/nfr-design/nfr-design-patterns.md`
- `aidlc-docs/construction/profile-domain-and-native-experience/nfr-design/logical-components.md`

첫 artifact는 resilience, scalability, performance와 security/integrity pattern, failure path와 N/A 근거를 소유한다. 두 번째 artifact는 logical component, dependency direction, data/evidence flow, command orchestration과 C01~C05/C11/C12/S01/S04/S05 mapping을 소유한다.

## 5. 실행 계획

### 5.1 Context와 applicability 분석

- [x] 승인된 15개 U1 NFR과 9개 tech-stack decision을 읽고 binding target을 고정한다.
- [x] Functional Design과 Application Design의 C01~C05, C11, C12, S01, S04와 S05 책임을 분석한다.
- [x] Resilience, Scalability, Performance, Security와 Logical Components 다섯 범주를 모두 평가한다.
- [x] 새 runtime infrastructure가 없는 범주의 N/A 근거를 기록한다.
- [x] Obsidian source/generated, focused feature branch, no-deploy와 no-Vault-write 경계를 고정한다.

### 5.2 질문 생성

- [x] 승인 target을 다시 묻지 않고 pattern 또는 logical component 구조를 바꾸는 미결정만 식별한다.
- [x] 모든 질문에 최소 두 개의 의미 있는 선택지와 마지막 `X) Other`를 제공한다.
- [x] 질문을 이 계획에 `[Answer]:` 형식으로 저장한다.
- [x] 실제 이름, 경력, project, 성과, URL과 같은 public fact 승인을 질문 범위에서 제외한다.

### 5.3 답변 수집과 검증

- [x] Q1~Q16의 모든 `[Answer]:`가 작성될 때까지 기다린다.
- [x] 선택 형식, 명확성, 상호 일관성과 승인된 NFR 호환성을 검증한다.
- [x] 혼합되거나 모호한 답변만 별도 clarification question으로 좁혀 해소한다. 해당 없음 — 16개 답변이 모두 명확한 A 선택이다.
- [x] 최종 선택과 rejected alternative를 두 design artifact에 추적한다.

### 5.4 NFR design pattern 생성

- [x] Startup retry, single-writer/commit recovery와 fail-closed reconciliation pattern을 설계한다.
- [x] Static bounded-capacity/N/A와 재평가 trigger를 설계한다.
- [x] CSS/resource budget, manifest analyzer와 request ledger pattern을 설계한다.
- [x] Private path, digest, JSON-LD와 loopback-only integrity pattern을 설계한다.
- [x] 각 pattern에 trigger, participants, normal flow, failure flow, evidence와 NFR traceability를 기록한다.

### 5.5 Logical component 생성

- [x] PBT coordinator와 Vitest configuration boundary를 설계한다.
- [x] Static preview supervisor와 Playwright adapter boundary를 설계한다.
- [x] Font materializer와 generated asset boundary를 설계한다.
- [x] PDF renderer, inspector, mapper, receipt와 promotion components를 설계한다.
- [x] Stable command topology, build session, C11/S04/C12/S05 dependency direction과 U3 handoff를 설계한다.
- [x] Queue/cache/runtime service가 없는 이유와 inherited S3/CloudFront context를 명시한다.

### 5.6 품질과 완료 gate

- [x] 모든 NFR-U1-001~015가 하나 이상의 pattern, component 또는 explicit N/A에 연결되는지 검증한다.
- [x] Approved retry, no-new-JS, offline, exact fact parity, manual review와 atomic replacement 계약이 약화되지 않았는지 검증한다.
- [x] PBT-09와 Functional Design property handoff가 보존되는지 검증한다.
- [x] OBSIDIAN-01~05, Markdown link와 source/generated boundary를 검증한다.
- [x] 독립 검토 뒤 표준 2-option NFR Design 완료 gate를 제시하고 명시적 승인을 기다린다.

## 6. NFR Design Questions

각 `[Answer]:` 뒤에 선택한 문자 하나를 입력해 주세요. `X`를 선택하면 같은 줄에 원하는 pattern과 component boundary를 구체적으로 작성해 주세요.

### Question 1 — Resilience: startup retry의 소유권

승인된 “browser launch 또는 local preview readiness failure만 최대 한 번 재시도” 계약을 어떤 component가 소유해야 할까요?

A) 하나의 `StartupRetryController`가 preview/browser child process를 clean state로 종료·재생성하고 exact local route readiness부터 한 번만 다시 실행한다. Semantic, parity, layout, assertion과 PBT failure는 이 controller를 거치지 않는다. **(권장)**

B) Preview와 browser adapter가 각자 실패한 launch/readiness call을 같은 process state에서 한 번 다시 호출한다. Retry 횟수와 분류는 공통 policy object로 공유한다.

C) 최상위 document command가 startup failure일 때 build 이후 PDF pipeline 전체를 한 번 다시 실행한다. Semantic/parity/layout failure는 재시도하지 않는다.

X) Other (please describe after [Answer]: tag below) — retry owner, clean-state 의미, retry 대상 stage와 제외 stage를 설명한다.

[Answer]: A) 하나의 `StartupRetryController`가 preview/browser child process를 clean state로 종료·재생성하고 exact local route readiness부터 한 번만 다시 실행한다. Semantic, parity, layout, assertion과 PBT failure는 이 controller를 거치지 않는다.

### Question 2 — Resilience: concurrent generation과 interrupted promotion

두 `resume:pdf` 실행이 겹치거나 receipt/PDF promotion 중 process가 종료될 때 어떤 recovery pattern을 사용할까요?

A) Repository-local single-writer lock, 같은 filesystem의 unique private staging과 작은 promotion journal을 사용한다. Candidate와 receipt를 완전히 검증하고 receipt를 먼저 atomic replace한 뒤 public PDF rename을 commit point로 삼는다. 모든 시작과 verify는 lock/journal, receipt hash, PDF hash와 source를 reconcile하고 중간 상태면 fail closed한다. **(권장)**

B) Lock 없이 unique staging과 final source-fingerprint compare-and-swap을 사용한다. 먼저 promotion한 invocation만 성공하고 losing invocation은 public file을 건드리지 않은 채 실패한다. Interrupted two-file state는 다음 verify가 hash mismatch로 탐지한다.

C) 동시 실행은 operator contract로 금지하고 unique same-filesystem staging과 public PDF atomic rename만 사용한다. 별도 lock이나 journal 없이 다음 verify가 stale/mismatch를 탐지한다.

X) Other (please describe after [Answer]: tag below) — writer coordination, commit point, crash recovery와 stale state 판정을 설명한다.

[Answer]: A) Repository-local single-writer lock, 같은 filesystem의 unique private staging과 작은 promotion journal을 사용한다. Candidate와 receipt를 완전히 검증하고 receipt를 먼저 atomic replace한 뒤 public PDF rename을 commit point로 삼는다. 모든 시작과 verify는 lock/journal, receipt hash, PDF hash와 source를 reconcile하고 중간 상태면 fail closed한다.

### Question 3 — Scalability: runtime scaling N/A의 logical 표현

현재 3~6 projects와 static S3/CloudFront delivery에서는 runtime scaling mechanism이 N/A입니다. 이를 NFR Design에 어떻게 표현할까요?

A) 구현 코드가 없는 `StaticCapacityBoundary` logical policy를 둔다. Bounded content, static build/delivery 위임과 함께 project 상한 변경, runtime API/state 도입, 24KiB budget 초과 또는 delivery architecture 변경을 재평가 trigger로 기록한다. **(권장)**

B) 별도 logical component를 만들지 않고 `nfr-design-patterns.md`의 explicit N/A decision과 inherited-delivery annotation으로만 기록한다. 같은 재평가 trigger는 N/A record에 둔다.

C) Read-only `StaticCapacityReport` verification component가 project count, route/asset 수와 CSS budget evidence를 집계한다. Runtime scaling 기능은 없으며 report가 boundary 초과를 fail closed한다.

X) Other (please describe after [Answer]: tag below) — logical 표현, 구현 유무와 재평가 trigger를 설명한다.

[Answer]: A) 구현 코드가 없는 `StaticCapacityBoundary` logical policy를 둔다. Bounded content, static build/delivery 위임과 함께 project 상한 변경, runtime API/state 도입, 24KiB budget 초과 또는 delivery architecture 변경을 재평가 trigger로 기록한다.

### Question 4 — Performance: Profile CSS packaging과 24KiB budget

Profile-owned CSS를 어떻게 나누고 route-reachable unique gzip budget을 산정할까요?

A) Authored profile foundation, résumé/portfolio route layer와 named print layer로 나눈다. Astro/Vite가 합치거나 split한 실제 output을 manifest에서 역추적하고 두 profile route가 reach하는 profile-owned compiled asset의 union을 한 번씩 gzip 합산한다. **(권장)**

B) Résumé, portfolio와 print rule을 하나의 profile-only authored entry/bundle로 묶고 그 compiled asset 하나를 두 route가 공유한다. Budget은 그 asset의 gzip bytes로 판정한다.

C) Astro component-local style을 유지하고 build가 만든 module-to-asset ownership receipt로 profile source contribution을 식별한다. Shared output에서는 profile-owned byte attribution을 별도 deterministic rule로 계산한다.

X) Other (please describe after [Answer]: tag below) — authored style ownership, compiled asset reachability와 중복 byte 처리 규칙을 설명한다.

[Answer]: A) Authored profile foundation, résumé/portfolio route layer와 named print layer로 나눈다. Astro/Vite가 합치거나 split한 실제 output을 manifest에서 역추적하고 두 profile route가 reach하는 profile-owned compiled asset의 union을 한 번씩 gzip 합산한다. 

### Question 5 — Performance: deterministic budget analyzer

No-new-JS/request와 CSS budget evidence를 어느 build boundary에서 계산할까요?

A) C12의 read-only `ProfileAssetBudgetAnalyzer`가 production build manifest와 emitted files에서 route dependency graph, profile-owned unique gzip CSS와 새 JS를 계산한다. 별도 browser `RequestLedger`가 actual route의 new/external request를 검증하고 둘을 non-public JSON evidence로 합친다. **(권장)**

B) Astro/Vite build plugin이 profile source에 ownership metadata를 붙이고 build 중 budget을 바로 실패시킨다. Playwright request assertion은 external request만 독립 검증한다.

C) Read-only analyzer가 reconciled pre-U1 baseline build와 current build의 route manifest/asset graph를 각각 만들고 reachable asset delta를 gzip 합산한다. Playwright request ledger는 actual external/new request를 별도 검증한다.

X) Other (please describe after [Answer]: tag below) — measurement authority, shared asset attribution, browser evidence와 failure point를 설명한다.

[Answer]: A) C12의 read-only `ProfileAssetBudgetAnalyzer`가 production build manifest와 emitted files에서 route dependency graph, profile-owned unique gzip CSS와 새 JS를 계산한다. 별도 browser `RequestLedger`가 actual route의 new/external request를 검증하고 둘을 non-public JSON evidence로 합친다.

### Question 6 — Performance/Security: 기존 external stylesheet 처리

현재 `BaseLayout.astro`의 jsDelivr Pretendard, KaTeX와 preconnect를 profile route에서 어떻게 처리할까요?

A) C04에 typed route resource policy를 추가해 `/resume`와 `/portfolio`에서는 CDN Pretendard, preconnect와 사용하지 않는 KaTeX stylesheet를 생략하고 package-pinned local profile font만 제공한다. 다른 기존 route의 resource behavior는 바꾸지 않는다. **(권장)**

B) 기존 external stylesheet와 preconnect를 profile HTML에도 유지한다. PDF/verification의 loopback guard가 request를 abort하고, distinct local profile family와 `document.fonts.check()`가 CDN font를 사용하지 않았음을 증명한다. 기존 request는 U1 incremental budget에서 baseline으로 분류한다.

C) C04/BaseLayout이 optional immutable `HeadResource[]`를 받고, profile route가 local font만 명시적으로 전달한다. Prop가 없는 기존 route는 current default CDN/KaTeX resource set을 그대로 사용한다.

X) Other (please describe after [Answer]: tag below) — profile route와 기존 route별 resource policy, PDF network guard와 budget baseline을 설명한다.

[Answer]: A) C04에 typed route resource policy를 추가해 `/resume`와 `/portfolio`에서는 CDN Pretendard, preconnect와 사용하지 않는 KaTeX stylesheet를 생략하고 package-pinned local profile font만 제공한다. 다른 기존 route의 resource behavior는 바꾸지 않는다. 

### Question 7 — Security: private artifact filesystem boundary

Candidate PDF, receipt, journal과 diagnostics가 public path로 새거나 symlink를 통해 예상 밖 파일을 덮어쓰지 않도록 어떤 path policy를 사용할까요?

A) Repository root에서 resolve한 fixed allowlist를 사용하고 `lstat`/realpath로 symlink와 non-regular target을 거부한다. Public PDF와 같은 filesystem의 gitignored private directory에 exclusive-create unique staging을 만들고 모든 rename source/target containment를 재검증한다. **(권장)**

B) OS temporary directory에 unique staging을 만들고 검증이 끝난 candidate만 repository로 copy한 뒤 public path에서 atomic replace한다. Repository target containment과 type은 검증하지만 same-filesystem staging은 promotion 직전에 다시 만든다.

C) Fixed string path와 process working directory를 신뢰하고 file type/symlink 검증 없이 unique filename과 atomic rename만 사용한다.

X) Other (please describe after [Answer]: tag below) — allowed roots, symlink/file type, staging filesystem과 containment failure를 설명한다.

[Answer]: A) Repository root에서 resolve한 fixed allowlist를 사용하고 `lstat`/realpath로 symlink와 non-regular target을 거부한다. Public PDF와 같은 filesystem의 gitignored private directory에 exclusive-create unique staging을 만들고 모든 rename source/target containment를 재검증한다.

### Question 8 — Security/Integrity: source fingerprint와 manifest digest

Current source와 ordered fact manifest를 hash하기 전 canonical byte representation을 어떻게 만들까요?

A) 서로 다른 domain tag와 schema version을 가진 field-ordered, UTF-8 length-prefixed tuple encoding을 정의한다. NFC-normalized value, stable fact/entity/section ID와 explicit order vector를 포함하고 각각 SHA-256으로 digest한다. **(권장)**

B) Typed source/manifest projection을 RFC 8785 JSON Canonicalization Scheme으로 encode하고 서로 다른 domain prefix를 붙여 SHA-256으로 digest한다.

C) Explicitly constructed typed object의 documented insertion order를 유지한 `JSON.stringify` UTF-8 bytes에 schema/domain prefix를 붙여 SHA-256으로 digest한다.

X) Other (please describe after [Answer]: tag below) — canonical encoding, schema evolution, domain separation과 hash algorithm을 설명한다.

[Answer]: A) 서로 다른 domain tag와 schema version을 가진 field-ordered, UTF-8 length-prefixed tuple encoding을 정의한다. NFC-normalized value, stable fact/entity/section ID와 explicit order vector를 포함하고 각각 SHA-256으로 digest한다.

### Question 9 — Security/Integrity: JSON-LD script-boundary serializer

Typed JSON-LD를 `<script type="application/ld+json">`에 안전하게 embed하는 책임을 어디에 둘까요?

A) C04의 전용 pure `JsonLdScriptSerializer`가 typed document를 JSON serialization한 뒤 `<`, `>`, `&`, U+2028과 U+2029를 script-safe Unicode escape로 바꾸고, serialize → embed → extract → parse structural equality를 검증한다. Route-local raw serializer는 금지한다. **(권장)**

B) C04가 소유하는 generic authored `ScriptSafeJsonSerializer`에 typed JSON-LD를 위임한다. C03은 계속 typed document만 반환하고 C04의 contract test가 escape set, JSON-LD input restriction과 structural round-trip을 검증한다.

C) C04가 typed object를 Astro의 framework serialization path로 embed하고 custom escape transform은 추가하지 않는다. Adversarial script-boundary corpus와 extract/parse structural equality가 framework path의 안전성을 입증하지 못하면 이 선택은 fail closed한다.

X) Other (please describe after [Answer]: tag below) — serializer owner, escape set, input/output type와 round-trip oracle을 설명한다.

[Answer]: A) C04의 전용 pure `JsonLdScriptSerializer`가 typed document를 JSON serialization한 뒤 `<`, `>`, `&`, U+2028과 U+2029를 script-safe Unicode escape로 바꾸고, serialize → embed → extract → parse structural equality를 검증한다. Route-local raw serializer는 금지한다. 

### Question 10 — Logical Components: PBT pre-worker coordinator

하나의 suite seed와 run/focused replay policy를 Vitest worker 시작 전에 어떻게 적용할까요?

A) Cross-platform Node ESM `PbtRunCoordinator`가 `PBT_RUNS`, signed-int32 `PBT_SEED`, `PBT_PATH`, exact file/test focus를 검증·출력하고 local Vitest binary를 immutable environment로 spawn한다. PBT-only setup이 `fc.configureGlobal()`을 한 번 적용하고 tests는 environment를 다시 parse하지 않는다. **(권장)**

B) Dedicated PBT Vitest config/global setup이 config evaluation 중 seed/run을 생성·검증하고 fast-check global config와 report를 제공한다. Thin npm command는 exact file/test focus와 path 조합만 검증한다.

C) npm pre-run coordinator가 validated seed/run/focus를 immutable temporary run-config JSON으로 만든 뒤 Vitest CLI를 시작하고, PBT-only global setup이 worker 생성 전에 그 config를 읽어 `fc.configureGlobal()`을 적용한다. 정상·실패 종료 모두에서 config cleanup을 수행한다.

X) Other (please describe after [Answer]: tag below) — pre-worker owner, seed generation/logging, global configuration과 focused path validation을 설명한다.

[Answer]: A) Cross-platform Node ESM `PbtRunCoordinator`가 `PBT_RUNS`, signed-int32 `PBT_SEED`, `PBT_PATH`, exact file/test focus를 검증·출력하고 local Vitest binary를 immutable environment로 spawn한다. PBT-only setup이 `fc.configureGlobal()`을 한 번 적용하고 tests는 environment를 다시 parse하지 않는다.

### Question 11 — Logical Components: production preview lifecycle

Browser E2E와 PDF generation이 production preview의 start/readiness/cleanup 계약을 어떻게 공유할까요?

A) 공용 Node `StaticPreviewSupervisor`가 clean production build를 입력받아 ephemeral `127.0.0.1` port의 새 server만 시작하고 exact routes를 probe하며 process tree cleanup과 Q1 retry를 소유한다. E2E/PDF adapter는 base URL을 받아 assertions만 수행한다. **(권장)**

B) Playwright `webServer`가 `test:e2e` lifecycle을 소유하고 S04가 별도 PDF preview supervisor를 사용한다. 두 구현은 동일한 readiness predicate, loopback policy와 error codes를 공유한다.

C) `test:e2e`, `resume:pdf`와 `resume:pdf:verify`가 각각 server lifecycle을 소유하되 공통 utility로 port selection과 route probe만 공유한다.

X) Other (please describe after [Answer]: tag below) — server owner, port/reuse policy, readiness, retry integration과 cleanup을 설명한다.

[Answer]: A) 공용 Node `StaticPreviewSupervisor`가 clean production build를 입력받아 ephemeral `127.0.0.1` port의 새 server만 시작하고 exact routes를 probe하며 process tree cleanup과 Q1 retry를 소유한다. E2E/PDF adapter는 base URL을 받아 assertions만 수행한다.

### Question 12 — Logical Components/Performance: Pretendard materialization

Pinned Pretendard subset과 license/integrity evidence를 Astro/Vite asset graph에 어떻게 넣을까요?

A) Authored `ProfileFontMaterializer`가 lockfile-pinned package의 allowlisted official subset files, hash와 license를 검증해 gitignored private generated input을 만든다. Authored profile font entry가 distinct family alias로 이를 참조하고 Astro/Vite가 same-origin hashed assets를 emit한다. **(권장)**

B) Authored profile font entry가 `pretendard` package의 official CSS/assets를 직접 import하고 Vite가 emit한다. 별도 read-only verifier가 resolved package version, emitted file hash, family selection과 license를 evidence로 남긴다.

C) Reviewed subset WOFF2/CSS/license snapshot을 authored vendor directory에 tracking하고, install된 package와 snapshot hash가 같은지 build gate에서 검증한다.

X) Other (please describe after [Answer]: tag below) — authored/generated boundary, family alias, file allowlist/hash, license와 Vite emission을 설명한다.

[Answer]: A) Authored `ProfileFontMaterializer`가 lockfile-pinned package의 allowlisted official subset files, hash와 license를 검증해 gitignored private generated input을 만든다. Authored profile font entry가 distinct family alias로 이를 참조하고 Astro/Vite가 same-origin hashed assets를 emit한다. 

### Question 13 — Logical Components: PDF extraction과 fact mapping

PDF.js side effect와 deterministic fact/entity/section/order mapping을 어떤 boundary로 분리할까요?

A) S04가 side-effect `PdfInspectionAdapter`와 local viewer를 소유하고, C11이 pure `ResumeEvidenceMapper`와 `ResumeInspectionReceiptAssembler`를 소유한다. C12는 이 public contract를 read-only로 실행·관찰하고 evidence를 report한다. Ambiguity/mismatch는 C11 assembler가 fail closed한다. **(권장)**

B) S04는 하나의 cohesive `PdfInspectionAdapter`로 PDF.js extraction과 viewer side effect만 소유한다. C11의 하나의 cohesive `ResumeDocumentEvidenceOracle`이 mapping, ambiguity/parity 판정과 receipt assembly를 함께 소유하고, C12는 두 contract의 결과를 read-only로 실행·집계한다.

X) Other (please describe after [Answer]: tag below) — S04 side effect, C11 pure contract/mapper, C12 read-only verification, ambiguity handling과 receipt assembler ownership을 모두 설명한다.

[Answer]: A) S04가 side-effect `PdfInspectionAdapter`와 local viewer를 소유하고, C11이 pure `ResumeEvidenceMapper`와 `ResumeInspectionReceiptAssembler`를 소유한다. C12는 이 public contract를 read-only로 실행·관찰하고 evidence를 report한다. Ambiguity/mismatch는 C11 assembler가 fail closed한다.

### Question 14 — Logical Components/Resilience: candidate, manual review와 promotion

Machine inspection과 exact-SHA manual visual/reading-order review를 public PDF 교체 전에 어떻게 연결할까요?

A) `resume:pdf`의 prepare mode가 private candidate와 draft receipt/viewer session만 만든다. 사용자가 exact SHA에 review outcome을 기록한 뒤 같은 command의 explicit promote mode가 source fingerprint, receipt, lock과 candidate를 다시 검증하고 atomic promotion한다. `resume:pdf:verify`는 항상 read-only다. **(권장)**

B) 하나의 interactive `resume:pdf` invocation이 candidate 생성, local viewer 안내, 사용자 확인과 review record 작성을 순서대로 수행하고 확인 직후 promotion한다. Non-interactive/CI 실행은 candidate 생성까지만 허용한다.

X) Other (please describe after [Answer]: tag below) — candidate ID/SHA, human action, recheck, promotion command와 CI mutation 금지를 설명한다.

[Answer]: A) `resume:pdf`의 prepare mode가 private candidate와 draft receipt/viewer session만 만든다. 사용자가 exact SHA에 review outcome을 기록한 뒤 같은 command의 explicit promote mode가 source fingerprint, receipt, lock과 candidate를 다시 검증하고 atomic promotion한다. `resume:pdf:verify`는 항상 read-only다. 

### Question 15 — Logical Components: release receipt persistence

Exact public PDF가 machine/manual gate를 통과했다는 non-public receipt를 어디에 보존할까요?

A) Candidate, screenshots, journal과 diagnostics는 gitignored private artifact로 두고, promoted public PDF와 exact SHA/source/manifest/reviewer outcome을 묶는 current release receipt만 dedicated non-public repository path에 tracking한다. Fresh clone/CI의 `resume:pdf:verify`가 이를 read-only 검증한다. **(권장)**

B) Receipt를 모두 gitignored private artifact로 두고 fresh clone/CI가 public PDF에서 machine receipt를 재생성한다. Manual review history는 AI-DLC review 문서와 commit review에만 남긴다.

C) Repository에는 receipt를 tracking하지 않고 CI artifact store에 commit SHA별 release receipt를 보존한다. Local verify는 machine gate만 실행하고 manual evidence 조회는 CI에 위임한다.

X) Other (please describe after [Answer]: tag below) — tracked/ephemeral 범위, manual evidence, fresh-clone verification과 retention을 설명한다.

[Answer]: A) Candidate, screenshots, journal과 diagnostics는 gitignored private artifact로 두고, promoted public PDF와 exact SHA/source/manifest/reviewer outcome을 묶는 current release receipt만 dedicated non-public repository path에 tracking한다. Fresh clone/CI의 `resume:pdf:verify`가 이를 read-only 검증한다.

### Question 16 — Logical Components: build와 stable command topology

First-pass `/resume`, PDF promotion과 final static output을 어떤 command flow로 결합할까요?

A) `resume:pdf`가 clean first build → supervised preview → candidate/inspection/review/promotion → clean second build → final route/link/MIME/parity verify를 수행한다. `resume:pdf:verify`와 `test:e2e`는 독립 실행 시 각각 clean validated build/preview를 소유한다. CI/U3는 read-only `test:unit`, `test:pbt`, `test:e2e`, `resume:pdf:verify`만 집계하고, 다섯 번째 stable command인 mutating `resume:pdf`는 명시적 operator release action으로 남긴다. **(권장)**

B) Clean build 한 번 뒤 candidate를 검증해 `site/public/resume.pdf`와 current `site/dist/resume.pdf`에 함께 promote하고 final build 없이 route/link/MIME/parity를 검증한다. 다음 일반 build가 public PDF를 다시 copy한다.

C) 별도 in-process `U1BuildSession`이 clean build와 preview를 한 번 소유하고 `test:e2e`, PDF generation과 final verification adapter가 같은 immutable session을 공유한다. Public PDF promotion 뒤 dist asset만 controlled refresh하고 session receipt로 stale reuse를 막는다.

X) Other (please describe after [Answer]: tag below) — build 횟수, dist/public boundary, direct command self-containment, aggregate와 CI mutation 정책을 설명한다.

[Answer]: A) `resume:pdf`가 clean first build → supervised preview → candidate/inspection/review/promotion → clean second build → final route/link/MIME/parity verify를 수행한다. `resume:pdf:verify`와 `test:e2e`는 독립 실행 시 각각 clean validated build/preview를 소유한다. CI/U3는 read-only `test:unit`, `test:pbt`, `test:e2e`, `resume:pdf:verify`만 집계하고, 다섯 번째 stable command인 mutating `resume:pdf`는 명시적 operator release action으로 남긴다.

## 7. Artifact Gate

Q1~Q16 답변 검증과 두 필수 artifact의 생성·독립 검토가 완료됐다. 현재 단계는 `nfr-design-patterns.md`와 `logical-components.md`의 명시적 사용자 승인을 기다린다. 승인 전에는 U1 Infrastructure Design으로 진행하지 않는다.
