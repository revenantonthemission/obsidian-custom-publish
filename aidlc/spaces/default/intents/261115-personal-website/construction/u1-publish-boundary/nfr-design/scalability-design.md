# Scalability Design — U1 `u1-publish-boundary`

Upstream: `nfr-requirements/scalability-requirements.md` (NFR4.5, NFR4.6, NFR6.7); `functional-design/rules.md` (BR1.7, BR2.4, BR2.6); answers in `nfr-design-questions.md` (Q3).

## 1. Scaling model

A single batch process on one machine; vault growth is the only dimension (≤ 2,000 notes, ≤ 20 pages over three years). Horizontal scaling, partitioning, queues and load balancing do not apply.

## 2. Linear checks (NFR4.5)

- **Slug clashes (PUB008).** Notes are already sorted by (slug, source, path). One pass groups equal slugs. A group containing a site page and more than one entry yields PUB008: the first site page in the group is `path`, and each other member is an `otherPath`. A group of posts only yields the existing warning. O(n) after the existing sort.
- **Site-page embeds (PUB009) and retired-note embeds (PUB004–PUB006).** Build one lookup set of site-page titles and the retired note's title. Then make one pass over each published body with the existing transclusion pattern, checking each match against the set. O(total body size); no per-pair comparison.
- **Guard.** Three paths; constant.

Pass/fail: a seeded property test generates up to 500 notes (random slugs, sources, embeds) and asserts the same findings as a brute-force reference implementation. The existing proptest case count is used, and the test runs within the suite's measured duration (`performance-design.md` NFR6.6).

## 3. Output layout (NFR4.6)

- `pages/<slug>.md` and `pages/<slug>.json`: one pair per page, flat.
- `assets/pages/<name>`: page images in their own namespace (Q3), flat, deduplicated by name within the namespace (same rule as posts: first copy wins, and the order is deterministic because pages are written in slug order).
- The manifest is sorted and unique; its size grows linearly.

## 4. Re-measurement (NFR6.7)

The ratio budgets are re-measured, never extrapolated, when the vault doubles from the size recorded in the Build and Test baseline. The record states the note count it was measured at.
