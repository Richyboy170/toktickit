import { randomBytes, randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

let requesterA: number;
let requesterB: number;
let ticketId: number;
let categoryId: number;
let relatedSystemId: number;

beforeAll(async () => {
  const suffix = randomBytes(5).toString("hex");
  const [a, b, category, system] = await Promise.all([
    getPrisma().developmentRequester.create({ data: { name: "Detail Test A", email: `detail-a-${suffix}@example.test` } }),
    getPrisma().developmentRequester.create({ data: { name: "Detail Test B", email: `detail-b-${suffix}@example.test` } }),
    getPrisma().category.findFirstOrThrow({ where: { isActive: true } }),
    getPrisma().relatedSystem.findFirstOrThrow({ where: { isActive: true } }),
  ]);
  requesterA = a.id; requesterB = b.id; categoryId = category.id; relatedSystemId = system.id;
});

beforeEach(async () => {
  const ticket = await getPrisma().ticket.create({ data: { ticketNumber: `TKT-20260820-${randomBytes(4).toString("hex").toUpperCase()}`, requesterId: requesterA, categoryId, relatedSystemId, summary: "Owned detail ticket", description: "Ticket detail must be read only for its owner.", requestedPriority: "MEDIUM", submissionToken: randomUUID() } });
  ticketId = ticket.id;
});

afterEach(async () => getPrisma().ticket.deleteMany({ where: { requesterId: { in: [requesterA, requesterB] } } }));
afterAll(async () => {
  await getPrisma().developmentRequester.deleteMany({ where: { id: { in: [requesterA, requesterB] } } });
  await getPrisma().$disconnect();
});

describe("GET /api/tickets/:ticketId", () => {
  it("returns all read-only Ticket fields and active-first Attachment metadata", async () => {
    await getPrisma().attachment.create({ data: { ticketId, originalName: "old.pdf", mimeType: "application/pdf", sizeBytes: 9, content: Buffer.from("%PDF-1.7"), removedAt: new Date(), removalReason: "Outdated", removedByRequesterId: requesterA } });
    await getPrisma().attachment.create({ data: { ticketId, originalName: "current.pdf", mimeType: "application/pdf", sizeBytes: 9, content: Buffer.from("%PDF-1.7") } });
    const response = await request(app).get(`/api/tickets/${ticketId}`).set("X-Development-Requester-Id", String(requesterA));
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: ticketId, requester: { id: requesterA }, summary: "Owned detail ticket", currentStatus: "NEW" });
    expect(response.body.attachments).toHaveLength(2);
    expect(response.body.attachments.map((item: { available: boolean }) => item.available)).toEqual([true, false]);
    expect(response.body.attachments[0]).not.toHaveProperty("content");
  });

  it("uses the same 404 response for missing and cross-requester Tickets", async () => {
    const cross = await request(app).get(`/api/tickets/${ticketId}`).set("X-Development-Requester-Id", String(requesterB));
    const missing = await request(app).get("/api/tickets/2147483647").set("X-Development-Requester-Id", String(requesterB));
    expect(cross.status).toBe(404);
    expect(cross.body).toEqual(missing.body);
  });

  it("rejects a malformed Ticket ID", async () => {
    const response = await request(app).get("/api/tickets/not-a-number").set("X-Development-Requester-Id", String(requesterA));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_PATH");
  });
});
