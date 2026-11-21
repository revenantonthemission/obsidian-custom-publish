# 성능 검증 결과 — `261115-personal-website`

- **단계**: Performance Validation (`performance-validation`), 2026-11-21 KST
- **방법**: Q3 A — Build and Test 5차 결과(`test-results.md`) 재인용 + 배포된 실제 사이트에 대한 단일 HTTP 측정. 부하 테스트는 설계만(Q1 C), 전체 검증 명령 재실행 없음
- **상위 산출물**: 네 단위의 `construction/*/nfr-requirements/{performance-requirements,scalability-requirements}.md`(`performance-requirements`, `scalability-requirements`), `construction/*/nfr-design/performance-design.md`, `construction/u1-publish-boundary/nfr-design/scalability-design.md`(`performance-design`, `scalability-design`), `operation/observability-setup/dashboards.md`(`dashboards`)

## 1. 라이브 사이트 측정(이번 단계)

| 경로 | 상태 | 응답 시간 | 전송 크기 | 비고 |
|---|---|---|---|---|
| 공개 `/` | 200 | 0.908 s | 25,948 B | HTML 문서만. 하위 자산 미포함 |
| 공개 `/posts/infrastructure-as-code` | 200 | 1.193 s | 262,485 B | HTML 문서만 |
| 공개 `/writing/tags` | 200 | 0.939 s | 37,052 B | HTML 문서만 |
| 로컬 `/` | 200 | 0.002 s | 25,948 B | 오리진은 거의 즉시 응답 |

**해석**: 공개 경로 지연의 대부분은 터널·외부 네트워크입니다. 오리진 자체는 밀리초 단위입니다. 전송 크기는 `curl`의 문서 크기이므로, 하위 18개 요청을 모두 합산한 기존 255,387 B와 직접 비교하면 안 됩니다.

## 2. 빌드·스위트 결과(Build and Test 5차 재인용)

| 항목 | 측정 | 기준 | 판정 |
|---|---|---|---|
| 픽스처 빌드 | 2.99 s(19소스) | ≤ 3.81 s | ✅ |
| 실제 볼트 빌드 | **35.18 s(156소스·260페이지)** | Q2 B로 새 기준선 채택 | ✅ 기준 기록 |
| 유닛 스위트 | 0.889 × 기준선 | ≤ 1.2 × | ✅ |
| `/` 전송 바이트 | 255,387 B(CDP, 18요청) | ≤ 255,387 B(리셋 예산) | ✅ |
| 사이트 커버리지 | 54.01% lines | 보고만, 최소 기준 없음 | ✅ 보고 완료 |
| Rust 커버리지 | 87.45% lines | 보고만 | ✅ 보고 완료 |
| 테스트 결과 | 92 targets: 87 Met · 1 Not Met · 3 Unverified · 1 N/A | — | 아래 §3 |

## 3. 검증하지 못한 항목

| 항목 | 상태 | 다음 단계 |
|---|---|---|
| `npm run test:e2e` | 거부(`MANUAL_WEB_ACCESSIBILITY_RECORD_INCOMPLETE`, digest `3d578e5b…`) | 유지관리자의 16상태 수동 검토(2–4시간) 후 재실행 |
| `U1-NFR6.1` | Unverified | 원격 커밋에 대한 Jenkins Verify 실행 |
| `U1-SLO-NIGHTLY`, `U1-SLO-PAGECOUNT` | Unverified | 30일 운영 신호(`observability-setup` 설정) |
| k6 부하 테스트 | 설계만, 미실행(Q1 C + Q3 A) | `load-test-plan.md`의 전제조건 충족 후 실행 |

## 4. 결론

기존 설정된 성능 목표는 모두 충족했고, 배포된 실제 사이트도 정상 응답합니다. 새 기준선은 실제 볼트 빌드(35.18 s/260페이지)이며,픽스처 기준선은 회귀 감지용으로만 남습니다. 남은 네 항목은 코드 결함이 아니라 **수동 검토·운영 신호·별도 도구 설치**에 기인합니다.
