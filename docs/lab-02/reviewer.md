# Lab 2 Peer Review Record

## Review group and responsibilities

Lab 2 peer review was coordinated by a three-person group. The work was intentionally divided, so inbound and outbound reviewer names are not expected to be identical.

| Person | GitHub identity | Contribution |
|---|---|---|
| Patiharn Liangkobkit (author) | [@Richyboy170](https://github.com/Richyboy170) | Implemented this repository, answered findings, and reviewed Suwiwat's work. |
| Tanakrit | [@Tanakrit-triton](https://github.com/Tanakrit-triton) | Reviewed, approved, and merged Patiharn's Lab 2 PRs. |
| Suwiwat Sinsomboon | [@iceswift](https://github.com/iceswift) | Participated in the three-person review group; Patiharn reviewed Suwiwat's Lab 2 PRs. |

## Reviews received by Patiharn

PRs #21–#29 were reviewed and merged by Tanakrit using merge commits. PR #30 was reviewed and merged by Suwiwat after the requested Issue #20 linkage was added. The feature/documentation branches targeted `lab2-staging`; the release branch targeted `main`.

| Work | Issue | Pull request | Result |
|---|---|---|---|
| Engineering contract | [#13](https://github.com/Richyboy170/toktickit/issues/13) | [#21](https://github.com/Richyboy170/toktickit/pull/21) | Approved and merged |
| Requester/reference foundation | [#14](https://github.com/Richyboy170/toktickit/issues/14) | [#22](https://github.com/Richyboy170/toktickit/pull/22) | Finding fixed, re-reviewed, approved, and merged |
| Requester context/shell | [#15](https://github.com/Richyboy170/toktickit/issues/15) | [#23](https://github.com/Richyboy170/toktickit/pull/23) | Finding fixed, re-reviewed, approved, and merged |
| Create Ticket | [#16](https://github.com/Richyboy170/toktickit/issues/16) | [#24](https://github.com/Richyboy170/toktickit/pull/24) | Root finding resolved, approved, and merged |
| My Tickets | [#17](https://github.com/Richyboy170/toktickit/issues/17) | [#25](https://github.com/Richyboy170/toktickit/pull/25) | Approved and merged |
| Ticket Detail/Attachments | [#18](https://github.com/Richyboy170/toktickit/issues/18) | [#26](https://github.com/Richyboy170/toktickit/pull/26) | Approved and merged |
| E2E and release readiness | [#19](https://github.com/Richyboy170/toktickit/issues/19) | [#27](https://github.com/Richyboy170/toktickit/pull/27) | Approved and merged |
| Review/delivery evidence | [#20](https://github.com/Richyboy170/toktickit/issues/20) | [#28](https://github.com/Richyboy170/toktickit/pull/28) | Approved and merged |
| Lab 2 release | — | [#29](https://github.com/Richyboy170/toktickit/pull/29) | Approved and merged to `main` |

## Substantive findings and responses

| PR | Tanakrit's finding | Patiharn's response | Resolution evidence |
|---|---|---|---|
| [#21](https://github.com/Richyboy170/toktickit/pull/21) | Add explicit accessible-name/tooltip guidance for icon-only controls and make Description resizing explicit. | Clarified `ui-spec.md` on the evidence branch. | [Author reply](https://github.com/Richyboy170/toktickit/pull/21#issuecomment-5405064929), then approval and merge |
| [#22](https://github.com/Richyboy170/toktickit/pull/22) | `GET /api/categories` returned a plain string instead of the documented error object. | Fixed the response shape in commit [`038716b`](https://github.com/Richyboy170/toktickit/commit/038716b). | Reviewer verified the commit, approved, and merged |
| [#23](https://github.com/Richyboy170/toktickit/pull/23) | `:focus-visible` used an undeclared color instead of Secondary green. | Changed it to `var(--green-700)` in commit [`afd851f`](https://github.com/Richyboy170/toktickit/commit/afd851f). | Reviewer verified the commit, approved, and merged |
| [#24](https://github.com/Richyboy170/toktickit/pull/24) | Repeated the category error-shape finding inherited from PR #22. | Explained that the stacked branch receives the root fix when merged in dependency order. | Reviewer accepted the root fix, approved, and merged |

PRs [#25](https://github.com/Richyboy170/toktickit/pull/25), [#26](https://github.com/Richyboy170/toktickit/pull/26), [#27](https://github.com/Richyboy170/toktickit/pull/27), and [#28](https://github.com/Richyboy170/toktickit/pull/28) also contain reviewer summaries or approvals. PR #29 records Tanakrit's final release approval for the earlier release. PR [#30](https://github.com/Richyboy170/toktickit/pull/30) records Suwiwat's requested-change review, author response, approval, and merge for the final evidence update.

## Reviews given by Patiharn

Patiharn reviewed and merged Suwiwat's Lab 2 work in [iceswift/toktickit](https://github.com/iceswift/toktickit). This is outbound peer-review evidence and is separate from Patiharn's implementation repository.

- Implementation PRs: [#13](https://github.com/iceswift/toktickit/pull/13), [#15](https://github.com/iceswift/toktickit/pull/15), [#17](https://github.com/iceswift/toktickit/pull/17), [#19](https://github.com/iceswift/toktickit/pull/19), [#21](https://github.com/iceswift/toktickit/pull/21), [#23](https://github.com/iceswift/toktickit/pull/23), and [#25](https://github.com/iceswift/toktickit/pull/25)
- Release PR: [#28](https://github.com/iceswift/toktickit/pull/28)

## Integrity note

The links above point to real GitHub issues, comments, reviews, approvals, and merge commits. No review is attributed to a person who did not perform it. The final evidence update was reviewed and merged by Suwiwat after the Issue #20 linkage was corrected.
