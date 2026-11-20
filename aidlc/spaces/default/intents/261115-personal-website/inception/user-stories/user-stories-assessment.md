# User Stories Assessment — Passion Project personal website, first release

**Decision:** Execute

## Rationale

The first release is user-facing: a new homepage, a Writing section, moved Tags and Graph pages with redirects, and new navigation (requirements FR3–FR6). Three visitor groups use it for different reasons (intent statement), and the site owner is a fourth user who writes the vault notes and depends on the publishing rules (FR1–FR2). Stories tie each requirement to who it serves and give the testers Given/When/Then criteria, which the team's test-first posture turns into the first failing tests.

## Factors Considered

| Factor | Finding |
|--------|---------|
| Project type | Brownfield enhancement of the preprocessor and the site |
| User-facing scope | Homepage, Writing, `/writing/all`, Tags, Graph, navigation, redirects |
| Personas | Recruiter, engineer/reader, friend; and the owner as author |
| Complexity signals | Publish boundary change, homepage note retirement, server redirects, date-window logic |

## Where Stories Add the Most Value

- The owner's publishing stories (FR1, FR2), where a wrong rule silently drops or leaks content.
- The homepage's weekly list and the Writing lists, whose ordering and empty states are easy to get wrong.
- The redirects and navigation, which must keep old links working.

## Working Mode

Collaborators are off for this scope, so the product lead drafts the stories alone; no mob round runs.
