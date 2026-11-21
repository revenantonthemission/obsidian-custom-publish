# 성능 검증 질문과 답변

- **단계**: Performance Validation (`performance-validation`), 2026-11-21 10:52 KST, `261115-personal-website`
- **작성자**: 품질 엔지니어 역할 (aidlc-quality-agent)
- **왜 다시 묻지 않았는가**: 성능 예산(루트 255,387 B), 빌드 시간(2.99 s), 스위트 시간 비율(0.889×), 발행 글 수 등은 `test-results.md` R5.6에 이미 측정되어 있고, 목표는 `performance-requirements.md`·`performance-design.md`에 고정되어 있습니다. 이 단계는 그 결과를 **배포된 실제 사이트**에 대조하고, 새로 결정이 필요한 세 가지만 묻습니다.
- **근거 문서**: 네 단위의 `construction/*/nfr-requirements/{performance-requirements,scalability-requirements}.md`(`performance-requirements`, `scalability-requirements`), `construction/*/nfr-design/performance-design.md`, `construction/u1-publish-boundary/nfr-design/scalability-design.md`(`performance-design`, `scalability-design`), `operation/observability-setup/dashboards.md`(`dashboards`), `construction/build-and-test/test-results.md`, `operation/deployment-execution/health-check-report.md`

## Q1. [품질 엔지니어] 부하 테스트를 새로 도입할까요?

이 사이트는 정적 트리와 단일 오리진입니다. 현재까지 부하 테스트 도구(k6·Artillery 등)는 없고, Build and Test가 경로별 전송 바이트·빌드 시간·스위트 시간을 측정했습니다.

- A. 도입하지 않는다 — 기존 측정값과 배포된 사이트의 실제 응답 측정으로 검증을 마친다
- B. 간단한 동시 요청 스크립트를 만들어 로컬 오리진에만 부하를 준다(도구 설치 없음)
- C. k6 등 전용 도구를 도입해 공개 URL에 부하를 준다
- D. 위 조합 외의 다른 처리
- X. Other (please specify)

[Answer]: C

답변: k6 등 전용 부하 테스트 도구를 도입해 공개 URL을 대상으로 설계합니다(Q1 C). 다만 Q3 A에 따라 지금 실행하지는 않고, 보수적인 부하参数와 실행 전제조건(도구 설치, 유지관리자 승인, 야간 외 시간)을 `load-test-plan.md`에 담습니다.

## Q2. [품질 엔지니어] 성능 기준선은 무엇으로 삼을까요?

픽스처 빌드는 19소스·2.99초이고, 이번 실제 배포는 156소스·260페이지·35.18초였습니다. 두 값은 입력 집합이 달라 직접 비교할 수 없습니다.

- A. 기존 픽스처 기준선을 유지한다 — 회귀 감지는 픽스처로, 실제 볼트 수치는 참고 정보로만 기록한다
- B. 실제 볼트 기준선을 새로 채택한다 — 35.18초/260페이지를 기준으로 삼는다
- C. 둘 다 병기한다 — 회귀는 픽스처, 용량 계획은 실제 볼트
- D. 위 조합 외의 다른 처리
- X. Other (please specify)

[Answer]: B

답변: 실제 볼트 기준선을 채택합니다(Q2 B). 156소스·260페이지·35.18초를 새 기준으로 삼고, 향후 같은 입력 집합에서 회귀를 판정합니다. 픽스처 기준선(19소스·2.99초)은 입력이 달라 직접 비교하지 않고 역사적 기록으로만 남깁니다.

## Q3. [품질 엔지니어] 이번 검증에서 다시 실행할 항목은 무엇인가요?

Build and Test 5차 실행이 모든 스위트를 통과했고, 그 커밋은 `develop`에 병합됐습니다. `npm run test:e2e`만 수동 접근성 기록 만료로 거부된 상태입니다.

- A. 아무것도 다시 실행하지 않는다 — 기존 결과와 라이브 사이트 측정만 사용한다
- B. 라이브 사이트의 HTTP 응답 시간·크기만 다시 측정한다(이미 수행)
- C. 전체 검증 명령을 다시 실행한다(약 10분)
- D. 위 조합 외의 다른 처리
- X. Other (please specify)

[Answer]: A

답변: 아무것도 다시 실행하지 않습니다(Q3 A). Build and Test 5차 결과(`test-results.md`)와 이번 단계에서 이미 수행한 라이브 사이트 HTTP 측정만으로 검증합니다. 전체 검증 명령은 5차에 이미 통과했고 그 커밋이 `develop`에 병합됐습니다.

## 기록되지 않은 판단 (사람에게 다시 묻지 않은 것)

- **목표 수치**: `/` 255,387 B(리셋 예산), 빌드 ≤ 3.81 s(픽스처), 유닛 스위트 ≤ 1.2× 등은 이미 결정되어 있습니다(`performance-design.md`, `test-results.md`).
- **추적·지표 인프라**: X-Ray·CloudWatch는 없고 Grafana/Alloy 설계만 있습니다(`dashboards.md`). 성능 병목 분석은 로그와 HTTP 측정으로 수행합니다.
- **남은 격차**: `TEAM-E2E-A11Y`(16상태 수동 검토), `U1-NFR6.1`(Jenkins Verify), 30일 SLO 신호는 이 단계의测量结果로 닫히지 않습니다.

## 측정된 현재 상태 (2026-11-21 10:52 KST, 배포 직후)

| 경로 | 측정 | 값 |
|---|---|---|
| 공개 `/` | HTTP 200 | 0.908 s, 25,948 B(문서만, 하위 자산 제외) |
| 공개 글 `/posts/infrastructure-as-code` | HTTP 200 | 1.193 s, 262,485 B |
| 공개 `/writing/tags` | HTTP 200 | 0.939 s, 37,052 B |
| 로컬 `/` | HTTP 200 | 0.002 s, 25,948 B — 공개 경로 지연은 대부분 터널·네트워크 |
| 실제 빌드 | `just deploy` 로그 | 156소스, 260페이지, 35.18 s, 리디렉션 79규칙 |
| 픽스처 빌드 | `test-results.md` R5.2 | 19소스, 40페이지, 2.99 s |

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
