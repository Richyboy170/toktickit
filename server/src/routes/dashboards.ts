import { Prisma, TicketStatus, UserRole } from "@prisma/client";
import { Router } from "express";
import { requireRole } from "../auth-context.js";
import { sendError } from "../http.js";
import { getPrisma } from "../prisma.js";

export const dashboardsRouter = Router();

const OPEN_STATUSES: TicketStatus[] = [
  TicketStatus.NEW,
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_FOR_REQUESTER,
  TicketStatus.REOPENED,
];
const ALL_STATUSES: TicketStatus[] = [
  TicketStatus.NEW,
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_FOR_REQUESTER,
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED,
  TicketStatus.REOPENED,
  TicketStatus.CANCELLED,
];
const ACTIVE_ACTION_STATUSES = ["PLANNED", "IN_PROGRESS"] as const;
const windowStart = (now: Date) => new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

dashboardsRouter.get("/requester/dashboard", async (req, res) => {
  const user = await requireRole(req, res, [UserRole.REQUESTER]);
  if (!user) return;
  const now = new Date();
  const from = windowStart(now);
  try {
    const requester = { requesterId: user.id };
    const [openTickets, waitingForMe, recentlyUpdated, recentlyResolved] = await Promise.all([
      getPrisma().ticket.count({ where: { ...requester, currentStatus: { in: OPEN_STATUSES } } }),
      getPrisma().ticket.count({ where: { ...requester, currentStatus: TicketStatus.WAITING_FOR_REQUESTER } }),
      getPrisma().ticket.findMany({
        where: { ...requester, updatedAt: { gte: from, lte: now } },
        select: { id: true, ticketNumber: true, summary: true, currentStatus: true, updatedAt: true },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 5,
      }),
      getPrisma().ticket.findMany({
        where: { ...requester, currentStatus: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] }, updatedAt: { gte: from, lte: now } },
        select: { id: true, ticketNumber: true, summary: true, currentStatus: true, updatedAt: true },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 5,
      }),
    ]);
    return res.status(200).json({ windowStart: from, metrics: { openTickets, waitingForMe }, recentlyUpdated, recentlyResolved });
  } catch (error) {
    console.error("GET requester dashboard failed:", error);
    return sendError(res, 500, "DASHBOARD_UNAVAILABLE", "Unable to load your dashboard.");
  }
});

dashboardsRouter.get("/staff/dashboard", async (req, res) => {
  const user = await requireRole(req, res, [UserRole.IT_STAFF, UserRole.ADMINISTRATOR]);
  if (!user) return;
  const now = new Date();
  const from = windowStart(now);
  const openWhere: Prisma.TicketWhereInput = { currentStatus: { in: OPEN_STATUSES } };
  try {
    const [
      unassignedOpenTickets,
      myOpenTickets,
      highUrgentOpenTickets,
      myActiveActionCount,
      groupedStatuses,
      urgentTickets,
      myActiveActions,
    ] = await Promise.all([
      getPrisma().ticket.count({ where: { ...openWhere, ownerId: null } }),
      getPrisma().ticket.count({ where: { ...openWhere, ownerId: user.id } }),
      getPrisma().ticket.count({ where: { ...openWhere, itPriority: { in: ["HIGH", "URGENT"] } } }),
      getPrisma().actionTaken.count({ where: { assigneeUserId: user.id, status: { in: [...ACTIVE_ACTION_STATUSES] } } }),
      getPrisma().ticket.groupBy({ by: ["currentStatus"], _count: { _all: true } }),
      getPrisma().ticket.findMany({
        where: { ...openWhere, itPriority: { in: ["HIGH", "URGENT"] } },
        select: { id: true, ticketNumber: true, summary: true, currentStatus: true, itPriority: true, updatedAt: true },
        orderBy: [{ itPriority: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
        take: 5,
      }),
      getPrisma().actionTaken.findMany({
        where: { assigneeUserId: user.id, status: { in: [...ACTIVE_ACTION_STATUSES] } },
        select: {
          id: true,
          ticketId: true,
          ticket: { select: { ticketNumber: true, summary: true } },
          actionAt: true,
          description: true,
          status: true,
        },
        orderBy: [{ actionAt: "asc" }, { id: "asc" }],
        take: 5,
      }),
    ]);
    const ticketsByStatus = Object.fromEntries(ALL_STATUSES.map((status) => [status, 0])) as Record<TicketStatus, number>;
    for (const group of groupedStatuses) ticketsByStatus[group.currentStatus] = group._count._all;
    return res.status(200).json({
      windowStart: from,
      metrics: { unassignedOpenTickets, myOpenTickets, highUrgentOpenTickets, myActiveActions: myActiveActionCount },
      ticketsByStatus,
      urgentTickets,
      myActiveActions,
    });
  } catch (error) {
    console.error("GET staff dashboard failed:", error);
    return sendError(res, 500, "DASHBOARD_UNAVAILABLE", "Unable to load the operations dashboard.");
  }
});
