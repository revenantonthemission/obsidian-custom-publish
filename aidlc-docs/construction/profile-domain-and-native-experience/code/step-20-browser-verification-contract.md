# Step 20 Browser Verification Contract

Step 20 is not a free implementation. Step 19's `site/scripts/profile/verification-provider.mjs`
already pins the spec filenames, the completion matrix and the evidence schema, and enforces all
of them by machine comparison. Anything that does not satisfy the contract below fails closed with
`BROWSER_EVIDENCE_INCOMPLETE` at `verification.compose`.

This document is a read-only extraction of that contract, recorded so Step 20 can be executed
without re-deriving it from a 3,547-line module. The provider remains the normative source; if the
two ever disagree, the provider wins and this file is stale.

- Implementation worktree: `obsidian-blog-u1-nfr`, branch `codex/feature/resume-profile-experience`
- Extracted at: Step 19 close, 2026-07-25

## 1. Spec files

`REQUIRED_BROWSER_SPEC_FILES` (verification-provider.mjs:53-60). Exactly these six, in
`site/tests/e2e/`, compared with `isExactStringArray`:

| Spec | Engine project |
|---|---|
| `profile-routes.spec.ts` | chromium |
| `profile-responsive.spec.ts` | chromium |
| `profile-accessibility.spec.ts` | chromium |
| `profile-cross-browser.spec.ts` | firefox-focused, webkit-focused |
| `profile-print.spec.ts` | chromium |
| `profile-resources.spec.ts` | chromium |

`site/playwright.config.ts` fixes the harness: `testDir: './tests/e2e'`, `fullyParallel: false`,
`forbidOnly: true`, `retries: 0`, `workers: 1`, `reporter: [['list']]`, output under
`.artifacts/profile/verification/playwright`. `PROFILE_BASE_URL` is required and its hostname must
be `127.0.0.1` or `localhost`, so the suite only ever runs against the owned loopback preview. The
chromium project applies `testIgnore` to `profile-cross-browser.spec.ts`; the two focused projects
apply the matching `testMatch`.

## 2. Completion matrix — 48 keys

`createRequiredBrowserMatrix()`. Routes are `/resume` and `/portfolio`. The array is sorted and
compared for exact equality, so a missing, extra or misspelled key fails.

| Group | Key shape | Dimensions | Count |
|---|---|---|---|
| responsive | `responsive\|chromium\|{route}\|{viewport}` | viewport = 320x800, 479x900, 480x900, 767x1024, 768x1024, 1440x900, 390x844 | 7 × 2 = 14 |
| compatibility | `compatibility\|{engine}\|{route}\|{viewport}\|js-{state}` | engine = firefox, webkit · viewport = 320x800, 1280x800 · state = enabled, disabled | 2 × 2 × 2 × 2 = 16 |
| axe | `axe\|chromium\|{route}\|{viewport}\|{theme}\|{details}` | viewport = 320x800, 1440x900 · theme = light, dark · details = closed, all-open | 2 × 2 × 2 × 2 = 16 |
| print | `print\|chromium\|/resume\|A4` and `print\|chromium\|/resume\|Letter` | — | 2 |

**Total 48.**

Two design intentions are worth preserving. The `479x900`/`480x900` and `767x1024`/`768x1024` pairs
straddle the 480 and 768 CSS breakpoints, so each boundary is exercised on both sides rather than
sampled once; `390x844` is a real mobile device profile rather than a synthetic narrow viewport. The
compatibility group requires `js-disabled` on both non-Chromium engines, which asserts that the
routes remain complete static documents — U1 ships no hydrated component of its own.

## 3. Obligations — 10, every value exactly `pass`

`REQUIRED_BROWSER_OBLIGATIONS` (verification-provider.mjs:61-72), checked by `isPassMap`:

```
actual-route-readiness         responsive-boundaries
javascript-on-off              keyboard-and-focus
native-details                 axe-wcag-2.2-aa
overflow-clipping-truncation   print-contract
rendered-manifest              local-resource-policy
```

