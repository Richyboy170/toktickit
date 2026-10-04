# Lab 4 GitHub Issue Drafts

Create these Issues in the existing TokTickIT GitHub Project before feature implementation. Apply the repository's existing Kanban status and a `Lab 4` label. Add dependencies/Development links after GitHub assigns issue numbers. Do not close an Issue until every checkbox and its linked PR are complete. Branches and PR destinations follow `Engineering_Contract.md`.

## Issue 0 — [Lab 4] Contract and Test DD baseline

**Description:** Establish the reviewed Sprint 4 source of truth before product implementation.

- [ ] `docs/lab-04/specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` define scope, numbered FR/BR/AC, workflow, calculations, exact API/UI decisions, and all AC-to-test links.
- [ ] Reviewer and AI-use evidence files exist; AI record has no invented review/test/student reflection claims.
- [ ] Contract and Test DD history precedes every implementation PR.
- [ ] Self-review finds no untraced acceptance criterion, unresolved contradiction, or false evidence status.
- [ ] PR is peer-reviewed and merged to `lab4-staging`.

## Issue 1 — [Lab 4] Action Taken schema, migration, and seed

**Description:** Add ActionTaken persistence and realistic repeatable data without damaging Labs 1–3.

- [ ] Action fields/status enum/relations/indexes match approved Spec DD.
- [ ] Additive migration preserves existing User, Ticket, Attachment bytes/metadata, comments, notes, IDs, and owner links; legacy Tickets receive no synthetic Actions.
- [ ] Migration/recovery is tested and documented on populated pre-Lab-4 schema.
- [ ] Idempotent seed includes zero/one/multiple Actions, all Action/Ticket statuses, priority/owner variants, multiple performers/assignees, and empty/nonempty dashboard cases.
- [ ] Prisma validation and focused migration/seed checks pass.

## Issue 2 — [Lab 4] Action Taken API and authorization

**Description:** Implement ordered list, create, update, assignment and Action status transitions with server identity and stale-write safety.

- [ ] Requester reads only owned Ticket Actions and cannot write; Staff/Admin write only on Tickets they can read.
- [ ] Performer comes from authenticated user; active IT Staff assignee is separately validated on every write.
- [ ] Field/follow-up/result validation and complete Action transition matrix are enforced by API.
- [ ] Performer/Ticket link and terminal Actions are immutable; no delete endpoint.
- [ ] Stale writes conflict without overwriting; safe errors and stable Action order are covered by tests.

## Issue 3 — [Lab 4] Ticket status workflow and resolution gate

**Description:** Apply the complete transition matrix and resolution requirements to the existing Staff status endpoint.

- [ ] Every allowed/rejected transition and role is tested through API.
- [ ] Resolve requires active primary owner, at least one completed Action and all non-cancelled Actions complete; cancelled Actions remain history.
- [ ] Requester resolution indication remains advisory.
- [ ] Cancel reason, confirmation, reopen/close rules, and stale update conflict are enforced server-side.
- [ ] Race/concurrency behavior cannot resolve against incomplete Action state.

## Issue 4 — [Lab 4] IT Staff dashboard API and UI

**Description:** Add operational metrics, recent/urgent Tickets, and current user's assigned Actions.

- [ ] Counts match exact DB predicates; include zero for every status.
- [ ] Lists use defined order/limit and are scoped to current Staff identity where applicable.
- [ ] Every metric/list drills to correct Queue filter/Ticket Detail Actions section.
- [ ] Filter groups match exact card populations, compose with owner/assignment filters, and reject contradictory filters.
- [ ] Loading, empty, forbidden and safe failure behaviors plus responsive evidence exist.
- [ ] API/database comparison and component/API tests pass.

## Issue 5 — [Lab 4] Requester dashboard API and UI

**Description:** Summarize only the authenticated Requester's Tickets and provide useful drill-downs.

- [ ] Open/waiting counts and recent updated/resolved lists match defined predicates/window/order/limit.
- [ ] No client-supplied requester ID affects results; cross-owner records never leak.
- [ ] Cards/lists link to My Tickets filter or owned Ticket Detail.
- [ ] My Tickets initializes status-group/single-status filter from dashboard URL and preserves it during pagination.
- [ ] Zero/empty/loading/error states and component/API tests pass.

## Issue 6 — [Lab 4] Actions Taken Ticket Detail UI

**Description:** Add Action history and permitted create/edit/assign/status workflows to Ticket Detail.

- [ ] Multiple Actions show stable order and distinct performer/assignee.
- [ ] Create, assign/reassign, edit, complete, cancel, conditional follow-up, and validation match API contract.
- [ ] Requester has read-only view; terminal Actions have no edit/delete control.
- [ ] Conflict preserves form draft; repeat submit does not create duplicate work.
- [ ] Staff/Admin UI, API integration, accessibility, and responsive tests pass.

## Issue 7 — [Lab 4] Regression, accessibility, visual evidence, and hardening

**Description:** Verify the integrated increment and existing Labs 1–3 experience.

- [ ] Authentication, Requester Ticket/Attachment/Comment, Staff Queue/Notes, and Admin user-management regressions pass.
- [ ] Keyboard/focus/labels/errors/status contrast, responsive layout, overflow, and visual checklist are complete.
- [ ] Desktop/tablet/mobile screenshots cover dashboards, Action list/forms/states, and workflow feedback.
- [ ] README is current; no secrets, generated builds, DB bytes, logs, or transient test output is committed.
- [ ] Complete staging CI passes.

## Issue 8 — [Lab 4] Final PDF and release evidence

**Description:** Produce the final rubric-ordered submission from the exact released source.

- [ ] Reviewer record includes actual peer identity, PR review threads, responses, approvals, and merge links.
- [ ] AI-use record includes actual model, 6–10 selected prompts, and student-written reflection.
- [ ] PDF has exactly Answer Parts 1–9 in order, working final-main links, readable screenshots, and no unsupported claims.
- [ ] Release PR from `lab4-staging` to `main` is approved and merged; full CI passes on merge SHA.
- [ ] All completed Lab 4 Issues are closed and Project/Kanban shows Done.
