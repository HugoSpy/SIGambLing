import type { RequestHandler } from "express";
import { URL } from "node:url";
import { env } from "../config/env";
import { authService } from "../services/auth.service";
import { prisma } from "../services/prisma.service";
import { AppError } from "../utils/app-error";
import { serializeUser } from "../utils/user-serializer";

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

    if (!passportUser?.id) {
      throw new AppError("Authentification Microsoft incomplète.", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: passportUser.id },
    });

    if (!user) {
      throw new AppError("Utilisateur Microsoft introuvable.", 404);
    }

    const { accessToken, refreshToken } = authService.buildSession(user);
    authService.applyRefreshCookie(response, refreshToken);

    const payload = {
      user: serializeUser(user),
      access_token: accessToken,
      refresh_token: refreshToken,
    };

    const acceptsJson = request.accepts(["json", "html"]) === "json";

    if (acceptsJson) {
      response.json(payload);
      return;
    }

    const callbackUrl = new URL("/auth/callback", env.FRONTEND_URL);
    callbackUrl.searchParams.set("access_token", accessToken);
    response.redirect(callbackUrl.toString());
  } catch (error) {
    next(error);
  }
};

export const refreshController: RequestHandler = async (request, response, next) => {
  try {
    const refreshToken =
      request.cookies.refresh_token ??
      (typeof request.body.refresh_token === "string" ? request.body.refresh_token : undefined);

    if (!refreshToken) {
      throw new AppError("Refresh token manquant.", 401);
    }

    const { accessToken, refreshToken: rotatedRefreshToken } =
      await authService.rotateRefreshToken(refreshToken);

    authService.applyRefreshCookie(response, rotatedRefreshToken);
    response.json({
      access_token: accessToken,
      refresh_token: rotatedRefreshToken,
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
