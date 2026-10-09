# TokTickIT Lab 4 Specification

**Status:** Contract baseline; approved 2026-10-04 before Lab 4 implementation.
**Source:** `Engineering_Contract.md` and the provided `SE+Lab+4.pdf`.
**Scope:** Extend the released Lab 3 application without breaking Labs 1–3.

## 1. Sprint Goal

Deliver auditable Actions Taken under each Ticket, a server-enforced Ticket resolution lifecycle, and role-appropriate dashboards for Requesters and IT Staff. Preserve the existing TokTickIT data, permissions, attachments, comments, notes, administration, and Zen Green behavior. The repository and released `main` branch are the source of truth.

## 2. Stakeholder Request

IT Staff need to plan and record the work performed on Tickets. Every Action records when it happened, its description and result, who performed it, who is assigned to it, follow-up needs, and notes about where related files can be found. A Ticket has one primary coordinator while multiple staff can carry out its Actions. Requesters can indicate that a problem appears resolved, but this feedback is advisory; IT Staff review the work and formally change Ticket status. Dashboards summarize operational data and link to the detailed workflows.

## 3. Scope

### Included

- Create, list, assign, edit, and transition Actions Taken on Ticket Detail.
- Full Ticket status matrix and backend resolution gate.
- Requester and Staff dashboard APIs, calculations, screens, and drill-downs.
- Additive PostgreSQL/Prisma migration, idempotent seed, and migration/regression coverage.
- Authorization, stale-update/conflict handling, validation, safe errors, responsive/accessibility behavior, final hardening, and prior-lab regression.
- Contract-first GitHub Issues/feature branches/reviewed PRs to `lab4-staging`, then an approved release PR to `main`.
- One final concise PDF with exactly “Answer Part 1” through “Answer Part 9” in the order given by the handout.

### Explicitly Excluded

SLA clocks/escalation, external notification services, inventory/purchasing, billing, multi-level approvals/signatures, report builders/warehouses, multi-tenancy, production-scale cloud operations, and features not approved in this Sprint 4 contract. Action Attachment Notes are text references; Action-specific file uploads are not added.

## 4. Functional Requirements

- **FR-01 Actions list:** Ticket Detail shall display every Action for its Ticket in stable chronological order. Requesters see Actions read-only for owned Tickets; IT Staff/Admin can manage Actions on visible Tickets.
- **FR-02 Action fields:** An Action has a required Ticket, Action Date/Time, Description, Assignee, Status, Follow-Up Required flag, server-generated Performer, created/updated timestamps, optional Result while unfinished, optional conditional Follow-up Note, and optional Attachment Notes.
- **FR-03 Action assignment:** Only active IT Staff may be assigned. Staff creation defaults the assignee to the acting Staff member; Staff may choose a different assignee. An Administrator must choose an IT Staff assignee. Assignee is independent of the Ticket owner and performer.
- **FR-04 Action updates:** Authorized Staff/Admin may edit non-terminal Action fields and reassign. Performer and Ticket association are immutable. Completed and cancelled Actions remain visible and cannot be edited/deleted.
- **FR-05 Ticket workflow:** Active IT Staff may make only the transitions in Section 5. The API is authoritative and checks the current version/status before writing.
- **FR-06 Resolution feedback:** A Requester's existing resolution indication is retained and visible to Staff, but never changes formal status or satisfies the Action completion gate.
- **FR-07 Requester Dashboard:** Return only the authenticated Requester's own metrics and recent Ticket rows; expose links to the corresponding My Tickets filter or Ticket Detail.
- **FR-08 Staff Dashboard:** Return compact operational aggregates, high/urgent Tickets, and the current user's assigned active Actions; expose links to filtered queue/detail.
- **FR-09 Dashboard drill-down:** Requester My Tickets and Staff Queue support documented status/priority groups so dashboard count cards open the matching detailed result set.
- **FR-10 Regression:** Existing login/logout/password rules, role navigation, Ticket ownership, Attachments, Public Comments, Internal Notes, Staff Queue/Detail, and Administrator user management continue to work.
- **FR-11 Hardening:** Every screen handles loading, empty/no-results, validation, forbidden, not-found, stale/conflict, and safe failure. Recoverable errors retain the user's draft and repeated submission does not create duplicates.
- **FR-12 Accessibility/responsive:** Use the Zen Green design system, accessible labels and errors, keyboard operation, visible focus, non-color status cues, and desktop/tablet/mobile layouts without page-level horizontal overflow.

