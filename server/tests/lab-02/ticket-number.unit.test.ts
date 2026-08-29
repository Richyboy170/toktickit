import { describe, expect, it } from "vitest";
import { generateTicketNumber } from "../../src/ticket-number.js";

describe("generateTicketNumber", () => {
  it("uses the UTC date and eight uppercase hexadecimal characters", () => {
    const number = generateTicketNumber(
      new Date("2026-08-20T23:59:59.000Z"),
      () => Buffer.from([0xab, 0xcd, 0x01, 0x23]),
    );
    expect(number).toBe("TKT-20260820-ABCD0123");
  });
});
