# Lab 4 Test Evidence and Traceability

**Status:** Final `main` is `6e6d645d61621f8a74166947326f59e5b3d141b4`; server, client, and E2E jobs passed in [run 37747697657](https://github.com/Richyboy170/toktickit/actions/runs/37747697657). The assertions and dashboard-state cases in [PR #61](https://github.com/Richyboy170/toktickit/pull/61) passed in [run 37765483898](https://github.com/Richyboy170/toktickit/actions/runs/37765483898): server 23 files / 72 tests, client 16 files / 59 tests, 15 E2E scenarios, and the additional visual capture. These are CI results; the suites were not rerun locally. Statuses below refer to those CI runs unless stated otherwise.

## Test case traceability

Each row names an implemented test case or CI verification step. The status identifies the evidence source; it does not imply a local rerun.

| Test ID | AC | Test case and file | Status |
|---|---|---|---|
| VAL-01 | AC-05 | Trims text and accepts a complete creation payload — `server/tests/lab-04/action-validation.unit.test.ts` | Pass — PR #61 server CI |
| VAL-02 | AC-05 | Rejects invalid date, blank description, and non-positive assignee ID — `server/tests/lab-04/action-validation.unit.test.ts` | Pass — PR #61 server CI |
| VAL-03 | AC-01, AC-05 | Rejects client-supplied Action identity and Ticket link — `server/tests/lab-04/action-validation.unit.test.ts` | Pass — PR #61 server CI |
| VAL-04 | AC-05 | Requires and trims the follow-up note; clears it when follow-up is disabled — `server/tests/lab-04/action-validation.unit.test.ts` | Pass — PR #61 server CI |
| VAL-05 | AC-08 | Requires update version and validates nullable fields — `server/tests/lab-04/action-validation.unit.test.ts` | Pass — PR #61 server CI |
| ACT-01 | AC-06 | Parameterized Action transition policy (8 from/to cases) — `server/tests/lab-04/action-validation.unit.test.ts` | Pass — PR #61 server CI |
| API-ACT-01 | AC-01, AC-04, AC-07 | Uses authenticated performer, rejects inactive assignee, accepts active Staff assignee, and checks chronological order with ID tie-break — `server/tests/lab-04/actions-taken.api.test.ts` | Pass — PR #61 server CI; includes added assertions |
| API-ACT-02 | AC-03 | Limits Requester reads to owned Tickets and denies Action writes — `server/tests/lab-04/actions-taken.api.test.ts` | Pass — PR #61 server CI |
| API-ACT-03 | AC-06, AC-08 | Enforces version checks, allowed Action transitions, and terminal-record immutability — `server/tests/lab-04/actions-taken.api.test.ts` | Pass — PR #61 server CI |
| UNIT-TICKET-01 | AC-10 | Requires active owner and at least one completed Action — `server/tests/lab-04/ticket-workflow.unit.test.ts` | Pass — PR #61 server CI |
| UNIT-TICKET-02 | AC-10 | Allows cancelled history only when remaining Actions are complete — `server/tests/lab-04/ticket-workflow.unit.test.ts` | Pass — PR #61 server CI |
| API-DASH-01 | AC-11, AC-13 | Compares Requester metrics to DB counts, bounds and scopes recent lists, checks filters — `server/tests/lab-04/dashboards.api.test.ts` | Pass — PR #61 server CI |
| API-DASH-02 | AC-12, AC-13 | Checks all eight Staff status counts and matches dashboard metrics to queue filters — `server/tests/lab-04/dashboards.api.test.ts` | Pass — PR #61 server CI |
| API-DASH-03 | AC-11, AC-12 | Rejects role crossover and prevents Requester identity selection — `server/tests/lab-04/dashboards.api.test.ts` | Pass — PR #61 server CI |
| UI-ACT-01 | AC-03, AC-06, AC-17 | Keeps Requester Action history read-only, including terminal records — `client/tests/lab-04/ActionsTaken.test.tsx` | Pass — PR #61 client CI |
| UI-ACT-02 | AC-05, AC-08, AC-17 | Defaults assignee to current Staff and preserves form values after recoverable error — `client/tests/lab-04/ActionsTaken.test.tsx` | Pass — PR #61 client CI |
| UI-REQ-01 | AC-11, AC-13 | Shows Requester metrics, recent Tickets, and exact drill-down links — `client/tests/lab-04/RequesterDashboard.test.tsx` | Pass — PR #61 client CI |
| UI-REQ-02 | AC-17 | Provides retry path for safe Requester Dashboard failure — `client/tests/lab-04/RequesterDashboard.test.tsx` | Pass — PR #61 client CI |
| UI-STAFF-01 | AC-12, AC-13 | Shows Staff metrics, statuses, urgent Tickets, and assigned Action links — `client/tests/lab-04/StaffDashboard.test.tsx` | Pass — PR #61 client CI |
| UI-STAFF-02 | AC-12, AC-17 | Shows zero counts and empty states — `client/tests/lab-04/StaffDashboard.test.tsx` | Pass — PR #61 client CI |
| UI-STAFF-03 | AC-17 | Shows safe failure, hides backend details, and retries — `client/tests/lab-04/StaffDashboard.test.tsx` | Pass — PR #61 client CI |
| UI-STAFF-04 | AC-17 | Shows forbidden state without retry control — `client/tests/lab-04/StaffDashboard.test.tsx` | Pass — PR #61 client CI |
| UI-STAFF-05 | AC-17 | Announces loading while data is pending — `client/tests/lab-04/StaffDashboard.test.tsx` | Pass — PR #61 client CI |
| E2E-ACT-01 | AC-05, AC-06, AC-18 | Records, starts, and completes an Action in the browser — `e2e/lab-04/actions-taken-flow.spec.ts` | Pass — PR #61 E2E CI |
| E2E-TICKET-01 | AC-09, AC-10 | Blocks resolution before completed work and permits completed work with cancelled history — `e2e/lab-04/ticket-resolution.spec.ts` | Pass — PR #61 E2E CI |
| E2E-DASH-01 | AC-11, AC-13, AC-16, AC-18 | Exercises Requester Dashboard drill-down and read-only Action history — `e2e/lab-04/dashboards.spec.ts` | Pass — PR #61 E2E CI |
| E2E-DASH-02 | AC-12, AC-13, AC-16, AC-18 | Exercises Staff/Admin dashboard navigation and Ticket Queue — `e2e/lab-04/dashboards.spec.ts` | Pass — PR #61 E2E CI |
| VIS-01 | AC-18 | Captures responsive Lab 3/Lab 4 visual evidence — `e2e/lab-03/visual-evidence.spec.ts`, CI artifact `toktickit-playwright-evidence` | Pass — PR #61 visual capture in run 37765483898 |
| MIG-01 | AC-14 | Runs populated Lab 3 migration-preservation comparison — `server/scripts/verify-lab4-migration-preserves-data.ts` via `npm run test:migration-preservation` | Pass — runs 37307397634 and 37765483898 |
| SEED-01 | AC-15 | Applies migration and runs Prisma seed — CI workflow steps `prisma migrate deploy`, `prisma:seed` | Pass — PR #61 server CI; seed command ran once in this workflow |
| REG-01 | AC-16 | Prior-lab regression suites included in server, client, and E2E jobs — repository test suites | Pass — PR #61 CI; 15 E2E scenarios |
| REL-01 | AC-19 | Final-main server, client, and E2E jobs — [workflow 37747697657](https://github.com/Richyboy170/toktickit/actions/runs/37747697657) | Pass — final released SHA |
| SUB-01 | AC-20 | Nine-part PDF, evidence review, and student reflection — tracked in Issue #53; no corresponding file in this application repository | Pending — not a software test |

## Coverage limits and file inventory

- `server/tests/lab-04/ticket-workflow.unit.test.ts` tests the resolution predicate, while `e2e/lab-04/ticket-resolution.spec.ts` exercises the browser-to-server flow. There is no dedicated `ticket-workflow.api.test.ts` and no `client/tests/lab-04/TicketWorkflow.test.tsx`; the contract's original separate-file plan was not implemented.
- Requester and Staff dashboard API cases are combined in `server/tests/lab-04/dashboards.api.test.ts`; there are no separate `requester-dashboard.api.test.ts` or `staff-dashboard.api.test.ts` files.
- AC-02's invariant that Actions do not change a Ticket's primary owner is not directly asserted by the current Lab 4-specific tests. The E2E test covers a representative transition path, not the full Ticket status matrix or all role combinations in a dedicated API suite.
- The Staff dashboard API test checks status counts, list caps, and metric-to-filter totals, but does not assert every list-ordering rule or every empty-database case.
- The seed command passes in CI, but this workflow invokes it once; no Lab 4 test explicitly reruns seed and compares duplicate counts. No separate performance smoke test is recorded.
- The visual fixtures are deterministic representative UI content, not live database records. No manual screen-reader or physical-device test is claimed; see [`accessibility-review.md`](./accessibility-review.md).

The screenshots committed in [`artifacts/lab-04/screenshots/`](../../artifacts/lab-04/screenshots/) are indexed by [`artifacts/lab-04/README.md`](../../artifacts/lab-04/README.md). Final-main screenshot evidence is available in the `toktickit-playwright-evidence` artifact from run 37747697657.
