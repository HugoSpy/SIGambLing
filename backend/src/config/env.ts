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

function emptyStringToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value;
}

const optionalStringEnv = z.preprocess(
  emptyStringToUndefined,
  z.string().optional(),
);
const optionalUrlEnv = z.preprocess(
  emptyStringToUndefined,
  z.string().url().optional(),
);
const optionalCookieSameSiteEnv = z.preprocess(
  emptyStringToUndefined,
  z.enum(["lax", "strict", "none"]).optional(),
);
const optionalDiscordTimeoutEnv = z.preprocess(
  emptyStringToUndefined,
  z.coerce.number().int().min(500).max(15000).optional(),
);
const optionalDiscordRoleIdEnv = z.preprocess(
  emptyStringToUndefined,
  z.string().regex(/^\d+$/).optional(),
);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
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
  COOKIE_DOMAIN: optionalStringEnv,
  COOKIE_SAME_SITE: optionalCookieSameSiteEnv,
  CORS_ALLOWED_ORIGINS: optionalStringEnv,
  AVATAR_STORAGE_DIR: z.string().min(1).default("/var/www/sigambling/avatars"),
  AVATAR_PUBLIC_BASE_URL: z.string().min(1).default("/avatars"),
  DISCORD_EVENTS_WEBHOOK_URL: optionalUrlEnv,
  DISCORD_EVENTS_ROLE_ID: optionalDiscordRoleIdEnv,
  DISCORD_WEBHOOK_URL: optionalUrlEnv,
  DISCORD_WEBHOOK: optionalUrlEnv,
  DISCORD_WEBHOOK_TIMEOUT_MS: optionalDiscordTimeoutEnv,
  SENTRY_DSN: optionalStringEnv,
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
