# Shared Infrastructure — Resume and Portfolio Rebuild

## 문서 상태

- **단계**: CONSTRUCTION — U1 Infrastructure Design
- **상태**: Generated; explicit U1 Infrastructure Design artifact approval pending
- **작성일**: 2026-07-24
- **현재 적용 결정**: U1의 기존 S3/CloudFront compatibility 및 no-change 결정
- **후속 적용 범위**: U2 Homepage Publication Boundary와 U3 Quality Gate and CI Integration의 Infrastructure Design 입력
- **신규 infrastructure resource**: 없음
- **Terraform/AWS/DNS/deployment 권한**: 없음

## 1. 목적과 입력

이 문서는 U1, U2와 U3가 하나의 static release에서 공유하는 existing delivery infrastructure와 no-change/no-authority 경계를 정의한다. 세 unit은 infrastructure tenant나 독립 deployment가 아니라 authored-source ownership, Construction review와 Git Flow의 logical unit이다.

이 문서는 다음 승인 artifact, U1 답변과 authored configuration을 입력으로 사용한다.

- [Execution Plan](../inception/plans/execution-plan.md)
- [Unit Definitions](../inception/application-design/unit-of-work.md)
- [Unit Dependencies](../inception/application-design/unit-of-work-dependency.md)
- [Component Dependencies](../inception/application-design/component-dependency.md)
- [U1 Infrastructure Design Plan and Answers](plans/profile-domain-and-native-experience-infrastructure-design-plan.md)
- [U1 Public CSS Clarification](plans/profile-domain-and-native-experience-infrastructure-design-clarification-questions.md)
- [U1 NFR Requirements](profile-domain-and-native-experience/nfr-requirements/nfr-requirements.md)
- [U1 Logical Components](profile-domain-and-native-experience/nfr-design/logical-components.md)
- [Terraform Infrastructure](../../infra/main.tf)
- [Astro Configuration](../../site/astro.config.mjs)
- [Root Automation](../../Justfile)
- [Jenkins Pipeline](../../Jenkinsfile)

U1 clarification A에 따라 original Q3 object list는 새 U1 delivery object class의 대표 목록이다. 실제 deployable namespace는 complete `site/dist/`이며 compiled CSS, WOFF2와 기존 site assets를 포함한다. 다만 direct Astro output과 deploy-preprocessed full-site output은 서로 다른 build state이며, generated-input/output completeness를 통과한 후자만 deployment-eligible하다.

이 문서는 U2/U3의 future Infrastructure Design 답변을 대신하지 않는다. Known dependency와 예상 compatibility gate만 기록하고, exact future object keys, validation commands 또는 CI wiring은 해당 unit의 승인된 design에서 확정한다.

## 2. Existing Shared Topology

| Layer | Existing contract | Shared compatibility context | No-change decision |
|---|---|---|---|
| Static build | Astro `output: "static"` with repository-local Rust/Astro build processes | Direct Astro builds verify a profile/integration slice; deploy preprocessing plus completeness evidence is required for a full-site `site/dist/` | No deployed application server or build service |
| Origin storage | One private S3 site bucket with public access blocked | Existing manual deploy and scheduled Jenkins Deploy sync whatever candidate tree is at `site/dist/`; this workflow invokes neither and does not infer completeness | No public bucket, per-unit bucket, database or durable application state |
| Origin access | CloudFront OAC with SigV4 and distribution-ARN-scoped S3 `GetObject` | All public HTML, CSS, fonts, PDF and existing assets use the same read-only origin path | No direct public S3 access, alternate origin or new IAM path |
| Edge distribution | One CloudFront distribution, one S3 origin and one default behavior | U1/U2 static routes and assets share the current delivery behavior | No per-unit distribution, origin, load balancer or API gateway |
| Request rewrite | One viewer-request CloudFront Function | A trailing slash receives `index.html`; every extensionless URI receives `/index.html`; dotted file URIs remain unchanged | No route-specific function or redirect policy |
| Default behavior | HTTPS redirect, GET/HEAD only, compression and AWS managed CachingOptimized policy | All release objects inherit the same cache and request behavior | No new method, cache behavior or origin request policy |
| Response headers | Existing CloudFront response-headers policy | Same-origin CSS/font delivery is compatible with current `style-src`/`font-src`; `nosniff` makes correct MIME evidence binding | No CSP, HSTS, frame, referrer or content-type policy change |
| Domain and TLS | Existing `rvnnt.dev` CloudFront alias, ACM certificate input and Cloudflare DNS | All three units share the current production identity | No new domain, certificate, DNS record or staging hostname |
| Delivery logs | Existing CloudFront access-log bucket, `cloudfront/` prefix, cookies excluded and 90-day lifecycle | Site-wide inherited delivery logging only | No unit-specific telemetry, alarm, synthetic check, analytics or retention change |

