# Lab 3 Test Plan and Traceability

**Status:** the Test DD plan was prepared with the Lab 3 contract before implementation. Approved release PR #42 merged the complete increment into `main` commit `161ddd8454c421df4701ad740414245bda68ebff`. Final-main [TokTickIT CI run 35311307446](https://github.com/Richyboy170/toktickit/actions/runs/35311307446) passed migration/seed, full server and client suites, builds, audits, database-backed Playwright, responsive visual capture, and artifact upload. Local Vitest results below were refreshed on 17 September 2026; local database-backed cases remain blocked only because PostgreSQL is unavailable at `localhost:5432`.

## 1. Test strategy

The plan covers unit policy and workflow tests; Express/Supertest API and authorization tests; Prisma migration, seed, and Lab 2 regression tests; React component, style, responsive, and accessibility tests; and Playwright role and responsive flows. Tests use a database whose name contains `test` or `e2e` when PostgreSQL is available. The server compatibility header is enabled only in the test/e2e process; Lab 3 client screens use the authenticated cookie identity.

## 2. Planned coverage and traceability

| ID | Type | Requirement / behavior | Planned automated file | Final status |
|---|---|---|---|---|
| UNIT-01 | Unit | Password boundaries, scrypt hashing, confirmation, and no plaintext | `server/tests/lab-03/auth.unit.test.ts` | Pass |
| UNIT-02 | Unit | Complete status matrix, confirmation, and active-owner rule | `server/tests/lab-03/auth.unit.test.ts` | Pass |
| UNIT-03 | Unit/API | Requester and Queue query limits, enums, sort, and pagination | `server/tests/lab-03/query-validation.unit.test.ts`, `server/src/ticket-validation.ts`, `server/tests/lab-02/my-tickets.api.test.ts`, `server/tests/lab-03/staff-queue.api.test.ts`, and `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass locally for shared schema validation; API and staging E2E coverage also passed |
| UNIT-04 | Unit/API/UI | Comment and Internal Note trimming, length, visibility, and safe rendering | `server/src/routes/messages.ts`, `server/tests/lab-03/comments-notes.api.test.ts`, and `client/tests/lab-03/StaffTicketDetail.test.tsx` | Covered by shared validation/API boundary and UI tests; staging CI passed |
| UNIT-05 | Unit/API/regression | Session identity, requester ownership, logout cleanup, and idempotent submission behavior | `server/tests/lab-03/auth.unit.test.ts`, `server/tests/lab-03/authorization.api.test.ts`, `client/tests/lab-03/RequesterRegression.test.tsx`, and `server/tests/lab-02/create-ticket.api.test.ts` | Covered by existing unit, authorization, regression, and Lab 2 API tests; staging CI passed |
| API-01/02/03/04 | API/security | Login, generic invalid credentials, inactive accounts, rate limit, restricted session, logout, expiry, password rotation | `server/tests/lab-03/auth.api.test.ts` | Boundary Pass; database cases blocked |
| SEC-01/02 | Authorization | Unauthenticated/restricted role boundaries, supplied requester ID, neutral cross-owner errors | `server/tests/lab-03/authorization.api.test.ts` | Boundary Pass; database cases blocked |
| MIG-01 | Migration/integration | Preserve User/Requester IDs, Ticket and Attachment relationships, metadata, and bytes | `server/prisma/migrations/20260915090000_lab03_users_auth_workflow/migration.sql` plus the staging CI `server` job | Pass in staging CI; local execution remains blocked by unavailable PostgreSQL |
| SEED-01 | Integration | Idempotent seed role mix, inactive accounts, all statuses, priorities, comments, notes | `server/prisma/seed.ts` plus the staging CI `server` job | Pass in staging CI; local execution remains blocked by unavailable PostgreSQL |
| API-05 | API/regression | Authenticated Requester create/list/detail and Attachment lifecycle | Lab 2 API suites, `client/tests/lab-03/RequesterRegression.test.tsx`, and staging E2E workflow | Pass in staging CI; local database execution remains blocked |
| API-06/07 | API/security | Public Comments, resolution indication, Internal Notes visibility and append-only behavior | `server/tests/lab-03/comments-notes.api.test.ts` | Boundary Pass; database cases blocked |
| API-08 | API | Staff Queue search, filters, sorting, pagination, empty/no-results/failure | `server/tests/lab-03/staff-queue.api.test.ts` | Boundary Pass; database cases blocked |
| API-09/10/11/12 | API/security | Assignment, claim/reassign, IT Priority, status matrix, detail fields and Attachments; Administrator read-only detail | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Boundary Pass; database cases blocked locally; Administrator route regression added |
| API-13/14/15/16 | API/security | Administrator list/search/filter/create/edit/reset and safety rules | `server/tests/lab-03/users-admin.api.test.ts` | Boundary Pass; database cases blocked |
| API-17 | API/security | Origin checks, malformed JSON, safe error envelope, missing resources, no stack leakage | `server/tests/lab-03/hardening.api.test.ts` | Pass |
| UI-01 | Component | Login validation, busy/safe errors, role destinations, inactive account | `client/tests/lab-03/Login.test.tsx` | Pass: 9 tests |
| UI-02 | Component | Mandatory and voluntary Change Password rules and continuation | `client/tests/lab-03/ChangePassword.test.tsx` | Pass |
| UI-03 | Regression | Authenticated Requester screens, comments, resolution, and no selector | `client/tests/lab-03/RequesterRegression.test.tsx` | Pass |
| UI-04 | Component | Queue controls, data states, badges, pagination, and retry | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass: 4 tests |
| UI-05 | Component | Staff Detail assignment, priority, valid transitions, confirmation, notes, comments, files | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-06 | Component | Minimal User Management, validation, create/edit/reset, safety feedback | `client/tests/lab-03/UserManagement.test.tsx` | Pass: 3 tests |
| UI-07 | Style/accessibility | Role navigation, labels, focus, text-backed badges, responsive structure | `client/tests/lab-02/ResponsiveStyle.test.tsx` plus Lab 2 structure tests | Pass for local client suite |
| E2E-01 | Browser | Login, first-login change, role shell, logout, direct access after logout | `e2e/lab-03/authentication.spec.ts` | Pass: final-main CI run 35311307446 |
| E2E-02 | Browser/regression | Requester workflow and authenticated ownership continuity | `e2e/lab-02/requester-ticket-flow.spec.ts`, `e2e/lab-03/authentication.spec.ts`, and staged server regression | Pass in staging CI; the Lab 3-specific requester browser file is represented by the combined regression flow |
| E2E-03 | Browser | Staff Queue and Detail workflow | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass: final-main CI run 35311307446 |
| E2E-04 | Browser | Administrator User Management, Staff Ticket Detail read, and next-login password change | `e2e/lab-03/user-administration.spec.ts` | Pass: final-main CI run 35311307446; Administrator read and Staff-only mutation regression included |
| E2E-05 | Responsive | Desktop/tablet/mobile clipping, overflow, and equivalent actions | `e2e/lab-03/visual-evidence.spec.ts` | Pass for all three viewports in fixture capture and staging visual job; no horizontal overflow detected |
| E2E-06 | Release | Safe failure and final release smoke path | Release PR #42 and final-main run 35311307446 | Pass on final `main` commit `161ddd8` |
| VIS-01 | Browser fixture capture | Authentication, Change Password, Requester, Staff Queue/Detail, Administrator screens at desktop/tablet/mobile widths; no horizontal overflow | `e2e/lab-03/visual-evidence.spec.ts` | Pass: 18 PNG captures at 1280x900, 820x1000, and 390x844; staging visual job passed |

The acceptance criteria in `specification.md` are traced to these groups: AC-01 to API/UI/E2E authentication, AC-02 to restricted password change, AC-03 and AC-08/12 to ownership, AC-04/14 to Internal Notes, AC-09/10 to migration and seed, AC-11/13/15 to Requester regression and comments, AC-16 to API/UI Queue, AC-18/19/20/21 to Staff Detail, AC-22 through AC-26 to User Management, AC-27 to safe errors, AC-28 to responsive/accessibility, AC-29 to migration and regression, and AC-30 to release evidence.

## 3. Actual local verification

| Check | Command | Evidence/result |
|---|---|---|
| Server production build | `npm --prefix server run build` | Pass |
| Prisma schema | `DATABASE_URL=<local-test> npm --prefix server exec -- prisma validate --schema server/prisma/schema.prisma` | Pass: schema valid |
| Server Lab 3 boundary/unit suite | `npm --prefix server test -- tests/lab-03 --reporter=dot` | Local: 8 files passed, 21 tests passed, 2 skipped; one database-backed suite blocked by PostgreSQL. The staged merge CI completed its server job before the local follow-up unit file was added. |
| Client build | `npm --prefix client run build` | Pass: Vite production bundle, 47 modules |
| Client suite | `npm --prefix client test -- --reporter=dot` | Pass: 13 files, 48 tests |
| Full server suite | `npm --prefix server test -- --reporter=dot` | Local: 7 files failed and 12 passed because PostgreSQL is unavailable; 1 test failed, 28 passed, and 21 skipped (50 total). Final-main CI run 35311307446 completed the full database-backed server job successfully |
| Database-backed Playwright/E2E | `npm run test:e2e` | Local: blocked by missing PostgreSQL; final-main CI: pass in run 35311307446 |
| UI visual evidence capture | `npm run test:e2e:visual` | Pass: 1 test, 18 PNG captures at 1280x900, 820x1000, and 390x844; API fixtures isolate the UI capture from PostgreSQL |
| GitHub Actions, peer approval, final `main` run | Repository/remote evidence | PRs #33, #41, and #42 approved; `main` commit `161ddd8`; final-main run 35311307446 passed; Issues #34-#40 closed |

The local server and client runs were executed with elevated subprocess permission because Vitest/esbuild cannot spawn under the default sandbox. The PostgreSQL limitation applies only to this workstation; final-main CI run 35311307446 supplies the database-backed migration, seed, server, client, browser, visual-capture, and artifact evidence for the released source. The final artifact is [10533875135](https://api.github.com/repos/Richyboy170/toktickit/actions/artifacts/10533875135/zip).
