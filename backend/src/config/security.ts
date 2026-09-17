import type { CookieOptions } from "express";

type SameSitePolicy = NonNullable<CookieOptions["sameSite"]>;

function normalizeOrigin(input: string) {
  return new URL(input).origin;
}

function parseOriginList(rawOrigins?: string) {
  if (!rawOrigins) {
    return [];
  }

  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map(normalizeOrigin);
}

export function getCorsAllowedOrigins(frontendUrl: string, rawOrigins?: string) {
  return new Set([normalizeOrigin(frontendUrl), ...parseOriginList(rawOrigins)]);
}

export function isCorsOriginAllowed(
  requestOrigin: string | undefined,
  allowedOrigins: ReadonlySet<string>,
) {
  if (!requestOrigin) {
    return true;
  }

  return allowedOrigins.has(requestOrigin);
}

export function resolveRefreshCookieSameSite(options: {
  frontendUrl: string;
  apiBaseUrl: string;
  isProduction: boolean;
  explicitPolicy?: string;
}): SameSitePolicy {
  // www.sigambling.fr and api.sigambling.fr share the same registrable domain
  // (sigambling.fr), so Lax is sufficient for cross-subdomain cookie delivery.
  // Never use None to avoid CSRF exposure.
  return "lax";
}
