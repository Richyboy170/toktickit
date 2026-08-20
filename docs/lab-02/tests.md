# Lab 2 Test Plan and Results

## 1. Test Strategy

Tests are planned from the approved contract before feature implementation. Unit tests cover deterministic rules, API/integration tests exercise Express and a dedicated PostgreSQL test database, UI tests isolate React behavior with mocked HTTP, and Playwright proves complete Requester workflows and responsive presentation. Every Acceptance Criterion maps to at least one planned automated test; manual visual inspection supplements rather than replaces automation.

## 2. Planned Tests

| ID | Type | Requirement/AC | What it proves | Expected result | Automated file | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-01/02, AC-04 | Ticket Number format/generator retry inputs | Required format; controlled date | `server/tests/lab-02/ticket-number.unit.test.ts` | Pending |
| UNIT-02 | Unit | BR-12/13/18-23, AC-05/11 | Ticket/query validation and boundaries | Normalized valid data; field errors otherwise | `server/tests/lab-02/validation.unit.test.ts` | Pending |
| UNIT-03 | Unit | BR-25-29, AC-16 | Filename, extension/MIME/signature, exact size | Only matching permitted files accepted | `server/tests/lab-02/attachments.unit.test.ts` | Pending |
| API-01 | API | FR-01/04, AC-01 | Active reference data | Required active rows only | `server/tests/lab-02/reference-data.api.test.ts` | Pending |
| API-02 | API | FR-05/06, AC-04 | Valid Ticket creation | 201; one NEW Ticket; official number | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-03 | API | AC-05/07 | Create validation and safe DB failure | 400 field errors or safe 500; no Ticket | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-04 | API | BR-14/15, AC-06 | Duplicate submission replay | One Ticket; 200 replay | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-05 | API | FR-08/09, AC-10/11 | Owned list, search/filter/sort/page | Correct owned items and metadata | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-06 | API | BR-22-24, AC-12 | Empty, no-results, invalid and beyond-last page | Documented 200/400 shapes | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-07 | API | FR-10, AC-13/14 | Owned detail and cross-owner protection | Owned 200; other/missing 404 | `server/tests/lab-02/ticket-detail.api.test.ts` | Pending |
| API-08 | API | FR-11/12, AC-15 | Valid upload, metadata, download | 201/200 and matching bytes/headers | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-09 | API | BR-25-28, AC-16 | Type, size and active-count boundaries | 413/415/409; no row | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-10 | API | FR-13/14, AC-17 | Soft removal and blocked content | Metadata retained; download 410 | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-11 | API | BR-09, AC-18 | Every cross-owner Attachment operation | Uniform 404; no mutation | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| UI-01 | UI | FR-01-03, AC-01/02/03 | Selection load, empty, failure, continue, switch | Correct context/navigation/states | `client/tests/lab-02/RequesterSelection.test.tsx` | Pending |
| UI-02 | UI | FR-04-07, AC-04/05/07 | Create loading, validation, busy, success/failure | Correct fields/actions; values preserved | `client/tests/lab-02/CreateTicket.test.tsx` | Pending |
| UI-03 | UI | AC-08/09 | File selection and partial upload | Invalid rejected; Ticket success retained | `client/tests/lab-02/CreateTicket.test.tsx` | Pending |
| UI-04 | UI | FR-08/09, AC-10/11/12 | My Tickets controls and states | Correct query, rows/cards and feedback | `client/tests/lab-02/MyTickets.test.tsx` | Pending |
| UI-05 | UI | FR-10, AC-13/14 | Read-only owned detail/not-found | Correct groups or neutral not-found | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Pending |
| UI-06 | UI | FR-11-14, AC-15-18 | Attachment active/invalid/removed/dialog states | Accessible controls and retained metadata | `client/tests/lab-02/AttachmentSection.test.tsx` | Pending |
| UI-07 | Style | AC-19/20 | Required labels/classes/states/mobile cards | Zen Green and accessibility assertions pass | `client/tests/lab-02/ResponsiveStyle.test.tsx` | Pending |
| E2E-01 | E2E | AC-02/04/10/14 | Select, create, find, open | Official number persists end to end | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |
| E2E-02 | E2E | AC-03/13/18 | Switch Requester/direct ownership attempts | A data disappears; access blocked | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |
| E2E-03 | E2E | AC-08/09/15-17 | Upload/download/remove lifecycle | Valid bytes work; removed blocked | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |
| E2E-04 | Responsive | AC-19/20 | Desktop/tablet/mobile flows/screenshots | No overflow/clipping; controls usable | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |

## 3. Acceptance-Criterion Traceability

| AC | Tests |
|---|---|
| AC-01 | API-01, UI-01 |
| AC-02 | UI-01, E2E-01 |
| AC-03 | UI-01, E2E-02 |
| AC-04 | UNIT-01, API-02, UI-02, E2E-01 |
| AC-05 | UNIT-02, API-03, UI-02 |
| AC-06 | API-04 |
| AC-07 | API-03, UI-01, UI-02 |
| AC-08 | UNIT-03, UI-03, E2E-03 |
| AC-09 | UI-03, E2E-03 |
| AC-10 | API-05, UI-04, E2E-01 |
| AC-11 | UNIT-02, API-05, UI-04 |
| AC-12 | API-06, UI-04 |
| AC-13 | API-07, E2E-02 |
| AC-14 | API-07, UI-05, E2E-01 |
| AC-15 | UNIT-03, API-08, UI-06, E2E-03 |
| AC-16 | UNIT-03, API-09, UI-06, E2E-03 |
| AC-17 | API-10, UI-06, E2E-03 |
| AC-18 | API-11, UI-06, E2E-02 |
| AC-19 | UI-01 through UI-07, E2E-04 |
| AC-20 | UI-07, E2E-04, visual checklist |

## 4. Responsive and Visual Checklist

- [ ] Requester selector: loading, populated, empty, failure at desktop/mobile.
- [ ] Create: initial, validation, submitting, success, API failure, invalid file, partial upload.
- [ ] My Tickets: populated A, switched B, search/filter/sort/page, empty, no-results, failure.
- [ ] Detail: owned, active upload/download, invalid/sixth file, removal dialog, removed metadata, unavailable content, not-found.
- [ ] Desktop >=992, tablet 768-991, and mobile <768 have no clipping, overlap, hidden actions, unreadable filenames, or horizontal page overflow.
- [ ] Editable/read-only/error/focus/disabled/busy styles, button hierarchy, badges, and non-color feedback match `ui-spec.md`.

## 5. Test Commands

```bash
cd server
npm run build
npm test

cd ../client
npm run build
npm test

cd ..
npm run test:e2e
```

Database integration uses a dedicated `toktickit_test` database and runs the committed migrations/seed before suites. CI repeats the same commands with PostgreSQL service configuration.

## 6. Final Results

Not yet recorded. This section will contain dated command output summaries and evidence links only after the corresponding commands pass on the final feature branch, `lab2-staging`, and final `main`.

## 7. Known Limitations or Deferred Tests

None approved. Any discovered limitation remains open on its Issue and prevents Product Definition of Done until corrected or explicitly approved in the engineering contract.
