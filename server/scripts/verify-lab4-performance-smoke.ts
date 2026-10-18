import { randomUUID } from "node:crypto";
import { ActionTakenStatus, RequestedPriority, TicketStatus } from "@prisma/client";
import { getPrisma } from "../src/prisma.js";

const FIXTURE_TICKET_COUNT = 240;
const QUERY_BUDGET_MS = 5_000;
const OPEN_STATUSES = [TicketStatus.NEW, TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.REOPENED];
const ACTIVE_ACTION_STATUSES = [ActionTakenStatus.PLANNED, ActionTakenStatus.IN_PROGRESS];
const ALL_STATUSES = Object.values(TicketStatus);

function requireDisposableDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl || !testDatabaseUrl) throw new Error("Both DATABASE_URL and TEST_DATABASE_URL are required.");
  const configured = new URL(databaseUrl);
  const test = new URL(testDatabaseUrl);
  const host = configured.hostname.toLowerCase();
  if (configured.href !== test.href || !["localhost", "127.0.0.1", "::1"].includes(host) || !configured.pathname.toLowerCase().includes("_test")) {
    throw new Error("Refusing to create smoke fixtures unless both URLs point to the same local *_test database.");
  }
}

function assertOrdered<T>(values: T[], compare: (left: T, right: T) => number, label: string) {
  for (let index = 1; index < values.length; index += 1) {
    if (compare(values[index - 1], values[index]) > 0) throw new Error(`${label} query returned rows in the wrong order.`);
  }
}

