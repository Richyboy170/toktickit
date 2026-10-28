# Lab 4 Full-Score Remediation Checklist

This checklist tracks the remaining work against the Lab 4 course rubric and `04_Assignment/Engineering_Contract.md`. It records the completed release and tracks the documentation correction through Issue #68.

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

## Completed release and evidence

- [x] PR #67 received independent approval, passed final-head CI, and merged to `lab4-staging` at `f839918`.
- [x] PR #65 received independent approval, passed updated CI, and merged to `main` at `b806b05`.
- [x] Final-main [run 40658913184](https://github.com/Richyboy170/toktickit/actions/runs/40658913184) passed server, client, and E2E on the release SHA.
- [x] The student approved the reflection wording on 2026-10-28.
- [x] Final report/PDF, current CI, issue, and Project-board evidence were assembled; all nine headings and working links were checked.
- [x] Issues #51, #53, #63, and #66 are closed and their Lab 4 Project items are Done.

## Current blackboard correction: Issue #68

- [ ] Update this checklist, `reviewer.md`, and `ai-use.md` through a dedicated PR targeting `lab4-staging`; link Issue #68 through Development.
- [ ] Pass required CI and obtain an independent peer review before merging the documentation PR to staging.
- [ ] Open a separate reviewed release PR from `lab4-staging` to `main`; verify final-main CI after merge.
- [ ] Refresh the final report/PDF from the released `main` docs and close Issue #68 only after the evidence is complete.

## Historical facts and verification limits

- PR #45 was approved after merge; PR #61 targeted `main` directly. Neither history can be retroactively changed, and no instructor-approved exception for #61 is claimed.
- Manual screen-reader and physical-device testing were not performed; the report discloses this.
- Database-backed suites and visual tests were verified in GitHub Actions, not rerun locally. The local workspace did not have a disposable PostgreSQL service or running Docker engine when those earlier checks were performed.
