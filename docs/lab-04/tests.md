# Lab 4 Test Evidence and Traceability

**Evidence baseline:** Cached `origin/main` is `93e8d81e1e9743677dcc3e2a09d8495c0f302823`, which merges PR #61. The prior released implementation passed final-main CI in [run 37747697657](https://github.com/Richyboy170/toktickit/actions/runs/37747697657). PR #61's documentation and regression assertions passed [run 37765483898](https://github.com/Richyboy170/toktickit/actions/runs/37765483898): server 23 files / 72 tests, client 16 files / 59 tests, 15 E2E scenarios, and the additional visual capture. These are CI results, not local reruns; no separate post-merge main run is recorded here. The score-remediation branch adds API and UI workflow coverage, separates dashboard suites, and adds seed/performance checks. All server, client, and E2E/visual jobs passed in [PR #64 run 39101398642](https://github.com/Richyboy170/toktickit/actions/runs/39101398642), including the populated migration check, seed-idempotency check, bounded dashboard/Action query smoke, builds, and audits. Local verification also passed: the complete client suite (17 files / 71 tests), focused Ticket workflow file (12 tests), server DB-free unit suites (2 files / 15 tests), and both production builds. These CI results are not local reruns.

## Test case traceability

The columns below follow Section 10: Test ID, Type, Requirement/AC, What It Tests, Expected Result, Automated Test File, and Final status. Branch-specific results cite PR #64 CI where applicable; the separate release-to-main run remains outstanding.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| VAL-01 | Unit | AC-05 | Trims Action text and accepts a complete creation payload | Normalized valid payload | `server/tests/lab-04/action-validation.unit.test.ts` | Pass - PR #61 server CI |
| VAL-02 | Unit | AC-05 | Rejects invalid date, blank description, and non-positive assignee ID | Validation errors; no write | `server/tests/lab-04/action-validation.unit.test.ts` | Pass - PR #61 server CI |
| VAL-03 | Unit | AC-01, AC-05 | Rejects client-supplied Action identity and Ticket link | Validation error | `server/tests/lab-04/action-validation.unit.test.ts` | Pass - PR #61 server CI |
| VAL-04 | Unit | AC-05 | Requires follow-up note when selected and clears it when disabled | Conditional validation is enforced | `server/tests/lab-04/action-validation.unit.test.ts` | Pass - PR #61 server CI |
| VAL-05 | Unit | AC-08 | Requires update version and validates nullable fields | Stale/malformed inputs are rejected | `server/tests/lab-04/action-validation.unit.test.ts` | Pass - PR #61 server CI |
| ACT-01 | Unit | AC-06 | Covers the Action transition policy table | Only specified edges are allowed | `server/tests/lab-04/action-validation.unit.test.ts` | Pass - PR #61 server CI |
| API-ACT-01 | API | AC-01, AC-04, AC-07 | Authenticated performer, active assignee, inactive-assignee rejection, chronological Action order and ID tie-break | Correct actor/assignee; invalid assignee rejected; stable order | `server/tests/lab-04/actions-taken.api.test.ts` | Pass - PR #64 server CI |
| API-ACT-02 | API | AC-03 | Requester ownership limits and denied Action writes | Owned read succeeds; cross-owner read is hidden; write is forbidden | `server/tests/lab-04/actions-taken.api.test.ts` | Pass - PR #61 server CI |
| API-ACT-03 | API | AC-06, AC-08 | Action version checks, valid transitions, and terminal immutability | Stale/invalid writes fail without changing persisted state | `server/tests/lab-04/actions-taken.api.test.ts` | Pass - PR #61 server CI |
| API-ACT-04 | API | AC-02 | Another Staff member performs and reassigns an Action | Parent Ticket `ownerId` remains unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Pass - PR #64 server CI |
| API-TICKET-01 | API | AC-09 | Table-driven matrix of all 64 current-status/target-status pairs | Allowed edges persist; unchanged or invalid edges return the specified conflict and preserve state | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass - PR #64 server CI |
| API-TICKET-02 | API | AC-09, AC-10 | Requester/Admin denial, cancellation confirmation/reason, stale Ticket version, active-owner requirement | Role or workflow violation is rejected without changing Ticket state | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass - PR #64 server CI |
| API-TICKET-03 | API | AC-10 | No completed Action, incomplete non-cancelled Action, advisory Requester indication, and completed work with cancelled history | Resolution requires an active owner, at least one completed Action, and no incomplete non-cancelled Action | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass - PR #64 server CI |
| UNIT-TICKET-01 | Unit | AC-10 | Active owner and completed Action predicate | Missing owner or completed work blocks resolution | `server/tests/lab-04/ticket-workflow.unit.test.ts` | Pass - PR #61 server CI |
| UNIT-TICKET-02 | Unit | AC-10 | Cancelled history handling | Cancelled Action does not block otherwise eligible resolution | `server/tests/lab-04/ticket-workflow.unit.test.ts` | Pass - PR #61 server CI |
| API-DASH-REQ-01 | API | AC-11, AC-13 | Requester metrics against DB counts, owned/recent list limits, and open-ticket filter | Counts match DB; lists are owned and bounded; filter totals agree | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass - PR #64 server CI |
| API-DASH-REQ-02 | API | AC-11 | Requester cannot select another account's identity | Dashboard uses the authenticated Requester | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass - PR #64 server CI |
| API-DASH-REQ-03 | API | AC-11 | Requester account with no Tickets | Zero metrics and empty recent lists | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass - PR #64 server CI |
| API-DASH-STAFF-01 | API | AC-12, AC-13 | All eight status counts, list caps, and metric-to-queue filter totals | Counts and filters agree; result lists remain bounded | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass - PR #64 server CI |
| API-DASH-STAFF-02 | API | AC-12 | Role crossover between Requester and Staff dashboards | Wrong-role access returns forbidden | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass - PR #64 server CI |
| UI-ACT-01 | Component | AC-03, AC-06, AC-17 | Requester Action history is read-only, including terminal Actions | No mutation controls are available | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass - PR #61 client CI |
| UI-ACT-02 | Component | AC-05, AC-08, AC-17 | Staff default assignee and recoverable form failure | Assignee defaults correctly and draft values remain | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass - PR #61 client CI |
| UI-ACT-03 | Component | AC-04 | Action history with a different performer and assignee | Correct person appears under each distinct label | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass - PR #64 client CI; local full client suite |
| UI-TICKET-01 | Component | AC-09, AC-17 | Staff status options, cancellation confirmation, Admin read-only controls, and safe update failure | Only valid transitions appear; consequential actions are confirmed; errors hide server details | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pass - PR #64 client CI; local focused file and full client suite |
| UI-TICKET-02 | Component | AC-10 | Requester advisory resolution indication | Requester can send advisory feedback but cannot formally change status | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pass - PR #64 client CI; local focused file and full client suite |
| UI-REQ-01 | Component | AC-11, AC-13 | Requester metrics, recent Tickets, and drill-down links | Values, owned lists, and links render correctly | `client/tests/lab-04/RequesterDashboard.test.tsx` | Pass - PR #61 client CI |
| UI-REQ-02 | Component | AC-17 | Requester Dashboard safe failure and retry | Safe message and retry control are available | `client/tests/lab-04/RequesterDashboard.test.tsx` | Pass - PR #61 client CI |
| UI-STAFF-01 | Component | AC-12, AC-13 | Staff metrics, statuses, urgent Tickets, and assigned Action links | Metrics and navigation render correctly | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass - PR #61 client CI |
| UI-STAFF-02 | Component | AC-12, AC-17 | Zero counts and empty states | Zero values remain visible with useful empty-state text | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass - PR #61 client CI |
| UI-STAFF-03 | Component | AC-17 | Safe failure, backend-detail hiding, and retry | Safe error and retry render | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass - PR #61 client CI |
| UI-STAFF-04 | Component | AC-17 | Forbidden dashboard response | Forbidden state has no retry control | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass - PR #61 client CI |
| UI-STAFF-05 | Component | AC-17 | Loading announcement | Pending state uses a status announcement | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass - PR #61 client CI |
| MIG-01 | Integration | AC-14 | Populated Lab 3 migration-preservation comparison | Existing IDs/data and zero-Action Tickets survive migration | `server/scripts/verify-lab4-migration-preserves-data.ts` | Pass - runs 37307397634 and 37765483898 |
| SEED-01 | Integration | AC-15 | Seed rerun compares fixture keys, counts, and IDs, including child counts | Second run creates no duplicate or missing seed fixture and changes no identities | `server/scripts/verify-lab4-seed-idempotency.ts` | Pass - PR #64 server CI disposable database |
| PERF-01 | Performance smoke | AC-12, AC-15 | 240-ticket/720-action disposable fixture; dashboard query bundles and stable Action ordering | Result shapes/order are correct and three timed query bundles stay within 5 seconds; fixture data is removed transactionally | `server/scripts/verify-lab4-performance-smoke.ts` | Pass - PR #64 server CI disposable database |
| E2E-ACT-01 | E2E | AC-05, AC-06, AC-18 | Create, start, and complete Action in browser | Staff flow succeeds and history updates | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass - PR #61 E2E CI |
| E2E-TICKET-01 | E2E | AC-09, AC-10 | Resolution gate and cancelled Action history | Browser flow blocks incomplete work and allows eligible resolution | `e2e/lab-04/ticket-resolution.spec.ts` | Pass - PR #64 E2E CI; API matrix passed PR #64 server CI |
| E2E-DASH-01 | E2E | AC-11, AC-13, AC-16, AC-18 | Requester dashboard navigation and read-only Action history | Links and Requester permissions work end to end | `e2e/lab-04/dashboards.spec.ts` | Pass - PR #61 E2E CI |
| E2E-DASH-02 | E2E | AC-12, AC-13, AC-16, AC-18 | Staff/Admin dashboard navigation and Ticket Queue | Dashboard cards open matching queues/details | `e2e/lab-04/dashboards.spec.ts` | Pass - PR #61 E2E CI |
| VIS-01 | Visual/accessibility | AC-18 | Responsive desktop/tablet/mobile captures and keyboard/focus checks | No reported horizontal overflow; visual evidence is readable | `e2e/lab-03/visual-evidence.spec.ts`, `artifacts/lab-04/screenshots/` | Pass - PR #61 visual capture; no manual screen-reader/device test claimed |
| REG-01 | Regression | AC-16 | Prior Lab 1-3 suites in server, client, and E2E jobs | Existing behavior remains passing | Repository test suites / CI workflow | Pass - PR #61 CI; 15 E2E scenarios |
| REL-01 | Release CI | AC-19 | Previously released `main` server, client, E2E, build, and audit jobs | All required jobs pass for released SHA | GitHub Actions workflow | Pass - run 37747697657 for the prior release; remediation release pending |
| SUB-01 | Submission evidence | AC-20 | Nine-part report, final evidence review, and student reflection | Report/PDF matches the released SHA and required evidence; reflection is student-confirmed | `04_Assignment/report_lab04.md`, `04_Assignment/report_lab04_66070503489.pdf` | Pending final release and student confirmation; not a software test |

