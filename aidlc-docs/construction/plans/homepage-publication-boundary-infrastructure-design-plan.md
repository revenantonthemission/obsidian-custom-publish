# U2 Infrastructure Design Plan — Homepage Publication Boundary

## 문서 상태

- **단계**: CONSTRUCTION — U2 Infrastructure Design
- **상태**: 질문 답변 대기
- **Unit**: U2 Homepage Publication Boundary
- **작성일**: 2026-07-28
- **Feature Branch**: `codex/feature/resume-home-boundary`
- **선행 승인**: U2 NFR Design (2026-07-28, "승인")
- **성격**: 호환성/no-change gate — Terraform, AWS, DNS, cache policy mutation은 어떤 선택에서도 승인되지 않는다

## 1. 입력과 전제

- [U1 Infrastructure Design](../profile-domain-and-native-experience/infrastructure-design/infrastructure-design.md)과 [shared-infrastructure.md](../shared-infrastructure.md) — 기존 topology와 상속 위험 9건
- [NFR Design](../homepage-publication-boundary/nfr-design/nfr-design-patterns.md) — PD-U2-03 (Justfile rm -rf 제거), PD-U2-09
- [Unit of Work §4.9](../../inception/application-design/unit-of-work.md) — route removal/addition, static asset/cache/invalidation/rollback 호환성; expected no-change decision
- 현재 배포 사실 (2026-07-28 확인): `just deploy`와 Jenkins Deploy 모두 `aws s3 sync site/dist/ ... --delete` + `cloudfront create-invalidation --paths "/*"`를 실행한다. `deploy-preprocess`는 `--stamp-published` flag로 preprocessor를 실행하고 4개 discovery JSON만 `site/public/`으로 복사한다.

다시 열지 않는 결정: U2의 모든 FD/NFR/NFR Design 계약; 배포·AWS·Terraform 비승인 경계(FR-018); Jenkins 변경은 U3 ST-E04 소유(FR-016).

## 2. 목표와 산출물

U2 산출물이 기존 정적 전달 topology와 호환되는지 검증하고 no-change를 기록한다. 답변 검증 뒤 다음을 생성한다.

- `aidlc-docs/construction/homepage-publication-boundary/infrastructure-design/infrastructure-design.md`
- `aidlc-docs/construction/homepage-publication-boundary/infrastructure-design/deployment-architecture.md`
- `aidlc-docs/construction/shared-infrastructure.md`의 U2 호환성 row 추가

## 3. 실행 계획

- [x] U2 배포 표면 delta(`/` 내용 변경, `/posts/passion-project` 부재, discovery JSON 내용 변경)와 현재 deploy 명령의 상호작용을 분석한다.
- [x] 미확정 항목을 질문으로 작성한다.
- [ ] 답변을 수집·검증한다.
- [ ] 세 artifact 작업을 생성·검증한다.
- [ ] 독립 검토와 구조 검증을 수행한다.
- [ ] 표준 2-option 완료 gate를 제시하고 명시적 승인을 기다린다.

## 4. Infrastructure Design Questions

각 `[Answer]:` 뒤에 선택한 문자 하나를 입력해 주세요. `X`를 선택하면 같은 줄에 구체적인 규칙을 작성해 주세요.

### Question 1 — 배포 topology 판정

U2가 기존 전달 topology에 요구하는 변경이 있습니까?

A) 완전 no-change로 판정한다: S3 bucket, CloudFront distribution/OAC/behavior/function, ACM 인증서, DNS, cache policy 모두 불변. U2는 배포되는 파일 집합의 **내용**만 바꾼다 (`/` HTML, discovery JSON, RSS/sitemap 내용, `/posts/passion-project/` 부재). 제거된 route는 자연스러운 404가 된다. **(권장)**

B) no-change에 더해, 기존에 색인됐을 수 있는 `/posts/passion-project`를 `/`로 보내는 CloudFront function 수준 redirect 추가를 topology 변경으로 요청한다 (생성 페이지가 아니므로 FD 위반은 아니나 별도 infra 권한이 필요하며 이 workflow에서는 실행 불가).

