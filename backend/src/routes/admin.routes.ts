import { Router } from "express";
import { getEventsLeaderboard, getPublicStats, getStatisticsOverview } from "../controllers/admin.controller";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";

export const publicStatsRouter = Router();
publicStatsRouter.get("/", getPublicStats);

export const adminStatisticsRouter = Router();

adminStatisticsRouter.use(requireAuth, requireRole(["admin"]));
adminStatisticsRouter.get("/overview", getStatisticsOverview);
adminStatisticsRouter.get("/events/leaderboard", getEventsLeaderboard);
