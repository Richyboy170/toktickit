# Lab 3 Peer Review and Delivery Record

**Author:** Patiharn Liangkobkit - 66070503489 - GitHub [@Richyboy170](https://github.com/Richyboy170)

**Repository:** [Richyboy170/toktickit](https://github.com/Richyboy170/toktickit)

**Peer-review group:** Tanakrit
([Tanakrit-triton](https://github.com/Tanakrit-triton)) and Suwiwat
([iceswift](https://github.com/iceswift)). `iceswift` performed the recorded
Lab 3 implementation, follow-up, and release reviews.

## 1. Final delivery state

The contract baseline commit `29e7ed5` precedes implementation commit
`d4ca5cd`. PR [#33](https://github.com/Richyboy170/toktickit/pull/33)
received a changes-requested review, the Administrator Ticket Detail
authorization mismatch was fixed, and the PR was approved and merged into
`lab3-staging` as `593d6ba`.

Follow-up PR [#41](https://github.com/Richyboy170/toktickit/pull/41)
added focused tests and evidence. The reviewer requested explicit Development
traceability; PR #41 was manually linked to Issue #40, re-reviewed, approved,
and merged into `lab3-staging` as `1060376`. Staging CI
[run 35232939109](https://github.com/Richyboy170/toktickit/actions/runs/35232939109)
passed server, client, database-backed E2E, visual capture, and artifact upload.

Release PR [#42](https://github.com/Richyboy170/toktickit/pull/42) linked Issues
#34-#40, received `iceswift` approval, and merged `lab3-staging` into `main` as
`161ddd8454c421df4701ad740414245bda68ebff` on 18 September 2026. Final-main
CI [run 35311307446](https://github.com/Richyboy170/toktickit/actions/runs/35311307446)
passed all jobs and uploaded artifact
[`10533875135`](https://api.github.com/repos/Richyboy170/toktickit/actions/artifacts/10533875135/zip).
All Sprint 3 Issues #34-#40 closed when PR #42 merged.

## 2. Review findings and responses

| Review finding | Response | Final state |
|---|---|---|
| Administrator Ticket Detail was routed to a Staff screen but the API rejected Administrator reads. | The detail read endpoint now admits Administrators while assignment, status, comment, and note mutations remain IT Staff-only; API and E2E regressions cover the boundary. | Addressed before PR #33 approval |
| Legacy requester header and selector could bypass authentication. | Compatibility is gated to explicit test/E2E mode; normal Lab 3 flows use server-established session identity. | Addressed before PR #33 approval |
| Role login destinations, voluntary password change, status confirmation, migration credentials, inactive owners, malformed JSON, and tablet Queue behavior needed hardening. | Role-safe redirects, password navigation, valid-next-state confirmation, legacy password initialization, atomic owner cleanup, safe errors, and tablet cards were implemented and tested. | Addressed before PR #33 approval |
| Follow-up PR #41 showed no tracking Issue in Development. | PR #41 was manually linked to Issue #40; the body also references related visual/E2E Issue #39. | Addressed before PR #41 approval |

## 3. Reviewer identity, comments, responses, and approvals

| Date (UTC) | Reviewer | Review state | Evidence and response |
|---|---|---|---|
| 2026-09-16 12:46 | Suwiwat / `iceswift` | Changes requested on PR #33 | P1 Administrator Ticket Detail read mismatch; fixed with authorization and browser regressions. |
| 2026-09-17 01:42 | Suwiwat / `iceswift` | Approved PR #33 | Approved feature commit `78313af`. |
| 2026-09-17 01:44 | GitHub | Merged PR #33 | Merged into `lab3-staging` as `593d6ba`. |
| 2026-09-17 11:58 | Suwiwat / `iceswift` | Changes requested on PR #41 | Requested tracking-Issue linkage in Development; Issue #40 was manually linked and the response was posted. |
| 2026-09-17 12:50 | Suwiwat / `iceswift` | Approved PR #41 | Verified Issue #40 linkage and current CI results on commit `529bf2c`. |
| 2026-09-17 14:20 | GitHub | Merged PR #41 | Merged into `lab3-staging` as `1060376`. |
| 2026-09-18 05:29 | Suwiwat / `iceswift` | Approved PR #42 | Verified staged release, linked Issues #34-#40, and passing server/client/E2E checks. |
| 2026-09-18 05:34 | GitHub | Merged PR #42 | Merged `lab3-staging` into `main` as `161ddd8`; Issues #34-#40 closed. |

## 4. Final checklist and evidence

| Area | Status | Evidence |
|---|---|---|
| Contract before implementation | Pass | `29e7ed5` precedes `d4ca5cd`; specification, API, UI, and Test DD files are on final `main` |
| Password/session design, role checks, migration, seed, and Lab 2 regression | Pass on final main | [Server job](https://github.com/Richyboy170/toktickit/actions/runs/35311307446/job/105493744984) |
| Requester, Staff, and Administrator UI tests/build | Pass on final main | [Client job](https://github.com/Richyboy170/toktickit/actions/runs/35311307446/job/105493744754) |
| Database-backed browser flows, responsive capture, and artifact | Pass on final main | [E2E job](https://github.com/Richyboy170/toktickit/actions/runs/35311307446/job/105493909898), [artifact](https://api.github.com/repos/Richyboy170/toktickit/actions/artifacts/10533875135/zip) |
| Feature and follow-up peer review | Pass | [PR #33](https://github.com/Richyboy170/toktickit/pull/33) and [PR #41](https://github.com/Richyboy170/toktickit/pull/41) |
| Staged integration and release review | Pass | [PR #42](https://github.com/Richyboy170/toktickit/pull/42), staging run 35232939109, main run 35311307446 |
| Issues #34-#40 | Pass | [All seven closed](https://github.com/Richyboy170/toktickit/issues?q=is%3Aissue%20state%3Aclosed%20%22%5BLab%203%5D%22) |
| Final source | Pass | [`main` commit 161ddd8](https://github.com/Richyboy170/toktickit/commit/161ddd8454c421df4701ad740414245bda68ebff) |

## 5. Final reviewer statement

The Lab 3 increment completed contract-first development, peer-reviewed staged
integration, approved release to `main`, final-main database and browser CI,
responsive visual evidence, and closure of all Sprint 3 Issues. The GitHub
screenshots and immutable links in this record preserve the final evidence.
