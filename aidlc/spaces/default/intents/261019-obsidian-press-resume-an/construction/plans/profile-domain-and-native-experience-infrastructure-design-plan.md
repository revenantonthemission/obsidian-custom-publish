# U1 Infrastructure Design Plan — Profile Domain and Native Experience

## 문서 상태

- **단계**: CONSTRUCTION — U1 Infrastructure Design
- **상태**: 완료 및 승인됨 — 2026-07-24T07:47:23Z, 사용자 입력: "다음 단계를 진행해줘"
- **Unit**: U1 Profile Domain and Native Experience
- **Bounded Context**: Profile Experience
- **작성일**: 2026-07-24
- **Feature Branch Context**: `codex/feature/resume-profile-experience` at reconciled local `develop` `67f70a4240819ed8b9408360f9b59512660f8e10`
- **Infrastructure Intent**: Existing AWS S3/CloudFront compatibility and no-change decision
- **PBT Enforcement**: Infrastructure Design에는 직접 적용되는 PBT rule이 없어 N/A; Code Generation과 Build and Test 의무는 유지
- **Extensions**: Obsidian Press project extension 활성; Security와 Resiliency extension 비활성
- **Question Set**: Q1~Q8 = A/A/A/A/A/A/A/A; Q3 clarification = A; completeness, option-text와 consistency 검증 완료
- **Question Validation**: 2026-07-24T07:00:01Z 통과; 8 headings, 8 empty answer lines, 8 final Other options, 8 recommended options
- **Independent Review**: 2026-07-24T07:00:01Z 최종 통과; blocking 또는 material finding 없음
- **Artifact Validation**: 2026-07-24T07:40:24Z 통과; relative links, Markdown tables/fences, NFR/Q coverage, `git diff --check`와 Mermaid 3개 render 성공
- **Independent Artifact Review**: Jenkins physical deploy/authority, exact rollback, direct-vs-full-site build와 unsafe fixture default finding을 수정한 뒤 최종 통과; blocking 또는 material finding 없음

## 1. 입력과 승인된 경계

이 계획은 다음 승인 artifact와 현재 authored infrastructure를 입력으로 사용한다.

- [U1 NFR Design Patterns](../profile-domain-and-native-experience/nfr-design/nfr-design-patterns.md)
- [U1 Logical Components](../profile-domain-and-native-experience/nfr-design/logical-components.md)
- [U1 NFR Requirements](../profile-domain-and-native-experience/nfr-requirements/nfr-requirements.md)
- [U1 Tech Stack Decisions](../profile-domain-and-native-experience/nfr-requirements/tech-stack-decisions.md)
- [U1 Business Logic Model](../profile-domain-and-native-experience/functional-design/business-logic-model.md)
- [U1 Business Rules](../profile-domain-and-native-experience/functional-design/business-rules.md)
- [U1 Domain Entities](../profile-domain-and-native-experience/functional-design/domain-entities.md)
- [U1 Frontend Components](../profile-domain-and-native-experience/functional-design/frontend-components.md)
- [Unit Definitions](../../inception/application-design/unit-of-work.md)
- [Unit Dependencies](../../inception/application-design/unit-of-work-dependency.md)
- [Reverse-Engineered Architecture](../../inception/reverse-engineering/architecture.md)
- Authored infrastructure and automation: `infra/`, `site/astro.config.mjs`, `Justfile`, `Jenkinsfile`

다음 결정은 이미 승인됐으며 이 단계에서 다시 열지 않는다.

1. `/resume`와 `/portfolio`는 Astro static output이고 `/resume.pdf`는 reviewed tracked derived asset이다.
2. 새 runtime API, server, Lambda, container, database, queue, application cache, browser farm, authentication, analytics 또는 health service를 추가하지 않는다.
3. Existing private S3 origin, CloudFront OAC/distribution/function, ACM input과 Cloudflare DNS가 delivery context다.
4. Profile font는 package-pinned Pretendard subset에서 build-time materialize되고 Astro/Vite가 same-origin hashed asset으로 emit한다.
5. Receipt, candidate, journal, screenshot와 verification evidence는 `site/dist/`와 public origin에 들어가지 않는다.
6. `site/public/resume.pdf` promotion의 local atomicity를 S3 deployment atomicity로 과장하지 않는다.
7. Infrastructure Design은 Terraform edit, AWS mutation, deployment, invalidation 실행, remote push 또는 external Vault write 권한을 만들지 않는다.
8. Compatibility gap이 Terraform, AWS, DNS, cache policy 또는 deployment implementation 변경을 요구하면 U1 Code Generation으로 흡수하지 않고 별도 scope와 권한을 요청한다.

