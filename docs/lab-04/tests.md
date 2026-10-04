# Lab 4 Test-Driven Development and Traceability

**Status:** Authored as the approved Test DD before implementation. `Planned` means the row has not been verified on the final released commit. Preliminary local checks are recorded below; they do not replace final staging/main CI evidence.

## Strategy

Use Vitest for server unit/API and client component tests, PostgreSQL-backed migration/seed/API regression in CI, and Playwright for end-to-end and responsive evidence. Write each behavior test before its production implementation, observe the intended failure, then implement the smallest passing change. The CI workflow must provision an isolated test database and run server, client, build, migration/seed, E2E, and final visual checks on staging and final `main`.

`PASS` requires a recorded successful command/output for the exact commit. If local PostgreSQL is unavailable, mark local result Blocked and use only a verified final-main CI run for database claims. Keep exact test file paths synchronized with repository state.

## Traceability matrix

| Test ID | Type | AC | Scenario/assertion | Planned test file | Final status |
|---|---|---|---|---|---|
| UNIT-01 | Unit | AC-05 | Trim/required/maximum lengths, conditional follow-up, malformed dates/time zones for Action fields | `server/tests/lab-04/action-validation.unit.test.ts` | Planned |
| UNIT-02 | Unit/workflow | AC-06 | Every Action state edge; terminal state has no outgoing edge | `server/tests/lab-04/action-workflow.unit.test.ts` | Planned |
| UNIT-03 | Unit/workflow | AC-09 | Complete Ticket matrix and confirmation requirements | `server/tests/lab-04/ticket-workflow.unit.test.ts` | Planned |
| UNIT-04 | Unit/workflow | AC-10 | Resolution gate rejects missing/inactive owner, no completed Action, or incomplete non-cancelled Action; cancelled Action does not block | `server/tests/lab-04/ticket-workflow.unit.test.ts` | Planned |
| API-01 | API/integration | AC-01 | Valid create persists correct Ticket, server actor, active assignee, UTC dates | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-02 | API/integration | AC-02 | Multiple performers/assignees may act on a Ticket without changing Ticket owner | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-03 | API | AC-04 | GET list order is `actionAt ASC,id ASC`, including ties; empty is `[]` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-04 | API/validation | AC-05 | Reject blank/long description, missing follow-up note/result, invalid date; accept valid optional notes | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-05 | API/workflow | AC-06 | Allowed Action transitions pass; invalid/terminal update/delete rejected | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-06 | API/security | AC-07 | Inactive, missing, Requester, or Admin assignee is rejected; DB unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-07 | API/concurrency | AC-08 | Stale Action `expectedUpdatedAt` returns 409 and preserves latest persisted fields | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-08 | API/security/workflow | AC-09 | Each Ticket status edge/role/confirmation checked through HTTP API | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-09 | API/integration | AC-10 | Resolution gate checks active owner + ≥1 completed Action + all non-cancelled Actions complete transactionally; Requester indication alone insufficient | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-10 | API/privacy | AC-11 | Requester aggregate/recent lists match only session-owned DB rows, rolling UTC window, empty/zero | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-11 | API/query | AC-12 | Staff counts/status map/priority list/My Actions match DB predicates, stable order, five-row cap | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| API-12 | API/filter | AC-13 | `statusGroup=open` and `priorityGroup=high-or-urgent` compose with owner/assignment filters; contradictory filters return 400 | `server/tests/lab-04/dashboard-drilldown.api.test.ts` | Planned |
| SEC-01 | Authorization | AC-03 | Requester direct POST/PATCH/DELETE Action denied; owned GET allowed | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| SEC-02 | Authorization | AC-03, AC-11 | Cross-owner Requester Ticket/Action/dashboard access is denied without data leakage | `server/tests/lab-04/actions-taken.api.test.ts`, `requester-dashboard.api.test.ts` | Planned |
| SEC-03 | Authorization | AC-09 | Administrator cannot change Ticket status; inactive users cannot write | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| MIG-01 | Migration/regression | AC-14 | Upgrade representative populated Lab 3 DB preserves IDs, ownership, Attachment bytes/metadata, comments/notes/status | `server/tests/lab-04/migration.regression.test.ts` | Planned |
| SEED-01 | Migration/seed | AC-15 | Seed twice: stable row counts/IDs, no duplicate or erased non-seed rows, all dashboard edge cases | `server/tests/lab-04/seed.regression.test.ts` | Planned |
| UI-01 | UI component | AC-04 | Multiple Action display order, performer and assignee labels, terminal read-only state | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-02 | UI component | AC-05 | Conditional follow-up/result/reason validation, field-level feedback | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-03 | UI/workflow | AC-06 | Only valid status buttons; completion/cancellation confirmation; no terminal edit/delete | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-04 | UI/concurrency | AC-08 | 409 preserves draft, explains stale state, offers refresh/reapply | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-05 | UI component | AC-11 | Requester Dashboard cards/lists and empty states render API values/links | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| UI-06 | UI component | AC-12 | Staff Dashboard cards/status counts/urgent list/current Actions and zero state render accurately | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-07 | UI/navigation | AC-13 | Each card/row reaches correct queue filter, Ticket, or Actions section | `client/tests/lab-04/RequesterDashboard.test.tsx`, `StaffDashboard.test.tsx` | Planned |
| UI-10 | UI/navigation | AC-13 | My Tickets/Staff Queue initialize exact status/priority/owner filters from dashboard URL and preserve while paginating | `client/tests/lab-04/DashboardDrilldown.test.tsx` | Planned |
| UI-08 | UI resilience | AC-17 | Loading, error, forbidden, validation, no-results, duplicate-submit and draft preservation | `client/tests/lab-04/ActionsTaken.test.tsx`, both dashboard tests | Planned |
| UI-09 | UI style/accessibility | AC-18 | Accessible names, labels/errors, keyboard/focus, status text beyond color, no overlap/clipping | `client/tests/lab-04/ResponsiveAccessibility.test.tsx` | Planned |
| VIS-01 | Responsive/visual | AC-18 | Screens at 1280×900, 820×1000, 390×844; no page horizontal overflow; capture named states | `e2e/lab-04/visual-evidence.spec.ts` | Planned |
| PERF-01 | Performance smoke | AC-12 | Dashboard and ordered Action list with realistic seed volume, bounded payload/query plan, measured response budget | `server/tests/lab-04/dashboard-performance.test.ts` | Planned |
| E2E-01 | E2E | AC-01–07 | Staff creates/assigns/edits/transitions Actions; multiple actors; inactive assignee rejected; Requester read-only | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | E2E/workflow | AC-09–10 | Ticket cannot resolve before gate; valid completion then resolve/close/reopen flow; cancelled terminal | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-03 | E2E/privacy | AC-11–13 | Requester/staff dashboard values, zero states, drill-down and owner isolation | `e2e/lab-04/dashboards.spec.ts` | Planned |
| REG-01 | Regression/E2E | AC-16 | Representative authentication, My Tickets, Ticket Detail, Attachment, Public Comment, Staff Queue, Internal Note, Admin User Management | existing Lab 1–3 tests plus `e2e/lab-04/regression.spec.ts` | Planned |
| REL-01 | Release/CI | AC-19 | Full server/client/build/migration/seed/E2E/regression/visual jobs green on recorded final `main` SHA | GitHub Actions run URL + workflow logs | Planned |
| SUB-01 | Submission audit | AC-20 | One PDF, exact nine headings/order, working links, readable captures, claims match released SHA | `04_Assignment/report_lab04_66070503489.pdf` | Planned |

