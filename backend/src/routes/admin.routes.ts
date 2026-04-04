import { Router } from "express";
import { getEventsLeaderboard, getStatisticsOverview } from "../controllers/admin.controller";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";

export const adminStatisticsRouter = Router();

adminStatisticsRouter.use(requireAuth, requireRole(["admin"]));
adminStatisticsRouter.get("/overview", getStatisticsOverview);
adminStatisticsRouter.get("/events/leaderboard", getEventsLeaderboard);
