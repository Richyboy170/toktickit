import { describe, expect, it } from "vitest";
import { createTicketSchema, ticketListQuerySchema, zodFieldErrors } from "../../src/ticket-validation.js";

describe("Ticket input and query validation", () => {
  it("trims valid Ticket input and applies safe query defaults", () => {
    const ticket = createTicketSchema.parse({
      categoryId: 1,
      relatedSystemId: 2,
      summary: "  Laptop battery issue  ",
      requestedPriority: "HIGH",
      description: "  The battery drains during normal use.  ",
      submissionToken: "00000000-0000-4000-8000-000000000001",
    });
    const query = ticketListQuerySchema.parse({ search: "  battery  ", pageSize: "20" });

    expect(ticket.summary).toBe("Laptop battery issue");
    expect(ticket.description).toBe("The battery drains during normal use.");
    expect(query).toMatchObject({ search: "battery", page: 1, pageSize: 20, sort: "updatedAt", order: "desc" });
  });

  it("rejects invalid enum, page, and page-size values with field errors", () => {
    const result = ticketListQuerySchema.safeParse({ status: "NOT_A_STATUS", page: "0", pageSize: "7" });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(zodFieldErrors(result.error)).toEqual(expect.objectContaining({ status: expect.any(String), page: expect.any(String), pageSize: expect.any(String) }));
  });
});
