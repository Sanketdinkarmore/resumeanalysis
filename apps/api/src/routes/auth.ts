import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import {
  createRefreshToken,
  hashToken,
  signAccessToken,
} from "../lib/tokens.js";
import { AppError } from "../middleware/errorHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import {
  loginSchema,
  refreshSchema,
  registerSchema,
} from "../validators/auth.js";

export const authRouter = Router();

function publicUser(user: { id: string; email: string; role: string; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

/** Issue access JWT + store hashed refresh token; return both to client. */
async function issueSession(user: {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
}) {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refresh = createRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refresh.hash,
      expiresAt: refresh.expiresAt,
    },
  });

  return {
    user: publicUser(user),
    accessToken,
    refreshToken: refresh.raw,
    expiresAt: refresh.expiresAt,
  };
}

// POST /auth/register
authRouter.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const passwordHash = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
      },
    });

    const session = await issueSession(user);
    res.status(201).json(session);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      next(new AppError(409, "EMAIL_TAKEN", "An account with this email already exists"));
      return;
    }
    next(err);
  }
});

// POST /auth/login
authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });

    if (!user || !(await verifyPassword(user.passwordHash, body.password))) {
      next(new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password"));
      return;
    }

    const session = await issueSession(user);
    res.json(session);
  } catch (err) {
    next(err);
  }
});

// POST /auth/refresh — rotate refresh token (old one revoked)
authRouter.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokenHash = hashToken(refreshToken);

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      next(new AppError(401, "INVALID_REFRESH", "Refresh token is invalid or expired"));
      return;
    }

    // Rotate: revoke old, issue new pair
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const session = await issueSession(stored.user);
    res.json(session);
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout — revoke this refresh token
authRouter.post("/logout", async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokenHash = hashToken(refreshToken);

    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /auth/me — proves access token works
authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { sub } = (req as AuthedRequest).user;
    const user = await prisma.user.findUnique({ where: { id: sub } });
    if (!user) {
      next(new AppError(404, "USER_NOT_FOUND", "User not found"));
      return;
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});
