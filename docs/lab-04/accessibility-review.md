# Lab 4 Accessibility Review

**Status:** Source and browser review completed for the scoped checks below. PR #58 was peer reviewed and merged; its server/client/E2E checks passed in run 37314112381. Final-main CI run 37747697657 passed after the follow-up dependency fix. Manual screen-reader and physical-device testing were not performed.

## Scope and method

Reviewed the desktop, tablet, and mobile Playwright captures, the UI components and shared styles, and the existing Testing Library/Playwright assertions. The reviewed screens are the Staff and Requester dashboards and staff-editable and Requester read-only Ticket detail views. The release visual workflow captures 1280×900, 820×1000, and 390×844 and checks for page-level horizontal overflow.

## Findings and changes

| Check | Finding | Change/evidence |
|---|---|---|
| Mobile Requester navigation | At 390px the four navigation links were squeezed into one row, splitting labels such as “Dashboard” and “Change Password” within words. | Use a two-column mobile grid and normal word wrapping. The browser test checks a minimum 140px tab width and visible keyboard focus. |
| Action follow-up control | The checkbox appeared on a separate line from its text label. The input remained labelled, but the visual association was weak. | Apply the existing inline `.checkbox-field` treatment. `ActionsTaken.test.tsx` verifies the checkbox retains its programmatic name and uses the aligned label class. |
| Status and priority | Badges use color and visible status/priority text. | Confirmed the rendered labels in the role-specific screenshots and source. Color is not the only cue. |
| Keyboard focus | Shared CSS defines a 3px `:focus-visible` outline. | Playwright presses Tab in the browser and checks the focused control is visible with a solid outline. |
| Labels, errors, and structure | Forms use associated `<label>` elements; page sections and navigation have accessible names; errors use `role="alert"` and `aria-describedby` where appropriate. | Reviewed `AppShell`, Action forms, Ticket forms, the attachment dialog, and existing accessible role/label tests. |
| Responsive layout | Long Ticket numbers, summaries, and Action text wrap in the reviewed captures; the visual workflow checks document width at all three target viewports. | Verified by the final-main visual job and repeated on the accessibility follow-up branch. |

## Color contrast

Contrast ratios were calculated from the literal CSS theme colors using the WCAG relative-luminance formula. Text pairs meet the 4.5:1 minimum for normal text; the focus indicator also exceeds the 3:1 non-text contrast criterion against the light page and surface colors.

| Foreground | Background | Ratio |
|---|---|---:|
| Body `#17352a` | Page `#f5f7f6` | 12.36:1 |
| Link/focus `#0b7a46` | Page `#f5f7f6` | 5.02:1 |
| Muted `#587066` | White surface `#ffffff` | 5.35:1 |
| White button text `#ffffff` | Primary button `#006b3c` | 6.63:1 |
| Navigation `#eaf6ef` | Header `#006b3c` | 5.97:1 |
| Urgent badge `#8f1818` | `#fee2e2` | 7.44:1 |
| High badge `#704300` | `#fff0d1` | 7.48:1 |
| Medium badge `#264d91` | `#e7efff` | 7.12:1 |
| Status/low badge `#004d2b` | `#eaf6ef` | 9.03:1 |
| Error `#9b1c1c` | `#fff4f4` | 7.57:1 |
| Warning `#613b00` | `#fff8e8` | 9.30:1 |

## Limits

This is a source, browser, and screenshot review. No manual NVDA, JAWS, or VoiceOver session was run, so this record does not claim a full assistive-technology audit. It also does not claim hardware-device touch testing. The accessibility branch CI and main-branch visual capture provide reproducible browser evidence.
