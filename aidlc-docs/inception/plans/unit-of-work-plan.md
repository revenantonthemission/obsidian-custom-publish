# Unit of Work Plan — 이력서·포트폴리오 재구축

## 문서 상태

- **단계**: INCEPTION - Units Generation / Part 2 Generation
- **상태**: Artifact 승인됨 — Units Generation 완료
- **작성일**: 2026-07-23
- **상세 수준**: Standard
- **Project Type**: Brownfield
- **질문 수**: 5
- **답변 검증**: 2026-07-23T11:14:59Z — A/A/A/A/A, clarification 불필요
- **Plan 승인**: 2026-07-23T12:05:53Z
- **Artifact 검증**: 2026-07-23T12:18:03Z — ownership, dependency, traceability, boundary, independent review와 Markdown 검증 통과
- **Artifact 승인**: 2026-07-23T12:54:31Z
- **입력**:
  - `aidlc-docs/inception/requirements/requirements.md`
  - `aidlc-docs/inception/user-stories/stories.md`
  - `aidlc-docs/inception/user-stories/personas.md`
  - `aidlc-docs/inception/plans/execution-plan.md`
  - `aidlc-docs/inception/application-design/application-design.md`
  - `aidlc-docs/inception/application-design/components.md`
  - `aidlc-docs/inception/application-design/component-methods.md`
  - `aidlc-docs/inception/application-design/services.md`
  - `aidlc-docs/inception/application-design/component-dependency.md`

## 1. 목적과 생성 경계

승인된 Application Design의 C01~C12와 S01~S05를 Construction에서 순차적으로 설계·구현·검증할 수 있는 논리적 Unit of Work로 확정한다. 각 unit에는 책임, component/service ownership, story 역할, 의존성, 완료 gate와 예상 authored-source 경로를 배정한다.

이 저장소의 unit은 독립 배포 service가 아니라 하나의 Rust 전처리기와 Astro 정적 사이트 안에서 사용하는 개발·검토·Git Flow 경계다. Units Generation 자체는 application code, external Vault, generated output, Git branch, Terraform, AWS 또는 deployment를 변경하지 않는다.

답변 검증과 별도 unit plan 승인 전에는 다음 최종 산출물을 생성하지 않는다.

- `aidlc-docs/inception/application-design/unit-of-work.md`
- `aidlc-docs/inception/application-design/unit-of-work-dependency.md`
- `aidlc-docs/inception/application-design/unit-of-work-story-map.md`

## 2. 다시 열지 않는 승인된 제약

- 현재 planning baseline은 U1 Profile Domain and Native Experience, U2 Homepage Publication Boundary, U3 Quality Gate and CI Integration의 3개 unit이다.
- C01~C05와 C11은 U1, C06~C10은 U2, C12는 U3의 고수준 책임이다.
- Construction은 U1의 다섯 stage를 모두 완료한 뒤 U2, 그다음 U3로 이동하고 마지막에 integrated Build and Test를 실행한다.
- 각 unit은 Functional Design → NFR Requirements → NFR Design → Infrastructure Design → Code Generation 순서를 따른다.
- PBT property와 test implementation은 U1/U2의 owning logic과 함께 둔다. U3는 이를 이동·복제하지 않고 실행과 CI evidence를 집계한다.
- 모든 unit은 같은 repository와 하나의 static release를 구성한다. 새 runtime service, API, database, client JavaScript 또는 independently deployed component를 추가하지 않는다.
- public profile facts와 PDF 완료에는 별도 사용자 fact approval이 필요하다.
- external Vault write는 U2에서 `Areas/Notes/Passion Project.md` 하나에만 허용되며 consuming behavior가 준비된 뒤 exact diff를 검토한다.
- `develop` reconciliation과 feature branch 생성은 Units Generation artifact 승인 후 별도 branch-base gate에서만 수행한다.
- feature branch는 최신 검증된 `develop`에서 unit별로 하나씩 만들고 완료 후 `--no-ff`로 병합한다.
- push, Terraform/AWS mutation과 deployment는 승인되지 않았다.

## 3. Planning Baseline

아래 표는 질문 답변으로 확정하거나 명시적으로 수정할 baseline이다.

