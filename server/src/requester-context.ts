import { Request, Response } from "express";
import { sendError } from "./http.js";
import { UserRole } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import { getSessionToken, legacyRequesterContextEnabled, requireAuthenticatedUser } from "./auth-context.js";

export async function requireActiveRequester(req: Request, res: Response): Promise<number | null> {
  // Keep the Lab 2 contract for callers that have not moved to login yet. A
  // request carrying a session always follows the Lab 3 authentication path.
  const session = getSessionToken(req);
  const legacyEnabled = legacyRequesterContextEnabled();
  const raw = legacyEnabled ? req.header("X-Development-Requester-Id") : null;
  if (!session && !raw) {
    if (!legacyEnabled) {
      // In a normal Lab 3 deployment this is an authenticated resource. The
      // legacy 400 response is retained only for the explicitly enabled Lab 2
      // compatibility fixtures.
      await requireAuthenticatedUser(req, res);
      return null;
    }
    sendError(res, 400, "INVALID_REQUESTER_CONTEXT", "Select a valid Development Requester before continuing.");
    return null;
  }
  if (!session && raw) {
    if (!/^\d+$/.test(raw) || Number(raw) <= 0 || !Number.isSafeInteger(Number(raw))) {
      sendError(res, 400, "INVALID_REQUESTER_CONTEXT", "Select a valid Development Requester before continuing.");
      return null;
    }
    const legacy = await getPrisma().user.findFirst({ where: { id: Number(raw) } });
    if (!legacy || !legacy.isActive || legacy.role !== UserRole.REQUESTER) {
      sendError(res, 403, "REQUESTER_UNAVAILABLE", "The selected Development Requester is no longer available.");
      return null;
    }
    if (legacy.mustChangePassword) {
      sendError(res, 403, "PASSWORD_CHANGE_REQUIRED", "Change your initial password before continuing.");
      return null;
    }
    req.authUser = {
      id: legacy.id,
      name: legacy.name,
      email: legacy.email,
      role: legacy.role,
      isActive: legacy.isActive,
      mustChangePassword: legacy.mustChangePassword,
    };
    return legacy.id;
  }
  const user = await requireAuthenticatedUser(req, res, {
    allowLegacyHeader: legacyEnabled,
  });
  if (!user) return null;
  if (user.role !== UserRole.REQUESTER) {
    sendError(res, 403, "FORBIDDEN", "Only Requesters can perform this action.");
    return null;
  }
  return user.id;
}
