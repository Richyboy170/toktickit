import { RequestedPriority } from "@prisma/client";
import { randomBytes, randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

let requesterA: number;
let requesterB: number;
let categoryId: number;
let systemId: number;

beforeAll(async () => {
  const suffix = randomBytes(5).toString("hex");
  const [a, b, category, system] = await Promise.all([
    getPrisma().developmentRequester.create({ data: { name: "List Test Requester A", email: `list-a-${suffix}@example.test` } }),
    getPrisma().developmentRequester.create({ data: { name: "List Test Requester B", email: `list-b-${suffix}@example.test` } }),
    getPrisma().category.findFirstOrThrow({ where: { name: "Hardware" } }),
    getPrisma().relatedSystem.findFirstOrThrow({ where: { name: "Corporate Laptop" } }),
  ]);
  requesterA = a.id;
  requesterB = b.id;
  categoryId = category.id;
  systemId = system.id;
});

beforeEach(async () => {
  await getPrisma().ticket.createMany({
    data: [
      { ticketNumber: `TKT-20260820-${randomBytes(4).toString("hex").toUpperCase()}`, requesterId: requesterA, categoryId, relatedSystemId: systemId, summary: "Laptop battery drains", description: "Battery lasts less than one hour.", requestedPriority: RequestedPriority.HIGH, submissionToken: randomUUID() },
      { ticketNumber: `TKT-20260820-${randomBytes(4).toString("hex").toUpperCase()}`, requesterId: requesterA, categoryId, relatedSystemId: systemId, summary: "Printer queue blocked", description: "Print jobs remain queued indefinitely.", requestedPriority: RequestedPriority.LOW, submissionToken: randomUUID() },
      { ticketNumber: `TKT-20260820-${randomBytes(4).toString("hex").toUpperCase()}`, requesterId: requesterB, categoryId, relatedSystemId: systemId, summary: "Other requester ticket", description: "This data must not appear for Requester A.", requestedPriority: RequestedPriority.URGENT, submissionToken: randomUUID() },
    ],
  });
});

afterEach(async () => getPrisma().ticket.deleteMany({ where: { requesterId: { in: [requesterA, requesterB] } } }));
afterAll(async () => {
  await getPrisma().ticket.deleteMany({ where: { requesterId: { in: [requesterA, requesterB] } } });
  await getPrisma().developmentRequester.deleteMany({ where: { id: { in: [requesterA, requesterB] } } });
  await getPrisma().$disconnect();
});

describe("GET /api/tickets", () => {
  it("returns only the selected Requester's Tickets with metadata", async () => {
    const response = await request(app).get("/api/tickets").set("X-Development-Requester-Id", String(requesterA));
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items.map((item: { summary: string }) => item.summary)).not.toContain("Other requester ticket");
    expect(response.body.pagination).toEqual({ page: 1, pageSize: 10, totalItems: 2, totalPages: 1 });
  });

  it("searches, filters, sorts, and paginates owned Tickets", async () => {
    const search = await request(app).get("/api/tickets?search=battery&requestedPriority=HIGH&sort=summary&order=asc&page=1&pageSize=5").set("X-Development-Requester-Id", String(requesterA));
    expect(search.status).toBe(200);
    expect(search.body.items.map((item: { summary: string }) => item.summary)).toEqual(["Laptop battery drains"]);
    expect(search.body.query).toEqual({ search: "battery", sort: "summary", order: "asc" });

    const beyond = await request(app).get("/api/tickets?page=5&pageSize=5").set("X-Development-Requester-Id", String(requesterA));
    expect(beyond.body.items).toEqual([]);
    expect(beyond.body.pagination).toEqual({ page: 5, pageSize: 5, totalItems: 2, totalPages: 1 });
  });

  it("returns safe field errors for invalid query parameters", async () => {
    const response = await request(app).get("/api/tickets?page=0&pageSize=7&sort=unknown").set("X-Development-Requester-Id", String(requesterA));
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: "INVALID_QUERY", fields: { page: expect.any(String), pageSize: expect.any(String), sort: expect.any(String) } });
  });

  it("returns a true empty result for a Requester with no Tickets", async () => {
    await getPrisma().ticket.deleteMany({ where: { requesterId: requesterB } });
    const response = await request(app).get("/api/tickets").set("X-Development-Requester-Id", String(requesterB));
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ items: [], pagination: { totalItems: 0, totalPages: 0 } });
  });
});
