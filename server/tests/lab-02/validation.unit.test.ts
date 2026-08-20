import { describe, expect, it } from "vitest";
import { createTicketSchema, zodFieldErrors } from "../../src/ticket-validation.js";

const valid = {
  categoryId: 1,
  relatedSystemId: 1,
  summary: "  Laptop will not start  ",
  requestedPriority: "HIGH",
  description: "  The power button produces no response.  ",
  submissionToken: "f6d0b86b-e713-47ad-a48d-46b863b83c9f",
};

describe("Ticket validation", () => {
  it("trims valid text", () => {
    expect(createTicketSchema.parse(valid)).toMatchObject({
      summary: "Laptop will not start",
      description: "The power button produces no response.",
    });
  });

  it("returns field-specific boundary messages", () => {
    const result = createTicketSchema.safeParse({ ...valid, summary: " x ", description: "short" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error)).toEqual({
        summary: "Summary must be 5-120 characters.",
        description: "Description must be 10-5000 characters.",
      });
    }
  });
});
