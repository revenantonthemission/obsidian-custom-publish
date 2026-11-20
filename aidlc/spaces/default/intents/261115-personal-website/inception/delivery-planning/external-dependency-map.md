# External Dependency Map — first release

Everything is built inside this repository by the AI developer. A **Bolt** is one build pass over one unit. The only outside hold-ups are actions the maintainer takes.

| Dependency | Owner | When | Blocks | If it slips |
|-----------|-------|------|--------|-------------|
| Reword the project rule "`VAULT_PATH` must point at `Areas/Notes`" to name `Areas/Pages`, and remove the old line — **resolved 2026-11-20**: `project.md` now reads "`VAULT_PATH` must point at `Areas/Notes` and `PAGES_PATH` at `Areas/Pages`; those are the only published folders" (commit `1cf9e63`, merged into `develop`) | Maintainer | Before Bolt 1 merges | Bolt 1 merge | Bolt 1 waits on its branch; nothing ships |
| Create `Areas/Pages` in the real vault (may be empty) | Maintainer | Before Bolt 1's first nightly | None (a missing folder only prints a notice) | Zero site pages, which is expected in this release |
| Restart `dev.rvnnt.blog` on the new server code, then check `/tags` answers 301 | Maintainer | After Bolt 4 merges, before the next nightly deploy | Bolt 4 release | Old `/tags` and `/graph` links return 404 until restarted |
| Redo the manual 16-state accessibility review | Maintainer | After Bolt 4 | `npm run test:e2e` passing | That suite stays failing; the nightly deploy is unaffected (Jenkins does not run it) |
