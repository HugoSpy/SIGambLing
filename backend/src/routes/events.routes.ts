import rateLimit from "express-rate-limit";
import multer from "multer";
import { Router } from "express";
import {
  approveProposalController,
  cancelEventController,
  closeEventController,
  createEventController,
  createProposalController,
  getEventController,
  getEventOddsHistoryController,
  getMyEventBetController,
  listAdminProposalsController,
  listAdminEventsController,
  listEventsController,
  listMyProposalsController,
  listSavedProposalsController,
  placeEventBetController,
  placeParlayBetController,
  placeSimpleBetsController,
  rejectProposalController,
  resolveEventController,
  toggleSaveProposalController,
  updateEventController,
  uploadEventImageController,
} from "../controllers/events.controller";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";
import { validateBody } from "../middleware/validate";
import { AppError } from "../utils/app-error";
import {
  createEventSchema,
  createProposalSchema,
  placeEventBetSchema,
  placeParlayBetSchema,
  placeSimpleBetsSchema,
  rejectProposalSchema,
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
eventsRouter.get("/proposals/me", listMyProposalsController);
eventsRouter.post("/proposals", validateBody(createProposalSchema), createProposalController);
eventsRouter.post("/bets", betLimiter, validateBody(placeSimpleBetsSchema), placeSimpleBetsController);
eventsRouter.post("/parlay", betLimiter, validateBody(placeParlayBetSchema), placeParlayBetController);
eventsRouter.get("/:id", getEventController);
eventsRouter.get("/:id/odds-history", getEventOddsHistoryController);
eventsRouter.get("/:id/my-bet", getMyEventBetController);
eventsRouter.post("/:id/bet", betLimiter, validateBody(placeEventBetSchema), placeEventBetController);

adminEventsRouter.use(requireAuth, requireRole(["admin", "validator"]), adminLimiter);
adminEventsRouter.get("/", listAdminEventsController);
adminEventsRouter.get("/proposals", listAdminProposalsController);
adminEventsRouter.get("/proposals/saved", listSavedProposalsController);
adminEventsRouter.post("/proposals/:proposalId/approve", approveProposalController);
adminEventsRouter.post(
  "/proposals/:proposalId/reject",
  validateBody(rejectProposalSchema),
  rejectProposalController,
);
adminEventsRouter.patch("/proposals/:proposalId/save", toggleSaveProposalController);
adminEventsRouter.post("/", validateBody(createEventSchema), createEventController);
adminEventsRouter.patch("/:id", validateBody(updateEventSchema), updateEventController);

const eventImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const uploadEventImageMiddleware: import("express").RequestHandler = (request, response, next) => {
  eventImageUpload.single("image")(request, response, (error?: unknown) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "LIMIT_FILE_SIZE"
    ) {
      next(new AppError("Fichier trop volumineux (max 2MB).", 400));
      return;
    }
    if (error) {
      next(error);
      return;
    }
    next();
  });
};

adminEventsRouter.post("/:id/image", uploadEventImageMiddleware, uploadEventImageController);
adminEventsRouter.post("/:id/close", closeEventController);
adminEventsRouter.post("/:id/resolve", validateBody(resolveEventSchema), resolveEventController);
adminEventsRouter.post("/:id/cancel", cancelEventController);
