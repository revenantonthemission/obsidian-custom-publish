# Infra Engineer portfolio

The infrastructure engineering portfolio lives at `/portfolio/infra-engineer`, linked from the role navigation on every portfolio page. It is aimed at infrastructure, cloud operations and deployment-automation roles, with Korean case studies.

## Editorial direction

Lead with an operational problem, the intervention and what was actually verified. The introduction focuses on workload isolation, deployment validation, observability and recovery. The quiet technical layout uses the existing profile typography, project jump links and native disclosures. Two projects provide complementary evidence:

1. **DocSuri** — shared-resource contention, queue/worker isolation, deployment drift, index cutover and rollback, retries, cost controls, IAM and resource import, AWS-to-local migration, and environment-specific recovery checks.
2. **obsidian-custom-publish** — detecting renderer failure in CI, propagating a nonzero exit status, specifying browser dependencies, and verifying generated artifacts before deployment.

`site/src/lib/profile/portfolio-roles.ts` registers the route, introduction, focus labels and explicit project selection. The static page, canonical/social metadata and JSON-LD use the same selection. The infrastructure edition selects existing approved paragraphs by fact ID; source text, team attribution and evidence links are preserved.

## Evidence map

| Infrastructure topic | Selected source facts | Supporting material |
| --- | --- | --- |
| Contention and workload isolation | `project-docsuri-problem-backfill-contention`, `project-docsuri-key-decisions-0-text`, `project-docsuri-outcomes-0-text` | [Operations O1](../kakaopay-data-platform/evidence/operations.md#o1-대량-수집과-사용자-요청의-실행-경계를-분리하고-부하로-확인), linked search-recovery commit and worker PR |
| IaC versus actual runtime state | `project-docsuri-outcomes-runtime-diagnosis` | [Operations O2](../kakaopay-data-platform/evidence/operations.md#o2-큐-적체를-처리-코드가-아닌-실제-autoscaling-설정의-drift로-좁힘) |
| Deployment, retries and rollback | `project-docsuri-decision-index-cutover`, `project-docsuri-decision-retry-watermarks`, `project-docsuri-architecture-deployment-boundaries` | [Pipeline evidence](../kakaopay-data-platform/evidence/data-pipelines.md), [operations O7](../kakaopay-data-platform/evidence/operations.md#o7-iam기존-리소스도메인에서-생긴-배포-실패의-경계를-좁힘) |
| Cost controls | `project-docsuri-decision-cost-quotas` | [Operations O5](../kakaopay-data-platform/evidence/operations.md#o5-비용-상태를-실제-실행-제어에-연결하고-계측의-한계를-명시) |
| Migration, monitoring and recovery | `project-docsuri-architecture-local-runtime`, `project-docsuri-outcomes-recovery-checks` | [Operations O3–O6](../kakaopay-data-platform/evidence/operations.md) |
| CI/CD failure handling | `project-obsidian-custom-publish-problem-renderer-exit`, `project-obsidian-custom-publish-key-decisions-0-text`, both outcome paragraphs | [Renderer failure propagation commit](https://github.com/revenantonthemission/obsidian-custom-publish/commit/f82c9eb370f34470d0c930b9e89630f7fceb278e), repository `Jenkinsfile` and preprocessor tests |

The DocSuri role paragraph identifies the four-person team and the candidate's data-pipeline/infrastructure responsibilities. The AWS incident is dated July 2026; the August migration paragraph explicitly identifies the later single-host setup. The drift example is a diagnosis, not a claim that the backlog was drained. The recovery result distinguishes an AWS snapshot reaching `available` from local dump creation and a complete restore drill. Verification limits and outstanding data/access-control issues stay with the case study.

The role introduction and focus labels summarize these sources under the user's request for an Infra Engineer portfolio. They introduce no new metrics, employment titles, availability guarantees or cost-savings claims. The existing production fact inventory continues to supply the case studies.

## Verification — 2026-09-28

User journeys: choose the infrastructure edition from the portfolio navigation, inspect the two case studies and their source links, and read the same content on desktop/mobile with native disclosures and keyboard navigation.

- **RED:** `npx vitest run --config vitest.config.ts tests/unit/portfolio-roles.test.ts tests/unit/portfolio-role-metadata.test.ts` executed 24 tests before implementation. Nine failed because the new role was unregistered and therefore had no profile resource policy or metadata.
- **GREEN:** the same targets plus `tests/unit/profile-presentation.test.ts` passed all 35 tests after implementation, including an isolated Astro build. These check source-fact preservation, missing-source failures, recovery caveats, project order, canonical/social/JSON-LD agreement, local fonts and three-way role navigation.
- `npm run test:unit`: 300 tests in 22 files passed.
- `npm run test:pbt`: 37 properties in six files passed, 100 runs each, seed `1323604887`.
- `npx astro check`: 159 files, zero errors/warnings, six existing hints.
- `npm run build`: 253 pages built, including `/portfolio/infra-engineer`.
- `tests/e2e/portfolio-roles.spec.ts`: 12 Chromium tests passed using a temporary focused Playwright configuration and a loopback server for `site/dist`. Both role editions were checked at 375px/1280px, in light/dark themes and with disclosures closed/open. No axe violations, horizontal overflow, clipped content or page errors were found. Keyboard navigation, approved-fact equality and JavaScript-disabled navigation/disclosures passed.
- Desktop-light and mobile-dark infrastructure screenshots were visually inspected for hierarchy, wrapping and readable case-study content.

The focused browser command was `npx playwright test --config /var/folders/59/1zr18zjd30n_w8nnxdq2r_qm0000gn/T/opencode/infra-portfolio-playwright.config.mjs`. The temporary server used `127.0.0.1:4378` and was stopped by Playwright. Coverage percentage was not measured.
