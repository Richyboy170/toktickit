# Sprint 3 branch flow

Lab 3 follows the required staged integration flow. The contract preceded the
implementation, feature work received peer review before entering
`lab3-staging`, the staged result passed CI, and approved release PR #42 merged
the complete increment into `main`. The immutable final source commit is
`161ddd8454c421df4701ad740414245bda68ebff`.

```text
feature/lab3-implementation
    29e7ed5  contract and Test DD before implementation
    d4ca5cd  Lab 3 implementation
       |
       +-- PR #33 [changes requested -> fixed -> approved]
       |      -> lab3-staging merge 593d6ba
       |      -> staging CI 35171700694 [PASS]
       |
       +-- follow-up tests/evidence through 529bf2c
              -> PR #41 linked to Issue #40 [changes requested -> fixed -> approved]
              -> lab3-staging merge 1060376
              -> staging CI 35232939109 [PASS]
                         |
                         +-- PR #42 lab3-staging -> main [APPROVED; MERGED]
                                -> main merge 161ddd8
                                -> final-main CI 35311307446 [PASS]
                                -> Issues #34-#40 [CLOSED]
```

The contract baseline `29e7ed5` is an ancestor of implementation commit
`d4ca5cd`, so specification-before-implementation order is visible in Git
history. `iceswift` reviewed all required integration stages. PR #33 fixed the
Administrator Ticket Detail authorization mismatch. PR #41 fixed its missing
Issue #40 Development linkage before approval. PR #42 then released the
staged increment to `main` and closed all Sprint 3 Issues.

| Step | Branch or PR | Evidence | Final state |
|---|---|---|---|
| 1 | Contract baseline | `29e7ed5` precedes `d4ca5cd` | Complete |
| 2 | PR #33 | `feature/lab3-implementation` -> `lab3-staging` | Approved and merged as `593d6ba` |
| 3 | First staging CI | [Run 35171700694](https://github.com/Richyboy170/toktickit/actions/runs/35171700694) | Server, client, and E2E passed |
| 4 | PR #41 | Follow-up tests/evidence linked to Issue #40 | Approved and merged as `1060376` |
| 5 | Final staging CI | [Run 35232939109](https://github.com/Richyboy170/toktickit/actions/runs/35232939109) | Server, client, E2E, visual capture, and artifact upload passed |
| 6 | PR #42 | `lab3-staging` -> `main` | Approved and merged as `161ddd8` |
| 7 | Final-main CI | [Run 35311307446](https://github.com/Richyboy170/toktickit/actions/runs/35311307446) | Server, client, E2E, visual capture, and artifact upload passed |
| 8 | Issues #34-#40 | [Closed Issue list](https://github.com/Richyboy170/toktickit/issues?q=is%3Aissue%20state%3Aclosed%20%22%5BLab%203%5D%22) and [Project #2 Done board](https://github.com/users/Richyboy170/projects/2/views/1) | All seven closed by release PR #42 and recorded as Done in the final Kanban |

Remote references:

- [PR #33](https://github.com/Richyboy170/toktickit/pull/33)
- [PR #41](https://github.com/Richyboy170/toktickit/pull/41)
- [PR #42](https://github.com/Richyboy170/toktickit/pull/42)
- [final main commit 161ddd8](https://github.com/Richyboy170/toktickit/commit/161ddd8454c421df4701ad740414245bda68ebff)
- [final-main CI run 35311307446](https://github.com/Richyboy170/toktickit/actions/runs/35311307446)
- [Lab 3 Project Done-board screenshot](../../artifacts/lab-03/github/lab3-project-done.png)
- [final GitHub screenshot evidence](../../artifacts/lab-03/github/README.md)

![Rendered Lab 3 branch flow](../../artifacts/lab-03/git/branch-flow.png)
