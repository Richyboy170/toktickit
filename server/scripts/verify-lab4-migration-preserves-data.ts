import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const serverDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const prismaDirectory = join(serverDirectory, "prisma");
const allMigrationsDirectory = join(prismaDirectory, "migrations");
const lab4MigrationName = "20261004090000_lab04_action_taken";
const originalDatabaseUrl = process.env.DATABASE_URL;

if (!originalDatabaseUrl) throw new Error("DATABASE_URL is required for migration preservation verification.");

const schemaName = `lab4_preservation_${Date.now()}`;
const databaseUrl = new URL(originalDatabaseUrl);
databaseUrl.searchParams.set("schema", schemaName);
const temporaryDirectory = mkdtempSync(join(tmpdir(), "toktickit-lab4-preservation-"));
const temporaryPrismaDirectory = join(temporaryDirectory, "prisma");
const oldMigrationsDirectory = join(temporaryPrismaDirectory, "migrations");
const oldSchemaPath = join(temporaryPrismaDirectory, "schema.prisma");
const cliPath = join(serverDirectory, "node_modules", "prisma", "build", "index.js");
const admin = new PrismaClient({ datasources: { db: { url: originalDatabaseUrl } } });
const preservedSchema = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });

function migrate(schemaPath: string) {
  execFileSync(process.execPath, [cliPath, "migrate", "deploy", "--schema", schemaPath], {
    cwd: serverDirectory,
    env: { ...process.env, DATABASE_URL: databaseUrl.toString() },
    stdio: "inherit",
  });
}

