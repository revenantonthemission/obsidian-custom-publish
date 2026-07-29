# Unit of Work Dependencies — 이력서·포트폴리오 재구축

## 문서 상태

- **단계**: INCEPTION - Units Generation / Part 2
- **상태**: 승인됨
- **상세 수준**: Standard
- **작성일**: 2026-07-23
- **승인된 순서**: branch-base gate → U1 → U2 → U3 → integrated Build and Test
- **병렬 unit 실행**: 금지
- **입력**:
  - [Unit of Work Plan](../plans/unit-of-work-plan.md)
  - [Unit Definitions](unit-of-work.md)
  - [Component Dependencies](component-dependency.md)
  - [Application Design](application-design.md)

## 1. Dependency Semantics

| Term | Meaning |
|---|---|
| Hard dependency | provider unit의 다섯 Construction stage, required approvals, exit gate와 `--no-ff` local merge가 완료돼야 consumer unit을 시작할 수 있음 |
| Provider contract | consumer가 복제하지 않고 사용하는 typed interface, static route, generated artifact 또는 stable command |
| Contributor | 다른 unit이 닫는 story에 필요한 결과를 제공하지만 primary production behavior와 closure를 소유하지 않음 |
| Closure Unit | 해당 story의 모든 필수 acceptance evidence가 충족됐다고 최초 판정하는 unit |
| Post-closure verification | 닫힌 story를 다시 검사하며 실패 시 owning story/unit을 reopen하지만 behavior를 재소유하지 않음 |
| Branch-base gate | feature branch 생성 전 diverged `develop`/`main`을 dirty primary worktree 밖에서 비파괴적으로 조정·검증하는 prerequisite |

모든 dependency는 한 방향이다. U1은 U2/U3를 모르고, U2 production code는 U3 verification adapter를 import하지 않으며, U3는 U1/U2 public contract를 read-only로 관찰한다.

## 2. Unit Dependency Matrix

`Consumer → Provider`는 consumer가 provider의 output contract에 의존한다는 뜻이다.

| Consumer | U1 Provider | U2 Provider | U3 Provider |
|---|---|---|---|
| U1 Profile Domain and Native Experience | Owns profile context | Forbidden | Forbidden |
| U2 Homepage Publication Boundary | **Hard**: profile routes, homepage projection/panel, approved fact boundary | Owns publication context | Forbidden |
| U3 Quality Gate and CI Integration | **Hard**: profile commands/routes/metadata/print/PDF evidence | **Hard**: publication commands/generated/exclusion/Vault evidence | Owns verification context |
| Integrated Build and Test | **Hard**: merged U1 behavior/tests | **Hard**: merged U2 behavior/tests | **Hard**: merged U3 orchestration/CI contract |

There is no U2→U1 or U3→U1/U2 production dependency. A U3 failure is a diagnostic and reopen signal, not a reverse code dependency.

## 3. Critical Path

| Order | Gate or unit | Start condition | Completion condition | Next |
|---:|---|---|---|---|
| 0 | Units Generation artifact gate | three unit artifacts generated and reviewed | user explicitly approves units | Branch-base gate |
| 1 | Branch-base reconciliation | Units approved; refs and dirty state rechecked | isolated reconciliation passes targeted tests, `just test` and Astro build; local `develop` advances by fast-forward only | U1 |
| 2 | U1 | branch from reconciled validated `develop` | five stages, fact/PDF and unit gates approved; local `--no-ff` merge | U2 |
| 3 | U2 | branch from U1-merged validated `develop` | five stages, publication/Vault and unit gates approved; local `--no-ff` merge | U3 |
| 4 | U3 | branch from U2-merged validated `develop` | five stages and cross-unit/CI gate approved; local `--no-ff` merge | Integrated Build and Test |
| 5 | Integrated Build and Test | all three units merged | complete affected checks and evidence pass | workflow completion review; no deployment |

Approval wait, fact review, Vault exact-diff review and any separate authority request are gates, not permission to overlap units.

## 4. Cross-Unit Provider Contracts

### 4.1 U1 → U2

| Provider | Consumer | Contract | Readiness evidence | Forbidden coupling |
|---|---|---|---|---|
| C01 Profile Domain | C06 Homepage Composition | immutable validated `HomepageProfile` projection | U1 type/validation examples and applicable PBT pass | Vault or U2 must not declare copied profile facts |
| C02 Profile Presentation | C06 Homepage Composition | server-rendered profile panel primitive or equivalent static props contract | homepage-sized render contract and no-JS evidence | C02 must not parse the Vault slot |
| C02/C05 | C06 and homepage visitor flow | working `/resume`, `/portfolio` and hydration-independent Header links | U1 route/link build assertions | U2 must not create alternate profile route ownership |
| C03/C04 | homepage/profile shell | compatible metadata/layout interface | Astro build and existing-route regression | U2 must not own profile JSON-LD facts |

U2 starts only after these provider contracts and U1 approval/merge are complete. An incompatible U1 contract change after U2 starts requires an explicit contract amendment, affected regression review and, if necessary, reopening U1.

### 4.2 U1 → U3