## 5. Business Rules

### Actions Taken rules

- **BR-01:** Each Action belongs to exactly one existing Ticket. No Ticket deletion or Action delete API is introduced.
- **BR-02:** `actionAt` is a required ISO 8601 instant stored in UTC. `createdAt` and `performedByUserId` are set by the server and immutable. Display uses the user's locale/timezone.
- **BR-03:** `description` is trimmed, required, 1–4,000 characters. `result` may be empty while unfinished and is required (1–4,000 characters) before completion. `attachmentNotes` is optional, at most 1,000 characters, and stores text only.
- **BR-04:** If `followUpRequired=true`, `followUpNote` must be trimmed and 1–2,000 characters. If false, it must be null/empty; clearing the flag clears the note.
- **BR-05:** `performedByUserId` is the authenticated creator. `assigneeUserId` is a separate required active `IT_STAFF` user. Assignment never changes performer or Ticket owner. Reassignment/deactivation checks are backend enforced.
- **BR-06:** Action statuses are `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`; new Actions start `PLANNED`. Allowed edges: `PLANNED → IN_PROGRESS | CANCELLED`, `IN_PROGRESS → COMPLETED | CANCELLED`; `COMPLETED` and `CANCELLED` are terminal. Completion requires Result; cancellation requires a reason in Result. Invalid edges return `409 INVALID_ACTION_TRANSITION`.
- **BR-07:** Only `PLANNED`/`IN_PROGRESS` Actions can be edited. Ticket link, performer, and creation time never change. Terminal content cannot be changed or deleted.
- **BR-08:** Action order is `actionAt ASC, id ASC`, producing stable ties. Performer and assignee are distinct fields and labels.
- **BR-09:** Action/Ticket writes carry the version last read (`updatedAt`). A stale write returns a `409` conflict and leaves persisted state unchanged. UI retains the draft and offers refresh/reapply.
- **BR-10:** Requesters may read Actions only for owned Tickets and cannot create, edit, assign, or transition Actions. Active IT Staff/Admin may manage Actions on Tickets they can access. All checks are performed on API calls.

### Ticket status matrix

Only active IT Staff may change formal Ticket status. Any transition not listed below is rejected with `409 INVALID_STATUS_TRANSITION`. Status/version precondition and resolution rules are rechecked transactionally. Confirmation is required for cancellation, resolution, closure, and reopening.

| Current | Allowed next | Additional requirement |
|---|---|---|
| `NEW` | `OPEN`, `CANCELLED` | Cancel requires confirmation and reason |
| `OPEN` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED` | Cancel requires confirmation and reason |
| `IN_PROGRESS` | `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` | Resolve gate; cancel confirmation/reason |
| `WAITING_FOR_REQUESTER` | `IN_PROGRESS`, `RESOLVED`, `CANCELLED` | Resolve gate; cancel confirmation/reason |
| `RESOLVED` | `CLOSED`, `REOPENED` | Confirmation required |
| `CLOSED` | `REOPENED` | Confirmation required |
| `REOPENED` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED` | Cancel confirmation/reason |
| `CANCELLED` | None | Terminal |

