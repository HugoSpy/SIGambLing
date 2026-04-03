import rateLimit from "express-rate-limit";
import { Router } from "express";
import {
  claimDailyRewardController,
  getMyGamificationStateController,
  getMyJackpotStateController,
  triggerJackpotPayoutController,
} from "../controllers/gamification.controller";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";

export const gamificationRouter = Router();

const rewardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (request) =>
    ((request as { auth?: { id?: string } }).auth?.id ?? request.ip ?? "anonymous"),
  message: { message: "Trop de requetes de recompense en peu de temps." },
});

gamificationRouter.use(requireAuth);
gamificationRouter.get("/me", getMyGamificationStateController);
gamificationRouter.get("/jackpot", getMyJackpotStateController);
gamificationRouter.post("/daily", rewardLimiter, claimDailyRewardController);
gamificationRouter.post("/jackpot/payout", requireRole(["admin"]), triggerJackpotPayoutController);
