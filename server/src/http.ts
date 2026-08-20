import { Response } from "express";

export interface FieldErrors {
  [field: string]: string;
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  fields?: FieldErrors,
) {
  return res.status(status).json({
    error: {
      code,
      message,
      ...(fields && Object.keys(fields).length > 0 ? { fields } : {}),
    },
  });
}