| Provider | Consumer | Contract | Readiness evidence | U3 action |
|---|---|---|---|---|
| C01 | C12 | stable profile example/PBT command and seed/replay behavior | U1 test report | execute and record; do not copy tests |
| C02–C05 | C12 | `/resume`, `/portfolio`, Header/navigation, metadata and static HTML contracts | site build and U1 browser/content evidence | cross-unit route/content/no-JS/accessibility checks |
| C11 | C12 | print source, tracked `/resume.pdf`, inspection/parity inputs | unit-level print/PDF/parity and negative evidence | post-closure regression; failure reopens ST-U03 |
| S01/S04 | S05 | deterministic profile/document orchestration entry points | stable command/documentation | aggregate into verification report |

U3 does not delay ST-U03 closure or ST-E03 profile-slice completion when U1 has satisfied its unit gate.

### 4.3 U2 → U3

| Provider | Consumer | Contract | Readiness evidence | U3 action |
|---|---|---|---|---|
| C06 | C12 | composed `/`, exact-one slot and internal CTA result | U2 site/content tests | route/link/browser verification |
| C07/C08 | C12 | publication/reference examples and Rust PBT command | U2 test report with shrinking/seed replay | execute and record; do not copy properties/tests |
| C09/C10 | C12 | dedicated homepage plus post-only generated/site read contract | manifest, route absence and discovery-preservation evidence | cross-unit static/link/discovery assertions |
| S02/S03 | S05 | deterministic preprocess/site composition command | stable local command | aggregate into verification report |
| external Vault gate | S05 evidence input | reviewed exact diff for `Passion Project.md` | path-limited diff, no external commit/push | verify expected authored declaration/slot only |

ST-E03 parent closes in U2 after the U1 profile slice and U2 publication slice both have owner-local example/PBT, shrinking and seed replay evidence. U3 runs those commands under ST-E04; it does not become ST-E03 owner.

### 4.4 U3 → Integrated Build and Test

| Provider | Consumer | Contract | Readiness evidence |
|---|---|---|---|
| C12 | integrated runner | stable static/browser/link/metadata/print/PDF commands and structured results | U3 local verification report |
| S05 | integrated runner/CI review | ordered verification plan, seed propagation and failure attribution | ST-E04 acceptance evidence |
| Jenkins adapter | CI contract review | correct Rust path, relevant example/PBT commands and seed output | actual non-deploy Jenkins validation execution evidence; build/example/PBT run, seed and, if a property fails, shrunk counterexample visible |

Integrated Build and Test still executes the actual full affected gates. U3 readiness is not a substitute for final execution.

## 5. Story Dependency and Closure

| Story | Primary Owner | Contributor | Closure Unit | Downstream behavior |
|---|---|---|---|---|
| ST-U01 | U2 | U1 route/navigation | U2 | U3 rechecks navigation/CTA as integrated evidence |
| ST-U02 | U1 | U3 integrated evidence only | U1 | failure reopens U1 story |
| ST-U03 | U1 | U3 post-closure PDF/parity verification | U1 | U3 failure reopens ST-U03; no deferred U1 AC |
| ST-U04 | U1 | U3 integrated evidence only | U1 | failure reopens U1 story |
| ST-U05 | U1 | U3 integrated evidence only | U1 | failure reopens U1 story |
| ST-U06 | U2 | U3 integrated evidence only | U2 | failure reopens U2 story |
| ST-E01 | U1 | U2 consumer only | U1 | U2 must not copy profile facts |
| ST-E02 | U1 | user fact approval; U3 parity observation | U1 | unapproved or mismatched fact reopens U1 |
| ST-E03 | U2 parent; U1/U2 named slices | U1 profile-property slice | U2 | U3 executes commands only under ST-E04 |
| ST-E04 | U3 | U1/U2 stable commands | U3 | final integrated runner consumes U3 contract |

`U3 integrated evidence only` means observer/contributor, not a second production or Story owner.

## 6. Branch and Merge Dependency Gate

### 6.1 Preconditions

- local `main` and `develop` divergence and remote refs are rechecked immediately before action.
- dirty primary `main` worktree and all unrelated user changes remain untouched.
- no operation lock, worktree collision or branch-name collision exists.
- reconciliation occurs in an isolated clean linked worktree from `origin/develop`.

### 6.2 Reconciliation Contract

1. Merge current `origin/main` into a reconciliation branch from current `origin/develop` with a merge commit.
2. Resolve conflicts semantically; do not use whole-tree `ours`/`theirs`, reset, rebase or history rewrite.
3. Preserve current main behavior and genuinely missing develop behavior identified in the approved plan.
4. Run targeted image-embed regression, `just test` and `cd site && npx astro build`.
5. Advance local `develop` by fast-forward only after review and passing checks.
6. Stop and request direction if semantic conflicts or gates cannot be resolved safely.

This is an approved future gate, not an operation performed during Units Generation.

### 6.3 Unit Branch Contract