The Terraform AWS provider uses `ap-northeast-2`; the existing custom-domain ACM certificate input must refer to a certificate in `us-east-1`. Cloudflare DNS is external context and is not managed by the current Terraform module. This workflow neither reads nor mutates remote Terraform, AWS or Cloudflare state.

## 3. Shared Delivery Path

The shared static-delivery path is:

1. Approved authored repository and the intended external-input identity are validated.
2. A direct Astro build may verify U1 profile routes/font/PDF without external Vault content; its reduced `site/dist/` is never a deployment set.
3. A full-site candidate requires Rust deploy preprocessing against a selected Vault, generated `content/`, copied `site/public` JSON/assets and a clean Astro build. Current `just deploy` selects unsafe `./fixtures/vault` when `VAULT_PATH` is unset; Jenkins selects `OBSIDIAN_VAULT_PATH` or its hard-coded production external default.
4. Deployment eligibility additionally requires an explicitly configured `VAULT_PATH` resolving to the exact intended production `Areas/Notes` root, fixture/default exclusion, generated-input/output correspondence, expected post/route/asset inventory, referenced-asset closure and private exclusion evidence.
5. U1/U2 owner-local checks and U3 read-only verification inspect their respective non-deploy contracts without converting a reduced/fixture build into production readiness.
6. This AI-DLC workflow stops at local build/test and approval evidence.
7. Existing deployment paths can sync a candidate `site/dist/` to the private S3 origin and request CloudFront invalidation: `just deploy` when separately invoked, and the current nightly Jenkins pipeline automatically after a successful build. Neither path currently contains the explicit completeness gate described above.
8. This AI-DLC workflow invokes or changes neither path. Its no-deploy authority does not imply that the inherited Jenkinsfile contains an authorization or completeness condition.
9. CloudFront reads origin objects through OAC, applies the current rewrite/default behavior/header policy and serves the existing domain.

No production component C01~C11 and no verification component C12 calls Terraform, AWS APIs, Cloudflare APIs or a deployment command.

## 4. Unit Ownership and Compatibility Gates

| Unit | Infrastructure-relevant ownership | Required compatibility/no-change gate | Explicitly not decided here |
|---|---|---|---|
| U1 Profile Domain and Native Experience | C01~C05/C11, S01/S04; native profile HTML, metadata, navigation, reviewed PDF and owner-local evidence | Map `/resume`, `/portfolio`, `/resume.pdf`, compiled profile CSS, WOFF2 and inherited assets to the current S3/CloudFront contract; record no change or stop | Terraform, edge policy, DNS, deployment, U2 publication behavior or U3 orchestration |
| U2 Homepage Publication Boundary | C06~C10, S02/S03; homepage/post projection and generated static contract | **Confirmed 2026-07-28 — no change.** `/` content updates flow through the existing default behavior; the removed `/posts/passion-project/` route resolves as a natural 404 via the existing 403→404 error mapping; existing `sync --delete` + `/*` invalidation removes the stale object and cache; no new public files (`content/homepage/`·`manifest.json` are build inputs only); monitoring/logging re-verified against `infra/main.tf` with no drift. See `homepage-publication-boundary/infrastructure-design/` | Copied profile ownership, new delivery resources, deployment execution or U3 verification behavior |
| U3 Quality Gate and CI Integration | C12/S05; read-only verification and minimum approved CI validation wiring | Later prove that actual validation-only execution can run required gates without invoking or changing deployment infrastructure; record no change or stop | U1/U2 production logic, owner-local PBT, runtime monitoring or deployment execution |

Each unit completes and obtains approval for its own Infrastructure Design before Code Generation. A downstream unit consumes provider contracts without taking ownership. A U3 finding reopens the owning unit; it does not authorize U3 to patch production infrastructure or U1/U2 behavior.

The expected result is a no-change decision, not an assumed conclusion. If compatibility cannot be shown, the active unit stops and requests separate scope and authority.

## 5. Namespace and Visibility Contract

### 5.1 Complete deployable set

The only deployable namespace is a complete local `site/dist/` tree, but not every directory at that path is complete.