## 2. Existing Infrastructure Baseline

| Layer | Existing choice | U1 compatibility observation |
|---|---|---|
| Static generator | Astro `output: "static"` | `/resume/index.html`, `/portfolio/index.html`, copied `/resume.pdf`와 hashed font asset을 생성 가능 |
| Origin storage | Private S3 bucket `obsidian-custom-s3` | Existing `site/dist/` sync target; 별도 profile bucket 불필요 |
| Origin access | CloudFront OAC with S3 `GetObject` | HTML, PDF와 WOFF2에 같은 read-only path 적용 |
| Clean route | Viewer-request CloudFront Function | `/resume`와 `/portfolio`를 포함한 모든 extensionless URI에 `/index.html`을 붙이고 dotted `/resume.pdf`와 hashed assets는 그대로 둠 |
| Delivery | One CloudFront default behavior, HTTPS redirect, GET/HEAD, compression | 새 origin, API gateway, load balancer 또는 route behavior 불필요 |
| Cache | AWS managed CachingOptimized policy | Stable `/resume.pdf`도 shared cache를 사용; explicit deploy는 현재 `/*` invalidation 수행 |
| Headers | Existing response-headers policy | `font-src 'self'`가 same-origin WOFF2를 허용하고 `nosniff` 때문에 MIME evidence가 중요 |
| Logging | CloudFront access log bucket, 90-day lifecycle | Existing delivery logging only; U1-specific telemetry/SLO 없음 |
| Deployment | `aws s3 sync site/dist/ ... --delete` then full invalidation | 배포는 비원자적이며 이번 단계에서 실행하거나 변경하지 않음 |

## 3. 필수 Infrastructure 범주 평가

| 범주 | 적용 판정 | 질문 또는 설계 초점 | 현재 예상 결론 |
|---|---|---|---|
| Deployment Environment | 적용 | 기존 production topology와 local/CI non-deploy environment 경계 | Existing AWS provider/topology 유지 |
| Compute Infrastructure | Build/test에만 적용 | Fresh clone direct Astro build의 font bootstrap과 local/Jenkins process ownership | Runtime compute 없음 |
| Storage Infrastructure | 적용 | HTML/PDF/font object mapping, MIME와 private evidence exclusion | Existing private S3 공유 |
| Messaging Infrastructure | N/A 예상 | PDF workflow가 local sequential orchestration인지 runtime async service인지 확인 | Queue/event bus 없음 |
| Networking Infrastructure | 적용 | Clean-route rewrite, OAC, default behavior, CSP와 same-origin asset | Existing CloudFront contract 유지 |
| Cache and Rollback | 적용 | Stable PDF cache, broad invalidation, non-atomic rollout와 rollback claim | Existing behavior를 inherited limitation과 함께 유지 |
| Monitoring Infrastructure | N/A 예상 | Existing access logs와 local readiness evidence의 경계 | 새 alarm/synthetic/telemetry 없음 |
| Shared Infrastructure | 적용 | Blog와 profile asset의 resource sharing/isolation | Existing single-tenant resources 공유 |

## 4. 확인된 Compatibility Risk

### 4.1 Fresh-clone font bootstrap

NFR Design은 `site/.generated/profile-font/`를 gitignored generated input으로 정했다. 현재 `Justfile`과 `Jenkinsfile`은 direct `npx astro build`를 실행하므로, clean build가 별도 수동 단계 없이 `ProfileFontMaterializer`를 호출하지 않으면 fresh clone에서 font import가 실패할 수 있다. Infrastructure Design은 모든 canonical Astro production build entry가 같은 verified materializer를 실행하는 계약을 확정해야 한다.

### 4.2 Stable PDF cache와 rollout

`/resume.pdf`는 stable path이며 current CloudFront managed cache policy를 공유한다. Existing deploy는 S3 sync 뒤 `/*` invalidation을 요청하지만 sync와 invalidation은 atomic release가 아니다. 이번 U1은 coherent local release set과 exact PDF receipt를 보장하되 production cutover atomicity를 새로 주장하지 않는다.

### 4.3 MIME와 `nosniff`

