import { config } from "dotenv";
import { z } from "zod";

// Load apps/api/.env into process.env (Prisma CLI does this automatically; Node does not)
config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(3),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default("true")
    .transform((value) => value.toLowerCase() === "true"),
  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  INTERNAL_API_SECRET: z.string().min(16),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
});

export const env = envSchema.parse(process.env);