X) Other (please describe after [Answer]: tag below) — 필요한 topology 변경을 설명한다 (별도 권한 필요).

[Answer]:

### Question 2 — 제거 route의 origin·cache 처리

`/posts/passion-project/index.html`이 더 이상 생성되지 않는 것을 배포 관점에서 어떻게 기록할까요?

A) 기존 도구가 이미 처리함을 호환 근거로 기록한다: `aws s3 sync --delete`가 origin에서 제거하고 `/*` invalidation이 cache를 비운다. 비원자적 sync 창, 무조건 nightly Jenkins Deploy 등 U1이 기록한 상속 위험 9건은 그대로 유지하며 U3/배포 권한자 이관으로 남긴다. **(권장)**

B) U2 범위에서 배포 절차를 수정해 위험을 직접 해소한다 (FR-016/FR-018 경계 위반 — 별도 권한 필요).

X) Other (please describe after [Answer]: tag below) — 처리 방식을 설명한다.

[Answer]:

### Question 3 — Build-side 신규 산출물의 배포 경계

`content/homepage/`(artifact)와 `content/manifest.json`을 배포 관점에서 어떻게 다룰까요?

A) 둘 다 build 입력으로만 존재하고 배포 대상이 아니다. `deploy-preprocess`의 `site/public/` 복사 목록에 추가하지 않으며, 공개 표면에 새 파일이 생기지 않는다 — homepage 내용은 Astro가 `/` HTML로 굽는다. **(권장)**

B) `manifest.json`을 `site/public/`으로 복사해 공개 검증 endpoint로 노출한다.

X) Other (please describe after [Answer]: tag below) — 경계를 설명한다.

[Answer]:

### Question 4 — Justfile 접촉 범위

U2 Code Generation이 Justfile을 어디까지 만질 수 있습니까?

A) PD-U2-03이 승인한 `preprocess`·`deploy-preprocess`의 `rm -rf` 두 라인 제거로 한정한다. `deploy` recipe의 sync/invalidation 명령과 나머지 recipe는 불변 — 배포 동작은 바뀌지 않는다. **(권장)**

B) 추가 정리(예: 복사 목록 재구성)까지 허용한다.

X) Other (please describe after [Answer]: tag below) — 허용 범위를 설명한다.

[Answer]:

### Question 5 — Rollback 입장

U2가 rollback 관련 새 기록을 추가해야 합니까?

A) U1 기록을 유지하고 추가하지 않는다: production exact rollback은 보존된 완전한 release 없이는 불가하며 현재는 best-effort 재배포다. local은 git ref + 결정적 재생성(NFR-U2-004가 이를 강화)으로 정확하다. **(권장)**

B) U2 전용 rollback 절차를 새로 설계한다 (배포 권한 필요).

X) Other (please describe after [Answer]: tag below) — 입장을 설명한다.

[Answer]:

### Question 6 — Monitoring·Messaging·공유 문서

나머지 카테고리를 어떻게 판정할까요?

A) Monitoring/alerting/messaging/queue는 U1과 같은 근거(정적 site, 수집 주체 없음)로 N/A를 유지한다. `shared-infrastructure.md`에 U2 호환성 row(변경 없음, 새 공개 파일 없음, route 부재 처리 근거)를 추가한다. **(권장)**

B) 일부 항목을 재검토한다.

X) Other (please describe after [Answer]: tag below) — 판정을 설명한다.

[Answer]:

## 5. 답변 검증과 생성 경계

- 모든 답변은 문자 선택과 설명의 일치, 단일 의미, 상호 일관성 및 기존 승인 호환성을 검증한다.
- Q1~Q6이 모두 명확해진 뒤에만 artifact를 생성한다.
- 이 단계는 문서만 변경한다. Terraform, AWS, DNS, cache policy, 배포 실행, external Vault, application source는 변경하지 않는다.
- Infrastructure Design 승인 전에는 U2 Code Generation으로 진행하지 않는다.