Existing response policy는 `X-Content-Type-Options: nosniff`를 적용한다. 따라서 local production preview와 build artifact에서 PDF `application/pdf`, WOFF2 `font/woff2`, non-empty body와 URL path를 검증해야 한다. 실제 S3 object metadata나 CloudFront response 확인은 별도로 승인된 deployment가 있을 때만 수행할 수 있고, 현재 stage에서 network/AWS action을 실행하지 않는다.

### 4.4 CI handoff

Current Jenkins는 Node/Playwright provisioning과 U1 read-only gate를 아직 포함하지 않고 build 뒤 deploy한다. U3가 pinned browser provisioning과 네 read-only stable command를 deploy 이전에 연결한다. U1 Infrastructure Design은 `resume:pdf`를 CI에서 실행하거나 Jenkins deploy behavior를 변경하지 않는다.

### 4.5 Direct build와 deployment-complete build

Fresh clone direct Astro build는 `content/meta`가 없을 때도 축소된 profile/static-shell output으로 성공할 수 있다. 따라서 direct build는 font/profile contract 검증용이며 `sync --delete` input이 아니다. Deployment-eligible full-site candidate는 exact production Vault input, deploy preprocessing, generated `content/`와 copied public JSON/assets, expected route/asset inventory와 private exclusion evidence를 모두 요구한다.

### 4.6 Existing deployment-input and rollback gaps

`just deploy`는 `VAULT_PATH`가 unset이면 `./fixtures/vault`를 `--stamp-published`하고 그 candidate를 sync할 수 있다. Current Jenkins는 nightly build 뒤 unconditional Deploy를 실행하며 두 path 모두 explicit path/generated-output completeness gate가 없다. 또한 previous complete `site/dist/`/Vault snapshot/S3 version이 보존되지 않아 production exact rollback은 보장되지 않고 current procedure는 best-effort redeploy뿐이다. 이 stage는 path를 실행·변경하지 않고 별도 authorization trigger로 기록한다.

## 5. 목표 산출물

모든 답변을 검증한 뒤 다음 artifact를 생성한다.

- `aidlc-docs/construction/profile-domain-and-native-experience/infrastructure-design/infrastructure-design.md`
- `aidlc-docs/construction/profile-domain-and-native-experience/infrastructure-design/deployment-architecture.md`
- `aidlc-docs/construction/shared-infrastructure.md`

`shared-infrastructure.md`는 새 shared resource를 제안하지 않는다. U1/U2/U3가 재사용하는 existing S3/CloudFront/OAC/header/logging/deployment context와 no-change/no-authority boundary를 한 곳에 기록한다.

## 6. 실행 계획

### 6.1 Context와 baseline 분석

- [x] 승인된 U1 Functional Design, NFR Requirements와 NFR Design을 읽고 infrastructure handoff를 고정한다.
- [x] Unit ownership/dependency, requirements와 reverse-engineered architecture를 읽는다.
- [x] `infra/main.tf`, variables/outputs, `site/astro.config.mjs`, `Justfile`과 `Jenkinsfile`을 inspection한다.
- [x] Deployment, compute, storage, messaging, networking, monitoring과 shared infrastructure 범주를 모두 평가한다.
- [x] Cache/invalidation, rollout/rollback, MIME와 font bootstrap risk를 식별한다.
- [x] Security와 Resiliency extension이 비활성이고 PBT가 이 stage에는 N/A임을 확인한다.

### 6.2 질문 생성

- [x] 이미 승인된 static/no-runtime/no-deploy 결정을 약화하지 않고 concrete infrastructure mapping을 확인하는 질문을 작성한다.
- [x] 모든 질문에 최소 두 개의 의미 있는 선택지, 마지막 `X) Other`와 빈 `[Answer]:`를 제공한다.
- [x] 모든 option을 blank line으로 분리하고 Infrastructure Design plan에 저장한다.
- [x] 새 resource가 필요한 선택은 별도 scope/authority가 필요함을 명시한다.
- [x] 질문 수, answer tag, final Other option과 Markdown structure를 검증한다.

### 6.3 답변 수집과 검증

- [x] Q1~Q8의 모든 `[Answer]:`가 작성될 때까지 기다린다.
- [x] 선택 형식과 option-text 일치를 검증한다. 8개 답변이 모두 정확한 A 선택이다.
- [x] 상호 일관성과 기존 승인 호환성을 검증한다. Q3 clarification A로 original list가 representative U1 object list임을 확정했다.
- [x] 모호하거나 충돌하는 답변만 별도 clarification question file로 좁혀 해소한다. `profile-domain-and-native-experience-infrastructure-design-clarification-questions.md`의 1개 답변 A로 해소했다.
- [x] 확정 선택, rejected alternative와 별도 권한 trigger를 design artifact에 추적한다.

