# Functional Design Questions — U1 `u1-publish-boundary`

Settled earlier, not asked again:

- The CLI is `obsidian-press <NOTES> <OUTPUT> [--pages <PAGES>] [--stamp-published]`. Without `--pages`, or with a folder that does not exist, the run publishes zero site pages and prints one notice (contract C1; contract-design Q1).
- Classification is folder-first. Every note in the pages folder is a SitePage, and `visibility` is checked only for posts-folder notes. A posts-folder note marked `visibility: homepage` is the RetiredHomepage. More than one such note stays PUB003, and PUB002 is retired (C1; FR2.1).
- Embeds of the retired note keep PUB004–PUB006. Links to it, including heading links, go to `/` and add no graph edge or backlink (FR2.3; C2).
- A link to a site page renders as plain text and adds nothing to backlinks or the graph. Site pages never appear in `meta/`, `posts/`, the graph, search, previews, the nav tree, backlinks or related posts (C2).
- Site pages are written to `pages/<slug>.md` and `pages/<slug>.json` (`slug`, `title`), and the manifest lists them. No `homepage/` namespace remains (C2; FR2.4).
- The homepage opening uses the Profile Domain's homepage selection: the name and short introduction, not the headline. Below it come plain "Résumé" and "Portfolio" capsules (FR3.1–FR3.3).
- The site-side homepage artifact reader, HP001–HP004, the profile slot token and the fixture homepage materializer are removed together with their tests (FR2.4).

Code facts these questions rest on (codekb, re-checked 2026-11-16):

- Fixture notes sit directly in `fixtures/vault/`, and about 50 Rust tests in 13 files scan that folder.
- `find_attachment` walks up to 10 parent folders, past the notes root.
- Date stamping runs before every PUB check and rewrites vault files in place.
- PUB007 writes in place after cleaning, and a diagram failure exits 1 with full output on disk.
- A duplicate slug is only a warning today.
- In the real vault, images live only in `Areas/Notes/attachment/`.

## Q1. [Developer] Where do the fixture site pages live?

Contract C1 names `fixtures/vault/Notes` and `fixtures/vault/Pages`, but today the fixture notes sit directly in `fixtures/vault/`. These read that folder: about 50 Rust tests, the Justfile default, Jenkins Verify, the HIG `build-and-serve.mjs` and the crossunit scripts.

A. Keep `fixtures/vault/` as the posts folder and add a sibling `fixtures/pages/` for site pages. Correct C1's fixture caller line in the same merge. (Recommended: no existing test path changes, and the two folders stay separate as they are in production.)
B. Move the notes into `fixtures/vault/Notes/` and add `fixtures/vault/Pages/`, as C1 says. Every fixture path in the tests, scripts and Jenkins changes.
X. Other (please specify)

[Answer]: B

## Q2. [Developer] How far may the image lookup reach, and do site pages get images?

`find_attachment` climbs up to 10 parent folders, so it can read outside `Areas/Notes` (AC1.1.4). The real vault keeps images only in `Areas/Notes/attachment/`.

A. The lookup stops at the root of the note's own source folder: NOTES for posts, PAGES for site pages. Site-page images are copied to `assets/` like post images. An image found nowhere gives the same warning as today. (Recommended: closes the leak, and About and Now can show a photo later.)
B. The lookup is bounded the same way, but site-page images are not copied. They stay as warnings until site pages get routes.
C. Leave the lookup unbounded.
X. Other (please specify)

[Answer]: A

## Q3. [Architect] When does date stamping run relative to the checks?

Today `--stamp-published` rewrites vault notes before any PUB check. A run that then fails, for example on the new PUB008 clash, has already changed the vault (NFR5).

A. Check first: scan and classify both folders and run every PUB check. Only when that passes, stamp the posts folder, rescan and continue. A failing run never touches the vault. (Recommended: meets NFR5. The cost is a second scan, which is small.)
B. Keep today's order and accept that a failing run may already have stamped dates.
X. Other (please specify)

[Answer]: A

## Q4. [Architect] Does U1 change how write failures leave `content/`?

Today PUB007 writes in place after cleaning, so a failure partway through leaves partial output. A diagram failure exits 1 on purpose, with full output on disk. U1 adds the `pages/` namespace to the cleaned set.

A. Keep today's write behaviour. `pages/` joins the cleaned namespaces, and every new U1 check (PUB008 and the others below) runs before anything is written. (Recommended: the new failures are fail-closed, and changing the write strategy is out of this release's scope.)
B. Write into a staging folder and swap it in only on success, so a PUB007 failure leaves the old `content/` intact.
X. Other (please specify)

[Answer]: A

## Q5. [Developer] Which slug clashes stop the run?

FR1.6 makes a page/post clash an error. Today any duplicate slug only prints a warning, and the later note silently wins.