| Build state | Shared interpretation | Deployment eligibility |
|---|---|---|
| Direct fresh-clone Astro output | Profile/static-shell verification; `content/meta` may be absent and code can return empty post data | Never sync |
| `just build`/fixture integration output | Non-deploy generated-contract and integration evidence for the selected input | Never implies production completeness |
| Deploy-preprocessed full-site candidate | Selected Vault, `--stamp-published`, generated `content/`, copied public JSON/assets and clean Astro build; manual unset default selects fixtures | Requires explicit production-path and complete-set evidence before any readiness claim |

A deployment-eligible normal static release includes the new U1 objects and all existing site output needed by the application, including:

- `/index.html` and existing route HTML;
- `/resume/index.html` and `/portfolio/index.html`;
- reviewed `/resume.pdf`;
- Astro/Vite hashed `/_astro/*.css`;
- Astro/Vite hashed `/_astro/*.woff2`;
- other Astro/Vite chunks and existing public assets;
- approved generated search, graph, preview, navigation, sitemap, RSS or other static output present in the complete build.

The list is representative of object classes, not an allowlist that deletes unrelated existing assets. A successful direct Astro build, fixture output or tracked generated JSON is not evidence that the intended production Vault projection is current. The U1 profile-owned route-reachable CSS file union retains the approved unique gzip 24KiB gate.

### 5.2 Source, generated and private boundaries

| Artifact class | Location or namespace | Visibility and authority |
|---|---|---|
| Authored behavior source | `preprocessor/`, `site/src/`, `infra/`, `fixtures/`, package/config files, `Justfile`, `Jenkinsfile` | Repository-authored; changed only by the owning approved unit |
| External production build input | Explicitly validated Obsidian Vault `Areas/Notes` root | Deploy preprocessing reads it and `--stamp-published` may mutate post frontmatter; this workflow neither selects nor runs it |
| External homepage source | Approved `Areas/Notes/Passion Project.md` scope | U2-only external write gate; not an infrastructure resource or profile-fact owner |
| Intermediate generated contract | `content/`, generated `site/public/*.json` and `site/public/assets/` | Regenerable; never the sole source of behavior |
| Tracked résumé asset | `site/public/resume.pdf` | Reviewed derived release input copied to `site/dist/resume.pdf`; not a canonical fact source |
| Profile/integration output | Direct or fixture-backed `site/dist/**` | Verification only; never eligible merely because the build succeeded |
| Complete public release | Deploy-preprocessed and completeness-gated `site/dist/**` | Eligible for S3 sync only when deployment is separately authorized |
| PDF workflow evidence | Candidate, receipt, journal, recovery snapshot and diagnostics outside `site/dist/` | Private/non-public; never part of the sync set |
| Verification evidence | Screenshots, accessibility records, PBT seeds/replays, test reports and CI diagnostics outside `site/dist/` | Private/non-public unless a later explicit artifact contract says otherwise |
| Access logs | Existing dedicated CloudFront log bucket | Restricted shared operational evidence; not a public site object |

Generated evidence does not become public merely because it is produced during a build. Before any separately authorized deployment, explicit production `VAULT_PATH`, fixture exclusion, exact external-input identity, `content/`, generated/copy outputs and `site/dist/` must be reviewed as one complete public object set. Because `sync --delete` removes origin keys absent from the candidate, a reduced direct build or fixture-derived candidate is a destructive deployment input.

U2 owns the later exact homepage/post artifact and route-removal contract. U3 currently owns no public object namespace.

## 6. Route, Object, MIME and Header Compatibility

| Viewer request | Existing edge behavior | Expected origin object |
|---|---|---|
| `/` | Default root object or trailing-slash handling | `/index.html` |
| `/resume` | Extensionless URI receives `/index.html` | `/resume/index.html` |
| `/resume/` | Trailing slash receives `index.html` | `/resume/index.html` |
| `/portfolio` | Extensionless URI receives `/index.html` | `/portfolio/index.html` |
| `/portfolio/` | Trailing slash receives `index.html` | `/portfolio/index.html` |
| `/resume.pdf` | Dotted URI is unchanged | `/resume.pdf` |
| `/_astro/<hash>.css` | Dotted asset URI is unchanged | `/_astro/<hash>.css` |
| `/_astro/<hash>.woff2` | Dotted asset URI is unchanged | `/_astro/<hash>.woff2` |

