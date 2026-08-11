# Lab 1 — Test Plan and Evidence

All test files live under `server/tests/lab-01/` and `client/tests/lab-01/`.

| # | Test File | Tool | Test Description | Result |
|---|-----------|------|------------------|--------|
| API-01 | `server/tests/lab-01/health.test.ts` | Supertest | Health endpoint returns 200 and expected JSON | Pass |
| API-02 | `server/tests/lab-01/categories.test.ts` | Supertest | Categories endpoint returns the four seeded categories in id order | Pass |
| UI-01 | `client/tests/lab-01/App.test.tsx` | Vitest | TokTickIT heading renders | Pass |
| UI-02 | `client/tests/lab-01/App.test.tsx` | Vitest | Loading state changes to the category list | Pass |
| UI-03 | `client/tests/lab-01/App.test.tsx` | Vitest | API failure displays a useful error message | Pass |

## How to run them

```bash
cd server && npm test     # API-01, API-02  (needs the DB migrated and seeded)
cd client && npm test     # UI-01, UI-02, UI-03  (no server or DB needed)
```

The client tests replace `checkSystem()` with a fake using
`vi.spyOn(api, "checkSystem")`, so the UI can be tested for success, loading, and
failure without starting a backend.

## Passing output

```
$ cd server && npm test

 RUN  v2.1.9 .../toktickit/server

 ✓ tests/lab-01/health.test.ts (1 test) 51ms
 ✓ tests/lab-01/categories.test.ts (1 test) 263ms

 Test Files  2 passed (2)
      Tests  2 passed (2)
```

```
$ cd client && npm test

 RUN  v2.1.9 .../toktickit/client

 ✓ tests/lab-01/App.test.tsx (3 tests) 311ms
   ✓ App > renders the TokTickIT heading
   ✓ App > shows Online and the seeded categories on success
   ✓ App > shows an Offline error message when the API is unavailable

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

## Manual end-to-end check

```
$ curl http://localhost:3000/api/health
{"status":"ok","service":"TokTickIT API"}

$ curl http://localhost:3000/api/categories
[{"id":1,"name":"Account and Access"},{"id":2,"name":"Hardware"},
 {"id":3,"name":"Software"},{"id":4,"name":"Network"}]
```

<!-- TO FILL: paste your own screenshot of the two `npm test` runs on the main branch. -->