| Unit | Branch | Must be based on | Merge condition |
|---|---|---|---|
| U1 | `codex/feature/resume-profile-experience` | reconciled validated local `develop` | all U1 stages/approvals/gates; `--no-ff` local merge |
| U2 | `codex/feature/resume-home-boundary` | U1-merged validated local `develop` | all U2 stages/approvals/gates; `--no-ff` local merge |
| U3 | `codex/feature/resume-quality-gates` | U2-merged validated local `develop` | all U3 stages/approvals/gates; `--no-ff` local merge |

Do not pre-create later unit branches. Do not push reconciliation, `develop`, feature branches or merges without separate authorization.

## 7. Content and External-Source Dependencies

### 7.1 Fact Approval Gate

| Dependency | Owner | Required before | Failure behavior |
|---|---|---|---|
| name/title/introduction | user approval → U1 production data | public-ready U1 pages/PDF | keep out of production source; do not infer |
| email/GitHub | user approval → U1 validator/presentation | required CTA completion | fail required validation; no placeholder |
| career/roles/dates/education/certification | user approval → U1 projection | corresponding section completion | omit unapproved optional section |
| selected 3–6 projects/order | user approval → U1 canonical data | portfolio completion | fail count/order validation |
| decisions/outcomes/metrics/links | evidence + user approval → U1 | case-study/metadata/PDF publication | no overclaim or invented link |

Draft/evidence/approval records remain outside production profile data. User approval is a content gate, not a new runtime workflow.

### 7.2 External Vault Gate

| Condition | Required behavior |
|---|---|
| U2 consumer behavior not ready | do not edit external Vault |
| file unreadable or permission unavailable | report explicit blocker; no repository substitute |
| file readable | inspect and preserve unrelated external changes |
| write authorized and behavior ready | edit only `Areas/Notes/Passion Project.md` declaration/profile slot |
| after edit | show exact diff; no Vault commit/push without separate request |

## 8. PBT Dependency Handoff

| Stage | U1 obligation | U2 obligation | U3 obligation |
|---|---|---|---|
| Functional Design | identify profile properties or N/A per component | identify publication/reference/output properties or N/A | analyze adapter/report logic; document PBT N/A where no business property |
| NFR Requirements | select applicable TypeScript framework and generator/seed contract | select Rust framework and generator/seed contract | choose orchestration evidence requirements; do not reselect owning frameworks |
| Code Generation | implement profile generators, PBT and complementary examples | implement publication generators, PBT and complementary examples | wire stable commands; do not move or duplicate tests |
| Build and Test | provide shrinking/seed/replay evidence | provide shrinking/seed/replay evidence | aggregate and verify CI logging under ST-E04 |

U1/U2 completion cannot defer applicable PBT implementation to U3.

## 9. Infrastructure and Deployment Dependency

Each unit's Infrastructure Design evaluates the existing S3/CloudFront static delivery contract.

| Unit | Compatibility question | Expected result |
|---|---|---|
| U1 | clean `/resume` and `/portfolio`, static `/resume.pdf`, cache and rollback behavior | no infrastructure change |
| U2 | `/` retained, duplicate post route removed, sitemap/static generated outputs remain deliverable | no infrastructure change |
| U3 | verification/Jenkins path does not execute or alter deployment infrastructure | no infrastructure change |

If any review finds a required Terraform, AWS, DNS, cache-policy or deployment implementation change, stop that unit and request a separate scope/authorization. Do not absorb it into Code Generation.

U3 Infrastructure Design must also prove that a validation-only Jenkins execution can run the relevant build/example/PBT gates without invoking a deployment stage. If no safe path exists, stop and request a separate decision; a reviewed Jenkinsfile diff or local-only simulation cannot close ST-E04.

## 10. Failure, Reopen and Recovery Rules

| Failure | Owning response | Forbidden response |
|---|---|---|
| U1 provider contract incomplete | U2 does not start; finish or reopen U1 | copy/infer profile data in U2 |
| U2 generated contract incomplete | U3 does not start; finish or reopen U2 | consumer-side slug filters as substitute |
| U3 finds U1 profile/PDF defect | reopen mapped U1 story/unit and fix at owner | patch production behavior inside C12 |
| U3 finds U2 publication defect | reopen mapped U2 story/unit and fix at owner | suppress failing assertion or duplicate filtering |
| PBT failure | owning U1/U2 records seed/minimal case and fixes owner code | retry silently, disable shrinking or move test to U3 |
| external Vault unavailable | report U2 blocker | edit another source/generated output |
| infrastructure incompatibility | stop and request authority | edit Terraform/call AWS/deploy |
| unsafe Git reconciliation | stop and request direction | reset/rebase/history rewrite or disturb dirty primary tree |

Generated outputs may be regenerated through documented commands in a safe worktree. Recovery never makes generated output canonical.

## 11. Dependency Completeness

- U1→U2→U3 is acyclic and each edge has a named provider contract and readiness gate.
- C01~C12 and S01~S05 production ownership never crosses backward.
- ST-U01, ST-U03 and ST-E03 distinguish contribution from closure.
- owner-local example/PBT is complete before U3 aggregation.
- branch-base, fact, Vault, Infrastructure Design, no-push and no-deploy gates are explicit.
- Integrated Build and Test remains a separate final execution rather than being claimed by U3.
