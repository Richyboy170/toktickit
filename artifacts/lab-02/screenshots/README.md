# Lab 2 Visual Evidence

Generated on 20 August 2026 by the passing Chromium Playwright run `npm run test:e2e` against the isolated `toktickit_test` database. Ticket Numbers and timestamps are generated at runtime and therefore change when evidence is regenerated.

## Captured states

- `requester-selection/desktop/populated.png`: testing-only explanation, active selector, disabled continuation.
- `create-ticket/desktop/validation-errors.png`: required fields, read-only fields, adjacent errors, attachment guidance.
- `create-ticket/desktop/success.png`: official backend Ticket Number and next actions.
- `my-tickets/desktop/loading.png`: controls retained during delayed API response.
- `my-tickets/desktop/api-failure.png`: safe failure with Retry.
- `my-tickets/tablet/populated.png`: compact table at 820 px.
- `my-tickets/mobile/populated.png`: stacked controls and mobile Ticket card at 390 px.
- `ticket-detail/desktop/active-attachment.png`: read-only Ticket fields and active actions.
- `ticket-detail/desktop/removal-dialog.png`: focused accessible confirmation and required reason.
- `ticket-detail/desktop/removed-attachment.png`: retained metadata without active actions or preview.
- `ticket-detail/desktop/cross-requester-not-found.png`: neutral ownership-protected state.
- `ticket-detail/mobile/removed-attachment.png`: stacked read-only fields and retained metadata at 390 px.

## Visual review result

All captured desktop, tablet, and mobile states were inspected after the final passing run. Required content is readable; labels and actions do not clip or overlap; long Ticket/file content wraps; disabled, error, success, read-only, priority/status, and destructive states remain distinguishable with text; and automated viewport assertions found no horizontal page overflow. Visual inspection identified and led to the fix that clears an open preview when its Attachment is soft-removed.
