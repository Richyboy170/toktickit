import { Prisma, UserRole } from "@prisma/client";
import { Request, Response, Router } from "express";
import { z } from "zod";
import { hashPassword, normalizeEmail, passwordValidationMessage } from "../auth.js";
import { publicUser, requireRole } from "../auth-context.js";
import { sendError } from "../http.js";
import { getPrisma } from "../prisma.js";
import { updateTicketPriority } from "./staff.js";
import { getVisibleTicketDetail } from "./tickets.js";
import { zodFieldErrors } from "../ticket-validation.js";

export const adminRouter = Router();

const roles = [UserRole.REQUESTER, UserRole.IT_STAFF, UserRole.ADMINISTRATOR] as const;
const passwordSchema = z.string().superRefine((value, ctx) => {
  const message = passwordValidationMessage(value);
  if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
});
const createUserSchema = z.object({
  name: z.string({ required_error: "Name is required." }).trim().min(1, "Name is required.").max(120, "Name must be at most 120 characters."),
  email: z.string({ required_error: "Email is required." }).trim().email("Enter a valid email address."),
  role: z.enum(roles, { errorMap: () => ({ message: "Select a valid role." }) }),
  isActive: z.boolean().optional().default(true),
  initialPassword: passwordSchema.optional(),
  password: passwordSchema.optional(),
  confirmPassword: z.string().optional(),
}).superRefine((value, ctx) => {
  if (!value.initialPassword && !value.password) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["initialPassword"], message: "Initial password is required." });
  const password = value.initialPassword ?? value.password;
  if (value.confirmPassword !== undefined && password !== value.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords do not match." });
  }
});

const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120, "Name must be at most 120 characters.").optional(),
  email: z.string().trim().email("Enter a valid email address.").optional(),
  role: z.enum(roles, { errorMap: () => ({ message: "Select a valid role." }) }).optional(),
  isActive: z.boolean().optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, { message: "Provide at least one account field." });

const setPasswordSchema = z.object({
  initialPassword: passwordSchema.optional(),
  password: passwordSchema.optional(),
  confirmPassword: z.string().optional(),
}).superRefine((value, ctx) => {
  if (!value.initialPassword && !value.password) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["initialPassword"], message: "Initial password is required." });
  const password = value.initialPassword ?? value.password;
  if (value.confirmPassword !== undefined && password !== value.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords do not match." });
  }
});

const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
} as const;

function pathId(raw: string): number | null {
  if (!/^\d+$/.test(raw) || Number(raw) <= 0 || !Number.isSafeInteger(Number(raw))) return null;
  return Number(raw);
}

function serializeUser(user: { id: number; name: string; email: string; role: UserRole; isActive: boolean; mustChangePassword: boolean; createdAt: Date; updatedAt: Date }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, status: user.isActive ? "ACTIVE" : "INACTIVE", mustChangePassword: user.mustChangePassword, createdAt: user.createdAt, updatedAt: user.updatedAt };
}

async function administrator(req: Request, res: Response) {
  return requireRole(req, res, [UserRole.ADMINISTRATOR]);
}

function mapPrismaError(error: unknown, res: Response) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return sendError(res, 409, "EMAIL_ALREADY_EXISTS", "A user with that email address already exists.", { email: "Email address is already in use." });
  }
  return null;
}

adminRouter.get("/users", async (req, res) => {
  const actor = await administrator(req, res);
  if (!actor) return;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (search.length > 120) return sendError(res, 400, "INVALID_QUERY", "Search must be at most 120 characters.", { search: "Search must be at most 120 characters." });
  const role = typeof req.query.role === "string" ? req.query.role.toUpperCase() : undefined;
  if (role && !(roles as readonly string[]).includes(role)) return sendError(res, 400, "INVALID_QUERY", "Select a valid role.", { role: "Select a valid role." });
  try {
    const users = await getPrisma().user.findMany({
      where: {
        ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
        ...(role ? { role: role as UserRole } : {}),
      },
      select: publicSelect,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 200,
    });
    const items = users.map(serializeUser);
    return res.status(200).json({ users: items, items, total: items.length, query: { search, role: role ?? null } });
  } catch (error) {
    console.error("GET admin users failed:", error);
    return sendError(res, 500, "USER_LIST_FAILED", "Unable to load users.");
  }
});

adminRouter.post("/users", async (req, res) => {
  const actor = await administrator(req, res);
  if (!actor) return;
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, "VALIDATION_ERROR", "Please correct the highlighted fields.", zodFieldErrors(parsed.error));
  const initialPassword = parsed.data.initialPassword ?? parsed.data.password!;
  try {
    const user = await getPrisma().user.create({
      data: {
        name: parsed.data.name,
        email: normalizeEmail(parsed.data.email),
        role: parsed.data.role,
        isActive: parsed.data.isActive,
        passwordHash: await hashPassword(initialPassword),
        mustChangePassword: true,
      },
      select: publicSelect,
    });
    return res.status(201).json({ user: serializeUser(user) });
  } catch (error) {
    const mapped = mapPrismaError(error, res);
    if (mapped) return mapped;
    console.error("POST admin user failed:", error);
    return sendError(res, 500, "USER_CREATE_FAILED", "Unable to create the user.");
  }
});

