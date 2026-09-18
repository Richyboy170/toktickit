import { randomBytes } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { hashSessionToken, SESSION_COOKIE, SESSION_TTL_MS } from "../../src/auth-context.js";
import { getPrisma } from "../../src/prisma.js";

let administratorSession: string;
let ticketId: number;

beforeAll(async () => {
  const [administrator, ticket] = await Promise.all([
    getPrisma().user.findUniqueOrThrow({ where: { email: "admin@example.edu" }, select: { id: true } }),
    getPrisma().ticket.findFirstOrThrow({ orderBy: [{ id: "asc" }] }),
  ]);
  administratorSession = randomBytes(32).toString("base64url");
  ticketId = ticket.id;
  await getPrisma().session.create({
    data: {
      userId: administrator.id,
      tokenHash: hashSessionToken(administratorSession),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
});

afterAll(async () => {
  if (administratorSession) {
    await getPrisma().session.deleteMany({ where: { tokenHash: hashSessionToken(administratorSession) } });
  }
});

describe("Lab 3 IT Staff Ticket Detail boundary", () => {
  it("rejects an unauthenticated detail request", async () => {
    const response = await request(app).get("/api/staff/tickets/1");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("allows an Administrator to read detail while keeping Staff mutations restricted", async () => {
    const cookie = `${SESSION_COOKIE}=${administratorSession}`;
    const detail = await request(app).get(`/api/staff/tickets/${ticketId}`).set("Cookie", cookie);
    expect(detail.status).toBe(200);
    expect(detail.body.ticket).toEqual(expect.objectContaining({ id: ticketId }));
    expect(detail.body.ticket.internalNotes).toEqual(expect.any(Array));
    expect(detail.body.ticket.comments).toEqual(expect.any(Array));

    const assignment = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/assignment`)
      .set("Cookie", cookie)
      .send({ ownerId: null });
    const status = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Cookie", cookie)
      .send({ status: "OPEN" });
    const comment = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Cookie", cookie)
      .send({ body: "Administrator comment must be rejected." });
    const note = await request(app)
      .post(`/api/staff/tickets/${ticketId}/notes`)
      .set("Cookie", cookie)
      .send({ body: "Administrator note must be rejected." });

    for (const mutation of [assignment, status, comment, note]) {
      expect(mutation.status).toBe(403);
      expect(mutation.body.error.code).toBe("FORBIDDEN");
    }
  });
});
