# Requirements Analysis Questions

These questions settle what the redesign and the cleanup must deliver. They build on the code knowledge base (`aidlc/spaces/default/codekb/obsidian-blog/`) and the practices you affirmed, so they do not re-ask how the repository is worked on. Fill in each `[Answer]:` with a letter, or with your own words after `X`.

## Question 1: Visual direction within Apple's guidelines

Apple's current Human Interface Guidelines (since 2025) center on Liquid Glass: translucent, layered bars and controls that float over the content. The guidelines' foundations (clarity, typography, color, spacing, layout, accessibility) apply to any design. On a website, heavy translucency costs some rendering performance and needs solid fallbacks.

Which visual direction should the redesign take?

A. The current Apple look: Liquid Glass-style translucent header, navigation and sidebars floating over the content, with solid fallbacks where blur is unsupported or the reader asks for reduced transparency
B. Foundations only: Apple's typography, color, spacing, layout and accessibility rules on flat, solid surfaces, with no translucency
C. Subtle materials: mostly solid surfaces, with only a translucent blurred header
X. Other (please specify)

[Answer]: A

## Question 2: Which pages the redesign covers

The color tokens and the shared header, navigation, footer and search live in files covered by the 16-state accessibility review, so restyling them triggers that review either way. The profile pages (`/resume`, `/portfolio`, `/portfolio/<role>`) also have their own stylesheets, a CSS size budget, markup tests, and a print layout tied to the human-reviewed PDF release.

Which pages should the redesign cover?

A. Blog pages plus the shared chrome; the profile pages pick up the new shared chrome and color tokens but keep their own layouts
B. Everything, including the profile pages' own layouts (adds profile markup-test updates and, if the print layout changes, a new PDF release)
X. Other (please specify)

[Answer]: B

## Question 3: Light and dark appearance

Today the site follows the system's light/dark setting only on a reader's first visit. After that it switches at sunrise and sunset, using the reader's location (a browser location prompt) and a third-party sunrise API. Apple's guidelines say to respect the system appearance.

How should the site choose light or dark?

A. Follow the system setting, with a manual Light / Dark / Automatic choice remembered per browser; remove the location and sunrise logic
B. Follow the system setting only; remove the toggle and the location logic
C. Keep the sunrise and sunset switching
X. Other (please specify)

[Answer]: A

## Question 4: Fonts

Apple's San Francisco fonts cannot be served as web fonts (they are licensed for Apple platforms only), but Apple devices already have them: a system font stack shows San Francisco and Apple SD Gothic Neo there. Pretendard, loaded today from a CDN without integrity hashes, is a Korean font designed to look like Apple's system fonts on every platform. The profile pages already serve their own Pretendard subset from this site.

Which fonts should the site use?

A. System fonts on Apple devices (San Francisco and Apple SD Gothic Neo); Pretendard, served from this site, on other platforms
B. Pretendard everywhere, served from this site instead of the CDN, for the same look on every platform
C. Pretendard everywhere from the CDN, as today
X. Other (please specify)

[Answer]: B

## Question 5: Known accessibility gaps

The scan found 13 accessibility gaps on blog and shared pages. Examples: link text at 3.59:1 contrast in light mode (the minimum is 4.5:1), touch targets under Apple's 44-point minimum, a search overlay without dialog semantics, a graph that only works with a pointer, link previews that open on hover only, and English control labels on Korean pages. The full list is in `code-quality-assessment.md` (IDs A11Y-01 to A11Y-13).

Which of them should this redesign fix?

A. All 13
B. The ones the restyle naturally touches: contrast, touch targets, focus rings, motion, labels and the search overlay's dialog semantics; leave the graph's keyboard access and the hover-only link previews for later
C. Only contrast and touch targets
X. Other (please specify)

[Answer]: A

## Question 6: Merged branches and worktrees

27 local branches are already merged into `develop`, and 3 linked worktrees (checkouts of this repository in other folders) sit on merged branches. Two of those worktrees are under `.claude/worktrees/`, a folder other Claude sessions use. `develop` and `main` always stay.

