# Lab 3 Zen Green UI Specification

**Status:** implemented locally against this baseline; screenshots and final visual inspection results are pending. Lab 3 extends the Lab 2 visual language. The existing tokens, spacing scale, form conventions, responsive breakpoints, keyboard behavior, and Attachment presentation remain in force unless this document says otherwise.

## 1. Design tokens and shared components

Use the Lab 2 Zen Green values without creating a second theme:

| Token | Value | Use |
|---|---|---|
| `--green-900` | `#004D2B` | Dark emphasis and text on pale surfaces |
| `--green-800` | `#006B3C` | Header and primary actions |
| `--green-700` | `#0B7A46` | Active navigation, links, focus and hover |
| `--green-100` | `#EAF6EF` | Selected and success surfaces |
| `--page` | `#F5F7F6` | Page background |
| `--surface` | `#FFFFFF` | Cards and editable controls |
| `--readonly` | `#F0F3EF` | Read-only fields |
| `--text` | `#17352A` | Body text |
| `--muted` | `#587066` | Secondary text |
| `--border` | `#C8D5CF` | Neutral borders |
| `--error` | `#9B1C1C` | Error text and borders |
| `--warning` | `#8A5200` | Warning and attention states |
| `--staff` | `#155E75` | IT Staff role badge, with text |
| `--admin` | `#6B21A8` | Administrator role badge, with text |

Use a system sans-serif stack, 16 px body text, 1.5 line height, 4/8/12/16/24/32 px spacing, 8 px control/card radii, subtle borders, and a centered max-width 1200 px content area. Controls are at least 44 px high. Text, status, priority, role, and permission meaning is always present in text; color is supplemental.

Reusable pieces are `AppShell`, `RoleBadge`, `StatusBadge`, `PriorityBadge`, `Alert`, `LoadingState`, `EmptyState`, `Field`, `Pagination`, `TicketSummary`, `CommentThread`, `NoteThread`, `AttachmentList`, `ConfirmDialog`, and `UserEditor`. Every component supports a visible label, keyboard focus, busy/disabled semantics, and safe long text wrapping.

## 2. Authenticated application shell

The unauthenticated shell contains TokTickIT identity and a centered Login card. A first-login session uses a minimal Change Password shell and does not render normal application navigation. A full session header contains:

- TokTickIT identity;
- role-permitted navigation;
- the current User’s name and a text role badge;
- a Change Password action where appropriate; and
- Logout.

Navigation is role-specific:

| Role | Visible destinations |
|---|---|
| Requester | My Tickets, Create Ticket |
| IT Staff | Ticket Queue |
| Administrator | User Management |
| All full sessions | Change Password, Logout |

The shell does not show Development Requester, Change Requester, or an unauthorized destination. Direct navigation still receives the server’s `401`/`403` response and a useful page state. Current navigation uses `aria-current="page"` plus a non-color indicator. Below 768 px, navigation becomes a labelled, keyboard-operable menu.

## 3. Login and Change Password

### Login screen

One `h1` reads “Sign in to TokTickIT”. The form contains labelled Email and Password fields, a primary “Sign in” button, and a short statement that access is role-based. Modes:

| Mode | Required behavior |
|---|---|
| Initial | Empty fields, enabled submit, no stale error |
| Validation | Inline errors adjacent to invalid fields; focus moves to the first invalid field |
| Submitting | Button and mutable fields disabled; `role="status"` says “Signing in…” |
| Invalid credentials | `role="alert"` says the safe credential error without revealing whether an email exists |
| Inactive account | `role="alert"` clearly says the account is inactive and suggests contacting an Administrator, without extra account detail |
| Rate-limited/API failure | Safe alert with retry guidance; entered email remains |
| First-login success | Navigate to mandatory Change Password; do not briefly show normal app content |
| Full-login success | Navigate to the role’s default destination |

### Mandatory Change Password screen

The screen has one `h1`, explanatory text that the initial password must be replaced, and labelled Current or initial password, New password, and Confirm new password fields. A visible rule summary says 12–128 characters, at least one letter and one number, with no leading/trailing whitespace. A password visibility toggle has an accessible name and never exposes the value in an alert.

