# Constraint Register — Passion Project personal website

Upstream: `ideation/intent-capture/intent-statement.md`; `ideation/market-research/build-vs-buy.md`.

## Technical Constraints

| ID | Constraint | Source |
|----|------------|--------|
| C-T1 | Build on the current self-built site and vault publishing; no hosted builder or template | Q1; `build-vs-buy.md` |
| C-T2 | The nightly run publishes only the vault folder `Areas/Notes`; it must never read the whole vault | Project rules (`project.md` Forbidden) |
| C-T3 | Every page strictly follows Apple's Human Interface Guidelines, with Lucide icons tuned to SF Symbols weight | Intent statement |
| C-T4 | Site content stays Korean; no English translation in the first version | Intent statement (Q9) |
| C-T5 | Fonts and other assets stay self-hosted; no page requests another origin | Repository `CLAUDE.md` |
| C-T6 | Moved addresses (`/tags`, `/graph`) keep working by redirecting to their new `/writing/...` addresses | Q7 |
| C-T7 | Email appears as a plain `mailto:` link | Q6 |

## Organisational Constraints

| ID | Constraint | Source |
|----|------------|--------|
| C-O1 | One maintainer writes the content, decides scope and carries out every review | Team rules; intent statement |
| C-O2 | Work merges to `develop` one phase at a time on its own branch; pushing `develop` is the release (nightly deploy, no staging) | Team rules |
| C-O3 | Test-first development; every new page gets Playwright HIG and accessibility checks at 320/768/1024/1440 px, light and dark, plus reduced motion | Team rules (Testing Posture) |
| C-O4 | The manual 16-state accessibility review is redone once, after all the new pages are done | Q5 |
| C-O5 | No deadline | Q4 |

## Regulatory Constraints

| ID | Constraint | Source |
|----|------------|--------|
| C-R1 | None identified: a personal, content-only site with no accounts, forms or tracking. The public email address is personal data the owner chose to publish (Q6) | Q6; intent statement |
