import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details ?? null,
    });
    return;
  }

  // Invalid request body (Zod) → 400 with field errors
  if (err instanceof ZodError) {
    res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Invalid request body",
      details: err.flatten(),
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "Something went wrong",
    details: null,
  });
}
