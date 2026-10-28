# Lab 4 Full-Score Remediation Checklist

This checklist tracks the remaining work against the Lab 4 course rubric and `04_Assignment/Engineering_Contract.md`. It keeps baseline release evidence separate from the new score-remediation branch.

## Completed in the current checkout

- [x] Add `ticket-workflow.api.test.ts` with all 64 status source/target pairs, role denial, cancellation confirmation/reason, stale-write handling, and resolution-gate cases.
- [x] Add the AC-02 owner-preservation assertion for Action creation and reassignment by another Staff member.
- [x] Add `TicketWorkflow.test.tsx` for all Staff status choices, cancellation flow, safe failure, Administrator read-only controls, and Requester advisory indication.
- [x] Make the Actions Taken UI test use different people for performer and assignee and assert each visible label (AC-04).
- [x] Split dashboard API coverage into `requester-dashboard.api.test.ts` and `staff-dashboard.api.test.ts`; include Requester zero-result behavior.
- [x] Add guarded CI scripts for seed idempotency and bounded dashboard/Action query smoke; wire them after initial seed setup.
- [x] Update `tests.md` to the Section 10 columns, include the required file inventory, and record branch results after CI completed.
- [x] Correct the specification/UI traceability gaps for AC-02, AC-09, AC-10, and AC-15; update the evidence after CI passed.
- [x] Verify locally: client 17 files / 71 tests passed; Ticket workflow UI file 12 tests passed; server DB-free unit suites 2 files / 15 tests passed; server and client builds passed.

## Required before final submission

- [x] Refresh the remote refs and confirm PR #61's merge/current Issue state.
- [x] Create dedicated Issue [#63](https://github.com/Richyboy170/toktickit/issues/63) and manually link it to PR [#64](https://github.com/Richyboy170/toktickit/pull/64) through Development. The PR description names the covered ACs; the 2026-10-18 Project capture showed #63 in PR Review.
- [x] Pass PR #64 CI on `lab4-staging`: server/client/E2E visual jobs succeeded, including the database-backed API, populated migration check, seed-idempotency, performance-smoke, builds, and audits in [run 39101398642](https://github.com/Richyboy170/toktickit/actions/runs/39101398642).
- [x] PR #64's final head `aa52819` passed server/client/E2E CI in [run 39109989985](https://github.com/Richyboy170/toktickit/actions/runs/39109989985).
- [x] Obtain independent peer review of PR #64 and merge it into staging: Tanakrit-triton approved and merged it at `469d00c` on 2026-10-27.
- [x] Open separate release PR [#65](https://github.com/Richyboy170/toktickit/pull/65) from `lab4-staging` to `main` and link Issue #63 through Development.
- [ ] Obtain independent review and staging merge for audit-fix PR [#67](https://github.com/Richyboy170/toktickit/pull/67), linked to Issue [#66](https://github.com/Richyboy170/toktickit/issues/66); verify its latest-head CI. Original code commit `1eeee3a` passed [run 40495359520](https://github.com/Richyboy170/toktickit/actions/runs/40495359520).
- [ ] Recheck and independently review PR #65 after the fix reaches staging, then merge and pass final-main CI.
- [ ] Refresh the report's final SHA, issue/Project state, PR/reviewer history, CI counts, and document links from actual GitHub records.
- [x] Replace the report screenshot placeholders with verified captures and check image paths; refresh branch-specific captures after the final release.
- [x] The student reviewed the reflection and said it looked good on 2026-10-27.
- [ ] Check the final reflection and AI-use disclosure for factual accuracy before submission. Keep any instructor-only exception for PR #61's direct-to-main target explicitly unconfirmed unless the instructor confirms it.
- [ ] Regenerate the single nine-part PDF after final-main evidence exists; inspect all pages for the nine headings, missing images, clipping, broken links, and leftover placeholders.
- [ ] Resolve the tracking mismatch caused by Issue #53 being closed while final evidence review and submission acceptance remain incomplete. The PDF is assembled as a review draft; confirm the appropriate tracking state with the instructor and keep the report/PDF marked draft until acceptance evidence is complete.

## Current verification limits

As checked on 2026-10-28, the local workspace has no disposable PostgreSQL service or running Docker engine, so database-backed API and smoke checks ran in CI rather than locally. The seed/performance scripts refuse to run unless `DATABASE_URL` and `TEST_DATABASE_URL` match a local `*_test` database. GitHub authentication was refreshed and the Development links were added. PR #64 is approved and merged to staging; PR #67 and the release PR #65 remain open for their remaining checks and reviews. The last saved Project-board capture is from 2026-10-18 and must be refreshed after release.
