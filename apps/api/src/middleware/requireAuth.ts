import type { NextFunction, Request, Response } from "express";
import { AppError } from "./errorHandler.js";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/tokens.js";

/** Attach authenticated user to req after this middleware. */
export type AuthedRequest = Request & { user: AccessTokenPayload };

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AppError(401, "UNAUTHORIZED", "Missing or invalid Authorization header"));
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = verifyAccessToken(token);
    (req as AuthedRequest).user = payload;
    next();
  } catch {
    next(new AppError(401, "UNAUTHORIZED", "Invalid or expired access token"));
  }
}
