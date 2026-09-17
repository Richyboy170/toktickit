# Lab 3 Test Plan and Traceability

**Status:** the Test DD plan was prepared with the Lab 3 contract before implementation. Local results below were updated on 16 September 2026. Database-backed checks are blocked locally because PostgreSQL is unavailable at `localhost:5432`, while GitHub Actions run [35106401012](https://github.com/Richyboy170/toktickit/actions/runs/35106401012) passed the configured server, client, database-backed Playwright, visual capture, and artifact jobs on the feature branch.

## 1. Test strategy

The plan covers unit policy and workflow tests; Express/Supertest API and authorization tests; Prisma migration, seed, and Lab 2 regression tests; React component, style, responsive, and accessibility tests; and Playwright role and responsive flows. Tests use a database whose name contains `test` or `e2e` when PostgreSQL is available. The server compatibility header is enabled only in the test/e2e process; Lab 3 client screens use the authenticated cookie identity.

## 2. Planned coverage and traceability

| ID | Type | Requirement / behavior | Planned automated file | Final status |
|---|---|---|---|---|
| UNIT-01 | Unit | Password boundaries, scrypt hashing, confirmation, and no plaintext | `server/tests/lab-03/auth.unit.test.ts` | Pass |
| UNIT-02 | Unit | Complete status matrix, confirmation, and active-owner rule | `server/tests/lab-03/auth.unit.test.ts` | Pass |
| UNIT-03 | Unit | Requester and Queue query limits, enums, sort, and pagination | `server/tests/lab-03/query-validation.unit.test.ts` | Pending (planned file not present) |
| UNIT-04 | Unit | Comment and Internal Note trimming, length, and safe rendering | `server/tests/lab-03/comment-note-validation.unit.test.ts` | Pending (planned file not present) |
| UNIT-05 | Unit | Session identity, requester ownership, and idempotent submission token | `server/tests/lab-03/ticket-regression.unit.test.ts` | Pending (planned file not present) |
| API-01/02/03/04 | API/security | Login, generic invalid credentials, inactive accounts, rate limit, restricted session, logout, expiry, password rotation | `server/tests/lab-03/auth.api.test.ts` | Boundary Pass; database cases blocked |
| SEC-01/02 | Authorization | Unauthenticated/restricted role boundaries, supplied requester ID, neutral cross-owner errors | `server/tests/lab-03/authorization.api.test.ts` | Boundary Pass; database cases blocked |
| MIG-01 | Migration | Preserve User/Requester IDs, Ticket and Attachment relationships, metadata, and bytes | `server/tests/lab-03/migration.integration.test.ts` | Blocked: PostgreSQL unavailable |
| SEED-01 | Integration | Idempotent seed role mix, inactive accounts, all statuses, priorities, comments, notes | `server/tests/lab-03/seed.integration.test.ts` | Blocked: PostgreSQL unavailable |
| API-05 | API/regression | Authenticated Requester create/list/detail and Attachment lifecycle | `server/tests/lab-03/requester-regression.api.test.ts` plus Lab 2 API suites | Blocked: PostgreSQL unavailable |
| API-06/07 | API/security | Public Comments, resolution indication, Internal Notes visibility and append-only behavior | `server/tests/lab-03/comments-notes.api.test.ts` | Boundary Pass; database cases blocked |
| API-08 | API | Staff Queue search, filters, sorting, pagination, empty/no-results/failure | `server/tests/lab-03/staff-queue.api.test.ts` | Boundary Pass; database cases blocked |
| API-09/10/11/12 | API/security | Assignment, claim/reassign, IT Priority, status matrix, detail fields and Attachments; Administrator read-only detail | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Boundary Pass; database cases blocked locally; Administrator route regression added |
| API-13/14/15/16 | API/security | Administrator list/search/filter/create/edit/reset and safety rules | `server/tests/lab-03/users-admin.api.test.ts` | Boundary Pass; database cases blocked |
| API-17 | API/security | Origin checks, malformed JSON, safe error envelope, missing resources, no stack leakage | `server/tests/lab-03/hardening.api.test.ts` | Pass |
| UI-01 | Component | Login validation, busy/safe errors, role destinations, inactive account | `client/tests/lab-03/Login.test.tsx` | Pass |
| UI-02 | Component | Mandatory and voluntary Change Password rules and continuation | `client/tests/lab-03/ChangePassword.test.tsx` | Pass |
| UI-03 | Regression | Authenticated Requester screens, comments, resolution, and no selector | `client/tests/lab-03/RequesterRegression.test.tsx` | Pass |
| UI-04 | Component | Queue controls, data states, badges, pagination, and retry | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| UI-05 | Component | Staff Detail assignment, priority, valid transitions, confirmation, notes, comments, files | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-06 | Component | Minimal User Management, validation, create/edit/reset, safety feedback | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| UI-07 | Style/accessibility | Role navigation, labels, focus, text-backed badges, responsive structure | `client/tests/lab-03/ResponsiveStyle.test.tsx` plus Lab 2 structure tests | Pass for local client suite |
| E2E-01 | Browser | Login, first-login change, role shell, logout, direct access after logout | `e2e/lab-03/authentication.spec.ts` | Pass: GitHub Actions run 35106401012 |
| E2E-02 | Browser | Requester workflow, comments, resolution, Attachment ownership | `e2e/lab-03/requester-regression.spec.ts` | Blocked: PostgreSQL unavailable |
| E2E-03 | Browser | Staff Queue and Detail workflow | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass: GitHub Actions run 35106401012 |
| E2E-04 | Browser | Administrator User Management, Staff Ticket Detail read, and next-login password change | `e2e/lab-03/user-administration.spec.ts` | Pass: GitHub Actions run 35106401012; Administrator read and Staff-only mutation regression included |
| E2E-05 | Responsive | Desktop/tablet/mobile clipping, overflow, and equivalent actions | `e2e/lab-03/responsive.spec.ts` | Blocked: PostgreSQL unavailable |
| E2E-06 | Release | Safe failure and final release smoke path | `e2e/lab-03/release-readiness.spec.ts` | Blocked: PostgreSQL unavailable |
| VIS-01 | Browser fixture capture | Authentication, Change Password, Requester, Staff Queue/Detail, Administrator screens at desktop/tablet/mobile widths; no horizontal overflow | `e2e/lab-03/visual-evidence.spec.ts` | Pass: local fixture run and GitHub Actions run 35106401012; 18 PNG captures uploaded |

The acceptance criteria in `specification.md` are traced to these groups: AC-01 to API/UI/E2E authentication, AC-02 to restricted password change, AC-03 and AC-08/12 to ownership, AC-04/14 to Internal Notes, AC-09/10 to migration and seed, AC-11/13/15 to Requester regression and comments, AC-16 to API/UI Queue, AC-18/19/20/21 to Staff Detail, AC-22 through AC-26 to User Management, AC-27 to safe errors, AC-28 to responsive/accessibility, AC-29 to migration and regression, and AC-30 to release evidence.

## 3. Actual local verification

| Check | Command | Evidence/result |
|---|---|---|
| Server production build | `npm --prefix server run build` | Pass |
| Prisma schema | `npx prisma validate --schema server/prisma/schema.prisma` | Pass: schema valid |
| Server Lab 3 boundary/unit suite | `npm --prefix server test -- tests/lab-03 --reporter=dot` | CI Pass: 8 files, 21 tests; local database cases remain blocked |
| Client build | `npm --prefix client run build` | Pass: Vite production bundle, 47 modules |
| Client suite | `npm --prefix client test -- --reporter=dot` | Pass: 13 files, 41 tests |
| Full server suite | `npm --prefix server test -- --reporter=dot` | Blocked: 6 suites fail at PostgreSQL `localhost:5432` (P1001); 12 files/26 tests completed, 19 skipped, one category assertion also cannot reach its database |
| Database-backed Playwright/E2E | `npm run test:e2e` | Local: Blocked by missing PostgreSQL; CI: Pass, 11 tests in GitHub Actions run 35106401012 |
| UI visual evidence capture | `npm run test:e2e:visual` | Pass: 1 test, 18 PNG captures at 1280x900, 820x1000, and 390x844; API fixtures isolate the UI capture from PostgreSQL |
| GitHub Actions, peer approval, final `main` run | Repository/remote evidence | CI Pass: run 35106401012; peer approval, staging merge, and final `main` run remain Pending |

The local server run was executed with the required elevated subprocess permission for Vitest/esbuild. The PostgreSQL limitation applies to this workstation's local run and does not change the source, migration, or seed design; the feature-branch CI result above supplies the database-backed evidence. A local database/browser result should still be rerun when PostgreSQL is available.
