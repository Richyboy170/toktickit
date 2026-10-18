# Lab 4 Full-Score Remediation Checklist

This checklist tracks the remaining work against the Lab 4 course rubric and `04_Assignment/Engineering_Contract.md`. It keeps baseline release evidence separate from the new score-remediation branch.

## Completed in the current checkout

- [x] Add `ticket-workflow.api.test.ts` with all 64 status source/target pairs, role denial, cancellation confirmation/reason, stale-write handling, and resolution-gate cases.
- [x] Add the AC-02 owner-preservation assertion for Action creation and reassignment by another Staff member.
- [x] Add `TicketWorkflow.test.tsx` for all Staff status choices, cancellation flow, safe failure, Administrator read-only controls, and Requester advisory indication.
- [x] Make the Actions Taken UI test use different people for performer and assignee and assert each visible label (AC-04).
- [x] Split dashboard API coverage into `requester-dashboard.api.test.ts` and `staff-dashboard.api.test.ts`; include Requester zero-result behavior.
- [x] Add guarded CI scripts for seed idempotency and bounded dashboard/Action query smoke; wire them after initial seed setup.
- [x] Update `tests.md` to the Section 10 columns, include the required file inventory, and mark unverified branch evidence as pending.
- [x] Correct the specification/UI traceability gaps for AC-02, AC-09, AC-10, and AC-15 without claiming the pending CI results.
- [x] Verify locally: client 17 files / 71 tests passed; Ticket workflow UI file 12 tests passed; server DB-free unit suites 2 files / 15 tests passed; server and client builds passed.

## Required before final submission

- [ ] Restore authenticated GitHub access and refresh remote state.
- [ ] Confirm or create the dedicated tracking Issue; link it through the feature PR's Development section and state which ACs the PR covers. Do not close #51 or #53 for partial work.
- [ ] Push the feature branch to `lab4-staging`, obtain peer review, and pass the database-backed API, seed-idempotency, performance-smoke, server/client, audit, E2E, and visual jobs.
- [ ] Merge to staging only after review; open a separate reviewed `lab4-staging` to `main` release PR and pass final-main CI.
- [ ] Refresh the report's final SHA, issue/Project state, PR/reviewer history, CI counts, and document links from actual GitHub records.
- [ ] Replace remaining screenshot placeholders with verified, readable captures; check every image path and Markdown link.
- [ ] Confirm the reflection text is the student's own final wording before labeling it confirmed. Keep any instructor-only exception for PR #61's direct-to-main target explicitly unconfirmed unless the instructor confirms it.
- [ ] Regenerate the single nine-part PDF after final-main evidence exists; inspect all pages for the nine headings, missing images, clipping, broken links, and leftover placeholders.
- [ ] Leave Issue #53 open until PDF assembly, reflection confirmation, and final evidence review are complete; update its Project state only from the actual acceptance status.

## Current verification limits

The local workspace has no disposable PostgreSQL service or Docker engine. Database-backed API and smoke checks are pending CI. The seed/performance scripts refuse to run unless `DATABASE_URL` and `TEST_DATABASE_URL` match a local `*_test` database. The configured GitHub CLI credential is invalid, so no remote PR, Issue, Development link, review, merge, or new CI result has been created or verified in this session.
