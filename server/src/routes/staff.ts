import { Prisma, TicketStatus, UserRole } from "@prisma/client";
import { Request, Response, Router } from "express";
import { z } from "zod";
import { requireRole } from "../auth-context.js";
import { activeFirst, attachmentMetadataSelect, serializeAttachment } from "../attachment-metadata.js";
import { sendError } from "../http.js";
import { getPrisma } from "../prisma.js";
import { canTransitionStatus, requiresActiveOwner, requiresStatusConfirmation } from "../ticket-workflow.js";
import { zodFieldErrors } from "../ticket-validation.js";

export const staffRouter = Router();

const statusValues = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
const priorityValues = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const queueQuerySchema = z.object({
  search: z.string().trim().max(120, "Search must be at most 120 characters.").optional().default(""),
  categoryId: z.preprocess((value) => (value === undefined || value === "" ? undefined : Number(value)), z.number().int().positive().optional()),
  relatedSystemId: z.preprocess((value) => (value === undefined || value === "" ? undefined : Number(value)), z.number().int().positive().optional()),
  requestedPriority: z.enum(priorityValues).optional(),
  itPriority: z.enum(priorityValues).optional(),
  status: z.enum(statusValues).optional(),
  ownerId: z.union([
    z.literal("unassigned").transform(() => null),
    z.preprocess((value) => (value === undefined || value === "" ? undefined : Number(value)), z.number().int().positive().optional()),
  ]).optional(),
  assignment: z.enum(["assigned", "unassigned"]).optional(),
  unassigned: z.preprocess((value) => value === "true" || value === "1", z.boolean().optional()),
  sort: z.enum(["createdAt", "updatedAt", "ticketNumber", "summary", "requestedPriority", "itPriority", "currentStatus", "owner"]).optional().default("updatedAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.preprocess((value) => (value === undefined || value === "" ? 1 : Number(value)), z.number().int().positive()),
  pageSize: z.preprocess((value) => (value === undefined || value === "" ? 20 : Number(value)), z.number().refine((value) => [10, 20, 50].includes(value), "Page size must be 10, 20, or 50.")),
});

type QueueQuery = z.infer<typeof queueQuerySchema>;

const ticketInclude = {
  requester: { select: { id: true, name: true, email: true, role: true } },
  owner: { select: { id: true, name: true, email: true, role: true, isActive: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
} satisfies Prisma.TicketInclude;

const staffDetailInclude = {
  ...ticketInclude,
  attachments: { select: attachmentMetadataSelect, orderBy: [{ uploadedAt: "desc" }, { id: "desc" }] },
  comments: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
  internalNotes: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
} satisfies Prisma.TicketInclude;

function pathId(raw: string): number | null {
  if (!/^\d+$/.test(raw) || Number(raw) <= 0 || !Number.isSafeInteger(Number(raw))) return null;
  return Number(raw);
}

function normalizeStatus(value: unknown): TicketStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(/[ -]+/g, "_");
  return (statusValues as readonly string[]).includes(normalized) ? normalized as TicketStatus : null;
}

function normalizePriority(value: unknown): (typeof priorityValues)[number] | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return (priorityValues as readonly string[]).includes(normalized) ? normalized as (typeof priorityValues)[number] : null;
}

function orderBy(query: QueueQuery): Prisma.TicketOrderByWithRelationInput[] {
  const primary = query.sort === "owner"
    ? { owner: { name: query.order } }
    : { [query.sort]: query.order } as Prisma.TicketOrderByWithRelationInput;
  return [primary, { id: query.order }];
}

function serializeTicket(ticket: Prisma.TicketGetPayload<{ include: typeof ticketInclude }>) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    ticketDate: ticket.createdAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    requester: ticket.requester,
    owner: ticket.owner,
    category: ticket.category,
    relatedSystem: ticket.relatedSystem,
    summary: ticket.summary,
    description: ticket.description,
    requestedPriority: ticket.requestedPriority,
    itPriority: ticket.itPriority,
    currentStatus: ticket.currentStatus,
    requesterMarkedResolved: ticket.requesterMarkedResolved,
    requesterResolvedAt: ticket.requesterResolvedAt,
    requesterResolutionIndicatedAt: ticket.requesterResolutionIndicatedAt ?? ticket.requesterResolvedAt,
  };
}

function parseTicketId(req: Request, res: Response): number | null {
  const ticketId = pathId(req.params.ticketId);
  if (!ticketId) {
    sendError(res, 400, "INVALID_PATH", "Ticket ID must be a positive integer.");
    return null;
  }
  return ticketId;
}

async function staffUser(req: Request, res: Response) {
  return requireRole(req, res, [UserRole.IT_STAFF]);
}

async function priorityUser(req: Request, res: Response) {
  // The approved review explicitly permits Administrators to correct IT
  // Priority while keeping assignment and status operations Staff-only.
  return requireRole(req, res, [UserRole.IT_STAFF, UserRole.ADMINISTRATOR]);
}

