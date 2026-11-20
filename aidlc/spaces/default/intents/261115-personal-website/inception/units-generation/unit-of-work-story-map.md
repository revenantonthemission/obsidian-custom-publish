# Unit of Work — Story Map

| Story | Unit ID | Directory |
|-------|---------|-----------|
| US1.1 | U1 | u1-publish-boundary |
| US1.2 | U1 | u1-publish-boundary |
| US1.3 | U1 | u1-publish-boundary |
| US2.1 | U1 | u1-publish-boundary |
| US2.2 | U1 | u1-publish-boundary |
| US3.1 | U1 | u1-publish-boundary |
| US3.2 | U1 | u1-publish-boundary |
| US3.3 | U2 | u2-writing-section |
| US3.4 | U2 | u2-writing-section |
| US4.1 | U2; U3 | u2-writing-section; u3-writing-moves |
| US4.2 | U2 | u2-writing-section |
| US5.1 | U3 | u3-writing-moves |
| US5.2 | U3 | u3-writing-moves |
| US6.1 | U4 | u4-navigation |
| US6.2 | U4 | u4-navigation |
| US7.1 | U1; U2; U3; U4 | u1-publish-boundary; u2-writing-section; u3-writing-moves; u4-navigation |

## Cross-Cutting Rows

- **US4.1** — U2 builds `/writing`; U3 repoints its Tags and Graph capsules to `/writing/...` (AC4.1.5).
- **US7.1** — every unit adds the accessibility, no-other-origin, no-JavaScript and existing-suite checks for the pages it changes.

## Implementation Order Within Each Unit

- **U1:** fixture vault (Pages/, retired homepage note) → scanner → catalog → link resolver → output writer → CLI and stamping → site data and homepage opening → pipeline wiring.
- **U2:** list module (week rule first) → `/writing/all` → `/writing` → homepage weekly section.
- **U3:** shared tag-URL helper → moved pages and layout links → redirect table → server.
- **U4:** marker rule → navigation model → header and sheet.

## Coverage

All 16 stories are assigned; every unit has at least two rows.
