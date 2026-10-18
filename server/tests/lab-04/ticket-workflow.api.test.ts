import { randomBytes, randomUUID } from "node:crypto";
import { TicketStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { hashSessionToken, SESSION_COOKIE, SESSION_TTL_MS } from "../../src/auth-context.js";
import { getPrisma } from "../../src/prisma.js";

const allowedNext: Record<TicketStatus, readonly TicketStatus[]> = {
  NEW: [TicketStatus.OPEN, TicketStatus.CANCELLED],
  OPEN: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CANCELLED],
  IN_PROGRESS: [TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  WAITING_FOR_REQUESTER: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  RESOLVED: [TicketStatus.CLOSED, TicketStatus.REOPENED],
  CLOSED: [TicketStatus.REOPENED],
  REOPENED: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CANCELLED],
  CANCELLED: [],
};
const confirmingStatuses: readonly TicketStatus[] = [
  TicketStatus.CANCELLED,
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED,
  TicketStatus.REOPENED,
];

let staffId: number;
let secondStaffId: number;
let inactiveStaffId: number;
let requesterId: number;
let categoryId: number;
let relatedSystemId: number;
let staffCookie: string;
let requesterCookie: string;
let adminCookie: string;
const ticketIds: number[] = [];
const sessionHashes: string[] = [];

async function createSession(email: string): Promise<string> {
  const user = await getPrisma().user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  sessionHashes.push(tokenHash);
  await getPrisma().session.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + SESSION_TTL_MS) } });
  return `${SESSION_COOKIE}=${token}`;
}

async function createTicket(currentStatus: TicketStatus, ownerId: number | null = staffId) {
  const ticket = await getPrisma().ticket.create({
    data: {
      ticketNumber: `TKT-${randomBytes(5).toString("hex").toUpperCase()}`,
      requesterId,
      categoryId,
      relatedSystemId,
      ownerId,
      summary: "Ticket workflow matrix case",
      description: "An isolated Ticket for API workflow coverage.",
      requestedPriority: "MEDIUM",
      currentStatus,
      submissionToken: randomUUID(),
    },
    select: { id: true, updatedAt: true },
  });
  ticketIds.push(ticket.id);
  return ticket;
}

async function createAction(ticketId: number, status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") {
  return getPrisma().actionTaken.create({
    data: {
      ticketId,
      actionAt: new Date(),
      description: `Resolution gate ${status} Action`,
      result: status === "COMPLETED" ? "Work completed." : null,
      performedByUserId: staffId,
      assigneeUserId: secondStaffId,
      status,
    },
  });
}

async function changeStatus(ticketId: number, expectedUpdatedAt: Date, status: TicketStatus, extra: Record<string, unknown> = {}) {
  return request(app)
    .patch(`/api/staff/tickets/${ticketId}/status`)
    .set("Cookie", staffCookie)
    .send({
      status,
      expectedUpdatedAt: expectedUpdatedAt.toISOString(),
      ...(status === TicketStatus.CANCELLED ? { cancellationReason: "Duplicate request" } : {}),
      ...(confirmingStatuses.includes(status) ? { confirm: true } : {}),
      ...extra,
    });
}

beforeAll(async () => {
  const prisma = getPrisma();
  const [staff, secondStaff, inactiveStaff, requesterUser, category, relatedSystem] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: "krit.staff@example.edu" }, select: { id: true } }),
    prisma.user.findUniqueOrThrow({ where: { email: "mali.staff@example.edu" }, select: { id: true } }),
    prisma.user.findUniqueOrThrow({ where: { email: "archive.staff@example.edu" }, select: { id: true } }),
    prisma.user.findUniqueOrThrow({ where: { email: "ananda.k@example.edu" }, select: { id: true } }),
    prisma.category.findFirstOrThrow({ where: { isActive: true }, select: { id: true } }),
    prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true }, select: { id: true } }),
  ]);
  staffId = staff.id;
  secondStaffId = secondStaff.id;
  inactiveStaffId = inactiveStaff.id;
  requesterId = requesterUser.id;
  categoryId = category.id;
  relatedSystemId = relatedSystem.id;
  [staffCookie, requesterCookie, adminCookie] = await Promise.all([
    createSession("krit.staff@example.edu"),
    createSession("ananda.k@example.edu"),
    createSession("admin@example.edu"),
  ]);
});

afterAll(async () => {
  if (ticketIds.length) await getPrisma().ticket.deleteMany({ where: { id: { in: ticketIds } } });
  if (sessionHashes.length) await getPrisma().session.deleteMany({ where: { tokenHash: { in: sessionHashes } } });
});