What should the cleanup remove?

A. All 27 merged branches and all 3 worktrees; a worktree with uncommitted changes is reported and left alone
B. Same as A, but leave the two `.claude/worktrees/` checkouts and their branches alone
C. The 3 worktrees only; keep the branches
X. Other (please specify)

[Answer]: A

## Question 7: The unmerged scaffolding branch

`codex/chore/aidlc-scaffolding` holds 10 commits that are not on `develop`: documents from the earlier AI-DLC setup, plus one code fix (`9e1c203`, puppeteer configuration support in the Mermaid renderer) that `develop` does not have.

What should happen to it?

A. Cherry-pick the Mermaid fix onto `develop`, then delete the branch
B. Merge the whole branch into `develop`, then delete it
C. Keep the branch as it is
D. Delete it, fix included
X. Other (please specify)

[Answer]: B

## Question 8: Uncommitted portfolio work on the current branch

The current branch, `codex/feature/infra-engineer-portfolio`, points at the same commit as `develop` but carries uncommitted portfolio work: role metadata, presentation and style changes, tests, and `docs/portfolio/infra-engineer/`. Because the branch counts as merged, the cleanup would otherwise remove it.

What should happen to that work?

A. Commit it on that branch and merge it into `develop` before the cleanup and redesign start
B. Commit it on that branch, but keep the branch unmerged for now
C. Stash it and delete the branch
X. Other (please specify)

[Answer]: A

## Question 9: When Prettier lands

Your practices add Prettier for the site after the redesign. Reformatting touches files covered by the 16-state accessibility review, so if Prettier lands after that review, the review has to be done a second time.

When should Prettier land?

A. At the end of this redesign, before the one accessibility review
B. In a later piece of work, accepting a second review
C. First, before the restyle starts
X. Other (please specify)

[Answer]: A

## Follow-up 1: Merging the whole scaffolding branch (follows Question 7)

Your answer to Question 7 was to merge all of `codex/chore/aidlc-scaffolding` into `develop`. Its 108 changed files conflict with what `develop` and your current setup now hold:

- An older AI-DLC rules tree under `.aidlc/aidlc-rules/` (AWS AI-DLC 1.0.1), plus `CLAUDE.md` lines and a `just aidlc-check` recipe that point AI-DLC there, while the AI-DLC you are running now lives under `.claude/` and `aidlc/`
- A new `AGENTS.md` that still describes the removed `infra/` Terraform and S3/CloudFront hosting
- Older copies of the earlier workflow's records under `aidlc-docs/`, which were moved into `aidlc/spaces/default/intents/261019-obsidian-press-resume-an/`
- The generated `site/public/nav-tree.json`, `previews.json` and `search-index.json`, which `develop` ignores
- 87 removed lines in `site/package-lock.json`
- The Mermaid fix `9e1c203` (and its `.puppeteer-config.json` ignore line), which is the only code change

How should the branch be brought in?

A. Bring over only the Mermaid fix and its ignore line, then delete the branch
B. Merge the whole branch, resolving every conflict in favour of what `develop` and the current setup hold now, so only the fix lands and the branch history is kept
C. Merge the whole branch exactly as it is
X. Other (please specify)

[Answer]: A (supersedes the Question 7 answer)

## Follow-up 2: The résumé's print and PDF layout (follows Question 2)

Your answer to Question 2 includes the profile pages' own layouts. The résumé page's print layout is what the PDF résumé is made from: changing it requires a new PDF release with your human review, while keeping it means the screen redesign needs no new PDF release. The public `/resume.pdf` is already older than the current profile, and its download link stays hidden until a new release.

Should the redesign change the résumé's print and PDF layout?

A. No: keep the print and PDF layout as it is; the redesign covers the screen only
B. Yes: restyle the print layout too, and do a new human-reviewed PDF release, which also replaces the outdated public `resume.pdf`
X. Other (please specify)

[Answer]: B
