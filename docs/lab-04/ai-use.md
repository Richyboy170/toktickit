# Lab 4 AI Use and Student Reflection

## Model and workflow

OpenAI Codex (GPT-6) was used in both specification-agent and coding-agent roles: to structure the requirements and acceptance criteria, support implementation, diagnose CI findings, and prepare documentation. The student reviewed and approved the Engineering Contract before implementation. The reflection below is a draft based on documented project events and the student's stated sentiment; the student must review and edit it before submission.

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

   **How it guided the work:** A reflection draft was prepared from the actual project history, and the student supplied the personal sentiment that informs it.

8. **Student's personal reflection detail**

   > I feel nice to do this work and interest for how this could improve my workflow skill and also issuing and github skills

   **How it guided the work:** This supplied the personal sentiment used in the reflection: enjoyment of the assignment and interest in improving workflow, issue-writing, and GitHub skills.

## My Reflection

> **Student review draft:** Please edit this first-person text so every statement matches your own experience before submitting.
>
> For the specification-agent role, I asked Codex to turn the handout into an Engineering Contract, numbered requirements, acceptance criteria, and a test plan before implementation. Reviewing and approving the contract helped me see how product rules, tests, and GitHub work fit together. I enjoyed the assignment and want to improve my workflow, issue-writing, and GitHub skills.
>
> For the coding-agent role, I used Codex to implement changes and investigate failed API tests and CI findings. Peer review on PR #58 required a direct link to Issue #51, and the later `main` audit found dependency issues after feature checks had passed. Those examples taught me to verify traceability and test the merged branch; agent output and a green feature PR were not enough. Peer review, regression tests, and final-main checks each found different problems.
>
> I also closed Issues #51 and #53 while the final PDF and evidence review were still outstanding. That was a tracking mistake: issue closure should follow acceptance criteria, and a closed issue does not prove the deliverable is accepted. Next time I will keep remaining acceptance work visible and confirm final evidence before closing the issue. PR #64 still awaits independent review and staged release, so I should not describe this work as fully accepted.
