import { Router } from "express";
import { getMaintenanceConfig, setMaintenanceConfig } from "../controllers/admin.config.controller";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";

export const adminConfigRouter = Router();

adminConfigRouter.use(requireAuth, requireRole(["admin"]));

adminConfigRouter.get("/maintenance", getMaintenanceConfig);
adminConfigRouter.post("/maintenance", setMaintenanceConfig);
