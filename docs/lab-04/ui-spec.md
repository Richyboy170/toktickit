# Lab 4 UI Specification

**Status:** Implemented and merged to `main` at `6e6d645d61621f8a74166947326f59e5b3d141b4`. Final-main Playwright artifacts contain desktop, tablet, and mobile views of both dashboards and staff-editable and Requester-read-only Action details. Screenshots use deterministic fixture data. Browser keyboard/focus and responsive checks passed in PR #58 and final-main CI. Manual screen-reader and physical-device testing were not performed; see `accessibility-review.md`.

## Navigation and roles

- Add Dashboard navigation with visible active-page state. Requesters see Requester Dashboard; IT Staff and Administrators see Staff Dashboard.
- Preserve current role-specific Ticket navigation and user/account controls. Do not expose a write control as a substitute for backend authorization.
- Page titles identify the role/work context. Maintain existing responsive shell and current spacing/color/type/button/badge conventions.

## Requester Dashboard

1. **Open Tickets** card: total owned Tickets in `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`; click opens My Tickets with the open filter.
2. **Waiting for Me** card: count of owned `WAITING_FOR_REQUESTER`; click opens that filter.
3. **Recently Updated** list: at most five owned Ticket rows, newest `updatedAt` first; summary/status/updated time link to owned detail.
4. **Recently Resolved** list: at most five owned `RESOLVED`/`CLOSED` Tickets updated within rolling 7×24-hour UTC window.

Dashboard does not duplicate My Tickets or show other users' counts/records. Open card links to `/tickets?statusGroup=open`; Waiting card links to `/tickets?status=WAITING_FOR_REQUESTER`; recent Ticket rows link to `/tickets/:ticketId`. My Tickets initializes the filter from URL. Ticket Detail displays the Action timeline read-only to Requesters. No create/edit/assign/status Action controls are rendered.

## Staff Dashboard

- Metric cards: Unassigned Open Tickets; My Open Tickets; High/Urgent Open Tickets; My Active Actions.
- Status count strip/list includes all eight Ticket statuses, including zero values.
- Recent/urgent Ticket list is capped at five and uses API ordering. Each row opens Ticket Detail; cards open the corresponding queue filter.
- My Active Actions list shows action date/time, Ticket number/summary, description, assignee context/status; each item opens parent Ticket Detail focused on Actions Taken.
- Drill-down URLs: Unassigned Open `/staff/tickets?assignment=unassigned&statusGroup=open`; My Open `/staff/tickets?ownerId=<current-user-id>&statusGroup=open`; status card `/staff/tickets?status=<STATUS>`; High/Urgent Open `/staff/tickets?priorityGroup=high-or-urgent&statusGroup=open`. Staff Queue initializes/applies these filters from URL and preserves them while paginating.
- My Active Actions card targets the dashboard's `#my-active-actions` list; each Action row opens Ticket Detail at `#actions-taken`.
- Administrator reuses this dashboard; assigned Actions to the current Admin are normally zero. The Admin retains the existing read-only Ticket workflow.

## Ticket Detail: Actions Taken

- Show section heading, total count, stable timeline/table sorted by actionAt ascending and ID ascending for ties.
- Each Action shows action date/time, description, result when present, status label and text, `Performed by` and `Assigned to` as separate fields, follow-up flag/note, Attachment Notes, and last-updated time.
- Staff/Admin create form requires date/time, description, assignee, and follow-up selection. Staff defaults assignee to current user; eligible assignees are active IT Staff only. Performer is read-only and server supplied.
- Edit is available for `PLANNED`/`IN_PROGRESS` entries. Terminal `COMPLETED`/`CANCELLED` entries remain readable without edit/delete controls.
- Follow-up Note is shown and required only when Follow-Up Required is selected. Result becomes required before completion; cancellation asks for a reason and confirms the action.
- IT Staff/Admin controls are available only for accessible Tickets. Requesters see the same content read-only on owned Tickets.
- Empty state explains there is no recorded work yet. It does not invent an Action for legacy Tickets.

## Ticket status workflow

