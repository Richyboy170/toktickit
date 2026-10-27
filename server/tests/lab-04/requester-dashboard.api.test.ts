import { randomBytes, randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TicketStatus } from "@prisma/client";
import { app } from "../../src/app.js";
import { hashSessionToken, SESSION_COOKIE, SESSION_TTL_MS } from "../../src/auth-context.js";
import { getPrisma } from "../../src/prisma.js";

const OPEN_STATUSES = [TicketStatus.NEW, TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.REOPENED];
let requesterCookie: string;
let otherRequesterCookie: string;
let requesterId: number;
let emptyRequesterCookie: string;
let emptyRequesterEmail: string;
const sessionHashes: string[] = [];

async function createSession(email: string): Promise<{ cookie: string; userId: number }> {
  const user = await getPrisma().user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  sessionHashes.push(tokenHash);
  await getPrisma().session.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + SESSION_TTL_MS) } });
  return { cookie: `${SESSION_COOKIE}=${token}`, userId: user.id };
}

beforeAll(async () => {
  emptyRequesterEmail = `lab4-empty-dashboard-${randomUUID()}@example.edu`;
  await getPrisma().user.create({ data: { name: "Empty Dashboard Requester", email: emptyRequesterEmail, role: "REQUESTER", isActive: true } });
  const [requester, other] = await Promise.all([
    createSession("ananda.k@example.edu"),
    createSession("chayanee.r@example.edu"),
  ]);
  requesterCookie = requester.cookie;
  requesterId = requester.userId;
  otherRequesterCookie = other.cookie;
  emptyRequesterCookie = await createSession(emptyRequesterEmail).then(({ cookie }) => cookie);
});
afterAll(async () => {
  if (sessionHashes.length) await getPrisma().session.deleteMany({ where: { tokenHash: { in: sessionHashes } } });
  if (emptyRequesterEmail) await getPrisma().user.deleteMany({ where: { email: emptyRequesterEmail } });
});

describe("Lab 4 Requester dashboard API", () => {
  it("returns authenticated-owner metrics, bounded recent lists, and matching drill-down filters", async () => {
    const [response, directOpen, directWaiting] = await Promise.all([
      request(app).get("/api/requester/dashboard").set("Cookie", requesterCookie),
      getPrisma().ticket.count({ where: { requesterId, currentStatus: { in: OPEN_STATUSES } } }),
      getPrisma().ticket.count({ where: { requesterId, currentStatus: "WAITING_FOR_REQUESTER" } }),
    ]);
    expect(response.status).toBe(200);
    expect(response.body.metrics).toEqual({ openTickets: directOpen, waitingForMe: directWaiting });
    expect(response.body.recentlyUpdated.length).toBeLessThanOrEqual(5);
    expect(response.body.recentlyResolved.length).toBeLessThanOrEqual(5);
    const ids = [...response.body.recentlyUpdated, ...response.body.recentlyResolved].map((ticket: { id: number }) => ticket.id);
    const ownedCount = await getPrisma().ticket.count({ where: { id: { in: ids }, requesterId } });
    expect(ownedCount).toBe(new Set(ids).size);
    const openList = await request(app).get("/api/tickets?statusGroup=open").set("Cookie", requesterCookie);
    expect(openList.body.pagination.totalItems).toBe(directOpen);
    const contradictory = await request(app).get("/api/tickets?status=OPEN&statusGroup=open").set("Cookie", requesterCookie);
    expect(contradictory.status).toBe(400);
  });

  it("does not permit a Requester to select another account's dashboard identity", async () => {
    const response = await request(app).get(`/api/requester/dashboard?requesterId=${requesterId}`).set("Cookie", otherRequesterCookie);
    const other = await getPrisma().user.findUniqueOrThrow({ where: { email: "chayanee.r@example.edu" }, select: { id: true } });
    const expected = await getPrisma().ticket.count({ where: { requesterId: other.id, currentStatus: { in: OPEN_STATUSES } } });
    expect(response.status).toBe(200);
    expect(response.body.metrics.openTickets).toBe(expected);
  });

  it("returns zero metrics and empty lists for an account with no Tickets", async () => {
    const response = await request(app).get("/api/requester/dashboard").set("Cookie", emptyRequesterCookie);
    expect(response.status).toBe(200);
    expect(response.body.metrics).toEqual({ openTickets: 0, waitingForMe: 0 });
    expect(response.body.recentlyUpdated).toEqual([]);
    expect(response.body.recentlyResolved).toEqual([]);
  });
});