The U1 local production-preview gate verifies non-empty PDF `application/pdf`, CSS `text/css` and font `font/woff2` responses. This is binding because the current response policy applies `X-Content-Type-Options: nosniff`. Same-origin compiled CSS and WOFF2 are allowed by the existing `style-src 'self'` and `font-src 'self'` directives.

Local artifact and preview evidence does not prove deployed S3 object metadata or a CloudFront response. Remote read-only checks may occur only in a separately authorized deployment/verification context; this workflow does not infer them.

U2 must later validate its exact route-addition/removal matrix against the same all-extensionless rewrite. This artifact does not assign unapproved U2 object keys. U3 observes the public contracts and adds no edge route.

## 7. Cache, Deployment and Rollback

### 7.1 Cache

- One AWS managed CachingOptimized policy applies through the default behavior.
- Hashed CSS, WOFF2 and other content-addressed assets use build-derived names, but no dedicated immutable cache behavior is added.
- Mutable HTML and stable `/resume.pdf` share the existing default behavior.
- No unit may claim a per-route TTL, cache key, no-cache exception or behavior absent from authored Terraform.

### 7.2 Existing root automation

| Entry point | Existing behavior | Workflow boundary |
|---|---|---|
| `just build` | Non-stamping preprocess for selected/default Vault input, generated public copy, then Astro site build | Local/integration path; input identity determines meaning and it is not deployment readiness |
| `just site-build` | Direct `npx astro build`; missing `content/meta` can yield a successful reduced site | Fresh-clone profile/font validation only; never pass its output to `sync --delete` |
| `just deploy` | `VAULT_PATH` or unset default `./fixtures/vault`; `deploy-preprocess --stamp-published`, generated copy/build, `aws s3 sync ... --delete`, invalidation | Existing manual path only; unsafe fixture default, no explicit production-path/output-completeness gate, never invoked here |
| Jenkins trigger/build | `cron('H 0 * * *')`, `OBSIDIAN_VAULT_PATH` or hard-coded production external default, `--stamp-published` preprocess/generated copy, then Astro build | Current pipeline is scheduled, mutating and has neither validation-only stop nor explicit complete-set gate |
| Jenkins Deploy | Successful Build Site proceeds without an authorization condition to AWS credential check, S3 sync with `--delete`, then CloudFront `/*` invalidation | Inherited physical auto-deploy behavior; this workflow neither invokes nor changes it |

### 7.3 Rollout and rollback

S3 sync followed by invalidation is not an atomic release switch. It can temporarily expose a mixed origin/edge state. U1 guarantees a coherent locally verified pre-deploy release set only; local crash-safe PDF promotion does not make production rollout atomic.

Current infrastructure cannot guarantee an exact production rollback. It retains neither a previous complete `site/dist/` release artifact nor an exact snapshot of the mutable external Vault/generated inputs, and it has no S3 versioning, versioned release prefix, remote snapshot, atomic pointer or automatic failback. Git history alone therefore cannot reproduce the previous complete site.

If a verified prior complete artifact or reproducible repository-plus-Vault/generated-input snapshot was retained separately, a separately authorized operation could redeploy it and invalidate affected CloudFront objects. Without that prerequisite, rebuilding a previous profile revision with the current available explicitly validated production Vault is only a best-effort redeploy, not an exact rollback of the prior production site. Fixture/default input is never a rollback source.

## 8. Environment and Explicit N/A Decisions

| Category | Shared decision |
|---|---|
| Production environment | Existing `rvnnt.dev` S3/CloudFront/ACM/Cloudflare topology only |
| Local and CI | Non-deploy build/test processes, not cloud environments or deployed compute |
| Staging | No separate AWS account, bucket, distribution or domain |
| Runtime compute | N/A; no server, Lambda, container, worker or autoscaling group |
| Database/state | N/A; no database or durable application state |
| Messaging | N/A; no queue, event bus or persistent background processor |
| Additional network services | N/A; no VPC, load balancer or API gateway |
| Monitoring | Existing access logs only; no unit-specific SLO, alarm, dashboard, synthetic check, analytics or telemetry |

Repository-local locks, journals and verification processes belong to their owning build/document workflow. They are not shared runtime infrastructure.

## 9. No-Authority Contract

Approval of this document or a unit Infrastructure Design does not authorize:

