import { UserRole, TicketStatus } from "@prisma/client";

const STAFF_ROLES = new Set<UserRole>([UserRole.IT_STAFF]);

/**
 * Explicit, intentionally small transition matrix for Lab 3. Requesters can
 * report a problem as appearing resolved, but only staff can formally move a
 * Ticket through this matrix.
 */
const TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  [TicketStatus.NEW]: [TicketStatus.OPEN, TicketStatus.CANCELLED],
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CANCELLED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  [TicketStatus.WAITING_FOR_REQUESTER]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.REOPENED],
  [TicketStatus.CLOSED]: [TicketStatus.REOPENED],
  [TicketStatus.REOPENED]: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CANCELLED],
  [TicketStatus.CANCELLED]: [],
};

export function canTransitionStatus(from: TicketStatus | string, to: TicketStatus | string, role: UserRole | string): boolean {
  if (!STAFF_ROLES.has(role as UserRole)) return false;
  return (TRANSITIONS[from as TicketStatus] ?? []).includes(to as TicketStatus);
}

export function allowedStatusTransitions(from: TicketStatus): readonly TicketStatus[] {
  return TRANSITIONS[from] ?? [];
}

/** Consequential transitions require an explicit confirmation in the API. */
export function requiresStatusConfirmation(to: TicketStatus | string): boolean {
  return new Set<TicketStatus>([
    TicketStatus.CANCELLED,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
    TicketStatus.REOPENED,
  ]).has(to as TicketStatus);
}

/** Resolution and closure are only valid when a currently active owner exists. */
export function requiresActiveOwner(to: TicketStatus | string): boolean {
  return to === TicketStatus.RESOLVED || to === TicketStatus.CLOSED;
}