- **BR-11 Resolution gate:** Entering `RESOLVED` requires an active primary Ticket owner, at least one `COMPLETED` Action, and every non-cancelled Action `COMPLETED`. A cancelled Action is retained as history and does not block resolution. Requester indication is advisory and is not a prerequisite.
- **BR-12 Closure/reopen:** `CLOSED` requires current status `RESOLVED`; reopening requires confirmation and transitions to `REOPENED`. `CANCELLED` cannot be reopened in this sprint.
- **BR-13 Cancellation:** Ticket cancellation requires confirmation plus a trimmed 1–1,000 character reason.
- **BR-14 Existing Tickets:** Tickets with zero Actions remain valid and visible after migration; they cannot resolve until Actions are added and completed. Never invent legacy Action history.

### Dashboard calculations

All metrics are computed from authoritative DB rows for the authenticated identity, not accepted user IDs. “Open” is `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, or `REOPENED`. Recent is the previous 7×24 hours from request time in UTC. Recent Ticket lists are capped at five and order by `updatedAt DESC, id DESC`. Empty count is `0`; empty list is `[]`. No matches are normal. Unauthorized role receives `403`.

| Metric/list | Calculation | Drill-down |
|---|---|---|
| Requester Open Tickets | Owned Tickets in open statuses | My Tickets with open filter |
| Requester Waiting for Me | Owned Tickets in `WAITING_FOR_REQUESTER` | My Tickets with waiting filter |
| Requester Recently Updated | Up to five owned Tickets updated in recent window | Owned Ticket Detail |
| Requester Recently Resolved | Up to five owned `RESOLVED`/`CLOSED` Tickets updated in recent window | Owned Ticket Detail |
| Staff Unassigned Open | Open Tickets with `ownerId IS NULL` | Staff Queue/unassigned |
| Staff My Open Tickets | Open Tickets with `ownerId = current user` | Staff Queue/current owner |
| Staff Tickets by Status | Count every status for staff-visible Tickets, including zero | Staff Queue/status filter |
| Staff High/Urgent Open | Count open `HIGH`/`URGENT`; list up to five, `URGENT` then newest | Staff Queue/Ticket Detail |
| Staff My Active Actions | Count current user's assigned `PLANNED`/`IN_PROGRESS`; up to five ordered `actionAt ASC, id ASC` | Parent Detail/Actions Taken |

Administrator reuses the Staff dashboard; assigned Actions target IT Staff only, so Administrator's “My Active Actions” is normally zero. No user-account analytics are in scope.

## 6. UI Specification Summary

`ui-spec.md` is normative for screen structure, states, responsive behavior, accessibility, and visual inspection. Requesters receive a dashboard of only their own data and read-only Actions in owned Ticket Detail. IT Staff/Admin receive an operations dashboard; Staff work the Queue and can manage Actions, while Admin retains Lab 3's read-only Ticket status behavior. Action forms separate performer and assignee; Follow-up Note appears/becomes required only when selected; Result is required before completion. Ticket transition controls show only allowed edges, confirm consequential transitions, and refresh the status after success. Dashboard cards/list rows are keyboard links to their declared filters/details. Use current Zen Green tokens/components and consistent loading, empty, validation, forbidden, conflict, and safe-failure feedback. Do not lose form draft after recoverable failure. Desktop/tablet/mobile screenshots and accessibility/overflow checklist are release evidence.

## 7. Data Changes

Add `ActionTaken` with fields `id`, `ticketId`, `actionAt`, `description`, nullable `result` before completion, `performedByUserId`, `assigneeUserId`, `status`, `followUpRequired`, nullable `followUpNote`, nullable `attachmentNotes`, `createdAt`, `updatedAt`. Add `ActionTakenStatus` enum with `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. Ticket, performer, and assignee use foreign keys; preserve actor history. Assignee must be active IT Staff; prevent deactivation while active Actions remain assigned, unless reassigned in the same validated workflow. Add indexes `(ticketId, actionAt, id)` and `(assigneeUserId, status, actionAt)`; verify/reuse Ticket indexes for requester/status/updated and owner/status queries. Do not store derived dashboard totals.

