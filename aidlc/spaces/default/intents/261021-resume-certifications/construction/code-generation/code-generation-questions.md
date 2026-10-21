# Code Generation Plan Approval

AI-DLC writes this file when it asks you to approve the plan. To answer here
instead of in chat, write your answer after `[Answer]:` and say done.

## Plan Approval

Approve the code plan?

- Builds: day-precision dates with dotted display in every profile layer, a separate 자격증 section, and the r9 fact revision (AWS added with its 인증 확인 링크, OPIc dated with ACTFL, HSK removed), then a ne...
- Touches: `site/src/lib/profile/{types,validation,issues,fact-approval,resume-manifest,resume-evidence,production-profile,profile-data}.ts`, `site/scripts/profile/pdf-inspector.mjs`, `site/src/compo...
- Tests: about 30 new or changed checks, each written failing first: unit tests per layer for full dates and dotted text, manifest order and r8 compatibility, the fact set, PBT generators with date p...

Full plan: aidlc/spaces/default/intents/261021-resume-certifications/construction/code-generation/code-generation-plan.md
Test instructions: aidlc/spaces/default/intents/261021-resume-certifications/construction/code-generation/unit-test-instructions.md

[Approval Fingerprint]: sha256:v3:7121680f31a95299a61247020b7c3c2a4754664d46849403cb188b547db23b77
[Planned Source]: 027a662d8f3eb28226e9078a2c991a420f310e237a2cb30661e51000e4ba74d8

- A. Approve Plan
- B. Request Changes
- C. I'll edit the files

[Answer]: A. Approve Plan
