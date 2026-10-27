# Lab 4 Playwright Evidence

This directory contains deterministic browser captures of the Staff Dashboard, Requester Dashboard, staff-editable Actions Taken, Action create/edit forms, conditional follow-up, and Requester read-only Action history at desktop (1280×900), tablet (820×1000), and mobile (390×844) sizes.

The fixtures demonstrate representative UI content and layout; they are not live database records. The browser suite checks page-level horizontal overflow and keyboard-focus/mobile-navigation behavior. Database-backed metrics and role/validation rules are tested in the server and client suites listed in [`docs/lab-04/tests.md`](../../docs/lab-04/tests.md).

Final-main CI [run 37747697657](https://github.com/Richyboy170/toktickit/actions/runs/37747697657) passed server, client, and E2E jobs on `6e6d645d61621f8a74166947326f59e5b3d141b4`. Its `toktickit-playwright-evidence` artifact is the release evidence source. PR #58's browser keyboard, navigation, and follow-up checks passed in [run 37314112381](https://github.com/Richyboy170/toktickit/actions/runs/37314112381). The source/browser accessibility review is in [`docs/lab-04/accessibility-review.md`](../../docs/lab-04/accessibility-review.md); it does not claim manual screen-reader or physical-device testing.
