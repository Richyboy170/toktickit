# TokTickIT Lab 4 Engineering Contract

**Status:** Approved contract baseline; contract PR #45 merged to `lab4-staging` at `08e92e6`. Implementation is in progress on `feature/lab4-action-model`.
**Brief:** `SE+Lab+4.pdf` (course handout supplied outside this application repository)
**Application:** `dev/toktickit`
**Assumption:** Continue the Lab 3 repository, Zen Green design system, peer review process, `lab4-staging` branch, and existing GitHub Project/Kanban. Issue and PR numbers are assigned when created; this contract does not claim remote actions have happened.

## 1. Goal and stakeholder request

Finish TokTickIT's service-desk workflow by recording auditable Actions Taken under Tickets, enforcing the final Ticket lifecycle on the server, providing role-scoped Requester and IT Staff dashboards, and preserving the Labs 1–3 product. IT Staff need to record the action date/time, work description and result, performer, assignee, follow-up, and attachment notes. A Ticket has one primary coordinator while other staff can perform its Actions. Requester resolution feedback is advisory; IT Staff review the work and formally change Ticket status. Dashboards summarize work and link to detailed screens.

## 2. Scope and roles

### Included

- Actions Taken model, assignment, create/edit/status flow, field validation, concurrency handling, and role authorization.
- Complete Ticket status transition matrix and resolution gate.
- Requester and IT Staff dashboard API/UI with exact calculations, drill-downs, and empty/error states.
- Exact My Tickets/Staff Queue filter parameters so dashboard links preserve the counted criteria.
- Data-preserving Prisma migration, idempotent seed, tests across database/API/UI/E2E, and full Lab 1–3 regression.
- Zen Green UI, responsive behavior, accessibility, visual inspection, README and repository hygiene.
- Issues, feature branches, reviewed PRs into `lab4-staging`, staging CI, approved release PR to `main`, and final-main evidence.
- One final PDF at `04_Assignment/report_lab04_66070503489.pdf`, with exactly the nine required Answer Part headings in order.

### Excluded

SLA/escalation, external notifications, inventory/purchasing, billing, multi-level approval/signature, report builders/warehouses, multi-tenancy, production cloud operations, and unapproved features. Attachment Notes describe where a file can be found; new Action-specific file upload is excluded.

| Capability | Requester | IT Staff | Administrator |
|---|---|---|---|
| Dashboard | Own Ticket data only | Operational data and assigned Actions | Reuse Staff dashboard |
| Read Ticket/Actions | Own Tickets | Any Ticket | Any Ticket, read-only for Ticket workflow |
| Create/edit/assign/transition Action | No | Yes on accessible Ticket | Yes, support behavior |
| Change formal Ticket status | No; indication is advisory | Yes | No, preserve Lab 3 boundary |
| Prior Labs 1–3 behavior | Preserve existing role matrix | Preserve existing role matrix | Preserve existing role matrix |

All authorization is enforced server-side. An Action's assignee must be an active `IT_STAFF` user. `performedBy` is always the authenticated actor, assigned by the server. Performer, Action assignee, and primary Ticket owner are separate identities.

## 3. Functional requirements

- **FR-01:** Ticket Detail lists all its Actions Taken in stable order; permitted users have create and view/edit modes.
- **FR-02:** Action fields: Ticket, Action Date/Time, Description, Result, Performed By (automatic), Assignee, Status, Follow-Up Required, Follow-up Note, Attachment Notes, `createdAt`, `updatedAt`.
- **FR-03:** IT Staff can assign/reassign to active IT Staff. Staff creation defaults assignee to actor, with reassignment permitted. Administrator selects an assignee. Inactive/non-staff target is rejected by API.
- **FR-04:** Action and Ticket transitions are validated on the server. Terminal Actions cannot be deleted or silently changed.
- **FR-05:** Ticket resolution requires the approved gate; Requester indication alone never changes status.
- **FR-06:** Backend returns compact role-scoped dashboard aggregates/recent rows; each practical card/row drills into a filtered queue or Ticket Detail.
- **FR-07:** Preserve authentication, authorization, owned Tickets, attachments, comments, Internal Notes, Staff queue/detail, and Admin user management.
- **FR-08:** Loading, empty/no-results, validation, forbidden, not-found, conflict, and safe API failure feedback is consistent and recoverable.
- **FR-09:** Reuse Zen Green conventions, semantic labels, visible focus, keyboard operation, non-color cues, and desktop/tablet/mobile behavior without clipped controls/page overflow.

