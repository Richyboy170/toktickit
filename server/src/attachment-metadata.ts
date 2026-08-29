import { Attachment } from "@prisma/client";

export type AttachmentWithoutContent = Omit<Attachment, "content" | "ticketId">;

export const attachmentMetadataSelect = {
  id: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  uploadedAt: true,
  removedAt: true,
  removalReason: true,
  removedByRequesterId: true,
} as const;

export function serializeAttachment(attachment: AttachmentWithoutContent) {
  return {
    ...attachment,
    available: attachment.removedAt === null,
  };
}

export function activeFirst<T extends { removedAt: Date | null; uploadedAt: Date; id: number }>(attachments: T[]): T[] {
  return [...attachments].sort((left, right) => {
    if ((left.removedAt === null) !== (right.removedAt === null)) return left.removedAt === null ? -1 : 1;
    const byTime = right.uploadedAt.getTime() - left.uploadedAt.getTime();
    return byTime || right.id - left.id;
  });
}