## Required test commands

Use repository scripts and exact current arguments (document any adjustments):

```bash
npm --prefix server test -- tests/lab-04 --reporter=dot
npm --prefix client test -- tests/lab-04 --reporter=dot
npm run build
npm --prefix server exec -- prisma validate --schema prisma/schema.prisma
npm run test:e2e
npm run test:evidence
```

Migration and seed tests require isolated PostgreSQL test data. Run them twice from the Lab 3 schema snapshot and confirm non-seed rows survive. Capture exact output and commit SHA in `artifacts/lab-04/ci/`; do not commit credentials or DB dumps.

## Local verification log (2026-10-04)

These results were run against the source now committed as `c1424ef` on `feature/lab4-action-model`; they are not final-release results.

| Check | Result | Evidence/limitation |
|---|---|---|
| Server TypeScript build | Pass | `npm run build` in `server/` exited 0. |
| Server focused unit tests | Pass | `npx vitest run tests/lab-04/action-validation.unit.test.ts tests/lab-04/ticket-workflow.unit.test.ts tests/lab-03/query-validation.unit.test.ts --reporter=dot`: 3 files, 18 tests passed. |
| Client TypeScript check | Pass | `npx tsc --noEmit` in `client/` exited 0. |
| Focused client regression and Lab 4 component tests | Pass | `npx vitest run tests/lab-04 tests/lab-02/MyTickets.test.tsx tests/lab-02/RequesterTicketDetail.test.tsx tests/lab-03/AdministratorTicketDetail.test.tsx tests/lab-03/StaffTicketDetail.test.tsx tests/lab-03/StaffTicketQueue.test.tsx --reporter=dot`: 8 files, 23 tests passed. |
| Client production build | Pass | `npm run build` in `client/` exited 0; Vite emitted production assets. |
| Full client suite | Pass | `npx vitest run --reporter=dot` in `client/`: 16 files, 55 tests passed. |
| Prisma validation | Pass | `npx prisma validate --schema prisma/schema.prisma` exited 0. |
| Prisma generation | Pass | `npx prisma generate` exited 0 and generated Prisma Client v5.22.0. |
| PostgreSQL migration/API tests/E2E | Blocked | No PostgreSQL service is listening on `localhost:5432`; `prisma migrate deploy` returned P1001. No database-backed or browser E2E result is claimed. |
| Peer review, staging CI, release CI, visual/accessibility evidence | Pending | Must be populated from actual PR/CI/screenshots before final PDF. |
| Playwright discovery | Pass | `npx playwright test --config=client/playwright.config.ts --list`: 15 tests in 9 files discovered; this does not execute browser flows. |
| Initial PR CI at `82cb4e3` | Fail; fixes pending rerun | One API test used the owner session for the supposedly cross-owner Ticket; the Staff status links' accessible names concatenated label and count (`New1`). The test now uses the other Requester's session, and the links now expose explicit status/count accessible names. |

The traceability matrix above remains **Planned** as a final-release status ledger. Update every row against the exact released SHA and link the corresponding output; explain skips/blocks rather than inferring a pass from file existence.
