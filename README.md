# TokTickIT — Lab 1

A one-page IT service desk starter. It has a **[Check System]** button that calls the
backend twice: once to prove the API is alive, once to read the four request categories
out of PostgreSQL. The point of Lab 1 is not features — it is proving that all four
layers talk to each other:

```
React (client) ──HTTP──> Express (server) ──Prisma──> PostgreSQL
```

---

## 1. Prerequisites

| Tool | Version used |
|---|---|
| Node.js | 24.x (any 18+ works) |
| npm | 11.x |
| PostgreSQL | 17, listening on port 5432 |

---

## 2. Setup

### 2.1 Database

PostgreSQL 17 must be listening on port 5432. This machine uses the official
PostgreSQL zip binaries (no Windows service), so the server is started by hand:

```bash
"C:/Users/julia/pgsql/bin/pg_ctl" -D "C:/Users/julia/pgdata" -l "C:/Users/julia/pgdata/server.log" start
# stop it again with:  pg_ctl -D "C:/Users/julia/pgdata" stop
```

If you installed PostgreSQL with the normal Windows installer instead, it already
runs as a service and you can skip that step.

Then create the database and user that `server/.env.example` expects
(run in `psql` as the `postgres` superuser):

```sql
CREATE USER toktickit WITH PASSWORD 'toktickit';
ALTER USER toktickit CREATEDB;      -- Prisma needs this for its shadow database
CREATE DATABASE toktickit OWNER toktickit;
```

### 2.2 Backend

```bash
cd server
cp .env.example .env          # then edit DATABASE_URL if your password differs
npm install
npx prisma migrate dev --name init    # creates the Category table
npm run prisma:seed                   # inserts the 4 categories
npm run dev                           # http://localhost:3000
```

### 2.3 Frontend

```bash
cd client
cp .env.example .env          # VITE_API_URL=http://localhost:3000
npm install
npm run dev                   # http://localhost:5173
```

Open <http://localhost:5173> and click **Check System**.

---

## 3. Running the tests

```bash
cd server && npm test     # Supertest: /api/health, /api/categories
cd client && npm test     # Vitest: heading, success state, error state
```

The server tests need the database migrated and seeded first (step 2.2).
The client tests do **not** — they mock the API module, so they run offline.

---

## 4. API

| Method | Path | Response |
|---|---|---|
| GET | `/api/health` | `200 {"status":"ok","service":"TokTickIT API"}` |
| GET | `/api/categories` | `200 [{"id":1,"name":"Account and Access"}, ...]` |

---

## 5. How it works — file by file

### Server (`server/`)

| File | What it does |
|---|---|
| `src/app.ts` | Builds the Express app and defines both routes. Exports `app` **without** starting it. |
| `src/index.ts` | Imports `app` and calls `app.listen(PORT)`. This is the only file that opens a port. |
| `src/prisma.ts` | `getPrisma()` — creates one `PrismaClient` the first time it is called, then reuses it. |
| `prisma/schema.prisma` | Declares the `Category` table (`id`, unique `name`, `createdAt`). |
| `prisma/seed.ts` | Inserts the four category names using `upsert`, so re-running it never duplicates. |
| `tests/lab-01/*.test.ts` | Supertest hits the exported `app` in memory — no server needs to be running. |

**Why `app.ts` and `index.ts` are separate:** Supertest needs the app object, not a live
port. If `app.listen()` lived in `app.ts`, importing it in a test would occupy port 3000
and the test run would hang or clash.

**Why `getPrisma()` is lazy:** creating a `PrismaClient` opens a database connection.
The health check must answer even when the database is down, so the client is only built
the moment a route actually needs the database.

### Client (`client/`)

| File | What it does |
|---|---|
| `src/main.tsx` | Mounts `<App />` and imports the Bootstrap stylesheet. |
| `src/api.ts` | `checkSystem()` — the only file that knows about HTTP. Calls `/api/health`, then `/api/categories`, and throws if either fails. |
| `src/App.tsx` | The whole UI. Holds one state variable (`idle`/`loading`/`success`/`error`) and renders one block per state. |
| `tests/lab-01/App.test.tsx` | Vitest + Testing Library. Replaces `checkSystem` with a fake so the UI can be tested without a server. |

**Why the fetch calls live in `api.ts` instead of `App.tsx`:** it gives the tests one
single function to fake. That is what makes UI-02 and UI-03 possible offline.

---

## 6. Repository layout

```
toktickit/
├── client/                  React + TypeScript + Vite + Bootstrap
│   ├── src/
│   └── tests/lab-01/        Vitest UI tests
├── server/                  Node + Express + TypeScript
│   ├── prisma/              schema + seed
│   ├── src/
│   └── tests/lab-01/        Supertest API tests
├── docs/lab-01/             ai_use.md, reviewer.md, tests.md
├── .gitignore
└── README.md
```

## 7. Secrets

`.env` files are git-ignored. Only `.env.example` is committed, and it contains
placeholder values — never a real password.
