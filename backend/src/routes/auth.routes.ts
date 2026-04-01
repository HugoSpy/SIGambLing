import { Router } from "express";
import passport from "passport";
import rateLimit from "express-rate-limit";
import {
  getMicrosoftRedirectController,
  handleMicrosoftCallbackController,
  logoutController,
  refreshController,
} from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate";
import { startMicrosoftAuthSchema, refreshSchema } from "../schemas/auth.schemas";
import { AppError } from "../utils/app-error";

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests" },
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many sensitive requests" },
});

authRouter.use(authLimiter);

authRouter.post("/microsoft", validateBody(startMicrosoftAuthSchema), getMicrosoftRedirectController);

authRouter.get("/microsoft", (request, response, next) => {
  passport.authenticate("microsoft", {
    session: false,
    prompt: typeof request.query.prompt === "string" ? request.query.prompt : "select_account",
  })(request, response, next);
});

authRouter.get("/microsoft/callback", (request, response, next) => {
  passport.authenticate(
    "microsoft",
    { session: false },
    (error: Error | null, user?: Express.User | false) => {
      if (error) {
        next(error);
        return;
      }

      if (!user) {
        next(new AppError("Échec de l'authentification Microsoft.", 401));
        return;
      }

      request.user = user;
      handleMicrosoftCallbackController(request, response, next);
    },
  )(request, response, next);
});

authRouter.post("/refresh", strictLimiter, validateBody(refreshSchema), refreshController);
authRouter.post("/logout", strictLimiter, logoutController);
