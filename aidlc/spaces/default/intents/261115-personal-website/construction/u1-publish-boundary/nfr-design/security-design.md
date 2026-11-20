# Security Design — U1 `u1-publish-boundary`

Upstream: `nfr-requirements/security-requirements.md` (NFR5.1–NFR5.9, NFR2.1, NFR3.1), `tech-stack-decisions.md`; `functional-design/functional-spec.md` (W1, run lifecycle); `inception/contract-design/contract-summary.md` (C1, C2); answers in `nfr-design-questions.md` (Q1–Q5).

## 1. Approach

Defense in depth around one boundary: **the publishing step may read only NOTES and PAGES, may write vault files only under NOTES (stamping), and may delete only inside OUTPUT.** U1 has no authentication, authorisation, secrets or network input, so encryption, CSRF/XSS, session and secrets controls do not apply. The only untrusted input is vault content, which is the owner's own, and it is treated as data, never as paths outside the boundary.

Five layers, each enforced by one logical component (see `logical-components.md`):

| Layer | Control | Enforced by | Requirement |
|---|---|---|---|
| L1 Wiring | Resolve the three paths and reject overlaps before anything runs | BoundaryGuard | NFR5.4, Q1 |
| L2 Walking | One walk policy for scan and stamp: skip rules, links skipped with a warning | BoundaryWalker | NFR5.1, NFR5.3, NFR5.6, Q4 |
| L3 Lookup | Image lookup confined to the source root; links and out-of-root real paths treated as missing | AttachmentResolver | NFR5.2, NFR5.3 |
| L4 Content | Unpublished bodies cannot leak through embeds; no page can replace another note | PublicationCatalog | NFR5.7, NFR5.8 |
| L5 Ordering | Every check before any vault write or output delete | RunCoordinator | NFR5.5 |

## 2. L1 — Path resolution and overlap guard (BoundaryGuard)

**Resolution.** Each path is resolved to an absolute list of components:

1. NOTES must exist and be a folder; it is canonicalised (links resolved). A missing NOTES keeps today's I/O failure (exit 1).
2. PAGES (when given) and OUTPUT may not exist yet. Take the nearest existing ancestor, canonicalise it, and append the remaining components. A remaining component of `.` or `..` cannot be resolved safely, so it is a usage error (exit 2). A trailing slash is ignored.
3. PAGES that exists but is not a folder is a usage error (exit 2).

**Comparison.** Two resolved paths *overlap* when they are equal or one is a component-wise prefix of the other. Components are compared after Unicode NFC normalisation and case folding, because APFS (the vault and repository volume) is case- and normalisation-insensitive by default. Component-wise means `Areas/Notes` never matches `Areas/NotesArchive`.

**Pairs checked, in this order:** (NOTES, PAGES), (OUTPUT, NOTES), (OUTPUT, PAGES). The first overlap stops the run:

```
error: --pages <PAGES> overlaps posts folder <NOTES>
error: output folder <OUTPUT> overlaps posts folder <NOTES>
error: output folder <OUTPUT> overlaps site pages folder <PAGES>
```

These run after argument parsing and before the pages notice, any read, stamp or delete. Exit 2.

Illustrative pseudocode:

```
overlaps(a, b):
  fa = fold(a.components); fb = fold(b.components)
  return fa == fb or starts_with(fa, fb) or starts_with(fb, fa)
fold(cs) = [ casefold(nfc(c)) for c in cs ]
```

## 3. L2 — One walk policy (BoundaryWalker)

The scan and the stamper use the same walker, so they cannot drift apart:

