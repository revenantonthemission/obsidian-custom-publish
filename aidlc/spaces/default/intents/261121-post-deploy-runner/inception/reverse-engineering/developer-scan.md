## Developer Code Scan Results

이번 링크는 `post-deploy-runner` 인텐트의 집중 스캔이다. 스냅샷에 고정된 경로만 깊게 읽었고, 코드의 정적 독해만 수행했다(테스트·빌드·프로그램 실행 없음). 저장소 판정은 UNVERIFIED이므로 기존 코드 KB의 범위 밖 prose는 보존하되, 이전에 깊게 분석됐던 경로는 재검증되지 않았다는 뜻으로 `shallow`로 강등했다. 전체 기계 판독 목록은 `reverse-engineering-timestamp.md`의 `## Scope of Analysis` 블록에 한 번만 기록했다.

### Scan Coverage

- **Analyzed deeply** (스냅샷 고정 경로, 모두 파일 도구로 직접 독해):
  - `Jenkinsfile` (125줄 전체)
  - `Justfile` (56줄 전체)
  - `site/scripts/publish-dist.sh` (44줄 전체)
  - `site/scripts/crossunit/` (`link-sweep.mjs` 167줄, `ensure-fixture-content.mjs` 9줄, `known-broken-links.json` 7줄)
  - `site/scripts/hig/` (`build-and-serve.mjs` 85줄)
  - `site/package.json` (77줄 전체)
- **Skimmed only** (이전 저장소에서 깊게 읽혔으나 이번 스냅샷 범위 밖이라 재검증하지 않은 경로, 그리고 이전부터 얕게만 알려진 경로). 주요 그룹:
  - 전처리기 전반: `preprocessor/Cargo.toml`, `preprocessor/src/`, `preprocessor/tests/common/` (이전 deep → 금번 shallow)
  - 사이트 설정·소스: `site/astro.config.mjs`, `site/tsconfig*.json`, `site/vitest*.config.ts`, `site/playwright*.config.ts`, `site/.prettierrc`, `site/.prettierignore`, `site/.gitignore`, `site/src/pages/`, `site/src/layouts/`, `site/src/islands/`, `site/src/components/`, `site/src/lib/` (이전 deep → 금번 shallow)
  - 기타 이전 deep 경로: `CLAUDE.md`, `.gitignore`, `.mcp.json`, `site/scripts/local-server.mjs`, `site/scripts/profile/homepage-fixture-content.mjs`, `site/scripts/profile/accessibility-review-contract.mjs`
  - 이전부터 shallow: `fixtures/vault/`, `site/tests/`, `site/verification/`, `site/public/`, `site/src/styles/`, `site/src/scripts/`, `site/src/lib/profile/`, `site/src/components/profile/`, `site/scripts/profile/`, `site/package-lock.json`, `preprocessor/Cargo.lock`, `docs/`
  - 전체 경로 목록은 중복 없이 `reverse-engineering-timestamp.md`의 `shallow.paths`에만 수록했다.
- **Left out** (열지 않음 — 빌드 산출물·의존성·생성물 및 도구 설치/워크스페이스 디렉터리 일체):
  - `node_modules/`, `site/dist/`, `preprocessor/target/`, `content/`, `site/.astro/`, `site/.generated/`, `site/.artifacts/`, `output/`, `tmp/`
  - 프레임워크 설치·워크스페이스 디렉터리 일체는 스캔하지 않았고 문서에도 이름을 남기지 않았다.

### Packages Found

- `site` — Astro 정적 사이트(형식: npm 패키지) — TypeScript/JavaScript — `content/`를 빌드 시 읽어 `site/dist/`를 생성하고, 프로필 CLI의 닫힌 명령 집합을 노출한다.
- `obsidian-press` — 전처리기 크레이트 — Rust — 금번 스냅샷에서는 직접 읽지 않았다(이전 shallow 기록 참조).

### Build System

