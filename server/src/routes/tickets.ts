import { Prisma, UserRole } from "@prisma/client";
import { Request, Response, Router } from "express";
import multer from "multer";
import { z } from "zod";
import { activeFirst, attachmentMetadataSelect, serializeAttachment } from "../attachment-metadata.js";
import { MAX_ATTACHMENT_BYTES, validateAttachment } from "../attachment-validation.js";
import { sendError } from "../http.js";
import { getPrisma } from "../prisma.js";
import { requireActiveRequester } from "../requester-context.js";
import { getSessionToken, requireAuthenticatedUser } from "../auth-context.js";
import { generateTicketNumber } from "../ticket-number.js";
import { createTicketSchema, ticketListQuerySchema, TicketListQuery, zodFieldErrors } from "../ticket-validation.js";

export const ticketsRouter = Router();

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1, fields: 0 },
});

class AttachmentRouteError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}

function pathId(raw: string): number | null {
  if (!/^\d+$/.test(raw) || Number(raw) <= 0 || !Number.isSafeInteger(Number(raw))) return null;
  return Number(raw);
}

function receiveOneAttachment(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    attachmentUpload.single("file")(req, res, (error) => error ? reject(error) : resolve());
  });
}

const ticketInclude = {
  requester: { select: { id: true, name: true, email: true, role: true } },
  owner: { select: { id: true, name: true, email: true, role: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
} satisfies Prisma.TicketInclude;

function serializeTicket(ticket: Prisma.TicketGetPayload<{ include: typeof ticketInclude }>) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    ticketDate: ticket.createdAt,
    requester: ticket.requester,
    owner: ticket.owner,
    category: ticket.category,
    relatedSystem: ticket.relatedSystem,
    summary: ticket.summary,
    requestedPriority: ticket.requestedPriority,
    itPriority: ticket.itPriority,
    description: ticket.description,
    currentStatus: ticket.currentStatus,
    requesterMarkedResolved: ticket.requesterMarkedResolved,
    requesterResolvedAt: ticket.requesterResolvedAt,
    requesterResolutionIndicatedAt: ticket.requesterResolutionIndicatedAt ?? ticket.requesterResolvedAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

function listOrderBy(query: TicketListQuery): Prisma.TicketOrderByWithRelationInput[] {
  const primary: Prisma.TicketOrderByWithRelationInput =
    query.sort === "createdAt" ? { createdAt: query.order }
      : query.sort === "ticketNumber" ? { ticketNumber: query.order }
        : query.sort === "summary" ? { summary: query.order }
          : { updatedAt: query.order };
  return [primary, { id: query.order }];
}

ticketsRouter.get("/", async (req, res) => {
  try {
    const requesterId = await requireActiveRequester(req, res);
    if (!requesterId) return;
    const parsed = ticketListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendError(res, 400, "INVALID_QUERY", "Please correct the Ticket-list parameters.", zodFieldErrors(parsed.error));
    }
    const query = parsed.data;
    const where: Prisma.TicketWhereInput = {
      requesterId,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.relatedSystemId ? { relatedSystemId: query.relatedSystemId } : {}),
      ...(query.requestedPriority ? { requestedPriority: query.requestedPriority } : {}),
      ...(query.status ? { currentStatus: query.status } : {}),
      ...(query.search ? {
        OR: [
          { ticketNumber: { contains: query.search, mode: "insensitive" } },
          { summary: { contains: query.search, mode: "insensitive" } },
          { description: { contains: query.search, mode: "insensitive" } },
        ],
      } : {}),
    };

    const [totalItems, tickets] = await getPrisma().$transaction([
      getPrisma().ticket.count({ where }),
      getPrisma().ticket.findMany({
        where,
        include: ticketInclude,
        orderBy: listOrderBy(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return res.status(200).json({
      items: tickets.map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        ticketDate: ticket.createdAt,
        summary: ticket.summary,
        category: ticket.category,
        relatedSystem: ticket.relatedSystem,
        requestedPriority: ticket.requestedPriority,
        itPriority: ticket.itPriority,
        currentStatus: ticket.currentStatus,
        owner: ticket.owner,
        updatedAt: ticket.updatedAt,
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize),
      },
      query: { search: query.search, sort: query.sort, order: query.order },
    });
  } catch (error) {
    console.error("GET /api/tickets failed:", error);
    return sendError(res, 500, "TICKET_LIST_FAILED", "Unable to load Tickets. Please try again.");
  }
});

ticketsRouter.post("/", async (req, res) => {
  try {
    const requesterId = await requireActiveRequester(req, res);
    if (!requesterId) return;

    const parsed = createTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error),
      );
    }

    const existing = await getPrisma().ticket.findUnique({
      where: {
        requesterId_submissionToken: {
          requesterId,
          submissionToken: parsed.data.submissionToken,
        },
      },
      include: ticketInclude,
    });
    if (existing) return res.status(200).json({ ticket: serializeTicket(existing), replayed: true });

    const [category, relatedSystem] = await Promise.all([
      getPrisma().category.findFirst({ where: { id: parsed.data.categoryId, isActive: true }, select: { id: true } }),
      getPrisma().relatedSystem.findFirst({ where: { id: parsed.data.relatedSystemId, isActive: true }, select: { id: true } }),
    ]);
    const referenceErrors: Record<string, string> = {};
    if (!category) referenceErrors.categoryId = "Select an active Category.";
    if (!relatedSystem) referenceErrors.relatedSystemId = "Select an active Related System.";
    if (Object.keys(referenceErrors).length) {
      return sendError(res, 400, "VALIDATION_ERROR", "Please correct the highlighted fields.", referenceErrors);
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const ticket = await getPrisma().ticket.create({
          data: {
            ...parsed.data,
            requesterId,
            itPriority: parsed.data.requestedPriority,
            ticketNumber: generateTicketNumber(),
          },
          include: ticketInclude,
        });
        return res.status(201).json({ ticket: serializeTicket(ticket), replayed: false });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
        const replay = await getPrisma().ticket.findUnique({
          where: {
            requesterId_submissionToken: {
              requesterId,
              submissionToken: parsed.data.submissionToken,
            },
          },
          include: ticketInclude,
        });
        if (replay) return res.status(200).json({ ticket: serializeTicket(replay), replayed: true });
      }
    }

    return sendError(res, 409, "TICKET_NUMBER_CONFLICT", "Unable to allocate a unique Ticket Number. Please retry.");
  } catch (error) {
    console.error("POST /api/tickets failed:", error);
    return sendError(res, 500, "TICKET_CREATE_FAILED", "Unable to create the Ticket. Please try again.");
  }
});

