# U3 Functional Design — Verification Orchestration Rules

## 문서 상태

- **단계**: CONSTRUCTION — U3 Functional Design (artifact 1/2)
- **Unit**: U3 Quality Gate and CI Integration (C12 · S05)
- **작성일**: 2026-07-29
- **근거**: [계획 문서](../../plans/u3-quality-gate-and-ci-integration-functional-design-plan.md) Q1~Q7 답변(모두 A), [Unit of Work §5](../../../inception/application-design/unit-of-work.md), [ST-E04](../../../inception/user-stories/stories.md)

## 1. 소유와 관찰 경계

S05 Verification Orchestration은 U1/U2가 제공하는 **stable local command와 public contract를 read-only로 관찰**하며, production behavior를 소유하지 않는다 (§5.3). U1/U2 test implementation의 이동·복제·지연은 금지된다 (§5.4 Explicit Non-owner, 재열지 않는 결정). `infra/`는 compatibility reference only다 (§5.6).

## 2. Orchestration 규칙

### OR-U3-01 — Stable command 무변경 집계 (AC-E04-01)

U1/U2 stable command는 **변경 없이** 호출된다: Rust example/PBT는 `just test`(= `cd preprocessor && cargo test`), site는 `npm run test:unit` · `npm run test:pbt` · `npm run test:e2e`. U3는 이 명령들의 내용·경로·옵션을 수정하지 않고 orchestration만 한다. 단 하나의 예외는 CI의 Rust 호출로, Q2-A가 승인한 등가 release 호출(OR-U3-02)을 쓴다 — debug/release profile 차이(`debug_assertions`, overflow check)가 관찰 가능한 차이를 만들지 않는지는 Code Generation 실행 증거로 확인한다.

### OR-U3-02 — Jenkins Verify stage 신설과 배치 (Q2-A)

`Jenkinsfile`에 **Install 뒤 · Preprocess 앞** Verify stage를 신설한다. 내용:

- `cargo test --release --manifest-path preprocessor/Cargo.toml` — Install stage의 `cargo build --release` 산출물을 재활용하는 경로 (정확한 wiring은 Code Generation에서 실행으로 검증; test 바이너리의 CWD가 package root여야 `../fixtures/vault` 상대 경로가 성립한다는 제약을 규칙으로 기록한다).
- `cd site && npm run test:unit && npm run test:pbt`.

### OR-U3-03 — 실패 의미론 (Q2-A, §5.5)

Verify 실패는 **pipeline 실패**다: 이후 stage(Preprocess/Build Site/Deploy)는 진행하지 않으므로 배포가 차단된다. **silent retry 금지** — 실패는 command, seed, counterexample evidence와 함께 보고된다 (OR-U3-05).

### OR-U3-04 — e2e의 CI 제외 (Q3-A)

CI Verify 범위는 **build + example test + PBT까지**다 (ST-E04의 "relevant build/example/PBT" 문언 충족). `npm run test:e2e`는 U1/U2 stable **local** command로 유지하며, CI 편입은 별도 후속 결정으로 남긴다. 결과적으로 CI에서 `HOMEPAGE_TODAY_OVERRIDE` 고정은 현 범위에서 불요하다; 기본(무override) e2e의 오늘-글 단언 전제는 로컬 실행 지침으로 유지된다 (U2 handoff 항목의 범위-내 처리).

### OR-U3-05 — Seed evidence 형식 (Q4-A; AC-E04-02, AC-E04-03)

framework 기본 출력이 증거다 — 새 report 기계를 만들지 않는다:

- **fast-check**: runner가 매 실행 seed를 출력한다. 재현은 출력된 seed로.
- **proptest**: 실패 시 `cc` shrunk-counterexample 라인을 출력하고 `proptest-regressions` 지속 파일에 기록한다 (커밋 정책은 U2 승인 사항). 재현은 커밋된 regressions 파일 replay로 — `PROPTEST_RNG_SEED`는 기록-실패 재현 경로가 아니다.
- **1차 증거**: Jenkins console log. **실패 시 보존**: `proptest-regressions` 변화를 `archiveArtifacts`로 보존한다.
- 로컬 재현은 외부 서비스 가용성에 의존하지 않는다 (AC-E04-03) — 두 재현 경로 모두 repo-local 정보만 요구한다.
- AC-E04-02의 "seed 항상 기록"은 이 형식에서 비대칭임을 명시한다: fast-check는 매 실행 seed를 출력하지만, proptest는 **실패 시에만** `cc` 증거를 남긴다. 이는 Q4-A에 내재된 승인 사항이며, Build and Test 증거에 이 사유를 그대로 기록한다.

### OR-U3-06 — Validation-only Jenkins 실행 경로 (Q1-A; §5.10)

`RUN_DEPLOY` boolean parameter(**기본값 true**)를 추가하고 Deploy stage에 `when { expression { params.RUN_DEPLOY } }`를 건다:

