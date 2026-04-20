import type { RequestHandler } from "express";
import { prisma } from "../services/prisma.service";
import { AppError } from "../utils/app-error";
import { invalidateMaintenanceCache } from "../middleware/maintenance";
import { invalidateFeatureFlagsCache } from "../middleware/featureFlags";

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

const ALL_CONFIG_KEYS = ["maintenanceMode", "rouletteDisabled", "blackjackDisabled", "eventsDisabled", "minesDisabled", "crashDisabled", "plinkoDisabled"] as const;

export const getPublicMaintenanceConfig: RequestHandler = async (_request, response, next) => {
  try {
    const configs = await prisma.siteConfig.findMany({
      where: { key: { in: [...ALL_CONFIG_KEYS] } },
    });

    const map = Object.fromEntries(configs.map((c) => [c.key, c.value === "true"]));

    response.json({
      maintenanceMode: map["maintenanceMode"] ?? false,
      rouletteDisabled: map["rouletteDisabled"] ?? false,
      blackjackDisabled: map["blackjackDisabled"] ?? false,
      eventsDisabled: map["eventsDisabled"] ?? false,
      minesDisabled: map["minesDisabled"] ?? false,
      crashDisabled: map["crashDisabled"] ?? false,
      plinkoDisabled: map["plinkoDisabled"] ?? false,
    });
  } catch (error) {
    next(error);
  }
};

const FEATURE_FLAG_KEYS = ["rouletteDisabled", "blackjackDisabled", "eventsDisabled", "minesDisabled", "crashDisabled", "plinkoDisabled"] as const;
type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export const getFeatureFlagsConfig: RequestHandler = async (_request, response, next) => {
  try {
    const configs = await prisma.siteConfig.findMany({
      where: { key: { in: [...FEATURE_FLAG_KEYS] } },
    });

    const map = Object.fromEntries(configs.map((c) => [c.key, c.value === "true"]));

    response.json({
      rouletteDisabled: map["rouletteDisabled"] ?? false,
      blackjackDisabled: map["blackjackDisabled"] ?? false,
      eventsDisabled: map["eventsDisabled"] ?? false,
      minesDisabled: map["minesDisabled"] ?? false,
      crashDisabled: map["crashDisabled"] ?? false,
      plinkoDisabled: map["plinkoDisabled"] ?? false,
    });
  } catch (error) {
    next(error);
  }
};

export const setFeatureFlagsConfig: RequestHandler = async (request, response, next) => {
  try {
    const adminId = getAuthenticatedUserId(request);
    const body = request.body as Partial<Record<FeatureFlagKey, unknown>>;

    const updates: { key: FeatureFlagKey; value: boolean }[] = [];

    for (const key of FEATURE_FLAG_KEYS) {
      if (key in body) {
        const val = body[key];
        if (typeof val !== "boolean") {
          throw new AppError(`Le champ '${key}' doit être un booléen.`, 400);
        }
        updates.push({ key, value: val });
      }
    }

    if (updates.length === 0) {
      throw new AppError("Aucune clé valide fournie.", 400);
    }

    await prisma.$transaction(async (tx) => {
      for (const { key, value } of updates) {
        await tx.siteConfig.upsert({
          where: { key },
          create: { key, value: String(value) },
          update: { value: String(value) },
        });

        await tx.adminLog.create({
          data: {
            adminId,
            actionType: value ? `${key}_enabled` : `${key}_disabled`,
            targetId: null,
            details: { [key]: value },
          },
        });
      }
    });

    invalidateFeatureFlagsCache();

    const configs = await prisma.siteConfig.findMany({
      where: { key: { in: [...FEATURE_FLAG_KEYS] } },
    });
    const map = Object.fromEntries(configs.map((c) => [c.key, c.value === "true"]));

    response.json({
      rouletteDisabled: map["rouletteDisabled"] ?? false,
      blackjackDisabled: map["blackjackDisabled"] ?? false,
      eventsDisabled: map["eventsDisabled"] ?? false,
      minesDisabled: map["minesDisabled"] ?? false,
      crashDisabled: map["crashDisabled"] ?? false,
      plinkoDisabled: map["plinkoDisabled"] ?? false,
    });
  } catch (error) {
    next(error);
  }
};