export async function getVisibleTicketDetail(req: Request, res: Response) {
  try {
    const sessionToken = getSessionToken(req);
    let requesterId: number | null = null;
    let canReadAny = false;
    if (sessionToken) {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (user.role === UserRole.REQUESTER) requesterId = user.id;
      else if (user.role === UserRole.IT_STAFF || user.role === UserRole.ADMINISTRATOR) canReadAny = true;
      else return sendError(res, 403, "FORBIDDEN", "You are not permitted to view this Ticket.");
    } else {
      requesterId = await requireActiveRequester(req, res);
      if (!requesterId) return;
    }
    const ticketId = pathId(req.params.ticketId);
    if (!ticketId) return sendError(res, 400, "INVALID_PATH", "Ticket ID must be a positive integer.");

    const ticket = await getPrisma().ticket.findFirst({
      where: canReadAny ? { id: ticketId } : { id: ticketId, requesterId: requesterId! },
      include: {
        ...ticketInclude,
        attachments: { select: attachmentMetadataSelect, orderBy: [{ uploadedAt: "desc" }, { id: "desc" }] },
        comments: {
          include: { author: { select: { id: true, name: true, role: true } } },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
        ...(canReadAny ? {
          internalNotes: {
            include: { author: { select: { id: true, name: true, role: true } } },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          },
        } : {}),
      },
    });
    if (!ticket) return sendError(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
    const payload = {
      ...serializeTicket(ticket),
      attachments: activeFirst(ticket.attachments).map(serializeAttachment),
      comments: ticket.comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        body: comment.content,
        author: comment.author,
        createdAt: comment.createdAt,
      })),
      ...(canReadAny ? {
        internalNotes: (ticket as unknown as { internalNotes: Array<{ id: number; content: string; author: { id: number; name: string; role: UserRole }; createdAt: Date }> }).internalNotes.map((note) => ({ id: note.id, content: note.content, body: note.content, author: note.author, createdAt: note.createdAt })),
      } : {}),
    };
    return res.status(200).json({ ticket: payload, ...payload, publicComments: payload.comments });
  } catch (error) {
    console.error("GET /api/tickets/:ticketId failed:", error);
    return sendError(res, 500, "TICKET_DETAIL_FAILED", "Unable to load the Ticket. Please try again.");
  }
}