- nightly cron은 기본값으로 **오늘과 동일하게 배포**한다 (배포 동작 불변, FR-018).
- 수동 validation 실행은 `RUN_DEPLOY=false`로 Deploy를 건너뛴다 — 이것이 ST-E04 마감이 요구하는 "Deploy 미호출 **실제 Jenkins validation 실행**"의 경로다. Jenkinsfile diff나 local-only 결과만으로는 닫지 않는다 (§5.10, 재열지 않는 결정).
- Code Generation wiring 확인 사항: declarative pipeline에 `parameters` block을 처음 추가한 직후의 **첫 트리거 빌드**는 parameter 미등록으로 `params.RUN_DEPLOY`가 falsy일 수 있다 (Deploy 1회 skip 가능). §5.10이 요구하는 실제 validation 실행에서 이 동작을 확인·기록한다.

### OR-U3-07 — Jenkins 잔존 `rm -rf` 제거 (Q5-A)

`Jenkinsfile` Preprocess stage의 `rm -rf content/posts content/meta content/assets` 라인을 **제거**한다. C09의 validate→clean→write lifecycle이 정리를 단일 소유하며(U2 PD-U2-03), Justfile C1-A 제거와 같은 동작 보존 정리다. FR-016 경로·test 범위 내의 최소 변경으로 판정한다.

### OR-U3-08 — Cross-unit smoke: 재구현 금지 + 부족분만 (Q6-A; §5.5)

§5.5의 cross-unit 확인 항목(responsive/keyboard/no-JS smoke, routes·CTA·links·metadata·JSON-LD, print/PDF parity)은:

1. 기존 U1 spec(6종)과 U2 `homepage.spec.ts`가 이미 커버하는 항목을 **evidence mapping 표**로 닫는다 (표 작성과 항목별 판정은 NFR Requirements의 matrix와 Code Generation의 실행 증거에서 확정).
2. 실제 부족분만 **최소 adapter spec**으로 추가한다. 현재 식별된 후보: no-JS core navigation smoke, cross-unit 내부 link 무결성 sweep. adapter 규칙은 [adapter-rules.md](adapter-rules.md)를 따른다.
3. U1 evidence 기계(`test:e2e` sealed provider)와 manual accessibility record는 **불변**이다.

### OR-U3-09 — No-deploy 경계 (FR-018; AC-E04-04)

deployment stage를 확장·실행하지 않는다. Deploy stage 변경은 OR-U3-06의 `when` gate 추가로 한정되며, stage 내용(S3 sync, CloudFront invalidation)은 불변이다. AWS·Terraform mutation, push, merge, external Vault 변경은 별도 승인 없이 수행하지 않는다. U3 Infrastructure Design은 no-deployment-infrastructure-change를 기록해야 한다 (§5.10).

### OR-U3-10 — 실패 귀속과 reopen

integrated PDF/parity 실패는 ST-U03을 reopen하며 U3가 재소유·면제하지 않는다 (§5.10). cross-unit gate 실패는 소유 unit의 story로 귀속 보고한다. CI 실패 보고는 command + seed + counterexample evidence를 포함한다 (§5.5).

## 3. Traceability

| 규칙 | 답변 | ST-E04 AC | Unit of Work | FR |
|---|---|---|---|---|
| OR-U3-01 | — | AC-E04-01 | §5.3, §5.5 | FR-014, FR-015 |
| OR-U3-02 | Q2-A | AC-E04-01 | §5.5, §5.6 | FR-016 |
| OR-U3-03 | Q2-A | AC-E04-04 | §5.5 | FR-016 |
| OR-U3-04 | Q3-A | AC-E04-04 | §5.3 CI scope | FR-016 |
| OR-U3-05 | Q4-A | AC-E04-02, 03 | §5.5, §5.10 | FR-015 |
| OR-U3-06 | Q1-A | AC-E04-04 | §5.10 | FR-016, FR-018 |
| OR-U3-07 | Q5-A | AC-E04-04 | §5.6 | FR-016 |
| OR-U3-08 | Q6-A | — (evidence aggregation) | §5.4, §5.5 | FR-014 |
| OR-U3-09 | Q1-A | AC-E04-04 | §5.10 | FR-018 |
| OR-U3-10 | — | — | §5.4, §5.10 | — |

## 4. Mutation Boundary (§5.6)

| 경로 | 허용 범위 |
|---|---|
| `Jenkinsfile` | Verify stage 신설, `RUN_DEPLOY` param + Deploy `when` gate, `rm -rf` 라인 제거, seed evidence 보존 — 이상 전부 |
| `site/tests/**` | gap adapter spec만 (OR-U3-08) |
| `site/package.json` / `package-lock.json` | 승인된 verification tooling만; 현 설계는 신규 의존성을 예상하지 않는다 |
| `Justfile` | stable local verification recipe가 필요한 경우에만 narrow adapter |
| U1/U2 production source · owner-local tests · review-subject 파일 | **불변** |
