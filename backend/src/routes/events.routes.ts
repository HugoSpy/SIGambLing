import rateLimit from "express-rate-limit";
import { Router } from "express";
import {
  cancelEventController,
  closeEventController,
  createEventController,
  getEventController,
  getMyEventBetController,
  listAdminEventsController,
  listEventsController,
  placeEventBetController,
  resolveEventController,
  updateEventController,
} from "../controllers/events.controller";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";
import { validateBody } from "../middleware/validate";
import {
  createEventSchema,
  placeEventBetSchema,
  resolveEventSchema,
  updateEventSchema,
} from "../schemas/events.schemas";

export const eventsRouter = Router();
export const adminEventsRouter = Router();

const betLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (request) =>
    ((request as { auth?: { id?: string } }).auth?.id ?? request.ip ?? "anonymous"),
  message: { message: "Trop de paris envoyes en peu de temps." },
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (request) =>
    ((request as { auth?: { id?: string } }).auth?.id ?? request.ip ?? "anonymous"),
  message: { message: "Trop d'actions admin en peu de temps." },
});

eventsRouter.use(requireAuth);
eventsRouter.get("/", listEventsController);
eventsRouter.get("/:id", getEventController);
eventsRouter.get("/:id/my-bet", getMyEventBetController);
eventsRouter.post("/:id/bet", betLimiter, validateBody(placeEventBetSchema), placeEventBetController);

adminEventsRouter.use(requireAuth, requireRole(["admin"]), adminLimiter);
adminEventsRouter.get("/", listAdminEventsController);
adminEventsRouter.post("/", validateBody(createEventSchema), createEventController);
adminEventsRouter.patch("/:id", validateBody(updateEventSchema), updateEventController);
adminEventsRouter.post("/:id/close", closeEventController);
adminEventsRouter.post("/:id/resolve", validateBody(resolveEventSchema), resolveEventController);
adminEventsRouter.post("/:id/cancel", cancelEventController);
