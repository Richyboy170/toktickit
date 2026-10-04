import { Prisma, UserRole } from "@prisma/client";
import { Request, Response, Router } from "express";
import { requireRole } from "../auth-context.js";
import { createActionSchema, patchActionSchema, zodActionFieldErrors } from "../action-validation.js";
import { sendError } from "../http.js";
import { getPrisma } from "../prisma.js";
import { canTransitionAction } from "../action-workflow.js";

export const actionsRouter = Router();

const readRoles = [UserRole.REQUESTER, UserRole.IT_STAFF, UserRole.ADMINISTRATOR] as const;
const writeRoles = [UserRole.IT_STAFF, UserRole.ADMINISTRATOR] as const;
const actionInclude = {
  performedBy: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
} satisfies Prisma.ActionTakenInclude;

function pathId(raw: string): number | null {
  if (!/^\d+$/.test(raw) || Number(raw) <= 0 || !Number.isSafeInteger(Number(raw))) return null;
  return Number(raw);
}

function parseIds(req: Request, res: Response): { ticketId: number; actionId?: number } | null {
  const ticketId = pathId(req.params.ticketId);
  const actionId = req.params.actionId === undefined ? undefined : pathId(req.params.actionId);
  if (!ticketId || (req.params.actionId !== undefined && actionId == null)) {
    sendError(res, 400, "INVALID_PATH", "Ticket and Action IDs must be positive integers.");
    return null;
  }
  return { ticketId, ...(typeof actionId === "number" ? { actionId } : {}) };
}

function isSerializationConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function staleAction(res: Response) {
  return sendError(res, 409, "STALE_ACTION", "This Action changed since you loaded it. Refresh and reapply your edits.");
}

actionsRouter.get("/:ticketId/actions", async (req, res) => {
  const user = await requireRole(req, res, readRoles);
  if (!user) return;
  const ids = parseIds(req, res);
  if (!ids) return;
  try {
    const ticket = await getPrisma().ticket.findFirst({
      where: { id: ids.ticketId, ...(user.role === UserRole.REQUESTER ? { requesterId: user.id } : {}) },
      select: { id: true },
    });
    if (!ticket) return sendError(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
    const actions = await getPrisma().actionTaken.findMany({
      where: { ticketId: ids.ticketId },
      include: actionInclude,
      orderBy: [{ actionAt: "asc" }, { id: "asc" }],
    });
    return res.status(200).json({ actions });
  } catch (error) {
    console.error("GET Ticket Actions failed:", error);
    return sendError(res, 500, "ACTIONS_UNAVAILABLE", "Unable to load Actions Taken.");
  }
});

actionsRouter.post("/:ticketId/actions", async (req, res) => {
  const user = await requireRole(req, res, writeRoles);
  if (!user) return;
  const ids = parseIds(req, res);
  if (!ids) return;
  const parsed = createActionSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, "VALIDATION_ERROR", "Please correct the Action details.", zodActionFieldErrors(parsed.error));
  try {
    const action = await getPrisma().$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: ids.ticketId }, select: { id: true } });
      if (!ticket) return null;
      const assignee = await tx.user.findFirst({ where: { id: parsed.data.assigneeUserId, role: UserRole.IT_STAFF, isActive: true }, select: { id: true } });
      if (!assignee) throw new InvalidAssigneeError();
      return tx.actionTaken.create({
        data: {
          ticketId: ids.ticketId,
          actionAt: new Date(parsed.data.actionAt),
          description: parsed.data.description,
          result: parsed.data.result ?? null,
          performedByUserId: user.id,
          assigneeUserId: assignee.id,
          followUpRequired: parsed.data.followUpRequired,
          followUpNote: parsed.data.followUpNote,
          attachmentNotes: parsed.data.attachmentNotes ?? null,
          status: "PLANNED",
        },
        include: actionInclude,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!action) return sendError(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
    return res.status(201).json({ action });
  } catch (error) {
    if (error instanceof InvalidAssigneeError) return sendError(res, 400, "INVALID_ASSIGNEE", "Assignee must be an active IT Staff user.");
    if (isSerializationConflict(error)) return sendError(res, 409, "STALE_ACTION", "The Ticket changed while creating this Action. Refresh and try again.");
    console.error("POST Ticket Action failed:", error);
    return sendError(res, 500, "INTERNAL_ERROR", "Unable to create the Action.");
  }
});

