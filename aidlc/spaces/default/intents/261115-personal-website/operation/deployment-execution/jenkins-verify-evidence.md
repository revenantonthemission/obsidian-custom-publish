# Jenkins Verify 증거 — `U1-NFR6.1`

- **확인 시각**: 2026-11-22 (야간 빌드 #42)
- **작업**: `obsidian-blog-develop` build **#42**
- **체크아웃 커밋**: `ad1586421ceba14a0c31e57942aba7b851c50dea` (`refs/remotes/origin/develop`) — 우리가 push한 최신 커밋
- **로그**: `/Users/revenantonthemission/.jenkins/jobs/obsidian-blog-develop/builds/42/log`
- **판정**: **Verify 단계 초록** → `U1-NFR6.1` 충족

## Verify 단계 실측

| 스위트 | 결과 |
|---|---|
| `cargo test --release` | 모든 테스트 `ok` (47 unit + 통합/프로퍼티 스위트, 실패 0) |
| `npm run test:unit` | 53 파일, **602 테스트 통과**, 실패 0 |
| `npm run test:pbt` | 6 파일, **36 테스트 통과**, 실패 0 |

## 범위와 주의

- 이 증거는 **Verify 단계**에 한정됩니다. 확인 시점에 빌드 #42는 아직 Preprocess 단계(Volta/chrome-headless-shell로 다이어그램 렌더링)를 진행 중이어서 전체 빌드의 최종 결과는 아직 확정되지 않았습니다.
- Deploy 단계에는 `node site/scripts/post-deploy-check.mjs`가 연결되어 있고, 해당 스크립트의 9개 단위 테스트도 Verify의 unit 스위트에 포함돼 통과했습니다.
- team 규칙대로 `origin/develop` push = 배포이며, 이 빌드가 그 첫 실행입니다.
