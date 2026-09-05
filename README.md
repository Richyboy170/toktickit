# TokTickIT — Lab 2 Requester Experience

TokTickIT is a full-stack IT service desk course project. Lab 2 lets a selected Development Requester create a Ticket, search and filter only their own Tickets, inspect read-only details, and upload, preview, download, or soft-remove supporting Attachments.

The Requester selector is a visible Lab 2 testing mechanism, not authentication. Lab 3 will replace the `X-Development-Requester-Id` header with server-established identity.

## Technology

| Layer | Technology |
|---|---|
| Client | React 18, TypeScript, Vite 8, React Router, Bootstrap, Testing Library |
| Server | Node.js, Express, TypeScript, Zod, Multer, file-type |
| Data | PostgreSQL 17, Prisma 5 |
| Quality | Vitest 4, Supertest, Playwright 1.62, GitHub Actions |

Recommended local versions are Node.js 24.x, npm 11.x, and PostgreSQL 17. Node.js 20.19+ or 22.12+ is required by Vite 8.

## Setup

Create development and test databases. The example credentials below are placeholders and match `server/.env.example`:

```sql
CREATE USER toktickit WITH PASSWORD 'toktickit';
ALTER USER toktickit CREATEDB;
CREATE DATABASE toktickit OWNER toktickit;
CREATE DATABASE toktickit_test OWNER toktickit;
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

The idempotent seed creates four active Categories, seven active Related Systems, four active Development Requesters, and one inactive Requester used by tests.

In a second terminal, start the client:

```bash
cd client
cp .env.example .env
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`, choose a Development Requester, and continue to My Tickets. The API listens on `http://127.0.0.1:3000`.

## Verification

Run every unit, API, UI, build, audit, and browser check from the repository root:

```bash
npm run test
npm run build
npm run audit
npm run test:e2e
npm run test:evidence
```

Server API tests derive or use `TEST_DATABASE_URL`, so cleanup never targets development data. Playwright uses `E2E_DATABASE_URL`, then `TEST_DATABASE_URL`, then the documented `toktickit_test` fallback. Its preparation script refuses to delete fixtures unless the database name contains `test` or `e2e`.

Playwright uses installed Chrome locally. CI installs Chromium and uploads the screenshot/report artifacts. `test:evidence` captures deterministic rubric-specific UI states without changing production behavior. Curated, visually inspected evidence is committed under `artifacts/lab-02/screenshots/`; transient `test-results/` and `playwright-report/` output is ignored.

## Requester API

Requester-owned routes require `X-Development-Requester-Id: <positive integer>`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Process health |
| GET | `/api/categories` | Active Categories |
| GET | `/api/related-systems` | Active Related Systems |
| GET | `/api/development-requesters` | Active testing Requesters |
| POST | `/api/tickets` | Create one owned Ticket with idempotency token |
| GET | `/api/tickets` | Search, filter, sort, and paginate owned Tickets |
| GET | `/api/tickets/:ticketId` | Read owned Ticket Detail and Attachment metadata |
| GET | `/api/tickets/:ticketId/attachments` | List active and removed metadata |
| POST | `/api/tickets/:ticketId/attachments` | Upload exactly one bounded file |
| GET | `/api/attachments/:attachmentId/download` | Download active owned content |
| DELETE | `/api/attachments/:attachmentId` | Soft-remove with a required reason |

The complete request/response, validation, status, and safe-error contract is in [`docs/lab-02/api-spec.md`](docs/lab-02/api-spec.md).

## Attachment safety and lifecycle

- JPG/JPEG, PNG, WEBP, and PDF only; extension, declared MIME, and detected signature must agree.
- Maximum 5 MiB per file and five active files per Ticket.
- A PostgreSQL advisory transaction lock prevents concurrent uploads from exceeding the active limit.
- Names are reduced to a sanitized basename; bytes are stored in PostgreSQL and never written to user-controlled paths.
- Cross-requester operations use the same `404` response as missing resources.
- Soft removal retains metadata, remover, timestamp, and reason; removed content returns `410` and has no preview/download action.

## Repository layout

```text
toktickit/
├── .github/workflows/lab2-ci.yml
├── artifacts/lab-02/screenshots/
├── client/
│   ├── src/                         React requester screens and API client
│   └── tests/lab-01,lab-02/         UI and responsive-structure tests
├── docs/lab-01,lab-02/              Contracts, plans, and evidence
├── e2e/lab-02/                      Playwright requester flow
├── server/
│   ├── prisma/                      Schema, migrations, seed, guarded E2E prep
│   ├── src/                         Express API and validation
│   └── tests/lab-01,lab-02/         Unit and PostgreSQL API tests
└── package.json                     Workspace verification commands
```

## Git and secrets

`.env`, dependencies, builds, logs, and transient test reports are ignored. Only `.env.example` files with placeholder values are committed. Lab 2 feature PRs target the protected `lab2-staging` branch and must be peer-reviewed and merged by the reviewer with merge commits; the author does not merge them.
