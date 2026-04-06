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
import { startMicrosoftAuthSchema } from "../schemas/auth.schemas";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";
import { isProduction } from "../config/env";
import {
  clearMicrosoftOAuthState,
  issueMicrosoftOAuthState,
  verifyMicrosoftOAuthState,
} from "../utils/oauth-state";

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
  const state = issueMicrosoftOAuthState(response);

  passport.authenticate("microsoft", {
    session: false,
    state,
    prompt: typeof request.query.prompt === "string" ? request.query.prompt : "select_account",
  })(request, response, next);
});

function mask(value: string | undefined | null, visibleChars = 6): string {
  if (!value) return "<empty>";
  if (value.length <= visibleChars * 2) return `${value.slice(0, 3)}...`;
  return `${value.slice(0, visibleChars)}...${value.slice(-visibleChars)}`;
}

const P = "[MS_AUTH][CALLBACK]";

authRouter.get("/microsoft/callback", (request, response, next) => {
  const code = typeof request.query.code === "string" ? request.query.code : undefined;
  const state = typeof request.query.state === "string" ? request.query.state : undefined;
  const errorParam = typeof request.query.error === "string" ? request.query.error : undefined;
  const sessionState = typeof request.query.session_state === "string" ? request.query.session_state : undefined;

  logger.info(`${P}[RECV] Callback received`, {
    hasCode: !!code,
    codeLength: code?.length ?? 0,
    hasState: !!state,
    stateLength: state?.length ?? 0,
    sessionState: mask(sessionState),
    errorParam: errorParam ?? "none",
    errorDescription: request.query.error_description ?? "none",
    queryKeys: Object.keys(request.query),
    cookieKeys: Object.keys(request.cookies ?? {}),
    hasOAuthStateCookie: !!request.cookies?.microsoft_oauth_state,
  });

  // Step 1: Clear OAuth state cookie
  logger.info(`${P}[CLEAR_STATE] Clearing OAuth state cookie`);
  clearMicrosoftOAuthState(response);

  // Step 2: Verify OAuth state (skip if Microsoft returned an error)
  if (!errorParam) {
    try {
      logger.info(`${P}[VERIFY_STATE] Verifying OAuth state...`);
      verifyMicrosoftOAuthState(request);
      logger.info(`${P}[VERIFY_STATE] OAuth state verified OK`);
    } catch (error: any) {
      logger.error(`${P}[VERIFY_STATE] FAILED`, {
        message: error.message,
        name: error.name,
        statusCode: error.statusCode,
        stack: error.stack,
      });
      next(error);
      return;
    }
  } else {
    logger.warn(`${P}[VERIFY_STATE] Skipped — Microsoft returned error: ${errorParam}`);
  }

  // Step 3: Passport authenticate (token exchange + profile fetch + DB upsert)
  logger.info(`${P}[PASSPORT] Starting passport.authenticate("microsoft")...`);

  passport.authenticate(
    "microsoft",
    { session: false },
    (error: Error | null, user?: Express.User | false, info?: any) => {
      if (error) {
        logger.error(`${P}[PASSPORT] FAILED — error in verify callback`, {
          message: error.message,
          name: error.name,
          stack: error.stack,
          responseData: (error as any).response?.data,
          responseStatus: (error as any).response?.status,
          responseHeaders: (error as any).response?.headers,
          oauthError: (error as any).oauthError,
          tokenError: (error as any).tokenError,
        });

        if (!isProduction) {
          response.status(500).json({
            step: "PASSPORT_AUTHENTICATE",
            message: error.message,
            name: error.name,
            stack: error.stack?.split("\n").slice(0, 8),
          });
          return;
        }

        next(error);
        return;
      }

      if (!user) {
        logger.error(`${P}[PASSPORT] FAILED — no user returned`, {
          info: info ?? "none",
        });

        if (!isProduction) {
          response.status(401).json({
            step: "PASSPORT_NO_USER",
            message: "Passport did not return a user",
            info: info ?? null,
          });
          return;
        }

        next(new AppError("Échec de l'authentification Microsoft.", 401));
        return;
      }

      const passportUser = user as { id?: string; email?: string };
      logger.info(`${P}[PASSPORT] OK — user resolved`, {
        userId: passportUser.id,
        email: mask(passportUser.email),
      });

      // Step 4: Controller — session build + redirect
      request.user = user;
      logger.info(`${P}[CONTROLLER] Entering handleMicrosoftCallbackController...`);
      handleMicrosoftCallbackController(request, response, next);
    },
  )(request, response, next);
});

authRouter.post("/refresh", strictLimiter, refreshController);
authRouter.post("/logout", strictLimiter, logoutController);
