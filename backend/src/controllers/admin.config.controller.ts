import type { RequestHandler } from "express";
import { prisma } from "../services/prisma.service";
import { AppError } from "../utils/app-error";
import { invalidateMaintenanceCache } from "../middleware/maintenance";

function getAuthenticatedUserId(request: Parameters<RequestHandler>[0]) {
  const authUser = (request as { auth?: { id?: string } }).auth;

  if (!authUser?.id) {
    throw new AppError("Utilisateur non authentifié.", 401);
  }

  return authUser.id;
}

export const getMaintenanceConfig: RequestHandler = async (_request, response, next) => {
  try {
    const config = await prisma.siteConfig.findUnique({
      where: { key: "maintenanceMode" },
    });

    response.json({ maintenanceMode: config?.value === "true" });
  } catch (error) {
    next(error);
  }
};

export const setMaintenanceConfig: RequestHandler = async (request, response, next) => {
  try {
    const adminId = getAuthenticatedUserId(request);
    const { enabled } = request.body as { enabled: unknown };

    if (typeof enabled !== "boolean") {
      throw new AppError("Le champ 'enabled' doit être un booléen.", 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.siteConfig.upsert({
        where: { key: "maintenanceMode" },
        create: { key: "maintenanceMode", value: String(enabled) },
        update: { value: String(enabled) },
      });

      await tx.adminLog.create({
        data: {
          adminId,
          actionType: enabled ? "maintenance_enabled" : "maintenance_disabled",
          targetId: null,
          details: { enabled },
        },
      });
    });

    invalidateMaintenanceCache();

    response.json({ maintenanceMode: enabled });
  } catch (error) {
    next(error);
  }
};

export const getPublicMaintenanceConfig: RequestHandler = async (_request, response, next) => {
  try {
    const config = await prisma.siteConfig.findUnique({
      where: { key: "maintenanceMode" },
    });

    response.json({ maintenanceMode: config?.value === "true" });
  } catch (error) {
    next(error);
  }
};
