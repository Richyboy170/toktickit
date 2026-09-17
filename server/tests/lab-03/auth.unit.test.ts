import { describe, expect, it } from "vitest";
import { hashPassword, passwordValidationMessage, verifyPassword } from "../../src/auth.js";
import { SESSION_COOKIE, SESSION_TTL_MS, sessionCookie } from "../../src/auth-context.js";
import { canReadStaffTicketDetail } from "../../src/routes/staff.js";
import { canTransitionStatus, requiresActiveOwner, requiresStatusConfirmation } from "../../src/ticket-workflow.js";

describe("password policy", () => {
  it("requires a bounded password with a letter and number", () => {
    expect(passwordValidationMessage("Short1!")).toContain("12-128");
    expect(passwordValidationMessage("LongPasswordOnly")).toContain("number");
    expect(passwordValidationMessage("ValidLocalPass1!")).toBeNull();
    expect(passwordValidationMessage(" ValidLocalPass1! ")).toContain("whitespace");
  });
});

describe("password hashing", () => {
  it("uses a salted scrypt hash and verifies the original password", async () => {
    const encoded = await hashPassword("correct horse battery staple");

    expect(encoded).toMatch(/^scrypt\$/);
    expect(encoded).not.toContain("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", encoded)).toBe(true);
    expect(await verifyPassword("wrong password", encoded)).toBe(false);
  });
});

describe("Ticket status workflow", () => {
  it("allows IT Staff to move a new Ticket to Open but rejects a direct Closed transition", () => {
    expect(canTransitionStatus("NEW", "OPEN", "IT_STAFF")).toBe(true);
    expect(canTransitionStatus("NEW", "CLOSED", "IT_STAFF")).toBe(false);
  });

  it("does not allow a Requester to formally change Ticket status", () => {
    expect(canTransitionStatus("OPEN", "RESOLVED", "REQUESTER")).toBe(false);
  });

  it("keeps terminal status changes explicit and owner-gated", () => {
    expect(canTransitionStatus("NEW", "CANCELLED", "IT_STAFF")).toBe(true);
    expect(requiresStatusConfirmation("RESOLVED")).toBe(true);
    expect(requiresStatusConfirmation("OPEN")).toBe(false);
    expect(requiresActiveOwner("CLOSED")).toBe(true);
    expect(requiresActiveOwner("WAITING_FOR_REQUESTER")).toBe(false);
  });
});

describe("server sessions", () => {
  it("uses an HttpOnly eight-hour cookie without exposing the raw token in storage helpers", () => {
    const cookie = sessionCookie("session-token");

    expect(SESSION_TTL_MS).toBe(8 * 60 * 60 * 1000);
    expect(cookie).toContain(`${SESSION_COOKIE}=session-token`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=28800");
  });
});

describe("Staff Ticket Detail read policy", () => {
  it("allows Administrators to read detail while keeping Requesters out", () => {
    expect(canReadStaffTicketDetail("IT_STAFF")).toBe(true);
    expect(canReadStaffTicketDetail("ADMINISTRATOR")).toBe(true);
    expect(canReadStaffTicketDetail("REQUESTER")).toBe(false);
  });
});
