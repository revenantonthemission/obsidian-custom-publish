# NFR 검증 매트릭스 — `261115-personal-website`

- **단계**: Performance Validation (`performance-validation`), 2026-11-21 KST
- **상위 산출물**: 네 단위의 `construction/*/nfr-requirements/{performance-requirements,scalability-requirements}.md`(`performance-requirements`, `scalability-requirements`), `construction/*/nfr-design/performance-design.md`, `construction/u1-publish-boundary/nfr-design/scalability-design.md`(`performance-design`, `scalability-design`), `operation/observability-setup/dashboards.md`(`dashboards`), `construction/build-and-test/test-results.md`

## 1. 검증 결과

| ID | 목표 | 실측 | 판정 | 근거 |
|---|---|---|---|---|
| U2-NFR1.8 | `/` ≤ 255,387 B | 255,387 B(CDP 18요청) | Met | `test-results.md` R5.6 |
| U4-PD-ROOT-BYTES | `/` ≤ 255,387 B | 255,387 B | Met | 동일 |
| U1-NFR1.4 | `/` ≤ 320,156 B(사전 기준) | 255,387 B | Met | 동일 |
| U1-NFR6.2 | 검증 명령 통과 | 5차에서 전체 통과 | Met | `test-results.md` R5.4 |
| U1-NFR6.6 | 유닛 스위트 ≤ 1.2× | 0.889× | Met | 동일 |
| U2-NFR6.8 / U4-NFR1.14 | 픽스처 빌드 ≤ 1.05–1.10× | 2.99 s(0.83×) | Met | 동일 |
| U3-NFR6.14 | 그룹 CSS 인라인 < 4096 B | 약 3,912 B | Met | `test-results.md` R5.4 |
| **신규 실제 기준선** | 실제 볼트 빌드 시간 기록 | **35.18 s / 260페이지 / 156소스** | **기록(Q2 B)** | 배포 로그 |
| 공개 응답 | 단일 요청 지연 관측 | `/` 0.908 s, 글 1.193 s, `/writing/tags` 0.939 s | 기록 | 이 단계 curl 측정 |
| 오리진 응답 | 단일 요청 지연 관측 | `/` 0.002 s | 기록 | 이 단계 curl 측정 |

## 2. 미해결 항목

| ID | 판정 | 닫는 조건 | 소유 |
|---|---|---|---|
| TEAM-E2E-A11Y | Not Met | 16상태 수동 검토 후 `npm run test:e2e` 통과 | 유지관리자 |
| U1-NFR6.1 | **Met** | Jenkins build #42, `ad158642` 체크아웃, Verify 초록(단위 602·속성 36·Rust 전 스위트) | `operation/deployment-execution/jenkins-verify-evidence.md` |
| U1-SLO-NIGHTLY | Unverified | 30일 운영 신호 | observability-setup |
| U1-SLO-PAGECOUNT | Unverified | 30일 운영 신호 | observability-setup |
| 부하 테스트(k6) | 미실행 | 도구 설치·승인 후 `load-test-plan.md` 실행 | 유지관리자 |

## 3. 기준선 변경 기록

| 구분 | 입력 | 값 | 용도 |
|---|---|---|---|
| 픽스처(Q2 A 대안) | 19소스, 40페이지 | 2.99 s | 회귀 감지(기존 목표와 비교 가능) |
| 실제 볼트(Q2 B 채택) | 156소스, 260페이지 | 35.18 s | **새 기준선**, 용량 계획·향후 회귀 판정 |

두 값은 입력 집합이 달라 직접 비교하지 않습니다. 향후 실제 볼트 빌드가 35.18초를 크게 초과하면 같은 입력으로 재측정해 원인을 확인합니다.

## 4. 종합 판정

설정된 성능 목표는 **모두 충족**했습니다. 미해결 5건은 코드 성능이 아니라 수동 검토·운영 데이터·별도 도구 설치에 관한 것으로, 각각의 소유자와 닫는 조건이 명시되어 있습니다.
