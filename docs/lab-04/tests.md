# Lab 4 Test Evidence and Traceability

**Status:** PRs #47, #57, #58, and #60 are merged. Final `main` is `6e6d645d61621f8a74166947326f59e5b3d141b4`; [workflow 37747697657](https://github.com/Richyboy170/toktickit/actions/runs/37747697657) passed server, client, and E2E after dependency remediation. The additional assertions and Staff Dashboard states in [PR #61](https://github.com/Richyboy170/toktickit/pull/61) passed its server, client, and E2E checks on [workflow 37758382584](https://github.com/Richyboy170/toktickit/actions/runs/37758382584); that PR still awaits peer review and merge, so those additions are not yet part of `main`. Populated migration preservation passed in [workflow 37307397634](https://github.com/Richyboy170/toktickit/actions/runs/37307397634); accessibility follow-up checks passed in [workflow 37314112381](https://github.com/Richyboy170/toktickit/actions/runs/37314112381).

## Test suites mapped to acceptance criteria

| Evidence group | Coverage | Test files | Final status |
|---|---|---|---|
| Action validation and lifecycle | AC-05, AC-06 | `server/tests/lab-04/action-validation.unit.test.ts`, `server/tests/lab-04/actions-taken.api.test.ts` | Passed in final-main CI |
| Action ownership, active assignee, actor/assignee, role access, stable order | AC-01–04, AC-07–08 | `server/tests/lab-04/actions-taken.api.test.ts`, `e2e/lab-04/actions-taken-flow.spec.ts` | Final-main baseline passed; the added inactive-assignee and equal-time ordering assertions passed in PR #61 server CI on run 37758382584 and await peer merge |
| Ticket workflow and resolution gate | AC-09–10 | `server/tests/lab-04/ticket-workflow.unit.test.ts`, `e2e/lab-04/ticket-resolution.spec.ts` | Passed in final-main CI |
| Dashboard queries, ownership, drill-down, loading, empty, forbidden, and safe failure | AC-11–13, AC-17–18 | `server/tests/lab-04/dashboards.api.test.ts`, `client/tests/lab-04/RequesterDashboard.test.tsx`, `client/tests/lab-04/StaffDashboard.test.tsx`, `e2e/lab-04/dashboards.spec.ts` | Baseline passed in final-main CI; added Staff Dashboard state cases passed locally (5/5) and in PR #61 client CI on run 37758382584; they await peer merge |
| Action detail UI and conditional follow-up | AC-04–08, AC-17 | `client/tests/lab-04/ActionsTaken.test.tsx`, `e2e/lab-04/actions-taken-flow.spec.ts` | Passed in final-main CI |
| Lab 1–3 regression | AC-16 | Existing server/client tests and Playwright suite | Passed in final-main CI |
| Migration and seed | AC-14–15 | `server/scripts/verify-lab4-migration-preserves-data.ts`, `prisma migrate deploy`, `prisma:seed`, server API suite | Passed in run 37307397634 and final-main CI |
| Responsive and keyboard checks | AC-18 | `e2e/lab-03/visual-evidence.spec.ts`, `docs/lab-04/accessibility-review.md`, Lab 4 client tests | PR #58 run 37314112381 and final-main run 37747697657 passed |
| Dependency audit / release gate | AC-19 | PR #60 lockfile review and CI | PR run 37714537121 and final-main run 37747697657 passed |

## Final-main verification

- Merged main commit: `6e6d645d61621f8a74166947326f59e5b3d141b4`.
- [Run 37747697657](https://github.com/Richyboy170/toktickit/actions/runs/37747697657) passed server, client, and E2E after PR #60 merged.
- [Run 37307397634](https://github.com/Richyboy170/toktickit/actions/runs/37307397634) passed the populated Lab 3 data-preservation comparison after PR #57 merged.
- [Run 37314112381](https://github.com/Richyboy170/toktickit/actions/runs/37314112381) passed PR #58 server/client/E2E checks, including migration preservation and accessibility capture coverage.
- The main suites cover unit, API/database, UI, authorization, workflow, migration/regression, and E2E behavior. The passing CI run includes the full database-backed server/client/E2E checks and builds.

## Earlier local verification and limits

On feature commit `6877630`, the recorded local results were: server 23 files/72 tests, client 16 files/55 tests, 15 E2E tests, production builds, and root/server/client audits with zero vulnerabilities after the `undici` update. These are earlier feature-commit results, not the final-main acceptance evidence.

In the current Windows workspace, Vitest startup initially failed with `spawn EPERM`. A later server run could not reach PostgreSQL at `localhost:5432`; 14 server files passed, nine failed, and 27 tests were skipped due to unavailable database setup. Client tests, builds, and root audit passed locally. These local database failures are not presented as passing results; final-main CI is the authoritative full-suite evidence.

No separate performance benchmark or manual screen-reader/physical-device session is claimed. Browser keyboard/focus, responsive capture, and source-level accessibility review are documented in `accessibility-review.md`.
