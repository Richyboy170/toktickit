# Lab 4 Migration Preservation Verification Plan

> **For agentic workers:** Use the native `superpowers:executing-plans` workflow to implement this plan task-by-task. This scope has already been authorized as part of the Lab 4 assignment.

**Goal:** Verify in CI that applying the Lab 4 migration to a populated Lab 3 schema preserves representative Users, Tickets, Attachment bytes, Public Comments, and Internal Notes, and creates no synthetic Actions.

**Architecture:** A TypeScript verification script creates an isolated PostgreSQL schema, applies all pre-Lab-4 Prisma migrations, inserts a representative legacy dataset, applies the full migration set, then compares persisted rows and binary content. The server CI job runs it before its ordinary migrate/seed/test sequence; the script drops its temporary schema on completion.

**Tech Stack:** Node.js, TypeScript/tsx, Prisma Client/CLI, PostgreSQL, GitHub Actions.

**Spec:** `docs/lab-04/Engineering_Contract.md`, sections 7 and 10; issue #56.

## Global Constraints

- Use the CI PostgreSQL service and an isolated schema; do not mutate the shared `public` schema.
- Preserve existing row IDs, ownership links, statuses, attachment bytes/metadata, comments, and notes.
- Existing Tickets must have zero Actions after the migration; do not fabricate legacy Action history.
- The check must fail on mismatched data or migration errors and always attempt cleanup.
- Do not add production behavior or dependencies.

## Review Focus

- PostgreSQL schema selection in the datasource URL — ensure all migrations and queries target only the temporary schema.
- SQL fixture fields/enums matching the exact Lab 3 migration state — apply every pre-Lab-4 migration before inserts.
- Attachment binary comparison — compare exact hex bytes and metadata, not only row counts.
- Foreign keys/ownership — preserve requester and Ticket owner identities and links.
- Cleanup/error reporting — report the original failure while attempting to remove the temporary schema.

---

### Task 1: Add and run the preservation verification

**Files:**
- Create: `server/scripts/verify-lab4-migration-preserves-data.ts`
- Modify: `server/package.json` (add `test:migration-preservation` script)
- Modify: `.github/workflows/lab2-ci.yml` (run the check in the server job before ordinary migration/seed)
- Test: disposable PostgreSQL in GitHub Actions

**Interfaces:**
- Consumes: CI's existing `DATABASE_URL` for the `toktickit_test` database.
- Produces: a zero exit code only when the pre-Lab-4 fixture survives and the migrated Ticket has zero Actions.

- [x] Write the verification script with exact fixture IDs and assertions for User role, Ticket ownership/status, Attachment metadata/bytes, Comment content, Note content, and zero Actions.
- [x] Attempt a local database run; this workspace has no PostgreSQL service, so GitHub Actions is the database execution environment.
- [x] Implement schema creation, pre-Lab-4 migration application, fixture insertion, Lab 4 migration application, verification, and cleanup.
- [x] Add the server-job step before normal `prisma migrate deploy`; keep the existing public test schema independent.
- [x] Run the TypeScript build and GitHub Actions checks. The server migration-preservation step, server suite/build/audit, client checks, and E2E job passed on workflow run 37281590333 attempt 2.
- [x] Record the passing run on issue #56 and in the assignment evidence. Keep the issue Started until PR #57 is merged.
- [x] Commit and publish the test and CI wiring on this branch; PR #57 is open for peer review and merge.
