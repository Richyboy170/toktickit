import { Request, Response } from "express";
import { sendError } from "./http.js";
import { getPrisma } from "./prisma.js";

export async function requireActiveRequester(req: Request, res: Response): Promise<number | null> {
  const raw = req.header("X-Development-Requester-Id");
  if (!raw || !/^\d+$/.test(raw) || Number(raw) <= 0) {
    sendError(
      res,
      400,
      "INVALID_REQUESTER_CONTEXT",
      "Select a valid Development Requester before continuing.",
    );
    return null;
  }

  const requesterId = Number(raw);
  const requester = await getPrisma().developmentRequester.findFirst({
    where: { id: requesterId, isActive: true },
    select: { id: true },
  });
  if (!requester) {
    sendError(
      res,
      403,
      "REQUESTER_UNAVAILABLE",
      "The selected Development Requester is no longer available.",
    );
    return null;
  }
  return requesterId;
}
