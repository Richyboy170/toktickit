# Lab 2 Peer Review Record

## Reviewer identity and access

- Repository owner / author: [@Richyboy170](https://github.com/Richyboy170)
- Intended peer reviewer: [@Tanakrit-triton](https://github.com/Tanakrit-triton)
- Access requested: repository collaborator with Write permission
- Invitation created: 20 August 2026 at 03:09 UTC, GitHub invitation ID `329778088`
- Invitation URL: [pending repository invitation](https://github.com/Richyboy170/toktickit/invitations)
- Status checked: 20 August 2026 — **pending and not expired**

Write access is needed so the peer reviewer can approve and perform the required merge commits. The author and coding agent will not merge these PRs.

## Lab 2 PR status

Review in dependency order. Every PR targets protected `lab2-staging` and instructs the reviewer to use a merge commit rather than squash/rebase.

| Order | Issue | Pull Request | Review status | Merge status |
|---|---|---|---|---|
| 1 | #13 Engineering contract | [PR #21](https://github.com/Richyboy170/toktickit/pull/21) | Approved | Merged into `lab2-staging` |
| 2 | #14 Requester/reference foundation | [PR #22](https://github.com/Richyboy170/toktickit/pull/22) | Review comment answered; re-review pending | Open, unmerged |
| 3 | #15 Requester context/shell | [PR #23](https://github.com/Richyboy170/toktickit/pull/23) | Fix pushed; re-review pending | Open, unmerged |
| 4 | #16 Create Ticket | [PR #24](https://github.com/Richyboy170/toktickit/pull/24) | Root fix answered in PR #22; re-review pending | Open, unmerged |
| 5 | #17 My Tickets | [PR #25](https://github.com/Richyboy170/toktickit/pull/25) | Review required; no peer comment yet | Open, unmerged |
| 6 | #18 Ticket Detail/Attachments | [PR #26](https://github.com/Richyboy170/toktickit/pull/26) | Review required; no peer comment yet | Open, unmerged |
| 7 | #19 E2E/readiness evidence | [PR #27](https://github.com/Richyboy170/toktickit/pull/27) | Review required; no peer comment yet | Open, unmerged |
| 8 | #20 Review/delivery evidence | [PR #28](https://github.com/Richyboy170/toktickit/pull/28) | Review required; no peer comment yet | Open, unmerged |

A release PR from `lab2-staging` to `main` must not be opened until the reviewer has merged the stacked PRs and staging verification passes.

## Reviews, comments, responses, and approvals received

| PR | Reviewer comments | Author responses / changes | Approval | Evidence |
|---|---|---|---|---|
| #21 | Add explicit accessible-name/tooltip guidance for icon-only controls and explicit Description resizing guidance. | Clarified `ui-spec.md` in [`7c0cdab`](https://github.com/Richyboy170/toktickit/commit/7c0cdab) on the documentation/evidence branch. | Approved and merged | [Reply](https://github.com/Richyboy170/toktickit/pull/21#issuecomment-5405064929) |
| #22 | `GET /api/categories` returned a plain-string error instead of the documented error object. | Fixed in [`038716b`](https://github.com/Richyboy170/toktickit/commit/038716b) on `feature/14-requester-reference-data`. | Re-review pending | [Reply](https://github.com/Richyboy170/toktickit/pull/22#issuecomment-5405065254) |
| #23 | `:focus-visible` used undeclared `#37a66c` instead of the required Secondary green. | Fixed in [`afd851f`](https://github.com/Richyboy170/toktickit/commit/afd851f) on `feature/15-requester-context-shell`. | Re-review pending | [Reply](https://github.com/Richyboy170/toktickit/pull/23#issuecomment-5405065644) |
| #24 | Repeated the category error-shape finding from PR #22. | Answered with the root fix in PR #22; no duplicate patch was added to the later stacked branch. | Re-review pending | [Reply](https://github.com/Richyboy170/toktickit/pull/24#issuecomment-5405066011) |
| #25–#28 | No peer review comment yet. | None. | Review required | [PR #25](https://github.com/Richyboy170/toktickit/pull/25), [PR #26](https://github.com/Richyboy170/toktickit/pull/26), [PR #27](https://github.com/Richyboy170/toktickit/pull/27), [PR #28](https://github.com/Richyboy170/toktickit/pull/28) |

This section records the review activity currently visible on GitHub. The remaining open PRs still require review, re-review, approval, and reviewer-performed merge commits.

## Reviews given to the peer

The peer repository [Tanakrit-triton/toktickit](https://github.com/Tanakrit-triton/toktickit) was queried on 20 August 2026. It had no open or closed Lab 2 PRs; only Lab 1 PRs #5–#10 existed. Therefore no genuine Lab 2 review could be given yet. When the peer opens Lab 2 PRs, the student must provide substantive comments on the actual diff and record the real PR/comment links here.

## Reviewer handoff checklist

1. Accept the pending Write invitation.
2. Review PRs #21–#28 in order.
3. Record specific findings as GitHub review comments; the author responds and pushes fixes on the same feature branch.
4. Re-review changed files and passing checks.
5. Approve and merge each PR into `lab2-staging` using **Create a merge commit**.
6. After staging integration tests pass, review and merge the one release PR from `lab2-staging` to `main`.
7. Only then update this record, move Issues to Done, and capture final-main evidence.

## Integrity note

Current status is intentionally incomplete because peer action is external and pending. Open PRs, a pending invitation, or passing local tests are not evidence of review, approval, merge, final staging integration, or final-main completion.
