# Security Requirements — U1 `u1-publish-boundary`

Upstream: `inception/requirements-analysis/requirements.md` (NFR2, NFR3, NFR5; FR1.1, FR1.4); `construction/u1-publish-boundary/functional-design/functional-spec.md`, `rules.md` (BR1.1–BR1.6, BR2.7, BR4.1–BR4.2); `inception/contract-design/contract-summary.md` (C1, C2); codekb `technology-stack.md`; answers in `nfr-requirements-questions.md` (Q2).

## Context and threat model

U1 has no authentication, accounts, secrets or user input at runtime. The site is static, and the publishing step runs locally and in Jenkins on the owner's machine. The assets to protect are:

| Asset | Why it matters | Threat |
|---|---|---|
| Private vault content (everything outside `Areas/Notes` and `Areas/Pages`) | journals, clippings and drafts must never reach the public site | a read outside the two folders: an unbounded image lookup, symlinks, or a mis-wired path |
| The vault files themselves | the owner's notes; iCloud-synced | a failed run that rewrites notes; stamping a site page |
| Visitors' privacy | no third party should see a visit | a new page that loads another origin |
| Integrity of published output | no content silently replaced or dropped | slug clashes, embeds of unpublished notes |

Out of scope: authentication, authorization, encryption at rest, network attacks on the static server (unchanged by U1), and supply-chain changes (U1 adds no dependency; see `tech-stack-decisions.md`).

## Requirements

| ID | Requirement | Verification | Source |
|---|---|---|---|
| NFR5.1 | The publishing step opens files for reading only under the canonical NOTES and PAGES folders. A sentinel `.md` file and image placed beside NOTES (in its parent folder) are never read, published or copied. | Rust integration test with a temp vault and sentinel files; assert absence from `content/` and the manifest | FR1.1, AC1.1.4, BR1.1 |
| NFR5.2 | The image lookup searches `attachment/<name>` from the note's folder up to and including its source root, and never above it. | Rust test: an image only in the vault root (above NOTES) is reported missing and not copied | BR1.6 |
| NFR5.3 | Symbolic links never lead out of the boundary. The scan does not follow linked folders or files, as today. An image whose real (resolved) path lies outside its source folder is treated as missing: same warning, nothing copied. | Rust test: `attachment/x.png` symlinked to a file outside the vault is not copied; a symlinked folder of notes inside PAGES is not scanned | Q2; AC1.1.4 |
| NFR5.4 | If NOTES and PAGES are the same folder or one contains the other, the run stops with exit 2 before any read or stamp. A `--pages` path that exists but is not a folder also stops with exit 2. | CLI test: exit code, stderr text, vault files byte-identical | BR1.2, BR1.3 |
| NFR5.5 | A run that ends in any coded error (PUB001, PUB003–PUB006, PUB008, PUB009) or a usage error leaves every vault file byte-identical, including on `--stamp-published` runs. | Rust test: a vault with a PUB008 clash and an unstamped post; run with stamping; hash every file before and after | NFR5, BR2.7, BR4.1 |
| NFR5.6 | Stamping never opens a file under PAGES for writing. | Rust test: a page without `published` is byte-identical after a stamping run | FR1.4, AC1.2.1, BR4.2 |
| NFR5.7 | Notes the catalog does not publish (the retired homepage note, `Drafts`, dot-entries) never appear in any output file. Their bodies may not leak through embeds (PUB004–PUB006); site-page bodies may not leak into posts (PUB009). | Rust tests over `content/`: grep for the retired note's unique marker text; PUB009 example | FR2.2, BR2.5, BR2.6 |
| NFR5.8 | A site page may not silently replace a post or another page: any slug clash involving a site page stops the run (PUB008). | Rust tests for page/post, page/page and page/retired note | FR1.6, BR2.4 |
| NFR2.1 | The new homepage opening requests nothing from another origin. Capsule links are same-origin relative paths, and no font, image or script is added. | Playwright request log on `/` (all origins = site origin) | NFR2, AC7.1.2 |
| NFR3.1 | The homepage opening and both capsules render and work with JavaScript off (plain anchors, no island). | Playwright JS-off test; `just crossunit` | NFR3, AC3.2.3 |
| NFR5.9 | Diagnostics and notices name only the paths the owner passed (NOTES, PAGES and files under them). They never print file contents or environment values. | Review of message formats in Code Generation; CLI tests assert exact text | team Code Style (coded diagnostics) |

## Pipeline wiring

- Jenkins reads `OBSIDIAN_PAGES_PATH` with an `Areas/Pages` default, alongside the existing `OBSIDIAN_VAULT_PATH`. Neither is a secret; no credential is added.
- The project rule "NEVER run the preprocessor against the whole vault" must be reworded by the owner to name both `Areas/Notes` and `Areas/Pages` before U1 merges (C1 open question; follow-up F4). NFR5.4 makes the mis-wiring this rule guards against fail loudly in the most likely case: `--pages` set to the vault root containing NOTES.

## Residual risks

| Risk | Likelihood | Handling |
|---|---|---|
| The owner places private notes inside `Areas/Pages` | low | Folder-first classification publishes them as site pages (no route this release). The owner controls the folder; documented in `CLAUDE.md`. |
| `--pages` points at an unrelated folder that does not overlap NOTES | low | Not detectable. The summary line (`<M> site pages`) makes an unexpected count visible in the Jenkins log. |
| Hard links to files outside the vault | very low | Not distinguishable from regular files; accepted. iCloud vaults do not create hard links. |
