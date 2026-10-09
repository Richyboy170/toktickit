import { randomBytes } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { hashSessionToken, SESSION_COOKIE, SESSION_TTL_MS } from "../../src/auth-context.js";
import { getPrisma } from "../../src/prisma.js";

let staffCookie: string;
let requesterCookie: string;
let otherRequesterCookie: string;
let ticketId: number;
let otherTicketId: number;
let actionId: number;
const actionIds: number[] = [];
const sessionHashes: string[] = [];

async function createSession(email: string): Promise<string> {
  const user = await getPrisma().user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  sessionHashes.push(tokenHash);
  await getPrisma().session.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + SESSION_TTL_MS) } });
  return `${SESSION_COOKIE}=${token}`;
}

beforeAll(async () => {
  const [ticket, otherTicket] = await Promise.all([
    getPrisma().ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-20260915-E5F6A7B8" }, select: { id: true } }),
    getPrisma().ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-20260915-C3D4E5F6" }, select: { id: true } }),
  ]);
  ticketId = ticket.id;
  otherTicketId = otherTicket.id;
  [staffCookie, requesterCookie, otherRequesterCookie] = await Promise.all([
    createSession("krit.staff@example.edu"),
    createSession("ananda.k@example.edu"),
    createSession("chayanee.r@example.edu"),
  ]);
});

afterAll(async () => {
  if (actionIds.length) await getPrisma().actionTaken.deleteMany({ where: { id: { in: actionIds } } });
  if (sessionHashes.length) await getPrisma().session.deleteMany({ where: { tokenHash: { in: sessionHashes } } });
});

describe("Lab 4 Actions Taken API", () => {
  it("creates an Action with authenticated performer and a separately validated active Staff assignee", async () => {
    const performer = await getPrisma().user.findUniqueOrThrow({ where: { email: "krit.staff@example.edu" }, select: { id: true } });
    const assignee = await getPrisma().user.findUniqueOrThrow({ where: { email: "mali.staff@example.edu" }, select: { id: true } });
    const inactiveAssignee = await getPrisma().user.findUniqueOrThrow({ where: { email: "archive.staff@example.edu" }, select: { id: true } });
    const rejectedInactive = await request(app).post(`/api/tickets/${ticketId}/actions`).set("Cookie", staffCookie).send({
      actionAt: "2026-10-04T03:15:00.000Z",
      description: "This Action must not be assigned to inactive Staff.",
      assigneeUserId: inactiveAssignee.id,
      followUpRequired: false,
    });
    expect(rejectedInactive.status).toBe(400);
    expect(rejectedInactive.body.error.code).toBe("INVALID_ASSIGNEE");

    const response = await request(app).post(`/api/tickets/${ticketId}/actions`).set("Cookie", staffCookie).send({
      actionAt: "2026-10-04T03:15:00.000Z",
      description: "  Confirmed replacement cable availability.  ",
      assigneeUserId: assignee.id,
      followUpRequired: true,
      followUpNote: "  Check delivery tomorrow.  ",
      performedByUserId: 999999,
    });
    // Performer spoofing is rejected by strict input validation.
    expect(response.status).toBe(400);
    const created = await request(app).post(`/api/tickets/${ticketId}/actions`).set("Cookie", staffCookie).send({
      actionAt: "2026-10-04T03:15:00.000Z",
      description: "Confirmed replacement cable availability.",
      assigneeUserId: assignee.id,
      followUpRequired: true,
      followUpNote: "Check delivery tomorrow.",
    });
    expect(created.status).toBe(201);
    expect(created.body.action).toMatchObject({
      ticketId,
      status: "PLANNED",
      description: "Confirmed replacement cable availability.",
      performedBy: { id: performer.id },
      assignee: { id: assignee.id },
      followUpNote: "Check delivery tomorrow.",
    });
    actionId = created.body.action.id;
    actionIds.push(actionId);

    const earlier = await request(app).post(`/api/tickets/${ticketId}/actions`).set("Cookie", staffCookie).send({
      actionAt: "2026-10-04T02:15:00.000Z",
      description: "Earlier Action for stable-order verification.",
      assigneeUserId: assignee.id,
      followUpRequired: false,
    });
    expect(earlier.status).toBe(201);
    actionIds.push(earlier.body.action.id);

    const sameTime = await request(app).post(`/api/tickets/${ticketId}/actions`).set("Cookie", staffCookie).send({
      actionAt: "2026-10-04T02:15:00.000Z",
      description: "Same-time Action for stable ID tie-break verification.",
      assigneeUserId: assignee.id,
      followUpRequired: false,
    });
    expect(sameTime.status).toBe(201);
    actionIds.push(sameTime.body.action.id);

    const history = await request(app).get(`/api/tickets/${ticketId}/actions`).set("Cookie", staffCookie);
    expect(history.status).toBe(200);
    expect(history.body.actions.map((action: { id: number }) => action.id)).toEqual([
      earlier.body.action.id,
      sameTime.body.action.id,
      created.body.action.id,
    ]);
  });

  it("limits Requester reads to owned Tickets and denies Action writes", async () => {
    const owned = await request(app).get(`/api/tickets/${ticketId}/actions`).set("Cookie", requesterCookie);
    expect(owned.status).toBe(200);
    expect(owned.body.actions.some((action: { id: number }) => action.id === actionId)).toBe(true);
    const visibleToOtherOwner = await request(app).get(`/api/tickets/${otherTicketId}/actions`).set("Cookie", otherRequesterCookie);
    expect(visibleToOtherOwner.status).toBe(200);
    const hidden = await request(app).get(`/api/tickets/${otherTicketId}/actions`).set("Cookie", requesterCookie);
    expect(hidden.status).toBe(404);
    const denied = await request(app).post(`/api/tickets/${ticketId}/actions`).set("Cookie", requesterCookie).send({});
    expect(denied.status).toBe(403);
  });

  it("enforces version checks, allowed transitions, and immutable terminal records", async () => {
    const action = await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: actionId }, select: { updatedAt: true } });
    const started = await request(app).patch(`/api/tickets/${ticketId}/actions/${actionId}`).set("Cookie", staffCookie).send({ expectedUpdatedAt: action.updatedAt.toISOString(), status: "IN_PROGRESS" });
    expect(started.status).toBe(200);
    const stale = await request(app).patch(`/api/tickets/${ticketId}/actions/${actionId}`).set("Cookie", staffCookie).send({ expectedUpdatedAt: action.updatedAt.toISOString(), description: "stale overwrite" });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("STALE_ACTION");
    const current = await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: actionId }, select: { updatedAt: true } });
    const completed = await request(app).patch(`/api/tickets/${ticketId}/actions/${actionId}`).set("Cookie", staffCookie).send({ expectedUpdatedAt: current.updatedAt.toISOString(), status: "COMPLETED", result: "Cable replacement verified." });
    expect(completed.status).toBe(200);
    const terminal = await request(app).patch(`/api/tickets/${ticketId}/actions/${actionId}`).set("Cookie", staffCookie).send({ expectedUpdatedAt: completed.body.action.updatedAt, description: "edit terminal" });
    expect(terminal.status).toBe(409);
    expect(terminal.body.error.code).toBe("ACTION_TERMINAL");
  });
});
