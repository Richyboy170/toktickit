import { randomBytes, randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

let requesterId: number;
let inactiveRequesterId: number;
let categoryId: number;
let relatedSystemId: number;

const validBody = () => ({
  categoryId,
  relatedSystemId,
  summary: "Laptop battery drains quickly",
  requestedPriority: "MEDIUM",
  description: "The battery falls from full to empty in under one hour.",
  submissionToken: randomUUID(),
});

beforeAll(async () => {
  const suffix = randomBytes(5).toString("hex");
  const [requester, inactive, category, system] = await Promise.all([
    getPrisma().developmentRequester.create({ data: { name: "Create Test Requester", email: `create-${suffix}@example.test` } }),
    getPrisma().developmentRequester.findFirstOrThrow({ where: { isActive: false } }),
    getPrisma().category.findFirstOrThrow({ where: { isActive: true } }),
    getPrisma().relatedSystem.findFirstOrThrow({ where: { isActive: true } }),
  ]);
  requesterId = requester.id;
  inactiveRequesterId = inactive.id;
  categoryId = category.id;
  relatedSystemId = system.id;
});

afterEach(async () => {
  await getPrisma().ticket.deleteMany({ where: { requesterId } });
});

afterAll(async () => {
  await getPrisma().ticket.deleteMany({ where: { requesterId } });
  await getPrisma().developmentRequester.delete({ where: { id: requesterId } });
  await getPrisma().$disconnect();
});

describe("POST /api/tickets", () => {
  it("creates one owned NEW Ticket and returns its official number", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", String(requesterId))
      .send(validBody());

    expect(response.status).toBe(201);
    expect(response.body.replayed).toBe(false);
    expect(response.body.ticket).toMatchObject({
      ticketNumber: expect.stringMatching(/^TKT-\d{8}-[A-F0-9]{8}$/),
      currentStatus: "NEW",
      requester: { id: requesterId },
    });
    expect(await getPrisma().ticket.count({ where: { requesterId } })).toBe(1);
  });

  it("returns field errors and creates nothing for invalid input", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", String(requesterId))
      .send({ ...validBody(), summary: " ", description: "short" });
    expect(response.status).toBe(400);
    expect(response.body.error.fields).toEqual(expect.objectContaining({ summary: expect.any(String), description: expect.any(String) }));
    expect(await getPrisma().ticket.count({ where: { requesterId } })).toBe(0);
  });

  it("replays a duplicate token without creating another Ticket", async () => {
    const body = validBody();
    const first = await request(app).post("/api/tickets").set("X-Development-Requester-Id", String(requesterId)).send(body);
    const replay = await request(app).post("/api/tickets").set("X-Development-Requester-Id", String(requesterId)).send(body);
    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    expect(replay.body).toMatchObject({ replayed: true, ticket: { id: first.body.ticket.id } });
    expect(await getPrisma().ticket.count({ where: { requesterId } })).toBe(1);
  });

  it("rejects missing and inactive Development Requester contexts", async () => {
    expect((await request(app).post("/api/tickets").send(validBody())).status).toBe(400);
    const inactive = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", String(inactiveRequesterId))
      .send(validBody());
    expect(inactive.status).toBe(403);
  });
});
