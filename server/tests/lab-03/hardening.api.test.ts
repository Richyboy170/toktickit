import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { legacyRequesterContextEnabled } from "../../src/auth-context.js";

const originalNodeEnv = process.env.NODE_ENV;
const originalLegacyFlag = process.env.ENABLE_LEGACY_REQUESTER_CONTEXT;

function restoreEnvironment() {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalLegacyFlag === undefined) delete process.env.ENABLE_LEGACY_REQUESTER_CONTEXT;
  else process.env.ENABLE_LEGACY_REQUESTER_CONTEXT = originalLegacyFlag;
}

afterEach(restoreEnvironment);

describe("legacy requester compatibility gate", () => {
  it("enables the compatibility shim only for the explicit flag or test environment", () => {
    process.env.NODE_ENV = "production";
    delete process.env.ENABLE_LEGACY_REQUESTER_CONTEXT;
    expect(legacyRequesterContextEnabled()).toBe(false);

    process.env.ENABLE_LEGACY_REQUESTER_CONTEXT = "true";
    expect(legacyRequesterContextEnabled()).toBe(true);

    process.env.ENABLE_LEGACY_REQUESTER_CONTEXT = "false";
    expect(legacyRequesterContextEnabled()).toBe(false);

    process.env.NODE_ENV = "test";
    expect(legacyRequesterContextEnabled()).toBe(true);
  });

  it("does not accept the legacy requester header when compatibility is disabled", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ENABLE_LEGACY_REQUESTER_CONTEXT;

    const response = await request(app)
      .get("/api/tickets")
      .set("X-Development-Requester-Id", "1");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("hides the public Development Requester compatibility route when disabled", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ENABLE_LEGACY_REQUESTER_CONTEXT;

    const response = await request(app).get("/api/development-requesters");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("LEGACY_ROUTE_UNAVAILABLE");
  });
});

describe("safe request errors", () => {
  it("returns a safe API error for malformed JSON", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: "INVALID_JSON",
      message: "Request body must contain valid JSON.",
    });
    expect(JSON.stringify(response.body)).not.toContain("SyntaxError");
  });
});
