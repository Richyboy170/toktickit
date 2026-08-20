import { z } from "zod";
import { FieldErrors } from "./http.js";

export const createTicketSchema = z.object({
  categoryId: z.number({ invalid_type_error: "Select a Category." }).int().positive("Select a Category."),
  relatedSystemId: z.number({ invalid_type_error: "Select a Related System." }).int().positive("Select a Related System."),
  summary: z
    .string({ required_error: "Summary is required." })
    .transform((value) => value.trim())
    .pipe(z.string().min(5, "Summary must be 5-120 characters.").max(120, "Summary must be 5-120 characters.")),
  requestedPriority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"], {
    errorMap: () => ({ message: "Select a valid Requested Priority." }),
  }),
  description: z
    .string({ required_error: "Description is required." })
    .transform((value) => value.trim())
    .pipe(z.string().min(10, "Description must be 10-5000 characters.").max(5000, "Description must be 10-5000 characters.")),
  submissionToken: z.string({ required_error: "Submission token is required." }).uuid("Submission token must be a UUID."),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "request");
    if (!fields[field]) fields[field] = issue.message;
  }
  return fields;
}
