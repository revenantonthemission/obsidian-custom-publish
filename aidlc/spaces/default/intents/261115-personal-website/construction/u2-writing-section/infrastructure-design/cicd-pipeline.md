# CI/CD Pipeline — U2 `u2-writing-section`

Upstream: `nfr-design/performance-design.md`, `security-design.md`, `logical-components.md`; `functional-design/functional-spec.md`; team Way of Working, Testing Posture and Deployment.

## 1. Delivery flow

1. **Branch.** U2 needs U1's code (`getOrdinaryPosts()`, the homepage opening).
   - **Merged U1:** if U1 has merged into `develop` (after the owner rewords the `Areas/Notes` project rule), U2 branches off `develop` as `feature/u2-writing-section`.
   - **Unmerged U1:** if U1 has not merged, U2 branches off `feature/u1-publish-boundary` and merges only after U1.
   - The owner picks one at U2's Code Generation plan approval.
2. **Test-first commits.** Vitest and Playwright Red, then Green, then Refactor. Korean `<type>:` commit messages.
3. **Local gate.** Run the recorded verification command unchanged:
   ```
   (cd preprocessor && cargo fmt --check && cargo test --release) && just preprocess && (cd site && npm run test:unit && npm run test:pbt && npm run format:check && npx astro check && npx playwright test --config playwright.hig.config.ts) && just crossunit
   ```
   - The HIG suite now includes `hig-writing.spec.ts` and the extended `HIG_ROUTES`.
   - `just crossunit` covers `/writing` and `/writing/all` with JavaScript off. Its link sweep still allows exactly the one declared broken fixture link.
4. **Merge.** `git merge --no-ff` into `develop`, then push. The branch is deleted.
5. **Release.** The next nightly run publishes U2.

## 2. Jenkins

No stage changes.

- **Verify:** `npm run test:unit` and `npm run test:pbt` include the new list tests. They inject dates and never depend on the build day.
- **Build Site:** builds the new routes.
- **Deploy:** rsyncs them like every other route.

## 3. Test automation integration

| Suite | Runs in | U2 coverage |
|---|---|---|
| Vitest unit | local gate, Jenkins Verify | list rules BR1.1–BR1.7, Korean date, `WR001` |
| Vitest property | local gate, Jenkins Verify | exactly-once membership, total order, week bounds, frozen output |
| Playwright HIG | local gate | page structure and states for `/`, `/writing` and `/writing/all`; axe matrix; sticky header and focus visibility; same-origin requests; NFR8 equality |
| crossunit | local gate | JavaScript-off checks on the three pages |

## 4. Deployment and rollback

- **Deployment:** all-at-once nightly publish.
- **Rollback:** revert the U2 merge on `develop` and rebuild. The routes `/writing` and `/writing/all` disappear, which also removes the homepage's "모든 글 보기" target, so U1's interim list returns with the revert.
- **Ordering constraint:** U3 and U4 depend on U2's routes. A revert of U2 after they merge must also revert them, or their links break; the link sweep catches this.

## 5. Secrets

None.
