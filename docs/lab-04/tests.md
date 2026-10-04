# Lab 4 Test Evidence and Traceability

**Status:** The integrated feature passed its staging pull request and post-merge CI. The exact staging merge is `45431b9b8769dc20a4c23c0595793c4c831ca769`; final-main verification remains pending. The feature implementation commit before the merge was `6877630`.

## Test suites mapped to acceptance criteria

| Evidence group | Main coverage | Test files | Staging CI status |
|---|---|---|---|
| Action validation and lifecycle | AC-05, AC-06 | `server/tests/lab-04/action-validation.unit.test.ts`, `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| Ticket workflow and resolution gate | AC-09, AC-10 | `server/tests/lab-04/ticket-workflow.unit.test.ts`, `e2e/lab-04/ticket-resolution.spec.ts` | Passed |
| Action access, actor/assignee, ownership | AC-01–04, AC-07–08 | `server/tests/lab-04/actions-taken.api.test.ts`, `e2e/lab-04/actions-taken-flow.spec.ts` | Passed |
| Dashboard queries and ownership | AC-11–13 | `server/tests/lab-04/dashboards.api.test.ts`, `client/tests/lab-04/RequesterDashboard.test.tsx`, `client/tests/lab-04/StaffDashboard.test.tsx`, `e2e/lab-04/dashboards.spec.ts` | Passed |
| Action detail UI | AC-04–08, AC-17 | `client/tests/lab-04/ActionsTaken.test.tsx`, `e2e/lab-04/actions-taken-flow.spec.ts` | Passed |
| Lab 1–3 regression | AC-16 | Existing server/client test suites and Playwright suite | Passed |
| Migration and seed | AC-14–15 | CI `prisma migrate deploy`, `prisma:seed`, server API suite | Passed in staging CI; no separate populated Lab 3 snapshot comparison test is present |
| Responsive visual capture | AC-18 | `e2e/lab-03/visual-evidence.spec.ts` (captures Lab 3 and Lab 4 views) | Local visual run passed after adding Lab 4 captures; staging run predates the added Lab 4 captures |
| Release gate | AC-19 | GitHub Actions PR #46 post-merge run | [Passed on staging](https://github.com/Richyboy170/toktickit/actions/runs/37191660316); final `main` pending |

This mapping records test files that exist. It does not claim separate performance benchmarking, a populated Lab 3 migration comparison test, a full screen-reader/contrast audit, or final-main evidence. See `ui-spec.md` for the visual evidence scope.

## Verification records

### Staging CI

- PR: [#46](https://github.com/Richyboy170/toktickit/pull/46)
- Merge commit: `45431b9b8769dc20a4c23c0595793c4c831ca769`
- Workflow run: [37191660316 — successful](https://github.com/Richyboy170/toktickit/actions/runs/37191660316)
- Workflow executes PostgreSQL migration and seed, full server and client test suites, builds, dependency audits, Playwright E2E, and Lab 3 visual evidence.

### Release-evidence PR CI

- PR: [#47](https://github.com/Richyboy170/toktickit/pull/47)
- Workflow run: [37202724379 — server, client, and E2E jobs passed](https://github.com/Richyboy170/toktickit/actions/runs/37202724379).
- This verifies the release-prep branch, including the new Lab 4 visual captures. It is not final-main evidence because PR #47 is still open.

### Local verification on feature commit `6877630`

| Check | Result | Evidence |
|---|---|---|
| Server full tests | Pass | `npm test`: 23 files, 72 tests passed. |
| Client full tests | Pass | `npm test`: 16 files, 55 tests passed. |
| Production builds | Pass | `npm run build` passed for server and client. |
| E2E | Pass | `npm run test:e2e`: 15 tests passed. |
| Visual evidence | Pass | `npm run test:e2e:visual`: 1 visual-capture test passed after Lab 4 captures were added. |
| Dependency audits | Pass | Root, server, and client `npm audit` each reported zero vulnerabilities after the `undici` update. |

On the current Windows workspace, sandboxed Vitest startup initially failed with `spawn EPERM`. An elevated retry ran but the server API tests could not reach PostgreSQL at `localhost:5432`; 14 server files passed, nine failed, and 27 tests were skipped due to unavailable database setup (one Categories API test returned 500). Separately, the client suite passed all 16 files/55 tests, `npm run build` passed for both packages, and root `npm audit` reported zero vulnerabilities. The successful remote PR CI runs above provide the full PostgreSQL-backed suite evidence; the local DB limitation is not a passing test result.

## Remaining release checks

- Open and review the `lab4-staging` → `main` release PR; record merge SHA and green final-main workflow.
- Capture final-main screenshots and review evidence for the PDF.
- Complete issues [#56](https://github.com/Richyboy170/toktickit/issues/56), [#51](https://github.com/Richyboy170/toktickit/issues/51), and [#53](https://github.com/Richyboy170/toktickit/issues/53), then capture final Project/Kanban evidence.
- Complete the populated pre-Lab-4 database preservation check if required by the course; the current CI deploys migrations and seeds a fresh test database.