- Show only allowed next statuses from the contract matrix. Backend remains authoritative.
- Resolve control explains that there must be an active Ticket owner, at least one completed Action, and no incomplete non-cancelled Actions. Cancelled Actions remain visible but do not block resolution. If the gate fails, show which requirement needs work and preserve current state.
- Requester resolution indication is displayed as an advisory signal only; it cannot activate a formal status control.
- Confirm resolution, close, reopen, and cancellation. Cancellation collects required reason. Successful updates refresh the displayed Ticket status and timestamp.
- On stale/conflict response, keep the draft, identify that data changed, and provide a refresh/reapply path. Never silently overwrite.

## Dashboard calculations and drill-downs

The frontend displays server aggregates unchanged and does not recompute counts from loaded rows. Counts of zero remain visible. Navigation encodes filters using the existing Staff Queue/My Tickets query syntax; the implementation documents exact URL parameters in the API/UI test. No-result and empty states distinguish “no matching work” from a failed request.

## States and feedback

| State | Expected behavior |
|---|---|
| Initial loading | Use existing loading treatment/skeleton; prevent duplicate submit while loading. |
| Empty dashboard/list | Show concise role-appropriate explanation and next useful link; display count `0`. |
| Validation | Put error beside its field, associate with input, focus first invalid field on submit. |
| Success | Show concise confirmation and refresh relevant Action/Ticket/dashboard data. |
| Forbidden/not-found | Use safe message without leaking other Requester/Ticket details. |
| Conflict/stale | Preserve form draft, explain current data changed, allow refresh/reapply. |
| Server/network failure | Safe, actionable message; preserve entered values and offer retry. |
| Terminal Action | Show status/result in history; no destructive control. |

## Responsive and accessibility requirements

- Match existing breakpoints and behavior: inspect at 1280×900 desktop, 820×1000 tablet, 390×844 mobile (also test nearby widths for wrapping/overflow).
- Keep cards readable and avoid a horizontal page scroll. Tables may transform into labelled stacked rows or use an explicitly contained, accessible scroll region.
- All controls have programmatic labels; validation text is associated; keyboard users can reach/operate navigation, filters, dialogs, and forms; visible focus is not obscured.
- Use semantic headings/regions, sensible focus order, and dialog focus management. Status/priority must have text or icon cues in addition to color. Check contrast against existing theme tokens.
- Do not clip long descriptions, Ticket numbers, follow-up notes, or Action notes. Keep button targets usable on mobile and prevent overlap at narrow widths.

## Visual/release checklist

- [x] Requester dashboard desktop/tablet/mobile captured from final `main`; fixtures show dashboard content.
- [x] Staff dashboard desktop/tablet/mobile captured from final `main`; fixtures show metrics, urgent list, and My Active Actions. Component tests cover loading, empty, forbidden, and safe-failure/retry states (extended in PR #61).
- [x] Staff-editable and Requester-read-only Action detail captured at desktop/tablet/mobile; roles and editable/read-only fields are visibly distinct.
- [x] Create/edit and conditional follow-up behavior is covered by client and E2E tests; create/edit/follow-up screenshots are in final-main CI artifacts.
- [x] Action validation, terminal lifecycle, inactive-assignee rejection, and role restrictions are covered by server/client/API/E2E tests listed in `tests.md`.
- [x] The resolution predicate is covered by `server/tests/lab-04/ticket-workflow.unit.test.ts`, and the end-to-end workflow is covered by `e2e/lab-04/ticket-resolution.spec.ts`. There is no dedicated Ticket workflow API test file or `TicketWorkflow.test.tsx`; the E2E scenario exercises the workflow through the browser. The full transition matrix is specified above and in `specification.md`.
- [x] Visible keyboard focus, navigation width, checkbox label treatment, field labels/errors, and non-color status cues are covered by the accessibility review and PR #58 browser checks.
- [x] Theme contrast ratios were calculated and recorded in `accessibility-review.md`; screen-reader and physical-device testing remain unperformed.
- [x] No page-level horizontal overflow at the captured viewports; visual Playwright check passed in CI.
- [x] The final-main CI screenshot artifact is `toktickit-playwright-evidence` in [run 37747697657](https://github.com/Richyboy170/toktickit/actions/runs/37747697657). Deterministic committed captures are indexed in [`artifacts/lab-04/README.md`](../../artifacts/lab-04/README.md) and stored under [`artifacts/lab-04/screenshots/`](../../artifacts/lab-04/screenshots/).