async function updateAccount(req: Request, res: Response) {
  const actor = await administrator(req, res);
  if (!actor) return;
  const id = pathId(req.params.userId);
  if (!id) return sendError(res, 400, "INVALID_PATH", "User ID must be a positive integer.");
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, "VALIDATION_ERROR", "Please correct the highlighted fields.", zodFieldErrors(parsed.error));
  const data = {
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    ...(parsed.data.email !== undefined ? { email: normalizeEmail(parsed.data.email) } : {}),
    ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
    ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : parsed.data.active !== undefined ? { isActive: parsed.data.active } : {}),
  } as Prisma.UserUpdateInput;
  try {
    const target = await getPrisma().user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } });
    if (!target) return sendError(res, 404, "USER_NOT_FOUND", "User not found.");
    const nextRole = data.role === undefined ? target.role : data.role as UserRole;
    const nextActive = data.isActive === undefined ? target.isActive : data.isActive as boolean;
    if (actor.id === id && (data.isActive === false || (data.role !== undefined && nextRole !== UserRole.ADMINISTRATOR))) {
      return sendError(res, 409, "ADMIN_SAFETY_VIOLATION", "You cannot deactivate or demote your own Administrator account.");
    }
    if (target.role !== UserRole.REQUESTER && nextRole === UserRole.REQUESTER) {
      const ownedTickets = await getPrisma().ticket.count({ where: { ownerId: id } });
      if (ownedTickets > 0) return sendError(res, 409, "ADMIN_SAFETY_VIOLATION", "A User who owns Tickets cannot be demoted until those Tickets are reassigned.");
    }
    if (target.role === UserRole.ADMINISTRATOR && target.isActive && (!nextActive || nextRole !== UserRole.ADMINISTRATOR)) {
      const activeAdmins = await getPrisma().user.count({ where: { role: UserRole.ADMINISTRATOR, isActive: true, id: { not: id } } });
      if (activeAdmins === 0) return sendError(res, 409, "ADMIN_SAFETY_VIOLATION", "The last active Administrator cannot be deactivated or reassigned.");
    }
    const prisma = getPrisma();
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data, select: publicSelect });
      if (!updated.isActive) {
        // Inactive accounts must never remain assigned to operational Tickets.
        // Keep the owner cleanup and session revocation atomic with the account
        // update so a failed request cannot leave stale ownership behind.
        await tx.ticket.updateMany({ where: { ownerId: id }, data: { ownerId: null } });
        await tx.session.deleteMany({ where: { userId: id } });
      }
      return updated;
    });
    return res.status(200).json({ user: serializeUser(user) });
  } catch (error) {
    const mapped = mapPrismaError(error, res);
    if (mapped) return mapped;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return sendError(res, 404, "USER_NOT_FOUND", "User not found.");
    console.error("PATCH admin user failed:", error);
    return sendError(res, 500, "USER_UPDATE_FAILED", "Unable to update the user.");
  }
}

adminRouter.patch("/users/:userId", updateAccount);
adminRouter.put("/users/:userId", updateAccount);

async function setInitialPassword(req: Request, res: Response) {
  const actor = await administrator(req, res);
  if (!actor) return;
  const id = pathId(req.params.userId);
  if (!id) return sendError(res, 400, "INVALID_PATH", "User ID must be a positive integer.");
  const parsed = setPasswordSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, "VALIDATION_ERROR", "Please correct the highlighted fields.", zodFieldErrors(parsed.error));
  try {
    const user = await getPrisma().user.update({ where: { id }, data: { passwordHash: await hashPassword(parsed.data.initialPassword ?? parsed.data.password!), mustChangePassword: true }, select: publicSelect });
    await getPrisma().session.deleteMany({ where: { userId: id } });
    return res.status(201).json({ user: serializeUser(user) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return sendError(res, 404, "USER_NOT_FOUND", "User not found.");
    console.error("POST admin initial password failed:", error);
    return sendError(res, 500, "USER_PASSWORD_FAILED", "Unable to set the initial password.");
  }
}

adminRouter.post("/users/:userId/password", setInitialPassword);
adminRouter.patch("/users/:userId/password", setInitialPassword);
adminRouter.post("/users/:userId/initial-password", setInitialPassword);

// Administrators may correct IT Priority, while the rest of the Ticket
// workflow remains exclusively under the IT Staff routes.
async function updatePriorityAsAdministrator(req: Request, res: Response) {
  const actor = await administrator(req, res);
  if (!actor) return;
  return updateTicketPriority(req, res);
}

adminRouter.patch("/tickets/:ticketId/priority", updatePriorityAsAdministrator);
adminRouter.put("/tickets/:ticketId/priority", updatePriorityAsAdministrator);
adminRouter.patch("/tickets/:ticketId/it-priority", updatePriorityAsAdministrator);

async function getTicketAsAdministrator(req: Request, res: Response) {
  const actor = await administrator(req, res);
  if (!actor) return;
  return getVisibleTicketDetail(req, res);
}

adminRouter.get("/tickets/:ticketId", getTicketAsAdministrator);