A. PUB008 covers every clash that involves a site page: page/post, page/page (same file name in two subfolders) and page/retired homepage note. The message names both files. Post/post clashes keep today's warning. (Recommended: no site page can silently replace anything, and post behaviour does not change.)
B. Only page/post clashes are PUB008. Every other clash stays a warning.
C. Every duplicate slug, post/post included, becomes PUB008.
X. Other (please specify)

[Answer]: A

## Q6. [Architect] What happens when a post embeds a site page (`![[About]]`)?

Links to site pages render as plain text (settled). An embed would copy a site page's body into a post.

A. Stop the run with a new coded error, PUB009 (`transclusion of site page`), for whole, heading and block embeds, the same way the retired note is handled. (Recommended: no site-page content leaks into posts, and no content silently disappears.)
B. Render the embed as plain text, like a link.
C. Embed the page body as if it were a post.
X. Other (please specify)

[Answer]: A

## Q7. [Developer] What if the pages folder and the posts folder overlap?

For example, `--pages` points at `Areas/Notes` itself or at a folder inside it, so the same notes would be read twice.

A. Stop before reading or stamping anything. Exit with a usage error (exit 2, like other command-line errors) that names both paths when the folders are the same or one contains the other. (Recommended: a wiring mistake in Jenkins or the Justfile fails loudly.)
B. Allow it. Notes under the pages folder count as site pages, and the posts scan skips them.
X. Other (please specify)

[Answer]: A

## Q8. [Developer] How are the pipeline variables named?

Jenkins has `VAULT_PATH = env.OBSIDIAN_VAULT_PATH ?: …/Areas/Notes`. The Justfile has `vault := env("VAULT_PATH", "./fixtures/vault")` and `publish_vault := env("VAULT_PATH", …/Areas/Notes)`.

A. Add a pages variable beside each existing one, and leave the posts variables as they are:
   - Jenkins: `PAGES_PATH = env.OBSIDIAN_PAGES_PATH ?: …/Areas/Pages`
   - Justfile: `vault := env("VAULT_PATH", "./fixtures/vault/Notes")` (default updated for Q1 B), `pages := env("PAGES_PATH", "./fixtures/vault/Pages")` and `publish_pages := env("PAGES_PATH", …/Areas/Pages)`

   Every preprocess call passes `--pages`. The missing-folder notice shows up in the Jenkins console. (Recommended: additive, and the names match C1.)
B. Replace both with one vault-root variable and derive `Areas/Notes` and `Areas/Pages` from it.
X. Other (please specify)

[Answer]: A

## Q9. [Product] What does the homepage show below the opening between the U1 and U2 merges?

U1 removes the homepage note and its artifact. The week list ("이번 주 글") arrives with U2. Each merge to `develop` deploys that night.

A. Keep today's "오늘 발행된 글" list, built from post metadata with no homepage artifact, until U2 replaces it with "이번 주 글". (Recommended: the live homepage never loses its post list between merges.)
B. Show only the opening until U2 lands.
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Fixtures mirror production: notes move into `fixtures/vault/Notes/` (with their `attachment/` folder), site pages go in `fixtures/vault/Pages/`; every fixture path in Rust tests, the Justfile, Jenkins Verify, the HIG and crossunit scripts follows, and C1 already names these paths (Q1)
- The image lookup never leaves the root of the note's own source folder (NOTES or PAGES); site-page images are copied to `assets/` like post images; a missing image keeps today's warning (Q2)
- Check before stamping: scan and classify both folders and run every PUB check first; only then stamp the posts folder, rescan and continue, so a failing run never modifies the vault (Q3)
- Write behaviour stays as it is (PUB007 in place, diagram failure after full output); `pages/` joins the cleaned namespaces; every new U1 check runs before anything is written (Q4)
- PUB008 stops the run for any slug clash involving a site page (page/post, page/page, page/retired note) and names both files; post/post clashes keep today's warning (Q5)
- New PUB009 stops the run when a note embeds a site page (whole, heading or block) (Q6)
- Overlapping folders (same folder, or one inside the other) stop the run before anything is read or stamped, with a usage error (exit 2) naming both paths (Q7)
- Pipeline variables are additive: Jenkins `PAGES_PATH` from `OBSIDIAN_PAGES_PATH`, Justfile `vault` defaults to `./fixtures/vault/Notes`, new `pages` and `publish_pages`; every preprocess call passes `--pages` (Q8)
- Until U2 lands, the homepage keeps a "오늘 발행된 글" list built from post metadata under the new opening (Q9)
- Settled earlier: CLI shape and missing-folder notice, folder-first classification, PUB002 retired, PUB003–PUB006 kept, retired-note links to `/`, site-page links as plain text, `pages/<slug>.md|.json`, no `homepage/`, opening from the Profile Domain, artifact reader and HP001–HP004 removed

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
