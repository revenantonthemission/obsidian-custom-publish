# U2 Infrastructure Design — Homepage Publication Boundary

## 문서 상태

- **단계**: CONSTRUCTION — U2 Infrastructure Design
- **Unit**: U2 Homepage Publication Boundary
- **작성일**: 2026-07-28
- **결정 근거**: [Plan](../../plans/homepage-publication-boundary-infrastructure-design-plan.md) Q1~Q6 (A/A/A/B/A/B) + [Clarifications](../../plans/homepage-publication-boundary-infrastructure-design-clarification-questions.md) C1-A·C2-A
- **결과**: **호환 — no-change 판정.** Terraform, AWS, DNS, cache policy, 배포 실행 변경 없음.

## 1. Topology 대응 (Q1-A)

| U2 배포 표면 delta | 기존 infra 처리 | 변경 필요 |
|---|---|---|
| `/` HTML 내용 변경 | 기존 default behavior + `/*` invalidation | 없음 |
| discovery JSON·RSS·sitemap 내용 변경 | 동일 경로의 내용 갱신 — `sync`가 덮어씀 | 없음 |
| `/posts/passion-project/index.html` 부재 | S3 object 부재 → OAC 403 → CloudFront `custom_error_response`(403→404, `/404.html`, min TTL 60초)가 기존 404 페이지로 응답 (`infra/main.tf` 확인) | 없음 — 자연스러운 404 |
| 새 공개 파일 | 없음 (Q3-A) | 없음 |

S3 bucket, CloudFront distribution/OAC/default behavior/rewrite function/header policy, ACM 인증서, Cloudflare DNS, cache policy 모두 불변이다. CloudFront function redirect(Q1-B 대안)는 채택하지 않았다 — 이전에 색인된 옛 URL은 404가 되며 이는 승인된 제품 결과다.

## 2. 제거 route의 origin·cache 처리 (Q2-A)

- `just deploy`(Justfile:27~28)와 Jenkins Deploy(Jenkinsfile:65~66)는 모두 `aws s3 sync site/dist/ ... --delete` + `cloudfront create-invalidation --paths "/*"`를 실행한다. 다음 배포에서 `--delete`가 origin의 stale object를 제거하고 `/*` invalidation이 edge cache를 비운다 — **기존 도구가 제거 route를 이미 완전하게 처리한다.**
- U1이 기록한 상속 위험 9건(비원자적 sync 창, 무조건 nightly Jenkins Deploy, fixture 기본값 등)은 U2가 재기술하지 않고 그대로 유지하며 U3/배포 권한자 이관으로 남는다. U2 추가 관찰: 비원자적 sync 창 동안 `/` 신규 내용과 옛 route 존재가 일시적으로 공존할 수 있으나, 창이 닫히면 일관 상태로 수렴한다.

## 3. Build-side 산출물 경계 (Q3-A)

`content/homepage/`(artifact)와 `content/manifest.json`은 build 입력이며 배포 대상이 아니다. `deploy-preprocess`는 4개 discovery JSON(search-index/graph/previews/nav-tree)과 기존 `content/assets/*` → `site/public/assets/` 복사만 수행하고, 이 집합에 U2가 추가하는 항목은 없다 (C1-A가 이 집합을 불변으로 고정한다). 공개 표면에 새 파일이 생기지 않는다 — homepage 내용은 Astro가 `/` HTML로 굽는다.

## 4. Justfile 접촉 범위 (Q4-B + C1-A)

허용 범위는 **동작 보존 refactoring으로 한정**된다: PD-U2-03이 승인한 `preprocess`·`deploy-preprocess`의 `rm -rf` 두 라인 제거에 더해, 복사되는 파일 집합·`deploy`의 sync/invalidation 명령·각 recipe의 관찰 가능한 산출 결과를 바꾸지 않는 형태 변경만 가능하다. Q3-A와 충돌하는 변경(homepage/manifest 공개)은 이 허용에 포함되지 않는다.

## 5. Rollback (Q5-A)

U1 기록을 유지한다: production exact rollback은 보존된 완전한 release 없이는 불가하며 현재는 best-effort 재배포다. local rollback은 git ref + 결정적 재생성으로 정확하며(동일 vault 입력 전제 — NFR-U2-004의 결정성은 vault 내용 + 코드에 조건화된다), NFR-U2-004의 byte 결정성이 이를 강화한다. U2 추가 절차는 없다.

## 6. Monitoring 재검토 (Q6-B + C2-A)

문서 검증 수준의 재검토를 수행했다 (2026-07-28, `infra/main.tf` 대조):

| 항목 | U1 기록 | 현재 Terraform 확인 | 판정 |
|---|---|---|---|
| CloudFront access log | log bucket, `cloudfront/` prefix, cookies 제외 | `logging_config { bucket=aws_s3_bucket.logs...; prefix="cloudfront/"; include_cookies=false }` (main.tf:209~213) 일치 | 현상 유지 |
| Log 보존 | 90-day lifecycle | `aws_s3_bucket_lifecycle_configuration.logs` expiration 90일 (main.tf:86~96) 일치 | 현상 유지 |
| Alarm/dashboard/synthetic/RUM/analytics | 없음 (U1 N/A) | 해당 resource 없음 | N/A 유지 |
| Messaging/queue | 없음 (U1 N/A) | 해당 resource 없음 | N/A 유지 |

U1의 기록은 현재 구성과 일치하며, 새 도구·서비스 도입 없이 각 항목의 판정을 근거와 함께 갱신했다. AWS/Terraform 변경은 없다. [shared-infrastructure.md](../../shared-infrastructure.md) §4의 U2 row는 확인 완료로 갱신한다.

## 7. 결과와 경계

- U2 Infrastructure Design의 결과는 **no-change 확인**이다. Code Generation은 이 판정 아래에서 진행할 수 있다.
- 이 단계는 문서만 변경했다. Terraform, AWS, DNS, cache policy, 배포 실행, external Vault, application source는 변경되지 않았다.
- 배포·Jenkins·AWS mutation은 여전히 별도 권한 사안이다 (FR-016, FR-018).

## 8. Traceability

| 판정 | 근거 |
|---|---|
| §1~2 | Q1-A, Q2-A; unit-of-work §4.9; FR-009.2; Justfile/Jenkinsfile/main.tf 실측 |
| §3 | Q3-A; BR-U2-030; FR-017 |
| §4 | Q4-B + C1-A; PD-U2-03 |
| §5 | Q5-A; U1 rollback 기록 |
| §6 | Q6-B + C2-A; U1 Q7 기록; main.tf 실측 |
