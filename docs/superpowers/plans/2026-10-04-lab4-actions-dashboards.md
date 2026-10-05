# Lab 4 Actions Taken, Ticket Workflow, and Dashboards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver Lab 4 Actions Taken, guarded Ticket resolution, role-specific dashboards, regression/hardening evidence, and the nine-part PDF.

**Architecture:** Extend the existing React/Express/Prisma application. Establish Lab 4 contract/API/UI/Test DD in a contract-only PR before implementation. Add the additive data model first, then server policy/APIs, then client screens, and verify the complete increment on `lab4-staging` and `main`.

**Tech Stack:** React, TypeScript, Express, Zod, Prisma 5, PostgreSQL, Vitest, Testing Library, Playwright.

**Spec:** `docs/lab-04/specification.md` and `docs/lab-04/Engineering_Contract.md` (this contract is the approved source; canonical files are created in the first task).

## Global Constraints

- All authorization and ownership checks are server-side; frontend visibility is not authorization.
- Preserve Lab 1–3 data, API behavior, role boundaries, attachments, comments, notes, and Zen Green design.
- `RESOLVED` requires an active primary owner, at least one completed Action, and all non-cancelled Actions `COMPLETED`; cancelled Actions remain history; Requester feedback is advisory.
- Action ordering is `actionAt ASC, id ASC`; performer is the authenticated creator; assignee is a separate active IT Staff user.
- Terminal Actions are immutable and are never deleted. Stale updates return a conflict without overwriting current data.
- Dashboard counts are database-derived and role/owner scoped; recent window is 7×24 hours UTC; recent lists cap at five rows.
- Dashboard links use exact list filters `statusGroup=open` and `priorityGroup=high-or-urgent`; pages initialize and preserve filters from URLs.
- Contract and Test DD history must precede implementation PRs. Feature PRs target `lab4-staging`; release PR targets `main`.
- Do not claim a test, peer review, issue, merge, or CI pass without actual evidence. Do not commit secrets or generated artifacts.
- Final submission is exactly one PDF with Answer Parts 1–9 in order.

## Review Focus

- Concurrent Action/Ticket updates: stale clients receive `409` and cannot overwrite newer state; a cancelled Action does not block resolution when remaining work is complete.
- Reassignment/deactivation race: only active IT Staff can be assigned when the write commits.
- Resolution race: concurrent Action changes cannot let a Ticket resolve while an Action is incomplete.
- Dashboard privacy and date edges: no cross-requester data; exact UTC 7-day boundary and stable ties.
- Migration/retry safety: legacy data remains connected; migration/seed reruns and client retries do not duplicate or erase data.

---

### Task 1: Contract and Test DD baseline (contract-only PR)

**Files:**
- Create: `docs/lab-04/Engineering_Contract.md`
- Create: `docs/lab-04/specification.md`
- Create: `docs/lab-04/api-spec.md`
- Create: `docs/lab-04/ui-spec.md`
- Create: `docs/lab-04/tests.md`
- Create: `docs/lab-04/reviewer.md`
- Create: `docs/lab-04/ai-use.md`
- Modify: `README.md` only to link the Lab 4 contract/docs when appropriate

**Interfaces:**
- Consumes: approved `04_Assignment/Engineering_Contract.md`, Lab 4 PDF, Lab 3 contracts and source.
- Produces: numbered FR/BR/AC, exact API/UI decisions, complete AC-to-test plan, review/AI record templates; no product code.

- [ ] **Step 1: Create canonical Lab 4 docs** from the approved contract and brief, recording exact reviewed decisions and traceability.
- [ ] **Step 2: Self-review the documents** against the eleven required Spec DD sections, complete Ticket transition rows, every dashboard metric, AC/test mapping, required filenames, and nine PDF headings. Keep future test results marked Planned.
- [ ] **Step 3: Stop for user contract-only commit/PR to `lab4-staging`; wait until it is merged before implementation PRs.**

### Task 2: ActionTaken persistence, migration, seed

**Files:**
- Modify: `server/prisma/schema.prisma`, `server/prisma/seed.ts`
- Create: additive migration under `server/prisma/migrations/`
- Create: `server/tests/lab-04/action-validation.unit.test.ts`, migration/seed regression tests

**Interfaces:**
- Consumes: approved Action fields/status enum and role rules from Task 1.
- Produces: generated Prisma `ActionTaken` model, `ActionTakenStatus`, Ticket/User relations, stable sort/indexes, fixtures.

- [ ] **Step 1: Write failing tests** for Action field constraints/status enum, preserving populated Lab 3 records, and idempotent Action seed coverage.
- [ ] **Step 2: Run focused tests** and confirm they fail for the missing model/migration/fixtures.
- [ ] **Step 3: Implement additive schema and migration** without fabricating legacy Actions; retain existing Ticket/User/Attachment/comment/note relations.
- [ ] **Step 4: Add idempotent seed cases** for zero/one/multiple Actions, each status, multiple actors/assignees, and dashboard zero/nonzero data.
- [ ] **Step 5: Run migration/seed tests twice, Prisma validation, and focused unit tests;** capture exact output.

### Task 3: Action APIs and Ticket workflow policy

**Files:**
- Create/modify: `server/src/routes/actions.ts`, `server/src/action-validation.ts`, `server/src/ticket-workflow.ts`
- Modify: `server/src/app.ts` and existing staff route only where status endpoint extension is required
- Create: `server/tests/lab-04/actions-taken.api.test.ts`, `ticket-workflow.api.test.ts`, policy unit tests

