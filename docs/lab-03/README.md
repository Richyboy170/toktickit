# Lab 3 contract set

This directory is the Sprint 3 documentation baseline for TokTickIT. Read the files in this order before implementation:

1. [specification.md](./specification.md) — scope, functional/business rules, role matrix, data migration, acceptance criteria, and Product Definition of Done.
2. [api-spec.md](./api-spec.md) — session behavior, routes, payloads, authorization, validation, and status/error contract.
3. [ui-spec.md](./ui-spec.md) — shell, screen modes, reusable components, responsive/accessibility rules, and visual checklist.
4. [tests.md](./tests.md) — Test DD plan and acceptance-criterion traceability.
5. [reviewer.md](./reviewer.md) — peer-review sequence and evidence template.
6. [ai-use.md](./ai-use.md) — genuine prompt record and reflection template.

The staged Git flow, commit order, and current pending merge steps are rendered
in [branch-flow.md](./branch-flow.md). UI captures are indexed in
`../../artifacts/lab-03/screenshots/README.md` and can be regenerated with
`npm run test:e2e:visual`.

The contract extends Lab 2 and must be updated before an implementation change if a route, role, status, migration, or acceptance decision changes. `Pending` and bracketed values are deliberate placeholders for real test, review, CI, Git, and screenshot evidence; they are not completion claims.

After applying the Lab 3 migration to an existing Lab 2 database, legacy rows with no credential can be initialized with a temporary local `LAB3_MIGRATION_INITIAL_PASSWORD` and `npm run prisma:initialize-legacy-passwords` from `server`. The command hashes the value, preserves the mandatory first-login flag, and never prints the password. Stable local fixtures are initialized by `npm run prisma:seed`.