| Unit | Component ownership | Baseline outcome | Cross-unit consideration |
|---|---|---|---|
| U1 — Profile Domain and Native Experience | C01~C05, C11; S01, S04 | approved profile data, native routes, navigation, metadata, print/PDF source | ST-U01의 route/navigation 부분, ST-U03의 product/PDF 부분과 ST-E03의 profile-property slice |
| U2 — Homepage Publication Boundary | C06~C10; S02, S03 | homepage slot, publication classification, link/transclusion policy, generated/site contract | ST-U01 homepage outcome의 closure와 ST-E03 publication-property slice |
| U3 — Quality Gate and CI Integration | C12; S05 | cross-unit browser/PDF evidence, stable command aggregation와 minimal Jenkins integration | ST-U03 integrated-verification contribution와 ST-E04 primary ownership; ST-E03 implementation/closure를 재소유하지 않음 |

Story가 여러 unit의 결과를 필요로 할 때 동일 구현을 중복하지 않는다. 최종 story map은 `Primary Owner`, `Contributor`, `Closure Unit` 또는 사용자가 승인한 동등한 역할을 사용해 구현 책임과 acceptance closure를 구분한다.

## 4. 실행 체크리스트

### 4.1 Part 1 — Planning

- [x] Units Generation 상세 규칙과 질문 형식을 읽는다.
- [x] 승인된 requirements, personas, stories, execution plan과 Application Design을 읽는다.
- [x] Story Grouping, Dependencies, Team Alignment, Technical Considerations와 Business Domain을 평가한다.
- [x] Brownfield Code Organization 질문의 적용 여부를 평가하고 N/A 근거를 기록한다.
- [x] context-specific 질문과 모든 `[Answer]:` tag를 이 plan에 생성한다.
- [x] 모든 질문 답변을 수집한다.
- [x] 답변 문자와 `X` 설명의 유효성을 검증한다.
- [x] 모호함, 혼합 선택, 정의되지 않은 조건과 기존 승인 충돌을 분석한다.
- [x] 필요한 경우 follow-up 질문을 이 문서에 추가하고 모든 모호함을 해소한다. 추가 질문은 필요하지 않았다.
- [x] 확정된 decomposition, ownership와 handoff 결정을 plan에 반영한다.
- [x] unit generation plan 승인 프롬프트를 audit에 기록한다.
- [x] 사용자의 명시적 plan 승인을 기록한다.

### 4.2 Part 2 — Generation

- [x] 승인된 plan 전체를 다시 읽고 첫 미완료 generation step을 선택한다.
- [x] `unit-of-work.md`에 unit 정의, 책임, component/service ownership, affected authored-source 경로와 완료 gate를 생성한다.
- [x] `unit-of-work-dependency.md`에 dependency matrix, provider/consumer contract, branch/merge 순서와 handoff gate를 생성한다.
- [x] `unit-of-work-story-map.md`에 모든 story의 primary/contributor/closure 역할과 acceptance evidence ownership을 생성한다.
- [x] C01~C12와 S01~S05가 정확히 하나의 production owner를 갖는지 검증한다.
- [x] ST-U01~ST-U06과 ST-E01~ST-E04가 누락 없이 배정되고 cross-unit closure가 명확한지 검증한다.
- [x] FR-001~FR-018, NFR-001~NFR-010, USCN-001~USCN-004와 EDGE-001~EDGE-012의 unit traceability를 검증한다.
- [x] authored/generated boundary, external Vault scope, fact approval, PBT ownership, Infrastructure Design no-change와 no-deploy 경계를 검증한다.
- [x] unit 수에 따라 execution count, branch recommendation과 Construction 순서를 갱신한다.
- [x] 독립 검토로 누락, 순환 의존, 중복 ownership과 premature closure가 없는지 확인한다.
- [x] Markdown 구조와 모든 내부 link를 검증한다.
- [x] checklist, `aidlc-state.md`와 `audit.md`를 갱신한다.
- [x] Units Generation artifact approval gate를 제시하고 명시적 승인을 기다린다.

## 5. Mandatory Question Category Coverage

