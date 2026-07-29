# U3 Infrastructure Design Plan — Quality Gate and CI Integration

## 문서 상태

- **단계**: CONSTRUCTION — U3 Infrastructure Design
- **상태**: 질문 답변 대기
- **Unit**: U3 Quality Gate and CI Integration
- **작성일**: 2026-07-29
- **Feature Branch**: `codex/feature/resume-quality-gates`
- **선행 승인**: U3 Functional Design · NFR Requirements · NFR Design (모두 2026-07-29, "승인")

## 1. 입력과 전제

- [logical-components.md](../u3-quality-gate-and-ci-integration/nfr-design/logical-components.md) — LC-U3-01~09, 변경 표면 요약
- [Unit of Work §5.9/§5.10](../../inception/application-design/unit-of-work.md) — Infrastructure Design 산출: "CI validation이 deployment infrastructure를 변경하지 않음 확인; 예상은 no-change 결정". §5.10: no-change 기록 의무 + "안전한 validation-only 실행 경로를 만들 수 없으면 이 gate에서 중단".
- U2 handoff: 아홉 개의 상속된 배포 리스크와 배포 완전성 gate 부재는 배포 권한과 함께 남는다 (U3가 해결하지 않음).

다음은 이미 승인됐으며 다시 열지 않는다.

- Jenkinsfile 변경 집합: Verify stage, `RUN_DEPLOY` param + Deploy `when` gate, post-failure archiver(정정된 glob), `rm -rf` 제거 (LC-U3-01~04).
- Deploy stage 내용 불변, Terraform/AWS mutation 없음, push·merge·Vault 변경 별도 승인 (OR-U3-09).
- ST-E04 마감 = Deploy 미호출 **실제 Jenkins validation 실행** (diff·local-only 불가, §5.10).

## 2. 현재 인프라 실측

- **배포 인프라**: S3 `obsidian-custom-s3` + CloudFront `E35HZFVGD0OJ04`, Terraform은 `infra/` (compatibility reference only — §5.6). ACM us-east-1, DNS Cloudflare.
- **Jenkins**: 로컬 Mac 단일 노드, nightly cron. **job 설정(추적 branch, trigger 상세)은 repo 밖**이라 이 계획이 읽을 수 없다 — Q3가 운영자에게 확인한다.
- **validation 실행의 자격 증명**: `RUN_DEPLOY=false` 실행은 Deploy stage를 건너뛰므로 AWS 자격 증명 없이 성립한다.

## 3. 목표와 산출물

no-deployment-infrastructure-change 결정을 기록하고, ST-E04 마감에 필요한 실제 validation 실행의 시점·대상을 확정한다. 답변 검증 뒤 생성:

- `aidlc-docs/construction/u3-quality-gate-and-ci-integration/infrastructure-design/infrastructure-design.md`
- `aidlc-docs/construction/u3-quality-gate-and-ci-integration/infrastructure-design/deployment-architecture.md`

## 4. 실행 계획

- [x] 승인된 변경 집합의 인프라 영향(Terraform/S3/CloudFront/IAM/DNS/Jenkins job 설정)을 분석한다.
- [x] 미확정 항목을 질문으로 작성한다 (승인 결정 반복 없음, 각 질문 ≥2 선택지 + `X) Other`).
- [ ] 답변 수집·검증; 모호하면 clarification file.
- [ ] 두 artifact 생성, traceability 검증, 독립 검토·구조 검증.
- [ ] 표준 2-option 완료 gate 제시.

## 5. Infrastructure Design Questions

각 `[Answer]:` 뒤에 선택한 문자 하나를 입력해 주세요. `X`를 선택하면 같은 줄에 구체적인 내용을 작성해 주세요.

### Question 1 — No-deployment-infrastructure-change 판정 (§5.10 의무 기록)

승인된 U3 변경 집합(Jenkinsfile 코드 4건 + 조건부 site test/script + AI-DLC 문서)을 검토한 결과, Terraform/S3/CloudFront/IAM/DNS/Jenkins plugin 어느 것도 변경하지 않습니다. 이 판정을 확정할까요?

A) **no-change 결정을 기록하고 진행한다** — 배포 인프라·Terraform state·AWS 리소스·Jenkins plugin 무변경; Jenkinsfile은 repo 내 코드로만 변경된다. §5.10의 기록 의무를 이 단계 artifact가 이행한다. **(권장)**

B) 변경이 필요하다고 판정한다 — §5.10 규정대로 ST-E04를 열어 둔 채 이 gate에서 중단하고 별도 결정을 요청한다.

X) Other (please describe after [Answer]: tag below)

[Answer]:

### Question 2 — 실제 validation 실행의 시점과 대상

ST-E04 마감용 `RUN_DEPLOY=false` 실행을 언제, 어떤 branch 대상으로 수행할까요?

A) **병합 후, Jenkins job이 추적하는 branch에서** — U3 병합과 그 branch 반영이 끝난 뒤 수동 "Build with Parameters"로 실행한다. Jenkins job 설정은 일절 건드리지 않는다 (§6의 마감 시점 "U3 → Integrated Build and Test에서 ST-E04 closes"와 정합; 단 U3 Code Generation 단계 안에서는 로컬 등가 실행 + Jenkinsfile 정적 검증까지만 확보되고, 실제 실행 증거는 integrated 단계로 이동한다). **(권장)**

B) 병합 전, feature branch 대상으로 — Jenkins job의 branch 지정을 일시 변경(또는 branch parameter 지정)해 실행하고 원복한다. 증거가 병합 전에 확보되지만 job 설정 변경·원복이라는 인프라 표면이 생긴다.

X) Other (please describe after [Answer]: tag below)

[Answer]:

### Question 3 — Jenkins job의 추적 branch 확인 (운영자 확인 사항)

Jenkins job 설정은 repo 밖이라 확인이 필요합니다. 현재 nightly job이 checkout하는 branch는 무엇입니까? (Q2의 실행 계획이 이 사실에 의존합니다.)

A) `main`/`master` — 이 경우 U3 병합(develop)만으로는 validation 실행이 새 Jenkinsfile을 보지 못하므로, main 반영 시점(별도 승인)과 ST-E04 마감이 결합된다.

B) `develop` — U3 병합 직후 추적 branch가 새 Jenkinsfile을 본다; Q2-A가 가장 단순하게 성립한다.

X) Other (please describe after [Answer]: tag below — 기타 branch명 또는 모름)

[Answer]:

## 6. 답변 검증과 생성 경계

- 답변은 문자·설명 일치, 단일 의미, 상호 일관성, 기존 승인 호환성을 검증한다. Q1~Q3 명확화 전에는 artifact를 생성하지 않는다.
- 이 계획 작성은 application source, Jenkinsfile, external Vault, 배포, Jenkins job 설정을 변경하지 않는다. Infrastructure Design 승인 전에는 U3 Code Generation으로 진행하지 않는다.
