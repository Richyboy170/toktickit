# Lab 2 REST API Contract

## 1. Conventions

- Base URL: `/api`; JSON unless an upload or binary response is specified.
- Requester-owned endpoints require `X-Development-Requester-Id: <positive integer>`.
- This header is a Lab 2 testing mechanism, not authentication.
- Dates are ISO 8601 UTC strings. Enum values are uppercase.
- Success bodies use the shapes below. Errors use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "fields": { "summary": "Summary must be 5-120 characters." }
  }
}
```

`fields` is present only for field errors. Responses never expose stacks, SQL, paths, or other Requesters' resource existence.

## 2. Shared Resource Shapes

```ts
type ReferenceItem = { id: number; name: string };
type DevelopmentRequester = { id: number; name: string; email: string };
type RequestedPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type TicketStatus = "NEW";

type TicketSummary = {
  id: number;
  ticketNumber: string;
  ticketDate: string;
  summary: string;
  category: ReferenceItem;
  relatedSystem: ReferenceItem;
  requestedPriority: RequestedPriority;
  currentStatus: TicketStatus;
  updatedAt: string;
};

type AttachmentMetadata = {
  id: number;
  originalName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  sizeBytes: number;
  uploadedAt: string;
  removedAt: string | null;
  removalReason: string | null;
  removedByRequesterId: number | null;
  available: boolean;
};
```

## 3. Reference Endpoints

### `GET /api/categories`

Returns `200 ReferenceItem[]`, active only, ordered by ID. Failure: `500 REFERENCE_DATA_UNAVAILABLE`.

### `GET /api/related-systems`

Returns `200 ReferenceItem[]`, active only, ordered by name. Failure: `500 REFERENCE_DATA_UNAVAILABLE`.

### `GET /api/development-requesters`

Returns `200 DevelopmentRequester[]`, active only, ordered by name. An empty array is valid. Failure: `500 REQUESTERS_UNAVAILABLE`.

## 4. Requester Context

For requester-owned endpoints, a missing, non-integer, or non-positive header returns `400 INVALID_REQUESTER_CONTEXT`. A missing or inactive Requester returns `403 REQUESTER_UNAVAILABLE`. Ownership mismatches return `404 RESOURCE_NOT_FOUND`.

## 5. Tickets

### `POST /api/tickets`

Headers include Requester context and `Content-Type: application/json`.

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

First creation returns `201` and replay returns `200`:

```json
{
  "ticket": {
    "id": 41,
    "ticketNumber": "TKT-20260820-A1B2C3D4",
    "ticketDate": "2026-08-20T04:00:00.000Z",
    "requester": { "id": 1, "name": "Ananda Kittisak", "email": "ananda.k@example.edu" },
    "category": { "id": 4, "name": "Network" },
    "relatedSystem": { "id": 2, "name": "Campus Wi-Fi" },
    "summary": "Campus laptop cannot connect",
    "requestedPriority": "HIGH",
    "description": "The laptop fails to join Campus Wi-Fi after restart.",
    "currentStatus": "NEW",
    "createdAt": "2026-08-20T04:00:00.000Z",
    "updatedAt": "2026-08-20T04:00:00.000Z"
  },
  "replayed": false
}
```

Validation: active integer reference IDs, BR-11 through BR-15. Errors: `400 VALIDATION_ERROR`, `409 TICKET_NUMBER_CONFLICT` after bounded generation retries, `500 TICKET_CREATE_FAILED`.

### `GET /api/tickets`

Query parameters:

| Name | Rule |
|---|---|
| `search` | Optional, trimmed, max 120; number/summary/description contains, case-insensitive |
| `categoryId` | Optional positive active Category ID |
| `relatedSystemId` | Optional positive active Related System ID |
| `requestedPriority` | Optional enum |
| `status` | Optional `NEW` |
| `sort` | `createdAt`, `updatedAt`, `ticketNumber`, or `summary`; default `updatedAt` |
| `order` | `asc` or `desc`; default `desc` |
| `page` | Positive integer; default 1 |
| `pageSize` | 5, 10, 20, or 50; default 10 |

Response `200`:

```json
{
  "items": [],
  "pagination": { "page": 1, "pageSize": 10, "totalItems": 0, "totalPages": 0 },
  "query": { "search": "", "sort": "updatedAt", "order": "desc" }
}
```

Every query includes current Requester ownership. The secondary sort is `id` in the same order. Invalid parameters return `400 INVALID_QUERY` with field errors.

### `GET /api/tickets/:ticketId`

Returns `200` with the full POST Ticket shape plus `attachments: AttachmentMetadata[]`, active first by upload time, followed by removed metadata. Invalid path ID: `400`. Missing/unowned Ticket: `404`.

## 6. Attachments

### `POST /api/tickets/:ticketId/attachments`

`multipart/form-data` with exactly one field named `file`. The upload is read into bounded memory and stored as PostgreSQL binary data only after all validations pass.

Returns `201 { "attachment": AttachmentMetadata }`.

- `400 INVALID_UPLOAD` for absent/multiple file parts or malformed path ID.
- `404 RESOURCE_NOT_FOUND` for missing/unowned Ticket.
- `409 ATTACHMENT_LIMIT_REACHED` when five active Attachments exist; the count and insert are protected by a transaction/advisory lock so concurrent uploads cannot exceed five.
- `413 FILE_TOO_LARGE` above 5,242,880 bytes.
- `415 UNSUPPORTED_FILE_TYPE` when extension, declared MIME, or signature is not an allowed matching type.
- `500 ATTACHMENT_UPLOAD_FAILED` for safe unexpected failure.

The original name is reduced to its basename, control characters are removed, whitespace is normalized, and the stored display/download name is capped at 255 characters.

### `GET /api/tickets/:ticketId/attachments`

Returns `200 AttachmentMetadata[]` for an owned Ticket, including removed metadata but no bytes. Missing/unowned Ticket returns `404`.

### `GET /api/attachments/:attachmentId/download`

Returns `200` binary content with the stored MIME type, `Content-Length`, `X-Content-Type-Options: nosniff`, and a safe UTF-8 `Content-Disposition` filename. Missing/unowned returns `404`; owned removed returns `410 ATTACHMENT_REMOVED`.

### `DELETE /api/attachments/:attachmentId`

```json
{ "reason": "The screenshot contains outdated information." }
```

Returns `200 { "attachment": AttachmentMetadata }` with `available: false`. Reason is trimmed and 3-200 characters. Missing/unowned returns `404`; already removed returns `409 ATTACHMENT_ALREADY_REMOVED`; invalid reason returns `400 VALIDATION_ERROR`.

## 7. Status Summary

| Status | Use |
|---|---|
| 200 | Retrieval, replayed Ticket creation, removal |
| 201 | New Ticket or Attachment |
| 400 | Invalid header, path, JSON, query, or field |
| 403 | Development Requester missing/inactive |
| 404 | Missing or unowned resource |
| 409 | Generation conflict, attachment cap, repeat removal |
| 410 | Owned Attachment was removed |
| 413 | File over 5 MiB |
| 415 | Unsupported/mismatched file type |
| 500 | Safe unexpected failure |

## 8. Lab 3 Transition

Lab 3 replaces `X-Development-Requester-Id` with server-established authenticated identity. Request and resource bodies do not accept an arbitrary `requesterId`, so the ownership boundary can change without redesigning Ticket/Attachment contracts.
