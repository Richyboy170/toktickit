import { z } from "zod";
import { FieldErrors } from "./http.js";

const instant = z.string().datetime({ offset: true, message: "Enter a valid date and time." });
const positiveId = z.number({ invalid_type_error: "Select an active IT Staff assignee." })
  .int("Select an active IT Staff assignee.")
  .positive("Select an active IT Staff assignee.");
const trimmedText = (field: string, maximum: number, required: boolean) => z.string()
  .transform((value) => value.trim())
  .pipe(required
    ? z.string().min(1, `${field} is required.`).max(maximum, `${field} must be at most ${maximum} characters.`)
    : z.string().max(maximum, `${field} must be at most ${maximum} characters.`));
const requiredNote = trimmedText("Follow-up Note", 2000, true);
const optionalNote = z.union([trimmedText("Follow-up Note", 2000, true), z.literal("").transform(() => null)]).nullable().optional();
const optionalResult = z.union([trimmedText("Result", 4000, true), z.literal("").transform(() => null)]).nullable().optional();
const optionalAttachmentNotes = z.union([trimmedText("Attachment Notes", 1000, true), z.literal("").transform(() => null)]).nullable().optional();

export const createActionSchema = z.object({
  actionAt: instant,
  description: trimmedText("Description", 4000, true),
  result: optionalResult,
  assigneeUserId: positiveId,
  followUpRequired: z.boolean().default(false),
  followUpNote: optionalNote,
  attachmentNotes: optionalAttachmentNotes,
}).strict().superRefine((action, context) => {
  if (action.followUpRequired && !action.followUpNote) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["followUpNote"], message: "Follow-up Note is required when follow-up is selected." });
  }
}).transform((action) => ({
  ...action,
  followUpNote: action.followUpRequired ? action.followUpNote ?? null : null,
}));

export const patchActionSchema = z.object({
  expectedUpdatedAt: instant,
  actionAt: instant.optional(),
  description: trimmedText("Description", 4000, true).optional(),
  result: optionalResult,
  assigneeUserId: positiveId.optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  followUpRequired: z.boolean().optional(),
  followUpNote: optionalNote,
  attachmentNotes: optionalAttachmentNotes,
}).strict().superRefine((action, context) => {
  const changedField = Object.keys(action).some((field) => field !== "expectedUpdatedAt");
  if (!changedField) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Provide at least one Action change." });
  }
});

export type CreateActionInput = z.infer<typeof createActionSchema>;
export type PatchActionInput = z.infer<typeof patchActionSchema>;

export function zodActionFieldErrors(error: z.ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "request");
    if (!fields[field]) fields[field] = issue.message;
  }
  return fields;
}