describe("Lab 4 Ticket workflow API", () => {
  for (const from of Object.values(TicketStatus)) {
    for (const to of Object.values(TicketStatus)) {
      it(`enforces the ${from} -> ${to} transition`, async () => {
        const ticket = await createTicket(from);
        const allowed = allowedNext[from].includes(to);
        if (allowed && to === TicketStatus.RESOLVED) await createAction(ticket.id, "COMPLETED");

        const response = await changeStatus(ticket.id, ticket.updatedAt, to);
        const saved = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { currentStatus: true } });

        if (from === to) {
          expect(response.status).toBe(409);
          expect(response.body.error.code).toBe("STATUS_UNCHANGED");
          expect(saved.currentStatus).toBe(from);
        } else if (allowed) {
          expect(response.status).toBe(200);
          expect(response.body.ticket.currentStatus).toBe(to);
          expect(saved.currentStatus).toBe(to);
        } else {
          expect(response.status).toBe(409);
          expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
          expect(saved.currentStatus).toBe(from);
        }
      });
    }
  }

  it.each([
    ["Requester", () => requesterCookie],
    ["Administrator", () => adminCookie],
  ] as const)("denies formal status changes by %s", async (_role, getCookie) => {
    const ticket = await createTicket(TicketStatus.NEW);
    const response = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("Cookie", getCookie())
      .send({ status: TicketStatus.OPEN, expectedUpdatedAt: ticket.updatedAt.toISOString() });
    const saved = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { currentStatus: true } });
    expect(response.status).toBe(403);
    expect(saved.currentStatus).toBe(TicketStatus.NEW);
  });

  it("requires explicit confirmation and a reason before cancellation", async () => {
    const ticket = await createTicket(TicketStatus.NEW);
    const unconfirmed = await changeStatus(ticket.id, ticket.updatedAt, TicketStatus.CANCELLED, { confirm: false, cancellationReason: undefined });
    expect(unconfirmed.status).toBe(400);
    expect(unconfirmed.body.error.code).toBe("VALIDATION_ERROR");

    const missingReason = await changeStatus(ticket.id, ticket.updatedAt, TicketStatus.CANCELLED, { cancellationReason: "" });
    expect(missingReason.status).toBe(400);
    expect(missingReason.body.error.code).toBe("VALIDATION_ERROR");
    const saved = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { currentStatus: true } });
    expect(saved.currentStatus).toBe(TicketStatus.NEW);
  });

  it("rejects a stale update without overwriting a newer Ticket state", async () => {
    const ticket = await createTicket(TicketStatus.NEW);
    const staleTimestamp = ticket.updatedAt;
    await getPrisma().ticket.update({ where: { id: ticket.id }, data: { currentStatus: TicketStatus.OPEN, updatedAt: new Date(Date.now() + 60_000) } });

    const response = await changeStatus(ticket.id, staleTimestamp, TicketStatus.IN_PROGRESS);
    const saved = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { currentStatus: true } });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("STALE_TICKET");
    expect(saved.currentStatus).toBe(TicketStatus.OPEN);
  });

  it("requires an active owner before resolving", async () => {
    for (const ownerId of [null, inactiveStaffId]) {
      const ticket = await createTicket(TicketStatus.IN_PROGRESS, ownerId);
      const response = await changeStatus(ticket.id, ticket.updatedAt, TicketStatus.RESOLVED);
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("OWNER_REQUIRED");
    }
  });

  it.each([
    ["no completed Actions", ["PLANNED"]],
    ["an incomplete Action alongside completed work", ["COMPLETED", "IN_PROGRESS"]],
    ["Requester resolution feedback without completed work", []],
  ] as const)("blocks resolution with %s", async (_case, statuses) => {
    const ticket = await createTicket(TicketStatus.IN_PROGRESS);
    for (const status of statuses) await createAction(ticket.id, status);
    if (_case.startsWith("Requester")) {
      const indication = await request(app)
        .post(`/api/tickets/${ticket.id}/problem-appears-resolved`)
        .set("Cookie", requesterCookie)
        .send({ appearsResolved: true });
      expect(indication.status).toBe(200);
    }

    const current = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { updatedAt: true } });
    const response = await changeStatus(ticket.id, current.updatedAt, TicketStatus.RESOLVED);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("RESOLUTION_REQUIREMENTS_NOT_MET");
    const saved = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { currentStatus: true } });
    expect(saved.currentStatus).toBe(TicketStatus.IN_PROGRESS);
  });

  it("resolves when completed work remains and other Actions are cancelled", async () => {
    const ticket = await createTicket(TicketStatus.IN_PROGRESS);
    await createAction(ticket.id, "COMPLETED");
    await createAction(ticket.id, "CANCELLED");

    const response = await changeStatus(ticket.id, ticket.updatedAt, TicketStatus.RESOLVED);
    expect(response.status).toBe(200);
    expect(response.body.ticket.currentStatus).toBe(TicketStatus.RESOLVED);
  });
});
