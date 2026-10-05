# Lab 4 Evidence

`screenshots/` contains 18 deterministic Playwright captures at the contract viewports (1280x900 desktop, 820x1000 tablet, and 390x844 mobile): Staff Dashboard, Requester Dashboard, staff Action detail and edit form, conditional follow-up form, and Requester read-only Action detail.

The capture suite mocks API responses to show stable representative content, including status totals, urgent tickets, an active assigned Action, and separate performer/assignee identities. These images demonstrate layout and hierarchy; they are not screenshots of live database records. The Playwright visual check verifies page-level overflow at each viewport and checks keyboard focus and readable mobile navigation. The 12-screen final-main baseline was captured in [workflow 37307397634](https://github.com/Richyboy170/toktickit/actions/runs/37307397634); the accessibility follow-up adds six Action edit/conditional-form captures. After that PR merges, download its main-branch `toktickit-playwright-evidence` artifact for the final release captures. The source and browser accessibility review is recorded in `docs/lab-04/accessibility-review.md` and explicitly notes the assistive-technology testing limits.

See `docs/lab-04/tests.md` for test commands, actual staging CI link, and release checks still outstanding.
