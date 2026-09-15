import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";

describe("Lab 3 IT Staff queue boundary", () => {
  it("rejects an unauthenticated queue request before touching queue data", async () => {
    const response = await request(app).get("/api/staff/tickets");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });
});
