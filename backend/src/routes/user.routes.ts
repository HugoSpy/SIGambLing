import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";
import { Router } from "express";
import {
  adjustUserBalanceController,
  getCurrentUserController,
  listAvailableBadgesController,
  listCurrentUserEventBetsController,
  mentionSearchController,
  searchUsersController,
  unlockUserBadgeController,
  updateChatPreferencesController,
  updateCurrentUserController,
  updateUserRewardController,
  uploadCurrentUserAvatarController,
} from "../controllers/user.controller";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";
import { validateBody } from "../middleware/validate";
import {
  adjustUserBalanceSchema,
  unlockUserBadgeSchema,
  updateChatPreferencesSchema,
  updateUserProfileSchema,
  updateUserRewardSchema,
} from "../schemas/user.schemas";
import { AppError } from "../utils/app-error";

const multer = require("multer") as {
  (options: {
    storage: unknown;
    limits: { fileSize: number };
  }): {
    single(fieldName: string): (
      request: Parameters<RequestHandler>[0],
      response: Parameters<RequestHandler>[1],
      next: (error?: unknown) => void,
    ) => void;
  };
  memoryStorage(): unknown;
};

export const userRouter = Router();

const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de requêtes utilisateur, réessayez plus tard." },
});

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

function hasErrorCode(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

const uploadAvatarMiddleware: RequestHandler = (request, response, next) => {
  avatarUpload.single("avatar")(request, response, (error?: unknown) => {
    if (hasErrorCode(error) && error.code === "LIMIT_FILE_SIZE") {
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

userRouter.get("/me", requireAuth, getCurrentUserController);
userRouter.get("/me/bets", requireAuth, listCurrentUserEventBetsController);
userRouter.patch("/me", requireAuth, userLimiter, validateBody(updateUserProfileSchema), updateCurrentUserController);
userRouter.patch("/me/chat-preferences", requireAuth, validateBody(updateChatPreferencesSchema), updateChatPreferencesController);
userRouter.get("/mention-search", requireAuth, mentionSearchController);
userRouter.post("/me/avatar", requireAuth, userLimiter, uploadAvatarMiddleware, uploadCurrentUserAvatarController);
userRouter.get("/", requireAuth, requireRole(["admin"]), searchUsersController);
userRouter.get("/badges/catalog", requireAuth, requireRole(["admin"]), listAvailableBadgesController);
userRouter.patch(
  "/:id/balance",
  requireAuth,
  requireRole(["admin"]),
  userLimiter,
  validateBody(adjustUserBalanceSchema),
  adjustUserBalanceController,
);
userRouter.post(
  "/:id/badges",
  requireAuth,
  requireRole(["admin"]),
  userLimiter,
  validateBody(unlockUserBadgeSchema),
  unlockUserBadgeController,
);
userRouter.patch(
  "/:id/reward",
  requireAuth,
  requireRole(["admin"]),
  userLimiter,
  validateBody(updateUserRewardSchema),
  updateUserRewardController,
);