- **Type**: cargo(Rust 전처리기) + npm/npx(Astro 사이트) + just(로컬 오케스트레이션) + Jenkins(CI/야간 배포) + bash(배포 게시)
- **Config Files**: `Justfile`, `Jenkinsfile`, `site/package.json`, `site/scripts/publish-dist.sh`
- **Build Dependencies**: `Justfile` `deploy` → `deploy-preprocess` → `site-build` → `publish-dist.sh`; `Jenkinsfile` Verify→Preprocess→Build Site→Deploy(동일 스크립트 호출). `site/package.json`의 명령은 `scripts/profile/cli.mjs`로 위임되며, `crossunit`은 의도적으로 `site/package.json`이 아닌 `Justfile`에 있다(`Justfile:46-48`: review subject 보호).

### APIs Discovered

- 정적 HTTP 라우트와 빌드 산출물 계약은 기존 `api-documentation.md`에 이미 기록되어 있어 중복하지 않는다.
- 금번 새로 확인한 인터페이스: 배포 게시 계약 `publish-dist.sh <dist-dir> <web-root>` — 인자 2개 필수, `set -eu`, 사용법 오류 exit 2, `DIST`가 디렉터리가 아니면 exit 1(`site/scripts/publish-dist.sh:17-32`).
- 리다이렉트 테이블 계약: `site/dist/_redirects.json` → 웹 루트 `_redirects.json`; 임시 이름 `.redirects.json.tmp`로 복사 후 `mv -f`로 원자적 교체, 빌드에 테이블이 없으면 웹 루트에서 제거(`site/scripts/publish-dist.sh:34-44`).
- H3(/tags 301 + `Cache-Control: no-cache` + 대상 200)에 필요한 서버측 301/헤더 동작은 서버 파일이 스냅샷 범위 밖이라 이번에 검증하지 않았다.

### Frameworks & Libraries

- Astro `^7.4.1`, Preact `^10.29.0`, Vite `8.3.5`(pinned), Vitest `^4.1.10`, Playwright `1.61.1`(pinned), axe `4.12.1`(pinned), prettier `3.9.9`(pinned) — `site/package.json:23-76`에서 확인. 전체 버전 표와 외부 도구는 `technology-stack.md`에 이미 있다.
- 금번 추가 확인: `publish-dist.sh`는 `rsync`, `cp`, `mv`, `mkdir`만 사용하는 bash 스크립트(외부 npm 의존성 없음).

### Test Coverage

- **Test Directories**: 기존 기록(`site/tests/unit|pbt|e2e`, `preprocessor/tests/`)을 그대로 참조; 금번 스냅샷에서는 `site/scripts/crossunit/`과 `site/scripts/hig/`의 검증 스크립트만 직접 읽었다.
- **Test Frameworks**: `crossunit` = 정적 링크 스윕(브라우저/네트워크 없음, `node:fs`) + Playwright(JS off, 포트 4326); `hig` = 픽스처 전처리·빌드 후 프로덕션 정적 서버(127.0.0.1:4329)에서 axe/레이아웃 검사.
- **Coverage Config**: `npm run test:coverage`(v8, 임계값 없음)는 기존 기록 참조. 금번 스캔에서는 실행하지 않았다.

### Code Quality Indicators

- **Linting**: Prettier(`site/.prettierrc`)·`cargo fmt` 기존 기록 참조; 금번에는 실행하지 않음.
- **CI/CD**: `Jenkinsfile`(야간, cron `H 0 * * *`, `RUN_DEPLOY` 기본 true)과 `Justfile`의 두 배포 경로가 모두 `site/scripts/publish-dist.sh`로 수렴한다(`Jenkinsfile:107-118`, `Justfile:28-29`).
- **Documentation**: `publish-dist.sh:1-16`에 2-copy 배포의 순서와 이유(리다이렉트 테이블을 마지막에 원자적으로 교체해 규칙이 페이지보다 먼저 살아나지 않게 함)를 주석으로 상세히 기록. `link-sweep.mjs:1-11`과 `build-and-serve.mjs:1-12`도 목적·전제·복구 절차를 명시한다.
- **실행 검증 없음**: 정적 독해만 했으므로 테스트/빌드/린트 결과는 이번 링크에서 생성하지 않았다.