function assertEqual<T>(label: string, actual: T, expected: T) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}.`);
}

async function insertLab3Fixture() {
  await preservedSchema.$executeRawUnsafe(`
    INSERT INTO "Category" ("id", "name", "isActive", "createdAt", "updatedAt")
    VALUES (990001, 'Migration Check', true, '2026-10-04T08:00:00Z', '2026-10-04T08:00:00Z');
  `);
  await preservedSchema.$executeRawUnsafe(`
    INSERT INTO "RelatedSystem" ("id", "name", "isActive", "createdAt", "updatedAt")
    VALUES (990001, 'Migration Check System', true, '2026-10-04T08:00:00Z', '2026-10-04T08:00:00Z');
  `);
  await preservedSchema.$executeRawUnsafe(`
    INSERT INTO "User" ("id", "name", "email", "isActive", "role", "passwordHash", "mustChangePassword", "createdAt", "updatedAt")
    VALUES
      (990001, 'Migration Requester', 'migration.requester@example.edu', true, 'REQUESTER', 'legacy-requester-hash', false, '2026-10-04T08:00:00Z', '2026-10-04T08:00:00Z'),
      (990002, 'Migration Staff', 'migration.staff@example.edu', true, 'IT_STAFF', 'legacy-staff-hash', false, '2026-10-04T08:00:00Z', '2026-10-04T08:00:00Z');
  `);
  await preservedSchema.$executeRawUnsafe(`
    INSERT INTO "Ticket" ("id", "ticketNumber", "requesterId", "categoryId", "relatedSystemId", "ownerId", "summary", "description", "requestedPriority", "itPriority", "currentStatus", "submissionToken", "createdAt", "updatedAt")
    VALUES (990001, 'TKT-20261004-MIGR9901', 990001, 990001, 990001, 990002, 'Preserve migration fixture', 'Legacy Lab 3 ticket content must remain unchanged.', 'HIGH', 'URGENT', 'IN_PROGRESS', '99999999-9999-4999-8999-999999999991', '2026-10-04T08:00:00Z', '2026-10-04T08:30:00Z');
  `);
  await preservedSchema.$executeRawUnsafe(`
    INSERT INTO "Attachment" ("id", "ticketId", "originalName", "mimeType", "sizeBytes", "content", "uploadedAt")
    VALUES (990001, 990001, 'legacy-bytes.bin', 'application/octet-stream', 5, decode('00ff102030', 'hex'), '2026-10-04T08:10:00Z');
  `);
  await preservedSchema.$executeRawUnsafe(`
    INSERT INTO "PublicComment" ("id", "ticketId", "authorId", "content", "createdAt")
    VALUES (990001, 990001, 990001, 'Legacy public comment remains.', '2026-10-04T08:15:00Z');
  `);
  await preservedSchema.$executeRawUnsafe(`
    INSERT INTO "InternalNote" ("id", "ticketId", "authorId", "content", "createdAt")
    VALUES (990001, 990001, 990002, 'Legacy internal note remains.', '2026-10-04T08:20:00Z');
  `);
}

async function verifyPreservedRows() {
  const references = await preservedSchema.$queryRawUnsafe<Array<{ categoryName: string; systemName: string }>>(
    `SELECT c."name" AS "categoryName", s."name" AS "systemName" FROM "Ticket" t JOIN "Category" c ON c."id" = t."categoryId" JOIN "RelatedSystem" s ON s."id" = t."relatedSystemId" WHERE t."id" = 990001`,
  );
  assertEqual("Ticket reference row count", references.length, 1);
  assertEqual("Category name", references[0]?.categoryName, "Migration Check");
  assertEqual("Related System name", references[0]?.systemName, "Migration Check System");

  const users = await preservedSchema.$queryRawUnsafe<Array<{ id: number; email: string; role: string; passwordHash: string }>>(
    `SELECT "id", "email", "role"::text AS "role", "passwordHash" FROM "User" WHERE "id" IN (990001, 990002) ORDER BY "id"`,
  );
  assertEqual("User fixture count", users.length, 2);
  assertEqual("Requester ID", users[0]?.id, 990001);
  assertEqual("Requester email", users[0]?.email, "migration.requester@example.edu");
  assertEqual("Requester role", users[0]?.role, "REQUESTER");
  assertEqual("Requester password hash", users[0]?.passwordHash, "legacy-requester-hash");
  assertEqual("Staff role", users[1]?.role, "IT_STAFF");

  const tickets = await preservedSchema.$queryRawUnsafe<Array<{ id: number; requesterId: number; ownerId: number; currentStatus: string; summary: string; cancellationReason: string | null }>>(
    `SELECT "id", "requesterId", "ownerId", "currentStatus"::text AS "currentStatus", "summary", "cancellationReason" FROM "Ticket" WHERE "id" = 990001`,
  );
  assertEqual("Ticket fixture count", tickets.length, 1);
  assertEqual("Ticket ID", tickets[0]?.id, 990001);
  assertEqual("Ticket requester link", tickets[0]?.requesterId, 990001);
  assertEqual("Ticket owner link", tickets[0]?.ownerId, 990002);
  assertEqual("Ticket status", tickets[0]?.currentStatus, "IN_PROGRESS");
  assertEqual("Ticket summary", tickets[0]?.summary, "Preserve migration fixture");
  assertEqual("New cancellation field default", tickets[0]?.cancellationReason, null);

  const attachments = await preservedSchema.$queryRawUnsafe<Array<{ id: number; originalName: string; mimeType: string; sizeBytes: number; content: Uint8Array }>>(
    `SELECT "id", "originalName", "mimeType", "sizeBytes", "content" FROM "Attachment" WHERE "id" = 990001`,
  );
  assertEqual("Attachment fixture count", attachments.length, 1);
  assertEqual("Attachment ID", attachments[0]?.id, 990001);
  assertEqual("Attachment filename", attachments[0]?.originalName, "legacy-bytes.bin");
  assertEqual("Attachment MIME type", attachments[0]?.mimeType, "application/octet-stream");
  assertEqual("Attachment size", attachments[0]?.sizeBytes, 5);
  assertEqual("Attachment bytes", Buffer.from(attachments[0]?.content ?? []).toString("hex"), "00ff102030");

  const comments = await preservedSchema.$queryRawUnsafe<Array<{ id: number; ticketId: number; authorId: number; content: string }>>(
    `SELECT "id", "ticketId", "authorId", "content" FROM "PublicComment" WHERE "id" = 990001`,
  );
  assertEqual("Public Comment count", comments.length, 1);
  assertEqual("Public Comment content", comments[0]?.content, "Legacy public comment remains.");
  assertEqual("Public Comment author", comments[0]?.authorId, 990001);

  const notes = await preservedSchema.$queryRawUnsafe<Array<{ id: number; ticketId: number; authorId: number; content: string }>>(
    `SELECT "id", "ticketId", "authorId", "content" FROM "InternalNote" WHERE "id" = 990001`,
  );
  assertEqual("Internal Note count", notes.length, 1);
  assertEqual("Internal Note content", notes[0]?.content, "Legacy internal note remains.");
  assertEqual("Internal Note author", notes[0]?.authorId, 990002);

  const actions = await preservedSchema.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT count(*) AS "count" FROM "ActionTaken" WHERE "ticketId" = 990001`,
  );
  assertEqual("Synthetic legacy Action count", actions[0]?.count, 0n);
}

async function main() {
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schemaName}"`);
    mkdirSync(temporaryPrismaDirectory, { recursive: true });
    cpSync(allMigrationsDirectory, oldMigrationsDirectory, { recursive: true });
    cpSync(join(prismaDirectory, "schema.prisma"), oldSchemaPath);

    const migrationNames = readdirSync(oldMigrationsDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const lab4Directory = join(oldMigrationsDirectory, lab4MigrationName);
    if (!migrationNames.includes(lab4MigrationName)) throw new Error(`Expected migration ${lab4MigrationName} was not found.`);
    rmSync(lab4Directory, { recursive: true, force: true });

    migrate(oldSchemaPath);
    await insertLab3Fixture();
    migrate(join(prismaDirectory, "schema.prisma"));
    await verifyPreservedRows();
    console.log("Lab 4 migration preserved Lab 3 fixture IDs, ownership, Attachment bytes, Comments, and Notes; no legacy Actions were created.");
  } finally {
    await preservedSchema.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await admin.$disconnect();
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error("Lab 4 migration preservation check failed:", error);
  process.exitCode = 1;
});
