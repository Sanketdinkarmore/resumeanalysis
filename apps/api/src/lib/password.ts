import argon2 from "argon2";

/** Hash a plaintext password before storing in DB (never store raw passwords). */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

/** Compare login password against the stored hash. */
export async function verifyPassword(
  passwordHash: string | null | undefined,
  password: string,
): Promise<boolean> {
  if (!passwordHash) return false;
  return argon2.verify(passwordHash, password);
}
