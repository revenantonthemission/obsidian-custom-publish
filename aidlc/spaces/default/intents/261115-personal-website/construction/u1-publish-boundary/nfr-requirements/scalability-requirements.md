# Scalability Requirements — U1 `u1-publish-boundary`

Upstream: `inception/requirements-analysis/requirements.md` (NFR4); `construction/u1-publish-boundary/functional-design/functional-spec.md`, `rules.md` (BR1.7, BR2.4); codekb `technology-stack.md`.

## Context

The site is a personal blog built once a night by one process on one machine. There are no concurrent users of the publishing step and no runtime load from U1. "Scale" here means vault growth.

## Load projections

| Quantity | Today | Planning horizon (3 years) | Source |
|---|---|---|---|
| Notes in `Areas/Notes` | low hundreds | ≤ 2,000 | requirements open question (revisit `/writing/all` above ~500 posts) |
| Notes in `Areas/Pages` | 0 (folder not yet created) | ≤ 20 (About, Now, Contact, Projects) | backlog B5–B10 |
| Images per page | 0 | ≤ 10 | — |

## Requirements

| ID | Requirement | Target | Verification | Source |
|---|---|---|---|---|
| NFR4.5 | The new checks scale linearly with note count. Slug-clash detection (PUB008) and site-page embed detection (PUB009) are one pass over the sorted notes and one pass over the bodies. No pairwise comparison of all notes. | O(n) passes, plus the existing O(n log n) sort | design review in Code Generation; a property test with up to 500 generated notes completes within the existing PBT time limit | BR1.7, BR2.4, BR2.6 |
| NFR4.6 | The output stays flat and sorted as pages grow. `pages/` holds one `.md` and one `.json` per page, and the manifest is sorted. | — | output property test (determinism with shuffled input order) | NFR4, BR5.5 |
| NFR6.7 | The budgets in `performance-requirements.md` hold at the vault size of the day they are measured. They are re-measured, not extrapolated, if the vault doubles. | ratio budgets (NFR6.4, NFR6.5) | Build and Test record | Q1 |

## Not applicable

Horizontal scaling, autoscaling, caching tiers, queues and data partitioning do not apply. The publishing step is a single batch run, and the static server is unchanged by U1.
