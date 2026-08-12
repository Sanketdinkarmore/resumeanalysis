import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password too long"),
});

export const loginSchema = registerSchema;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
