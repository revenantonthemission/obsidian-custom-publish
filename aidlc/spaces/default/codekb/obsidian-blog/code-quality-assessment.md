# Code Quality Assessment

Static reading only; no test, build or lint was run in this scan.

## Summary

| Area | Rating | Evidence |
|---|---|---|
| Naming clarity | good | Descriptive names in both languages; diagnostic codes and requirement IDs in comments. |
| Function size | fair | Most preprocessor and site functions are short; `transform.rs` (1,027 lines) and several profile files over 1,000 lines. |
| Error handling | good | Coded fail-closed diagnostics (PUB001–PUB007, HP001–HP004, `PROFILE_APPROVAL_*`); diagram failures fail the run; Search/NavTree/GraphView show error states with retry. Weak spots: swallowed `git` errors, lenient post getters, warnings for slug collisions and missing attachments. |
| Test presence | good | 125 Rust tests incl. proptest; 36 Vitest files; property suites; 18 Playwright specs with axe; real fixture vault, no mocks. |
| Duplication | good | Shared regexes centralized; the ES5 appearance bootstrap and `appearance.ts` deliberately duplicate the same rules. |
| Dead code | fair | Stray `preprocessor/.astro/`; legacy wrappers `transform_content`/`transform_content_with_assets` kept as test oracles; tracked PDFs in `output/` and `tmp/`. |

## Tests

### Preprocessor
- 125 `#[test]` functions: 45 in-crate (`hub_dates.rs` 25, `transform.rs` 13, `syntax.rs` 4, `mermaid.rs` 3) and 80 in `preprocessor/tests/` (16 files).
- Property tests with proptest in `publication_catalog.rs`, `publication_transform.rs`, `publication_output.rs` (32 cases, NFR-U2-003) and `pbt_framework_smoke.rs`; one shrunk counterexample seed is kept in `publication_output.proptest-regressions`.
- Tests run against `../fixtures/vault` (cwd `preprocessor/`) or synthetic indexes from `tests/common/mod.rs`. Diagram tests inject `render_fn` closures instead of spawning CLIs; D2/Typst integration tests depend on installed tools.
- The diagram failure list is process-global; tests that assert on it look for their own uniquely named failure because tests run in parallel.

### Site
- Unit (Vitest, `tests/unit/`, 36 files; CLAUDE.md records 446 tests): rendering (captions, images, sections, extended syntax), homepage composition, HIG tokens/contrast, built HTML and built assets (isolated Astro builds serialized by a lock directory), search and keys, appearance, graph view, site identity, profile domain/validation/metadata/presentation/projections, résumé manifest/document/PDF/release store, process custody and retry hardening, declared dependencies, the obligation map (`tests/obligations/u1-profile.json`).
- Property (fast-check, `tests/pbt/`; CLAUDE.md records 37): U1 profile domain, presentation, metadata/navigation, résumé document, release state machine; U2 homepage composition. The custom runner validates seeds and focus before starting workers and always prints the seed.
- Browser (Playwright + axe): HIG suite over 14 routes (`HIG_ROUTES`) at several widths, light/dark, reduced motion, three engines; profile e2e suite (Chromium + focused Firefox/WebKit, evidence-sealed, needs the manual accessibility record); crossunit with JavaScript off; link sweep over `dist/`.
- Coverage: v8 over `src/**` and `scripts/**` via `npm run test:coverage`, reported to `.artifacts/coverage/`, no thresholds (team decision). Browser suites and spawned scripts are not counted.

### What the tests pin that the active intent will move
- `/tags`, `/tags/test`, `/graph` in `tests/e2e/support/hig.ts`, `crossunit.spec.ts`, `homepage.spec.ts`, `hig-pages.spec.ts`, `hig-chrome.spec.ts`, `hig-profile.spec.ts`.
- The primary navigation items (Tags first) in `tests/pbt/u1/profile-metadata-navigation.pbt.test.ts` and `tests/pbt/u1/arbitraries/metadata.ts`.
- Homepage artifact, profile slot and today-posts behaviour in `publication_catalog.rs`, `publication_output.rs`, `homepage-composition.test.ts`, `tests/pbt/u2/`, `homepage.spec.ts`.

## Formatting, Linting and Type Checking

- **Rust**: `cargo fmt --check` is the team rule (default rustfmt, edition 2024); no `rustfmt.toml`; no Clippy configuration (the April 2026 audit reports zero Clippy lints).
- **Site**: Prettier 3.9.9 with `prettier-plugin-astro` is configured (`.prettierrc`: 2 spaces, semicolons, single quotes, width 100, `trailingComma: es5`) with `format` and `format:check` scripts and a `.prettierignore` that protects `verification/`, résumé fixtures and the lockfile. The team's memory still says the site has no formatter yet; the repository shows otherwise.
- No ESLint or Stylelint.
- Type check: `npx astro check` (strict). CLAUDE.md notes spurious IDE JSX errors in islands; `astro build` is treated as the source of truth.

## CI/CD

