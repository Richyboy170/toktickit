# Sprint 3 branch flow

Lab 3 follows the Lab 2 staged integration flow. Work begins from the published
`lab3-staging` branch, the contract and implementation are developed on a
feature branch, and a peer-reviewed pull request targets `lab3-staging`. After
that PR is approved and merged, a separate release pull request carries the
staging branch to `main`.

```text
lab3-staging (bdd1265, published)
    |
    +-- feature/lab3-implementation
          29e7ed5  docs: establish Lab 3 contract before implementation
          d4ca5cd  feat: implement Lab 3 authenticated ticket workflows
          ...     tests and evidence follow-up commits through 79af375
          |
          +-- PR #33 -> lab3-staging  [OPEN; peer review pending]
                                      |
                                      +-- merge after approval
                                          |
                                          +-- release PR: lab3-staging -> main
                                              [create after staging merge]
```

The contract baseline (`29e7ed5`) is an ancestor of the implementation
(`d4ca5cd`), so the required specification-before-implementation order is
visible in the branch history. The final two arrows are deliberately shown as
pending until the peer reviewer approves PR #33 and the staged release is
accepted; no merge or approval is claimed in this record.

| Step | Branch or PR | Current evidence | State |
|---|---|---|---|
| 1 | `lab3-staging` | `bdd1265` on the remote | Published baseline |
| 2 | `feature/lab3-implementation` | `29e7ed5` precedes `d4ca5cd`; `79af375` is published | Published feature work; branch-tip CI run 35107807323 passed |
| 3 | PR #33 | `feature/lab3-implementation` -> `lab3-staging` | Open for peer review |
| 4 | `lab3-staging` -> `main` | Release PR is created after step 3 | Pending peer approval and merge |

Remote references:

- https://github.com/Richyboy170/toktickit/tree/lab3-staging
- https://github.com/Richyboy170/toktickit/tree/feature/lab3-implementation
- https://github.com/Richyboy170/toktickit/pull/33

![Rendered Lab 3 branch flow](../../artifacts/lab-03/git/branch-flow.png)
