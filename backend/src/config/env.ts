import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { z } from "zod";

const envCandidates = Array.from(
  new Set([
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "backend/.env"),
    path.resolve(__dirname, "../../.env"),
    path.resolve(__dirname, "../../../.env"),
  ]),
);

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

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
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_AVATARS_BUCKET: z.string().min(1).default("avatars"),
  SENTRY_DSN: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const missingKeys = parsedEnv.error.issues
    .map((issue) => issue.path[0])
    .filter((value): value is string => typeof value === "string");

  throw new Error(
    [
      "Configuration backend invalide.",
      `Variables manquantes ou invalides: ${missingKeys.join(", ")}`,
      "Creez `backend/.env` a partir de `backend/.env.example`.",
    ].join(" "),
  );
}

export const env = parsedEnv.data;

export const isProduction = env.NODE_ENV === "production";
