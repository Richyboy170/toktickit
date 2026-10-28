import { z } from "zod";
import { FieldErrors } from "./http.js";

export const createTicketSchema = z.object({
  categoryId: z.number({ error: (issue) => issue.input === undefined ? "Required" : "Select a Category." }).int().positive("Select a Category."),
  relatedSystemId: z.number({ error: (issue) => issue.input === undefined ? "Required" : "Select a Related System." }).int().positive("Select a Related System."),
  summary: z
    .string({ error: (issue) => issue.input === undefined ? "Summary is required." : undefined })
    .transform((value) => value.trim())
    .pipe(z.string().min(5, "Summary must be 5-120 characters.").max(120, "Summary must be 5-120 characters.")),
  requestedPriority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"], {
    error: "Select a valid Requested Priority.",
  }),
  description: z
    .string({ error: (issue) => issue.input === undefined ? "Description is required." : undefined })
    .transform((value) => value.trim())
    .pipe(z.string().min(10, "Description must be 10-5000 characters.").max(5000, "Description must be 10-5000 characters.")),
  submissionToken: z.string({ error: (issue) => issue.input === undefined ? "Submission token is required." : undefined }).uuid("Submission token must be a UUID."),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

const optionalPositiveInt = z.preprocess(
  (value) => (value === undefined || value === "" ? undefined : Number(value)),
  z.number().int().positive().optional(),
);

export const ticketListQuerySchema = z.object({
  search: z.string().trim().max(120, "Search must be at most 120 characters.").optional().default(""),
  categoryId: optionalPositiveInt,
  relatedSystemId: optionalPositiveInt,
  requestedPriority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum([
    "NEW",
    "OPEN",
    "IN_PROGRESS",
    "WAITING_FOR_REQUESTER",
    "RESOLVED",
    "CLOSED",
    "REOPENED",
    "CANCELLED",
  ]).optional(),
  statusGroup: z.enum(["open"]).optional(),
  sort: z.enum(["createdAt", "updatedAt", "ticketNumber", "summary"]).optional().default("updatedAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.preprocess((value) => (value === undefined || value === "" ? 1 : Number(value)), z.number().int().positive()),
  pageSize: z.preprocess(
    (value) => (value === undefined || value === "" ? 10 : Number(value)),
    z.number().refine((value) => [5, 10, 20, 50].includes(value), "Page size must be 5, 10, 20, or 50."),
  ),
}).superRefine((query, context) => {
  if (query.status && query.statusGroup) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["statusGroup"], message: "Choose a single status or a status group, not both." });
  }
});

export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "request");
    if (!fields[field]) fields[field] = issue.message;
  }
  return fields;
}
