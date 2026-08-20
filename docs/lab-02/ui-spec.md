# Lab 2 Zen Green UI Specification

## 1. Design Tokens

| Token | Value | Use |
|---|---|---|
| `--green-900` | `#004D2B` | Dark emphasis/text on pale surfaces |
| `--green-800` | `#006B3C` | Header and primary actions |
| `--green-700` | `#0B7A46` | Active navigation, links, focus/hover |
| `--green-100` | `#EAF6EF` | Selected and success emphasis |
| `--page` | `#F5F7F6` | Page background |
| `--surface` | `#FFFFFF` | Cards and editable controls |
| `--readonly` | `#F0F3EF` | Read-only fields |
| `--text` | `#17352A` | Body text |
| `--muted` | `#587066` | Secondary text |
| `--border` | `#C8D5CF` | Neutral borders |
| `--error` | `#9B1C1C` | Error text/border |
| `--warning` | `#8A5200` | Warning callouts/badges |

Use a system sans-serif stack, 16 px body text, 1.5 line height, 4/8/12/16/24/32 px spacing steps, 8 px control/card radii, subtle borders, and restrained shadows. Content is centered at max-width 1200 px.

## 2. Application Shell

- Header contains TokTickIT identity, My Tickets, Create Ticket, current Requester name, and Change Requester.
- Active navigation has text plus a non-color indicator (`aria-current="page"` and underline/background).
- Desktop navigation is horizontal. Below 768 px it becomes a labelled, keyboard-operable menu; no icon-only mystery actions.
- Without valid requester context, owned routes redirect to `/select-requester`.
- Main content begins with one `h1`; heading order remains logical.

## 3. Development Requester Selection

- Card contains title, fixed explanatory text stating this is not login, labelled Requester select, and Continue button.
- Initial/loading: disabled select/button and visible `role="status"` message.
- Success: active Requesters populate the select; Continue remains disabled until selection.
- Empty: explanatory empty state with Retry; no Continue action.
- Failure: safe `role="alert"` with Retry.
- Continue stores selection and opens My Tickets. Change Requester returns here with the existing value selected.

## 4. Reusable Components

- Labels appear above fields with consistent weight. Required labels include a visible red asterisk and screen-reader text.
- Inputs have a 44 px minimum height; Description has a minimum 160 px height.
- Editable fields are white. Read-only fields use `--readonly`, `aria-readonly`, and text indicating system generation where useful.
- Invalid fields use `aria-invalid`, `aria-describedby`, an error border, and an immediate message below the field.
- Focus uses a visible 3 px green outline with adequate contrast; it is never removed.
- Buttons: primary green, secondary outlined, tertiary text/link, destructive dark red, disabled reduced contrast plus disabled semantics, busy spinner plus changing text.
- Alerts include an icon/text label and never rely only on color.
- Status/Priority badges always include text. `NEW` uses pale green; LOW neutral, MEDIUM blue/neutral, HIGH amber, URGENT red.
- Loading skeleton/spinner has accessible status text. Empty/no-results states include a heading, explanation, and relevant action.

## 5. Create Ticket

- Header contains title and short guidance.
- First group: read-only Ticket Number (`Generated after submission`), Ticket Date (`Set after submission`), and Requester.
- Classification group: Category, Related System, Requested Priority.
- Main group: full-width Summary and Description.
- Attachment picker sits below the main fields with allowed types, 5 MiB/file, and five-active-file guidance visible before selection.
- Selected files list name, size, state, field-specific error, and Remove-from-selection action.
- Actions: primary Submit Ticket and secondary Clear Form. Clear requires confirmation when data exists.
- Submitting disables mutable controls and shows `Submitting ticket...`; files upload after the Ticket response with per-file progress/state.
- Success prominently displays the official number plus View Ticket and Create Another actions. Partial upload success identifies failed filenames and offers View Ticket to retry.
- API failure appears above actions and preserves values/focuses the alert; field errors also remain beside fields.

## 6. My Tickets

- Header includes title and Create Ticket primary action.
- Toolbar contains search, Category, Related System, Priority, Status, Sort, Order, Apply, and Clear Filters.
- Desktop (>=992 px): table shows Ticket Number, Summary, Category, Related System, Requested Priority, Status, Updated, and an explicit View action.
- Tablet (768-991 px): compact table may hide Related System from the row while preserving it in accessible detail.
- Mobile (<768 px): one card per Ticket with Ticket Number, Summary, Category, Priority, Status, Updated, and full-width View Ticket.
- Pagination includes Previous/Next, current page, total pages/items, and page-size control; disabled boundary buttons cannot activate.
- Initial empty state offers Create Ticket. Filtered zero results offers Clear Filters. Failure offers Retry without discarding controls.

## 7. Requester Ticket Detail

- Back to My Tickets appears before the heading.
- Ticket Number and Status lead the page. All Ticket data is presented in labelled read-only groups.
- Attachment section is visually separate and contains Add Attachment plus rows/cards.
- Active Attachment shows name, type/size/date, Preview where supported, and Download/Remove actions.
- Uploading row is busy and cannot be removed. Invalid upload displays its reason without changing existing rows.
- Removed row remains visible, marked `Removed`, shows removed date/reason, and has no Preview/Download/Remove action.
- Removal opens an accessible dialog with filename, required reason textarea, Cancel, and destructive Confirm Removal. Initial focus is in the dialog and returns to the trigger.
- Detail missing/unowned uses the same neutral `Ticket not found` state.

## 8. Responsive Rules

| Viewport | Behavior |
|---|---|
| Desktop >=992 px | Multi-column forms, full table, horizontal shell |
| Tablet 768-991 px | Two columns where useful; Summary/Description full width; compact table |
| Mobile <768 px | Single-column fields/cards; 44 px touch targets; stacked actions |

All sizes prohibit clipped labels, overlapping validation, hidden buttons, unreadable filenames, and horizontal page scrolling. Long Ticket/file text wraps safely.

## 9. Accessibility

- Semantic landmarks, one page `h1`, logical headings, explicit form labels, and descriptive button/link names.
- Keyboard access for all functionality; no hover-only information.
- `role="status"` for non-urgent loading/progress and `role="alert"` for errors.
- Success/error/warning/priority/status meaning includes text, not color alone.
- Modal focus containment, Escape cancellation, focus restoration, and background inertness.
- Images use useful alt text; decorative icons are hidden. Tooltips supplement but never replace labels.

## 10. Visual Evidence Checklist

- [ ] Zen Green tokens and button hierarchy match this document.
- [ ] Editable, read-only, invalid, disabled, focused, and busy controls are distinct.
- [ ] Required markers and field errors are adjacent and accessible.
- [ ] Desktop/tablet/mobile have no clipping, overlap, or horizontal page overflow.
- [ ] Desktop Ticket table and mobile cards show equivalent essential information.
- [ ] Search, filters, pagination, dialogs, and Attachment actions remain usable at every size.
- [ ] Empty versus no-results states are distinct.
- [ ] Active, uploading, invalid, removed, and unavailable Attachment states are visible.

Screenshots are stored under `artifacts/lab-02/screenshots/{requester-selection,create-ticket,my-tickets,ticket-detail}/{desktop,tablet,mobile}/` with descriptive state filenames.
