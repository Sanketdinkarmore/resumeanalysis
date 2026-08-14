import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function oauthClient() {
  return new OAuth2Client({
    clientId: requireEnv("GOOGLE_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri: requireEnv("GOOGLE_REDIRECT_URI"),
  });
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI,
  );
}

export function createGoogleAuthUrl(): string {
  const state = jwt.sign(
    { nonce: randomBytes(16).toString("hex") },
    requireEnv("JWT_ACCESS_SECRET"),
    { expiresIn: "10m" },
  );

  return oauthClient().generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
    state,
  });
}

export function verifyGoogleOAuthState(state: string): void {
  jwt.verify(state, requireEnv("JWT_ACCESS_SECRET"));
}

export type GoogleProfile = {
  googleId: string;
  email: string;
};

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw new Error("Google did not return an id_token");
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: requireEnv("GOOGLE_CLIENT_ID"),
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Google profile is missing required fields");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase().trim(),
  };
}
