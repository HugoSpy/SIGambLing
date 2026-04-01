import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";
import multer from "multer";
import { Router } from "express";
import {
  getCurrentUserController,
  updateCurrentUserController,
  uploadCurrentUserAvatarController,
} from "../controllers/user.controller";
import { requireAuth } from "../middleware/require-auth";
import { validateBody } from "../middleware/validate";
import { updateUserProfileSchema } from "../schemas/user.schemas";
import { AppError } from "../utils/app-error";

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

const uploadAvatarMiddleware: RequestHandler = (request, response, next) => {
  avatarUpload.single("avatar")(request, response, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
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
userRouter.patch("/me", requireAuth, userLimiter, validateBody(updateUserProfileSchema), updateCurrentUserController);
userRouter.post("/me/avatar", requireAuth, userLimiter, uploadAvatarMiddleware, uploadCurrentUserAvatarController);
