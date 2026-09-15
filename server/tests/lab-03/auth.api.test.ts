import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";

describe("Lab 3 authentication boundary", () => {
  it("rejects current-user access without an authenticated session", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("validates login input before attempting credentials", async () => {
    const response = await request(app).post("/api/auth/login").send({ email: "", password: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.fields).toEqual(expect.objectContaining({ email: expect.any(String), password: expect.any(String) }));
  });
});
