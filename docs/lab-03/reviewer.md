# Lab 3 Peer Review and Delivery Record

**Author:** Patiharn Liangkobkit - 66070503489 - GitHub [@Richyboy170](https://github.com/Richyboy170)

**Repository:** [Richyboy170/toktickit](https://github.com/Richyboy170/toktickit)

**Peer-review group:** Tanakrit ([Tanakrit-triton](https://github.com/Tanakrit-triton)) and Suwiwat ([iceswift](https://github.com/iceswift)). The Lab 2 record in `02_Assignment/Lab_02_submission.md` contains their completed Lab 2 review history. No Lab 3 GitHub PR, approval, merge, or CI run is claimed in this local record because the current tree has not been pushed or reviewed remotely.

## 1. Lab 3 local review state

The working tree is on the existing `lab2-staging` branch with the Lab 3 implementation present locally. The intended Lab 3 branch flow and CI workflow are documented in `README.md` and `.github/workflows/lab2-ci.yml`, now named **TokTickIT CI** and configured for `lab3-staging`. A Lab 3 staging branch, Issues, PR links, peer approval, and final `main` merge remain pending.

A read-only final review was performed by the Codex review agent on 15 September 2026. The author addressed the concrete findings in the shared tree:

| Finding from local review | Response in this tree | Re-review state |
|---|---|---|
| Legacy requester header and selector could bypass authentication | Header, requester directory, and client selector are restricted to `ENABLE_LEGACY_REQUESTER_CONTEXT=true` or test mode; normal client builds use session identity. | Local code updated; peer re-review pending |
| Role login could land on `/tickets`; full users could not change password | Role-safe return paths, default destinations, voluntary Change Password, and shell navigation were added. | Local code updated; peer re-review pending |
| Staff status UI showed every status and always sent confirmation | UI now offers only valid next states and asks for confirmation for Cancel/Resolve/Close/Reopen; API default is `confirm=false`. | Local code updated; peer re-review pending |
| Legacy migration left empty credentials without a usable local initializer | `prisma:initialize-legacy-passwords` hashes a local temporary value after migration and preserves the first-login flag; setup docs describe it. | Local code updated; peer re-review pending |
| Deactivating an owner left stale Ticket ownership | Administrator deactivation clears `ownerId` and revokes sessions in one transaction. | Local code updated; peer re-review pending |
| Malformed JSON could receive an unsafe default response; tablet Queue was too wide | Express parser/final error middleware returns the safe envelope; Staff Queue uses cards at 768-991px. | Local code updated; peer re-review pending |
| Submission evidence contained placeholders | Test, AI-use, reviewer, and screenshot records now distinguish Pass, Pending, and Blocked; no fabricated links or screenshots were added. | Local evidence updated; peer re-review pending |

## 2. Review checklist and evidence

| Area | Local status | Evidence |
|---|---|---|
| Contract files agree on roles, ownership, statuses, API, UI, and acceptance criteria | Implemented baseline | `docs/lab-03/specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md` |
| Password/session design and role checks | Implemented; boundary tests pass | `server/src/auth.ts`, `auth-context.ts`, `server/tests/lab-03/` |
| Migration, seed, and Lab 2 database regression | Not verified locally | PostgreSQL at `localhost:5432` was unavailable |
| Requester, Staff, Administrator screens | Implemented; local React tests pass | `client/src/pages/`, `client/tests/lab-03/` |
| Server Lab 3 boundary/unit tests | Pass | 8 files, 19 tests |
| Client tests and production build | Pass | 13 files, 41 tests; Vite build passed |
| Full server/API, migration, seed, E2E, and responsive browser suite | Blocked | Requires PostgreSQL and browser run |
| Screenshots and visual inspection | Pending | `artifacts/lab-03/screenshots/README.md` |
| GitHub Issues, PR review, CI, and release to `main` | Pending | No remote Lab 3 evidence is claimed |

## 3. Peer approval and delivery

Tanakrit and Suwiwat have not approved this Lab 3 working tree in the local record. Their real Lab 2 approvals are retained only as prior-sprint continuity evidence. A peer reviewer should repeat the checklist after a database-backed test run, browser capture, and GitHub PR review.

| Evidence | Link or identifier | Result |
|---|---|---|
| Lab 3 contract PR | Pending - no remote PR claimed | Pending |
| Authentication/migration review | Pending | Pending |
| Authorization and Requester regression review | Pending | Pending |
| Staff Queue/Detail review | Pending | Pending |
| Administrator User Management review | Pending | Pending |
| E2E/visual/release review | Pending | Pending |
| Merge to `main` and final CI | Pending | Pending |

## 4. Final reviewer statement

No peer approval, merge, final-main test run, or visual sign-off is claimed for Lab 3 in this local record. The implementation and local evidence are ready for that review once PostgreSQL and the remote workflow are available.
