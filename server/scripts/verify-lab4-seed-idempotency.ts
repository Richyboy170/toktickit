import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getPrisma } from "../src/prisma.js";

const execFileAsync = promisify(execFile);
const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CATEGORIES = ["Account and Access", "Hardware", "Software", "Network"];
const RELATED_SYSTEMS = ["Campus Wi-Fi", "Corporate Laptop", "Email", "Grade Submission App", "LEB2 App", "Printer", "VPN"];
const USERS = [
  "ananda.k@example.edu", "chayanee.r@example.edu", "narin.w@example.edu", "pimchanok.s@example.edu",
  "somchai.archive@example.edu", "krit.staff@example.edu", "mali.staff@example.edu", "nok.staff@example.edu",
  "archive.staff@example.edu", "admin@example.edu",
];
const TICKETS = [
  "TKT-20260915-A1B2C3D4", "TKT-20260915-E5F6A7B8", "TKT-20260915-C3D4E5F6", "TKT-20260915-F6A7B8C9",
  "TKT-20260915-D4E5F6A7", "TKT-20260915-A7B8C9D0", "TKT-20260915-B8C9D0E1", "TKT-20260915-C9D0E1F2",
  "TKT-20261004-E2E00001", "TKT-20261004-E2E00002",
];
const ACTIONS = [
  [TICKETS[0], "2026-09-15T03:15:00.000Z", "Checked battery health report"],
  [TICKETS[0], "2026-09-15T04:15:00.000Z", "Prepare replacement battery"],
  [TICKETS[2], "2026-09-16T02:00:00.000Z", "Review VPN connection logs"],
  [TICKETS[3], "2026-09-16T03:00:00.000Z", "Clear and restart printer queue"],
  [TICKETS[4], "2026-09-17T01:00:00.000Z", "Restore mailbox attachment access"],
  [TICKETS[4], "2026-09-17T01:30:00.000Z", "Repeat duplicate mailbox check"],
  [TICKETS[5], "2026-09-17T02:00:00.000Z", "Restore account access"],
  [TICKETS[6], "2026-09-18T01:00:00.000Z", "Recheck grade application validation"],
  [TICKETS[6], "2026-09-18T01:30:00.000Z", "Cancel outdated grade validation check"],
  [TICKETS[7], "2026-09-18T02:00:00.000Z", "Document duplicate software request"],
] as const;

function requireDisposableDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl || !testDatabaseUrl) throw new Error("Both DATABASE_URL and TEST_DATABASE_URL are required.");
  const configured = new URL(databaseUrl);
  const test = new URL(testDatabaseUrl);
  const host = configured.hostname.toLowerCase();
  if (configured.href !== test.href || !["localhost", "127.0.0.1", "::1"].includes(host) || !configured.pathname.toLowerCase().includes("_test")) {
    throw new Error("Refusing to rerun seed unless both URLs point to the same local *_test database.");
  }
}

async function exactlyOneIds(label: string, loadIds: () => Promise<Array<{ id: number }>>) {
  const rows = await loadIds();
  if (rows.length !== 1) throw new Error(`Expected exactly one ${label}; found ${rows.length}.`);
  return rows.map(({ id }) => id);
}

async function snapshotSeedFixtures() {
  const prisma = getPrisma();
  const [categories, systems, users, tickets] = await Promise.all([
    Promise.all(CATEGORIES.map(async (name) => [name, await exactlyOneIds(`category ${name}`, () => prisma.category.findMany({ where: { name }, select: { id: true } }))] as const)),
    Promise.all(RELATED_SYSTEMS.map(async (name) => [name, await exactlyOneIds(`related system ${name}`, () => prisma.relatedSystem.findMany({ where: { name }, select: { id: true } }))] as const)),
    Promise.all(USERS.map(async (email) => [email, await exactlyOneIds(`seed account ${email}`, () => prisma.user.findMany({ where: { email }, select: { id: true } }))] as const)),
    Promise.all(TICKETS.map(async (ticketNumber) => {
      const ids = await exactlyOneIds(`seed Ticket ${ticketNumber}`, () => prisma.ticket.findMany({ where: { ticketNumber }, select: { id: true } }));
      return [ticketNumber, ids] as const;
    })),
  ]);
  const ticketIds = new Map(tickets.map(([ticketNumber, ids]) => [ticketNumber, ids[0]]));
  const actions = await Promise.all(ACTIONS.map(async ([ticketNumber, actionAt, description]) => {
    const ticketId = ticketIds.get(ticketNumber);
    if (!ticketId) throw new Error(`Missing fixture Ticket ${ticketNumber}.`);
    const ids = await exactlyOneIds(`seed Action ${description}`, () => prisma.actionTaken.findMany({
      where: { ticketId, actionAt: new Date(actionAt), description },
      select: { id: true },
    }));
    return [`${ticketNumber}/${actionAt}/${description}`, ids] as const;
  }));
  const childRecordCounts = await Promise.all(TICKETS.map(async (ticketNumber) => {
    const ticketId = ticketIds.get(ticketNumber)!;
    const [comments, notes] = await Promise.all([
      prisma.publicComment.count({ where: { ticketId } }),
      prisma.internalNote.count({ where: { ticketId } }),
    ]);
    return [ticketNumber, { comments, notes }] as const;
  }));
  return { categories, systems, users, tickets, actions, childRecordCounts };
}

async function main() {
  requireDisposableDatabase();
  const prisma = getPrisma();
  try {
    const before = await snapshotSeedFixtures();
    const cli = resolve(serverRoot, "node_modules/tsx/dist/cli.mjs");
    const childEnv = { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL, TEST_DATABASE_URL: process.env.TEST_DATABASE_URL };
    const { stdout, stderr } = await execFileAsync(process.execPath, [cli, "prisma/seed.ts"], {
      cwd: serverRoot,
      env: childEnv,
      maxBuffer: 1024 * 1024,
    });
    if (stdout.trim()) process.stdout.write(stdout);
    if (stderr.trim()) process.stderr.write(stderr);
    const after = await snapshotSeedFixtures();
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      throw new Error("Seed rerun changed fixture counts or identities; inspect the before/after fixture snapshots.");
    }
    console.log(`Lab 4 seed idempotency passed: ${CATEGORIES.length} categories, ${RELATED_SYSTEMS.length} systems, ${USERS.length} users, ${TICKETS.length} Tickets, ${ACTIONS.length} Actions, and child record counts remained stable.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
