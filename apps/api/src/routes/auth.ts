import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  createGoogleAuthUrl,
  exchangeGoogleCode,
  isGoogleOAuthConfigured,
  verifyGoogleOAuthState,
} from "../lib/google-oauth.js";
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
  setPasswordSchema,
} from "../validators/auth.js";

export const authRouter = Router();

type PublicUser = {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  hasPassword: boolean;
};

function publicUser(user: {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  passwordHash?: string | null;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    hasPassword: Boolean(user.passwordHash),
  };
}

function webOrigin(): string {
  return process.env.CORS_ORIGIN ?? "http://localhost:3000";
}

/** Issue access JWT + store hashed refresh token; return both to client. */
async function issueSession(user: {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  passwordHash?: string | null;
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

function redirectWithSession(
  res: import("express").Response,
  session: Awaited<ReturnType<typeof issueSession>>,
) {
  const params = new URLSearchParams({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
  res.redirect(`${webOrigin()}/auth/callback#${params.toString()}`);
}

// GET /auth/google — start Google OAuth (redirect to Google)
authRouter.get("/google", (_req, res, next) => {
  try {
    if (!isGoogleOAuthConfigured()) {
      next(new AppError(503, "OAUTH_NOT_CONFIGURED", "Google sign-in is not configured"));
      return;
    }
    res.redirect(createGoogleAuthUrl());
  } catch (err) {
    next(err);
  }
});

// GET /auth/google/callback — Google redirects here after consent
authRouter.get("/google/callback", async (req, res, next) => {
  try {
    if (!isGoogleOAuthConfigured()) {
      next(new AppError(503, "OAUTH_NOT_CONFIGURED", "Google sign-in is not configured"));
      return;
    }

    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;
    const oauthError = typeof req.query.error === "string" ? req.query.error : null;

    if (oauthError) {
      res.redirect(`${webOrigin()}/login?oauth_error=${encodeURIComponent(oauthError)}`);
      return;
    }

    if (!code || !state) {
      next(new AppError(400, "OAUTH_CALLBACK", "Missing Google OAuth parameters"));
      return;
    }

    verifyGoogleOAuthState(state);
    const profile = await exchangeGoogleCode(code);

    let user =
      (await prisma.user.findFirst({
        where: {
          OR: [{ googleId: profile.googleId }, { email: profile.email }],
        },
      })) ?? null;

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          googleId: profile.googleId,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId },
      });
    } else if (user.email !== profile.email) {
      next(new AppError(409, "OAUTH_EMAIL_MISMATCH", "Google account email does not match"));
      return;
    }

    const session = await issueSession(user);
    redirectWithSession(res, session);
  } catch (err) {
    next(err);
  }
});

// POST /auth/register
authRouter.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      if (!existing.passwordHash) {
        next(
          new AppError(
            409,
            "OAUTH_ONLY",
            "This email uses Google sign-in. Continue with Google, or sign in with Google once and set a password in your account.",
          ),
        );
        return;
      }
      next(new AppError(409, "EMAIL_TAKEN", "An account with this email already exists"));
      return;
    }

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

    if (!user) {
      next(new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password"));
      return;
    }

    if (!user.passwordHash) {
      next(
        new AppError(
          401,
          "OAUTH_ONLY",
          "This account uses Google sign-in. Use Continue with Google below.",
        ),
      );
      return;
    }

    if (!(await verifyPassword(user.passwordHash, body.password))) {
      next(new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password"));
      return;
    }

    const session = await issueSession(user);
    res.json(session);
  } catch (err) {
    next(err);
  }
});

// POST /auth/set-password — OAuth-only users can add email/password login
authRouter.post("/set-password", requireAuth, async (req, res, next) => {
  try {
    const body = setPasswordSchema.parse(req.body);
    const { sub } = (req as AuthedRequest).user;

    const user = await prisma.user.findUnique({ where: { id: sub } });
    if (!user) {
      next(new AppError(404, "USER_NOT_FOUND", "User not found"));
      return;
    }

    if (user.passwordHash) {
      next(new AppError(409, "PASSWORD_ALREADY_SET", "Password is already set for this account"));
      return;
    }

    await prisma.user.update({
      where: { id: sub },
      data: { passwordHash: await hashPassword(body.password) },
    });

    res.status(204).send();
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

// GET /auth/google/enabled — whether Google button should show
authRouter.get("/google/enabled", (_req, res) => {
  res.json({ enabled: isGoogleOAuthConfigured() });
});
