import { Request, Response, Router } from "express";
import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { requireAuthenticatedUser } from "../auth-context.js";
import { sendError } from "../http.js";
import { getPrisma } from "../prisma.js";
import { zodFieldErrors } from "../ticket-validation.js";

export const messagesRouter = Router();

const messageSchema = z.object({
  body: z.string().optional(),
  content: z.string().optional(),
}).superRefine((value, ctx) => {
  const body = value.body ?? value.content;
  if (body === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["body"], message: "Content is required." });
    return;
  }
  const trimmed = body.trim();
  if (!trimmed) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["body"], message: "Content cannot be empty." });
  if (trimmed.length > 2000) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["body"], message: "Content must be at most 2000 characters." });
});

function pathId(raw: string): number | null {
  if (!/^\d+$/.test(raw) || Number(raw) <= 0 || !Number.isSafeInteger(Number(raw))) return null;
  return Number(raw);
}

const authorSelect = { id: true, name: true, role: true } as const;

const publicCommentInclude = {
  author: { select: authorSelect },
} satisfies Prisma.PublicCommentInclude;

const internalNoteInclude = {
  author: { select: authorSelect },
} satisfies Prisma.InternalNoteInclude;

async function findTicketForUser(ticketId: number, userId: number, role: UserRole) {
  if (role === UserRole.REQUESTER) return getPrisma().ticket.findFirst({ where: { id: ticketId, requesterId: userId }, select: { id: true } });
  return getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
}

function serializeComment(comment: Prisma.PublicCommentGetPayload<{ include: typeof publicCommentInclude }>) {
  return { id: comment.id, body: comment.content, content: comment.content, author: comment.author, createdAt: comment.createdAt };
}

function serializeNote(note: Prisma.InternalNoteGetPayload<{ include: typeof internalNoteInclude }>) {
  return { id: note.id, body: note.content, content: note.content, author: note.author, createdAt: note.createdAt };
}

messagesRouter.get(["/:ticketId/comments", "/:ticketId/public-comments"], async (req, res) => {
    const user = await requireAuthenticatedUser(req, res);
    if (!user) return;
    const ticketId = pathId(req.params.ticketId);
    if (!ticketId) return sendError(res, 400, "INVALID_PATH", "Ticket ID must be a positive integer.");
    try {
      const ticket = await findTicketForUser(ticketId, user.id, user.role);
      if (!ticket) return sendError(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
      const comments = await getPrisma().publicComment.findMany({ where: { ticketId }, include: publicCommentInclude, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      const items = comments.map(serializeComment);
      return res.status(200).json({ comments: items, items });
    } catch (error) {
      console.error("GET comments failed:", error);
      return sendError(res, 500, "COMMENTS_LIST_FAILED", "Unable to load Public Comments.");
    }
});

messagesRouter.post(["/:ticketId/comments", "/:ticketId/public-comments"], async (req, res) => {
    const user = await requireAuthenticatedUser(req, res);
    if (!user) return;
    const ticketId = pathId(req.params.ticketId);
    if (!ticketId) return sendError(res, 400, "INVALID_PATH", "Ticket ID must be a positive integer.");
    if (user.role !== UserRole.REQUESTER && user.role !== UserRole.IT_STAFF) return sendError(res, 403, "FORBIDDEN", "You are not permitted to post Public Comments.");
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, "VALIDATION_ERROR", "Please correct the highlighted fields.", zodFieldErrors(parsed.error));
    try {
      const ticket = await findTicketForUser(ticketId, user.id, user.role);
      if (!ticket) return sendError(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
      const content = (parsed.data.body ?? parsed.data.content!).trim();
      const comment = await getPrisma().publicComment.create({ data: { ticketId, authorId: user.id, content }, include: publicCommentInclude });
      return res.status(201).json({ comment: serializeComment(comment) });
    } catch (error) {
      console.error("POST comment failed:", error);
      return sendError(res, 500, "COMMENT_CREATE_FAILED", "Unable to post the Public Comment.");
    }
});

messagesRouter.get(["/:ticketId/notes", "/:ticketId/internal-notes"], async (req, res) => {
    const user = await requireAuthenticatedUser(req, res);
    if (!user) return;
    if (user.role !== UserRole.IT_STAFF && user.role !== UserRole.ADMINISTRATOR) return sendError(res, 403, "FORBIDDEN", "You are not permitted to view Internal Notes.");
    const ticketId = pathId(req.params.ticketId);
    if (!ticketId) return sendError(res, 400, "INVALID_PATH", "Ticket ID must be a positive integer.");
    try {
      const ticket = await findTicketForUser(ticketId, user.id, user.role);
      if (!ticket) return sendError(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
      const notes = await getPrisma().internalNote.findMany({ where: { ticketId }, include: internalNoteInclude, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      const items = notes.map(serializeNote);
      return res.status(200).json({ notes: items, items });
    } catch (error) {
      console.error("GET notes failed:", error);
      return sendError(res, 500, "NOTES_LIST_FAILED", "Unable to load Internal Notes.");
    }
});

messagesRouter.post(["/:ticketId/notes", "/:ticketId/internal-notes"], async (req, res) => {
    const user = await requireAuthenticatedUser(req, res);
    if (!user) return;
    if (user.role !== UserRole.IT_STAFF) return sendError(res, 403, "FORBIDDEN", "You are not permitted to post Internal Notes.");
    const ticketId = pathId(req.params.ticketId);
    if (!ticketId) return sendError(res, 400, "INVALID_PATH", "Ticket ID must be a positive integer.");
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, "VALIDATION_ERROR", "Please correct the highlighted fields.", zodFieldErrors(parsed.error));
    try {
      const ticket = await findTicketForUser(ticketId, user.id, user.role);
      if (!ticket) return sendError(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
      const content = (parsed.data.body ?? parsed.data.content!).trim();
      const note = await getPrisma().internalNote.create({ data: { ticketId, authorId: user.id, content }, include: internalNoteInclude });
      return res.status(201).json({ note: serializeNote(note) });
    } catch (error) {
      console.error("POST note failed:", error);
      return sendError(res, 500, "NOTE_CREATE_FAILED", "Unable to create the Internal Note.");
    }
});
