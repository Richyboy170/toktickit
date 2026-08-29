import { Prisma } from "@prisma/client";
import { Router } from "express";
import { sendError } from "../http.js";
import { getPrisma } from "../prisma.js";
import { requireActiveRequester } from "../requester-context.js";
import { generateTicketNumber } from "../ticket-number.js";
import { createTicketSchema, zodFieldErrors } from "../ticket-validation.js";

export const ticketsRouter = Router();

const ticketInclude = {
  requester: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
} satisfies Prisma.TicketInclude;

function serializeTicket(ticket: Prisma.TicketGetPayload<{ include: typeof ticketInclude }>) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    ticketDate: ticket.createdAt,
    requester: ticket.requester,
    category: ticket.category,
    relatedSystem: ticket.relatedSystem,
    summary: ticket.summary,
    requestedPriority: ticket.requestedPriority,
    description: ticket.description,
    currentStatus: ticket.currentStatus,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

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
