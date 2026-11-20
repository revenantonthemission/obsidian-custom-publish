# Performance Requirements — U1 `u1-publish-boundary`

Upstream: `inception/requirements-analysis/requirements.md` (NFR1, NFR6); `construction/u1-publish-boundary/functional-design/functional-spec.md` (W1, check-then-stamp); codekb `technology-stack.md`; answers in `nfr-requirements-questions.md` (Q1).

## Context

The publishing step runs once a night in Jenkins and by hand through `just preprocess` and `just deploy`. Nothing in U1 serves requests at runtime: the homepage is a static file. Check-then-stamp (BR4.1) adds a second scan and catalog pass on stamping runs, including the batched `git log` that fills `updated`. Site pages add one transform per page.

No timing baseline exists today, so the targets are relative to a baseline measured once on the owner's machine (Q1).

## Requirements

| ID | Requirement | Target | Measurement | Source |
|---|---|---|---|---|
| NFR6.3 | Baseline | Wall-clock time of `obsidian-press` on the real `Areas/Notes` at the `develop` commit before U1, with and without `--stamp-published`, median of 3 runs, same machine, warm file cache | `/usr/bin/time` around the release binary; recorded in Build and Test | Q1 |
| NFR6.4 | Stamping-run budget | U1 stamping run with `--pages <Areas/Pages>` ≤ **1.5 ×** the baseline stamping run | same method, median of 3; on a run with nothing left to stamp, so the vault is unchanged | Q1 |
| NFR6.5 | Non-stamping-run budget | U1 run without stamping ≤ **1.1 ×** the baseline non-stamping run | same method, median of 3 | Q1 |
| NFR6.6 | Fixture run | The fixture run (`fixtures/vault/Notes`, `fixtures/vault/Pages`) stays fast enough that `cargo test --release` and the HIG suite gain no timeout changes | existing test timeouts unchanged | NFR6 |
| NFR1.4 | Homepage weight | The homepage opening adds no font, image, script or island. The page's transferred bytes do not exceed today's homepage (the removed vault-note body and profile slot outweigh the opening). | existing `hig-performance` checks and asset budget on `/` | NFR1, NFR2 |

## Homepage quality bar (user-facing)

| ID | Requirement | Target | Measurement | Source |
|---|---|---|---|---|
| NFR1.1 | `/` passes axe WCAG 2.2 AA scans | 0 violations at 320, 768, 1024 and 1440 px, light and dark, plus the reduced-motion check | new Playwright HIG checks for `/` | NFR1, AC3.1.3, AC7.1.1 |
| NFR1.2 | `/` has exactly one h1 ("Passion Project"), and each section has an h2 | exactly 1 h1 | Playwright DOM assertion | NFR1, AC3.1.1 |
| NFR1.3 | Résumé and Portfolio capsules are touch targets of at least 44 × 44 px | ≥ 44 × 44 px at every tested width | Playwright bounding-box check | NFR1, AC3.2.4 |

## Notes

- Measuring with stamping on the real vault writes dates only when notes need them. The measurement run therefore follows a normal nightly run, so stamping finds nothing to change.
- The ratio targets absorb machine differences. If a budget is missed, Build and Test grades it Not Met; it is not relaxed to pass.
- Diagram rendering (Puppeteer, D2, Typst) dominates run time and is unchanged by U1, unless a site page holds diagrams. None does today.
