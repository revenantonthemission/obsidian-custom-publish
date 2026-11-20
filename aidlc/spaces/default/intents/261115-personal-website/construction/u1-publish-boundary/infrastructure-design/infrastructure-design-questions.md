# Infrastructure Design Questions — U1 `u1-publish-boundary`

Settled, not asked again:

- **No new infrastructure.** U1 changes no host, service, port, launchd job, tunnel, DNS or web root. It adds no secret, cloud resource or new dependency. The static server is untouched; U3 owns its change.
- **Deployment model.** The nightly Jenkins job `obsidian-blog-develop` builds `origin/develop` (Install → Verify → Preprocess → Build Site → Deploy). Deploy rsyncs `site/dist/` into `~/Sites/obsidian-blog`. Rollback is a revert on `develop` followed by a rebuild (team Deployment).
- **Pipeline wiring** (functional design Q8):
  - Jenkins gets `PAGES_PATH = env.OBSIDIAN_PAGES_PATH ?: …/Areas/Pages` and passes `--pages "$PAGES_PATH"` in Preprocess. Verify uses `fixtures/vault/Notes` and `--pages fixtures/vault/Pages` and no longer materialises a homepage artifact.
  - The Justfile gets `vault` (default `./fixtures/vault/Notes`), `pages` and `publish_pages`.
  - The HIG `build-and-serve.mjs` passes the fixture pair.
- **Monitoring.** It stays the Jenkins console plus the build status: summary line, notices, warnings and coded diagnostics. There is no metrics backend (NFR design observability).
- **Out of scope.** The Jenkins post-deploy HTTP 200 check (follow-up F1).
- **Release precondition.** The owner rewords the `Areas/Notes` project rule before U1 merges (follow-up F4).

## Q1. [Pipeline] When is `Areas/Pages` created in the real vault?

The folder does not exist yet. The new binary treats a missing folder as harmless and prints a notice. The old binary never looks at it.

A. After U1's first green nightly run. That run's Preprocess log should show the "not found" notice and `published <N> posts, 0 site pages, …`, which proves the new wiring. The owner then creates the folder (empty or with drafts only), and the next run shows the "is empty" notice. (Recommended: each nightly run checks one step of the rollout.)
B. Before U1 merges, so the first U1 run already sees the folder.
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- No new infrastructure: hosts, services, ports, launchd jobs, tunnel, DNS, web root, secrets and dependencies unchanged; the static server is untouched (settled)
- Pipeline: Jenkins `PAGES_PATH` from `OBSIDIAN_PAGES_PATH` (default `…/Areas/Pages`) passed with `--pages` in Preprocess; Verify on `fixtures/vault/Notes` + `fixtures/vault/Pages` without homepage materialisation; Justfile `vault`, `pages`, `publish_pages`; HIG script on the fixture pair (settled)
- Monitoring stays the Jenkins console and build status; deploy, rollback and the F4 merge precondition unchanged (settled)
- Rollout: `Areas/Pages` is created after U1's first green nightly run, whose log must show the "not found" notice and `0 site pages`; the following run must show the "is empty" notice (Q1)

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