- One pipeline: `Jenkinsfile`, nightly from `origin/develop`, with a validation-only mode (`RUN_DEPLOY` off).
- The Verify stage gates deployment with `cargo test --release`, `npm run test:unit` and `npm run test:pbt` (after a fixture preprocess and fixture homepage materialization).
- Not run in CI: `cargo fmt --check`, Clippy, `npm run format:check`, `npx astro check`, any Playwright suite, the link sweep, `npm run test:e2e`, `resume:pdf:verify`.
- No post-deploy smoke check in the Jenkinsfile, although the team's deployment practice describes an HTTP 200 check on `/` and one post after every deploy.
- No release tags or retained previous builds; rollback is a revert on `develop` plus a rebuild.

금번 스캔으로 확인한 CI/CD 보완(위 기록과 함께 읽을 것):

- Deploy 스테이지는 `bash site/scripts/publish-dist.sh site/dist "${WEB_ROOT}"` 한 줄로 끝나고, `post.success`는 `echo 'Blog deployed successfully.'`만 출력한다(`Jenkinsfile:107-124`). 위 "No post-deploy smoke check"는 현재도 정확하다. H1/H2/H3 정의는 `business-overview.md` 참조.
- 로컬 `just deploy`도 `deploy-preprocess` → `site-build` → 동일 스크립트 호출 순서이며(`Justfile:28-29`), 게시 후 검사는 없다. 즉 두 경로 모두에 동일한 사각지대가 있다.
- `publish-dist.sh`는 `set -eu`와 인자 검증(exit 2/1)을 갖추고, 리다이렉트 테이블을 마지막에 원자적으로 교체한다(`publish-dist.sh:17-44`). 게시 자체의 실패 전파는 적절하나, 게시 "이후"의 상태 확인은 없다.
- `crossunit`/`hig` 검증 스크립트는 fail-closed 패턴을 잘 따른다(`LINK001`, `hig: ...` + exit 1). 새 러너도 같은 오류 전파 스타일을 따르는 것이 적합하다.
- 금번 링크는 정적 독해만 수행했으므로 위 테스트 수치·커버리지·린트 결과를 새로 검증하지 않았다(이전 기록 보존값).

## Documentation

- `CLAUDE.md`: accurate, dense overview of architecture, commands, serving, gotchas and test commands. Stale detail: "Astro 6" (installed 7.4.1).
- `site/README.md` (Korean): documents the profile command surface, PBT replay, human gates and generated-output boundaries; its deploy boundary still mentions S3, CloudFront, Terraform and AWS, which were removed.
- Inline documentation is thorough: module docs in Rust, block comments in Astro/TS explaining why, with requirement and review-finding IDs.
- `docs/plans/` and `docs/superpowers/` keep the March–April 2026 designs; `docs/project/codebase_audit.md` (2026-04-14, score 9.5/10) predates the HIG redesign and the self-hosting move.

## Technical Debt

| # | Item | Location | Impact |
|---|---|---|---|
| 1 | Non-deterministic ordering of related posts on score ties and of backlinks | `related.rs` (`HashMap`), `linker.rs` (`HashSet`) | `meta/*.json` differs between runs; contradicts the deterministic-output rule. |
| 2 | `updated` likely always `null` in production | `scanner.rs` `git_last_modified_batch` (cwd repo, vault outside it) | "수정:" date never shows for real posts (inferred from static reading). |
| 3 | Vault stamping before validation, mtime-driven re-stamping, whole-file string replace | `scanner.rs` `stamp_published_dates` | A failed run still edits the vault; `published` moves on every edit; a body line `published: <date>` would be rewritten too. |
| 4 | Slug/name collisions only warn; single vault root | `scanner.rs` | Blocks a safe multi-folder (site pages) design until resolved. |
| 5 | Hard-coded Homebrew Cellar path for `mmdc` | `mermaid.rs` | Breaks silently after a Node upgrade if `which` fails. |
| 6 | Lenient post getters vs fail-closed homepage | `data.ts` | Missing `content/` builds an empty site without error. |
| 7 | `getPreviewSummary` reads the copied `public/previews.json` | `data.ts` | Summaries vanish when the copy step is skipped. |
| 8 | Hubs rendered at `/posts/<slug>` and `/hubs/<slug>` | `pages/posts/[slug].astro`, `pages/hubs/[slug].astro` | Duplicate pages; links disagree (`LocalGraph` uses `/hubs/`, others `/posts/`). |
| 9 | Dots in paths are treated as files; no redirects | `local-server.mjs` `rewriteUri` | A tag with `.` is unreachable; B4 redirects need a new mechanism. |
| 10 | Legacy recent-posts heading rule (h2) never matches the real vault (h3) | `homepage.ts` | The fallback placement is the de facto behaviour. |
| 11 | Files over 800 lines | profile domain and tooling (up to 3,412 lines), `transform.rs` | Harder review; against the team's web rule for new and changed code. |
| 12 | Committed non-source artefacts | `preprocessor/.astro/`, `tmp/pdfs/`, `output/pdf/` | Repository noise. |
| 13 | Stale docs | `site/README.md`, CLAUDE.md Astro version, team memory on Prettier | Misleads new work. |
| 14 | CI gaps | `Jenkinsfile` | Format, type check, browser and link checks rely on local discipline. |
| 15 | Trusted HTML | `PostLayout.astro`, `index.astro` `set:html` | Safe only while the vault is single-author. |

No TODO, FIXME or HACK markers and no lint suppressions were found in the source.
