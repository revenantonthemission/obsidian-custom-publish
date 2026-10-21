# Integration Test Instructions: Résumé Certifications

Test strategy: Standard. The unit tests per component are listed in `construction/code-generation/unit-test-instructions.md`. The integration boundaries this change crosses are:

1. **Fact source → approval chain → build:** the r9 receipt, the E16 and E17 evidence, the pinned digests.
2. **Profile model → résumé manifest → PDF:** the schema-2 section order, day-precision dates, dotted text parity, and the paired label and destination of an evidence link.
3. **Built résumé page → browsers:** the 자격증 section, the verification link, and accessibility.

## Commands

| ID | Boundary | Command | Pass criterion |
|---|---|---|---|
| IT-1 | preprocessor and fixture vault (regression) | `cargo test --release --manifest-path preprocessor/Cargo.toml` | 0 failed (113) |
| IT-2 | profile model, approval chain, manifest, PDF evidence, site build | `cd site && npm run test:unit` | 0 failed |
| IT-3 | seeded properties, including date-precision generators | `cd site && npm run test:pbt` | 37 passed |
| IT-4 | built site in three browsers, including the profile spec's résumé-certification checks and axe | `cd site && npx playwright test --config playwright.hig.config.ts` | 0 failed. The 65 skips are engine-only. Any WebKit page-load timeout must pass when rerun alone, as it did in the baseline |
| IT-5 | link sweep and no-JavaScript checks | `just crossunit` | stops only on the fixture's deliberate `nonexistent-image.png`; the no-JS half passes on its own |
| IT-6 | profile evidence suite | `cd site && npm run test:e2e` | browser evidence passes, then the run stops at the manual review record, as expected until the maintainer redoes the 16-state review |
| IT-7 | types | `cd site && npx astro check` | 0 errors |
| IT-8 | PDF release state | `cd site && npm run resume:pdf:verify` | `RELEASE_STALE` is expected until promotion; any other error fails |

## Test Data

- **Fixture vault:** `fixtures/vault/`.
- **Profile facts:** the real `profile-data.ts`, gated by its receipt. No facts are mocked.
- **The r8 release record:** `site/verification/resume/current-release.json`, which must still read against the schema-1 order.
