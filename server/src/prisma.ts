import { PrismaClient, Prisma } from "@prisma/client";

// Lazy singleton: the client is created on first use, not at import time.
// This keeps route modules and tests that don't touch the DB (e.g. /api/health)
// free of database side effects.
type PrismaWithLab2Compatibility = PrismaClient & {
  /**
   * Lab 2 tests and local tooling still refer to the temporary requester
   * delegate. It is an in-process alias for User after the migration, so
   * those callers keep the same IDs and data without a second table.
   */
  developmentRequester: Prisma.UserDelegate;
};

let client: PrismaWithLab2Compatibility | null = null;

export function getPrisma(): PrismaWithLab2Compatibility {
  if (!client) {
    const prisma = new PrismaClient() as PrismaWithLab2Compatibility;
    Object.defineProperty(prisma, "developmentRequester", {
      configurable: false,
      enumerable: false,
      get: () => prisma.user,
    });
    client = prisma;
  }
  return client;
}
