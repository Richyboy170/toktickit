import { fileTypeFromBuffer } from "file-type";
import { extname, posix } from "node:path";

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export interface ValidatedAttachment {
  originalName: string;
  mimeType: string;
}

export function sanitizeAttachmentName(value: string): string {
  const baseName = posix.basename(value.replaceAll("\\", "/"));
  const safe = baseName
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 255);
  return safe || "attachment";
}

export async function validateAttachment(
  file: Express.Multer.File,
): Promise<{ success: true; data: ValidatedAttachment } | { success: false; message: string }> {
  const originalName = sanitizeAttachmentName(file.originalname);
  const extension = extname(originalName).toLowerCase();
  const expectedMime = ALLOWED_TYPES[extension];
  const detected = await fileTypeFromBuffer(file.buffer);

  if (!expectedMime || file.mimetype !== expectedMime || detected?.mime !== expectedMime) {
    return {
      success: false,
      message: "Use a JPG, PNG, WEBP, or PDF whose extension, file type, and content agree.",
    };
  }
  return { success: true, data: { originalName, mimeType: expectedMime } };
}