### Technical Debt Signals

- 배포 후 HTTP 상태 확인이 없다: `Jenkinsfile` `post.success`는 `echo 'Blog deployed successfully.'`만 출력하고, Deploy 스테이지는 `publish-dist.sh` 호출로 끝난다(`Jenkinsfile:116-124`). `Justfile` `deploy`도 게시 스크립트 호출이 마지막이다(`Justfile:29`). → H1/H2/H3 자동 확인이 신규 추가되어야 한다.
- `publish-dist.sh`의 리다이렉트 테이블 교체는 `mv -f` 직후 서버가 mtime/presence 변경을 감지해 재읽는다는 전제에 의존한다(`publish-dist.sh:10-14`). 즉시 검증 시 재읽기 지연 가능성이 있어 poll/wait 설계가 필요하다.
- `site/package.json`은 accessibility review subject이므로(`Justfile:46-48`) 여기에 명령을 추가하면 review record 다이제스트가 깨진다. 새 러너 명령은 `Justfile`/`site/scripts/`에 둬야 한다.
- `sync-public-assets.mjs`와 `redirect-table.mjs`가 두 배포 경로에서 참조되지만 스냅샷 범위 밖이라 이번에 재검증하지 않았다(폴더 목록으로 존재만 확인).
- 기존 `api-documentation.md`의 "There are no redirects anywhere today" 문장은 새 리다이렉트 테이블 도입 이후 부분적으로 stale하다; 스테이징 산출물에서 범위 내 주석으로 보완했다.

## Handoff Summary

- **Intent-relevant finding**: 두 배포 경로가 단 한 곳으로 수렴한다 — `Jenkinsfile:116`의 Deploy 스테이지와 `Justfile:29`의 `deploy` 레시피가 모두 `bash site/scripts/publish-dist.sh site/dist "${WEB_ROOT}"`를 호출한다. `publish-dist.sh:34-44`는 리다이렉트 테이블(`_redirects.json`)을 마지막에 원자적으로 교체하며, 스크립트 주석(`10-14`)은 서버가 presence/mtime 변경 시 테이블을 재읽는다고 명시한다. 즉 post-deploy 러너의 최적 삽입점은 이 단일 스크립트 호출 뒤이며, H3는 "301 + no-cache + 대상 200"이 리다이렉트 테이블과 서버 캐시 정책에 의해 만들어진다. 현재 배포 후 검사는 `Jenkinsfile:121-124`의 `echo` 한 줄뿐이라 H1/H2/H3 확인 로직은 전부 신규다.
- **Risks / follow-up**:
  1. 301/`Cache-Control: no-cache`를 실제로 emitting 하는 서버측 구현(`site/scripts/local-server.mjs`, `site/scripts/redirect-table.mjs`)은 스냅샷 범위 밖이라 미검증 — requirements 단계에서 H3 기대치를 확정하기 전에 별도 확인 필요.
  2. 리다이렉트 테이블 재읽기 타이밍(위 2번) 때문에 러너는 교체 직후 1회 요청으로 실패할 수 있음; 재시도/poll 전략 필요.
  3. rollback 트리거 T1/T2 연결 대상 `rollback-runbook.md`는 이전 인텐트 레코드(`261115-personal-website/operation/deployment-pipeline/`)에 존재함을 파일 목록으로만 확인했고 내용은 읽지 않음 — 요구사항 단계에서 트리거 정의를 다시 확인해야 함.
  4. 저장소가 UNVERIFIED이므로 기존 코드 KB의 깊은 분석 경로는 전부 shallow로 강등됨. requirements/code-generation 단계는 "재검증됨"으로 취급하지 말 것.
  5. `site/package.json` 변경 금지(review subject). 새 명령·스크립트는 `Justfile`과 `site/scripts/`에 배치할 것.
