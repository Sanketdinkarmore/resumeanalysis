import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AccessTokenPayload = {
  sub: string; // user id
  email: string;
  role: string;
};

/** Short-lived JWT sent on every API request (Authorization: Bearer ...). */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/**
 * Refresh token = random opaque string we give the client.
 * We only store a SHA-256 hash of it in DB (if DB leaks, raw tokens still useless).
 */
export function createRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = randomBytes(48).toString("base64url");
  const hash = hashToken(raw);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_TTL_DAYS);
  return { raw, hash, expiresAt };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
