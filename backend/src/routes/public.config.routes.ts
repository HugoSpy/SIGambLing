import { Router } from "express";
import { getPublicMaintenanceConfig } from "../controllers/admin.config.controller";

export const publicConfigRouter = Router();

publicConfigRouter.get("/maintenance", getPublicMaintenanceConfig);
