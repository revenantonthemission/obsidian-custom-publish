# Unit Test Instructions — post-deploy-runner

- **단계**: Code Generation (`code-generation`), `261121-post-deploy-runner`
- **전략**: express / Minimal — 요구사항별 단위 테스트 1개(컴포넌트당 happy-path), 기존 스위트 그린 유지
- **테스트 프레임워크**: Vitest(기존 `site/vitest.config.ts`, `tests/unit/**/*.test.ts`)

## 정확한 실행 명령

```
cd site && npx vitest run --config vitest.config.ts tests/unit/post-deploy-check.test.ts
```

이 명령은 첫 Red 단계 전에 실행 가능함을 확인한다. 범위는 이 파일 하나로 한정한다(전체 `npm test` 사용 금지).

## 테스트 파일

`site/tests/unit/post-deploy-check.test.ts` — 약 8개 테스트:

| 요구사항 | 테스트(해피 패스) |
|---|---|
| FR1.1 | `/` 요청이 200이면 H1 통과 |
| FR1.2 | 홈 HTML에서 첫 `/posts/...` 링크를 파싱해 H2 대상으로 사용 |
| FR1.3 | `/tags`가 301 + `no-cache` + 대상 200이면 H3 통과(재시도 포함) |
| FR1.4 | 로컬·공개 두 오리진 모두 결과를 반환 |
| FR1.5 | 결과 출력에 상태·시각·재시도 횟수가 포함되고 비밀이 없다 |
| FR2.1 | `--no-post-check`이면 검사와 복구 없이 종료 |
| FR3 | H1/H2 실패→T1(P1), H3 실패→T2(P2) 매핑 |
| FR3.4 | 되돌릴 커밋을 찾지 못하면 자동 재배포 없이 중단 |

## Red / Green / Refactor 기록

- **Red**: 각 테스트를 먼저 쓰고 위 명령의 실패 출력을 기록한다(테스트 파일만 추가된 상태에서 실행).
- **Green**: 실패를 통과시키는 최소 구현을 `site/scripts/post-deploy-check.mjs`에 추가한다.
- **Refactor**: 녹색을 유지하며 중복 제거·타임아웃 정리(NFR1 60초 이내), 로그 마스킹(NFR3).

## 모킹/스텁

- `fetch`는 주입 가능한 인자로 전달해 실제 네트워크 없이 테스트한다(테스트는 오프라인).
- `child_process`(git revert, just deploy) 역시 주입 가능한 실행기로 대체한다. 실제 revert/배포는 테스트에서 실행하지 않는다.
- 파일 시스템(`site/dist`)은 임시 디렉터리 또는 인메모리 HTML 문자열로 대체한다.

## 테스트 데이터

- 최소 HTML 픽스처: `<a href="/posts/sample">...` 한 줄짜리 홈페이지 문자열.
- 상태 헤더 픽스처: `{ status: 301, headers: { location: '/writing/tags', 'cache-control': 'no-cache' } }`.

## 커버리지

- 이 프로젝트에는 커버리지 최소 비율이 없다(보고만). `npm run test:coverage`는 전체 스위트에서 별도로 보고한다.
- 최소 기준은 "요구사항별 테스트 1개 + 컴포넌트당 happy-path 1개"이며, 전체 커버리지 숫자로 게이트하지 않는다.
- 기존 스위트(`npm run test:unit`, `npm run test:pbt`, `cargo test --release`)가 깨지지 않는지 Build and Test에서 확인한다.
