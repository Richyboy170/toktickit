import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { ticketsRouter } from "./routes/tickets.js";
import { attachmentsRouter } from "./routes/attachments.js";
// getPrisma() is the lazy database handle. It is called INSIDE the route that
// needs the DB, so importing this file never opens a connection by itself.

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());
app.use("/api/tickets", ticketsRouter);
app.use("/api/attachments", attachmentsRouter);

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  // Deliberately does NOT touch the database: this endpoint answers the question
  // "is the API process alive?", so it must still reply if PostgreSQL is down.
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Category list — the four supported request categories, read from PostgreSQL.
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      where: { isActive: true },
      select: { id: true, name: true }, // never leak createdAt to the client
      orderBy: { id: "asc" },           // predictable order, so tests can assert it
    });
    res.status(200).json(categories);
  } catch (error) {
    // Log the real reason for the developer, return a safe message to the browser.
    console.error("GET /api/categories failed:", error);
    res.status(500).json({ error: "Unable to load categories" });
  }
});

app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    res.status(200).json(systems);
  } catch (error) {
    console.error("GET /api/related-systems failed:", error);
    res.status(500).json({
      error: { code: "REFERENCE_DATA_UNAVAILABLE", message: "Unable to load related systems." },
    });
  }
});

app.get("/api/development-requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().developmentRequester.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    res.status(200).json(requesters);
  } catch (error) {
    console.error("GET /api/development-requesters failed:", error);
    res.status(500).json({
      error: { code: "REQUESTERS_UNAVAILABLE", message: "Unable to load Development Requesters." },
    });
  }
});

export default app;
