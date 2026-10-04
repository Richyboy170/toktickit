import { describe, expect, it } from "vitest";
import { canResolveTicket } from "../../src/ticket-workflow.js";

describe("Lab 4 Ticket resolution requirements", () => {
  it("requires an active owner and at least one completed Action", () => {
    expect(canResolveTicket(true, [])).toBe(false);
    expect(canResolveTicket(false, ["COMPLETED"])).toBe(false);
    expect(canResolveTicket(true, ["PLANNED"])).toBe(false);
  });

  it("allows cancellation history when all remaining Actions are complete", () => {
    expect(canResolveTicket(true, ["COMPLETED", "CANCELLED"])).toBe(true);
    expect(canResolveTicket(true, ["COMPLETED", "IN_PROGRESS"])).toBe(false);
    expect(canResolveTicket(true, ["COMPLETED", "PLANNED", "CANCELLED"])).toBe(false);
  });
});
