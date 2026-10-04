# Lab 4 API Specification

**Status:** Approved baseline implemented and merged to `lab4-staging` in PR #46. Server API tests passed in the successful post-merge staging CI run; final-main verification remains pending. This extends `api-spec.md` from Lab 3. Existing auth, Ticket, Attachment, comment, note, queue, and Admin endpoints retain their contracts unless stated below.

## Conventions

- Base path `/api`; session identity comes from the existing HttpOnly cookie.
- JSON property names are camelCase. Times are ISO 8601 UTC strings. IDs are positive integers.
- Validate request bodies/params with Zod before database writes. Never accept `performedByUserId`, requester identity, or dashboard owner ID from client input.
- Errors use `{ "error": { "code": "...", "message": "..." } }`; no SQL, stack, password, token, or secret in response.
- Expected status codes: `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, neutral `404 NOT_FOUND`, `409` lifecycle/version conflict, safe `500 INTERNAL_ERROR`.
- Every update checks the supplied `expectedUpdatedAt` and relevant state preconditions in the same transaction as the write. No stale last-write-wins behavior.

## Shared Action representation

```json
{
  "id": 701,
  "ticketId": 92,
  "actionAt": "2026-10-04T03:15:00.000Z",
  "description": "Replaced the network cable and verified link status.",
  "result": null,
  "performedBy": { "id": 18, "name": "Narin Staff" },
  "assignee": { "id": 22, "name": "Mali Staff" },
  "status": "IN_PROGRESS",
  "followUpRequired": true,
  "followUpNote": "Confirm stability with requester tomorrow.",
  "attachmentNotes": "Photo is in the lab-4 evidence folder.",
  "createdAt": "2026-10-04T03:16:00.000Z",
  "updatedAt": "2026-10-04T03:16:00.000Z"
}
```

Response serialization never includes password/session fields, Attachment bytes, or unrelated Ticket collections. A Ticket Detail can return this same representation for its Action list.

## Action Taken endpoints

### `GET /api/tickets/:ticketId/actions`

Returns `200 { "actions": Action[] }`, ordered by `actionAt ASC, id ASC`. Requester must own the Ticket; IT Staff/Administrator must have Ticket read access. Unknown/hidden Ticket uses `404`. Empty result is `{ "actions": [] }`.

### `POST /api/tickets/:ticketId/actions`

IT Staff/Administrator only. Body:

```json
{
  "actionAt": "2026-10-04T03:15:00.000Z",
  "description": "Replaced the network cable and verified link status.",
  "assigneeUserId": 22,
  "followUpRequired": true,
  "followUpNote": "Confirm stability with requester tomorrow.",
  "attachmentNotes": "Photo is in the lab-4 evidence folder."
}
```

`result` may optionally be supplied at creation; new Action is always `PLANNED`. Server supplies Ticket, `performedBy`, ID, timestamps, and status. Assignee must be an active `IT_STAFF` user. `followUpNote` conditional rule applies. Valid create returns `201 { "action": Action }`; invalid data returns `400`; forbidden role `403`; missing Ticket `404`.

### `PATCH /api/tickets/:ticketId/actions/:actionId`

IT Staff/Administrator only. Requires ISO `expectedUpdatedAt`. Only fields `actionAt`, `description`, `result`, `assigneeUserId`, `status`, `followUpRequired`, `followUpNote`, `attachmentNotes` can be sent. Omitted properties remain unchanged; explicit null is valid only for nullable fields. If `followUpRequired` is set to false, the server clears `followUpNote` even if omitted from the patch. A transition to `COMPLETED` requires non-empty Result; transition to `CANCELLED` requires a non-empty cancellation reason in Result. No-op/illegal edge returns `409 INVALID_ACTION_TRANSITION`; terminal edit returns `409 ACTION_TERMINAL`; version mismatch returns `409 STALE_ACTION`; invalid assignee returns `400 INVALID_ASSIGNEE`; success is `200 { "action": Action }`.

No `DELETE` Action route exists. Reassignment and update revalidate assignee activity in the write transaction. `performedBy` and `ticketId` cannot be changed.

## Ticket status endpoint

### `PATCH /api/staff/tickets/:ticketId/status`

Active IT Staff only. Body:

```json
{
  "status": "RESOLVED",
  "expectedUpdatedAt": "2026-10-04T03:16:00.000Z",
  "confirm": true
}
```

For `CANCELLED`, include `cancellationReason` (trimmed 1–1,000 chars). A required confirmation missing or false returns `400 CONFIRMATION_REQUIRED`. A stale version returns `409 STALE_TICKET`; forbidden transition returns `409 INVALID_STATUS_TRANSITION`; failed resolution gate returns `409 RESOLUTION_REQUIREMENTS_NOT_MET` with a safe message. Resolution atomically verifies an active owner, at least one Action with status `COMPLETED`, and every non-cancelled Action is `COMPLETED`. Cancelled Actions remain in history and do not block resolution. Success returns `200 { "ticket": <existing safe Ticket summary> }`. Requester indication is advisory only. Administrator cannot change Ticket status.

## Dashboard endpoints

All dashboard queries derive the owner/role from authenticated session, never a query or body parameter. The rolling window is `requestedAt - 7*24h` through `requestedAt`, evaluated in UTC. Count fields return integer zero when empty. List fields return `[]` when empty, are capped at five, and have documented deterministic ordering.

### Dashboard drill-down filters

The existing detailed lists accept URL query filters so a dashboard link returns the same category counted by its card:

| List endpoint | Parameter | Meaning |
|---|---|---|
| `GET /api/tickets` | `statusGroup=open` | Restrict to `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`; mutually exclusive with `status`. Requester remains session-owner scoped. |
| `GET /api/staff/tickets` | `statusGroup=open` | Same open status set; may combine with owner/assignment/priority; mutually exclusive with `status`. |
| `GET /api/staff/tickets` | `priorityGroup=high-or-urgent` | Restrict to IT Priority `HIGH`/`URGENT`; mutually exclusive with `itPriority`. |

Invalid/contradictory filters return `400 INVALID_QUERY`. Existing single-status, owner-ID, and `assignment=unassigned` filters retain Lab 3 behavior. The UI initializes filters from the URL and preserves them in pagination.

Drill-down URLs are `/tickets?statusGroup=open`, `/tickets?status=WAITING_FOR_REQUESTER`, `/staff/tickets?assignment=unassigned&statusGroup=open`, `/staff/tickets?ownerId=<session-user-id>&statusGroup=open`, `/staff/tickets?status=<STATUS>`, and `/staff/tickets?priorityGroup=high-or-urgent&statusGroup=open`. The My Active Actions card targets the dashboard list anchor; each Action row opens parent detail at `#actions-taken`.

