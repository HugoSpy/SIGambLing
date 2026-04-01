import rateLimit from "express-rate-limit";
import { Router } from "express";
import { spinRouletteController } from "../controllers/casino.controller";
import { requireAuth } from "../middleware/require-auth";
import { validateBody } from "../middleware/validate";
import { rouletteSpinSchema } from "../schemas/casino.schemas";

export const casinoRouter = Router();

const casinoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
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
