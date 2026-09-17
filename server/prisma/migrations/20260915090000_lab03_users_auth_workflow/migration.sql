-- Lab 3 migration: preserve DevelopmentRequester IDs and all existing Ticket and
-- Attachment rows while evolving the identity table into User.

CREATE TYPE "UserRole" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

ALTER TABLE "DevelopmentRequester" RENAME TO "User";
ALTER INDEX "DevelopmentRequester_email_key" RENAME TO "User_email_key";
ALTER TABLE "User" RENAME CONSTRAINT "DevelopmentRequester_pkey" TO "User_pkey";

ALTER TABLE "User"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'REQUESTER',
  ADD COLUMN "passwordHash" VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Existing Lab 2 identities have no credential. Seed (or an Administrator) must
-- issue their first password, and the first-login flag keeps them out of normal
-- application routes until that happens.
UPDATE "User" SET "mustChangePassword" = true WHERE "passwordHash" = '';

-- Expand the status enum without rewriting Ticket rows. Existing NEW values are
-- valid in the replacement enum, so requester ownership and IDs stay intact.
ALTER TABLE "Ticket" ALTER COLUMN "currentStatus" DROP DEFAULT;
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED');
ALTER TABLE "Ticket"
  ALTER COLUMN "currentStatus" TYPE "TicketStatus" USING "currentStatus"::text::"TicketStatus",
  ALTER COLUMN "currentStatus" SET DEFAULT 'NEW';
DROP TYPE "TicketStatus_old";

ALTER TABLE "Ticket"
  ADD COLUMN "ownerId" INTEGER,
  ADD COLUMN "itPriority" "RequestedPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "requesterMarkedResolved" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requesterResolvedAt" TIMESTAMP(3),
  ADD COLUMN "requesterResolutionIndicatedAt" TIMESTAMP(3);
UPDATE "Ticket" SET "itPriority" = "requestedPriority";

-- Existing foreign keys followed the renamed table automatically. Add the new
-- optional staff-owner relationship and retain SetNull semantics on deactivation.
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");
CREATE INDEX "User_name_idx" ON "User"("name");
CREATE INDEX "Ticket_currentStatus_itPriority_updatedAt_idx" ON "Ticket"("currentStatus", "itPriority", "updatedAt");
CREATE INDEX "Ticket_ownerId_currentStatus_idx" ON "Ticket"("ownerId", "currentStatus");

CREATE TABLE "Session" (
    "id" VARCHAR(32) NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PublicComment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PublicComment_ticketId_createdAt_id_idx" ON "PublicComment"("ticketId", "createdAt", "id");
CREATE INDEX "PublicComment_authorId_idx" ON "PublicComment"("authorId");
ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "InternalNote" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InternalNote_ticketId_createdAt_id_idx" ON "InternalNote"("ticketId", "createdAt", "id");
CREATE INDEX "InternalNote_authorId_idx" ON "InternalNote"("authorId");
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
