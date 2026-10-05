import { describe, expect, it } from "vitest";
import { createActionSchema, patchActionSchema } from "../../src/action-validation.js";
import { canTransitionAction } from "../../src/action-workflow.js";

const validCreate = {
  actionAt: "2026-10-04T03:15:00.000Z",
  description: "  Replaced the network cable and verified link status.  ",
  assigneeUserId: 22,
  followUpRequired: false,
};

describe("Lab 4 Action Taken validation", () => {
  it("trims text and validates a complete creation payload", () => {
    expect(createActionSchema.parse(validCreate)).toMatchObject({
      description: "Replaced the network cable and verified link status.",
      assigneeUserId: 22,
      followUpRequired: false,
    });
  });

  it("requires a valid instant, a bounded description, and a positive assignee id", () => {
    expect(createActionSchema.safeParse({ ...validCreate, actionAt: "tomorrow" }).success).toBe(false);
    expect(createActionSchema.safeParse({ ...validCreate, description: "  " }).success).toBe(false);
    expect(createActionSchema.safeParse({ ...validCreate, assigneeUserId: 0 }).success).toBe(false);
  });

  it("rejects client supplied Action identity and Ticket links", () => {
    expect(createActionSchema.safeParse({ ...validCreate, performedByUserId: 22 }).success).toBe(false);
    expect(createActionSchema.safeParse({ ...validCreate, ticketId: 9 }).success).toBe(false);
  });

  it("requires a follow-up note when follow-up is selected and clears it when unselected", () => {
    expect(createActionSchema.safeParse({ ...validCreate, followUpRequired: true }).success).toBe(false);
    expect(createActionSchema.parse({
      ...validCreate,
      followUpRequired: true,
      followUpNote: "  Confirm stability tomorrow.  ",
    }).followUpNote).toBe("Confirm stability tomorrow.");
    expect(createActionSchema.parse({
      ...validCreate,
      followUpRequired: false,
      followUpNote: " stale note ",
    }).followUpNote).toBeNull();
  });

  it("requires an expected version for updates and validates nullable fields", () => {
    expect(patchActionSchema.safeParse({ description: "Change" }).success).toBe(false);
    expect(patchActionSchema.safeParse({ expectedUpdatedAt: "2026-10-04T03:15:00.000Z", result: null }).success).toBe(true);
    expect(patchActionSchema.safeParse({ expectedUpdatedAt: "bad", attachmentNotes: null }).success).toBe(false);
  });
});

describe("Lab 4 Action transition policy", () => {
  it.each([
    ["PLANNED", "IN_PROGRESS", true],
    ["PLANNED", "CANCELLED", true],
    ["PLANNED", "COMPLETED", false],
    ["IN_PROGRESS", "COMPLETED", true],
    ["IN_PROGRESS", "CANCELLED", true],
    ["IN_PROGRESS", "PLANNED", false],
    ["COMPLETED", "IN_PROGRESS", false],
    ["CANCELLED", "PLANNED", false],
  ] as const)("%s to %s is %s", (from, to, expected) => {
    expect(canTransitionAction(from, to)).toBe(expected);
  });
});
