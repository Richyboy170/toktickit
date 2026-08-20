import { randomBytes } from "node:crypto";

export type RandomBytes = (size: number) => Buffer;

export function generateTicketNumber(date = new Date(), getRandomBytes: RandomBytes = randomBytes): string {
  const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = getRandomBytes(4).toString("hex").toUpperCase();
  return `TKT-${datePart}-${suffix}`;
}