**Interfaces:**
- Consumes: Task 2 Prisma model; authenticated user context and existing error/validation conventions.
- Produces: ordered Action list/create/update APIs, `canTransitionAction`, `canTransitionTicket`, `canResolveTicket`, validated conflict-safe writes.

- [ ] **Step 1: Write failing unit/API tests** for actor spoofing, role/owner access, assignment validation, field rules, every Action/Ticket edge, cancellation, resolution gate, and stale writes.
- [ ] **Step 2: Run focused tests** and confirm expected failures.
- [ ] **Step 3: Implement minimal validators and pure transition policies** to satisfy unit tests.
- [ ] **Step 4: Implement API handlers** with transactional precondition checks, safe error envelope, stable ordering, no Action delete route, and server-established performer.
- [ ] **Step 5: Run focused API/unit suites and full server suite;** capture exact counts and database prerequisites.

### Task 4: Requester and Staff dashboard APIs

**Files:**
- Create: `server/src/routes/dashboards.ts`
- Modify: `server/src/app.ts`, `server/src/routes/tickets.ts`, `server/src/routes/staff.ts`, shared query helpers as needed
- Create: `server/tests/lab-04/requester-dashboard.api.test.ts`, `staff-dashboard.api.test.ts`, `dashboard-drilldown.api.test.ts`

**Interfaces:**
- Consumes: Task 2 data model and authenticated Requester/Staff role context.
- Produces: `GET /api/requester/dashboard`, `GET /api/staff/dashboard`, compact typed responses and filters `statusGroup=open`, `priorityGroup=high-or-urgent` with documented zero/empty behavior.

- [ ] **Step 1: Write failing API tests** for every metric, UTC boundary, owner scope, order/list cap, empty states, forbidden role, and filter composition.
- [ ] **Step 2: Run focused tests** and confirm query/route behavior is absent.
- [ ] **Step 3: Implement aggregate queries** using scoped Prisma `where` clauses and bounded recent records; avoid per-row query loops.
- [ ] **Step 4: Run dashboard API tests** and compare metric values with direct fixture queries.

### Task 5: Action Taken UI and Ticket transition UI

**Files:**
- Modify: `client/src/api.ts`, existing Staff Ticket Detail page/components and route navigation
- Create: `client/tests/lab-04/ActionsTaken.test.tsx`, `TicketWorkflow.test.tsx`

**Interfaces:**
- Consumes: Task 3 request/response contracts and Task 1 UI decisions.
- Produces: Action history/create/edit/assign/status controls, Requester read-only Action view, guarded Ticket transitions.

- [ ] **Step 1: Write failing component tests** for roles, action ordering, actor/assignee, validation, confirmation, terminal states, stale errors, and draft preservation.
- [ ] **Step 2: Run focused UI tests** and confirm the new behavior is absent.
- [ ] **Step 3: Implement minimal accessible UI/API client integration** following existing Zen Green components.
- [ ] **Step 4: Run component tests** including keyboard and status/error feedback checks.

### Task 6: Dashboard UI and navigation

**Files:**
- Create: Requester and Staff dashboard page/components in established client page structure
- Modify: `client/src/App.tsx`, `client/src/api.ts`, role navigation/shell
- Create: `client/tests/lab-04/RequesterDashboard.test.tsx`, `StaffDashboard.test.tsx`

**Interfaces:**
- Consumes: Task 4 dashboard response contracts.
- Produces: role-appropriate dashboard routes/cards/recent lists/drill-down links and loading/empty/forbidden/failure states.

- [ ] **Step 1: Write failing component tests** for metrics, zero cases, loading/error/empty states, role navigation, and exact drill-down URLs.
- [ ] **Step 2: Run focused UI tests** and confirm failures.
- [ ] **Step 3: Implement pages and navigation** with semantic labels, visible focus, and responsive Zen Green layout.
- [ ] **Step 4: Run focused component tests** and desktop/tablet/mobile visual/accessibility checks.

### Task 7: End-to-end regression, hardening, and submission

**Files:**
- Create: `e2e/lab-04/actions-taken-flow.spec.ts`, `ticket-resolution.spec.ts`, `dashboards.spec.ts`
- Create: `artifacts/lab-04/screenshots/{staff-dashboard,requester-dashboard,actions-taken}/`
- Modify: `README.md`, `.gitignore` only for demonstrated needs
- Create: `docs/lab-04/reviewer.md`, `ai-use.md` evidence; `04_Assignment/report_lab04_66070503489.pdf`

**Interfaces:**
- Consumes: completed API/UI work and staging/final-main CI.
- Produces: complete regression/visual/release evidence and one rubric-ordered PDF.

- [ ] **Step 1: Write failing E2E flows** for Action lifecycle, resolution gate, both dashboards, and representative Labs 1–3 regression.
- [ ] **Step 2: Run E2E flows** and confirm expected failures before implementation integration.
- [ ] **Step 3: Add only necessary fixes** to integration behavior; finish keyboard/accessibility/visual inspection and capture screenshots.
- [ ] **Step 4: Run full server/client/build/migration/seed/E2E suites** on staging; record actual results and resolve failures.
- [ ] **Step 5: Assemble PDF** with exact Answer Part 1–9 headings, working links, readable screenshots, and evidence pinned to final SHA.
- [ ] **Step 6: Stop for user-controlled PR/release checkpoint** before any commit or PR; final PDF is frozen only after final-main CI and actual peer evidence.
