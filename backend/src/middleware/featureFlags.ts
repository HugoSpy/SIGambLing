import type { RequestHandler } from "express";
import { prisma } from "../services/prisma.service";
import { verifyAccessToken } from "../utils/jwt";

interface FeatureFlags {
  rouletteDisabled: boolean;
  blackjackDisabled: boolean;
  eventsDisabled: boolean;
  minesDisabled: boolean;
}

// In-memory cache — invalidated on POST /admin/config/features
let cachedFlags: FeatureFlags | null = null;

export function invalidateFeatureFlagsCache() {
  cachedFlags = null;
}

async function getFeatureFlagValues(): Promise<FeatureFlags> {
  if (cachedFlags !== null) {
    return cachedFlags;
  }

  const configs = await prisma.siteConfig.findMany({
    where: { key: { in: ["rouletteDisabled", "blackjackDisabled", "eventsDisabled", "minesDisabled"] } },
  });

  const map = Object.fromEntries(configs.map((c) => [c.key, c.value === "true"]));

  cachedFlags = {
    rouletteDisabled: map["rouletteDisabled"] ?? false,
    blackjackDisabled: map["blackjackDisabled"] ?? false,
    eventsDisabled: map["eventsDisabled"] ?? false,
    minesDisabled: map["minesDisabled"] ?? false,
  };

  return cachedFlags;
}

function isAdmin(authorization: string | undefined): boolean {
  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }
  try {
    const token = authorization.slice("Bearer ".length);
    const payload = verifyAccessToken(token);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

const FEATURE_RULES: {
  flag: keyof FeatureFlags;
  prefix: string;
  error: string;
  message: string;
}[] = [
  {
    flag: "rouletteDisabled",
    prefix: "/casino/roulette",
    error: "rouletteDisabled",
    message: "La roulette est temporairement indisponible.",
  },
  {
    flag: "blackjackDisabled",
    prefix: "/casino/blackjack",
    error: "blackjackDisabled",
    message: "Le blackjack est temporairement indisponible.",
  },
  {
    flag: "eventsDisabled",
    prefix: "/events",
    error: "eventsDisabled",
    message: "Les événements sont temporairement indisponibles.",
  },
  {
    flag: "minesDisabled",
    prefix: "/casino/mines",
    error: "minesDisabled",
    message: "Les Mines sont temporairement indisponibles.",
  },
];

export const featureFlagsMiddleware: RequestHandler = async (request, response, next) => {
  try {
    const flags = await getFeatureFlagValues();
    const anyDisabled = flags.rouletteDisabled || flags.blackjackDisabled || flags.eventsDisabled || flags.minesDisabled;

    if (!anyDisabled) {
      return next();
    }

    for (const rule of FEATURE_RULES) {
      if (flags[rule.flag] && request.path.startsWith(rule.prefix)) {
        if (isAdmin(request.headers.authorization)) {
          return next();
        }

        response.status(503).json({
          error: rule.error,
          message: rule.message,
        });
        return;
      }
    }

    return next();
  } catch (error) {
    next(error);
  }
};