| Category | Question | 평가 |
|---|---|---|
| Story Grouping | Q1 | cross-unit story의 구현 owner와 완료 시점을 구분해야 함 |
| Dependencies | Q2 | 승인된 hard sequence와 downstream closure 방식을 최종 unit contract로 확정해야 함 |
| Team Alignment | Q3 | 실제 영구 team 구조가 문서화되지 않아 ownership model 선택이 필요함 |
| Technical Considerations | Q4 | logical work unit, internal package 또는 deployable service 경계를 확정해야 함 |
| Business Domain | Q5 | profile, publication과 verification bounded context를 최종 확정해야 함 |
| Code Organization | N/A | Brownfield이며 기존 `site/`, `preprocessor/`, `fixtures/`, `Jenkinsfile` 구조와 단일 static deployment가 승인됨. 이 질문은 greenfield multi-unit에만 필수이며 새 directory/deployment model은 scope 밖임 |

## 6. Unit Decomposition Questions

각 `[Answer]:` 뒤에 선택한 문자를 입력해 주세요. 원하는 선택지가 없으면 `X`를 선택하고 같은 줄에 구체적인 규칙을 적어 주세요.

### Question 1 — Story Grouping과 cross-unit closure

여러 unit의 결과가 필요한 story를 최종 story map에서 어떻게 표현할까요?

A) `Primary Owner`, `Contributor`, `Closure Unit`을 구분한다. ST-U01은 U2가 Primary/Closure Unit이고 U1이 route/navigation contributor다. ST-U03은 U1이 Primary/Closure Unit으로 résumé/PDF와 unit-level print/parity 검증을 완료하며, U3는 integrated-verification contributor로서 실패 시 story를 다시 연다. ST-E03은 U1이 profile-property slice를 완료하고 U2가 publication-property slice와 parent story를 완료한다. U3의 command/CI 집계는 ST-E04가 소유하며 ST-E03 implementation/closure를 복제하거나 지연하지 않는다. **(권장)**

B) 모든 story를 정확히 하나의 unit에만 배정하고 downstream contribution이나 closure role은 story map에 표시하지 않는다.

C) cross-unit story를 관련된 모든 unit에 복제하고 각 unit이 동일 story의 독립 완료를 주장한다.

X) Other (please describe after [Answer]: tag below) — story별 primary, contributor와 완료 판정 방식을 구체적으로 설명한다.

[Answer]: A) `Primary Owner`, `Contributor`, `Closure Unit`을 구분한다. ST-U01은 U2가 Primary/Closure Unit이고 U1이 route/navigation contributor다. ST-U03은 U1이 Primary/Closure Unit으로 résumé/PDF와 unit-level print/parity 검증을 완료하며, U3는 integrated-verification contributor로서 실패 시 story를 다시 연다. ST-E03은 U1이 profile-property slice를 완료하고 U2가 publication-property slice와 parent story를 완료한다. U3의 command/CI 집계는 ST-E04가 소유하며 ST-E03 implementation/closure를 복제하거나 지연하지 않는다.

### Question 2 — Unit dependency와 Construction handoff

승인된 U1→U2→U3 순서를 최종 dependency gate로 어떻게 적용할까요?

A) branch-base reconciliation 후 U1을 설계·구현·승인·`--no-ff` 병합하고, 갱신된 `develop`에서 U2를 완료·병합한 뒤 U3를 완료·병합한다. downstream contribution이 필요한 acceptance criterion은 story map에 열려 있다고 표시하고 해당 Closure Unit에서 닫는다. 마지막에 integrated Build and Test를 실행한다. **(권장)**

B) U1의 interface와 내부 route만 안정화되면 U1의 fact/PDF completion과 병합 전에 U2를 시작하고, U3만 두 unit 뒤에 실행한다.

C) 공통 Application Design contract만 사용해 U1과 U2를 서로 다른 branch에서 병렬 진행하고 나중에 통합한다.

X) Other (please describe after [Answer]: tag below) — unit start/finish, branch base, merge와 acceptance closure 순서를 구체적으로 설명한다.

