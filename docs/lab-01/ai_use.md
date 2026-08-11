# Lab 1 — AI Use and Reflection

**LLM/agent used:** Claude Opus 5, driven through Claude Code (CLI). It ran in plan
mode first — producing a written plan I approved before any file was created — then in
execution mode.

**How to read this table.** Rows marked **[mine]** are prompts I typed. Rows marked
**[agent step]** are the steps the agent proposed and I approved as it worked; I am
listing them because they are what actually shaped the code, and because the difference
between "what I asked for" and "what it decided to do" is the interesting part.

| # | Prompt | What I did with the result |
|---|--------|----------------------------|
| 1 | **[mine]** "Read this first assignment and do it for me. Keep things as simple and structural as possible since I might have to explain it later on — make me able to see and know what this or that function could do." | It read the labsheet and all 27 scaffold files, then wrote a plan organised around the four graded Answer Parts instead of around the code. I read and approved the plan before it changed anything. |
| 2 | **[mine]** (answering its three clarifying questions) "Put the repo inside the course folder; install PostgreSQL 17 with winget; do everything on GitHub except the peer review." | I overruled its recommendation to keep the repo outside OneDrive. It accepted that and added the folder to the outer repository's `.gitignore` so the two repos would not collide. |
| 3 | **[agent step]** Set up the foundation on `feature/1-project-foundation`: install both packages, verify the server boots and the test suite runs, write the README. | PR #5. The point of this step was evidence, not code — it proved each acceptance criterion by running it. |
| 4 | **[agent step]** Implement `GET /api/health` returning `{status:"ok", service:"TokTickIT API"}`, and show Online/Offline in React. | PR #6. I kept its argument that `/api/health` must **not** query the database, so that an API outage and a database outage look different to the frontend. |
| 5 | **[agent step]** Add the Prisma `Category` model and a seed that is safe to run twice. | PR #7. It used `upsert` against the `@unique` name column. This is the part I checked hardest: `@unique` is what makes `upsert` idempotent — without the constraint, `upsert` would not help. |
| 6 | **[mine]** "PostgreSQL install failed with a 403 — find another way." | The winget download from EnterpriseDB returned HTTP 403. It tested the same URL with a browser user-agent, got 200, and switched to the official PostgreSQL 17 binaries zip, which needs no administrator rights. |
| 7 | **[agent step]** Add `GET /api/categories` reading through Prisma in id order, plus API-02 and UI-02. | PR #8. `orderBy: { id: "asc" }` is not decoration — without it PostgreSQL may return rows in any order and API-02 would be flaky. |
| 8 | **[agent step]** Explain every file so I can defend it in the lab session. | Became the "How it works" section of the README — one line per file, plus why `app.ts` is separate from `index.ts` and why the Prisma client is created lazily. |

## A correction worth recording

While trying to screenshot the running app, the agent could not load
`http://localhost:5173` and concluded that the Vite dev server was binding to IPv6 only.
It changed `vite.config.ts` to bind IPv4 — and the page still did not load. Testing the
API port, which listens on every interface and answers `curl` correctly, produced the
same failure, which showed the problem was the browser tooling, not the server. The
`vite.config.ts` change was reverted, because the reason given for it was wrong.

## Reflection

<!-- TO FILL — 2 or 3 sentences in your own words. Things you could say:
     - the first prompt was vague ("do it for me") and the useful part was the
       clarifying questions it asked back
     - one thing it proposed that you rejected or changed
     - the vite.config episode above: a confident-sounding explanation that was wrong -->
