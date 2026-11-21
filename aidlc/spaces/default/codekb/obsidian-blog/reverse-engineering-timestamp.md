# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-21
- Commit: c637556ad51d4f69f7f93e85970e89b7948ee703
- Intent: post-deploy-runner
- Store generation (스냅샷): `sha256:66129e0f0ddf4f72015749a7d7fadd6de75bb76e6fc2e926fc84abe2dd8009b5`
- Source fingerprint (스냅샷): `git:e5f808bc3b3e2b2c93eb182e3524e91a959344dd`
- Run: express 범위 / Minimal depth의 집중 스캔. 개발자 링크가 스캔과 산출물 합성을 모두 수행했고, 파일 도구로 코드를 정적 독해했다. 테스트·빌드·프로그램 실행은 하지 않았다.
- Store 판정: UNVERIFIED(지문 계산 불가). 따라서 이전 저장소의 깊은 분석 경로는 전부 `shallow.paths`로 강등하고, 아래 `analyzed.paths`에는 이번 스냅샷 고정 경로만 기록했다. 범위 밖 기존 prose는 보존했다.
- Analyzed: `Jenkinsfile`, `Justfile`, `site/scripts/publish-dist.sh`, `site/scripts/crossunit/`, `site/scripts/hig/`, `site/package.json` (이 6경로만 심독).
- Handoff: 상세 스캔 결과는 인텐트 레코드의 `inception/reverse-engineering/developer-scan.md`에 있다.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: post-deploy-runner
fingerprint: e5f808bc3b3e2b2c93eb182e3524e91a959344dd
analyzed:
  paths:
    - Jenkinsfile
    - Justfile
    - site/scripts/publish-dist.sh
    - site/scripts/crossunit/
    - site/scripts/hig/
    - site/package.json
  components:
    - Build Orchestration
    - Nightly Pipeline
    - Publish-Dist Deploy Script
    - Cross-unit Gate
    - HIG Browser Harness
    - Site Command Surface
shallow:
  paths:
    - CLAUDE.md
    - .gitignore
    - .mcp.json
    - preprocessor/Cargo.toml
    - preprocessor/src/
    - site/astro.config.mjs
    - site/tsconfig.json
    - site/tsconfig.profile-tools.json
    - site/vitest.config.ts
    - site/vitest.pbt.config.ts
    - site/playwright.config.ts
    - site/playwright.crossunit.config.ts
    - site/playwright.hig.config.ts
    - site/.prettierrc
    - site/.prettierignore
    - site/.gitignore
    - site/src/pages/
    - site/src/layouts/
    - site/src/islands/
    - site/src/components/Header.astro
    - site/src/components/PostCard.astro
    - site/src/components/HubProgress.astro
    - site/src/components/HubNav.astro
    - site/src/components/OutlineTabs.astro
    - site/src/components/BacklinkList.astro
    - site/src/components/RelatedPosts.astro
    - site/src/components/GraphList.astro
    - site/src/components/TableOfContents.astro
    - site/src/lib/data.ts
    - site/src/lib/homepage.ts
    - site/src/lib/home-sections.ts
    - site/src/lib/navigation.ts
    - site/src/lib/render.ts
    - site/src/lib/search.ts
    - site/src/lib/site.ts
    - site/src/lib/types.ts
    - site/scripts/local-server.mjs
    - preprocessor/tests/
    - preprocessor/Cargo.lock
    - preprocessor/.astro/
    - fixtures/vault/
    - site/package-lock.json
    - site/src/lib/profile/
    - site/src/lib/layout/
    - site/src/components/profile/
    - site/src/lib/appearance.ts
    - site/src/lib/graphSim.ts
    - site/src/lib/graphUtils.ts
    - site/src/lib/icons.ts
    - site/src/lib/image-size.ts
    - site/src/lib/modal.ts
    - site/src/lib/search-keys.ts
    - site/src/lib/toc.ts
    - site/src/lib/shiki-themes/
    - site/src/scripts/
    - site/src/styles/
    - site/scripts/profile/
    - site/tests/
    - site/verification/
    - site/public/
    - site/README.md
    - site/.vscode/
    - docs/
```
