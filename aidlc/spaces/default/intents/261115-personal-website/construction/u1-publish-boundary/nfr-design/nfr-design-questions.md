# NFR Design Questions — U1 `u1-publish-boundary`

Settled, not asked again:

- **Not applicable here:** there are no runtime services, caches, queues, credentials or network paths. Hosting and deploy are unchanged.
- **Read boundary:** the run reads only NOTES and PAGES. The image lookup stops at the source root, an image whose real path lies outside its source folder is treated as missing, and overlapping NOTES and PAGES stop with exit 2 (NFR5.1–NFR5.4).
- **Symbolic links:** links are never followed out of the boundary (NFR Q2). The NFR review found that a linked `.md` file is read and stamped today. Skipping every linked entry in both scanning and stamping is what that answer requires, so the only open choice is Q4 below.
- **Fail-closed order:** all checks run before stamping or writing, and write failures behave as today (functional design BR2.7, BR4.1, BR5.7).
- **Run output:** one summary line, three fixed notice texts, coded diagnostics, and exit codes 0/1/2 (NFR4.4, NFR5.15–NFR5.17).
- **Performance targets:** 1.5 × for stamping runs and 1.1 × for non-stamping runs, measured against `develop` before U1 (NFR6.3–NFR6.5).
- **Posts and hubs:** the site data layer exposes ordinary posts and hubs separately (carried into the Code Generation plan).

## Q1. [Architect] Can the output folder overlap the vault folders?

The writer deletes `posts/`, `meta/`, `assets/`, `pages/` and `homepage/` under OUTPUT before it writes. If OUTPUT were a vault folder, or a parent of one, the clean could delete notes. On case-insensitive APFS, `content/pages` and `Areas/Pages` differ only in case.

A. Stop with exit 2, before reading or stamping, when OUTPUT equals NOTES or PAGES, contains either, or lies inside either. Comparisons use whole path components and are case-insensitive. (Recommended: the only step that deletes files gets its own guard.)
B. No guard; rely on correct wiring.
X. Other (please specify)

[Answer]: A

## Q2. [Developer] What counts as an "empty" pages folder?

macOS usually leaves a `.DS_Store` in folders, and the owner may keep only a `Drafts/` folder there at first.

A. "Empty" means no publishable note: no `.md` file is left after the skip rules (dot entries, `Drafts`, linked entries). A folder holding only `.DS_Store`, `Drafts/` or images prints the "is empty" notice. (Recommended: matches what the owner sees, which is zero site pages.)
B. "Empty" means the folder has no entries at all; anything else prints nothing.
X. Other (please specify)

[Answer]: A

## Q3. [Architect] What happens when a site-page image and a post image share a file name?

All images are copied into one flat `assets/` folder, and the first copy wins. A site page and a post that use different images with the same name (`photo.png`) would make one of them silently show the other's image.

A. Copy site-page images to `assets/pages/<name>`. Post images stay where they are, so post URLs don't change and a page image can never shadow a post image. (Recommended: isolates the new namespace with no effect on existing posts.)
B. Stop the run with a new coded error when two different files share a name. This could start failing the nightly run on clashes between existing post images.
C. Keep the flat folder and accept the risk.
X. Other (please specify)

[Answer]: A

## Q4. [DevSecOps] How visible are skipped symbolic links?

Every linked file or folder inside NOTES and PAGES will be skipped by the scan and by stamping.

A. Print one `warning: skipped symbolic link <path>` line per link on stderr. The run continues. (Recommended: a note that silently vanishes from the site is what the owner would least expect.)
B. Skip them silently.
X. Other (please specify)

[Answer]: A

## Q5. [Developer] Should plain read errors get codes?

A note that is not valid UTF-8, or a folder that cannot be read, stops the run today with exit 1 and an uncoded message. The NFR review pointed out that NFR5.12 says "every failure is coded".

A. Keep today's uncoded I/O errors (exit 1, path in the message) and narrow NFR5.12 to the U1 failure paths: PUB codes, usage errors and write failures. (Recommended: new codes for old I/O paths are out of scope, and they already fail closed.)
B. Add a new coded diagnostic for unreadable notes and folders.
X. Other (please specify)

[Answer]: A

## Q6. [Quality] How are the baselines measured?

The performance budgets (NFR6.3–NFR6.5) and the homepage weight (NFR1.4) need a "before" number that does not exist yet.

A. A one-off procedure, recorded in Build and Test:
   - build the release binary at the pre-U1 `develop` commit and at the U1 commit;
   - write output to a temporary folder;
   - run once to warm the cache and discard that run;
   - take the median of 3 runs, both commits on the same day, on the same machine, with the same diagram tools;
   - for the homepage weight, record the bytes transferred for `/` from a pre-U1 fixture build.

   (Recommended: reproducible enough for ratio targets, with no new tooling.)
B. Add a permanent `just bench` recipe that runs this procedure.
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Output guard: exit 2 before any read or stamp when OUTPUT equals, contains or lies inside NOTES or PAGES; whole path components, case-insensitive (Q1)
- Empty pages folder: no publishable `.md` left after the skip rules (dot entries, `Drafts`, links); a folder with only `.DS_Store`, `Drafts/` or images prints the "is empty" notice (Q2)
- Site-page images go to `assets/pages/<name>`; post images stay in `assets/` unchanged, so the two can never shadow each other (Q3)
- Every symbolic link inside NOTES and PAGES is skipped by scan and stamping, with one `warning: skipped symbolic link <path>` line each; the run continues (Q4)
- Plain read errors stay uncoded (exit 1, path in message); the "every failure is coded" requirement covers PUB codes, usage errors and write failures only (Q5)
- Baselines: one-off procedure in Build and Test — release binaries at pre-U1 `develop` and U1, output to a temp folder, one discarded warm-up, median of 3, same day, machine and diagram tools; plus the transferred bytes of `/` from a pre-U1 fixture build (Q6)
- Settled: read boundary, fail-closed order, run output and exit codes, performance ratios, posts/hubs split carried into the Code Generation plan

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
