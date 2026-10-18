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
- [x] Create dedicated Issue [#63](https://github.com/Richyboy170/toktickit/issues/63), add it to the Project, and move it to PR Review after CI passed. PR [#64](https://github.com/Richyboy170/toktickit/pull/64) names the covered ACs and includes `Closes #63` in its body. GitHub currently shows no Development relationship because #64 targets non-default `lab4-staging`.
- [x] Pass PR #64 CI on `lab4-staging`: server/client/E2E visual jobs succeeded, including the database-backed API, populated migration check, seed-idempotency, performance-smoke, builds, and audits in [run 39101398642](https://github.com/Richyboy170/toktickit/actions/runs/39101398642).
- [ ] Confirm all CI jobs pass on latest pushed head `e03b20e`; previous head `5a984e8` passed run 39105317501.
- [ ] Obtain an independent peer review of PR #64; GitHub currently shows no submitted reviews.
- [ ] Manually link PR #64 to Issue #63 through the Issue Development field; the closing keyword is ignored while the PR targets non-default `lab4-staging`.
- [ ] Merge to staging only after review; open a separate reviewed `lab4-staging` to `main` release PR and pass final-main CI.
- [ ] Refresh the report's final SHA, issue/Project state, PR/reviewer history, CI counts, and document links from actual GitHub records.
- [x] Replace the report screenshot placeholders with verified captures and check image paths; refresh branch-specific captures after the final release.
- [ ] Confirm the reflection text is the student's own final wording before labeling it confirmed. Keep any instructor-only exception for PR #61's direct-to-main target explicitly unconfirmed unless the instructor confirms it.
- [ ] Regenerate the single nine-part PDF after final-main evidence exists; inspect all pages for the nine headings, missing images, clipping, broken links, and leftover placeholders.
- [ ] Resolve the tracking mismatch caused by Issue #53 being closed while PDF assembly, reflection confirmation, and final evidence review remain incomplete. The reviewer requested keeping it open until those criteria are complete; confirm the appropriate tracking state with the instructor. Keep the report/PDF marked draft until acceptance evidence is complete.

## Current verification limits

The local workspace has no disposable PostgreSQL service or Docker engine, so database-backed API and smoke checks ran in CI rather than locally. The seed/performance scripts refuse to run unless `DATABASE_URL` and `TEST_DATABASE_URL` match a local `*_test` database. The GitHub CLI token reports invalid, although the Git credential helper successfully pushed `e03b20e`; manual Development-field changes are not available through the current tools. PR #64 is open against `lab4-staging`; CI passed on the prior head, checks on `e03b20e` are pending, and independent peer review is still pending.
