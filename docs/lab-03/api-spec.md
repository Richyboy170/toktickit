# Lab 3 REST API Contract

**Status:** approved contract baseline prepared before implementation; implementation and evidence are pending. The base URL is `/api`. JSON uses UTF-8 unless a download is explicitly binary. Dates are ISO 8601 UTC strings and enum values are uppercase.

## 1. Conventions and authentication

The server creates an opaque 32-byte random session token on successful login and sends it as the `toktickit_session` cookie. Only a SHA-256 hash of the token is stored in `Session`; the raw token is never logged, returned in JSON, stored in local storage, or placed in source control. The cookie is `HttpOnly`, `SameSite=Lax`, `Path=/`, and eight hours absolute lifetime. `Secure` is required in HTTPS deployments. Logout, password change, administrator reset, deactivation, expiry, and session lookup of an inactive User revoke the session.

The client sends `credentials: "include"`. CORS allows only the configured client origin and credentials. Every browser state-changing request (`POST`, `PATCH`, `DELETE`) must send an allowed `Origin` and JSON requests must send `Content-Type: application/json`; an unexpected Origin is rejected with `403 CSRF_ORIGIN_REJECTED`. SameSite cookie protection and this Origin check are the Lab 3 CSRF controls. `GET /api/health` is public; all other routes require a full authenticated session unless noted below.

A session created for `mustChangePassword=true` is a restricted session. It may call `GET /api/auth/me`, `POST /api/auth/change-password`, and `POST /api/auth/logout` only. All other routes return `403 PASSWORD_CHANGE_REQUIRED`.

Errors always have this shape and never include stacks, SQL, filesystem paths, password/hash/session values, or another Userâ€™s protected resource:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "fields": { "email": "Enter a valid email address." }
  }
}
```

`fields` is present only when individual fields can be corrected. Login uses one generic credential error for unknown email and wrong password.

## 2. Shared response shapes

```ts
type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
type RequestedPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type TicketStatus =
  | "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER"
  | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED";

type UserSummary = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

type AdminUser = UserSummary & {
  isActive: boolean;
  mustChangePassword: boolean;
};

type ReferenceItem = { id: number; name: string };
type OwnerSummary = { id: number; name: string; role: "IT_STAFF" | "ADMINISTRATOR" };
type AuthorSummary = { id: number; name: string; role: UserRole };

type AttachmentMetadata = {
  id: number;
  originalName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  sizeBytes: number;
  uploadedAt: string;
  removedAt: string | null;
  removalReason: string | null;
  removedByUserId: number | null;
  available: boolean;
};

type PublicComment = {
  id: number;
  body: string;
  author: AuthorSummary;
  createdAt: string;
};

type InternalNote = {
  id: number;
  body: string;
  author: AuthorSummary;
  createdAt: string;
};