[Answer]: A) branch-base reconciliation 후 U1을 설계·구현·승인·`--no-ff` 병합하고, 갱신된 `develop`에서 U2를 완료·병합한 뒤 U3를 완료·병합한다. downstream contribution이 필요한 acceptance criterion은 story map에 열려 있다고 표시하고 해당 Closure Unit에서 닫는다. 마지막에 integrated Build and Test를 실행한다.

### Question 3 — Team Alignment와 ownership model

영구적인 언어별 team 구조가 문서화되지 않은 이 작업에서 unit ownership을 어떻게 표현할까요?

A) 하나의 순차 delivery stream으로 취급하고 영구 team이 아니라 component와 authored-source 경로에 ownership을 붙인다. U1/U2는 production code와 local example/PBT를 소유하고 U3는 cross-unit verification/CI를 소유하며 사용자는 fact와 stage approval을 소유한다. **(권장)**

B) Astro/TypeScript, Rust, QA/CI의 별도 specialist owner를 가정하고 unit마다 formal handoff artifact와 reviewer를 배정한다.

C) 기술 경계 대신 채용 담당자, 협업자, 블로그 독자와 운영자 journey별 feature owner를 두고 cross-language component를 각 journey owner에게 배정한다.

X) Other (please describe after [Answer]: tag below) — 실제 team, owner, reviewer와 handoff 구조를 설명한다.

[Answer]: A) 하나의 순차 delivery stream으로 취급하고 영구 team이 아니라 component와 authored-source 경로에 ownership을 붙인다. U1/U2는 production code와 local example/PBT를 소유하고 U3는 cross-unit verification/CI를 소유하며 사용자는 fact와 stage approval을 소유한다. 

### Question 4 — Technical unit와 deployment 경계

U1~U3을 기술적으로 어떤 종류의 unit으로 확정할까요?

A) 하나의 repository와 하나의 static release 안에 있는 logical work unit으로 유지한다. unit은 branch/review/design 경계일 뿐 별도 version, runtime API, scaling 또는 deployment boundary를 만들지 않는다. **(권장)**

B) 같은 static release를 유지하되 각 unit을 별도 version을 갖는 internal workspace package/library로 분리한다.

C) unit을 independently deployable service로 바꾸고 runtime interface와 unit별 release lifecycle을 만든다.

X) Other (please describe after [Answer]: tag below) — package, runtime, release와 deployment 경계를 구체적으로 설명한다.

[Answer]: A) 하나의 repository와 하나의 static release 안에 있는 logical work unit으로 유지한다. unit은 branch/review/design 경계일 뿐 별도 version, runtime API, scaling 또는 deployment boundary를 만들지 않는다.

### Question 5 — Business Domain boundary

최종 bounded context와 provider ownership을 어떻게 나눌까요?

A) U1은 Profile Experience와 canonical facts/metadata/PDF source, U2는 Homepage Publication과 generated/site contract, U3는 cross-cutting Verification/CI를 소유한다. downstream unit은 provider contract를 소비하며 사실이나 publication classification을 복제하지 않는다. **(권장)**

B) Résumé와 Portfolio를 서로 다른 business unit으로 분리하고 canonical profile domain은 별도 shared ownership으로 둔다.

C) profile experience와 homepage publication을 하나의 business unit으로 합치고 verification/CI만 별도 unit으로 둔다.

X) Other (please describe after [Answer]: tag below) — bounded context, shared domain과 provider/consumer ownership을 구체적으로 설명한다.

[Answer]: A) U1은 Profile Experience와 canonical facts/metadata/PDF source, U2는 Homepage Publication과 generated/site contract, U3는 cross-cutting Verification/CI를 소유한다. downstream unit은 provider contract를 소비하며 사실이나 publication classification을 복제하지 않는다.

## 6.1 Answer Validation Result