- editing `infra/`, Terraform state, CloudFront functions/policies or deployment configuration;
- running `terraform apply` or changing any AWS, ACM, IAM, CloudFront or Cloudflare/DNS resource;
- running `just deploy`, Jenkins Deploy, `aws s3 sync`, CloudFront invalidation or an equivalent deployment action;
- creating a bucket, distribution, origin, cache behavior, staging environment, account or tenant boundary;
- pushing a Git branch or merge;
- committing or pushing the external Vault repository;
- treating a local build as proof of remote deployment state.

Documentation-only Infrastructure Design uses local static inspection and content validation. If a separately authorized infrastructure implementation is opened later, OBSIDIAN-03 requires Terraform formatting and validation plus affected application gates. Deployment is never a validation step.

## 10. Reevaluation Triggers

The active unit must stop its no-change path and request a separate scope/authorization decision if:

1. A required route cannot use the existing trailing-slash/all-extensionless rewrite or needs a redirect, new method, header or dedicated behavior.
2. PDF, compiled CSS, WOFF2 or another required static asset cannot satisfy current MIME, CSP or `nosniff` behavior.
3. A stable mutable artifact requires a TTL, cache key, invalidation, exact rollback, prior release retention or atomic-cutover guarantee beyond the current policy.
4. A candidate, receipt, journal, screenshot, PBT seed, report or diagnostic cannot be kept outside `site/dist/`.
5. U2's approved homepage/post route and generated-output design cannot use the single existing origin/default behavior.
6. U3 cannot produce actual validation-only CI evidence without executing or modifying deployment behavior.
7. A new runtime service, database, queue, worker, VPC, load balancer, API gateway, account, tenant, region, staging environment or domain becomes necessary.
8. New logging, monitoring, retention, security-header, certificate, DNS, IAM or availability requirements exceed the inherited context.
9. Separately authorized remote verification contradicts the locally inspected Terraform or automation contract.
10. Explicit production `VAULT_PATH`/fixture exclusion or direct/fixture/stale-output distinction cannot be proven, or `sync --delete` safety requires adding path/completeness gates to current deployment automation.

When triggered, record the incompatibility, affected requirement/unit and required authority. Do not absorb it into Code Generation or mutate infrastructure before review.

## 11. PBT and Project Extension Compliance

### 11.1 Property-Based Testing

Infrastructure Design has no direct PBT enforcement rule, so PBT compliance for this artifact is N/A. Approved full-PBT obligations remain:

- U1 owns profile-domain properties, generators, tests, shrinking and seed/replay evidence.
- U2 owns publication/reference/output properties, generators, tests, shrinking and seed/replay evidence.
- U3 aggregates stable owner-local commands and evidence without moving or duplicating those tests.
- Integrated Build and Test executes the affected gates.

No infrastructure resource, deployment or remote service is introduced to satisfy PBT.

### 11.2 Obsidian Press Project Extension

| Rule | Compliance |
|---|---|
| OBSIDIAN-01 | Root project instructions and authored infrastructure/automation remain binding; no conflicting recommendation is introduced |
| OBSIDIAN-02 | Authored source, external/generated contracts, reduced validation output, gated full-site `site/dist/` and private evidence boundaries are explicit; generated output is not the sole behavior source |
| OBSIDIAN-03 | Documentation-only Infrastructure Design requires no application/Terraform execution gate; no deployment is used as validation |
| OBSIDIAN-04 | U1 → U2 → U3 remain focused sequential Git Flow units from validated `develop`, with `--no-ff` local merge and no unauthorized push |
| OBSIDIAN-05 | One unfinished workflow remains in the active `aidlc-docs/` tree; it is not archived or replaced |

## 12. Shared Decision Summary

- U1, U2 and U3 share one static release and are not deployment tenants.
- Existing private S3, CloudFront OAC/distribution/default behavior/all-extensionless rewrite/header policy/logging, ACM input and Cloudflare DNS remain unchanged.
- The deployable namespace is complete `site/dist/`, including compiled hashed CSS, WOFF2 and existing site assets; only deploy-preprocessed, completeness-gated full-site output is eligible.
- Direct fresh-clone and fixture/integration builds are non-deploy evidence and must never be supplied to `sync --delete`; manual production use requires an explicit validated `VAULT_PATH`, never the fixture default.
- Private document and verification evidence stays outside `site/dist/`.
- Existing cache, sync, invalidation and rollback limitations are recorded without claiming atomic deployment or exact rollback.
- U1 has selected and clarified the shared no-change choices; U2 and U3 must still pass their own context-specific Infrastructure Design and approval gates.
- Any incompatibility opens a separate authority decision. No Terraform, AWS, DNS, source, push or deployment action follows from this document.