type Ticket = {
  id: number;
  ticketNumber: string;
  ticketDate: string;
  requester: UserSummary;
  category: ReferenceItem;
  relatedSystem: ReferenceItem;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority;
  currentStatus: TicketStatus;
  owner: OwnerSummary | null;
  requesterResolutionIndicatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  attachments?: AttachmentMetadata[];
  publicComments?: PublicComment[];
  internalNotes?: InternalNote[];
};
```

`requester` is included in responses only where the caller is allowed to see it. A Requester receives no `internalNotes`; IT Staff and Administrators receive notes only on a Ticket detail they may read. Attachment bytes are never included in JSON.

## 3. Public and authentication routes

### `GET /api/health`

Returns `200 { "status": "ok", "service": "TokTickIT API" }`. It does not query the database or disclose configuration.

### `POST /api/auth/login`

Public. Body:

```json
{ "email": "ananda.r@example.edu", "password": "LocalOnly-Password1" }
```

Email is trimmed/lowercased; password is checked without normalization. A valid active User returns `200` and sets the session cookie:

```json
{
  "user": { "id": 1, "name": "Ananda Kittisak", "email": "ananda.r@example.edu", "role": "REQUESTER" },
  "mustChangePassword": true
}
```

Unknown email or wrong password returns `401 INVALID_CREDENTIALS` with the same message. An inactive account returns `403 ACCOUNT_INACTIVE` with a safe message. Invalid input returns `400 VALIDATION_ERROR`; a bounded five-failure-per-email/IP window returns `429 LOGIN_RATE_LIMITED`.

### `POST /api/auth/logout`

Authenticated or already logged out. Revokes the current session and clears the cookie. Returns `204` with no body; it is idempotent.

### `GET /api/auth/me`

Authenticated, including a restricted first-login session. Returns `200` with the `user` and `mustChangePassword` fields used by the shell. Missing, expired, revoked, or deactivated sessions return `401 AUTH_REQUIRED`.

### `POST /api/auth/change-password`

Authenticated. The current password is required even for an initial-password session; the server validates `newPassword` and `confirmPassword` using BR-05, then hashes the new password, clears `mustChangePassword`, revokes old sessions, and issues a rotated full session cookie. Body:

```json
{
  "currentPassword": "LocalOnly-Password1",
  "newPassword": "NewLocalPassword2",
  "confirmPassword": "NewLocalPassword2"
}
```

Returns `200 { "user": UserSummary, "mustChangePassword": false }`. Wrong current password is `401 INVALID_CURRENT_PASSWORD`; invalid fields are `400 VALIDATION_ERROR`; a restricted or full session may use this route.

## 4. Authenticated reference data

`GET /api/categories` and `GET /api/related-systems` return `200 ReferenceItem[]` for any full session, active records only, with stable ordering (`id ASC` for Categories, `name ASC, id ASC` for Related Systems). Database failure returns `500 REFERENCE_DATA_UNAVAILABLE`. The Lab 2 `GET /api/development-requesters` route is removed; it does not select identity and must not be used by the client.

## 5. Requester Ticket and Attachment routes

These routes preserve the Lab 2 resource shapes while taking identity from the session. Requester list/create routes are available only to `REQUESTER`; Ticket detail, public comments, and Attachment reads are role-sensitive as described below.

### `POST /api/tickets`

Requester only. The body is the Lab 2 body without `requesterId`:

```json
{
  "categoryId": 1,
  "relatedSystemId": 2,
  "summary": "Campus laptop cannot connect",
  "requestedPriority": "HIGH",
  "description": "The laptop fails to join Campus Wi-Fi after restart.",
  "submissionToken": "f6d0b86b-e713-47ad-a48d-46b863b83c9f"
}
```

The server validates active references and creates one `NEW` Ticket with `itPriority` copied from `requestedPriority`, no owner, and the session User as requester. First submission returns `201 { "ticket": Ticket, "replayed": false }`; the same token for the same User returns `200 { "ticket": Ticket, "replayed": true }`. A supplied `requesterId` is rejected with `400 INVALID_REQUESTER_CONTEXT` rather than trusted. Field errors use `400 VALIDATION_ERROR`; bounded Ticket-number conflict uses `409 TICKET_NUMBER_CONFLICT`; unexpected failure uses `500 TICKET_CREATE_FAILED`.

### `GET /api/tickets`

Requester only; the query is always restricted to the session User. Supported query parameters:

| Parameter | Rule |
|---|---|
| `search` | Optional trimmed text, max 120; contains search over ticket number, summary, and description |
| `categoryId` / `relatedSystemId` | Optional positive existing reference ID |
| `requestedPriority` / `status` | Optional enum values |
| `sort` | `createdAt`, `updatedAt`, `ticketNumber`, or `summary`; default `updatedAt` |
| `order` | `asc` or `desc`; default `desc` |
| `page` | Positive integer; default `1` |
| `pageSize` | `5`, `10`, `20`, or `50`; default `10` |

Returns `200`:

```json
{
  "items": [],
  "pagination": { "page": 1, "pageSize": 10, "totalItems": 0, "totalPages": 0 },
  "query": { "search": "", "sort": "updatedAt", "order": "desc" }
}
```

The secondary ordering key is `id` in the requested direction. Invalid values return `400 INVALID_QUERY` with field errors.

### `GET /api/tickets/:ticketId`

Full-session role-sensitive detail:

- Requester: only their own Ticket; returns active/removed Attachment metadata and Public Comments.
- IT Staff may use the dedicated Staff Detail route below; the response contains the same operational fields, Attachment metadata, Public Comments, and Internal Notes.
- Administrator: any Ticket read-only; returns the same visible detail for inspection, including Public Comments and Internal Notes, but no staff mutation capability.

It returns `200 { "ticket": Ticket }`. A malformed ID is `400 INVALID_PATH`; a missing or unowned resource is `404 RESOURCE_NOT_FOUND`.

### Attachment routes

`GET /api/tickets/:ticketId/attachments` returns `200 AttachmentMetadata[]` for a visible Ticket, including removed metadata and no bytes. `POST /api/tickets/:ticketId/attachments` accepts exactly one multipart field named `file` and is allowed only to the owning Requester; it returns `201 { "attachment": AttachmentMetadata }`. `GET /api/attachments/:attachmentId/download` returns active binary content with stored MIME, `Content-Length`, `Content-Disposition` using a sanitized UTF-8 filename, and `X-Content-Type-Options: nosniff`; it is allowed to the owning Requester, IT Staff, and Administrator. `DELETE /api/attachments/:attachmentId` soft-removes an owned Attachment with body `{ "reason": "..." }` and returns `200 { "attachment": AttachmentMetadata }`; only the owning Requester may call it.

Attachment validation and statuses retain Lab 2 behavior: `400 INVALID_UPLOAD` for malformed parts/path, `404 RESOURCE_NOT_FOUND` for missing/unowned Ticket or Attachment, `409 ATTACHMENT_LIMIT_REACHED` for five active files or repeat removal (`ATTACHMENT_ALREADY_REMOVED`), `410 ATTACHMENT_REMOVED` for an owned removed download, `413 FILE_TOO_LARGE` above 5 MiB, `415 UNSUPPORTED_FILE_TYPE` for extension/MIME/signature mismatch, and `500 ATTACHMENT_UPLOAD_FAILED` for safe unexpected failures.

### `GET /api/tickets/:ticketId/comments` and `POST /api/tickets/:ticketId/comments`

`GET` is allowed to a Requester who owns the Ticket, IT Staff, and Administrator and returns `200 PublicComment[]` ordered by `createdAt ASC, id ASC`. `POST` is allowed to the owner Requester or IT Staff and accepts `{ "body": "The service is available again." }`; trimmed non-whitespace content is required, capped at 2,000 characters, and returns `201 { "comment": PublicComment }`. Empty/oversized content is `400 VALIDATION_ERROR`; an Administrator attempting to post is `403 FORBIDDEN`.

### `POST /api/tickets/:ticketId/resolution-indication`

Requester owner only. Body is `{ "appearsResolved": true }`. The server records `requesterResolutionIndicatedAt` once and returns `200 { "ticket": Ticket }`; it never changes `currentStatus`. A repeat indication returns `409 RESOLUTION_ALREADY_INDICATED`, and an invalid body or unowned Ticket returns the documented `400`/`404` response.

## 6. IT Staff Queue and Ticket operations

Queue and Staff Detail routes in this section require an active `IT_STAFF` session. Assignment and status mutations are IT Staff-only. The IT Priority mutation is available to active IT Staff or Administrators because the handout explicitly permits both roles to change IT Priority. The read-only Internal Note retrieval route is also available to Administrators.

### `GET /api/staff/tickets`

Returns the shared Queue. Search covers ticket number, summary, description, and requester name/email. Filters are:

| Parameter | Rule |
|---|---|
| `search` | Optional trimmed text, max 120 |
| `categoryId` / `relatedSystemId` | Optional positive existing reference ID |
| `requestedPriority` / `itPriority` / `status` | Optional enum values |
| `ownerId` | Positive User ID or literal `unassigned`; omitted means any owner |
| `sort` | `createdAt`, `updatedAt`, `ticketNumber`, `summary`, `requestedPriority`, `itPriority`, `currentStatus`, or `owner`; default `updatedAt` |
| `order` | `asc` or `desc`; default `desc` |
| `page` | Positive integer; default `1` |
| `pageSize` | `10`, `20`, or `50`; default `20` |

The stable secondary key is `id` in the requested direction. Returns:

```json
{
  "items": [
    {
      "id": 41,
      "ticketNumber": "TKT-20260820-A1B2C3D4",
      "ticketDate": "2026-08-20T04:00:00.000Z",
      "requester": { "id": 1, "name": "Ananda Kittisak", "email": "ananda.r@example.edu", "role": "REQUESTER" },
      "summary": "Campus laptop cannot connect",
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "currentStatus": "OPEN",
      "owner": null,
      "updatedAt": "2026-08-20T04:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1 },
  "query": { "search": "", "sort": "updatedAt", "order": "desc" }
}
```

Invalid query parameters return `400 INVALID_QUERY`; database failure returns `500 QUEUE_UNAVAILABLE`.

### `GET /api/staff/users`

IT Staff only. Returns `200 UserSummary[]` for active `IT_STAFF` and `ADMINISTRATOR` Users, ordered by `name ASC, id ASC`, for the assignment control. Password, activation, and session fields are omitted. Database failure returns `500 STAFF_USERS_UNAVAILABLE`.

### `GET /api/staff/tickets/:ticketId`

IT Staff only. Returns `200 { "ticket": Ticket }` for any Ticket, including operational fields, active/removed Attachment metadata, Public Comments, and Internal Notes. A malformed ID is `400 INVALID_PATH`; a missing Ticket is `404 RESOURCE_NOT_FOUND`; a database failure is `500 TICKET_DETAIL_UNAVAILABLE`.

### `POST /api/staff/tickets/:ticketId/claim`

Assigns the current IT Staff User as owner. It has the same response and missing/no-op behavior as assignment and returns `200 { "ticket": Ticket }`.

### `PATCH /api/staff/tickets/:ticketId/assignment`

Body `{ "ownerUserId": 7 }` assigns/reassigns to an active IT Staff or Administrator; `{ "ownerUserId": null }` unassigns. `{ "claim": true }` is shorthand for assigning the current Staff User. Returns `200 { "ticket": Ticket }`. Invalid/inactive/wrong-role targets return `400 INVALID_OWNER`; missing Ticket `404 RESOURCE_NOT_FOUND`; no-op `409 ASSIGNMENT_UNCHANGED`.

### `PATCH /api/staff/tickets/:ticketId/priority`

Active IT Staff or Administrator. Body `{ "itPriority": "URGENT" }`. Returns `200 { "ticket": Ticket }`. Requested Priority is unchanged. Invalid value returns `400 VALIDATION_ERROR`; missing Ticket is `404 RESOURCE_NOT_FOUND`; unchanged value is `409 PRIORITY_UNCHANGED`.

### `PATCH /api/staff/tickets/:ticketId/status`

Body `{ "status": "RESOLVED", "confirm": true }`. Only transitions in the matrix below are accepted. `confirm=true` is required for `CANCELLED`, `RESOLVED`, `CLOSED`, and `REOPENED`; `RESOLVED` and `CLOSED` also require an assigned active owner. Returns `200 { "ticket": Ticket }`; invalid enum is `400 VALIDATION_ERROR`; invalid pair is `409 INVALID_STATUS_TRANSITION`; missing owner is `409 OWNER_REQUIRED`; missing Ticket is `404 RESOURCE_NOT_FOUND`.

| Current | Permitted next status |
|---|---|
| `NEW` | `OPEN`, `CANCELLED` (confirm) |
| `OPEN` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED` (confirm) |
| `IN_PROGRESS` | `WAITING_FOR_REQUESTER`, `RESOLVED` (confirm), `CANCELLED` (confirm) |
| `WAITING_FOR_REQUESTER` | `IN_PROGRESS`, `RESOLVED` (confirm), `CANCELLED` (confirm) |
| `RESOLVED` | `CLOSED` (confirm), `REOPENED` (confirm) |
| `CLOSED` | `REOPENED` (confirm) |
| `REOPENED` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED` (confirm) |
| `CANCELLED` | *(terminal)* |

### `GET /api/staff/tickets/:ticketId/notes` and `POST /api/staff/tickets/:ticketId/notes`

`GET` returns `200 InternalNote[]` ordered by `createdAt ASC, id ASC` for IT Staff and Administrators. `POST` is IT Staff only and accepts `{ "body": "Checked the VPN gateway logs." }`; it returns `201 { "note": InternalNote }`. Empty/oversized content is `400 VALIDATION_ERROR`; Requester access is `403 FORBIDDEN` and does not reveal note content.

## 7. Administrator User Management

Every route in this section requires an active `ADMINISTRATOR` session. There is no deletion, pagination, bulk operation, import/export, or multi-role payload.

### `GET /api/admin/users`

Optional query `search` (trimmed max 120, contains over name/email) and `role` (one `UserRole`). Results are ordered by `name ASC, id ASC` and capped at 200; no pagination is required. Returns `200 { "items": AdminUser[], "query": { "search": "", "role": null } }`. Invalid role/query returns `400 INVALID_QUERY`; non-Administrators receive `403 FORBIDDEN`.

### `POST /api/admin/users`

Body:

```json
{
  "name": "Kanya Staff",
  "email": "kanya.staff@example.edu",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "LocalOnly-Password1"
}
```

The server normalizes email, hashes the initial password, sets `mustChangePassword=true`, and returns `201 { "user": AdminUser }`. Duplicate normalized email returns `409 EMAIL_ALREADY_EXISTS`; invalid fields/role/password return `400 VALIDATION_ERROR`.

### `PATCH /api/admin/users/:userId`

Accepts one or more of `name`, `email`, `role`, and `isActive`; all supplied fields are validated and omitted fields remain unchanged. Returns `200 { "user": AdminUser }`. Duplicate email is `409 EMAIL_ALREADY_EXISTS`; malformed ID is `400 INVALID_PATH`; missing User is `404 USER_NOT_FOUND`; self-deactivation, changing the current Administrator away from Administrator, demoting a User who currently owns a Ticket, or removing/demoting/deactivating the last active Administrator is `409 ADMIN_SAFETY_VIOLATION`. User rows are never deleted.

### `POST /api/admin/users/:userId/initial-password`

Body `{ "initialPassword": "LocalOnly-NewPassword2" }`. The password is hashed, `mustChangePassword` is set, all target sessions are revoked, and `201 { "user": AdminUser }` is returned. Invalid input is `400 VALIDATION_ERROR`; missing User is `404 USER_NOT_FOUND`.

## 8. Authorization and status summary

The server evaluates authentication first, then restricted-password state, then role, then ownership. Missing/unowned Ticket, Attachment, or note resources use the neutral `404 RESOURCE_NOT_FOUND` response where exposing existence would cross an ownership boundary.

| HTTP status | Contract use |
|---|---|
| `200` | Reads and successful updates; replayed Ticket creation; resolution indication |
| `201` | New Ticket, Attachment, Comment, Note, User, or initial-password reset |
| `204` | Idempotent Logout |
| `400` | Malformed path, body, query, Origin, or field validation |
| `401` | Missing/expired/revoked session, invalid credentials, or invalid current password |
| `403` | Inactive account, forbidden role, restricted first-login route, or CSRF Origin failure |
| `404` | Missing/unowned Ticket, Attachment, Note, or User |
| `409` | Duplicate email/token/number, no-op mutation, invalid status transition, owner requirement, safety rule, or attachment conflict |
| `410` | Owned Attachment content was soft-removed |
| `413` | File exceeds 5 MiB |
| `415` | Unsupported or mismatched Attachment type |
| `429` | Login rate limit |
| `500` | Safe unexpected server/data failure |
