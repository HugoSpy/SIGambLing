import type { RequestHandler } from "express";
import { prisma } from "../services/prisma.service";
import { verifyAccessToken } from "../utils/jwt";

// In-memory cache — invalidated on POST /admin/config/maintenance
let cachedMaintenanceMode: boolean | null = null;

export function invalidateMaintenanceCache() {
  cachedMaintenanceMode = null;
}

async function getMaintenanceModeValue(): Promise<boolean> {
  if (cachedMaintenanceMode !== null) {
    return cachedMaintenanceMode;
  }

  const config = await prisma.siteConfig.findUnique({
    where: { key: "maintenanceMode" },
  });

  cachedMaintenanceMode = config?.value === "true";
  return cachedMaintenanceMode;
}

const BYPASS_PREFIXES = ["/auth/", "/config/", "/health"];

function isBypassed(path: string): boolean {
  return BYPASS_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export const maintenanceMiddleware: RequestHandler = async (request, response, next) => {
  try {
    const isActive = await getMaintenanceModeValue();

    if (!isActive) {
      return next();
    }

    if (isBypassed(request.path)) {
      return next();
    }

    const authorization = request.headers.authorization;

    if (authorization?.startsWith("Bearer ")) {
      try {
        const token = authorization.slice("Bearer ".length);
        const payload = verifyAccessToken(token);

        if (payload.role === "admin") {
          return next();
        }
      } catch {
        // invalid token — fall through to 503
      }
    }

    response.status(503).json({
      error: "maintenance",
      message: "Site en maintenance",
    });
  } catch (error) {
    next(error);
  }
};
