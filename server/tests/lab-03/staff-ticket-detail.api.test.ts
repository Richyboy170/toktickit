import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";

describe("Lab 3 IT Staff Ticket Detail boundary", () => {
  it("rejects an unauthenticated detail request", async () => {
    const response = await request(app).get("/api/staff/tickets/1");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });
});
