import rateLimit from "express-rate-limit";
import { Router } from "express";
import {
  blackjackCurrentController,
  blackjackDealController,
  blackjackDeclineInsuranceController,
  blackjackDoubleController,
  blackjackHitController,
  blackjackInsuranceController,
  blackjackSplitController,
  blackjackStandController,
  hiloCashOutController,
  hiloCurrentController,
  hiloPredictController,
  hiloSkipController,
  hiloStartController,
  spinRouletteController,
} from "../controllers/casino.controller";
import { requireAuth } from "../middleware/require-auth";
import { validateBody } from "../middleware/validate";
import {
  blackjackActionSchema,
  blackjackDealSchema,
  hiloPredictSchema,
  hiloStartSchema,
  rouletteSpinSchema,
} from "../schemas/casino.schemas";

export const casinoRouter = Router();

const casinoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (request) =>
    ((request as { auth?: { id?: string } }).auth?.id ?? request.ip ?? "anonymous"),
  message: { message: "Too many casino requests" },
});

casinoRouter.post(
  "/roulette/spin",
  requireAuth,
  casinoLimiter,
  validateBody(rouletteSpinSchema),
  spinRouletteController,
);

casinoRouter.get("/blackjack/current", requireAuth, blackjackCurrentController);

casinoRouter.post(
  "/blackjack/deal",
  requireAuth,
  casinoLimiter,
  validateBody(blackjackDealSchema),
  blackjackDealController,
);

casinoRouter.post(
  "/blackjack/hit",
  requireAuth,
  casinoLimiter,
  validateBody(blackjackActionSchema),
  blackjackHitController,
);

casinoRouter.post(
  "/blackjack/stand",
  requireAuth,
  casinoLimiter,
  validateBody(blackjackActionSchema),
  blackjackStandController,
);

casinoRouter.post(
  "/blackjack/insurance",
  requireAuth,
  casinoLimiter,
  validateBody(blackjackActionSchema),
  blackjackInsuranceController,
);

casinoRouter.post(
  "/blackjack/decline-insurance",
  requireAuth,
  casinoLimiter,
  validateBody(blackjackActionSchema),
  blackjackDeclineInsuranceController,
);

casinoRouter.post(
  "/blackjack/double",
  requireAuth,
  casinoLimiter,
  validateBody(blackjackActionSchema),
  blackjackDoubleController,
);

casinoRouter.post(
  "/blackjack/split",
  requireAuth,
  casinoLimiter,
  validateBody(blackjackActionSchema),
  blackjackSplitController,
);

casinoRouter.get("/hilo/current", requireAuth, hiloCurrentController);

casinoRouter.post(
  "/hilo/start",
  requireAuth,
  casinoLimiter,
  validateBody(hiloStartSchema),
  hiloStartController,
);

casinoRouter.post(
  "/hilo/predict",
  requireAuth,
  casinoLimiter,
  validateBody(hiloPredictSchema),
  hiloPredictController,
);

casinoRouter.post("/hilo/skip", requireAuth, casinoLimiter, hiloSkipController);

casinoRouter.post("/hilo/cashout", requireAuth, casinoLimiter, hiloCashOutController);