## Required file inventory

| Area | Required/implemented files |
|---|---|
| Server validation and Actions | `server/tests/lab-04/action-validation.unit.test.ts`, `server/tests/lab-04/actions-taken.api.test.ts` |
| Server Ticket workflow | `server/tests/lab-04/ticket-workflow.unit.test.ts`, `server/tests/lab-04/ticket-workflow.api.test.ts` |
| Server dashboards | `server/tests/lab-04/requester-dashboard.api.test.ts`, `server/tests/lab-04/staff-dashboard.api.test.ts` |
| Client Actions and workflow | `client/tests/lab-04/ActionsTaken.test.tsx`, `client/tests/lab-04/TicketWorkflow.test.tsx` |
| Client dashboards | `client/tests/lab-04/RequesterDashboard.test.tsx`, `client/tests/lab-04/StaffDashboard.test.tsx` |
| Seed/performance checks | `server/scripts/verify-lab4-seed-idempotency.ts`, `server/scripts/verify-lab4-performance-smoke.ts` |

The required file names now exist on the score-remediation branch. The existing combined `dashboards.api.test.ts` was replaced by the two named dashboard suites; its assertions were moved without changing the covered outcomes. This branch still needs CI evidence before its database-backed statuses can be marked passing.

## Evidence limits and follow-up

- The application workspace has no local PostgreSQL server or Docker engine. The API matrix, split dashboard API files, seed rerun, and performance smoke have not been run locally; CI uses the workflow's disposable PostgreSQL 17 service.
- The performance smoke exercises the same Prisma query shapes as the dashboard routes inside a transaction. Its fixtures are isolated and deleted before the transaction commits. The 5-second bound is intentionally generous and should be confirmed by the CI run.
- Visual fixtures are deterministic representative UI content, not live database records. No manual screen-reader or physical-device test is claimed; see [`accessibility-review.md`](./accessibility-review.md).
- The existing committed screenshots are indexed in [`artifacts/lab-04/README.md`](../../artifacts/lab-04/README.md). Previously released-main screenshot evidence is available in the `toktickit-playwright-evidence` artifact from run 37747697657.
- Issue #53 covers final report/PDF and evidence review. Do not mark it complete while report assembly, evidence review, or student reflection confirmation is outstanding.
