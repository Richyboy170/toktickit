# Lab 4 Evidence

`screenshots/` contains 12 deterministic Playwright captures at the contract viewports (1280x900 desktop, 820x1000 tablet, and 390x844 mobile): Staff Dashboard, Requester Dashboard, staff Action detail, and Requester read-only Action detail.

The capture suite mocks API responses to show stable representative content, including status totals, urgent tickets, an active assigned Action, and separate performer/assignee identities. These images demonstrate layout and hierarchy; they are not screenshots of live database records. The Playwright visual check verifies that the page has no horizontal overflow at each viewport. It does not replace final-main captures or a full manual accessibility/contrast audit.

See `docs/lab-04/tests.md` for test commands, actual staging CI link, and release checks still outstanding.
