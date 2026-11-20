# Contract Design Questions — first release

Settled, not asked: all units live in one repository and ship in one build, so contracts are files and routes, not network APIs; there is no versioning beyond "producer and consumer change in the same merge"; post metadata (`content/meta/<slug>.json`) keeps its current shape; consumers ignore unknown fields.

## Q1. [Developer] How does the publishing step receive the site-pages folder?

Today it is `obsidian-press <VAULT> <OUTPUT> [--stamp-published]`, with `<VAULT>` pointing at `Areas/Notes`.

A. A named option: `obsidian-press <NOTES> <OUTPUT> --pages <PAGES> [--stamp-published]`; without `--pages` the run has zero site pages and prints the notice (Recommended: old invocations keep working)
B. A third positional argument: `obsidian-press <NOTES> <PAGES> <OUTPUT>` (every caller must change at once)
X. Other (please specify)

[Answer]: A

## Q2. [Developer] Where does the redirect table live in the built site?

The server reads it from the web root on each request (ADR-002).

A. `/_redirects.json` at the web root, served like any other file (Recommended: simple, inspectable)
B. A file outside the served tree, so visitors cannot fetch it
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- The publishing step takes the site-pages folder as a named option: `obsidian-press <NOTES> <OUTPUT> --pages <PAGES> [--stamp-published]`; without `--pages` there are zero site pages and the notice prints (Q1)
- The redirect table is `/_redirects.json` at the web root, served like any other file (Q2)
- Contracts are files and routes in one repository and one build; producer and consumer change in the same merge; consumers ignore unknown fields (settled)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
