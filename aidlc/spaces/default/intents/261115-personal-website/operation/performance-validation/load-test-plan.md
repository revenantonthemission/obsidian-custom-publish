# 부하 테스트 계획 — `261115-personal-website`

- **단계**: Performance Validation (`performance-validation`), 2026-11-21 KST
- **결정**: Q1 C(k6 도입·공개 URL 대상 설계), Q2 B(실제 볼트 기준선), Q3 A(지금은 실행하지 않음)
- **상위 산출물**: 네 단위의 `construction/*/nfr-requirements/{performance-requirements,scalability-requirements}.md`(`performance-requirements`, `scalability-requirements`), `construction/*/nfr-design/performance-design.md`, `construction/u1-publish-boundary/nfr-design/scalability-design.md`(`performance-design`, `scalability-design`), `operation/observability-setup/dashboards.md`(`dashboards`)

## 1. 목적과 범위

정적 사이트와 단일 오리진의 **동시 요청 견딤**을 확인합니다. 지금까지는 단일 요청 측정만 있었고(Q1 C의 근거), 부하 도구는 없었습니다. 이 문서는 실행 계획이며 **이번 단계에서는 실행하지 않습니다**(Q3 A).

## 2. 실행 전제조건

| 항목 | 상태 |
|---|---|
| k6 설치 | 미설치 — 유지관리자가 설치(`brew install k6` 등) |
| 공개 URL 부하 승인 | 미획득 — 공개 서비스에 부하를 주므로 유지관리자의 명시적 승인 필요 |
| 실행 시간대 | 야간 배포(0시)와 겹치지 않는 낮 시간. Jenkins 빌드와 동시 실행 금지 |
| 자격 증명 | 필요 없음(공개 URL). 토큰·키를 스크립트에 넣지 않음 |
| 모니터링 | 실행 중 `alarms.md` P1 채널 주시, 이상 시 즉시 중단 |

## 3. 시나리오

```js
// k6 예시 — 실행 전 유지관리자 승인 필요
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 1 },
    { duration: '1m',  target: 3 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const routes = [
    'https://rvnnt.dev/',
    'https://rvnnt.dev/posts/infrastructure-as-code',
    'https://rvnnt.dev/writing/tags',
  ];
  const res = http.get(routes[__ITER % routes.length]);
  check(res, { 'status 200': (r) => r.status === 200 });
}
```

| 항목 | 값 | 근거 |
|---|---|---|
| 최대 VU | 3 | 개인 블로그의 실제 트래픽 규모를 넘지 않는 보수적 값 |
| 총 시간 | 2분 | 공개 서비스에 미치는 영향을 제한 |
| 대상 경로 | `/`, 글 하나, `/writing/tags` | 기존 헬스 체크 H1·H2·H3과 같은 표면 |
| 임계값 | 실패율 < 1%, p95 < 2초 | 기존 단일 요청 공개 지연 0.9–1.2초의 약 2배.headroom |
| 중단 조건 | 5xx 연속, p95 > 2초 지속, H1 실패 | `runbooks.md` RB-1 |

## 4. 기준선과 비교 방법

- **새 기준선(Q2 B)**: 실제 볼트 빌드 156소스·260페이지·35.18초. 향후 같은 입력 집합에서 회귀 여부를 판정합니다.
- **픽스처 기준선**: 19소스·2.99초 — 입력이 달라 직접 비교하지 않고 역사적 기록으로 남깁니다.
- **응답 기준**: 이번 라이브 측정(공개 `/` 0.908 s, 글 1.193 s, `/writing/tags` 0.939 s)을 단일 요청 기준선으로 삼고, 부하 시 p95를 비교합니다.

## 5. 실행 후 절차

1. k6 요약(실패율, p95, 요청 수)을 이 문서에 덧붙입니다.
2. 임계값 위반 시 원인을 오리진(`127.0.0.1:8080` 직접 측정 0.002 s)과 터널·네트워크로 나눠 봅니다.
3. 장애 징후가 있으면 부하를 중단하고 `runbooks.md`를 따릅니다.
4. 결과는 `feedback-optimization` 단계의 입력으로 넘깁니다.