## 4. Browser evidence record

Written to the path injected as `PROFILE_BROWSER_EVIDENCE_PATH` (verification-provider.mjs:537).
`hasExactKeys` requires exactly these twelve keys — an extra key fails just as hard as a missing one.

```jsonc
{
  "schemaVersion": 1,                   // literal
  "group": "browser",                   // literal
  "result": "pass",                     // literal
  "buildId": "<must equal the clean build's id>",
  "reviewSubjectSchemaVersion": 1,      // ACCESSIBILITY_REVIEW_SUBJECT_SCHEMA_VERSION
  "reviewSubjectDigest": "<must equal the provider's computed digest>",
  "specFiles": [ /* the six above, exact */ ],
  "completedMatrix": [ /* the 48 keys above, sorted, exact */ ],
  "obligations": { /* the ten above, every value "pass" */ },
  "skippedReasons": [],                 // must be empty
  "summary": {
    "discovered": 6,                    // >= 6
    "passed": 6,                        // === discovered
    "failed": 0,
    "skipped": 0,
    "didNotRun": 0
  },
  "tools": {                            // all five present, each a non-empty string
    "axe": "…", "chromium": "…", "firefox": "…", "playwright": "…", "webkit": "…"
  }
}
```

`buildId` and `reviewSubjectDigest` are compared against values the provider computes itself, so the
suite must read them from its environment and record them verbatim rather than deriving them.

## 5. Adjacent evidence required by the same composition

- `REQUIRED_LINK_CHECKS` (73-79): `approved-url-mapping`, `external-url-human-evidence`,
  `internal-route-closure`, `json-ld-visible-fact-parity`, `metadata-visible-summary-parity`
- `PROFILE_CSS_LIMIT_BYTES` — unique profile CSS must stay at or under 24 KiB gzipped
- `REQUIRED_INHERITED_CLIENT_ENTRIES` — `node_modules/@astrojs/preact/dist/client.js`,
  `src/islands/Search.tsx`, `src/islands/ThemeToggle.tsx`. These are inherited; U1 must add no
  further hydrated entry.

## 6. PAUSE gate

`REQUIRED_MANUAL_CHECKS`: `colorIndependentMeaning`, `focusAppearance`, `focusObscuration`,
`readingOrder`.

`createRequiredManualMatrix()` — 12 keys:

- `/resume|chromium|{320x800,1440x900}|{light,dark}|{closed,all-open}` — 8
- `/portfolio|chromium|{320x800,1440x900}|{light,dark}|not-applicable` — 4

The reviewer's verdict, identity, timestamp and the exact review-subject digest are recorded in
`site/verification/profile/manual-web-accessibility.json`. A failing, missing or stale manual review
blocks PDF promotion; Step 20 does not close without it.

## 7. Execution order

1. Support modules — matrix key builder, evidence accumulator, theme and `details` helpers.
2. The six specs, each recording the matrix keys it owns.
3. A global teardown that merges all 48 keys and writes the evidence record.
4. `npm run test:e2e` until green.
5. **PAUSE** for the human accessibility review of the live routes.
6. Record the verdict in `manual-web-accessibility.json`.
7. Tick the seven Step 20 checkboxes and append the Step 20 evidence block to `aidlc-state.md`.

## 8. Starting state at Step 19 close

- 14 unit files / 130 tests; 4 PBT files / 26 properties × 100 at the default seed and at `1729`
- `npx astro check`: 0 errors, 6 inherited hints
- Playwright engines materialized locally: `chromium-1228`, `firefox-1532`, `webkit-2311`
- `npm run test:e2e` exits 1 with `Error: No tests found` — `site/tests/e2e/` is Step 20 scope
- PBT must be invoked through `npm run test:pbt`; `pbt-runner.mjs` injects `PBT_RUNS` and `PBT_SEED`,
  and a direct vitest invocation fails without them
