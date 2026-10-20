# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

- Reproduced one Red step by setting aside an implementation written before its test (learned 2026-10-20) <!-- cid:261019-hig-redesign:code-generation:3891b2bbe01690301654eea815d956c42bef070bbb989ce94a32af8bd6a3b3af -->

- Tested "a fold above the current heading" as folding the section being read, with its heading at the top of the viewport (learned 2026-10-20) <!-- cid:261019-hig-redesign:code-generation:90f3ed6d9e1cc45c02a30dbb05404b1f4292dac47badfb9d269917cb096ced6b -->

- Added browser checks of rendered contrast beside the planned token pairs in the repair (learned 2026-10-20) <!-- cid:261019-hig-redesign:code-generation:c41ece89f1cf7fb622914288eb00160e3b0ea30a22409be3481ade0853753708 -->

- Ran the six-width overflow matrix as 14 route tests of 12 cells each instead of 168 separate tests (learned 2026-10-20) <!-- cid:261019-hig-redesign:code-generation:89e3ece3b99290d7eeaa1b9c149cf5071a022a471f8836d6c4eeca43b4fc2162 -->

- Checked highlighted links over the homepage card and the grouped background as well as the planned grounds, because the rendered check showed the homepage note sits on both. (learned 2026-10-20) <!-- cid:261019-hig-redesign:code-generation:a76f39ae217a497da0060ea32a1a9c0879874e37865dd2f282aac769390ff99c -->

- Graded the targets that Code Generation review findings bear on as Not Met even though those findings were accepted as risks at the last approval (learned 2026-10-20) <!-- cid:261019-hig-redesign:build-and-test:a142467f3082210cdf499b6181504b1518059b33dce4d644ff6f8f68f771787e -->

- Graded NFR1-b on a highlighted link that no fixture note renders (learned 2026-10-20) <!-- cid:261019-hig-redesign:build-and-test:2de17474c9f692c315cf77b41247f60c8e9cbea89a2c869913079f711f38edf0 -->

## Guard Policy

<!-- Project-specific. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

- NEVER start Jenkins with `brew services start jenkins`, because it rewrites the LaunchAgent with port 8080 and takes 127.0.0.1:8080 from the blog. (affirmed 2026-10-20)

- NEVER pile several phases of work onto one feature branch. Each phase gets its own branch off `develop`. (affirmed 2026-10-20)

- NEVER commit nested worktree checkouts such as `.claude/worktrees/`. (affirmed 2026-10-20)

- NEVER run the preprocessor against the whole vault. `VAULT_PATH` must point at `Areas/Notes`, the only published folder. (affirmed 2026-10-20)

- NEVER slice Korean text by bytes in Rust. Truncate it with `char_indices()`. (affirmed 2026-10-20)

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

- ALWAYS fix the defect behind a shrunk property-test counterexample, then keep that counterexample as a permanent example regression next to the unchanged property. (affirmed 2026-10-20)

- ALWAYS refer to the site's color tokens by their `--c-` names (for example `--c-text-muted`, never `--text-muted`). (affirmed 2026-10-20)

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
- Kept the knowledge base marked as a full scan while recording binary files, lockfiles, and content-only docs as shallow, rather than marking the whole scan partial (learned 2026-10-19) <!-- cid:261019-hig-redesign:reverse-engineering:ec75495448527c3134a3398bd623d2c9b008404175eb44e08e8a0e35d57b6a62 -->
- Recorded that hotfixes also land on develop, so Construction hotfix work branches from and merges back into develop, never main (learned 2026-10-20) <!-- cid:261019-hig-redesign:practices-discovery:1a8397cb9c10695615fe0b703123b73b8c3a826d82d1dd9cb71d5272ece88bb1 -->
- Read Liquid Glass on the web as a backdrop blur and saturation over a tinted translucent fill with an edge highlight, without refraction or lensing (learned 2026-10-20) <!-- cid:261019-hig-redesign:requirements-analysis:0d2a5adaa9f35192340214b1ba58888332ba5527a1f65096dfbf06f17c067900 -->
- Met the requirement for an explicit touch preview affordance with the browser's native press-and-hold link preview instead of custom UI (learned 2026-10-20) <!-- cid:261019-hig-redesign:refined-mockups:0f21b8b7be75142939494aaaaaf4304730a33c945dfc32acfb0b8d84d21430b0 -->
- Pointed the traceability rows of git-only requirements (worktree removal, branch deletion, untouched remotes) at the cleanup report, because git operations leave no source file to name (learned 2026-10-20) <!-- cid:261019-hig-redesign:code-generation:5c7dbe7bc401eb30159ef2d611cbeb7fc760759eb84db4fa58109dab0c873dc5 -->
- Let the graph island fetch its own data instead of receiving the whole graph as props (learned 2026-10-20) <!-- cid:261019-hig-redesign:code-generation:15414e60669f7412d53ce84c14ce3f9b625a1e53bd6b06a040d77a309dccfd7a -->
- Sized post images from their files at build time and loaded only the first image or diagram pair eagerly, rather than eager-loading every diagram (learned 2026-10-20) <!-- cid:261019-hig-redesign:code-generation:99c224a525b6921e2208035f3267ac9cd411f604d105f70f55740b6855396d24 -->
- Moved the highlight rule into a new highlight.css that the homepage and post pages both load, rather than into global.css (learned 2026-10-20) <!-- cid:261019-hig-redesign:code-generation:e48bc2c97fdffe2825337977579c0861e5962d0891a86dcc242cb9d0da44de10 -->