actionsRouter.patch("/:ticketId/actions/:actionId", async (req, res) => {
  const user = await requireRole(req, res, writeRoles);
  if (!user) return;
  const ids = parseIds(req, res);
  if (!ids || ids.actionId === undefined) return;
  const parsed = patchActionSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, "VALIDATION_ERROR", "Please correct the Action details.", zodActionFieldErrors(parsed.error));
  const input = parsed.data;
  try {
    const result = await getPrisma().$transaction(async (tx) => {
      const current = await tx.actionTaken.findFirst({ where: { id: ids.actionId, ticketId: ids.ticketId } });
      if (!current) return { kind: "missing" as const };
      if (current.updatedAt.getTime() !== new Date(input.expectedUpdatedAt).getTime()) return { kind: "stale" as const };
      if (current.status === "COMPLETED" || current.status === "CANCELLED") return { kind: "terminal" as const };

      const nextStatus = input.status ?? current.status;
      if (input.status !== undefined && !canTransitionAction(current.status, input.status)) return { kind: "transition" as const };
      const mergedResult = input.result === undefined ? current.result : input.result;
      if (nextStatus === "COMPLETED" && !mergedResult?.trim()) return { kind: "result" as const, status: "COMPLETED" };
      if (nextStatus === "CANCELLED" && !mergedResult?.trim()) return { kind: "result" as const, status: "CANCELLED" };

      if (input.assigneeUserId !== undefined) {
        const assignee = await tx.user.findFirst({ where: { id: input.assigneeUserId, role: UserRole.IT_STAFF, isActive: true }, select: { id: true } });
        if (!assignee) return { kind: "assignee" as const };
      }
      const followUpRequired = input.followUpRequired ?? current.followUpRequired;
      const followUpNote = input.followUpRequired === false
        ? null
        : input.followUpNote !== undefined ? input.followUpNote : current.followUpNote;
      if (followUpRequired && !followUpNote?.trim()) return { kind: "followup" as const };

      const updated = await tx.actionTaken.updateMany({
        where: { id: current.id, updatedAt: current.updatedAt, status: current.status },
        data: {
          ...(input.actionAt !== undefined ? { actionAt: new Date(input.actionAt) } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.result !== undefined ? { result: input.result } : {}),
          ...(input.assigneeUserId !== undefined ? { assigneeUserId: input.assigneeUserId } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          followUpRequired,
          followUpNote,
          ...(input.attachmentNotes !== undefined ? { attachmentNotes: input.attachmentNotes } : {}),
        },
      });
      if (updated.count !== 1) return { kind: "stale" as const };
      const action = await tx.actionTaken.findUniqueOrThrow({ where: { id: current.id }, include: actionInclude });
      return { kind: "updated" as const, action };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (result.kind === "missing") return sendError(res, 404, "RESOURCE_NOT_FOUND", "Action not found.");
    if (result.kind === "stale") return staleAction(res);
    if (result.kind === "terminal") return sendError(res, 409, "ACTION_TERMINAL", "Completed or cancelled Actions cannot be edited.");
    if (result.kind === "transition") return sendError(res, 409, "INVALID_ACTION_TRANSITION", "That Action status transition is not permitted.");
    if (result.kind === "result") return sendError(res, 400, "VALIDATION_ERROR", result.status === "COMPLETED" ? "Result is required before completing an Action." : "Enter a cancellation reason in Result.", { result: "Enter a result before changing this Action status." });
    if (result.kind === "assignee") return sendError(res, 400, "INVALID_ASSIGNEE", "Assignee must be an active IT Staff user.");
    if (result.kind === "followup") return sendError(res, 400, "VALIDATION_ERROR", "Follow-up Note is required when follow-up is selected.", { followUpNote: "Enter a follow-up note." });
    return res.status(200).json({ action: result.action });
  } catch (error) {
    if (isSerializationConflict(error)) return staleAction(res);
    console.error("PATCH Ticket Action failed:", error);
    return sendError(res, 500, "INTERNAL_ERROR", "Unable to update the Action.");
  }
});

class InvalidAssigneeError extends Error {}
