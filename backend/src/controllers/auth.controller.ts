import type { RequestHandler } from "express";
import { URL } from "node:url";
import { env, isProduction } from "../config/env";
import { authService } from "../services/auth.service";
import { prisma } from "../services/prisma.service";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";
import { serializeUser } from "../utils/user-serializer";

const P = "[MS_AUTH][CONTROLLER]";

export const getMicrosoftRedirectController: RequestHandler = (request, response) => {
  const prompt = typeof request.body.prompt === "string" ? request.body.prompt : "select_account";
  const redirectUrl = new URL("/auth/microsoft", env.API_BASE_URL);
  redirectUrl.searchParams.set("prompt", prompt);

  response.json({
    redirect_url: redirectUrl.toString(),
  });
};

export const handleMicrosoftCallbackController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const passportUser = request.user as { id?: string } | undefined;

    logger.info(`${P}[USER_CHECK] passportUser`, {
      hasUser: !!passportUser,
      userId: passportUser?.id ?? "<none>",
    });

    if (!passportUser?.id) {
      throw new AppError("Authentification Microsoft incomplète.", 401);
    }

    logger.info(`${P}[DB_FIND] Finding user in DB...`, { userId: passportUser.id });

    const user = await prisma.user.findUnique({
      where: { id: passportUser.id },
    });

    if (!user) {
      logger.error(`${P}[DB_FIND] User not found in DB`, { userId: passportUser.id });
      throw new AppError("Utilisateur Microsoft introuvable.", 404);
    }

    logger.info(`${P}[SESSION] Building session...`, { userId: user.id, pseudo: user.pseudo });

    const { accessToken, refreshToken } = authService.buildSession(user);
    authService.applyRefreshCookie(response, refreshToken);

    logger.info(`${P}[SESSION] Session built, cookie applied`);

    const acceptsJson = request.accepts(["json", "html"]) === "json";

    if (acceptsJson) {
      logger.info(`${P}[RESPONSE] Returning JSON response`);
      const payload = {
        user: serializeUser(user),
        access_token: accessToken,
      };
      response.json(payload);
      return;
    }

    const callbackUrl = new URL("/auth/callback", env.FRONTEND_URL);
    logger.info(`${P}[RESPONSE] Redirecting to frontend`, { url: callbackUrl.toString() });
    response.redirect(callbackUrl.toString());
  } catch (error: any) {
    logger.error(`${P}[ERROR] Exception in callback controller`, {
      message: error.message,
      name: error.name,
      statusCode: error.statusCode,
      stack: error.stack,
    });

    if (!isProduction && !(error instanceof AppError)) {
      response.status(500).json({
        step: "CALLBACK_CONTROLLER",
        message: error.message,
        name: error.name,
        stack: error.stack?.split("\n").slice(0, 8),
      });
      return;
    }

    next(error);
  }
};

export const refreshController: RequestHandler = async (request, response, next) => {
  try {
    const refreshToken = request.cookies.refresh_token;

    if (!refreshToken) {
      throw new AppError("Refresh token manquant.", 401);
    }

    const { accessToken, refreshToken: rotatedRefreshToken } =
      await authService.rotateRefreshToken(refreshToken);

    authService.applyRefreshCookie(response, rotatedRefreshToken);
    response.json({
      access_token: accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logoutController: RequestHandler = async (request, response, next) => {
  try {
    const refreshToken = request.cookies.refresh_token ?? null;
    await authService.invalidateSession(refreshToken);
    authService.clearRefreshCookie(response);

    response.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};
