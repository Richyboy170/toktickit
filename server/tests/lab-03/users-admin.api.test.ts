import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";

describe("Lab 3 Administrator User Management boundary", () => {
  it("rejects an unauthenticated user-list request", async () => {
    const response = await request(app).get("/api/admin/users");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });
});
