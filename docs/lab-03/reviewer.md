# Lab 3 Peer Review and Delivery Record

**Author:** Patiharn Liangkobkit - 66070503489 - GitHub [@Richyboy170](https://github.com/Richyboy170)

**Repository:** [Richyboy170/toktickit](https://github.com/Richyboy170/toktickit)

**Peer-review group:** Tanakrit ([Tanakrit-triton](https://github.com/Tanakrit-triton)) and Suwiwat ([iceswift](https://github.com/iceswift)). The Lab 2 record in `02_Assignment/Lab_02_submission.md` contains their completed Lab 2 review history. Lab 3 PR #33 is open for their review; GitHub Actions run [35106401012](https://github.com/Richyboy170/toktickit/actions/runs/35106401012) passed, while approval and merge remain pending.

## 1. Lab 3 local review state

The Lab 3 implementation is on `feature/lab3-implementation`, which contains the contract baseline commit before the implementation commit. The branch is published and opened as PR #33 into `lab3-staging`. The intended staged flow and CI workflow are documented in `README.md` and `.github/workflows/lab2-ci.yml`, now named **TokTickIT CI**. The feature-branch CI run passed; peer approval, issue completion, merge into `lab3-staging`, and the final `main` PR remain pending.

A read-only final review was performed by the Codex review agent on 15 September 2026. The author addressed the concrete findings in the shared tree:

| Finding from local review | Response in this tree | Re-review state |
|---|---|---|
| Legacy requester header and selector could bypass authentication | Header, requester directory, and client selector are restricted to `ENABLE_LEGACY_REQUESTER_CONTEXT=true` or test mode; normal client builds use session identity. | Local code updated; peer re-review pending |
| Role login could land on `/tickets`; full users could not change password | Role-safe return paths, default destinations, voluntary Change Password, and shell navigation were added. | Local code updated; peer re-review pending |
| Staff status UI showed every status and always sent confirmation | UI now offers only valid next states and asks for confirmation for Cancel/Resolve/Close/Reopen; API default is `confirm=false`. | Local code updated; peer re-review pending |
| Administrator detail route rendered a Staff Detail but its API read guard returned 403 | `GET /api/staff/tickets/:ticketId` now accepts IT Staff and Administrator readers; assignment, status, comment, and note mutations remain IT Staff-only. | Fix and regression tests added; peer re-review pending |
| Legacy migration left empty credentials without a usable local initializer | `prisma:initialize-legacy-passwords` hashes a local temporary value after migration and preserves the first-login flag; setup docs describe it. | Local code updated; peer re-review pending |
| Deactivating an owner left stale Ticket ownership | Administrator deactivation clears `ownerId` and revokes sessions in one transaction. | Local code updated; peer re-review pending |
| Malformed JSON could receive an unsafe default response; tablet Queue was too wide | Express parser/final error middleware returns the safe envelope; Staff Queue uses cards at 768-991px. | Local code updated; peer re-review pending |
| Submission evidence contained placeholders | Test, AI-use, reviewer, and screenshot records distinguish Pass, Pending, and Blocked; the fixture-backed UI capture now supplies 18 linked PNGs without being presented as database evidence. | Local evidence updated; peer re-review pending |

## 2. Review checklist and evidence

| Area | Local status | Evidence |
|---|---|---|
| Contract files agree on roles, ownership, statuses, API, UI, and acceptance criteria | Implemented baseline | `docs/lab-03/specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md` |
| Password/session design and role checks | Implemented; boundary tests pass | `server/src/auth.ts`, `auth-context.ts`, `server/tests/lab-03/` |
| Migration, seed, and Lab 2 database regression | Not verified locally | PostgreSQL at `localhost:5432` was unavailable |
| Requester, Staff, Administrator screens | Implemented; local React tests pass | `client/src/pages/`, `client/tests/lab-03/` |
| Server Lab 3 boundary/unit tests | Pass | 8 files, 21 tests |
| Client tests and production build | Pass | 13 files, 41 tests; Vite build passed |
| Full server/API, migration, seed, E2E, and responsive browser suite | CI Pass; local database run remains unavailable | GitHub Actions run [35106401012](https://github.com/Richyboy170/toktickit/actions/runs/35106401012) |
| Screenshots and visual inspection | Fixture-backed UI capture and CI artifact pass; peer inspection pending | `artifacts/lab-03/screenshots/README.md`, `e2e/lab-03/visual-evidence.spec.ts`, [GitHub artifact](https://api.github.com/repos/Richyboy170/toktickit/actions/artifacts/10450855693/zip) |
| GitHub Issues, PR review, CI, and release to `main` | Issues and PR open; CI pass; review/release pending | Issues [#34](https://github.com/Richyboy170/toktickit/issues/34)-[#40](https://github.com/Richyboy170/toktickit/issues/40), [PR #33](https://github.com/Richyboy170/toktickit/pull/33), [CI run 35106401012](https://github.com/Richyboy170/toktickit/actions/runs/35106401012) |

## 3. Peer approval and delivery

Tanakrit and Suwiwat have not approved Lab 3 yet. Their real Lab 2 approvals are retained only as prior-sprint continuity evidence. A peer reviewer should repeat the checklist on [PR #33](https://github.com/Richyboy170/toktickit/pull/33), then record comments and approval after the database-backed test run, browser capture, and GitHub checks are available.

| Evidence | Link or identifier | Result |
|---|---|---|
| Lab 3 contract and implementation PR | https://github.com/Richyboy170/toktickit/pull/33 | Open; peer review pending |
| Authentication/migration review | Pending | Pending |
| Authorization and Requester regression review | Pending | Pending |
| Staff Queue/Detail review | Pending | Pending |
| Administrator User Management review | Pending | Pending |
| E2E/visual/release review | Pending | Pending |
| GitHub Actions E2E and screenshot artifact | https://github.com/Richyboy170/toktickit/actions/runs/35106401012 | Pass: server, client, E2E, visual capture, and artifact upload |
| Merge to `main` and final CI | Pending | Pending |

## 4. Final reviewer statement

No peer approval, merge, final-main test run, or peer visual sign-off is claimed for Lab 3 in this local record. PR #33 is the review target; its feature-branch database/browser run and screenshot artifact passed, while the staged release remains pending.
