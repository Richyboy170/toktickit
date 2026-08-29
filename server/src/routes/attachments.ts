import { Router } from "express";
import { z } from "zod";
import { attachmentMetadataSelect, serializeAttachment } from "../attachment-metadata.js";
import { sendError } from "../http.js";
import { getPrisma } from "../prisma.js";
import { requireActiveRequester } from "../requester-context.js";
import { zodFieldErrors } from "../ticket-validation.js";

export const attachmentsRouter = Router();

const removalSchema = z.object({
  reason: z
    .string({ required_error: "Removal reason is required." })
    .transform((value) => value.trim())
    .pipe(z.string().min(3, "Removal reason must be 3-200 characters.").max(200, "Removal reason must be 3-200 characters.")),
});

function pathId(raw: string): number | null {
  if (!/^\d+$/.test(raw) || Number(raw) <= 0 || !Number.isSafeInteger(Number(raw))) return null;
  return Number(raw);
}

function safeContentDisposition(name: string): string {
  const fallback = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_") || "attachment";
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

attachmentsRouter.get("/:attachmentId/download", async (req, res) => {
  try {
    const requesterId = await requireActiveRequester(req, res);
    if (!requesterId) return;
    const attachmentId = pathId(req.params.attachmentId);
    if (!attachmentId) return sendError(res, 400, "INVALID_PATH", "Attachment ID must be a positive integer.");

    const attachment = await getPrisma().attachment.findFirst({
      where: { id: attachmentId, ticket: { requesterId } },
    });
    if (!attachment) return sendError(res, 404, "RESOURCE_NOT_FOUND", "Attachment not found.");
    if (attachment.removedAt) return sendError(res, 410, "ATTACHMENT_REMOVED", "This Attachment is no longer available.");

    res.set({
      "Content-Type": attachment.mimeType,
      "Content-Length": String(attachment.sizeBytes),
      "Content-Disposition": safeContentDisposition(attachment.originalName),
      "X-Content-Type-Options": "nosniff",
    });
    return res.status(200).send(Buffer.from(attachment.content));
  } catch (error) {
    console.error("GET /api/attachments/:attachmentId/download failed:", error);
    return sendError(res, 500, "ATTACHMENT_DOWNLOAD_FAILED", "Unable to download the Attachment. Please try again.");
  }
});

attachmentsRouter.delete("/:attachmentId", async (req, res) => {
  try {
    const requesterId = await requireActiveRequester(req, res);
    if (!requesterId) return;
    const attachmentId = pathId(req.params.attachmentId);
    if (!attachmentId) return sendError(res, 400, "INVALID_PATH", "Attachment ID must be a positive integer.");
    const parsed = removalSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, "VALIDATION_ERROR", "Please provide a valid removal reason.", zodFieldErrors(parsed.error));

    const owned = await getPrisma().attachment.findFirst({
      where: { id: attachmentId, ticket: { requesterId } },
      select: { id: true, removedAt: true },
    });
    if (!owned) return sendError(res, 404, "RESOURCE_NOT_FOUND", "Attachment not found.");
    if (owned.removedAt) return sendError(res, 409, "ATTACHMENT_ALREADY_REMOVED", "This Attachment was already removed.");

    const updated = await getPrisma().attachment.updateMany({
      where: { id: attachmentId, removedAt: null },
      data: { removedAt: new Date(), removalReason: parsed.data.reason, removedByRequesterId: requesterId },
    });
    if (updated.count === 0) return sendError(res, 409, "ATTACHMENT_ALREADY_REMOVED", "This Attachment was already removed.");
    const attachment = await getPrisma().attachment.findUniqueOrThrow({
      where: { id: attachmentId },
      select: attachmentMetadataSelect,
    });
    return res.status(200).json({ attachment: serializeAttachment(attachment) });
  } catch (error) {
    console.error("DELETE /api/attachments/:attachmentId failed:", error);
    return sendError(res, 500, "ATTACHMENT_REMOVE_FAILED", "Unable to remove the Attachment. Please try again.");
  }
});