### 6.4 Infrastructure artifact 생성

- [x] Existing AWS service와 U1 static artifact의 mapping을 `infrastructure-design.md`에 기록한다.
- [x] Local build부터 `site/dist/`, S3 origin과 CloudFront route까지의 architecture를 `deployment-architecture.md`에 기록한다.
- [x] Compute/storage/messaging/monitoring의 N/A 또는 inherited-context 근거를 기록한다.
- [x] Clean route, PDF/font MIME, cache/invalidation, non-atomic rollout와 rollback boundary를 기록한다.
- [x] Fresh-clone font materialization과 U3 CI handoff를 Code Generation input으로 고정한다.
- [x] Existing shared infrastructure와 no-change/no-authority contract를 `shared-infrastructure.md`에 기록한다.

### 6.5 품질과 완료 gate

- [x] `/resume`, `/portfolio`, `/resume.pdf`와 hashed font path가 existing origin/rewrite/cache/header contract에 매핑되는지 검증한다.
- [x] Receipt/private artifact가 `site/dist/`와 S3 sync set에서 제외되는지 검증한다.
- [x] Terraform/AWS/DNS/Jenkins deploy mutation 또는 deployment action이 설계에 암묵적으로 포함되지 않았는지 검증한다.
- [x] OBSIDIAN-01~05 compliance와 Git-flow/no-unrelated-change boundary를 검증한다.
- [x] Relative link, Markdown table/fence와 Mermaid/text-alternative syntax를 검증한다.
- [x] 독립 검토 뒤 표준 2-option Infrastructure Design 완료 gate를 제시하고 명시적 승인을 기다린다.

## 7. Infrastructure Design Questions

각 `[Answer]:` 뒤에 선택한 문자 하나를 입력해 주세요. `X`를 선택하면 같은 줄에 원하는 infrastructure contract를 구체적으로 작성해 주세요.

### Question 1 — Deployment Environment

U1의 배포 환경과 provider mapping을 어떻게 고정할까요?

A) Existing production `rvnnt.dev` topology인 private S3 + CloudFront + existing ACM/Cloudflare DNS를 그대로 사용한다. Local loopback preview와 later Jenkins validation은 non-deploy build/test environment이고, 별도 staging cloud environment를 만들지 않는다. **(권장)**

B) U1 acceptance용 별도 staging S3 bucket과 CloudFront distribution/domain을 만든다. 이는 현재 no-change 범위를 벗어나므로 별도 Infrastructure scope와 권한을 먼저 승인받는다.

X) Other (please describe after [Answer]: tag below) — provider, production/staging/local environment와 resource ownership을 설명한다.

[Answer]:  A) Existing production `rvnnt.dev` topology인 private S3 + CloudFront + existing ACM/Cloudflare DNS를 그대로 사용한다. Local loopback preview와 later Jenkins validation은 non-deploy build/test environment이고, 별도 staging cloud environment를 만들지 않는다.

### Question 2 — Compute Infrastructure와 fresh-clone build

Runtime compute를 추가하지 않으면서 generated profile font가 모든 canonical build entry에서 준비되도록 어떻게 구성할까요?

A) Dedicated Astro build integration이 module graph resolution 전에 shared `ProfileFontMaterializer`를 실행한다. Fresh clone의 direct `npx astro build`, `npm run build`, Just와 Jenkins build는 별도 수동 pre-step 없이 동작하고, S04 PDF flow도 같은 idempotent adapter를 재사용한다. Node/Playwright는 local 또는 later Jenkins build/test process일 뿐 deployed compute가 아니다. **(권장)**

B) `astro.config.mjs`의 build preflight가 config를 반환하기 전에 shared `ProfileFontMaterializer`를 실행한다. Fresh clone의 direct `npx astro build`, `npm run build`, Just와 Jenkins build를 모두 보존하되 config evaluation이 verified filesystem preparation을 소유한다. S04 PDF flow는 같은 adapter를 재사용한다.

X) Other (please describe after [Answer]: tag below) — materializer invocation point, fresh-clone behavior와 local/CI/runtime compute 경계를 설명한다.

