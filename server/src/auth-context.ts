import { createHash, randomBytes } from "node:crypto";
import { Request, Response, RequestHandler } from "express";
import { UserRole } from "@prisma/client";
import { sendError } from "./http.js";
import { getPrisma } from "./prisma.js";

export const SESSION_COOKIE = "toktickit_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/**
 * The requester header is a temporary Lab 2 compatibility mechanism. Keep it
 * disabled by default so a client cannot select another User in a deployed
 * environment. Vitest sets NODE_ENV to test, which keeps the regression
 * fixtures available without requiring a production configuration flag.
 */
export function legacyRequesterContextEnabled(): boolean {
  return process.env.NODE_ENV === "test" || process.env.ENABLE_LEGACY_REQUESTER_CONTEXT === "true";
}

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
      sessionToken?: string;
    }
  }
}

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
} as const;

const authUserSelect = {
  ...publicUserSelect,
  passwordHash: true,
} as const;

function toAuthUser(user: {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
}): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}

export function publicUser(user: AuthenticatedUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionToken(req: Request): string | null {
  const authorization = req.header("Authorization");
  if (authorization && /^Bearer\s+/i.test(authorization)) {
    const bearer = authorization.replace(/^Bearer\s+/i, "").trim();
    if (bearer) return bearer;
  }
  const header = req.header("Cookie");
  if (!header) return null;
  for (const item of header.split(";")) {
    const [rawName, ...rawValue] = item.trim().split("=");
    if (rawName !== SESSION_COOKIE) continue;
    const value = rawValue.join("=");
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }
  return null;
}

export function sessionCookie(token: string, maxAgeMs = SESSION_TTL_MS): string {
  const maxAge = Math.max(0, Math.floor(maxAgeMs / 1000));
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function setSessionCookie(res: Response, token: string): void {
  res.setHeader("Set-Cookie", sessionCookie(token));
}

export function clearSessionCookie(res: Response): void {
  res.setHeader("Set-Cookie", sessionCookie("", 0));
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Resolve the session cookie to an active account. A legacy header is allowed
 * only when explicitly requested by Lab 2 Requester routes; a valid session
 * always wins over that header so ownership cannot be spoofed.
 */
export async function resolveAuthenticatedUser(
  req: Request,
  options: { allowLegacyHeader?: boolean } = {},
): Promise<AuthenticatedUser | null> {
  if (req.authUser) return req.authUser;

  const token = getSessionToken(req);
  if (token) {
    const session = await getPrisma().session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { select: authUserSelect } },
    });
    if (!session) return null;
    if (session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
      await getPrisma().session.deleteMany({ where: { id: session.id } });
      return null;
    }
    const user = toAuthUser(session.user);
    req.authUser = user;
    req.sessionToken = token;
    return user;
  }

  if (options.allowLegacyHeader && legacyRequesterContextEnabled()) {
    const raw = req.header("X-Development-Requester-Id");
    if (raw && /^\d+$/.test(raw) && Number(raw) > 0 && Number.isSafeInteger(Number(raw))) {
      const user = await getPrisma().user.findFirst({
        where: { id: Number(raw), role: UserRole.REQUESTER, isActive: true },
        select: publicUserSelect,
      });
      if (user) {
        const resolved = toAuthUser(user);
        req.authUser = resolved;
        return resolved;
      }
    }
  }

  return null;
}

export async function requireAuthenticatedUser(
  req: Request,
  res: Response,
  options: { allowLegacyHeader?: boolean; allowPasswordChange?: boolean } = {},
): Promise<AuthenticatedUser | null> {
  let user: AuthenticatedUser | null;
  try {
    user = await resolveAuthenticatedUser(req, options);
  } catch (error) {
    console.error("Session lookup failed:", error);
    sendError(res, 500, "AUTH_LOOKUP_FAILED", "Unable to verify your session.");
    return null;
  }
  if (!user) {
    sendError(res, 401, "AUTH_REQUIRED", "Authentication is required.");
    return null;
  }
  if (!user.isActive) {
    sendError(res, 403, "ACCOUNT_INACTIVE", "This account is inactive.");
    return null;
  }
  if (!options.allowPasswordChange && user.mustChangePassword) {
    sendError(res, 403, "PASSWORD_CHANGE_REQUIRED", "Change your initial password before continuing.");
    return null;
  }
  return user;
}

export async function requireRole(
  req: Request,
  res: Response,
  roles: readonly UserRole[],
  options: { allowPasswordChange?: boolean; allowLegacyHeader?: boolean } = {},
): Promise<AuthenticatedUser | null> {
  const user = await requireAuthenticatedUser(req, res, options);
  if (!user) return null;
  if (!roles.includes(user.role)) {
    sendError(res, 403, "FORBIDDEN", "You are not permitted to perform this action.");
    return null;
  }
  return user;
}

export function authMiddleware(options: { allowLegacyHeader?: boolean; allowPasswordChange?: boolean } = {}): RequestHandler {
  return async (req, res, next) => {
    const user = await requireAuthenticatedUser(req, res, options);
    if (user) next();
  };
}

export function roleMiddleware(roles: readonly UserRole[], options: { allowPasswordChange?: boolean } = {}): RequestHandler {
  return async (req, res, next) => {
    const user = await requireRole(req, res, roles, options);
    if (user) next();
  };
}
