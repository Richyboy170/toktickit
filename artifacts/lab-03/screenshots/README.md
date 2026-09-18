# Lab 3 screenshot evidence

The images below were captured from the real React application with
`npm run test:e2e:visual`. The capture uses deterministic HTTP fixtures for the
API so the UI, role navigation, responsive layouts, and overflow checks can be
reviewed while PostgreSQL is unavailable on this workstation. PR #33 was
approved by `iceswift` and merged into `lab3-staging`. The staged commit passed
the database-backed Playwright workflow, visual job, and artifact upload in
GitHub Actions run 35171700694; the combined evidence is available at:

https://github.com/Richyboy170/toktickit/actions/runs/35171700694

https://api.github.com/repos/Richyboy170/toktickit/actions/artifacts/10476089966/zip

The local captures remain useful for direct visual inspection, while peer review
for this increment is complete. Release to `main` and final-main revalidation
are still required.

Every screen was captured at desktop (`1280x900`), tablet (`820x1000`), and
mobile (`390x844`) widths. The visual runner asserts that the document has no
horizontal overflow at each width.

## Authentication

| Screen | Desktop | Tablet | Mobile |
|---|---|---|---|
| Login | [PNG](authentication/login/desktop/screen.png) | [PNG](authentication/login/tablet/screen.png) | [PNG](authentication/login/mobile/screen.png) |
| Required Change Password | [PNG](authentication/change-password-required/desktop/screen.png) | [PNG](authentication/change-password-required/tablet/screen.png) | [PNG](authentication/change-password-required/mobile/screen.png) |

## Requester regression

| Screen | Desktop | Tablet | Mobile |
|---|---|---|---|
| My Tickets | [PNG](requester-regression/my-tickets/desktop/screen.png) | [PNG](requester-regression/my-tickets/tablet/screen.png) | [PNG](requester-regression/my-tickets/mobile/screen.png) |

## IT Staff

| Screen | Desktop | Tablet | Mobile |
|---|---|---|---|
| Ticket Queue | [PNG](staff-queue/ticket-queue/desktop/screen.png) | [PNG](staff-queue/ticket-queue/tablet/screen.png) | [PNG](staff-queue/ticket-queue/mobile/screen.png) |
| Ticket Detail | [PNG](staff-ticket-detail/ticket-detail/desktop/screen.png) | [PNG](staff-ticket-detail/ticket-detail/tablet/screen.png) | [PNG](staff-ticket-detail/ticket-detail/mobile/screen.png) |

## Administrator

| Screen | Desktop | Tablet | Mobile |
|---|---|---|---|
| User Management | [PNG](user-management/user-management/desktop/screen.png) | [PNG](user-management/user-management/tablet/screen.png) | [PNG](user-management/user-management/mobile/screen.png) |

These committed images are UI inspection captures from the fixture run. The
database-backed Requester, Staff, Administrator, migration, and release checks
are represented by the passing CI run linked above. The capture command and
fixture source are retained in
[`client/playwright.visual.config.ts`](../../client/playwright.visual.config.ts)
and [`e2e/lab-03/visual-evidence.spec.ts`](../../e2e/lab-03/visual-evidence.spec.ts).