### `GET /api/requester/dashboard`

Requester only. `200` response:

```json
{
  "windowStart": "2026-09-27T03:15:00.000Z",
  "metrics": { "openTickets": 2, "waitingForMe": 1 },
  "recentlyUpdated": [{ "id": 92, "ticketNumber": "TK-2026-0092", "summary": "Network issue", "currentStatus": "OPEN", "updatedAt": "2026-10-04T03:00:00.000Z" }],
  "recentlyResolved": []
}
```

Every row is scoped to `requesterId = session.user.id`. `recentlyUpdated` includes owned Tickets updated in the window, order `updatedAt DESC, id DESC`, max five. `recentlyResolved` includes owned Tickets currently `RESOLVED` or `CLOSED` and updated in the window, same order/limit. All open-status counts use `{ NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED }`. No user-supplied requester ID is accepted.

### `GET /api/staff/dashboard`

IT Staff and Administrator. `200` response:

```json
{
  "windowStart": "2026-09-27T03:15:00.000Z",
  "metrics": { "unassignedOpenTickets": 3, "myOpenTickets": 2, "highUrgentOpenTickets": 1, "myActiveActions": 2 },
  "ticketsByStatus": { "NEW": 1, "OPEN": 2, "IN_PROGRESS": 1, "WAITING_FOR_REQUESTER": 0, "RESOLVED": 0, "CLOSED": 0, "REOPENED": 1, "CANCELLED": 0 },
  "urgentTickets": [{ "id": 92, "ticketNumber": "TK-2026-0092", "summary": "Network issue", "currentStatus": "OPEN", "itPriority": "URGENT", "updatedAt": "2026-10-04T03:00:00.000Z" }],
  "myActiveActions": [{ "id": 701, "ticketId": 92, "ticketNumber": "TK-2026-0092", "summary": "Network issue", "actionAt": "2026-10-04T03:15:00.000Z", "description": "Replace cable", "status": "PLANNED" }]
}
```

Counts cover all staff-visible Tickets. `unassignedOpenTickets` uses null Ticket owner; `myOpenTickets` uses current Staff ID. `ticketsByStatus` contains every status and zero values. `highUrgentOpenTickets` counts open Tickets with `HIGH` or `URGENT`. `urgentTickets` includes open high/urgent rows sorted `URGENT` before `HIGH`, then `updatedAt DESC, id DESC`, max five. `myActiveActions` are Actions assigned to current user in `PLANNED`/`IN_PROGRESS`, count all matches, include max five ordered `actionAt ASC, id ASC`. Administrator generally has zero own assigned Actions because assignees must be IT Staff.

## Authorization and concurrency matrix

| Request | Requester | IT Staff | Administrator |
|---|---|---|---|
| GET Actions on Ticket | Owned Ticket only | Visible Ticket | Visible Ticket |
| POST/PATCH Actions | 403 | Visible Ticket | Visible Ticket |
| GET Requester dashboard | Own identity | 403 | 403 |
| GET Staff dashboard | 403 | Yes | Yes |
| PATCH Ticket status | 403 | Transition matrix | 403 |

Every Action create/update and Ticket status mutation checks role, Ticket visibility, current version, valid transition, and required owner/assignee state on the server. A client cannot change identity by setting fields.
