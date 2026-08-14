# Lab 1 — AI Use and Reflection

**LLM/agent used:** Claude Opus 5 via Claude Code (CLI), running in plan mode first,
then execution mode.

## Selected key prompts

| # | Prompt | What I did with the result |
|---|--------|----------------------------|
| 1 | "Read this first assignment and do it for me. Keep things as simple and structural as possible since I might have to explain it later on — make me able to see and know what this or that function does." | The agent read `Lab1_Labsheet.pdf` and all 27 scaffold files, then produced a written plan organised around the four graded Answer Parts rather than around the code. I approved it before any file was changed. |
| 2 | (Answering the agent's clarifying questions) "Put the repo inside the course folder; install PostgreSQL 17 with winget; do everything on GitHub except the peer review." | Fixed the three decisions the agent said it could not make for me. I kept the repo inside the course folder even though the agent recommended otherwise, and it added the folder to the outer repo's `.gitignore` to stop a nested-repo problem. |
| 3 | "Set up the project foundation on `feature/1-project-foundation`." | Installed both packages, verified the Express server boots and the Vite test suite runs, wrote the README setup instructions, opened PR #5. |
| 4 | "Implement `GET /api/health` returning `{status:"ok", service:"TokTickIT API"}` and show Online/Offline in React." | Produced the route plus the client `checkSystem()` call. I kept its suggestion that `/api/health` must **not** query the database, so an API outage and a DB outage look different to the frontend. |
| 5 | "Add the Prisma `Category` model and a seed that is safe to run twice." | Used `upsert` against the `@unique` name column. This is the part I made sure I could explain: `@unique` is what makes `upsert` idempotent. |
| 6 | "PostgreSQL install failed with a 403 — find another way." | The winget download from EnterpriseDB returned HTTP 403. The agent tested the same URL with a browser user-agent, got 200, and switched to the official PostgreSQL 17 binaries zip, which needs no administrator rights. |
| 7 | "Add `GET /api/categories` reading from PostgreSQL through Prisma, in id order." | Route plus the Supertest test (API-02) and the Vitest success test (UI-02). |
| 8 | "Explain every file so I can defend it in the lab session." | Produced the "How it works" section of the README — one line per file, plus the reasoning behind splitting `app.ts` from `index.ts` and making the Prisma client lazy. |

## A correction worth recording

While trying to screenshot the running app, the agent could not load
`http://localhost:5173` and concluded that the Vite dev server was binding to IPv6 only.
It changed `vite.config.ts` to bind IPv4 explicitly — and the page still did not load.
Testing the API port, which listens on every interface and answers `curl` correctly,
produced the same failure, which showed the problem was the browser tooling and not the
server at all. The binding was left in place because it is harmless and the app runs
correctly with it, but the reason written in the comment above it is not the real
explanation. This was the clearest lesson of the lab for me: a confident, plausible
diagnosis from the agent is still only a guess until something is actually tested.

## Reflection

<!-- TO FILL — write 2–3 sentences in your own words. Points worth making:
     - which prompt needed a follow-up and why
     - one thing the agent proposed that you rejected or changed
     - what made your later prompts better than your first one -->
- The first prompt because we have to specify what we really want and by using plan mode, we need to follow up the work and approve to make sure that the LLM use our tokens in the correct direction that we want it to work on.
- The agent proposed me that it wants to make a folder dev outside of the course folder that I created and I rejected it and changed it to make the dev folder inside the course folder so it will be /course/dev/toktickit instead of /dev.
- Experiece of how AI agents work will help me to know what is understandable and not to the AI agent and able to improve how I interact with the AI agent to get better output.