staffRouter.get("/tickets", async (req, res) => {
  const user = await staffUser(req, res);
  if (!user) return;
  const parsed = queueQuerySchema.safeParse(req.query);
  if (!parsed.success) return sendError(res, 400, "INVALID_QUERY", "Please correct the Ticket Queue parameters.", zodFieldErrors(parsed.error));
  const query = parsed.data;
  const where: Prisma.TicketWhereInput = {
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.relatedSystemId ? { relatedSystemId: query.relatedSystemId } : {}),
    ...(query.requestedPriority ? { requestedPriority: query.requestedPriority } : {}),
    ...(query.itPriority ? { itPriority: query.itPriority } : {}),
    ...(query.status ? { currentStatus: query.status } : {}),
    ...(query.ownerId === null || query.unassigned || query.assignment === "unassigned"
      ? { ownerId: null }
      : query.assignment === "assigned"
        ? { ownerId: { not: null } }
        : query.ownerId !== undefined ? { ownerId: query.ownerId } : {}),
    ...(query.search ? {
      OR: [
        { ticketNumber: { contains: query.search, mode: "insensitive" } },
        { summary: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { requester: { name: { contains: query.search, mode: "insensitive" } } },
        { requester: { email: { contains: query.search, mode: "insensitive" } } },
      ],
    } : {}),
  };
  try {
    const [totalItems, tickets] = await getPrisma().$transaction([
      getPrisma().ticket.count({ where }),
      getPrisma().ticket.findMany({ where, include: ticketInclude, orderBy: orderBy(query), skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    ]);
    const items = tickets.map((ticket) => serializeTicket(ticket));
    return res.status(200).json({
      items,
      tickets: items,
      pagination: { page: query.page, pageSize: query.pageSize, totalItems, totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize) },
      query,
    });
  } catch (error) {
    console.error("GET staff Ticket Queue failed:", error);
    return sendError(res, 500, "QUEUE_UNAVAILABLE", "Unable to load the Ticket Queue.");
  }
});

staffRouter.get("/users", async (req, res) => {
  const user = await staffUser(req, res);
  if (!user) return;
  try {
    const users = await getPrisma().user.findMany({
      where: { isActive: true, role: { in: [UserRole.IT_STAFF, UserRole.ADMINISTRATOR] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return res.status(200).json(users);
  } catch (error) {
    console.error("GET staff users failed:", error);
    return sendError(res, 500, "STAFF_USERS_UNAVAILABLE", "Unable to load Staff assignment users.");
  }
});

staffRouter.get("/tickets/:ticketId", async (req, res) => {
  const user = await staffUser(req, res);
  if (!user) return;
  const ticketId = parseTicketId(req, res);
  if (!ticketId) return;
  try {
    const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId }, include: staffDetailInclude });
    if (!ticket) return sendError(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
    const payload = {
      ...serializeTicket(ticket),
      attachments: activeFirst(ticket.attachments).map(serializeAttachment),
      comments: ticket.comments.map((comment) => ({ id: comment.id, content: comment.content, body: comment.content, author: comment.author, createdAt: comment.createdAt })),
      internalNotes: ticket.internalNotes.map((note) => ({ id: note.id, content: note.content, body: note.content, author: note.author, createdAt: note.createdAt })),
    };
    return res.status(200).json({ ticket: payload, ...payload, publicComments: payload.comments, internalNotes: payload.internalNotes });
  } catch (error) {
    console.error("GET staff Ticket detail failed:", error);
    return sendError(res, 500, "TICKET_DETAIL_UNAVAILABLE", "Unable to load the Ticket.");
  }
});

async function updateOwner(req: Request, res: Response, claimCurrentUser = false) {
  const user = await staffUser(req, res);
  if (!user) return;
  const ticketId = parseTicketId(req, res);
  if (!ticketId) return;
  let ownerId: number | null = user.id;
  if (!claimCurrentUser) {
    const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
    if (body.claim === true && Object.prototype.hasOwnProperty.call(body, "ownerUserId")) {
      return sendError(res, 400, "VALIDATION_ERROR", "Use either claim or ownerUserId, not both.", { claim: "Choose one assignment action." });
    }
    if (body.claim === true) ownerId = user.id;
    const supplied = body.ownerUserId ?? body.ownerId ?? body.assignedToId ?? body.userId;
    if (body.claim !== true && (supplied === null || supplied === "")) ownerId = null;
    else if (body.claim !== true && supplied !== undefined) {
      if (typeof supplied !== "number" && !(typeof supplied === "string" && /^\d+$/.test(supplied))) return sendError(res, 400, "VALIDATION_ERROR", "Owner ID must be a positive integer.", { ownerId: "Owner ID must be a positive integer." });
      ownerId = Number(supplied);
      if (!Number.isSafeInteger(ownerId) || ownerId <= 0) return sendError(res, 400, "VALIDATION_ERROR", "Owner ID must be a positive integer.", { ownerId: "Owner ID must be a positive integer." });
    }
  }
  try {
    if (ownerId !== null) {
      const owner = await getPrisma().user.findFirst({ where: { id: ownerId, isActive: true, role: { in: [UserRole.IT_STAFF, UserRole.ADMINISTRATOR] } }, select: { id: true } });
      if (!owner) return sendError(res, 400, "INVALID_OWNER", "Ticket Owner must be an active IT Staff or Administrator.");
    }
    const existing = await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true, ownerId: true } });
    if (!existing) return sendError(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
    if (existing.ownerId === ownerId) return sendError(res, 409, "ASSIGNMENT_UNCHANGED", "Ticket ownership is already set to that User.");
    const ticket = await getPrisma().ticket.update({ where: { id: ticketId }, data: { ownerId }, include: ticketInclude });
    return res.status(200).json({ ticket: serializeTicket(ticket) });
  } catch (error) {
    console.error("Ticket owner update failed:", error);
    return sendError(res, 500, "TICKET_ASSIGNMENT_FAILED", "Unable to update Ticket ownership.");
  }
}

staffRouter.post("/tickets/:ticketId/claim", (req, res) => updateOwner(req, res, true));
staffRouter.patch("/tickets/:ticketId/assignment", (req, res) => updateOwner(req, res));
staffRouter.put("/tickets/:ticketId/assignment", (req, res) => updateOwner(req, res));
staffRouter.patch("/tickets/:ticketId/owner", (req, res) => updateOwner(req, res));

export async function updateTicketPriority(req: Request, res: Response) {
  const user = await priorityUser(req, res);
  if (!user) return;
  const ticketId = parseTicketId(req, res);
  if (!ticketId) return;
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const priority = normalizePriority(body.itPriority ?? body.priority);
  if (!priority) return sendError(res, 400, "VALIDATION_ERROR", "Select a valid IT Priority.", { itPriority: "Select a valid IT Priority." });
  try {
    const existing = await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true, itPriority: true } });
    if (!existing) return sendError(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
    if (existing.itPriority === priority) return sendError(res, 409, "PRIORITY_UNCHANGED", "IT Priority is already set to that value.");
    const ticket = await getPrisma().ticket.update({ where: { id: ticketId }, data: { itPriority: priority }, include: ticketInclude });
    return res.status(200).json({ ticket: serializeTicket(ticket) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return sendError(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
    console.error("Ticket IT Priority update failed:", error);
    return sendError(res, 500, "TICKET_PRIORITY_UPDATE_FAILED", "Unable to update IT Priority.");
  }
}

staffRouter.patch("/tickets/:ticketId/it-priority", updateTicketPriority);
staffRouter.put("/tickets/:ticketId/it-priority", updateTicketPriority);
staffRouter.patch("/tickets/:ticketId/priority", updateTicketPriority);

async function updateStatus(req: Request, res: Response) {
  const user = await staffUser(req, res);
  if (!user) return;
  const ticketId = parseTicketId(req, res);
  if (!ticketId) return;
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const status = normalizeStatus(body.status ?? body.currentStatus);
  if (!status) return sendError(res, 400, "VALIDATION_ERROR", "Select a valid Ticket Status.", { status: "Select a valid Ticket Status." });
  if (requiresStatusConfirmation(status) && body.confirm !== true) {
    return sendError(res, 409, "STATUS_CONFIRMATION_REQUIRED", "Confirm this consequential Ticket status change.", { confirm: "Confirmation is required for this status." });
  }
  try {
    const existing = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      select: { currentStatus: true, owner: { select: { id: true, isActive: true } } },
    });
    if (!existing) return sendError(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
    if (existing.currentStatus === status) return sendError(res, 409, "STATUS_UNCHANGED", "Ticket status is already set to that value.");
    if (!canTransitionStatus(existing.currentStatus, status, user.role)) return sendError(res, 409, "INVALID_STATUS_TRANSITION", "That Ticket status transition is not permitted.");
    if (requiresActiveOwner(status) && (!existing.owner || !existing.owner.isActive)) {
      return sendError(res, 409, "OWNER_REQUIRED", "An active Ticket Owner is required before resolving or closing the Ticket.");
    }
    const ticket = await getPrisma().ticket.update({ where: { id: ticketId }, data: { currentStatus: status }, include: ticketInclude });
    return res.status(200).json({ ticket: serializeTicket(ticket) });
  } catch (error) {
    console.error("Ticket status update failed:", error);
    return sendError(res, 500, "TICKET_STATUS_UPDATE_FAILED", "Unable to update Ticket status.");
  }
}

staffRouter.patch("/tickets/:ticketId/status", updateStatus);
staffRouter.put("/tickets/:ticketId/status", updateStatus);
