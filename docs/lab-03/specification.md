# Lab 3 â€” Sprint 3 Engineering Contract

**Status:** implemented against this approved baseline. PR #33 was approved and merged into `lab3-staging` at `593d6ba`; staged database/browser CI passed in run [35171700694](https://github.com/Richyboy170/toktickit/actions/runs/35171700694). Release to `main` and final-main verification remain pending. This contract extends the Lab 2 contract and is the source of truth for the Lab 3 increment.

## 1. Sprint goal

TokTickIT will replace the Lab 2 Development Requester selector with secure, server-established authentication and three role-specific experiences. Requesters keep their owned Ticket and Attachment workflow, IT Staff gain a shared operational queue and Ticket workflow, and Administrators gain a deliberately small User Management screen. Existing Tickets and Attachments remain usable throughout the migration.

## 2. Stakeholder request in our words

People sign in with an account and see only the work their role permits. A first-time or reset-password user must choose a new password before using the application. Requesters work on their own Tickets and communicate through Public Comments; IT Staff process the shared queue, assignment, priority, status, comments, and private notes; Administrators maintain basic user accounts without taking over the staff workflow.

## 3. Scope

### Included

- Email/password login, logout, current-user retrieval, server sessions, and mandatory first-login password change.
- Backend authorization for Requester, IT Staff, and Administrator roles, including ownership checks.
- Migration of Lab 2 Development Requesters to Users without losing Ticket or Attachment relationships.
- Authenticated continuation of Lab 2 requester Ticket, search, detail, and Attachment functions.
- Public Comments, Requester â€œProblem Appears Resolvedâ€ indication, and append-only Internal Notes.
- IT Staff queue search, filters, sorting, pagination, Ticket detail, assignment, IT Priority, and permitted status transitions.
- Minimalist Administrator User Management: list, name/email search, optional role filter, create, edit, activate/deactivate, and set a new initial password.
- Idempotent local seed data, migration/regression tests, responsive Zen Green screens, and traceable delivery evidence.

### Explicitly excluded

Email invitations or password-reset email, self-registration, multi-factor/social/SSO login, account unlocking, user deletion, bulk/import/export operations, multiple roles, departments or organizations, profile images, role or account history, Actions Taken, formal SLA/escalation/notification services, dashboards/KPIs beyond queue counts, advanced user-list controls, and production/cloud infrastructure changes.

## 4. Roles and authorization

The backend is authoritative. A hidden or disabled control is useful UI feedback but never replaces an authorization check. â€œAny Ticketâ€ below means a Ticket that exists, regardless of its Requester, subject to the endpointâ€™s role rule.

| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| Login, logout, current user, change own password | Yes | Yes | Yes |
| Active reference data | Yes | Yes | Yes |
| Create/list own Tickets | Own identity only | No | No |
| Read Ticket detail and active/removed Attachment metadata | Own Tickets | Any Ticket, read-only | Any Ticket, read-only |
| Download an active Attachment | Own Tickets | Any Ticket | Any Ticket |
| Upload/remove an Attachment | Own Tickets | No | No |
| Read Public Comments | Own Tickets | Any Ticket | Any Ticket |
| Create Public Comments | Own Tickets | Any Ticket | No |
| Indicate â€œProblem Appears Resolvedâ€ | Own Tickets | No | No |
| Read Internal Notes | No | Any Ticket | Any Ticket, read-only |
| Create Internal Notes | No | Any Ticket | No |
| View IT Staff Ticket Queue | No | Yes | No |
| List active assignment candidates | No | Yes | No |
| Claim/reassign, change Ticket status | No | Yes | No |
| Change IT Priority | No | Yes | Yes |
| List/create/edit/activate/deactivate/reset users | No | No | Yes |

Administrator read-only Ticket detail and comment/note visibility is explicit in this matrix. The only operational exception is changing IT Priority, which the handout explicitly permits for Administrators; Administrators cannot queue, assign, transition, comment, or add notes.

## 5. Functional requirements