| Question | Answer | Confirmed Decision |
|---|---|---|
| Q1 — Story Grouping | A | primary, contributor와 closure를 구분한다. ST-U01은 U2, ST-U03은 U1, ST-E03은 U2에서 닫는다. U3의 ST-U03 역할은 post-closure integrated regression evidence이며 실패 시 story를 다시 연다. |
| Q2 — Dependencies | A | branch-base gate 뒤 U1→U2→U3를 최신 검증 `develop`에서 순차 수행·`--no-ff` 병합하고 마지막에 integrated Build and Test를 실행한다. |
| Q3 — Team Alignment | A | 하나의 순차 delivery stream과 component/authored-path ownership을 사용한다. U1/U2는 production code와 owner-local example/PBT, U3는 cross-unit verification/CI를 소유한다. |
| Q4 — Technical Considerations | A | 세 unit은 한 repository와 한 static release 안의 logical work unit이며 별도 runtime/version/deployment boundary가 아니다. |
| Q5 — Business Domain | A | U1 Profile Experience, U2 Homepage Publication, U3 Verification/CI provider boundary를 유지하고 canonical fact와 publication classification을 복제하지 않는다. |

**Format Validation**: Passed. 다섯 답변 모두 해당 질문의 유효한 A 선택과 정확한 선택문을 사용한다.

**Ambiguity Validation**: Passed. 혼합 선택, 조건 없는 병렬화, undefined owner, 미정 closure 또는 `X` 설명 누락이 없다.

**Consistency Validation**: Passed. Q1의 story 역할은 Q2의 hard sequence, Q3의 owner-local tests, Q4의 single static release와 Q5의 provider ownership에 일치한다.

**Existing Approval Validation**: Passed. C01~C12/S01~S05 ownership, strict per-unit loop, PBT no-postponement, Git Flow branch-base gate, source/generated, fact/Vault, no-push와 no-deploy 경계를 보존한다.

**Clarification Status**: Not required.

**Independent Review**: Passed. ST-U01, ST-U03와 ST-E03의 closure와 U3 contribution을 포함해 승인 차단 항목이 없다.

## 7. Answer Validation and Conflict Rules

- 다섯 질문 모두 해당 질문의 유효한 option letter로 답해야 한다.
- `X`는 같은 줄에 unit boundary와 ownership을 생성할 수 있는 구체적 규칙이 있어야 한다.
- `A와 B 혼합`, `상황에 따라`, `일부 병렬`처럼 판정 기준이 없는 답변은 follow-up 대상이다.
- Q1의 exclusive 또는 duplicate story ownership은 ST-U01, ST-U03와 ST-E03의 cross-unit acceptance를 어떻게 보존하는지 추가 확인이 필요하다.
- Q2의 B/C는 승인된 strict per-unit loop와 sequential Git Flow를 변경하므로 선택하면 execution plan 변경 영향과 branch safety를 명시적으로 재검토한다.
- Q3의 specialist 또는 journey team model은 실제 owner와 handoff 증거가 없으면 추정하지 않는다.
- Q4의 B/C는 기존 code organization 또는 static/no-runtime/no-infrastructure 범위를 변경하므로 선택하면 scope와 architecture 충돌을 해결해야 한다.
- Q5의 B/C는 승인된 C01~C12 ownership과 canonical fact/publication source separation을 변경하므로 선택하면 Application Design change gate가 필요하다.
- PDF engine, PBT framework, slot literal, schema field, viewport, CSS 수치와 실제 profile fact는 Units Generation 질문이 아니며 후속 Functional/NFR 또는 fact approval gate에 남긴다.

## 8. Plan Approval and Generation Boundary

모든 답변의 형식, 명확성, 상호 일관성과 기존 승인 호환성을 검증한 뒤 확정 decomposition을 이 plan에 반영하고 별도 plan approval을 요청한다. 사용자의 명시적 승인 전에는 세 unit artifact를 생성하지 않는다.

Units Generation은 Property-Based Testing enforcement table의 적용 단계가 아니므로 현재 PBT 준수 판정은 **N/A**다. 다만 U1/U2 property ownership, U3 aggregation, shrinking/seed와 example-test 보완 의무는 unit artifact와 Construction handoff에 보존한다.

Obsidian Press project extension은 계속 적용한다. authored/generated 경계와 dirty worktree를 보존하며, Units Generation 승인 뒤에도 branch-base reconciliation gate를 통과하기 전에는 feature branch를 만들지 않는다. Infrastructure Design은 unit마다 실행하지만 no-change compatibility decision이며 Terraform/AWS/deploy 권한을 만들지 않는다.
