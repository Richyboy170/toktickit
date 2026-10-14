# Lab 4 AI Use and Student Reflection

## Model and workflow

AI assistance in this work used OpenAI Codex (GPT-6) for requirements planning, implementation support, CI failure diagnosis, and documentation. The student reviewed the engineering contract and supplied the personal experience included in the AI-assisted reflection below.

## Selected prompts from the actual work

The quotations below preserve the user's original wording. CI entries show the relevant excerpt from the output the user pasted; they are excerpts, not the full logs.

1. **Contract and assignment scope**

   > could you read c:\Users\julia\OneDrive\Desktop\KMUTT\4th-Year-1st-Semester\CPE334_Software-Engineering\04_Assignment\SE+Lab+4.pdf and create engineering contract consist of what this c:\Users\julia\OneDrive\Desktop\KMUTT\4th-Year-1st-Semester\CPE334_Software-Engineering\04_Assignment going to do? it should include the line of the work like what issue should be made and the branches, pull requests, issue, etc. that is connect to how it should be done in github to get the full marks in the criteria and show the correct final deliverables of the pdf file consists of the document of this 4th assignment's work. Could you do that? and after you create that engineering contract I want you to do the work too, so be prepared for that. You don't need to ask me anything, just make the engineering contract then I will review it after you finish and will tell you to do the assignment after that

   **How it guided the work:** The assignment PDF was used to make the engineering contract, issue/branch/PR sequence, rubric coverage, and final deliverable checklist before implementation began.

2. **Approval and implementation start**

   > sure approve! and should I make a pull request for the c:\Users\julia\OneDrive\Desktop\KMUTT\4th-Year-1st-Semester\CPE334_Software-Engineering\04_Assignment\Engineering_Contract.md ? if not you can start the work

   **How it guided the work:** The contract was accepted, and implementation started under the agreed issue and pull request workflow.

3. **Peer review pull request**

   > you do that for me and send me the link to send to my peer for the peer review

   **How it guided the work:** A peer-review PR was opened and its link was provided; the student retained the course-required peer merge step.

4. **GitHub issue and evidence workflow**

   > I think you could connect github from here and do the issue and such for me. I will be here for your link to capture what is needed

   **How it guided the work:** The GitHub issues and board tracking were created/updated, while the PR links and evidence locations were recorded for the report.

5. **Server authorization failure pasted from CI**

   ```text
   AssertionError: expected 200 to be 404 // Object.is equality
   tests/lab-04/actions-taken.api.test.ts:82
   ```

   **How it guided the work:** This failure focused the investigation on Requester access to another owner's Ticket; the server authorization behavior and API test were corrected and later covered by passing CI.

6. **Post-merge dependency audit output pasted from CI**

   ```text
   undici  8.0.0 - 8.10.1
   Severity: high
   fix available via `npm audit fix`
   ```

   **How it guided the work:** The audit output led to dependency remediation. Later, main CI exposed `source-map-js` and `proxy-addr` findings; those lockfile updates were delivered through PR #60, then verified by passing final-main CI.

7. **Request for a reflection**

   > and can you do the reflection for me?

   **How it guided the work:** A reflection was prepared from the actual project history, and the student supplied the personal perspective included below.

8. **Student's personal reflection detail**

   > I feel nice to do this work and interest for how this could improve my workflow skill and also issuing and github skills

   **How it guided the work:** This supplied the personal sentiment used in the reflection: enjoyment of the assignment and interest in improving workflow, issue-writing, and GitHub skills.

## My Reflection

For this lab, I used Codex to help turn the assignment brief into an engineering contract, organize the work into GitHub issues and pull requests, and diagnose CI failures. I reviewed the contract before implementation and kept peer review and merging as explicit steps in the workflow. That helped me treat generated code and documentation as work to inspect, rather than as evidence that the assignment was complete. I felt good doing this work, and it made me interested in improving my engineering workflow, issue-writing, and GitHub skills.

One concrete example was the dependency audit after the accessibility changes were merged. The pull request checks had passed, but the new `main` run found vulnerable transitive versions of `source-map-js` and `proxy-addr`. The lockfiles were updated to patched releases, and I waited for the follow-up pull request to pass the server, client, and E2E checks and for the peer to merge it. The final `main` run [37747697657](https://github.com/Richyboy170/toktickit/actions/runs/37747697657) then passed all three jobs. This showed me that a green feature pull request alone does not establish that the merged release is healthy; the checks on the actual `main` commit matter too.

I also learned to keep the workflow evidence connected: the contract described the acceptance criteria, tests checked behavior and permissions, and issues and pull requests recorded implementation and review. I used the peer-review feedback to link the regression work to its issue and waited for peer approval and merge instead of treating my own implementation checks as a substitute. This gave me practical experience with writing and tracking issues, connecting them to pull requests, and following work through review and merge. In future work, I would create the issue and evidence checklist before implementation so the GitHub history and final report are complete as the work happens.
