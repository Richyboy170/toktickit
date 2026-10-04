import { randomBytes } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TicketStatus } from "@prisma/client";
import { app } from "../../src/app.js";
import { hashSessionToken, SESSION_COOKIE, SESSION_TTL_MS } from "../../src/auth-context.js";
import { getPrisma } from "../../src/prisma.js";

const OPEN_STATUSES = [TicketStatus.NEW, TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.REOPENED];
let requesterCookie: string;
let otherRequesterCookie: string;
let staffCookie: string;
let requesterId: number;
let staffId: number;
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
  const [requester, other, staff] = await Promise.all([
    createSession("ananda.k@example.edu"),
    createSession("chayanee.r@example.edu"),
    createSession("krit.staff@example.edu"),
  ]);
  requesterCookie = requester.cookie;
  requesterId = requester.userId;
  otherRequesterCookie = other.cookie;
  staffCookie = staff.cookie;
  staffId = staff.userId;
});
afterAll(async () => { if (sessionHashes.length) await getPrisma().session.deleteMany({ where: { tokenHash: { in: sessionHashes } } }); });

describe("Lab 4 dashboard APIs and drill-down filters", () => {
  it("returns requester-only metrics and bounded, owned recent lists", async () => {
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

  it("returns all eight Staff status counts and aligns cards with queue filters", async () => {
    const response = await request(app).get("/api/staff/dashboard").set("Cookie", staffCookie);
    expect(response.status).toBe(200);
    expect(Object.keys(response.body.ticketsByStatus)).toHaveLength(8);
    for (const status of Object.values(TicketStatus)) expect(response.body.ticketsByStatus[status]).toBeGreaterThanOrEqual(0);
    expect(response.body.urgentTickets.length).toBeLessThanOrEqual(5);
    expect(response.body.myActiveActions.length).toBeLessThanOrEqual(5);
    const unassigned = await request(app).get("/api/staff/tickets?assignment=unassigned&statusGroup=open").set("Cookie", staffCookie);
    const myOpen = await request(app).get(`/api/staff/tickets?ownerId=${staffId}&statusGroup=open`).set("Cookie", staffCookie);
    const highUrgent = await request(app).get("/api/staff/tickets?priorityGroup=high-or-urgent&statusGroup=open").set("Cookie", staffCookie);
    expect(unassigned.body.pagination.totalItems).toBe(response.body.metrics.unassignedOpenTickets);
    expect(myOpen.body.pagination.totalItems).toBe(response.body.metrics.myOpenTickets);
    expect(highUrgent.body.pagination.totalItems).toBe(response.body.metrics.highUrgentOpenTickets);
    const contradictory = await request(app).get("/api/staff/tickets?status=OPEN&statusGroup=open").set("Cookie", staffCookie);
    expect(contradictory.status).toBe(400);
  });

  it("rejects role crossover and prevents one Requester from selecting another identity", async () => {
    expect((await request(app).get("/api/staff/dashboard").set("Cookie", requesterCookie)).status).toBe(403);
    expect((await request(app).get("/api/requester/dashboard").set("Cookie", staffCookie)).status).toBe(403);
    const [response, expected] = await Promise.all([
      request(app).get(`/api/requester/dashboard?requesterId=${requesterId}`).set("Cookie", otherRequesterCookie),
      getPrisma().ticket.count({ where: { requesterId: Number((await getPrisma().user.findUniqueOrThrow({ where: { email: "chayanee.r@example.edu" }, select: { id: true } })).id), currentStatus: { in: OPEN_STATUSES } } }),
    ]);
    expect(response.body.metrics.openTickets).toBe(expected);
  });
});
