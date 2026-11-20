# Domain Design Questions — first release

Settled from the code and earlier answers, so not asked: the preprocessor keeps its pass structure (scan → catalog → link → transform → index → write); the site keeps reading generated `content/`; the Writing lists live in a new pure site module beside today's `homepage.ts`; hubs are not posts in lists; links to the retired homepage note go to `/`.

## Q1. [Architect] How should the preprocessor tell posts, site pages and the retired homepage note apart?

Today one scan of `Areas/Notes` feeds a catalog that splits notes into "the homepage" and "posts".

A. One scan over both folders; each note records which folder it came from, and the catalog classifies every note as a post, a site page or the retired homepage note. Links resolve against one index; every list is built from posts only. (Recommended: one place decides what a note is, and slug clashes are caught in one check.)
B. Two independent scans and catalogs, one per folder, merged only at output. Simpler scan, but slug clashes and links between the two need a second cross-check.
X. Other (please specify)

[Answer]: A

## Q2. [Architect] How do the old-address redirects reach the live server, given the nightly deploy only copies files and never restarts it?

A. The build writes a small redirect table into the site output; the server reads that table from the web root on each request. The server code changes once (you restart it once by hand when this ships); after that every redirect change, and every rollback, ships with the nightly copy like any other file. (Recommended)
B. The redirect rules live in the server code; the nightly Deploy stage restarts the server service after copying files.
C. The redirect rules live in the server code; you restart the server by hand whenever they change.
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- One scan over `Areas/Notes` and `Areas/Pages`; each note records its source folder; the catalog classifies every note as a post, a site page or the retired homepage note; links resolve against one index; every list is built from posts only (Q1)
- The build writes a redirect table into the site output; the static server reads it from the web root on each request; the server is restarted by hand once when this ships; later redirect changes and rollbacks ship with the nightly copy (Q2)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