- Rooted at NOTES or PAGES; never ascends.
- Does not follow links. Additionally, any entry whose own metadata (not its target's) says it is a symbolic link is skipped, whether file or folder, and reported once: `warning: skipped symbolic link <path>`. This closes the gap the NFR review found: today a linked `.md` passes the "is a file" test, because that test follows the link.
- Skips entries whose name starts with `.` or equals `Drafts`, with their whole subtree, silently as today.
- Yields only regular `.md` files. Nothing else reaches the scanner or the stamper.

The stamper walks NOTES only (PAGES is never passed to it). It writes only files the walker yielded, so it never writes through a link (NFR5.6, NFR5.3).

## 4. L3 — Attachment lookup (AttachmentResolver)

For an image embed `![[name]]` in a note under root R:

1. Reduce `name` to its final file-name component (as today), so `../` in an embed cannot escape.
2. Search `dir/attachment/<name>` for `dir` = the note's folder, then each parent, **stopping after R itself**.
3. Accept a candidate only if its own metadata says it is a regular file (a link is treated as missing) **and** its canonical path still lies inside canonical R (belt and braces against folder links on the path).
4. Not found or rejected → the existing `warning: attachment not found` line; nothing copied; not in the manifest.

Destinations: post images go to `assets/<name>` as today. Site-page images go to `assets/pages/<name>` (Q3), so a page image never shadows a post image and existing post URLs are unchanged.

## 5. L4 — Content leaks and replacement (PublicationCatalog)

- PUB004–PUB006: embeds of the retired homepage note from any post or site page body.
- PUB009: embeds of any site page from any post or site page body.
- Detection uses the existing transclusion pattern on bodies with frontmatter stripped and code fences skipped, as the existing checks do.
- PUB008: any slug shared between a site page and any other note.
- Notes that never get a catalog entry (dot entries, `Drafts`, links) are never transformed or written. The retired note is in the catalog only so that links to it render as `/`. It is excluded from every writer input (posts-only view).

## 6. L5 — Ordering (RunCoordinator)

```
parse → BoundaryGuard → pages notice → scan → catalog
  → [findings? exit 1]
  → stamp NOTES (if asked) → rescan if any file changed → catalog
  → [findings? exit 1]          (vault already stamped: see residual risk R2)
  → clean OUTPUT managed namespaces → write → summary
```

No vault write or output deletion happens before both the guard and the first full catalog pass succeed (NFR5.5). The second catalog pass can only fail if stamping changed classification-relevant content. Stamping changes only the `published` line, so in practice it cannot. If it ever does, the run still stops before any output is deleted.

## 7. Site side

- The homepage opening is static markup: same-origin relative links `/resume` and `/portfolio`, no island, no new font, image or script (NFR2.1, NFR3.1).
- Owner name and short introduction come from the approved Profile Domain facts. They are rendered as text, never as raw HTML.

## 8. Messages (NFR5.9)

Diagnostics, warnings, notices and usage errors print only resolved paths under the three roots and fixed text. They never print file contents, frontmatter values (except the offending `visibility` value, as PUB001 does today) or environment variables.

## 9. Threat → control → test

| Threat | Control | Test (written first) |
|---|---|---|
| Image beside NOTES read (`<parent>/attachment/x.png`) | L3 stop at R | temp vault: the image exists only in `<parent of NOTES>/attachment/`; assert warning, not copied |
| Linked image to a file outside the vault | L3 link rejected | `attachment/x.png` → link to `/tmp/...`; assert not copied |
| Linked `.md` outside the vault published or stamped | L2 link skip | linked note: assert warning, absent from output, target bytes unchanged after a stamping run |
| `--pages` = vault root (contains NOTES) | L1 | exit 2, message, no file read (vault hashes unchanged) |
| OUTPUT = `Areas/Pages` (any letter case) | L1 | exit 2 before the clean; PAGES files intact |
| PUB008 vault with stamping on | L5 | every vault file byte-identical after exit 1 |
| Retired note's marker text in output | L4 + posts-only writer | grep `content/` for the marker: absent |
| Site page body embedded in a post | L4 PUB009 | exit 1, nothing written |

## 10. Residual risks

| ID | Risk | Decision |
|---|---|---|
| R1 | Private notes placed in `Areas/Pages` by the owner | Accepted: folder-first; noted in `CLAUDE.md`; the summary line shows the page count |
| R2 | The second catalog pass fails after stamping | Accepted: stamping only rewrites `published`, so a second-pass finding is not expected; dates stamped into posts are the documented nightly behaviour |
| R3 | Hard links to files outside the vault | Accepted: indistinguishable from regular files; not created by iCloud |
| R4 | Time-of-check/time-of-use (a file swapped for a link mid-run by iCloud sync) | Accepted: single-user machine; the walker checks link status at visit time |
