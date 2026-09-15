import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { legacyRequesterContextEnabled, requireAuthenticatedUser } from "./auth-context.js";
import { sendError } from "./http.js";
import { ticketsRouter } from "./routes/tickets.js";
import { attachmentsRouter } from "./routes/attachments.js";
import { authRouter } from "./routes/auth.js";
import { staffRouter } from "./routes/staff.js";
import { messagesRouter } from "./routes/messages.js";
import { adminRouter } from "./routes/admin.js";
// getPrisma() is the lazy database handle. It is called INSIDE the route that
// needs the DB, so importing this file never opens a connection by itself.

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

const configuredOrigins = (process.env.CLIENT_ORIGINS ?? process.env.CLIENT_ORIGIN ?? "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

app.use(cors({
  credentials: true,
  origin: (origin, callback) => callback(null, !origin || configuredOrigins.includes(origin)),
}));
app.use(express.json());
// express.json forwards malformed bodies to the next error handler. Convert
// parser details into the same safe JSON error shape used by the API routes.
app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  const parserError = error as { type?: unknown; status?: unknown; message?: unknown };
  const malformedJson = parserError?.type === "entity.parse.failed"
    || (error instanceof SyntaxError && parserError?.status === 400);
  if (malformedJson) {
    return sendError(res, 400, "INVALID_JSON", "Request body must contain valid JSON.");
  }
  return next(error);
});
app.use((req, res, next) => {
  const origin = req.header("Origin");
  if (origin && stateChangingMethods.has(req.method) && !configuredOrigins.includes(origin)) {
    return res.status(403).json({ error: { code: "CSRF_ORIGIN_REJECTED", message: "Request origin is not allowed." } });
  }
  return next();
});
app.use("/api/auth", authRouter);
// Short aliases keep the REST surface friendly for the browser client and
// older integration fixtures.
app.use("/api", authRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/attachments", attachmentsRouter);
app.use("/api/tickets", messagesRouter);
app.use("/api/staff/tickets", messagesRouter);
app.use("/api/staff", staffRouter);
app.use("/api/it", staffRouter);
app.use("/api/admin", adminRouter);
app.use("/api/administrator", adminRouter);

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
app.get("/api/categories", async (req: Request, res: Response) => {
  // Lab 2's unauthenticated reference-data fixtures remain available only in
  // the explicitly enabled compatibility/test process. Normal deployments
  // require a full authenticated session for reference data.
  if (!legacyRequesterContextEnabled() && !(await requireAuthenticatedUser(req, res))) return;
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
    res.status(500).json({
      error: { code: "REFERENCE_DATA_UNAVAILABLE", message: "Unable to load categories." },
    });
  }
});

app.get("/api/related-systems", async (req: Request, res: Response) => {
  if (!legacyRequesterContextEnabled() && !(await requireAuthenticatedUser(req, res))) return;
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
  if (!legacyRequesterContextEnabled()) {
    return sendError(res, 404, "LEGACY_ROUTE_UNAVAILABLE", "This compatibility route is unavailable.");
  }
  try {
    const requesters = await getPrisma().user.findMany({
      where: { isActive: true, role: "REQUESTER" },
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

// Keep unexpected failures in the API's safe error envelope. Route handlers
// own their expected database/validation failures; this is the final guard for
// parser, middleware, and unforeseen errors that reach Express.
app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(error);
  console.error("Unhandled API error:", error);
  return sendError(res, 500, "INTERNAL_ERROR", "An unexpected server error occurred.");
});

export default app;
