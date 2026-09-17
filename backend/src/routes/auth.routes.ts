import { Router, type RequestHandler } from "express";
import passport from "passport";
import rateLimit from "express-rate-limit";
import {
  getMicrosoftRedirectController,
  handleMicrosoftCallbackController,
  logoutController,
  refreshController,
} from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate";
import { startMicrosoftAuthSchema } from "../schemas/auth.schemas";
import { AppError } from "../utils/app-error";
import { env } from "../config/env";
import {
  clearMicrosoftOAuthState,
  issueMicrosoftOAuthState,
  verifyMicrosoftOAuthState,
} from "../utils/oauth-state";

export const authRouter = Router();

function requireTrustedOrigin(...allowedOrigins: string[]): RequestHandler {
  return (req, _res, next) => {
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      return next(new AppError("Origin non autorisé.", 403));
    }
    next();
  };
}

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
  const state = issueMicrosoftOAuthState(response);

  passport.authenticate("microsoft", {
    session: false,
    state,
    prompt: typeof request.query.prompt === "string" ? request.query.prompt : "select_account",
  })(request, response, next);
});

authRouter.get("/microsoft/callback", (request, response, next) => {
  clearMicrosoftOAuthState(response);

  if (!request.query.error) {
    try {
      verifyMicrosoftOAuthState(request);
    } catch (error) {
      next(error);
      return;
    }
  }

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

authRouter.post("/refresh", strictLimiter, requireTrustedOrigin(env.FRONTEND_URL), refreshController);
authRouter.post("/logout",  strictLimiter, requireTrustedOrigin(env.FRONTEND_URL), logoutController);