[Answer]: A) Dedicated Astro build integration이 module graph resolution 전에 shared `ProfileFontMaterializer`를 실행한다. Fresh clone의 direct `npx astro build`, `npm run build`, Just와 Jenkins build는 별도 수동 pre-step 없이 동작하고, S04 PDF flow도 같은 idempotent adapter를 재사용한다. Node/Playwright는 local 또는 later Jenkins build/test process일 뿐 deployed compute가 아니다.

### Question 3 — Storage, public object와 MIME evidence

HTML, PDF, font와 non-public evidence를 storage에 어떻게 매핑할까요?

A) `dist/resume/index.html`, `dist/portfolio/index.html`, `dist/resume.pdf`와 Astro/Vite의 `_astro/<hash>.woff2`만 existing private S3 origin에 배포될 public set으로 둔다. Receipt/candidate/journal/diagnostics는 `dist/` 밖에 유지한다. Local gate가 PDF `application/pdf`, font `font/woff2`, non-empty body와 final-copy identity를 검사하고, 실제 CloudFront MIME 확인은 별도로 승인된 deployment 때 read-only check로 수행한다. **(권장)**

B) Profile HTML/PDF/font를 dedicated bucket 또는 origin prefix에 격리하고 explicit metadata policy를 적용한다. 이는 새 storage/origin/cache mapping이므로 별도 Infrastructure scope와 권한을 먼저 승인받는다.

X) Other (please describe after [Answer]: tag below) — public object key, private evidence location, MIME authority와 deployment-time evidence를 설명한다.

[Answer]: A) `dist/resume/index.html`, `dist/portfolio/index.html`, `dist/resume.pdf`와 Astro/Vite의 `_astro/<hash>.woff2`만 existing private S3 origin에 배포될 public set으로 둔다. Receipt/candidate/journal/diagnostics는 `dist/` 밖에 유지한다. Local gate가 PDF `application/pdf`, font `font/woff2`, non-empty body와 final-copy identity를 검사하고, 실제 CloudFront MIME 확인은 별도로 승인된 deployment 때 read-only check로 수행한다.

### Question 4 — Messaging Infrastructure

PDF prepare/review/promote와 verification workflow에 messaging 또는 background processing을 도입할까요?

A) 도입하지 않는다. Operator가 실행한 local process가 sequential command, repository-local lock와 journal을 소유하고 종료 시 persistent runtime worker나 queue를 남기지 않는다. Messaging은 명시적 N/A다. **(권장)**

B) PDF generation 또는 verification을 queue/event bus와 remote worker로 비동기 실행한다. 이는 runtime service, IAM, retry와 monitoring 설계가 필요하므로 별도 Infrastructure scope와 권한을 먼저 승인받는다.

X) Other (please describe after [Answer]: tag below) — async boundary, queue/worker 유무와 failure ownership을 설명한다.

[Answer]: A) 도입하지 않는다. Operator가 실행한 local process가 sequential command, repository-local lock와 journal을 소유하고 종료 시 persistent runtime worker나 queue를 남기지 않는다. Messaging은 명시적 N/A다.

### Question 5 — Networking, clean routes와 CSP

새 profile route와 asset을 CloudFront networking에 어떻게 연결할까요?

A) Existing OAC와 single default behavior를 재사용한다. Viewer-request function은 `/resume`와 `/portfolio`를 포함한 모든 extensionless URI에 `/index.html`을 붙이고 dotted `/resume.pdf`와 `_astro/...woff2`는 그대로 둔다. GET/HEAD, HTTPS redirect와 current response-header policy를 유지하며 same-origin font는 existing `font-src 'self'`로 제공한다. **(권장)**

B) PDF/font용 dedicated CloudFront cache behavior, function 또는 response-header/CSP policy를 추가한다. 이는 Terraform/CloudFront mutation이므로 별도 Infrastructure scope와 권한을 먼저 승인받는다.

X) Other (please describe after [Answer]: tag below) — origin, behavior, URI rewrite, method, TLS와 header/CSP mapping을 설명한다.

[Answer]: A) Existing OAC와 single default behavior를 재사용한다. Viewer-request function은 `/resume`와 `/portfolio`를 포함한 모든 extensionless URI에 `/index.html`을 붙이고 dotted `/resume.pdf`와 `_astro/...woff2`는 그대로 둔다. GET/HEAD, HTTPS redirect와 current response-header policy를 유지하며 same-origin font는 existing `font-src 'self'`로 제공한다.

