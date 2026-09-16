# TokTickIT — Lab 3 Users, Roles, and IT Ticketing

TokTickIT is a full-stack IT service desk course project. Lab 3 replaces the temporary Development Requester flow with real email/password authentication, role-based access, an IT Staff queue and ticket workflow, and a focused Administrator User Management screen. Lab 2 Requester ticket and attachment behavior remains available to authenticated Requesters.

## Technology

| Layer | Technology |
|---|---|
| Client | React 18, TypeScript, Vite, React Router, Bootstrap, Testing Library |
| Server | Node.js, Express, TypeScript, Zod, Multer, file-type |
| Data | PostgreSQL 17, Prisma 5 |
| Quality | Vitest, Supertest, Playwright, GitHub Actions |

## Setup

Create development and test databases. The example credentials are placeholders and match `server/.env.example`:

```sql
CREATE USER toktickit WITH PASSWORD 'toktickit';
ALTER USER toktickit CREATEDB;
CREATE DATABASE toktickit OWNER TO toktickit;
CREATE DATABASE toktickit_test OWNER TO toktickit;
```

Install, migrate, and seed the server:

```bash
cd server
cp .env.example .env
npm ci
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

The migration evolves the existing `DevelopmentRequester` table into `User` while preserving integer IDs, Tickets, Attachments, and timestamps. The idempotent local seed creates four active Requesters and one inactive Requester, three active IT Staff and one inactive IT Staff, one Administrator, reference data, workflow Tickets, Public Comments, and Internal Notes. Seed passwords are local development credentials only; see `server/prisma/seed.ts` and `docs/lab-03/README.md`.

For a database that contains legacy Requesters outside the stable local seed, set a temporary local `LAB3_MIGRATION_INITIAL_PASSWORD` environment variable and run `npm run prisma:initialize-legacy-passwords` after the migration. The command hashes that value for rows still marked with an empty credential, keeps `mustChangePassword=true`, and never prints the password. The Administrator can then issue an individual initial password through User Management. Do not commit the variable or use it as a production secret.

In a second terminal, start the client:

```bash
cd client
cp .env.example .env
npm ci
npm run dev
```

Open `http://127.0.0.1:5173` and sign in. The API listens on `http://127.0.0.1:3000`. Sessions use an opaque `HttpOnly`, `SameSite=Lax` cookie named `toktickit_session`; the raw token is never stored in browser storage.

## Verification

Run the build and automated checks from the repository root:

```bash
npm run test
npm run build
npx prisma validate --schema server/prisma/schema.prisma
npm run test:e2e
npm run test:evidence
```

When PostgreSQL is available, `npm run test` runs the server API/regression suites and client tests. `npm run test:e2e` prepares an isolated test database before running browser flows. `npm run build` compiles both TypeScript applications and creates the Vite production bundle. `npx prisma generate` refreshes the generated client after schema changes.

## Authenticated API

Normal application routes use the authenticated session cookie. The legacy `X-Development-Requester-Id` header and `/api/development-requesters` endpoint are retained only as compatibility shims for the Lab 2 regression fixtures when `ENABLE_LEGACY_REQUESTER_CONTEXT=true` or `NODE_ENV=test`; they are unavailable by default. The Lab 3 client never sends the header and cannot choose another Requester.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Establish an authenticated session |
| POST | `/api/auth/logout` | Revoke the current session |
| GET | `/api/auth/me` | Read the current user and password-change state |
| POST | `/api/auth/change-password` | Complete or change a password |
| GET | `/api/categories` | Active Categories |
| GET | `/api/related-systems` | Active Related Systems |
| POST | `/api/tickets` | Create an owned Ticket |
| GET | `/api/tickets` | Search, filter, sort, and paginate owned Tickets |
| GET | `/api/tickets/:ticketId` | Read visible Ticket Detail |
| GET/POST | `/api/tickets/:ticketId/comments` | Read or append Public Comments |
| POST | `/api/tickets/:ticketId/resolution-indication` | Record Requester resolution indication |
| GET/POST/DELETE | `/api/tickets/:ticketId/attachments` | List, upload, or remove Attachments |
| GET | `/api/attachments/:attachmentId/download` | Download a visible Attachment |
| GET | `/api/staff/tickets` | IT Staff Queue with search/filter/sort/pagination |
| GET | `/api/staff/tickets/:ticketId` | IT Staff Ticket Detail; Administrator read-only inspection |
| PATCH | `/api/staff/tickets/:ticketId/assignment` | Claim, assign, reassign, or unassign |
| PATCH | `/api/staff/tickets/:ticketId/priority` | Change IT Priority |
| PATCH | `/api/staff/tickets/:ticketId/status` | Apply a permitted status transition |
| GET/POST | `/api/staff/tickets/:ticketId/notes` | Read or append Internal Notes |
| GET/POST/PATCH | `/api/admin/users` | Administrator User Management |

The complete request/response, validation, authorization, status, and safe-error contract is in [`docs/lab-03/api-spec.md`](docs/lab-03/api-spec.md). The engineering contract, test traceability, UI rules, review record, and AI reflection are in [`docs/lab-03/`](docs/lab-03/).

## Attachment safety and lifecycle

- JPG/JPEG, PNG, WEBP, and PDF only; extension, declared MIME, and detected signature must agree.
- Maximum 5 MiB per file and five active files per Ticket.
- Names are reduced to a sanitized basename; bytes are stored in PostgreSQL and never written to user-controlled paths.
- Cross-owner operations use the same neutral `404` response as missing resources.
- Soft removal retains metadata, remover, timestamp, and reason; removed content returns `410` and has no preview/download action.

## Repository layout

```text
toktickit/
├── .github/workflows/
├── artifacts/lab-02,lab-03/screenshots/
├── client/
│   ├── src/                         React role-based screens and API client
│   └── tests/lab-01,lab-02,lab-03/  UI and responsive-structure tests
├── docs/lab-01,lab-02,lab-03/       Contracts, plans, and evidence
├── e2e/lab-02,lab-03/               Playwright requester/staff/admin flows
├── server/
│   ├── prisma/                      Schema, migrations, and seed
│   ├── src/                         Express API and authorization
│   └── tests/lab-01,lab-02,lab-03/  Unit and PostgreSQL API tests
└── package.json                     Workspace verification commands
```

## Git and secrets

`.env`, dependencies, builds, logs, and transient test reports are ignored. Only `.env.example` files with placeholder values are committed. Lab 3 feature branches target `lab3-staging` and are peer-reviewed before the release reaches `main`; the concrete branch sequence and current merge state are recorded in [`docs/lab-03/branch-flow.md`](docs/lab-03/branch-flow.md). The final report records genuine repository and verification evidence.
