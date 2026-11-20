# Reliability Requirements — U1 `u1-publish-boundary`

Upstream: `inception/requirements-analysis/requirements.md` (NFR4, NFR5, NFR6; FR1.5, FR2.1); `construction/u1-publish-boundary/functional-design/functional-spec.md` (run lifecycle), `rules.md` (BR1.3, BR2.7, BR4.1, BR5.1, BR5.7); team Deployment practices.

## Context

Pushing `develop` is the release: the nightly Jenkins job (Verify → Preprocess → Build → Deploy) publishes it. There is no staging, and rollback is a revert on `develop` plus a rebuild. U1's reliability goals are that the nightly run does not start failing for reasons the owner did not cause, and that every failure is loud, coded and leaves the vault intact.

## Requirements

| ID | Requirement | Target | Verification | Source |
|---|---|---|---|---|
| NFR5.10 | A missing, omitted or empty `Areas/Pages` never fails the run. It produces zero site pages and one notice on stderr. | 0 failures caused by the pages folder's absence | CLI tests for the three cases; first nightly run after merge, before `Areas/Pages` exists | FR1.5, BR1.3 |
| NFR5.11 | A vault with no `visibility: homepage` note publishes successfully (PUB002 retired). | — | Rust test | FR2.1, AC2.1.1 |
| NFR5.12 | Every failure is fail-closed and coded: exit 1 for PUB codes and write/diagram failures, exit 2 for usage errors. A coded catalog failure writes nothing to `content/` and changes no vault file. | 100 % of the new failure paths covered by a test asserting exit code, message and unchanged files | Rust CLI and catalog tests | NFR5, BR2.7, BR4.1 |
| NFR5.13 | The existing write-failure behaviour is kept. PUB007 may leave partial output; a diagram failure exits 1 with full output. In both cases the nightly job stops before Deploy, so the live site keeps the previous build. | unchanged | existing PUB007 test kept; Jenkins stage order unchanged | BR5.7 |
| NFR5.14 | A stale `content/homepage/` from an earlier run is removed by the clean, so local and CI trees converge without manual steps. | — | Rust output test seeds `homepage/` and asserts its removal | BR5.1 |
| NFR6.1 | The Verify stage stays the production gate. It runs the fixture pair (`fixtures/vault/Notes`, `fixtures/vault/Pages`) and no longer materialises or checks a homepage artifact, so it cannot pass with stale homepage fixtures. | Verify green on the U1 merge commit | Jenkins run on `develop` after merge | NFR6, BR7.1, BR7.2 |
| NFR6.2 | Every existing suite stays green on the U1 merge: `cargo fmt --check`, `cargo test --release`, `npm run test:unit`, `npm run test:pbt`, `npm run format:check`, `npx astro check`, the HIG Playwright suite and `just crossunit`. This is the recorded verification command. | all pass | verification command in Build and Test | NFR6, AC7.1.4 |
| NFR7.1 | Résumé and Portfolio are each one click from `/`. | 1 click | Playwright test | NFR7, AC3.2.1–AC3.2.2 |
| NFR7.2 | The homepage keeps a post list between the U1 and U2 merges ("오늘 발행된 글", from post metadata), so the live homepage never regresses to no list. | — | Vitest for the list function; Playwright on `/` | functional design Q9, BR6.5 |

## Recovery

- **Rollback:** revert the U1 merge on `develop` and rebuild (manual Jenkins run or `just deploy` with the owner's go-ahead). The vault needs no rollback: U1 never modifies it except for stamping posts, as before.
- **Release precondition:** the project rule on `Areas/Notes` is reworded by the owner before merge (follow-up F4).
- **Availability:** the static site's availability is unchanged by U1. Jenkins' post-deploy HTTP 200 check (follow-up F1) is out of scope.
