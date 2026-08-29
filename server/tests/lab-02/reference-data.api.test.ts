import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 reference data", () => {
  beforeAll(async () => {
    await getPrisma().developmentRequester.updateMany({ data: { isActive: true } });
    await getPrisma().developmentRequester.updateMany({
      where: { email: "somchai.archive@example.edu" },
      data: { isActive: false },
    });
  });

  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  it("returns the four active categories", async () => {
    const response = await request(app).get("/api/categories");

    expect(response.status).toBe(200);
    expect(response.body.map((item: { name: string }) => item.name)).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);
  });

  it("returns the seven active related systems in name order", async () => {
    const response = await request(app).get("/api/related-systems");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(7);
    expect(response.body.map((item: { name: string }) => item.name)).toEqual([
      "Campus Wi-Fi",
      "Corporate Laptop",
      "Email",
      "Grade Submission App",
      "LEB2 App",
      "Printer",
      "VPN",
    ]);
  });

  it("returns active Development Requesters and hides the inactive seed", async () => {
    const response = await request(app).get("/api/development-requesters");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(4);
    expect(response.body.map((item: { email: string }) => item.email)).not.toContain(
      "somchai.archive@example.edu",
    );
    expect(response.body[0]).toEqual(
      expect.objectContaining({ id: expect.any(Number), name: expect.any(String), email: expect.any(String) }),
    );
  });
});
