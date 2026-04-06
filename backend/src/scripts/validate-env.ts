import fs from "fs";
import path from "path";
import dotenv from "dotenv";

function loadEnvFile() {
  const fileArg = process.argv
    .slice(2)
    .find((argument) => argument.startsWith("--file="))
    ?.slice("--file=".length);

  const candidates = fileArg
    ? [path.resolve(process.cwd(), fileArg)]
    : [
        path.resolve(process.cwd(), ".env"),
        path.resolve(process.cwd(), "backend/.env"),
      ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate, override: false });
      return candidate;
    }
  }

  return null;
}

function tryParseUrl(value: string, label: string, errors: string[]) {
  try {
    return new URL(value);
  } catch {
    errors.push(`${label} must be a valid URL.`);
    return null;
  }
}

loadEnvFile();

const requiredKeys = [
  "DATABASE_URL",
  "DIRECT_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "MICROSOFT_TENANT_ID",
  "MICROSOFT_CALLBACK_URL",
  "FRONTEND_URL",
  "API_BASE_URL",
] as const;

const errors: string[] = [];
const warnings: string[] = [];

for (const key of requiredKeys) {
  if (!process.env[key] || process.env[key]?.trim().length === 0) {
    errors.push(`${key} is missing.`);
  }
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const apiBaseUrl = process.env.API_BASE_URL;
const frontendUrl = process.env.FRONTEND_URL;
const callbackUrl = process.env.MICROSOFT_CALLBACK_URL;
const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;
const cookieDomain = process.env.COOKIE_DOMAIN?.trim();
const cookieSameSite = process.env.COOKIE_SAME_SITE?.trim().toLowerCase();
const corsAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.trim();
const avatarStorageDir = process.env.AVATAR_STORAGE_DIR?.trim();
const avatarPublicBaseUrl = process.env.AVATAR_PUBLIC_BASE_URL?.trim();

const parsedApiBaseUrl =
  apiBaseUrl && apiBaseUrl.trim().length > 0
    ? tryParseUrl(apiBaseUrl, "API_BASE_URL", errors)
    : null;
const parsedFrontendUrl =
  frontendUrl && frontendUrl.trim().length > 0
    ? tryParseUrl(frontendUrl, "FRONTEND_URL", errors)
    : null;
const parsedCallbackUrl =
  callbackUrl && callbackUrl.trim().length > 0
    ? tryParseUrl(callbackUrl, "MICROSOFT_CALLBACK_URL", errors)
    : null;

if (databaseUrl && directUrl && databaseUrl !== directUrl) {
  warnings.push("DATABASE_URL and DIRECT_URL differ. Confirm both point to the same Postgres project.");
}

if (parsedApiBaseUrl && parsedCallbackUrl) {
  const expectedCallback = new URL("/auth/microsoft/callback", parsedApiBaseUrl).toString();

  if (parsedCallbackUrl.toString() !== expectedCallback) {
    errors.push(
      `MICROSOFT_CALLBACK_URL must match ${expectedCallback} for the current API_BASE_URL.`,
    );
  }
}

if (parsedApiBaseUrl && parsedFrontendUrl) {
  const callbackFrontendOrigin = parsedFrontendUrl.origin;

  if (nodeEnv === "production") {
    if (parsedApiBaseUrl.protocol !== "https:" || parsedFrontendUrl.protocol !== "https:") {
      errors.push("Production API_BASE_URL and FRONTEND_URL must use https.");
    }

    if (!cookieDomain) {
      warnings.push("COOKIE_DOMAIN is empty in production. Cross-site refresh cookies may fail.");
    }
  }

  if (parsedCallbackUrl && parsedCallbackUrl.origin !== parsedApiBaseUrl.origin) {
    errors.push("MICROSOFT_CALLBACK_URL origin must match API_BASE_URL origin.");
  }

  if (callbackFrontendOrigin === parsedApiBaseUrl.origin) {
    warnings.push("FRONTEND_URL and API_BASE_URL share the same origin. Confirm this is intentional.");
  }
}

if (cookieSameSite && !["lax", "strict", "none"].includes(cookieSameSite)) {
  errors.push("COOKIE_SAME_SITE must be one of: lax, strict, none.");
}

if (cookieSameSite === "none" && nodeEnv === "production" && parsedApiBaseUrl?.protocol !== "https:") {
  errors.push("COOKIE_SAME_SITE=none requires an https API_BASE_URL in production.");
}

if (corsAllowedOrigins) {
  for (const origin of corsAllowedOrigins.split(",")) {
    const candidate = origin.trim();

    if (candidate.length === 0) {
      continue;
    }

    const parsedOrigin = tryParseUrl(candidate, "CORS_ALLOWED_ORIGINS", errors);

    if (parsedOrigin && parsedOrigin.origin !== candidate.replace(/\/$/, "")) {
      warnings.push(`CORS_ALLOWED_ORIGINS entry "${candidate}" includes a path; only its origin will be used.`);
    }
  }
}

if (!avatarStorageDir) {
  warnings.push("AVATAR_STORAGE_DIR is not set. Defaulting to /var/www/sigambling/avatars.");
}

if (!avatarPublicBaseUrl) {
  warnings.push("AVATAR_PUBLIC_BASE_URL is not set. Defaulting to /avatars.");
}

const summary = [
  `NODE_ENV=${nodeEnv}`,
  `API_BASE_URL=${apiBaseUrl ?? "<missing>"}`,
  `FRONTEND_URL=${frontendUrl ?? "<missing>"}`,
  `CORS_ALLOWED_ORIGINS=${corsAllowedOrigins ?? "<default frontend origin>"}`,
  `COOKIE_SAME_SITE=${cookieSameSite ?? "<auto>"}`,
  `MICROSOFT_CALLBACK_URL=${callbackUrl ?? "<missing>"}`,
  `AVATAR_STORAGE_DIR=${avatarStorageDir ?? "/var/www/sigambling/avatars"}`,
  `AVATAR_PUBLIC_BASE_URL=${avatarPublicBaseUrl ?? "/avatars"}`,
];

if (errors.length > 0) {
  console.error("Environment validation failed.");
  for (const line of summary) {
    console.error(`- ${line}`);
  }
  for (const error of errors) {
    console.error(`- ERROR: ${error}`);
  }
  for (const warning of warnings) {
    console.error(`- WARN: ${warning}`);
  }
  process.exit(1);
}

console.log("Environment validation passed.");
for (const line of summary) {
  console.log(`- ${line}`);
}
for (const warning of warnings) {
  console.log(`- WARN: ${warning}`);
}
