# NFR Requirements Questions — U1 `u1-publish-boundary`

Settled, not asked again:

- **Accessibility and privacy for `/`:** axe WCAG 2.2 AA scans at 320, 768, 1024 and 1440 px in light and dark, plus the reduced-motion check. No other origin is requested, the page works without JavaScript, and controls are at least 44 × 44 px (NFR1–NFR3, NFR7).
- **Determinism and fail-closed behaviour:** identical input gives byte-identical `pages/` output and manifest. A coded error stops the run before stamping or writing. Write failures behave as they do today (NFR4, NFR5; functional design BR2.7, BR4.1, BR5.6, BR5.7).
- **Read boundary:** the run reads only NOTES and PAGES. Image lookup is bounded, and overlapping folders give exit 2 (BR1.1, BR1.2, BR1.6).
- **Existing suites:** they stay green on every merge, test-first (NFR6).
- **Operations:**
  - Hosting, the nightly Jenkins schedule, rsync deploy and rollback by revert are unchanged (team Deployment).
  - The missing-pages-folder notice goes to stderr and shows in the Jenkins console (functional design Q8).
  - An empty pages folder also prints the notice, as FR1.5 says (owner, after the functional-design review).

## Q1. [Architect] How much slower may the publishing step get?

Check-then-stamp scans and classifies everything twice on stamping runs, including the batched `git log` for `updated` dates. Site pages add their own transforms. No timing baseline is recorded today.

A. A stamping run on the real vault may take at most 1.5 × the time of the same run on `develop` before U1, measured once on the owner's machine and recorded in Build and Test. A run without stamping may take at most 1.1 × the old time. (Recommended: relative targets need no fixed hardware number, and the nightly job has no tight time limit.)
B. A fixed ceiling: the nightly Preprocess stage finishes within 5 minutes.
C. No performance target; correctness only.
X. Other (please specify)

[Answer]: A

## Q2. [DevSecOps] What happens with symbolic links inside the two folders?

Today the scan does not follow symbolic links, so a linked folder is skipped and a linked `.md` file is not read. The image lookup copies whatever file it finds at `attachment/<name>`, including a symbolic link that points outside the vault.

A. Never follow a link out of the boundary. The scan keeps not following links. The image lookup refuses an image whose real path lies outside its source folder, gives the same warning as a missing image, and copies nothing. (Recommended: completes the read boundary of AC1.1.4.)
B. Follow symbolic links everywhere and trust the vault.
X. Other (please specify)

[Answer]: A

## Q3. [Operations] Should each run say what it published?

Today a successful run prints only warnings. With site pages added, the Jenkins console never shows how many pages went out.

A. End every successful run with one summary line on stdout: `published <N> posts, <M> site pages, <K> assets`. Jenkins shows it in the Preprocess log, and tests can assert it. (Recommended: one line, deterministic, and it makes a missing or empty pages folder visible beside the notice.)
B. No summary line; the notice is enough.
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Performance: measure once on the owner's machine against `develop` before U1; a stamping run on the real vault may take at most 1.5 × that baseline and a non-stamping run at most 1.1 ×; the baseline and the U1 numbers are recorded in Build and Test (Q1)
- Security: never follow a symbolic link out of the two folders; the scan keeps not following links, and an image whose real path lies outside its source folder is treated as missing (warning, nothing copied) (Q2)
- Observability: every successful run ends with one stdout line `published <N> posts, <M> site pages, <K> assets`; the pages-folder notice (missing, omitted or empty) stays on stderr (Q3)
- Settled: accessibility and privacy for `/` (axe at 4 widths, light/dark, reduced motion, no other origin, works without JavaScript, 44 × 44 px), determinism, fail-closed checks before stamping or writing, unchanged write failures, read boundary, existing suites green, unchanged hosting and deploy, no new runtime dependency

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
