# Performance Requirements — U4 `u4-navigation`

Upstream: `inception/requirements-analysis/requirements.md` (NFR1, NFR4, NFR6); `construction/u4-navigation/functional-design/functional-spec.md`, `rules.md` (BR1.1–BR1.5, BR2.1, BR2.2); `inception/contract-design/contract-summary.md` (C3); codekb `technology-stack.md`.

U4 changes chrome only. Nothing runs at request time: the bar and the sheet are static HTML built nightly, one item replaces four, and the marker is computed once per page at build time. The performance concerns are build cost, markup weight, and determinism.

## Requirements

| ID | Requirement | Target | Measurement | Source |
|---|---|---|---|---|
| NFR4.8 | The primary model, the marker and the per-page states are pure and deterministic: the same pathname always yields the same one state, no file, clock, environment, DOM or locale is read, and the model, states and items are frozen | 0 I/O reads; repeated calls return equal frozen values; at most one item marked | Vitest `tests/unit/profile-metadata-navigation.test.ts`; U1-P10 property updated to the one-item model | NFR4, BR1.2, BR1.4 |
| NFR6.11 | The chrome costs no more than after U2: no new island, script, stylesheet, font or image; `/` and `/writing` do not gain markup | 0 new files and 0 new script requests; `/` and `/writing` HTML ≤ the U2 after-measurement (U4 removes three links and adds one) | HIG request log on `/` and `/writing`; build output size diff against the U2 baseline | NFR1, NFR6, BR2.3 |
| NFR1.14 | The current marker adds no motion: the existing indicator is reused, no transform or opacity animation is added to the bar or the sheet, and the build stays flat | no animation on the marked link; `npx astro build` on fixture content within 5 % of the U2 merge | CSS review plus the reduced-motion Playwright check; Build and Test timing | team web rules, NFR6 |
