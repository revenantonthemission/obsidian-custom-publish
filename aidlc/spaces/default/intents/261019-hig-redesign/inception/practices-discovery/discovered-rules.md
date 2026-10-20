# Discovered Rules

These are the hard constraints the maintainer confirmed one by one in the practices interview (Question 8 in `practices-discovery-questions.md`). On approval, every line under the two headings below is appended to `memory/project.md` exactly as written. `evidence.md` lists the source of each rule and the eight candidates that were not kept.

## Mandated

- ALWAYS fix the defect behind a shrunk property-test counterexample, then keep that counterexample as a permanent example regression next to the unchanged property.
- ALWAYS refer to the site's color tokens by their `--c-` names (for example `--c-text-muted`, never `--text-muted`).

## Forbidden

- NEVER start Jenkins with `brew services start jenkins`, because it rewrites the LaunchAgent with port 8080 and takes 127.0.0.1:8080 from the blog.
- NEVER pile several phases of work onto one feature branch. Each phase gets its own branch off `develop`.
- NEVER commit nested worktree checkouts such as `.claude/worktrees/`.
- NEVER run the preprocessor against the whole vault. `VAULT_PATH` must point at `Areas/Notes`, the only published folder.
- NEVER slice Korean text by bytes in Rust. Truncate it with `char_indices()`.