The primary “Change password” button is busy during the request. Field errors remain beside fields; a safe API error preserves values except password fields as appropriate. On success, show a confirmation, rotate into the full session, and continue to the role default page. The browser Back action cannot bypass the first-login guard.

## 4. Requester regression screens

The Lab 2 My Tickets, Create Ticket, and Requester Ticket Detail screens retain their established fields, Attachment limits, responsive rules, loading/empty/no-results/error states, and ownership behavior. The selector card, `X-Development-Requester-Id`, Change Requester control, and client requester state are removed.

Requester Ticket Detail adds:

- a Public Comments section showing author, role, UTC-localized time, and escaped body text;
- an “Add public comment” textarea and submit action;
- a Requester-only “Problem Appears Resolved” action with a confirmation state; and
- a visible read-only indication timestamp after the action.

The Requester never sees Internal Notes or staff-only assignment, IT Priority, or status controls. An Administrator can inspect Ticket Detail and change IT Priority, but does not receive assignment, status, comment, or note mutation controls. An owned removed Attachment remains visible as Lab 2 metadata with no preview/download/remove action.

## 5. IT Staff Ticket Queue

The page uses one `h1` (“Ticket Queue”), a short operational description, and a primary “Create…” action only if the role permits it (IT Staff does not receive a Requester create action). The toolbar has labelled Search, Category, Related System, Requested Priority, IT Priority, Status, Owner, Sort, Order, Apply, and Clear Filters controls. Query state remains visible after a failure.

### Queue representation

At desktop width (at least 1200 px), the table shows Ticket Number, Summary, Requester, Category, Requested Priority, IT Priority, Status, Owner, Updated, and an explicit View action. The set is limited to operational decisions and avoids a description-sized mega-grid. At 992–1199 px, the table may hide Category and Related System from the row if their accessible detail remains available. At 768–991 px, use compact rows or cards with Ticket Number, Summary, Requester, both priorities, Status, Owner, Updated, and View Ticket. Below 768 px, use one card per Ticket with the same essential fields and a full-width View Ticket button.

### Queue modes

| Mode | Required behavior |
|---|---|
| Loading | Skeleton or spinner with `role="status"` and “Loading ticket queue…”; controls remain understandable |
| Populated | Stable rows/cards, text-backed badges, View action, and pagination |
| Empty | Heading “No tickets yet”, explanation, and no-results action appropriate to the role |
| No results | Heading “No matching tickets”, current filter summary, and Clear Filters |
| Forbidden | Neutral access message with a safe navigation action; do not render queue data |
| Failure | `role="alert"` with Retry; search/filter values remain |
| Invalid query | Field-level toolbar errors; no silent reset |

Pagination shows Previous/Next, current page, total pages/items, and page-size control (`10`, `20`, `50`). Boundary controls are disabled with semantic disabled state. Sorting and pagination changes preserve the selected filters.

## 6. IT Staff Ticket Detail

The page starts with “Back to Ticket Queue”, one `h1`, Ticket Number, and a text Status badge. Read-only Requester, Category, Related System, Summary, Description, Requested Priority, created date, and updated date appear in labelled groups. Operational controls are visually separated in an “IT Staff actions” card:

- Owner select containing “Unassigned” and active IT Staff/Administrator targets, plus Claim and Save assignment actions for IT Staff;
- IT Priority select and Save priority action for IT Staff and Administrator;
- Status select limited to valid next states, confirmation for Cancel/Resolve/Close/Reopen, and Save status action for IT Staff;
- API validation/saving/success feedback near the relevant control.

The page also contains the following distinct sections:

- **Public Comments:** shared conversation, public label, chronological entries, and Add public comment composer.
- **Internal Notes:** a separate pale warning surface with an always-visible “Internal — IT Staff and Administrator only” heading, chronological entries, and Add internal note composer. There is no shared composer between these sections.
- **Attachments:** the Lab 2 Attachment metadata/download view. Staff and Administrators can inspect/download active files; only the owning Requester receives upload/remove actions. Removed metadata stays visible and content actions are absent.
- **Requester indication:** a read-only banner when `requesterResolutionIndicatedAt` exists; it never changes the staff status automatically.

Detail modes include loading, populated, saving, validation failure, safe API failure, forbidden, not-found, and conflict. While one operation saves, its controls are busy/disabled and other independent read actions remain understandable. A status transition requiring confirmation opens an accessible dialog with the target state, consequence, Cancel, and Confirm action. Focus enters the dialog, Escape cancels, background content is inert, and focus returns to the triggering control.

