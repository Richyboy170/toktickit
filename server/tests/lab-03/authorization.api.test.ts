import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";

describe("Lab 3 role boundaries", () => {
  it("requires authentication before the IT Staff queue", async () => {
    const response = await request(app).get("/api/staff/tickets");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("requires authentication before administrator user management", async () => {
    const response = await request(app).get("/api/admin/users");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });
});
