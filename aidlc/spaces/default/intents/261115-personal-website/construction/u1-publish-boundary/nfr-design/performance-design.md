# Performance Design — U1 `u1-publish-boundary`

Upstream: `nfr-requirements/performance-requirements.md` (NFR6.3–NFR6.6, NFR1.1–NFR1.4); `functional-design/functional-spec.md` (W1); answers in `nfr-design-questions.md` (Q6).

## 1. Where U1 adds cost

| Added work | Size | Design |
|---|---|---|
| Guard path resolution | 3 paths | constant; negligible |
| Scanning PAGES | ≤ 20 notes | same walker and parser as posts |
| Second scan and catalog on stamping runs | one full scan (file reads + batched `git log`) | **Skip it when stamping changed no file.** The stamper reports how many files it rewrote; with 0 the first scan's index is reused. Nightly runs usually stamp 0–2 notes. |
| PUB008 / PUB009 checks | one pass over sorted notes, one pass over bodies | see `scalability-design.md` |
| Site-page transform and write | ≤ 20 pages | same pipeline as posts; no diagrams today |
| Summary line | count of written files | counted while writing; no extra directory listing |

Removed work: the homepage artifact transform and write, the site's artifact reader, and the profile slot check.

## 2. Budgets and how they are met

| ID | Budget | Expected | Why |
|---|---|---|---|
| NFR6.4 | stamping run ≤ 1.5 × baseline | ≈ 1.0–1.3 × | a second scan happens only when a file was stamped; diagram rendering dominates and is unchanged |
| NFR6.5 | non-stamping run ≤ 1.1 × baseline | ≈ 1.0 × | no second scan; ≤ 20 extra notes |
| NFR6.6 | fixture runs keep test times | fixture grows by a few pages | no new diagrams in fixture pages |
| NFR1.4 | homepage bytes ≤ pre-U1 `/` | lower | the vault-note body and profile card markup go away; the opening adds three short text nodes and two links |

NFR6.6 pass/fail (the NFR review noted there are no test timeouts): the Rust and site suites each finish within 1.2 × their pre-U1 duration on the same machine. Both are recorded in the baseline procedure below.

## 3. Baseline procedure (NFR6.3, Q6)

Recorded once in Build and Test; no new tooling:

1. Build the release binary at the last `develop` commit before U1 and at the U1 branch head.
2. For each binary, on the same day, machine and diagram tools (Chrome / chrome-headless-shell path, `d2`, `typst` versions noted):
   - Write output to a fresh temporary folder (never `./content`).
   - Do one warm-up run and discard it.
   - Run 3 times without stamping (U1 with `--pages`); take the median.
   - Run 3 times with `--stamp-published` right after a normal nightly run, so there is nothing to stamp; take the median.
3. Time the Rust test suite and the site unit and property suites once each per commit.
4. Homepage weight: build the fixture site at both commits and record the bytes transferred for `/` (the existing HIG performance helper's request log).
5. Grade NFR6.4, NFR6.5, NFR6.6 and NFR1.4 Met or Not Met against these numbers; a miss is never relaxed.

## 4. Homepage (NFR1.1–NFR1.3)

The opening is server-rendered markup in the existing layout. It adds no island, font, image or stylesheet file; capsule styles reuse the existing tokens. The axe, heading and target-size checks are Playwright tests written before the change (see `reliability-design.md` §5 for the test list).
