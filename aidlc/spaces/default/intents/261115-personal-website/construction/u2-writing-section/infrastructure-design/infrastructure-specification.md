# Infrastructure Specification — U2 `u2-writing-section`

Upstream: `nfr-design/performance-design.md`, `security-design.md`, `logical-components.md`; `inception/domain-design/components.md` (WritingPages, HomePage, NightlyPipeline); `functional-design/functional-spec.md`; `inception/contract-design/contract-summary.md` (C3).

U2 adds three statically built routes and no infrastructure.

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Compute | Unchanged: the nightly Jenkins job builds the static site on the owner's Mac | pages are static HTML |
| Routes | New `dist/writing/index.html` and `dist/writing/all/index.html`; `dist/index.html` changes | C3 |
| Serving | Unchanged `local-server.mjs` (launchd `dev.rvnnt.blog`) serves the new files; no server change or restart | static files only |
| Storage | No new storage; reads `content/meta` (U1) at build time | — |
| Environments | Production nightly only, plus local builds | team Deployment |
| Configuration | `HOMEPAGE_TODAY_OVERRIDE` is set only by the test runners (HIG `build-and-serve.mjs`, the Vitest helper). Jenkins and `just deploy` never set it, so production uses the real Korean date. | BR1.2 |
| IaC | Jenkinsfile and Justfile unchanged by U2 | — |
| Sizing | No new resources | performance design |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| Static server | web server | unchanged | the two new routes are directories with `index.html`, served as today |
| Jenkins | CI/CD | unchanged stages | Verify's `npm run test:unit` now also runs `writing-lists.test.ts`, which never reads the clock |

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| `content/meta` (C2) | U1 | U2 | read-only at build |
| `/writing`, `/writing/all` (C3) | U2 | U3 (capsule hrefs), U4 (navigation markers) | route paths fixed by C3 |
| `HIG_ROUTES` (test helper) | existing | U2, U3, U4 | each unit adds its routes |
| Fixture vault | U1 | U2 adds one undated post and one post in an earlier year | additive notes only |

## Change list outside the site source

| File | Change |
|---|---|
| `site/scripts/hig/build-and-serve.mjs` | set `HOMEPAGE_TODAY_OVERRIDE` to a fixed date inside a fixture week, so "이번 주 글" is not empty in the HIG build |
| `fixtures/vault/Notes/` | add an undated ordinary post (no `published:`), a post with a `published` date in an earlier year, and a post with `<b>` and `&` in its title |
| `site/tests/e2e/support/hig.ts` | add `/writing` and `/writing/all` to `HIG_ROUTES` with a route kind that falls under the 30 KiB (gzip) CSS budget |
