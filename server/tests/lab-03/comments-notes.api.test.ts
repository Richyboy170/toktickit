import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";

describe("Lab 3 Public Comment and Internal Note boundaries", () => {
  it("rejects unauthenticated comment reads without exposing content", async () => {
    const response = await request(app).get("/api/tickets/1/comments");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
    expect(response.body).not.toHaveProperty("comments");
  });

  it("rejects unauthenticated Internal Note reads", async () => {
    const response = await request(app).get("/api/staff/tickets/1/notes");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
    expect(response.body).not.toHaveProperty("notes");
  });
});
