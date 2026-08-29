import { describe, expect, it } from "vitest";
import { sanitizeAttachmentName, validateAttachment } from "../../src/attachment-validation.js";

function upload(name: string, mimeType: string, bytes: Buffer): Express.Multer.File {
  return { fieldname: "file", originalname: name, encoding: "7bit", mimetype: mimeType, size: bytes.length, buffer: bytes } as Express.Multer.File;
}

describe("Attachment validation", () => {
  it("sanitizes path components, controls, whitespace, and long names", () => {
    expect(sanitizeAttachmentName("../folder\\ bad\u0000   name.pdf")).toBe("bad name.pdf");
    expect(sanitizeAttachmentName(`${"x".repeat(300)}.pdf`)).toHaveLength(255);
  });

  it("accepts matching extension, declared MIME, and detected signature", async () => {
    const result = await validateAttachment(upload(" evidence.pdf ", "application/pdf", Buffer.from("%PDF-1.7\n")));
    expect(result).toEqual({ success: true, data: { originalName: "evidence.pdf", mimeType: "application/pdf" } });
  });

  it("rejects a spoofed extension or declared MIME type", async () => {
    const result = await validateAttachment(upload("evidence.png", "image/png", Buffer.from("%PDF-1.7\n")));
    expect(result).toMatchObject({ success: false, message: expect.stringContaining("extension") });
  });
});