- **FR-01 Authentication:** The server shall authenticate an active User with a normalized email and valid password and establish an opaque server session.
- **FR-02 Session lifecycle:** The server shall expose login, logout, current-user, password-change, expiry, and invalidation behavior without exposing a password, hash, session token, or secret.
- **FR-03 First login:** A User marked `mustChangePassword` shall reach only the Change Password flow until a valid new password is saved.
- **FR-04 Role shell:** The client shall show the authenticated Userâ€™s name and role, role-permitted navigation, Logout, and safe feedback for loading, validation, forbidden, and failure states.
- **FR-05 Requester regression:** Authenticated Requesters shall create, list, filter, sort, paginate, inspect, and manage their own Lab 2 Tickets and permitted Attachments. The Development Requester selector and Change Requester action shall be removed.
- **FR-06 Public communication:** Requesters and IT Staff shall create Public Comments permitted by the matrix; all roles with Ticket visibility shall read them. Entries are append-only and show backend author/time.
- **FR-07 Resolution indication:** A Requester shall be able to indicate that their reported problem appears resolved. The indication shall not set a formal status.
- **FR-08 Staff queue:** IT Staff shall retrieve a shared Queue with documented search, filters, sorting, pagination, ownership, status, priority, empty, no-results, forbidden, and failure states.
- **FR-09 Staff detail:** IT Staff shall open operational Ticket Detail with assignment, IT Priority, status, comments, Internal Notes, and existing Attachment information.
- **FR-10 Assignment:** IT Staff shall claim, assign, reassign, or unassign a Ticket subject to active-user validation.
- **FR-11 IT Priority:** IT Staff or an Administrator shall view and change IT Priority while Requested Priority remains the Requesterâ€™s original value.
- **FR-12 Status workflow:** IT Staff shall perform only the transitions in the approved matrix, with required confirmation and owner validation.
- **FR-13 Internal Notes:** IT Staff shall create and read private, append-only Internal Notes; Requesters shall never receive their content.
- **FR-14 User list:** Administrators shall list Users with Name, Email, Role, Status, and Edit action; search by name/email and optionally filter by one role.
- **FR-15 User creation:** Administrators shall create one active or inactive User with one permitted role and an initial password.
- **FR-16 User editing:** Administrators shall update name, normalized email, one role, and activation state, with duplicate-email and safety validation.
- **FR-17 Password reset:** Administrators shall set a new initial password that is hashed and forces a password change at the Userâ€™s next login.
- **FR-18 Data continuity:** A forward migration shall preserve existing Category, Related System, Ticket, Attachment, and ownership data.
- **FR-19 Seed and verification:** A repeatable local seed shall provide the required role mix, inactive accounts, realistic Queue data, comments, notes, and documented local-only credentials.
- **FR-20 Safe contract:** Every protected route shall enforce authentication, role, and ownership server-side and return the documented safe error shape and status.
- **FR-21 Usability:** All new and extended screens shall reuse the Lab 2 Zen Green tokens, components, accessibility conventions, and desktop/tablet/mobile behavior.

## 6. Business rules

