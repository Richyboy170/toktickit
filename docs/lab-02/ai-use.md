# Lab 2 AI Use and Reflection

## Tool used

OpenAI Codex, a GPT-5-family coding agent, was used to read the lab sheet, draft the engineering contract, inspect and modify the repository, run tests, configure GitHub workflow artifacts, and audit completion. The student remains responsible for reviewing the requirements, code, database changes, dependency changes, tests, screenshots, and final evidence.

## Selected genuine prompts

The initial user message combined several independent directives. They are listed as separate prompt excerpts below so the table preserves 7 genuine instructions without fabricating messages.

| # | Actual user prompt excerpt | How it influenced the work |
|---|---|---|
| 1 | “I would like to do `...\Lab_02_labsheet.pdf`. Can you read and do it for me?” | Triggered full lab-sheet review and repository implementation. |
| 2 | “you must be very careful and considerate about every action.” | Led to guarded database cleanup, test-database isolation, diff/audit checks, and explicit evidence integrity. |
| 3 | “DO NOT MERGE the work, let the peer reviewer merge it themselves” | All feature PRs were left open; merge methods and protected branches were configured for reviewer merge commits. |
| 4 | “you must make the branching and issue and whatever required in the lab02 for me.” | Produced Issues #13–#20, one required branch per Issue, project statuses, stacked PRs, CI, E2E, screenshots, and documentation. |
| 5 | “are you sure you are doing it correctly?” | Prompted contract/rule verification before implementation and stronger evidence-backed checks. |
| 6 | “Implement the plan.” | Authorized implementation of the reviewed plan and engineering contract. |
| 7 | “continue” | Authorized continuation through remaining feature, readiness, and evidence branches without merging. |

## Important AI-assisted decisions reviewed during implementation

- Kept the Development Requester selector visibly separate from real authentication.
- Used PostgreSQL for bounded Attachment byte storage and an advisory transaction lock for the five-active-file cap.
- Used signature, declared MIME, and extension agreement rather than trusting a filename.
- Used isolated test/E2E databases and made cleanup refuse non-test database names.
- Preserved uniform `404` behavior for missing versus cross-requester resources.
- Used stacked PRs because the reviewer had not yet integrated dependencies; documented the required order.
- Treated visual inspection as a defect-finding activity: it found and corrected an open preview remaining after soft removal.
- Refused to claim peer reviews, approvals, merges, final staging checks, or final-main results that had not happened.

## My Reflection

AI helped me turn a long stakeholder request into a traceable contract and implement the full-stack increment quickly, especially the ownership, Attachment, and responsive test cases. The most useful part was not code generation by itself, but the repeated verification against acceptance criteria, API rules, database safety, and real browser evidence. I also learned that AI output still needs active checking: full test runs exposed shared-database assumptions, security audits required dependency upgrades, and visual inspection found a preview-state defect that automated assertions initially missed. I should continue giving narrow prompts tied to one Issue, reviewing every migration and dependency, and refusing unsupported completion claims.

**Student approval status:** Approved by Patiharn on 5 September 2026 for final submission.

## Verification responsibility

The repository is the source of truth. AI claims were checked with local unit/API/UI/E2E commands, production builds, npm audits, direct screenshot inspection, and GitHub PR/project state. PRs #21–#29 record the completed peer-review and final-main workflow.
