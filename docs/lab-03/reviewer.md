# Lab 3 Peer Review and Delivery Record

**Author:** Patiharn Liangkobkit - 66070503489 - GitHub [@Richyboy170](https://github.com/Richyboy170)

**Repository:** [Richyboy170/toktickit](https://github.com/Richyboy170/toktickit)

**Peer-review group:** Tanakrit ([Tanakrit-triton](https://github.com/Tanakrit-triton)) and Suwiwat ([iceswift](https://github.com/iceswift)). Lab 3 PR [#33](https://github.com/Richyboy170/toktickit/pull/33) was approved by iceswift at feature commit 78313af684264c9eb46931dca42793407207d5a6 and merged into lab3-staging as 593d6ba49f442d8c46b6be01cde8fa09285ecf50 on 17 September 2026.

## 1. Lab 3 review and delivery state

The Lab 3 implementation began on feature/lab3-implementation. The contract
baseline commit 29e7ed5 precedes the implementation commit d4ca5cd. PR #33
targeted lab3-staging; it received a changes-requested review, the
Administrator Ticket Detail authorization issue was corrected, and the final
feature tip was approved before merging.

The merged staging commit passed [TokTickIT CI run
35171700694](https://github.com/Richyboy170/toktickit/actions/runs/35171700694).
The run passed the server, client, and e2e jobs and uploaded the
[Playwright evidence artifact](https://api.github.com/repos/Richyboy170/toktickit/actions/artifacts/10476089966/zip).

After the approved merge, the feature branch received follow-up test and
evidence updates in commit 0a07199. Those additions pass locally but are not
part of the already-recorded staging merge; they should be included in the
next staging/release integration review.

The release to main has not happened yet. The current remote main commit is
c7fcdf6e9f39e0fd4b8631f70553049e2dc11670, while lab3-staging is at
593d6ba49f442d8c46b6be01cde8fa09285ecf50. Issues #34-#40 remain open and
must be completed before final submission.

## 2. Review findings and responses

| Finding from peer review | Response in this tree | Final review state |
|---|---|---|
| Administrator detail reads were rejected by the Staff-only guard | GET /api/staff/tickets/:ticketId now admits Administrators for read-only detail; assignment, status, comment, and note mutations remain IT Staff-only. | Addressed before approval |
| Legacy requester header and selector could bypass authentication | Header, requester directory, and client selector are restricted to ENABLE_LEGACY_REQUESTER_CONTEXT=true or test mode; normal Lab 3 client flows use session identity. | Addressed before approval |
| Role login could land on the wrong destination and full users could not change password voluntarily | Role-safe return paths, default destinations, voluntary Change Password, and shell navigation were added. | Addressed before approval |
| Staff status UI showed every status and sent confirmation automatically | The UI now offers only valid next states and asks for confirmation for consequential transitions; the API defaults confirm=false. | Addressed before approval |
| Legacy migration left empty credentials without a usable initializer | prisma:initialize-legacy-passwords hashes a local temporary value after migration and preserves the first-login flag. | Addressed before approval |
| Deactivating an owner left stale Ticket ownership | Administrator deactivation clears ownerId and revokes sessions transactionally. | Addressed before approval |
| Malformed JSON could receive an unsafe default response; tablet Queue was too wide | Safe final error middleware was added and the Queue switches to compact cards at tablet widths. | Addressed before approval |

## 3. Reviewer identity, comments, and approval

| Date (UTC) | Reviewer | Review state | Evidence and response |
|---|---|---|---|
| 2026-09-16 12:46 | Suwiwat / iceswift | Changes requested | P1: Administrator Ticket Detail was routed to a Staff screen but the API rejected Administrator reads. The fix was implemented in the follow-up commits and covered by API/E2E regression tests. |
| 2026-09-17 01:42 | Suwiwat / iceswift | Approved | Approval was submitted on final feature commit 78313af684264c9eb46931dca42793407207d5a6. |
| 2026-09-17 01:44 | GitHub | Merged | PR #33 merged into lab3-staging as 593d6ba49f442d8c46b6be01cde8fa09285ecf50. |

## 4. Review checklist and evidence

| Area | Status | Evidence |
|---|---|---|
| Contract files agree on roles, ownership, statuses, API, UI, and acceptance criteria | Pass on staging | specification.md, api-spec.md, ui-spec.md, and tests.md in the merged staging tree |
| Password/session design and role checks | Pass in staging CI | server/src/auth.ts, auth-context.ts, and the Lab 3 server tests |
| Migration, seed, and Lab 2 database regression | Pass in staging CI | Staging CI server job runs migration deploy, seed, full server tests, build, and audit |
| Requester, Staff, and Administrator screens | Pass in staging CI | Client tests and Playwright e2e job |
| Screenshots and visual capture | Pass for staged source; final-main revalidation pending | [Screenshot index](../../artifacts/lab-03/screenshots/README.md), [visual test](../../e2e/lab-03/visual-evidence.spec.ts), completed ui-spec.md checklist, and CI artifact |
| Feature branch review and staged merge | Pass | [PR #33](https://github.com/Richyboy170/toktickit/pull/33), merge 593d6ba |
| Staging CI | Pass | [Run 35171700694](https://github.com/Richyboy170/toktickit/actions/runs/35171700694) |
| Issues #34-#40 | Pending | [GitHub Issues](https://github.com/Richyboy170/toktickit/issues) currently remain open |
| Release to main and final-main CI | Pending | Current [main branch](https://github.com/Richyboy170/toktickit/tree/main) is still at the Lab 2 commit |

## 5. Final reviewer statement

Peer review and the merge into lab3-staging are complete, and the merged
staging CI workflow passed. The staged-source visual checklist is complete from
the capture, component/API tests, and visual runner. The remaining delivery
gates are closing the Lab 3 Issues, releasing lab3-staging to main, running
CI on the resulting main commit, rerunning the checklist against that commit,
and freezing the final PDF evidence.