Migration is additive from Lab 3 and preserves Users, Tickets, Attachments including bytes/metadata, comments, notes, IDs, statuses, requester/owner links. Existing Tickets start with zero Actions. Test upgrade using representative populated Lab 3 data and repeated deploy. Recovery is restore from backup before new writes or a tested compensating migration; no destructive rollback that drops new Action history. Seed uses stable upserts and is idempotent; cover all Ticket/Action statuses, priority/owner variants, zero/one/multiple Actions, multiple performers/assignees, follow-up true/false, and zero/nonzero dashboard results. At least two schema/index decisions and tradeoffs are justified here: separate Action rows preserve 1:N history and queryability; normalized performer/assignee FKs preserve identity and assignment integrity; indexes align with ordered child lists and assignee queues.

## 8. API Contract

All routes use the existing cookie session, API error envelope, Zod validation, and server role/ownership checks. Times are ISO 8601 UTC. Dashboard API never accepts Requester ID. Exact response examples and field casing are in `api-spec.md`.

| Method/path | Request/response summary | Access |
|---|---|---|
| `GET /api/tickets/:ticketId/actions` | `200 { actions: Action[] }`, sorted by `actionAt,id` | Requester owns Ticket; IT Staff/Admin visible Ticket |
| `POST /api/tickets/:ticketId/actions` | Body: `actionAt, description, assigneeUserId, followUpRequired, followUpNote?, attachmentNotes?`; server supplies ID/actor/status/timestamps; `201 { action }` | IT Staff/Admin |
| `PATCH /api/tickets/:ticketId/actions/:actionId` | Body: `expectedUpdatedAt` plus allowed edits and/or `status`; `200 { action }` | IT Staff/Admin |
| `GET /api/requester/dashboard` | `200 { metrics, recentlyUpdated, recentlyResolved, windowStart }` | Requester only |
| `GET /api/staff/dashboard` | `200 { metrics, ticketsByStatus, urgentTickets, myActiveActions, windowStart }` | IT Staff/Admin |
| `PATCH /api/staff/tickets/:ticketId/status` | Body: `status, expectedUpdatedAt, confirm?, cancellationReason?`; `200 { ticket }` | Active IT Staff only |

Errors: invalid input `400 VALIDATION_ERROR`; unauthenticated `401`; forbidden role `403`; absent/hidden cross-owner resource `404`; invalid transition or stale version `409`; unexpected failure uses safe `500 INTERNAL_ERROR` without stack/SQL/secrets. API checks assignee activity, role, Action state and resolution prerequisites at write time. No DELETE Action endpoint.

## 9. Acceptance Criteria

