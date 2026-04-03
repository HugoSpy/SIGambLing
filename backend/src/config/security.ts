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
  const explicitPolicy = options.explicitPolicy?.trim().toLowerCase();

  if (explicitPolicy === "lax" || explicitPolicy === "strict" || explicitPolicy === "none") {
    return explicitPolicy;
  }

  if (!options.isProduction) {
    return "lax";
  }

  const frontendHost = new URL(options.frontendUrl).hostname;
  const apiHost = new URL(options.apiBaseUrl).hostname;

  return frontendHost === apiHost ? "lax" : "none";
}
