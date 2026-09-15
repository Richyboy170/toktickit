import { Request, Response, Router } from "express";
import { z } from "zod";
import { hashPassword, normalizeEmail, passwordValidationMessage, verifyPassword } from "../auth.js";
import {
  clearSessionCookie,
  getSessionToken,
  hashSessionToken,
  newSessionToken,
  publicUser,
  requireAuthenticatedUser,
  SESSION_TTL_MS,
  setSessionCookie,
} from "../auth-context.js";
import { sendError } from "../http.js";
import { getPrisma } from "../prisma.js";
import { zodFieldErrors } from "../ticket-validation.js";

export const authRouter = Router();

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_FAILURE_LIMIT = 5;
const loginFailures = new Map<string, { count: number; resetAt: number }>();

const loginSchema = z.object({
  email: z.string({ required_error: "Email is required." }).trim().email("Enter a valid email address."),
  password: z.string({ required_error: "Password is required." }).min(1, "Password is required."),
});

const changePasswordSchema = z.object({
  currentPassword: z.string({ required_error: "Current password is required." }).min(1, "Current password is required."),
  newPassword: z.string().optional(),
  password: z.string().optional(),
  confirmPassword: z.string({ required_error: "Password confirmation is required." }),
}).superRefine((value, ctx) => {
  const next = value.newPassword ?? value.password;
  if (!next) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["newPassword"], message: "New password is required." });
    return;
  }
  const passwordError = passwordValidationMessage(next);
  if (passwordError) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["newPassword"], message: passwordError });
  if (value.confirmPassword !== next) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords do not match." });
  }
});

function loginKey(req: Request, email: string): string {
  return `${req.ip ?? "unknown"}:${normalizeEmail(email)}`;
}

function loginLimited(key: string): boolean {
  const current = loginFailures.get(key);
  if (!current) return false;
  if (current.resetAt <= Date.now()) {
    loginFailures.delete(key);
    return false;
  }
  return current.count >= LOGIN_FAILURE_LIMIT;
}

function recordLoginFailure(key: string): void {
  const now = Date.now();
  const current = loginFailures.get(key);
  if (!current || current.resetAt <= now) {
    loginFailures.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  current.count += 1;
}

function clearLoginFailures(key: string): void {
  loginFailures.delete(key);
}

function authResponse(user: Parameters<typeof publicUser>[0]) {
  return { user: publicUser(user), mustChangePassword: user.mustChangePassword };
}

async function createSession(userId: number): Promise<string> {
  const token = newSessionToken();
  await getPrisma().session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return token;
}

authRouter.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, "VALIDATION_ERROR", "Please correct the highlighted fields.", zodFieldErrors(parsed.error));
  const key = loginKey(req, parsed.data.email);
  if (loginLimited(key)) return sendError(res, 429, "LOGIN_RATE_LIMITED", "Too many failed sign-in attempts. Please try again later.");

  try {
    const user = await getPrisma().user.findUnique({ where: { email: normalizeEmail(parsed.data.email) } });
    if (!user) {
      recordLoginFailure(key);
      return sendError(res, 401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }
    if (!user.isActive) return sendError(res, 403, "ACCOUNT_INACTIVE", "This account is inactive.");
    if (!user.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      recordLoginFailure(key);
      return sendError(res, 401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }

    clearLoginFailures(key);
    const token = await createSession(user.id);
    const resolved = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    };
    setSessionCookie(res, token);
    return res.status(200).json(authResponse(resolved));
  } catch (error) {
    console.error("POST /api/auth/login failed:", error);
    return sendError(res, 500, "LOGIN_FAILED", "Unable to sign in. Please try again.");
  }
});

authRouter.post("/logout", async (req: Request, res: Response) => {
  try {
    const token = getSessionToken(req);
    if (token) await getPrisma().session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  } catch (error) {
    console.error("POST /api/auth/logout failed:", error);
    // Clear the browser cookie even if the backing row was already removed.
  }
  clearSessionCookie(res);
  return res.status(204).send();
});

async function currentUser(req: Request, res: Response) {
  const user = await requireAuthenticatedUser(req, res, { allowPasswordChange: true });
  if (!user) return;
  return res.status(200).json(authResponse(user));
}

authRouter.get("/me", currentUser);
authRouter.get("/current-user", currentUser);

async function changePassword(req: Request, res: Response) {
  const user = await requireAuthenticatedUser(req, res, { allowPasswordChange: true });
  if (!user) return;

  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, "VALIDATION_ERROR", "Please correct the highlighted fields.", zodFieldErrors(parsed.error));
  const newPassword = parsed.data.newPassword ?? parsed.data.password!;

  try {
    const existing = await getPrisma().user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    if (!existing) return sendError(res, 401, "AUTH_REQUIRED", "Authentication is required.");
    if (!(await verifyPassword(parsed.data.currentPassword, existing.passwordHash))) {
      return sendError(res, 401, "INVALID_CURRENT_PASSWORD", "Current password is incorrect.", { currentPassword: "Current password is incorrect." });
    }
    if (existing.passwordHash && await verifyPassword(newPassword, existing.passwordHash)) {
      return sendError(res, 400, "PASSWORD_REUSE", "Choose a different password.", { newPassword: "Choose a different password." });
    }

    const updated = await getPrisma().user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
    });
    // Password changes invalidate every prior session, including the one used
    // for this request, then issue one rotated full session.
    await getPrisma().session.deleteMany({ where: { userId: user.id } });
    const rotatedToken = await createSession(user.id);
    setSessionCookie(res, rotatedToken);
    const resolved = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
      mustChangePassword: updated.mustChangePassword,
    };
    req.authUser = resolved;
    return res.status(200).json(authResponse(resolved));
  } catch (error) {
    console.error("POST /api/auth/change-password failed:", error);
    return sendError(res, 500, "PASSWORD_CHANGE_FAILED", "Unable to change your password. Please try again.");
  }
}

authRouter.post("/change-password", changePassword);

authRouter.post("/password", changePassword);
authRouter.put("/change-password", changePassword);
authRouter.put("/password", changePassword);
