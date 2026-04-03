import { UserRole, type User } from "@prisma/client";
import type { Response } from "express";
import { env, isProduction } from "../config/env";
import { resolveRefreshCookieSameSite } from "../config/security";
import { prisma } from "./prisma.service";
import { AppError } from "../utils/app-error";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { buildPseudoFromEpitaEmail, ensureUniquePseudo } from "../utils/pseudo";

interface MicrosoftProfile {
  id: string;
  displayName?: string;
  userPrincipalName?: string;
  emails?: Array<{ value: string }>;
  _json: {
    mail?: string;
  };
}

function getMicrosoftEmail(profile: MicrosoftProfile) {
  const email =
    profile.emails?.find((entry: { value: string }) => entry.value)?.value ??
    profile.userPrincipalName;

  if (!email) {
    throw new AppError("Le profil Microsoft ne contient pas d'email exploitable.", 400);
  }

  if (!email.toLowerCase().endsWith("@epita.fr")) {
    throw new AppError("Connexion réservée aux emails @epita.fr.", 400);
  }

  return email.toLowerCase();
}

class AuthService {
  async resolveMicrosoftUser(profile: MicrosoftProfile) {
    const email = getMicrosoftEmail(profile);
    const existingUser =
      (await prisma.user.findFirst({
        where: {
          OR: [{ email }, { microsoftId: profile.id }],
        },
      })) ?? null;

    if (existingUser) {
      return prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email,
          microsoftId: profile.id,
          avatarUrl: profile._json.mail ?? existingUser.avatarUrl,
        },
      });
    }

    const basePseudo = buildPseudoFromEpitaEmail(email);
    const pseudo = await ensureUniquePseudo(basePseudo, (candidate) =>
      prisma.user.findUnique({ where: { pseudo: candidate } }).then((user) => user !== null),
    );

    return prisma.user.create({
      data: {
        email,
        microsoftId: profile.id,
        pseudo,
        role: UserRole.user,
      },
    });
  }

  buildSession(user: User) {
    return {
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    };
  }

  applyRefreshCookie(response: Response, refreshToken: string) {
    const sameSite = resolveRefreshCookieSameSite({
      frontendUrl: env.FRONTEND_URL,
      apiBaseUrl: env.API_BASE_URL,
      isProduction,
      explicitPolicy: env.COOKIE_SAME_SITE,
    });

    response.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/auth",
      domain: env.COOKIE_DOMAIN || undefined,
    });
  }

  clearRefreshCookie(response: Response) {
    const sameSite = resolveRefreshCookieSameSite({
      frontendUrl: env.FRONTEND_URL,
      apiBaseUrl: env.API_BASE_URL,
      isProduction,
      explicitPolicy: env.COOKIE_SAME_SITE,
    });

    response.clearCookie("refresh_token", {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      path: "/auth",
      domain: env.COOKIE_DOMAIN || undefined,
    });
  }

  async rotateRefreshToken(token: string) {
    const payload = verifyRefreshToken(token);

    if (payload.tokenType !== "refresh") {
      throw new AppError("Refresh token invalide.", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.isBanned) {
      throw new AppError("Utilisateur introuvable ou banni.", 401);
    }

    if (user.sessionVersion !== payload.sessionVersion) {
      throw new AppError("Session expirée, reconnecte-toi.", 401);
    }

    return {
      user,
      ...this.buildSession(user),
    };
  }

  async invalidateSession(token?: string | null) {
    if (!token) {
      return;
    }

    try {
      const payload = verifyRefreshToken(token);

      await prisma.user.update({
        where: { id: payload.userId },
        data: {
          sessionVersion: {
            increment: 1,
          },
        },
      });
    } catch {
      return;
    }
  }
}

export const authService = new AuthService();