## 7. Administrator User Management

User Management is one deliberately small screen with one `h1` and a primary “Create user” action. The list shows Name, Email, Role, Status, `Edit`, and a safe indication when a password change is required. A Search users field matches name or email; a single optional Role filter can be applied. Pagination, bulk controls, delete actions, multi-role controls, role history, and account history are absent.

### Create/edit interaction

Create and Edit use a responsive card or dialog with labelled Name, Email, one Role select, and Active/Inactive control. Create also requires Initial password and confirmation; Edit never displays a password. The initial password has the same rule summary as Change Password and is never echoed in the user list. The Edit form offers “Set new initial password” as an explicit action, not an accidental side effect of account edits.

Validation covers required names, email format/normalization, duplicate email, one permitted role, password boundaries, and Administrator safety rules. Self-deactivation, changing the current Administrator away from Administrator, and removal/demotion/deactivation of the last active Administrator show a conflict message next to the affected control and preserve edits. Success identifies the saved user and refreshes the list. Safe API failure keeps the form values and focuses the alert.

### User-list modes

| Mode | Required behavior |
|---|---|
| Loading | `role="status"` says “Loading users…” |
| Populated | Name, Email, Role, Status, Edit, and password-change indicator are readable |
| Empty | Explanation and Create user action |
| No results | Current search/filter summary and Clear Filters |
| Forbidden | Neutral Administrator-only message; no user data |
| Failure | Safe `role="alert"` and Retry; controls remain |
| Saving | Only the active form operation is busy; duplicate submits are prevented |

## 8. Responsive and accessibility rules

| Viewport | Layout |
|---|---|
| Desktop `>=992 px` | Multi-column forms where useful; full queue table at `>=1200 px` |
| Tablet `768–991 px` | Two columns only where content remains readable; compact queue rows/cards; Summary/Description full width |
| Mobile `<768 px` | Single-column forms, cards instead of wide grids, stacked actions, 44 px touch targets, labelled menu |

All widths must prevent clipped labels, overlapping errors, hidden actions, unreadable filenames, and horizontal page scrolling. Long Ticket, comment, note, email, and filename text wraps safely. Tables expose an accessible alternative when columns are hidden.

Use semantic landmarks, one page `h1`, logical heading order, explicit labels, `aria-invalid`/`aria-describedby`, `aria-busy`, `role="status"` for non-urgent progress, and `role="alert"` for errors. Focus uses a visible 3 px `--green-700` outline and is never removed. All functions work with keyboard only; no hover-only information is required. Dialogs trap focus, support Escape, restore focus, and make the background inert. Passwords, role meaning, priority, status, comment visibility, and private-note meaning are communicated in text and accessible names.

## 9. Visual inspection checklist

These boxes are evidence placeholders to be checked after implementation and linked from the final submission:

- [ ] Login initial, validation, busy, invalid, inactive, rate-limited, and API-failure states are readable.
- [ ] Mandatory Change Password rules, errors, busy state, and success continuation are readable.
- [ ] Requester regression screens contain no selector or Change Requester action and preserve Lab 2 behavior.
- [ ] Requester Public Comments and resolution indication are clearly distinct from staff-only controls.
- [ ] Staff Queue desktop table and tablet/mobile cards show equivalent essential fields and usable filters/pagination.
- [ ] Staff Detail clearly separates read-only Ticket data, operational controls, Public Comments, Internal Notes, and Attachments.
- [ ] Admin User Management remains minimalist, responsive, and free of deletion/multi-role controls.
- [ ] Role name and role navigation are visible; unauthorized destinations/actions are absent while direct unauthorized calls are handled safely.
- [ ] Editable, read-only, invalid, disabled, busy, success, forbidden, conflict, empty, and failure states meet the Zen Green tokens.
- [ ] Keyboard focus, labels, error association, dialog focus, text-backed badges, clipping, overlap, and horizontal overflow pass inspection at desktop/tablet/mobile sizes.
- [ ] Screenshot links for authentication, staff queue, staff detail, and user management are added under `artifacts/lab-03/screenshots/`: `<fill after capture>`.
