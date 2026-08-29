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
  console.log(`Prepared ${databaseName}: removed ${deleted.count} prior E2E Tickets.`);
} finally {
  await prisma.$disconnect();
}