- **BR-01:** Only an active User with valid credentials may create a normal authenticated session.
- **BR-02:** Unknown email and wrong password use the same `401 INVALID_CREDENTIALS` response and never create a session. The server may apply a bounded five-failure-per-email/IP window of 15 minutes; it shall return `429 LOGIN_RATE_LIMITED` when that limit is reached and reset the counter after successful login.
- **BR-03:** An inactive User cannot log in and receives a safe `403 ACCOUNT_INACTIVE` response without password or account-detail disclosure.
- **BR-04:** A User with `mustChangePassword=true` receives a restricted session; normal application endpoints reject it with `403 PASSWORD_CHANGE_REQUIRED` until a valid change succeeds.
- **BR-05:** Passwords are never stored or returned in plaintext. Password input is 12â€“128 characters, contains at least one letter and one number, and has no leading/trailing whitespace after validation.
- **BR-06:** Sessions use an opaque random token, are stored only as a hash, expire after eight hours, and are invalidated on Logout, password change, reset, or deactivation. The client does not store the token in local storage.
- **BR-07:** The authenticated server identity determines Requester ownership. A client-supplied `requesterId` is ignored or rejected and cannot select another User.
- **BR-08:** Every User has exactly one role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`.
- **BR-09:** Role checks apply to every protected route, including direct API calls; frontend visibility never grants permission.
- **BR-10:** Public Comments are visible to Requesters who own the Ticket, IT Staff, and Administrators with Ticket detail access. Internal Notes are visible only to IT Staff and Administrators.
- **BR-11:** Public Comments and Internal Notes are append-only. Content is trimmed, must contain non-whitespace text, is capped at 2,000 characters, and is rendered as escaped text with preserved line breaks.
- **BR-12:** A Requester may indicate an owned problem appears resolved once; the action records a backend timestamp and does not set `RESOLVED` or `CLOSED`.
- **BR-13:** A Ticket has zero or one primary owner. Assignment targets must be active `IT_STAFF` or `ADMINISTRATOR` Users; unassigned is valid.
- **BR-14:** `requestedPriority` remains the Requester-submitted value. `itPriority` initially copies it and can be changed only by IT Staff or an Administrator.
- **BR-15:** The only Ticket statuses are `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`.
- **BR-16:** Only an active IT Staff User may perform assignment or status mutations. An active IT Staff or Administrator may change IT Priority. `RESOLVED` and `CLOSED` require an assigned active owner; `CANCELLED`, `RESOLVED`, `CLOSED`, and `REOPENED` require `confirm=true`.
- **BR-17:** A no-op status or assignment update is rejected as a conflict rather than silently reported as a change.
- **BR-18:** User email comparison is case-insensitive after trimming; normalized email is unique.
- **BR-19:** An Administrator may not deactivate their own account, change their own role away from Administrator, demote a User who currently owns a Ticket, or leave the system without an active Administrator.
- **BR-20:** User deactivation is the only account removal behavior; no User row or historical Ticket/Comment/Note relationship is deleted.
- **BR-21:** Creating or resetting an initial password sets `mustChangePassword=true` and invalidates the target Userâ€™s existing sessions.
- **BR-22:** Existing Lab 2 Requester IDs and Ticket requester relationships remain unchanged after migration; existing Attachment metadata and bytes remain readable.
- **BR-23:** Seed execution is idempotent: rerunning it updates known fixtures without duplicate Users, Tickets, Comments, or Notes and does not erase non-seed data.
- **BR-24:** All timestamps are generated by the server, stored in UTC, and returned as ISO 8601 strings.
- **BR-25:** Attachment limits, MIME/signature validation, soft removal, and cross-owner protections from Lab 2 remain in force for authenticated calls.

### Ticket status transition matrix

Every mutation uses `PATCH /api/staff/tickets/:ticketId/status`. A blank cell is rejected with `409 INVALID_STATUS_TRANSITION`. `confirm=true` is required for targets marked `â€ `.

| Current | Permitted next status (IT Staff only) |
|---|---|
| `NEW` | `OPEN`, `CANCELLEDâ€ ` |
| `OPEN` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLEDâ€ ` |
| `IN_PROGRESS` | `WAITING_FOR_REQUESTER`, `RESOLVEDâ€ `, `CANCELLEDâ€ ` |
| `WAITING_FOR_REQUESTER` | `IN_PROGRESS`, `RESOLVEDâ€ `, `CANCELLEDâ€ ` |
| `RESOLVED` | `CLOSEDâ€ `, `REOPENEDâ€ ` |
| `CLOSED` | `REOPENEDâ€ ` |
| `REOPENED` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLEDâ€ ` |
| `CANCELLED` | *(terminal)* |

## 7. Data model, migration, and seed decisions

### Final model

The Prisma/PostgreSQL migration shall evolve the Lab 2 schema in place:

| Model | Required fields and relationships |
|---|---|
| `User` | `id Int` (preserved where migrated), `name`, normalized unique `email`, `passwordHash`, `role UserRole`, `isActive`, `mustChangePassword`, `createdAt`, `updatedAt`; requested Tickets, owned Tickets, Comments, Notes, removed Attachments, and Sessions relations |
| `Session` | opaque `id`, unique `tokenHash`, `userId`, `createdAt`, and `expiresAt`; indexed by `userId` and expiry. Revocation deletes the session row. |
| `Ticket` | existing fields plus nullable `ownerId`, `itPriority`, expanded `TicketStatus`, nullable `requesterResolutionIndicatedAt`; requester/owner User foreign keys and comments/notes relations |
| `Comment` | `id`, `ticketId`, `authorId`, `body`, server `createdAt`; Public Comments are a separate table |
| `InternalNote` | `id`, `ticketId`, `authorId`, `body`, server `createdAt`; separate table prevents accidental public serialization |
| `Attachment` | existing bytes/metadata and soft-removal fields; `removedByUserId` replaces the relation name while preserving the integer values |

`UserRole` is the enum `REQUESTER | IT_STAFF | ADMINISTRATOR`. `RequestedPriority` is retained. `itPriority` is the same enum. The expanded `TicketStatus` enum uses the uppercase values in the transition matrix. Foreign keys use restrictive behavior for requester/author rows; owner and removed-by-user relations may be null when an account is deactivated. Indexes cover normalized email, session expiry, `requesterId + currentStatus + updatedAt`, `ownerId + currentStatus + updatedAt`, queue status/priority, and Ticket child lookup by `ticketId + createdAt`.

### Forward migration

1. Add the User, role, session, comment, and note structures and the nullable Ticket fields while the existing tables remain readable.
2. Copy each Lab 2 `DevelopmentRequester` row to `User` with the same `id`, name, email, active state, and timestamps; assign `REQUESTER` and `mustChangePassword=true`. After migration, an operator may set a temporary local `LAB3_MIGRATION_INITIAL_PASSWORD` and run `server`'s `prisma:initialize-legacy-passwords` command; it hashes only rows with an empty credential, never prints the password, and leaves the first-login flag enabled. Stable local fixtures receive their documented seed credentials.
3. Point `Ticket.requesterId` and Attachment removal references at `User` without changing their integer values. Preserve Ticket numbers, submission tokens, Attachment bytes, metadata, and timestamps.
4. Backfill `itPriority=requestedPriority`, retain `NEW` as the existing status, set `ownerId` and the resolution indication to null, then expand the status enum.
5. Rename/remove the Development Requester API and client selector after the data migration. No client-controlled requester state remains.
6. Make the migration fail safely on duplicate normalized email or an orphaned foreign key; run it against a copy before staging. A migration/regression test compares counts, IDs, ownership, and Attachment metadata before and after.

### Seed

The idempotent local seed upserts stable fixtures by normalized email and stable Ticket token. It provides at least four active Requesters and one inactive Requester, three active IT Staff and one inactive IT Staff, and one active Administrator. It also provides realistic Tickets spanning every status, all priorities, assigned and unassigned ownership, Public Comments, and Internal Notes without sensitive information. Fixture Comments/Notes are found by `(ticketId, authorId, body)` before insert so repeated seed runs do not duplicate them. Seed credentials are documented as local-only placeholders in setup instructions and are supplied through environment variables or a local secrets file.

## 8. API and UI contract

The exact route, payload, session, authorization, validation, error, and status contract is in [api-spec.md](./api-spec.md). Screen modes, role navigation, reusable components, responsive behavior, and accessibility rules are in [ui-spec.md](./ui-spec.md).

## 9. Acceptance criteria

- **AC-01:** Given an active User and valid credentials, when login succeeds, then the response contains only safe user identity/role data and an authenticated session is established.
- **AC-02:** Given an unknown email or wrong password, when login is attempted, then no session is created and the documented safe `401` error is returned.
- **AC-03:** Given an inactive User, when login is attempted, then access is rejected with the documented safe inactive-account response.
- **AC-04:** Given `mustChangePassword=true`, when login succeeds, then normal application routes remain blocked until a valid password change succeeds.
- **AC-05:** Given invalid password boundaries or mismatched confirmation, when password change is submitted, then field errors appear and the old credential/session state remains unchanged.
- **AC-06:** Given a valid password change, when it is saved, then the flag clears, the session rotates, and the normal role shell opens; Logout invalidates access and direct protected requests then fail.
- **AC-07:** Given each role, when the shell loads, then only the matrix-permitted navigation/actions are presented and direct unauthorized API calls remain forbidden.
- **AC-08:** Given an authenticated Requester supplies another `requesterId`, when a Ticket route is called, then the server uses the session identity and never returns another Userâ€™s data.
- **AC-09:** Given migrated Lab 2 data, when the migration/regression suite runs, then Ticket/Attachment counts, IDs, ownership, metadata, and bytes remain correct and the selector route/state is gone.
- **AC-10:** Given the seed runs twice, then required role counts and fixture data exist once and non-seed records are not deleted.
- **AC-11:** Given an authenticated Requester, when Lab 2 Ticket and Attachment workflows are used, then own create/list/detail/upload/download/soft-removal behavior still works with session identity.
- **AC-12:** Given a Requester calls another Userâ€™s Ticket or Attachment route, then the response is the documented neutral `404` and no data or mutation is exposed.
- **AC-13:** Given a visible Ticket, when a permitted actor reads or appends a Public Comment, then all permitted roles see escaped content, author, and server time, while editing/deletion is unavailable.
- **AC-14:** Given a Requester calls Internal Note routes, then the server rejects the operation without returning note content; IT Staff can create/read and Administrators can read.
- **AC-15:** Given an owned Ticket not already indicated, when the Requester chooses â€œProblem Appears Resolvedâ€, then a timestamp is recorded without changing formal status; repeat or terminal-status attempts are handled safely.
- **AC-16:** Given realistic Tickets, when IT Staff search, filter, sort, and paginate the Queue, then results, stable ordering, and pagination metadata match the API contract.
- **AC-17:** Given Queue loading, empty, no-results, forbidden, and failure conditions at each viewport, then feedback is understandable and controls remain usable.
- **AC-18:** Given IT Staff opens Ticket Detail, then requester data, both priorities, owner, status, comments, notes, resolution indication, and existing Attachments are grouped correctly.
- **AC-19:** Given an assignment request, then only an active Staff/Administrator target or unassigned value is accepted, claim/reassign works, and unauthorized roles cannot mutate ownership.
- **AC-20:** Given IT Priority changes, then Requested Priority is unchanged, IT Priority is updated only by IT Staff or Administrator, and invalid/no-op values receive safe errors.
- **AC-21:** Given every status pair in the matrix, then permitted transitions succeed only with required confirmation/owner validation and all other pairs return `409` without mutation.
- **AC-22:** Given an Administrator, when User Management loads, then Name, Email, Role, Status, Edit, name/email search, and optional role filter work with stable results.
- **AC-23:** Given an Administrator creates a User, then exactly one permitted role, normalized unique email, activation state, and hashed initial password are stored and next login requires change.
- **AC-24:** Given an Administrator edits a User, then name/email/role/activation validation works, duplicate email is rejected, and no User is deleted.
- **AC-25:** Given an Administrator resets an initial password, then old sessions are invalidated and the next login requires a valid password change.
- **AC-26:** Given self-deactivation or removal/demotion of the last active Administrator, when the request is submitted, then it is rejected with no account-state mutation.
- **AC-27:** Given malformed input, unavailable data, or an unexpected failure, then validation, safe status, field errors, and preserved user input match the documented contract without secrets or stack traces.
- **AC-28:** Given keyboard-only use and desktop/tablet/mobile viewports, then all required screens have logical headings/labels/focus, readable state text, no clipping/overlap, and no horizontal page scrolling.
- **AC-29:** Given the planned unit, API/integration, authorization, migration/regression, UI, style, responsive, and E2E suites, then every AC maps to at least one test and no required test is skipped.
- **AC-30:** Given the final main branch, then the approved contract, Product Definition of Done, peer-review record, AI-use record, and genuine implementation/evidence links are complete.

## 10. Product Definition of Done

### Product completion

- All FRs, BRs, ACs, and the role matrix are implemented and traceable to passing tests.
- The forward migration runs on a copy of Lab 2 data without dropping or reassigning existing Tickets/Attachments; migration/regression checks pass.
- Passwords are hashed, sessions are opaque/HttpOnly and invalidatable, restricted first-login sessions cannot bypass the Change Password screen, and direct API authorization is tested.
- Seed is idempotent and supplies the required active/inactive roles, realistic workflow data, comments, notes, and local-only credentials.
- Unit, API/integration, security/authorization, migration/regression, UI component, style, responsive, and E2E tests pass with none skipped; client/server builds pass.
- Requester regression, Staff Queue/Detail, comments/notes, and Administrator User Management meet `ui-spec.md` at desktop, tablet, and mobile sizes.
- Errors do not expose passwords, hashes, sessions, SQL, filesystem paths, stack traces, or another Userâ€™s protected resource.

### Delivery completion

- The contract and test plan existed before implementation PRs were completed; the evidence link is filled in from Git history.
- GitHub Issues cover contract, tests, migration/authentication, authorization/regression, Staff Queue/Detail, administration, E2E/visual inspection, and release integration.
- Feature branches target `lab3-staging`, are peer-reviewed and merged by the peer reviewer with the agreed merge method, then one release PR reaches `main`.
- `reviewer.md`, `ai-use.md`, README/setup links, screenshots, final test output, and Answer Part 1â€“9 evidence are genuine and current.
- No secrets, generated builds, database dumps, Attachment bytes, or dependency artifacts are committed.

## 11. Assumptions and decisions

- A server-managed opaque cookie session is used because it supports logout and password/deactivation invalidation without putting credentials in browser storage. `SameSite=Lax`, `HttpOnly`, configured CORS credentials, and an allowed-Origin check protect state-changing browser requests; production HTTPS adds `Secure`.
- Nodeâ€™s built-in `crypto.scrypt` with a random 16-byte salt, `N=16,384`, `r=8`, `p=1`, and a 64-byte derived key is the default password-hashing implementation, avoiding a native dependency. A different memory-hard implementation may be substituted only if it preserves the contract and is reviewed.
- Administrator read-only Ticket Detail access exists to honor Public Comment/Internal Note visibility; changing IT Priority is the explicit Administrator exception while all other Ticket mutations remain exclusive to IT Staff.
- The Queue default is all statuses, sorted by `updatedAt DESC` with `id DESC` as the stable tie-breaker; filters and bounds are defined in `api-spec.md`.
- Status transitions that resolve, close, cancel, or reopen require an explicit confirmation field so consequential changes cannot be submitted accidentally.
- Existing Lab 2 integer IDs are retained during the Development Requester-to-User migration. New User IDs continue from the PostgreSQL sequence after the highest preserved ID.
- Actions Taken and any rule depending on it are deferred to Lab 4 as required by the handout.
