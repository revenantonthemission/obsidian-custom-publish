# U3 Infrastructure Design — Quality Gate and CI Integration

## 문서 상태

- **단계**: CONSTRUCTION — U3 Infrastructure Design (artifact 1/2)
- **Unit**: U3 Quality Gate and CI Integration (C12 · S05)
- **작성일**: 2026-07-29
- **근거**: [계획 문서](../../plans/u3-quality-gate-and-ci-integration-infrastructure-design-plan.md) Q1~Q3 답변(모두 A), [logical-components.md](../nfr-design/logical-components.md), [Unit of Work §5.9/§5.10](../../../inception/application-design/unit-of-work.md)

## 1. 결정

### ID-U3-01 — No-deployment-infrastructure-change (Q1-A; §5.10 의무 기록)

U3는 배포 인프라를 **변경하지 않는다**:

| 표면 | 판정 |
|---|---|
| Terraform (`infra/`) · Terraform state | 무변경 — compatibility reference only (§5.6) |
| S3 `obsidian-custom-s3` · CloudFront `E35HZFVGD0OJ04` · IAM · ACM · DNS | 무변경 — 읽지도 쓰지도 않음 |
| Jenkins plugin · Jenkins job 설정 (추적 branch, trigger 포함) | 무변경 — [tech-stack §3](../nfr-requirements/tech-stack-decisions.md) core 문법만 |
| `Jenkinsfile` | **repo 내 코드로만** 변경 (LC-U3-01~04) — 인프라 mutation이 아니라 versioned source 변경 |

이 표가 §5.10의 "U3 Infrastructure Design records no deployment-infrastructure change" 의무를 이행한다.

### ID-U3-02 — Validation 실행 경로와 ST-E04 마감 순서 (Q2-A + Q3-A)

Jenkins nightly job은 **`main`/`master`를 추적**한다 (Q3-A, 운영자 확인). 따라서 ST-E04 마감용 실제 실행의 순서는:

> **실측 정정 (2026-07-29, Run 1)**: 첫 실제 실행의 console log가 job이 **`origin/develop`을 checkout**함을 보였다 (workspace `obsidian-blog-develop`, revision `9022826`). Q3-A의 답변(main/master)은 실측과 다르며, 이 정정은 순서의 실질을 바꾸지 않는다 — "job이 추적하는 branch"(Q2-A)가 develop이므로 develop push만으로 새 Jenkinsfile이 보였고, 3단계(main 반영)는 무해한 전진으로 수행 완료된 상태다. nightly cron 배포의 소스도 develop이다.

1. U3 Code Generation 완료 — 이 단계 안에서 확보하는 증거: **로컬 등가 실행**(Verify와 동일한 명령 sequence) + **Jenkinsfile 정적 검증**.
2. U3 → `develop` `--no-ff` 병합 (병합 gate 별도 승인).
3. `develop` → main 반영 (**별도 승인** — U3 범위 밖의 promotion).
4. main 반영 뒤 수동 **"Build with Parameters"**로 `RUN_DEPLOY=false` 실행 — Jenkins job 설정은 일절 건드리지 않는다 (Q2-A).
5. console log(1차 증거)를 ST-E04 report(LC-U3-09)에 전사 — 이 실제 실행이 마감의 필요조건 (§5.10; diff·local-only 불가).

이 순서는 §6의 마감 시점("U3 → Integrated Build and Test에서 ST-E04 closes")과 정합한다. **귀결의 명시**: ST-E04의 실제 실행 증거는 main 반영 승인과 결합되며, U3 Code Generation 단계 안에서는 닫히지 않는다 — 이는 §5.10이 허용하는 구조다(마감은 U3 exit이 아니라 integrated handoff에서 일어난다).

**4단계의 실행 형태 (독립 검토 반영 — 2-run 순서)**: `parameters` block이 등록되기 전의 job은 아직 parameterized가 아니어서 "Build with Parameters" 양식이 존재하지 않는다. 따라서 4단계는 두 번의 실행으로 구성한다:

- **Run 1 (등록 빌드)**: main 반영 직후 "Build Now"로 실행. `params.RUN_DEPLOY`는 미등록 null-falsy이므로 `when` gate가 Deploy를 skip한다 — 이 실행도 Deploy를 호출하지 않지만, parameter 상태가 명시적 false가 아니므로 증거 실행으로 쓰지 않고 falsy 동작 확인(LC-U3-02)의 관찰 기록으로만 쓴다.
- **Run 2 (증거 실행)**: 등록 완료 뒤 "Build with Parameters"로 **명시적 `RUN_DEPLOY=false`** 실행 — 이것이 ST-E04 report(LC-U3-09)가 전사하는 validation 실행이다.

**시간창의 명시**: main 반영과 Run 1 사이에 nightly cron(`H 0 * * *`)이 먼저 발화하면 그 cron 빌드가 등록 빌드가 되어 **그날 밤 배포가 1회 조용히 skip**된다 (실패 양상은 skip뿐이며 오배포는 구조적으로 불가능). 이를 피하려면 main 반영 직후 다음 cron 창 이전에 Run 1을 수행하고, cron이 먼저 돌았다면 그 사실을 ST-E04 report에 기록한다.

### ID-U3-03 — 자격 증명과 보안 경계

`RUN_DEPLOY=false` 실행은 Deploy stage를 건너뛰므로 **AWS 자격 증명 없이 성립**한다 (credential check `aws sts get-caller-identity`는 Deploy stage 안에 있어 함께 skip). validation 실행은 어떤 AWS 리소스도 읽거나 쓰지 않는다. secret·token의 신규 도입 없음.

### ID-U3-04 — 상속 리스크의 비해결 기록

U2 handoff의 **아홉 개 상속된 배포 리스크**와 배포 완전성 gate 부재는 U3가 해결하지 않으며 배포 권한과 함께 남는다. U3의 기여는 리스크 감소의 한 형태로서의 Verify gate(실패 시 배포 차단 — OR-U3-03)뿐이고, 이는 기존 리스크 목록의 어떤 항목도 닫지 않는다.

## 2. Traceability

| 결정 | 답변 | 근거 |
|---|---|---|
| ID-U3-01 | Q1-A | §5.10 기록 의무, OR-U3-09, tech-stack §3 |
| ID-U3-02 | Q2-A + Q3-A | §5.10 마감 조건, §6 handoff, OR-U3-06, LC-U3-02/09 |
| ID-U3-03 | Q2-A | OR-U3-06/09 |
| ID-U3-04 | — | U2 handoff 기록 |