ticketsRouter.get("/:ticketId", getVisibleTicketDetail);

// A Requester can report that the issue appears resolved. This is deliberately
// separate from the formal status workflow, which remains an IT Staff action.
const resolutionIndicationSchema = z.object({
  appearsResolved: z.literal(true),
});

for (const route of ["/:ticketId/resolution-indication", "/:ticketId/problem-appears-resolved", "/:ticketId/appears-resolved", "/:ticketId/requester-resolved"]) {
  ticketsRouter.post(route, async (req, res) => {
    try {
      // Resolution indication is a Lab 3 authenticated action. Keep the
      // temporary requester header confined to the Lab 2 Ticket/Attachment
      // compatibility routes.
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (user.role !== UserRole.REQUESTER) return sendError(res, 403, "FORBIDDEN", "Only Requesters can indicate resolution.");
      const requesterId = user.id;
      const ticketId = pathId(req.params.ticketId);
      if (!ticketId) return sendError(res, 400, "INVALID_PATH", "Ticket ID must be a positive integer.");
      const parsed = resolutionIndicationSchema.safeParse(req.body);
      if (!parsed.success) return sendError(res, 400, "VALIDATION_ERROR", "Confirm that the problem appears resolved.", { appearsResolved: "Set appearsResolved to true." });
      const owned = await getPrisma().ticket.findFirst({ where: { id: ticketId, requesterId }, select: { id: true, currentStatus: true, requesterResolutionIndicatedAt: true, requesterMarkedResolved: true, requesterResolvedAt: true } });
      if (!owned) return sendError(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
      if (owned.requesterResolutionIndicatedAt || owned.requesterMarkedResolved || owned.requesterResolvedAt) {
        return sendError(res, 409, "RESOLUTION_ALREADY_INDICATED", "This Ticket was already marked as appearing resolved.");
      }
      if (["RESOLVED", "CLOSED", "CANCELLED"].includes(owned.currentStatus)) {
        return sendError(res, 409, "RESOLUTION_NOT_AVAILABLE", "A terminal Ticket cannot receive a new resolution indication.");
      }
      const indicatedAt = new Date();
      const ticket = await getPrisma().ticket.update({
        where: { id: ticketId },
        data: { requesterMarkedResolved: true, requesterResolvedAt: indicatedAt, requesterResolutionIndicatedAt: indicatedAt },
        include: {
          ...ticketInclude,
          comments: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
          attachments: { select: attachmentMetadataSelect, orderBy: [{ uploadedAt: "desc" }, { id: "desc" }] },
        },
      });
      const payload = {
        ...serializeTicket(ticket),
        attachments: activeFirst(ticket.attachments).map(serializeAttachment),
        comments: ticket.comments.map((comment) => ({ id: comment.id, content: comment.content, body: comment.content, author: comment.author, createdAt: comment.createdAt })),
      };
      return res.status(200).json({ ticket: payload, ...payload, publicComments: payload.comments });
    } catch (error) {
      console.error("POST requester resolved marker failed:", error);
      return sendError(res, 500, "TICKET_UPDATE_FAILED", "Unable to update the Ticket. Please try again.");
    }
  });
}

ticketsRouter.get("/:ticketId/attachments", async (req, res) => {
  try {
    const sessionToken = getSessionToken(req);
    let requesterId: number | null = null;
    let canReadAny = false;
    if (sessionToken) {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (user.role === UserRole.REQUESTER) requesterId = user.id;
      else if (user.role === UserRole.IT_STAFF || user.role === UserRole.ADMINISTRATOR) canReadAny = true;
      else return sendError(res, 403, "FORBIDDEN", "You are not permitted to view these Attachments.");
    } else {
      requesterId = await requireActiveRequester(req, res);
      if (!requesterId) return;
    }
    const ticketId = pathId(req.params.ticketId);
    if (!ticketId) return sendError(res, 400, "INVALID_PATH", "Ticket ID must be a positive integer.");
    const ticket = await getPrisma().ticket.findFirst({
      where: canReadAny ? { id: ticketId } : { id: ticketId, requesterId: requesterId! },
      select: { attachments: { select: attachmentMetadataSelect, orderBy: [{ uploadedAt: "desc" }, { id: "desc" }] } },
    });
    if (!ticket) return sendError(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
    return res.status(200).json(activeFirst(ticket.attachments).map(serializeAttachment));
  } catch (error) {
    console.error("GET /api/tickets/:ticketId/attachments failed:", error);
    return sendError(res, 500, "ATTACHMENT_LIST_FAILED", "Unable to load Attachments. Please try again.");
  }
});

ticketsRouter.post("/:ticketId/attachments", async (req, res) => {
  try {
    const requesterId = await requireActiveRequester(req, res);
    if (!requesterId) return;
    const ticketId = pathId(req.params.ticketId);
    if (!ticketId) return sendError(res, 400, "INVALID_PATH", "Ticket ID must be a positive integer.");

    const owned = await getPrisma().ticket.findFirst({ where: { id: ticketId, requesterId }, select: { id: true } });
    if (!owned) return sendError(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");

    try {
      await receiveOneAttachment(req, res);
    } catch (error) {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return sendError(res, 413, "FILE_TOO_LARGE", "Each Attachment must be 5 MB or smaller.");
      }
      if (error instanceof multer.MulterError) {
        return sendError(res, 400, "INVALID_UPLOAD", "Upload exactly one file using the field named file.");
      }
      throw error;
    }
    if (!req.file || Object.keys(req.body).length > 0) {
      return sendError(res, 400, "INVALID_UPLOAD", "Upload exactly one file using the field named file.");
    }

    const checked = await validateAttachment(req.file);
    if (!checked.success) return sendError(res, 415, "UNSUPPORTED_FILE_TYPE", checked.message);

    const attachment = await getPrisma().$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${BigInt(ticketId)})`;
      const stillOwned = await transaction.ticket.findFirst({ where: { id: ticketId, requesterId }, select: { id: true } });
      if (!stillOwned) throw new AttachmentRouteError(404, "RESOURCE_NOT_FOUND", "Ticket not found.");
      const activeCount = await transaction.attachment.count({ where: { ticketId, removedAt: null } });
      if (activeCount >= 5) throw new AttachmentRouteError(409, "ATTACHMENT_LIMIT_REACHED", "A Ticket can have at most five active Attachments.");
      return transaction.attachment.create({
        data: {
          ticketId,
          originalName: checked.data.originalName,
          mimeType: checked.data.mimeType,
          sizeBytes: req.file!.size,
          content: req.file!.buffer,
        },
        select: attachmentMetadataSelect,
      });
    });
    return res.status(201).json({ attachment: serializeAttachment(attachment) });
  } catch (error) {
    if (error instanceof AttachmentRouteError) return sendError(res, error.status, error.code, error.message);
    console.error("POST /api/tickets/:ticketId/attachments failed:", error);
    return sendError(res, 500, "ATTACHMENT_UPLOAD_FAILED", "Unable to upload the Attachment. Please try again.");
  }
});