| ID | Observable criterion | Current evidence ID(s) |
|---|---|---|
| AC-01 | Action creation links to correct Ticket, authenticated performer, active IT Staff assignee | API-ACT-01, VAL-03 |
| AC-02 | Different performers/assignees on same Ticket do not change primary owner | Gap: not directly asserted by current Lab 4-specific tests |
| AC-03 | Requester cannot mutate Actions and sees only owned Ticket Actions | API-ACT-02, UI-ACT-01 |
| AC-04 | Stable Action order and distinct actor/assignee display | API-ACT-01; distinct display is specified but not directly asserted in current component tests |
| AC-05 | Follow-up/result/cancellation/length/date validation is enforced in API/UI | VAL-01–04, UI-ACT-02, E2E-ACT-01 (the listed cases do not cover every validation edge) |
| AC-06 | Only valid Action transitions; terminal records cannot be edited/deleted | ACT-01, API-ACT-03, UI-ACT-01, E2E-ACT-01 |
| AC-07 | Inactive/missing/non-staff assignee rejected without mutation | API-ACT-01 directly checks inactive assignee rejection |
| AC-08 | Stale writes conflict without overwriting; UI retains draft | VAL-05, API-ACT-03, UI-ACT-02 |
| AC-09 | Full Ticket transition matrix/role policy enforced by server | E2E-TICKET-01 covers a representative browser path; full matrix/role coverage lacks a dedicated Lab 4 API suite |
| AC-10 | Resolution requires owner + one completed Action + all non-cancelled Actions complete; Requester indication is advisory | UNIT-TICKET-01/02, E2E-TICKET-01 |
| AC-11 | Requester dashboard values match DB for authenticated owner, including zeros | API-DASH-01/03, UI-REQ-01/02, E2E-DASH-01 |
| AC-12 | Staff dashboard matches predicates/scope/order/limits, including zeros | API-DASH-02/03, UI-STAFF-01/02, E2E-DASH-02 |
| AC-13 | Dashboard links open correct filters/Ticket/Actions | API-DASH-01/02, UI-REQ-01, UI-STAFF-01, E2E-DASH-01/02 |
| AC-14 | Migration preserves Lab 3 records; legacy zero-Action Tickets remain usable | MIG-01 |
| AC-15 | Seed reruns without duplicates and supports empty/nonempty dashboards | SEED-01 runs the seed command; no explicit repeated-seed assertion is recorded |
| AC-16 | Labs 1–3 role/auth/Ticket/Attachment/comment/note/Admin regression passes | REG-01 (suite-level CI evidence) |
| AC-17 | Screens support loading/empty/validation/forbidden/not-found/conflict/failure and retain draft | UI-ACT-02, UI-REQ-02, UI-STAFF-02–05 |
| AC-18 | Accessibility/responsive/visual/E2E behavior passes at target viewports | E2E-ACT-01, E2E-DASH-01/02, VIS-01; manual assistive-technology/device testing is not claimed |
| AC-19 | Full suite passes on final `main` released SHA; no secrets/transient files committed | REL-01 |
| AC-20 | Final PDF has exact Parts 1–9, working links, readable evidence, truthful claims | SUB-01 is pending; tracked in Issue #53 |
## 10. Product Definition of Done

- [ ] This numbered Spec DD, `api-spec.md`, `ui-spec.md`, and `tests.md` were committed before implementation PRs.
- [ ] Each FR/BR/AC maps to implementation and a named test with truthful final status.
- [ ] Actions Taken, dashboards, Ticket workflow, concurrency, authorization, migration, seed, validation, and safe errors meet this specification.
- [ ] Migration/recovery tested on populated pre-Lab-4 data; Labs 1–3 data and behavior preserved.
- [ ] Server unit/API/integration, client component, accessibility/responsive/style, performance smoke, E2E, migration, seed, and regression pass on final `main`.
- [ ] Direct API authorization tests prevent role and ownership leaks.
- [ ] Desktop/tablet/mobile visual inspection/screenshots and accessibility checklist complete.
- [ ] README setup/migrate/seed/test/demo instructions current; `.gitignore` excludes secrets, dependencies, builds, DB files, logs, transient reports.
- [ ] Every feature PR has genuine peer approval and CI; staging passes before release PR; final-main CI passes exact SHA.
- [ ] All Lab 4 Issues are linked, closed, and Done. `reviewer.md` has actual review evidence; `ai-use.md` has actual model/prompts and student reflection.
- [ ] Exactly one concise final PDF has Answer Parts 1–9 in exact order, working links/readable evidence, and no unsupported claims.

## 11. Assumptions and Decisions

- Action status uses `PLANNED/IN_PROGRESS/COMPLETED/CANCELLED`; terminal Actions are append-only; performer is immutable creator and assignee is separate active IT Staff.
- Resolving a Ticket requires active owner, at least one completed Action, and all non-cancelled Actions complete. Requester feedback remains advisory.
- Active IT Staff alone changes Ticket status; Administrators can manage Actions but retain Lab 3 read-only Ticket status permissions.
- Dashboard recent window is a rolling seven days in UTC; lists are capped at five with deterministic order. Admin reuses Staff dashboard; its assigned-to-me Action count is normally zero.
- Migration is additive and no synthetic Actions are backfilled. Recovery from post-write destructive rollback is restore/compensation, not data-losing down migration.
- Action attachment notes are text references. Uploading files against an Action is excluded.
- Actual Issue/PR numbers, reviewer identity/approval, CI results, and personal student reflection are recorded only when they exist; they are not inferred or fabricated.
