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
  const workflowFixture = await prisma.ticket.findUnique({ where: { ticketNumber: "TKT-20261004-E2E00001" }, select: { id: true } });
  if (workflowFixture) {
    await prisma.actionTaken.deleteMany({ where: { ticketId: workflowFixture.id } });
    await prisma.ticket.update({ where: { id: workflowFixture.id }, data: { currentStatus: "NEW", ownerId: null, cancellationReason: null } });
  }
  console.log(`Prepared ${databaseName}: removed ${deleted.count} prior E2E Tickets and reset the Lab 4 workflow fixture.`);
} finally {
  await prisma.$disconnect();
}