async function main() {
  requireDisposableDatabase();
  const prisma = getPrisma();
  const tag = randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  const prefix = `TKT-SM-${tag}-`;
  const now = new Date();
  const recentTime = new Date(now.getTime() - 60_000);

  try {
    const summary = await prisma.$transaction(async (tx) => {
      const requester = await tx.user.findUniqueOrThrow({ where: { email: "ananda.k@example.edu" }, select: { id: true } });
      const staff = await tx.user.findUniqueOrThrow({ where: { email: "krit.staff@example.edu" }, select: { id: true } });
      const category = await tx.category.findUniqueOrThrow({ where: { name: "Hardware" }, select: { id: true } });
      const relatedSystem = await tx.relatedSystem.findUniqueOrThrow({ where: { name: "Corporate Laptop" }, select: { id: true } });
      const tickets = Array.from({ length: FIXTURE_TICKET_COUNT }, (_, index) => ({
        ticketNumber: `${prefix}${String(index).padStart(3, "0")}`,
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        ownerId: index % 3 === 0 ? null : staff.id,
        summary: `Lab 4 performance smoke ${index}`,
        description: "Disposable query-performance smoke fixture.",
        requestedPriority: index % 4 === 0 ? RequestedPriority.URGENT : RequestedPriority.MEDIUM,
        itPriority: index % 4 === 0 ? RequestedPriority.URGENT : index % 4 === 1 ? RequestedPriority.HIGH : RequestedPriority.MEDIUM,
        currentStatus: ALL_STATUSES[index % ALL_STATUSES.length],
        submissionToken: randomUUID(),
        createdAt: recentTime,
        updatedAt: recentTime,
      }));
      await tx.ticket.createMany({ data: tickets });
      const insertedTickets = await tx.ticket.findMany({
        where: { ticketNumber: { startsWith: prefix } },
        select: { id: true, ticketNumber: true, currentStatus: true, ownerId: true, itPriority: true, updatedAt: true },
        orderBy: { ticketNumber: "asc" },
      });
      if (insertedTickets.length !== FIXTURE_TICKET_COUNT) throw new Error(`Expected ${FIXTURE_TICKET_COUNT} smoke Tickets; created ${insertedTickets.length}.`);

      const actionAt = new Date(now.getTime() - 30_000);
      const actions = insertedTickets.flatMap((ticket, ticketIndex) => [0, 1, 2].map((ordinal) => ({
        ticketId: ticket.id,
        actionAt,
        description: `Smoke Action ${ticketIndex}-${ordinal}`,
        result: null,
        performedByUserId: staff.id,
        assigneeUserId: staff.id,
        status: ordinal === 0 ? ActionTakenStatus.PLANNED : ordinal === 1 ? ActionTakenStatus.IN_PROGRESS : ActionTakenStatus.COMPLETED,
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
      })));
      await tx.actionTaken.createMany({ data: actions });

      const requesterId = requester.id;
      const staffId = staff.id;
      async function queryDashboardBundles() {
        const started = performance.now();
        const [openTickets, waitingForMe, recentUpdated, recentResolved, unassignedOpenTickets, myOpenTickets, highUrgentOpenTickets, myActiveActionCount, groupedStatuses, urgentTickets, myActiveActions, orderedActions] = await Promise.all([
          tx.ticket.count({ where: { requesterId, currentStatus: { in: OPEN_STATUSES } } }),
          tx.ticket.count({ where: { requesterId, currentStatus: TicketStatus.WAITING_FOR_REQUESTER } }),
          tx.ticket.findMany({
            where: { requesterId, updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), lte: now } },
            select: { id: true, ticketNumber: true, summary: true, currentStatus: true, updatedAt: true },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            take: 5,
          }),
          tx.ticket.findMany({
            where: { requesterId, currentStatus: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] }, updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), lte: now } },
            select: { id: true, ticketNumber: true, summary: true, currentStatus: true, updatedAt: true },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            take: 5,
          }),
          tx.ticket.count({ where: { currentStatus: { in: OPEN_STATUSES }, ownerId: null } }),
          tx.ticket.count({ where: { currentStatus: { in: OPEN_STATUSES }, ownerId: staffId } }),
          tx.ticket.count({ where: { currentStatus: { in: OPEN_STATUSES }, itPriority: { in: [RequestedPriority.HIGH, RequestedPriority.URGENT] } } }),
          tx.actionTaken.count({ where: { assigneeUserId: staffId, status: { in: ACTIVE_ACTION_STATUSES } } }),
          tx.ticket.groupBy({ by: ["currentStatus"], _count: { _all: true } }),
          tx.ticket.findMany({
            where: { currentStatus: { in: OPEN_STATUSES }, itPriority: { in: [RequestedPriority.HIGH, RequestedPriority.URGENT] } },
            select: { id: true, ticketNumber: true, summary: true, currentStatus: true, itPriority: true, updatedAt: true },
            orderBy: [{ itPriority: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
            take: 5,
          }),
          tx.actionTaken.findMany({
            where: { assigneeUserId: staffId, status: { in: ACTIVE_ACTION_STATUSES } },
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
          tx.actionTaken.findMany({
            where: { ticketId: insertedTickets[0].id },
            include: {
              performedBy: { select: { id: true, name: true } },
              assignee: { select: { id: true, name: true } },
            },
            orderBy: [{ actionAt: "asc" }, { id: "asc" }],
          }),
        ]);
        const elapsedMs = performance.now() - started;
        if (openTickets < FIXTURE_TICKET_COUNT / 2 || waitingForMe < 1) throw new Error("Requester dashboard fixture metrics were incomplete.");
        if (recentUpdated.length !== 5 || recentResolved.length !== 5) throw new Error("Requester dashboard list cap or resolution filter did not return five fixture rows.");
        if (unassignedOpenTickets < 1 || myOpenTickets < 1 || highUrgentOpenTickets < 1 || myActiveActionCount < 1) throw new Error("Staff dashboard fixture metrics were incomplete.");
        if (groupedStatuses.length !== ALL_STATUSES.length || urgentTickets.length !== 5 || myActiveActions.length !== 5) throw new Error("Staff dashboard status groups or bounded lists were incomplete.");
        if (orderedActions.length !== 3) throw new Error("Ordered Action query did not return all three fixture Actions.");
        assertOrdered(recentUpdated, (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || b.id - a.id, "Requester recent Tickets");
        assertOrdered(urgentTickets, (a, b) => b.itPriority.localeCompare(a.itPriority) || b.updatedAt.getTime() - a.updatedAt.getTime() || b.id - a.id, "Staff urgent Tickets");
        assertOrdered(myActiveActions, (a, b) => a.actionAt.getTime() - b.actionAt.getTime() || a.id - b.id, "Staff active Actions");
        assertOrdered(orderedActions, (a, b) => a.actionAt.getTime() - b.actionAt.getTime() || a.id - b.id, "Ticket Actions");
        return elapsedMs;
      }

      await queryDashboardBundles(); // warm cache/connection before timing
      const timings = [await queryDashboardBundles(), await queryDashboardBundles(), await queryDashboardBundles()];
      const maxMs = Math.max(...timings);
      if (maxMs > QUERY_BUDGET_MS) throw new Error(`Dashboard and ordered Action query bundle took ${maxMs.toFixed(1)} ms; budget is ${QUERY_BUDGET_MS} ms.`);

      const fixtureIds = insertedTickets.map(({ id }) => id);
      const deletedActions = await tx.actionTaken.deleteMany({ where: { ticketId: { in: fixtureIds } } });
      const deletedTickets = await tx.ticket.deleteMany({ where: { id: { in: fixtureIds } } });
      if (deletedActions.count !== FIXTURE_TICKET_COUNT * 3 || deletedTickets.count !== FIXTURE_TICKET_COUNT) {
        throw new Error(`Smoke cleanup removed ${deletedTickets.count} Tickets and ${deletedActions.count} Actions; expected ${FIXTURE_TICKET_COUNT} and ${FIXTURE_TICKET_COUNT * 3}.`);
      }
      return { fixtureTickets: FIXTURE_TICKET_COUNT, fixtureActions: actions.length, timingsMs: timings.map((value) => Number(value.toFixed(1))), budgetMs: QUERY_BUDGET_MS };
    }, { timeout: 60_000, maxWait: 10_000 });
    console.log(`Lab 4 performance smoke passed: ${JSON.stringify(summary)}. Unique fixtures were removed inside the database transaction.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