## 4. Business rules and workflow

These are draft decisions for `docs/lab-04/specification.md`; confirm them in contract review.

### Actions Taken

- **BR-01:** An Action belongs to exactly one Ticket. No Ticket deletion or Action delete endpoint is introduced.
- **BR-02:** `actionAt` is required ISO-8601, stored in UTC; `createdAt` and `performedByUserId` are server-generated and immutable. UI displays local time.
- **BR-03:** Description required, trimmed, 1–4,000 chars. Result required for completion, max 4,000 chars. Attachment Notes optional, max 1,000 chars, descriptive only.
- **BR-04:** If `followUpRequired=true`, trimmed Follow-up Note is required (1–2,000 chars). Otherwise it must be empty/null; switching off clears it.
- **BR-05:** Assignee is a separate, required active IT Staff user. Reassignment never changes performer or Ticket owner. Deactivation is blocked while that user owns active Actions until reassigned.
- **BR-06:** Action status: `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. New Action is `PLANNED`; transitions: `PLANNED → IN_PROGRESS | CANCELLED`, `IN_PROGRESS → COMPLETED | CANCELLED`; terminal states have no outgoing transitions. Completion requires non-empty Result; cancellation requires a non-empty reason in Result. Invalid edge returns `409 INVALID_ACTION_TRANSITION`.
- **BR-07:** Description, action time, result, follow-up, notes, and assignee are editable only before terminal status. Ticket link, performer, creation time, and terminal Action content are immutable. Terminal rows remain in history.
- **BR-08:** Stable Action order is `actionAt ASC, id ASC`. Performer and assignee display separately.
- **BR-09:** Updates carry last-seen `updatedAt` (or version); stale writes return `409 STALE_ACTION`/`409 STALE_TICKET`. UI retains draft and offers refresh/reapply. Prevent duplicate form submits.
- **BR-10:** Requesters cannot create/change Actions; they can read Actions on owned Tickets. IT Staff/Admin can manage Actions on Tickets they may read. Every direct API call enforces role/ownership.

### Ticket transitions

Only active IT Staff changes formal status. Blank edges return `409 INVALID_STATUS_TRANSITION`; status/version is checked atomically. Required confirmation is explicit.

| Current | Allowed next | Additional rule |
|---|---|---|
| `NEW` | `OPEN`, `CANCELLED` | Cancel needs confirmation and reason |
| `OPEN` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED` | Cancel needs confirmation and reason |
| `IN_PROGRESS` | `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` | Resolve gate; cancel confirmation/reason |
| `WAITING_FOR_REQUESTER` | `IN_PROGRESS`, `RESOLVED`, `CANCELLED` | Resolve gate; cancel confirmation/reason |
| `RESOLVED` | `CLOSED`, `REOPENED` | Confirmation required |
| `CLOSED` | `REOPENED` | Confirmation required |
| `REOPENED` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED` | Cancel confirmation/reason |
| `CANCELLED` | — | Terminal |

- **BR-11:** Requester resolution indication remains advisory and does not satisfy formal resolution.
- **BR-12:** `RESOLVED` requires an active primary Ticket owner, at least one `COMPLETED` Action, and every non-cancelled Action `COMPLETED`. A cancelled Action remains history and does not block resolution. Requester indication is advisory and not required.
- **BR-13:** `CLOSED` requires `RESOLVED`; reopening needs confirmation and sets `REOPENED`. A cancelled Ticket is terminal in this sprint.
- **BR-14:** Ticket cancellation requires a trimmed reason (1–1,000 chars).
- **BR-15:** Existing zero-Action Tickets remain valid; no history is fabricated, but they cannot resolve until the gate is met.

### Dashboard calculations

All metrics are computed from authoritative database records and scoped to authenticated identity. “Open” statuses are `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`. “Recent” is the preceding 7×24 hours in UTC. Lists cap at five; Ticket lists order `updatedAt DESC, id DESC`. Empty count is `0`, empty list `[]`. No matches are normal. Forbidden role gets `403`.

| Card/list | Definition and drill-down |
|---|---|
| Requester Open Tickets | Count owned Tickets with open status; link to `/tickets?statusGroup=open`. |
| Requester Waiting for Me | Count owned Tickets in `WAITING_FOR_REQUESTER`; link to `/tickets?status=WAITING_FOR_REQUESTER`. |
| Requester Recently Updated | Up to five owned Tickets updated in recent window; open owned Ticket Detail. |
| Requester Recently Resolved | Up to five owned `RESOLVED`/`CLOSED` Tickets updated in recent window; open Detail. |
| Staff Unassigned Open | Count open Tickets with no primary owner; link to `/staff/tickets?assignment=unassigned&statusGroup=open`. |
| Staff My Open Tickets | Count open Tickets owned by current user; link to `/staff/tickets?ownerId=<current-user-id>&statusGroup=open`. |
| Staff Tickets by Status | Count each status across staff-visible Tickets, including zeroes; each links to `?status=<STATUS>`. |
| Staff High/Urgent Open | Count open `HIGH`/`URGENT`; top five ordered `URGENT` first then newest; link to `/staff/tickets?priorityGroup=high-or-urgent&statusGroup=open` and rows to detail. |
| Staff My Active Actions | Count assigned-to-me `PLANNED`/`IN_PROGRESS`; up to five by `actionAt ASC, id ASC`; card links to dashboard list anchor, rows to parent Detail/Actions. |

Administrator reuses Staff dashboard. Its “My Active Actions” is zero because assignments target IT Staff only. No account analytics are added.

## 5. Data, migration, API, and UI decisions

### Data/migration/seed

Add `ActionTaken`: ID, `ticketId`, `actionAt`, `description`, nullable `result` until completion, `performedByUserId`, `assigneeUserId`, `status`, `followUpRequired`, nullable `followUpNote`, nullable `attachmentNotes`, `createdAt`, `updatedAt`. Add `ActionTakenStatus` enum. Use restrictive Ticket/performer foreign keys; assignee must remain active or be reassigned before deactivation. Index `(ticketId, actionAt, id)`, `(assigneeUserId, status, actionAt)`, and ensure existing Ticket requester/status/updated and owner/status indexes serve dashboard queries. Do not store duplicate dashboard counters. Justify at least two data/index decisions in Spec DD.

Migration is additive and preserves all Lab 3 users, Tickets, Attachments (bytes and metadata), comments, notes, IDs, owners, and statuses. Existing Tickets have zero Actions. Test upgrade from populated Lab 3 DB, foreign keys, and repeated deploy. Recovery is restore from backup before new writes or a tested compensating migration; do not claim rollback is safe if it destroys new Actions. Seed upserts stable fixtures idempotently; cover all Ticket/Action statuses, priorities, assigned/unassigned Tickets, zero/one/multiple Actions, different performers/assignees, follow-up cases, and both zero/nonzero dashboards. Never erase non-seed work or commit secrets.

### API increment

Use existing `/api`, cookie session, error envelope, Zod, and route patterns. Extend Ticket and Staff Queue filters with `statusGroup=open` and `priorityGroup=high-or-urgent` so dashboard links preserve counted criteria. Freeze casing/request/response exactly in `docs/lab-04/api-spec.md` before implementation.

| Method/path | Use/access |
|---|---|
| `GET /api/tickets/:ticketId/actions` | Ordered list on visible Ticket; Requester only own Ticket; Staff/Admin visible Tickets. |
| `POST /api/tickets/:ticketId/actions` | Create; Staff/Admin only; actor established by server. |
| `PATCH /api/tickets/:ticketId/actions/:actionId` | Edit/assign/transition with `expectedUpdatedAt`; Staff/Admin only. No DELETE. |
| `GET /api/requester/dashboard` | Requester-owned metrics; never accepts requester ID. |
| `GET /api/staff/dashboard` | Staff/Admin operational aggregates and compact lists. |
| Existing Ticket status endpoint | Add expected state/version and cancellation reason; preserve current route if feasible. |

Errors: `400 VALIDATION_ERROR`, `401` unauthenticated, `403` forbidden, neutral `404` missing/hidden, `409` invalid transition/stale state, safe existing `500` without stack/SQL/secrets. Recheck assignment/resolution preconditions atomically.

### UI

- Role-specific Dashboard navigation with active-page indication. Requester sees only Requester dashboard; Staff/Admin sees operations dashboard.
- Requester dashboard uses its four metrics/lists; owned Ticket Detail shows Actions read-only.
- Staff dashboard shows metrics/status counts, urgent Tickets and current-user Actions. Actionable cards/rows are keyboard links to the correct filtered queue or parent Detail.
- Ticket Detail has chronological Action history, separate performer/assignee, create/edit-before-terminal, assignment and transition controls. Follow-up note is conditional; result required to complete; cancellation confirmed and explained.
- Preserve form draft on recoverable errors/conflict; prevent duplicate submit. Specify loading, empty/no-results, forbidden, validation, success and failure states in `ui-spec.md`.
- Reuse Zen Green components/tokens. At mobile widths use readable stacked rows or contained scrolling, never page overflow. Verify labels/errors, keyboard, focus, contrast, non-color status, clipping and overlap. Capture desktop/tablet/mobile evidence.

## 6. Acceptance criteria

Each AC must map to a named test row in `tests.md` before implementation.

| ID | Acceptance criterion |
|---|---|
| AC-01 | Valid Action is attached to Ticket, actor is authenticated user, assignee is active IT Staff. |
| AC-02 | Different staff perform/receive Actions on one Ticket without changing primary owner. |
| AC-03 | Requester direct API writes are denied; reads are limited to owned Tickets. |
| AC-04 | Stable action-time/ID order and distinct performer/assignee display. |
| AC-05 | Follow-up/result/cancellation/length/date validation works in API and UI. |
| AC-06 | Action transition matrix enforced; terminal content cannot be edited/deleted. |
| AC-07 | Inactive/missing/non-staff assignee rejected without mutation. |
| AC-08 | Stale writes conflict without overwriting; UI retains draft. |
| AC-09 | Ticket transition matrix and roles enforced server-side. |
| AC-10 | Resolution gate requires active owner, at least one completed Action, all non-cancelled Actions complete; Requester indication alone is insufficient. |
| AC-11 | Requester dashboard query results match authenticated owner's data, including zero cases. |
| AC-12 | Staff metrics match predicates/scope/order/list caps, including zero cases. |
| AC-13 | Dashboard drill-down opens the corresponding filtered queue or Ticket/Actions. |
| AC-14 | Migration preserves Lab 3 records; existing zero-Action Tickets remain usable and unresolved. |
| AC-15 | Seed rerun is idempotent and has nonzero/zero dashboard fixtures. |
| AC-16 | Labs 1–3 auth, roles, Ticket, Attachment, comment, note, and Admin behavior regressions pass. |
| AC-17 | UI handles loading/empty/validation/forbidden/not-found/conflict/safe failure without losing draft. |
| AC-18 | Component, accessibility, desktop/tablet/mobile overflow, and E2E checks pass. |
| AC-19 | Full final-main server/client/build/migration/seed/E2E/regression CI passes on released SHA; no secrets/transient artifacts committed. |
| AC-20 | Final PDF has Parts 1–9 in exact order, working links, readable evidence, no unsupported claims. |

## 7. Test DD outline

Create `dev/toktickit/docs/lab-04/tests.md` before or alongside implementation. Every row records ID/type/AC/scenario/expected result/exact path/final status.

| Coverage | Minimum files/scenarios |
|---|---|
| Unit | Action and Ticket transition/validation, dashboard predicates/date boundaries; `server/tests/lab-04/*.unit.test.ts` |
| API/security | `actions-taken.api.test.ts`, `ticket-workflow.api.test.ts`: create/list/edit/assign, actor spoof, inactive assignee, roles/ownership, stale/error/resolution gate |
| Dashboard API | `requester-dashboard.api.test.ts`, `staff-dashboard.api.test.ts`: query math, scope, windows, ordering, limits, zeroes, forbidden |
| Migration/seed/regression | Upgrade populated Lab 3 database, preserved data, no synthetic Actions, repeat seed, prior-lab API/data regression |
| UI | `client/tests/lab-04/{ActionsTaken,TicketWorkflow,RequesterDashboard,StaffDashboard}.test.tsx`: roles, forms, states, calculations/drill-down/errors |
| Responsive/accessibility | Zen Green, names/focus/keyboard, status cues, no clipping/overlap/page overflow at all target widths |
| E2E | `e2e/lab-04/actions-taken-flow.spec.ts`, `ticket-resolution.spec.ts`, `dashboards.spec.ts`, plus representative prior-lab regression |
| Performance smoke | Dashboard/Action-list query at realistic seed volume; record budget and avoid unbounded payload/N+1 query behavior |

Planned/compiled/visually inspected does not mean passed. Record local database blockers truthfully; final evidence must show final-main results.

## 8. GitHub Issues, branches, PRs

Create separate Issues in the existing Project, use current Kanban statuses/Lab 4 labels, acceptance checklists, dependencies, and actual IDs (`#N`). Move to In Progress before work; close only after acceptance and linked PR are complete.

| Issue | Scope / close conditions | Branch → target |
|---|---|---|
| **[Lab 4] Contract and Test DD** | Review this contract; create numbered `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`; contract/Test DD commit precedes implementation. | `feature/lab4-contract` → staging |
| **[Lab 4] Action data, migration, seed** | Model/indexes/additive migration/recovery, preserve Lab 3 data, edge-case fixtures and tests. | `feature/lab4-actions-data` → staging |
| **[Lab 4] Action API and authorization** | CRUD-without-delete, assignment/lifecycle, server actor, validation, stale/errors; depends data. | `feature/lab4-actions-api` → staging |
| **[Lab 4] Ticket workflow and resolution gate** | Full matrix, gate, cancellation reason, stale protection/tests; depends Action API. | `feature/lab4-ticket-workflow` → staging |
| **[Lab 4] Staff dashboard API/UI** | Staff metrics, recent/urgent Tickets, own Actions, drill-down/empty/responsive tests. | `feature/lab4-staff-dashboard` → staging |
| **[Lab 4] Requester dashboard API/UI** | Owned metrics/recent lists/links/zero cases/API/UI tests. | `feature/lab4-requester-dashboard` → staging |
| **[Lab 4] Actions Taken Ticket Detail UI** | History/create/edit/assign/status, actor vs assignee, validation/conflict/role/responsive; depends API/workflow. | `feature/lab4-actions-ui` → staging |
| **[Lab 4] Regression/accessibility/polish** | Prior-lab regression, visual checklist/screenshots, README and `.gitignore` evidence. | `feature/lab4-hardening` → staging |
| **[Lab 4] Submission/release evidence** | Nine-part Markdown/PDF, links/screenshots/SHA, staging CI, peer review, release PR/final CI, board Done. | `feature/lab4-submission` → staging; release PR staging → main |

```text
main (Lab 3 baseline)
  └── lab4-staging (from current main; no direct pushes)
       ├── feature/lab4-contract ───────────────┐
       ├── feature/lab4-actions-data ───────────┤
       ├── feature/lab4-actions-api ────────────┤
       ├── feature/lab4-ticket-workflow ────────┤
       ├── feature/lab4-staff-dashboard ────────┤ PRs with Issue link,
       ├── feature/lab4-requester-dashboard ─────┤ peer approval and CI
       ├── feature/lab4-actions-ui ─────────────┤
       ├── feature/lab4-hardening ──────────────┤
       └── feature/lab4-submission ─────────────┘
             └── staging full CI + all issue/board evidence
                   └── approved release PR: lab4-staging → main
                         └── full CI on merge SHA; freeze evidence
```

Every feature PR targets `lab4-staging`, links the actual Issue through GitHub Development/`Closes #N` only when it completes that Issue, names AC/test IDs, records commands and actual outcomes, and includes relevant screenshots/migration notes. Obtain a genuine peer review before merge; fix and re-review requested changes; author does not self-approve. Merge in dependency order. Protect `main`; release only through approved staging PR after staging CI. Close/move Issues from real completion. Capture real comments/responses/approvals, commit graph, checks, and final board. Never invent issue numbers, reviewer actions, merge hashes, or test/CI status.

## 9. Product Definition of Done

- [ ] Numbered Spec DD/API/UI/Test DD in `docs/lab-04`; history proves contract precedes implementation.
- [ ] Every FR/BR/AC maps to code and a named test; all test statuses are evidence-based.
- [ ] Actions, dashboards, workflow, concurrency, authorization, migration, seed, validation, and safe errors meet this contract.
- [ ] Migration/recovery tested on pre-Lab-4 data; all prior records and behavior preserved.
- [ ] Server/client/API/UI/accessibility/responsive/performance/E2E/migration/seed/regression checks pass on final `main`.
- [ ] Direct API permission tests prevent role/owner data leaks.
- [ ] Desktop/tablet/mobile visual review/screenshots and accessibility checklist complete.
- [ ] README current; `.gitignore` excludes secrets, dependencies, builds, DB files, logs, transient reports.
- [ ] Genuine peer approvals and CI for feature PRs; staging passes before release; final-main CI passes exact SHA.
- [ ] All Lab 4 Issues closed/Done; `reviewer.md` contains real review evidence; `ai-use.md` names actual LLM, has 6–10 prompts and student-written reflection.
- [ ] Exactly one concise final PDF, required nine headings/order, working links/readable evidence, no unsupported claim.

## 10. Final PDF evidence map (60 points)

Assemble after release; include rendered excerpts and source links pinned to final `main`.

| Heading | Points | Evidence |
|---|---:|---|
| **Answer Part 1: Git Use with Engineering Workflow** | 10 | Commit/branch graph through staging/main; final Kanban all Done; rendered reviewer identity/PRs/comments/responses/approvals; README, `.gitignore`, directory tree. |
| **Answer Part 2: Spec DD** | 5 | Render/link specification, numbered requirements/rules/AC, Action/Ticket workflow, dashboards, migration decisions/DoD, pre-implementation history. |
| **Answer Part 3: Test DD and Traceability** | 10 | Render/link tests, AC/file/status mapping, actual final-main passing output across required suites. |
| **Answer Part 4: AI Use with Reflection** | 5 | `ai-use.md`, actual LLM, 6–10 selected prompts, student reflection on specification/coding-agent use. |
| **Answer Part 5: Working IT Staff Dashboard UI** | 5 | Metrics/current-user Actions/recent or urgent Tickets, DB query comparison, drill-down, state and responsive evidence. |
| **Answer Part 6: Working Actions Taken UI** | 10 | Multiple Actions on one Ticket; list/create/assign/edit/status/complete/cancel, validation/inactive assignee/roles/failure/responsive evidence. |
| **Answer Part 7: Working Ticket Workflow** | 5 | Allowed/rejected transitions, resolution gate, stable Action ordering, terminal append-only behavior, role visibility. |
| **Answer Part 8: Working Requester Dashboard and Final Regression UI** | 5 | Owner-scoped metrics/recent/attention/drill-down; auth, My Tickets, Detail, Attachment, Public Comment, Staff, Internal Note, Admin regression. |
| **Answer Part 9: Zen Green UI, Responsive, Accessibility, and Final Polish** | 5 | Rendered UI spec, desktop/tablet/mobile major screens, completed consistency/accessibility checklist. |

## 11. Required files

```text
dev/toktickit/docs/lab-04/{specification.md,tests.md,ui-spec.md,api-spec.md,reviewer.md,ai-use.md}
dev/toktickit/server/tests/lab-04/{actions-taken.api.test.ts,ticket-workflow.api.test.ts,requester-dashboard.api.test.ts,staff-dashboard.api.test.ts}
dev/toktickit/client/tests/lab-04/{ActionsTaken,TicketWorkflow,RequesterDashboard,StaffDashboard}.test.tsx
dev/toktickit/e2e/lab-04/{actions-taken-flow.spec.ts,ticket-resolution.spec.ts,dashboards.spec.ts}
dev/toktickit/artifacts/lab-04/screenshots/{staff-dashboard,requester-dashboard,actions-taken}/
04_Assignment/{SE+Lab+4.pdf,Engineering_Contract.md,report_lab04_66070503489.pdf}
```

Follow repository conventions if paths differ; update inventory and Test DD rather than leaving planned files missing. Source docs/tests/screenshots/GitHub records remain in TokTickIT; the single nine-part PDF is the submission artifact.

## 12. Choices for review

The handout leaves implementation choices to the team. This draft proposes Action statuses `PLANNED/IN_PROGRESS/COMPLETED/CANCELLED`, active IT Staff assignment, immutable performer/terminal Actions, seven-day dashboard window, five-row recent lists, a resolution gate requiring one completed Action and all non-cancelled Actions complete, and Administrator Action access with IT Staff-only Ticket status changes. If any choice changes, revise the contract and matching Spec/Test DD before implementation.
