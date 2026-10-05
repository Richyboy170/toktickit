import { getPrisma } from "../src/prisma.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E preparation.");

const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
if (!/(test|e2e)/i.test(databaseName)) {
  throw new Error(`Refusing E2E cleanup outside a test database (received ${databaseName}).`);
}

const prisma = getPrisma();
try {
  const requesters = await prisma.developmentRequester.findMany({
    where: { email: { in: ["ananda.k@example.edu", "chayanee.r@example.edu"] } },
    select: { id: true },
  });
  const deleted = await prisma.ticket.deleteMany({ where: { requesterId: { in: requesters.map((item) => item.id) } } });
  const workflowFixtures = await prisma.ticket.findMany({
    where: { ticketNumber: { in: ["TKT-20261004-E2E00001", "TKT-20261004-E2E00002"] } },
    select: { id: true },
  });
  for (const fixture of workflowFixtures) {
    await prisma.actionTaken.deleteMany({ where: { ticketId: fixture.id } });
    await prisma.ticket.update({ where: { id: fixture.id }, data: { currentStatus: "NEW", ownerId: null, cancellationReason: null } });
  }
  console.log(`Prepared ${databaseName}: removed ${deleted.count} prior E2E Tickets and reset ${workflowFixtures.length} Lab 4 workflow fixtures.`);
} finally {
  await prisma.$disconnect();
}