### Question 6 — Cache, rollout와 rollback

Stable `/resume.pdf`와 hashed font의 cache/invalidation 및 rollback contract를 어떻게 정할까요?

A) Existing managed CachingOptimized behavior와 explicit deployment의 `/*` invalidation을 그대로 사용한다. S3 sync와 invalidation이 atomic하지 않다는 inherited limitation을 기록하고 U1은 coherent pre-deploy artifact set까지만 보장한다. 향후 rollback은 이전 reviewed revision의 complete artifact set을 재배포하고 invalidate하는 operation이며 별도 deployment authority가 필요하다. **(권장)**

B) Immutable versioned release prefix와 atomic origin pointer/function switch를 추가해 HTML/PDF/font를 한 번에 cut over하고 rollback한다. 이는 new deployment architecture이므로 별도 Infrastructure scope와 권한을 먼저 승인받는다.

C) `/resume.pdf`에 dedicated short-TTL 또는 no-cache behavior를 추가하고 fonts는 current immutable cache를 유지한다. 이는 CloudFront policy mutation이므로 별도 Infrastructure scope와 권한을 먼저 승인받는다.

X) Other (please describe after [Answer]: tag below) — cache key/TTL, invalidation, rollout atomicity와 rollback authority를 설명한다.

[Answer]: A) Existing managed CachingOptimized behavior와 explicit deployment의 `/*` invalidation을 그대로 사용한다. S3 sync와 invalidation이 atomic하지 않다는 inherited limitation을 기록하고 U1은 coherent pre-deploy artifact set까지만 보장한다. 향후 rollback은 이전 reviewed revision의 complete artifact set을 재배포하고 invalidate하는 operation이며 별도 deployment authority가 필요하다.

### Question 7 — Monitoring Infrastructure

U1 static profile delivery에 어떤 monitoring을 추가할까요?

A) 새 monitoring을 추가하지 않는다. Existing CloudFront access logs와 90-day lifecycle은 inherited shared context로 유지하고, U1 acceptance는 local production preview의 route/PDF/font readiness와 read-only verification evidence로 닫는다. Uptime SLO, alarm, synthetic check, analytics와 feature telemetry는 N/A다. **(권장)**

B) CloudWatch alarm, synthetic canary와 route-specific dashboard를 추가한다. 이는 runtime operations와 Infrastructure scope를 확장하므로 별도 권한을 먼저 승인받는다.

X) Other (please describe after [Answer]: tag below) — logs, metric, alert, synthetic check, retention과 ownership을 설명한다.

[Answer]: A) 새 monitoring을 추가하지 않는다. Existing CloudFront access logs와 90-day lifecycle은 inherited shared context로 유지하고, U1 acceptance는 local production preview의 route/PDF/font readiness와 read-only verification evidence로 닫는다. Uptime SLO, alarm, synthetic check, analytics와 feature telemetry는 N/A다.

### Question 8 — Shared Infrastructure와 isolation

Profile artifacts를 기존 blog delivery resources와 어떻게 공유하거나 격리할까요?

A) Existing single-tenant S3 bucket, CloudFront distribution/OAC, response-header policy, log bucket, ACM input과 Cloudflare DNS를 공유한다. Isolation은 route/object namespace와 source/public/private artifact boundary로 충분하며 새 account, bucket, distribution 또는 tenant boundary를 만들지 않는다. **(권장)**

B) Profile 전용 bucket/distribution/domain 또는 별도 AWS account로 resource isolation을 추가한다. 이는 새 shared-infrastructure topology이므로 별도 scope와 권한을 먼저 승인받는다.

X) Other (please describe after [Answer]: tag below) — shared resource, isolation boundary, tenancy와 ownership을 설명한다.

[Answer]: A) Existing single-tenant S3 bucket, CloudFront distribution/OAC, response-header policy, log bucket, ACM input과 Cloudflare DNS를 공유한다. Isolation은 route/object namespace와 source/public/private artifact boundary로 충분하며 새 account, bucket, distribution 또는 tenant boundary를 만들지 않는다.

## 8. Answer Gate

Q1~Q8의 모든 `[Answer]:`가 유효하고 서로 일관되며 기존 승인과 호환되기 전에는 Infrastructure Design artifact를 생성하지 않는다. 답변이 새 Terraform, AWS, DNS, cache policy 또는 deployment architecture를 요구하면 Code Generation으로 진행하지 않고 별도 scope/authorization decision을 먼저 연다.
