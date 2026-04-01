import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  MICROSOFT_CLIENT_ID: z.string().min(1),
  MICROSOFT_CLIENT_SECRET: z.string().min(1),
  MICROSOFT_TENANT_ID: z.string().default("common"),
  MICROSOFT_CALLBACK_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  API_BASE_URL: z.string().url(),
  COOKIE_DOMAIN: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_AVATARS_BUCKET: z.string().min(1).default("avatars"),
  SENTRY_DSN: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export const isProduction = env.NODE_ENV === "production";
