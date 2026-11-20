# Discovered Rules

Only hard constraints the maintainer stated. Every rule is carried word for word from `aidlc/spaces/default/memory/project.md` (affirmed 2026-10-20), without its date stamp, so promotion recognises it as already present and appends nothing. The 2026-11-15 re-run found no new rule, and the interview (Q4) kept the `Areas/Notes` rule unchanged for now.

## Mandated

- ALWAYS fix the defect behind a shrunk property-test counterexample, then keep that counterexample as a permanent example regression next to the unchanged property.
- ALWAYS refer to the site's color tokens by their `--c-` names (for example `--c-text-muted`, never `--text-muted`).

## Forbidden

- NEVER start Jenkins with `brew services start jenkins`, because it rewrites the LaunchAgent with port 8080 and takes 127.0.0.1:8080 from the blog.
- NEVER pile several phases of work onto one feature branch. Each phase gets its own branch off `develop`.
- NEVER commit nested worktree checkouts such as `.claude/worktrees/`.
- NEVER run the preprocessor against the whole vault. `VAULT_PATH` must point at `Areas/Notes`, the only published folder.
- NEVER slice Korean text by bytes in Rust. Truncate it with `char_indices()`.
